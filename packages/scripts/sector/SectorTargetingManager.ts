// Ship targeting system - handles finding and assigning targets

import type { Ship, Asteroid, Vector2D } from "../types";
import { SECTOR_CONFIG } from "../types";
import { PositionUtils } from "../utils/PositionUtils";
import { ShipAI } from "../utils/ShipAI";
import { AsteroidUtils } from "../utils/AsteroidUtils";
import type { BlockchainManager } from "../managers/blockchain";

export class SectorTargetingManager {
  constructor(
    private blockchainManager: BlockchainManager,
    private sectorId: string,
    private debugMode: boolean = false
  ) {}

  private debugLog(message: string, data?: any): void {
    if (this.debugMode) {
      const timestamp = new Date().toISOString().split("T")[1].split(".")[0];
      if (data) {
        console.log(`🎯 [${timestamp}] SectorTargeting - ${message}:`, data);
      } else {
        console.log(`🎯 [${timestamp}] SectorTargeting - ${message}`);
      }
    }
  }

  public findBestTargetShip(
    attackerPos: Vector2D,
    attackerShip: Ship,
    ships: Map<string, Ship>,
    currentTargetId?: string | null
  ): string | null {
    let bestId: string | null = null;
    let bestScore = 0;

    for (const [id, ship] of ships) {
      if (
        id === attackerShip.id ||
        !ship.fullCargo ||
        ship.state !== "exiting"
      ) {
        continue;
      }

      if (this.canShipReachShip(attackerPos, ship, attackerShip, ships)) {
        const score = this.calculateShipTargetScore(
          attackerPos,
          ship,
          attackerShip,
          ships
        );

        if (score > bestScore) {
          bestScore = score;
          bestId = id;
        }
      }
    }

    return bestId;
  }

  public findBestTargetAsteroid(
    shipPos: Vector2D,
    ship: Ship,
    asteroids: Map<string, Asteroid>,
    currentTargetId?: string | null
  ): string | null {
    let bestId: string | null = null;
    let bestScore = 0;

    const currentTarget = currentTargetId
      ? asteroids.get(currentTargetId)
      : null;
    const currentTargetScore = currentTarget
      ? this.calculateTargetScore(shipPos, currentTarget, ship)
      : 0;

    for (const [id, asteroid] of asteroids) {
      if (this.canShipReachAsteroid(shipPos, asteroid, ship)) {
        const score = this.calculateTargetScore(shipPos, asteroid, ship);

        if (score > bestScore) {
          bestScore = score;
          bestId = id;
        }
      }
    }

    // Only switch if new target is significantly better
    if (currentTarget && bestId !== currentTargetId) {
      const improvementRatio = bestScore / currentTargetScore;
      const minImprovement = ship.fullCargo ? 2.0 : 1.3;

      if (improvementRatio < minImprovement) {
        return currentTargetId!;
      }
    }

    return bestId;
  }

  private calculateTargetScore(
    shipPos: Vector2D,
    asteroid: Asteroid,
    ship: Ship
  ): number {
    const currentTime = Date.now();
    const asteroidPos = PositionUtils.calculatePosition(asteroid, currentTime);

    const distance = Math.sqrt(
      Math.pow(asteroidPos.x - shipPos.x, 2) +
        Math.pow(asteroidPos.y - shipPos.y, 2)
    );

    const shipSpeed = ShipAI.getShipSpeed(ship);
    const timeToReach = distance / shipSpeed;
    const fuelCost = timeToReach * SECTOR_CONFIG.FUEL_CONSUMPTION_RATE;
    const reward = asteroid.size * 2;
    const timeToEdge = AsteroidUtils.calculateTimeToMapEdge(asteroid);
    const urgencyFactor = Math.max(0.1, Math.min(1.0, timeToEdge / 20));

    const distanceCost = distance / 100;
    const timeCost = timeToReach / 10;
    const fuelPenalty = fuelCost * 2;
    const totalCost = Math.max(1, distanceCost + timeCost + fuelPenalty);

    return (reward * urgencyFactor) / totalCost;
  }

  private calculateShipTargetScore(
    attackerPos: Vector2D,
    targetShip: Ship,
    attackerShip: Ship,
    ships: Map<string, Ship>
  ): number {
    const currentTime = Date.now();
    const targetPos = PositionUtils.calculatePosition(targetShip, currentTime);

    const distance = Math.sqrt(
      Math.pow(targetPos.x - attackerPos.x, 2) +
        Math.pow(targetPos.y - attackerPos.y, 2)
    );

    const attackerSpeed = ShipAI.getShipSpeed(attackerShip);
    const timeToReach = distance / attackerSpeed;
    const fuelCost = timeToReach * SECTOR_CONFIG.FUEL_CONSUMPTION_RATE;

    const pointReward = targetShip.score * 1.5;
    const fuelReward = targetShip.fuel * 0.5;
    const totalReward = pointReward + fuelReward;

    const timeToEdge = this.calculateShipTimeToEdge(targetShip);
    const urgencyFactor = Math.max(0.1, Math.min(2.0, (30 - timeToEdge) / 15));

    const distanceCost = distance / 100;
    const timeCost = timeToReach / 10;
    const fuelPenalty = fuelCost * 2;
    const totalCost = Math.max(1, distanceCost + timeCost + fuelPenalty);

    return (totalReward * urgencyFactor) / totalCost;
  }

