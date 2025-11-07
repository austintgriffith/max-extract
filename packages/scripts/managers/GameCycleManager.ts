import { BlockchainManager } from "./BlockchainManager";
import { EntropyManager } from "./EntropyManager";
import { SECTOR_CONFIG } from "../types";

/**
 * GameCycleManager - Manages the automated game cycle
 *
 * Cycle sequence:
 * 1. Countdown - Give players time to buy in
 * 2. Commit Entropy - Generate and commit entropy hash
 * 3. Close Buy-ins - Set game state to Active
 * 4. Reveal Entropy - Reveal the entropy (after transaction between commit and reveal)
 * 5. Game Running - Wait for game to end naturally
 * 6. Payout - Handled by SimulationManager
 * 7. Wait - Wait for next contract deployment
 */
export class GameCycleManager {
  private blockchainManager: BlockchainManager;
  private entropyManager: EntropyManager;
  private debugMode: boolean;
  private countdownSeconds: number;
  private cycleInProgress: boolean = false;
  private cancelRequested: boolean = false;
  private initializeCharacters?: () => Promise<void>;
  private onCharactersInitialized?: () => void;

  constructor(
    blockchainManager: BlockchainManager,
    entropyManager: EntropyManager,
    countdownSeconds: number = 10,
    debugMode: boolean = false,
    initializeCharacters?: () => Promise<void>,
    onCharactersInitialized?: () => void
  ) {
    this.blockchainManager = blockchainManager;
    this.entropyManager = entropyManager;
    this.countdownSeconds = countdownSeconds;
    this.debugMode = debugMode;
    this.initializeCharacters = initializeCharacters;
    this.onCharactersInitialized = onCharactersInitialized;
  }

  private debugLog(message: string, data?: any): void {
    if (this.debugMode) {
      const timestamp = new Date().toISOString().split("T")[1].split(".")[0];
      if (data) {
        console.log(`🎮 [${timestamp}] GameCycle - ${message}:`, data);
      } else {
        console.log(`🎮 [${timestamp}] GameCycle - ${message}`);
      }
    }
  }

  /**
   * Check if a cycle is currently in progress
   */
  public isCycleInProgress(): boolean {
    return this.cycleInProgress;
  }

  /**
   * Cancel the current cycle
   */
  public cancelCycle(): void {
    if (this.cycleInProgress) {
      console.log("⚠️  Cancelling current game cycle...");
      this.cancelRequested = true;
    }
  }

  /**
   * Sleep for a specified number of milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Start a new game cycle
   */
  public async startGameCycle(): Promise<void> {
    // Don't start if cycle already in progress
    if (this.cycleInProgress) {
      console.log("⚠️  Game cycle already in progress, skipping...");
      return;
    }

    this.cycleInProgress = true;
    this.cancelRequested = false;

    try {
      console.log("\n" + "=".repeat(60));
      console.log("🎮 STARTING NEW GAME CYCLE");
      console.log("=".repeat(60) + "\n");

      // Check if universe entropy is already set
      const entropyStatus = await this.entropyManager.checkUniverseEntropyStatus();
      const needsEntropySetup = !entropyStatus.isSet;

      // Check for pending commitment from previous run (before contract check)
      const pendingCommitment = this.entropyManager.checkPendingCommitment();
      
      if (needsEntropySetup) {
        if (pendingCommitment) {
          console.log("🔄 Resuming from pending commitment - skipping commit phase");
        } else {
          console.log("🌌 Initial universe entropy not set - running full setup");
        }
      } else {
        console.log("✅ Universe entropy already set - skipping entropy setup");
      }

      // Phase 1: Countdown
      await this.runCountdownPhase();
      if (this.cancelRequested) return;

      // Phase 2 & 4: Commit and Reveal Entropy (only if not already set)
      let randomNumber: bigint | undefined;
      if (needsEntropySetup) {
        // If we have a pending commitment, use that instead of committing again
        if (pendingCommitment) {
          randomNumber = pendingCommitment.randomNumber;
          console.log("✅ Using saved random number from previous commitment");
        } else {
          randomNumber = await this.runCommitEntropyPhase();
          if (this.cancelRequested) return;
        }
      }

      // Phase 3: Close Buy-ins (only if we just committed - if resuming from pending, might already be closed)
      if (!pendingCommitment) {
        await this.runCloseBuyInsPhase();
        if (this.cancelRequested) return;
      } else {
        console.log("\n⏭️  Skipping buy-in close (resuming from pending commitment)");
      }

      // Phase 4: Reveal Entropy (only if we committed)
      if (needsEntropySetup && randomNumber !== undefined) {
        await this.runRevealEntropyPhase(randomNumber);
        if (this.cancelRequested) return;
      } else if (!needsEntropySetup) {
        // If entropy already set, just initialize characters and rolling system
        console.log("\n🔄 INITIALIZING GAME WITH EXISTING ENTROPY...");
        
        if (this.initializeCharacters) {
          console.log("👥 Initializing characters with existing universe entropy...");
          await this.initializeCharacters();
          
          // Notify that character initialization is complete
          if (this.onCharactersInitialized) {
            console.log("✅ All pilots added - starting simulation loops...");
            this.onCharactersInitialized();
          }
        }
        
        // Initialize rolling commit-reveal system if not already initialized
        console.log("🔄 Ensuring rolling commit-reveal system is ready...");
        await this.entropyManager.initializeRollingCommitReveal();
        console.log("✅ Rolling commit-reveal ready");
      }

      // Phase 5: Game Running
      await this.runGameActivePhase();

      // Phases 6-7 (Payout and Wait) are handled elsewhere
      // - Payout is handled by SimulationManager when game ends
      // - Wait is handled by contract monitoring in GameServer

      console.log("\n" + "=".repeat(60));
      console.log("✅ GAME CYCLE SETUP COMPLETE");
      console.log("=".repeat(60) + "\n");
      console.log("⏳ Waiting for next contract deployment or game end...\n");
    } catch (error: any) {
      console.error(`❌ Game cycle error: ${error.message}`);
      this.debugLog("Game cycle error details:", error);
    } finally {
      this.cycleInProgress = false;
      this.cancelRequested = false;
    }
  }

