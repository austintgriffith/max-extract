// Note: generatePrivateKey and privateKeyToAccount no longer needed since we use real pilots
import { createHash, randomBytes } from "crypto";
import { WebSocket } from "ws";
import {
  Vector2D,
  Asteroid,
  Ship,
  SectorEvent,
  SectorSnapshot,
  SECTOR_CONFIG,
  TipResult,
} from "./types";
import { PositionUtils } from "./utils/PositionUtils";
import { ShipAI } from "./utils/ShipAI";
import { AsteroidUtils } from "./utils/AsteroidUtils";
import { DeterministicDice, createSectorDice } from "./utils/DeterministicDice";
import { CharacterManager, PilotManager } from "./managers/CharacterManager";
import { BlockchainManager } from "./managers/BlockchainManager";

export class Sector {
  public id: string;
  public asteroids: Map<string, Asteroid> = new Map();
  public ships: Map<string, Ship> = new Map();
  public events: SectorEvent[] = [];
  public subscribers: Set<WebSocket> = new Set();
  private rng: () => number;
  private deterministicDice: DeterministicDice | null = null;
  private lastUpdate: number = Date.now();
  private debugMode: boolean;
  private gameLoopCounter: number = 0; // Track game loop cycles for performance optimization
  private characterManager: CharacterManager;
  private pilotManager: PilotManager;
  private blockchainManager: BlockchainManager;

  constructor(
    id: string,
    characterManager: CharacterManager,
    pilotManager: PilotManager,
    blockchainManager: BlockchainManager,
    seed?: string,
    debugMode: boolean = false
  ) {
    this.id = id;
    this.debugMode = debugMode;
    this.characterManager = characterManager;
    this.pilotManager = pilotManager;
    this.blockchainManager = blockchainManager;

    let seedValue = seed ? this.hashSeed(seed) : Math.random() * 1000000;
    this.rng = () => {
      seedValue = (seedValue * 9301 + 49297) % 233280;
      return seedValue / 233280;
    };

    if (this.debugMode) {
      this.debugLog(`Sector ${id} initialized with seed: ${seedValue}`);
    }
  }

  private debugLog(message: string, data?: any): void {
    if (this.debugMode) {
      const timestamp = new Date().toISOString().split("T")[1].split(".")[0];
      if (data) {
        console.log(`🎯 [${timestamp}] Sector ${this.id}: ${message}:`, data);
      } else {
        console.log(`🎯 [${timestamp}] Sector ${this.id}: ${message}`);
      }
    }
  }

  private hashSeed(seed: string): number {
    return parseInt(
      createHash("md5").update(seed).digest("hex").substring(0, 8),
      16
    );
  }

  /**
   * Update the sector's deterministic dice with new rolling entropy
   * @param rollingEntropy The current rolling entropy from the Universe contract
   */
  public updateRollingEntropy(rollingEntropy: string): void {
    this.deterministicDice = createSectorDice(rollingEntropy, this.id);
    this.debugLog(`Updated deterministic dice with new rolling entropy`);
  }

  /**
   * Get a random number between 0 and 1 using deterministic dice
   * Throws error if no deterministic dice available - sectors should not operate without entropy
   */
  private getRandom(): number {
    if (!this.deterministicDice) {
      throw new Error(
        `Sector ${this.id}: Cannot generate random numbers without deterministic dice - rolling entropy not set`
      );
    }

    // Use deterministic dice - roll 4 hex chars for good resolution
    const roll = this.deterministicDice.roll(4);
    // Convert to 0-1 range (4 hex chars = 0-65535)
    return roll / 65535;
  }

  private generateId(): string {
    return randomBytes(8).toString("hex");
  }

  private getRandomEdgePosition(): { position: Vector2D; velocity: Vector2D } {
    const side = Math.floor(this.getRandom() * 4); // 0: top, 1: right, 2: bottom, 3: left
    const speed = SECTOR_CONFIG.ASTEROID_SPEED + (this.getRandom() - 0.5) * 10;

    let position: Vector2D;
    let velocity: Vector2D;

    switch (side) {
      case 0: // top
        position = { x: this.getRandom() * SECTOR_CONFIG.WIDTH, y: 0 };
        velocity = { x: (this.getRandom() - 0.5) * speed, y: speed };
        break;
      case 1: // right
        position = {
          x: SECTOR_CONFIG.WIDTH,
          y: this.getRandom() * SECTOR_CONFIG.HEIGHT,
        };
        velocity = { x: -speed, y: (this.getRandom() - 0.5) * speed };
        break;
      case 2: // bottom
        position = {
          x: this.getRandom() * SECTOR_CONFIG.WIDTH,
          y: SECTOR_CONFIG.HEIGHT,
        };
        velocity = { x: (this.getRandom() - 0.5) * speed, y: -speed };
        break;
      case 3: // left
        position = { x: 0, y: this.getRandom() * SECTOR_CONFIG.HEIGHT };
        velocity = { x: speed, y: (this.getRandom() - 0.5) * speed };
        break;
      default:
        position = { x: 0, y: 0 };
        velocity = { x: speed, y: 0 };
    }

    return { position, velocity };
  }

  private getShipSpawnPosition(angle: number): {
    position: Vector2D;
    velocity: Vector2D;
  } {
    const radians = (angle * Math.PI) / 180;
    const speed = SECTOR_CONFIG.SHIP_SPEED;

    // Spawn at random position along edge based on angle
    let position: Vector2D;
    if (angle >= 315 || angle < 45) {
      // right edge
      position = {
        x: SECTOR_CONFIG.WIDTH,
        y: this.getRandom() * SECTOR_CONFIG.HEIGHT,
      };
    } else if (angle >= 45 && angle < 135) {
      // bottom edge
      position = {
        x: this.getRandom() * SECTOR_CONFIG.WIDTH,
        y: SECTOR_CONFIG.HEIGHT,
      };
    } else if (angle >= 135 && angle < 225) {
      // left edge
      position = { x: 0, y: this.getRandom() * SECTOR_CONFIG.HEIGHT };
    } else {
      // top edge
      position = { x: this.getRandom() * SECTOR_CONFIG.WIDTH, y: 0 };
    }

    const velocity = {
      x: Math.cos(radians) * speed,
      y: Math.sin(radians) * speed,
    };

    return { position, velocity };
  }

  private findBestTargetShip(
    attackerPos: Vector2D,
    attackerShip: Ship,
    currentTargetId?: string | null
  ): string | null {
    let bestId: string | null = null;
    let bestScore = 0;
    let reachableCount = 0;
    let totalCargoShips = 0;

    this.debugLog(
      `Evaluating cargo ship targets for ship at (${Math.round(
        attackerPos.x
      )}, ${Math.round(attackerPos.y)})`
    );

    for (const [id, ship] of this.ships) {
      // Skip self and only target ships with full cargo that are exiting
      if (
        id === attackerShip.id ||
        !ship.fullCargo ||
        ship.state !== "exiting"
      ) {
        continue;
      }

      totalCargoShips++;

      // Check if this ship can be reached before it leaves the map
      if (this.canShipReachShip(attackerPos, ship, attackerShip)) {
        reachableCount++;
        const score = this.calculateShipTargetScore(
          attackerPos,
          ship,
          attackerShip
        );

        this.debugLog(
          `  Cargo Ship ${id}: score=${Math.round(score)}, fuel=${Math.round(
            ship.fuel
          )}, points=${ship.score}`
        );

        if (score > bestScore) {
          bestScore = score;
          bestId = id;
        }
      }
    }

    this.debugLog(
      `Ship found ${reachableCount}/${totalCargoShips} reachable cargo ships, selected: ${bestId} (score: ${
        Math.round(bestScore * 100) / 100
      })`
    );
    return bestId;
  }

  private findBestTargetAsteroid(
    shipPos: Vector2D,
    ship: Ship,
    currentTargetId?: string | null
  ): string | null {
    let bestId: string | null = null;
    let bestScore = 0;
    let reachableCount = 0;
    let totalCount = 0;

    // Get current target info for comparison
    const currentTarget = currentTargetId
      ? this.asteroids.get(currentTargetId)
      : null;
    const currentTargetScore = currentTarget
      ? this.calculateTargetScore(shipPos, currentTarget, ship)
      : 0;

    this.debugLog(
      `Evaluating targets for ship at (${Math.round(shipPos.x)}, ${Math.round(
        shipPos.y
      )})`
    );
    if (currentTarget) {
      this.debugLog(
        `Current target ${currentTargetId}: score=${
          Math.round(currentTargetScore * 100) / 100
        }`
      );
    }

    for (const [id, asteroid] of this.asteroids) {
      totalCount++;
      // Check if this asteroid can be reached before it leaves the map
      if (this.canShipReachAsteroid(shipPos, asteroid, ship)) {
        reachableCount++;
        const score = this.calculateTargetScore(shipPos, asteroid, ship);

        this.debugLog(
          `  Asteroid ${id}: size=${Math.round(asteroid.size)}, score=${
            Math.round(score * 100) / 100
          }`
        );

        if (score > bestScore) {
          bestScore = score;
          bestId = id;
        }
      }
    }

    // Only switch if the new target is significantly better than current target
    if (currentTarget && bestId !== currentTargetId) {
      const improvementRatio = bestScore / currentTargetScore;
      const minImprovement = ship.fullCargo ? 2.0 : 1.3; // Cargo ships need 2x improvement, empty ships need 1.3x

      this.debugLog(
        `Best new target ${bestId}: score=${
          Math.round(bestScore * 100) / 100
        }, improvement=${
          Math.round(improvementRatio * 100) / 100
        }x (need ${minImprovement}x)`
      );

      if (improvementRatio < minImprovement) {
        this.debugLog(
          `Sticking with current target - improvement not worth the switch`
        );
        return currentTargetId!;
      } else {
        this.debugLog(`Switching targets - significant improvement detected`);
      }
    }

    this.debugLog(
      `Ship found ${reachableCount}/${totalCount} reachable asteroids, selected: ${bestId} (score: ${
        Math.round(bestScore * 100) / 100
      })`
    );
    return bestId;
  }

