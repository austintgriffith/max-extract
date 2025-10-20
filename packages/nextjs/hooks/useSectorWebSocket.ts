import { useEffect, useRef, useState } from "react";
import { ConnectionStatus, Particle, ScrapType, SectorEvent, SectorSnapshot, Vector2D } from "~~/types/sector";

interface UseSectorWebSocketProps {
  sectorId: string;
  setSectorData: React.Dispatch<React.SetStateAction<SectorSnapshot | null>>;
  setParticles: React.Dispatch<React.SetStateAction<Particle[]>>;
}

interface UseSectorWebSocketReturn {
  connectionStatus: ConnectionStatus;
  events: SectorEvent[];
  wsRef: React.MutableRefObject<WebSocket | null>;
}

// Utility functions for particle creation
const createExplosionParticles = (asteroidPos: Vector2D, asteroidSize: number): Particle[] => {
  const particleCount = Math.floor(asteroidSize / 6) + 4; // Fewer particles but they're scraps now
  const newParticles: Particle[] = [];
  const scrapTypes: ScrapType[] = ["scrap1", "scrap2", "scrap3", "scrap4"];

  for (let i = 0; i < particleCount; i++) {
    const angle = (Math.PI * 2 * i) / particleCount + (Math.random() - 0.5) * 0.8;
    const speed = 15 + Math.random() * 30; // Slightly slower for more realistic scraps

    // Randomly select a scrap type
    const scrapType = scrapTypes[Math.floor(Math.random() * scrapTypes.length)];

    newParticles.push({
      id: `scrap_${Date.now()}_${i}`,
      position: { ...asteroidPos },
      velocity: {
        x: Math.cos(angle) * speed,
        y: Math.sin(angle) * speed,
      },
      size: 8 + Math.random() * 12, // Larger scraps (8-20 pixels)
      color: "#8B4513", // Keep for fallback, but won't be used with scrap images
      scrapType: scrapType,
      spawnTime: Date.now(),
      lifetime: 2000 + Math.random() * 1500, // 2-3.5 seconds (longer to see the scraps)
    });
  }

  return newParticles;
};

const createShipExplosionParticles = (shipPos: Vector2D): Particle[] => {
  const particleCount = 12; // Fixed number for ship explosions
  const newParticles: Particle[] = [];

  for (let i = 0; i < particleCount; i++) {
    const angle = (Math.PI * 2 * i) / particleCount + (Math.random() - 0.5) * 0.8;
    const speed = 30 + Math.random() * 50; // Faster particles for ship explosions

    newParticles.push({
      id: `ship_particle_${Date.now()}_${i}`,
      position: { ...shipPos },
      velocity: {
        x: Math.cos(angle) * speed,
        y: Math.sin(angle) * speed,
      },
      size: 3 + Math.random() * 5, // Larger particles for ships
      color: `hsl(${0 + Math.random() * 60}, 80%, ${60 + Math.random() * 30}%)`, // Red/orange/yellow shades
      spawnTime: Date.now(),
      lifetime: 2000 + Math.random() * 1000, // 2-3 seconds (longer than asteroids)
    });
  }

  // Add some sparks/debris
  for (let i = 0; i < 6; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 15 + Math.random() * 25;

    newParticles.push({
      id: `ship_spark_${Date.now()}_${i}`,
      position: { ...shipPos },
      velocity: {
        x: Math.cos(angle) * speed,
        y: Math.sin(angle) * speed,
      },
      size: 1 + Math.random() * 2, // Small sparks
      color: `hsl(${50 + Math.random() * 20}, 90%, 80%)`, // Bright yellow sparks
      spawnTime: Date.now(),
      lifetime: 1000 + Math.random() * 500, // Shorter lived sparks
    });
  }

  return newParticles;
};

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

