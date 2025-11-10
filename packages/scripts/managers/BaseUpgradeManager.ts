import { BlockchainManager } from "./blockchain";

/**
 * BaseUpgradeManager handles automatic base upgrades for bases 1-4
 * based on current module audit status.
 * 
 * Base Requirements:
 * - Base 1: Default starting base
 * - Base 2: About contract in registry modules + audited for Chapter 2
 * - Base 3: Base 2 requirements + Credential contract in registry modules + audited for Chapter 3
 * - Base 4: Base 3 requirements + Stake contract in registry modules + audited for Chapter 4
 * - Base 5: Crowdsale completed (permanent, cannot downgrade)
 * 
 * The system can upgrade AND downgrade for bases 1-3 if requirements are no longer met.
 * Base 4 can only upgrade to Base 5 (via crowdsale), not downgrade.
 * Base 5+ is permanent and never downgrades.
 */
export class BaseUpgradeManager {
  private blockchainManager: BlockchainManager;
  private debugMode: boolean;
  private lastCheckedBase: Map<string, number> = new Map(); // Cache for logging changes

  constructor(
    blockchainManager: BlockchainManager,
    debugMode: boolean = false
  ) {
    this.blockchainManager = blockchainManager;
    this.debugMode = debugMode;
  }

  private debugLog(message: string, data?: any): void {
    if (this.debugMode) {
      const timestamp = new Date().toISOString().split("T")[1].split(".")[0];
      if (data) {
        console.log(`🏗️  [${timestamp}] BaseUpgradeManager - ${message}:`, data);
      } else {
        console.log(`🏗️  [${timestamp}] BaseUpgradeManager - ${message}`);
      }
    }
  }

  /**
   * Check all sectors and update base types based on current requirements
   */
  public async checkForBaseUpgrades(): Promise<void> {
    try {
      this.debugLog("Checking for base upgrades/downgrades...");

      // Get all active sectors
      const activeSectors = await this.blockchainManager.getActiveSectors();
      this.debugLog(`Found ${activeSectors.length} active sectors`);

      for (const sectorId of activeSectors) {
        try {
          await this.checkSectorBase(sectorId.toString());
        } catch (error: any) {
          this.debugLog(
            `Error checking base for sector ${sectorId}:`,
            error.message
          );
          // Continue with next sector
        }
      }

      this.debugLog("Base check complete");
    } catch (error: any) {
      console.error(`❌ [BaseUpgradeManager] Error during base check: ${error.message}`);
      this.debugLog("Base check error details:", error);
    }
  }

  /**
   * Check and update a single sector's base type
   */
  private async checkSectorBase(sectorId: string): Promise<void> {
    // Get current base type
    const currentBase = await this.blockchainManager.getSectorBaseType(sectorId);
    
    this.debugLog(`Sector ${sectorId} current base: ${currentBase}`);

    // If base is 5+, it's permanent - never downgrade
    if (currentBase >= 5) {
      this.debugLog(`Sector ${sectorId} is at base ${currentBase} (permanent) - no changes`);
      return;
    }

    // If base is 4, only allow upgrade to 5 (via crowdsale), not downgrade
    if (currentBase >= 4) {
      this.debugLog(`Sector ${sectorId} is at base ${currentBase} - can only upgrade to 5 via crowdsale`);
      return;
    }

    // Calculate target base (1-4) from current state
    let targetBase = 1; // Start at minimum

    // Check about contract (Chapter 2)
    const aboutInfo = await this.blockchainManager.getAboutContractInfo(sectorId);
    
    this.debugLog(`Sector ${sectorId} about info:`, {
      hasAbout: aboutInfo.hasAboutContract,
      isAudited: aboutInfo.isAudited,
      chapter: aboutInfo.auditedChapter,
    });

    if (
      aboutInfo.hasAboutContract &&
      aboutInfo.isAudited &&
      aboutInfo.auditedChapter === 2
    ) {
      targetBase = 2;
      this.debugLog(`Sector ${sectorId} qualifies for base 2`);
    }

    // Check credential contract (Chapter 3) - only if base 2 requirements met
    if (targetBase >= 2) {
      const credentialInfo = await this.blockchainManager.getCredentialContractInfo(sectorId);
      
      this.debugLog(`Sector ${sectorId} credential info:`, {
        hasCredential: credentialInfo.hasCredentialContract,
        isAudited: credentialInfo.isAudited,
        chapter: credentialInfo.auditedChapter,
      });

      if (
        credentialInfo.hasCredentialContract &&
        credentialInfo.isAudited &&
        credentialInfo.auditedChapter === 3
      ) {
        targetBase = 3;
        this.debugLog(`Sector ${sectorId} qualifies for base 3`);
      }
    }

    // Check stake contract (Chapter 4) - only if base 3 requirements met
    if (targetBase >= 3) {
      const stakeInfo = await this.blockchainManager.getStakeContractInfo(sectorId);
      
      this.debugLog(`Sector ${sectorId} stake info:`, {
        hasStake: stakeInfo.hasStakeContract,
        isAudited: stakeInfo.isAudited,
        chapter: stakeInfo.auditedChapter,
      });

      if (
        stakeInfo.hasStakeContract &&
        stakeInfo.isAudited &&
        stakeInfo.auditedChapter === 4
      ) {
        targetBase = 4;
        this.debugLog(`Sector ${sectorId} qualifies for base 4`);
      }
    }

    // Update if different (handles both upgrades and downgrades)
    if (currentBase !== targetBase) {
      const lastKnown = this.lastCheckedBase.get(sectorId);
      
      // Only log if this is actually a change from what we last saw
      if (lastKnown !== targetBase) {
        if (targetBase > currentBase) {
          console.log(`⬆️  [BaseUpgrade] Sector ${sectorId}: base ${currentBase} → ${targetBase} (upgraded)`);
        } else {
          console.log(`⬇️  [BaseDowngrade] Sector ${sectorId}: base ${currentBase} → ${targetBase} (requirements no longer met)`);
        }
      }

      // Perform the update
      const hash = await this.blockchainManager.setSectorBaseType(
        sectorId,
        targetBase
      );

      if (hash) {
        this.lastCheckedBase.set(sectorId, targetBase);
        this.debugLog(`Successfully updated sector ${sectorId} to base ${targetBase}`);
      } else {
        console.error(`❌ [BaseUpgradeManager] Failed to update sector ${sectorId} to base ${targetBase}`);
      }
    } else {
      this.debugLog(`Sector ${sectorId} base ${currentBase} is correct - no change needed`);
      // Update cache even when no change to avoid repeated logging
      this.lastCheckedBase.set(sectorId, currentBase);
    }
  }
}

