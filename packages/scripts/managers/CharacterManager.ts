import { keccak256, toHex } from "viem";
import { privateKeyToAddress } from "viem/accounts";
import * as fs from "fs";
import * as path from "path";
import { SECTOR_CONFIG, PilotAssignment } from "../types";
import { BlockchainManager } from "./BlockchainManager";

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

export class PilotManager {
  private pilotAssignments: Map<string, PilotAssignment> = new Map();
  private debugMode: boolean;

  constructor(debugMode: boolean = false) {
    this.debugMode = debugMode;
  }

  private debugLog(message: string, data?: any): void {
    if (this.debugMode) {
      const timestamp = new Date().toISOString().split("T")[1].split(".")[0];
      if (data) {
        console.log(`🚁 [${timestamp}] PilotManager - ${message}:`, data);
      } else {
        console.log(`🚁 [${timestamp}] PilotManager - ${message}`);
      }
    }
  }

  public assignPilotToSector(pilotAddress: string, sectorId: string): void {
    this.pilotAssignments.set(pilotAddress, {
      pilotAddress,
      currentSectorId: sectorId,
      assignedAt: Date.now(),
      isDead: false,
      deathTime: null,
      killedBy: null,
    });
    this.debugLog(`Assigned pilot ${pilotAddress} to sector ${sectorId}`);
  }

  public releasePilotFromSector(pilotAddress: string): void {
    const assignment = this.pilotAssignments.get(pilotAddress);
    if (assignment) {
      const previousSector = assignment.currentSectorId;
      assignment.currentSectorId = null;
      this.debugLog(
        `Released pilot ${pilotAddress} from sector ${previousSector}`
      );
    }
  }

  public isPilotAvailable(pilotAddress: string): boolean {
    const assignment = this.pilotAssignments.get(pilotAddress);
    return (
      !assignment || (assignment.currentSectorId === null && !assignment.isDead)
    );
  }

  public getAvailablePilots(allPilots: string[]): string[] {
    return allPilots.filter((pilot) => this.isPilotAvailable(pilot));
  }

  public getPilotAssignment(pilotAddress: string): PilotAssignment | undefined {
    return this.pilotAssignments.get(pilotAddress);
  }

  public getAllAssignments(): PilotAssignment[] {
    return Array.from(this.pilotAssignments.values());
  }

  public getAssignedPilotsCount(): number {
    return Array.from(this.pilotAssignments.values()).filter(
      (assignment) => assignment.currentSectorId !== null
    ).length;
  }

  public clearAllAssignments(): void {
    this.pilotAssignments.clear();
    this.debugLog("Cleared all pilot assignments");
  }

  /**
   * Mark a pilot as dead when killed by another pilot
   */
  public markPilotAsDead(victimAddress: string, killerAddress: string): void {
    const assignment = this.pilotAssignments.get(victimAddress);
    if (assignment) {
      assignment.isDead = true;
      assignment.deathTime = Date.now();
      assignment.killedBy = killerAddress;
      assignment.currentSectorId = null; // Release from sector
      this.debugLog(
        `Marked pilot ${victimAddress} as dead, killed by ${killerAddress}`
      );
    } else {
      // Create new assignment record for the death
      this.pilotAssignments.set(victimAddress, {
        pilotAddress: victimAddress,
        currentSectorId: null,
        assignedAt: Date.now(),
        isDead: true,
        deathTime: Date.now(),
        killedBy: killerAddress,
      });
      this.debugLog(
        `Created death record for pilot ${victimAddress}, killed by ${killerAddress}`
      );
    }
  }

  /**
   * Check if a pilot is dead
   */
  public isPilotDead(pilotAddress: string): boolean {
    const assignment = this.pilotAssignments.get(pilotAddress);
    return assignment ? assignment.isDead : false;
  }

  /**
   * Get all dead pilots
   */
  public getDeadPilots(): PilotAssignment[] {
    return Array.from(this.pilotAssignments.values()).filter(
      (assignment) => assignment.isDead
    );
  }

  /**
   * Get death statistics
   */
  public getDeathStats(): {
    totalDeaths: number;
    recentDeaths: number; // Deaths in last hour
    killerStats: Map<string, number>; // Killer address -> kill count
  } {
    const deadPilots = this.getDeadPilots();
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    const killerStats = new Map<string, number>();

    let recentDeaths = 0;
    for (const pilot of deadPilots) {
      if (pilot.deathTime && pilot.deathTime > oneHourAgo) {
        recentDeaths++;
      }
      if (pilot.killedBy) {
        killerStats.set(
          pilot.killedBy,
          (killerStats.get(pilot.killedBy) || 0) + 1
        );
      }
    }

    return {
      totalDeaths: deadPilots.length,
      recentDeaths,
      killerStats,
    };
  }
}

export class CharacterManager {
  private characters: Map<string, Character> = new Map();
  private firstNames: string[] = [];
  private lastNames: string[] = [];
  private debugMode: boolean;
  private serverSecret: string;

