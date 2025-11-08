import { BlockchainManager } from "./blockchain";
import { CharacterManager } from "./character";
import { SECTOR_CONFIG } from "../types";
import { privateKeyToAccount } from "viem/accounts";
import { Sector } from "../Sector";

/**
 * State tracking for a player's crowdsale
 */
interface PlayerCrowdsaleState {
  playerAddress: string;
  fuelContractAddress: string;
  pilotPurchases: Map<string, number>; // pilotAddress -> tokensBought
  upgradeAttemptCount: number; // Track how many pilots tried upgrade
  isComplete: boolean; // Mark sale as done
  pricePerToken: bigint; // Cached from contract
  registryAddress: string; // For reference
}

/**
 * CrowdsaleManager handles the automated simulation of Chapter 5 fuel token crowdsales
 *
 * Workflow:
 * 1. Detect players with audited sale contracts (Chapter 5 visible + sale module audited)
 * 2. Randomize pilot order for purchasing
 * 3. Process pilots in batches (5 per outer loop)
 * 4. Each pilot decides randomly whether to buy based on price
 * 5. Once 50,000 credits reached, pilots call upgrade()
 * 6. After upgrade or 3 attempts, mark crowdsale complete
 */
export class CrowdsaleManager {
  private activeCrowdsales: Map<string, PlayerCrowdsaleState> = new Map();
  private blockchainManager: BlockchainManager;
  private characterManager: CharacterManager;
  private sectors: Map<string, Sector>;
  private debugMode: boolean;

  constructor(
    blockchainManager: BlockchainManager,
    characterManager: CharacterManager,
    sectors: Map<string, Sector>,
    debugMode: boolean = false
  ) {
    this.blockchainManager = blockchainManager;
    this.characterManager = characterManager;
    this.sectors = sectors;
    this.debugMode = debugMode;
  }

  private debugLog(message: string, data?: any): void {
    if (this.debugMode) {
      const timestamp = new Date().toISOString().split("T")[1].split(".")[0];
      if (data) {
        console.log(`🎫 [${timestamp}] CrowdsaleManager - ${message}:`, data);
      } else {
        console.log(`🎫 [${timestamp}] CrowdsaleManager - ${message}`);
      }
    }
  }

  /**
   * Broadcast an event to all subscribers of a sector
   */
  private broadcastToSector(sectorId: string, eventData: any): void {
    const sector = this.sectors.get(sectorId);
    if (sector) {
      sector.broadcastEvent(eventData);
    } else {
      this.debugLog(
        `Cannot broadcast to sector ${sectorId} - sector not found`
      );
    }
  }

  /**
   * Find sector ID for a player address
   */
  private async findSectorIdForPlayer(
    playerAddress: string
  ): Promise<string | null> {
    try {
      // Get all active sectors and find the one owned by this player
      const activeSectors = await this.blockchainManager.getActiveSectors();
      for (const sectorId of activeSectors) {
        const owner = await this.blockchainManager.getSectorOwner(
          sectorId.toString()
        );
        if (owner && owner.toLowerCase() === playerAddress.toLowerCase()) {
          return sectorId.toString();
        }
      }
    } catch (error: any) {
      this.debugLog(`Error finding sector for player ${playerAddress}:`, error);
    }
    return null;
  }

