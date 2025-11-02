import { Sector } from "../Sector";
import { SECTOR_CONFIG } from "../types";
import { BlockchainManager } from "./BlockchainManager";
import { EntropyManager } from "./EntropyManager";
import { CharacterManager, PilotManager } from "./CharacterManager";
import { CrowdsaleManager } from "./CrowdsaleManager";

export class SimulationManager {
  private innerLoopInterval: NodeJS.Timeout | null = null;
  private outerLoopInterval: NodeJS.Timeout | null = null;
  private debugMode: boolean;
  private characterManager: CharacterManager;
  private pilotManager: PilotManager;
  private gameSettled: boolean = false;
  private isStopped: boolean = false;
  private entropySetMessageShown: boolean = false;
  private crowdsaleManager: CrowdsaleManager;

  constructor(
    private sectors: Map<string, Sector>,
    private blockchainManager: BlockchainManager,
    private entropyManager: EntropyManager,
    private loadSectorsFromContract: () => Promise<void>,
    characterManager: CharacterManager,
    debugMode: boolean = false,
    private stopGameServer?: () => void,
    private checkContractChanges?: () => Promise<void>,
    private onGameSettled?: () => Promise<void>,
    crowdsaleManager?: CrowdsaleManager
  ) {
    this.debugMode = debugMode;
    this.characterManager = characterManager;
    this.pilotManager = new PilotManager(debugMode);
    this.crowdsaleManager = crowdsaleManager!;
  }

  private debugLog(message: string, data?: any): void {
    if (this.debugMode) {
      const timestamp = new Date().toISOString().split("T")[1].split(".")[0];
      if (data) {
        console.log(`🎮 [${timestamp}] SimulationManager - ${message}:`, data);
      } else {
        console.log(`🎮 [${timestamp}] SimulationManager - ${message}`);
      }
    }
  }

  /**
   * Start the dual simulation loops
   */
  public start(): void {
    this.debugLog("Starting dual simulation loops");
    this.debugLog(
      `Inner loop interval: ${SECTOR_CONFIG.INNER_LOOP_INTERVAL}ms`
    );
    this.debugLog(
      `Outer loop interval: ${SECTOR_CONFIG.OUTER_LOOP_INTERVAL}ms`
    );

    // Mark as running
    this.isStopped = false;

    // Start inner loop (fast operations)
    const runInnerLoop = async () => {
      await this.runInnerLoopCycle();

      // Only schedule next iteration if not stopped
      if (!this.isStopped) {
        this.innerLoopInterval = setTimeout(
          runInnerLoop,
          SECTOR_CONFIG.INNER_LOOP_INTERVAL
        );
      }
    };

    // Start outer loop (heavy operations)
    const runOuterLoop = async () => {
      await this.runOuterLoopCycle();

      // Only schedule next iteration if not stopped
      if (!this.isStopped) {
        this.outerLoopInterval = setTimeout(
          runOuterLoop,
          SECTOR_CONFIG.OUTER_LOOP_INTERVAL
        );
      }
    };

    // Start both loops
    runInnerLoop();
    runOuterLoop();
  }

  /**
   * Stop both simulation loops
   */
  public stop(): void {
    // Mark as stopped to prevent re-scheduling
    this.isStopped = true;

    if (this.innerLoopInterval) {
      clearTimeout(this.innerLoopInterval);
      this.innerLoopInterval = null;
      this.debugLog("Inner loop stopped");
    }

    if (this.outerLoopInterval) {
      clearTimeout(this.outerLoopInterval);
      this.outerLoopInterval = null;
      this.debugLog("Outer loop stopped");
    }

    console.log("🛑 Simulation loops stopped");
  }

  /**
   * Run inner loop cycle - fast operations (ship movement, mining, battles)
   */
  private async runInnerLoopCycle(): Promise<void> {
    // If stopped or game is settled, don't run inner loop
    if (this.isStopped || this.gameSettled) {
      return;
    }

    // Show a dot to indicate inner loop is running (no newline)
    process.stdout.write(".");

    this.debugLog("Running inner loop cycle");

    // Update all sectors (ship movement, mining, battles, retargeting)
    await this.updateSectorsInnerLoop();
  }