  /**
   * Phase 1: Countdown - Give players time to buy in
   */
  private async runCountdownPhase(): Promise<void> {
    console.log(`⏰ BUY-IN COUNTDOWN: ${this.countdownSeconds} seconds\n`);

    for (let i = this.countdownSeconds; i > 0; i--) {
      if (this.cancelRequested) {
        console.log("⚠️  Countdown cancelled");
        return;
      }

      console.log(`   ${i}... seconds until game starts`);
      await this.sleep(1000);
    }

    console.log("   0! Time's up!\n");
  }

  /**
   * Phase 2: Commit Entropy
   */
  private async runCommitEntropyPhase(): Promise<bigint> {
    console.log("🔒 COMMITTING ENTROPY...");

    try {
      const randomNumber = await this.entropyManager.autoCommitEntropy();
      console.log("✅ Entropy committed successfully");
      this.debugLog("Random number for reveal", randomNumber.toString());
      return randomNumber;
    } catch (error: any) {
      console.error(`❌ Failed to commit entropy: ${error.message}`);
      throw error;
    }
  }

  /**
   * Phase 3: Close Buy-ins (creates transaction between commit and reveal)
   */
  private async runCloseBuyInsPhase(): Promise<void> {
    console.log("\n🚫 CLOSING BUY-INS...");

    try {
      await this.blockchainManager.setGameState(1); // Active
      console.log("✅ Buy-ins closed, game is now Active");
    } catch (error: any) {
      console.error(`❌ Failed to close buy-ins: ${error.message}`);
      console.log("⚠️  Continuing anyway...");
    }
  }

