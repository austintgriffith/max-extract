// Chapter 4 staking operations

import { privateKeyToAccount } from "viem/accounts";
import type { BlockchainManager } from "./BlockchainManager";
import type { StakeResult } from "./types";

export class StakingOperationsService {
  constructor(
    private blockchainManager: BlockchainManager,
    private debugMode: boolean = false
  ) {}

  private debugLog(message: string, data?: any): void {
    if (this.debugMode) {
      const timestamp = new Date().toISOString().split("T")[1].split(".")[0];
      if (data) {
        console.log(`🔒 [${timestamp}] StakingOps - ${message}:`, data);
      } else {
        console.log(`🔒 [${timestamp}] StakingOps - ${message}`);
      }
    }
  }

  /**
   * Check if a sector has staking enabled
   */
  public async canStake(sectorId: string): Promise<boolean> {
    try {
      const maxExtractContract =
        this.blockchainManager.getContract("MaxExtract");
      if (!maxExtractContract) {
        this.debugLog("MaxExtract contract not found for canStake check");
        return false;
      }

      const canStake = await this.blockchainManager.readContract(
        maxExtractContract.address,
        maxExtractContract.abi,
        "canStake",
        [BigInt(sectorId)]
      );

      this.debugLog(`Sector ${sectorId} can stake: ${canStake}`);
      return canStake as boolean;
    } catch (error: any) {
      this.debugLog(`Failed to check canStake for sector ${sectorId}:`, error);
      return false;
    }
  }

  /**
   * Decode stake error to provide user-friendly messages
   * @param error The error from the stake transaction
   * @returns Human-readable error explanation
   */
  private decodeStakeError(error: any): string {
    const errorString = error.toString() || error.message || "";

    // Check for common stake errors and provide helpful messages
    if (
      errorString.includes("Not a pilot") ||
      errorString.includes("isPilot")
    ) {
      return "Pilot is not registered in the Game contract. Contact an admin.";
    }

    if (
      errorString.includes("Sector not found") ||
      errorString.includes("registry")
    ) {
      return "This sector doesn't exist or hasn't been broadcast yet.";
    }

    if (
      errorString.includes("No stake module") ||
      errorString.includes("Failed to get stake module")
    ) {
      return "This sector doesn't have a stake module registered. Player needs to register one.";
    }

    if (
      errorString.includes("Not audited for chapter 4") ||
      errorString.includes("isAudited")
    ) {
      return "The stake module is not audited for Chapter 4. Player needs to request an audit first.";
    }

    if (
      errorString.includes("Transfer failed") ||
      errorString.includes("insufficient allowance") ||
      errorString.includes("ERC20")
    ) {
      return "Credits transfer failed. Pilot might not have enough CREDITS or approval failed.";
    }

    if (errorString.includes("Activate failed")) {
      return "Stake contract's activate() function failed. The contract may have a bug.";
    }

    if (errorString.includes("Insufficient staked balance")) {
      return "Pilot doesn't have enough staked balance to unstake.";
    }

    // Generic fallback
    return "Staking transaction reverted. The stake contract may have issues.";
  }