  private calculateTargetScore(
    shipPos: Vector2D,
    asteroid: Asteroid,
    ship: Ship
  ): number {
    const currentTime = Date.now();
    const asteroidPos = PositionUtils.calculatePosition(asteroid, currentTime);

    // Calculate distance to asteroid
    const distance = Math.sqrt(
      Math.pow(asteroidPos.x - shipPos.x, 2) +
        Math.pow(asteroidPos.y - shipPos.y, 2)
    );

    // Calculate time to reach asteroid
    const shipSpeed = ShipAI.getShipSpeed(ship);
    const timeToReach = distance / shipSpeed;

    // Calculate fuel cost (time * fuel consumption rate)
    const fuelCost = timeToReach * SECTOR_CONFIG.FUEL_CONSUMPTION_RATE;

    // Calculate reward (asteroid size translates to points)
    const reward = asteroid.size * 2; // Base bounty calculation

    // Calculate time to edge (how long we have to mine this asteroid)
    const timeToEdge = AsteroidUtils.calculateTimeToMapEdge(asteroid);

    // Penalty for asteroids that will leave soon
    const urgencyFactor = Math.max(0.1, Math.min(1.0, timeToEdge / 20)); // 20 second reference

    // Score = Reward / (Distance Cost + Fuel Cost + Time Pressure)
    // Higher score = better target
    const distanceCost = distance / 100; // Normalize distance
    const timeCost = timeToReach / 10; // Normalize time
    const fuelPenalty = fuelCost * 2; // Fuel is precious

    const totalCost = Math.max(1, distanceCost + timeCost + fuelPenalty);
    const score = (reward * urgencyFactor) / totalCost;

    return score;
  }

  private calculateShipTargetScore(
    attackerPos: Vector2D,
    targetShip: Ship,
    attackerShip: Ship
  ): number {
    const currentTime = Date.now();
    const targetPos = PositionUtils.calculatePosition(targetShip, currentTime);

    // Calculate distance to target ship
    const distance = Math.sqrt(
      Math.pow(targetPos.x - attackerPos.x, 2) +
        Math.pow(targetPos.y - attackerPos.y, 2)
    );

    // Calculate time to reach target ship
    const attackerSpeed = ShipAI.getShipSpeed(attackerShip);
    const timeToReach = distance / attackerSpeed;

    // Calculate fuel cost (time * fuel consumption rate)
    const fuelCost = timeToReach * SECTOR_CONFIG.FUEL_CONSUMPTION_RATE;

    // Calculate reward (target ship's score + fuel)
    const pointReward = targetShip.score * 1.5; // 1.5x multiplier for ship kills
    const fuelReward = targetShip.fuel * 0.5; // Half the fuel value
    const totalReward = pointReward + fuelReward;

    // Calculate time to edge for target ship (how long we have to catch them)
    const timeToEdge = this.calculateShipTimeToEdge(targetShip);

    // Urgency factor - higher priority for ships about to escape
    const urgencyFactor = Math.max(0.1, Math.min(2.0, (30 - timeToEdge) / 15)); // More urgent as time decreases

    // Score = Reward * Urgency / (Distance Cost + Fuel Cost + Time Cost)
    const distanceCost = distance / 100; // Normalize distance
    const timeCost = timeToReach / 10; // Normalize time
    const fuelPenalty = fuelCost * 2; // Fuel is precious

    const totalCost = Math.max(1, distanceCost + timeCost + fuelPenalty);
    const score = (totalReward * urgencyFactor) / totalCost;

    return score;
  }

  private canShipReachShip(
    attackerPos: Vector2D,
    targetShip: Ship,
    attackerShip: Ship
  ): boolean {
    const currentTime = Date.now();
    const targetPos = PositionUtils.calculatePosition(targetShip, currentTime);

    // Calculate time for target ship to reach map edge
    const timeToEdge = this.calculateShipTimeToEdge(targetShip);

    // Calculate actual intercept time using the intercept math
    const d = {
      x: targetPos.x - attackerPos.x,
      y: targetPos.y - attackerPos.y,
    };
    const dv = targetShip.velocity;
    const Vs = ShipAI.getShipSpeed(attackerShip);

    const a = dv.x * dv.x + dv.y * dv.y - Vs * Vs;
    const b = 2 * (d.x * dv.x + d.y * dv.y);
    const c = d.x * d.x + d.y * d.y;

    const disc = b * b - 4 * a * c;

    if (disc < 0) {
      // Can't intercept, use simple distance estimate
      const distance = Math.sqrt(d.x * d.x + d.y * d.y);
      const timeToReach = distance / ShipAI.getShipSpeed(attackerShip);
      return timeToReach < timeToEdge;
    }

    const sqrtDisc = Math.sqrt(disc);
    let t1 = (-b - sqrtDisc) / (2 * a);
    let t2 = (-b + sqrtDisc) / (2 * a);
    const interceptTime =
      Math.min(t1, t2) > 0 ? Math.min(t1, t2) : Math.max(t1, t2);

    return interceptTime > 0 && interceptTime < timeToEdge;
  }

  private calculateShipTimeToEdge(ship: Ship): number {
    const currentTime = Date.now();
    const currentPos = PositionUtils.calculatePosition(ship, currentTime);
    const buffer = SECTOR_CONFIG.EXIT_REMOVAL_BUFFER;
    let minTime = Infinity;

    const edgeCalculations = [
      // Left edge
      ship.velocity.x < 0
        ? (currentPos.x + buffer) / Math.abs(ship.velocity.x)
        : Infinity,
      // Right edge
      ship.velocity.x > 0
        ? (SECTOR_CONFIG.WIDTH + buffer - currentPos.x) / ship.velocity.x
        : Infinity,
      // Top edge
      ship.velocity.y < 0
        ? (currentPos.y + buffer) / Math.abs(ship.velocity.y)
        : Infinity,
      // Bottom edge
      ship.velocity.y > 0
        ? (SECTOR_CONFIG.HEIGHT + buffer - currentPos.y) / ship.velocity.y
        : Infinity,
    ];

    minTime = Math.min(...edgeCalculations);
    return minTime === Infinity ? 1000 : minTime;
  }

  private canShipReachAsteroid(
    shipPos: Vector2D,
    asteroid: Asteroid,
    ship: Ship
  ): boolean {
    const currentTime = Date.now();
    const asteroidPos = PositionUtils.calculatePosition(asteroid, currentTime);

    // Calculate time for asteroid to reach map edge
    const timeToEdge = AsteroidUtils.calculateTimeToMapEdge(asteroid);

    // Calculate actual intercept time using the intercept math
    const d = { x: asteroidPos.x - shipPos.x, y: asteroidPos.y - shipPos.y };
    const dv = asteroid.velocity;
    const Vs = ShipAI.getShipSpeed(ship); // Use actual ship speed based on cargo status

    const a = dv.x * dv.x + dv.y * dv.y - Vs * Vs;
    const b = 2 * (d.x * dv.x + d.y * dv.y);
    const c = d.x * d.x + d.y * d.y;

    const disc = b * b - 4 * a * c;
    if (disc < 0) {
      // Can't intercept, use simple distance estimate
      const distance = Math.sqrt(d.x * d.x + d.y * d.y);
      const timeToReach = distance / ShipAI.getShipSpeed(ship);
      const canReach = timeToReach < timeToEdge;
      console.log(
        `Asteroid ${asteroid.id}: No intercept possible, distance=${Math.round(
          distance
        )}, timeToReach=${Math.round(timeToReach)}s, timeToEdge=${Math.round(
          timeToEdge
        )}s, reachable=${canReach}`
      );
      return canReach;
    }

    const sqrtDisc = Math.sqrt(disc);
    let t1 = (-b - sqrtDisc) / (2 * a);
    let t2 = (-b + sqrtDisc) / (2 * a);
    const interceptTime =
      Math.min(t1, t2) > 0 ? Math.min(t1, t2) : Math.max(t1, t2);

    const canReach = interceptTime > 0 && interceptTime < timeToEdge;
    console.log(
      `Asteroid ${asteroid.id}: interceptTime=${Math.round(
        interceptTime
      )}s, timeToEdge=${Math.round(timeToEdge)}s, reachable=${canReach}`
    );

    return canReach;
  }

  /**
   * Check if a ship should refuel at the station
   * @param ship The ship to check
   * @returns True if ship should refuel (low fuel + has credential)
   */
  private async shouldShipRefuel(ship: Ship): Promise<boolean> {
    // Check if fuel is below refuel threshold
    if (ship.fuel >= SECTOR_CONFIG.REFUEL_FUEL_THRESHOLD) {
      return false;
    }

    // Check if pilot has a valid credential for this sector
    const hasCredential = await this.blockchainManager.checkPilotHasCredential(
      ship.pilotAddress,
      this.id
    );

    this.debugLog(
      `Ship ${ship.id} (${ship.pilotName}) refuel check: fuel=${Math.round(
        ship.fuel
      )}%, hasCredential=${hasCredential}`
    );

    return hasCredential;
  }