  /**
   * Run outer loop cycle - heavy operations (blockchain interactions, spawning)
   */
  private async runOuterLoopCycle(): Promise<void> {
    // If stopped, don't run outer loop
    if (this.isStopped) {
      return;
    }

    this.debugLog("Running outer loop cycle");

    // Check if game is settled - if so, stop the loops
    if (await this.checkGameSettlement()) {
      return; // Early exit - loops will be stopped
    }

    // Check for contract changes (will trigger restart if detected)
    if (this.checkContractChanges) {
      await this.checkContractChanges();
    }

    // Get and print GOD account balance
    await this.checkGodBalance();

    // Check universe entropy status periodically
    await this.checkUniverseEntropyStatus();

    // Only perform rolling commit-reveal if universe entropy is already set
    // (Don't interfere with initial entropy setup by GameCycleManager)
    const entropyStatus =
      await this.entropyManager.checkUniverseEntropyStatus();
    if (entropyStatus.isSet) {
      // Perform rolling commit-reveal for entropy generation
      await this.entropyManager.performRollingCommitReveal();
    }

    // Update all sectors with current rolling entropy BEFORE doing operations
    await this.updateSectorEntropy();

    // Reload sectors from contract periodically
    await this.loadSectorsFromContract();

    // Only update sectors if we have rolling entropy
    // (sectors need deterministic dice for spawning operations)
    const currentEntropy = this.entropyManager.getCurrentRollingEntropy();
    if (currentEntropy) {
      // Update all sectors with spawning and heavy operations
      await this.updateSectorsOuterLoop();

      // Check for new crowdsales and process active ones (Chapter 4)
      if (this.crowdsaleManager) {
        console.log("\n🎫 [OuterLoop] Running Chapter 4 crowdsale checks...");
        await this.crowdsaleManager.checkForNewCrowdsales();
        await this.crowdsaleManager.processCrowdsales();
        console.log("✅ [OuterLoop] Crowdsale checks complete\n");
      } else {
        console.log("⚠️  [OuterLoop] CrowdsaleManager not initialized");
      }
    } else {
      this.debugLog(
        "Skipping sector outer loop updates - no rolling entropy available yet"
      );
    }
  }

  /**
   * Check and display GOD account balance
   */
  private async checkGodBalance(): Promise<void> {
    try {
      const godBalance = await this.blockchainManager.getGodBalance();
      const godAddress = this.blockchainManager.getGodAccount().address;
      console.log(`👑 ${godBalance} ETH - ${godAddress}`);
    } catch (error: any) {
      console.error(
        `❌ GOD Balance Error: ${error.message || "Unknown error"}`
      );
    }
  }

  /**
   * Check universe entropy status
   */
  private async checkUniverseEntropyStatus(): Promise<void> {
    try {
      const status = await this.entropyManager.checkUniverseEntropyStatus();
      const universeAddress = status.universeContract?.address || "unknown";
      
      if (!status.isSet) {
        const entropy = await this.entropyManager.getUniverseEntropy();
        
        console.log(
          `⚠️  Universe entropy still not set - game functions limited`
        );
        console.log(`   Universe contract: ${universeAddress}`);
        console.log(`   Entropy value: ${entropy || "(not set)"}`);
        console.log(`   Commitment made: ${status.commitmentMade}`);
        console.log(`   Can reveal: ${status.canReveal}`);
      } else {
        // Only show this once per session by checking if this is first time seeing isSet=true
        if (!this.entropySetMessageShown) {
          const entropy = await this.entropyManager.getUniverseEntropy();
          console.log(`✅ Universe entropy is set`);
          console.log(`   Universe contract: ${universeAddress}`);
          console.log(`   Entropy: ${entropy?.slice(0, 20)}...`);
          this.entropySetMessageShown = true;
        }
      }
    } catch (error: any) {
      this.debugLog("Failed to check universe entropy status", error);
    }
  }

  /**
   * Update all sectors for inner loop - fast operations only
   */
  private async updateSectorsInnerLoop(): Promise<void> {
    let totalAsteroids = 0;
    let totalShips = 0;

    for (const [sectorId, sector] of Array.from(this.sectors.entries())) {
      const snapshot = sector.getSnapshot();
      const asteroidCount = Object.keys(snapshot.asteroids).length;
      const shipCount = Object.keys(snapshot.ships).length;

      totalAsteroids += asteroidCount;
      totalShips += shipCount;

      this.debugLog(
        `Inner Loop - Sector ${sectorId}: ${asteroidCount} asteroids, ${shipCount} ships`
      );

      // Only update existing entities (no spawning)
      await sector.updateInnerLoop();
    }

    this.debugLog(
      `Inner Loop - Total across all sectors: ${totalAsteroids} asteroids, ${totalShips} ships`
    );
  }

  /**
   * Update all sectors for outer loop - heavy operations including spawning
   */
  private async updateSectorsOuterLoop(): Promise<void> {
    let totalAsteroids = 0;
    let totalShips = 0;

    for (const [sectorId, sector] of Array.from(this.sectors.entries())) {
      const snapshot = sector.getSnapshot();
      const asteroidCount = Object.keys(snapshot.asteroids).length;
      const shipCount = Object.keys(snapshot.ships).length;

      totalAsteroids += asteroidCount;
      totalShips += shipCount;

      this.debugLog(
        `Outer Loop - Sector ${sectorId}: ${asteroidCount} asteroids, ${shipCount} ships`
      );

      // Full update including spawning
      await sector.updateOuterLoop();
    }

    this.debugLog(
      `Outer Loop - Total across all sectors: ${totalAsteroids} asteroids, ${totalShips} ships`
    );
  }

