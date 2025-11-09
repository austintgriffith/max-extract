// Spawning logic for asteroids and ships

import { randomBytes } from "crypto";
import type { Sector } from "../Sector";
import type { Vector2D, Asteroid, Ship } from "../types";
import { SECTOR_CONFIG } from "../types";
import type { CharacterManager, PilotManager } from "../managers/character";
import type { BlockchainManager } from "../managers/blockchain";
import { parseEther, formatEther } from "viem";
import {
  getShipModel,
  canShipEnterAirspaceClass,
} from "../utils/airspaceUtils";

export class SectorSpawnManager {
  constructor(
    private sector: Sector,
    private characterManager: CharacterManager,
    private pilotManager: PilotManager,
    private blockchainManager: BlockchainManager,
    private crowdsaleManager: any,
    private getRandom: () => number,
    private debugMode: boolean = false
  ) {}

  private debugLog(message: string, data?: any): void {
    if (this.debugMode) {
      const timestamp = new Date().toISOString().split("T")[1].split(".")[0];
      if (data) {
        console.log(`🚀 [${timestamp}] SectorSpawn - ${message}:`, data);
      } else {
        console.log(`🚀 [${timestamp}] SectorSpawn - ${message}`);
      }
    }
  }

  private generateId(): string {
    return randomBytes(8).toString("hex");
  }

  public getRandomEdgePosition(): { position: Vector2D; velocity: Vector2D } {
    const side = Math.floor(this.getRandom() * 4); // 0: top, 1: right, 2: bottom, 3: left
    const speed = SECTOR_CONFIG.ASTEROID_SPEED + (this.getRandom() - 0.5) * 10;

    let position: Vector2D;
    let velocity: Vector2D;

    switch (side) {
      case 0: // top
        position = { x: this.getRandom() * SECTOR_CONFIG.WIDTH, y: 0 };
        velocity = { x: (this.getRandom() - 0.5) * speed, y: speed };
        break;
      case 1: // right
        position = {
          x: SECTOR_CONFIG.WIDTH,
          y: this.getRandom() * SECTOR_CONFIG.HEIGHT,
        };
        velocity = { x: -speed, y: (this.getRandom() - 0.5) * speed };
        break;
      case 2: // bottom
        position = {
          x: this.getRandom() * SECTOR_CONFIG.WIDTH,
          y: SECTOR_CONFIG.HEIGHT,
        };
        velocity = { x: (this.getRandom() - 0.5) * speed, y: -speed };
        break;
      case 3: // left
        position = { x: 0, y: this.getRandom() * SECTOR_CONFIG.HEIGHT };
        velocity = { x: speed, y: (this.getRandom() - 0.5) * speed };
        break;
      default:
        position = { x: 0, y: 0 };
        velocity = { x: speed, y: 0 };
    }

    return { position, velocity };
  }

  public getShipSpawnPosition(angle: number): {
    position: Vector2D;
    velocity: Vector2D;
  } {
    const radians = (angle * Math.PI) / 180;
    const speed = SECTOR_CONFIG.SHIP_SPEED;

    // Spawn at random position along edge based on angle
    let position: Vector2D;
    if (angle >= 315 || angle < 45) {
      // right edge
      position = {
        x: SECTOR_CONFIG.WIDTH,
        y: this.getRandom() * SECTOR_CONFIG.HEIGHT,
      };
    } else if (angle >= 45 && angle < 135) {
      // bottom edge
      position = {
        x: this.getRandom() * SECTOR_CONFIG.WIDTH,
        y: SECTOR_CONFIG.HEIGHT,
      };
    } else if (angle >= 135 && angle < 225) {
      // left edge
      position = { x: 0, y: this.getRandom() * SECTOR_CONFIG.HEIGHT };
    } else {
      // top edge
      position = { x: this.getRandom() * SECTOR_CONFIG.WIDTH, y: 0 };
    }

    const velocity = {
      x: Math.cos(radians) * speed,
      y: Math.sin(radians) * speed,
    };

    return { position, velocity };
  }

