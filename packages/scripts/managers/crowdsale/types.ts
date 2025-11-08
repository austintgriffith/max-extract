// Crowdsale-specific types

export interface PlayerCrowdsaleState {
  playerAddress: string;
  fuelContractAddress: string;
  pilotPurchases: Map<string, number>; // pilotAddress -> tokensBought
  upgradeAttemptCount: number; // Track how many pilots tried upgrade
  isComplete: boolean; // Mark sale as done
  pricePerToken: bigint; // Cached from contract
  registryAddress: string; // For reference
}

