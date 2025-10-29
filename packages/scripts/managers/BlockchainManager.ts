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
    // Check cache first
    if (this.contractsCache.has(contractName)) {
      const cached = this.contractsCache.get(contractName)!;
      this.debugLog(`Using cached contract ${contractName}: ${cached.address}`);
      return cached;
    }

    // Fall back to static import
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
      for (const contract of chainData.contracts) {
        this.contractsCache.set(contract.name, {
          address: contract.address,
          abi: contract.abi,
        });
        this.debugLog(`Cached contract ${contract.name}: ${contract.address}`);
      }

      console.log(
        `✅ Reloaded ${chainData.contracts.length} contracts from API`
      );
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
              )}... - character not found`
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

        // If simulation fails, don't try to execute the transaction
        // This likely means the credential contract has issues or additional requirements
        return {
          success: false,
          error: `Simulation failed: ${simErrorMsg}. The credential contract may have implementation issues.`,
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
}
