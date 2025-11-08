// Contract configuration and setup operations

import type { BlockchainManager } from "./BlockchainManager";

export class ContractConfigService {
  constructor(
    private blockchainManager: BlockchainManager,
    private debugMode: boolean = false
  ) {}

  private debugLog(message: string, data?: any): void {
    if (this.debugMode) {
      const timestamp = new Date().toISOString().split("T")[1].split(".")[0];
      if (data) {
        console.log(`⚙️  [${timestamp}] ContractConfig - ${message}:`, data);
      } else {
        console.log(`⚙️  [${timestamp}] ContractConfig - ${message}`);
      }
    }
  }

  /**
   * Call setMaxExtract on the Game contract to update the MaxExtract address
   */
  public async setMaxExtractAddress(
    maxExtractAddress: string
  ): Promise<string> {
    try {
      this.debugLog(
        `Setting MaxExtract address in Game contract to: ${maxExtractAddress}`
      );

      const gameContract = this.blockchainManager.getContract("Game");
      if (!gameContract) {
        throw new Error("Game contract not found. Run: yarn deploy");
      }

      console.log(
        `🔗 Calling setMaxExtract on Game contract ${gameContract.address}...`
      );

      const hash = await this.blockchainManager.writeContract(
        gameContract.address,
        gameContract.abi,
        "setMaxExtract",
        [maxExtractAddress]
      );

      this.debugLog(`setMaxExtract transaction sent: ${hash}`);

      // Wait for transaction to be mined
      const receipt = await this.blockchainManager.waitForTransactionReceipt(hash);
      this.debugLog(
        `setMaxExtract transaction mined in block ${receipt.blockNumber}`
      );

      console.log(
        `✅ MaxExtract address set to ${maxExtractAddress} in Game contract (tx: ${hash.slice(
          0,
          10
        )}...)`
      );

      return hash;
    } catch (error: any) {
      console.error(
        `❌ Failed to set MaxExtract address: ${
          error.shortMessage || error.message
        }`
      );
      this.debugLog("setMaxExtract error details:", error);
      throw error;
    }
  }

  /**
   * Call setAuditorContract on the Game contract to update the Auditor address
   */
  public async setAuditorContract(auditorAddress: string): Promise<string> {
    try {
      this.debugLog(
        `Setting Auditor contract address in Game contract to: ${auditorAddress}`
      );

      const gameContract = this.blockchainManager.getContract("Game");
      if (!gameContract) {
        throw new Error("Game contract not found. Run: yarn deploy");
      }

      console.log(
        `🔗 Calling setAuditorContract on Game contract ${gameContract.address}...`
      );

      const hash = await this.blockchainManager.writeContract(
        gameContract.address,
        gameContract.abi,
        "setAuditorContract",
        [auditorAddress]
      );

      this.debugLog(`setAuditorContract transaction sent: ${hash}`);

      // Wait for transaction to be mined
      const receipt = await this.blockchainManager.waitForTransactionReceipt(hash);
      this.debugLog(
        `setAuditorContract transaction mined in block ${receipt.blockNumber}`
      );

      console.log(
        `✅ Auditor contract address set to ${auditorAddress} in Game contract (tx: ${hash.slice(
          0,
          10
        )}...)`
      );

      return hash;
    } catch (error: any) {
      console.error(
        `❌ Failed to set Auditor contract address: ${
          error.shortMessage || error.message
        }`
      );
      this.debugLog("setAuditorContract error details:", error);
      throw error;
    }
  }

  /**
   * Set the Credits contract address in the Game contract
   * @param creditsAddress Address of the Credits token contract
   */
  public async setCreditsContract(creditsAddress: string): Promise<void> {
    const gameContract = this.blockchainManager.getContract("Game");
    if (!gameContract) {
      throw new Error("Game contract not found. Run: yarn deploy");
    }

    this.debugLog(`Setting Credits contract address: ${creditsAddress}`);

    const hash = await this.blockchainManager.writeContract(
      gameContract.address,
      gameContract.abi,
      "setCreditsContract",
      [creditsAddress]
    );

    this.debugLog(`Credits contract set, transaction: ${hash}`);
  }

