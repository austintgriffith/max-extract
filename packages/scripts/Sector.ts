// Main Sector orchestrator - delegates to specialized managers

import { createHash, randomBytes } from "crypto";
import { WebSocket } from "ws";
import type {
  Vector2D,
  Asteroid,
  Ship,
  SectorEvent,
  SectorSnapshot,
} from "./types";
import { SECTOR_CONFIG } from "./types";
import { DeterministicDice, createSectorDice } from "./utils/DeterministicDice";
import type { CharacterManager, PilotManager } from "./managers/character";
import type { BlockchainManager } from "./managers/blockchain";

// Import sector managers
import { SectorSpawnManager } from "./sector/SectorSpawnManager";
import { SectorTargetingManager } from "./sector/SectorTargetingManager";
import { SectorCombatManager } from "./sector/SectorCombatManager";
import { SectorRefuelingManager } from "./sector/SectorRefuelingManager";
import { SectorUpdateManager } from "./sector/SectorUpdateManager";
import { SectorTippingManager } from "./sector/SectorTippingManager";

export class Sector {
  public id: string;
  public asteroids: Map<string, Asteroid> = new Map();
  public ships: Map<string, Ship> = new Map();
  public events: SectorEvent[] = [];
  public subscribers: Set<WebSocket> = new Set();

  private rng: () => number;
  private deterministicDice: DeterministicDice | null = null;
  private currentEntropy: string | null = null;
  private lastUpdate: number = Date.now();
  private debugMode: boolean;
  private gameLoopCounter: number = 0;

  private characterManager: CharacterManager;
  private pilotManager: PilotManager;
  private blockchainManager: BlockchainManager;
  private crowdsaleManager: any;

  // Specialized managers
  private spawning: SectorSpawnManager;
  private targeting: SectorTargetingManager;
  private combat: SectorCombatManager;
  private refueling: SectorRefuelingManager;
  private updates: SectorUpdateManager;
  private tipping: SectorTippingManager;

  constructor(
    id: string,
    characterManager: CharacterManager,
    pilotManager: PilotManager,
    blockchainManager: BlockchainManager,
    seed?: string,
    debugMode: boolean = false,
    crowdsaleManager?: any
  ) {
    this.id = id;
    this.debugMode = debugMode;
    this.characterManager = characterManager;
    this.pilotManager = pilotManager;
    this.blockchainManager = blockchainManager;
    this.crowdsaleManager = crowdsaleManager;

    let seedValue = seed ? this.hashSeed(seed) : Math.random() * 1000000;
    this.rng = () => {
      seedValue = (seedValue * 9301 + 49297) % 233280;
      return seedValue / 233280;
    };

    // Initialize managers
    this.spawning = new SectorSpawnManager(
      this,
      characterManager,
      pilotManager,
      blockchainManager,
      crowdsaleManager,
      this.getRandom.bind(this),
      debugMode
    );

    this.targeting = new SectorTargetingManager(
      blockchainManager,
      id,
      characterManager,
      debugMode
    );

    this.combat = new SectorCombatManager(
      blockchainManager,
      pilotManager,
      id,
      debugMode
    );

    this.refueling = new SectorRefuelingManager(
      blockchainManager,
      crowdsaleManager,
      id,
      debugMode
    );

    this.updates = new SectorUpdateManager(this, debugMode);

    this.tipping = new SectorTippingManager(
      blockchainManager,
      characterManager,
      pilotManager,
      id,
      debugMode
    );

    if (this.debugMode) {
      this.debugLog(`Sector ${id} initialized with seed: ${seedValue}`);
    }
  }

  private debugLog(message: string, data?: any): void {
    if (this.debugMode) {
      const timestamp = new Date().toISOString().split("T")[1].split(".")[0];
      if (data) {
        console.log(`🎯 [${timestamp}] Sector ${this.id}: ${message}:`, data);
      } else {
        console.log(`🎯 [${timestamp}] Sector ${this.id}: ${message}`);
      }
    }
  }

