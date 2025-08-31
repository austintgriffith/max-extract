// Shared types and interfaces for the Max Extract game server

export interface Vector2D {
  x: number;
  y: number;
}

export interface Asteroid {
  id: string;
  position: Vector2D;
  velocity: Vector2D;
  size: number;
  resources: number;
  spawnTime: number;
}

export interface Ship {
  id: string;
  address: string;
  privateKey: string;
  position: Vector2D;
  velocity: Vector2D;
  targetAsteroidId: string | null;
  state: "flying" | "mining" | "exiting";
  spawnTime: number;
  spawnAngle: number;
  score: number;
  fuel: number; // 0-100 percentage
  maxFuel: number; // Starting fuel amount
}

export interface SectorEvent {
  type:
    | "asteroid_spawn"
    | "ship_spawn"
    | "ship_mining"
    | "asteroid_depleted"
    | "asteroid_exit"
    | "ship_exit"
    | "ship_retarget"
    | "ship_fuel_update";
  timestamp: number;
  data: any;
}

export interface SectorSnapshot {
  asteroids: Record<string, Asteroid>;
  ships: Record<string, Ship>;
  lastUpdate: number;
}

export const SECTOR_CONFIG = {
  WIDTH: 1000,
  HEIGHT: 1000,
  MIN_ASTEROID_SIZE: 20,
  MAX_ASTEROID_SIZE: 80,
  MIN_ASTEROID_RESOURCES: 100,
  MAX_ASTEROID_RESOURCES: 500,
  ASTEROID_SPEED: 30,
  SHIP_SPEED: 50,
  UPDATE_INTERVAL: 1000, // 1 second
  ASTEROID_SPAWN_CHANCE: 0.1, // 1/10 chance
  SHIP_SPAWN_CHANCE: 0.4, // 4/10 chance
  FUEL_CONSUMPTION_RATE: 0.7, // Fuel consumed per second while moving
  LOW_FUEL_THRESHOLD: 20, // Exit when fuel drops below this percentage
};