  /**
   * Check all players for new crowdsales that meet Chapter 5 requirements
   */
  public async checkForNewCrowdsales(): Promise<void> {
    try {
      this.debugLog("Checking for new crowdsales...");

      // Get all players from MaxExtract contract
      const maxExtractContract =
        this.blockchainManager.getContract("MaxExtract");
      if (!maxExtractContract) {
        this.debugLog("MaxExtract contract not found");
        return;
      }

      // Get all active sectors and their owners
      const activeSectors = await this.blockchainManager.getActiveSectors();
      this.debugLog(`Found ${activeSectors.length} active sectors`);

      for (const sectorId of activeSectors) {
        const playerAddress = await this.blockchainManager.getSectorOwner(
          sectorId.toString()
        );

        if (
          !playerAddress ||
          playerAddress === "0x0000000000000000000000000000000000000000"
        ) {
          this.debugLog(`No player address for sector ${sectorId}`);
          continue;
        }

        // Skip if already tracking this player's crowdsale
        if (this.activeCrowdsales.has(playerAddress.toLowerCase())) {
          const state = this.activeCrowdsales.get(playerAddress.toLowerCase())!;
          this.debugLog(
            `Crowdsale ${
              state.isComplete ? "complete" : "active"
            } for player ${playerAddress.slice(0, 10)}...`
          );
          continue;
        }

        // Check if Chapter 5 is visible for this player
        const isChapter5Visible =
          await this.blockchainManager.isChapter5Visible(playerAddress);

        if (!isChapter5Visible) {
          this.debugLog(
            `Skipping sector ${sectorId
              .toString()
              .slice(0, 10)}... - Chapter 5 not visible`
          );
          continue;
        }

        // Get player's registry address
        const registryAddress =
          await this.blockchainManager.getRegistryAddressForSector(
            sectorId.toString()
          );

        if (
          !registryAddress ||
          registryAddress === "0x0000000000000000000000000000000000000000"
        ) {
          this.debugLog(
            `Skipping sector ${sectorId
              .toString()
              .slice(0, 10)}... - No registry found`
          );
          continue;
        }

        // Check for "sale" module in registry
        const fuelContractAddress =
          await this.blockchainManager.getRegistryModule(
            registryAddress,
            "sale"
          );

        if (
          !fuelContractAddress ||
          fuelContractAddress === "0x0000000000000000000000000000000000000000"
        ) {
          this.debugLog(
            `Skipping sector ${sectorId
              .toString()
              .slice(0, 10)}... - No sale module found`
          );
          continue;
        }

        // Check if sale contract is audited for Chapter 5
        const auditStatus = await this.blockchainManager.checkAuditStatus(
          fuelContractAddress
        );

        if (auditStatus !== 5) {
          this.debugLog(
            `Skipping sector ${sectorId
              .toString()
              .slice(0, 10)}... - Audit status ${auditStatus} (need 5)`
          );
          continue;
        }

        // If we get here, all conditions are met - log detailed info
        console.log(
          `\n🔎 [Crowdsale] New eligible crowdsale found for sector ${sectorId
            .toString()
            .slice(0, 10)}...`
        );
        console.log(`   👤 Player: ${playerAddress}`);
        console.log(`   📋 Registry: ${registryAddress}`);
        console.log(`   🎫 Sale contract: ${fuelContractAddress}`);
        console.log(`   🔐 Audit status: ${auditStatus}`);

        // Check if the sector has already been upgraded (station baseType > 1)
        console.log(`   🔍 Checking if sector has already been upgraded...`);
        const isUpgraded = await this.blockchainManager.isSectorUpgraded(
          sectorId.toString()
        );
        console.log(`   🏗️  Upgraded: ${isUpgraded}`);

        if (isUpgraded) {
          console.log(
            `   ⏭️  Skipping - Station already upgraded (crowdsale complete)`
          );
          // Mark as complete so we don't check again
          this.activeCrowdsales.set(playerAddress.toLowerCase(), {
            playerAddress: playerAddress.toLowerCase(),
            fuelContractAddress,
            pilotPurchases: new Map(),
            upgradeAttemptCount: 0,
            isComplete: true,
            pricePerToken: 0n,
            registryAddress,
          });
          continue;
        }

        // All conditions met! Initialize new crowdsale
        console.log(`   ✅ ALL CONDITIONS MET! Initializing crowdsale...`);
        await this.initializeCrowdsale(
          playerAddress,
          fuelContractAddress,
          registryAddress,
          sectorId.toString()
        );
      }
    } catch (error: any) {
      console.error(`❌ Error checking for new crowdsales: ${error.message}`);
      this.debugLog("Error details:", error);
    }
  }

