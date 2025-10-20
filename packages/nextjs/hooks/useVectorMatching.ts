import { useCallback, useEffect } from "react";
import { SECTOR_CONFIG, SectorSnapshot, Vector2D } from "~~/types/sector";

interface UseVectorMatchingProps {
  sectorData: SectorSnapshot | null;
  setSectorData: React.Dispatch<React.SetStateAction<SectorSnapshot | null>>;
  wsRef: React.MutableRefObject<WebSocket | null>;
  sectorId: string;
}

const calculatePosition = (
  entity: { position: Vector2D; velocity: Vector2D; spawnTime: number },
  currentTime: number,
): Vector2D => {
  const elapsed = currentTime - entity.spawnTime;
  return {
    x: entity.position.x + entity.velocity.x * (elapsed / 1000),
    y: entity.position.y + entity.velocity.y * (elapsed / 1000),
  };
};

export const useVectorMatching = ({ sectorData, setSectorData, wsRef, sectorId }: UseVectorMatchingProps) => {
  // Frontend vector matching logic - handles automatic vector matching when ships reach asteroids
  const checkAndHandleVectorMatching = useCallback(() => {
    if (!sectorData) return;

    const currentTime = Date.now();
    let hasUpdates = false;

    setSectorData(prev => {
      if (!prev) return prev;
      const newData = { ...prev };

      // Track which asteroids have been claimed by vector-matched ships
      const claimedAsteroids = new Set<string>();

      // First pass: identify asteroids already claimed by vector-matched ships
      Object.values(newData.ships).forEach(ship => {
        if (ship.isVectorMatched && ship.targetAsteroidId) {
          claimedAsteroids.add(ship.targetAsteroidId);
        }
      });

      Object.values(newData.ships).forEach(ship => {
        // Check for vector matching timeout (if ship has been vector-matched for too long without backend confirmation)
        if (ship.isVectorMatched && ship.vectorMatchTime && currentTime - ship.vectorMatchTime > 10000) {
          console.log(`Ship ${ship.id} vector matching timed out, resetting...`);
          newData.ships[ship.id] = {
            ...ship,
            isVectorMatched: false,
            vectorMatchTime: null,
          };
          hasUpdates = true;
          return;
        }

        // Handle refueling ships vector matching with station center
        if (ship.state === "refueling" && !ship.isVectorMatched && ship.targetStationId) {
          const shipPos = calculatePosition(ship, currentTime);
          const centerX = SECTOR_CONFIG.WIDTH / 2;
          const centerY = SECTOR_CONFIG.HEIGHT / 2;

          const distanceToCenter = Math.sqrt(Math.pow(shipPos.x - centerX, 2) + Math.pow(shipPos.y - centerY, 2));

          // Check if ship has reached the station center
          const stationArrivalDistance = SECTOR_CONFIG.REFUEL_ARRIVAL_DISTANCE;

          if (distanceToCenter <= stationArrivalDistance) {
            console.log(`Frontend: Ship ${ship.id} reached station center, matching vector for refueling!`);

            // Stop at the station center (velocity = 0,0)
            newData.ships[ship.id] = {
              ...ship,
              velocity: { x: 0, y: 0 }, // Stop at center
              position: shipPos, // Update position to current calculated position
              spawnTime: currentTime, // Reset spawn time for new movement
              isVectorMatched: true,
              vectorMatchTime: currentTime,
            };

            // Notify backend about station vector matching
            if (wsRef.current?.readyState === WebSocket.OPEN) {
              wsRef.current.send(
                JSON.stringify({
                  type: "ship_vector_matched",
                  sectorId: sectorId,
                  shipId: ship.id,
                  targetStationId: ship.targetStationId,
                  position: shipPos,
                  velocity: { x: 0, y: 0 },
                }),
              );
            }

            hasUpdates = true;
          }
          return; // Don't process further targeting for refueling ships
        }

        if (ship.state !== "flying" || ship.isVectorMatched) {
          return; // Skip non-flying or already vector-matched ships
        }

        const shipPos = calculatePosition(ship, currentTime);

        // Priority 1: Handle ship-to-ship vector matching (combat)
        if (ship.targetShipId) {
          const targetShip = newData.ships[ship.targetShipId];
          if (!targetShip) return; // Target ship doesn't exist

          const targetPos = calculatePosition(targetShip, currentTime);
          const distance = Math.sqrt(Math.pow(targetPos.x - shipPos.x, 2) + Math.pow(targetPos.y - shipPos.y, 2));

          const combatRange = SECTOR_CONFIG.SHIP_COMBAT_RANGE;

          if (distance <= combatRange) {
            console.log(
              `Frontend: Ship ${ship.id} reached target ship ${ship.targetShipId}, matching vector for combat!`,
            );

            // Match the target ship's velocity for combat
            newData.ships[ship.id] = {
              ...ship,
              velocity: { ...targetShip.velocity }, // Match target ship's exact velocity
              position: shipPos, // Update position to current calculated position
              spawnTime: currentTime, // Reset spawn time for new movement
              isVectorMatched: true,
              vectorMatchTime: currentTime,
            };

            // Notify backend about ship-to-ship vector matching
            if (wsRef.current?.readyState === WebSocket.OPEN) {
              wsRef.current.send(
                JSON.stringify({
                  type: "ship_vector_matched",
                  sectorId: sectorId,
                  shipId: ship.id,
                  targetShipId: ship.targetShipId,
                  position: shipPos,
                  velocity: targetShip.velocity,
                }),
              );
            }

            hasUpdates = true;
          }
          return; // Skip asteroid targeting if targeting a ship
        }

        // Priority 2: Handle asteroid targeting
        if (!ship.targetAsteroidId) return;

        const asteroid = newData.asteroids[ship.targetAsteroidId];
        if (!asteroid) return; // Target asteroid doesn't exist

        const asteroidPos = calculatePosition(asteroid, currentTime);
        const distance = Math.sqrt(Math.pow(asteroidPos.x - shipPos.x, 2) + Math.pow(asteroidPos.y - shipPos.y, 2));

        // Check if ship has reached the asteroid (close enough to ensure mining but not too early)
        const vectorMatchDistance = asteroid.size / 6 + 10; // Tighter than backend mining distance (size/4 + 50)

        if (distance <= vectorMatchDistance) {
          // Check if this asteroid is already claimed by another ship
          if (claimedAsteroids.has(ship.targetAsteroidId)) {
            console.log(
              `Ship ${ship.id} reached asteroid ${ship.targetAsteroidId} but it's already claimed, will retarget when backend updates`,
            );
            return; // Let backend handle retargeting
          }

          // Claim this asteroid
          claimedAsteroids.add(ship.targetAsteroidId);

          console.log(`Frontend: Ship ${ship.id} reached asteroid ${ship.targetAsteroidId}, matching vector!`);

          // Match the asteroid's velocity
          newData.ships[ship.id] = {
            ...ship,
            velocity: { ...asteroid.velocity }, // Match asteroid's exact velocity
            position: shipPos, // Update position to current calculated position
            spawnTime: currentTime, // Reset spawn time for new movement
            isVectorMatched: true,
            vectorMatchTime: currentTime,
          };

          // Notify backend about asteroid vector matching
          if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(
              JSON.stringify({
                type: "ship_vector_matched",
                sectorId: sectorId,
                shipId: ship.id,
                asteroidId: ship.targetAsteroidId,
                position: shipPos,
                velocity: asteroid.velocity,
              }),
            );
          }

          hasUpdates = true;
        }
      });

      return hasUpdates ? newData : prev;
    });
  }, [sectorData, sectorId, setSectorData, wsRef]);

  // Vector matching check - runs frequently to catch ships reaching asteroids
  useEffect(() => {
    if (!sectorData) return;

    const interval = setInterval(() => {
      checkAndHandleVectorMatching();
    }, 100); // Check every 100ms for responsive vector matching

    return () => clearInterval(interval);
  }, [checkAndHandleVectorMatching, sectorData]);
};
