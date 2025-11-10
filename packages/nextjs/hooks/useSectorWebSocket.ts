import { useEffect, useRef, useState } from "react";
import { ConnectionStatus, Particle, ScrapType, SectorEvent, SectorSnapshot, Vector2D } from "~~/types/sector";
import { getGameServerWsUrl } from "~~/utils/scaffold-eth/getGameServerUrl";
import { cleanupOldSectorData, loadSectorEvents, saveSectorEvents } from "~~/utils/scaffold-eth/sectorEventsStorage";

interface UseSectorWebSocketProps {
  sectorId: string;
  setSectorData: React.Dispatch<React.SetStateAction<SectorSnapshot | null>>;
  setParticles: React.Dispatch<React.SetStateAction<Particle[]>>;
  onAsteroidSpawn?: (asteroidSize: number, position: Vector2D) => void;
  onShipSpawn?: (shipType: number, position: Vector2D) => void;
  onVectorMatched?: (shipId: string) => void;
  onAsteroidDepleted?: (asteroidSize: number, asteroidId: string) => void;
  onShipRetarget?: (shipId: string) => void;
  onShipAttack?: (attackerId: string, victimId: string) => void;
  onShipDestroyed?: (victimId: string, attackerId: string) => void;
  onPilotTip?: (tipAmount: number, pilotName: string) => void;
}

interface UseSectorWebSocketReturn {
  connectionStatus: ConnectionStatus;
  events: SectorEvent[];
  wsRef: React.MutableRefObject<WebSocket | null>;
}

