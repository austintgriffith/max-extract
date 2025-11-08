// Combat death mechanics and tipping operations

import { createWalletClient, http, formatEther } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import type { BlockchainManager } from "./BlockchainManager";
import type { DeathMechanicsResult } from "./types";

export class DeathMechanicsService {
  constructor(
    private blockchainManager: BlockchainManager,
    private debugMode: boolean = false
  ) {}

  private debugLog(message: string, data?: any): void {
    if (this.debugMode) {
      const timestamp = new Date().toISOString().split("T")[1].split(".")[0];
      if (data) {
        console.log(`💀 [${timestamp}] DeathMechanics - ${message}:`, data);
      } else {
        console.log(`💀 [${timestamp}] DeathMechanics - ${message}`);
      }
    }
  }

  /**
   * Calculate tip amount based on final score
   */
  public static calculateTipAmount(finalScore: number): number {
    // Import SECTOR_CONFIG synchronously since it's a constant
    const { SECTOR_CONFIG } = require("../../types");

    if (finalScore >= SECTOR_CONFIG.TIP_SCORE_THRESHOLDS.HIGH) return 3;
    if (finalScore >= SECTOR_CONFIG.TIP_SCORE_THRESHOLDS.MEDIUM) return 2;
    if (finalScore >= SECTOR_CONFIG.TIP_SCORE_THRESHOLDS.LOW) return 1;
    return 0;
  }

  /**
   * Execute deadMansSwitch transaction when a pilot is killed
   * This marks the pilot as dead and penalizes the player
   * Then sends all remaining ETH to GOD in a separate transaction
   */
  public async executeDeadMansSwitch(
    victimPrivateKey: string,
    killerAddress: string,
    playerAddress: string
  ): Promise<DeathMechanicsResult> {
    this.debugLog(
      `Executing deadMansSwitch for victim pilot with killer ${killerAddress} and player ${playerAddress}`
    );

    try {
      const gameContract = this.blockchainManager.getContract("Game");
      if (!gameContract) {
        throw new Error("Game contract not found. Run: yarn deploy");
      }

      const config = this.blockchainManager.getConfig();
      const chain = this.blockchainManager.getChain();
      const publicClient = this.blockchainManager.getPublicClient();
      const godAccount = this.blockchainManager.getGodAccount();

      // Create wallet client for the victim pilot
      const victimAccount = privateKeyToAccount(
        victimPrivateKey as `0x${string}`
      );
      const victimWalletClient = createWalletClient({
        account: victimAccount,
        chain: chain,
        transport: http(config.rpcUrl),
      });

      // Log victim's transaction nonce before sending
      const victimNonce = await publicClient.getTransactionCount({
        address: victimAccount.address,
      });
      console.log(`📡 Victim transaction details (deadMansSwitch):`);
      console.log(`   Address: ${victimAccount.address}`);
      console.log(`   Nonce: ${victimNonce}`);
      console.log(`   Killer: ${killerAddress}`);
      console.log(`   Player: ${playerAddress}`);

      // Step 1: Execute the deadMansSwitch transaction (no ETH involved)
      const deadMansSwitchHash = await victimWalletClient.writeContract({
        address: gameContract.address as `0x${string}`,
        abi: gameContract.abi,
        functionName: "deadMansSwitch",
        args: [killerAddress, playerAddress],
        gas: BigInt(100000), // Explicit gas limit for predictable costs
        chain: chain,
      });

      this.debugLog(`DeadMansSwitch transaction sent: ${deadMansSwitchHash}`);

      // Wait for deadMansSwitch to be mined
      await this.blockchainManager.waitForTransactionReceipt(
        deadMansSwitchHash
      );
      this.debugLog(`DeadMansSwitch transaction mined`);

      // Step 2: Send all remaining ETH to GOD
      let ethTransferHash: string | null = null;
      try {
        // Get pilot's remaining balance
        const remainingBalance = await publicClient.getBalance({
          address: victimAccount.address,
        });

        // Estimate gas for the transfer
        const gasPrice = await publicClient.getGasPrice();
        const gasLimit = BigInt(21000); // Standard ETH transfer gas
        const gasCost = gasLimit * gasPrice;

        // Calculate amount to send (balance - gas cost)
        if (remainingBalance > gasCost) {
          const amountToSend = remainingBalance - gasCost;

          this.debugLog(
            `Sending ${formatEther(amountToSend)} ETH to GOD (${formatEther(
              remainingBalance
            )} - ${formatEther(gasCost)} gas)`
          );

          // Send ETH to GOD
          const godAddress = godAccount.address;
          ethTransferHash = await victimWalletClient.sendTransaction({
            to: godAddress,
            value: amountToSend,
            gas: gasLimit,
            chain: chain,
          });

          this.debugLog(`ETH transfer to GOD sent: ${ethTransferHash}`);
          await this.blockchainManager.waitForTransactionReceipt(
            ethTransferHash
          );
          this.debugLog(`ETH transfer to GOD mined`);
        } else {
          this.debugLog(
            `Pilot balance (${formatEther(
              remainingBalance
            )}) too low to send ETH after gas costs`
          );
        }
      } catch (ethError: any) {
        this.debugLog(`Failed to send ETH to GOD: ${ethError.message}`);
        // Don't throw - deadMansSwitch succeeded, ETH transfer is secondary
      }

      return { deadMansSwitchHash, slashHash: "", ethTransferHash };
    } catch (error: any) {
      this.debugLog(`Failed to execute deadMansSwitch:`, error);
      throw new Error(`DeadMansSwitch failed: ${error.message}`);
    }
  }

