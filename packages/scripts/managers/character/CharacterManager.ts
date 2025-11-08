import { keccak256, toHex } from "viem";
import { privateKeyToAddress } from "viem/accounts";
import * as fs from "fs";
import * as path from "path";
import { SECTOR_CONFIG } from "../../types";
import { BlockchainManager } from "../blockchain";
import type { Character } from "./types";
import type { PilotManager } from "./PilotManager";

export class CharacterManager {
  private characters: Map<string, Character> = new Map();
  private firstNames: string[] = [];
  private lastNames: string[] = [];
  private debugMode: boolean;
  private serverSecret: string;
  private gameContractAddressForCharacters: string | null = null; // Track which Game contract these characters belong to

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
      // Load first names (adjusted path for character/ subdirectory)
      const firstNamesPath = path.join(__dirname, "../../../../firstnames.json");
      const firstNamesData = fs.readFileSync(firstNamesPath, "utf8");
      this.firstNames = JSON.parse(firstNamesData);

      // Load last names (adjusted path for character/ subdirectory)
      const lastNamesPath = path.join(__dirname, "../../../../lastnames.json");
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
    const shipNumber = this.generateDeterministicIndex(seed, 2, 12); // 0-11 mapped to 1-12

    const firstname = this.firstNames[firstNameIndex];
    const lastname = this.lastNames[lastNameIndex];
    const ship = shipNumber + 1; // Convert 0-11 to 1-12

    // Generate stats (0-100) using public seed for deterministic traits
    // Fuel starts at a random value between 30-100%
    const fuelRandom = this.generateDeterministicRandom(seed, 3); // 0-99
    const fuel = 30 + Math.floor((fuelRandom / 100) * 70); // Scale to 30-100 range
    const cargo = this.generateDeterministicRandom(seed, 4);
    const aggression = this.generateDeterministicRandom(seed, 5);
    const intelligence = this.generateDeterministicRandom(seed, 6);
    const dexterity = this.generateDeterministicRandom(seed, 7);

    // Generate credits (10,000 to 100,000) using public seed for deterministic traits
    const creditsRandom = this.generateDeterministicRandom(seed, 8); // 0-99
    const credits = 10000 + Math.floor((creditsRandom / 100) * 90000); // Scale to 10,000-100,000 range

    const character: Character = {
      firstname,
      lastname,
      ship,
      fuel,
      cargo,
      aggression,
      intelligence,
      dexterity,
      credits,
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
      credits,
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
   * Clear all characters (useful for testing or when Game contract changes)
   */
  public clearCharacters(): void {
    this.characters.clear();
    this.gameContractAddressForCharacters = null;
    this.debugLog("Cleared all characters and reset Game contract address");
  }

  /**
   * Save all characters to a JSON file
   * This allows recovery of pilots after server restart
   */
  private saveCharactersToFile(gameContractAddress?: string): void {
    try {
      const characters = this.listCharacters();
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const filename = `pilots-${timestamp}.json`;
      const filepath = path.join(process.cwd(), "pilot-backups", filename);

      // Create backup directory if it doesn't exist
      const backupDir = path.join(process.cwd(), "pilot-backups");
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }

      // Also save to a "latest" file for easy recovery
      const latestFilepath = path.join(backupDir, "pilots-latest.json");

      const data = {
        timestamp: new Date().toISOString(),
        gameContractAddress: gameContractAddress || "unknown",
        characterCount: characters.length,
        characters: characters.map((char) => ({
          firstname: char.firstname,
          lastname: char.lastname,
          ship: char.ship,
          fuel: char.fuel,
          cargo: char.cargo,
          aggression: char.aggression,
          intelligence: char.intelligence,
          dexterity: char.dexterity,
          credits: char.credits,
          privateKey: char.privateKey,
          publicAddress: char.publicAddress,
        })),
      };

      // Save timestamped version
      fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
      console.log(`💾 Saved ${characters.length} pilots to ${filename}`);

      // Save latest version
      fs.writeFileSync(latestFilepath, JSON.stringify(data, null, 2));
      console.log(`💾 Updated pilots-latest.json`);

      this.debugLog(`Characters saved to ${filepath}`);
    } catch (error: any) {
      console.error(`❌ Failed to save characters to file: ${error.message}`);
      this.debugLog("Save characters error:", error);
    }
  }

