import { Sector } from "../Sector";
import { SECTOR_CONFIG } from "../types";
import { BlockchainManager } from "./BlockchainManager";
import { EntropyManager } from "./EntropyManager";

export class SimulationManager {
  private simulationInterval: NodeJS.Timeout | null = null;
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
   * Start the main simulation loop
   */
  public start(): void {
    this.debugLog("Starting simulation loop");

    const simulate = async () => {
      await this.runSimulationCycle();

      // Schedule next update
      this.simulationInterval = setTimeout(
        simulate,
        SECTOR_CONFIG.UPDATE_INTERVAL
      );
    };

    simulate();
  }

  /**
   * Stop the simulation loop
   */
  public stop(): void {
    if (this.simulationInterval) {
      clearTimeout(this.simulationInterval);
      this.simulationInterval = null;
      this.debugLog("Simulation loop stopped");
    }
  }

  /**
   * Run a single simulation cycle
   */
  private async runSimulationCycle(): Promise<void> {
    // Get and print GOD account balance
    await this.checkGodBalance();

    // Check universe entropy status periodically
    await this.checkUniverseEntropyStatus();

    // Perform rolling commit-reveal for entropy generation
    await this.entropyManager.performRollingCommitReveal();

    // Reload sectors from contract periodically
    await this.loadSectorsFromContract();

    // Update all sectors and collect statistics
    await this.updateSectors();

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
   * Update all sectors and collect statistics
   */
  private async updateSectors(): Promise<void> {
    let totalAsteroids = 0;
    let totalShips = 0;

    for (const [sectorId, sector] of Array.from(this.sectors.entries())) {
      const snapshot = sector.getSnapshot();
      const asteroidCount = Object.keys(snapshot.asteroids).length;
      const shipCount = Object.keys(snapshot.ships).length;

      totalAsteroids += asteroidCount;
      totalShips += shipCount;

      this.debugLog(
        `Sector ${sectorId}: ${asteroidCount} asteroids, ${shipCount} ships`
      );

      sector.update();
    }

    this.debugLog(
      `Total across all sectors: ${totalAsteroids} asteroids, ${totalShips} ships`
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
    sectorCount: number;
    updateInterval: number;
  } {
    return {
      isRunning: this.simulationInterval !== null,
      sectorCount: this.sectors.size,
      updateInterval: SECTOR_CONFIG.UPDATE_INTERVAL,
    };
  }
}
