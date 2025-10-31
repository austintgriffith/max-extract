"use client";

import { useCallback, useEffect, useRef } from "react";
import { SECTOR_CONFIG, SectorSnapshot, SelectedObject, Vector2D } from "~~/types/sector";

// Utility function to calculate current position of moving entities
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

interface SelectionIndicatorProps {
  selectedObject: SelectedObject | null;
  infoBoxPosition: Vector2D | null;
  canvasWidth: number;
  canvasHeight: number;
  baseSize?: number; // For station selection sizing
  sectorData: SectorSnapshot | null; // Need sector data to get current positions
}

export const SelectionIndicator = ({
  selectedObject,
  infoBoxPosition,
  canvasWidth,
  canvasHeight,
  baseSize = 60,
  sectorData,
}: SelectionIndicatorProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const pulseRef = useRef<number>(0);

  const drawSelection = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !selectedObject || !sectorData) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    const scale = SECTOR_CONFIG.CANVAS_SCALE;
    const padding = SECTOR_CONFIG.PADDING * scale;

    // Calculate pulsing opacity (0.5 to 1.0)
    pulseRef.current += 0.05;
    const pulseAlpha = 0.5 + Math.sin(pulseRef.current) * 0.3;

    // Get current position of the selected object
    const currentTime = Date.now();
    let sectorPos: Vector2D;

    if (selectedObject.type === "station") {
      // Station is always at center
      sectorPos = { x: SECTOR_CONFIG.WIDTH / 2, y: SECTOR_CONFIG.HEIGHT / 2 };
    } else if (selectedObject.type === "ship") {
      const ship = sectorData.ships[selectedObject.id];
      if (!ship) return; // Ship no longer exists
      sectorPos = calculatePosition(ship, currentTime);
    } else if (selectedObject.type === "asteroid") {
      const asteroid = sectorData.asteroids[selectedObject.id];
      if (!asteroid) return; // Asteroid no longer exists
      sectorPos = calculatePosition(asteroid, currentTime);
    } else {
      return;
    }

    // Convert sector position to canvas position
    const pos = {
      x: sectorPos.x * scale,
      y: sectorPos.y * scale,
    };

    // Draw selection indicator based on type
    ctx.save();
    ctx.translate(padding, padding);

    // Set global opacity to 50%
    ctx.globalAlpha = 0.5;

    // Set glow effect
    ctx.shadowBlur = 15;
    ctx.shadowColor = "rgba(6, 182, 212, 0.8)";

    if (selectedObject.type === "station") {
      // Rectangle for station
      const size = baseSize * scale * 2; // Make selection box larger than base
      ctx.strokeStyle = `rgba(6, 182, 212, ${pulseAlpha})`;
      ctx.lineWidth = 3;
      ctx.setLineDash([10, 5]);
      ctx.strokeRect(pos.x - size / 2, pos.y - size / 2, size, size);
      ctx.setLineDash([]);

      // Corner decorations
      const cornerSize = 15;
      ctx.lineWidth = 4;
      ctx.strokeStyle = `rgba(34, 211, 238, ${pulseAlpha})`;

      // Top-left
      ctx.beginPath();
      ctx.moveTo(pos.x - size / 2, pos.y - size / 2 + cornerSize);
      ctx.lineTo(pos.x - size / 2, pos.y - size / 2);
      ctx.lineTo(pos.x - size / 2 + cornerSize, pos.y - size / 2);
      ctx.stroke();

      // Top-right
      ctx.beginPath();
      ctx.moveTo(pos.x + size / 2 - cornerSize, pos.y - size / 2);
      ctx.lineTo(pos.x + size / 2, pos.y - size / 2);
      ctx.lineTo(pos.x + size / 2, pos.y - size / 2 + cornerSize);
      ctx.stroke();

      // Bottom-left
      ctx.beginPath();
      ctx.moveTo(pos.x - size / 2, pos.y + size / 2 - cornerSize);
      ctx.lineTo(pos.x - size / 2, pos.y + size / 2);
      ctx.lineTo(pos.x - size / 2 + cornerSize, pos.y + size / 2);
      ctx.stroke();

      // Bottom-right
      ctx.beginPath();
      ctx.moveTo(pos.x + size / 2 - cornerSize, pos.y + size / 2);
      ctx.lineTo(pos.x + size / 2, pos.y + size / 2);
      ctx.lineTo(pos.x + size / 2, pos.y + size / 2 - cornerSize);
      ctx.stroke();
    } else if (selectedObject.type === "ship" || selectedObject.type === "asteroid") {
      // Circle for ships and asteroids
      const radius = selectedObject.type === "ship" ? 50 : 40;
      ctx.strokeStyle = `rgba(6, 182, 212, ${pulseAlpha})`;
      ctx.lineWidth = 3;
      ctx.setLineDash([8, 4]);
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      // Inner circle
      ctx.strokeStyle = `rgba(34, 211, 238, ${pulseAlpha * 0.7})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, radius + 5, 0, Math.PI * 2);
      ctx.stroke();

      // Targeting reticle
      const reticleSize = 10;
      ctx.strokeStyle = `rgba(6, 182, 212, ${pulseAlpha})`;
      ctx.lineWidth = 2;

      // Top
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y - radius - 10);
      ctx.lineTo(pos.x, pos.y - radius - 10 - reticleSize);
      ctx.stroke();

      // Bottom
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y + radius + 10);
      ctx.lineTo(pos.x, pos.y + radius + 10 + reticleSize);
      ctx.stroke();

      // Left
      ctx.beginPath();
      ctx.moveTo(pos.x - radius - 10, pos.y);
      ctx.lineTo(pos.x - radius - 10 - reticleSize, pos.y);
      ctx.stroke();

      // Right
      ctx.beginPath();
      ctx.moveTo(pos.x + radius + 10, pos.y);
      ctx.lineTo(pos.x + radius + 10 + reticleSize, pos.y);
      ctx.stroke();
    }

    ctx.restore();

    // Draw connecting line to info box if position is available
    if (infoBoxPosition) {
      ctx.save();

      // Calculate end point on canvas (need to convert screen to canvas pixel coords)
      const canvasRect = canvas.getBoundingClientRect();

      // Account for canvas display size vs actual pixel size (same as click detection)
      const scaleX = canvas.width / canvasRect.width;
      const scaleY = canvas.height / canvasRect.height;

      const lineEndX = (infoBoxPosition.x - canvasRect.left) * scaleX;
      const lineEndY = (infoBoxPosition.y - canvasRect.top) * scaleY;

      // Start from object position (already in canvas coords with padding)
      const lineStartX = pos.x + padding;
      const lineStartY = pos.y + padding;

      // Draw line
      ctx.strokeStyle = `rgba(6, 182, 212, ${pulseAlpha * 0.6})`;
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(lineStartX, lineStartY);
      ctx.lineTo(lineEndX, lineEndY);
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw small circle at info box anchor
      ctx.fillStyle = `rgba(6, 182, 212, ${pulseAlpha})`;
      ctx.beginPath();
      ctx.arc(lineEndX, lineEndY, 4, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }
  }, [selectedObject, infoBoxPosition, canvasWidth, canvasHeight, baseSize, sectorData]);

  // Animation loop
  useEffect(() => {
    if (!selectedObject) {
      // Clear canvas when nothing selected
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.clearRect(0, 0, canvasWidth, canvasHeight);
        }
      }
      return;
    }

    const animate = () => {
      drawSelection();
      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [selectedObject, drawSelection, canvasWidth, canvasHeight, sectorData]);

  return (
    <canvas
      ref={canvasRef}
      width={canvasWidth}
      height={canvasHeight}
      className="border border-base-300 rounded-lg max-w-full absolute top-0 left-1/2 transform -translate-x-1/2 z-40 pointer-events-none"
      style={{ background: "transparent" }}
    />
  );
};
