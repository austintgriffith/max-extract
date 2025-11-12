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
  pilotAddress: string; // Reference to the actual pilot
  pilotName: string; // For display purposes
  shipType: number; // Ship number 1-12
  position: Vector2D;
  velocity: Vector2D;
  targetAsteroidId: string | null;
  targetShipId: string | null; // New field for targeting other ships
  targetStationId: string | null; // New field for targeting station (for refueling)
  state: "flying" | "mining" | "exiting" | "refueling";
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
  currentCargo: number; // Actual cargo amount (used for capacity-based mechanics)
  lastCourseUpdate: number; // Track which game loop cycle the course was last updated
}

export interface PilotAssignment {
  pilotAddress: string;
  currentSectorId: string | null;
  assignedAt: number;
  isDead: boolean; // Track if pilot has been killed
  deathTime: number | null; // When the pilot died
  killedBy: string | null; // Address of the pilot who killed them
}

export interface TipResult {
  success: boolean;
  tipAmount: number;
  transactionHash?: string;
  error?: string;
}

export interface AboutContractInfo {
  hasAboutContract: boolean;
  stationName?: string;
  registryAddress?: string;
  aboutAddress?: string;
  isAudited?: boolean;
  auditedChapter?: number;
  error?: string;
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
    | "ship_destroyed" // New event for when a ship is destroyed by another ship
    | "pilot_death" // New event for when a pilot is killed
    | "pilot_slashed" // New event for when a pilot is slashed (killed with stake slash instead of penalty)
    | "pilot_tip" // New event for when a pilot tips a player
    | "credential_minted" // New event for when a pilot mints a sector credential
    | "credential_mint_failed" // New event for when credential minting fails (contract issues)
    | "ship_refuel" // New event for when a ship refuels at a station
    | "pilot_staked" // Chapter 4: New event for when a pilot stakes credits
    | "pilot_unstaked" // Chapter 4: New event for when a pilot unstakes credits
    | "pilot_insufficient_credits" // Chapter 4: New event for when a pilot can't stake due to insufficient credits
    | "stake_failed" // Chapter 4: New event for when staking fails
    | "airspace_restricted"; // Airspace: New event for when a pilot can't enter due to ship model restrictions
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
  // Note: One additional "Max Extract" pilot with Model F ship is always created
  // So if CHARACTER_COUNT = 3, a total of 4 pilots will be generated
  CHARACTER_COUNT: 50,
  get CHARACTER_ETH() {
    // Load from environment variable ONLY - no default
    if (!process.env.CHARACTER_ETH) {
      throw new Error("CHARACTER_ETH must be set in .env file");
    }
    return process.env.CHARACTER_ETH;
  },
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
  // Dual-loop system configuration
  INNER_LOOP_INTERVAL: 2000, // Fast loop for ship movement, mining, battles
  OUTER_LOOP_INTERVAL: 15000, // Slow loop for heavy operations (including rolling commit-reveal)
  // Independent spawn probabilities (0-1 range, checked each outer loop)
  // Both can spawn in the same cycle if both rolls succeed
  ASTEROID_SPAWN_CHANCE: 0.6, // % chance per outer loop
  SHIP_SPAWN_CHANCE: 0.5, // % chance per outer loop
  FUEL_CONSUMPTION_RATE: 0.7,
  LOW_FUEL_THRESHOLD: 20,
  REFUEL_FUEL_THRESHOLD: 50, // Fuel threshold for initiating refueling at station
  REFUEL_ARRIVAL_DISTANCE: 50, // Distance threshold for arriving at station center
  COURSE_RECALC_CYCLES: 3, // Recalculate course every N game loops (performance optimization)
  SHIP_COMBAT_RANGE: 15, // Tighter range for ship-to-ship vector matching and combat
  CARGO_SPEED_MULTIPLIER: 0.5, // Speed multiplier when ship has full cargo (50% of original speed)
  // Buffer constants
  EXIT_REMOVAL_BUFFER: 5, // Buffer for when entities are actually removed from the game (used in isOutOfBounds)
  EXIT_TARGET_BUFFER: 200, // Buffer for where ships aim when exiting (used in calculateExitVelocity)
  ASTEROID_EDGE_BUFFER: 100, // Buffer for asteroid edge calculations
  // Tipping system configuration
  get TIP_GAS_AMOUNT() {
    // Minimum ETH balance threshold for pilots - triggers automatic top-up during tipping
    // Recommended: 0.01 ETH for localhost, 0.001 ETH for Arbitrum
    // Load from environment variable ONLY - no default
    if (!process.env.TIP_GAS_AMOUNT) {
      throw new Error("TIP_GAS_AMOUNT must be set in .env file");
    }
    return process.env.TIP_GAS_AMOUNT;
  },
  TIP_SCORE_THRESHOLDS: {
    HIGH: 240, // Score >= 240 (large asteroids: 240-360+ with fuel bonus)
    MEDIUM: 150, // Score >= 150 (medium asteroids: 150-225+ with fuel bonus)
    LOW: 90, // Score >= 90 (small asteroids: 90-135+ with fuel bonus)
  },
  TIP_AMOUNTS: {
    STANDARD: { HIGH: 3, MEDIUM: 2, LOW: 1 }, // Standard tips for players without about contract
    ENHANCED: { HIGH: 4, MEDIUM: 3, LOW: 2 }, // Enhanced tips (+1 bonus) for players with about contract
  },
  // Game cycle configuration
  COUNTDOWN_SECONDS: 10, // Countdown before game starts (buy-in period)
  ENTROPY_REVEAL_DELAY_SECONDS: 5, // Wait time before revealing entropy (Universe contract minimum)
  AUTO_GAME_CYCLE: true, // Enable/disable automated game cycles
  // Chapter 5: Crowdsale configuration
  CROWDSALE_PILOTS_PER_LOOP: 3, // Process 3 pilots per outer loop (faster crowdsale)
  CROWDSALE_TARGET_CREDITS: 50_000n * 10n ** 18n, // 50k total (49.5k to game + 500 reward)
  CROWDSALE_MAX_UPGRADE_ATTEMPTS: 3, // Stop after 3 pilots try upgrade
  // Cargo system configuration
  FEDERATION_LOCK_TIME: 180000, // 3 minutes in milliseconds
  CARGO_PAYMENT_RATE: 5, // Credits per cargo unit
};

/**
 * Calculate cargo capacity based on ship type (1-12)
 * Formula: 20 + (shipType * 25)
 * Range: 45 (type 1) to 320 (type 12)
 */
export function getCargoCapacity(shipType: number): number {
  return 20 + shipType * 25;
}