  private hashSeed(seed: string): number {
    return parseInt(
      createHash("md5").update(seed).digest("hex").substring(0, 8),
      16
    );
  }

  /**
   * Get random number using deterministic dice
   */
  private getRandom(): number {
    if (!this.deterministicDice) {
      throw new Error(
        `Sector ${this.id}: Cannot generate random numbers without deterministic dice`
      );
    }
    const roll = this.deterministicDice.roll(4);
    return roll / 65535;
  }

  /**
   * Update the sector's deterministic dice with new rolling entropy
   */
  public updateRollingEntropy(rollingEntropy: string): void {
    if (this.currentEntropy !== rollingEntropy) {
      this.currentEntropy = rollingEntropy;
      this.deterministicDice = createSectorDice(rollingEntropy, this.id);
      this.debugLog(
        `Updated deterministic dice with new rolling entropy: ${rollingEntropy.slice(
          0,
          20
        )}...`
      );
    }
  }

  /**
   * Inner loop update - fast operations
   */
  public async updateInnerLoop(): Promise<void> {
    this.gameLoopCounter++;

    // Check arrivals (combat/mining)
    await this.combat.checkArrival(
      this.ships,
      this.asteroids,
      this.gameLoopCounter,
      this.assignTarget.bind(this),
      this.notifyShipsAboutCargoTarget.bind(this),
      this.broadcastEvent.bind(this),
      this.getRandom.bind(this)
    );

    // Update entities
    const shipsToRemove = await this.updates.updateShips(
      this.ships,
      this.gameLoopCounter,
      this.lastUpdate,
      this.refueling.shouldShipRefuel.bind(this.refueling),
      (ship) =>
        this.refueling.initiateRefueling(
          ship,
          this.gameLoopCounter,
          this.broadcastEvent.bind(this)
        ),
      (ship) =>
        this.refueling.completeRefueling(
          ship,
          this.assignTarget.bind(this),
          this.broadcastEvent.bind(this)
        ),
      (ship, score) =>
        this.tipping.handlePilotTipping(
          ship,
          score,
          this.broadcastEvent.bind(this)
        ),
      this.broadcastEvent.bind(this),
      this.getRandom.bind(this)
    );

    // Remove exited ships
    shipsToRemove.forEach((shipId) => {
      console.log(`Actually deleting ship ${shipId} from sector`);
      this.ships.delete(shipId);
    });

    this.updates.updateAsteroids(
      this.asteroids,
      this.ships,
      this.assignTarget.bind(this),
      this.broadcastEvent.bind(this)
    );

    this.lastUpdate = Date.now();
  }

  /**
   * Outer loop update - heavy operations (spawning)
   */
  public async updateOuterLoop(): Promise<void> {
    // Roll for asteroids
    const asteroidRoll = this.getRandom();
    if (asteroidRoll < SECTOR_CONFIG.ASTEROID_SPAWN_CHANCE) {
      this.spawning.spawnAsteroid(
        this.asteroids,
        this.broadcastEvent.bind(this),
        this.notifyWaitingShips.bind(this)
      );
    }

    // Roll for ships
    const shipRoll = this.getRandom();
    if (shipRoll < SECTOR_CONFIG.SHIP_SPAWN_CHANCE) {
      try {
        await this.spawning.spawnShip(
          this.asteroids,
          this.ships,
          this.id,
          this.gameLoopCounter,
          this.assignTarget.bind(this),
          this.attemptCredentialMinting.bind(this),
          this.broadcastEvent.bind(this)
        );
      } catch (error: any) {
        console.error(
          `Error spawning ship in sector ${this.id}:`,
          error.message
        );
        this.debugLog("Ship spawn error details:", error);
      }
    }
  }

  /**
   * Legacy update method for backward compatibility
   */
  public async update(): Promise<void> {
    await this.updateInnerLoop();
    await this.updateOuterLoop();
  }