  /**
   * Initiate refueling process for a ship
   * @param ship The ship to start refueling
   */
  private initiateRefueling(ship: Ship): void {
    const currentPos = PositionUtils.calculatePosition(ship, Date.now());
    const centerX = SECTOR_CONFIG.WIDTH / 2;
    const centerY = SECTOR_CONFIG.HEIGHT / 2;

    // Calculate direction to center
    const dx = centerX - currentPos.x;
    const dy = centerY - currentPos.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Calculate velocity to center at normal ship speed
    const speed = ShipAI.getShipSpeed(ship);
    const velocity = {
      x: (dx / distance) * speed,
      y: (dy / distance) * speed,
    };

    // Update ship state
    ship.state = "refueling";
    ship.position = currentPos;
    ship.velocity = velocity;
    ship.spawnTime = Date.now();
    ship.targetAsteroidId = null;
    ship.targetShipId = null;
    ship.targetStationId = "station_center"; // Mark ship as targeting the station
    ship.isVectorMatched = false; // Reset vector matching
    ship.vectorMatchTime = null;
    ship.lastCourseUpdate = this.gameLoopCounter;

    console.log(
      `⛽ Ship ${ship.id} (${
        ship.pilotName
      }) heading to station for refuel (fuel: ${Math.round(ship.fuel)}%)`
    );

    this.debugLog(
      `Ship ${ship.id} initiated refueling: pos=(${Math.round(
        currentPos.x
      )},${Math.round(
        currentPos.y
      )}), center=(${centerX},${centerY}), distance=${Math.round(distance)}`
    );

    // Broadcast refueling initiation
    this.broadcastEvent({
      type: "ship_retarget",
      timestamp: Date.now(),
      data: {
        shipId: ship.id,
        position: currentPos,
        velocity: ship.velocity,
        targetAsteroidId: null,
        targetShipId: null,
        targetStationId: "station_center",
        state: "refueling",
        fuel: ship.fuel,
      },
    });
  }

  /**
   * Complete refueling for a ship that has arrived at the station
   * @param ship The ship to refuel
   */
  private async completeRefueling(ship: Ship): Promise<void> {
    const currentTime = Date.now();

    // Set fuel to 100%
    ship.fuel = 100;

    // Get player address and station info
    const playerAddress = await this.blockchainManager.getSectorOwner(this.id);
    const aboutInfo = await this.blockchainManager.getAboutContractInfo(
      this.id
    );
    const stationName = aboutInfo.stationName || "Station";

    console.log(
      `⛽ Pilot ${ship.pilotName} refueled at ${stationName} (fuel: 100%)`
    );

    // Broadcast refuel event
    this.broadcastEvent({
      type: "ship_refuel",
      timestamp: currentTime,
      data: {
        shipId: ship.id,
        pilotAddress: ship.pilotAddress,
        pilotName: ship.pilotName,
        stationName: stationName,
        newFuel: 100,
      },
    });

    // Execute blockchain tip (async, don't wait)
    if (playerAddress) {
      this.executeRefuelTip(ship, playerAddress, stationName).catch((error) => {
        console.error(
          `Failed to execute refuel tip for pilot ${ship.pilotName}:`,
          error
        );
      });
    }

    // Return to flying state and assign new target
    ship.state = "flying";
    ship.targetStationId = null; // Clear station target
    ship.isVectorMatched = false; // Reset vector matching
    ship.vectorMatchTime = null;
    this.assignTarget(ship, "post-refuel targeting", false).catch((error) => {
      console.error(
        `Failed to assign target after refuel for ship ${ship.id}:`,
        error
      );
    });
  }

  /**
   * Execute the blockchain tip transaction for refueling
   * @param ship The ship that refueled
   * @param playerAddress The player to tip
   * @param stationName The name of the station
   */
  private async executeRefuelTip(
    ship: Ship,
    playerAddress: string,
    stationName: string
  ): Promise<void> {
    try {
      // Execute the tip transaction (+3 points for refueling)
      const txHash = await this.blockchainManager.executePilotTip(
        ship.privateKey,
        playerAddress,
        3
      );

      console.log(
        `💰 Pilot ${ship.pilotName} tipped player 3 points for refueling! (tx: ${txHash})`
      );

      // Broadcast successful tip event
      this.broadcastEvent({
        type: "pilot_tip",
        timestamp: Date.now(),
        data: {
          shipId: ship.id,
          pilotAddress: ship.pilotAddress,
          pilotName: ship.pilotName,
          playerAddress,
          tipAmount: 3,
          reason: "refueling",
          transactionHash: txHash,
          stationName: stationName,
        },
      });
    } catch (error: any) {
      this.debugLog(`Failed to execute refuel tip: ${error.message}`);

      // Broadcast failed tip event
      this.broadcastEvent({
        type: "pilot_tip",
        timestamp: Date.now(),
        data: {
          shipId: ship.id,
          pilotAddress: ship.pilotAddress,
          pilotName: ship.pilotName,
          playerAddress,
          tipAmount: 3,
          reason: "refueling",
          error: error.message,
          stationName: stationName,
        },
      });
    }
  }

  /**
   * Unified targeting function that handles all ship targeting scenarios
   * @param ship The ship to assign a target to
   * @param reason Why targeting is happening (for debugging)
   * @param forceRetarget Whether to force a retarget even if current target is good
   */
  private async assignTarget(
    ship: Ship,
    reason: string,
    forceRetarget: boolean = false
  ): Promise<void> {
    // PRIORITY 0: Check if ship needs to refuel (lowest fuel, highest priority)
    // This check happens before all other targeting logic
    if (await this.shouldShipRefuel(ship)) {
      this.initiateRefueling(ship);
      return;
    }

    // Reset vector matching when retargeting
    if (forceRetarget || (!ship.targetAsteroidId && !ship.targetShipId)) {
      ship.isVectorMatched = false;
      ship.vectorMatchTime = null;
    }

    const currentPos = PositionUtils.calculatePosition(ship, Date.now());
    const currentAsteroidTarget = ship.targetAsteroidId;
    const currentShipTarget = ship.targetShipId;

    this.debugLog(`Assigning target for ship ${ship.id} - reason: ${reason}`);

    // PRIORITY 1: Look for full cargo ships to attack (highest priority)
    const targetShipId = this.findBestTargetShip(
      currentPos,
      ship,
      forceRetarget ? null : ship.targetShipId
    );

    if (targetShipId && targetShipId !== currentShipTarget) {
      // Found a cargo ship to attack
      const targetShip = this.ships.get(targetShipId);
      if (targetShip) {
        const oldShipTarget = ship.targetShipId;
        const oldAsteroidTarget = ship.targetAsteroidId;

        // Clear old targets and set new ship target
        ship.targetAsteroidId = null;
        ship.targetShipId = targetShipId;

        // Calculate intercept course for ship-to-ship combat
        const interceptResult = ShipAI.calculateShipInterceptCourse(
          currentPos,
          targetShip,
          ship
        );
        ship.velocity = interceptResult.velocity;
        ship.interceptTime = interceptResult.interceptTime;
        ship.position = currentPos;
        ship.spawnTime = Date.now();
        ship.lastCourseUpdate = this.gameLoopCounter;

        this.debugLog(
          `Ship ${
            ship.id
          } targeting cargo ship ${targetShipId} (was asteroid: ${
            oldAsteroidTarget || "none"
          }, ship: ${oldShipTarget || "none"})`
        );

        // Broadcast the ship targeting event
        this.broadcastEvent({
          type: "ship_retarget",
          timestamp: Date.now(),
          data: {
            shipId: ship.id,
            position: ship.position,
            velocity: ship.velocity,
            targetAsteroidId: ship.targetAsteroidId,
            targetShipId: ship.targetShipId,
            state: ship.state,
            fuel: ship.fuel,
          },
        });

        // Broadcast the ship targeting event
        this.broadcastEvent({
          type: "ship_retarget",
          timestamp: Date.now(),
          data: {
            shipId: ship.id,
            position: currentPos,
            velocity: ship.velocity,
            targetAsteroidId: null,
            targetShipId: targetShipId,
            state: ship.state,
            fuel: ship.fuel,
          },
        });
        return;
      }
    } else if (targetShipId === currentShipTarget && currentShipTarget) {
      // Keeping current ship target - no change needed
      this.debugLog(
        `Ship ${ship.id} keeping current ship target ${currentShipTarget}`
      );
      return;
    }

    // PRIORITY 2: No cargo ships available, look for asteroids
    const targetAsteroidId = this.findBestTargetAsteroid(
      currentPos,
      ship,
      forceRetarget ? null : ship.targetAsteroidId
    );

    if (targetAsteroidId && targetAsteroidId !== currentAsteroidTarget) {
      // Found a new asteroid target
      const targetAsteroid = this.asteroids.get(targetAsteroidId);
      if (targetAsteroid) {
        const oldAsteroidTarget = ship.targetAsteroidId;
        const oldShipTarget = ship.targetShipId;

        // Clear old targets and set new asteroid target
        ship.targetShipId = null;
        ship.targetAsteroidId = targetAsteroidId;

        // Calculate intercept course for asteroid
        const interceptResult = ShipAI.calculateInterceptCourse(
          currentPos,
          targetAsteroid,
          ship
        );
        ship.velocity = interceptResult.velocity;
        ship.interceptTime = interceptResult.interceptTime;
        ship.position = currentPos;
        ship.spawnTime = Date.now();
        ship.lastCourseUpdate = this.gameLoopCounter;

        this.debugLog(
          `Ship ${
            ship.id
          } targeting asteroid ${targetAsteroidId} (was asteroid: ${
            oldAsteroidTarget || "none"
          }, ship: ${oldShipTarget || "none"})`
        );

        // Broadcast the asteroid targeting event
        this.broadcastEvent({
          type: "ship_retarget",
          timestamp: Date.now(),
          data: {
            shipId: ship.id,
            position: ship.position,
            velocity: ship.velocity,
            targetAsteroidId: ship.targetAsteroidId,
            targetShipId: ship.targetShipId,
            state: ship.state,
            fuel: ship.fuel,
          },
        });

        // Broadcast the asteroid targeting event
        this.broadcastEvent({
          type: "ship_retarget",
          timestamp: Date.now(),
          data: {
            shipId: ship.id,
            position: currentPos,
            velocity: ship.velocity,
            targetAsteroidId: targetAsteroidId,
            targetShipId: null,
            state: ship.state,
            fuel: ship.fuel,
          },
        });
        return;
      }
    } else if (
      targetAsteroidId === currentAsteroidTarget &&
      currentAsteroidTarget
    ) {
      // Keeping current asteroid target - no change needed
      this.debugLog(
        `Ship ${ship.id} keeping current asteroid target ${currentAsteroidTarget}`
      );
      return;
    }

    // PRIORITY 3: No suitable targets found - fly toward center and wait
    ship.targetAsteroidId = null;
    ship.targetShipId = null;
    ship.velocity = ShipAI.calculateCenterVelocity(currentPos, ship);
    ship.position = currentPos;
    ship.spawnTime = Date.now();
    ship.lastCourseUpdate = this.gameLoopCounter;

    this.debugLog(`Ship ${ship.id} has no targets, flying to center to wait`);

    // Broadcast center-flying event
    this.broadcastEvent({
      type: "ship_retarget",
      timestamp: Date.now(),
      data: {
        shipId: ship.id,
        position: currentPos,
        velocity: ship.velocity,
        targetAsteroidId: null,
        targetShipId: null,
        state: ship.state,
        fuel: ship.fuel,
      },
    });
  }

