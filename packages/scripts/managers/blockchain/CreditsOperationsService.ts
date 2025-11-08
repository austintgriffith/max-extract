// Credits token operations

import { createWalletClient, http } from "viem";
import type { BlockchainManager } from "./BlockchainManager";

export class CreditsOperationsService {
  constructor(
    private blockchainManager: BlockchainManager,
    private debugMode: boolean = false
  ) {}

  private debugLog(message: string, data?: any): void {
    if (this.debugMode) {
      const timestamp = new Date().toISOString().split("T")[1].split(".")[0];
      if (data) {
        console.log(`💰 [${timestamp}] CreditsOps - ${message}:`, data);
      } else {
        console.log(`💰 [${timestamp}] CreditsOps - ${message}`);
      }
    }
  }

  /**
   * Get the CREDITS token balance of an address
   * @param address Address to check balance for
   * @returns Balance in wei (with 18 decimals)
   */
  public async getCreditsBalance(address: string): Promise<bigint> {
    const creditsContract = this.blockchainManager.getContract("Credits");
    if (!creditsContract) {
      throw new Error("Credits contract not found. Run: yarn deploy");
    }

    return await this.blockchainManager.readContract(
      creditsContract.address,
      creditsContract.abi,
      "balanceOf",
      [address]
    );
  }

  /**
   * Get all pilots with their CREDITS balances in one batch call
   * @returns Object containing pilots with addresses and CREDITS balances
   */
  public async getAllPilotsWithCredits(): Promise<{
    pilots: Array<{
      address: string;
      creditsBalance: string;
    }>;
  }> {
    try {
      const gameContract = this.blockchainManager.getContract("Game");
      if (!gameContract) {
        throw new Error("Game contract not found. Run: yarn deploy");
      }

      const result = (await this.blockchainManager.readContract(
        gameContract.address,
        gameContract.abi,
        "getAllPilotsWithCredits"
      )) as [string[], bigint[]];

      const [addresses, balances] = result;

      const pilots = addresses.map((address, index) => ({
        address,
        creditsBalance: (Number(balances[index]) / 1e18).toString(),
      }));

      return { pilots };
    } catch (error: any) {
      console.error("Failed to get pilots with credits:", error);
      return { pilots: [] };
    }
  }

  /**
   * Mint CREDITS tokens to an address (only GOD can call)
   * @param to Address to mint credits to
   * @param amount Amount to mint in wei (with 18 decimals)
   */
  public async mintCredits(to: string, amount: bigint): Promise<void> {
    const creditsContract = this.blockchainManager.getContract("Credits");
    if (!creditsContract) {
      throw new Error("Credits contract not found. Run: yarn deploy");
    }

    this.debugLog(`Minting ${amount} credits to ${to.slice(0, 10)}...`);

    const hash = await this.blockchainManager.writeContract(
      creditsContract.address,
      creditsContract.abi,
      "mint",
      [to, amount]
    );

    this.debugLog(`Credits minted, transaction: ${hash}`);
  }

  /**
   * Batch mint CREDITS tokens to multiple addresses (only GOD can call)
   * @param recipients Array of addresses to mint credits to
   * @param amounts Array of amounts to mint in wei (with 18 decimals)
   */
  public async batchMintCredits(
    recipients: string[],
    amounts: bigint[]
  ): Promise<void> {
    const creditsContract = this.blockchainManager.getContract("Credits");
    if (!creditsContract) {
      throw new Error("Credits contract not found. Run: yarn deploy");
    }

    if (recipients.length !== amounts.length) {
      throw new Error(
        "Recipients and amounts arrays must have the same length"
      );
    }

    if (recipients.length === 0) {
      this.debugLog("No recipients to mint credits to");
      return;
    }

    this.debugLog(`Batch minting credits to ${recipients.length} addresses...`);

    const hash = await this.blockchainManager.writeContract(
      creditsContract.address,
      creditsContract.abi,
      "batchMint",
      [recipients, amounts]
    );

    this.debugLog(
      `Credits batch minted to ${recipients.length} addresses, transaction: ${hash}`
    );
  }

  /**
   * Get a pilot's CREDITS balance
   * @param pilotAddress The pilot's address
   * @returns The pilot's credits balance in wei (18 decimals)
   */
  public async getPilotCreditsBalance(pilotAddress: string): Promise<bigint> {
    const creditsContract = this.blockchainManager.getContract("Credits");

    if (!creditsContract) {
      throw new Error("Credits contract not found");
    }

    try {
      const publicClient = this.blockchainManager.getPublicClient();
      const balance = await publicClient.readContract({
        address: creditsContract.address as `0x${string}`,
        abi: creditsContract.abi,
        functionName: "balanceOf",
        args: [pilotAddress],
      });

      return balance as bigint;
    } catch (error: any) {
      this.debugLog(
        `Failed to get credits balance for ${pilotAddress}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Get credit balance of a contract
   */
  public async getContractCreditBalance(
    contractAddress: string
  ): Promise<bigint> {
    try {
      const creditsContract = this.blockchainManager.getContract("Credits");
      if (!creditsContract) {
        throw new Error("Credits contract not found");
      }

      const balance = await this.blockchainManager.readContract(
        creditsContract.address,
        creditsContract.abi,
        "balanceOf",
        [contractAddress]
      );

      this.debugLog(
        `Contract ${contractAddress} credit balance: ${balance} (${
          Number(balance) / 1e18
        } credits)`
      );
      return balance as bigint;
    } catch (error: any) {
      this.debugLog(
        `Failed to get credit balance for contract ${contractAddress}:`,
        error
      );
      return 0n;
    }
  }

  /**
   * Approve credit spending from a pilot wallet
   */
  public async approveCreditSpend(
    fromPilot: any,
    spenderAddress: string,
    amount: bigint
  ): Promise<void> {
    try {
      const creditsContract = this.blockchainManager.getContract("Credits");
      if (!creditsContract) {
        throw new Error("Credits contract not found");
      }

      this.debugLog(
        `Approving ${
          Number(amount) / 1e18
        } credits for ${spenderAddress} from pilot ${fromPilot.address}`
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
        address: creditsContract.address as `0x${string}`,
        abi: creditsContract.abi,
        functionName: "approve",
        args: [spenderAddress as `0x${string}`, amount],
        account: fromPilot,
        chain: chain,
      });

      this.debugLog(`Credit approval transaction sent: ${hash}`);
      await this.blockchainManager.waitForTransactionReceipt(hash);
      this.debugLog(`Credit approval confirmed`);
    } catch (error: any) {
      this.debugLog(`Failed to approve credit spend:`, error);
      throw error;
    }
  }
}