  /**
   * Execute deadMansSlash transaction when a pilot is killed and player has audited stake
   * This slashes the killer instead of penalizing the player
   * Reverts with explicit error messages if slashing fails
   * Then sends all remaining ETH to GOD in a separate transaction
   */
  public async executeDeadMansSlash(
    victimPrivateKey: string,
    killerAddress: string,
    playerAddress: string
  ): Promise<DeathMechanicsResult> {
    this.debugLog(
      `Executing deadMansSlash for victim pilot with killer ${killerAddress} and player ${playerAddress}`
    );

    try {
      const gameContract = this.blockchainManager.getContract("Game");
      if (!gameContract) {
        throw new Error("Game contract not found. Run: yarn deploy");
      }

      const config = this.blockchainManager.getConfig();
      const chain = this.blockchainManager.getChain();
      const publicClient = this.blockchainManager.getPublicClient();
      const godAccount = this.blockchainManager.getGodAccount();

      // Create wallet client for the victim pilot
      const victimAccount = privateKeyToAccount(
        victimPrivateKey as `0x${string}`
      );
      const victimWalletClient = createWalletClient({
        account: victimAccount,
        chain: chain,
        transport: http(config.rpcUrl),
      });

      // Log victim's transaction nonce before sending
      const victimNonce = await publicClient.getTransactionCount({
        address: victimAccount.address,
      });
      const blockNumber = await publicClient.getBlockNumber();
      const beforeTimestamp = new Date().toISOString();

      console.log(`📡 Victim transaction details (deadMansSlash):`);
      console.log(`   Address: ${victimAccount.address}`);
      console.log(`   Nonce: ${victimNonce}`);
      console.log(`   Killer: ${killerAddress}`);
      console.log(`   Player: ${playerAddress}`);
      console.log(`   Game Contract: ${gameContract.address}`);
      console.log(
        `   Calling: deadMansSlash(${killerAddress}, ${playerAddress})`
      );
      console.log(`   Block number BEFORE: ${blockNumber}`);
      console.log(`   Timestamp BEFORE: ${beforeTimestamp}`);

      // Execute the deadMansSlash transaction (will revert with reason if it fails)
      let slashHash: string;
      try {
        console.log(`⏳ Sending deadMansSlash transaction...`);
        slashHash = await victimWalletClient.writeContract({
          address: gameContract.address as `0x${string}`,
          abi: gameContract.abi,
          functionName: "deadMansSlash",
          args: [killerAddress, playerAddress],
          gas: BigInt(180000), // Optimized: removed O(n) pilot lookup + console.log, expect ~80-120k gas
          chain: chain,
        });
        const afterSendTimestamp = new Date().toISOString();
        console.log(`📤 Transaction sent: ${slashHash}`);
        console.log(`   Timestamp AFTER SEND: ${afterSendTimestamp}`);
      } catch (writeError: any) {
        // This catches simulation/estimation errors BEFORE sending transaction
        console.log(`\n🚨 SLASH TRANSACTION SIMULATION FAILED! 🚨`);
        console.log(
          `   Error: ${writeError.shortMessage || writeError.message}`
        );

        // Try to extract revert reason
        if (writeError.cause?.reason) {
          console.log(`   Revert Reason: ${writeError.cause.reason}`);
        }
        if (writeError.details) {
          console.log(`   Details: ${writeError.details}`);
        }

        throw new Error(
          `DeadMansSlash simulation failed: ${
            writeError.shortMessage || writeError.message
          }`
        );
      }

      this.debugLog(`DeadMansSlash transaction sent: ${slashHash}`);

      // Wait for transaction to be mined and CHECK STATUS
      const beforeWaitTimestamp = new Date().toISOString();
      const receipt = await this.blockchainManager.waitForTransactionReceipt(
        slashHash
      );
      const afterMinedTimestamp = new Date().toISOString();
      const afterMinedBlockNumber = await publicClient.getBlockNumber();

      // Check if transaction succeeded or reverted
      if (receipt.status === "reverted") {
        console.log(`\n🚨 SLASH TRANSACTION REVERTED! 🚨`);
        console.log(`   Transaction: ${slashHash}`);
        console.log(`   Block: ${receipt.blockNumber}`);
        console.log(`   Gas Used: ${receipt.gasUsed}`);
        console.log(`   Timestamp BEFORE WAIT: ${beforeWaitTimestamp}`);
        console.log(`   Timestamp AFTER MINED: ${afterMinedTimestamp}`);
        console.log(`   Block number AFTER: ${afterMinedBlockNumber}`);

        // Try to get the revert reason by simulating the call
        try {
          console.log(`\n🔍 Attempting to get revert reason...`);
          await publicClient.simulateContract({
            address: gameContract.address as `0x${string}`,
            abi: gameContract.abi,
            functionName: "deadMansSlash",
            args: [killerAddress, playerAddress],
            account: victimAccount.address,
          });
        } catch (simError: any) {
          console.log(
            `   Revert Reason: ${simError.shortMessage || simError.message}`
          );
          if (simError.cause?.reason) {
            console.log(`   Cause: ${simError.cause.reason}`);
          }
          if (simError.details) {
            console.log(`   Details: ${simError.details}`);
          }
        }

        throw new Error(
          `DeadMansSlash transaction reverted - likely verification failed`
        );
      }

      console.log(`\n✅ SLASH TRANSACTION SUCCEEDED`);
      console.log(`   Transaction: ${slashHash}`);
      console.log(`   Block: ${receipt.blockNumber}`);
      console.log(`   Gas Used: ${receipt.gasUsed}`);
      console.log(`   Status: ${receipt.status}`);
      console.log(`   Timestamp BEFORE WAIT: ${beforeWaitTimestamp}`);
      console.log(`   Timestamp AFTER MINED: ${afterMinedTimestamp}`);
      console.log(`   Block number AFTER: ${afterMinedBlockNumber}`);

      this.debugLog(`DeadMansSlash transaction mined successfully`);

      // Send remaining ETH to GOD (same logic as deadMansSwitch)
      let ethTransferHash: string | null = null;
      try {
        const remainingBalance = await publicClient.getBalance({
          address: victimAccount.address,
        });

        const gasPrice = await publicClient.getGasPrice();
        const gasLimit = BigInt(21000);
        const gasCost = gasLimit * gasPrice;

        if (remainingBalance > gasCost) {
          const amountToSend = remainingBalance - gasCost;

          this.debugLog(
            `Sending ${formatEther(amountToSend)} ETH to GOD (${formatEther(
              remainingBalance
            )} - ${formatEther(gasCost)} gas)`
          );

          const godAddress = godAccount.address;
          ethTransferHash = await victimWalletClient.sendTransaction({
            to: godAddress,
            value: amountToSend,
            gas: gasLimit,
            chain: chain,
          });

          this.debugLog(`ETH transfer to GOD sent: ${ethTransferHash}`);
          await this.blockchainManager.waitForTransactionReceipt(
            ethTransferHash
          );
          this.debugLog(`ETH transfer to GOD mined`);
        } else {
          this.debugLog(
            `Pilot balance (${formatEther(
              remainingBalance
            )}) too low to send ETH after gas costs`
          );
        }
      } catch (ethError: any) {
        this.debugLog(`Failed to send ETH to GOD: ${ethError.message}`);
        // Don't throw - deadMansSlash succeeded, ETH transfer is secondary
      }

      return { deadMansSwitchHash: "", slashHash, ethTransferHash };
    } catch (error: any) {
      this.debugLog(`Failed to execute deadMansSlash:`, error);
      throw new Error(`DeadMansSlash failed: ${error.message}`);
    }
  }

