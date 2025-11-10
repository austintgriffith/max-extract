// Sector-specific contract operations

import type { BlockchainManager } from "./BlockchainManager";
import type { AboutContractInfo } from "./types";

export class SectorContractsService {
  constructor(
    private blockchainManager: BlockchainManager,
    private debugMode: boolean = false
  ) {}

  private debugLog(message: string, data?: any): void {
    if (this.debugMode) {
      const timestamp = new Date().toISOString().split("T")[1].split(".")[0];
      if (data) {
        console.log(`🏢 [${timestamp}] SectorContracts - ${message}:`, data);
      } else {
        console.log(`🏢 [${timestamp}] SectorContracts - ${message}`);
      }
    }
  }

  /**
   * Get the player address (sector owner) for a given sector ID
   */
  public async getSectorOwner(sectorId: string): Promise<string | null> {
    try {
      const maxExtractContract =
        this.blockchainManager.getContract("MaxExtract");
      if (!maxExtractContract) {
        throw new Error("MaxExtract contract not found. Run: yarn deploy");
      }

      const owner = await this.blockchainManager.readContract(
        maxExtractContract.address,
        maxExtractContract.abi,
        "sectorToOwner",
        [sectorId]
      );

      return owner as string;
    } catch (error: any) {
      this.debugLog(`Failed to get sector owner for ${sectorId}:`, error);
      return null;
    }
  }

  /**
   * Get the registry contract address for a given sector ID
   */
  public async getRegistryAddressForSector(
    sectorId: string
  ): Promise<string | null> {
    try {
      const maxExtractContract =
        this.blockchainManager.getContract("MaxExtract");
      if (!maxExtractContract) {
        throw new Error("MaxExtract contract not found. Run: yarn deploy");
      }

      const registryAddress = await this.blockchainManager.readContract(
        maxExtractContract.address,
        maxExtractContract.abi,
        "sectors",
        [sectorId]
      );

      return registryAddress as string;
    } catch (error: any) {
      this.debugLog(
        `Failed to get registry address for sector ${sectorId}:`,
        error
      );
      return null;
    }
  }

  /**
   * Get a module address from a registry contract
   */
  public async getRegistryModule(
    registryAddress: string,
    moduleKey: string
  ): Promise<string | null> {
    try {
      if (
        !registryAddress ||
        registryAddress === "0x0000000000000000000000000000000000000000"
      ) {
        return null;
      }

      this.debugLog(
        `Looking up module "${moduleKey}" from registry: ${registryAddress}`
      );

      const publicClient = this.blockchainManager.getPublicClient();

      // Call modules(moduleKey) on the registry contract
      const moduleAddress = (await publicClient.readContract({
        address: registryAddress as `0x${string}`,
        abi: [
          {
            inputs: [{ name: "key", type: "string" }],
            name: "modules",
            outputs: [{ name: "", type: "address" }],
            stateMutability: "view",
            type: "function",
          },
        ],
        functionName: "modules",
        args: [moduleKey],
      })) as string;

      // Check if module exists and is not zero address
      if (
        !moduleAddress ||
        moduleAddress === "0x0000000000000000000000000000000000000000"
      ) {
        this.debugLog(`No "${moduleKey}" module found in registry`);
        return null;
      }

      this.debugLog(`Found "${moduleKey}" module at ${moduleAddress}`);
      return moduleAddress;
    } catch (error: any) {
      this.debugLog(
        `Failed to get module "${moduleKey}" from registry ${registryAddress}:`,
        error
      );
      return null;
    }
  }

  /**
   * Check audit status of a contract
   * @returns Chapter number if audited (1-5), 0 if not audited
   */
  public async checkAuditStatus(contractAddress: string): Promise<number> {
    try {
      const auditorContract = this.blockchainManager.getContract("Auditor");
      if (!auditorContract) {
        this.debugLog("Auditor contract not found");
        return 0;
      }

      const publicClient = this.blockchainManager.getPublicClient();

      const auditedChapter = (await publicClient.readContract({
        address: auditorContract.address as `0x${string}`,
        abi: auditorContract.abi,
        functionName: "isAudited",
        args: [contractAddress as `0x${string}`],
      })) as number;

      this.debugLog(
        `Audit status for ${contractAddress}: Chapter ${auditedChapter}`
      );
      return auditedChapter;
    } catch (error: any) {
      this.debugLog(
        `Failed to check audit status for ${contractAddress}:`,
        error
      );
      return 0;
    }
  }