  /**
   * Chapter 5: Set Credits contract address on crowdsale contract
   */
  public async setCrowdsaleCreditsAddress(
    crowdsaleAddress: string,
    creditsAddress: string
  ): Promise<void> {
    try {
      this.debugLog(
        `Setting Credits address ${creditsAddress} on crowdsale ${crowdsaleAddress}`
      );

      const walletClient = this.blockchainManager.getWalletClient();
      const chain = this.blockchainManager.getChain();
      const godAccount = this.blockchainManager.getGodAccount();

      const hash = await walletClient.writeContract({
        address: crowdsaleAddress as `0x${string}`,
        abi: [
          {
            name: "setCreditsAddress",
            type: "function",
            stateMutability: "nonpayable",
            inputs: [{ name: "_creditsContract", type: "address" }],
            outputs: [],
          },
        ],
        functionName: "setCreditsAddress",
        args: [creditsAddress as `0x${string}`],
        account: godAccount,
        chain: chain,
      });

      this.debugLog(`Set Credits address transaction sent: ${hash}`);
      await this.blockchainManager.waitForTransactionReceipt(hash);
      this.debugLog(`Credits address set successfully`);
    } catch (error: any) {
      this.debugLog(`Failed to set Credits address:`, error);
      throw error;
    }
  }

  /**
   * Chapter 5: Set Game contract address on crowdsale contract
   */
  public async setCrowdsaleGameAddress(
    crowdsaleAddress: string,
    gameAddress: string
  ): Promise<void> {
    try {
      this.debugLog(
        `Setting Game address ${gameAddress} on crowdsale ${crowdsaleAddress}`
      );

      const walletClient = this.blockchainManager.getWalletClient();
      const chain = this.blockchainManager.getChain();
      const godAccount = this.blockchainManager.getGodAccount();

      const hash = await walletClient.writeContract({
        address: crowdsaleAddress as `0x${string}`,
        abi: [
          {
            name: "setGameAddress",
            type: "function",
            stateMutability: "nonpayable",
            inputs: [{ name: "_gameContract", type: "address" }],
            outputs: [],
          },
        ],
        functionName: "setGameAddress",
        args: [gameAddress as `0x${string}`],
        account: godAccount,
        chain: chain,
      });

      this.debugLog(`Set Game address transaction sent: ${hash}`);
      await this.blockchainManager.waitForTransactionReceipt(hash);
      this.debugLog(`Game address set successfully`);
    } catch (error: any) {
      this.debugLog(`Failed to set Game address:`, error);
      throw error;
    }
  }

  /**
   * Chapter 5: Set Game interface on crowdsale contract
   * Must be called after setGameAddress
   */
  public async setCrowdsaleGameInterface(
    crowdsaleAddress: string
  ): Promise<void> {
    try {
      this.debugLog(`Setting Game interface on crowdsale ${crowdsaleAddress}`);

      const walletClient = this.blockchainManager.getWalletClient();
      const chain = this.blockchainManager.getChain();
      const godAccount = this.blockchainManager.getGodAccount();

      const hash = await walletClient.writeContract({
        address: crowdsaleAddress as `0x${string}`,
        abi: [
          {
            name: "setGameInterface",
            type: "function",
            stateMutability: "nonpayable",
            inputs: [],
            outputs: [],
          },
        ],
        functionName: "setGameInterface",
        account: godAccount,
        chain: chain,
      });

      this.debugLog(`Set Game interface transaction sent: ${hash}`);
      await this.blockchainManager.waitForTransactionReceipt(hash);
      this.debugLog(`Game interface set successfully`);
    } catch (error: any) {
      this.debugLog(`Failed to set Game interface:`, error);
      throw error;
    }
  }

  /**
   * Chapter 5: Set Registry contract address on crowdsale contract
   */
  public async setCrowdsaleRegistryAddress(
    crowdsaleAddress: string,
    registryAddress: string
  ): Promise<void> {
    try {
      this.debugLog(
        `Setting Registry address ${registryAddress} on crowdsale ${crowdsaleAddress}`
      );

      const walletClient = this.blockchainManager.getWalletClient();
      const chain = this.blockchainManager.getChain();
      const godAccount = this.blockchainManager.getGodAccount();

      const hash = await walletClient.writeContract({
        address: crowdsaleAddress as `0x${string}`,
        abi: [
          {
            name: "setRegistryAddress",
            type: "function",
            stateMutability: "nonpayable",
            inputs: [{ name: "registryContract", type: "address" }],
            outputs: [],
          },
        ],
        functionName: "setRegistryAddress",
        args: [registryAddress as `0x${string}`],
        account: godAccount,
        chain: chain,
      });

      this.debugLog(`Set Registry address transaction sent: ${hash}`);
      await this.blockchainManager.waitForTransactionReceipt(hash);
      this.debugLog(`Registry address set successfully`);
    } catch (error: any) {
      this.debugLog(`Failed to set Registry address:`, error);
      throw error;
    }
  }
}
