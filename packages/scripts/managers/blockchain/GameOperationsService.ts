// Game state and settlement operations

import { formatEther } from "viem";
import type { BlockchainManager } from "./BlockchainManager";

export class GameOperationsService {
  constructor(
    private blockchainManager: BlockchainManager,
    private debugMode: boolean = false
  ) {}

  private debugLog(message: string, data?: any): void {
    if (this.debugMode) {
      const timestamp = new Date().toISOString().split("T")[1].split(".")[0];
      if (data) {
        console.log(`🎮 [${timestamp}] GameOps - ${message}:`, data);
      } else {
        console.log(`🎮 [${timestamp}] GameOps - ${message}`);
      }
    }
  }

  /**
   * Set the game state (Open = 0, Active = 1, Settled = 2)
   */
  public async setGameState(state: number): Promise<string> {
    try {
      const gameContract = this.blockchainManager.getContract("Game");
      if (!gameContract) {
        throw new Error("Game contract not found. Run: yarn deploy");
      }

      const stateNames = ["Open", "Active", "Settled"];
      const stateName = stateNames[state] || "Unknown";

      this.debugLog(`Setting game state to ${state} (${stateName})`);

      const hash = await this.blockchainManager.writeContract(
        gameContract.address,
        gameContract.abi,
        "setState",
        [state]
      );

      this.debugLog(`setState transaction sent: ${hash}`);

      // Wait for transaction to be mined
      const receipt = await this.blockchainManager.waitForTransactionReceipt(hash);
      this.debugLog(
        `setState transaction mined in block ${receipt.blockNumber}`
      );

      return hash;
    } catch (error: any) {
      console.error(
        `❌ Failed to set game state: ${error.shortMessage || error.message}`
      );
      this.debugLog("setState error details:", error);
      throw error;
    }
  }

  /**
   * Check if the game can be settled
   */
  public async canGameSettle(): Promise<boolean> {
    const gameContract = this.blockchainManager.getContract("Game");
    if (!gameContract) {
      throw new Error("Game contract not found. Run: yarn deploy");
    }

    return await this.blockchainManager.readContract(
      gameContract.address,
      gameContract.abi,
      "canGameSettle",
      []
    );
  }

  /**
   * Get the current game state
   */
  public async getGameState(): Promise<number> {
    const gameContract = this.blockchainManager.getContract("Game");
    if (!gameContract) {
      throw new Error("Game contract not found. Run: yarn deploy");
    }

    return await this.blockchainManager.readContract(
      gameContract.address,
      gameContract.abi,
      "state",
      []
    );
  }

  /**
   * Get game winners (only available after settlement)
   */
  public async getGameWinners(): Promise<string[]> {
    const gameContract = this.blockchainManager.getContract("Game");
    if (!gameContract) {
      throw new Error("Game contract not found. Run: yarn deploy");
    }

    return await this.blockchainManager.readContract(
      gameContract.address,
      gameContract.abi,
      "getGameWinners",
      []
    );
  }

  /**
   * Get the winning score (only available after settlement)
   */
  public async getWinningScore(): Promise<bigint> {
    const gameContract = this.blockchainManager.getContract("Game");
    if (!gameContract) {
      throw new Error("Game contract not found. Run: yarn deploy");
    }

    return await this.blockchainManager.readContract(
      gameContract.address,
      gameContract.abi,
      "winningScore",
      []
    );
  }

  /**
   * Settle the game (can be called by anyone after game end time)
   */
  public async settleGame(): Promise<string> {
    const gameContract = this.blockchainManager.getContract("Game");
    if (!gameContract) {
      throw new Error("Game contract not found. Run: yarn deploy");
    }

    console.log("🏁 Settling the game...");

    const result = await this.blockchainManager.writeContract(
      gameContract.address as `0x${string}`,
      gameContract.abi,
      "settleGame",
      []
    );

    console.log("✅ Game settled successfully!");
    return result;
  }

  /**
   * Get GOD account balance
   */
  public async getGodBalance(): Promise<string> {
    const publicClient = this.blockchainManager.getPublicClient();
    const godAccount = this.blockchainManager.getGodAccount();
    const godBalance = await publicClient.getBalance({
      address: godAccount.address,
    });
    return formatEther(godBalance);
  }

  /**
   * Get current block number
   */
  public async getBlockNumber(): Promise<bigint> {
    const publicClient = this.blockchainManager.getPublicClient();
    return await publicClient.getBlockNumber();
  }

  /**
   * Get active sectors from MaxExtract contract
   */
  public async getActiveSectors(): Promise<bigint[]> {
    const maxExtractContract = this.blockchainManager.getContract("MaxExtract");
    if (!maxExtractContract) {
      throw new Error("MaxExtract contract not found. Run: yarn deploy");
    }

    this.debugLog(
      `Calling getActiveSectors on contract: ${maxExtractContract.address}`
    );

    const publicClient = this.blockchainManager.getPublicClient();
    const activeSectors = (await publicClient.readContract({
      address: maxExtractContract.address as `0x${string}`,
      abi: maxExtractContract.abi,
      functionName: "getActiveSectors",
      args: [],
    })) as bigint[];

    this.debugLog(`Found ${activeSectors.length} active sectors from contract`);
    return activeSectors;
  }
}