  /**
   * Check if a player has a valid about contract with a station name
   */
  public async getAboutContractInfo(
    sectorId: string
  ): Promise<AboutContractInfo> {
    try {
      // Get registry contract address for the sector
      const registryAddress = await this.getRegistryAddressForSector(sectorId);

      if (
        !registryAddress ||
        registryAddress === "0x0000000000000000000000000000000000000000"
      ) {
        return {
          hasAboutContract: false,
          error: "No registry contract found for sector",
        };
      }

      this.debugLog(
        `Checking about contract for sector ${sectorId}, registry: ${registryAddress}`
      );

      const publicClient = this.blockchainManager.getPublicClient();

      // Call modules("about") on the registry contract
      let aboutAddress: string;
      try {
        aboutAddress = (await publicClient.readContract({
          address: registryAddress as `0x${string}`,
          abi: [
            {
              inputs: [{ name: "name", type: "string" }],
              name: "modules",
              outputs: [{ name: "", type: "address" }],
              stateMutability: "view",
              type: "function",
            },
          ],
          functionName: "modules",
          args: ["about"],
        })) as string;
      } catch (error: any) {
        this.debugLog(
          `Failed to call modules("about") on registry ${registryAddress}:`,
          error
        );
        return {
          hasAboutContract: false,
          registryAddress,
          error: "Registry does not have modules function or about module",
        };
      }

      // Check if about contract exists and is not zero address
      if (
        !aboutAddress ||
        aboutAddress === "0x0000000000000000000000000000000000000000"
      ) {
        return {
          hasAboutContract: false,
          registryAddress,
          error: "About module not deployed or zero address",
        };
      }

      this.debugLog(
        `Found about contract at ${aboutAddress} for sector ${sectorId}`
      );

      // Call name() on the about contract
      let stationName: string;
      try {
        stationName = (await publicClient.readContract({
          address: aboutAddress as `0x${string}`,
          abi: [
            {
              inputs: [],
              name: "name",
              outputs: [{ name: "", type: "string" }],
              stateMutability: "view",
              type: "function",
            },
          ],
          functionName: "name",
        })) as string;
      } catch (error: any) {
        this.debugLog(
          `Failed to call name() on about contract ${aboutAddress}:`,
          error
        );
        return {
          hasAboutContract: false,
          registryAddress,
          aboutAddress,
          error: "About contract does not have name function",
        };
      }

      // Check if name is set and not empty
      const hasValidName = Boolean(
        stationName && stationName.trim().length > 0
      );

      // Check if the about contract has been audited for Chapter 2
      let isAudited = false;
      let auditedChapter = 0;
      try {
        const auditorContract = this.blockchainManager.getContract("Auditor");
        if (auditorContract) {
          auditedChapter = (await publicClient.readContract({
            address: auditorContract.address as `0x${string}`,
            abi: auditorContract.abi,
            functionName: "isAudited",
            args: [aboutAddress as `0x${string}`],
          })) as number;

          // Enhanced tips only for Chapter 2 about contract audits
          isAudited = auditedChapter === 2;

          this.debugLog(
            `Audit check for about contract ${aboutAddress}: chapter=${auditedChapter}, isChapter2=${isAudited}`
          );
        } else {
          this.debugLog("Auditor contract not found, skipping audit check");
        }
      } catch (error: any) {
        this.debugLog(
          `Failed to check audit status for about contract ${aboutAddress}:`,
          error
        );
        // Continue without audit check - treat as not audited
      }

      // About contract is only considered valid if it has a name AND is audited for Chapter 2
      const hasAboutContract = hasValidName && isAudited;

      this.debugLog(
        `About contract check for sector ${sectorId}: name="${stationName}", hasValidName=${hasValidName}, isAudited=${isAudited}, hasAboutContract=${hasAboutContract}`
      );

      return {
        hasAboutContract,
        // Only return station name if audited for Chapter 2
        stationName: isAudited ? stationName || "" : "",
        registryAddress,
        aboutAddress,
        isAudited,
        auditedChapter,
      };
    } catch (error: any) {
      this.debugLog(
        `Error checking about contract for sector ${sectorId}:`,
        error
      );
      return {
        hasAboutContract: false,
        error: error.message,
      };
    }
  }

