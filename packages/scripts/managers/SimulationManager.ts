import { Sector } from "../Sector";
import { SECTOR_CONFIG } from "../types";
import { BlockchainManager } from "./BlockchainManager";
import { EntropyManager } from "./EntropyManager";

export class SimulationManager {
  private innerLoopInterval: NodeJS.Timeout | null = null;
  private outerLoopInterval: NodeJS.Timeout | null = null;
  private debugMode: boolean;

  constructor(
    private sectors: Map<string, Sector>,
    private blockchainManager: BlockchainManager,
    private entropyManager: EntropyManager,
    private loadSectorsFromContract: () => Promise<void>,
    debugMode: boolean = false
  ) {
    this.debugMode = debugMode;
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

    // Start inner loop (fast operations)
    const runInnerLoop = async () => {
      await this.runInnerLoopCycle();

      // Schedule next inner loop update
      this.innerLoopInterval = setTimeout(
        runInnerLoop,
        SECTOR_CONFIG.INNER_LOOP_INTERVAL
      );
    };

    // Start outer loop (heavy operations)
    const runOuterLoop = async () => {
      await this.runOuterLoopCycle();

      // Schedule next outer loop update
      this.outerLoopInterval = setTimeout(
        runOuterLoop,
        SECTOR_CONFIG.OUTER_LOOP_INTERVAL
      );
    };

    // Start both loops
    runInnerLoop();
    runOuterLoop();
  }

  /**
   * Stop both simulation loops
   */
  public stop(): void {
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
  }

  /**
   * Run inner loop cycle - fast operations (ship movement, mining, battles)
   */
  private async runInnerLoopCycle(): Promise<void> {
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
    this.debugLog("Running outer loop cycle");

    // Get and print GOD account balance
    await this.checkGodBalance();

    // Check universe entropy status periodically
    await this.checkUniverseEntropyStatus();

    // Perform rolling commit-reveal for entropy generation
    await this.entropyManager.performRollingCommitReveal();

    // Reload sectors from contract periodically
    await this.loadSectorsFromContract();

    // Update all sectors with spawning and heavy operations
    await this.updateSectorsOuterLoop();

    // Update all sectors with current rolling entropy
    await this.updateSectorEntropy();
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
      if (!status.isSet) {
        console.log(
          "⚠️  Universe entropy still not set - game functions limited"
        );
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
      sector.updateInnerLoop();
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
      sector.updateOuterLoop();
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
}
