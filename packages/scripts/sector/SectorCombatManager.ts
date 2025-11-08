// Ship-to-ship and ship-to-asteroid combat/arrival checking

import type { Ship, Asteroid, Vector2D } from "../types";
import { SECTOR_CONFIG } from "../types";
import { PositionUtils } from "../utils/PositionUtils";
import { ShipAI } from "../utils/ShipAI";
import type { BlockchainManager } from "../managers/blockchain";
import type { PilotManager } from "../managers/character";

export class SectorCombatManager {
  constructor(
    private blockchainManager: BlockchainManager,
    private pilotManager: PilotManager,
    private sectorId: string,
    private debugMode: boolean = false
  ) {}

  private debugLog(message: string, data?: any): void {
    if (this.debugMode) {
      const timestamp = new Date().toISOString().split("T")[1].split(".")[0];
      if (data) {
        console.log(`⚔️  [${timestamp}] SectorCombat - ${message}:`, data);
      } else {
        console.log(`⚔️  [${timestamp}] SectorCombat - ${message}`);
      }
    }
  }

  /**
   * Check if ships/asteroids have been reached by ships
   */
  public async checkArrival(
    ships: Map<string, Ship>,
    asteroids: Map<string, Asteroid>,
    gameLoopCounter: number,
    assignTarget: (ship: Ship, reason: string, force: boolean) => Promise<void>,
    notifyShipsAboutCargoTarget: () => void,
    broadcastEvent: (event: any) => void,
    getRandom: () => number
  ): Promise<void> {
    const currentTime = Date.now();

    // First, identify which asteroids are being mined by vector-matched ships
    const asteroidsBeingMined = new Map<string, string>();
    const shipsBeingAttacked = new Map<string, string>();

    for (const [shipId, ship] of ships) {
      if (ship.state === "flying" && ship.isVectorMatched) {
        if (ship.targetAsteroidId) {
          asteroidsBeingMined.set(ship.targetAsteroidId, shipId);
        }
        if (ship.targetShipId) {
          shipsBeingAttacked.set(ship.targetShipId, shipId);
        }
      }
    }

    for (const [shipId, ship] of ships) {
      if (ship.state !== "flying") continue;

      // Handle ship-to-ship combat first
      if (ship.targetShipId) {
        await this.checkShipCombatArrival(
          ship,
          ships,
          currentTime,
          gameLoopCounter,
          shipsBeingAttacked,
          assignTarget,
          notifyShipsAboutCargoTarget,
          broadcastEvent
        );
        continue;
      }

      // Handle asteroid targeting
      if (ship.targetAsteroidId) {
        this.checkAsteroidArrival(
          ship,
          ships,
          asteroids,
          currentTime,
          gameLoopCounter,
          asteroidsBeingMined,
          assignTarget,
          notifyShipsAboutCargoTarget,
          broadcastEvent,
          getRandom
        );
        continue;
      }
    }
  }