  // This method will be implemented fully - placeholder for now
  // Implementation needs to be extracted from Sector.ts lines 1298-1657
  public spawnAsteroid(
    asteroids: Map<string, Asteroid>,
    broadcastEvent: (event: any) => void,
    notifyWaitingShips: () => void
  ): void {
    const { position, velocity } = this.getRandomEdgePosition();

    // Randomly select asteroid size category
    const sizeCategories: (keyof typeof SECTOR_CONFIG.ASTEROID_SIZES)[] = [
      "small",
      "medium",
      "large",
    ];
    const randomIndex = Math.floor(this.getRandom() * sizeCategories.length);
    const sizeCategory = sizeCategories[randomIndex];
    const sizeConfig = SECTOR_CONFIG.ASTEROID_SIZES[sizeCategory];

    const asteroid: Asteroid = {
      id: this.generateId(),
      position,
      velocity,
      size: sizeConfig.size,
      sizeCategory: sizeCategory,
      resources:
        sizeConfig.minResources +
        this.getRandom() * (sizeConfig.maxResources - sizeConfig.minResources),
      spawnTime: Date.now(),
    };

    this.debugLog(
      `Spawning asteroid ${asteroid.id} at (${Math.round(
        position.x
      )}, ${Math.round(position.y)}) size: ${sizeCategory} (${asteroid.size})`
    );

    asteroids.set(asteroid.id, asteroid);
    broadcastEvent({
      type: "asteroid_spawn",
      timestamp: Date.now(),
      data: asteroid,
    });

    // Notify all waiting ships (those without targets) about the new asteroid
    notifyWaitingShips();
  }