  /**
   * Initialize a new crowdsale for a player
   */
  private async initializeCrowdsale(
    playerAddress: string,
    fuelContractAddress: string,
    registryAddress: string,
    sectorId: string
  ): Promise<void> {
    try {
      console.log(
        `🎫 Special token buying mode for player ${playerAddress.slice(
          0,
          10
        )}...`
      );
      console.log(`   Sale contract: ${fuelContractAddress}`);
      console.log(`   Registry: ${registryAddress}`);
      console.log(`   Sector ID: ${sectorId.slice(0, 10)}...`);

      // Double-check if the sector has already been upgraded
      const isUpgraded = await this.blockchainManager.isSectorUpgraded(
        sectorId
      );
      if (isUpgraded) {
        console.log(
          `   ⚠️  Sector already upgraded, marking crowdsale as complete`
        );
        this.activeCrowdsales.set(playerAddress.toLowerCase(), {
          playerAddress: playerAddress.toLowerCase(),
          fuelContractAddress,
          pilotPurchases: new Map(),
          upgradeAttemptCount: 0,
          isComplete: true,
          pricePerToken: 0n,
          registryAddress,
        });
        return;
      }

      // NOTE: Player's crowdsale contract should already be fully initialized
      // The player sets all required addresses (Game, Credits, Registry) during deployment
      // We do NOT call initialization functions here as they are owner-only on player contracts

      // Get fuel token price
      const pricePerToken = await this.blockchainManager.getFuelTokenPrice(
        fuelContractAddress
      );
      const priceInCredits = Number(pricePerToken) / 1e18;
      console.log(
        `   Price per token: ${priceInCredits.toLocaleString()} credits`
      );

      // Create crowdsale state (simplified - no pilot queue)
      const crowdsaleState: PlayerCrowdsaleState = {
        playerAddress: playerAddress.toLowerCase(),
        fuelContractAddress,
        pilotPurchases: new Map(),
        upgradeAttemptCount: 0,
        isComplete: false,
        pricePerToken,
        registryAddress,
      };

      this.activeCrowdsales.set(playerAddress.toLowerCase(), crowdsaleState);

      console.log(
        `✅ Initialized crowdsale for player ${playerAddress.slice(0, 10)}...`
      );
      console.log(
        `   Price: ${priceInCredits.toLocaleString()} credits per token`
      );
      console.log(`   Target: 50,000 credits (49,500 to game + 500 reward)`);
    } catch (error: any) {
      console.error(
        `❌ Failed to initialize crowdsale for ${playerAddress}: ${error.message}`
      );
      this.debugLog("Initialization error:", error);
    }
  }

  /**
   * Process all active crowdsales (called from outer loop)
   */
  public async processCrowdsales(): Promise<void> {
    try {
      // Filter active (non-complete) crowdsales
      const activeCrowdsaleEntries = Array.from(
        this.activeCrowdsales.entries()
      ).filter(([_, state]) => !state.isComplete);

      if (activeCrowdsaleEntries.length === 0) {
        // Only log this occasionally to avoid spam
        if (this.activeCrowdsales.size > 0) {
          this.debugLog("All crowdsales are complete");
        }
        return;
      }

      console.log(
        `\n💰 [Crowdsale] Processing ${activeCrowdsaleEntries.length} active crowdsale(s)...`
      );

      // Process each crowdsale (one purchase attempt per crowdsale per outer loop)
      for (const [playerAddress, state] of activeCrowdsaleEntries) {
        await this.processSingleCrowdsale(playerAddress, state);
      }
    } catch (error: any) {
      console.error(
        `❌ [Crowdsale] Error processing crowdsales: ${error.message}`
      );
      this.debugLog("Processing error:", error);
    }
  }