  private checkArrival(): void {
    const currentTime = Date.now();

    // First, identify which asteroids are being mined by vector-matched ships
    const asteroidsBeingMined = new Map<string, string>(); // asteroidId -> shipId
    const shipsBeingAttacked = new Map<string, string>(); // targetShipId -> attackerShipId

    for (const [shipId, ship] of this.ships) {
      if (ship.state === "flying" && ship.isVectorMatched) {
        if (ship.targetAsteroidId) {
          asteroidsBeingMined.set(ship.targetAsteroidId, shipId);
        }
        if (ship.targetShipId) {
          shipsBeingAttacked.set(ship.targetShipId, shipId);
        }
      }
    }

    for (const [shipId, ship] of this.ships) {
      if (ship.state !== "flying") continue;

      // Handle ship-to-ship combat first (higher priority)
      if (ship.targetShipId) {
        this.checkShipCombatArrival(ship, currentTime, shipsBeingAttacked);
        continue;
      }

      // Handle asteroid targeting
      if (ship.targetAsteroidId) {
        this.checkAsteroidArrival(ship, currentTime, asteroidsBeingMined);
        continue;
      }
    }
  }

  private checkShipCombatArrival(
    attackerShip: Ship,
    currentTime: number,
    shipsBeingAttacked: Map<string, string>
  ): void {
    const targetShip = this.ships.get(attackerShip.targetShipId!);
    if (!targetShip) {
      // Target ship no longer exists, find a new target
      if (!attackerShip.isVectorMatched) {
        this.assignTarget(attackerShip, "target ship missing", true).catch(
          (error) => {
            console.error(
              `Failed to assign target for ship ${attackerShip.id}:`,
              error
            );
          }
        );
      }
      return;
    }

    const attackerPos = PositionUtils.calculatePosition(
      attackerShip,
      currentTime
    );
    const targetPos = PositionUtils.calculatePosition(targetShip, currentTime);

    const distance = Math.sqrt(
      Math.pow(targetPos.x - attackerPos.x, 2) +
        Math.pow(targetPos.y - attackerPos.y, 2)
    );

    // Check if attacker reached target ship (within combat range)
    if (distance < SECTOR_CONFIG.SHIP_COMBAT_RANGE) {
      // If this ship is being attacked by a vector-matched ship and this attacker isn't that ship, retarget
      const currentAttackerShipId = shipsBeingAttacked.get(
        attackerShip.targetShipId!
      );
      if (currentAttackerShipId && currentAttackerShipId !== attackerShip.id) {
        this.debugLog(
          `Ship ${attackerShip.id} reached target ship ${targetShip.id} but ship ${currentAttackerShipId} is already attacking it`
        );
        this.assignTarget(
          attackerShip,
          "target ship already being attacked",
          true
        ).catch((error) => {
          console.error(
            `Failed to assign target for ship ${attackerShip.id}:`,
            error
          );
        });
        return;
      }

      // Attacker successfully destroys the target ship
      const stolenScore = targetShip.score;
      const stolenFuel = Math.floor(targetShip.fuel * 0.8); // Get 80% of remaining fuel

      attackerShip.score += stolenScore;
      attackerShip.fuel = Math.min(
        attackerShip.maxFuel,
        attackerShip.fuel + stolenFuel
      );
      attackerShip.fullCargo = true; // Attacker now has cargo and moves slower

      console.log(
        `Ship ${attackerShip.id} destroyed ship ${targetShip.id}! Gained ${stolenScore} points and ${stolenFuel} fuel. Now carrying cargo and moving slower.`
      );

      this.debugLog(`Ship combat completed`, {
        attacker: attackerShip.id,
        target: targetShip.id,
        stolenScore,
        stolenFuel,
        attackerNewScore: attackerShip.score,
        attackerNewFuel: attackerShip.fuel,
        attackerNowSlower: attackerShip.fullCargo,
      });

      // Broadcast ship destruction event
      this.broadcastEvent({
        type: "ship_destroyed",
        timestamp: currentTime,
        data: {
          attackerId: attackerShip.id,
          victimId: targetShip.id,
          attackerPilotAddress: attackerShip.pilotAddress,
          attackerPilotName: attackerShip.pilotName,
          victimPilotAddress: targetShip.pilotAddress,
          victimPilotName: targetShip.pilotName,
          stolenScore,
          stolenFuel,
          attackerPosition: attackerPos,
          victimPosition: targetPos,
        },
      });

      // Mark the victim pilot as dead in the local system
      this.pilotManager.markPilotAsDead(
        targetShip.pilotAddress,
        attackerShip.pilotAddress
      );

      // Execute deadMansSwitch on blockchain (async, don't wait)
      this.executeDeadMansSwitch(targetShip, attackerShip, currentTime).catch(
        (error) => {
          console.error(
            `Failed to execute deadMansSwitch for pilot ${targetShip.pilotName}:`,
            error
          );
        }
      );

      // Broadcast pilot death event
      this.broadcastEvent({
        type: "pilot_death",
        timestamp: currentTime,
        data: {
          victimPilotAddress: targetShip.pilotAddress,
          victimPilotName: targetShip.pilotName,
          killerPilotAddress: attackerShip.pilotAddress,
          killerPilotName: attackerShip.pilotName,
          sectorId: this.id,
          deathPosition: targetPos,
        },
      });

      // Remove the destroyed ship
      this.ships.delete(targetShip.id);

      // Retarget any other ships that were attacking the destroyed ship
      for (const [otherShipId, otherShip] of this.ships) {
        if (
          otherShipId !== attackerShip.id &&
          otherShip.state === "flying" &&
          otherShip.targetShipId === targetShip.id
        ) {
          console.log(
            `Found ship ${otherShipId} also targeting destroyed ship ${targetShip.id}, retargeting...`
          );
          this.assignTarget(otherShip, "target ship was destroyed", true).catch(
            (error) => {
              console.error(
                `Failed to assign target for ship ${otherShipId}:`,
                error
              );
            }
          );
        }
      }

      // Attacker starts flying toward nearest edge (fastest exit)
      attackerShip.state = "exiting";
      attackerShip.targetShipId = null;
      attackerShip.targetAsteroidId = null;
      attackerShip.position = attackerPos;
      attackerShip.velocity = ShipAI.calculateExitVelocity(
        attackerPos,
        attackerShip
      );
      attackerShip.spawnTime = currentTime;
      attackerShip.isVectorMatched = false;
      attackerShip.vectorMatchTime = null;
      attackerShip.lastCourseUpdate = this.gameLoopCounter;

      console.log(
        `Ship ${attackerShip.id} finished combat, now exiting by shortest path`
      );

      // Notify all ships about new cargo ship target (highest priority)
      this.notifyShipsAboutCargoTarget();

      // Broadcast ship direction change
      this.broadcastEvent({
        type: "ship_retarget",
        timestamp: currentTime,
        data: {
          shipId: attackerShip.id,
          position: attackerPos,
          velocity: attackerShip.velocity,
          targetAsteroidId: null,
          targetShipId: null,
          state: "exiting",
          fuel: attackerShip.fuel,
        },
      });
    }
  }

