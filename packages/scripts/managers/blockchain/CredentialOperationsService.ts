// Chapter 3 credential operations

import { privateKeyToAccount } from "viem/accounts";
import type { BlockchainManager } from "./BlockchainManager";
import type { CredentialMintResult } from "./types";
import { ContractErrorDecoder } from "./ContractErrorDecoder";

export class CredentialOperationsService {
  constructor(
    private blockchainManager: BlockchainManager,
    private debugMode: boolean = false
  ) {}

  private debugLog(message: string, data?: any): void {
    if (this.debugMode) {
      const timestamp = new Date().toISOString().split("T")[1].split(".")[0];
      if (data) {
        console.log(`🎫 [${timestamp}] CredentialOps - ${message}:`, data);
      } else {
        console.log(`🎫 [${timestamp}] CredentialOps - ${message}`);
      }
    }
  }

  /**
   * Check if a pilot has already minted a credential from a specific player
   */
  public async hasPilotMintedFromPlayer(
    pilotAddress: string,
    playerAddress: string
  ): Promise<boolean> {
    try {
      const gameContract = this.blockchainManager.getContract("Game");
      if (!gameContract) {
        throw new Error("Game contract not found. Run: yarn deploy");
      }

      const hasMinted = await this.blockchainManager.readContract(
        gameContract.address,
        gameContract.abi,
        "pilotPlayerCredentialMinted",
        [pilotAddress, playerAddress]
      );

      return hasMinted as boolean;
    } catch (error: any) {
      this.debugLog(
        `Failed to check pilotPlayerCredentialMinted for pilot ${pilotAddress} and player ${playerAddress}:`,
        error
      );
      return false; // Default to false on error to allow attempt
    }
  }

  /**
   * Get the credential contract address from a registry
   */
  public async getCredentialAddress(
    registryAddress: string
  ): Promise<string | null> {
    try {
      if (
        !registryAddress ||
        registryAddress === "0x0000000000000000000000000000000000000000"
      ) {
        return null;
      }

      this.debugLog(
        `Looking up credential contract from registry: ${registryAddress}`
      );

      const publicClient = this.blockchainManager.getPublicClient();

      // Call modules("credential") on the registry contract
      const credentialAddress = (await publicClient.readContract({
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
        args: ["credential"],
      })) as string;

      // Check if credential contract exists and is not zero address
      if (
        !credentialAddress ||
        credentialAddress === "0x0000000000000000000000000000000000000000"
      ) {
        this.debugLog(`No credential contract found in registry`);
        return null;
      }

      this.debugLog(`Found credential contract at ${credentialAddress}`);
      return credentialAddress;
    } catch (error: any) {
      this.debugLog(
        `Failed to get credential address from registry ${registryAddress}:`,
        error
      );
      return null;
    }
  }

  /**
   * Check if a pilot has a valid credential for a specific sector
   * @param pilotAddress The pilot's address
   * @param sectorId The sector ID to check
   * @returns True if the pilot has the credential (balance > 0)
   */
  public async checkPilotHasCredential(
    pilotAddress: string,
    sectorId: string
  ): Promise<boolean> {
    try {
      this.debugLog(
        `Checking if pilot ${pilotAddress} has credential for sector ${sectorId}`
      );

      // Get the sectors service to fetch registry address
      const sectors = (this.blockchainManager as any).sectors;
      if (!sectors) {
        this.debugLog("Sectors service not available");
        return false;
      }

      // Get registry address for the sector
      const registryAddress = await sectors.getRegistryAddressForSector(sectorId);

      if (
        !registryAddress ||
        registryAddress === "0x0000000000000000000000000000000000000000"
      ) {
        this.debugLog(`No registry found for sector ${sectorId}`);
        return false;
      }

      // Get credential contract address from registry
      const credentialAddress = await this.getCredentialAddress(
        registryAddress
      );

      if (
        !credentialAddress ||
        credentialAddress === "0x0000000000000000000000000000000000000000"
      ) {
        this.debugLog(
          `No credential contract found for sector ${sectorId} in registry ${registryAddress}`
        );
        return false;
      }

      this.debugLog(
        `Checking balance for pilot ${pilotAddress} in credential contract ${credentialAddress}`
      );

      const publicClient = this.blockchainManager.getPublicClient();

      // Check pilot's credential balance (ERC721 balanceOf)
      const balance = (await publicClient.readContract({
        address: credentialAddress as `0x${string}`,
        abi: [
          {
            name: "balanceOf",
            type: "function",
            stateMutability: "view",
            inputs: [{ name: "owner", type: "address" }],
            outputs: [{ name: "", type: "uint256" }],
          },
        ],
        functionName: "balanceOf",
        args: [pilotAddress as `0x${string}`],
      })) as bigint;

      const hasCredential = balance > 0n;
      this.debugLog(
        `Pilot ${pilotAddress} credential check for sector ${sectorId}: ${hasCredential} (balance: ${balance})`
      );

      return hasCredential;
    } catch (error: any) {
      this.debugLog(
        `Error checking pilot credential for sector ${sectorId}:`,
        error
      );
      return false; // Default to false on error
    }
  }

