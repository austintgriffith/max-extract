import {
  createPublicClient,
  createWalletClient,
  http,
  formatEther,
  PublicClient,
  WalletClient,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import * as chains from "viem/chains";
import deployedContracts from "../../nextjs/contracts/deployedContracts";

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
      args,
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
      args,
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
      args,
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
}