  private async checkShipCombatArrival(
    attackerShip: Ship,
    ships: Map<string, Ship>,
    currentTime: number,
    gameLoopCounter: number,
    shipsBeingAttacked: Map<string, string>,
    assignTarget: (ship: Ship, reason: string, force: boolean) => Promise<void>,
    notifyShipsAboutCargoTarget: () => void,
    broadcastEvent: (event: any) => void
  ): Promise<void> {
    const targetShip = ships.get(attackerShip.targetShipId!);
    if (!targetShip) {
      if (!attackerShip.isVectorMatched) {
        assignTarget(attackerShip, "target ship missing", true).catch(
          (error) => {
            console.error(
              `Failed to assign target for ship ${attackerShip.id}:`,
              error
            );
          }
        );
      }
      return;
    }

    const attackerPos = PositionUtils.calculatePosition(
      attackerShip,
      currentTime
    );
    const targetPos = PositionUtils.calculatePosition(targetShip, currentTime);

    const distance = Math.sqrt(
      Math.pow(targetPos.x - attackerPos.x, 2) +
        Math.pow(targetPos.y - attackerPos.y, 2)
    );

    // Check if attacker reached target ship
    if (distance < SECTOR_CONFIG.SHIP_COMBAT_RANGE) {
      const currentAttackerShipId = shipsBeingAttacked.get(
        attackerShip.targetShipId!
      );
      if (currentAttackerShipId && currentAttackerShipId !== attackerShip.id) {
        this.debugLog(
          `Ship ${attackerShip.id} reached target ship ${targetShip.id} but ship ${currentAttackerShipId} is already attacking it`
        );
        assignTarget(
          attackerShip,
          "target ship already being attacked",
          true
        ).catch((error) => {
          console.error(
            `Failed to assign target for ship ${attackerShip.id}:`,
            error
          );
        });
        return;
      }

      // Attacker destroys target ship
      const stolenScore = targetShip.score;
      const stolenFuel = Math.floor(targetShip.fuel * 0.8);

      attackerShip.score += stolenScore;
      attackerShip.fuel = Math.min(
        attackerShip.maxFuel,
        attackerShip.fuel + stolenFuel
      );
      attackerShip.fullCargo = true;

      console.log(
        `Ship ${attackerShip.id} destroyed ship ${targetShip.id}! Gained ${stolenScore} points and ${stolenFuel} fuel.`
      );

      broadcastEvent({
        type: "ship_destroyed",
        timestamp: currentTime,
        data: {
          attackerId: attackerShip.id,
          victimId: targetShip.id,
          attackerPilotAddress: attackerShip.pilotAddress,
          attackerPilotName: attackerShip.pilotName,
          victimPilotAddress: targetShip.pilotAddress,
          victimPilotName: targetShip.pilotName,
          stolenScore,
          stolenFuel,
          attackerPosition: attackerPos,
          victimPosition: targetPos,
        },
      });

      // Mark victim as dead
      this.pilotManager.markPilotAsDead(
        targetShip.pilotAddress,
        attackerShip.pilotAddress
      );

      // Execute death transaction
      console.log(
        `⏳ Executing death transaction for ${targetShip.pilotName}...`
      );
      try {
        await this.executeDeadMansSwitch(targetShip, attackerShip, currentTime, broadcastEvent);
        console.log(
          `✅ Death transaction completed for ${targetShip.pilotName}`
        );
      } catch (error) {
        console.error(
          `❌ Failed to execute death transaction for pilot ${targetShip.pilotName}:`,
          error
        );
      }

      // Remove destroyed ship
      ships.delete(targetShip.id);

      // Retarget other ships attacking the destroyed ship
      for (const [otherShipId, otherShip] of ships) {
        if (
          otherShipId !== attackerShip.id &&
          otherShip.state === "flying" &&
          otherShip.targetShipId === targetShip.id
        ) {
          assignTarget(otherShip, "target ship was destroyed", true).catch(
            (error) => {
              console.error(
                `Failed to assign target for ship ${otherShipId}:`,
                error
              );
            }
          );
        }
      }

      // Attacker exits
      attackerShip.state = "exiting";
      attackerShip.targetShipId = null;
      attackerShip.targetAsteroidId = null;
      attackerShip.position = attackerPos;
      attackerShip.velocity = ShipAI.calculateExitVelocity(
        attackerPos,
        attackerShip
      );
      attackerShip.spawnTime = currentTime;
      attackerShip.isVectorMatched = false;
      attackerShip.vectorMatchTime = null;
      attackerShip.lastCourseUpdate = gameLoopCounter;

      notifyShipsAboutCargoTarget();

      broadcastEvent({
        type: "ship_retarget",
        timestamp: currentTime,
        data: {
          shipId: attackerShip.id,
          position: attackerPos,
          velocity: attackerShip.velocity,
          targetAsteroidId: null,
          targetShipId: null,
          state: "exiting",
          fuel: attackerShip.fuel,
        },
      });
    }
  }

  private checkAsteroidArrival(
    ship: Ship,
    ships: Map<string, Ship>,
    asteroids: Map<string, Asteroid>,
    currentTime: number,
    gameLoopCounter: number,
    asteroidsBeingMined: Map<string, string>,
    assignTarget: (ship: Ship, reason: string, force: boolean) => Promise<void>,
    notifyShipsAboutCargoTarget: () => void,
    broadcastEvent: (event: any) => void,
    getRandom: () => number
  ): void {
    if (!ship.targetAsteroidId) return;

    const asteroid = asteroids.get(ship.targetAsteroidId);
    if (!asteroid) {
      if (!ship.isVectorMatched) {
        assignTarget(ship, "target asteroid missing", true).catch(
          (error) => {
            console.error(
              `Failed to assign target for ship ${ship.id}:`,
              error
            );
          }
        );
      }
      return;
    }

    const shipPos = PositionUtils.calculatePosition(ship, currentTime);
    const asteroidPos = PositionUtils.calculatePosition(asteroid, currentTime);

    const distance = Math.sqrt(
      Math.pow(asteroidPos.x - shipPos.x, 2) +
        Math.pow(asteroidPos.y - shipPos.y, 2)
    );

    // Check if ship reached asteroid
    if (distance < asteroid.size / 4 + 60) {
      const miningShipId = asteroidsBeingMined.get(ship.targetAsteroidId);
      if (miningShipId && miningShipId !== ship.id) {
        assignTarget(ship, "asteroid already being mined", true).catch(
          (error) => {
            console.error(
              `Failed to assign target for ship ${ship.id}:`,
              error
            );
          }
        );
        return;
      }

      // Mine the asteroid
      const baseBounty = Math.floor(asteroid.size * 2);
      const randomBonus = Math.floor(getRandom() * asteroid.size);
      ship.score = baseBounty + randomBonus;
      ship.fullCargo = true;

      console.log(
        `Ship ${ship.id} reached asteroid ${asteroid.id} and mined it for ${ship.score} points!`
      );

      asteroids.delete(asteroid.id);

      broadcastEvent({
        type: "asteroid_depleted",
        timestamp: currentTime,
        data: { asteroidId: asteroid.id, score: ship.score },
      });

      // Start exiting
      ship.state = "exiting";
      ship.targetAsteroidId = null;
      ship.targetShipId = null;
      ship.position = shipPos;
      ship.velocity = ShipAI.calculateExitVelocity(shipPos, ship);
      ship.spawnTime = currentTime;
      ship.isVectorMatched = false;
      ship.vectorMatchTime = null;
      ship.lastCourseUpdate = gameLoopCounter;

      notifyShipsAboutCargoTarget();

      broadcastEvent({
        type: "ship_retarget",
        timestamp: currentTime,
        data: {
          shipId: ship.id,
          position: shipPos,
          velocity: ship.velocity,
          targetAsteroidId: null,
          targetShipId: null,
          state: "exiting",
          fuel: ship.fuel,
        },
      });
    }
  }

