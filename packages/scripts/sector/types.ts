// Sector-specific types and interfaces

import type { Vector2D, Ship, Asteroid } from "../types";

export interface TargetingResult {
  targetId: string | null;
  targetType: "asteroid" | "ship" | null;
}

export interface SpawnPositionResult {
  position: Vector2D;
  velocity: Vector2D;
}

export interface InterceptResult {
  velocity: Vector2D;
  interceptTime: number;
}

