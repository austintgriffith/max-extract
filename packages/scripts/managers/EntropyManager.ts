import { BlockchainManager } from "./blockchain";
import { RevealManager } from "../utils/RevealManager";
import { createSectorDice } from "../utils/DeterministicDice";
import { UniverseEntropyPersistence } from "../utils/UniverseEntropyPersistence";

export interface UniverseEntropyStatus {
  isSet: boolean;
  commitmentMade: boolean;
  canReveal: boolean;
  universeContract: any;
}

export class EntropyManager {
  private blockchainManager: BlockchainManager;
  private revealManager: RevealManager;
  private entropyPersistence: UniverseEntropyPersistence;
  private currentRollingEntropy: string | null = null;
  private debugMode: boolean;
  private missingRevealWarningShown: boolean = false;
  private revealManagerContractAddress: string | null = null; // Track which contract RevealManager is configured for

  constructor(
    blockchainManager: BlockchainManager,
    debugMode: boolean = false
  ) {
    this.blockchainManager = blockchainManager;
    this.debugMode = debugMode;
    // Initialize RevealManager without contract address initially
    // Will be updated once we know the Universe contract address
    this.revealManager = new RevealManager();
    // Initialize entropy persistence system
    this.entropyPersistence = new UniverseEntropyPersistence(
      "./data/universe-entropy",
      debugMode
    );
  }

  private debugLog(message: string, data?: any): void {
    if (this.debugMode) {
      const timestamp = new Date().toISOString().split("T")[1].split(".")[0];
      if (data) {
        console.log(`🎲 [${timestamp}] ${message}:`, data);
      } else {
        console.log(`🎲 [${timestamp}] ${message}`);
      }
    }
  }

  /**
   * Check the current universe entropy status
   */
  public async checkUniverseEntropyStatus(): Promise<UniverseEntropyStatus> {
    const universeContract = this.blockchainManager.getContract("Universe");
    if (!universeContract) {
      throw new Error("Universe contract not found");
    }

    // Check main universe entropy status
    const isEntropySet = (await this.blockchainManager.readContract(
      universeContract.address,
      universeContract.abi,
      "isEntropySet"
    )) as boolean;

    // Get commit-reveal state
    const commitRevealState = (await this.blockchainManager.readContract(
      universeContract.address,
      universeContract.abi,
      "getCommitRevealState"
    )) as [boolean, bigint, boolean]; // [commitmentMade, commitBlock, entropySet]

    const commitmentMade = commitRevealState[0];
    const commitBlock = Number(commitRevealState[1]);
    const canReveal =
      commitmentMade &&
      (await this.blockchainManager.getBlockNumber()) > commitBlock;

    return {
      isSet: isEntropySet,
      commitmentMade,
      canReveal,
      universeContract,
    };
  }

