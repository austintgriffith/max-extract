import { Asteroid, SECTOR_CONFIG } from "../types";
import { PositionUtils } from "./PositionUtils";

export class AsteroidUtils {
  static calculateTimeToMapEdge(asteroid: Asteroid): number {
    const currentTime = Date.now();
    const currentPos = PositionUtils.calculatePosition(asteroid, currentTime);
    const buffer = SECTOR_CONFIG.ASTEROID_EDGE_BUFFER;
    let minTime = Infinity;

    const edgeCalculations = [
      // Left edge
      asteroid.velocity.x < 0
        ? (currentPos.x + buffer) / Math.abs(asteroid.velocity.x)
        : Infinity,
      // Right edge
      asteroid.velocity.x > 0
        ? (SECTOR_CONFIG.WIDTH + buffer - currentPos.x) / asteroid.velocity.x
        : Infinity,
      // Top edge
      asteroid.velocity.y < 0
        ? (currentPos.y + buffer) / Math.abs(asteroid.velocity.y)
        : Infinity,
      // Bottom edge
      asteroid.velocity.y > 0
        ? (SECTOR_CONFIG.HEIGHT + buffer - currentPos.y) / asteroid.velocity.y
        : Infinity,
    ];

    minTime = Math.min(...edgeCalculations);
    return minTime === Infinity ? 1000 : minTime;
  }
}