  /**
   * Attempt to mint a credential for a pilot
   * Checks if pilot already owns the credential, then mints if needed
   */
  public async attemptCredentialMint(
    pilotPrivateKey: string,
    credentialAddress: string,
    pilotAddress: string
  ): Promise<CredentialMintResult> {
    try {
      this.debugLog(
        `Attempting credential mint for pilot ${pilotAddress} from ${credentialAddress}`
      );

      // Check if credential contract is audited for Chapter 3
      const auditorContract = this.blockchainManager.getContract("Auditor");
      if (!auditorContract) {
        this.debugLog(
          "Auditor contract not found, cannot verify credential audit status"
        );
        return {
          success: false,
          error:
            "Auditor contract not found - cannot verify credential audit status",
        };
      }

      const publicClient = this.blockchainManager.getPublicClient();

      const auditedChapter = (await publicClient.readContract({
        address: auditorContract.address as `0x${string}`,
        abi: auditorContract.abi,
        functionName: "isAudited",
        args: [credentialAddress as `0x${string}`],
      })) as number;

      if (auditedChapter !== 3) {
        this.debugLog(
          `Credential contract ${credentialAddress} is not audited for Chapter 3 (auditedChapter: ${auditedChapter})`
        );
        return {
          success: false,
          error: `Credential contract must be audited for Chapter 3 before pilots can mint. Current audit status: ${
            auditedChapter === 0
              ? "not audited"
              : `audited for Chapter ${auditedChapter}`
          }`,
        };
      }

      this.debugLog(
        `Credential contract ${credentialAddress} is audited for Chapter 3 ✓`
      );

      // Check if pilot already owns the credential (ERC721 balanceOf)
      const balance = (await publicClient.readContract({
        address: credentialAddress as `0x${string}`,
        abi: [
          {
            name: "balanceOf",
            type: "function",
            stateMutability: "view",
            inputs: [{ name: "owner", type: "address" }],
            outputs: [{ name: "", type: "uint256" }],
          },
        ],
        functionName: "balanceOf",
        args: [pilotAddress as `0x${string}`],
      })) as bigint;

      if (balance > 0n) {
        this.debugLog(`Pilot already owns credential (balance: ${balance})`);
        return { success: true, alreadyOwned: true };
      }

      this.debugLog(`Pilot doesn't own credential, calling issue()...`);

      // Create wallet client for the pilot
      const pilotAccount = privateKeyToAccount(
        pilotPrivateKey as `0x${string}`
      );

      this.debugLog(
        `Created pilot account with address: ${pilotAccount.address}`
      );
      this.debugLog(`Expected pilot address: ${pilotAddress}`);

      if (pilotAccount.address.toLowerCase() !== pilotAddress.toLowerCase()) {
        throw new Error(
          `Private key mismatch! Generated address ${pilotAccount.address} doesn't match expected ${pilotAddress}`
        );
      }

      const config = this.blockchainManager.getConfig();
      const chain = this.blockchainManager.getChain();
      
      const { createWalletClient, http } = await import("viem");

      const pilotWalletClient = createWalletClient({
        account: pilotAccount,
        chain: chain,
        transport: http(config.rpcUrl),
      });

      // Double-check pilot status right before transaction
      const pilots = (this.blockchainManager as any).pilots;
      if (pilots) {
        const isPilotNow = await pilots.isPilot(pilotAddress);
        this.debugLog(`isPilot check right before transaction: ${isPilotNow}`);
        console.log(
          `🔍 Credential mint - Pilot ${pilotAddress.slice(
            0,
            10
          )}... isPilot check: ${isPilotNow}`
        );

        if (!isPilotNow) {
          throw new Error(
            `Pilot status changed! ${pilotAddress} is no longer an active pilot`
          );
        }
      }

      // Try to simulate the transaction first to catch errors before spending gas
      try {
        await publicClient.simulateContract({
          address: credentialAddress as `0x${string}`,
          abi: [
            {
              name: "issue",
              type: "function",
              stateMutability: "nonpayable",
              inputs: [],
              outputs: [],
            },
          ],
          functionName: "issue",
          account: pilotAccount.address,
        });
        console.log(
          `✅ Simulation passed for ${pilotAccount.address.slice(0, 10)}...`
        );
      } catch (simError: any) {
        const simErrorMsg = simError.shortMessage || simError.message;
        console.log(`⚠️  Simulation failed: ${simErrorMsg}`);
        this.debugLog(`Simulation error details:`, simError);

        // Decode error
        const decodedError = ContractErrorDecoder.decodeError(simError);

        // If simulation fails, don't try to execute the transaction
        return {
          success: false,
          error: `Simulation failed: ${simErrorMsg}`,
          errorDetails: decodedError || undefined,
        };
      }

      const hash = await pilotWalletClient.writeContract({
        address: credentialAddress as `0x${string}`,
        abi: [
          {
            name: "issue",
            type: "function",
            stateMutability: "nonpayable",
            inputs: [],
            outputs: [],
          },
        ],
        functionName: "issue",
        chain: chain,
      });

      this.debugLog(`Credential mint transaction sent: ${hash}`);

      // Wait for transaction to be mined
      await this.blockchainManager.waitForTransactionReceipt(hash);

      return { success: true, txHash: hash, alreadyOwned: false };
    } catch (error: any) {
      this.debugLog(`Failed to mint credential:`, error);

      // Try to decode the error for better debugging
      let errorMessage = error.shortMessage || error.message || "Unknown error";
      const decodedError = ContractErrorDecoder.decodeError(error);
      const errorDetails = decodedError || "";

      return {
        success: false,
        error: errorMessage,
        errorDetails: errorDetails || undefined,
      };
    }
  }

