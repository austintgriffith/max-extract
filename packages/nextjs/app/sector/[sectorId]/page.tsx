"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";

// Types matching the backend
interface Vector2D {
  x: number;
  y: number;
}

interface Asteroid {
  id: string;
  position: Vector2D;
  velocity: Vector2D;
  size: number;
  resources: number;
  spawnTime: number;
}

interface Ship {
  id: string;
  address: string;
  position: Vector2D;
  velocity: Vector2D;
  targetAsteroidId: string | null;
  targetShipId: string | null; // New field for ship-to-ship targeting
  state: "flying" | "mining" | "exiting";
  spawnTime: number;
  spawnAngle: number;
  score: number;
  fuel: number; // 0-100 percentage
  maxFuel: number; // Starting fuel amount
  isVectorMatched: boolean; // New field to track if ship has matched asteroid's vector
  vectorMatchTime: number | null; // When the vector matching started
  fullCargo: boolean; // Flag to indicate if ship has mined cargo and should move slower
}

interface SectorSnapshot {
  asteroids: Record<string, Asteroid>;
  ships: Record<string, Ship>;
  lastUpdate: number;
}

interface SectorEvent {
  type:
    | "asteroid_spawn"
    | "ship_spawn"
    | "ship_mining"
    | "asteroid_depleted"
    | "asteroid_exit"
    | "ship_exit"
    | "ship_retarget"
    | "ship_fuel_update"
    | "ship_vector_matched"
    | "ship_combat"
    | "ship_destroyed";
  timestamp: number;
  data: any;
}

interface Particle {
  id: string;
  position: Vector2D;
  velocity: Vector2D;
  size: number;
  color: string;
  spawnTime: number;
  lifetime: number; // milliseconds
}

const SECTOR_CONFIG = {
  WIDTH: 1000,
  HEIGHT: 1000,
  CANVAS_SCALE: 1, // Scale down more to fit larger area
  SHIP_COMBAT_RANGE: 10, // Tighter range for ship-to-ship vector matching and combat
  PADDING: 5, // Huge padding to see ships exiting way beyond boundaries
  EXIT_REMOVAL_BUFFER: 5, // Buffer for when entities are actually removed from the game
};

