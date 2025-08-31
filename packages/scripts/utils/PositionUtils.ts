import { Vector2D, Asteroid, Ship } from "../types";

export class PositionUtils {
  static calculatePosition(
    entity: Asteroid | Ship,
    currentTime: number
  ): Vector2D {
    const elapsed = currentTime - entity.spawnTime;
    return {
      x: entity.position.x + entity.velocity.x * (elapsed / 1000),
      y: entity.position.y + entity.velocity.y * (elapsed / 1000),
    };
  }

  static isOutOfBounds(
    position: Vector2D,
    width: number,
    height: number
  ): boolean {
    const buffer = 100;
    return (
      position.x < -buffer ||
      position.x > width + buffer ||
      position.y < -buffer ||
      position.y > height + buffer
    );
  }
}
