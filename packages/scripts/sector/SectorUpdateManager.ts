// Entity position updates and cleanup

import type { Sector } from "../Sector";
import type { Ship, Asteroid, Vector2D } from "../types";
import { SECTOR_CONFIG, getCargoCapacity } from "../types";
import { PositionUtils } from "../utils/PositionUtils";
import { ShipAI } from "../utils/ShipAI";

export class SectorUpdateManager {
  constructor(private sector: Sector, private debugMode: boolean = false) {}

  private debugLog(message: string, data?: any): void {
    if (this.debugMode) {
      const timestamp = new Date().toISOString().split("T")[1].split(".")[0];
      if (data) {
        console.log(`🔄 [${timestamp}] SectorUpdate - ${message}:`, data);
      } else {
        console.log(`🔄 [${timestamp}] SectorUpdate - ${message}`);
      }
    }
  }

  /**
   * Update ships - handle fuel consumption, low fuel exits, course recalculation, and refueling
   */
  public async updateShips(
    ships: Map<string, Ship>,
    gameLoopCounter: number,
    lastUpdate: number,
    shouldShipRefuel: (ship: Ship) => Promise<boolean>,
    initiateRefueling: (ship: Ship) => void,
    completeRefueling: (ship: Ship) => Promise<void>,
    handlePilotTipping: (ship: Ship, finalScore: number) => Promise<void>,
    broadcastEvent: (event: any) => void,
    getRandom: () => number
  ): Promise<string[]> {
    const currentTime = Date.now();
    const shipsToRemove: string[] = [];

    for (const [shipId, ship] of ships) {
      // Consume fuel based on movement (only if moving)
      const speed = Math.sqrt(
        ship.velocity.x * ship.velocity.x + ship.velocity.y * ship.velocity.y
      );
      if (speed > 0) {
        const timeSinceUpdate = (currentTime - lastUpdate) / 1000;
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

        // Check if ship is close enough to the station
        if (distanceToCenter < SECTOR_CONFIG.REFUEL_ARRIVAL_DISTANCE) {
          this.debugLog(
            `Ship ${
              ship.id
            } vector matched at station for refueling (distance: ${Math.round(
              distanceToCenter
            )})`
          );
          // Complete refueling (async, but don't await to avoid blocking game loop)
          completeRefueling(ship).catch((error) => {
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
        if (await shouldShipRefuel(ship)) {
          console.log(
            `Ship ${ship.id} low on fuel (${Math.round(
              ship.fuel
            )}%) but has credential - heading to station instead of exiting`
          );
          initiateRefueling(ship);
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
          ship.lastCourseUpdate = gameLoopCounter;

          // Broadcast fuel exit event
          broadcastEvent({
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
              fullCargo: ship.fullCargo,
              currentCargo: ship.currentCargo,
              score: ship.score,
            },
          });
        }
      } else if (ship.state === "flying" && !ship.isVectorMatched) {
        // Recalculate course every N game loops to adjust for moving targets
        const cyclesSinceLastUpdate = gameLoopCounter - ship.lastCourseUpdate;
        if (cyclesSinceLastUpdate >= SECTOR_CONFIG.COURSE_RECALC_CYCLES) {
          const currentShipPos = PositionUtils.calculatePosition(
            ship,
            currentTime
          );

          // Handle ship-to-ship targeting recalculation
          if (ship.targetShipId) {
            const targetShip = ships.get(ship.targetShipId);
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
              ship.lastCourseUpdate = gameLoopCounter;
            }
          }
          // Handle asteroid targeting recalculation
          else if (ship.targetAsteroidId) {
            const asteroids = (this.sector as any).asteroids as Map<
              string,
              Asteroid
            >;
            const asteroid = asteroids.get(ship.targetAsteroidId);
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
              ship.lastCourseUpdate = gameLoopCounter;
            }
          }
        }
      }

      // Check if ship is out of bounds
      const currentPos = PositionUtils.calculatePosition(ship, currentTime);
      if (
        PositionUtils.isOutOfBounds(
          currentPos,
          SECTOR_CONFIG.WIDTH,
          SECTOR_CONFIG.HEIGHT
        )
      ) {
        shipsToRemove.push(shipId);
        await this.handleShipExit(
          ship,
          currentPos,
          currentTime,
          handlePilotTipping,
          broadcastEvent,
          getRandom
        );
      }
    }

    return shipsToRemove;
  }