const SectorPage = () => {
  const params = useParams();
  const sectorId = params?.sectorId as string;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const animationRef = useRef<number | null>(null);

  const [sectorData, setSectorData] = useState<SectorSnapshot | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<"connecting" | "connected" | "disconnected">("disconnected");
  const [events, setEvents] = useState<SectorEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [particles, setParticles] = useState<Particle[]>([]);

  // Load initial sector data
  useEffect(() => {
    if (!sectorId) return;

    const loadSectorData = async () => {
      try {
        const response = await fetch(`http://localhost:8000/sector/${sectorId}`);
        if (!response.ok) {
          throw new Error(`Sector ${sectorId} not found`);
        }
        const data = await response.json();
        setSectorData(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load sector data");
        console.error("Error loading sector data:", err);
      }
    };

    loadSectorData();
  }, [sectorId]);

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
                setError(message.message);
                return;
              }

              // Handle sector events
              const sectorEvent = message as SectorEvent;
              setEvents(prev => [...prev.slice(-19), sectorEvent]); // Keep last 20 events

              // Update sector data based on event
              setSectorData(prev => {
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
  }, [sectorId]); // Removed sectorData dependency to prevent reconnections

  const calculatePosition = (entity: Asteroid | Ship, currentTime: number): Vector2D => {
    const elapsed = currentTime - entity.spawnTime;
    return {
      x: entity.position.x + entity.velocity.x * (elapsed / 1000),
      y: entity.position.y + entity.velocity.y * (elapsed / 1000),
    };
  };

  const calculateParticlePosition = (particle: Particle, currentTime: number): Vector2D => {
    const elapsed = currentTime - particle.spawnTime;
    return {
      x: particle.position.x + particle.velocity.x * (elapsed / 1000),
      y: particle.position.y + particle.velocity.y * (elapsed / 1000),
    };
  };

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
  }, [sectorData]);

  const createExplosionParticles = (asteroidPos: Vector2D, asteroidSize: number): Particle[] => {
    const particleCount = Math.floor(asteroidSize / 4) + 5; // More particles for bigger asteroids
    const newParticles: Particle[] = [];

    for (let i = 0; i < particleCount; i++) {
      const angle = (Math.PI * 2 * i) / particleCount + (Math.random() - 0.5) * 0.5;
      const speed = 20 + Math.random() * 40;

      newParticles.push({
        id: `particle_${Date.now()}_${i}`,
        position: { ...asteroidPos },
        velocity: {
          x: Math.cos(angle) * speed,
          y: Math.sin(angle) * speed,
        },
        size: 2 + Math.random() * 4,
        color: `hsl(${25 + Math.random() * 30}, 70%, ${50 + Math.random() * 30}%)`, // Brown/orange shades
        spawnTime: Date.now(),
        lifetime: 1500 + Math.random() * 1000, // 1.5-2.5 seconds
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

  const drawSector = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !sectorData) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const scale = SECTOR_CONFIG.CANVAS_SCALE;
    const padding = SECTOR_CONFIG.PADDING * scale;
    const sectorWidth = SECTOR_CONFIG.WIDTH * scale;
    const sectorHeight = SECTOR_CONFIG.HEIGHT * scale;
    const canvasWidth = sectorWidth + 2 * padding;
    const canvasHeight = sectorHeight + 2 * padding;

    // Clear entire canvas
    ctx.fillStyle = "#0a0a0a";
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Draw 10x10 grid to show boundaries
    ctx.strokeStyle = "#222";
    ctx.lineWidth = 1;
    const gridSize = 10;
    const cellWidth = sectorWidth / gridSize;
    const cellHeight = sectorHeight / gridSize;

    // Draw vertical grid lines
    for (let i = 0; i <= gridSize; i++) {
      const x = padding + i * cellWidth;
      ctx.beginPath();
      ctx.moveTo(x, padding);
      ctx.lineTo(x, padding + sectorHeight);
      ctx.stroke();
    }

    // Draw horizontal grid lines
    for (let i = 0; i <= gridSize; i++) {
      const y = padding + i * cellHeight;
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(padding + sectorWidth, y);
      ctx.stroke();
    }

    // Draw sector border (thicker than grid)
    ctx.strokeStyle = "#555";
    ctx.lineWidth = 3;
    ctx.strokeRect(padding, padding, sectorWidth, sectorHeight);

    // Draw exit boundaries (where ships actually get removed)
    const exitBuffer = SECTOR_CONFIG.EXIT_REMOVAL_BUFFER * scale;
    ctx.strokeStyle = "#ff4444";
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]); // Dashed line
    ctx.strokeRect(
      padding - exitBuffer,
      padding - exitBuffer,
      sectorWidth + 2 * exitBuffer,
      sectorHeight + 2 * exitBuffer,
    );
    ctx.setLineDash([]); // Reset to solid lines

    // Save context for entity drawing (we'll translate by padding)
    ctx.save();
    ctx.translate(padding, padding);

    const currentTime = Date.now();

    // Draw asteroids
    Object.values(sectorData.asteroids).forEach(asteroid => {
      const pos = calculatePosition(asteroid, currentTime);

      // Only draw if within expanded bounds (way beyond sector for exit visibility)
      if (pos.x >= -500 && pos.x <= SECTOR_CONFIG.WIDTH + 500 && pos.y >= -500 && pos.y <= SECTOR_CONFIG.HEIGHT + 500) {
        ctx.save();
        ctx.translate(pos.x * scale, pos.y * scale);

        // Draw asteroid
        ctx.fillStyle = "#8B4513";
        ctx.strokeStyle = "#D2691E";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(0, 0, (asteroid.size * scale) / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Draw resource indicator
        const resourceRatio = asteroid.resources / 500; // Max resources
        ctx.fillStyle = `rgb(${255 - resourceRatio * 100}, ${100 + resourceRatio * 155}, 100)`;
        ctx.beginPath();
        ctx.arc(0, 0, ((asteroid.size * scale) / 2) * 0.6, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      }
    });

    // Draw ships
    Object.values(sectorData.ships).forEach(ship => {
      const pos = calculatePosition(ship, currentTime);

      // Only draw if within very expanded bounds to see full exit journey
      if (pos.x >= -500 && pos.x <= SECTOR_CONFIG.WIDTH + 500 && pos.y >= -500 && pos.y <= SECTOR_CONFIG.HEIGHT + 500) {
        ctx.save();
        ctx.translate(pos.x * scale, pos.y * scale);

        // Draw target line BEFORE rotating canvas - so it's not affected by ship rotation
        if (ship.state === "flying" && ship.targetAsteroidId && sectorData.asteroids[ship.targetAsteroidId]) {
          const target = sectorData.asteroids[ship.targetAsteroidId];
          const targetPos = calculatePosition(target, currentTime);

          ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(0, 0); // From ship position (already translated)
          ctx.lineTo((targetPos.x - pos.x) * scale, (targetPos.y - pos.y) * scale);
          ctx.stroke();

          // Draw a small circle at the target position
          ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
          ctx.beginPath();
          ctx.arc((targetPos.x - pos.x) * scale, (targetPos.y - pos.y) * scale, 3, 0, Math.PI * 2);
          ctx.fill();
        }

        // NOW rotate canvas for ship drawing
        if (ship.velocity.x !== 0 || ship.velocity.y !== 0) {
          const angle = Math.atan2(ship.velocity.y, ship.velocity.x);
          ctx.rotate(angle);
        }

        // Draw ship based on fuel level and state
        let shipColor = "#00FF00"; // Default green
        if (ship.fuel !== undefined) {
          const fuelRatio = ship.fuel / 100;
          if (fuelRatio > 0.8) {
            shipColor = "#00FF00"; // Bright green (full fuel)
          } else if (fuelRatio > 0.6) {
            shipColor = "#88FF00"; // Yellow-green
          } else if (fuelRatio > 0.4) {
            shipColor = "#FFFF00"; // Yellow
          } else if (fuelRatio > 0.2) {
            shipColor = "#FF8800"; // Orange
          } else if (fuelRatio > 0.1) {
            shipColor = "#FF4400"; // Red
          } else {
            shipColor = "#AA0000"; // Dark red (almost empty)
          }
        }

        // Override for special states
        if (ship.state === "exiting") {
          shipColor = "#666666"; // Gray for exiting
        } else if (ship.isVectorMatched) {
          shipColor = "#00FFFF"; // Cyan for vector-matched ships
        }

        ctx.fillStyle = shipColor;
        ctx.strokeStyle = "#FFFFFF";
        ctx.lineWidth = 1;

        // Draw triangle ship (centered)
        ctx.beginPath();
        ctx.moveTo(6 * scale, 0); // tip 6 units forward
        ctx.lineTo(-6 * scale, 4 * scale); // back left 6 units back, 4 up
        ctx.lineTo(-6 * scale, -4 * scale); // back right 6 units back, 4 down
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.restore();
      }
    });

    // Draw explosion particles
    particles.forEach(particle => {
      const pos = calculateParticlePosition(particle, currentTime);
      const age = currentTime - particle.spawnTime;
      const ageRatio = age / particle.lifetime;

      // Only draw if within bounds and still alive
      if (
        ageRatio < 1 &&
        pos.x >= -500 &&
        pos.x <= SECTOR_CONFIG.WIDTH + 500 &&
        pos.y >= -500 &&
        pos.y <= SECTOR_CONFIG.HEIGHT + 500
      ) {
        ctx.save();
        ctx.translate(pos.x * scale, pos.y * scale);

        // Fade out over time
        const alpha = 1 - ageRatio;
        ctx.globalAlpha = alpha;

        // Draw particle
        ctx.fillStyle = particle.color;
        ctx.beginPath();
        ctx.arc(0, 0, particle.size * scale, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      }
    });

    // Restore context after drawing entities
    ctx.restore();

    // Draw stats (outside the translated context)
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "14px monospace";
    ctx.fillText(`Asteroids: ${Object.keys(sectorData.asteroids).length}`, 10, 25);
    ctx.fillText(`Ships: ${Object.keys(sectorData.ships).length}`, 10, 45);
    ctx.fillText(`Last Update: ${new Date(sectorData.lastUpdate).toLocaleTimeString()}`, 10, 65);
    ctx.fillText(`Grid: 10x10 (100x100 units per cell)`, 10, 85);
  }, [sectorData, particles]);

  // Vector matching check - runs frequently to catch ships reaching asteroids
  useEffect(() => {
    if (!sectorData) return;

    const interval = setInterval(() => {
      checkAndHandleVectorMatching();
    }, 100); // Check every 100ms for responsive vector matching

    return () => clearInterval(interval);
  }, [checkAndHandleVectorMatching]);

  // Animation loop
  useEffect(() => {
    if (!sectorData) return;

    const animate = () => {
      drawSector();
      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [sectorData, drawSector]);

  // Particle and ship cleanup effect
  useEffect(() => {
    const interval = setInterval(() => {
      const currentTime = Date.now();
      setParticles(prev => prev.filter(particle => currentTime - particle.spawnTime < particle.lifetime));

      // Also clean up ships that are way out of bounds (frontend safety net)
      setSectorData(prev => {
        if (!prev) return prev;

        const newData = { ...prev };
        let removedShips = 0;

        Object.keys(newData.ships).forEach(shipId => {
          const ship = newData.ships[shipId];
          const pos = calculatePosition(ship, currentTime);

          // Remove ships that are way beyond backend cleanup bounds
          if (pos.x < -200 || pos.x > SECTOR_CONFIG.WIDTH + 200 || pos.y < -200 || pos.y > SECTOR_CONFIG.HEIGHT + 200) {
            console.log(`Frontend cleanup: Removing ship ${shipId} at (${Math.round(pos.x)}, ${Math.round(pos.y)})`);
            delete newData.ships[shipId];
            removedShips++;
          }
        });

        return removedShips > 0 ? newData : prev;
      });
    }, 500); // Clean up every 500ms

    return () => clearInterval(interval);
  }, []);

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Link href="/" className="btn btn-sm btn-ghost mb-4">
          <ArrowLeftIcon className="h-4 w-4 mr-2" />
          Back to Home
        </Link>
        <div className="alert alert-error">
          <span>{error}</span>
        </div>
      </div>
    );
  }

  if (!sectorData) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Link href="/" className="btn btn-sm btn-ghost mb-4">
          <ArrowLeftIcon className="h-4 w-4 mr-2" />
          Back to Home
        </Link>
        <div className="flex items-center justify-center h-64">
          <span className="loading loading-spinner loading-lg"></span>
          <span className="ml-4">Loading sector data...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <Link href="/" className="btn btn-sm btn-ghost">
          <ArrowLeftIcon className="h-4 w-4 mr-2" />
          Back to Home
        </Link>

        <div className="flex items-center gap-4">
          <div
            className={`badge ${
              connectionStatus === "connected"
                ? "badge-success"
                : connectionStatus === "connecting"
                  ? "badge-warning"
                  : "badge-error"
            }`}
          >
            {connectionStatus}
          </div>
          <h1 className="text-xl font-bold">Sector {sectorId}</h1>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sector Visualization */}
        <div className="lg:col-span-2">
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h2 className="card-title">Sector View</h2>
              <div className="flex justify-center">
                <canvas
                  ref={canvasRef}
                  width={
                    SECTOR_CONFIG.WIDTH * SECTOR_CONFIG.CANVAS_SCALE +
                    2 * SECTOR_CONFIG.PADDING * SECTOR_CONFIG.CANVAS_SCALE
                  }
                  height={
                    SECTOR_CONFIG.HEIGHT * SECTOR_CONFIG.CANVAS_SCALE +
                    2 * SECTOR_CONFIG.PADDING * SECTOR_CONFIG.CANVAS_SCALE
                  }
                  className="border border-base-300 rounded-lg bg-black max-w-full"
                />
              </div>
              <div className="text-sm text-base-content/70 mt-2">
                <div className="flex gap-4 flex-wrap mb-2">
                  <span className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-yellow-600 rounded-full"></div>
                    Asteroids
                  </span>
                  <span className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    Flying Ships
                  </span>
                  <span className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-cyan-400 rounded-full"></div>
                    Vector Matched
                  </span>
                  <span className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
                    Exiting Ships
                  </span>
                </div>
                <div className="text-xs text-base-content/50">
                  🌌 Sector boundaries: 1000×1000 units | Grid: 10×10 cells (100×100 units each)
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Event Log and Stats */}
        <div className="space-y-6">
          {/* Stats */}
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h2 className="card-title">Sector Stats</h2>
              <div className="stats stats-vertical">
                <div className="stat">
                  <div className="stat-title">Asteroids</div>
                  <div className="stat-value text-primary">{Object.keys(sectorData.asteroids).length}</div>
                </div>
                <div className="stat">
                  <div className="stat-title">Ships</div>
                  <div className="stat-value text-secondary">{Object.keys(sectorData.ships).length}</div>
                </div>
                <div className="stat">
                  <div className="stat-title">Connection</div>
                  <div
                    className={`stat-value text-sm ${connectionStatus === "connected" ? "text-success" : "text-error"}`}
                  >
                    {connectionStatus}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Event Log */}
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h2 className="card-title">Recent Events</h2>
              <div className="max-h-96 overflow-y-auto space-y-2">
                {events.length === 0 ? (
                  <p className="text-base-content/50">No events yet...</p>
                ) : (
                  events
                    .slice()
                    .reverse()
                    .map((event, index) => (
                      <div key={index} className="text-sm p-2 bg-base-200 rounded">
                        <div className="flex justify-between items-start">
                          <span
                            className={`badge badge-sm ${
                              event.type === "asteroid_spawn"
                                ? "badge-info"
                                : event.type === "ship_spawn"
                                  ? "badge-success"
                                  : event.type === "asteroid_depleted"
                                    ? "badge-error"
                                    : event.type === "asteroid_exit"
                                      ? "badge-neutral"
                                      : event.type === "ship_exit"
                                        ? "badge-warning"
                                        : event.type === "ship_retarget"
                                          ? "badge-accent"
                                          : event.type === "ship_vector_matched"
                                            ? "badge-primary"
                                            : "badge-ghost"
                            }`}
                          >
                            {event.type.replace("_", " ")}
                          </span>
                          <span className="text-xs text-base-content/50">
                            {new Date(event.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        <div className="mt-1 text-xs text-base-content/70">
                          {event.type === "ship_spawn" && `Ship ${event.data.address.slice(0, 8)}... spawned`}
                          {event.type === "asteroid_spawn" && `Asteroid spawned (size: ${Math.round(event.data.size)})`}
                          {event.type === "asteroid_depleted" && `Asteroid mined (score: ${event.data.score})`}
                          {event.type === "asteroid_exit" && `Asteroid drifted off map`}
                          {event.type === "ship_exit" &&
                            `Ship exited (total: ${event.data.score}${event.data.fuelBonus ? `, fuel bonus: ${event.data.fuelBonus}` : ""})`}
                          {event.type === "ship_retarget" && `Ship changed course (${event.data.state})`}
                          {event.type === "ship_vector_matched" &&
                            (event.data.targetShipId
                              ? `Ship matched target ship vector (combat)`
                              : `Ship matched asteroid vector (mining)`)}
                          {event.type === "ship_destroyed" &&
                            `Ship destroyed! Attacker gained ${event.data.stolenScore} points + ${event.data.stolenFuel} fuel`}
                        </div>
                      </div>
                    ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SectorPage;