  private checkAsteroidArrival(
    ship: Ship,
    currentTime: number,
    asteroidsBeingMined: Map<string, string>
  ): void {
    if (!ship.targetAsteroidId) return;

    const asteroid = this.asteroids.get(ship.targetAsteroidId);
    if (!asteroid) {
      // Target asteroid no longer exists, find a new one (but only if not vector-matched)
      if (!ship.isVectorMatched) {
        this.assignTarget(ship, "target asteroid missing", true).catch(
          (error) => {
            console.error(
              `Failed to assign target for ship ${ship.id}:`,
              error
            );
          }
        );
      }
      return;
    }

    const shipPos = PositionUtils.calculatePosition(ship, currentTime);
    const asteroidPos = PositionUtils.calculatePosition(asteroid, currentTime);

    const distance = Math.sqrt(
      Math.pow(asteroidPos.x - shipPos.x, 2) +
        Math.pow(asteroidPos.y - shipPos.y, 2)
    );

    // Check if ship reached asteroid (within mining range) - balanced for all sizes
    if (distance < asteroid.size / 4 + 50) {
      // If this asteroid is being mined by a vector-matched ship and this ship isn't that ship, retarget
      const miningShipId = asteroidsBeingMined.get(ship.targetAsteroidId);
      if (miningShipId && miningShipId !== ship.id) {
        this.debugLog(
          `Ship ${ship.id} reached asteroid ${asteroid.id} but ship ${miningShipId} is already mining it`
        );
        this.assignTarget(ship, "asteroid already being mined", true).catch(
          (error) => {
            console.error(
              `Failed to assign target for ship ${ship.id}:`,
              error
            );
          }
        );
        return;
      }

      // Ship immediately mines the asteroid - bounty based on asteroid size
      const baseBounty = Math.floor(asteroid.size * 2); // Bigger asteroids = more bounty
      const randomBonus = Math.floor(this.getRandom() * asteroid.size); // Random bonus based on size
      ship.score = baseBounty + randomBonus;
      ship.fullCargo = true; // Ship now has cargo and moves slower

      console.log(
        `Ship ${ship.id} reached asteroid ${asteroid.id} and mined it for ${ship.score} points! Now carrying cargo and moving slower.`
      );

      this.debugLog(`Ship ${ship.id} mined asteroid ${asteroid.id}`, {
        asteroidSize: Math.round(asteroid.size),
        baseBounty,
        randomBonus,
        totalScore: ship.score,
        shipNowSlower: ship.fullCargo,
      });

      // Delete the asteroid immediately
      this.asteroids.delete(asteroid.id);

      this.broadcastEvent({
        type: "asteroid_depleted",
        timestamp: currentTime,
        data: { asteroidId: asteroid.id, score: ship.score },
      });

      // Retarget any other ships that were flying to this asteroid
      console.log(
        `Checking for other ships targeting asteroid ${asteroid.id}...`
      );
      for (const [otherShipId, otherShip] of this.ships) {
        if (
          otherShipId !== ship.id &&
          otherShip.state === "flying" &&
          otherShip.targetAsteroidId === asteroid.id
        ) {
          console.log(
            `Found ship ${otherShipId} also targeting ${asteroid.id}, retargeting...`
          );
          // Retarget ships that were targeting the mined asteroid
          this.assignTarget(otherShip, "target asteroid was mined", true).catch(
            (error) => {
              console.error(
                `Failed to assign target for ship ${otherShipId}:`,
                error
              );
            }
          );
        }
      }

      // Ship starts flying toward nearest edge (fastest exit)
      ship.state = "exiting";
      ship.targetAsteroidId = null; // clear target so no further re-aiming happens
      ship.targetShipId = null; // clear ship target too
      ship.position = shipPos;
      ship.velocity = ShipAI.calculateExitVelocity(shipPos, ship);
      ship.spawnTime = currentTime;
      ship.isVectorMatched = false; // Reset vector matching
      ship.vectorMatchTime = null;
      ship.lastCourseUpdate = this.gameLoopCounter;

      console.log(
        `Ship ${ship.id} finished mining, now exiting by shortest path`
      );

      // Notify all ships about new cargo ship target (highest priority)
      this.notifyShipsAboutCargoTarget();

      // Broadcast ship direction change
      this.broadcastEvent({
        type: "ship_retarget",
        timestamp: currentTime,
        data: {
          shipId: ship.id,
          position: shipPos,
          velocity: ship.velocity,
          targetAsteroidId: null,
          targetShipId: null,
          state: "exiting",
          fuel: ship.fuel,
        },
      });
    }
  }

  private spawnAsteroid(): void {
    const { position, velocity } = this.getRandomEdgePosition();

    // Randomly select asteroid size category
    const sizeCategories: (keyof typeof SECTOR_CONFIG.ASTEROID_SIZES)[] = [
      "small",
      "medium",
      "large",
    ];
    const randomIndex = Math.floor(this.getRandom() * sizeCategories.length);
    const sizeCategory = sizeCategories[randomIndex];
    const sizeConfig = SECTOR_CONFIG.ASTEROID_SIZES[sizeCategory];

    const asteroid: Asteroid = {
      id: this.generateId(),
      position,
      velocity,
      size: sizeConfig.size,
      sizeCategory: sizeCategory,
      resources:
        sizeConfig.minResources +
        this.getRandom() * (sizeConfig.maxResources - sizeConfig.minResources),
      spawnTime: Date.now(),
    };

    this.debugLog(
      `Spawning asteroid ${asteroid.id} at (${Math.round(
        position.x
      )}, ${Math.round(position.y)}) size: ${sizeCategory} (${asteroid.size})`
    );

    this.asteroids.set(asteroid.id, asteroid);
    this.broadcastEvent({
      type: "asteroid_spawn",
      timestamp: Date.now(),
      data: asteroid,
    });

    // Notify all waiting ships (those without targets) about the new asteroid
    this.notifyWaitingShips();
  }

  private async spawnShip(): Promise<void> {
    if (this.asteroids.size === 0) return;

    // All managers are required - no fallbacks

    // Select an available pilot
    const selectedPilot =
      await this.characterManager.selectRandomAvailablePilot(
        this.pilotManager,
        this.blockchainManager,
        this.getRandom()
      );

    if (!selectedPilot) {
      const totalPilots = this.characterManager.getCharacterCount();
      const assignedPilots = this.pilotManager.getAssignedPilotsCount();
      console.log(
        `❌ No available pilots for ship spawning in sector ${this.id} - ${assignedPilots}/${totalPilots} pilots currently assigned to sectors`
      );
      return;
    }

    // Assign pilot to this sector
    this.pilotManager.assignPilotToSector(selectedPilot.publicAddress, this.id);

    const angle = this.getRandom() * 360;
    const { position } = this.getShipSpawnPosition(angle);

    // Use pilot's current fuel level instead of random fuel
    const startingFuel = selectedPilot.fuel;
    const ship: Ship = {
      id: this.generateId(),
      address: selectedPilot.publicAddress, // Use pilot's address
      privateKey: selectedPilot.privateKey, // Use pilot's private key
      pilotAddress: selectedPilot.publicAddress, // Pilot reference
      pilotName: `${selectedPilot.firstname} ${selectedPilot.lastname}`, // Display name
      shipType: selectedPilot.ship, // Ship size
      position,
      velocity: { x: 0, y: 0 },
      targetAsteroidId: null,
      targetShipId: null,
      targetStationId: null,
      state: "flying",
      spawnTime: Date.now(),
      spawnAngle: angle,
      score: 0,
      fuel: startingFuel,
      maxFuel: 100, // Max fuel is always 100%
      isLockedOn: false,
      interceptTime: null,
      isVectorMatched: false,
      vectorMatchTime: null,
      fullCargo: false,
      lastCourseUpdate: this.gameLoopCounter,
    };

    console.log(
      `🚀 Spawning ship ${ship.id} with pilot ${ship.pilotName} (ship ${
        selectedPilot.ship
      }) at (${Math.round(position.x)}, ${Math.round(
        position.y
      )}) with ${Math.round(startingFuel)}% fuel (pilot's current fuel)`
    );

    // Attempt to mint credential (fire and forget - don't await)
    this.attemptCredentialMinting(ship).catch((error) => {
      console.error(
        `Error in credential minting for pilot ${ship.pilotName}:`,
        error
      );
    });

    // Assign initial target for newly spawned ship
    // CRITICAL: Await this to ensure ship state (e.g., "refueling") is set BEFORE ship enters game loop
    // This prevents race condition where low-fuel ships get forced to exit before refueling state is set
    await this.assignTarget(ship, "initial spawn targeting", false);

    this.ships.set(ship.id, ship);
    this.broadcastEvent({
      type: "ship_spawn",
      timestamp: Date.now(),
      data: {
        id: ship.id,
        address: ship.address,
        pilotAddress: ship.pilotAddress,
        pilotName: ship.pilotName,
        shipType: ship.shipType,
        position: ship.position,
        velocity: ship.velocity,
        targetAsteroidId: ship.targetAsteroidId,
        targetShipId: ship.targetShipId,
        targetStationId: ship.targetStationId,
        state: ship.state,
        spawnTime: ship.spawnTime,
        spawnAngle: ship.spawnAngle,
        score: ship.score,
        fuel: ship.fuel,
        maxFuel: ship.maxFuel,
      },
    });
  }

