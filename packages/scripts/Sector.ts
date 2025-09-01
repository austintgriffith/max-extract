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

export class Sector {
  public id: string;
  public asteroids: Map<string, Asteroid> = new Map();
  public ships: Map<string, Ship> = new Map();
  public events: SectorEvent[] = [];
  public subscribers: Set<WebSocket> = new Set();
  private rng: () => number;
  private lastUpdate: number = Date.now();

  constructor(id: string, seed?: string) {
    this.id = id;

    let seedValue = seed ? this.hashSeed(seed) : Math.random() * 1000000;
    this.rng = () => {
      seedValue = (seedValue * 9301 + 49297) % 233280;
      return seedValue / 233280;
    };
  }

  private hashSeed(seed: string): number {
    return parseInt(
      createHash("md5").update(seed).digest("hex").substring(0, 8),
      16
    );
  }

  private generateId(): string {
    return randomBytes(8).toString("hex");
  }

  private getRandomEdgePosition(): { position: Vector2D; velocity: Vector2D } {
    const side = Math.floor(this.rng() * 4); // 0: top, 1: right, 2: bottom, 3: left
    const speed = SECTOR_CONFIG.ASTEROID_SPEED + (this.rng() - 0.5) * 10;

    let position: Vector2D;
    let velocity: Vector2D;

    switch (side) {
      case 0: // top
        position = { x: this.rng() * SECTOR_CONFIG.WIDTH, y: 0 };
        velocity = { x: (this.rng() - 0.5) * speed, y: speed };
        break;
      case 1: // right
        position = {
          x: SECTOR_CONFIG.WIDTH,
          y: this.rng() * SECTOR_CONFIG.HEIGHT,
        };
        velocity = { x: -speed, y: (this.rng() - 0.5) * speed };
        break;
      case 2: // bottom
        position = {
          x: this.rng() * SECTOR_CONFIG.WIDTH,
          y: SECTOR_CONFIG.HEIGHT,
        };
        velocity = { x: (this.rng() - 0.5) * speed, y: -speed };
        break;
      case 3: // left
        position = { x: 0, y: this.rng() * SECTOR_CONFIG.HEIGHT };
        velocity = { x: speed, y: (this.rng() - 0.5) * speed };
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
        y: this.rng() * SECTOR_CONFIG.HEIGHT,
      };
    } else if (angle >= 45 && angle < 135) {
      // bottom edge
      position = {
        x: this.rng() * SECTOR_CONFIG.WIDTH,
        y: SECTOR_CONFIG.HEIGHT,
      };
    } else if (angle >= 135 && angle < 225) {
      // left edge
      position = { x: 0, y: this.rng() * SECTOR_CONFIG.HEIGHT };
    } else {
      // top edge
      position = { x: this.rng() * SECTOR_CONFIG.WIDTH, y: 0 };
    }

    const velocity = {
      x: Math.cos(radians) * speed,
      y: Math.sin(radians) * speed,
    };