  /**
   * Process a single crowdsale (one purchase attempt per outer loop)
   */
  private async processSingleCrowdsale(
    playerAddress: string,
    state: PlayerCrowdsaleState
  ): Promise<void> {
    try {
      console.log(
        `\n🎫 [Crowdsale] Processing player ${playerAddress.slice(0, 10)}...`
      );

      // First, check if the sector has already been upgraded
      // This handles the case where the script restarts after upgrade was called
      const sectorId = await this.findSectorIdForPlayer(playerAddress);
      if (sectorId) {
        const isUpgraded = await this.blockchainManager.isSectorUpgraded(
          sectorId
        );
        if (isUpgraded) {
          console.log(
            `   ⚠️  Sector already upgraded! Marking crowdsale as complete.`
          );
          state.isComplete = true;
          return;
        }
      }

      // Check current credit balance
      const contractBalance =
        await this.blockchainManager.getContractCreditBalance(
          state.fuelContractAddress
        );

      const currentCredits = Number(contractBalance) / 1e18;
      const targetCredits =
        Number(SECTOR_CONFIG.CROWDSALE_TARGET_CREDITS) / 1e18;

      console.log(
        `   💰 Current: ${currentCredits.toLocaleString()} / ${targetCredits.toLocaleString()} credits`
      );
      console.log(
        `   📦 Purchases: ${state.pilotPurchases.size} pilots have bought tokens`
      );

      // Check if contract has enough credits for upgrade
      if (contractBalance >= SECTOR_CONFIG.CROWDSALE_TARGET_CREDITS) {
        console.log(`   ✅ Target reached! Attempting upgrade...`);
        await this.processUpgrade(playerAddress, state);
        return;
      }

      // Target not reached - try 5 random pilot purchases
      console.log(`   🎲 Attempting purchases with 5 random pilots...`);
      for (let i = 0; i < 5; i++) {
        await this.tryRandomPilotPurchase(playerAddress, state);
      }
    } catch (error: any) {
      console.error(
        `❌ Error processing crowdsale for ${playerAddress}: ${error.message}`
      );
      this.debugLog("Processing error:", error);
    }
  }

