import express from "express";
import { createServer } from "http";
import { Sector } from "./Sector";
import { SECTOR_CONFIG } from "./types";
import {
  BlockchainManager,
  BlockchainConfig,
} from "./managers/BlockchainManager";
import { EntropyManager } from "./managers/EntropyManager";
import { WebSocketManager } from "./managers/WebSocketManager";
import { RouteManager } from "./managers/RouteManager";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config();

export class GameServer {
  private app: express.Application;
  private server: any;
  private sectors: Map<string, Sector> = new Map();
  private simulationInterval: NodeJS.Timeout | null = null;
  private debugMode: boolean;

  // Managers
  private blockchainManager: BlockchainManager;
  private entropyManager: EntropyManager;
  private webSocketManager: WebSocketManager;
  private routeManager: RouteManager;

  constructor(debugMode: boolean = false) {
    this.debugMode = debugMode;

    // Initialize Express app and server
    this.app = express();
    this.server = createServer(this.app);

    // Setup middleware
    this.setupMiddleware();

    // Initialize blockchain configuration
    const blockchainConfig: BlockchainConfig = {
      chainId: process.env.CHAINID ? parseInt(process.env.CHAINID) : 31337,
      chainName: process.env.CHAIN || "foundry",
      rpcUrl: process.env.RPC || "http://127.0.0.1:8545",
      godPrivateKey: process.env.GODPRIVATEKEY || "",
    };

    // Initialize managers
    this.blockchainManager = new BlockchainManager(blockchainConfig, debugMode);
    this.entropyManager = new EntropyManager(this.blockchainManager, debugMode);
    this.webSocketManager = new WebSocketManager(
      this.server,
      this.sectors,
      debugMode
    );
    this.routeManager = new RouteManager(
      this.app,
      this.sectors,
      this.entropyManager,
      this.webSocketManager,
      debugMode
    );

    if (this.debugMode) {
      this.debugLog("GameServer initialized in DEBUG mode");
    }
  }

  private debugLog(message: string, data?: any): void {
    if (this.debugMode) {
      const timestamp = new Date().toISOString().split("T")[1].split(".")[0];
      if (data) {
        console.log(`🎮 [${timestamp}] ${message}:`, data);
      } else {
        console.log(`🎮 [${timestamp}] ${message}`);
      }
    }
  }

  private setupMiddleware(): void {
    this.app.use(express.json());
    this.app.use((req, res, next) => {
      res.header("Access-Control-Allow-Origin", "*");
      res.header(
        "Access-Control-Allow-Headers",
        "Origin, X-Requested-With, Content-Type, Accept"
      );
      next();
    });
  }

  private async loadSectorsFromContract(): Promise<void> {
    try {
      this.debugLog("Loading sectors from contract...");

      const activeSectors = await this.blockchainManager.getActiveSectors();
      this.debugLog(
        `Found ${activeSectors.length} active sectors from contract`
      );

      let newSectorsAdded = false;
      for (const sectorId of activeSectors) {
        const sectorIdStr = sectorId.toString();
        if (!this.sectors.has(sectorIdStr)) {
          const newSector = new Sector(sectorIdStr, undefined, this.debugMode);

          // Update sector with current rolling entropy if available
          const currentEntropy = this.entropyManager.getCurrentRollingEntropy();
          if (currentEntropy) {
            newSector.updateRollingEntropy(currentEntropy);
          }

          this.sectors.set(sectorIdStr, newSector);
          this.debugLog(`Created new sector: ${sectorIdStr}`);
          newSectorsAdded = true;
        }
      }

      // Only log if we found new sectors
      if (newSectorsAdded) {
        console.log(`📡 Loaded ${activeSectors.length} sectors`);
      }

      this.debugLog(`Total sectors managed: ${this.sectors.size}`);
    } catch (error: any) {
      console.error(
        `❌ Contract Error: ${
          error.shortMessage || error.message || "Unknown error"
        }`
      );
      // Only show full debug error if it's not the common "no data" error
      if (!error.shortMessage?.includes("returned no data")) {
        this.debugLog("Failed to load sectors from contract", error);
      }
    }
  }

