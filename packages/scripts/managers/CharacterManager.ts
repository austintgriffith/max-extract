import { keccak256, toHex } from "viem";
import { privateKeyToAddress } from "viem/accounts";
import * as fs from "fs";
import * as path from "path";

export interface Character {
  firstname: string;
  lastname: string;
  ship: "small" | "medium" | "large";
  fuel: number;
  cargo: number;
  aggression: number;
  intelligence: number;
  dexterity: number;
  privateKey: `0x${string}`;
  publicAddress: `0x${string}`;
}

export class CharacterManager {
  private characters: Map<string, Character> = new Map();
  private firstNames: string[] = [];
  private lastNames: string[] = [];
  private debugMode: boolean;

  constructor(debugMode: boolean = false) {
    this.debugMode = debugMode;
    this.loadNames();
  }

  private debugLog(message: string, data?: any): void {
    if (this.debugMode) {
      const timestamp = new Date().toISOString().split("T")[1].split(".")[0];
      if (data) {
        console.log(`👤 [${timestamp}] ${message}:`, data);
      } else {
        console.log(`👤 [${timestamp}] ${message}`);
      }
    }
  }

  private loadNames(): void {
    try {
      // Load first names
      const firstNamesPath = path.join(__dirname, "../../../firstnames.json");
      const firstNamesData = fs.readFileSync(firstNamesPath, "utf8");
      this.firstNames = JSON.parse(firstNamesData);

      // Load last names
      const lastNamesPath = path.join(__dirname, "../../../lastnames.json");
      const lastNamesData = fs.readFileSync(lastNamesPath, "utf8");
      this.lastNames = JSON.parse(lastNamesData);

      this.debugLog(
        `Loaded ${this.firstNames.length} first names and ${this.lastNames.length} last names`
      );
    } catch (error) {
      console.error("Failed to load name files:", error);
      throw error;
    }
  }

  /**
   * Generate a deterministic random number from 0-99 using a seed and offset
   */
  private generateDeterministicRandom(seed: string, offset: number): number {
    const combined = keccak256(toHex(seed + offset.toString()));
    const num = parseInt(combined.slice(2, 10), 16); // Use first 8 hex chars
    return num % 100;
  }

  /**
   * Generate a deterministic index for array selection
   */
  private generateDeterministicIndex(
    seed: string,
    offset: number,
    arrayLength: number
  ): number {
    const combined = keccak256(toHex(seed + offset.toString()));
    const num = parseInt(combined.slice(2, 10), 16); // Use first 8 hex chars
    return num % arrayLength;
  }

  /**
   * Generate a character deterministically from a keccak256 seed
   */
  public generateCharacter(seed: string): Character {
    this.debugLog(`Generating character from seed: ${seed}`);

    // Generate private key from seed
    const privateKey = keccak256(toHex(seed)) as `0x${string}`;
    const publicAddress = privateKeyToAddress(privateKey);

    // Use the seed to deterministically generate all properties
    const firstNameIndex = this.generateDeterministicIndex(
      seed,
      0,
      this.firstNames.length
    );
    const lastNameIndex = this.generateDeterministicIndex(
      seed,
      1,
      this.lastNames.length
    );
    const shipIndex = this.generateDeterministicIndex(seed, 2, 3); // 0, 1, or 2 for small, medium, large

    const firstname = this.firstNames[firstNameIndex];
    const lastname = this.lastNames[lastNameIndex];
    const ship = ["small", "medium", "large"][shipIndex] as
      | "small"
      | "medium"
      | "large";

    // Generate stats (0-100)
    const fuel = this.generateDeterministicRandom(seed, 3);
    const cargo = this.generateDeterministicRandom(seed, 4);
    const aggression = this.generateDeterministicRandom(seed, 5);
    const intelligence = this.generateDeterministicRandom(seed, 6);
    const dexterity = this.generateDeterministicRandom(seed, 7);

    const character: Character = {
      firstname,
      lastname,
      ship,
      fuel,
      cargo,
      aggression,
      intelligence,
      dexterity,
      privateKey,
      publicAddress,
    };

    // Store character using their address as the key
    this.characters.set(publicAddress, character);

    this.debugLog(`Generated character: ${firstname} ${lastname}`, {
      ship,
      fuel,
      cargo,
      aggression,
      intelligence,
      dexterity,
      address: publicAddress,
    });

    return character;
  }

  /**
   * Generate multiple characters from sequential seeds
   */
  public generateCharacters(baseSeed: string, count: number): Character[] {
    const characters: Character[] = [];

    for (let i = 0; i < count; i++) {
      const seed = keccak256(toHex(baseSeed + i.toString()));
      const character = this.generateCharacter(seed);
      characters.push(character);
    }

    this.debugLog(`Generated ${count} characters`);
    return characters;
  }

  /**
   * Get the total number of characters
   */
  public getCharacterCount(): number {
    return this.characters.size;
  }

  /**
   * Get a character by their address
   */
  public getCharacter(address: string): Character | undefined {
    return this.characters.get(address);
  }

  /**
   * List all characters
   */
  public listCharacters(): Character[] {
    return Array.from(this.characters.values());
  }

  /**
   * Get all character addresses
   */
  public getCharacterAddresses(): string[] {
    return Array.from(this.characters.keys());
  }

  /**
   * Clear all characters (useful for testing)
   */
  public clearCharacters(): void {
    this.characters.clear();
    this.debugLog("Cleared all characters");
  }
}
