// Types matching the backend
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
  pilotAddress: string; // Reference to the actual pilot
  pilotName: string; // For display purposes
  shipType: number; // Ship number 1-12
  position: Vector2D;
  velocity: Vector2D;
  targetAsteroidId: string | null;
  targetShipId: string | null; // New field for ship-to-ship targeting
  targetStationId: string | null; // New field for station targeting (refueling)
  state: "flying" | "mining" | "exiting" | "refueling";
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

export interface TipEventData {
  shipId: string;
  pilotAddress: string;
  pilotName: string;
  playerAddress: string;
  tipAmount: number;
  finalScore?: number; // Optional - only for exit tips
  reason?: "refueling"; // Optional - indicates why the tip happened
  stationName?: string; // For refueling tips at stations
  transactionHash?: string;
  error?: string;
  aboutInfo?: {
    // Optional - only for exit tips
    hasAboutContract: boolean;
    stationName?: string;
    tipType: "standard" | "enhanced";
  };
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
    | "ship_destroyed"
    | "pilot_death" // New event for when a pilot is killed
    | "pilot_tip" // New event for when a pilot tips a player
    | "credential_minted" // New event for when a pilot mints a sector credential
    | "credential_mint_failed" // New event for when credential minting fails (contract issues)
    | "ship_refuel"; // New event for when a ship refuels at a station
  timestamp: number;
  data: any;
}

export type ScrapType = "scrap1" | "scrap2" | "scrap3" | "scrap4";

export interface Particle {
  id: string;
  position: Vector2D;
  velocity: Vector2D;
  size: number;
  color: string; // Keep for backward compatibility
  scrapType?: ScrapType; // New field for scrap particles
  spawnTime: number;
  lifetime: number; // milliseconds
}

export const SECTOR_CONFIG = {
  WIDTH: 2000,
  HEIGHT: 2000,
  CANVAS_SCALE: 1, // Scale down more to fit larger area
  SHIP_COMBAT_RANGE: 10, // Tighter range for ship-to-ship vector matching and combat
  PADDING: 5, // Huge padding to see ships exiting way beyond boundaries
  EXIT_REMOVAL_BUFFER: 5, // Buffer for when entities are actually removed from the game
  REFUEL_ARRIVAL_DISTANCE: 50, // Distance at which ships can refuel at the station
};

export type ConnectionStatus = "connecting" | "connected" | "disconnected";

// Pilot-related interfaces
export interface PilotStats {
  fuel: number;
  cargo: number;
  aggression: number;
  intelligence: number;
  dexterity: number;
}

export interface PilotAssignment {
  isAssigned: boolean;
  currentSectorId: string | null;
  assignedAt: number | null;
}

export interface PilotDeath {
  isDead: boolean;
  deathTime: number | null;
  killedBy: string | null;
}

export interface Pilot {
  address: string;
  name: string;
  firstname: string;
  lastname: string;
  shipType: number; // Ship number 1-12
  stats: PilotStats;
  assignment: PilotAssignment;
  death: PilotDeath;
  isAvailable: boolean;
  ethBalance: string;
  credits: string; // Credits balance (as string for large numbers)
}

export interface PilotsResponse {
  pilots: Pilot[];
  summary: {
    total: number;
    assigned: number;
    available: number;
    dead: number;
    recentDeaths: number;
  };
  deathStats: {
    totalDeaths: number;
    recentDeaths: number;
    topKillers: Array<{
      address: string;
      kills: number;
    }>;
  };
}

// Selection-related types
export type SelectedObjectType = "station" | "ship" | "asteroid";

export interface SelectedObject {
  type: SelectedObjectType;
  id: string; // "station" for base, ship id, or asteroid id
  canvasPosition: Vector2D; // Position on canvas for drawing selection
  screenPosition: Vector2D; // Position on screen for info box
}

export interface StationDetails {
  sectorId: string;
  ownerAddress: string;
  registryAddress: string;
  aboutAddress?: string;
  aboutAuditedChapter?: number;
  credentialAddress?: string;
  credentialAuditedChapter?: number;
  stationName?: string;
  social?: string;
  score: number;
  auditStatus: "none" | "pending" | "audited";
  auditedChapter?: number;
}

export interface ShipDetails extends Ship {
  stats: PilotStats;
  ethBalance: string;
}

// AsteroidDetails is now just Asteroid (no additional properties needed)