  /**
   * Phase 4: Reveal Entropy (after transaction between commit and reveal)
   */
  private async runRevealEntropyPhase(randomNumber: bigint): Promise<void> {
    console.log("\n⏳ WAITING FOR REVEAL WINDOW...");
    console.log("   (Universe contract needs blockhash to be available - requires next block)");
    
    // Poll the contract to check when we can reveal
    const maxAttempts = 60; // Maximum 60 attempts (1 minute at 1 second intervals)
    let attempts = 0;
    let canReveal = false;
    let commitBlockNum: bigint | undefined;
    
    while (!canReveal && attempts < maxAttempts) {
      if (this.cancelRequested) {
        console.log("⚠️  Reveal wait cancelled");
        return;
      }

      try {
        const status = await this.entropyManager.checkUniverseEntropyStatus();
        const currentBlock = await this.blockchainManager.getBlockNumber();
        
        // Get commit block from contract
        const commitRevealState = (await this.blockchainManager.readContract(
          status.universeContract.address,
          status.universeContract.abi,
          "getCommitRevealState"
        )) as [boolean, bigint, boolean];
        commitBlockNum = commitRevealState[1];
        
        if (status.canReveal) {
          canReveal = true;
          console.log(`✅ Reveal window ready - commit block: ${commitBlockNum}, current block: ${currentBlock}\n`);
          break;
        }
        
        // Log status on first attempt and periodically
        if (attempts === 0 || attempts % 5 === 0) {
          console.log(`   Checking... commit block: ${commitBlockNum}, current: ${currentBlock} (attempt ${attempts + 1}/${maxAttempts})`);
        }
        
        // Wait 1 second before checking again
        await this.sleep(1000);
        attempts++;
      } catch (error: any) {
        console.error(`⚠️  Error checking reveal status: ${error.message}`);
        // Wait a bit longer on error
        await this.sleep(2000);
        attempts++;
      }
    }
    
    if (!canReveal) {
      throw new Error(`Reveal window did not become available after ${maxAttempts} attempts`);
    }

    console.log("🌌 REVEALING ENTROPY...");
    
    // Retry logic for reveal in case of timing issues
    const maxRevealAttempts = 10;
    let revealSuccess = false;
    
    for (let attempt = 1; attempt <= maxRevealAttempts && !revealSuccess; attempt++) {
      try {
        if (attempt > 1) {
          console.log(`\n🔄 Retry attempt ${attempt}/${maxRevealAttempts}...`);
          console.log("   Waiting for more blocks to pass...");
          await this.sleep(3000); // Wait 3 seconds between retries
          
          // Re-check contract state before retrying
          const status = await this.entropyManager.checkUniverseEntropyStatus();
          const currentBlock = await this.blockchainManager.getBlockNumber();
          console.log(`   Current block: ${currentBlock.toString()}, Can reveal: ${status.canReveal}`);
        } else {
          // First attempt - add safety buffer to ensure blockhash is available
          console.log("   Adding safety buffer (3 seconds) to ensure blockhash is available...");
          await this.sleep(3000);
        }
        
        await this.entropyManager.autoRevealEntropy(randomNumber);
        console.log("✅ Universe entropy revealed successfully");
        revealSuccess = true;

        // Initialize characters NOW that universe entropy is set
        if (this.initializeCharacters) {
          console.log("👥 Initializing characters with universe entropy...");
          await this.initializeCharacters();
          
          // Notify that character initialization is complete
          if (this.onCharactersInitialized) {
            console.log("✅ All pilots added - starting simulation loops...");
            this.onCharactersInitialized();
          }
        }

        // Initialize rolling commit-reveal system now that we have entropy
        console.log("🔄 Initializing rolling commit-reveal system...");
        await this.entropyManager.initializeRollingCommitReveal();
        console.log("✅ Rolling commit-reveal initialized");
      } catch (error: any) {
        // Check if it's a timing-related error (RevealTooEarly or BlockhashUnavailable)
        const isTimingError = error.message && 
          (error.message.includes("RevealTooEarly") || 
           error.message.includes("BlockhashUnavailable"));
           
        if (isTimingError) {
          if (attempt < maxRevealAttempts) {
            console.log(`⏳ Blockhash not yet available, waiting for next block (attempt ${attempt}/${maxRevealAttempts})`);
            // Continue to next retry
          } else {
            console.error(`❌ Failed to reveal after ${maxRevealAttempts} attempts: ${error.message}`);
            throw error;
          }
        } else {
          // Different error, throw immediately
          console.error(`❌ Failed to reveal entropy: ${error.message}`);
          throw error;
        }
      }
    }
  }

  /**
   * Phase 5: Game Active - Announce that game is running
   */
  private async runGameActivePhase(): Promise<void> {
    console.log("\n🎮 GAME IS NOW RUNNING!");
    console.log("📖 Use /god UI to reveal chapters as needed");
    console.log(
      "💰 Game will automatically settle and payout winners when time expires"
    );
  }

  /**
   * Handle game settlement (called by SimulationManager)
   */
  public async onGameSettled(): Promise<void> {
    console.log("\n" + "=".repeat(60));
    console.log("🏁 GAME HAS ENDED");
    console.log("=".repeat(60));
    console.log("💰 Winners have been paid out");
    console.log("⏳ Waiting for next contract deployment...\n");

    this.cycleInProgress = false;
  }
}
