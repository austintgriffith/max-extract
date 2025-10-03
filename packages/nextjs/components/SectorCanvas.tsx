"use client";

import { useCallback, useEffect, useRef } from "react";
import { Asteroid, Particle, SECTOR_CONFIG, SectorSnapshot, Ship, Vector2D } from "~~/types/sector";

interface SectorCanvasProps {
  sectorData: SectorSnapshot | null;
  particles: Particle[];
}

// Utility functions
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

const calculateParticlePosition = (particle: Particle, currentTime: number): Vector2D => {
  const elapsed = currentTime - particle.spawnTime;
  return {
    x: particle.position.x + particle.velocity.x * (elapsed / 1000),
    y: particle.position.y + particle.velocity.y * (elapsed / 1000),
  };
};

export const SectorCanvas = ({ sectorData, particles }: SectorCanvasProps) => {
  const backgroundCanvasRef = useRef<HTMLCanvasElement>(null);
  const baseCanvasRef = useRef<HTMLCanvasElement>(null);
  const foregroundCanvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const shipImageRef = useRef<HTMLImageElement | null>(null);
  const baseImageRef = useRef<HTMLImageElement | null>(null);
  const asteroidImagesRef = useRef<{
    small: HTMLImageElement | null;
    medium: HTMLImageElement | null;
    large: HTMLImageElement | null;
  }>({
    small: null,
    medium: null,
    large: null,
  });
  const scrapImagesRef = useRef<{
    scrap1: HTMLImageElement | null;
    scrap2: HTMLImageElement | null;
    scrap3: HTMLImageElement | null;
    scrap4: HTMLImageElement | null;
  }>({
    scrap1: null,
    scrap2: null,
    scrap3: null,
    scrap4: null,
  });

  // Load ship image
  useEffect(() => {
    const img = new Image();
    img.src = "/ships/ship1.png";
    img.onload = () => {
      shipImageRef.current = img;
    };
  }, []);

  // Load base image
  useEffect(() => {
    const img = new Image();
    img.src = "/bases/base1.png";
    img.onload = () => {
      baseImageRef.current = img;
    };
  }, []);

  // Load asteroid images
  useEffect(() => {
    const loadAsteroidImage = (size: "small" | "medium" | "large") => {
      const img = new Image();
      img.src = `/asteroids/asteroid_${size}_1.png`;
      img.onload = () => {
        asteroidImagesRef.current[size] = img;
      };
    };

    loadAsteroidImage("small");
    loadAsteroidImage("medium");
    loadAsteroidImage("large");
  }, []);

  // Load scrap images
  useEffect(() => {
    const loadScrapImage = (scrapType: "scrap1" | "scrap2" | "scrap3" | "scrap4") => {
      const img = new Image();
      img.src = `/asteroids/${scrapType}.png`;
      img.onload = () => {
        scrapImagesRef.current[scrapType] = img;
      };
    };

    loadScrapImage("scrap1");
    loadScrapImage("scrap2");
    loadScrapImage("scrap3");
    loadScrapImage("scrap4");
  }, []);

  const drawBackground = useCallback(() => {
    const canvas = backgroundCanvasRef.current;
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

    // Draw stats (outside the translated context)
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "14px monospace";
    ctx.fillText(`Asteroids: ${Object.keys(sectorData.asteroids).length}`, 10, 25);
    ctx.fillText(`Ships: ${Object.keys(sectorData.ships).length}`, 10, 45);
  }, [sectorData]);

  const drawBase = useCallback(() => {
    const canvas = baseCanvasRef.current;
    if (!canvas || !sectorData || !baseImageRef.current) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const scale = SECTOR_CONFIG.CANVAS_SCALE;
    const padding = SECTOR_CONFIG.PADDING * scale;
    const sectorWidth = SECTOR_CONFIG.WIDTH * scale;
    const sectorHeight = SECTOR_CONFIG.HEIGHT * scale;
    const canvasWidth = sectorWidth + 2 * padding;
    const canvasHeight = sectorHeight + 2 * padding;

    // Clear entire canvas (transparent background)
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    // Save context and translate by padding
    ctx.save();
    ctx.translate(padding, padding);

    // Calculate center position (1000, 1000 in sector coordinates)
    const centerX = SECTOR_CONFIG.WIDTH / 2;
    const centerY = SECTOR_CONFIG.HEIGHT / 2;

    // Convert to canvas coordinates
    const canvasCenterX = centerX * scale;
    const canvasCenterY = centerY * scale;

    // Draw base image centered at the middle of the sector
    const baseSize = 128 * scale; // Adjust size as needed
    ctx.drawImage(
      baseImageRef.current,
      canvasCenterX - baseSize / 2, // Center horizontally
      canvasCenterY - baseSize / 2, // Center vertically
      baseSize,
      baseSize,
    );

    ctx.restore();
  }, [sectorData]);

  const drawForeground = useCallback(() => {
    const canvas = foregroundCanvasRef.current;
    if (!canvas || !sectorData) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const scale = SECTOR_CONFIG.CANVAS_SCALE;
    const padding = SECTOR_CONFIG.PADDING * scale;
    const sectorWidth = SECTOR_CONFIG.WIDTH * scale;
    const sectorHeight = SECTOR_CONFIG.HEIGHT * scale;
    const canvasWidth = sectorWidth + 2 * padding;
    const canvasHeight = sectorHeight + 2 * padding;

    // Clear entire canvas (transparent background)
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    // Save context for entity drawing (we'll translate by padding)
    ctx.save();
    ctx.translate(padding, padding);

    const currentTime = Date.now();

    // Draw asteroids
    Object.values(sectorData.asteroids).forEach((asteroid: Asteroid) => {
      const pos = calculatePosition(asteroid, currentTime);

      // Only draw if within expanded bounds (way beyond sector for exit visibility)
      if (pos.x >= -500 && pos.x <= SECTOR_CONFIG.WIDTH + 500 && pos.y >= -500 && pos.y <= SECTOR_CONFIG.HEIGHT + 500) {
        ctx.save();
        ctx.translate(pos.x * scale, pos.y * scale);

        // Get the appropriate asteroid image based on size category
        const sizeCategory = asteroid.sizeCategory || "medium"; // fallback for old asteroids
        const asteroidImage = asteroidImagesRef.current[sizeCategory];

        if (asteroidImage) {
          // Calculate rotation based on time since spawn (very slow rotation)
          const rotationSpeed = 0.00025; // radians per millisecond (very slow - 2x slower)
          const elapsed = currentTime - asteroid.spawnTime;
          const rotation = elapsed * rotationSpeed;

          // Apply rotation
          ctx.rotate(rotation);

          // Draw asteroid PNG image (centered) - make visually larger
          const asteroidSize = asteroid.size * scale * 1.35; // 35% bigger visually
          ctx.drawImage(
            asteroidImage,
            -asteroidSize / 2, // Center horizontally
            -asteroidSize / 2, // Center vertically
            asteroidSize,
            asteroidSize,
          );
        } else {
          // Fallback to circle if image not loaded yet
          ctx.fillStyle = "#8B4513";
          ctx.strokeStyle = "#D2691E";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(0, 0, (asteroid.size * scale * 1.35) / 2, 0, Math.PI * 2); // 35% bigger visually
          ctx.fill();
          ctx.stroke();

          // Draw resource indicator
          const resourceRatio = asteroid.resources / 500; // Max resources
          ctx.fillStyle = `rgb(${255 - resourceRatio * 100}, ${100 + resourceRatio * 155}, 100)`;
          ctx.beginPath();
          ctx.arc(0, 0, ((asteroid.size * scale * 1.35) / 2) * 0.6, 0, Math.PI * 2); // Match larger visual size
          ctx.fill();
        }

        ctx.restore();
      }
    });

    // Draw explosion particles (scraps) - after asteroids, before ships
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

        // Check if this is a scrap particle
        if (particle.scrapType && scrapImagesRef.current[particle.scrapType]) {
          // Draw scrap PNG image - make visually larger
          const scrapImage = scrapImagesRef.current[particle.scrapType];
          const scrapSize = particle.size * scale * 2.0; // Double the size for better visibility

          // Only draw if image is loaded
          if (scrapImage) {
            // Add slight rotation for more dynamic look
            const rotationSpeed = 0.002; // Faster rotation for scraps
            const rotation = (currentTime - particle.spawnTime) * rotationSpeed;
            ctx.rotate(rotation);

            ctx.drawImage(
              scrapImage,
              -scrapSize / 2, // Center horizontally
              -scrapSize / 2, // Center vertically
              scrapSize,
              scrapSize,
            );
          }
        } else {
          // Fallback to circle for old particles or if image not loaded
          ctx.fillStyle = particle.color;
          ctx.beginPath();
          ctx.arc(0, 0, particle.size * scale * 2.0, 0, Math.PI * 2); // Double size for visibility
          ctx.fill();
        }

        ctx.restore();
      }
    });

    // Draw ships
    Object.values(sectorData.ships).forEach((ship: Ship) => {
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
        // Since the ship PNG points up (north), we need to adjust the rotation
        // Math.atan2 gives us the angle where 0 is pointing right (east)
        // But our ship image points up (north), so we add π/2 (90 degrees)
        if (ship.velocity.x !== 0 || ship.velocity.y !== 0) {
          const angle = Math.atan2(ship.velocity.y, ship.velocity.x) + Math.PI / 2;
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

        // Draw ship PNG image (centered)
        if (shipImageRef.current) {
          const shipSize = 72 * scale; // Size of the ship image (50% bigger than doubled: 48 * 1.5)

          ctx.drawImage(
            shipImageRef.current,
            -shipSize / 2, // Center horizontally
            -shipSize / 2, // Center vertically
            shipSize,
            shipSize,
          );
        } else {
          // Fallback to triangle if image not loaded yet
          ctx.beginPath();
          ctx.moveTo(6 * scale, 0); // tip 6 units forward
          ctx.lineTo(-6 * scale, 4 * scale); // back left 6 units back, 4 up
          ctx.lineTo(-6 * scale, -4 * scale); // back right 6 units back, 4 down
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        }

        ctx.restore();
      }
    });

    // Restore context after drawing entities
    ctx.restore();
  }, [sectorData, particles]);

  // Animation loop
  useEffect(() => {
    if (!sectorData) return;

    const animate = () => {
      drawBackground();
      drawBase();
      drawForeground();
      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [sectorData, drawBackground, drawBase, drawForeground]);

  const canvasWidth =
    SECTOR_CONFIG.WIDTH * SECTOR_CONFIG.CANVAS_SCALE + 2 * SECTOR_CONFIG.PADDING * SECTOR_CONFIG.CANVAS_SCALE;
  const canvasHeight =
    SECTOR_CONFIG.HEIGHT * SECTOR_CONFIG.CANVAS_SCALE + 2 * SECTOR_CONFIG.PADDING * SECTOR_CONFIG.CANVAS_SCALE;

  return (
    <div className="flex justify-center relative">
      {/* Background canvas for grid and field - lowest z-index */}
      <canvas
        ref={backgroundCanvasRef}
        width={canvasWidth}
        height={canvasHeight}
        className="border border-base-300 rounded-lg bg-black max-w-full relative z-0"
      />

      {/* Base canvas for base structures - middle z-index */}
      <canvas
        ref={baseCanvasRef}
        width={canvasWidth}
        height={canvasHeight}
        className="border border-base-300 rounded-lg max-w-full absolute top-0 left-1/2 transform -translate-x-1/2 z-10 pointer-events-none"
        style={{ background: "transparent" }}
      />

      {/* Foreground canvas for ships and asteroids - highest z-index */}
      <canvas
        ref={foregroundCanvasRef}
        width={canvasWidth}
        height={canvasHeight}
        className="border border-base-300 rounded-lg max-w-full absolute top-0 left-1/2 transform -translate-x-1/2 z-20 pointer-events-none"
        style={{ background: "transparent" }}
      />
    </div>
  );
};