  /**
   * Try a purchase with a random living pilot
   */
  private async tryRandomPilotPurchase(
    playerAddress: string,
    state: PlayerCrowdsaleState
  ): Promise<void> {
    try {
      // Get all pilots
      const allPilots = await this.blockchainManager.getPilots();

      if (allPilots.length === 0) {
        this.debugLog("No pilots available");
        return;
      }

      // Pick a random pilot
      const randomIndex = Math.floor(Math.random() * allPilots.length);
      const pilotAddress = allPilots[randomIndex];

      // Check if pilot is dead
      const isPilotDead = await this.blockchainManager.isPilotDead(
        pilotAddress
      );
      if (isPilotDead) {
        console.log(`   ⏭️  Selected pilot is dead, skipping purchase`);
        return;
      }

      // Get pilot character info
      const character =
        this.characterManager.getCharacterByAddress(pilotAddress);
      if (!character) {
        this.debugLog(`Character not found for pilot ${pilotAddress}`);
        return;
      }

      const pilotName = `${character.firstname} ${character.lastname}`;
      console.log(`   👤 Selected pilot: ${pilotName}`);

      // Generate random willingness to buy (800-1200)
      const willingness = 800 + Math.floor(Math.random() * 400);
      const priceInCredits = Number(state.pricePerToken) / 1e18;

      console.log(
        `   🎲 Willingness: ${willingness}, Price: ${priceInCredits}`
      );

      // Decide if pilot will buy (if willingness > price, they buy)
      if (willingness <= priceInCredits) {
        console.log(`   ⏭️  Not willing to buy at this price`);
        return;
      }

      // Decide how many tokens to buy (1-9)
      const tokensToBuy = 1 + Math.floor(Math.random() * 9);
      const tokensToBuyWei = BigInt(tokensToBuy) * BigInt(10 ** 18);
      const cost = state.pricePerToken * BigInt(tokensToBuy);

      // Check if pilot has enough credits
      const pilotCredits = await this.blockchainManager.getCreditsBalance(
        pilotAddress
      );

      if (pilotCredits < cost) {
        console.log(
          `   ⏭️  Not enough credits (has: ${
            Number(pilotCredits) / 1e18
          }, needs: ${Number(cost) / 1e18})`
        );
        return;
      }

      console.log(
        `   🛒 Buying ${tokensToBuy} tokens for ${
          Number(cost) / 1e18
        } credits...`
      );

      // Create pilot account for transaction
      const pilotAccount = privateKeyToAccount(character.privateKey);

      // Step 1: Approve credits
      await this.blockchainManager.approveCreditSpend(
        pilotAccount,
        state.fuelContractAddress,
        cost
      );

      // Step 2: Buy tokens
      const buyResult = await this.blockchainManager.buyFuelTokens(
        pilotAccount,
        state.fuelContractAddress,
        tokensToBuyWei
      );

      // Get current total balance in contract
      const contractBalance =
        await this.blockchainManager.getContractCreditBalance(
          state.fuelContractAddress
        );

      // Find the sector ID to broadcast to
      const sectorId = await this.findSectorIdForPlayer(playerAddress);

      if (buyResult.success) {
        // Record purchase
        const previousPurchases = state.pilotPurchases.get(pilotAddress) || 0;
        state.pilotPurchases.set(pilotAddress, previousPurchases + tokensToBuy);

        console.log(
          `   ✅ Purchase successful! Pilot now owns ${
            previousPurchases + tokensToBuy
          } fuel tokens total`
        );

        // Broadcast success event
        if (sectorId) {
          this.broadcastToSector(sectorId, {
            type: "fuel_token_purchase",
            timestamp: Date.now(),
            data: {
              pilotAddress: pilotAddress,
              pilotName: pilotName,
              sectorId: sectorId,
              fuelContractAddress: state.fuelContractAddress,
              tokensPurchased: tokensToBuy,
              creditsCost: Number(cost) / 1e18,
              totalTokensOwned: previousPurchases + tokensToBuy,
              contractTotalCredits: Number(contractBalance) / 1e18,
              transactionHash: buyResult.txHash,
            },
          });
        }
      } else {
        console.error(`   ⚠️  Purchase failed: ${buyResult.error}`);
        if (buyResult.errorDetails) {
          console.log(`   ℹ️  ${buyResult.errorDetails}`);
        }
        this.debugLog("Buy error details:", buyResult);

        // Extract error signature
        let errorSignature = "";
        if (buyResult.error) {
          const signatureMatch = buyResult.error.match(/0x[0-9a-fA-F]{8}/);
          if (signatureMatch) {
            errorSignature = signatureMatch[0];
          }
        }

        // Broadcast failure event
        if (sectorId) {
          this.broadcastToSector(sectorId, {
            type: "fuel_token_purchase_failed",
            timestamp: Date.now(),
            data: {
              pilotAddress: pilotAddress,
              pilotName: pilotName,
              sectorId: sectorId,
              fuelContractAddress: state.fuelContractAddress,
              tokensTried: tokensToBuy,
              creditsCost: Number(cost) / 1e18,
              error: buyResult.error,
              errorDetails: buyResult.errorDetails,
              errorSignature: errorSignature,
              reason:
                buyResult.errorDetails || buyResult.error || "Purchase failed",
            },
          });
        }
      }
    } catch (error: any) {
      console.error(`   ⚠️  Purchase failed: ${error.message}`);
      this.debugLog("Buy error:", error);

      // Broadcast failure event for unexpected errors
      const sectorId = await this.findSectorIdForPlayer(playerAddress);
      if (sectorId) {
        this.broadcastToSector(sectorId, {
          type: "fuel_token_purchase_failed",
          timestamp: Date.now(),
          data: {
            pilotAddress: pilotAddress,
            pilotName: character
              ? `${character.firstname} ${character.lastname}`
              : "Unknown",
            sectorId: sectorId,
            fuelContractAddress: state.fuelContractAddress,
            error: error.message,
            reason: "Unexpected error during purchase",
          },
        });
      }
    }
  }

