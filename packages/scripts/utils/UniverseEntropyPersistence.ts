import * as fs from "fs";
import * as path from "path";

/**
 * Persists Universe entropy commitment data to filesystem
 * This ensures we can recover the random number if the script crashes
 * between commit and reveal
 */

export interface UniverseEntropyCommitment {
  contractAddress: string;
  randomNumber: string; // bigint as string for JSON serialization
  commitmentHash: string;
  commitBlock: number;
  commitTimestamp: number;
  revealed: boolean;
}

export class UniverseEntropyPersistence {
  private dataDir: string;
  private debugMode: boolean;

  constructor(dataDir: string = "./data/universe-entropy", debugMode: boolean = false) {
    this.dataDir = dataDir;
    this.debugMode = debugMode;
    this.ensureDataDir();
  }

  private debugLog(message: string, data?: any): void {
    if (this.debugMode) {
      const timestamp = new Date().toISOString().split("T")[1].split(".")[0];
      if (data) {
        console.log(`💾 [${timestamp}] UniverseEntropy - ${message}:`, data);
      } else {
        console.log(`💾 [${timestamp}] UniverseEntropy - ${message}`);
      }
    }
  }

  /**
   * Ensure data directory exists
   */
  private ensureDataDir(): void {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
      this.debugLog(`Created data directory: ${this.dataDir}`);
    }
  }

  /**
   * Get the file path for a specific contract
   */
  private getFilePath(contractAddress: string): string {
    const normalizedAddress = contractAddress.toLowerCase();
    return path.join(this.dataDir, `${normalizedAddress}.json`);
  }

  /**
   * Save a commitment to disk
   */
  public saveCommitment(
    contractAddress: string,
    randomNumber: bigint,
    commitmentHash: string,
    commitBlock: number
  ): void {
    const commitment: UniverseEntropyCommitment = {
      contractAddress: contractAddress.toLowerCase(),
      randomNumber: randomNumber.toString(),
      commitmentHash,
      commitBlock,
      commitTimestamp: Date.now(),
      revealed: false,
    };

    const filePath = this.getFilePath(contractAddress);
    fs.writeFileSync(filePath, JSON.stringify(commitment, null, 2));
    
    console.log(`💾 Saved entropy commitment to disk: ${filePath}`);
    this.debugLog(`Commitment saved`, {
      contractAddress,
      commitmentHash,
      commitBlock,
    });
  }

  /**
   * Load a commitment from disk
   */
  public loadCommitment(contractAddress: string): UniverseEntropyCommitment | null {
    const filePath = this.getFilePath(contractAddress);
    
    if (!fs.existsSync(filePath)) {
      this.debugLog(`No saved commitment found for ${contractAddress}`);
      return null;
    }

    try {
      const data = fs.readFileSync(filePath, "utf-8");
      const commitment = JSON.parse(data) as UniverseEntropyCommitment;
      
      this.debugLog(`Loaded commitment from disk`, {
        contractAddress,
        commitBlock: commitment.commitBlock,
        revealed: commitment.revealed,
      });
      
      return commitment;
    } catch (error: any) {
      console.error(`⚠️  Failed to load commitment from ${filePath}: ${error.message}`);
      return null;
    }
  }

  /**
   * Mark a commitment as revealed
   */
  public markAsRevealed(contractAddress: string): void {
    const commitment = this.loadCommitment(contractAddress);
    if (!commitment) {
      console.warn(`⚠️  No commitment found to mark as revealed for ${contractAddress}`);
      return;
    }

    commitment.revealed = true;
    const filePath = this.getFilePath(contractAddress);
    fs.writeFileSync(filePath, JSON.stringify(commitment, null, 2));
    
    console.log(`✅ Marked commitment as revealed: ${filePath}`);
    this.debugLog(`Commitment marked as revealed`, { contractAddress });
  }

  /**
   * Check if there's a pending (unrevealed) commitment for a contract
   */
  public hasPendingCommitment(contractAddress: string): boolean {
    const commitment = this.loadCommitment(contractAddress);
    return commitment !== null && !commitment.revealed;
  }

  /**
   * Get the pending commitment if it exists
   */
  public getPendingCommitment(contractAddress: string): UniverseEntropyCommitment | null {
    const commitment = this.loadCommitment(contractAddress);
    if (commitment && !commitment.revealed) {
      return commitment;
    }
    return null;
  }

  /**
   * Clear commitment data for a contract (useful after successful reveal or when resetting)
   */
  public clearCommitment(contractAddress: string): void {
    const filePath = this.getFilePath(contractAddress);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`🗑️  Cleared commitment data: ${filePath}`);
      this.debugLog(`Commitment data cleared`, { contractAddress });
    }
  }

  /**
   * Get all saved commitments (useful for debugging)
   */
  public getAllCommitments(): UniverseEntropyCommitment[] {
    const commitments: UniverseEntropyCommitment[] = [];
    
    if (!fs.existsSync(this.dataDir)) {
      return commitments;
    }

    const files = fs.readdirSync(this.dataDir);
    for (const file of files) {
      if (file.endsWith(".json")) {
        try {
          const filePath = path.join(this.dataDir, file);
          const data = fs.readFileSync(filePath, "utf-8");
          const commitment = JSON.parse(data) as UniverseEntropyCommitment;
          commitments.push(commitment);
        } catch (error: any) {
          console.warn(`⚠️  Failed to load commitment from ${file}: ${error.message}`);
        }
      }
    }

    return commitments;
  }
}

