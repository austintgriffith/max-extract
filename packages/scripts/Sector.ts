import {
  generatePrivateKey,
  privateKeyToAccount,
  PrivateKeyAccount,
} from "viem/accounts";
import { createHash, randomBytes } from "crypto";
import { WebSocket } from "ws";
import {
  Vector2D,
  Asteroid,
  Ship,
  SectorEvent,
  SectorSnapshot,
  SECTOR_CONFIG,
} from "./types";
import { PositionUtils } from "./utils/PositionUtils";
import { ShipAI } from "./utils/ShipAI";
import { AsteroidUtils } from "./utils/AsteroidUtils";
import { DeterministicDice, createSectorDice } from "./utils/DeterministicDice";

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

  constructor(id: string, seed?: string, debugMode: boolean = false) {
    this.id = id;
    this.debugMode = debugMode;

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
   * Unified targeting function that handles all ship targeting scenarios
   * @param ship The ship to assign a target to
   * @param reason Why targeting is happening (for debugging)
   * @param forceRetarget Whether to force a retarget even if current target is good
   */
  private assignTarget(
    ship: Ship,
    reason: string,
    forceRetarget: boolean = false
  ): void {
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
        this.assignTarget(attackerShip, "target ship missing", true);
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
        );
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
          stolenScore,
          stolenFuel,
          attackerPosition: attackerPos,
          victimPosition: targetPos,
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
          this.assignTarget(otherShip, "target ship was destroyed", true);
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
        this.assignTarget(ship, "target asteroid missing", true);
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
    if (distance < asteroid.size / 6 + 11) {
      // If this asteroid is being mined by a vector-matched ship and this ship isn't that ship, retarget
      const miningShipId = asteroidsBeingMined.get(ship.targetAsteroidId);
      if (miningShipId && miningShipId !== ship.id) {
        this.debugLog(
          `Ship ${ship.id} reached asteroid ${asteroid.id} but ship ${miningShipId} is already mining it`
        );
        this.assignTarget(ship, "asteroid already being mined", true);
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
          this.assignTarget(otherShip, "target asteroid was mined", true);
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

  private spawnShip(): void {
    if (this.asteroids.size === 0) return;

    const privateKey = generatePrivateKey();
    const account: PrivateKeyAccount = privateKeyToAccount(privateKey);
    const angle = this.getRandom() * 360;
    const { position } = this.getShipSpawnPosition(angle);

    const startingFuel = 50 + this.getRandom() * 40; // 50-90% fuel
    const ship: Ship = {
      id: this.generateId(),
      address: account.address,
      privateKey,
      position,
      velocity: { x: 0, y: 0 },
      targetAsteroidId: null,
      targetShipId: null, // Initialize ship targeting
      state: "flying",
      spawnTime: Date.now(),
      spawnAngle: angle,
      score: 0,
      fuel: startingFuel,
      maxFuel: startingFuel,
      isLockedOn: false,
      interceptTime: null,
      isVectorMatched: false,
      vectorMatchTime: null,
      fullCargo: false, // Ships start with no cargo
      lastCourseUpdate: this.gameLoopCounter, // Initialize with current game loop
    };

    this.debugLog(
      `Spawning ship ${ship.id} at (${Math.round(position.x)}, ${Math.round(
        position.y
      )}) with ${Math.round(startingFuel)}% fuel`
    );

    // Assign initial target for newly spawned ship
    this.assignTarget(ship, "initial spawn targeting", false);

    this.ships.set(ship.id, ship);
    this.broadcastEvent({
      type: "ship_spawn",
      timestamp: Date.now(),
      data: {
        id: ship.id,
        address: ship.address,
        position: ship.position,
        velocity: ship.velocity,
        targetAsteroidId: ship.targetAsteroidId,
        targetShipId: ship.targetShipId,
        state: ship.state,
        spawnTime: ship.spawnTime,
        spawnAngle: ship.spawnAngle,
        score: ship.score,
        fuel: ship.fuel,
        maxFuel: ship.maxFuel,
      },
    });
  }

  private updateShips(): void {
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

      // Check if ship needs to exit due to low fuel
      if (
        ship.fuel < SECTOR_CONFIG.LOW_FUEL_THRESHOLD &&
        ship.state !== "exiting"
      ) {
        console.log(
          `Ship ${ship.id} low on fuel (${Math.round(
            ship.fuel
          )}%), heading to exit`
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
              position: currentPos,
              score: finalScore,
              miningScore: ship.score,
              fuelBonus: fuelBonus,
              fuelRemaining: ship.fuel,
            },
          });
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
                position: currentPos,
                score: finalScore,
                miningScore: ship.score,
                fuelBonus: fuelBonus,
                fuelRemaining: ship.fuel,
              },
            });
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
                position: currentPos,
                score: ship.score,
                miningScore: ship.score,
                fuelBonus: 0,
                fuelRemaining: ship.fuel,
              },
            });
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
              position: currentPos,
              score: ship.score,
              miningScore: ship.score,
              fuelBonus: 0,
              fuelRemaining: ship.fuel,
            },
          });
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
          this.assignTarget(ship, "target asteroid drifted off map", true);
        }
      }
    });
  }

  public update(): void {
    // Increment game loop counter for performance tracking
    this.gameLoopCounter++;

    // Roll dice for spawning
    const roll = this.getRandom();
    if (roll < SECTOR_CONFIG.ASTEROID_SPAWN_CHANCE) {
      this.spawnAsteroid();
    } else if (
      roll <
      SECTOR_CONFIG.ASTEROID_SPAWN_CHANCE + SECTOR_CONFIG.SHIP_SPAWN_CHANCE
    ) {
      this.spawnShip();
    }

    // Check if ships have arrived at their targets
    this.checkArrival();

    // Update entities
    this.updateShips();
    this.updateAsteroids();

    this.lastUpdate = Date.now();
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
    targetType: "asteroid" | "ship" = "asteroid"
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
        this.assignTarget(ship, "checking for better targets", false);
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
        this.assignTarget(ship, "new cargo ship available", true);
      }
    }
  }
}