  /**
   * Calculate tip amount based on final score and about contract status
   */
  public async calculateEnhancedTipAmount(
    finalScore: number,
    sectorId: string
  ): Promise<{ tipAmount: number; aboutInfo: AboutContractInfo }> {
    // Import SECTOR_CONFIG synchronously since it's a constant
    const { SECTOR_CONFIG } = require("../../types");

    // Get about contract info
    const aboutInfo = await this.getAboutContractInfo(sectorId);

    // Choose tip matrix based on about contract status
    const tipMatrix = aboutInfo.hasAboutContract
      ? SECTOR_CONFIG.TIP_AMOUNTS.ENHANCED
      : SECTOR_CONFIG.TIP_AMOUNTS.STANDARD;

    // Calculate tip amount
    let tipAmount = 0;
    if (finalScore >= SECTOR_CONFIG.TIP_SCORE_THRESHOLDS.HIGH) {
      tipAmount = tipMatrix.HIGH;
    } else if (finalScore >= SECTOR_CONFIG.TIP_SCORE_THRESHOLDS.MEDIUM) {
      tipAmount = tipMatrix.MEDIUM;
    } else if (finalScore >= SECTOR_CONFIG.TIP_SCORE_THRESHOLDS.LOW) {
      tipAmount = tipMatrix.LOW;
    }

    this.debugLog(
      `Enhanced tip calculation for sector ${sectorId}: score=${finalScore}, hasAbout=${
        aboutInfo.hasAboutContract
      }, tip=${tipAmount}${
        aboutInfo.hasAboutContract ? " (enhanced)" : " (standard)"
      }`
    );

    return { tipAmount, aboutInfo };
  }

  /**
   * Get the base type for a sector (1-6)
   */
  public async getSectorBaseType(sectorId: string): Promise<number> {
    try {
      const gameContract = this.blockchainManager.getContract("Game");
      if (!gameContract) {
        throw new Error("Game contract not found. Run: yarn deploy");
      }

      const publicClient = this.blockchainManager.getPublicClient();

      const baseType = await publicClient.readContract({
        address: gameContract.address as `0x${string}`,
        abi: gameContract.abi,
        functionName: "getSectorBaseType",
        args: [BigInt(sectorId)],
      });

      this.debugLog(`Sector ${sectorId} base type: ${baseType}`);
      return Number(baseType);
    } catch (error: any) {
      this.debugLog(`Failed to get base type for sector ${sectorId}:`, error);
      return 1; // Default to base 1 on error
    }
  }

  /**
   * Set the base type for a sector (God account only)
   */
  public async setSectorBaseType(
    sectorId: string,
    baseType: number
  ): Promise<string | null> {
    try {
      const gameContract = this.blockchainManager.getContract("Game");
      if (!gameContract) {
        throw new Error("Game contract not found. Run: yarn deploy");
      }

      this.debugLog(`Setting sector ${sectorId} base type to ${baseType}...`);

      const walletClient = this.blockchainManager.getWalletClient();
      const chain = this.blockchainManager.getChain();

      const hash = await walletClient.writeContract({
        address: gameContract.address as `0x${string}`,
        abi: gameContract.abi,
        functionName: "setSectorBaseType",
        args: [BigInt(sectorId), baseType],
        chain: chain,
      });

      console.log(
        `🏗️  Base set to ${baseType} for sector ${sectorId}: ${hash}`
      );
      await this.blockchainManager.waitForTransactionReceipt(hash);
      this.debugLog(`Base type update confirmed`);
      return hash;
    } catch (error: any) {
      this.debugLog(`Failed to set base type for sector ${sectorId}:`, error);
      return null;
    }
  }

  /**
   * Chapter 4: Check if chapter 4 is visible
   */
  public async isChapter4Visible(): Promise<boolean> {
    try {
      const gameContract = this.blockchainManager.getContract("Game");
      if (!gameContract) {
        this.debugLog("Game contract not found for chapter visibility check");
        return false;
      }

      // Get the array of visible chapters from Game contract
      const visibleChapters = (await this.blockchainManager.readContract(
        gameContract.address,
        gameContract.abi,
        "getVisibleChapters",
        []
      )) as number[];

      this.debugLog(`Visible chapters: [${visibleChapters.join(", ")}]`);

      // Check if chapter 4 is in the array
      const isVisible = visibleChapters.includes(4);

      this.debugLog(`Chapter 4 visibility: ${isVisible}`);
      return isVisible;
    } catch (error: any) {
      this.debugLog(`Failed to check chapter 4 visibility:`, error);
      return false;
    }
  }

