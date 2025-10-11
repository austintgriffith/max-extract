import express from "express";
import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import {
  createPublicClient,
  createWalletClient,
  http,
  formatEther,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import * as chains from "viem/chains";
import { Sector } from "./Sector";
import { SECTOR_CONFIG } from "./types";
import deployedContracts from "../nextjs/contracts/deployedContracts";
import { RevealManager } from "./utils/RevealManager";
import { createSectorDice } from "./utils/DeterministicDice";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Get chain configuration from environment
const CHAIN_ID = process.env.CHAINID ? parseInt(process.env.CHAINID) : 31337;
const CHAIN_NAME = process.env.CHAIN || "foundry";
const RPC_URL = process.env.RPC || "http://127.0.0.1:8545";

// Function to get chain by name
function getChainByName(chainName: string) {
  const chainMap: { [key: string]: any } = {
    foundry: chains.foundry,
    arbitrum: chains.arbitrum,
    mainnet: chains.mainnet,
    polygon: chains.polygon,
    optimism: chains.optimism,
    base: chains.base,
    sepolia: chains.sepolia,
    goerli: chains.goerli,
    hardhat: chains.hardhat,
    localhost: chains.localhost,
  };

  const selectedChain = chainMap[chainName.toLowerCase()];
  if (!selectedChain) {
    console.error(
      `❌ Unknown chain: ${chainName}. Available chains: ${Object.keys(
        chainMap
      ).join(", ")}`
    );
    console.log(`🔗 Falling back to foundry chain`);
    return chains.foundry;
  }

  return selectedChain;
}

const selectedChain = getChainByName(CHAIN_NAME);
console.log(`🔗 Using Chain: ${selectedChain.name} (ID: ${CHAIN_ID})`);
console.log(`🌐 Using RPC: ${RPC_URL}`);

// Create a public client for reading from the blockchain
const publicClient = createPublicClient({
  chain: selectedChain,
  transport: http(RPC_URL),
});

// Setup GOD account from environment variable or default to Anvil account #9
const godPrivateKey = process.env.GODPRIVATEKEY;

const godAccount = privateKeyToAccount(godPrivateKey as `0x${string}`);

// Create a wallet client for GOD transactions
const walletClient = createWalletClient({
  account: godAccount,
  chain: selectedChain,
  transport: http(RPC_URL),
});

export class GameServer {
  private app: express.Application;
  private server: any;
  private wss: WebSocketServer;
  private sectors: Map<string, Sector> = new Map();
  private simulationInterval: NodeJS.Timeout | null = null;
  private debugMode: boolean;
  private revealManager: RevealManager;
  private nextRevealNumber: string | null = null;
  private nextCommitHash: string | null = null;
  private currentRollingEntropy: string | null = null;

  constructor(debugMode: boolean = false) {
    this.debugMode = debugMode;
    // Initialize RevealManager without contract address initially
    // Will be updated once we know the Universe contract address
    this.revealManager = new RevealManager();
    this.app = express();
    this.server = createServer(this.app);
    this.wss = new WebSocketServer({
      server: this.server,
      verifyClient: (info: any) => {
        // Allow all origins for development
        return true;
      },
    });

    this.setupMiddleware();
    this.setupRoutes();
    this.setupWebSocket();

    if (this.debugMode) {
      this.debugLog("GameServer initialized in DEBUG mode");
    }
  }

  private debugLog(message: string, data?: any): void {
    if (this.debugMode) {
      const timestamp = new Date().toISOString().split("T")[1].split(".")[0];
      if (data) {
        console.log(`🐛 [${timestamp}] ${message}:`, data);
      } else {
        console.log(`🐛 [${timestamp}] ${message}`);
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

  private setupRoutes(): void {
    // Get sector snapshot
    this.app.get("/sector/:sectorId", (req, res) => {
      const { sectorId } = req.params;

      if (!this.sectors.has(sectorId)) {
        return res.status(404).json({ error: "Sector not found" });
      }

      const sector = this.sectors.get(sectorId)!;
      res.json(sector.getSnapshot());
    });

    // Health check
    this.app.get("/api/health", (req, res) => {
      res.json({
        status: "healthy",
        sectorCount: this.sectors.size,
        uptime: process.uptime(),
      });
    });

    // Get all sectors (for admin/debugging)
    this.app.get("/api/sectors", (req, res) => {
      const sectorList = Array.from(this.sectors.keys()).map((id) => ({
        id,
        asteroidCount: this.sectors.get(id)!.asteroids.size,
        shipCount: this.sectors.get(id)!.ships.size,
        subscriberCount: this.sectors.get(id)!.subscribers.size,
      }));
      res.json(sectorList);
    });

    // Get rolling commit-reveal status
    this.app.get("/api/entropy", (req, res) => {
      const allReveals = this.revealManager.getAllReveals();
      const latestRound = this.revealManager.getLatestRound();
      res.json({
        latestRound,
        revealsCount: Object.keys(allReveals).length,
        reveals: allReveals,
        currentRollingEntropy: this.currentRollingEntropy,
      });
    });

    // Get sector-specific entropy for testing
    this.app.get("/api/entropy/sector/:sectorId", (req, res) => {
      const { sectorId } = req.params;

      if (!this.currentRollingEntropy) {
        return res
          .status(400)
          .json({ error: "No rolling entropy available yet" });
      }

      try {
        const sectorDice = createSectorDice(
          this.currentRollingEntropy,
          sectorId
        );

        // Generate some sample rolls for demonstration
        const samples = {
          sectorId,
          rollingEntropy: this.currentRollingEntropy,
          sampleRolls: {
            single: sectorDice.roll(1),
            double: sectorDice.roll(2),
            quad: sectorDice.roll(4),
            percentage: sectorDice.rollPercent(),
            range1to10: sectorDice.rollBetween(1, 10),
            range1to100: sectorDice.rollBetween(1, 100),
            coinFlip: sectorDice.rollBool(),
          },
          dicePosition: sectorDice.getPosition(),
          remainingEntropy: sectorDice.getRemainingEntropy(),
        };

        res.json(samples);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });
  }

  private setupWebSocket(): void {
    this.wss.on("connection", (ws, req) => {
      this.debugLog("WebSocket connection established");

      ws.on("message", (message) => {
        try {
          const data = JSON.parse(message.toString());

          if (data.type === "subscribe" && data.sectorId) {
            if (!this.sectors.has(data.sectorId)) {
              return ws.send(
                JSON.stringify({
                  type: "error",
                  message: "Sector not found",
                })
              );
            }

            const sector = this.sectors.get(data.sectorId)!;
            sector.addSubscriber(ws);

            ws.send(
              JSON.stringify({
                type: "subscribed",
                sectorId: data.sectorId,
                timestamp: Date.now(),
              })
            );
          } else if (
            data.type === "ship_vector_matched" &&
            data.sectorId &&
            data.shipId
          ) {
            // Handle frontend notification that a ship has matched vector with target (asteroid or ship)
            const sector = this.sectors.get(data.sectorId);
            if (sector) {
              const targetType = data.targetShipId ? "ship" : "asteroid";
              const targetId = data.targetShipId || data.asteroidId;

              sector.handleVectorMatching(
                data.shipId,
                targetId,
                data.position,
                data.velocity,
                targetType
              );
            }
          }
        } catch (error) {
          console.error("WebSocket message error:", error);
        }
      });

      ws.on("close", () => {
        // Remove subscriber from all sectors
        for (const sector of this.sectors.values()) {
          sector.removeSubscriber(ws);
        }
        this.debugLog("WebSocket connection closed");
      });
    });
  }

  private async loadSectorsFromContract(): Promise<void> {
    try {
      this.debugLog("Loading sectors from contract...");

      // Check if MaxExtract contract is deployed
      const contracts =
        deployedContracts[CHAIN_ID as keyof typeof deployedContracts];
      if (!contracts || !contracts.MaxExtract) {
        console.error("⚠️  MaxExtract contract not found. Run: yarn deploy");
        this.debugLog("MaxExtract contract not found");
        return;
      }

      const maxExtractContract = contracts.MaxExtract;
      if (!maxExtractContract.address) {
        console.error("⚠️  MaxExtract contract address is undefined");
        this.debugLog("MaxExtract contract address is undefined");
        return;
      }

      this.debugLog(
        `Calling getActiveSectors on contract: ${maxExtractContract.address}`
      );

      const activeSectors = (await publicClient.readContract({
        address: maxExtractContract.address,
        abi: maxExtractContract.abi,
        functionName: "getActiveSectors",
      })) as bigint[];

      this.debugLog(
        `Found ${activeSectors.length} active sectors from contract`
      );

      let newSectorsAdded = false;
      for (const sectorId of activeSectors) {
        const sectorIdStr = sectorId.toString();
        if (!this.sectors.has(sectorIdStr)) {
          const newSector = new Sector(sectorIdStr, undefined, this.debugMode);

          // Update sector with current rolling entropy if available
          if (this.currentRollingEntropy) {
            newSector.updateRollingEntropy(this.currentRollingEntropy);
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

  private async performRollingCommitReveal(): Promise<void> {
    try {
      // Check if Universe contract is deployed
      const contracts =
        deployedContracts[CHAIN_ID as keyof typeof deployedContracts];
      if (!contracts || !contracts.Universe) {
        this.debugLog(
          "Universe contract not found, skipping rolling commit-reveal"
        );
        return;
      }

      const universeContract = contracts.Universe;
      if (!universeContract.address) {
        this.debugLog("Universe contract address is undefined");
        return;
      }

      // Get current rolling state from contract
      const rollingState = (await publicClient.readContract({
        address: universeContract.address,
        abi: universeContract.abi,
        functionName: "getRollingState",
      })) as [string, bigint, string]; // [rollingEntropy, roundNumber, lastCommit]

      const currentRoundNumber = Number(rollingState[1]);
      this.debugLog(`Current contract round number: ${currentRoundNumber}`);

      // Determine what reveal to use
      let revealToUse: string;

      if (currentRoundNumber === 0) {
        // First round - use 0x0 as reveal
        revealToUse =
          "0x0000000000000000000000000000000000000000000000000000000000000000";
        this.debugLog("Using 0x0 reveal for round 0");
      } else {
        // Get the reveal for the previous round
        const previousRoundReveal = this.revealManager.getReveal(
          currentRoundNumber - 1
        );
        if (!previousRoundReveal) {
          console.error(
            `❌ Missing reveal for round ${currentRoundNumber - 1}`
          );
          return;
        }
        revealToUse = previousRoundReveal;
        this.debugLog(
          `Using stored reveal for round ${
            currentRoundNumber - 1
          }: ${revealToUse}`
        );
      }

      // Generate commitment for next round
      const { revealNumber: nextReveal, commitHash: nextCommit } =
        this.revealManager.generateCommitment();

      // Save the reveal for the next round
      this.revealManager.saveReveal(currentRoundNumber, nextReveal, nextCommit);
      this.debugLog(
        `Generated and saved reveal for round ${currentRoundNumber}: ${nextReveal}`
      );

      // Convert reveal to uint256 (remove 0x prefix and convert to bigint)
      const revealAsUint256 = BigInt(revealToUse);

      this.debugLog(`Calling rollingCommitReveal with:`);
      this.debugLog(`  Contract: ${universeContract.address}`);
      this.debugLog(`  nextCommit: ${nextCommit}`);
      this.debugLog(`  reveal: ${revealToUse} (${revealAsUint256})`);
      this.debugLog(`  Current round: ${currentRoundNumber}`);

      // Try to simulate the call first to get better error info
      try {
        await publicClient.simulateContract({
          address: universeContract.address,
          abi: universeContract.abi,
          functionName: "rollingCommitReveal",
          args: [nextCommit, revealAsUint256],
          account: godAccount.address,
        });
        this.debugLog("✅ Simulation successful, proceeding with actual call");
      } catch (simError: any) {
        console.error(
          `❌ Simulation failed: ${simError.shortMessage || simError.message}`
        );
        this.debugLog("Simulation error details:", simError);
        return;
      }

      // Call the rolling commit-reveal function
      const hash = await walletClient.writeContract({
        address: universeContract.address,
        abi: universeContract.abi,
        functionName: "rollingCommitReveal",
        args: [nextCommit, revealAsUint256],
      });

      this.debugLog(`Rolling commit-reveal transaction sent: ${hash}`);

      // Wait for transaction to be mined
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      this.debugLog(
        `Rolling commit-reveal transaction mined in block ${receipt.blockNumber}`
      );

      // Read and display the new rolling entropy
      try {
        const newRollingEntropy = (await publicClient.readContract({
          address: universeContract.address,
          abi: universeContract.abi,
          functionName: "rollingEntropy",
        })) as string;

        console.log(`🎲 New Rolling Entropy: ${newRollingEntropy}`);
        this.debugLog(`Rolling entropy updated to: ${newRollingEntropy}`);

        // Store the current rolling entropy for sectors to use
        this.currentRollingEntropy = newRollingEntropy;

        // Update all existing sectors with new rolling entropy
        for (const sector of this.sectors.values()) {
          sector.updateRollingEntropy(newRollingEntropy);
        }
        this.debugLog(
          `Updated ${this.sectors.size} sectors with new rolling entropy`
        );
      } catch (entropyError: any) {
        this.debugLog("Failed to read rolling entropy", entropyError);
      }
    } catch (error: any) {
      console.error(
        `❌ Rolling Commit-Reveal Error: ${
          error.shortMessage || error.message || "Unknown error"
        }`
      );
      this.debugLog("Rolling commit-reveal failed", error);
    }
  }

  private startSimulation(): void {
    this.debugLog("Starting simulation loop");

    const simulate = async () => {
      // Get and print GOD account balance
      try {
        const godBalance = await publicClient.getBalance({
          address: godAccount.address,
        });
        const formattedBalance = formatEther(godBalance);
        console.log(`👑 ${formattedBalance} ETH - ${godAccount.address}`);
      } catch (error: any) {
        console.error(
          `❌ GOD Balance Error: ${error.message || "Unknown error"}`
        );
      }

      // Check universe entropy status periodically
      try {
        const status = await this.checkUniverseEntropyStatus();
        if (!status.isSet) {
          console.log(
            "⚠️  Universe entropy still not set - game functions limited"
          );
        }
      } catch (error: any) {
        this.debugLog("Failed to check universe entropy status", error);
      }

      // Perform rolling commit-reveal for entropy generation
      await this.performRollingCommitReveal();

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

      // Schedule next update
      this.simulationInterval = setTimeout(
        simulate,
        SECTOR_CONFIG.UPDATE_INTERVAL
      );
    };

    simulate();
  }

  private async checkUniverseEntropyStatus(): Promise<{
    isSet: boolean;
    commitmentMade: boolean;
    canReveal: boolean;
    universeContract: any;
  }> {
    // Check if Universe contract is deployed
    const contracts =
      deployedContracts[CHAIN_ID as keyof typeof deployedContracts];
    if (!contracts || !contracts.Universe) {
      throw new Error("Universe contract not found");
    }

    const universeContract = contracts.Universe;
    if (!universeContract.address) {
      throw new Error("Universe contract address is undefined");
    }

    // Check main universe entropy status
    const isEntropySet = (await publicClient.readContract({
      address: universeContract.address,
      abi: universeContract.abi,
      functionName: "isEntropySet",
    })) as boolean;

    // Get commit-reveal state
    const commitRevealState = (await publicClient.readContract({
      address: universeContract.address,
      abi: universeContract.abi,
      functionName: "getCommitRevealState",
    })) as [boolean, bigint, boolean]; // [commitmentMade, commitBlock, entropySet]

    const commitmentMade = commitRevealState[0];
    const commitBlock = Number(commitRevealState[1]);
    const canReveal =
      commitmentMade && (await publicClient.getBlockNumber()) > commitBlock;

    return {
      isSet: isEntropySet,
      commitmentMade,
      canReveal,
      universeContract,
    };
  }

  private async waitForUniverseEntropy(): Promise<void> {
    const ENTROPY_CHECK_INTERVAL = 10000; // 10 seconds
    let checkCount = 0;

    while (true) {
      try {
        checkCount++;
        if (checkCount === 1) {
          console.log("🔍 Checking universe entropy status...");
        }

        const status = await this.checkUniverseEntropyStatus();

        if (status.isSet) {
          console.log(
            "✅ Universe entropy is set! Continuing with server startup..."
          );
          return;
        }

        // Compare GOD addresses (only on first check to avoid spam)
        if (checkCount === 1) {
          const contractGodAddress = (await publicClient.readContract({
            address: status.universeContract.address,
            abi: status.universeContract.abi,
            functionName: "GOD",
            args: [],
          })) as string;

          console.log(`🔍 Contract GOD address: ${contractGodAddress}`);
          console.log(`🔍 Our GOD address: ${godAccount.address}`);

          if (
            contractGodAddress.toLowerCase() !==
            godAccount.address.toLowerCase()
          ) {
            console.error(`❌ GOD address mismatch!`);
            console.error(`   Contract expects: ${contractGodAddress}`);
            console.error(`   We are using: ${godAccount.address}`);
            console.error(`   Cannot set universe entropy automatically.`);
            console.error(
              `   Please set entropy manually or use correct GOD account.`
            );
            console.log(
              `⏳ Will keep checking every ${
                ENTROPY_CHECK_INTERVAL / 1000
              } seconds...`
            );
          } else {
            console.log(`✅ GOD addresses match!`);
          }
        }

        // Provide status-specific messages
        if (!status.commitmentMade) {
          if (checkCount === 1) {
            console.log(
              "⚠️  No commitment made yet. Universe entropy must be set via commit-reveal process."
            );
            console.log("   Please run the entropy setup process:");
            console.log("   1. Visit http://localhost:3000/entropy");
            console.log(
              "   2. Or use the GOD interface to commit and reveal entropy"
            );
            console.log(
              `⏳ Waiting for entropy setup... (checking every ${
                ENTROPY_CHECK_INTERVAL / 1000
              }s)`
            );
          } else {
            console.log("⏳ Still waiting for universe entropy commitment...");
          }
        } else if (status.commitmentMade && !status.canReveal) {
          console.log(
            "⏳ Commitment made, waiting for next block to allow reveal..."
          );
        } else if (status.commitmentMade && status.canReveal) {
          if (checkCount === 1) {
            console.log("⚠️  Commitment made but entropy not revealed yet.");
            console.log("   Please complete the reveal process:");
            console.log("   1. Visit http://localhost:3000/entropy");
            console.log("   2. Or use the GOD interface to reveal entropy");
            console.log(
              `⏳ Waiting for entropy reveal... (checking every ${
                ENTROPY_CHECK_INTERVAL / 1000
              }s)`
            );
          } else {
            console.log("⏳ Still waiting for entropy reveal...");
          }
        }

        // Wait before checking again
        await new Promise((resolve) =>
          setTimeout(resolve, ENTROPY_CHECK_INTERVAL)
        );
      } catch (error: any) {
        console.error(
          `❌ Error checking universe entropy: ${
            error.shortMessage || error.message
          }`
        );
        console.log(
          `⏳ Will retry in ${ENTROPY_CHECK_INTERVAL / 1000} seconds...`
        );
        await new Promise((resolve) =>
          setTimeout(resolve, ENTROPY_CHECK_INTERVAL)
        );
      }
    }
  }

  private async initializeRollingCommitReveal(): Promise<void> {
    try {
      this.debugLog("Initializing rolling commit-reveal system...");

      // Check if Universe contract is deployed
      const contracts =
        deployedContracts[CHAIN_ID as keyof typeof deployedContracts];
      if (!contracts || !contracts.Universe) {
        console.log(
          "⚠️  Universe contract not found. Rolling commit-reveal disabled."
        );
        return;
      }

      const universeContract = contracts.Universe;
      if (!universeContract.address) {
        console.log(
          "⚠️  Universe contract address is undefined. Rolling commit-reveal disabled."
        );
        return;
      }

      // Initialize contract-specific RevealManager now that we have the address
      this.revealManager = new RevealManager(universeContract.address);
      this.debugLog(
        `Using reveals file for contract: ${universeContract.address}`
      );

      // Get current rolling state from contract
      const rollingState = (await publicClient.readContract({
        address: universeContract.address,
        abi: universeContract.abi,
        functionName: "getRollingState",
      })) as [string, bigint, string]; // [rollingEntropy, roundNumber, lastCommit]

      const currentRoundNumber = Number(rollingState[1]);
      const lastCommit = rollingState[2];

      this.debugLog(
        `Contract state - Round: ${currentRoundNumber}, LastCommit: ${lastCommit}`
      );

      // Check if we have the reveal for the current round
      if (
        currentRoundNumber > 0 &&
        !this.revealManager.hasReveal(currentRoundNumber - 1)
      ) {
        console.log(
          `⚠️  Missing reveal for round ${
            currentRoundNumber - 1
          }. Cannot continue rolling commit-reveal.`
        );
        console.log(
          `⚠️  You may need to reset the contract or manually add the missing reveal.`
        );
        return;
      }

      // If we're starting fresh (round 0), generate the first commitment
      if (currentRoundNumber === 0) {
        const { revealNumber, commitHash } =
          this.revealManager.generateCommitment();
        this.revealManager.saveReveal(0, revealNumber, commitHash);
        this.debugLog(
          `Generated initial commitment for round 0: ${commitHash}`
        );
      }

      // Get initial rolling entropy
      const initialRollingState = (await publicClient.readContract({
        address: universeContract.address,
        abi: universeContract.abi,
        functionName: "getRollingState",
      })) as [string, bigint, string];

      this.currentRollingEntropy = initialRollingState[0];
      this.debugLog(`Initial rolling entropy: ${this.currentRollingEntropy}`);

      console.log(
        `🎲 Rolling commit-reveal initialized - Round ${currentRoundNumber}`
      );
    } catch (error: any) {
      console.error(
        `❌ Rolling commit-reveal initialization failed: ${
          error.shortMessage || error.message || "Unknown error"
        }`
      );
      this.debugLog("Rolling commit-reveal initialization error", error);
    }
  }

  public async start(port: number = 8000): Promise<void> {
    // First, ensure universe entropy is set before starting any game operations
    await this.waitForUniverseEntropy();

    // Initialize rolling commit-reveal system
    await this.initializeRollingCommitReveal();

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
    return this.currentRollingEntropy;
  }

  /**
   * Create a sector-specific deterministic dice
   * @param sectorId The sector ID
   * @returns DeterministicDice instance or null if no entropy available
   */
  public createSectorDice(sectorId: string) {
    if (!this.currentRollingEntropy) {
      this.debugLog(`No rolling entropy available for sector ${sectorId}`);
      return null;
    }

    this.debugLog(`Creating sector dice for sector ${sectorId}`);
    return createSectorDice(this.currentRollingEntropy, sectorId);
  }

  public stop(): void {
    if (this.simulationInterval) {
      clearTimeout(this.simulationInterval);
    }
    this.server.close();
  }
}