// Utility functions for particle creation
const createExplosionParticles = (asteroidPos: Vector2D, asteroidSize: number): Particle[] => {
  // Scale explosion based on asteroid size (more subtle scaling)
  // Small asteroids (< 30): 0.7x multiplier
  // Medium asteroids (30-60): 1.0x multiplier (baseline)
  // Large asteroids (> 60): 1.3x multiplier
  let sizeMultiplier = 1.0;
  if (asteroidSize < 30) {
    sizeMultiplier = 0.7;
  } else if (asteroidSize > 60) {
    sizeMultiplier = 1.3;
  }

  const particleCount = Math.floor((asteroidSize / 5) * sizeMultiplier) + 6; // Fewer particles (was /4 + 8)
  const newParticles: Particle[] = [];
  const scrapTypes: ScrapType[] = ["scrap1", "scrap2", "scrap3", "scrap4"];

  for (let i = 0; i < particleCount; i++) {
    const angle = (Math.PI * 2 * i) / particleCount + (Math.random() - 0.5) * (0.9 * sizeMultiplier); // Tighter spread (was 1.2)
    const speed = (20 + Math.random() * 40) * sizeMultiplier; // More moderate speed (was 30 + 60)

    // Randomly select a scrap type
    const scrapType = scrapTypes[Math.floor(Math.random() * scrapTypes.length)];

    newParticles.push({
      id: `scrap_${Date.now()}_${i}`,
      position: { ...asteroidPos },
      velocity: {
        x: Math.cos(angle) * speed,
        y: Math.sin(angle) * speed,
      },
      size: (7 + Math.random() * 10) * sizeMultiplier, // Smaller scraps (was 10-26, now 7-17 baseline)
      color: "#8B4513", // Keep for fallback, but won't be used with scrap images
      scrapType: scrapType,
      spawnTime: Date.now(),
      lifetime: 2500 + Math.random() * 2000, // Consistent lifetime so all scraps fade at similar rate
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

// Create sonar ping particles for spawning ships/asteroids
export const createPingParticles = (
  position: Vector2D,
  color: string = "rgba(100, 200, 255, 0.4)",
  thickness: number = 1.0,
  isRebroadcast: boolean = false,
  expansionSpeed: number = 30,
  lifetime: number = 2200,
): Particle[] => {
  const newParticles: Particle[] = [];
  const now = Date.now();

  // Create 3 expanding ring waves with slight delays for a ripple effect
  for (let ring = 0; ring < 3; ring++) {
    newParticles.push({
      id: `ping_${now}_${ring}`,
      position: { ...position },
      velocity: { x: 0, y: 0 }, // Stationary - expansion happens via size growth in render
      size: 60, // Even larger starting size for the ring
      color: color,
      pingEffect: true,
      pingThickness: thickness, // Store thickness multiplier
      isRebroadcast: isRebroadcast, // Mark if this is a station rebroadcast
      expansionSpeed: expansionSpeed, // Custom expansion speed
      spawnTime: now + ring * 250, // Stagger rings by 250ms each (even slower ripple)
      lifetime: lifetime, // Custom lifetime
    });
  }

  return newParticles;
};

// Create magical blue particles for base upgrades
export const createBaseUpgradeParticles = (stationPos: Vector2D): Particle[] => {
  const particleCount = 24; // More particles for a celebratory effect
  const newParticles: Particle[] = [];

  // Main blue magic dust particles - radiating outward
  for (let i = 0; i < particleCount; i++) {
    const angle = (Math.PI * 2 * i) / particleCount + (Math.random() - 0.5) * 0.5;
    const speed = 20 + Math.random() * 40; // Medium speed for floaty magic effect

    newParticles.push({
      id: `upgrade_particle_${Date.now()}_${i}`,
      position: { ...stationPos },
      velocity: {
        x: Math.cos(angle) * speed,
        y: Math.sin(angle) * speed,
      },
      size: 4 + Math.random() * 6, // Medium-large particles
      color: `hsl(${200 + Math.random() * 40}, 85%, ${65 + Math.random() * 25}%)`, // Blue/cyan shades
      spawnTime: Date.now(),
      lifetime: 2500 + Math.random() * 1500, // 2.5-4 seconds (longer for magical feel)
    });
  }

  // Add sparkles/stars
  for (let i = 0; i < 12; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 10 + Math.random() * 20;

    newParticles.push({
      id: `upgrade_sparkle_${Date.now()}_${i}`,
      position: { ...stationPos },
      velocity: {
        x: Math.cos(angle) * speed,
        y: Math.sin(angle) * speed,
      },
      size: 2 + Math.random() * 3, // Small sparkles
      color: `hsl(${180 + Math.random() * 60}, 100%, 85%)`, // Bright cyan/white sparkles
      spawnTime: Date.now(),
      lifetime: 2000 + Math.random() * 1000, // 2-3 seconds
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
  onAsteroidSpawn,
  onShipSpawn,
  onVectorMatched,
  onAsteroidDepleted,
  onShipRetarget,
  onShipAttack,
  onShipDestroyed,
  onPilotTip,
}: UseSectorWebSocketProps): UseSectorWebSocketReturn => {
  const wsRef = useRef<WebSocket | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("disconnected");
  const [events, setEvents] = useState<SectorEvent[]>([]);
  const eventsInitializedRef = useRef(false);

  // Load events from localStorage on initial mount
  useEffect(() => {
    if (!sectorId || eventsInitializedRef.current) return;

    // Clean up any expired sector data across all sectors
    cleanupOldSectorData();

    // Load events for this specific sector
    const storedEvents = loadSectorEvents(sectorId);
    if (storedEvents.length > 0) {
      setEvents(storedEvents);
      console.log(`Loaded ${storedEvents.length} events from localStorage for sector ${sectorId}`);
    }

    eventsInitializedRef.current = true;
  }, [sectorId]);

  // Save events to localStorage whenever they change
  useEffect(() => {
    if (!sectorId || events.length === 0 || !eventsInitializedRef.current) return;

    saveSectorEvents(sectorId, events);
  }, [sectorId, events]);

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
          const ws = new WebSocket(getGameServerWsUrl());
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
              setEvents(prev => [...prev.slice(-199), sectorEvent]); // Keep last 200 events

              // Update sector data based on event
              setSectorData((prev: SectorSnapshot | null) => {
                if (!prev) return prev;

                const newData = { ...prev };

                switch (sectorEvent.type) {
                  case "asteroid_spawn":
                    newData.asteroids[sectorEvent.data.id] = sectorEvent.data;
                    // Notify about asteroid spawn for sound playback and visual effects
                    if (onAsteroidSpawn && sectorEvent.data.size && sectorEvent.data.position) {
                      onAsteroidSpawn(sectorEvent.data.size, sectorEvent.data.position);
                    }
                    break;
                  case "ship_spawn":
                    newData.ships[sectorEvent.data.id] = {
                      ...sectorEvent.data,
                      isVectorMatched: false, // Ensure new ships start without vector matching
                      vectorMatchTime: null,
                      targetShipId: sectorEvent.data.targetShipId || null, // Handle ship targeting
                      targetStationId: sectorEvent.data.targetStationId || null, // Handle station targeting (refueling)
                      fullCargo: sectorEvent.data.fullCargo || false, // Handle cargo status
                      currentCargo: sectorEvent.data.currentCargo || 0, // Handle current cargo amount
                    };
                    // Notify about ship spawn for sound playback and visual effects
                    if (onShipSpawn && sectorEvent.data.shipType && sectorEvent.data.position) {
                      onShipSpawn(sectorEvent.data.shipType, sectorEvent.data.position);
                    }
                    break;
                  case "asteroid_depleted":
                    // Create explosion particles at asteroid position before deleting
                    if (newData.asteroids[sectorEvent.data.asteroidId]) {
                      const asteroid = newData.asteroids[sectorEvent.data.asteroidId];
                      const asteroidPos = calculatePosition(asteroid, Date.now());
                      const explosionParticles = createExplosionParticles(asteroidPos, asteroid.size);
                      setParticles(prev => [...prev, ...explosionParticles]);
                      // Notify about asteroid depletion for explosion sound playback
                      if (onAsteroidDepleted && asteroid.size && sectorEvent.data.asteroidId) {
                        onAsteroidDepleted(asteroid.size, sectorEvent.data.asteroidId);
                      }
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

                      // Notify about ship destruction for sound playback
                      if (onShipDestroyed && sectorEvent.data.victimId && sectorEvent.data.attackerId) {
                        onShipDestroyed(sectorEvent.data.victimId, sectorEvent.data.attackerId);
                      }
                    }
                    delete newData.ships[sectorEvent.data.victimId];
                    break;
                  case "asteroid_exit":
                    // Asteroid drifted off the map → remove it from local state
                    delete newData.asteroids[sectorEvent.data.asteroidId];
                    break;
                  case "ship_retarget":
                    // Ship changed direction/target - update its state including fuel and cargo
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
                      if (sectorEvent.data.fullCargo !== undefined) {
                        newData.ships[sectorEvent.data.shipId].fullCargo = sectorEvent.data.fullCargo;
                      }
                      if (sectorEvent.data.currentCargo !== undefined) {
                        newData.ships[sectorEvent.data.shipId].currentCargo = sectorEvent.data.currentCargo;
                      }
                      if (sectorEvent.data.score !== undefined) {
                        newData.ships[sectorEvent.data.shipId].score = sectorEvent.data.score;
                      }
                      // Reset vector matching when ship retargets
                      newData.ships[sectorEvent.data.shipId].isVectorMatched = false;
                      newData.ships[sectorEvent.data.shipId].vectorMatchTime = null;

                      // Notify about ship retarget to stop any sounds (like refueling)
                      if (onShipRetarget && sectorEvent.data.shipId) {
                        onShipRetarget(sectorEvent.data.shipId);
                      }
                    }
                    break;
                  case "ship_vector_matched":
                    // Ship has matched vector with asteroid or another ship
                    if (newData.ships[sectorEvent.data.shipId]) {
                      newData.ships[sectorEvent.data.shipId].velocity = sectorEvent.data.velocity;
                      newData.ships[sectorEvent.data.shipId].position = sectorEvent.data.position;
                      newData.ships[sectorEvent.data.shipId].spawnTime = sectorEvent.timestamp;
                      newData.ships[sectorEvent.data.shipId].isVectorMatched = true;
                      newData.ships[sectorEvent.data.shipId].vectorMatchTime = sectorEvent.timestamp;

                      // Check if this is a ship-to-ship attack
                      const ship = newData.ships[sectorEvent.data.shipId];
                      if (ship.targetShipId && onShipAttack) {
                        // This is an attack - notify for combat sounds
                        onShipAttack(sectorEvent.data.shipId, ship.targetShipId);
                      } else if (onVectorMatched && sectorEvent.data.shipId) {
                        // This is mining or refueling - notify for those sounds
                        onVectorMatched(sectorEvent.data.shipId);
                      }
                    }
                    break;
                  case "ship_exit":
                    // Ship actually left the map → remove it from local state
                    delete newData.ships[sectorEvent.data.shipId];
                    break;
                  case "pilot_tip":
                    // Pilot tipped the player - notify for sound playback
                    if (onPilotTip && sectorEvent.data.tipAmount && sectorEvent.data.pilotName) {
                      onPilotTip(sectorEvent.data.tipAmount, sectorEvent.data.pilotName);
                    }
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
  }, [
    sectorId,
    setSectorData,
    setParticles,
    onAsteroidSpawn,
    onShipSpawn,
    onVectorMatched,
    onAsteroidDepleted,
    onShipRetarget,
    onShipAttack,
    onShipDestroyed,
    onPilotTip,
  ]);

  return {
    connectionStatus,
    events,
    wsRef,
  };
};