  private async updateShips(): Promise<void> {
    const currentTime = Date.now();
    const shipsToRemove: string[] = [];

    for (const [shipId, ship] of this.ships) {
      // Consume fuel based on movement (only if moving)
      const speed = Math.sqrt(
        ship.velocity.x * ship.velocity.x + ship.velocity.y * ship.velocity.y
      );
      if (speed > 0) {
        const timeSinceUpdate = (currentTime - this.lastUpdate) / 1000;
        const fuelConsumed =
          SECTOR_CONFIG.FUEL_CONSUMPTION_RATE * timeSinceUpdate;
        ship.fuel = Math.max(0, ship.fuel - fuelConsumed);
      }

      // Check if ship is refueling and has vector matched at station
      if (
        ship.state === "refueling" &&
        ship.isVectorMatched &&
        ship.targetStationId
      ) {
        const currentShipPos = PositionUtils.calculatePosition(
          ship,
          currentTime
        );
        const centerX = SECTOR_CONFIG.WIDTH / 2;
        const centerY = SECTOR_CONFIG.HEIGHT / 2;
        const distanceToCenter = Math.sqrt(
          Math.pow(currentShipPos.x - centerX, 2) +
            Math.pow(currentShipPos.y - centerY, 2)
        );

        // Check if ship is close enough to the station (should be, since they vector matched)
        if (distanceToCenter < SECTOR_CONFIG.REFUEL_ARRIVAL_DISTANCE) {
          this.debugLog(
            `Ship ${
              ship.id
            } vector matched at station for refueling (distance: ${Math.round(
              distanceToCenter
            )})`
          );
          // Complete refueling (async, but don't await to avoid blocking game loop)
          this.completeRefueling(ship).catch((error) => {
            console.error(
              `Failed to complete refueling for ship ${ship.id}:`,
              error
            );
          });
        }
      }
      // Check if ship needs to exit due to low fuel
      else if (
        ship.fuel < SECTOR_CONFIG.LOW_FUEL_THRESHOLD &&
        ship.state !== "exiting" &&
        ship.state !== "refueling"
      ) {
        // CRITICAL: Check if ship can refuel before forcing exit
        if (await this.shouldShipRefuel(ship)) {
          console.log(
            `Ship ${ship.id} low on fuel (${Math.round(
              ship.fuel
            )}%) but has credential - heading to station instead of exiting`
          );
          this.initiateRefueling(ship);
        } else {
          // No credential - must exit
          console.log(
            `Ship ${ship.id} low on fuel (${Math.round(
              ship.fuel
            )}%) and no credential - heading to exit`
          );
          ship.state = "exiting";
          ship.targetAsteroidId = null;
          ship.targetShipId = null;
          const currentShipPos = PositionUtils.calculatePosition(
            ship,
            currentTime
          );
          ship.velocity = ShipAI.calculateExitVelocity(currentShipPos, ship);
          ship.position = currentShipPos;
          ship.spawnTime = currentTime;
          ship.lastCourseUpdate = this.gameLoopCounter;

          // Broadcast fuel exit event
          this.broadcastEvent({
            type: "ship_retarget",
            timestamp: currentTime,
            data: {
              shipId: ship.id,
              position: currentShipPos,
              velocity: ship.velocity,
              targetAsteroidId: null,
              targetShipId: null,
              state: "exiting",
              fuel: ship.fuel,
            },
          });
        }
      } else if (ship.state === "flying" && !ship.isVectorMatched) {
        // Recalculate course every N game loops to adjust for moving targets (but not for vector-matched ships)
        // This ensures performance regardless of UPDATE_INTERVAL setting
        const cyclesSinceLastUpdate =
          this.gameLoopCounter - ship.lastCourseUpdate;
        if (cyclesSinceLastUpdate >= SECTOR_CONFIG.COURSE_RECALC_CYCLES) {
          const currentShipPos = PositionUtils.calculatePosition(
            ship,
            currentTime
          );

          // Handle ship-to-ship targeting recalculation
          if (ship.targetShipId) {
            const targetShip = this.ships.get(ship.targetShipId);
            if (targetShip) {
              const interceptResult = ShipAI.calculateShipInterceptCourse(
                currentShipPos,
                targetShip,
                ship
              );
              ship.velocity = interceptResult.velocity;
              ship.interceptTime = interceptResult.interceptTime;
              ship.position = currentShipPos;
              ship.spawnTime = currentTime;
              ship.lastCourseUpdate = this.gameLoopCounter; // Update the cycle counter

              // Broadcast course recalculation event
              this.broadcastEvent({
                type: "ship_retarget",
                timestamp: currentTime,
                data: {
                  shipId: ship.id,
                  position: ship.position,
                  velocity: ship.velocity,
                  targetAsteroidId: ship.targetAsteroidId,
                  targetShipId: ship.targetShipId,
                  state: ship.state,
                  fuel: ship.fuel,
                },
              });
            }
          }
          // Handle asteroid targeting recalculation
          else if (ship.targetAsteroidId) {
            const asteroid = this.asteroids.get(ship.targetAsteroidId);
            if (asteroid) {
              const interceptResult = ShipAI.calculateInterceptCourse(
                currentShipPos,
                asteroid,
                ship
              );
              ship.velocity = interceptResult.velocity;
              ship.interceptTime = interceptResult.interceptTime;
              ship.position = currentShipPos;
              ship.spawnTime = currentTime;
              ship.lastCourseUpdate = this.gameLoopCounter; // Update the cycle counter

              // Broadcast course recalculation event
              this.broadcastEvent({
                type: "ship_retarget",
                timestamp: currentTime,
                data: {
                  shipId: ship.id,
                  position: ship.position,
                  velocity: ship.velocity,
                  targetAsteroidId: ship.targetAsteroidId,
                  targetShipId: ship.targetShipId,
                  state: ship.state,
                  fuel: ship.fuel,
                },
              });
            }
          }
        }
      }

      // Check if ANY ship (flying or exiting) is out of bounds
      const currentPos = PositionUtils.calculatePosition(ship, currentTime);
      if (
        PositionUtils.isOutOfBounds(
          currentPos,
          SECTOR_CONFIG.WIDTH,
          SECTOR_CONFIG.HEIGHT
        )
      ) {
        if (ship.state === "exiting") {
          // Normal exit - ship intentionally left
          const fuelBonus = Math.floor(ship.fuel / 3); // fuel remaining / 3 for bonus points
          const finalScore = ship.score + fuelBonus;

          console.log(
            `Ship ${ship.id} has left the sector with mining score ${
              ship.score
            } + fuel bonus ${fuelBonus} = total ${finalScore} at position (${Math.round(
              currentPos.x
            )}, ${Math.round(currentPos.y)})`
          );

          // Broadcast ship_exit event when ship actually leaves
          this.broadcastEvent({
            type: "ship_exit",
            timestamp: currentTime,
            data: {
              shipId: ship.id,
              pilotName: ship.pilotName,
              position: currentPos,
              score: finalScore,
              miningScore: ship.score,
              fuelBonus: fuelBonus,
              fuelRemaining: ship.fuel,
            },
          });

          // Handle pilot tipping based on final score
          this.handlePilotTipping(ship, finalScore);
        } else if (
          ship.state === "flying" &&
          ship.isVectorMatched &&
          ship.targetAsteroidId
        ) {
          // Vector-matched ship drifted off with asteroid - let them mine it!
          const asteroid = this.asteroids.get(ship.targetAsteroidId);
          if (asteroid) {
            this.debugLog(
              `Vector-matched ship ${ship.id} and asteroid ${ship.targetAsteroidId} drifted off together - mining asteroid`
            );

            // Ship successfully mines the asteroid even though off-screen
            const baseBounty = Math.floor(asteroid.size * 2);
            const randomBonus = Math.floor(this.getRandom() * asteroid.size);
            ship.score = baseBounty + randomBonus;
            ship.fullCargo = true;

            console.log(
              `Ship ${ship.id} mined asteroid ${asteroid.id} while drifting off-screen for ${ship.score} points!`
            );

            this.debugLog(`Off-screen mining`, {
              asteroidSize: Math.round(asteroid.size),
              baseBounty,
              randomBonus,
              totalScore: ship.score,
              shipNowSlower: ship.fullCargo,
            });

            // Remove the asteroid since it was mined
            this.asteroids.delete(asteroid.id);

            // Broadcast asteroid depletion
            this.broadcastEvent({
              type: "asteroid_depleted",
              timestamp: currentTime,
              data: { asteroidId: asteroid.id, score: ship.score },
            });

            // Now treat as normal exit with full rewards
            const fuelBonus = Math.floor(ship.fuel / 3);
            const finalScore = ship.score + fuelBonus;

            console.log(
              `Ship ${ship.id} has left the sector with mining score ${ship.score} + fuel bonus ${fuelBonus} = total ${finalScore} (off-screen mining)`
            );

            // Broadcast normal ship_exit event
            this.broadcastEvent({
              type: "ship_exit",
              timestamp: currentTime,
              data: {
                shipId: ship.id,
                pilotName: ship.pilotName,
                position: currentPos,
                score: finalScore,
                miningScore: ship.score,
                fuelBonus: fuelBonus,
                fuelRemaining: ship.fuel,
              },
            });

            // Handle pilot tipping based on final score
            this.handlePilotTipping(ship, finalScore);
          } else {
            // Vector-matched but asteroid already gone - emergency exit
            this.debugLog(
              `Vector-matched ship ${ship.id} drifted off but asteroid ${ship.targetAsteroidId} was already gone`
            );

            console.log(
              `Ship ${ship.id} drifted off the map while flying (score: ${ship.score})`
            );

            this.broadcastEvent({
              type: "ship_exit",
              timestamp: currentTime,
              data: {
                shipId: ship.id,
                pilotName: ship.pilotName,
                position: currentPos,
                score: ship.score,
                miningScore: ship.score,
                fuelBonus: 0,
                fuelRemaining: ship.fuel,
              },
            });

            // Handle pilot tipping based on final score (no fuel bonus)
            this.handlePilotTipping(ship, ship.score);
          }
        } else {
          // Regular flying ship drifted off (shouldn't happen with smart targeting)
          this.debugLog(
            `Flying ship ${ship.id} drifted off screen while targeting ${ship.targetAsteroidId}`
          );

          console.log(
            `Ship ${ship.id} drifted off the map while flying (score: ${ship.score})`
          );

          this.broadcastEvent({
            type: "ship_exit",
            timestamp: currentTime,
            data: {
              shipId: ship.id,
              pilotName: ship.pilotName,
              position: currentPos,
              score: ship.score,
              miningScore: ship.score,
              fuelBonus: 0,
              fuelRemaining: ship.fuel,
            },
          });

          // Handle pilot tipping based on final score (no fuel bonus)
          this.handlePilotTipping(ship, ship.score);
        }

        shipsToRemove.push(shipId);
        this.debugLog(
          `Marking ship ${ship.id} for removal (${ship.state} state)`
        );
      }
      // Note: checkArrival() handles collision detection for flying ships
    }

    // Remove ships that have exited
    shipsToRemove.forEach((shipId) => {
      console.log(`Actually deleting ship ${shipId} from sector`);
      this.ships.delete(shipId);
    });
  }