  /**
   * Execute a tip transaction from a pilot to a player
   */
  public async executePilotTip(
    pilotPrivateKey: string,
    playerAddress: string,
    tipAmount: number
  ): Promise<string> {
    this.debugLog(
      `Executing tip from pilot to player ${playerAddress} with amount ${tipAmount}`
    );

    try {
      const gameContract = this.blockchainManager.getContract("Game");
      if (!gameContract) {
        throw new Error("Game contract not found. Run: yarn deploy");
      }

      const config = this.blockchainManager.getConfig();
      const chain = this.blockchainManager.getChain();
      const publicClient = this.blockchainManager.getPublicClient();

      // Create a wallet client for the pilot
      const pilotAccount = privateKeyToAccount(
        pilotPrivateKey as `0x${string}`
      );
      const pilotWalletClient = createWalletClient({
        account: pilotAccount,
        chain: chain,
        transport: http(config.rpcUrl),
      });

      // Check pilot balance and top up if needed
      const { SECTOR_CONFIG } = require("../../types");
      const { parseEther } = require("viem");

      const pilotBalance = await publicClient.getBalance({
        address: pilotAccount.address,
      });
      const tipGasThreshold = parseEther(SECTOR_CONFIG.TIP_GAS_AMOUNT);

      if (pilotBalance < tipGasThreshold) {
        this.debugLog(
          `Pilot balance (${formatEther(pilotBalance)} ETH) below threshold (${
            SECTOR_CONFIG.TIP_GAS_AMOUNT
          } ETH), topping up...`
        );

        // Import PilotOperationsService methods via blockchain manager
        const pilots = (this.blockchainManager as any).pilots;
        if (pilots && pilots.fundAddresses) {
          await pilots.fundAddresses(
            [pilotAccount.address],
            SECTOR_CONFIG.CHARACTER_ETH,
            1
          );
          console.log(
            `⛽ Topped up pilot ${pilotAccount.address.slice(0, 10)}... to ${
              SECTOR_CONFIG.CHARACTER_ETH
            } ETH`
          );
        }
      }

      // Call tipPlayer function on Game contract
      const hash = await pilotWalletClient.writeContract({
        address: gameContract.address as `0x${string}`,
        abi: gameContract.abi,
        functionName: "tipPlayer",
        args: [playerAddress, tipAmount],
        chain: chain,
      });

      this.debugLog(`Tip transaction sent: ${hash}`);

      // Wait for transaction to be mined
      const receipt = await this.blockchainManager.waitForTransactionReceipt(
        hash
      );
      this.debugLog(`Tip transaction mined in block ${receipt.blockNumber}`);

      return hash;
    } catch (error: any) {
      this.debugLog(`Failed to execute tip:`, error);
      throw new Error(`Tip execution failed: ${error.message}`);
    }
  }
}