  private startSimulation(): void {
    this.debugLog("Starting simulation loop");

    const simulate = async () => {
      // Get and print GOD account balance
      try {
        const godBalance = await this.blockchainManager.getGodBalance();
        const godAddress = this.blockchainManager.getGodAccount().address;
        console.log(`👑 ${godBalance} ETH - ${godAddress}`);
      } catch (error: any) {
        console.error(
          `❌ GOD Balance Error: ${error.message || "Unknown error"}`
        );
      }

      // Check universe entropy status periodically
      try {
        const status = await this.entropyManager.checkUniverseEntropyStatus();
        if (!status.isSet) {
          console.log(
            "⚠️  Universe entropy still not set - game functions limited"
          );
        }
      } catch (error: any) {
        this.debugLog("Failed to check universe entropy status", error);
      }

      // Perform rolling commit-reveal for entropy generation
      await this.entropyManager.performRollingCommitReveal();

      // Reload sectors from contract periodically
      await this.loadSectorsFromContract();

      // Update all sectors
      let totalAsteroids = 0;
      let totalShips = 0;
      for (const [sectorId, sector] of this.sectors.entries()) {
        const snapshot = sector.getSnapshot();
        totalAsteroids += Object.keys(snapshot.asteroids).length;
        totalShips += Object.keys(snapshot.ships).length;

        this.debugLog(
          `Sector ${sectorId}: ${
            Object.keys(snapshot.asteroids).length
          } asteroids, ${Object.keys(snapshot.ships).length} ships`
        );
        sector.update();
      }

      this.debugLog(
        `Total across all sectors: ${totalAsteroids} asteroids, ${totalShips} ships`
      );

      // Update all sectors with current rolling entropy
      const currentEntropy = this.entropyManager.getCurrentRollingEntropy();
      if (currentEntropy) {
        for (const sector of this.sectors.values()) {
          sector.updateRollingEntropy(currentEntropy);
        }
      }

      // Schedule next update
      this.simulationInterval = setTimeout(
        simulate,
        SECTOR_CONFIG.UPDATE_INTERVAL
      );
    };

    simulate();
  }

  public async start(port: number = 8000): Promise<void> {
    // First, ensure universe entropy is set before starting any game operations
    await this.entropyManager.waitForUniverseEntropy();

    // Initialize rolling commit-reveal system
    await this.entropyManager.initializeRollingCommitReveal();

    // Load initial sectors
    await this.loadSectorsFromContract();

    // Start simulation
    this.startSimulation();

    this.server.listen(port, () => {
      console.log(
        `🚀 Game Server: port ${port} | ${this.sectors.size} sectors | ${SECTOR_CONFIG.UPDATE_INTERVAL}ms intervals`
      );
    });
  }

  /**
   * Get the current rolling entropy for sectors to use
   * @returns Current rolling entropy or null if not available
   */
  public getCurrentRollingEntropy(): string | null {
    return this.entropyManager.getCurrentRollingEntropy();
  }

  /**
   * Create a sector-specific deterministic dice
   * @param sectorId The sector ID
   * @returns DeterministicDice instance or null if no entropy available
   */
  public createSectorDice(sectorId: string) {
    return this.entropyManager.createSectorDice(sectorId);
  }

  /**
   * Get the blockchain manager for direct access
   */
  public getBlockchainManager(): BlockchainManager {
    return this.blockchainManager;
  }

  /**
   * Get the entropy manager for direct access
   */
  public getEntropyManager(): EntropyManager {
    return this.entropyManager;
  }

  /**
   * Get the WebSocket manager for direct access
   */
  public getWebSocketManager(): WebSocketManager {
    return this.webSocketManager;
  }

  /**
   * Get the route manager for direct access
   */
  public getRouteManager(): RouteManager {
    return this.routeManager;
  }

  /**
   * Get all sectors
   */
  public getSectors(): Map<string, Sector> {
    return this.sectors;
  }

  public stop(): void {
    if (this.simulationInterval) {
      clearTimeout(this.simulationInterval);
    }
    this.webSocketManager.close();
    this.server.close();
  }
}