  private updateAsteroids(): void {
    const currentTime = Date.now();
    const asteroidsToRemove: string[] = [];

    for (const [asteroidId, asteroid] of this.asteroids) {
      const currentPos = PositionUtils.calculatePosition(asteroid, currentTime);

      if (
        PositionUtils.isOutOfBounds(
          currentPos,
          SECTOR_CONFIG.WIDTH,
          SECTOR_CONFIG.HEIGHT
        )
      ) {
        asteroidsToRemove.push(asteroidId);
      }
    }

    // Remove asteroids and update ships that were targeting them
    asteroidsToRemove.forEach((asteroidId) => {
      console.log(`Asteroid ${asteroidId} drifted off the map`);

      // Broadcast asteroid exit event
      this.broadcastEvent({
        type: "asteroid_exit",
        timestamp: currentTime,
        data: { asteroidId },
      });

      this.asteroids.delete(asteroidId);

      // Find ships targeting this deleted asteroid and give them new targets
      for (const [shipId, ship] of this.ships) {
        if (ship.targetAsteroidId === asteroidId && ship.state === "flying") {
          this.assignTarget(
            ship,
            "target asteroid drifted off map",
            true
          ).catch((error) => {
            console.error(`Failed to assign target for ship ${shipId}:`, error);
          });
        }
      }
    });
  }

  /**
   * Inner loop update - fast operations (ship movement, mining, battles)
   */
  public async updateInnerLoop(): Promise<void> {
    // Increment game loop counter for performance tracking
    this.gameLoopCounter++;

    // Check if ships have arrived at their targets (mining, battles)
    this.checkArrival();

    // Update entities (movement, fuel consumption, retargeting)
    await this.updateShips();
    this.updateAsteroids();

    this.lastUpdate = Date.now();
  }

  /**
   * Outer loop update - heavy operations (spawning new entities)
   */
  public async updateOuterLoop(): Promise<void> {
    // Roll dice for spawning new entities
    const roll = this.getRandom();
    if (roll < SECTOR_CONFIG.ASTEROID_SPAWN_CHANCE) {
      this.spawnAsteroid();
    } else if (
      roll <
      SECTOR_CONFIG.ASTEROID_SPAWN_CHANCE + SECTOR_CONFIG.SHIP_SPAWN_CHANCE
    ) {
      try {
        await this.spawnShip();
      } catch (error: any) {
        console.error(
          `Error spawning ship in sector ${this.id}:`,
          error.message
        );
        this.debugLog("Ship spawn error details:", error);
      }
    }
  }

  /**
   * Legacy update method for backward compatibility
   * @deprecated Use updateInnerLoop() and updateOuterLoop() instead
   */
  public async update(): Promise<void> {
    this.updateInnerLoop();
    await this.updateOuterLoop();
  }

  public getSnapshot(): SectorSnapshot {
    const asteroidSnapshot: Record<string, Asteroid> = {};
    const shipSnapshot: Record<string, Ship> = {};

    // Convert maps to objects and exclude private keys from ships
    for (const [id, asteroid] of this.asteroids) {
      asteroidSnapshot[id] = asteroid;
    }

    for (const [id, ship] of this.ships) {
      shipSnapshot[id] = {
        ...ship,
        privateKey: "", // Never expose private keys
      };
    }

    return {
      asteroids: asteroidSnapshot,
      ships: shipSnapshot,
      lastUpdate: this.lastUpdate,
    };
  }

  /**
   * Execute deadMansSwitch transaction when a pilot is killed
   */
  private async executeDeadMansSwitch(
    victimShip: Ship,
    killerShip: Ship,
    currentTime: number
  ): Promise<void> {
    try {
      this.debugLog(
        `Executing deadMansSwitch for pilot ${victimShip.pilotName}`
      );

      // Get the sector owner (player to penalize)
      const playerAddress = await this.blockchainManager.getSectorOwner(
        this.id
      );
      if (!playerAddress) {
        this.debugLog(
          `Could not find sector owner for ${this.id}, skipping deadMansSwitch`
        );
        return;
      }

      // Calculate remaining ETH to send (victim's remaining fuel as a percentage of gas funding)
      const remainingFuelPercentage = victimShip.fuel / 100;
      const ethToSend = (remainingFuelPercentage * 0.001).toString(); // Small amount based on fuel

      // Execute the deadMansSwitch transaction
      const txHash = await this.blockchainManager.executeDeadMansSwitch(
        victimShip.privateKey,
        killerShip.pilotAddress,
        playerAddress,
        ethToSend
      );

      console.log(
        `💀 DeadMansSwitch executed! Pilot ${victimShip.pilotName} killed by ${killerShip.pilotName}. Player ${playerAddress} penalized -10 points. (tx: ${txHash})`
      );

      // Broadcast deadMansSwitch event
      this.broadcastEvent({
        type: "pilot_death",
        timestamp: currentTime,
        data: {
          victimPilotAddress: victimShip.pilotAddress,
          victimPilotName: victimShip.pilotName,
          killerPilotAddress: killerShip.pilotAddress,
          killerPilotName: killerShip.pilotName,
          playerPenalized: playerAddress,
          scorePenalty: 10,
          ethForwarded: ethToSend,
          transactionHash: txHash,
          sectorId: this.id,
          blockchainConfirmed: true,
        },
      });
    } catch (error: any) {
      this.debugLog(`Failed to execute deadMansSwitch: ${error.message}`);

      // Broadcast failed deadMansSwitch event
      this.broadcastEvent({
        type: "pilot_death",
        timestamp: currentTime,
        data: {
          victimPilotAddress: victimShip.pilotAddress,
          victimPilotName: victimShip.pilotName,
          killerPilotAddress: killerShip.pilotAddress,
          killerPilotName: killerShip.pilotName,
          sectorId: this.id,
          error: error.message,
          blockchainConfirmed: false,
        },
      });
    }
  }

  /**
   * Attempt to mint a credential when a pilot enters the sector
   */
  private async attemptCredentialMinting(ship: Ship): Promise<void> {
    try {
      this.debugLog(
        `Attempting credential minting for pilot ${ship.pilotName} in sector ${this.id}`
      );

      // Step 0: Check if pilot is actually active on blockchain
      const isPilot = await this.blockchainManager.isPilot(ship.pilotAddress);

      if (!isPilot) {
        this.debugLog(
          `Pilot ${ship.pilotName} is not an active pilot on blockchain (dead or not registered), skipping credential minting`
        );
        console.log(
          `ℹ️  Pilot ${ship.pilotName} is not active on blockchain, skipping credential minting`
        );
        return;
      }

      // Step 1: Look up registry address for this sector
      const registryAddress =
        await this.blockchainManager.getRegistryAddressForSector(this.id);

      if (
        !registryAddress ||
        registryAddress === "0x0000000000000000000000000000000000000000"
      ) {
        this.debugLog(`Sector ${this.id} has no registry, skipping credential`);
        console.log(
          `ℹ️  Sector ${this.id.slice(0, 10)}... has no registry configured`
        );
        return;
      }

      this.debugLog(`Found registry at ${registryAddress}`);

      // Step 2: Look up credential address from registry
      const credentialAddress =
        await this.blockchainManager.getCredentialAddress(registryAddress);

      if (
        !credentialAddress ||
        credentialAddress === "0x0000000000000000000000000000000000000000"
      ) {
        this.debugLog(
          `Registry ${registryAddress} has no credential contract registered`
        );
        console.log(
          `ℹ️  Sector ${this.id.slice(
            0,
            10
          )}... has no credential contract registered`
        );
        return;
      }

      this.debugLog(`Found credential contract at ${credentialAddress}`);

      // Step 2.5: Check if pilot has already minted from this player
      const playerAddress = await this.blockchainManager.getSectorOwner(
        this.id
      );

      if (!playerAddress) {
        this.debugLog(`Could not find sector owner, skipping credential`);
        return;
      }

      const hasAlreadyMinted =
        await this.blockchainManager.hasPilotMintedFromPlayer(
          ship.pilotAddress,
          playerAddress
        );

      if (hasAlreadyMinted) {
        console.log(
          `ℹ️  Pilot ${ship.pilotName} already bought a credential for this sector`
        );
        return;
      }

      // Step 3: Attempt to mint credential
      const result = await this.blockchainManager.attemptCredentialMint(
        ship.privateKey,
        credentialAddress,
        ship.pilotAddress
      );

      // Step 4: Log the result
      if (result.success) {
        if (result.alreadyOwned) {
          console.log(
            `ℹ️  Pilot ${
              ship.pilotName
            } already owns credential for sector ${this.id.slice(0, 10)}...`
          );
        } else {
          console.log(
            `✅ Pilot ${
              ship.pilotName
            } minted credential ${credentialAddress.slice(
              0,
              10
            )}... from sector ${this.id.slice(
              0,
              10
            )}... (tx: ${result.txHash?.slice(0, 10)}...)`
          );

          // Broadcast credential minted event to notify the sector view
          this.broadcastEvent({
            type: "credential_minted",
            timestamp: Date.now(),
            data: {
              pilotAddress: ship.pilotAddress,
              pilotName: ship.pilotName,
              sectorId: this.id,
              credentialAddress: credentialAddress,
              transactionHash: result.txHash,
              pointsEarned: 2, // Chapter 3 specifies 2 points for credential minting
            },
          });
        }
      } else {
        // Check if pilot already minted from this player (special case - not an error)
        if (
          result.error &&
          result.error.includes("PilotAlreadyMintedFromPlayer")
        ) {
          console.log(
            `ℹ️  Pilot ${ship.pilotName} already bought a credential for this sector`
          );
        }
        // Check if this is a simulation failure (likely credential contract issue)
        else if (result.error && result.error.includes("Simulation failed")) {
          console.log(
            `⚠️  Pilot ${ship.pilotName} couldn't mint credential - the player's credential contract has implementation issues`
          );

          // Broadcast credential mint failure event to notify the player
          this.broadcastEvent({
            type: "credential_mint_failed",
            timestamp: Date.now(),
            data: {
              pilotAddress: ship.pilotAddress,
              pilotName: ship.pilotName,
              sectorId: this.id,
              credentialAddress: credentialAddress,
              error: result.error,
              errorDetails: result.errorDetails,
              reason:
                "Contract simulation failed - check your credential contract implementation",
            },
          });
        } else {
          // Display error with decoded details if available
          const errorMsg = result.errorDetails
            ? `${result.error}\n   ℹ️  ${result.errorDetails}`
            : result.error;
          console.log(
            `❌ Pilot ${ship.pilotName} failed to mint credential: ${errorMsg}`
          );
        }
      }
    } catch (error: any) {
      this.debugLog(
        `Error in credential minting for pilot ${ship.pilotName}:`,
        error
      );
      console.log(
        `❌ Credential minting error for pilot ${ship.pilotName}: ${error.message}`
      );
    }
  }