  constructor(debugMode: boolean = false) {
    this.debugMode = debugMode;
    this.loadNames();

    // Generate or load a server-side secret for secure character generation
    // This secret should never be exposed publicly
    this.serverSecret = this.getOrGenerateServerSecret();
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
   * Generate or load a server-side secret for secure character generation
   * This secret is never exposed publicly and makes private keys unpredictable
   */
  private getOrGenerateServerSecret(): string {
    // Check if CHARACTER_SECRET is already set in environment
    if (
      process.env.CHARACTER_SECRET &&
      process.env.CHARACTER_SECRET.length > 0
    ) {
      this.debugLog("Loaded CHARACTER_SECRET from environment");
      return process.env.CHARACTER_SECRET;
    }

    // Generate new secret using crypto-secure randomness
    const crypto = require("crypto");
    const newSecret = crypto.randomBytes(32).toString("hex");

    // Echo the secret to .env file
    const envPath = path.join(__dirname, "../.env");
    const envLine = `CHARACTER_SECRET=${newSecret}\n`;

    try {
      // Append to .env file
      fs.appendFileSync(envPath, envLine);
      console.log("🔐 Generated new CHARACTER_SECRET and added to .env file");
      console.log(
        "⚠️  Please restart the server to load the new CHARACTER_SECRET"
      );
      this.debugLog("Generated and saved new CHARACTER_SECRET to .env");
    } catch (error) {
      console.warn("Could not save CHARACTER_SECRET to .env file:", error);
      console.log("🔐 Using generated secret in memory only for this session");
    }

    return newSecret;
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
   * SECURITY: Private key uses server secret + public seed, while character traits use only public seed
   */
  public generateCharacter(seed: string): Character {
    this.debugLog(`Generating character from seed: ${seed}`);

    // SECURITY FIX: Generate private key using server secret + public seed
    // This makes private keys unpredictable even if the public entropy is known
    const securePrivateKeySeed = keccak256(toHex(this.serverSecret + seed));
    const privateKey = keccak256(toHex(securePrivateKeySeed)) as `0x${string}`;
    const publicAddress = privateKeyToAddress(privateKey);

    // Use the PUBLIC seed to deterministically generate character traits
    // This ensures character traits are still predictable/verifiable from public entropy
    // while keeping private keys secure
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

    // Generate stats (0-100) using public seed for deterministic traits
    // Fuel starts at 23% for testing low fuel refueling logic (below LOW_FUEL_THRESHOLD of 20%)
    const fuel = 23;
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
      // Note: Private key intentionally not logged for security
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
   * Get a character by their address
   */
  public getCharacterByAddress(address: string): Character | undefined {
    return this.characters.get(address);
  }

  /**
   * Update a pilot's fuel level
   */
  public updatePilotFuel(address: string, newFuelLevel: number): void {
    const character = this.characters.get(address);
    if (character) {
      character.fuel = Math.max(0, Math.min(100, newFuelLevel)); // Clamp between 0-100
      this.debugLog(
        `Updated pilot ${character.firstname} ${character.lastname} fuel to ${character.fuel}%`
      );
    } else {
      this.debugLog(
        `Warning: Attempted to update fuel for unknown pilot ${address}`
      );
    }
  }

  /**
   * Clear all characters (useful for testing)
   */
  public clearCharacters(): void {
    this.characters.clear();
    this.debugLog("Cleared all characters");
  }

  /**
   * Get available pilots (characters not currently assigned to sectors)
   */
  public getAvailablePilots(pilotManager: PilotManager): Character[] {
    const allCharacters = this.listCharacters();
    return allCharacters.filter((char) =>
      pilotManager.isPilotAvailable(char.publicAddress)
    );
  }

  /**
   * Select a random available pilot using deterministic randomness
   * Verifies pilot is alive on blockchain before returning
   */
  public async selectRandomAvailablePilot(
    pilotManager: PilotManager,
    blockchainManager: BlockchainManager,
    randomValue: number
  ): Promise<Character | null> {
    const maxRetries = 10;
    let attemptCount = 0;

    while (attemptCount < maxRetries) {
      const availablePilots = this.getAvailablePilots(pilotManager);

      if (availablePilots.length === 0) {
        this.debugLog("No available pilots for selection");
        return null;
      }

      // Use deterministic randomness to select pilot
      const randomIndex = Math.floor(randomValue * availablePilots.length);
      const selectedPilot = availablePilots[randomIndex];

      // Verify pilot is actually alive on blockchain
      const isAliveOnBlockchain = await blockchainManager.isPilot(
        selectedPilot.publicAddress
      );

      if (isAliveOnBlockchain) {
        this.debugLog(
          `Selected pilot ${selectedPilot.firstname} ${selectedPilot.lastname} (${selectedPilot.ship} ship) from ${availablePilots.length} available pilots`
        );
        return selectedPilot;
      } else {
        // Pilot is dead on blockchain - mark them as dead locally
        console.log(
          `⚠️  Pilot ${selectedPilot.firstname} ${selectedPilot.lastname} (${selectedPilot.publicAddress}) is dead on blockchain, marking as dead locally`
        );
        pilotManager.markPilotAsDead(selectedPilot.publicAddress, "unknown");

        // Try again with a different random value to select another pilot
        randomValue = (randomValue + 0.1337) % 1; // Shift random value for next attempt
        attemptCount++;
      }
    }

    this.debugLog(`Failed to find alive pilot after ${maxRetries} attempts`);
    return null;
  }

  /**
   * Initialize characters and register them as pilots
   * This is the main orchestration method that handles the full character initialization flow
   */
  public async initializeCharacters(
    blockchainManager: BlockchainManager,
    entropyManager: { getUniverseEntropy: () => Promise<string | null> }
  ): Promise<void> {
    try {
      this.debugLog("Starting character initialization...");

      // Check if we already have characters
      const existingCharacterCount = this.getCharacterCount();

      if (existingCharacterCount > 0) {
        console.log(`🎭 Found existing ${existingCharacterCount} characters`);

        // Even with existing characters, check if they need to be added as pilots
        await this.addCharactersAsPilots(blockchainManager);

        this.debugLog("Using existing character list");
        return;
      }

      // No characters exist, generate new ones
      this.debugLog("No characters found, generating new character list...");
      await this.generateAndRegisterCharacters(
        blockchainManager,
        entropyManager
      );

      this.debugLog(
        `Character initialization complete. Total characters: ${this.getCharacterCount()}`
      );
    } catch (error: any) {
      console.error("❌ Failed to initialize characters:", error.message);
      this.debugLog("Character initialization error", error);
      throw error; // Re-throw to let caller handle if needed
    }
  }

  /**
   * Generate new characters and register them as pilots
   */
  private async generateAndRegisterCharacters(
    blockchainManager: BlockchainManager,
    entropyManager: { getUniverseEntropy: () => Promise<string | null> }
  ): Promise<void> {
    // Start timer for character generation
    const startTime = performance.now();

    // Generate characters using universe entropy as base seed
    const universeEntropy = await entropyManager.getUniverseEntropy();
    const baseSeed = universeEntropy || "default_seed_for_characters";

    console.log(
      `🎲 Using universe entropy for pilot generation: ${baseSeed.slice(
        0,
        10
      )}...${baseSeed.slice(-8)}`
    );

    const characters = this.generateCharacters(
      baseSeed,
      SECTOR_CONFIG.CHARACTER_COUNT
    );

    // Calculate generation time
    const endTime = performance.now();
    const generationTime = Math.round(endTime - startTime);

    console.log(
      `🎭 Generated ${characters.length} new characters in ${generationTime}ms`
    );

    // Add all character addresses as pilots to the Game contract
    await this.addCharactersAsPilots(blockchainManager);
  }

  /**
   * Add all generated character addresses as pilots to the Game contract
   */
  private async addCharactersAsPilots(
    blockchainManager: BlockchainManager
  ): Promise<void> {
    try {
      this.debugLog("Adding character addresses as pilots to Game contract...");

      // Get all character addresses
      const characterAddresses = this.getCharacterAddresses();

      if (characterAddresses.length === 0) {
        this.debugLog("No characters to add as pilots");
        return;
      }

      // Check how many pilots are already in the contract
      const existingPilotCount = await blockchainManager.getPilotCount();
      console.log(`🎯 Current pilots in Game contract: ${existingPilotCount}`);

      // Filter out addresses that are already pilots (to avoid revert on duplicate)
      const newPilotAddresses: string[] = [];
      for (const address of characterAddresses) {
        const isAlreadyPilot = await blockchainManager.isPilot(address);
        if (!isAlreadyPilot) {
          newPilotAddresses.push(address);
        }
      }

      if (newPilotAddresses.length === 0) {
        console.log(
          "🎯 All character addresses are already pilots in the Game contract"
        );
        return;
      }

      console.log(
        `🎯 Adding ${newPilotAddresses.length} new character addresses as pilots to Game contract...`
      );

      // Add pilots in batches using configurable batch size
      await blockchainManager.addPilotsToGame(
        newPilotAddresses,
        SECTOR_CONFIG.PILOT_BATCH_SIZE
      );

      // Verify the final count
      const finalPilotCount = await blockchainManager.getPilotCount();
      console.log(`🎯 Final pilots in Game contract: ${finalPilotCount}`);

      this.debugLog("Successfully added all character addresses as pilots");
    } catch (error: any) {
      console.error("❌ Failed to add characters as pilots:", error.message);
      this.debugLog("Pilot addition error details:", error);
      // Don't throw here - character generation was successful, pilot addition is supplementary
    }
  }
}
