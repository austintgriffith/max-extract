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
  private contractsCache: Map<string, ContractInfo> = new Map();

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
   * Checks runtime cache first, then falls back to static import
   */
  public getContract(contractName: string): ContractInfo | null {
    // Check cache first (loaded from API)
    if (this.contractsCache.has(contractName)) {
      const cached = this.contractsCache.get(contractName)!;
      this.debugLog(`Using cached contract ${contractName}: ${cached.address}`);
      return cached;
    }

    // Fall back to static import (local deployedContracts.ts)
    this.debugLog(
      `Contract ${contractName} not in cache, checking local deployedContracts.ts`
    );
    const contracts =
      deployedContracts[this.config.chainId as keyof typeof deployedContracts];

    if (!contracts || !contracts[contractName as keyof typeof contracts]) {
      this.debugLog(
        `Contract ${contractName} not found in local deployedContracts.ts`
      );
      return null;
    }

    const contract = contracts[contractName as keyof typeof contracts] as any;
    if (!contract.address) {
      this.debugLog(
        `Contract ${contractName} address is undefined in local deployedContracts.ts`
      );
      return null;
    }

    this.debugLog(`Using local contract ${contractName}: ${contract.address}`);
    return {
      address: contract.address,
      abi: contract.abi,
    };
  }

  /**
   * Reload contracts from the API and update the cache
   * This allows the game server to use newly deployed contracts without restarting
   */
  public async reloadContractsFromAPI(apiUrl: string): Promise<void> {
    try {
      this.debugLog(`Reloading contracts from API: ${apiUrl}`);

      const response = await fetch(apiUrl);
      const data = await response.json();

      if (!data.success || !data.data) {
        throw new Error("Invalid API response format");
      }

      const chainData = data.data[this.config.chainId.toString()];
      if (!chainData || !chainData.contracts) {
        throw new Error(`No contracts found for chain ${this.config.chainId}`);
      }

      // Clear the cache
      this.contractsCache.clear();

      // Update cache with new contract addresses
      console.log(`📦 Loading contracts for chain ${this.config.chainId}:`);
      for (const contract of chainData.contracts) {
        this.contractsCache.set(contract.name, {
          address: contract.address,
          abi: contract.abi,
        });
        console.log(`   ✓ ${contract.name}: ${contract.address}`);
        this.debugLog(`Cached contract ${contract.name}: ${contract.address}`);
      }

      console.log(`✅ Loaded ${chainData.contracts.length} contracts from API`);
    } catch (error: any) {
      console.error(`❌ Failed to reload contracts from API: ${error.message}`);
      throw error;
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

      const gameContract = this.getContract("Game");
      if (!gameContract) {
        throw new Error("Game contract not found. Run: yarn deploy");
      }

      console.log(
        `🔗 Calling setMaxExtract on Game contract ${gameContract.address}...`
      );

      const hash = await this.writeContract(
        gameContract.address,
        gameContract.abi,
        "setMaxExtract",
        [maxExtractAddress]
      );

      this.debugLog(`setMaxExtract transaction sent: ${hash}`);

      // Wait for transaction to be mined
      const receipt = await this.waitForTransactionReceipt(hash);
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

      const gameContract = this.getContract("Game");
      if (!gameContract) {
        throw new Error("Game contract not found. Run: yarn deploy");
      }

      console.log(
        `🔗 Calling setAuditorContract on Game contract ${gameContract.address}...`
      );

      const hash = await this.writeContract(
        gameContract.address,
        gameContract.abi,
        "setAuditorContract",
        [auditorAddress]
      );

      this.debugLog(`setAuditorContract transaction sent: ${hash}`);

      // Wait for transaction to be mined
      const receipt = await this.waitForTransactionReceipt(hash);
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
   * Set the game state (Open = 0, Active = 1, Settled = 2)
   */
  public async setGameState(state: number): Promise<string> {
    try {
      const gameContract = this.getContract("Game");
      if (!gameContract) {
        throw new Error("Game contract not found. Run: yarn deploy");
      }

      const stateNames = ["Open", "Active", "Settled"];
      const stateName = stateNames[state] || "Unknown";

      this.debugLog(`Setting game state to ${state} (${stateName})`);

      const hash = await this.writeContract(
        gameContract.address,
        gameContract.abi,
        "setState",
        [state]
      );

      this.debugLog(`setState transaction sent: ${hash}`);

      // Wait for transaction to be mined
      const receipt = await this.waitForTransactionReceipt(hash);
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
   * Fund multiple addresses with ETH in batches using Game contract's fundPilots function
   * Smart top-up system: only sends what's needed to reach minimum balance, refunds excess to GOD
   * @param addresses Array of addresses to fund
   * @param minBalancePerAddress Minimum ETH balance each address should have (in ETH, e.g., "0.01")
   * @param batchSize Number of addresses to fund per transaction (default: 50)
   */
  public async fundAddresses(
    addresses: string[],
    minBalancePerAddress: string,
    batchSize: number = 50
  ): Promise<void> {
    const gameContract = this.getContract("Game");
    if (!gameContract) {
      throw new Error("Game contract not found. Run: yarn deploy");
    }

    this.debugLog(
      `Funding ${addresses.length} addresses to minimum balance of ${minBalancePerAddress} ETH in batches of ${batchSize}`
    );

    // Process addresses in batches
    for (let i = 0; i < addresses.length; i += batchSize) {
      const batch = addresses.slice(i, i + batchSize);

      try {
        this.debugLog(
          `Processing funding batch ${
            Math.floor(i / batchSize) + 1
          }/${Math.ceil(addresses.length / batchSize)}: ${
            batch.length
          } addresses`
        );

        // Calculate total ETH to send for this batch (worst case: all at 0 balance)
        const minBalanceWei = parseEther(minBalancePerAddress);
        const totalEthForBatch = minBalanceWei * BigInt(batch.length);

        // Call fundPilots on Game contract with ETH and minimum balance
        const hash = await this.walletClient.writeContract({
          address: gameContract.address as `0x${string}`,
          abi: gameContract.abi,
          functionName: "fundPilots",
          args: [batch, minBalanceWei],
          value: totalEthForBatch,
          account: this.godAccount,
          chain: this.selectedChain,
        });

        this.debugLog(`Funding batch transaction sent: ${hash}`);

        // Wait for transaction to be mined
        const receipt = await this.waitForTransactionReceipt(hash);
        this.debugLog(
          `Funding batch transaction mined in block ${receipt.blockNumber}`
        );

        console.log(
          `✅ Topped up ${
            batch.length
          } addresses to minimum ${minBalancePerAddress} ETH (batch ${
            Math.floor(i / batchSize) + 1
          }/${Math.ceil(addresses.length / batchSize)}) - tx: ${hash.slice(
            0,
            10
          )}...`
        );
      } catch (error: any) {
        console.error(
          `❌ Failed to fund batch ${Math.floor(i / batchSize) + 1}: ${
            error.shortMessage || error.message
          }`
        );
        this.debugLog("Funding batch error details:", error);
        throw error;
      }
    }

    console.log(
      `💰 Successfully topped up all ${addresses.length} addresses to minimum balance`
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
   * Get the CREDITS token balance of an address
   * @param address Address to check balance for
   * @returns Balance in wei (with 18 decimals)
   */
  public async getCreditsBalance(address: string): Promise<bigint> {
    const creditsContract = this.getContract("Credits");
    if (!creditsContract) {
      throw new Error("Credits contract not found. Run: yarn deploy");
    }

    return await this.readContract(
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
      const gameContract = this.getContract("Game");
      if (!gameContract) {
        throw new Error("Game contract not found. Run: yarn deploy");
      }

      const result = (await this.readContract(
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
    const creditsContract = this.getContract("Credits");
    if (!creditsContract) {
      throw new Error("Credits contract not found. Run: yarn deploy");
    }

    this.debugLog(`Minting ${amount} credits to ${to.slice(0, 10)}...`);

    const hash = await this.writeContract(
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
    const creditsContract = this.getContract("Credits");
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

    const hash = await this.writeContract(
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
   * Set the Credits contract address in the Game contract
   * @param creditsAddress Address of the Credits token contract
   */
  public async setCreditsContract(creditsAddress: string): Promise<void> {
    const gameContract = this.getContract("Game");
    if (!gameContract) {
      throw new Error("Game contract not found. Run: yarn deploy");
    }

    this.debugLog(`Setting Credits contract address: ${creditsAddress}`);

    const hash = await this.writeContract(
      gameContract.address,
      gameContract.abi,
      "setCreditsContract",
      [creditsAddress]
    );

    this.debugLog(`Credits contract set, transaction: ${hash}`);
  }

  /**
   * Check if the game can be settled
   */
  public async canGameSettle(): Promise<boolean> {
    const gameContract = this.getContract("Game");
    if (!gameContract) {
      throw new Error("Game contract not found. Run: yarn deploy");
    }

    return await this.readContract(
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
    const gameContract = this.getContract("Game");
    if (!gameContract) {
      throw new Error("Game contract not found. Run: yarn deploy");
    }

    return await this.readContract(
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
    const gameContract = this.getContract("Game");
    if (!gameContract) {
      throw new Error("Game contract not found. Run: yarn deploy");
    }

    return await this.readContract(
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
    const gameContract = this.getContract("Game");
    if (!gameContract) {
      throw new Error("Game contract not found. Run: yarn deploy");
    }

    return await this.readContract(
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
    const gameContract = this.getContract("Game");
    if (!gameContract) {
      throw new Error("Game contract not found. Run: yarn deploy");
    }

    console.log("🏁 Settling the game...");

    const result = await this.writeContract(
      gameContract.address as `0x${string}`,
      gameContract.abi,
      "settleGame",
      []
    );

    console.log("✅ Game settled successfully!");
    return result;
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
   * Clean up all pilot ETH by sending their balances back to GOD
   * Called when the game ends to reclaim all distributed ETH
   */
  public async cleanupPilotETH(characterManager: any): Promise<void> {
    try {
      console.log("🧹 Starting pilot ETH cleanup...");

      // Check if characterManager has any characters
      let characterCount = characterManager.getCharacterCount();

      if (characterCount === 0) {
        console.log("⚠️  No characters found in memory");
        console.log("🔍 Attempting to load pilots from backup file...");

        // Try to load from backup file
        const loaded = characterManager.loadCharactersFromFile
          ? characterManager.loadCharactersFromFile()
          : false;

        if (!loaded) {
          console.log("❌ Could not load pilots from backup file");
          console.log(
            "   Pilots from previous sessions cannot be cleaned up (private keys unavailable)"
          );
          console.log("   Skipping ETH cleanup - pilots will keep their ETH");
          return;
        }

        characterCount = characterManager.getCharacterCount();
        console.log(
          `✅ Loaded ${characterCount} pilots from backup file for cleanup`
        );
      }

      console.log(`🧹 Found ${characterCount} characters to check for cleanup`);

      // Get all pilots and their balances
      const { pilots } = await this.getAllPilotsAndBalances();

      // Set minimum balance threshold based on network
      const chainId = this.config.chainId;
      let minBalance: number;

      if (chainId === 31337) {
        // Foundry localhost - higher gas costs, need higher minimum
        minBalance = 0.001; // 1000x higher than gas cost
      } else if (chainId === 42161) {
        // Arbitrum - very low gas costs
        minBalance = 0.0001; // Still much higher than gas cost
      } else {
        // Other networks - conservative default
        minBalance = 0.0005;
      }

      console.log(
        `🧹 Network detected: Chain ID ${chainId}, minimum balance threshold: ${minBalance} ETH`
      );

      let totalReclaimed = 0;
      let successfulTransfers = 0;
      let failedTransfers = 0;

      for (const pilot of pilots) {
        const balance = parseFloat(pilot.ethBalance);

        // Skip pilots with very low balances based on network-specific threshold
        if (balance < minBalance) {
          this.debugLog(
            `Skipping pilot ${pilot.address.slice(
              0,
              8
            )}... with low balance: ${balance.toFixed(
              6
            )} ETH (min: ${minBalance} ETH)`
          );
          continue;
        }

        try {
          // Get the actual character with their real private key
          const character = characterManager.getCharacterByAddress(
            pilot.address
          );
          if (!character) {
            console.log(
              `⏭️  Skipping ${pilot.address.slice(
                0,
                8
              )}... - character not found in this session`
            );
            continue;
          }

          const pilotAccount = privateKeyToAccount(character.privateKey);
          const pilotWalletClient = createWalletClient({
            account: pilotAccount,
            chain: this.getChain(),
            transport: http(this.config.rpcUrl),
          });

          // Get current balance
          const currentBalance = await this.publicClient.getBalance({
            address: pilot.address as `0x${string}`,
          });

          // Calculate exactly how much to send: balance - (gas cost)
          const gasLimit = 21000n; // Standard ETH transfer
          const gasPrice = await this.publicClient.getGasPrice();
          const gasCost = gasLimit * gasPrice;

          if (currentBalance <= gasCost) {
            console.log(
              `⏭️  Skipping ${pilot.address.slice(0, 8)}... - balance too low`
            );
            continue;
          }

          const amountToSend = currentBalance - gasCost;

          console.log(`🔍 RECLAIM for ${pilot.address.slice(0, 8)}...:`);
          console.log(`   📊 Balance: ${formatEther(currentBalance)} ETH`);
          console.log(`   💰 Sending: ${formatEther(amountToSend)} ETH`);
          console.log(`   🔒 Reserving: ${formatEther(gasCost)} ETH for gas`);

          // Send ETH back to GOD with EXPLICIT gas limit and gas price
          const hash = await pilotWalletClient.sendTransaction({
            to: this.godAccount.address,
            value: amountToSend,
            gas: gasLimit,
            gasPrice: gasPrice, // CRITICAL: lock in the gas price we used for calculation
            chain: this.getChain(),
          });

          const amountInEth = parseFloat(formatEther(amountToSend));
          console.log(
            `✅ Reclaimed ${amountInEth.toFixed(
              4
            )} ETH from pilot ${pilot.address.slice(0, 8)}... (tx: ${hash.slice(
              0,
              10
            )}...)`
          );

          totalReclaimed += amountInEth;
          successfulTransfers++;
        } catch (error: any) {
          const balance = parseFloat(pilot.ethBalance);
          console.error(
            `❌ Failed to reclaim ETH from pilot ${pilot.address.slice(
              0,
              8
            )}... (balance: ${balance.toFixed(6)} ETH): ${error.message}`
          );
          failedTransfers++;
        }
      }

      console.log(`✅ Pilot cleanup complete:`);
      console.log(`   💰 Total reclaimed: ${totalReclaimed.toFixed(4)} ETH`);
      console.log(`   ✅ Successful transfers: ${successfulTransfers}`);
      console.log(`   ❌ Failed transfers: ${failedTransfers}`);
    } catch (error: any) {
      console.error(`❌ Pilot ETH cleanup failed: ${error.message}`);
    }
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
  ): Promise<{ deadMansSwitchHash: string; ethTransferHash: string | null }> {
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

      // Step 1: Execute the deadMansSwitch transaction (no ETH involved)
      const deadMansSwitchHash = await victimWalletClient.writeContract({
        address: gameContract.address as `0x${string}`,
        abi: gameContract.abi,
        functionName: "deadMansSwitch",
        args: [killerAddress, playerAddress],
        gas: BigInt(100000), // Explicit gas limit for predictable costs
        chain: this.selectedChain,
      });

      this.debugLog(`DeadMansSwitch transaction sent: ${deadMansSwitchHash}`);

      // Wait for deadMansSwitch to be mined
      await this.waitForTransactionReceipt(deadMansSwitchHash);
      this.debugLog(`DeadMansSwitch transaction mined`);

      // Step 2: Send all remaining ETH to GOD
      let ethTransferHash: string | null = null;
      try {
        // Get pilot's remaining balance
        const remainingBalance = await this.publicClient.getBalance({
          address: victimAccount.address,
        });

        // Estimate gas for the transfer
        const gasPrice = await this.publicClient.getGasPrice();
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
          const godAddress = this.godAccount.address;
          ethTransferHash = await victimWalletClient.sendTransaction({
            to: godAddress,
            value: amountToSend,
            gas: gasLimit,
            chain: this.selectedChain,
          });

          this.debugLog(`ETH transfer to GOD sent: ${ethTransferHash}`);
          await this.waitForTransactionReceipt(ethTransferHash);
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

      return { deadMansSwitchHash, ethTransferHash };
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

      // Check pilot balance and top up if needed
      const { SECTOR_CONFIG } = require("../types");
      const pilotBalance = await this.publicClient.getBalance({
        address: pilotAccount.address,
      });
      const tipGasThreshold = parseEther(SECTOR_CONFIG.TIP_GAS_AMOUNT);

      if (pilotBalance < tipGasThreshold) {
        this.debugLog(
          `Pilot balance (${formatEther(pilotBalance)} ETH) below threshold (${
            SECTOR_CONFIG.TIP_GAS_AMOUNT
          } ETH), topping up...`
        );
        await this.fundAddresses(
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

      // Check if the about contract has been audited for Chapter 2
      let isAudited = false;
      let auditedChapter = 0;
      try {
        const auditorContract = this.getContract("Auditor");
        if (auditorContract) {
          auditedChapter = (await this.publicClient.readContract({
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

  /**
   * Check if a pilot has already minted a credential from a specific player
   */
  public async hasPilotMintedFromPlayer(
    pilotAddress: string,
    playerAddress: string
  ): Promise<boolean> {
    try {
      const gameContract = this.getContract("Game");
      if (!gameContract) {
        throw new Error("Game contract not found. Run: yarn deploy");
      }

      const hasMinted = await this.readContract(
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

      // Call modules("credential") on the registry contract
      const credentialAddress = (await this.publicClient.readContract({
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

      // Get registry address for the sector
      const registryAddress = await this.getRegistryAddressForSector(sectorId);

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

      // Check pilot's credential balance (ERC721 balanceOf)
      const balance = (await this.publicClient.readContract({
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
  ): Promise<{
    success: boolean;
    txHash?: string;
    alreadyOwned?: boolean;
    error?: string;
    errorDetails?: string;
  }> {
    try {
      this.debugLog(
        `Attempting credential mint for pilot ${pilotAddress} from ${credentialAddress}`
      );

      // Check if credential contract is audited for Chapter 3
      const auditorContract = this.getContract("Auditor");
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

      const auditedChapter = (await this.publicClient.readContract({
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
      const balance = (await this.publicClient.readContract({
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

      const pilotWalletClient = createWalletClient({
        account: pilotAccount,
        chain: this.selectedChain,
        transport: http(this.config.rpcUrl),
      });

      // Double-check pilot status right before transaction
      const isPilotNow = await this.isPilot(pilotAddress);
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

      // Call issue() on the credential contract
      this.debugLog(
        `Calling issue() on credential contract ${credentialAddress} as ${pilotAccount.address}`
      );
      console.log(
        `🔍 Calling issue() on credential ${credentialAddress.slice(
          0,
          10
        )}... as ${pilotAccount.address.slice(0, 10)}...`
      );

      // Try to simulate the transaction first to catch errors before spending gas
      try {
        await this.publicClient.simulateContract({
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

        // Decode error signature for better diagnostics
        let errorSignature = "";
        let decodedError = "";

        // Complete mapping of ALL contract error signatures for better debugging
        const errorSignatures: { [key: string]: string } = {
          // ===== Game Contract Errors (Game.sol) =====
          "0x32dcf6cc":
            "OnlyGod() - Only the GOD address can call this function",
          "0x4632ffe3":
            "OnlyPilot() - Caller is not a registered pilot or pilot is dead",
          "0xb80f6dae": "GameNotOpen() - Game is not in open state for buy-in",
          "0xcd1c8867":
            "InsufficientPayment() - Not enough ETH sent for buy-in",
          "0xa627f538":
            "PlayerAlreadyJoined() - Player has already bought into the game",
          "0xe0dbb1a7": "PilotAlreadyAdded() - Pilot is already registered",
          "0xa9854bc9":
            "InvalidArrayLengths() - Array length mismatch in parameters",
          "0x6d2fd3c9":
            "InvalidPercentages() - Payout percentages don't sum to 100%",
          "0x3b1ab104": "PayoutFailed() - ETH transfer failed during payout",
          "0x625018cc":
            "PilotAlreadyDead() - Pilot has already been marked as dead",
          "0xabca3517":
            "NotAPlayer() - Address is not a registered player or has no sector",
          "0x8f86c6b3": "GameNotEnded() - Game end time has not passed yet",
          "0xdc557126": "GameAlreadySettled() - Game has already been settled",
          "0xa1427b3a": "NotACredential() - Contract is not a valid credential",
          "0xbcb63aea":
            "CredentialNotRegistered() - Credential contract not registered in player's registry",
          "0x782a830c":
            "MaxExtractNotSet() - MaxExtract contract address not configured in Game",
          "0x933099c1":
            "PilotAlreadyMintedFromPlayer() - Pilot already bought a credential from this player (one-time purchase rule)",
          "0x81d522f5":
            "NotARegistry() - Caller or address is not a valid registry contract",

          // ===== Credential Contract Errors (Chapter 3) =====
          "0xa7a99435":
            "SectorNotBroadcast() - Registry does not have a sector ID set (call registry.broadcastSectorId first)",
          "0x4e3f67f9":
            "InvalidGameContract() - Game contract address not set in credential contract",
          "0xd6a72296":
            "InvalidRegistryContract() - Registry contract address not set in credential contract",

          // ===== OpenZeppelin ERC20 Errors =====
          "0xfb8f41b2":
            "ERC20InsufficientAllowance(address,uint256,uint256) - Not enough token allowance approved for spender",
          "0xe450d38c":
            "ERC20InsufficientBalance(address,uint256,uint256) - Not enough token balance",
          "0x96c6fd1e":
            "ERC20InvalidSender(address) - Invalid sender address (e.g., zero address)",
          "0xec442f05":
            "ERC20InvalidReceiver(address) - Invalid receiver address (e.g., zero address)",
          "0xe602df05":
            "ERC20InvalidApprover(address) - Invalid approver address",
          "0x94280d62":
            "ERC20InvalidSpender(address) - Invalid spender address",

          // ===== Universe Contract Errors (Universe.sol) =====
          "0x411354e3":
            "EntropyAlreadySet() - Universe entropy has already been set",
          "0x11b70ea7":
            "NoCommitmentMade() - No entropy commitment has been made yet",
          "0xc349402d":
            "RevealTooEarly() - Attempting to reveal entropy before minimum wait time",
          "0x9ea6d127":
            "InvalidReveal() - Revealed entropy doesn't match commitment",
          "0x3703b169":
            "CommitmentAlreadyMade() - Commitment has already been made for this period",
        };

        // Try to extract error signature from error data
        if (simError.data || simError.cause?.data) {
          const errorData = simError.data || simError.cause?.data;
          errorSignature =
            typeof errorData === "string" ? errorData.slice(0, 10) : "";
        }

        // Try to parse signature from error message if not found in data
        if (!errorSignature) {
          const signatureMatch = simErrorMsg.match(/0x[0-9a-fA-F]{8}/);
          if (signatureMatch) {
            errorSignature = signatureMatch[0];
          }
        }

        // Decode the signature if found
        if (errorSignature && errorSignatures[errorSignature]) {
          decodedError = errorSignatures[errorSignature];
          console.log(`🔍 Decoded error: ${decodedError}`);
        } else if (errorSignature) {
          decodedError = `Unknown error signature: ${errorSignature}`;
        }

        // If simulation fails, don't try to execute the transaction
        // This likely means the credential contract has issues or additional requirements
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
        chain: this.selectedChain,
      });

      this.debugLog(`Credential mint transaction sent: ${hash}`);

      // Wait for transaction to be mined
      await this.waitForTransactionReceipt(hash);

      return { success: true, txHash: hash, alreadyOwned: false };
    } catch (error: any) {
      this.debugLog(`Failed to mint credential:`, error);

      // Try to decode the error for better debugging
      let errorMessage = error.shortMessage || error.message || "Unknown error";
      let errorDetails = "";

      // Complete mapping of ALL contract error signatures for better debugging
      const errorSignatures: { [key: string]: string } = {
        // ===== Game Contract Errors (Game.sol) =====
        "0x32dcf6cc": "OnlyGod() - Only the GOD address can call this function",
        "0x4632ffe3":
          "OnlyPilot() - Caller is not a registered pilot or pilot is dead",
        "0xb80f6dae": "GameNotOpen() - Game is not in open state for buy-in",
        "0xcd1c8867": "InsufficientPayment() - Not enough ETH sent for buy-in",
        "0xa627f538":
          "PlayerAlreadyJoined() - Player has already bought into the game",
        "0xe0dbb1a7": "PilotAlreadyAdded() - Pilot is already registered",
        "0xa9854bc9":
          "InvalidArrayLengths() - Array length mismatch in parameters",
        "0x6d2fd3c9":
          "InvalidPercentages() - Payout percentages don't sum to 100%",
        "0x3b1ab104": "PayoutFailed() - ETH transfer failed during payout",
        "0x625018cc":
          "PilotAlreadyDead() - Pilot has already been marked as dead",
        "0xabca3517":
          "NotAPlayer() - Address is not a registered player or has no sector",
        "0x8f86c6b3": "GameNotEnded() - Game end time has not passed yet",
        "0xdc557126": "GameAlreadySettled() - Game has already been settled",
        "0xa1427b3a": "NotACredential() - Contract is not a valid credential",
        "0xbcb63aea":
          "CredentialNotRegistered() - Credential contract not registered in player's registry",
        "0x782a830c":
          "MaxExtractNotSet() - MaxExtract contract address not configured in Game",
        "0x933099c1":
          "PilotAlreadyMintedFromPlayer() - Pilot already bought a credential from this player (one-time purchase rule)",
        "0x81d522f5":
          "NotARegistry() - Caller or address is not a valid registry contract",

        // ===== Credential Contract Errors (Chapter 3) =====
        "0xa7a99435":
          "SectorNotBroadcast() - Registry does not have a sector ID set (call registry.broadcastSectorId first)",
        "0x4e3f67f9":
          "InvalidGameContract() - Game contract address not set in credential contract",
        "0xd6a72296":
          "InvalidRegistryContract() - Registry contract address not set in credential contract",

        // ===== OpenZeppelin ERC20 Errors =====
        "0xfb8f41b2":
          "ERC20InsufficientAllowance(address,uint256,uint256) - Not enough token allowance approved for spender",
        "0xe450d38c":
          "ERC20InsufficientBalance(address,uint256,uint256) - Not enough token balance",
        "0x96c6fd1e":
          "ERC20InvalidSender(address) - Invalid sender address (e.g., zero address)",
        "0xec442f05":
          "ERC20InvalidReceiver(address) - Invalid receiver address (e.g., zero address)",
        "0xe602df05":
          "ERC20InvalidApprover(address) - Invalid approver address",
        "0x94280d62": "ERC20InvalidSpender(address) - Invalid spender address",

        // ===== Universe Contract Errors (Universe.sol) =====
        "0x411354e3":
          "EntropyAlreadySet() - Universe entropy has already been set",
        "0x11b70ea7":
          "NoCommitmentMade() - No entropy commitment has been made yet",
        "0xc349402d":
          "RevealTooEarly() - Attempting to reveal entropy before minimum wait time",
        "0x9ea6d127":
          "InvalidReveal() - Revealed entropy doesn't match commitment",
        "0x3703b169":
          "CommitmentAlreadyMade() - Commitment has already been made for this period",
      };

      let signature = "";

      // Method 1: Check if error data has the signature
      if (error.data || error.cause?.data) {
        const errorData = error.data || error.cause?.data;
        this.debugLog(`Error data:`, errorData);
        signature = typeof errorData === "string" ? errorData.slice(0, 10) : "";
      }

      // Method 2: Parse signature from error message if not found in data
      if (!signature) {
        const signatureMatch = errorMessage.match(/0x[0-9a-fA-F]{8}/);
        if (signatureMatch) {
          signature = signatureMatch[0];
          this.debugLog(`Extracted signature from error message: ${signature}`);
        }
      }

      // Decode the signature if found
      if (signature && errorSignatures[signature]) {
        errorDetails = errorSignatures[signature];
        errorMessage = errorSignatures[signature];
      } else if (signature) {
        errorDetails = `Unknown error signature: ${signature}`;
      }

      // Add additional context
      if (error.cause) {
        this.debugLog(`Error cause:`, error.cause);
      }

      return {
        success: false,
        error: errorMessage,
        errorDetails: errorDetails || undefined,
      };
    }
  }

  /**
   * Chapter 5: Check if chapter 5 is visible for a player
   */
  public async isChapter5Visible(playerAddress: string): Promise<boolean> {
    try {
      const gameContract = this.getContract("Game");
      if (!gameContract) {
        this.debugLog("Game contract not found for chapter visibility check");
        return false;
      }

      // Get the array of visible chapters from Game contract
      const visibleChapters = (await this.readContract(
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
   * Chapter 5: Get a module address from a registry contract
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

      // Call modules(moduleKey) on the registry contract
      const moduleAddress = (await this.publicClient.readContract({
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
   * Chapter 5: Check audit status of a contract
   * @returns Chapter number if audited (1-5), 0 if not audited
   */
  public async checkAuditStatus(contractAddress: string): Promise<number> {
    try {
      const auditorContract = this.getContract("Auditor");
      if (!auditorContract) {
        this.debugLog("Auditor contract not found");
        return 0;
      }

      const auditedChapter = (await this.publicClient.readContract({
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
   * Chapter 5: Get fuel token price from fuel contract
   */
  public async getFuelTokenPrice(fuelAddress: string): Promise<bigint> {
    try {
      this.debugLog(
        `Getting pricePerTokenInCredits from fuel contract: ${fuelAddress}`
      );

      const price = (await this.publicClient.readContract({
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
   * Chapter 5: Get fuel token balance for an address
   */
  public async getFuelTokenBalance(
    fuelAddress: string,
    holderAddress: string
  ): Promise<bigint> {
    try {
      const balance = (await this.publicClient.readContract({
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
   * Chapter 5: Approve credit spending from a pilot wallet
   */
  public async approveCreditSpend(
    fromPilot: any,
    spenderAddress: string,
    amount: bigint
  ): Promise<void> {
    try {
      const creditsContract = this.getContract("Credits");
      if (!creditsContract) {
        throw new Error("Credits contract not found");
      }

      this.debugLog(
        `Approving ${
          Number(amount) / 1e18
        } credits for ${spenderAddress} from pilot ${fromPilot.address}`
      );

      // Create wallet client for the pilot
      const pilotWalletClient = createWalletClient({
        account: fromPilot,
        chain: this.selectedChain,
        transport: http(this.config.rpcUrl),
      });

      const hash = await pilotWalletClient.writeContract({
        address: creditsContract.address as `0x${string}`,
        abi: creditsContract.abi,
        functionName: "approve",
        args: [spenderAddress, amount],
        chain: this.selectedChain,
      });

      this.debugLog(`Credit approval transaction sent: ${hash}`);
      await this.waitForTransactionReceipt(hash);
      this.debugLog(`Credit approval confirmed`);
    } catch (error: any) {
      this.debugLog(`Failed to approve credit spend:`, error);
      throw error;
    }
  }

  /**
   * Chapter 5: Buy fuel tokens from a pilot wallet
   */
  public async buyFuelTokens(
    fromPilot: any,
    fuelAddress: string,
    amount: bigint
  ): Promise<{
    success: boolean;
    txHash?: string;
    error?: string;
    errorDetails?: string;
  }> {
    try {
      this.debugLog(
        `Buying ${
          Number(amount) / 1e18
        } fuel tokens from ${fuelAddress} as pilot ${fromPilot.address}`
      );

      // Create wallet client for the pilot
      const pilotWalletClient = createWalletClient({
        account: fromPilot,
        chain: this.selectedChain,
        transport: http(this.config.rpcUrl),
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
        chain: this.selectedChain,
      });

      this.debugLog(`Buy fuel tokens transaction sent: ${hash}`);
      await this.waitForTransactionReceipt(hash);
      this.debugLog(`Buy fuel tokens confirmed`);
      return { success: true, txHash: hash };
    } catch (error: any) {
      this.debugLog(`Failed to buy fuel tokens:`, error);

      // Decode error signature for better diagnostics
      const errorMessage =
        error.shortMessage || error.message || "Unknown error";
      let errorSignature = "";
      let decodedError = "";

      // Error signature mapping (same as credential minting)
      const errorSignatures: { [key: string]: string } = {
        // ===== Game Contract Errors (Game.sol) =====
        "0x32dcf6cc": "OnlyGod() - Only the GOD address can call this function",
        "0x4632ffe3":
          "OnlyPilot() - Caller is not a registered pilot or pilot is dead",
        "0xb80f6dae": "GameNotOpen() - Game is not in open state for buy-in",
        "0xcd1c8867": "InsufficientPayment() - Not enough ETH sent for buy-in",
        "0xa627f538":
          "PlayerAlreadyJoined() - Player has already bought into the game",
        "0xe0dbb1a7": "PilotAlreadyAdded() - Pilot is already registered",
        "0xa9854bc9":
          "InvalidArrayLengths() - Array length mismatch in parameters",
        "0x6d2fd3c9":
          "InvalidPercentages() - Payout percentages don't sum to 100%",
        "0x3b1ab104": "PayoutFailed() - ETH transfer failed during payout",
        "0x625018cc":
          "PilotAlreadyDead() - Pilot has already been marked as dead",
        "0xabca3517":
          "NotAPlayer() - Address is not a registered player or has no sector",
        "0x8f86c6b3": "GameNotEnded() - Game end time has not passed yet",
        "0xdc557126": "GameAlreadySettled() - Game has already been settled",
        "0xa1427b3a": "NotACredential() - Contract is not a valid credential",
        "0xbcb63aea":
          "CredentialNotRegistered() - Credential contract not registered in player's registry",
        "0x782a830c":
          "MaxExtractNotSet() - MaxExtract contract address not configured in Game",
        "0x933099c1":
          "PilotAlreadyMintedFromPlayer() - Pilot already bought a credential from this player (one-time purchase rule)",
        "0x81d522f5":
          "NotARegistry() - Caller or address is not a valid registry contract",

        // ===== Credential Contract Errors (Chapter 3) =====
        "0xa7a99435":
          "SectorNotBroadcast() - Registry does not have a sector ID set (call registry.broadcastSectorId first)",
        "0x4e3f67f9":
          "InvalidGameContract() - Game contract address not set in credential contract",
        "0xd6a72296":
          "InvalidRegistryContract() - Registry contract address not set in credential contract",

        // ===== Chapter 5 Fuel Contract Errors =====
        "0xcd786059":
          "InsufficientAllowance() - Credits allowance too low for purchase",
        "0xf4d678b8": "InsufficientBalance() - Not enough CREDITS balance",
        "0x356680b7":
          "InsufficientCreditsInContract() - Fuel contract hasn't reached target credits for upgrade",
        "0x0bd8a3eb":
          "CrowdsaleEnded() / AlreadyUpgraded() - Station upgrade already completed, crowdsale is closed",
        "0x6cd1ce94":
          "InvalidGameContract() - Game interface not initialized in crowdsale contract (call setGameInterface)",
        "0xc0e2e1ab":
          "InvalidCreditsContract() - Credits contract address not set in crowdsale contract",

        // ===== OpenZeppelin ERC20 Errors =====
        "0xfb8f41b2":
          "ERC20InsufficientAllowance(address,uint256,uint256) - Not enough token allowance approved for spender",
        "0xe450d38c":
          "ERC20InsufficientBalance(address,uint256,uint256) - Not enough token balance",
        "0x96c6fd1e":
          "ERC20InvalidSender(address) - Invalid sender address (e.g., zero address)",
        "0xec442f05":
          "ERC20InvalidReceiver(address) - Invalid receiver address (e.g., zero address)",
        "0xe602df05":
          "ERC20InvalidApprover(address) - Invalid approver address",
        "0x94280d62": "ERC20InvalidSpender(address) - Invalid spender address",

        // ===== Universe Contract Errors (Universe.sol) =====
        "0x411354e3":
          "EntropyAlreadySet() - Universe entropy has already been set",
        "0x11b70ea7":
          "NoCommitmentMade() - No entropy commitment has been made yet",
        "0xc349402d":
          "RevealTooEarly() - Attempting to reveal entropy before minimum wait time",
        "0x9ea6d127":
          "InvalidReveal() - Revealed entropy doesn't match commitment",
        "0x3703b169":
          "CommitmentAlreadyMade() - Commitment has already been made for this period",
      };

      // Try to extract error signature from error data
      if (error.data || error.cause?.data) {
        const errorData = error.data || error.cause?.data;
        errorSignature =
          typeof errorData === "string" ? errorData.slice(0, 10) : "";
      }

      // Try to parse signature from error message if not found in data
      if (!errorSignature) {
        const signatureMatch = errorMessage.match(/0x[0-9a-fA-F]{8}/);
        if (signatureMatch) {
          errorSignature = signatureMatch[0];
        }
      }

      // Decode the signature if found
      if (errorSignature && errorSignatures[errorSignature]) {
        decodedError = errorSignatures[errorSignature];
        this.debugLog(`Decoded buy error: ${decodedError}`);
      } else if (errorSignature) {
        decodedError = `Unknown error signature: ${errorSignature}`;
      }

      return {
        success: false,
        error: errorMessage,
        errorDetails: decodedError || undefined,
      };
    }
  }

  /**
   * Chapter 5: Call upgrade function on fuel contract from a pilot wallet
   */
  public async callUpgrade(
    fromPilot: any,
    fuelAddress: string
  ): Promise<{
    success: boolean;
    txHash?: string;
    error?: string;
    errorDetails?: string;
  }> {
    try {
      this.debugLog(
        `Calling upgrade() on ${fuelAddress} as pilot ${fromPilot.address}`
      );

      // Create wallet client for the pilot
      const pilotWalletClient = createWalletClient({
        account: fromPilot,
        chain: this.selectedChain,
        transport: http(this.config.rpcUrl),
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
        chain: this.selectedChain,
      });

      this.debugLog(`Upgrade transaction sent: ${hash}`);
      await this.waitForTransactionReceipt(hash);
      this.debugLog(`Upgrade confirmed successfully`);
      return { success: true, txHash: hash };
    } catch (error: any) {
      this.debugLog(`Upgrade call failed:`, error);

      // Decode error signature for better diagnostics
      const errorMessage =
        error.shortMessage || error.message || "Unknown error";
      let errorSignature = "";
      let decodedError = "";

      // Error signature mapping
      const errorSignatures: { [key: string]: string } = {
        // ===== Game Contract Errors (Game.sol) =====
        "0x32dcf6cc": "OnlyGod() - Only the GOD address can call this function",
        "0x4632ffe3":
          "OnlyPilot() - Caller is not a registered pilot or pilot is dead",
        "0xb80f6dae": "GameNotOpen() - Game is not in open state for buy-in",
        "0xcd1c8867": "InsufficientPayment() - Not enough ETH sent for buy-in",
        "0xa627f538":
          "PlayerAlreadyJoined() - Player has already bought into the game",
        "0xe0dbb1a7": "PilotAlreadyAdded() - Pilot is already registered",
        "0xa9854bc9":
          "InvalidArrayLengths() - Array length mismatch in parameters",
        "0x6d2fd3c9":
          "InvalidPercentages() - Payout percentages don't sum to 100%",
        "0x3b1ab104": "PayoutFailed() - ETH transfer failed during payout",
        "0x625018cc":
          "PilotAlreadyDead() - Pilot has already been marked as dead",
        "0xabca3517":
          "NotAPlayer() - Address is not a registered player or has no sector",
        "0x8f86c6b3": "GameNotEnded() - Game end time has not passed yet",
        "0xdc557126": "GameAlreadySettled() - Game has already been settled",
        "0xa1427b3a": "NotACredential() - Contract is not a valid credential",
        "0xbcb63aea":
          "CredentialNotRegistered() - Credential contract not registered in player's registry",
        "0x782a830c":
          "MaxExtractNotSet() - MaxExtract contract address not configured in Game",
        "0x933099c1":
          "PilotAlreadyMintedFromPlayer() - Pilot already bought a credential from this player (one-time purchase rule)",
        "0x81d522f5":
          "NotARegistry() - Caller or address is not a valid registry contract",

        // ===== Credential Contract Errors (Chapter 3) =====
        "0xa7a99435":
          "SectorNotBroadcast() - Registry does not have a sector ID set (call registry.broadcastSectorId first)",
        "0x4e3f67f9":
          "InvalidGameContract() - Game contract address not set in credential contract",
        "0xd6a72296":
          "InvalidRegistryContract() - Registry contract address not set in credential contract",

        // ===== Chapter 5 Fuel Contract Errors =====
        "0xcd786059":
          "InsufficientAllowance() - Credits allowance too low for purchase",
        "0xf4d678b8": "InsufficientBalance() - Not enough CREDITS balance",
        "0x356680b7":
          "InsufficientCreditsInContract() - Fuel contract hasn't reached target credits for upgrade",
        "0x0bd8a3eb":
          "CrowdsaleEnded() / AlreadyUpgraded() - Station upgrade already completed, crowdsale is closed",
        "0x6cd1ce94":
          "InvalidGameContract() - Game interface not initialized in crowdsale contract (call setGameInterface)",
        "0xc0e2e1ab":
          "InvalidCreditsContract() - Credits contract address not set in crowdsale contract",

        // ===== OpenZeppelin ERC20 Errors =====
        "0xfb8f41b2":
          "ERC20InsufficientAllowance(address,uint256,uint256) - Not enough token allowance approved for spender",
        "0xe450d38c":
          "ERC20InsufficientBalance(address,uint256,uint256) - Not enough token balance",
        "0x96c6fd1e":
          "ERC20InvalidSender(address) - Invalid sender address (e.g., zero address)",
        "0xec442f05":
          "ERC20InvalidReceiver(address) - Invalid receiver address (e.g., zero address)",
        "0xe602df05":
          "ERC20InvalidApprover(address) - Invalid approver address",
        "0x94280d62": "ERC20InvalidSpender(address) - Invalid spender address",

        // ===== Universe Contract Errors (Universe.sol) =====
        "0x411354e3":
          "EntropyAlreadySet() - Universe entropy has already been set",
        "0x11b70ea7":
          "NoCommitmentMade() - No entropy commitment has been made yet",
        "0xc349402d":
          "RevealTooEarly() - Attempting to reveal entropy before minimum wait time",
        "0x9ea6d127":
          "InvalidReveal() - Revealed entropy doesn't match commitment",
        "0x3703b169":
          "CommitmentAlreadyMade() - Commitment has already been made for this period",
      };

      // Try to extract error signature from error data
      if (error.data || error.cause?.data) {
        const errorData = error.data || error.cause?.data;
        errorSignature =
          typeof errorData === "string" ? errorData.slice(0, 10) : "";
      }

      // Try to parse signature from error message if not found in data
      if (!errorSignature) {
        const signatureMatch = errorMessage.match(/0x[0-9a-fA-F]{8}/);
        if (signatureMatch) {
          errorSignature = signatureMatch[0];
        }
      }

      // Decode the signature if found
      if (errorSignature && errorSignatures[errorSignature]) {
        decodedError = errorSignatures[errorSignature];
        this.debugLog(`Decoded upgrade error: ${decodedError}`);
      } else if (errorSignature) {
        decodedError = `Unknown error signature: ${errorSignature}`;
      }

      return {
        success: false,
        error: errorMessage,
        errorDetails: decodedError || undefined,
      };
    }
  }

  /**
   * Chapter 5: Check if a sector has been upgraded via crowdsale
   * Returns true if the crowdsale upgrade has been called (baseType >= 4)
   * Note: Bases 1-3 are auto-managed by BaseUpgradeManager for Chapters 2-3
   */
  public async isSectorUpgraded(sectorId: string): Promise<boolean> {
    try {
      const gameContract = this.getContract("Game");
      if (!gameContract) {
        this.debugLog("Game contract not found for sector upgrade check");
        return false;
      }

      const baseType = (await this.readContract(
        gameContract.address,
        gameContract.abi,
        "getSectorBaseType",
        [BigInt(sectorId)]
      )) as number;

      // baseType >= 4 means crowdsale upgrade has been called
      // (bases 1-3 are auto-managed by BaseUpgradeManager for Chapters 2-3)
      return baseType >= 4;
    } catch (error: any) {
      this.debugLog(`Failed to check sector upgrade status:`, error);
      return false;
    }
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

      const hash = await this.walletClient.writeContract({
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
        args: [creditsAddress],
        chain: this.selectedChain,
      });

      this.debugLog(`Set Credits address transaction sent: ${hash}`);
      await this.waitForTransactionReceipt(hash);
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

      const hash = await this.walletClient.writeContract({
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
        args: [gameAddress],
        chain: this.selectedChain,
      });

      this.debugLog(`Set Game address transaction sent: ${hash}`);
      await this.waitForTransactionReceipt(hash);
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

      const hash = await this.walletClient.writeContract({
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
        chain: this.selectedChain,
      });

      this.debugLog(`Set Game interface transaction sent: ${hash}`);
      await this.waitForTransactionReceipt(hash);
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

      const hash = await this.walletClient.writeContract({
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
        args: [registryAddress],
        chain: this.selectedChain,
      });

      this.debugLog(`Set Registry address transaction sent: ${hash}`);
      await this.waitForTransactionReceipt(hash);
      this.debugLog(`Registry address set successfully`);
    } catch (error: any) {
      this.debugLog(`Failed to set Registry address:`, error);
      throw error;
    }
  }

  /**
   * Chapter 5: Redeem fuel token from a pilot wallet
   */
  public async redeemFuelToken(
    fromPilot: any,
    fuelAddress: string
  ): Promise<void> {
    try {
      this.debugLog(
        `Redeeming fuel token from ${fuelAddress} as pilot ${fromPilot.address}`
      );

      // Create wallet client for the pilot
      const pilotWalletClient = createWalletClient({
        account: fromPilot,
        chain: this.selectedChain,
        transport: http(this.config.rpcUrl),
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
        chain: this.selectedChain,
      });

      this.debugLog(`Redeem fuel token transaction sent: ${hash}`);
      await this.waitForTransactionReceipt(hash);
      this.debugLog(`Redeem fuel token confirmed`);
    } catch (error: any) {
      this.debugLog(`Failed to redeem fuel token:`, error);
      throw error;
    }
  }

  /**
   * Chapter 5: Get credit balance of a contract
   */
  public async getContractCreditBalance(
    contractAddress: string
  ): Promise<bigint> {
    try {
      const creditsContract = this.getContract("Credits");
      if (!creditsContract) {
        throw new Error("Credits contract not found");
      }

      const balance = await this.readContract(
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
   * Get the base type for a sector (1-6)
   */
  public async getSectorBaseType(sectorId: string): Promise<number> {
    try {
      const gameContract = this.getContract("Game");
      if (!gameContract) {
        throw new Error("Game contract not found. Run: yarn deploy");
      }

      const baseType = await this.publicClient.readContract({
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
      const gameContract = this.getContract("Game");
      if (!gameContract) {
        throw new Error("Game contract not found. Run: yarn deploy");
      }

      this.debugLog(`Setting sector ${sectorId} base type to ${baseType}...`);

      const hash = await this.walletClient.writeContract({
        address: gameContract.address as `0x${string}`,
        abi: gameContract.abi,
        functionName: "setSectorBaseType",
        args: [BigInt(sectorId), baseType],
        chain: this.selectedChain,
      });

      console.log(
        `🏗️  Base set to ${baseType} for sector ${sectorId}: ${hash}`
      );
      await this.waitForTransactionReceipt(hash);
      this.debugLog(`Base type update confirmed`);
      return hash;
    } catch (error: any) {
      this.debugLog(`Failed to set base type for sector ${sectorId}:`, error);
      return null;
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
      const maxExtractContract = this.getContract("MaxExtract");
      if (!maxExtractContract) {
        return {
          hasCredentialContract: false,
          error: "MaxExtract contract not found",
        };
      }

      const registryAddress = await this.readContract(
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
        const auditorContract = this.getContract("Auditor");
        if (auditorContract) {
          auditedChapter = (await this.publicClient.readContract({
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

  /**
   * Chapter 4: Check if a sector has staking enabled
   */
  public async canStake(sectorId: string): Promise<boolean> {
    try {
      const maxExtractContract = this.getContract("MaxExtract");
      if (!maxExtractContract) {
        this.debugLog("MaxExtract contract not found for canStake check");
        return false;
      }

      const canStake = await this.readContract(
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
   * Chapter 4: Stake pilot into a sector
   */
  public async stakePilotInSector(
    pilotAddress: string,
    privateKey: string,
    sectorId: string
  ): Promise<{
    success: boolean;
    transactionHash?: string;
    error?: string;
    errorDetails?: string;
  }> {
    try {
      const maxExtractContract = this.getContract("MaxExtract");
      const creditsContract = this.getContract("Credits");

      if (!maxExtractContract || !creditsContract) {
        return {
          success: false,
          error: "Contracts not found",
        };
      }

      const pilotAccount = privateKeyToAccount(privateKey as `0x${string}`);

      // First, approve MaxExtract to spend 10k credits
      const stakeAmount = 10_000n * 10n ** 18n;

      this.debugLog(
        `Approving MaxExtract to spend ${stakeAmount} credits for pilot ${pilotAddress}`
      );

      try {
        const approveHash = await this.walletClient.writeContract({
          address: creditsContract.address as `0x${string}`,
          abi: creditsContract.abi,
          functionName: "approve",
          args: [maxExtractContract.address, stakeAmount],
          account: pilotAccount,
          chain: this.selectedChain,
        });

        // Wait for approval
        await this.publicClient.waitForTransactionReceipt({
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

      const stakeHash = await this.walletClient.writeContract({
        address: maxExtractContract.address as `0x${string}`,
        abi: maxExtractContract.abi,
        functionName: "stake",
        args: [BigInt(sectorId)],
        account: pilotAccount,
        chain: this.selectedChain,
      });

      // Wait for stake transaction
      await this.publicClient.waitForTransactionReceipt({ hash: stakeHash });

      this.debugLog(
        `Pilot ${pilotAddress} successfully staked in sector ${sectorId} (tx: ${stakeHash})`
      );

      return {
        success: true,
        transactionHash: stakeHash,
      };
    } catch (error: any) {
      this.debugLog(`Failed to stake pilot:`, error);
      return {
        success: false,
        error: error.message || "Staking failed",
        errorDetails: error.details || error.shortMessage,
      };
    }
  }

  /**
   * Chapter 4: Unstake pilot from a sector
   */
  public async unstakePilotFromSector(
    pilotAddress: string,
    privateKey: string,
    sectorId: string
  ): Promise<{
    success: boolean;
    transactionHash?: string;
    error?: string;
    errorDetails?: string;
  }> {
    try {
      const maxExtractContract = this.getContract("MaxExtract");

      if (!maxExtractContract) {
        return {
          success: false,
          error: "MaxExtract contract not found",
        };
      }

      const pilotAccount = privateKeyToAccount(privateKey as `0x${string}`);

      this.debugLog(`Unstaking pilot ${pilotAddress} from sector ${sectorId}`);

      const unstakeHash = await this.walletClient.writeContract({
        address: maxExtractContract.address as `0x${string}`,
        abi: maxExtractContract.abi,
        functionName: "unstake",
        args: [BigInt(sectorId)],
        account: pilotAccount,
        chain: this.selectedChain,
      });

      // Wait for unstake transaction
      await this.publicClient.waitForTransactionReceipt({ hash: unstakeHash });

      this.debugLog(
        `Pilot ${pilotAddress} successfully unstaked from sector ${sectorId} (tx: ${unstakeHash})`
      );

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
}