  private canShipReachShip(
    attackerPos: Vector2D,
    targetShip: Ship,
    attackerShip: Ship,
    ships: Map<string, Ship>
  ): boolean {
    const currentTime = Date.now();
    const targetPos = PositionUtils.calculatePosition(targetShip, currentTime);
    const timeToEdge = this.calculateShipTimeToEdge(targetShip);

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
      ship.velocity.x < 0
        ? (currentPos.x + buffer) / Math.abs(ship.velocity.x)
        : Infinity,
      ship.velocity.x > 0
        ? (SECTOR_CONFIG.WIDTH + buffer - currentPos.x) / ship.velocity.x
        : Infinity,
      ship.velocity.y < 0
        ? (currentPos.y + buffer) / Math.abs(ship.velocity.y)
        : Infinity,
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
    const timeToEdge = AsteroidUtils.calculateTimeToMapEdge(asteroid);

    const d = { x: asteroidPos.x - shipPos.x, y: asteroidPos.y - shipPos.y };
    const dv = asteroid.velocity;
    const Vs = ShipAI.getShipSpeed(ship);

    const a = dv.x * dv.x + dv.y * dv.y - Vs * Vs;
    const b = 2 * (d.x * dv.x + d.y * dv.y);
    const c = d.x * d.x + d.y * d.y;
    const disc = b * b - 4 * a * c;

    if (disc < 0) {
      const distance = Math.sqrt(d.x * d.x + d.y * d.y);
      const timeToReach = distance / ShipAI.getShipSpeed(ship);
      return timeToReach < timeToEdge;
    }

    const sqrtDisc = Math.sqrt(disc);
    let t1 = (-b - sqrtDisc) / (2 * a);
    let t2 = (-b + sqrtDisc) / (2 * a);
    const interceptTime =
      Math.min(t1, t2) > 0 ? Math.min(t1, t2) : Math.max(t1, t2);

    return interceptTime > 0 && interceptTime < timeToEdge;
  }

  /**
   * Unified targeting function - handles all ship targeting scenarios
   */
  public async assignTarget(
    ship: Ship,
    ships: Map<string, Ship>,
    asteroids: Map<string, Asteroid>,
    gameLoopCounter: number,
    reason: string,
    forceRetarget: boolean,
    shouldShipRefuel: (ship: Ship) => Promise<boolean>,
    initiateRefueling: (ship: Ship) => void,
    broadcastEvent: (event: any) => void
  ): Promise<void> {
    // Skip if already refueling
    if (ship.state === "refueling") {
      return;
    }

    // PRIORITY 0: Check if ship needs to refuel
    if (await shouldShipRefuel(ship)) {
      initiateRefueling(ship);
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

    // PRIORITY 1: Look for cargo ships to attack
    const targetShipId = this.findBestTargetShip(
      currentPos,
      ship,
      ships,
      forceRetarget ? null : ship.targetShipId
    );

    if (targetShipId && targetShipId !== currentShipTarget) {
      const targetShip = ships.get(targetShipId);
      if (targetShip) {
        ship.targetAsteroidId = null;
        ship.targetShipId = targetShipId;

        const interceptResult = ShipAI.calculateShipInterceptCourse(
          currentPos,
          targetShip,
          ship
        );
        ship.velocity = interceptResult.velocity;
        ship.interceptTime = interceptResult.interceptTime;
        ship.position = currentPos;
        ship.spawnTime = Date.now();
        ship.lastCourseUpdate = gameLoopCounter;

        broadcastEvent({
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
      return; // Keep current ship target
    }

    // PRIORITY 2: Look for asteroids
    const targetAsteroidId = this.findBestTargetAsteroid(
      currentPos,
      ship,
      asteroids,
      forceRetarget ? null : ship.targetAsteroidId
    );

    if (targetAsteroidId && targetAsteroidId !== currentAsteroidTarget) {
      const targetAsteroid = asteroids.get(targetAsteroidId);
      if (targetAsteroid) {
        ship.targetShipId = null;
        ship.targetAsteroidId = targetAsteroidId;

        const interceptResult = ShipAI.calculateInterceptCourse(
          currentPos,
          targetAsteroid,
          ship
        );
        ship.velocity = interceptResult.velocity;
        ship.interceptTime = interceptResult.interceptTime;
        ship.position = currentPos;
        ship.spawnTime = Date.now();
        ship.lastCourseUpdate = gameLoopCounter;

        broadcastEvent({
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
      return; // Keep current asteroid target
    }

    // PRIORITY 3: No targets - fly to center
    ship.targetAsteroidId = null;
    ship.targetShipId = null;
    ship.velocity = ShipAI.calculateCenterVelocity(currentPos, ship);
    ship.position = currentPos;
    ship.spawnTime = Date.now();
    ship.lastCourseUpdate = gameLoopCounter;

    broadcastEvent({
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

  public notifyWaitingShips(
    ships: Map<string, Ship>,
    assignTarget: (ship: Ship, reason: string, force: boolean) => Promise<void>
  ): void {
    for (const [shipId, ship] of ships) {
      if (ship.state === "flying" && !ship.isVectorMatched) {
        assignTarget(ship, "checking for better targets", false).catch(
          (error) => {
            console.error(`Failed to assign target for ship ${shipId}:`, error);
          }
        );
      }
    }
  }

  public notifyShipsAboutCargoTarget(
    ships: Map<string, Ship>,
    assignTarget: (ship: Ship, reason: string, force: boolean) => Promise<void>
  ): void {
    for (const [shipId, ship] of ships) {
      if (ship.state === "flying") {
        assignTarget(ship, "new cargo ship available", true).catch(
          (error) => {
            console.error(`Failed to assign target for ship ${shipId}:`, error);
          }
        );
      }
    }
  }
}
