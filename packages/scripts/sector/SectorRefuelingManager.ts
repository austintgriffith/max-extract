// Refueling system for ships at stations

import type { Ship, Vector2D } from "../types";
import { SECTOR_CONFIG } from "../types";
import { PositionUtils } from "../utils/PositionUtils";
import { ShipAI } from "../utils/ShipAI";
import type { BlockchainManager } from "../managers/blockchain";

export class SectorRefuelingManager {
  constructor(
    private blockchainManager: BlockchainManager,
    private crowdsaleManager: any,
    private sectorId: string,
    private debugMode: boolean = false
  ) {}

  private debugLog(message: string, data?: any): void {
    if (this.debugMode) {
      const timestamp = new Date().toISOString().split("T")[1].split(".")[0];
      if (data) {
        console.log(`⛽ [${timestamp}] SectorRefuel - ${message}:`, data);
      } else {
        console.log(`⛽ [${timestamp}] SectorRefuel - ${message}`);
      }
    }
  }

  /**
   * Check if a ship should refuel at the station
   * @param ship The ship to check
   * @returns True if ship should refuel (low fuel + has credential)
   */
  public async shouldShipRefuel(ship: Ship): Promise<boolean> {
    // Check if fuel is below refuel threshold
    if (ship.fuel >= SECTOR_CONFIG.REFUEL_FUEL_THRESHOLD) {
      return false;
    }

    // Check if pilot has a valid credential for this sector
    const hasCredential = await this.blockchainManager.checkPilotHasCredential(
      ship.pilotAddress,
      this.sectorId
    );

    this.debugLog(
      `Ship ${ship.id} (${ship.pilotName}) refuel check: fuel=${Math.round(
        ship.fuel
      )}%, hasCredential=${hasCredential}`
    );

    return hasCredential;
  }

  /**
   * Initiate refueling process for a ship
   * @param ship The ship to start refueling
   */
  public initiateRefueling(
    ship: Ship,
    gameLoopCounter: number,
    broadcastEvent: (event: any) => void
  ): void {
    const currentPos = PositionUtils.calculatePosition(ship, Date.now());
    const centerX = SECTOR_CONFIG.WIDTH / 2;
    const centerY = SECTOR_CONFIG.HEIGHT / 2;

    // Calculate direction to center
    const dx = centerX - currentPos.x;
    const dy = centerY - currentPos.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Calculate velocity to center at normal ship speed
    const speed = ShipAI.getShipSpeed(ship);
    const velocity = {
      x: (dx / distance) * speed,
      y: (dy / distance) * speed,
    };

    // Update ship state
    ship.state = "refueling";
    ship.position = currentPos;
    ship.velocity = velocity;
    ship.spawnTime = Date.now();
    ship.targetAsteroidId = null;
    ship.targetShipId = null;
    ship.targetStationId = "station_center";
    ship.isVectorMatched = false;
    ship.vectorMatchTime = null;
    ship.lastCourseUpdate = gameLoopCounter;

    console.log(
      `⛽ Ship ${ship.id} (${
        ship.pilotName
      }) heading to station for refuel (fuel: ${Math.round(ship.fuel)}%)`
    );

    this.debugLog(
      `Ship ${ship.id} initiated refueling: pos=(${Math.round(
        currentPos.x
      )},${Math.round(
        currentPos.y
      )}), center=(${centerX},${centerY}), distance=${Math.round(distance)}`
    );

    // Broadcast refueling initiation
    broadcastEvent({
      type: "ship_retarget",
      timestamp: Date.now(),
      data: {
        shipId: ship.id,
        position: currentPos,
        velocity: ship.velocity,
        targetAsteroidId: null,
        targetShipId: null,
        targetStationId: "station_center",
        state: "refueling",
        fuel: ship.fuel,
        fullCargo: ship.fullCargo,
        currentCargo: ship.currentCargo,
        score: ship.score,
      },
    });
  }

