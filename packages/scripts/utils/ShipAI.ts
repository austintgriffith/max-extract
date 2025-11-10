import { Vector2D, Asteroid, Ship, SECTOR_CONFIG, getCargoCapacity } from "../types";
import { PositionUtils } from "./PositionUtils";

export class ShipAI {
  /**
   * Get ship speed based on cargo fill percentage
   * Speed scales from 100% (empty) to 50% (full) - makes full ships slower but not helpless
   */
  static getShipSpeed(ship: Ship): number {
    // Calculate fill percentage (0 to 1)
    const maxCapacity = getCargoCapacity(ship.shipType);
    const fillPercentage = Math.min(1, ship.currentCargo / maxCapacity);
    
    // Speed multiplier ranges from 1.0 (empty) to 0.5 (full) - half speed when full
    const speedMultiplier = 1.0 - (0.5 * fillPercentage);
    
    return SECTOR_CONFIG.SHIP_SPEED * speedMultiplier;
  }

  /**
   * Calculate intercept course for ship-to-ship targeting
   * @param attackerPos Position of the attacking ship
   * @param targetShip The target ship to intercept
   * @param attackerShip The attacking ship
   * @returns Velocity and intercept time for the attacking ship
   */
  static calculateShipInterceptCourse(
    attackerPos: Vector2D,
    targetShip: Ship,
    attackerShip: Ship
  ): { velocity: Vector2D; interceptTime: number | null } {
    const currentTime = Date.now();
    const targetPos = PositionUtils.calculatePosition(targetShip, currentTime);
    const d = {
      x: targetPos.x - attackerPos.x,
      y: targetPos.y - attackerPos.y,
    };
    const dv = targetShip.velocity;
    const attackerSpeed = this.getShipSpeed(attackerShip);

    // Quadratic formula for intercept calculation (same as asteroid intercept)
    const a = dv.x * dv.x + dv.y * dv.y - attackerSpeed * attackerSpeed;
    const b = 2 * (d.x * dv.x + d.y * dv.y);
    const c = d.x * d.x + d.y * d.y;

    const discriminant = b * b - 4 * a * c;
    if (discriminant < 0) {
      // No intercept possible, aim directly at current position
      const dist = Math.sqrt(d.x * d.x + d.y * d.y);
      return {
        velocity: {
          x: (d.x / dist) * attackerSpeed,
          y: (d.y / dist) * attackerSpeed,
        },
        interceptTime: null,
      };
    }

    const sqrtDisc = Math.sqrt(discriminant);
    const t1 = (-b - sqrtDisc) / (2 * a);
    const t2 = (-b + sqrtDisc) / (2 * a);
    const interceptTime =
      Math.min(t1, t2) > 0 ? Math.min(t1, t2) : Math.max(t1, t2);

    const intercept = {
      x: targetPos.x + dv.x * interceptTime,
      y: targetPos.y + dv.y * interceptTime,
    };

    const dx = intercept.x - attackerPos.x;
    const dy = intercept.y - attackerPos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    return {
      velocity: {
        x: (dx / dist) * attackerSpeed,
        y: (dy / dist) * attackerSpeed,
      },
      interceptTime: currentTime + interceptTime * 1000,
    };
  }
  static calculateInterceptCourse(
    shipPos: Vector2D,
    asteroid: Asteroid,
    ship: Ship
  ): { velocity: Vector2D; interceptTime: number | null } {
    const currentTime = Date.now();
    const asteroidPos = PositionUtils.calculatePosition(asteroid, currentTime);
    const d = { x: asteroidPos.x - shipPos.x, y: asteroidPos.y - shipPos.y };
    const dv = asteroid.velocity;
    const shipSpeed = this.getShipSpeed(ship);

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

  static calculateExitVelocity(shipPos: Vector2D, ship: Ship): Vector2D {
    const speed = this.getShipSpeed(ship);
    const distances = {
      left: shipPos.x,
      right: SECTOR_CONFIG.WIDTH - shipPos.x,
      top: shipPos.y,
      bottom: SECTOR_CONFIG.HEIGHT - shipPos.y,
    };

    const minDist = Math.min(...Object.values(distances));
    const exitBuffer = SECTOR_CONFIG.EXIT_TARGET_BUFFER;

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

  static calculateCenterVelocity(shipPos: Vector2D, ship: Ship): Vector2D {
    const centerX = SECTOR_CONFIG.WIDTH / 2;
    const centerY = SECTOR_CONFIG.HEIGHT / 2;
    const dx = centerX - shipPos.x;
    const dy = centerY - shipPos.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > 0) {
      const baseSpeed = this.getShipSpeed(ship);
      const speed = baseSpeed * 0.5; // Half speed toward center
      return {
        x: (dx / distance) * speed,
        y: (dy / distance) * speed,
      };
    }
    return { x: 0, y: 0 }; // Already at center
  }
}