  /**
   * Stake pilot into a sector
   */
  public async stakePilotInSector(
    pilotAddress: string,
    privateKey: string,
    sectorId: string
  ): Promise<StakeResult> {
    try {
      const maxExtractContract =
        this.blockchainManager.getContract("MaxExtract");
      const creditsContract = this.blockchainManager.getContract("Credits");

      if (!maxExtractContract || !creditsContract) {
        return {
          success: false,
          error: "Contracts not found",
        };
      }

      const pilotAccount = privateKeyToAccount(privateKey as `0x${string}`);
      const walletClient = this.blockchainManager.getWalletClient();
      const publicClient = this.blockchainManager.getPublicClient();
      const chain = this.blockchainManager.getChain();

      // First, approve MaxExtract to spend 10k credits
      const stakeAmount = 10_000n * 10n ** 18n;

      this.debugLog(
        `Approving MaxExtract to spend ${stakeAmount} credits for pilot ${pilotAddress}`
      );

      try {
        const approveHash = await walletClient.writeContract({
          address: creditsContract.address as `0x${string}`,
          abi: creditsContract.abi,
          functionName: "approve",
          args: [maxExtractContract.address, stakeAmount],
          account: pilotAccount,
          chain: chain,
        });

        // Wait for approval
        await publicClient.waitForTransactionReceipt({
          hash: approveHash,
        });
        this.debugLog(`Approval confirmed: ${approveHash}`);
      } catch (approveError: any) {
        return {
          success: false,
          error: "Approval failed",
          errorDetails: approveError.message,
        };
      }

      // Now stake
      this.debugLog(`Staking pilot ${pilotAddress} in sector ${sectorId}`);

      const stakeHash = await walletClient.writeContract({
        address: maxExtractContract.address as `0x${string}`,
        abi: maxExtractContract.abi,
        functionName: "stake",
        args: [BigInt(sectorId)],
        account: pilotAccount,
        chain: chain,
      });

      // Wait for stake transaction
      await publicClient.waitForTransactionReceipt({ hash: stakeHash });

      this.debugLog(
        `Pilot ${pilotAddress} successfully staked in sector ${sectorId} (tx: ${stakeHash})`
      );

      return {
        success: true,
        transactionHash: stakeHash,
      };
    } catch (error: any) {
      this.debugLog(`Failed to stake pilot:`, error);

      // Capture the full error message from viem which includes detailed revert info
      const fullErrorMessage =
        error.toString() || error.message || "Staking failed";

      // Decode the error to provide user-friendly explanation
      const decodedError = this.decodeStakeError(error);

      return {
        success: false,
        error: error.shortMessage || error.message || "Staking failed",
        errorDetails: `${decodedError}\n\nTechnical details:\n${fullErrorMessage}`,
      };
    }
  }

  /**
   * Get a pilot's staked balance in MaxExtract
   * @param pilotAddress The pilot's address
   * @returns The pilot's staked balance in wei (18 decimals)
   */
  public async getPilotStakedBalance(pilotAddress: string): Promise<bigint> {
    const maxExtractContract = this.blockchainManager.getContract("MaxExtract");

    if (!maxExtractContract) {
      throw new Error("MaxExtract contract not found");
    }

    try {
      const publicClient = this.blockchainManager.getPublicClient();
      const balance = await publicClient.readContract({
        address: maxExtractContract.address as `0x${string}`,
        abi: maxExtractContract.abi,
        functionName: "stakedBalance",
        args: [pilotAddress],
      });

      return balance as bigint;
    } catch (error: any) {
      this.debugLog(`Failed to get staked balance for ${pilotAddress}:`, error);
      throw error;
    }
  }

  /**
   * Unstake pilot from a sector
   */
  public async unstakePilotFromSector(
    pilotAddress: string,
    privateKey: string,
    sectorId: string
  ): Promise<StakeResult> {
    try {
      const maxExtractContract =
        this.blockchainManager.getContract("MaxExtract");

      if (!maxExtractContract) {
        return {
          success: false,
          error: "MaxExtract contract not found",
        };
      }

      const pilotAccount = privateKeyToAccount(privateKey as `0x${string}`);
      const walletClient = this.blockchainManager.getWalletClient();
      const publicClient = this.blockchainManager.getPublicClient();
      const chain = this.blockchainManager.getChain();

      const beforeUnstakeBlock = await publicClient.getBlockNumber();
      const beforeUnstakeTimestamp = new Date().toISOString();

      this.debugLog(`Unstaking pilot ${pilotAddress} from sector ${sectorId}`);
      console.log(`🔓 UNSTAKE STARTING:`);
      console.log(`   Pilot: ${pilotAddress}`);
      console.log(`   Sector: ${sectorId}`);
      console.log(`   Block BEFORE: ${beforeUnstakeBlock}`);
      console.log(`   Timestamp BEFORE: ${beforeUnstakeTimestamp}`);

      const unstakeHash = await walletClient.writeContract({
        address: maxExtractContract.address as `0x${string}`,
        abi: maxExtractContract.abi,
        functionName: "unstake",
        args: [BigInt(sectorId)],
        account: pilotAccount,
        chain: chain,
      });

      const afterSendTimestamp = new Date().toISOString();
      console.log(`   Timestamp AFTER SEND: ${afterSendTimestamp}`);

      // Wait for unstake transaction
      await publicClient.waitForTransactionReceipt({ hash: unstakeHash });

      const afterMinedBlock = await publicClient.getBlockNumber();
      const afterMinedTimestamp = new Date().toISOString();

      this.debugLog(
        `Pilot ${pilotAddress} successfully unstaked from sector ${sectorId} (tx: ${unstakeHash})`
      );
      console.log(`   Block AFTER: ${afterMinedBlock}`);
      console.log(`   Timestamp AFTER MINED: ${afterMinedTimestamp}`);

      return {
        success: true,
        transactionHash: unstakeHash,
      };
    } catch (error: any) {
      this.debugLog(`Failed to unstake pilot:`, error);
      return {
        success: false,
        error: error.message || "Unstaking failed",
        errorDetails: error.details || error.shortMessage,
      };
    }
  }