  /**
   * Assign target for a ship - delegates to targeting manager
   */
  private async assignTarget(
    ship: Ship,
    reason: string,
    forceRetarget: boolean = false
  ): Promise<void> {
    await this.targeting.assignTarget(
      ship,
      this.ships,
      this.asteroids,
      this.gameLoopCounter,
      reason,
      forceRetarget,
      this.refueling.shouldShipRefuel.bind(this.refueling),
      (ship) =>
        this.refueling.initiateRefueling(
          ship,
          this.gameLoopCounter,
          this.broadcastEvent.bind(this)
        ),
      this.broadcastEvent.bind(this)
    );
  }

  /**
   * Attempt credential minting for a pilot
   */
  private async attemptCredentialMinting(ship: Ship): Promise<void> {
    try {
      this.debugLog(
        `Attempting credential minting for pilot ${ship.pilotName} in sector ${this.id}`
      );

      // Check if pilot is active on blockchain
      const isPilot = await this.blockchainManager.isPilot(ship.pilotAddress);
      const isDead = await this.blockchainManager.isPilotDead(
        ship.pilotAddress
      );

      if (!isPilot || isDead) {
        this.debugLog(
          `Pilot ${ship.pilotName} is not active on blockchain, skipping credential minting`
        );
        return;
      }

      // Get registry and credential addresses
      const registryAddress =
        await this.blockchainManager.getRegistryAddressForSector(this.id);

      if (
        !registryAddress ||
        registryAddress === "0x0000000000000000000000000000000000000000"
      ) {
        this.debugLog(`Sector ${this.id} has no registry, skipping credential`);
        return;
      }

      const credentialAddress =
        await this.blockchainManager.getCredentialAddress(registryAddress);

      if (
        !credentialAddress ||
        credentialAddress === "0x0000000000000000000000000000000000000000"
      ) {
        this.debugLog(
          `Registry ${registryAddress} has no credential contract registered`
        );
        return;
      }

      // Check if pilot already minted from this player
      const playerAddress = await this.blockchainManager.getSectorOwner(
        this.id
      );

      if (!playerAddress) {
        this.debugLog(`Could not find sector owner, skipping credential`);
        return;
      }

      const hasAlreadyMinted =
        await this.blockchainManager.hasPilotMintedFromPlayer(
          ship.pilotAddress,
          playerAddress
        );

      if (hasAlreadyMinted) {
        console.log(
          `ℹ️  Pilot ${ship.pilotName} already bought a credential for this sector`
        );
        return;
      }

      // Attempt to mint
      const result = await this.blockchainManager.attemptCredentialMint(
        ship.privateKey,
        credentialAddress,
        ship.pilotAddress
      );

      if (result.success && !result.alreadyOwned) {
        console.log(
          `✅ Pilot ${
            ship.pilotName
          } minted credential ${credentialAddress.slice(
            0,
            10
          )}... (tx: ${result.txHash?.slice(0, 10)}...)`
        );

        this.broadcastEvent({
          type: "credential_minted",
          timestamp: Date.now(),
          data: {
            pilotAddress: ship.pilotAddress,
            pilotName: ship.pilotName,
            sectorId: this.id,
            credentialAddress: credentialAddress,
            transactionHash: result.txHash,
            pointsEarned: 2,
          },
        });
      } else if (!result.success) {
        if (result.error?.includes("PilotAlreadyMintedFromPlayer")) {
          console.log(
            `ℹ️  Pilot ${ship.pilotName} already bought a credential for this sector`
          );
        } else if (result.error?.includes("Simulation failed")) {
          console.log(
            `⚠️  Pilot ${ship.pilotName} couldn't mint credential - contract has implementation issues`
          );

          this.broadcastEvent({
            type: "credential_mint_failed",
            timestamp: Date.now(),
            data: {
              pilotAddress: ship.pilotAddress,
              pilotName: ship.pilotName,
              sectorId: this.id,
              credentialAddress: credentialAddress,
              error: result.error,
              errorDetails: result.errorDetails,
              reason:
                result.errorDetails ||
                "Contract simulation failed - check your credential contract implementation",
            },
          });
        }
      }
    } catch (error: any) {
      this.debugLog(
        `Error in credential minting for pilot ${ship.pilotName}:`,
        error
      );
      console.log(
        `❌ Credential minting error for pilot ${ship.pilotName}: ${error.message}`
      );
    }
  }