  /**
   * Wait for universe entropy to be set
   */
  public async waitForUniverseEntropy(): Promise<void> {
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
          const contractGodAddress = (await this.blockchainManager.readContract(
            status.universeContract.address,
            status.universeContract.abi,
            "GOD",
            []
          )) as string;

          const ourGodAddress = this.blockchainManager.getGodAccount().address;

          console.log(`🔍 Contract GOD address: ${contractGodAddress}`);
          console.log(`🔍 Our GOD address: ${ourGodAddress}`);

          if (
            contractGodAddress.toLowerCase() !== ourGodAddress.toLowerCase()
          ) {
            console.error(`❌ GOD address mismatch!`);
            console.error(`   Contract expects: ${contractGodAddress}`);
            console.error(`   We are using: ${ourGodAddress}`);
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

  /**
   * Initialize the rolling commit-reveal system
   */
  public async initializeRollingCommitReveal(): Promise<void> {
    try {
      this.debugLog("Initializing rolling commit-reveal system...");

      const universeContract = this.blockchainManager.getContract("Universe");
      if (!universeContract) {
        console.log(
          "⚠️  Universe contract not found. Rolling commit-reveal disabled."
        );
        return;
      }

      // Initialize contract-specific RevealManager now that we have the address
      this.revealManager = new RevealManager(universeContract.address);
      this.revealManagerContractAddress = universeContract.address;
      this.debugLog(
        `Using reveals file for contract: ${universeContract.address}`
      );

      // Get current rolling state from contract
      const rollingState = (await this.blockchainManager.readContract(
        universeContract.address,
        universeContract.abi,
        "getRollingState"
      )) as [string, bigint, string]; // [rollingEntropy, roundNumber, lastCommit]

      const currentRoundNumber = Number(rollingState[1]);
      const lastCommit = rollingState[2];
      const contractRollingEntropy = rollingState[0];

      this.debugLog(
        `Contract state - Round: ${currentRoundNumber}, LastCommit: ${lastCommit}`
      );

      // Always read the current rolling entropy from contract
      // This ensures sectors can spawn even if we can't advance rounds
      if (contractRollingEntropy && contractRollingEntropy !== "0x0000000000000000000000000000000000000000000000000000000000000000") {
        this.currentRollingEntropy = contractRollingEntropy;
        this.debugLog(`Initial rolling entropy: ${this.currentRollingEntropy}`);
      }

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
          `   However, using existing rolling entropy: ${contractRollingEntropy.slice(0, 18)}...`
        );
        console.log(
          `   Game will continue with spawning enabled (entropy won't advance).`
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

  /**
   * Perform rolling commit-reveal operation
   */
  public async performRollingCommitReveal(): Promise<void> {
    try {
      const universeContract = this.blockchainManager.getContract("Universe");
      if (!universeContract) {
        this.debugLog(
          "Universe contract not found, skipping rolling commit-reveal"
        );
        return;
      }

      // Ensure we're using contract-specific RevealManager
      // This prevents race conditions where performRollingCommitReveal runs before initializeRollingCommitReveal
      if (this.revealManagerContractAddress !== universeContract.address) {
        this.revealManager = new RevealManager(universeContract.address);
        this.revealManagerContractAddress = universeContract.address;
        this.debugLog(
          `Initialized contract-specific RevealManager for: ${universeContract.address}`
        );
      }

      // Get current rolling state from contract
      const rollingState = (await this.blockchainManager.readContract(
        universeContract.address,
        universeContract.abi,
        "getRollingState"
      )) as [string, bigint, string]; // [rollingEntropy, roundNumber, lastCommit]

      const contractRollingEntropy = rollingState[0];
      const currentRoundNumber = Number(rollingState[1]);
      this.debugLog(`Current contract round number: ${currentRoundNumber}`);
      this.debugLog(`Current contract rolling entropy: ${contractRollingEntropy}`);

      // Always use the contract's current rolling entropy for sectors
      // even if we can't advance to the next round
      if (contractRollingEntropy && contractRollingEntropy !== "0x0000000000000000000000000000000000000000000000000000000000000000") {
        if (this.currentRollingEntropy !== contractRollingEntropy) {
          this.currentRollingEntropy = contractRollingEntropy;
          this.debugLog(`Updated local rolling entropy from contract: ${contractRollingEntropy}`);
        }
      }

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
          // Missing reveal - auto-delete old reveals and start fresh
          if (!this.missingRevealWarningShown) {
            console.log(`\n${"=".repeat(70)}`);
            console.log(`🔄 AUTO-RECOVERY: Deleting stale reveals and starting fresh`);
            console.log(`${"=".repeat(70)}`);
            console.log(`Missing reveal for round ${currentRoundNumber - 1}.`);
            console.log(`Clearing reveals file to start fresh from round ${currentRoundNumber}.`);
            console.log(`✅ Game continues normally, rounds will advance on next cycle`);
            console.log(`${"=".repeat(70)}\n`);
            this.missingRevealWarningShown = true;
            
            // Clear all reveals to start fresh
            this.revealManager.clearReveals();
          }
          
          // Generate a fresh commitment for the CURRENT round
          const { revealNumber: freshReveal, commitHash: freshCommit } =
            this.revealManager.generateCommitment();
          
          // Save it as round currentRoundNumber
          this.revealManager.saveReveal(currentRoundNumber, freshReveal, freshCommit);
          this.debugLog(
            `Generated fresh commitment for round ${currentRoundNumber}: ${freshReveal.slice(0, 20)}...`
          );
          
          // Skip calling rollingCommitReveal this cycle
          // Next cycle we'll have a reveal for currentRoundNumber and can advance
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
        await this.blockchainManager.simulateContract(
          universeContract.address,
          universeContract.abi,
          "rollingCommitReveal",
          [nextCommit, revealAsUint256]
        );
        this.debugLog("✅ Simulation successful, proceeding with actual call");
      } catch (simError: any) {
        console.error(
          `❌ Simulation failed: ${simError.shortMessage || simError.message}`
        );
        this.debugLog("Simulation error details:", simError);
        return;
      }

      // Call the rolling commit-reveal function
      const hash = await this.blockchainManager.writeContract(
        universeContract.address,
        universeContract.abi,
        "rollingCommitReveal",
        [nextCommit, revealAsUint256]
      );

      this.debugLog(`Rolling commit-reveal transaction sent: ${hash}`);

      // Wait for transaction to be mined
      const receipt = await this.blockchainManager.waitForTransactionReceipt(
        hash
      );
      this.debugLog(
        `Rolling commit-reveal transaction mined in block ${receipt.blockNumber}`
      );

      // Read and display the new rolling entropy
      try {
        const newRollingEntropy = (await this.blockchainManager.readContract(
          universeContract.address,
          universeContract.abi,
          "rollingEntropy"
        )) as string;

        console.log(`🎲 New Rolling Entropy: ${newRollingEntropy}`);
        this.debugLog(`Rolling entropy updated to: ${newRollingEntropy}`);

        // Store the current rolling entropy for sectors to use
        this.currentRollingEntropy = newRollingEntropy;
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

  /**
   * Get the universe entropy (main game seed)
   * This is the immutable entropy set at the start of the game
   */
  public async getUniverseEntropy(): Promise<string | null> {
    try {
      const universeContract = this.blockchainManager.getContract("Universe");
      if (!universeContract) {
        throw new Error("Universe contract not found");
      }

      const entropy = (await this.blockchainManager.readContract(
        universeContract.address,
        universeContract.abi,
        "entropy"
      )) as string;

      return entropy;
    } catch (error: any) {
      this.debugLog("Failed to get universe entropy", error);
      return null;
    }
  }

  /**
   * Get the current rolling entropy
   */
  public getCurrentRollingEntropy(): string | null {
    return this.currentRollingEntropy;
  }

  /**
   * Update the current rolling entropy (called when sectors need to be updated)
   */
  public updateCurrentRollingEntropy(entropy: string): void {
    this.currentRollingEntropy = entropy;
  }

  /**
   * Create a sector-specific deterministic dice
   */
  public createSectorDice(sectorId: string) {
    if (!this.currentRollingEntropy) {
      this.debugLog(`No rolling entropy available for sector ${sectorId}`);
      return null;
    }

    this.debugLog(`Creating sector dice for sector ${sectorId}`);
    return createSectorDice(this.currentRollingEntropy, sectorId);
  }

  /**
   * Get all reveals for API endpoint
   */
  public getAllReveals(): any {
    return this.revealManager.getAllReveals();
  }

  /**
   * Get latest round for API endpoint
   */
  public getLatestRound(): number {
    return this.revealManager.getLatestRound();
  }

  /**
   * Reset the entropy manager state when contracts are reloaded
   * This clears the RevealManager and rolling entropy for fresh contracts
   */
  public reset(): void {
    this.debugLog("Resetting EntropyManager for fresh contracts");
    this.revealManager = new RevealManager();
    this.revealManagerContractAddress = null;
    this.currentRollingEntropy = null;
    this.missingRevealWarningShown = false; // Reset warning for new contract
    console.log("🔄 EntropyManager reset for fresh contracts");
  }

  /**
   * Check if there's a pending commitment that needs to be revealed
   * Returns the pending commitment data if found
   */
  public checkPendingCommitment(): { randomNumber: bigint; commitBlock: number } | null {
    const universeContract = this.blockchainManager.getContract("Universe");
    if (!universeContract) {
      return null;
    }

    const pending = this.entropyPersistence.getPendingCommitment(
      universeContract.address
    );

    if (pending) {
      console.log("\n🔍 FOUND PENDING COMMITMENT FROM PREVIOUS RUN!");
      console.log(`   Contract: ${pending.contractAddress}`);
      console.log(`   Commit Block: ${pending.commitBlock}`);
      console.log(`   Timestamp: ${new Date(pending.commitTimestamp).toISOString()}`);
      console.log(`   Will attempt to reveal instead of committing again...\n`);

      return {
        randomNumber: BigInt(pending.randomNumber),
        commitBlock: pending.commitBlock,
      };
    }

    return null;
  }

  /**
   * Generate and commit entropy automatically for game cycle
   * Returns the random number for later reveal
   */
  public async autoCommitEntropy(): Promise<bigint> {
    this.debugLog("Auto-generating entropy for commit");

    // Get Universe contract
    const universeContract = this.blockchainManager.getContract("Universe");
    if (!universeContract) {
      throw new Error("Universe contract not found");
    }

    // Check if there's already a pending commitment
    const pending = this.entropyPersistence.getPendingCommitment(
      universeContract.address
    );
    if (pending) {
      console.log("⚠️  Found existing commitment on disk - using saved random number");
      return BigInt(pending.randomNumber);
    }

    // Generate random number (256-bit)
    const randomBytes = new Uint8Array(32);
    crypto.getRandomValues(randomBytes);
    const randomHex = Array.from(randomBytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    const randomBigInt = BigInt("0x" + randomHex);

    this.debugLog("Generated random number", randomBigInt.toString());

    // Import keccak256 and toBytes from viem
    const { keccak256, toBytes } = await import("viem");

    // Calculate commitment hash
    const hash = keccak256(toBytes(randomBigInt));
    this.debugLog("Calculated commitment hash", hash);

    // Call commit on Universe contract
    this.debugLog(
      "Calling commit on Universe contract",
      universeContract.address
    );
    const txHash = await this.blockchainManager.writeContract(
      universeContract.address,
      universeContract.abi,
      "commit",
      [hash]
    );

    // Wait for transaction
    const receipt = await this.blockchainManager.waitForTransactionReceipt(txHash);
    this.debugLog("Commit transaction mined", txHash);

    // Save commitment to disk AFTER successful transaction
    this.entropyPersistence.saveCommitment(
      universeContract.address,
      randomBigInt,
      hash,
      Number(receipt.blockNumber)
    );

    return randomBigInt;
  }

  /**
   * Reveal previously committed entropy for game cycle
   */
  public async autoRevealEntropy(randomNumber: bigint): Promise<void> {
    this.debugLog("Auto-revealing entropy", randomNumber.toString());

    // Get Universe contract
    const universeContract = this.blockchainManager.getContract("Universe");
    if (!universeContract) {
      throw new Error("Universe contract not found");
    }

    // Call reveal on Universe contract
    this.debugLog(
      "Calling reveal on Universe contract",
      universeContract.address
    );
    const txHash = await this.blockchainManager.writeContract(
      universeContract.address,
      universeContract.abi,
      "reveal",
      [randomNumber]
    );

    // Wait for transaction
    await this.blockchainManager.waitForTransactionReceipt(txHash);
    this.debugLog("Reveal transaction mined", txHash);

    // Mark as revealed in persistence (and optionally clear the file)
    this.entropyPersistence.markAsRevealed(universeContract.address);
    
    // Optionally clear the commitment file after successful reveal
    // Uncomment if you want to clean up after successful reveals
    // this.entropyPersistence.clearCommitment(universeContract.address);
  }
}