  /**
   * Load characters from the latest backup file
   * Returns true if characters were loaded, false otherwise
   * Also checks if the Game contract address matches to ensure pilots are for the current deployment
   */
  public loadCharactersFromFile(currentGameContractAddress?: string): boolean {
    try {
      const latestFilepath = path.join(
        process.cwd(),
        "pilot-backups",
        "pilots-latest.json"
      );

      if (!fs.existsSync(latestFilepath)) {
        this.debugLog("No pilot backup file found");
        return false;
      }

      const fileContent = fs.readFileSync(latestFilepath, "utf-8");
      const data = JSON.parse(fileContent);

      if (!data.characters || !Array.isArray(data.characters)) {
        console.warn("⚠️  Invalid pilot backup file format");
        return false;
      }

      // Check if the backup is for a different Game contract deployment
      if (currentGameContractAddress) {
        // If backup doesn't have gameContractAddress, reject it (old format)
        if (!data.gameContractAddress) {
          console.log(
            "🔄 Backup file missing Game contract address (old format)"
          );
          console.log(
            `   Current Game contract: ${currentGameContractAddress}`
          );
          console.log(`   Generating new pilots for current deployment...`);
          return false;
        }

        // If addresses don't match, reject the backup
        if (
          data.gameContractAddress.toLowerCase() !==
          currentGameContractAddress.toLowerCase()
        ) {
          console.log(
            "🔄 Backup pilots are from a different Game contract deployment"
          );
          console.log(`   Backup Game contract: ${data.gameContractAddress}`);
          console.log(
            `   Current Game contract: ${currentGameContractAddress}`
          );
          console.log(`   Generating new pilots for current deployment...`);
          return false;
        }
      }

      // Load characters into memory
      for (const charData of data.characters) {
        const character: Character = {
          firstname: charData.firstname,
          lastname: charData.lastname,
          ship: charData.ship,
          fuel: charData.fuel,
          cargo: charData.cargo,
          aggression: charData.aggression,
          intelligence: charData.intelligence,
          dexterity: charData.dexterity,
          // Backward compatibility: if credits doesn't exist, generate random value
          credits:
            charData.credits !== undefined
              ? charData.credits
              : 10000 + Math.floor(Math.random() * 90000),
          privateKey: charData.privateKey as `0x${string}`,
          publicAddress: charData.publicAddress as `0x${string}`,
        };
        this.characters.set(character.publicAddress, character);
      }

      // Store the Game contract address these characters belong to
      this.gameContractAddressForCharacters =
        currentGameContractAddress || null;

      console.log(
        `📂 Loaded ${data.characters.length} pilots from backup file`
      );
      console.log(`   Backup timestamp: ${data.timestamp}`);
      if (data.gameContractAddress) {
        console.log(`   Game contract: ${data.gameContractAddress}`);
      }
      this.debugLog(`Characters loaded from ${latestFilepath}`);
      return true;
    } catch (error: any) {
      console.error(`❌ Failed to load characters from file: ${error.message}`);
      this.debugLog("Load characters error:", error);
      return false;
    }
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
   *
   * Pilots are generated using a combination of:
   * - Game contract address (ensures unique pilots per deployment)
   * - Universe entropy (ensures deterministic generation)
   */
  public async initializeCharacters(
    blockchainManager: BlockchainManager,
    entropyManager: { getUniverseEntropy: () => Promise<string | null> }
  ): Promise<void> {
    try {
      this.debugLog("Starting character initialization...");

      // Get Game contract address for pilot generation validation
      const gameContractAddress =
        blockchainManager.getContract("Game")?.address;
      if (!gameContractAddress) {
        throw new Error("Game contract not found - cannot initialize pilots");
      }

      // Check if we already have characters in memory
      const existingCharacterCount = this.getCharacterCount();

      if (existingCharacterCount > 0) {
        // Validate that in-memory characters match the current Game contract
        if (
          this.gameContractAddressForCharacters &&
          this.gameContractAddressForCharacters.toLowerCase() ===
            gameContractAddress.toLowerCase()
        ) {
          console.log(
            `🎭 Found existing ${existingCharacterCount} characters in memory (matching Game contract)`
          );

          // Even with existing characters, check if they need to be added as pilots
          await this.addCharactersAsPilots(blockchainManager);

          this.debugLog("Using existing character list");
          return;
        } else {
          // Game contract has changed - clear old characters
          console.log(
            `🔄 Game contract changed, clearing old pilots from memory`
          );
          if (this.gameContractAddressForCharacters) {
            console.log(
              `   Old Game contract: ${this.gameContractAddressForCharacters}`
            );
          }
          console.log(`   New Game contract: ${gameContractAddress}`);
          this.clearCharacters();
        }
      }

      // Try to load characters from backup file (with Game contract validation)
      console.log("🔍 Checking for pilot backup file...");
      const loadedFromFile = this.loadCharactersFromFile(gameContractAddress);

      if (loadedFromFile) {
        // Double-check: if Game contract has 0 pilots but we have backup,
        // this might be a fresh deployment - verify backup is still valid
        const contractPilotCount = await blockchainManager.getPilotCount();

        if (contractPilotCount === 0 && this.getCharacterCount() > 0) {
          console.log(`⚠️  Game contract has 0 pilots but backup exists`);
          console.log(
            `   This might be a fresh deployment - generating new pilots...`
          );
          this.clearCharacters();
          // Fall through to generate new pilots
        } else {
          console.log(
            `✅ Successfully loaded pilots from backup (matching Game contract)`
          );

          // Check if they need to be added as pilots to the contract
          await this.addCharactersAsPilots(blockchainManager);

          this.debugLog("Using characters loaded from backup file");
          return;
        }
      }

      // No characters exist in memory or file, generate new ones
      console.log("📝 No backup found, generating new character list...");
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

    // Get Game contract address to use as part of entropy
    const gameContractAddress = blockchainManager.getContract("Game")?.address;
    if (!gameContractAddress) {
      throw new Error("Game contract not found - cannot generate pilots");
    }

    // Generate characters using universe entropy + Game contract address as base seed
    // This ensures each new deployment creates a unique set of pilots
    const universeEntropy = await entropyManager.getUniverseEntropy();
    const entropyPart = universeEntropy || "default_seed_for_characters";

    // Combine Game contract address with universe entropy for unique pilot set per deployment
    const baseSeed = keccak256(toHex(gameContractAddress + entropyPart));

    console.log(
      `🎲 Generating pilots using Game contract (${gameContractAddress.slice(
        0,
        10
      )}...) + universe entropy`
    );
    console.log(
      `   Combined seed: ${baseSeed.slice(0, 10)}...${baseSeed.slice(-8)}`
    );

    const characters = this.generateCharacters(
      baseSeed,
      SECTOR_CONFIG.CHARACTER_COUNT
    );

    // Store the Game contract address these characters belong to
    this.gameContractAddressForCharacters = gameContractAddress;

    // Calculate generation time
    const endTime = performance.now();
    const generationTime = Math.round(endTime - startTime);

    console.log(
      `🎭 Generated ${characters.length} new characters in ${generationTime}ms`
    );

    // Save characters to backup file with Game contract address
    this.saveCharactersToFile(gameContractAddress);

    // Add all character addresses as pilots to the Game contract
    await this.addCharactersAsPilots(blockchainManager);
  }

  /**
   * Add all generated character addresses as pilots to the Game contract
   * Ensures each pilot has at least CHARACTER_ETH by checking balances first
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

      // Filter addresses into two groups:
      // 1. New pilots that need to be added to contract
      // 2. Existing pilots that just need balance top-up
      const newPilotAddresses: string[] = [];
      const existingPilotAddresses: string[] = [];

      for (const address of characterAddresses) {
        const isAlreadyPilot = await blockchainManager.isPilot(address);
        if (isAlreadyPilot) {
          existingPilotAddresses.push(address);
        } else {
          newPilotAddresses.push(address);
        }
      }

      // Check balances for all addresses (both new and existing pilots)
      const publicClient = blockchainManager.getPublicClient();
      const requiredBalance = BigInt(
        Math.floor(parseFloat(SECTOR_CONFIG.CHARACTER_ETH.toString()) * 1e18)
      );

      const addressesNeedingFunds: string[] = [];

      console.log(
        `💰 Checking balances for ${characterAddresses.length} addresses...`
      );
      console.log(
        `   Required minimum balance: ${SECTOR_CONFIG.CHARACTER_ETH} ETH`
      );

      for (const address of characterAddresses) {
        const balance = await publicClient.getBalance({
          address: address as `0x${string}`,
        });

        if (balance < requiredBalance) {
          addressesNeedingFunds.push(address);
          const balanceEth = (Number(balance) / 1e18).toFixed(6);
          this.debugLog(
            `Address ${address.slice(
              0,
              10
            )}... needs funds (current: ${balanceEth} ETH)`
          );
        }
      }

      console.log(
        `   💸 ${addressesNeedingFunds.length} addresses need funding`
      );
      console.log(
        `   ✅ ${
          characterAddresses.length - addressesNeedingFunds.length
        } addresses already funded`
      );

      // Process new pilots that need to be added to the contract
      if (newPilotAddresses.length > 0) {
        console.log(
          `🎯 Adding ${newPilotAddresses.length} new pilots to Game contract...`
        );

        // Only send ETH to new pilots that actually need it
        const newPilotsNeedingFunds = newPilotAddresses.filter((addr) =>
          addressesNeedingFunds.includes(addr)
        );

        if (newPilotsNeedingFunds.length > 0) {
          console.log(
            `💰 Funding ${newPilotsNeedingFunds.length} new pilots with ${SECTOR_CONFIG.CHARACTER_ETH} ETH each`
          );

          await blockchainManager.addPilotsToGame(
            newPilotsNeedingFunds,
            SECTOR_CONFIG.PILOT_BATCH_SIZE,
            SECTOR_CONFIG.CHARACTER_ETH.toString()
          );
        }

        // Add new pilots that already have enough funds (send 0 ETH)
        const newPilotsAlreadyFunded = newPilotAddresses.filter(
          (addr) => !addressesNeedingFunds.includes(addr)
        );

        if (newPilotsAlreadyFunded.length > 0) {
          console.log(
            `🎯 Adding ${newPilotsAlreadyFunded.length} new pilots without funding (already have sufficient balance)`
          );

          await blockchainManager.addPilotsToGame(
            newPilotsAlreadyFunded,
            SECTOR_CONFIG.PILOT_BATCH_SIZE,
            "0" // No ETH needed
          );
        }
      }

      // Top up existing pilots that need more funds
      const existingPilotsNeedingFunds = existingPilotAddresses.filter((addr) =>
        addressesNeedingFunds.includes(addr)
      );

      if (existingPilotsNeedingFunds.length > 0) {
        console.log(
          `💰 Topping up ${existingPilotsNeedingFunds.length} existing pilots to ${SECTOR_CONFIG.CHARACTER_ETH} ETH`
        );

        // For existing pilots, we need to send them ETH directly
        await blockchainManager.fundAddresses(
          existingPilotsNeedingFunds,
          SECTOR_CONFIG.CHARACTER_ETH.toString()
        );
      }

      if (
        newPilotAddresses.length === 0 &&
        existingPilotsNeedingFunds.length === 0
      ) {
        console.log(
          "✅ All character addresses are already pilots with sufficient balance"
        );
      }

      // Verify the final count
      const finalPilotCount = await blockchainManager.getPilotCount();
      console.log(`🎯 Final pilots in Game contract: ${finalPilotCount}`);

      // Mint CREDITS tokens to pilots that don't have any yet
      console.log(`💰 Checking and minting CREDITS tokens to pilots...`);

      const recipientsToMint: string[] = [];
      const amountsToMint: bigint[] = [];

      for (const character of this.listCharacters()) {
        try {
          // Check current CREDITS balance
          const currentCredits = await blockchainManager.getCreditsBalance(
            character.publicAddress
          );

          if (currentCredits === 0n) {
            // Convert credits to wei (18 decimals)
            const creditsToMint = BigInt(character.credits) * BigInt(10 ** 18);

            this.debugLog(
              `Queuing ${character.credits.toLocaleString()} CREDITS for ${
                character.firstname
              } ${character.lastname} (${character.publicAddress.slice(0, 10)}...)`
            );

            recipientsToMint.push(character.publicAddress);
            amountsToMint.push(creditsToMint);
          } else {
            // Pilot already has credits
            const creditsFormatted = (
              Number(currentCredits) / 1e18
            ).toLocaleString();
            this.debugLog(
              `${character.firstname} ${character.lastname} already has ${creditsFormatted} CREDITS, skipping mint`
            );
          }
        } catch (error: any) {
          console.error(
            `⚠️  Failed to check credits for ${character.firstname} ${character.lastname}:`,
            error.message
          );
        }
      }

      // Batch mint all at once if there are any recipients
      if (recipientsToMint.length > 0) {
        try {
          await blockchainManager.batchMintCredits(
            recipientsToMint,
            amountsToMint
          );
          console.log(`💰 Minted CREDITS to ${recipientsToMint.length} pilots in single transaction`);
        } catch (error: any) {
          console.error(
            `⚠️  Failed to batch mint credits:`,
            error.message
          );
        }
      } else {
        console.log(`✅ All pilots already have CREDITS tokens`);
      }

      this.debugLog("Successfully processed all character addresses as pilots");
    } catch (error: any) {
      console.error("❌ Failed to add characters as pilots:", error.message);
      this.debugLog("Pilot addition error details:", error);
      // Don't throw here - character generation was successful, pilot addition is supplementary
    }
  }
}
