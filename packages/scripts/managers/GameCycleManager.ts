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

  constructor(
    blockchainManager: BlockchainManager,
    entropyManager: EntropyManager,
    countdownSeconds: number = 10,
    debugMode: boolean = false,
    initializeCharacters?: () => Promise<void>
  ) {
    this.blockchainManager = blockchainManager;
    this.entropyManager = entropyManager;
    this.countdownSeconds = countdownSeconds;
    this.debugMode = debugMode;
    this.initializeCharacters = initializeCharacters;
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

      // Phase 1: Countdown
      await this.runCountdownPhase();
      if (this.cancelRequested) return;

      // Phase 2: Commit Entropy
      const randomNumber = await this.runCommitEntropyPhase();
      if (this.cancelRequested) return;

      // Phase 3: Close Buy-ins
      await this.runCloseBuyInsPhase();
      if (this.cancelRequested) return;

      // Phase 4: Reveal Entropy
      await this.runRevealEntropyPhase(randomNumber);
      if (this.cancelRequested) return;

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
    console.log("\n🌌 REVEALING ENTROPY...");

    try {
      await this.entropyManager.autoRevealEntropy(randomNumber);
      console.log("✅ Universe entropy revealed successfully");

      // Initialize characters NOW that universe entropy is set
      if (this.initializeCharacters) {
        console.log("👥 Initializing characters with universe entropy...");
        await this.initializeCharacters();
      }

      // Initialize rolling commit-reveal system now that we have entropy
      console.log("🔄 Initializing rolling commit-reveal system...");
      await this.entropyManager.initializeRollingCommitReveal();
      console.log("✅ Rolling commit-reveal initialized");
    } catch (error: any) {
      console.error(`❌ Failed to reveal entropy: ${error.message}`);
      throw error;
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
