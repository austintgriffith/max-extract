// Shared types and interfaces for the Max Extract game server

export interface Vector2D {
  x: number;
  y: number;
}

export type AsteroidSize = "small" | "medium" | "large";

export interface Asteroid {
  id: string;
  position: Vector2D;
  velocity: Vector2D;
  size: number;
  sizeCategory: AsteroidSize;
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
  targetShipId: string | null; // New field for targeting other ships
  state: "flying" | "mining" | "exiting";
  spawnTime: number;
  spawnAngle: number;
  score: number;
  fuel: number;
  maxFuel: number;
  isLockedOn: boolean;
  interceptTime: number | null;
  isVectorMatched: boolean; // New field to track if ship has matched asteroid's vector
  vectorMatchTime: number | null; // When the vector matching started
  fullCargo: boolean; // Flag to indicate if ship has mined cargo and should move slower
  lastCourseUpdate: number; // Track which game loop cycle the course was last updated
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
    | "ship_fuel_update"
    | "ship_vector_matched" // Event for when ship matches asteroid vector
    | "ship_combat" // New event for ship-to-ship combat
    | "ship_destroyed"; // New event for when a ship is destroyed by another ship
  timestamp: number;
  data: any;
}

export interface SectorSnapshot {
  asteroids: Record<string, Asteroid>;
  ships: Record<string, Ship>;
  lastUpdate: number;
}

export const SECTOR_CONFIG = {
  WIDTH: 2000,
  HEIGHT: 2000,
  // Character generation
  CHARACTER_COUNT: 100,
  PILOT_BATCH_SIZE: 25, // Number of pilots to add per transaction batch
  // Asteroid size categories
  ASTEROID_SIZES: {
    small: { size: 45, minResources: 100, maxResources: 200 },
    medium: { size: 75, minResources: 200, maxResources: 350 },
    large: { size: 120, minResources: 350, maxResources: 500 },
  },
  // Legacy size ranges (for backward compatibility if needed)
  MIN_ASTEROID_SIZE: 30,
  MAX_ASTEROID_SIZE: 120,
  MIN_ASTEROID_RESOURCES: 100,
  MAX_ASTEROID_RESOURCES: 500,
  ASTEROID_SPEED: 20,
  SHIP_SPEED: 80,
  UPDATE_INTERVAL: parseInt(process.env.UPDATE_INTERVAL || "5000"), // Configurable via env var
  ASTEROID_SPAWN_CHANCE: 0.4,
  SHIP_SPAWN_CHANCE: 0.2,
  FUEL_CONSUMPTION_RATE: 0.7,
  LOW_FUEL_THRESHOLD: 20,
  COURSE_RECALC_CYCLES: 3, // Recalculate course every N game loops (performance optimization)
  SHIP_COMBAT_RANGE: 15, // Tighter range for ship-to-ship vector matching and combat
  CARGO_SPEED_MULTIPLIER: 0.5, // Speed multiplier when ship has full cargo (50% of original speed)
  // Buffer constants
  EXIT_REMOVAL_BUFFER: 5, // Buffer for when entities are actually removed from the game (used in isOutOfBounds)
  EXIT_TARGET_BUFFER: 200, // Buffer for where ships aim when exiting (used in calculateExitVelocity)
  ASTEROID_EDGE_BUFFER: 100, // Buffer for asteroid edge calculations
};
