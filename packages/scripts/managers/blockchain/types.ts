// Shared types for blockchain services

// Re-export AboutContractInfo from main types
export type { AboutContractInfo } from "../../types";

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

export interface AboutContractInfo {
  hasAboutContract: boolean;
  stationName?: string;
  registryAddress?: string;
  aboutAddress?: string;
  isAudited?: boolean;
  auditedChapter?: number;
  error?: string;
}

export interface StakeResult {
  success: boolean;
  transactionHash?: string;
  error?: string;
  errorDetails?: string;
}

export interface CredentialMintResult {
  success: boolean;
  txHash?: string;
  alreadyOwned?: boolean;
  error?: string;
  errorDetails?: string;
}

export interface FuelPurchaseResult {
  success: boolean;
  txHash?: string;
  error?: string;
  errorDetails?: string;
}

export interface UpgradeResult {
  success: boolean;
  txHash?: string;
  error?: string;
  errorDetails?: string;
}

export interface DeathMechanicsResult {
  deadMansSwitchHash: string;
  slashHash: string;
  ethTransferHash: string | null;
}
