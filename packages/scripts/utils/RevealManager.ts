import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import { keccak256 } from "viem";

export interface RevealData {
  roundNumber: number;
  revealNumber: string; // hex string
  commitHash: string; // hex string
  timestamp: number;
}

export class RevealManager {
  private dataDir: string;
  private revealsFile: string;

  constructor(contractAddress?: string, dataDir: string = "./data") {
    this.dataDir = path.join(dataDir, "reveals");

    if (contractAddress) {
      // Use contract-specific reveals file
      this.revealsFile = path.join(
        this.dataDir,
        `${contractAddress.toLowerCase()}.json`
      );
    } else {
      // Fallback to generic reveals file
      this.revealsFile = path.join(this.dataDir, "reveals.json");
    }

    this.ensureDataDir();
  }

  private ensureDataDir(): void {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
  }

  /**
   * Generate a random number and return both the number and its commitment hash
   */
  public generateCommitment(): { revealNumber: string; commitHash: string } {
    // Generate a 32-byte random number
    const randomBytes = crypto.randomBytes(32);
    const revealNumber = "0x" + randomBytes.toString("hex");

    // Create commitment hash using keccak256 to match Solidity
    const commitHash = keccak256(revealNumber as `0x${string}`);

    return { revealNumber, commitHash };
  }

  /**
   * Save a reveal for a specific round
   */
  public saveReveal(
    roundNumber: number,
    revealNumber: string,
    commitHash: string
  ): void {
    const reveals = this.loadReveals();

    const revealData: RevealData = {
      roundNumber,
      revealNumber,
      commitHash,
      timestamp: Date.now(),
    };

    reveals[roundNumber] = revealData;
    this.saveReveals(reveals);
  }

  /**
   * Get the reveal for a specific round
   */
  public getReveal(roundNumber: number): string | null {
    const reveals = this.loadReveals();
    return reveals[roundNumber]?.revealNumber || null;
  }

  /**
   * Get the commitment hash for a specific round
   */
  public getCommitHash(roundNumber: number): string | null {
    const reveals = this.loadReveals();
    return reveals[roundNumber]?.commitHash || null;
  }

  /**
   * Get the latest round number we have data for
   */
  public getLatestRound(): number {
    const reveals = this.loadReveals();
    const rounds = Object.keys(reveals).map(Number);
    return rounds.length > 0 ? Math.max(...rounds) : -1;
  }

  /**
   * Check if we have a reveal for a specific round
   */
  public hasReveal(roundNumber: number): boolean {
    const reveals = this.loadReveals();
    return reveals[roundNumber] !== undefined;
  }

  /**
   * Get all reveal data for debugging
   */
  public getAllReveals(): Record<number, RevealData> {
    return this.loadReveals();
  }

  /**
   * Clear all stored reveals (for testing/reset)
   */
  public clearReveals(): void {
    this.saveReveals({});
  }

  private loadReveals(): Record<number, RevealData> {
    try {
      if (fs.existsSync(this.revealsFile)) {
        const data = fs.readFileSync(this.revealsFile, "utf8");
        return JSON.parse(data);
      }
    } catch (error) {
      console.error("Error loading reveals:", error);
    }
    return {};
  }

  private saveReveals(reveals: Record<number, RevealData>): void {
    try {
      fs.writeFileSync(this.revealsFile, JSON.stringify(reveals, null, 2));
    } catch (error) {
      console.error("Error saving reveals:", error);
      throw error;
    }
  }
}
