import { Vector2D, Asteroid, SECTOR_CONFIG } from "../types";
import { PositionUtils } from "./PositionUtils";

export class ShipAI {
  static calculateInterceptCourse(
    shipPos: Vector2D,
    asteroid: Asteroid
  ): { velocity: Vector2D; interceptTime: number | null } {
    const currentTime = Date.now();
    const asteroidPos = PositionUtils.calculatePosition(asteroid, currentTime);
    const d = { x: asteroidPos.x - shipPos.x, y: asteroidPos.y - shipPos.y };
    const dv = asteroid.velocity;
    const shipSpeed = SECTOR_CONFIG.SHIP_SPEED;

    // Quadratic formula for intercept calculation
    const a = dv.x * dv.x + dv.y * dv.y - shipSpeed * shipSpeed;
    const b = 2 * (d.x * dv.x + d.y * dv.y);
    const c = d.x * d.x + d.y * d.y;

    const discriminant = b * b - 4 * a * c;
    if (discriminant < 0) {
      // No intercept possible, aim directly at current position
      const dist = Math.sqrt(d.x * d.x + d.y * d.y);
      return {
        velocity: { x: (d.x / dist) * shipSpeed, y: (d.y / dist) * shipSpeed },
        interceptTime: null,
      };
    }

    const sqrtDisc = Math.sqrt(discriminant);
    const t1 = (-b - sqrtDisc) / (2 * a);
    const t2 = (-b + sqrtDisc) / (2 * a);
    const interceptTime =
      Math.min(t1, t2) > 0 ? Math.min(t1, t2) : Math.max(t1, t2);

    const intercept = {
      x: asteroidPos.x + dv.x * interceptTime,
      y: asteroidPos.y + dv.y * interceptTime,
    };

    const dx = intercept.x - shipPos.x;
    const dy = intercept.y - shipPos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    return {
      velocity: { x: (dx / dist) * shipSpeed, y: (dy / dist) * shipSpeed },
      interceptTime: currentTime + interceptTime * 1000,
    };
  }

  static calculateExitVelocity(shipPos: Vector2D): Vector2D {
    const speed = SECTOR_CONFIG.SHIP_SPEED;
    const distances = {
      left: shipPos.x,
      right: SECTOR_CONFIG.WIDTH - shipPos.x,
      top: shipPos.y,
      bottom: SECTOR_CONFIG.HEIGHT - shipPos.y,
    };

    const minDist = Math.min(...Object.values(distances));
    const exitBuffer = 200;

    let target: Vector2D;
    if (minDist === distances.left) {
      target = { x: -exitBuffer, y: shipPos.y };
    } else if (minDist === distances.right) {
      target = { x: SECTOR_CONFIG.WIDTH + exitBuffer, y: shipPos.y };
    } else if (minDist === distances.top) {
      target = { x: shipPos.x, y: -exitBuffer };
    } else {
      target = { x: shipPos.x, y: SECTOR_CONFIG.HEIGHT + exitBuffer };
    }

    const dx = target.x - shipPos.x;
    const dy = target.y - shipPos.y;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    return { x: (dx / len) * speed, y: (dy / len) * speed };
  }

  static calculateCenterVelocity(shipPos: Vector2D): Vector2D {
    const centerX = SECTOR_CONFIG.WIDTH / 2;
    const centerY = SECTOR_CONFIG.HEIGHT / 2;
    const dx = centerX - shipPos.x;
    const dy = centerY - shipPos.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > 0) {
      const speed = SECTOR_CONFIG.SHIP_SPEED * 0.5; // Half speed toward center
      return {
        x: (dx / distance) * speed,
        y: (dy / distance) * speed,
      };
    }
    return { x: 0, y: 0 }; // Already at center
  }
}