  /**
   * Process upgrade calls from pilots
   */
  private async processUpgrade(
    playerAddress: string,
    state: PlayerCrowdsaleState
  ): Promise<void> {
    try {
      // Check if we've already tried enough times
      if (
        state.upgradeAttemptCount >=
        SECTOR_CONFIG.CROWDSALE_MAX_UPGRADE_ATTEMPTS
      ) {
        console.log(
          `   ⚠️  Max upgrade attempts (${SECTOR_CONFIG.CROWDSALE_MAX_UPGRADE_ATTEMPTS}) reached`
        );
        state.isComplete = true;
        return;
      }

      // Get all pilots and pick a random living one
      const allPilots = await this.blockchainManager.getPilots();
      if (allPilots.length === 0) {
        console.log(`   ⚠️  No pilots available to call upgrade`);
        state.isComplete = true;
        return;
      }

      // Pick random pilot
      const randomIndex = Math.floor(Math.random() * allPilots.length);
      const randomPilotAddress = allPilots[randomIndex];

      // Check if pilot is dead
      const isPilotDead = await this.blockchainManager.isPilotDead(
        randomPilotAddress
      );
      if (isPilotDead) {
        console.log(`   ⏭️  Selected pilot is dead, will try again next loop`);
        state.upgradeAttemptCount++;

        if (
          state.upgradeAttemptCount >=
          SECTOR_CONFIG.CROWDSALE_MAX_UPGRADE_ATTEMPTS
        ) {
          console.log(`   ⚠️  Max attempts reached, marking complete`);
          state.isComplete = true;
        }
        return;
      }

      const character =
        this.characterManager.getCharacterByAddress(randomPilotAddress);

      if (!character) {
        this.debugLog(
          `Character not found for upgrade caller ${randomPilotAddress}`
        );
        state.upgradeAttemptCount++;
        return;
      }

      const pilotName = `${character.firstname} ${character.lastname}`;

      console.log(
        `   ⬆️  Pilot ${pilotName} calling upgrade (attempt ${
          state.upgradeAttemptCount + 1
        }/${SECTOR_CONFIG.CROWDSALE_MAX_UPGRADE_ATTEMPTS})...`
      );

      // Create pilot account
      const pilotAccount = privateKeyToAccount(character.privateKey);

      // Call upgrade
      const upgradeResult = await this.blockchainManager.callUpgrade(
        pilotAccount,
        state.fuelContractAddress
      );

      state.upgradeAttemptCount++;

      // Find the sector ID to broadcast to
      const sectorId = await this.findSectorIdForPlayer(playerAddress);

      if (upgradeResult.success) {
        console.log(`   🎉 Upgrade successful! Station upgraded to class 1`);
        console.log(`   💰 Pilot ${pilotName} received 500 credit bounty`);
        console.log(`   🏆 Player earned 10 points`);
        state.isComplete = true;

        // Broadcast success event
        if (sectorId) {
          this.broadcastToSector(sectorId, {
            type: "station_upgraded",
            timestamp: Date.now(),
            data: {
              pilotAddress: randomPilotAddress,
              pilotName: pilotName,
              sectorId: sectorId,
              fuelContractAddress: state.fuelContractAddress,
              newStationClass: 1,
              pilotBounty: 500,
              playerPoints: 10,
              transactionHash: upgradeResult.txHash,
            },
          });
        }
      } else {
        console.log(
          `   ⚠️  Upgrade attempt ${state.upgradeAttemptCount} failed`
        );
        if (upgradeResult.errorDetails) {
          console.log(`   ℹ️  ${upgradeResult.errorDetails}`);
        }

        // Extract error signature
        let errorSignature = "";
        if (upgradeResult.error) {
          const signatureMatch = upgradeResult.error.match(/0x[0-9a-fA-F]{8}/);
          if (signatureMatch) {
            errorSignature = signatureMatch[0];
          }
        }

        // Broadcast failure event
        if (sectorId) {
          this.broadcastToSector(sectorId, {
            type: "station_upgrade_failed",
            timestamp: Date.now(),
            data: {
              pilotAddress: randomPilotAddress,
              pilotName: pilotName,
              sectorId: sectorId,
              fuelContractAddress: state.fuelContractAddress,
              attemptNumber: state.upgradeAttemptCount,
              maxAttempts: SECTOR_CONFIG.CROWDSALE_MAX_UPGRADE_ATTEMPTS,
              error: upgradeResult.error,
              errorDetails: upgradeResult.errorDetails,
              errorSignature: errorSignature,
              reason:
                upgradeResult.errorDetails ||
                upgradeResult.error ||
                "Upgrade failed",
            },
          });
        }

        // Mark as complete if we've hit max attempts
        if (
          state.upgradeAttemptCount >=
          SECTOR_CONFIG.CROWDSALE_MAX_UPGRADE_ATTEMPTS
        ) {
          console.log(
            `   ⚠️  Max attempts reached, marking crowdsale as complete`
          );
          state.isComplete = true;
        }
      }
    } catch (error: any) {
      console.error(`   ❌ Upgrade error: ${error.message}`);
      this.debugLog("Upgrade processing error:", error);
      state.upgradeAttemptCount++;

      // Mark as complete if we've hit max attempts
      if (
        state.upgradeAttemptCount >=
        SECTOR_CONFIG.CROWDSALE_MAX_UPGRADE_ATTEMPTS
      ) {
        console.log(
          `   ⚠️  Max attempts reached after error, marking complete`
        );
        state.isComplete = true;
      }
    }
  }