  /**
   * Chapter 5: Check if chapter 5 is visible for a player
   */
  public async isChapter5Visible(playerAddress: string): Promise<boolean> {
    try {
      const gameContract = this.blockchainManager.getContract("Game");
      if (!gameContract) {
        this.debugLog("Game contract not found for chapter visibility check");
        return false;
      }

      // Get the array of visible chapters from Game contract
      const visibleChapters = (await this.blockchainManager.readContract(
        gameContract.address,
        gameContract.abi,
        "getVisibleChapters",
        []
      )) as number[];

      this.debugLog(`Visible chapters: [${visibleChapters.join(", ")}]`);

      // Check if chapter 5 is in the array
      const isVisible = visibleChapters.includes(5);

      this.debugLog(
        `Chapter 5 visibility for player ${playerAddress}: ${isVisible}`
      );
      return isVisible;
    } catch (error: any) {
      this.debugLog(
        `Failed to check chapter 5 visibility for ${playerAddress}:`,
        error
      );
      return false;
    }
  }

  /**
   * Chapter 5: Check if a sector has been upgraded via crowdsale
   * Returns true if the crowdsale upgrade has been called (baseType >= 5)
   * Note: Bases 1-3 are auto-managed by BaseUpgradeManager for Chapters 1-3
   * Base 4 is set when Chapter 4 staking module is in place
   * Base 5 is set when Chapter 5 crowdsale upgrade() is called
   */
  public async isSectorUpgraded(sectorId: string): Promise<boolean> {
    try {
      const gameContract = this.blockchainManager.getContract("Game");
      if (!gameContract) {
        this.debugLog("Game contract not found for sector upgrade check");
        return false;
      }

      const baseType = (await this.blockchainManager.readContract(
        gameContract.address,
        gameContract.abi,
        "getSectorBaseType",
        [BigInt(sectorId)]
      )) as number;

      console.log(
        `   🏗️  Current base type: ${baseType} (crowdsale runs if == 4, skips if >= 5)`
      );

      // baseType >= 5 means crowdsale upgrade has been called
      // baseType == 4 means ready for crowdsale (Chapter 4 complete, Chapter 5 pending)
      // (bases 1-3 are auto-managed by BaseUpgradeManager for Chapters 1-3)
      return baseType >= 5;
    } catch (error: any) {
      this.debugLog(`Failed to check sector upgrade status:`, error);
      return false;
    }
  }

  /**
   * Get the airspace class for a sector
   *
   * Airspace Class Rules:
   * - Class 0 (Base 1-2): Only ship models E, F can enter
   * - Class 1 (Base 3): Ship models D, E, F can enter
   * - Class 2 (Base 3+ with staking): Ship models B, C, D, E, F can enter
   * - Class 3 (Base 4+): All ship models A-F can enter
   */
  public async getSectorAirspaceClass(sectorId: string): Promise<number> {
    try {
      const gameContract = this.blockchainManager.getContract("Game");
      if (!gameContract) {
        this.debugLog("Game contract not found for airspace class check");
        return 0; // Default to most restrictive
      }

      // Get base type from blockchain
      const baseType = (await this.blockchainManager.readContract(
        gameContract.address,
        gameContract.abi,
        "getSectorBaseType",
        [BigInt(sectorId)]
      )) as number;

      this.debugLog(`Sector ${sectorId} base type: ${baseType}`);

      // Base 4+ = Class 3 (all ships)
      if (baseType >= 4) {
        return 3;
      }

      // Base 3 = Check if staking is active
      if (baseType === 3) {
        const hasStaking = await this.blockchainManager.canStake(sectorId);
        this.debugLog(`Sector ${sectorId} has staking: ${hasStaking}`);

        // Base 3 with staking = Class 2
        // Base 3 without staking = Class 1
        return hasStaking ? 2 : 1;
      }

      // Base 1-2 = Class 0
      return 0;
    } catch (error: any) {
      this.debugLog(
        `Failed to get airspace class for sector ${sectorId}:`,
        error
      );
      return 0; // Default to most restrictive on error
    }
  }
}