export const useSectorWebSocket = ({
  sectorId,
  setSectorData,
  setParticles,
}: UseSectorWebSocketProps): UseSectorWebSocketReturn => {
  const wsRef = useRef<WebSocket | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("disconnected");
  const [events, setEvents] = useState<SectorEvent[]>([]);

  // WebSocket connection
  useEffect(() => {
    if (!sectorId) return;

    // Prevent multiple connections
    if (wsRef.current?.readyState === WebSocket.OPEN || wsRef.current?.readyState === WebSocket.CONNECTING) {
      return;
    }

    let reconnectTimeout: NodeJS.Timeout;
    let isComponentMounted = true;

    const connectWebSocket = () => {
      if (!isComponentMounted) return;

      try {
        // Close any existing connection first
        if (wsRef.current) {
          wsRef.current.close();
          wsRef.current = null;
        }

        console.log("Connecting to WebSocket...");
        setConnectionStatus("connecting");

        // Add a small delay to ensure everything is ready
        setTimeout(() => {
          if (!isComponentMounted) return;
          const ws = new WebSocket("ws://localhost:8000");
          wsRef.current = ws;

          ws.onopen = () => {
            if (!isComponentMounted) return;
            console.log("WebSocket connected");
            setConnectionStatus("connected");
            // Subscribe to sector updates
            ws.send(
              JSON.stringify({
                type: "subscribe",
                sectorId: sectorId,
              }),
            );
          };

          ws.onmessage = event => {
            if (!isComponentMounted) return;
            try {
              const message = JSON.parse(event.data);

              if (message.type === "subscribed") {
                console.log(`Subscribed to sector ${message.sectorId}`);
                return;
              }

              if (message.type === "error") {
                console.error("WebSocket error:", message.message);
                return;
              }

              // Handle sector events
              const sectorEvent = message as SectorEvent;
              setEvents(prev => [...prev.slice(-19), sectorEvent]); // Keep last 20 events

              // Update sector data based on event
              setSectorData((prev: SectorSnapshot | null) => {
                if (!prev) return prev;

                const newData = { ...prev };

                switch (sectorEvent.type) {
                  case "asteroid_spawn":
                    newData.asteroids[sectorEvent.data.id] = sectorEvent.data;
                    break;
                  case "ship_spawn":
                    newData.ships[sectorEvent.data.id] = {
                      ...sectorEvent.data,
                      isVectorMatched: false, // Ensure new ships start without vector matching
                      vectorMatchTime: null,
                      targetShipId: sectorEvent.data.targetShipId || null, // Handle ship targeting
                      targetStationId: sectorEvent.data.targetStationId || null, // Handle station targeting (refueling)
                      fullCargo: sectorEvent.data.fullCargo || false, // Handle cargo status
                    };
                    break;
                  case "asteroid_depleted":
                    // Create explosion particles at asteroid position before deleting
                    if (newData.asteroids[sectorEvent.data.asteroidId]) {
                      const asteroid = newData.asteroids[sectorEvent.data.asteroidId];
                      const asteroidPos = calculatePosition(asteroid, Date.now());
                      const explosionParticles = createExplosionParticles(asteroidPos, asteroid.size);
                      setParticles(prev => [...prev, ...explosionParticles]);
                    }
                    delete newData.asteroids[sectorEvent.data.asteroidId];
                    break;
                  case "ship_destroyed":
                    // Create explosion particles at victim ship position before deleting
                    if (newData.ships[sectorEvent.data.victimId]) {
                      const victimShip = newData.ships[sectorEvent.data.victimId];
                      const shipPos = sectorEvent.data.victimPosition || calculatePosition(victimShip, Date.now());
                      const explosionParticles = createShipExplosionParticles(shipPos);
                      setParticles(prev => [...prev, ...explosionParticles]);
                    }
                    delete newData.ships[sectorEvent.data.victimId];
                    break;
                  case "asteroid_exit":
                    // Asteroid drifted off the map → remove it from local state
                    delete newData.asteroids[sectorEvent.data.asteroidId];
                    break;
                  case "ship_retarget":
                    // Ship changed direction/target - update its state including fuel
                    if (newData.ships[sectorEvent.data.shipId]) {
                      newData.ships[sectorEvent.data.shipId].position = sectorEvent.data.position;
                      newData.ships[sectorEvent.data.shipId].velocity = sectorEvent.data.velocity;
                      newData.ships[sectorEvent.data.shipId].targetAsteroidId = sectorEvent.data.targetAsteroidId;
                      newData.ships[sectorEvent.data.shipId].targetShipId = sectorEvent.data.targetShipId;
                      newData.ships[sectorEvent.data.shipId].targetStationId = sectorEvent.data.targetStationId;
                      newData.ships[sectorEvent.data.shipId].state = sectorEvent.data.state;
                      newData.ships[sectorEvent.data.shipId].spawnTime = sectorEvent.timestamp;
                      if (sectorEvent.data.fuel !== undefined) {
                        newData.ships[sectorEvent.data.shipId].fuel = sectorEvent.data.fuel;
                      }
                      // Reset vector matching when ship retargets
                      newData.ships[sectorEvent.data.shipId].isVectorMatched = false;
                      newData.ships[sectorEvent.data.shipId].vectorMatchTime = null;
                    }
                    break;
                  case "ship_vector_matched":
                    // Ship has matched vector with asteroid (frontend event)
                    if (newData.ships[sectorEvent.data.shipId]) {
                      newData.ships[sectorEvent.data.shipId].velocity = sectorEvent.data.velocity;
                      newData.ships[sectorEvent.data.shipId].position = sectorEvent.data.position;
                      newData.ships[sectorEvent.data.shipId].spawnTime = sectorEvent.timestamp;
                      newData.ships[sectorEvent.data.shipId].isVectorMatched = true;
                      newData.ships[sectorEvent.data.shipId].vectorMatchTime = sectorEvent.timestamp;
                    }
                    break;
                  case "ship_exit":
                    // Ship actually left the map → remove it from local state
                    delete newData.ships[sectorEvent.data.shipId];
                    break;
                }

                return newData;
              });
            } catch (err) {
              console.error("Error parsing WebSocket message:", err);
            }
          };

          ws.onclose = event => {
            if (!isComponentMounted) return;
            console.log("WebSocket disconnected", event.code, event.reason);
            setConnectionStatus("disconnected");

            // Only reconnect if it wasn't a manual close and component is still mounted
            if (event.code !== 1000 && isComponentMounted) {
              console.log("Attempting to reconnect in 3 seconds...");
              reconnectTimeout = setTimeout(() => {
                if (isComponentMounted) {
                  connectWebSocket();
                }
              }, 3000);
            }
          };

          ws.onerror = err => {
            if (!isComponentMounted) return;
            console.error("WebSocket error:", err);
            console.error("WebSocket readyState:", ws.readyState);
            setConnectionStatus("disconnected");
          };
        }, 100); // 100ms delay
      } catch (err) {
        console.error("Failed to connect WebSocket:", err);
        setConnectionStatus("disconnected");
      }
    };

    connectWebSocket();

    return () => {
      isComponentMounted = false;
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
      if (wsRef.current) {
        console.log("Cleaning up WebSocket connection");
        wsRef.current.close(1000, "Component unmounting");
        wsRef.current = null;
      }
    };
  }, [sectorId, setSectorData, setParticles]);

  return {
    connectionStatus,
    events,
    wsRef,
  };
};