  /**
   * Check if a sector has a valid credential contract in registry modules
   */
  public async getCredentialContractInfo(sectorId: string): Promise<{
    hasCredentialContract: boolean;
    credentialAddress?: string;
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
          hasCredentialContract: false,
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
          hasCredentialContract: false,
          error: "No registry found for sector",
        };
      }

      // Get the credential contract address from the registry
      const credentialAddress = await this.getCredentialAddress(
        registryAddress as string
      );

      this.debugLog(
        `Credential address for sector ${sectorId}: ${credentialAddress}`
      );

      if (
        !credentialAddress ||
        credentialAddress === "0x0000000000000000000000000000000000000000"
      ) {
        return {
          hasCredentialContract: false,
          registryAddress: registryAddress as string,
          error: "No credential contract in registry modules",
        };
      }

      // Check if the credential contract is audited
      let isAudited = false;
      let auditedChapter = 0;
      try {
        const auditorContract = this.blockchainManager.getContract("Auditor");
        if (auditorContract) {
          const publicClient = this.blockchainManager.getPublicClient();
          
          auditedChapter = (await publicClient.readContract({
            address: auditorContract.address as `0x${string}`,
            abi: auditorContract.abi,
            functionName: "isAudited",
            args: [credentialAddress as `0x${string}`],
          })) as number;

          // Credential is audited for Chapter 3
          isAudited = auditedChapter === 3;

          this.debugLog(
            `Audit check for credential contract ${credentialAddress}: chapter=${auditedChapter}, isChapter3=${isAudited}`
          );
        } else {
          this.debugLog("Auditor contract not found, skipping audit check");
        }
      } catch (error: any) {
        this.debugLog(
          `Failed to check audit status for credential contract ${credentialAddress}:`,
          error
        );
        // Continue without audit check - treat as not audited
      }

      // Credential contract is valid if it exists AND is audited for Chapter 3
      const hasCredentialContract = isAudited;

      this.debugLog(
        `Credential contract check for sector ${sectorId}: credentialAddress="${credentialAddress}", isAudited=${isAudited}, hasCredentialContract=${hasCredentialContract}`
      );

      return {
        hasCredentialContract,
        credentialAddress,
        registryAddress: registryAddress as string,
        isAudited,
        auditedChapter,
      };
    } catch (error: any) {
      this.debugLog(
        `Error checking credential contract for sector ${sectorId}:`,
        error
      );
      return {
        hasCredentialContract: false,
        error: error.message,
      };
    }
  }
}