  /**
   * Complete refueling for a ship that has arrived at the station
   * @param ship The ship to refuel
   */
  public async completeRefueling(
    ship: Ship,
    assignTarget: (ship: Ship, reason: string, force: boolean) => Promise<void>,
    broadcastEvent: (event: any) => void
  ): Promise<void> {
    const currentTime = Date.now();

    // Get player address first (needed for fuel token check)
    const playerAddress = await this.blockchainManager.getSectorOwner(
      this.sectorId
    );

    // Chapter 5: Check if pilot has fuel tokens and redeem one
    if (this.crowdsaleManager && playerAddress) {
      try {
        const fuelTokenBalance =
          await this.crowdsaleManager.getPilotFuelTokenBalance(
            ship.pilotAddress,
            playerAddress
          );

        if (fuelTokenBalance > 0n) {
          this.debugLog(
            `Pilot ${ship.pilotName} has ${
              Number(fuelTokenBalance) / 1e18
            } fuel tokens, attempting redeem`
          );

          const redeemed = await this.crowdsaleManager.redeemFuelToken(
            ship.privateKey,
            playerAddress
          );

          if (redeemed) {
            console.log(
              `🎟️  Pilot ${ship.pilotName} redeemed fuel token for refueling at station`
            );
          }
        }
      } catch (error: any) {
        this.debugLog(`Failed to check/redeem fuel token: ${error.message}`);
        // Continue with refueling even if token redemption fails
      }
    }

    // Set fuel to 100%
    ship.fuel = 100;

    // Get station info
    const aboutInfo = await this.blockchainManager.getAboutContractInfo(
      this.sectorId
    );
    const stationName = aboutInfo.stationName || "Station";

    console.log(
      `⛽ Pilot ${ship.pilotName} refueled at ${stationName} (fuel: 100%)`
    );

    // Execute blockchain tip (async, don't wait)
    if (playerAddress) {
      this.executeRefuelTip(
        ship,
        playerAddress,
        stationName,
        broadcastEvent
      ).catch((error) => {
        console.error(
          `Failed to execute refuel tip for pilot ${ship.pilotName}:`,
          error
        );
      });
    }

    // Return to flying state and assign new target
    ship.state = "flying";
    ship.targetStationId = null;
    ship.isVectorMatched = false;
    ship.vectorMatchTime = null;
    assignTarget(ship, "post-refuel targeting", false).catch((error) => {
      console.error(
        `Failed to assign target after refuel for ship ${ship.id}:`,
        error
      );
    });
  }

  /**
   * Execute the blockchain tip transaction for refueling
   */
  private async executeRefuelTip(
    ship: Ship,
    playerAddress: string,
    stationName: string,
    broadcastEvent: (event: any) => void
  ): Promise<void> {
    try {
      // Execute the tip transaction (+3 points for refueling)
      const txHash = await this.blockchainManager.executePilotTip(
        ship.privateKey,
        playerAddress,
        3
      );

      console.log(
        `💰 Pilot ${ship.pilotName} tipped player 3 points for refueling! (tx: ${txHash})`
      );

      // Broadcast successful tip event
      broadcastEvent({
        type: "pilot_tip",
        timestamp: Date.now(),
        data: {
          shipId: ship.id,
          pilotAddress: ship.pilotAddress,
          pilotName: ship.pilotName,
          playerAddress,
          tipAmount: 3,
          reason: "refueling",
          transactionHash: txHash,
          stationName: stationName,
        },
      });
    } catch (error: any) {
      this.debugLog(`Failed to execute refuel tip: ${error.message}`);

      // Broadcast failed tip event
      broadcastEvent({
        type: "pilot_tip",
        timestamp: Date.now(),
        data: {
          shipId: ship.id,
          pilotAddress: ship.pilotAddress,
          pilotName: ship.pilotName,
          playerAddress,
          tipAmount: 3,
          reason: "refueling",
          error: error.message,
          stationName: stationName,
        },
      });
    }
  }
}
