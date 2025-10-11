"use client";

import { useCallback, useEffect, useRef } from "react";

interface StarfieldProps {
  sectorId: string;
  width: number;
  height: number;
  className?: string;
}

interface Star {
  x: number;
  y: number;
  size: number;
  brightness: number;
  type: "normal" | "cross";
  color: "white" | "red" | "purple" | "yellow";
  pulses: boolean;
}

// Simple seeded random number generator
class SeededRandom {
  private seed: number;

  constructor(seed: string) {
    // Convert string to number seed
    this.seed = 0;
    for (let i = 0; i < seed.length; i++) {
      this.seed = ((this.seed << 5) - this.seed + seed.charCodeAt(i)) & 0xffffffff;
    }
    if (this.seed < 0) this.seed = -this.seed;
  }

  // Linear congruential generator
  next(): number {
    this.seed = (this.seed * 1664525 + 1013904223) % 4294967296;
    return this.seed / 4294967296;
  }

  // Random number between min and max
  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }
}

export const Starfield = ({ sectorId, width, height, className }: StarfieldProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const starsRef = useRef<Star[]>([]);
  const animationRef = useRef<number | null>(null);

  // Generate stars deterministically based on sector ID
  const generateStars = useCallback(() => {
    const rng = new SeededRandom(sectorId);
    const stars: Star[] = [];

    // Generate different densities of stars
    const numStars = Math.floor(rng.range(150, 300)); // Random number of stars per sector

    for (let i = 0; i < numStars; i++) {
      // Determine if this should be a special star
      const isSpecial = rng.next() < 0.05; // 5% chance for special stars
      const isCross = isSpecial && rng.next() < 0.6; // 60% of special stars are crosses
      const hasColor = isSpecial && rng.next() < 0.4; // 40% of special stars have color
      const pulses = isSpecial && rng.next() < 0.3; // 30% of special stars pulse
      const isBigWhiteCross = isCross && !hasColor && rng.next() < 0.4; // 40% chance for big white crosses

      let color: "white" | "red" | "purple" | "yellow" = "white";
      if (hasColor) {
        color = rng.next() < 0.5 ? "red" : "purple";
      } else if (isBigWhiteCross) {
        color = "yellow"; // Big cross stars get yellow tint
      }

      // Determine size based on type and color
      let starSize: number;
      if (isCross) {
        if (hasColor) {
          starSize = rng.range(2, 4); // Colored cross stars stay smaller
        } else if (isBigWhiteCross) {
          starSize = rng.range(4, 7); // Big white/yellow cross stars
        } else {
          starSize = rng.range(2, 4); // Regular white cross stars
        }
      } else {
        starSize = rng.range(0.5, 3); // Normal circular stars
      }

      const star: Star = {
        x: rng.range(0, width),
        y: rng.range(0, height),
        size: starSize,
        brightness: rng.range(0.3, 1),
        type: isCross ? "cross" : "normal",
        color,
        pulses,
      };
      stars.push(star);
    }

    starsRef.current = stars;
  }, [sectorId, width, height]);

  // Draw the starfield
  const drawStars = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear canvas with deep space black
    ctx.fillStyle = "#000008";
    ctx.fillRect(0, 0, width, height);

    const currentTime = Date.now();

    // Draw stars
    starsRef.current.forEach(star => {
      ctx.save();

      // Calculate pulsing effect
      let brightness = star.brightness;
      if (star.pulses) {
        const pulseSpeed = 0.003; // Slow pulsing
        const pulse = Math.sin(currentTime * pulseSpeed) * 0.3 + 0.7; // Oscillate between 0.4 and 1.0
        brightness = star.brightness * pulse;
      }

      // Set star color based on type
      let fillColor: string;
      let shadowColor: string;
      switch (star.color) {
        case "red":
          fillColor = `rgba(255, 100, 100, ${brightness})`;
          shadowColor = "rgba(255, 100, 100, 0.5)";
          break;
        case "purple":
          fillColor = `rgba(200, 100, 255, ${brightness})`;
          shadowColor = "rgba(200, 100, 255, 0.5)";
          break;
        case "yellow":
          fillColor = `rgba(255, 255, 150, ${brightness})`;
          shadowColor = "rgba(255, 255, 150, 0.6)";
          break;
        default:
          fillColor = `rgba(255, 255, 255, ${brightness})`;
          shadowColor = "rgba(255, 255, 255, 0.5)";
      }

      ctx.fillStyle = fillColor;

      // Add glow effect for special stars
      if (star.type === "cross" || star.size > 2) {
        ctx.shadowColor = shadowColor;
        ctx.shadowBlur = star.size * 2;
      }

      if (star.type === "cross") {
        // Draw cross-shaped star
        const size = star.size;
        const armLength = size * 1.5;
        const armWidth = Math.max(1, size * 0.3);

        // Create gradient effect for all cross stars
        const gradient = ctx.createRadialGradient(star.x, star.y, 0, star.x, star.y, armLength);
        gradient.addColorStop(0, fillColor); // Bright center
        gradient.addColorStop(0.7, fillColor.replace(/[\d\.]+\)$/g, `${brightness * 0.6})`)); // Dimmer middle
        gradient.addColorStop(1, fillColor.replace(/[\d\.]+\)$/g, `${brightness * 0.2})`)); // Transparent edges
        ctx.fillStyle = gradient;

        // Horizontal arm
        ctx.fillRect(star.x - armLength, star.y - armWidth / 2, armLength * 2, armWidth);
        // Vertical arm
        ctx.fillRect(star.x - armWidth / 2, star.y - armLength, armWidth, armLength * 2);

        // Bright center circle for all cross stars
        ctx.fillStyle = fillColor; // Reset to full brightness for center
        ctx.beginPath();
        ctx.arc(star.x, star.y, armWidth * 1.2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Draw normal circular star
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    });
  }, [width, height]);

  // Generate stars when sector ID or dimensions change
  useEffect(() => {
    generateStars();
  }, [generateStars]);

  // Animation loop for pulsing stars
  useEffect(() => {
    if (starsRef.current.length === 0) return;

    const animate = () => {
      drawStars();
      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [drawStars, starsRef.current.length]);

  return (
    <canvas ref={canvasRef} width={width} height={height} className={className} style={{ background: "transparent" }} />
  );
};
