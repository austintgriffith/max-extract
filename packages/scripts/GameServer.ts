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
import { CharacterManager } from "./managers/CharacterManager";
import { SimulationManager } from "./managers/SimulationManager";
import { GameCycleManager } from "./managers/GameCycleManager";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config();

export class GameServer {
  private app: express.Application;
  private server: any;
  private sectors: Map<string, Sector> = new Map();
  private debugMode: boolean;
  private currentMaxExtractAddress: string | null = null;

  // Managers
  private blockchainManager: BlockchainManager;
  private entropyManager: EntropyManager;
  private webSocketManager: WebSocketManager;
  private routeManager: RouteManager;
  private characterManager: CharacterManager;
  private simulationManager: SimulationManager;
  private gameCycleManager: GameCycleManager;

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
    this.characterManager = new CharacterManager(debugMode);

    // Initialize GameCycleManager
    this.gameCycleManager = new GameCycleManager(
      this.blockchainManager,
      this.entropyManager,
      SECTOR_CONFIG.COUNTDOWN_SECONDS,
      debugMode,
      this.initializeCharacters.bind(this)
    );

    this.simulationManager = new SimulationManager(
      this.sectors,
      this.blockchainManager,
      this.entropyManager,
      this.loadSectorsFromContract.bind(this),
      this.characterManager,
      debugMode,
      this.stop.bind(this),
      this.checkForContractChanges.bind(this),
      this.gameCycleManager.onGameSettled.bind(this.gameCycleManager)
    );
    this.routeManager = new RouteManager(
      this.app,
      this.sectors,
      this.entropyManager,
      this.webSocketManager,
      this.simulationManager,
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

  /**
   * Fetch contracts from the API
   */
  private async fetchContractsFromAPI(): Promise<{
    maxExtract: string | null;
    auditor: string | null;
  }> {
    try {
      const apiUrl = "http://localhost:3000/api/contracts.json";
      this.debugLog(`Fetching contracts from API: ${apiUrl}`);

      const response = await fetch(apiUrl);
      const data = await response.json();

      if (!data.success || !data.data) {
        throw new Error("Invalid API response format");
      }

      const chainId = this.blockchainManager.getConfig().chainId;
      const chainData = data.data[chainId.toString()];

      if (!chainData || !chainData.contracts) {
        throw new Error(`No contracts found for chain ${chainId}`);
      }

      // Find MaxExtract contract
      const maxExtractContract = chainData.contracts.find(
        (c: any) => c.name === "MaxExtract"
      );

      // Find Auditor contract
      const auditorContract = chainData.contracts.find(
        (c: any) => c.name === "Auditor"
      );

      if (!maxExtractContract) {
        throw new Error("MaxExtract contract not found in API response");
      }

      this.debugLog(
        `Found MaxExtract address from API: ${maxExtractContract.address}`
      );

      if (auditorContract) {
        this.debugLog(
          `Found Auditor address from API: ${auditorContract.address}`
        );
      } else {
        console.log("⚠️  Warning: Auditor contract not found in API response");
      }

      return {
        maxExtract: maxExtractContract.address,
        auditor: auditorContract?.address || null,
      };
    } catch (error: any) {
      console.error(`❌ Failed to fetch contracts from API: ${error.message}`);
      this.debugLog("API fetch error details:", error);
      return { maxExtract: null, auditor: null };
    }
  }

  /**
   * Check if MaxExtract contract has changed
   */
  public async checkForContractChanges(): Promise<void> {
    try {
      const contracts = await this.fetchContractsFromAPI();

      // If we couldn't fetch, skip this check
      if (!contracts.maxExtract) {
        return;
      }

      // If this is the first check, just store the address
      if (this.currentMaxExtractAddress === null) {
        this.currentMaxExtractAddress = contracts.maxExtract;
        this.debugLog(
          `Initial MaxExtract address set: ${this.currentMaxExtractAddress}`
        );
        return;
      }

      // Check if address has changed
      if (
        contracts.maxExtract.toLowerCase() !==
        this.currentMaxExtractAddress.toLowerCase()
      ) {
        console.log("\n🔄 MaxExtract contract change detected!");
        console.log(`   Old: ${this.currentMaxExtractAddress}`);
        console.log(`   New: ${contracts.maxExtract}`);
        console.log("   Initiating game server restart...\n");

        // Cancel current game cycle if in progress
        this.gameCycleManager.cancelCycle();

        // Update stored address
        this.currentMaxExtractAddress = contracts.maxExtract;

        // Trigger restart
        await this.restartWithNewContracts(
          contracts.maxExtract,
          contracts.auditor
        );

        // Start new game cycle after restart
        if (SECTOR_CONFIG.AUTO_GAME_CYCLE) {
          // Small delay to ensure restart transactions complete (setMaxExtract)
          console.log("⏳ Waiting for restart transactions to complete...\n");
          setTimeout(() => {
            this.gameCycleManager.startGameCycle().catch((error) => {
              console.error(`❌ Game cycle error: ${error.message}`);
            });
          }, 2000); // 2 second delay
        }
      }
    } catch (error: any) {
      console.error(`❌ Error checking for contract changes: ${error.message}`);
      this.debugLog("Contract check error details:", error);
    }
  }

  /**
   * Perform full internal restart with new contracts
   */
  private async restartWithNewContracts(
    newMaxExtractAddress: string,
    newAuditorAddress: string | null
  ): Promise<void> {
    try {
      console.log("🛑 Stopping game server components...");

      // Stop simulation manager
      this.simulationManager.stop();
      this.debugLog("Simulation manager stopped");

      // Close WebSocket manager
      this.webSocketManager.close();
      this.debugLog("WebSocket manager closed");

      // Clear sectors
      this.sectors.clear();
      this.debugLog("Sectors cleared");

      console.log("🔄 Reloading contracts from API...");

      // Reload contracts in BlockchainManager
      await this.blockchainManager.reloadContractsFromAPI(
        "http://localhost:3000/api/contracts.json"
      );

      // Reset EntropyManager state for fresh contracts
      this.entropyManager.reset();

      console.log("🔧 Reinitializing game server components...");

      // Reinitialize managers (they reference the blockchainManager which now has updated contracts)
      // EntropyManager already references blockchainManager, so it will use the updated contracts
      // CharacterManager doesn't need reinitialization

      // Reinitialize WebSocket manager
      this.webSocketManager = new WebSocketManager(
        this.server,
        this.sectors,
        this.debugMode
      );
      this.debugLog("WebSocket manager reinitialized");

      // Reinitialize Simulation manager
      this.simulationManager = new SimulationManager(
        this.sectors,
        this.blockchainManager,
        this.entropyManager,
        this.loadSectorsFromContract.bind(this),
        this.characterManager,
        this.debugMode,
        this.stop.bind(this),
        this.checkForContractChanges.bind(this),
        this.gameCycleManager.onGameSettled.bind(this.gameCycleManager)
      );
      this.debugLog("Simulation manager reinitialized");

      // Reinitialize Route manager
      this.routeManager = new RouteManager(
        this.app,
        this.sectors,
        this.entropyManager,
        this.webSocketManager,
        this.simulationManager,
        this.debugMode
      );
      this.debugLog("Route manager reinitialized");

      console.log("📡 Loading sectors from contract...");
      // Load sectors (will be empty until game starts)
      await this.loadSectorsFromContract();

      console.log("🔗 Setting MaxExtract address in Game contract...");
      // Call setMaxExtract on Game contract
      try {
        await this.blockchainManager.setMaxExtractAddress(newMaxExtractAddress);
      } catch (error: any) {
        console.error(
          `⚠️  Warning: Failed to set MaxExtract address in Game contract: ${error.message}`
        );
        console.log("   Continuing with restart anyway...");
      }

      // Set Auditor contract address in Game contract
      if (newAuditorAddress) {
        console.log("🔗 Setting Auditor contract address in Game contract...");
        try {
          await this.blockchainManager.setAuditorContract(newAuditorAddress);
        } catch (error: any) {
          console.error(
            `⚠️  Warning: Failed to set Auditor contract address in Game contract: ${error.message}`
          );
          console.log("   Continuing with restart anyway...");
        }
      }

      console.log("▶️  Starting simulation...");
      // Start simulation
      this.simulationManager.start();

      console.log(
        `✅ Game server restarted successfully with new contracts!\n`
      );
      console.log(
        "   Characters will be initialized after entropy is revealed in game cycle"
      );
    } catch (error: any) {
      console.error(`❌ Failed to restart game server: ${error.message}`);
      this.debugLog("Restart error details:", error);
      console.log("⚠️  Attempting to continue with existing state...");

      // Try to restart simulation even if something failed
      try {
        this.simulationManager.start();
      } catch (startError: any) {
        console.error(
          `❌ Critical error: Could not restart simulation: ${startError.message}`
        );
      }
    }
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
          const newSector = new Sector(
            sectorIdStr,
            this.characterManager,
            this.simulationManager.getPilotManager(),
            this.blockchainManager,
            undefined,
            this.debugMode
          );

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
    this.simulationManager.start();
  }

  private async initializeCharacters(): Promise<void> {
    await this.characterManager.initializeCharacters(
      this.blockchainManager,
      this.entropyManager
    );
  }

  public async start(port: number = 8000): Promise<void> {
    console.log("\n🌌 Max Extract Protocol Game Server\n");

    // Initialize contract monitoring by fetching initial contract addresses
    console.log("🔍 Initializing contract monitoring...");
    const contracts = await this.fetchContractsFromAPI();
    if (contracts.maxExtract) {
      this.currentMaxExtractAddress = contracts.maxExtract;
      console.log(`📡 Monitoring MaxExtract contract: ${contracts.maxExtract}`);
    } else {
      console.log(
        "⚠️  Warning: Could not fetch initial MaxExtract address from API"
      );
    }

    // Set MaxExtract address in Game contract
    if (contracts.maxExtract) {
      console.log("🔗 Setting MaxExtract address in Game contract...");
      try {
        await this.blockchainManager.setMaxExtractAddress(contracts.maxExtract);
      } catch (error: any) {
        console.error(
          `⚠️  Warning: Failed to set MaxExtract address in Game contract: ${error.message}`
        );
        console.log("   Continuing with startup anyway...");
      }
    }

    // Set Auditor contract address in Game contract
    if (contracts.auditor) {
      console.log("🔗 Setting Auditor contract address in Game contract...");
      try {
        await this.blockchainManager.setAuditorContract(contracts.auditor);
      } catch (error: any) {
        console.error(
          `⚠️  Warning: Failed to set Auditor contract address in Game contract: ${error.message}`
        );
        console.log("   Continuing with startup anyway...");
      }
    }

    // Start Express server
    this.server.listen(port, () => {
      console.log(
        `🚀 Game Server started on port ${port} | Inner: ${SECTOR_CONFIG.INNER_LOOP_INTERVAL}ms | Outer: ${SECTOR_CONFIG.OUTER_LOOP_INTERVAL}ms`
      );
    });

    // Start simulation loops (non-blocking, will run even without entropy)
    console.log("▶️  Starting simulation loops...");
    this.startSimulation();

    console.log("✅ Server initialization complete\n");

    // Start automated game cycle if enabled
    // Characters will be initialized AFTER entropy is set in the game cycle
    if (SECTOR_CONFIG.AUTO_GAME_CYCLE) {
      console.log("⏳ Starting automated game cycle...\n");
      setTimeout(() => {
        this.gameCycleManager.startGameCycle().catch((error) => {
          console.error(`❌ Game cycle error: ${error.message}`);
        });
      }, 1000); // 1 second delay (reduced since no character init here)
    } else {
      console.log(
        "⏳ Automated game cycles disabled, waiting for manual trigger..."
      );
    }
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
   * Get the character manager for direct access
   */
  public getCharacterManager(): CharacterManager {
    return this.characterManager;
  }

  /**
   * Get the simulation manager for direct access
   */
  public getSimulationManager(): SimulationManager {
    return this.simulationManager;
  }

  /**
   * Get all sectors
   */
  public getSectors(): Map<string, Sector> {
    return this.sectors;
  }

  public stop(): void {
    this.simulationManager.stop();
    this.webSocketManager.close();
    this.server.close();
  }
}