  /**
   * Get crowdsale state for a player (for debugging/monitoring)
   */
  public getCrowdsaleState(
    playerAddress: string
  ): PlayerCrowdsaleState | undefined {
    return this.activeCrowdsales.get(playerAddress.toLowerCase());
  }

  /**
   * Get all active crowdsales (for debugging/monitoring)
   */
  public getAllCrowdsales(): Map<string, PlayerCrowdsaleState> {
    return this.activeCrowdsales;
  }

  /**
   * Check if a pilot owns fuel tokens from a specific player
   * Used by refueling logic to determine if pilot can redeem
   */
  public async getPilotFuelTokenBalance(
    pilotAddress: string,
    playerAddress: string
  ): Promise<bigint> {
    try {
      const state = this.activeCrowdsales.get(playerAddress.toLowerCase());
      if (!state) {
        return 0n;
      }

      return await this.blockchainManager.getFuelTokenBalance(
        state.fuelContractAddress,
        pilotAddress
      );
    } catch (error: any) {
      this.debugLog(
        `Failed to get fuel token balance for pilot ${pilotAddress}:`,
        error
      );
      return 0n;
    }
  }

  /**
   * Redeem a fuel token for refueling (called from Sector.ts)
   */
  public async redeemFuelToken(
    pilotPrivateKey: string,
    playerAddress: string
  ): Promise<boolean> {
    try {
      const state = this.activeCrowdsales.get(playerAddress.toLowerCase());
      if (!state) {
        this.debugLog(`No crowdsale found for player ${playerAddress}`);
        return false;
      }

      const pilotAccount = privateKeyToAccount(
        pilotPrivateKey as `0x${string}`
      );

      // Check if pilot has fuel tokens
      const balance = await this.blockchainManager.getFuelTokenBalance(
        state.fuelContractAddress,
        pilotAccount.address
      );

      if (balance === 0n) {
        this.debugLog(
          `Pilot ${pilotAccount.address} has no fuel tokens to redeem`
        );
        return false;
      }

      this.debugLog(
        `Redeeming fuel token for pilot ${pilotAccount.address} at player ${playerAddress} station`
      );

      await this.blockchainManager.redeemFuelToken(
        pilotAccount,
        state.fuelContractAddress
      );

      console.log(
        `🎟️  Pilot ${pilotAccount.address.slice(
          0,
          10
        )}... redeemed fuel token at station ${playerAddress.slice(0, 10)}...`
      );

      return true;
    } catch (error: any) {
      console.error(`⚠️  Failed to redeem fuel token: ${error.message}`);
      this.debugLog("Redeem error:", error);
      return false;
    }
  }
}