  /**
   * Handle ship exit logic (called when ship goes out of bounds)
   */
  private async handleShipExit(
    ship: Ship,
    currentPos: Vector2D,
    currentTime: number,
    handlePilotTipping: (ship: Ship, finalScore: number) => Promise<void>,
    broadcastEvent: (event: any) => void,
    getRandom: () => number
  ): Promise<void> {
    const asteroids = (this.sector as any).asteroids as Map<string, Asteroid>;

    if (ship.state === "exiting") {
      // Normal exit - ship intentionally left
      const fuelBonus = Math.floor(ship.fuel / 3);
      const finalScore = ship.score + fuelBonus;

      console.log(
        `Ship ${ship.id} has left the sector with mining score ${
          ship.score
        } + fuel bonus ${fuelBonus} = total ${finalScore} at position (${Math.round(
          currentPos.x
        )}, ${Math.round(currentPos.y)})`
      );

      broadcastEvent({
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

      // Handle pilot tipping
      await handlePilotTipping(ship, finalScore);
    } else if (
      ship.state === "flying" &&
      ship.isVectorMatched &&
      ship.targetAsteroidId
    ) {
      // Vector-matched ship drifted off with asteroid
      const asteroid = asteroids.get(ship.targetAsteroidId);
      if (asteroid) {
        this.debugLog(
          `Vector-matched ship ${ship.id} and asteroid ${ship.targetAsteroidId} drifted off together - mining asteroid`
        );

        // Ship successfully mines the asteroid even though off-screen
        const baseBounty = Math.floor(asteroid.size * 2);
        const randomBonus = Math.floor(getRandom() * asteroid.size);
        const totalYield = baseBounty + randomBonus;

        // Calculate cargo capacity and how much we can actually take
        const maxCapacity = getCargoCapacity(ship.shipType);
        const cargoTaken = Math.min(totalYield, maxCapacity);
        const cargoWasted = totalYield - cargoTaken;

        ship.currentCargo = cargoTaken;
        ship.score = cargoTaken;
        ship.fullCargo = true;

        console.log(
          `Ship ${ship.id} (capacity ${maxCapacity}) mined asteroid ${
            asteroid.id
          } off-screen: took ${cargoTaken}${
            cargoWasted > 0 ? ` (wasted ${cargoWasted})` : ""
          }`
        );

        // Remove the asteroid since it was mined
        asteroids.delete(asteroid.id);

        broadcastEvent({
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

        broadcastEvent({
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

        await handlePilotTipping(ship, finalScore);
      } else {
        // Vector-matched but asteroid already gone
        console.log(
          `Ship ${ship.id} drifted off the map while flying (score: ${ship.score})`
        );

        broadcastEvent({
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

        await handlePilotTipping(ship, ship.score);
      }
    } else {
      // Regular flying ship drifted off
      console.log(
        `Ship ${ship.id} drifted off the map while flying (score: ${ship.score})`
      );

      broadcastEvent({
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

      await handlePilotTipping(ship, ship.score);
    }
  }

  /**
   * Update asteroids - check for out of bounds and cleanup
   */
  public updateAsteroids(
    asteroids: Map<string, Asteroid>,
    ships: Map<string, Ship>,
    assignTarget: (ship: Ship, reason: string, force: boolean) => Promise<void>,
    broadcastEvent: (event: any) => void
  ): void {
    const currentTime = Date.now();
    const asteroidsToRemove: string[] = [];

    for (const [asteroidId, asteroid] of asteroids) {
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
      broadcastEvent({
        type: "asteroid_exit",
        timestamp: currentTime,
        data: { asteroidId },
      });

      asteroids.delete(asteroidId);

      // Find ships targeting this deleted asteroid and give them new targets
      for (const [shipId, ship] of ships) {
        if (ship.targetAsteroidId === asteroidId && ship.state === "flying") {
          assignTarget(ship, "target asteroid drifted off map", true).catch(
            (error) => {
              console.error(
                `Failed to assign target for ship ${shipId}:`,
                error
              );
            }
          );
        }
      }
    });
  }
}