  private async executeDeadMansSwitch(
    victimShip: Ship,
    killerShip: Ship,
    currentTime: number,
    broadcastEvent: (event: any) => void
  ): Promise<void> {
    try {
      this.debugLog(
        `Executing pilot death sequence for ${victimShip.pilotName}`
      );

      const playerAddress = await this.blockchainManager.getSectorOwner(
        this.sectorId
      );
      if (!playerAddress) {
        this.debugLog(`Could not find sector owner, skipping death sequence`);
        return;
      }

      console.log(`\n🎯 Pilot Death Parameters:`);
      console.log(
        `   Victim: ${victimShip.pilotAddress} (${victimShip.pilotName})`
      );
      console.log(
        `   Killer: ${killerShip.pilotAddress} (${killerShip.pilotName})`
      );
      console.log(`   Player: ${playerAddress}`);
      console.log(`   Sector: ${this.sectorId}\n`);

      // Check if player has audited stake module
      const hasAuditedStake =
        await this.blockchainManager.hasAuditedStakeModule(playerAddress);

      let transactionHash: string;
      let ethTransferHash: string | null = null;
      let slashSuccess = false;

      if (hasAuditedStake) {
        console.log(
          `✅ Player has audited stake module - attempting deadMansSlash...`
        );

        // DEBUG: Check killer's staked status BEFORE attempting slash
        try {
          const publicClient = this.blockchainManager.getPublicClient();
          const maxExtractContract = this.blockchainManager.getContract("MaxExtract");
          
          if (!maxExtractContract) {
            throw new Error("MaxExtract contract not found");
          }

          // Get player's sector ID from MaxExtract
          const sectorIdBigInt = await publicClient.readContract({
            address: maxExtractContract.address as `0x${string}`,
            abi: maxExtractContract.abi,
            functionName: "playerToSector",
            args: [playerAddress],
          }) as bigint;
          const sectorId = sectorIdBigInt.toString();

          // Get registry address for this sector
          const registryAddress = await publicClient.readContract({
            address: maxExtractContract.address as `0x${string}`,
            abi: maxExtractContract.abi,
            functionName: "sectors",
            args: [sectorIdBigInt],
          }) as string;

          // Get stake module from registry
          const stakeContract = await publicClient.readContract({
            address: registryAddress as `0x${string}`,
            abi: [
              {
                inputs: [{ name: "moduleKey", type: "string" }],
                name: "modules",
                outputs: [{ type: "address" }],
                stateMutability: "view",
                type: "function",
              },
            ],
            functionName: "modules",
            args: ["stake"],
          }) as string;

          // Get killer's staked balance from MaxExtract
          const killerStakedBalance = await publicClient.readContract({
            address: maxExtractContract.address as `0x${string}`,
            abi: maxExtractContract.abi,
            functionName: "stakedBalance",
            args: [killerShip.pilotAddress],
          }) as bigint;

          // Read staked[killer] from Chapter4 contract
          const isStaked = await publicClient.readContract({
            address: stakeContract as `0x${string}`,
            abi: [
              {
                inputs: [{ name: "pilot", type: "address" }],
                name: "staked",
                outputs: [{ type: "bool" }],
                stateMutability: "view",
                type: "function",
              },
            ],
            functionName: "staked",
            args: [killerShip.pilotAddress],
          }) as boolean;

          const blockNumber = await publicClient.getBlockNumber();
          
          console.log(`\n🔍 SLASH DEBUG INFO:`);
          console.log(`   Killer: ${killerShip.pilotAddress} (${killerShip.pilotName})`);
          console.log(`   Killer's staked balance in MaxExtract: ${killerStakedBalance.toString()} (${Number(killerStakedBalance) / 1e18} CREDITS)`);
          console.log(`   Killer's staked status in Chapter4: ${isStaked}`);
          console.log(`   Stake contract: ${stakeContract}`);
          console.log(`   Registry: ${registryAddress}`);
          console.log(`   Sector ID: ${sectorId}`);
          console.log(`   Block number: ${blockNumber}`);
          console.log(`   Timestamp: ${new Date().toISOString()}\n`);
        } catch (debugError: any) {
          console.log(
            `⚠️  Failed to get slash debug info: ${debugError.message}`
          );
        }

        try {
          const result = await this.blockchainManager.executeDeadMansSlash(
            victimShip.privateKey,
            killerShip.pilotAddress,
            playerAddress
          );
          transactionHash = result.slashHash;
          ethTransferHash = result.ethTransferHash;
          slashSuccess = true;
          console.log(
            `⚔️  Slash successful! Killer was slashed instead of player penalty.`
          );

          broadcastEvent({
            type: "pilot_slashed",
            timestamp: currentTime,
            data: {
              victimPilotAddress: victimShip.pilotAddress,
              victimPilotName: victimShip.pilotName,
              killerPilotAddress: killerShip.pilotAddress,
              killerPilotName: killerShip.pilotName,
              playerAddress: playerAddress,
              transactionHash: transactionHash,
              ethTransferHash: ethTransferHash,
              sectorId: this.sectorId,
            },
          });
        } catch (error: any) {
          console.log(`⚠️  DeadMansSlash failed: ${error.message}`);

          broadcastEvent({
            type: "slash_failed",
            timestamp: currentTime,
            data: {
              victimPilotAddress: victimShip.pilotAddress,
              victimPilotName: victimShip.pilotName,
              killerPilotAddress: killerShip.pilotAddress,
              killerPilotName: killerShip.pilotName,
              playerAddress: playerAddress,
              error: error.message,
              sectorId: this.sectorId,
            },
          });

          // Fallback to regular deadMansSwitch
          console.log(
            `   Falling back to deadMansSwitch with 10-point penalty...`
          );
          const result = await this.blockchainManager.executeDeadMansSwitch(
            victimShip.privateKey,
            killerShip.pilotAddress,
            playerAddress
          );
          transactionHash = result.deadMansSwitchHash;
          ethTransferHash = result.ethTransferHash;
        }
      } else {
        console.log(
          `ℹ️  No audited stake module - using deadMansSwitch (10-point penalty)`
        );
        const result = await this.blockchainManager.executeDeadMansSwitch(
          victimShip.privateKey,
          killerShip.pilotAddress,
          playerAddress
        );
        transactionHash = result.deadMansSwitchHash;
        ethTransferHash = result.ethTransferHash;
      }

      const ethMessage = ethTransferHash
        ? ` ETH returned to GOD (tx: ${ethTransferHash.slice(0, 10)}...)`
        : "";
      const slashMessage = slashSuccess
        ? " (killer slashed)"
        : " (player -10 points)";
      console.log(
        `💀 Pilot ${victimShip.pilotName} killed by ${
          killerShip.pilotName
        }${slashMessage} (tx: ${transactionHash.slice(0, 10)}...)${ethMessage}`
      );

      // Broadcast pilot death event
      broadcastEvent({
        type: "pilot_death",
        timestamp: currentTime,
        data: {
          victimPilotAddress: victimShip.pilotAddress,
          victimPilotName: victimShip.pilotName,
          killerPilotAddress: killerShip.pilotAddress,
          killerPilotName: killerShip.pilotName,
          playerPenalized: playerAddress,
          scorePenalty: slashSuccess ? 0 : 10,
          slashSuccess: slashSuccess,
          transactionHash: transactionHash,
          ethTransferHash: ethTransferHash,
          sectorId: this.sectorId,
          blockchainConfirmed: true,
        },
      });
    } catch (error: any) {
      this.debugLog(`Failed to execute death sequence: ${error.message}`);

      broadcastEvent({
        type: "pilot_death",
        timestamp: currentTime,
        data: {
          victimPilotAddress: victimShip.pilotAddress,
          victimPilotName: victimShip.pilotName,
          killerPilotAddress: killerShip.pilotAddress,
          killerPilotName: killerShip.pilotName,
          sectorId: this.sectorId,
          error: error.message,
          blockchainConfirmed: false,
        },
      });
    }
  }
}
