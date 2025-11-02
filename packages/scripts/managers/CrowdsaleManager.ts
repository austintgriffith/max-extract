import { BlockchainManager } from "./BlockchainManager";
import { CharacterManager } from "./CharacterManager";
import { SECTOR_CONFIG } from "../types";
import { privateKeyToAccount } from "viem/accounts";

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
 * CrowdsaleManager handles the automated simulation of Chapter 4 fuel token crowdsales
 * 
 * Workflow:
 * 1. Detect players with audited fuel contracts (Chapter 4 visible + fuel module audited)
 * 2. Randomize pilot order for purchasing
 * 3. Process pilots in batches (5 per outer loop)
 * 4. Each pilot decides randomly whether to buy based on price
 * 5. Once 100,500 credits reached, pilots call upgrade()
 * 6. After upgrade or 3 attempts, mark crowdsale complete
 */
export class CrowdsaleManager {
  private activeCrowdsales: Map<string, PlayerCrowdsaleState> = new Map();
  private blockchainManager: BlockchainManager;
  private characterManager: CharacterManager;
  private debugMode: boolean;

  constructor(
    blockchainManager: BlockchainManager,
    characterManager: CharacterManager,
    debugMode: boolean = false
  ) {
    this.blockchainManager = blockchainManager;
    this.characterManager = characterManager;
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
   * Check all players for new crowdsales that meet Chapter 4 requirements
   */
  public async checkForNewCrowdsales(): Promise<void> {
    try {
      console.log("🔍 [Crowdsale] Checking for new crowdsales...");

      // Get all players from MaxExtract contract
      const maxExtractContract = this.blockchainManager.getContract("MaxExtract");
      if (!maxExtractContract) {
        console.log("⚠️  [Crowdsale] MaxExtract contract not found");
        return;
      }

      // Get all active sectors and their owners
      const activeSectors = await this.blockchainManager.getActiveSectors();
      console.log(`📊 [Crowdsale] Found ${activeSectors.length} active sectors`);

      for (const sectorId of activeSectors) {
        const playerAddress = await this.blockchainManager.getSectorOwner(
          sectorId.toString()
        );

        console.log(`\n🔎 [Crowdsale] Checking sector ${sectorId}...`);

        if (!playerAddress || playerAddress === "0x0000000000000000000000000000000000000000") {
          console.log(`   ❌ No player address for sector ${sectorId}`);
          continue;
        }

        console.log(`   👤 Player: ${playerAddress}`);

        // Skip if already tracking this player's crowdsale
        if (this.activeCrowdsales.has(playerAddress.toLowerCase())) {
          const state = this.activeCrowdsales.get(playerAddress.toLowerCase())!;
          if (state.isComplete) {
            console.log(`   ✅ Crowdsale already complete for player ${playerAddress.slice(0, 10)}...`);
          } else {
            console.log(`   🔄 Crowdsale already active for player ${playerAddress.slice(0, 10)}...`);
          }
          continue;
        }

        // Check if Chapter 4 is visible for this player
        console.log(`   🔍 Checking if Chapter 4 is visible...`);
        const isChapter4Visible = await this.blockchainManager.isChapter4Visible(
          playerAddress
        );
        console.log(`   📖 Chapter 4 visible: ${isChapter4Visible}`);

        if (!isChapter4Visible) {
          console.log(`   ⏭️  Skipping - Chapter 4 not visible`);
          continue;
        }

        // Get player's registry address
        console.log(`   🔍 Getting registry address...`);
        const registryAddress = await this.blockchainManager.getRegistryAddressForSector(
          sectorId.toString()
        );
        console.log(`   📋 Registry: ${registryAddress || "NOT FOUND"}`);

        if (
          !registryAddress ||
          registryAddress === "0x0000000000000000000000000000000000000000"
        ) {
          console.log(`   ⏭️  Skipping - No registry found`);
          continue;
        }

        // Check for "fuel" module in registry
        console.log(`   🔍 Checking for "fuel" module in registry...`);
        const fuelContractAddress = await this.blockchainManager.getRegistryModule(
          registryAddress,
          "fuel"
        );
        console.log(`   ⛽ Fuel contract: ${fuelContractAddress || "NOT FOUND"}`);

        if (
          !fuelContractAddress ||
          fuelContractAddress === "0x0000000000000000000000000000000000000000"
        ) {
          console.log(`   ⏭️  Skipping - No fuel module found`);
          continue;
        }

        // Check if fuel contract is audited for Chapter 4
        console.log(`   🔍 Checking audit status...`);
        const auditStatus = await this.blockchainManager.checkAuditStatus(
          fuelContractAddress
        );
        console.log(`   🔐 Audit status: ${auditStatus} (need 4 for Chapter 4)`);

        if (auditStatus !== 4) {
          console.log(`   ⏭️  Skipping - Not audited for Chapter 4`);
          continue;
        }

        // All conditions met! Initialize new crowdsale
        console.log(`   ✅ ALL CONDITIONS MET! Initializing crowdsale...`);
        await this.initializeCrowdsale(
          playerAddress,
          fuelContractAddress,
          registryAddress
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
    registryAddress: string
  ): Promise<void> {
    try {
      console.log(
        `🎫 Special token buying mode for player ${playerAddress.slice(0, 10)}...`
      );
      console.log(`   Fuel contract: ${fuelContractAddress}`);
      console.log(`   Registry: ${registryAddress}`);

      // Get fuel token price
      const pricePerToken = await this.blockchainManager.getFuelTokenPrice(
        fuelContractAddress
      );
      const priceInCredits = Number(pricePerToken) / 1e18;
      console.log(`   Price per token: ${priceInCredits.toLocaleString()} credits`);

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
      console.log(`   Price: ${priceInCredits.toLocaleString()} credits per token`);
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
      const activeCrowdsaleEntries = Array.from(this.activeCrowdsales.entries()).filter(
        ([_, state]) => !state.isComplete
      );

      if (activeCrowdsaleEntries.length === 0) {
        // Only log this occasionally to avoid spam
        if (this.activeCrowdsales.size > 0) {
          this.debugLog("All crowdsales are complete");
        }
        return;
      }

      console.log(`\n💰 [Crowdsale] Processing ${activeCrowdsaleEntries.length} active crowdsale(s)...`);

      // Process each crowdsale (one purchase attempt per crowdsale per outer loop)
      for (const [playerAddress, state] of activeCrowdsaleEntries) {
        await this.processSingleCrowdsale(playerAddress, state);
      }
    } catch (error: any) {
      console.error(`❌ [Crowdsale] Error processing crowdsales: ${error.message}`);
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
      console.log(`\n🎫 [Crowdsale] Processing player ${playerAddress.slice(0, 10)}...`);

      // Check current credit balance
      const contractBalance = await this.blockchainManager.getContractCreditBalance(
        state.fuelContractAddress
      );

      const currentCredits = Number(contractBalance) / 1e18;
      const targetCredits = Number(SECTOR_CONFIG.CROWDSALE_TARGET_CREDITS) / 1e18;

      console.log(`   💰 Current: ${currentCredits.toLocaleString()} / ${targetCredits.toLocaleString()} credits`);
      console.log(`   📦 Purchases: ${state.pilotPurchases.size} pilots have bought tokens`);

      // Check if contract has enough credits for upgrade
      if (contractBalance >= SECTOR_CONFIG.CROWDSALE_TARGET_CREDITS) {
        console.log(`   ✅ Target reached! Attempting upgrade...`);
        await this.processUpgrade(playerAddress, state);
        return;
      }

      // Target not reached - try 3 random pilot purchases
      console.log(`   🎲 Attempting purchases with 3 random pilots...`);
      for (let i = 0; i < 3; i++) {
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
      const isPilotDead = await this.blockchainManager.isPilotDead(pilotAddress);
      if (isPilotDead) {
        console.log(`   ⏭️  Selected pilot is dead, skipping purchase`);
        return;
      }

      // Get pilot character info
      const character = this.characterManager.getCharacterByAddress(pilotAddress);
      if (!character) {
        this.debugLog(`Character not found for pilot ${pilotAddress}`);
        return;
      }

      const pilotName = `${character.firstname} ${character.lastname}`;
      console.log(`   👤 Selected pilot: ${pilotName}`);

      // Generate random willingness to buy (800-1200)
      const willingness = 800 + Math.floor(Math.random() * 400);
      const priceInCredits = Number(state.pricePerToken) / 1e18;

      console.log(`   🎲 Willingness: ${willingness}, Price: ${priceInCredits}`);

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
        `   🛒 Buying ${tokensToBuy} tokens for ${Number(cost) / 1e18} credits...`
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
      await this.blockchainManager.buyFuelTokens(
        pilotAccount,
        state.fuelContractAddress,
        tokensToBuyWei
      );

      // Record purchase
      const previousPurchases = state.pilotPurchases.get(pilotAddress) || 0;
      state.pilotPurchases.set(pilotAddress, previousPurchases + tokensToBuy);

      console.log(`   ✅ Purchase successful! Pilot now owns ${previousPurchases + tokensToBuy} fuel tokens total`);
    } catch (error: any) {
      console.error(`   ⚠️  Purchase failed: ${error.message}`);
      this.debugLog("Buy error:", error);
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
      if (state.upgradeAttemptCount >= SECTOR_CONFIG.CROWDSALE_MAX_UPGRADE_ATTEMPTS) {
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
      const isPilotDead = await this.blockchainManager.isPilotDead(randomPilotAddress);
      if (isPilotDead) {
        console.log(`   ⏭️  Selected pilot is dead, will try again next loop`);
        state.upgradeAttemptCount++;
        
        if (state.upgradeAttemptCount >= SECTOR_CONFIG.CROWDSALE_MAX_UPGRADE_ATTEMPTS) {
          console.log(`   ⚠️  Max attempts reached, marking complete`);
          state.isComplete = true;
        }
        return;
      }

      const character = this.characterManager.getCharacterByAddress(
        randomPilotAddress
      );

      if (!character) {
        this.debugLog(`Character not found for upgrade caller ${randomPilotAddress}`);
        state.upgradeAttemptCount++;
        return;
      }

      const pilotName = `${character.firstname} ${character.lastname}`;

      console.log(
        `   ⬆️  Pilot ${pilotName} calling upgrade (attempt ${state.upgradeAttemptCount + 1}/${
          SECTOR_CONFIG.CROWDSALE_MAX_UPGRADE_ATTEMPTS
        })...`
      );

      // Create pilot account
      const pilotAccount = privateKeyToAccount(character.privateKey);

      // Call upgrade
      const success = await this.blockchainManager.callUpgrade(
        pilotAccount,
        state.fuelContractAddress
      );

      state.upgradeAttemptCount++;

      if (success) {
        console.log(
          `   🎉 Upgrade successful! Station upgraded to class 1`
        );
        console.log(`   💰 Pilot ${pilotName} received 500 credit bounty`);
        console.log(`   🏆 Player earned 50 points`);
        state.isComplete = true;
      } else {
        console.log(
          `   ⚠️  Upgrade attempt ${state.upgradeAttemptCount} failed`
        );

        // Mark as complete if we've hit max attempts
        if (state.upgradeAttemptCount >= SECTOR_CONFIG.CROWDSALE_MAX_UPGRADE_ATTEMPTS) {
          console.log(
            `   ⚠️  Max attempts reached, marking crowdsale as complete`
          );
          state.isComplete = true;
        }
      }
    } catch (error: any) {
      console.error(
        `   ❌ Upgrade error: ${error.message}`
      );
      this.debugLog("Upgrade processing error:", error);
      state.upgradeAttemptCount++;

      // Mark as complete if we've hit max attempts
      if (state.upgradeAttemptCount >= SECTOR_CONFIG.CROWDSALE_MAX_UPGRADE_ATTEMPTS) {
        console.log(`   ⚠️  Max attempts reached after error, marking complete`);
        state.isComplete = true;
      }
    }
  }

  /**
   * Get crowdsale state for a player (for debugging/monitoring)
   */
  public getCrowdsaleState(playerAddress: string): PlayerCrowdsaleState | undefined {
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

      const pilotAccount = privateKeyToAccount(pilotPrivateKey as `0x${string}`);

      // Check if pilot has fuel tokens
      const balance = await this.blockchainManager.getFuelTokenBalance(
        state.fuelContractAddress,
        pilotAccount.address
      );

      if (balance === 0n) {
        this.debugLog(`Pilot ${pilotAccount.address} has no fuel tokens to redeem`);
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

