import {
  createPublicClient,
  createWalletClient,
  http,
  formatEther,
  parseEther,
  PublicClient,
  WalletClient,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import * as chains from "viem/chains";
import deployedContracts from "../../nextjs/contracts/deployedContracts";
import { AboutContractInfo } from "../types";

export interface BlockchainConfig {
  chainId: number;
  chainName: string;
  rpcUrl: string;
  godPrivateKey: string;
}

export interface ContractInfo {
  address: string;
  abi: any;
}

export class BlockchainManager {
  private publicClient: PublicClient;
  private walletClient: WalletClient;
  private godAccount: any;
  private selectedChain: any;
  private config: BlockchainConfig;
  private debugMode: boolean;

  constructor(config: BlockchainConfig, debugMode: boolean = false) {
    this.config = config;
    this.debugMode = debugMode;
    this.selectedChain = this.getChainByName(config.chainName);
    this.godAccount = privateKeyToAccount(
      config.godPrivateKey as `0x${string}`
    );

    // Create clients
    this.publicClient = createPublicClient({
      chain: this.selectedChain,
      transport: http(config.rpcUrl),
    });

    this.walletClient = createWalletClient({
      account: this.godAccount,
      chain: this.selectedChain,
      transport: http(config.rpcUrl),
    });

    this.debugLog(
      `Using Chain: ${this.selectedChain.name} (ID: ${config.chainId})`
    );
    this.debugLog(`Using RPC: ${config.rpcUrl}`);
    this.debugLog(`GOD Account: ${this.godAccount.address}`);
  }

  private debugLog(message: string, data?: any): void {
    if (this.debugMode) {
      const timestamp = new Date().toISOString().split("T")[1].split(".")[0];
      if (data) {
        console.log(`🔗 [${timestamp}] ${message}:`, data);
      } else {
        console.log(`🔗 [${timestamp}] ${message}`);
      }
    }
  }

  private getChainByName(chainName: string) {
    const chainMap: { [key: string]: any } = {
      foundry: chains.foundry,
      arbitrum: chains.arbitrum,
      mainnet: chains.mainnet,
      polygon: chains.polygon,
      optimism: chains.optimism,
      base: chains.base,
      sepolia: chains.sepolia,
      goerli: chains.goerli,
      hardhat: chains.hardhat,
      localhost: chains.localhost,
    };

    const selectedChain = chainMap[chainName.toLowerCase()];
    if (!selectedChain) {
      console.error(
        `❌ Unknown chain: ${chainName}. Available chains: ${Object.keys(
          chainMap
        ).join(", ")}`
      );
      console.log(`🔗 Falling back to foundry chain`);
      return chains.foundry;
    }

    return selectedChain;
  }

  /**
   * Get the deployed contract info for a given contract name
   */
  public getContract(contractName: string): ContractInfo | null {
    const contracts =
      deployedContracts[this.config.chainId as keyof typeof deployedContracts];

    if (!contracts || !contracts[contractName as keyof typeof contracts]) {
      this.debugLog(`Contract ${contractName} not found`);
      return null;
    }

    const contract = contracts[contractName as keyof typeof contracts] as any;
    if (!contract.address) {
      this.debugLog(`Contract ${contractName} address is undefined`);
      return null;
    }

    return {
      address: contract.address,
      abi: contract.abi,
    };
  }

  /**
   * Get active sectors from MaxExtract contract
   */
  public async getActiveSectors(): Promise<bigint[]> {
    const maxExtractContract = this.getContract("MaxExtract");
    if (!maxExtractContract) {
      throw new Error("MaxExtract contract not found. Run: yarn deploy");
    }

    this.debugLog(
      `Calling getActiveSectors on contract: ${maxExtractContract.address}`
    );

    const activeSectors = (await this.publicClient.readContract({
      address: maxExtractContract.address as `0x${string}`,
      abi: maxExtractContract.abi,
      functionName: "getActiveSectors",
      args: [],
    })) as bigint[];

    this.debugLog(`Found ${activeSectors.length} active sectors from contract`);
    return activeSectors;
  }

  /**
   * Get GOD account balance
   */
  public async getGodBalance(): Promise<string> {
    const godBalance = await this.publicClient.getBalance({
      address: this.godAccount.address,
    });
    return formatEther(godBalance);
  }

  /**
   * Get current block number
   */
  public async getBlockNumber(): Promise<bigint> {
    return await this.publicClient.getBlockNumber();
  }

  /**
   * Read from a contract
   */
  public async readContract(
    contractAddress: string,
    abi: any,
    functionName: string,
    args?: any[]
  ): Promise<any> {
    return await this.publicClient.readContract({
      address: contractAddress as `0x${string}`,
      abi,
      functionName,
      args: args || [],
    });
  }

  /**
   * Write to a contract
   */
  public async writeContract(
    contractAddress: string,
    abi: any,
    functionName: string,
    args?: any[]
  ): Promise<string> {
    const hash = await this.walletClient.writeContract({
      address: contractAddress as `0x${string}`,
      abi,
      functionName,
      args: args || [],
      chain: this.selectedChain,
      account: this.godAccount,
    });

    this.debugLog(`Transaction sent: ${hash}`);
    return hash;
  }

  /**
   * Simulate a contract call before executing
   */
  public async simulateContract(
    contractAddress: string,
    abi: any,
    functionName: string,
    args?: any[]
  ): Promise<void> {
    await this.publicClient.simulateContract({
      address: contractAddress as `0x${string}`,
      abi,
      functionName,
      args: args || [],
      account: this.godAccount.address,
    });
  }

  /**
   * Wait for transaction receipt
   */
  public async waitForTransactionReceipt(hash: string): Promise<any> {
    const receipt = await this.publicClient.waitForTransactionReceipt({
      hash: hash as `0x${string}`,
    });
    this.debugLog(`Transaction mined in block ${receipt.blockNumber}`);
    return receipt;
  }

  /**
   * Get the public client for direct access
   */
  public getPublicClient(): PublicClient {
    return this.publicClient;
  }

  /**
   * Get the wallet client for direct access
   */
  public getWalletClient(): WalletClient {
    return this.walletClient;
  }

  /**
   * Get the GOD account
   */
  public getGodAccount(): any {
    return this.godAccount;
  }

  /**
   * Get the selected chain
   */
  public getChain(): any {
    return this.selectedChain;
  }

  /**
   * Get the blockchain configuration
   */
  public getConfig(): BlockchainConfig {
    return this.config;
  }

  /**
   * Add multiple pilots to the Game contract in batches with ETH funding
   * @param pilotAddresses Array of pilot addresses to add
   * @param batchSize Number of pilots to add per transaction (default: 50)
   * @param ethPerPilot ETH amount to give each pilot (in ETH, e.g., "0.01")
   */
  public async addPilotsToGame(
    pilotAddresses: string[],
    batchSize: number = 50,
    ethPerPilot: string = "0.01" // Default 0.01 ETH per pilot
  ): Promise<void> {
    const gameContract = this.getContract("Game");
    if (!gameContract) {
      throw new Error("Game contract not found. Run: yarn deploy");
    }

    this.debugLog(
      `Adding ${pilotAddresses.length} pilots to Game contract in batches of ${batchSize}`
    );

    // Process pilots in batches
    for (let i = 0; i < pilotAddresses.length; i += batchSize) {
      const batch = pilotAddresses.slice(i, i + batchSize);

      try {
        this.debugLog(
          `Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(
            pilotAddresses.length / batchSize
          )}: ${batch.length} pilots`
        );

        // Calculate total ETH to send for this batch
        const ethPerPilotWei = parseEther(ethPerPilot);
        const totalEthForBatch = ethPerPilotWei * BigInt(batch.length);

        // Execute the transaction with ETH
        const hash = await this.walletClient.writeContract({
          address: gameContract.address as `0x${string}`,
          abi: gameContract.abi,
          functionName: "addPilots",
          args: [batch],
          value: totalEthForBatch,
          account: this.godAccount,
          chain: this.selectedChain,
        });

        this.debugLog(`Batch transaction sent: ${hash}`);

        // Wait for transaction to be mined
        const receipt = await this.waitForTransactionReceipt(hash);
        this.debugLog(
          `Batch transaction mined in block ${receipt.blockNumber}`
        );

        console.log(
          `✅ Added ${batch.length} pilots to Game contract (batch ${
            Math.floor(i / batchSize) + 1
          }/${Math.ceil(pilotAddresses.length / batchSize)})`
        );
      } catch (error: any) {
        console.error(
          `❌ Failed to add pilot batch ${Math.floor(i / batchSize) + 1}: ${
            error.shortMessage || error.message
          }`
        );
        this.debugLog("Pilot batch addition error details:", error);
        throw error;
      }
    }

    console.log(
      `🎯 Successfully added all ${pilotAddresses.length} pilots to Game contract`
    );
  }

  /**
   * Check if an address is already a pilot in the Game contract
   * @param pilotAddress Address to check
   * @returns True if the address is already a pilot
   */
  public async isPilot(pilotAddress: string): Promise<boolean> {
    const gameContract = this.getContract("Game");
    if (!gameContract) {
      throw new Error("Game contract not found. Run: yarn deploy");
    }

    return await this.readContract(
      gameContract.address,
      gameContract.abi,
      "isPilot",
      [pilotAddress]
    );
  }

  /**
   * Get all pilots from the Game contract
   * @returns Array of pilot addresses
   */
  public async getPilots(): Promise<string[]> {
    const gameContract = this.getContract("Game");
    if (!gameContract) {
      throw new Error("Game contract not found. Run: yarn deploy");
    }

    return await this.readContract(
      gameContract.address,
      gameContract.abi,
      "getPilots"
    );
  }

  /**
   * Get the number of pilots in the Game contract
   * @returns Number of pilots
   */
  public async getPilotCount(): Promise<bigint> {
    const gameContract = this.getContract("Game");
    if (!gameContract) {
      throw new Error("Game contract not found. Run: yarn deploy");
    }

    return await this.readContract(
      gameContract.address,
      gameContract.abi,
      "getPilotCount"
    );
  }

  /**
   * Ensure a pilot has enough gas for transactions using the smart contract
   */
  public async makeSurePilotHasEnoughGas(
    pilotAddress: string,
    minRequired: string = "0.005" // Default minimum 0.005 ETH
  ): Promise<string | null> {
    this.debugLog(
      `Checking gas for pilot ${pilotAddress}, min required: ${minRequired} ETH`
    );

    try {
      const gameContract = this.getContract("Game");
      if (!gameContract) {
        throw new Error("Game contract not found. Run: yarn deploy");
      }

      const minRequiredWei = parseEther(minRequired);

      // Execute the makeSurePilotHasEnoughGas transaction
      const hash = await this.walletClient.writeContract({
        address: gameContract.address as `0x${string}`,
        abi: gameContract.abi,
        functionName: "makeSurePilotHasEnoughGas",
        args: [pilotAddress, minRequiredWei],
        value: minRequiredWei, // Send the minimum required amount (will be refunded if not needed)
        account: this.godAccount,
        chain: this.selectedChain,
      });

      this.debugLog(`Gas check transaction sent: ${hash}`);

      // Wait for transaction to be mined
      const receipt = await this.waitForTransactionReceipt(hash);
      this.debugLog(
        `Gas check transaction mined in block ${receipt.blockNumber}`
      );

      return hash;
    } catch (error: any) {
      this.debugLog(`Failed to check/fund pilot gas:`, error);
      throw new Error(`Gas check failed: ${error.message}`);
    }
  }

  /**
   * Legacy function - now uses the new gas management system
   * @deprecated Use makeSurePilotHasEnoughGas instead
   */
  public async fundPilotForGas(
    pilotAddress: string,
    amount: string
  ): Promise<string> {
    this.debugLog(
      `Legacy fundPilotForGas called, using new gas management system`
    );
    const result = await this.makeSurePilotHasEnoughGas(pilotAddress, amount);
    return result || "no-funding-needed";
  }

  /**
   * Check if a pilot is dead in the Game contract
   */
  public async isPilotDead(pilotAddress: string): Promise<boolean> {
    const gameContract = this.getContract("Game");
    if (!gameContract) {
      throw new Error("Game contract not found. Run: yarn deploy");
    }

    return await this.readContract(
      gameContract.address,
      gameContract.abi,
      "isPilotDead",
      [pilotAddress]
    );
  }

  /**
   * Get all pilots with their ETH balances and death status in one call
   */
  public async getAllPilotsAndBalances(): Promise<{
    pilots: Array<{
      address: string;
      ethBalance: string;
      isDead: boolean;
    }>;
  }> {
    try {
      const gameContract = this.getContract("Game");
      if (!gameContract) {
        throw new Error("Game contract not found. Run: yarn deploy");
      }

      const result = (await this.readContract(
        gameContract.address,
        gameContract.abi,
        "getAllPilotsAndBalances"
      )) as [string[], bigint[], boolean[]];

      const [addresses, balances, isDead] = result;

      const pilots = addresses.map((address, index) => ({
        address,
        ethBalance: formatEther(balances[index]),
        isDead: isDead[index],
      }));

      return { pilots };
    } catch (error: any) {
      this.debugLog(`Failed to get all pilots and balances:`, error);
      throw new Error(`Failed to get pilots data: ${error.message}`);
    }
  }

  /**
   * Execute deadMansSwitch transaction when a pilot is killed
   */
  public async executeDeadMansSwitch(
    victimPrivateKey: string,
    killerAddress: string,
    playerAddress: string,
    ethAmount: string = "0"
  ): Promise<string> {
    this.debugLog(
      `Executing deadMansSwitch for victim pilot with killer ${killerAddress} and player ${playerAddress}`
    );

    try {
      const gameContract = this.getContract("Game");
      if (!gameContract) {
        throw new Error("Game contract not found. Run: yarn deploy");
      }

      // Create wallet client for the victim pilot
      const victimAccount = privateKeyToAccount(
        victimPrivateKey as `0x${string}`
      );
      const victimWalletClient = createWalletClient({
        account: victimAccount,
        chain: this.selectedChain,
        transport: http(this.config.rpcUrl),
      });

      // Execute the deadMansSwitch transaction
      const hash = await victimWalletClient.writeContract({
        address: gameContract.address as `0x${string}`,
        abi: gameContract.abi,
        functionName: "deadMansSwitch",
        args: [killerAddress, playerAddress],
        value: parseEther(ethAmount), // Convert ETH to wei properly
        chain: this.selectedChain,
      });

      this.debugLog(`DeadMansSwitch transaction sent: ${hash}`);

      // Wait for transaction to be mined
      const receipt = await this.waitForTransactionReceipt(hash);
      this.debugLog(
        `DeadMansSwitch transaction mined in block ${receipt.blockNumber}`
      );

      return hash;
    } catch (error: any) {
      this.debugLog(`Failed to execute deadMansSwitch:`, error);
      throw new Error(`DeadMansSwitch failed: ${error.message}`);
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
      const gameContract = this.getContract("Game");
      if (!gameContract) {
        throw new Error("Game contract not found. Run: yarn deploy");
      }

      // Import necessary functions
      const { privateKeyToAccount } = await import("viem/accounts");
      const { createWalletClient, http } = await import("viem");

      // Create a wallet client for the pilot
      const pilotAccount = privateKeyToAccount(
        pilotPrivateKey as `0x${string}`
      );
      const pilotWalletClient = createWalletClient({
        account: pilotAccount,
        chain: this.selectedChain,
        transport: http(this.config.rpcUrl),
      });

      // Call tipPlayer function on Game contract
      const hash = await pilotWalletClient.writeContract({
        address: gameContract.address as `0x${string}`,
        abi: gameContract.abi,
        functionName: "tipPlayer",
        args: [playerAddress, tipAmount],
        chain: this.selectedChain,
      });

      this.debugLog(`Tip transaction sent: ${hash}`);

      // Wait for transaction to be mined
      const receipt = await this.waitForTransactionReceipt(hash);
      this.debugLog(`Tip transaction mined in block ${receipt.blockNumber}`);

      return hash;
    } catch (error: any) {
      this.debugLog(`Failed to execute tip:`, error);
      throw new Error(`Tip execution failed: ${error.message}`);
    }
  }

  /**
   * Calculate tip amount based on final score
   */
  public static calculateTipAmount(finalScore: number): number {
    // Import SECTOR_CONFIG synchronously since it's a constant
    const { SECTOR_CONFIG } = require("../types");

    if (finalScore >= SECTOR_CONFIG.TIP_SCORE_THRESHOLDS.HIGH) return 3;
    if (finalScore >= SECTOR_CONFIG.TIP_SCORE_THRESHOLDS.MEDIUM) return 2;
    if (finalScore >= SECTOR_CONFIG.TIP_SCORE_THRESHOLDS.LOW) return 1;
    return 0;
  }

  /**
   * Get the player address (sector owner) for a given sector ID
   */
  public async getSectorOwner(sectorId: string): Promise<string | null> {
    try {
      const maxExtractContract = this.getContract("MaxExtract");
      if (!maxExtractContract) {
        throw new Error("MaxExtract contract not found. Run: yarn deploy");
      }

      const owner = await this.readContract(
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
      const maxExtractContract = this.getContract("MaxExtract");
      if (!maxExtractContract) {
        throw new Error("MaxExtract contract not found. Run: yarn deploy");
      }

      const registryAddress = await this.readContract(
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

      // Call modules("about") on the registry contract
      let aboutAddress: string;
      try {
        aboutAddress = (await this.publicClient.readContract({
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
        stationName = (await this.publicClient.readContract({
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

      this.debugLog(
        `About contract check for sector ${sectorId}: name="${stationName}", valid=${hasValidName}`
      );

      return {
        hasAboutContract: hasValidName,
        stationName: stationName || "",
        registryAddress,
        aboutAddress,
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
    const { SECTOR_CONFIG } = require("../types");

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
}
