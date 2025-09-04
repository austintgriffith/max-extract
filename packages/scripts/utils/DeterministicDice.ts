import { keccak256 } from "viem";

export class DeterministicDice {
  private entropy: string;
  private position: number;

  constructor(randomHash: string) {
    // Strip 0x prefix and store as entropy
    this.entropy = randomHash.startsWith("0x")
      ? randomHash.slice(2)
      : randomHash;
    this.position = 0;
    console.log(
      `🎲 Initialized DeterministicDice with entropy: ${this.entropy.slice(
        0,
        16
      )}...`
    );
  }

  /**
   * Roll x dice (use x characters from entropy)
   * @param count Number of dice to roll (hex characters to consume)
   * @returns Combined dice result
   */
  public roll(count: number = 1): number {
    let result = 0;

    for (let i = 0; i < count; i++) {
      // Check if we need to rehash entropy
      if (this.position >= this.entropy.length) {
        console.log(`🔄 Rehashing entropy at position ${this.position}`);
        this.rehashEntropy();
      }

      // Get next hex character and convert to 0-15
      const hexChar = this.entropy[this.position];
      const value = parseInt(hexChar, 16);

      // For multiple dice, we'll combine them (this creates more variation)
      result = (result << 4) + value;
      this.position++;
    }

    return result;
  }

  /**
   * Roll a dice with a specific range (0 to max-1)
   * @param max Maximum value (exclusive)
   * @param diceCount Number of hex characters to use for more entropy
   * @returns Random number from 0 to max-1
   */
  public rollRange(max: number, diceCount: number = 4): number {
    const rawRoll = this.roll(diceCount);
    return rawRoll % max;
  }

  /**
   * Roll a dice with a specific range (min to max inclusive)
   * @param min Minimum value (inclusive)
   * @param max Maximum value (inclusive)
   * @param diceCount Number of hex characters to use for more entropy
   * @returns Random number from min to max
   */
  public rollBetween(min: number, max: number, diceCount: number = 4): number {
    const range = max - min + 1;
    return min + this.rollRange(range, diceCount);
  }

  /**
   * Roll a percentage (0-99)
   * @param diceCount Number of hex characters to use
   * @returns Random percentage from 0 to 99
   */
  public rollPercent(diceCount: number = 2): number {
    return this.rollRange(100, diceCount);
  }

  /**
   * Roll a boolean with given probability
   * @param probability Probability of true (0.0 to 1.0)
   * @param diceCount Number of hex characters to use
   * @returns Boolean result
   */
  public rollBool(probability: number = 0.5, diceCount: number = 2): boolean {
    const roll = this.rollPercent(diceCount);
    return roll < probability * 100;
  }

  /**
   * Get current entropy position for debugging
   */
  public getPosition(): number {
    return this.position;
  }

  /**
   * Get remaining entropy characters
   */
  public getRemainingEntropy(): number {
    return this.entropy.length - this.position;
  }

  private rehashEntropy(): void {
    // Hash the current entropy to get new entropy using keccak256
    const currentEntropy = "0x" + this.entropy;
    this.entropy = keccak256(currentEntropy as `0x${string}`).slice(2);
    this.position = 0;
    console.log(`🔄 New entropy: ${this.entropy.slice(0, 16)}...`);
  }
}

/**
 * Create a sector-specific deterministic dice from rolling entropy
 * @param rollingEntropy The current rolling entropy from the contract
 * @param sectorId The sector ID to create sector-specific randomness
 * @returns DeterministicDice instance for this sector
 */
export function createSectorDice(
  rollingEntropy: string,
  sectorId: string
): DeterministicDice {
  // Combine rolling entropy with sector ID to create sector-specific entropy
  const sectorSpecificEntropy = keccak256(
    (rollingEntropy + sectorId.padStart(64, "0")) as `0x${string}`
  );

  console.log(
    `🎯 Creating sector ${sectorId} dice from entropy: ${sectorSpecificEntropy.slice(
      0,
      18
    )}...`
  );

  return new DeterministicDice(sectorSpecificEntropy);
}

export default DeterministicDice;
