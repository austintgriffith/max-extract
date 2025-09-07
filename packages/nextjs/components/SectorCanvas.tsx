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
  const foregroundCanvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);

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
  }, [sectorData, particles]);

  // Animation loop
  useEffect(() => {
    if (!sectorData) return;

    const animate = () => {
      drawBackground();
      drawForeground();
      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [sectorData, drawBackground, drawForeground]);

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