  /**
   * Check if a player has an audited stake module for chapter 4
   */
  public async hasAuditedStakeModule(playerAddress: string): Promise<boolean> {
    try {
      const maxExtractContract =
        this.blockchainManager.getContract("MaxExtract");
      const auditorContract = this.blockchainManager.getContract("Auditor");

      if (!maxExtractContract || !auditorContract) {
        return false;
      }

      // Get player's sector
      const sectorId = await this.blockchainManager.readContract(
        maxExtractContract.address,
        maxExtractContract.abi,
        "playerToSector",
        [playerAddress]
      );

      if (!sectorId || sectorId === 0n) return false;

      // Get registry
      const registryAddress = await this.blockchainManager.readContract(
        maxExtractContract.address,
        maxExtractContract.abi,
        "sectors",
        [sectorId]
      );

      if (!registryAddress) return false;

      // Get stake module (need to read from registry)
      // Create a minimal ABI for getModule function
      const getModuleAbi = [
        {
          type: "function",
          name: "getModule",
          inputs: [{ name: "moduleName", type: "string" }],
          outputs: [{ name: "", type: "address" }],
          stateMutability: "view",
        },
      ];

      const stakeModule = await this.blockchainManager.readContract(
        registryAddress as string,
        getModuleAbi,
        "getModule",
        ["stake"]
      );

      if (
        !stakeModule ||
        stakeModule === "0x0000000000000000000000000000000000000000"
      ) {
        return false;
      }

      // Check if audited for chapter 4
      const auditStatus = await this.blockchainManager.readContract(
        auditorContract.address,
        auditorContract.abi,
        "isAudited",
        [stakeModule]
      );

      return auditStatus === 4;
    } catch (error: any) {
      this.debugLog(`Failed to check for audited stake module:`, error);
      return false;
    }
  }

  /**
   * Check if a sector has active slashing enabled
   * Active slashing requires:
   * 1. Chapter 4 is visible in the game
   * 2. Sector has an owner
   * 3. Owner has an audited stake module (audit level 4)
   */
  public async hasSectorActiveSlashing(sectorId: string): Promise<boolean> {
    try {
      console.log(`⚔️  Checking active slashing for sector ${sectorId}...`);

      // Check if Chapter 4 is visible
      const isChapter4Visible =
        await this.blockchainManager.isChapter4Visible();
      console.log(`⚔️  Chapter 4 visible: ${isChapter4Visible}`);

      if (!isChapter4Visible) {
        console.log(
          `⚔️  [Sector ${sectorId}] Active slashing: false (Chapter 4 not visible)`
        );
        return false;
      }

      // Get sector owner
      const sectorOwner = await this.blockchainManager.getSectorOwner(sectorId);
      console.log(`⚔️  Sector ${sectorId} owner: ${sectorOwner}`);

      if (
        !sectorOwner ||
        sectorOwner === "0x0000000000000000000000000000000000000000"
      ) {
        console.log(
          `⚔️  [Sector ${sectorId}] Active slashing: false (No owner)`
        );
        return false;
      }

      // Check if owner has audited stake module
      const hasAuditedStake = await this.hasAuditedStakeModule(sectorOwner);
      console.log(`⚔️  Owner has audited stake module: ${hasAuditedStake}`);

      const result = isChapter4Visible && hasAuditedStake;
      console.log(
        `⚔️  [Sector ${sectorId}] Active slashing: ${result} - ${
          result ? "aggression-based targeting enabled" : "normal targeting"
        }`
      );

      return result;
    } catch (error: any) {
      this.debugLog(`Failed to check sector active slashing:`, error);
      console.log(
        `⚔️  [Sector ${sectorId}] Active slashing check failed: ${error.message}`
      );
      return false;
    }
  }

