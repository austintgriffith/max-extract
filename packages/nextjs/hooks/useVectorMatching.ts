import { useCallback, useEffect, useRef } from "react";
import { SECTOR_CONFIG, SectorSnapshot, Vector2D } from "~~/types/sector";

interface UseVectorMatchingProps {
  sectorData: SectorSnapshot | null;
  setSectorData: React.Dispatch<React.SetStateAction<SectorSnapshot | null>>;
  wsRef: React.MutableRefObject<WebSocket | null>;
  sectorId: string;
  showDebug: boolean;
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

export const useVectorMatching = ({
  sectorData,
  setSectorData,
  wsRef,
  sectorId,
  showDebug,
}: UseVectorMatchingProps) => {
  // Track if we've ever received data (to start the interval once)
  const hasDataRef = useRef(false);

  // Frontend vector matching logic - handles automatic vector matching when ships reach asteroids
  const checkAndHandleVectorMatching = useCallback(() => {
    const currentTime = Date.now();

    if (!sectorData) return;

    let hasUpdates = false;
    const newData = { ...sectorData };

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
        if (showDebug) console.log(`Ship ${ship.id} vector matching timed out, resetting...`);
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
          if (showDebug)
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
          if (showDebug)
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
      if (!asteroid) {
        console.warn(`⚠️ Ship ${ship.id} targeting non-existent asteroid ${ship.targetAsteroidId}`);
        return;
      }

      const asteroidPos = calculatePosition(asteroid, currentTime);
      const distance = Math.sqrt(Math.pow(asteroidPos.x - shipPos.x, 2) + Math.pow(asteroidPos.y - shipPos.y, 2));

      // Check if ship has reached the asteroid (close enough to ensure mining but not too early)
      const vectorMatchDistance = asteroid.size / 4 + 50; // Conservative threshold to catch ships before they overshoot mining range

      // DEBUG: Log every 50th check to avoid spam but still see activity
      const debugFrequency = 50;
      if (showDebug && Math.random() < 1 / debugFrequency) {
        console.log(
          `🎯 Ship ${ship.id} → Asteroid ${ship.targetAsteroidId}: distance=${distance.toFixed(1)}, threshold=${vectorMatchDistance.toFixed(1)}, shipPos=(${shipPos.x.toFixed(1)},${shipPos.y.toFixed(1)}), asteroidPos=(${asteroidPos.x.toFixed(1)},${asteroidPos.y.toFixed(1)})`,
        );
      }

      if (distance <= vectorMatchDistance) {
        // Check if this asteroid is already claimed by another ship
        if (claimedAsteroids.has(ship.targetAsteroidId)) {
          if (showDebug)
            console.log(
              `⚠️ Ship ${ship.id} reached asteroid ${ship.targetAsteroidId} but it's already claimed, will retarget when backend updates`,
            );
          return; // Let backend handle retargeting
        }

        // Claim this asteroid
        claimedAsteroids.add(ship.targetAsteroidId);

        if (showDebug) {
          console.log(
            `✅ VECTOR MATCH! Ship ${ship.id} reached asteroid ${ship.targetAsteroidId}! Distance: ${distance.toFixed(1)} <= ${vectorMatchDistance.toFixed(1)}`,
          );
          console.log(`   Ship velocity BEFORE: (${ship.velocity.x.toFixed(2)}, ${ship.velocity.y.toFixed(2)})`);
          console.log(`   Asteroid velocity: (${asteroid.velocity.x.toFixed(2)}, ${asteroid.velocity.y.toFixed(2)})`);
        }

        // Match the asteroid's velocity
        newData.ships[ship.id] = {
          ...ship,
          velocity: { ...asteroid.velocity }, // Match asteroid's exact velocity
          position: shipPos, // Update position to current calculated position
          spawnTime: currentTime, // Reset spawn time for new movement
          isVectorMatched: true,
          vectorMatchTime: currentTime,
        };

        if (showDebug) {
          console.log(`   Ship velocity AFTER: (${asteroid.velocity.x.toFixed(2)}, ${asteroid.velocity.y.toFixed(2)})`);
          console.log(`   🎉 Ship ${ship.id} is now LOCKED ON asteroid ${ship.targetAsteroidId}!`);
        }

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
          if (showDebug) console.log(`   📡 Notified backend about vector match`);
        } else {
          if (showDebug) console.error(`   ❌ WebSocket not ready! Vector match may not be saved!`);
        }

        hasUpdates = true;
      } else if (distance < vectorMatchDistance * 2) {
        // Log when we're getting close (less frequently than main debug logs)
        const approachLogFrequency = 200; // Log every 200th check when approaching
        if (showDebug && Math.random() < 1 / approachLogFrequency) {
          console.log(
            `🔜 Ship ${ship.id} approaching asteroid ${ship.targetAsteroidId}: distance=${distance.toFixed(1)}, threshold=${vectorMatchDistance.toFixed(1)} (${((distance / vectorMatchDistance) * 100).toFixed(0)}% away)`,
          );
        }
      }
    });

    if (hasUpdates) {
      setSectorData(newData);
    }
  }, [sectorData, sectorId, setSectorData, wsRef, showDebug]);

  // Vector matching check - runs frequently to catch ships reaching asteroids
  useEffect(() => {
    // Wait until we have data at least once
    if (!sectorData) {
      if (showDebug) console.log("⏸️ Vector matching waiting for initial data...");
      hasDataRef.current = false;
      return;
    }

    // Only start once, don't restart on every data update
    if (hasDataRef.current) {
      // Already running, don't restart
      return;
    }

    hasDataRef.current = true;
    if (showDebug) console.log("✅ Sector data loaded!");
    if (showDebug) console.log("▶️ Vector matching STARTED: checking every 50ms");

    const interval = setInterval(() => {
      checkAndHandleVectorMatching();
    }, 50); // Check every 50ms for more responsive vector matching

    return () => {
      if (showDebug) console.log("⏹️ Vector matching STOPPED (component unmount)");
      clearInterval(interval);
      hasDataRef.current = false;
    };
  }, [checkAndHandleVectorMatching, sectorData, showDebug]);
};