  private notifyWaitingShips(): void {
    this.targeting.notifyWaitingShips(this.ships, this.assignTarget.bind(this));
  }

  private notifyShipsAboutCargoTarget(): void {
    this.targeting.notifyShipsAboutCargoTarget(
      this.ships,
      this.assignTarget.bind(this)
    );
  }

  private broadcastEvent(event: SectorEvent): void {
    const message = JSON.stringify(event);
    this.subscribers.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(message);
      }
    });
  }

  public addSubscriber(ws: WebSocket): void {
    this.subscribers.add(ws);
  }

  public removeSubscriber(ws: WebSocket): void {
    this.subscribers.delete(ws);
  }

  public handleVectorMatching(
    shipId: string,
    targetId: string,
    position: Vector2D,
    velocity: Vector2D,
    targetType: "asteroid" | "ship" | "station" = "asteroid"
  ): void {
    const ship = this.ships.get(shipId);
    if (!ship) return;

    // Validate target based on type
    if (targetType === "asteroid") {
      const asteroid = this.asteroids.get(targetId);
      if (!asteroid || ship.targetAsteroidId !== targetId) return;

      console.log(
        `Backend: Ship ${shipId} vector matched with asteroid ${targetId}`
      );

      ship.isVectorMatched = true;
      ship.vectorMatchTime = Date.now();
      ship.position = position;
      ship.velocity = velocity;
      ship.spawnTime = Date.now();

      this.broadcastEvent({
        type: "ship_vector_matched",
        timestamp: Date.now(),
        data: {
          shipId: ship.id,
          asteroidId: asteroid.id,
          targetShipId: null,
          targetStationId: null,
          position: ship.position,
          velocity: ship.velocity,
        },
      });
    } else if (targetType === "ship") {
      const targetShip = this.ships.get(targetId);
      if (!targetShip || ship.targetShipId !== targetId) return;

      console.log(
        `Backend: Ship ${shipId} vector matched with target ship ${targetId}`
      );

      ship.isVectorMatched = true;
      ship.vectorMatchTime = Date.now();
      ship.position = position;
      ship.velocity = velocity;
      ship.spawnTime = Date.now();

      this.broadcastEvent({
        type: "ship_vector_matched",
        timestamp: Date.now(),
        data: {
          shipId: ship.id,
          asteroidId: null,
          targetShipId: targetShip.id,
          targetStationId: null,
          position: ship.position,
          velocity: ship.velocity,
        },
      });
    } else if (targetType === "station") {
      if (ship.state !== "refueling" || ship.targetStationId !== targetId)
        return;

      console.log(
        `Backend: Ship ${shipId} vector matched with station ${targetId}`
      );

      ship.isVectorMatched = true;
      ship.vectorMatchTime = Date.now();
      ship.position = position;
      ship.velocity = velocity;
      ship.spawnTime = Date.now();

      this.broadcastEvent({
        type: "ship_vector_matched",
        timestamp: Date.now(),
        data: {
          shipId: ship.id,
          asteroidId: null,
          targetShipId: null,
          targetStationId: targetId,
          position: ship.position,
          velocity: ship.velocity,
        },
      });
    }
  }

  public getSnapshot(): SectorSnapshot {
    const asteroidSnapshot: Record<string, Asteroid> = {};
    const shipSnapshot: Record<string, Ship> = {};

    for (const [id, asteroid] of this.asteroids) {
      asteroidSnapshot[id] = asteroid;
    }

    for (const [id, ship] of this.ships) {
      shipSnapshot[id] = {
        ...ship,
        privateKey: "", // Never expose private keys
      };
    }

    return {
      asteroids: asteroidSnapshot,
      ships: shipSnapshot,
      lastUpdate: this.lastUpdate,
    };
  }
}