  /**
   * Check if a sector has a valid stake contract in registry modules
   * Similar to getAboutContractInfo and getCredentialContractInfo
   */
  public async getStakeContractInfo(sectorId: string): Promise<{
    hasStakeContract: boolean;
    stakeAddress?: string;
    registryAddress?: string;
    isAudited?: boolean;
    auditedChapter?: number;
    error?: string;
  }> {
    try {
      // Get the registry address for this sector
      const maxExtractContract = this.blockchainManager.getContract("MaxExtract");
      if (!maxExtractContract) {
        return {
          hasStakeContract: false,
          error: "MaxExtract contract not found",
        };
      }

      const registryAddress = await this.blockchainManager.readContract(
        maxExtractContract.address,
        maxExtractContract.abi,
        "sectors",
        [BigInt(sectorId)]
      );

      this.debugLog(
        `Registry address for sector ${sectorId}: ${registryAddress}`
      );

      if (
        !registryAddress ||
        registryAddress === "0x0000000000000000000000000000000000000000"
      ) {
        return {
          hasStakeContract: false,
          error: "No registry found for sector",
        };
      }

      // Get the stake contract address from the registry
      const publicClient = this.blockchainManager.getPublicClient();
      
      let stakeAddress: string;
      try {
        stakeAddress = (await publicClient.readContract({
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
          args: ["stake"],
        })) as string;
      } catch (error: any) {
        this.debugLog(
          `Failed to call modules("stake") on registry ${registryAddress}:`,
          error
        );
        return {
          hasStakeContract: false,
          registryAddress: registryAddress as string,
          error: "Registry does not have modules function or stake module",
        };
      }

      this.debugLog(
        `Stake address for sector ${sectorId}: ${stakeAddress}`
      );

      if (
        !stakeAddress ||
        stakeAddress === "0x0000000000000000000000000000000000000000"
      ) {
        return {
          hasStakeContract: false,
          registryAddress: registryAddress as string,
          error: "No stake contract in registry modules",
        };
      }

      // Check if the stake contract is audited for Chapter 4
      let isAudited = false;
      let auditedChapter = 0;
      try {
        const auditorContract = this.blockchainManager.getContract("Auditor");
        if (auditorContract) {
          auditedChapter = (await publicClient.readContract({
            address: auditorContract.address as `0x${string}`,
            abi: auditorContract.abi,
            functionName: "isAudited",
            args: [stakeAddress as `0x${string}`],
          })) as number;

          // Stake is audited for Chapter 4
          isAudited = auditedChapter === 4;

          this.debugLog(
            `Audit check for stake contract ${stakeAddress}: chapter=${auditedChapter}, isChapter4=${isAudited}`
          );
        } else {
          this.debugLog("Auditor contract not found, skipping audit check");
        }
      } catch (error: any) {
        this.debugLog(
          `Failed to check audit status for stake contract ${stakeAddress}:`,
          error
        );
        // Continue without audit check - treat as not audited
      }

      // Stake contract is valid if it exists AND is audited for Chapter 4
      const hasStakeContract = isAudited;

      this.debugLog(
        `Stake contract check for sector ${sectorId}: stakeAddress="${stakeAddress}", isAudited=${isAudited}, hasStakeContract=${hasStakeContract}`
      );

      return {
        hasStakeContract,
        stakeAddress,
        registryAddress: registryAddress as string,
        isAudited,
        auditedChapter,
      };
    } catch (error: any) {
      this.debugLog(
        `Error checking stake contract for sector ${sectorId}:`,
        error
      );
      return {
        hasStakeContract: false,
        error: error.message,
      };
    }
  }
}