  /**
   * Handle pilot tipping when a ship exits the sector
   */
  private async handlePilotTipping(
    ship: Ship,
    finalScore: number
  ): Promise<void> {
    try {
      // Release pilot from sector assignment
      this.pilotManager.releasePilotFromSector(ship.pilotAddress);
      this.debugLog(`Released pilot ${ship.pilotName} from sector ${this.id}`);

      // Update pilot's fuel level based on ship's remaining fuel
      this.characterManager.updatePilotFuel(ship.pilotAddress, ship.fuel);
      this.debugLog(`Updated pilot ${ship.pilotName} fuel to ${ship.fuel}%`);

      // Calculate enhanced tip amount based on final score and about contract status
      const { tipAmount, aboutInfo } =
        await this.blockchainManager.calculateEnhancedTipAmount(
          finalScore,
          this.id
        );

      if (tipAmount === 0) {
        this.debugLog(
          `Ship ${ship.id} (${ship.pilotName}) scored ${finalScore} - no tip (below threshold)`
        );
        return;
      }

      const tipType = aboutInfo.hasAboutContract ? "enhanced" : "standard";
      const stationInfo = aboutInfo.stationName
        ? ` (station: "${aboutInfo.stationName}")`
        : "";

      console.log(
        `💰 Ship ${ship.id} (${ship.pilotName}) scored ${finalScore} - attempting ${tipType} tip of ${tipAmount}${stationInfo}`
      );

      // Get the player address (sector owner)
      const playerAddress = await this.blockchainManager.getSectorOwner(
        this.id
      );
      if (!playerAddress) {
        console.log(
          `❌ Could not find sector owner for sector ${this.id}, skipping tip`
        );
        return;
      }

      console.log(
        `   ├─ Sector owner: ${playerAddress}`
      );
      console.log(
        `   ├─ Pilot address: ${ship.pilotAddress}`
      );
      console.log(
        `   └─ Tip amount: ${tipAmount} points`
      );

      // Execute the tip transaction
      try {
        const txHash = await this.blockchainManager.executePilotTip(
          ship.privateKey,
          playerAddress,
          tipAmount
        );

        const tipTypeText = aboutInfo.hasAboutContract
          ? " (enhanced)"
          : " (standard)";
        console.log(
          `✅ Pilot ${ship.pilotName} tipped player ${tipAmount} points${tipTypeText}! (tx: ${txHash})`
        );

        // Broadcast tip event
        this.broadcastEvent({
          type: "pilot_tip",
          timestamp: Date.now(),
          data: {
            shipId: ship.id,
            pilotAddress: ship.pilotAddress,
            pilotName: ship.pilotName,
            playerAddress,
            tipAmount,
            finalScore,
            transactionHash: txHash,
            aboutInfo: {
              hasAboutContract: aboutInfo.hasAboutContract,
              stationName: aboutInfo.stationName,
              tipType: aboutInfo.hasAboutContract ? "enhanced" : "standard",
            },
          },
        });
      } catch (error: any) {
        console.error(`❌ Failed to execute tip transaction: ${error.message}`);
        if (error.code) {
          console.error(`   ├─ Error code: ${error.code}`);
        }
        if (error.reason) {
          console.error(`   ├─ Reason: ${error.reason}`);
        }
        if (error.data) {
          console.error(`   └─ Data: ${JSON.stringify(error.data)}`);
        } else {
          console.error(`   └─ Full error: ${error.stack || error}`);
        }

        // Broadcast failed tip event
        this.broadcastEvent({
          type: "pilot_tip",
          timestamp: Date.now(),
          data: {
            shipId: ship.id,
            pilotAddress: ship.pilotAddress,
            pilotName: ship.pilotName,
            playerAddress,
            tipAmount,
            finalScore,
            error: error.message,
            aboutInfo: {
              hasAboutContract: aboutInfo.hasAboutContract,
              stationName: aboutInfo.stationName,
              tipType: aboutInfo.hasAboutContract ? "enhanced" : "standard",
            },
          },
        });
      }
    } catch (error: any) {
      console.error(`❌ Error in handlePilotTipping: ${error.message}`);
      console.error(`   └─ ${error.stack || error}`);
    }
  }

  private broadcastEvent(event: SectorEvent): void {
    const message = JSON.stringify(event);
    this.subscribers.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(message);
      }
    });
  }

  public addSubscriber(ws: WebSocket): void {
    this.subscribers.add(ws);
  }

  public removeSubscriber(ws: WebSocket): void {
    this.subscribers.delete(ws);
  }

  public handleVectorMatching(
    shipId: string,
    targetId: string,
    position: Vector2D,
    velocity: Vector2D,
    targetType: "asteroid" | "ship" | "station" = "asteroid"
  ): void {
    const ship = this.ships.get(shipId);

    if (!ship) {
      return; // Invalid ship
    }

    // Validate target based on type
    if (targetType === "asteroid") {
      const asteroid = this.asteroids.get(targetId);
      if (!asteroid || ship.targetAsteroidId !== targetId) {
        return; // Invalid asteroid request
      }

      console.log(
        `Backend: Ship ${shipId} vector matched with asteroid ${targetId}`
      );

      // Update ship state
      ship.isVectorMatched = true;
      ship.vectorMatchTime = Date.now();
      ship.position = position;
      ship.velocity = velocity;
      ship.spawnTime = Date.now();

      // Broadcast the vector matching event to all subscribers
      this.broadcastEvent({
        type: "ship_vector_matched",
        timestamp: Date.now(),
        data: {
          shipId: ship.id,
          asteroidId: asteroid.id,
          targetShipId: null,
          targetStationId: null,
          position: ship.position,
          velocity: ship.velocity,
        },
      });
    } else if (targetType === "ship") {
      const targetShip = this.ships.get(targetId);
      if (!targetShip || ship.targetShipId !== targetId) {
        return; // Invalid ship request
      }

      console.log(
        `Backend: Ship ${shipId} vector matched with target ship ${targetId}`
      );

      // Update ship state
      ship.isVectorMatched = true;
      ship.vectorMatchTime = Date.now();
      ship.position = position;
      ship.velocity = velocity;
      ship.spawnTime = Date.now();

      // Broadcast the vector matching event to all subscribers
      this.broadcastEvent({
        type: "ship_vector_matched",
        timestamp: Date.now(),
        data: {
          shipId: ship.id,
          asteroidId: null,
          targetShipId: targetShip.id,
          targetStationId: null,
          position: ship.position,
          velocity: ship.velocity,
        },
      });
    } else if (targetType === "station") {
      // Validate that ship is in refueling state and targeting the station
      if (ship.state !== "refueling" || ship.targetStationId !== targetId) {
        return; // Invalid station request
      }

      console.log(
        `Backend: Ship ${shipId} vector matched with station ${targetId}`
      );

      // Update ship state
      ship.isVectorMatched = true;
      ship.vectorMatchTime = Date.now();
      ship.position = position;
      ship.velocity = velocity; // Should be {x: 0, y: 0} for stationary station
      ship.spawnTime = Date.now();

      // Broadcast the vector matching event to all subscribers
      this.broadcastEvent({
        type: "ship_vector_matched",
        timestamp: Date.now(),
        data: {
          shipId: ship.id,
          asteroidId: null,
          targetShipId: null,
          targetStationId: targetId,
          position: ship.position,
          velocity: ship.velocity,
        },
      });
    }
  }

  private notifyWaitingShips(): void {
    // Check all flying ships to see if they should switch to the new (potentially bigger) asteroid
    for (const [shipId, ship] of this.ships) {
      if (ship.state === "flying" && !ship.isVectorMatched) {
        // Don't retarget vector-matched ships
        const currentShipPos = PositionUtils.calculatePosition(
          ship,
          Date.now()
        );
        // Check if ship should switch to a better target
        this.assignTarget(ship, "checking for better targets", false).catch(
          (error) => {
            console.error(`Failed to assign target for ship ${shipId}:`, error);
          }
        );
      }
    }
  }

  private notifyShipsAboutCargoTarget(): void {
    // Check ALL flying ships to see if they should switch to attack cargo ships
    // This includes vector-matched ships because cargo ships have higher priority
    for (const [shipId, ship] of this.ships) {
      if (ship.state === "flying") {
        const currentShipPos = PositionUtils.calculatePosition(
          ship,
          Date.now()
        );
        // Force retarget to check for cargo ships (highest priority)
        this.assignTarget(ship, "new cargo ship available", true).catch(
          (error) => {
            console.error(`Failed to assign target for ship ${shipId}:`, error);
          }
        );
      }
    }
  }
}
