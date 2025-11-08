// Chapter 5 fuel/crowdsale operations

import { createWalletClient, http } from "viem";
import type { BlockchainManager } from "./BlockchainManager";
import type { FuelPurchaseResult, UpgradeResult } from "./types";
import { ContractErrorDecoder } from "./ContractErrorDecoder";

export class FuelOperationsService {
  constructor(
    private blockchainManager: BlockchainManager,
    private debugMode: boolean = false
  ) {}

  private debugLog(message: string, data?: any): void {
    if (this.debugMode) {
      const timestamp = new Date().toISOString().split("T")[1].split(".")[0];
      if (data) {
        console.log(`⛽ [${timestamp}] FuelOps - ${message}:`, data);
      } else {
        console.log(`⛽ [${timestamp}] FuelOps - ${message}`);
      }
    }
  }

  /**
   * Get fuel token price from fuel contract
   */
  public async getFuelTokenPrice(fuelAddress: string): Promise<bigint> {
    try {
      this.debugLog(
        `Getting pricePerTokenInCredits from fuel contract: ${fuelAddress}`
      );

      const publicClient = this.blockchainManager.getPublicClient();

      const price = (await publicClient.readContract({
        address: fuelAddress as `0x${string}`,
        abi: [
          {
            name: "pricePerTokenInCredits",
            type: "function",
            stateMutability: "view",
            inputs: [],
            outputs: [{ name: "", type: "uint256" }],
          },
        ],
        functionName: "pricePerTokenInCredits",
      })) as bigint;

      this.debugLog(
        `Fuel token price: ${price} (${Number(price) / 1e18} credits)`
      );
      return price;
    } catch (error: any) {
      this.debugLog(
        `Failed to get fuel token price from ${fuelAddress}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Get fuel token balance for an address
   */
  public async getFuelTokenBalance(
    fuelAddress: string,
    holderAddress: string
  ): Promise<bigint> {
    try {
      const publicClient = this.blockchainManager.getPublicClient();

      const balance = (await publicClient.readContract({
        address: fuelAddress as `0x${string}`,
        abi: [
          {
            name: "balanceOf",
            type: "function",
            stateMutability: "view",
            inputs: [{ name: "account", type: "address" }],
            outputs: [{ name: "", type: "uint256" }],
          },
        ],
        functionName: "balanceOf",
        args: [holderAddress as `0x${string}`],
      })) as bigint;

      this.debugLog(
        `Fuel token balance for ${holderAddress}: ${balance} (${
          Number(balance) / 1e18
        } tokens)`
      );
      return balance;
    } catch (error: any) {
      this.debugLog(
        `Failed to get fuel token balance for ${holderAddress} from ${fuelAddress}:`,
        error
      );
      return 0n;
    }
  }

  /**
   * Buy fuel tokens from a pilot wallet
   */
  public async buyFuelTokens(
    fromPilot: any,
    fuelAddress: string,
    amount: bigint
  ): Promise<FuelPurchaseResult> {
    try {
      this.debugLog(
        `Buying ${
          Number(amount) / 1e18
        } fuel tokens from ${fuelAddress} as pilot ${fromPilot.address}`
      );

      const config = this.blockchainManager.getConfig();
      const chain = this.blockchainManager.getChain();

      // Create wallet client for the pilot
      const pilotWalletClient = createWalletClient({
        account: fromPilot,
        chain: chain,
        transport: http(config.rpcUrl),
      });

      const hash = await pilotWalletClient.writeContract({
        address: fuelAddress as `0x${string}`,
        abi: [
          {
            name: "buy",
            type: "function",
            stateMutability: "nonpayable",
            inputs: [{ name: "amount", type: "uint256" }],
            outputs: [],
          },
        ],
        functionName: "buy",
        args: [amount],
        account: fromPilot,
        chain: chain,
      });

      this.debugLog(`Buy fuel tokens transaction sent: ${hash}`);
      await this.blockchainManager.waitForTransactionReceipt(hash);
      this.debugLog(`Buy fuel tokens confirmed`);
      return { success: true, txHash: hash };
    } catch (error: any) {
      this.debugLog(`Failed to buy fuel tokens:`, error);

      // Decode error signature for better diagnostics
      const errorMessage =
        error.shortMessage || error.message || "Unknown error";
      const decodedError = ContractErrorDecoder.decodeError(error);

      return {
        success: false,
        error: errorMessage,
        errorDetails: decodedError || undefined,
      };
    }
  }

  /**
   * Call upgrade function on fuel contract from a pilot wallet
   */
  public async callUpgrade(
    fromPilot: any,
    fuelAddress: string
  ): Promise<UpgradeResult> {
    try {
      this.debugLog(
        `Calling upgrade() on ${fuelAddress} as pilot ${fromPilot.address}`
      );

      const config = this.blockchainManager.getConfig();
      const chain = this.blockchainManager.getChain();

      // Create wallet client for the pilot
      const pilotWalletClient = createWalletClient({
        account: fromPilot,
        chain: chain,
        transport: http(config.rpcUrl),
      });

      const hash = await pilotWalletClient.writeContract({
        address: fuelAddress as `0x${string}`,
        abi: [
          {
            name: "upgrade",
            type: "function",
            stateMutability: "nonpayable",
            inputs: [],
            outputs: [],
          },
        ],
        functionName: "upgrade",
        account: fromPilot,
        chain: chain,
      });

      this.debugLog(`Upgrade transaction sent: ${hash}`);
      await this.blockchainManager.waitForTransactionReceipt(hash);
      this.debugLog(`Upgrade confirmed successfully`);
      return { success: true, txHash: hash };
    } catch (error: any) {
      this.debugLog(`Upgrade call failed:`, error);

      // Decode error signature for better diagnostics
      const errorMessage =
        error.shortMessage || error.message || "Unknown error";
      const decodedError = ContractErrorDecoder.decodeError(error);

      return {
        success: false,
        error: errorMessage,
        errorDetails: decodedError || undefined,
      };
    }
  }

  /**
   * Redeem fuel token from a pilot wallet
   */
  public async redeemFuelToken(
    fromPilot: any,
    fuelAddress: string
  ): Promise<void> {
    try {
      this.debugLog(
        `Redeeming fuel token from ${fuelAddress} as pilot ${fromPilot.address}`
      );

      const config = this.blockchainManager.getConfig();
      const chain = this.blockchainManager.getChain();

      // Create wallet client for the pilot
      const pilotWalletClient = createWalletClient({
        account: fromPilot,
        chain: chain,
        transport: http(config.rpcUrl),
      });

      const hash = await pilotWalletClient.writeContract({
        address: fuelAddress as `0x${string}`,
        abi: [
          {
            name: "redeem",
            type: "function",
            stateMutability: "nonpayable",
            inputs: [],
            outputs: [],
          },
        ],
        functionName: "redeem",
        account: fromPilot,
        chain: chain,
      });

      this.debugLog(`Redeem fuel token transaction sent: ${hash}`);
      await this.blockchainManager.waitForTransactionReceipt(hash);
      this.debugLog(`Redeem fuel token confirmed`);
    } catch (error: any) {
      this.debugLog(`Failed to redeem fuel token:`, error);
      throw error;
    }
  }
}