  /**
   * Update all sectors with current rolling entropy
   */
  private async updateSectorEntropy(): Promise<void> {
    const currentEntropy = this.entropyManager.getCurrentRollingEntropy();
    if (currentEntropy) {
      for (const sector of Array.from(this.sectors.values())) {
        sector.updateRollingEntropy(currentEntropy);
      }
    }
  }

  /**
   * Check game settlement status and handle settlement/game end
   * @returns true if game is settled (loops should stop)
   */
  private async checkGameSettlement(): Promise<boolean> {
    try {
      // If we already know the game is settled, return true
      if (this.gameSettled) {
        return true;
      }

      // Check current game state
      const gameState = await this.blockchainManager.getGameState();

      // GameState: 0 = Open, 1 = Active, 2 = Settled
      if (gameState === 2) {
        // Game is already settled
        await this.handleGameEnd();
        return true;
      }

      // Check if game can be settled
      const canSettle = await this.blockchainManager.canGameSettle();

      if (canSettle) {
        console.log("🏁 Game can be settled! Attempting to settle...");

        try {
          // Attempt to settle the game
          await this.blockchainManager.settleGame();

          // Handle game end
          await this.handleGameEnd();
          return true;
        } catch (error: any) {
          console.error(`❌ Failed to settle game: ${error.message}`);
          // Don't stop the loops if settlement failed - someone else might settle it
          return false;
        }
      }

      return false; // Game not settled, continue loops
    } catch (error: any) {
      this.debugLog("Failed to check game settlement status", error);
      return false; // Continue loops on error
    }
  }

  /**
   * Handle game end - display winners and stop loops
   */
  private async handleGameEnd(): Promise<void> {
    try {
      console.log("\n🎉 GAME HAS ENDED! 🎉");
      console.log("=".repeat(50));

      // Get winners and winning score
      const winners = await this.blockchainManager.getGameWinners();
      const winningScore = await this.blockchainManager.getWinningScore();

      if (winners.length === 0) {
        console.log("🤷 No winners found (no players participated)");
      } else if (winners.length === 1) {
        console.log(`🏆 WINNER: ${winners[0]}`);
        console.log(`📊 Winning Score: ${winningScore.toString()}`);
      } else {
        console.log(`🏆 TIE! ${winners.length} winners:`);
        winners.forEach((winner, index) => {
          console.log(`   ${index + 1}. ${winner}`);
        });
        console.log(`📊 Winning Score: ${winningScore.toString()}`);
      }

      console.log("=".repeat(50));
      console.log("🛑 Stopping game simulation...");

      // Clean up pilot ETH before shutting down
      await this.blockchainManager.cleanupPilotETH(this.characterManager);

      // Mark as settled and stop entire game server
      this.gameSettled = true;
      this.stop();

      // Notify GameCycleManager that game has settled
      if (this.onGameSettled) {
        await this.onGameSettled();
      }

      // Stop the entire game server if callback is provided
      if (this.stopGameServer) {
        console.log("🛑 Shutting down entire game server...");
        setTimeout(() => {
          this.stopGameServer!();
        }, 2000); // Give a 2 second delay to show the message
      }
    } catch (error: any) {
      console.error(`❌ Error handling game end: ${error.message}`);
      // Still mark as settled and stop loops
      this.gameSettled = true;
      this.stop();

      // Notify GameCycleManager even on error
      if (this.onGameSettled) {
        try {
          await this.onGameSettled();
        } catch (settledError: any) {
          console.error(
            `❌ Error notifying game settled: ${settledError.message}`
          );
        }
      }

      // Stop the entire game server even on error
      if (this.stopGameServer) {
        console.log("🛑 Shutting down entire game server...");
        setTimeout(() => {
          this.stopGameServer!();
        }, 2000);
      }
    }
  }

  /**
   * Get current simulation status
   */
  public getStatus(): {
    isRunning: boolean;
    innerLoopRunning: boolean;
    outerLoopRunning: boolean;
    sectorCount: number;
    innerLoopInterval: number;
    outerLoopInterval: number;
  } {
    return {
      isRunning:
        this.innerLoopInterval !== null || this.outerLoopInterval !== null,
      innerLoopRunning: this.innerLoopInterval !== null,
      outerLoopRunning: this.outerLoopInterval !== null,
      sectorCount: this.sectors.size,
      innerLoopInterval: SECTOR_CONFIG.INNER_LOOP_INTERVAL,
      outerLoopInterval: SECTOR_CONFIG.OUTER_LOOP_INTERVAL,
    };
  }

  /**
   * Get the pilot manager instance
   */
  public getPilotManager(): PilotManager {
    return this.pilotManager;
  }

  /**
   * Get the character manager instance
   */
  public getCharacterManager(): CharacterManager {
    return this.characterManager;
  }

  /**
   * Get the blockchain manager instance
   */
  public getBlockchainManager(): BlockchainManager {
    return this.blockchainManager;
  }
}
