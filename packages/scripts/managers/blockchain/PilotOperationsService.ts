// Pilot management operations

import { parseEther, formatEther, createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import type { BlockchainManager } from "./BlockchainManager";

export class PilotOperationsService {
  constructor(
    private blockchainManager: BlockchainManager,
    private debugMode: boolean = false
  ) {}

  private debugLog(message: string, data?: any): void {
    if (this.debugMode) {
      const timestamp = new Date().toISOString().split("T")[1].split(".")[0];
      if (data) {
        console.log(`👨‍✈️ [${timestamp}] PilotOps - ${message}:`, data);
      } else {
        console.log(`👨‍✈️ [${timestamp}] PilotOps - ${message}`);
      }
    }
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
    const gameContract = this.blockchainManager.getContract("Game");
    if (!gameContract) {
      throw new Error("Game contract not found. Run: yarn deploy");
    }

    this.debugLog(
      `Adding ${pilotAddresses.length} pilots to Game contract in batches of ${batchSize}`
    );

    const walletClient = this.blockchainManager.getWalletClient();
    const godAccount = this.blockchainManager.getGodAccount();
    const chain = this.blockchainManager.getChain();

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
        const hash = await walletClient.writeContract({
          address: gameContract.address as `0x${string}`,
          abi: gameContract.abi,
          functionName: "addPilots",
          args: [batch],
          value: totalEthForBatch,
          account: godAccount,
          chain: chain,
        });

        this.debugLog(`Batch transaction sent: ${hash}`);

        // Wait for transaction to be mined
        const receipt = await this.blockchainManager.waitForTransactionReceipt(hash);
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
    const gameContract = this.blockchainManager.getContract("Game");
    if (!gameContract) {
      throw new Error("Game contract not found. Run: yarn deploy");
    }

    this.debugLog(
      `Funding ${addresses.length} addresses to minimum balance of ${minBalancePerAddress} ETH in batches of ${batchSize}`
    );

    const walletClient = this.blockchainManager.getWalletClient();
    const godAccount = this.blockchainManager.getGodAccount();
    const chain = this.blockchainManager.getChain();

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
        const hash = await walletClient.writeContract({
          address: gameContract.address as `0x${string}`,
          abi: gameContract.abi,
          functionName: "fundPilots",
          args: [batch, minBalanceWei],
          value: totalEthForBatch,
          account: godAccount,
          chain: chain,
        });

        this.debugLog(`Funding batch transaction sent: ${hash}`);

        // Wait for transaction to be mined
        const receipt = await this.blockchainManager.waitForTransactionReceipt(hash);
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
    const gameContract = this.blockchainManager.getContract("Game");
    if (!gameContract) {
      throw new Error("Game contract not found. Run: yarn deploy");
    }

    return await this.blockchainManager.readContract(
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
    const gameContract = this.blockchainManager.getContract("Game");
    if (!gameContract) {
      throw new Error("Game contract not found. Run: yarn deploy");
    }

    return await this.blockchainManager.readContract(
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
    const gameContract = this.blockchainManager.getContract("Game");
    if (!gameContract) {
      throw new Error("Game contract not found. Run: yarn deploy");
    }

    return await this.blockchainManager.readContract(
      gameContract.address,
      gameContract.abi,
      "getPilotCount"
    );
  }

  /**
   * Check if a pilot is dead in the Game contract
   */
  public async isPilotDead(pilotAddress: string): Promise<boolean> {
    const gameContract = this.blockchainManager.getContract("Game");
    if (!gameContract) {
      throw new Error("Game contract not found. Run: yarn deploy");
    }

    return await this.blockchainManager.readContract(
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
      const gameContract = this.blockchainManager.getContract("Game");
      if (!gameContract) {
        throw new Error("Game contract not found. Run: yarn deploy");
      }

      const result = (await this.blockchainManager.readContract(
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
      const config = this.blockchainManager.getConfig();
      const chainId = config.chainId;
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

      const publicClient = this.blockchainManager.getPublicClient();
      const godAccount = this.blockchainManager.getGodAccount();
      const chain = this.blockchainManager.getChain();

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
            chain: chain,
            transport: http(config.rpcUrl),
          });

          // Get current balance
          const currentBalance = await publicClient.getBalance({
            address: pilot.address as `0x${string}`,
          });

          // Calculate exactly how much to send: balance - (gas cost)
          const gasLimit = 21000n; // Standard ETH transfer
          const gasPrice = await publicClient.getGasPrice();
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
            to: godAccount.address,
            value: amountToSend,
            gas: gasLimit,
            gasPrice: gasPrice, // CRITICAL: lock in the gas price we used for calculation
            chain: chain,
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
   * Get an address's ETH balance
   * @param address The address to check
   * @returns The ETH balance in wei
   */
  public async getBalance(address: string): Promise<bigint> {
    try {
      const publicClient = this.blockchainManager.getPublicClient();
      const balance = await publicClient.getBalance({
        address: address as `0x${string}`,
      });

      return balance;
    } catch (error: any) {
      this.debugLog(`Failed to get balance for ${address}:`, error);
      throw error;
    }
  }
}
