// Types matching the backend
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
  position: Vector2D;
  velocity: Vector2D;
  targetAsteroidId: string | null;
  targetShipId: string | null; // New field for ship-to-ship targeting
  state: "flying" | "mining" | "exiting";
  spawnTime: number;
  spawnAngle: number;
  score: number;
  fuel: number; // 0-100 percentage
  maxFuel: number; // Starting fuel amount
  isVectorMatched: boolean; // New field to track if ship has matched asteroid's vector
  vectorMatchTime: number | null; // When the vector matching started
  fullCargo: boolean; // Flag to indicate if ship has mined cargo and should move slower
}

export interface SectorSnapshot {
  asteroids: Record<string, Asteroid>;
  ships: Record<string, Ship>;
  lastUpdate: number;
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
    | "ship_vector_matched"
    | "ship_combat"
    | "ship_destroyed";
  timestamp: number;
  data: any;
}

export interface Particle {
  id: string;
  position: Vector2D;
  velocity: Vector2D;
  size: number;
  color: string;
  spawnTime: number;
  lifetime: number; // milliseconds
}

export const SECTOR_CONFIG = {
  WIDTH: 1000,
  HEIGHT: 1000,
  CANVAS_SCALE: 1, // Scale down more to fit larger area
  SHIP_COMBAT_RANGE: 10, // Tighter range for ship-to-ship vector matching and combat
  PADDING: 5, // Huge padding to see ships exiting way beyond boundaries
  EXIT_REMOVAL_BUFFER: 5, // Buffer for when entities are actually removed from the game
};

export type ConnectionStatus = "connecting" | "connected" | "disconnected";
