// Main BlockchainManager - orchestrates all blockchain services

import {
  createPublicClient,
  createWalletClient,
  http,
  PublicClient,
  WalletClient,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import * as chains from "viem/chains";
import deployedContracts from "../../../nextjs/contracts/deployedContracts";

// Import types
import type { BlockchainConfig, ContractInfo } from "./types";

// Import all services
import { GameOperationsService } from "./GameOperationsService";
import { ContractConfigService } from "./ContractConfigService";
import { CreditsOperationsService } from "./CreditsOperationsService";
import { PilotOperationsService } from "./PilotOperationsService";
import { StakingOperationsService } from "./StakingOperationsService";
import { DeathMechanicsService } from "./DeathMechanicsService";
import { SectorContractsService } from "./SectorContractsService";
import { CredentialOperationsService } from "./CredentialOperationsService";
import { FuelOperationsService } from "./FuelOperationsService";

export class BlockchainManager {
  private publicClient: PublicClient;
  private walletClient: WalletClient;
  private godAccount: any;
  private selectedChain: any;
  private config: BlockchainConfig;
  private debugMode: boolean;
  private contractsCache: Map<string, ContractInfo> = new Map();

  // Services
  public readonly game: GameOperationsService;
  public readonly contractConfig: ContractConfigService;
  public readonly credits: CreditsOperationsService;
  public readonly pilots: PilotOperationsService;
  public readonly staking: StakingOperationsService;
  public readonly death: DeathMechanicsService;
  public readonly sectors: SectorContractsService;
  public readonly credentials: CredentialOperationsService;
  public readonly fuel: FuelOperationsService;

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

    // Initialize services
    this.game = new GameOperationsService(this, debugMode);
    this.contractConfig = new ContractConfigService(this, debugMode);
    this.credits = new CreditsOperationsService(this, debugMode);
    this.pilots = new PilotOperationsService(this, debugMode);
    this.staking = new StakingOperationsService(this, debugMode);
    this.death = new DeathMechanicsService(this, debugMode);
    this.sectors = new SectorContractsService(this, debugMode);
    this.credentials = new CredentialOperationsService(this, debugMode);
    this.fuel = new FuelOperationsService(this, debugMode);
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

  // ============================================================================
  // LEGACY METHODS - Delegated to services for backward compatibility
  // These methods maintain the original API while using the new service architecture
  // ============================================================================

  // Game Operations
  public async setGameState(state: number): Promise<string> {
    return this.game.setGameState(state);
  }

  public async getActiveSectors(): Promise<bigint[]> {
    return this.game.getActiveSectors();
  }

  public async getGodBalance(): Promise<string> {
    return this.game.getGodBalance();
  }

  public async getBlockNumber(): Promise<bigint> {
    return this.game.getBlockNumber();
  }

  public async canGameSettle(): Promise<boolean> {
    return this.game.canGameSettle();
  }

  public async getGameState(): Promise<number> {
    return this.game.getGameState();
  }

  public async getGameWinners(): Promise<string[]> {
    return this.game.getGameWinners();
  }

  public async getWinningScore(): Promise<bigint> {
    return this.game.getWinningScore();
  }

  public async settleGame(): Promise<string> {
    return this.game.settleGame();
  }

  // Contract Configuration
  public async setMaxExtractAddress(
    maxExtractAddress: string
  ): Promise<string> {
    return this.contractConfig.setMaxExtractAddress(maxExtractAddress);
  }

  public async setAuditorContract(auditorAddress: string): Promise<string> {
    return this.contractConfig.setAuditorContract(auditorAddress);
  }

  public async setCreditsContract(creditsAddress: string): Promise<void> {
    return this.contractConfig.setCreditsContract(creditsAddress);
  }

  public async setCrowdsaleCreditsAddress(
    crowdsaleAddress: string,
    creditsAddress: string
  ): Promise<void> {
    return this.contractConfig.setCrowdsaleCreditsAddress(
      crowdsaleAddress,
      creditsAddress
    );
  }

  public async setCrowdsaleGameAddress(
    crowdsaleAddress: string,
    gameAddress: string
  ): Promise<void> {
    return this.contractConfig.setCrowdsaleGameAddress(
      crowdsaleAddress,
      gameAddress
    );
  }

  public async setCrowdsaleGameInterface(
    crowdsaleAddress: string
  ): Promise<void> {
    return this.contractConfig.setCrowdsaleGameInterface(crowdsaleAddress);
  }

  public async setCrowdsaleRegistryAddress(
    crowdsaleAddress: string,
    registryAddress: string
  ): Promise<void> {
    return this.contractConfig.setCrowdsaleRegistryAddress(
      crowdsaleAddress,
      registryAddress
    );
  }

  // Credits Operations
  public async getCreditsBalance(address: string): Promise<bigint> {
    return this.credits.getCreditsBalance(address);
  }

  public async getAllPilotsWithCredits(): Promise<{
    pilots: Array<{ address: string; creditsBalance: string }>;
  }> {
    return this.credits.getAllPilotsWithCredits();
  }

  public async mintCredits(to: string, amount: bigint): Promise<void> {
    return this.credits.mintCredits(to, amount);
  }

  public async batchMintCredits(
    recipients: string[],
    amounts: bigint[]
  ): Promise<void> {
    return this.credits.batchMintCredits(recipients, amounts);
  }

  public async getPilotCreditsBalance(pilotAddress: string): Promise<bigint> {
    return this.credits.getPilotCreditsBalance(pilotAddress);
  }

  public async getContractCreditBalance(
    contractAddress: string
  ): Promise<bigint> {
    return this.credits.getContractCreditBalance(contractAddress);
  }

  public async approveCreditSpend(
    fromPilot: any,
    spenderAddress: string,
    amount: bigint
  ): Promise<void> {
    return this.credits.approveCreditSpend(fromPilot, spenderAddress, amount);
  }

  // Pilot Operations
  public async addPilotsToGame(
    pilotAddresses: string[],
    batchSize: number = 50,
    ethPerPilot: string = "0.01"
  ): Promise<void> {
    return this.pilots.addPilotsToGame(pilotAddresses, batchSize, ethPerPilot);
  }

  public async fundAddresses(
    addresses: string[],
    minBalancePerAddress: string,
    batchSize: number = 50
  ): Promise<void> {
    return this.pilots.fundAddresses(
      addresses,
      minBalancePerAddress,
      batchSize
    );
  }

  public async isPilot(pilotAddress: string): Promise<boolean> {
    return this.pilots.isPilot(pilotAddress);
  }

  public async getPilots(): Promise<string[]> {
    return this.pilots.getPilots();
  }

  public async getPilotCount(): Promise<bigint> {
    return this.pilots.getPilotCount();
  }

  public async isPilotDead(pilotAddress: string): Promise<boolean> {
    return this.pilots.isPilotDead(pilotAddress);
  }

  public async getAllPilotsAndBalances(): Promise<{
    pilots: Array<{ address: string; ethBalance: string; isDead: boolean }>;
  }> {
    return this.pilots.getAllPilotsAndBalances();
  }

  public async cleanupPilotETH(characterManager: any): Promise<void> {
    return this.pilots.cleanupPilotETH(characterManager);
  }

  public async getBalance(address: string): Promise<bigint> {
    return this.pilots.getBalance(address);
  }

  // Staking Operations
  public async canStake(sectorId: string): Promise<boolean> {
    return this.staking.canStake(sectorId);
  }

  public async getSectorAirspaceClass(sectorId: string): Promise<number> {
    return this.sectors.getSectorAirspaceClass(sectorId);
  }

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
    return this.staking.stakePilotInSector(pilotAddress, privateKey, sectorId);
  }

  public async getPilotStakedBalance(pilotAddress: string): Promise<bigint> {
    return this.staking.getPilotStakedBalance(pilotAddress);
  }

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
    return this.staking.unstakePilotFromSector(
      pilotAddress,
      privateKey,
      sectorId
    );
  }

  public async hasAuditedStakeModule(playerAddress: string): Promise<boolean> {
    return this.staking.hasAuditedStakeModule(playerAddress);
  }

  public async hasSectorActiveSlashing(sectorId: string): Promise<boolean> {
    return this.staking.hasSectorActiveSlashing(sectorId);
  }

  // Death Mechanics
  public static calculateTipAmount(finalScore: number): number {
    return DeathMechanicsService.calculateTipAmount(finalScore);
  }

  public async executeDeadMansSwitch(
    victimPrivateKey: string,
    killerAddress: string,
    playerAddress: string
  ): Promise<{ deadMansSwitchHash: string; ethTransferHash: string | null }> {
    return this.death.executeDeadMansSwitch(
      victimPrivateKey,
      killerAddress,
      playerAddress
    );
  }

  public async executeDeadMansSlash(
    victimPrivateKey: string,
    killerAddress: string,
    playerAddress: string
  ): Promise<{ slashHash: string; ethTransferHash: string | null }> {
    return this.death.executeDeadMansSlash(
      victimPrivateKey,
      killerAddress,
      playerAddress
    );
  }

  public async executePilotTip(
    pilotPrivateKey: string,
    playerAddress: string,
    tipAmount: number
  ): Promise<string> {
    return this.death.executePilotTip(
      pilotPrivateKey,
      playerAddress,
      tipAmount
    );
  }

  /**
   * Pay pilot from GOD account (for cargo sales)
   */
  public async payPilotFromGod(
    pilotAddress: string,
    amountInCredits: number
  ): Promise<string> {
    const creditsContract = this.getContract("Credits");
    if (!creditsContract) {
      throw new Error("Credits contract not found. Run: yarn deploy");
    }

    const amountInWei = BigInt(amountInCredits) * BigInt(10 ** 18);
    
    // Check GOD's Credits balance before attempting transfer
    try {
      const godBalance = await this.publicClient.readContract({
        address: creditsContract.address as `0x${string}`,
        abi: creditsContract.abi,
        functionName: "balanceOf",
        args: [this.godAccount.address],
      });

      this.debugLog(
        `GOD Credits balance: ${Number(godBalance) / 1e18} | Attempting to pay: ${amountInCredits}`
      );

      if (godBalance < amountInWei) {
        throw new Error(
          `Insufficient GOD Credits balance. Has: ${
            Number(godBalance) / 1e18
          }, needs: ${amountInCredits}`
        );
      }
    } catch (error: any) {
      // If balance check fails, log but continue (might be contract issue)
      console.error(`⚠️ Failed to check GOD Credits balance: ${error.message}`);
    }
    
    // GOD account transfers credits to pilot
    const godAccount = privateKeyToAccount(this.config.godPrivateKey as `0x${string}`);
    
    const hash = await this.walletClient.writeContract({
      address: creditsContract.address as `0x${string}`,
      abi: creditsContract.abi,
      functionName: "transfer",
      args: [pilotAddress as `0x${string}`, amountInWei],
      account: godAccount,
      chain: this.getChain(),
    });
    
    await this.waitForTransactionReceipt(hash);
    return hash;
  }

  // Sector Contracts
  public async getSectorOwner(sectorId: string): Promise<string | null> {
    return this.sectors.getSectorOwner(sectorId);
  }

  public async getRegistryAddressForSector(
    sectorId: string
  ): Promise<string | null> {
    return this.sectors.getRegistryAddressForSector(sectorId);
  }

  public async getRegistryModule(
    registryAddress: string,
    moduleKey: string
  ): Promise<string | null> {
    return this.sectors.getRegistryModule(registryAddress, moduleKey);
  }

  public async checkAuditStatus(contractAddress: string): Promise<number> {
    return this.sectors.checkAuditStatus(contractAddress);
  }

  public async getAboutContractInfo(sectorId: string) {
    return this.sectors.getAboutContractInfo(sectorId);
  }

  public async calculateEnhancedTipAmount(
    finalScore: number,
    sectorId: string
  ) {
    return this.sectors.calculateEnhancedTipAmount(finalScore, sectorId);
  }

  public async getSectorBaseType(sectorId: string): Promise<number> {
    return this.sectors.getSectorBaseType(sectorId);
  }

  public async setSectorBaseType(
    sectorId: string,
    baseType: number
  ): Promise<string | null> {
    return this.sectors.setSectorBaseType(sectorId, baseType);
  }

  public async isChapter4Visible(): Promise<boolean> {
    return this.sectors.isChapter4Visible();
  }

  public async isChapter5Visible(playerAddress: string): Promise<boolean> {
    return this.sectors.isChapter5Visible(playerAddress);
  }

  public async isSectorUpgraded(sectorId: string): Promise<boolean> {
    return this.sectors.isSectorUpgraded(sectorId);
  }

  // Credential Operations
  public async hasPilotMintedFromPlayer(
    pilotAddress: string,
    playerAddress: string
  ): Promise<boolean> {
    return this.credentials.hasPilotMintedFromPlayer(
      pilotAddress,
      playerAddress
    );
  }

  public async getCredentialAddress(
    registryAddress: string
  ): Promise<string | null> {
    return this.credentials.getCredentialAddress(registryAddress);
  }

  public async checkPilotHasCredential(
    pilotAddress: string,
    sectorId: string
  ): Promise<boolean> {
    return this.credentials.checkPilotHasCredential(pilotAddress, sectorId);
  }

  public async attemptCredentialMint(
    pilotPrivateKey: string,
    credentialAddress: string,
    pilotAddress: string
  ) {
    return this.credentials.attemptCredentialMint(
      pilotPrivateKey,
      credentialAddress,
      pilotAddress
    );
  }

  public async getCredentialContractInfo(sectorId: string) {
    return this.credentials.getCredentialContractInfo(sectorId);
  }

  public async getStakeContractInfo(sectorId: string) {
    return this.staking.getStakeContractInfo(sectorId);
  }

  // Fuel Operations
  public async getFuelTokenPrice(fuelAddress: string): Promise<bigint> {
    return this.fuel.getFuelTokenPrice(fuelAddress);
  }

  public async getFuelTokenBalance(
    fuelAddress: string,
    holderAddress: string
  ): Promise<bigint> {
    return this.fuel.getFuelTokenBalance(fuelAddress, holderAddress);
  }

  public async buyFuelTokens(
    fromPilot: any,
    fuelAddress: string,
    amount: bigint
  ) {
    return this.fuel.buyFuelTokens(fromPilot, fuelAddress, amount);
  }

  public async callUpgrade(fromPilot: any, fuelAddress: string) {
    return this.fuel.callUpgrade(fromPilot, fuelAddress);
  }

  public async redeemFuelToken(
    fromPilot: any,
    fuelAddress: string
  ): Promise<void> {
    return this.fuel.redeemFuelToken(fromPilot, fuelAddress);
  }
}