  // Full implementation extracted from Sector.ts
  // This is a complex method that will be properly implemented
  public async spawnShip(
    asteroids: Map<string, Asteroid>,
    ships: Map<string, Ship>,
    sectorId: string,
    gameLoopCounter: number,
    assignTarget: (ship: Ship, reason: string, force: boolean) => Promise<void>,
    attemptCredentialMinting: (ship: Ship) => Promise<void>,
    broadcastEvent: (event: any) => void
  ): Promise<void> {
    if (asteroids.size === 0) return;

    // Select an available pilot
    const selectedPilot =
      await this.characterManager.selectRandomAvailablePilot(
        this.pilotManager,
        this.blockchainManager,
        this.getRandom()
      );

    if (!selectedPilot) {
      const totalPilots = this.characterManager.getCharacterCount();
      const assignedPilots = this.pilotManager.getAssignedPilotsCount();
      console.log(
        `❌ No available pilots for ship spawning in sector ${sectorId} - ${assignedPilots}/${totalPilots} pilots currently assigned to sectors`
      );
      return;
    }

    // Assign pilot to this sector
    this.pilotManager.assignPilotToSector(
      selectedPilot.publicAddress,
      sectorId
    );

    // Chapter 4: Check if sector requires staking
    try {
      const canStake = await this.blockchainManager.canStake(sectorId);

      if (canStake) {
        this.debugLog(
          `Sector ${sectorId} requires staking for pilot ${selectedPilot.publicAddress}`
        );

        // Check if pilot has enough credits (10k = 10,000 * 10^18 wei)
        const requiredCredits = 10_000n * 10n ** 18n;
        try {
          const pilotCreditsBalance =
            await this.blockchainManager.getPilotCreditsBalance(
              selectedPilot.publicAddress
            );

          if (pilotCreditsBalance < requiredCredits) {
            console.log(
              `⚠️  Pilot ${selectedPilot.firstname} ${selectedPilot.lastname} has insufficient CREDITS to stake`
            );
            console.log(
              `   Required: 10,000 CREDITS | Has: ${(
                Number(pilotCreditsBalance) / 1e18
              ).toFixed(2)} CREDITS`
            );

            // Release the pilot since they can't enter
            this.pilotManager.releasePilotFromSector(
              selectedPilot.publicAddress
            );

            // Broadcast insufficient credits event
            broadcastEvent({
              type: "pilot_insufficient_credits",
              timestamp: Date.now(),
              data: {
                pilotAddress: selectedPilot.publicAddress,
                pilotName: `${selectedPilot.firstname} ${selectedPilot.lastname}`,
                sectorId: sectorId,
                requiredCredits: "10000",
                currentCredits: (Number(pilotCreditsBalance) / 1e18).toFixed(2),
              },
            });

            return; // Don't spawn the ship
          }
        } catch (error: any) {
          console.error(
            `❌ Error checking credits balance for pilot ${selectedPilot.publicAddress}:`,
            error.message
          );
          // Release the pilot
          this.pilotManager.releasePilotFromSector(selectedPilot.publicAddress);
          return; // Don't spawn the ship
        }

        // Check if pilot has enough ETH for gas
        const pilotEthBalance = await this.blockchainManager.getBalance(
          selectedPilot.publicAddress
        );
        const minEthRequired = parseEther(SECTOR_CONFIG.CHARACTER_ETH);

        if (pilotEthBalance < minEthRequired) {
          console.log(
            `⛽ Pilot ${selectedPilot.firstname} ${selectedPilot.lastname} needs ETH top-up before staking`
          );
          console.log(`   Current: ${formatEther(pilotEthBalance)} ETH`);
          console.log(`   Minimum: ${SECTOR_CONFIG.CHARACTER_ETH} ETH`);

          await this.blockchainManager.fundAddresses(
            [selectedPilot.publicAddress],
            SECTOR_CONFIG.CHARACTER_ETH,
            1 // single pilot
          );

          console.log(
            `✅ Topped up pilot to ${SECTOR_CONFIG.CHARACTER_ETH} ETH`
          );
        }

        // Get balances BEFORE staking
        const creditsBalanceBefore =
          await this.blockchainManager.getPilotCreditsBalance(
            selectedPilot.publicAddress
          );
        const stakedBalanceBefore =
          await this.blockchainManager.getPilotStakedBalance(
            selectedPilot.publicAddress
          );

        console.log(
          `💰 Pilot ${selectedPilot.firstname} ${selectedPilot.lastname} balances BEFORE stake:`
        );
        console.log(
          `   CREDITS: ${(Number(creditsBalanceBefore) / 1e18).toFixed(2)}`
        );
        console.log(
          `   Staked: ${(Number(stakedBalanceBefore) / 1e18).toFixed(2)}`
        );

        // Attempt to stake 10k credits
        const stakeResult = await this.blockchainManager.stakePilotInSector(
          selectedPilot.publicAddress,
          selectedPilot.privateKey,
          sectorId
        );

        if (!stakeResult.success) {
          console.log(
            `❌ Pilot ${selectedPilot.firstname} ${
              selectedPilot.lastname
            } failed to stake in sector ${sectorId.slice(0, 10)}...`
          );
          console.log(`   Reason: ${stakeResult.error || "Unknown error"}`);

          // Extract decoded error (user-friendly part) and technical details
          let decodedError = stakeResult.error || "Staking failed";
          let technicalDetails = stakeResult.errorDetails || "";

          // If errorDetails contains our decoded format, split it
          if (
            stakeResult.errorDetails &&
            stakeResult.errorDetails.includes("Technical details:")
          ) {
            const parts = stakeResult.errorDetails.split(
              "\n\nTechnical details:\n"
            );
            if (parts.length === 2) {
              decodedError = parts[0];
              technicalDetails = parts[1];
            }
          }

          // Log full error details if available
          if (stakeResult.errorDetails) {
            console.log(`\n   Full Error Details:`);
            console.log(
              `   ${stakeResult.errorDetails.split("\n").join("\n   ")}\n`
            );
          }

          // Release the pilot since they can't enter
          this.pilotManager.releasePilotFromSector(selectedPilot.publicAddress);

          // Broadcast stake failure event
          broadcastEvent({
            type: "stake_failed",
            timestamp: Date.now(),
            data: {
              pilotAddress: selectedPilot.publicAddress,
              pilotName: `${selectedPilot.firstname} ${selectedPilot.lastname}`,
              sectorId: sectorId,
              reason: decodedError, // User-friendly decoded error
              errorDetails: technicalDetails, // Technical details for debugging
            },
          });

          return; // Don't spawn the ship
        }

        // Get balances AFTER staking
        const creditsBalanceAfter =
          await this.blockchainManager.getPilotCreditsBalance(
            selectedPilot.publicAddress
          );
        const stakedBalanceAfter =
          await this.blockchainManager.getPilotStakedBalance(
            selectedPilot.publicAddress
          );

        console.log(
          `✅ Pilot ${selectedPilot.firstname} ${
            selectedPilot.lastname
          } successfully staked 10k credits in sector ${sectorId.slice(
            0,
            10
          )}...`
        );
        console.log(
          `💰 Pilot ${selectedPilot.firstname} ${selectedPilot.lastname} balances AFTER stake:`
        );
        console.log(
          `   CREDITS: ${(Number(creditsBalanceAfter) / 1e18).toFixed(2)} (Δ ${(
            (Number(creditsBalanceAfter) - Number(creditsBalanceBefore)) /
            1e18
          ).toFixed(2)})`
        );
        console.log(
          `   Staked: ${(Number(stakedBalanceAfter) / 1e18).toFixed(2)} (Δ ${(
            (Number(stakedBalanceAfter) - Number(stakedBalanceBefore)) /
            1e18
          ).toFixed(2)})`
        );

        // Broadcast successful staking
        broadcastEvent({
          type: "pilot_staked",
          timestamp: Date.now(),
          data: {
            pilotAddress: selectedPilot.publicAddress,
            pilotName: `${selectedPilot.firstname} ${selectedPilot.lastname}`,
            sectorId: sectorId,
            stakeAmount: "10000",
          },
        });
      }
    } catch (error: any) {
      console.error(
        `❌ Error checking/processing stake for pilot ${selectedPilot.publicAddress}:`,
        error
      );
      // Release the pilot
      this.pilotManager.releasePilotFromSector(selectedPilot.publicAddress);
      return; // Don't spawn the ship
    }

    // Check airspace class restrictions
    try {
      const airspaceClass = await this.blockchainManager.getSectorAirspaceClass(
        sectorId
      );
      const shipModel = getShipModel(selectedPilot.ship);

      console.log(
        `🛫 Checking airspace access: Pilot ${selectedPilot.firstname} ${
          selectedPilot.lastname
        } (Ship Model ${shipModel}) → Sector ${sectorId.slice(
          0,
          10
        )}... (Class ${airspaceClass})`
      );

      if (!canShipEnterAirspaceClass(selectedPilot.ship, airspaceClass)) {
        console.log(
          `🚫 Pilot ${selectedPilot.firstname} ${selectedPilot.lastname} cannot enter Class ${airspaceClass} airspace with Ship Model ${shipModel}`
        );

        // Release the pilot since they can't enter
        this.pilotManager.releasePilotFromSector(selectedPilot.publicAddress);

        // Broadcast airspace restriction event
        broadcastEvent({
          type: "airspace_restricted",
          timestamp: Date.now(),
          data: {
            pilotAddress: selectedPilot.publicAddress,
            pilotName: `${selectedPilot.firstname} ${selectedPilot.lastname}`,
            shipType: selectedPilot.ship,
            shipModel: shipModel,
            sectorId: sectorId,
            airspaceClass: airspaceClass,
            reason: `Ship Model ${shipModel} cannot enter Class ${airspaceClass} airspace`,
          },
        });

        return; // Don't spawn the ship
      }

      console.log(
        `✅ Pilot ${selectedPilot.firstname} ${selectedPilot.lastname} (Model ${shipModel}) cleared for entry into Class ${airspaceClass} airspace`
      );
    } catch (error: any) {
      console.error(
        `❌ Error checking airspace class for pilot ${selectedPilot.publicAddress}:`,
        error
      );
      // Release the pilot
      this.pilotManager.releasePilotFromSector(selectedPilot.publicAddress);
      return; // Don't spawn the ship on error
    }

    const angle = this.getRandom() * 360;
    const { position } = this.getShipSpawnPosition(angle);

    // Use pilot's current fuel level instead of random fuel
    const startingFuel = selectedPilot.fuel;
    const ship: Ship = {
      id: this.generateId(),
      address: selectedPilot.publicAddress,
      privateKey: selectedPilot.privateKey,
      pilotAddress: selectedPilot.publicAddress,
      pilotName: `${selectedPilot.firstname} ${selectedPilot.lastname}`,
      shipType: selectedPilot.ship,
      position,
      velocity: { x: 0, y: 0 },
      targetAsteroidId: null,
      targetShipId: null,
      targetStationId: null,
      state: "flying",
      spawnTime: Date.now(),
      spawnAngle: angle,
      score: 0,
      fuel: startingFuel,
      maxFuel: 100,
      isLockedOn: false,
      interceptTime: null,
      isVectorMatched: false,
      vectorMatchTime: null,
      fullCargo: false,
      lastCourseUpdate: gameLoopCounter,
    };

    console.log(
      `🚀 Spawning ship ${ship.id} with pilot ${ship.pilotName} (ship ${
        selectedPilot.ship
      }) at (${Math.round(position.x)}, ${Math.round(
        position.y
      )}) with ${Math.round(startingFuel)}% fuel (pilot's current fuel)`
    );

    // Attempt to mint credential (fire and forget - don't await)
    attemptCredentialMinting(ship).catch((error) => {
      console.error(
        `Error in credential minting for pilot ${ship.pilotName}:`,
        error
      );
    });

    // Assign initial target for newly spawned ship
    // CRITICAL: Await this to ensure ship state (e.g., "refueling") is set BEFORE ship enters game loop
    await assignTarget(ship, "initial spawn targeting", false);

    ships.set(ship.id, ship);
    broadcastEvent({
      type: "ship_spawn",
      timestamp: Date.now(),
      data: {
        id: ship.id,
        address: ship.address,
        pilotAddress: ship.pilotAddress,
        pilotName: ship.pilotName,
        shipType: ship.shipType,
        position: ship.position,
        velocity: ship.velocity,
        targetAsteroidId: ship.targetAsteroidId,
        targetShipId: ship.targetShipId,
        targetStationId: ship.targetStationId,
        state: ship.state,
        spawnTime: ship.spawnTime,
        spawnAngle: ship.spawnAngle,
        score: ship.score,
        fuel: ship.fuel,
        maxFuel: ship.maxFuel,
      },
    });
  }

  // Placeholder - needs full implementation extracted from Sector.ts lines 2326-2543
  public async attemptCredentialMinting(
    ship: Ship,
    broadcastEvent: (event: any) => void
  ): Promise<void> {
    // This will be extracted from the full Sector.ts implementation
    // For now, keeping as placeholder to maintain structure
  }
}
