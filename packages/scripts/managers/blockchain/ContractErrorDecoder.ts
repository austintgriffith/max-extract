// Centralized contract error signature mapping and decoding utilities

export class ContractErrorDecoder {
  // Complete mapping of ALL contract error signatures for better debugging
  private static readonly ERROR_SIGNATURES: { [key: string]: string } = {
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

  /**
   * Decode an error signature from contract revert
   * @param error The error object from viem
   * @returns Decoded error message or null if not found
   */
  public static decodeError(error: any): string | null {
    let errorSignature = "";

    // Method 1: Check if error data has the signature
    if (error.data || error.cause?.data) {
      const errorData = error.data || error.cause?.data;
      errorSignature = typeof errorData === "string" ? errorData.slice(0, 10) : "";
    }

    // Method 2: Parse signature from error message if not found in data
    if (!errorSignature) {
      const errorMessage = error.shortMessage || error.message || "";
      const signatureMatch = errorMessage.match(/0x[0-9a-fA-F]{8}/);
      if (signatureMatch) {
        errorSignature = signatureMatch[0];
      }
    }

    // Decode the signature if found
    if (errorSignature && this.ERROR_SIGNATURES[errorSignature]) {
      return this.ERROR_SIGNATURES[errorSignature];
    } else if (errorSignature) {
      return `Unknown error signature: ${errorSignature}`;
    }

    return null;
  }

  /**
   * Get all error signatures (for testing/debugging)
   */
  public static getAllSignatures(): { [key: string]: string } {
    return { ...this.ERROR_SIGNATURES };
  }
}