    return { position, velocity };
  }

  private findBiggestReachableAsteroid(shipPos: Vector2D): string | null {
    let bestId: string | null = null;
    let bestSize = 0;
    let reachableCount = 0;
    let totalCount = 0;

    for (const [id, asteroid] of this.asteroids) {
      totalCount++;
      // Check if this asteroid can be reached before it leaves the map
      if (this.canShipReachAsteroid(shipPos, asteroid)) {
        reachableCount++;
        if (asteroid.size > bestSize) {
          bestSize = asteroid.size;
          bestId = id;
        }
      }
    }

    console.log(
      `Ship at (${Math.round(shipPos.x)}, ${Math.round(
        shipPos.y
      )}) found ${reachableCount}/${totalCount} reachable asteroids, best: ${bestId}`
    );
    return bestId;
  }

  private canShipReachAsteroid(shipPos: Vector2D, asteroid: Asteroid): boolean {
    const currentTime = Date.now();
    const asteroidPos = PositionUtils.calculatePosition(asteroid, currentTime);

    // Calculate time for asteroid to reach map edge
    const timeToEdge = AsteroidUtils.calculateTimeToMapEdge(asteroid);

    // Calculate actual intercept time using the intercept math
    const d = { x: asteroidPos.x - shipPos.x, y: asteroidPos.y - shipPos.y };
    const dv = asteroid.velocity;
    const Vs = SECTOR_CONFIG.SHIP_SPEED;

    const a = dv.x * dv.x + dv.y * dv.y - Vs * Vs;
    const b = 2 * (d.x * dv.x + d.y * dv.y);
    const c = d.x * d.x + d.y * d.y;

    const disc = b * b - 4 * a * c;
    if (disc < 0) {
      // Can't intercept, use simple distance estimate
      const distance = Math.sqrt(d.x * d.x + d.y * d.y);
      const timeToReach = distance / SECTOR_CONFIG.SHIP_SPEED;
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

  private retargetShip(ship: Ship): void {
    // Reset vector matching when retargeting
    ship.isVectorMatched = false;
    ship.vectorMatchTime = null;

    // Find biggest reachable asteroid that's not already the current target
    const currentPos = PositionUtils.calculatePosition(ship, Date.now());
    const targetId = this.findBiggestReachableAsteroid(currentPos);
    if (targetId && targetId !== ship.targetAsteroidId) {
      const targetAsteroid = this.asteroids.get(targetId);
      if (targetAsteroid) {
        const oldTarget = ship.targetAsteroidId;
        ship.targetAsteroidId = targetId;
        const interceptResult = ShipAI.calculateInterceptCourse(
          currentPos,
          targetAsteroid
        );
        ship.velocity = interceptResult.velocity;
        ship.interceptTime = interceptResult.interceptTime;
        ship.position = currentPos;
        ship.spawnTime = Date.now();
        console.log(
          `Ship ${ship.id} retargeted from ${oldTarget} to asteroid ${targetId}`
        );

        // Broadcast retarget event
        this.broadcastEvent({
          type: "ship_retarget",
          timestamp: Date.now(),
          data: {
            shipId: ship.id,
            position: currentPos,
            velocity: ship.velocity,
            targetAsteroidId: targetId,
            state: ship.state,
            fuel: ship.fuel,
          },
        });
        return;
      }
    }

    // If no suitable target found, fly toward center and wait
    ship.targetAsteroidId = null;
    const shipPos = PositionUtils.calculatePosition(ship, Date.now());
    ship.velocity = ShipAI.calculateCenterVelocity(shipPos);
    ship.position = shipPos;
    ship.spawnTime = Date.now();
    console.log(
      `Ship ${ship.id} lost target, flying toward center to wait for asteroids`
    );

    // Broadcast retarget event for center-flying
    this.broadcastEvent({
      type: "ship_retarget",
      timestamp: Date.now(),
      data: {
        shipId: ship.id,
        position: shipPos,
        velocity: ship.velocity,
        targetAsteroidId: null,
        state: ship.state,
        fuel: ship.fuel,
      },
    });
  }

  private checkArrival(): void {
    const currentTime = Date.now();

    // First, identify which asteroids are being mined by vector-matched ships
    const asteroidsBeingMined = new Map<string, string>(); // asteroidId -> shipId
    for (const [shipId, ship] of this.ships) {
      if (
        ship.state === "flying" &&
        ship.isVectorMatched &&
        ship.targetAsteroidId
      ) {
        asteroidsBeingMined.set(ship.targetAsteroidId, shipId);
      }
    }

    for (const [shipId, ship] of this.ships) {
      if (ship.state !== "flying" || !ship.targetAsteroidId) continue;

      const asteroid = this.asteroids.get(ship.targetAsteroidId);
      if (!asteroid) {
        // Target asteroid no longer exists, find a new one (but only if not vector-matched)
        if (!ship.isVectorMatched) {
          console.log(`Ship ${shipId} target asteroid missing, retargeting...`);
          this.retargetShip(ship);
        }
        continue;
      }

      const shipPos = PositionUtils.calculatePosition(ship, currentTime);
      const asteroidPos = PositionUtils.calculatePosition(
        asteroid,
        currentTime
      );

      const distance = Math.sqrt(
        Math.pow(asteroidPos.x - shipPos.x, 2) +
          Math.pow(asteroidPos.y - shipPos.y, 2)
      );

      // Check if ship reached asteroid (within mining range) - balanced for all sizes
      if (distance < asteroid.size / 6 + 11) {
        // If this asteroid is being mined by a vector-matched ship and this ship isn't that ship, retarget
        const miningShipId = asteroidsBeingMined.get(ship.targetAsteroidId);
        if (miningShipId && miningShipId !== ship.id) {
          console.log(
            `Ship ${ship.id} reached asteroid ${asteroid.id} but ship ${miningShipId} is already mining it, retargeting...`
          );
          this.retargetShip(ship);
          continue;
        }

        // Ship immediately mines the asteroid - bounty based on asteroid size
        const baseBounty = Math.floor(asteroid.size * 2); // Bigger asteroids = more bounty
        const randomBonus = Math.floor(this.rng() * asteroid.size); // Random bonus based on size
        ship.score = baseBounty + randomBonus;

        console.log(
          `Ship ${ship.id} reached asteroid ${asteroid.id} and mined it for ${ship.score} points!`
        );

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
            // Reset vector matching for retargeted ships
            otherShip.isVectorMatched = false;
            otherShip.vectorMatchTime = null;
            this.retargetShip(otherShip);
          }
        }

        // Ship starts flying toward nearest edge (fastest exit)
        ship.state = "exiting";
        ship.targetAsteroidId = null; // clear target so no further re-aiming happens
        ship.position = shipPos;
        ship.velocity = ShipAI.calculateExitVelocity(shipPos);
        ship.spawnTime = currentTime;
        ship.isVectorMatched = false; // Reset vector matching
        ship.vectorMatchTime = null;

        console.log(
          `Ship ${ship.id} finished mining, now exiting by shortest path`
        );

        // Broadcast ship direction change
        this.broadcastEvent({
          type: "ship_retarget",
          timestamp: currentTime,
          data: {
            shipId: ship.id,
            position: shipPos,
            velocity: ship.velocity,
            targetAsteroidId: null,
            state: "exiting",
            fuel: ship.fuel,
          },
        });

        // Don't broadcast ship_exit yet - wait until it actually leaves the map
      }
    }
  }

  private spawnAsteroid(): void {
    const { position, velocity } = this.getRandomEdgePosition();
    const asteroid: Asteroid = {
      id: this.generateId(),
      position,
      velocity,
      size:
        SECTOR_CONFIG.MIN_ASTEROID_SIZE +
        this.rng() *
          (SECTOR_CONFIG.MAX_ASTEROID_SIZE - SECTOR_CONFIG.MIN_ASTEROID_SIZE),
      resources:
        SECTOR_CONFIG.MIN_ASTEROID_RESOURCES +
        this.rng() *
          (SECTOR_CONFIG.MAX_ASTEROID_RESOURCES -
            SECTOR_CONFIG.MIN_ASTEROID_RESOURCES),
      spawnTime: Date.now(),
    };

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
    const angle = this.rng() * 360;
    const { position } = this.getShipSpawnPosition(angle);

    const startingFuel = 50 + this.rng() * 40; // 50-90% fuel
    const ship: Ship = {
      id: this.generateId(),
      address: account.address,
      privateKey,
      position,
      velocity: { x: 0, y: 0 },
      targetAsteroidId: null,
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
    };

    const targetId = this.findBiggestReachableAsteroid(ship.position);
    if (targetId) {
      const targetAsteroid = this.asteroids.get(targetId);
      if (targetAsteroid) {
        ship.targetAsteroidId = targetId;
        const interceptResult = ShipAI.calculateInterceptCourse(
          ship.position,
          targetAsteroid
        );
        ship.velocity = interceptResult.velocity;
        ship.interceptTime = interceptResult.interceptTime;
      }
    } else {
      ship.targetAsteroidId = null;
      ship.velocity = ShipAI.calculateCenterVelocity(ship.position);
      console.log(
        `Ship ${ship.id} spawned but no reachable asteroids, flying toward center`
      );

      // Broadcast retarget event for initial center-flying
      this.broadcastEvent({
        type: "ship_retarget",
        timestamp: Date.now(),
        data: {
          shipId: ship.id,
          position: ship.position,
          velocity: ship.velocity,
          targetAsteroidId: null,
          state: ship.state,
          fuel: ship.fuel,
        },
      });
    }

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
        const currentShipPos = PositionUtils.calculatePosition(
          ship,
          currentTime
        );
        ship.velocity = ShipAI.calculateExitVelocity(currentShipPos);
        ship.position = currentShipPos;
        ship.spawnTime = currentTime;

        // Broadcast fuel exit event
        this.broadcastEvent({
          type: "ship_retarget",
          timestamp: currentTime,
          data: {
            shipId: ship.id,
            position: currentShipPos,
            velocity: ship.velocity,
            targetAsteroidId: null,
            state: "exiting",
            fuel: ship.fuel,
          },
        });
      } else if (
        ship.state === "flying" &&
        ship.targetAsteroidId &&
        !ship.isVectorMatched
      ) {
        // Recalculate course every 2 seconds to adjust for moving targets (but not for vector-matched ships)
        if (
          currentTime - ship.spawnTime > 2000 &&
          (currentTime - ship.spawnTime) % 2000 < 1000
        ) {
          const asteroid = this.asteroids.get(ship.targetAsteroidId);
          if (asteroid) {
            const currentShipPos = PositionUtils.calculatePosition(
              ship,
              currentTime
            );
            const interceptResult = ShipAI.calculateInterceptCourse(
              currentShipPos,
              asteroid
            );
            ship.velocity = interceptResult.velocity;
            ship.interceptTime = interceptResult.interceptTime;
            ship.position = currentShipPos;
            ship.spawnTime = currentTime;
          }
        }
      } else if (ship.state === "exiting") {
        // Check if ship is out of bounds
        const currentPos = PositionUtils.calculatePosition(ship, currentTime);
        if (
          PositionUtils.isOutOfBounds(
            currentPos,
            SECTOR_CONFIG.WIDTH,
            SECTOR_CONFIG.HEIGHT
          )
        ) {
          // Add fuel bonus to final score
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

          shipsToRemove.push(shipId);
          console.log(`Marking ship ${ship.id} for removal`);
        }
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
          console.log(`Ship ${shipId} lost its target, finding new one...`);
          this.retargetShip(ship);
        }
      }
    });
  }

  public update(): void {
    // Roll dice for spawning
    const roll = this.rng();
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
    asteroidId: string,
    position: Vector2D,
    velocity: Vector2D
  ): void {
    const ship = this.ships.get(shipId);
    const asteroid = this.asteroids.get(asteroidId);

    if (!ship || !asteroid || ship.targetAsteroidId !== asteroidId) {
      return; // Invalid request
    }

    console.log(
      `Backend: Ship ${shipId} vector matched with asteroid ${asteroidId}`
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
        position: ship.position,
        velocity: ship.velocity,
      },
    });
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
        const newBestTarget = this.findBiggestReachableAsteroid(currentShipPos);

        // Switch target if:
        // 1. Ship has no target and new target is available
        // 2. Ship has target but new target is bigger
        if (!ship.targetAsteroidId && newBestTarget) {
          console.log(
            `Waiting ship ${shipId} targeting new asteroid ${newBestTarget}`
          );
          this.retargetShip(ship);
        } else if (
          ship.targetAsteroidId &&
          newBestTarget &&
          newBestTarget !== ship.targetAsteroidId
        ) {
          const currentTarget = this.asteroids.get(ship.targetAsteroidId);
          const newTarget = this.asteroids.get(newBestTarget);

          if (
            currentTarget &&
            newTarget &&
            newTarget.size > currentTarget.size
          ) {
            console.log(
              `Ship ${shipId} switching from asteroid ${
                ship.targetAsteroidId
              } (size: ${Math.round(
                currentTarget.size
              )}) to bigger asteroid ${newBestTarget} (size: ${Math.round(
                newTarget.size
              )})`
            );
            this.retargetShip(ship);
          }
        }
      }
    }
  }
}
