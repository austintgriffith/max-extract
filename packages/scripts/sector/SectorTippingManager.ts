// Tipping and rewards system

import type { Ship } from "../types";
import type { BlockchainManager } from "../managers/blockchain";
import type { CharacterManager, PilotManager } from "../managers/character";

export class SectorTippingManager {
  constructor(
    private blockchainManager: BlockchainManager,
    private characterManager: CharacterManager,
    private pilotManager: PilotManager,
    private sectorId: string,
    private debugMode: boolean = false
  ) {}

  private debugLog(message: string, data?: any): void {
    if (this.debugMode) {
      const timestamp = new Date().toISOString().split("T")[1].split(".")[0];
      if (data) {
        console.log(`💸 [${timestamp}] SectorTipping - ${message}:`, data);
      } else {
        console.log(`💸 [${timestamp}] SectorTipping - ${message}`);
      }
    }
  }

  /**
   * Handle pilot tipping when a ship exits the sector
   */
  public async handlePilotTipping(
    ship: Ship,
    finalScore: number,
    broadcastEvent: (event: any) => void
  ): Promise<void> {
    try {
      // Release pilot from sector assignment
      this.pilotManager.releasePilotFromSector(ship.pilotAddress);
      this.debugLog(`Released pilot ${ship.pilotName} from sector ${this.sectorId}`);

      // Chapter 4: Unstake if sector requires staking
      // IMPORTANT: 10-second delay prevents race condition with slash transactions
      try {
        const canStake = await this.blockchainManager.canStake(this.sectorId);

        if (canStake) {
          // Check if pilot actually has staked balance before attempting unstake
          const stakedBalance =
            await this.blockchainManager.getPilotStakedBalance(
              ship.pilotAddress
            );

          if (stakedBalance === 0n) {
            this.debugLog(
              `Pilot ${ship.pilotName} has no staked balance - skipping unstake (likely entered before staking was active)`
            );
          } else {
            console.log(
              `⏳ Pilot ${ship.pilotName} will unstake in 10 seconds (prevents race with slash)...`
            );

            // Delay unstaking by 10 seconds to prevent race condition
            setTimeout(async () => {
              try {
                this.debugLog(
                  `Unstaking pilot ${ship.pilotName} from sector ${this.sectorId} (after 10s delay)`
                );

                // Get balances BEFORE unstaking
                const creditsBeforeUnstake =
                  await this.blockchainManager.getPilotCreditsBalance(
                    ship.pilotAddress
                  );
                const stakedBeforeUnstake =
                  await this.blockchainManager.getPilotStakedBalance(
                    ship.pilotAddress
                  );
                console.log(
                  `💰 Pilot ${ship.pilotName} balances BEFORE unstake:`
                );
                console.log(
                  `   CREDITS: ${(Number(creditsBeforeUnstake) / 1e18).toFixed(
                    2
                  )}`
                );
                console.log(
                  `   Staked: ${(Number(stakedBeforeUnstake) / 1e18).toFixed(
                    2
                  )}`
                );

                const unstakeResult =
                  await this.blockchainManager.unstakePilotFromSector(
                    ship.pilotAddress,
                    ship.privateKey,
                    this.sectorId
                  );

                if (unstakeResult.success) {
                  // Get balances AFTER unstaking
                  const creditsAfterUnstake =
                    await this.blockchainManager.getPilotCreditsBalance(
                      ship.pilotAddress
                    );
                  const stakedAfterUnstake =
                    await this.blockchainManager.getPilotStakedBalance(
                      ship.pilotAddress
                    );

                  console.log(
                    `✅ Pilot ${
                      ship.pilotName
                    } successfully unstaked 10k credits from sector ${this.sectorId.slice(
                      0,
                      10
                    )}...`
                  );
                  console.log(
                    `💰 Pilot ${ship.pilotName} balances AFTER unstake:`
                  );
                  console.log(
                    `   CREDITS: ${(Number(creditsAfterUnstake) / 1e18).toFixed(
                      2
                    )} (Δ ${(
                      (Number(creditsAfterUnstake) -
                        Number(creditsBeforeUnstake)) /
                      1e18
                    ).toFixed(2)})`
                  );
                  console.log(
                    `   Staked: ${(Number(stakedAfterUnstake) / 1e18).toFixed(
                      2
                    )} (Δ ${(
                      (Number(stakedAfterUnstake) -
                        Number(stakedBeforeUnstake)) /
                      1e18
                    ).toFixed(2)})`
                  );

                  // Broadcast unstaking event
                  broadcastEvent({
                    type: "pilot_unstaked",
                    timestamp: Date.now(),
                    data: {
                      pilotAddress: ship.pilotAddress,
                      pilotName: ship.pilotName,
                      sectorId: this.sectorId,
                      returnedAmount: "10000",
                    },
                  });
                } else {
                  console.error(
                    `⚠️ Pilot ${ship.pilotName} failed to unstake: ${unstakeResult.error}`
                  );
                }
              } catch (unstakeError: any) {
                console.error(
                  `⚠️ Error during delayed unstake for pilot ${ship.pilotName}:`,
                  unstakeError
                );
              }
            }, 10000); // 10 second delay
          }
        }
      } catch (error: any) {
        console.error(
          `⚠️ Error checking unstake for pilot ${ship.pilotName}:`,
          error
        );
      }

      // Update pilot's fuel level based on ship's remaining fuel
      this.characterManager.updatePilotFuel(ship.pilotAddress, ship.fuel);
      this.debugLog(`Updated pilot ${ship.pilotName} fuel to ${ship.fuel}%`);

      // Calculate enhanced tip amount
      const { tipAmount, aboutInfo } =
        await this.blockchainManager.calculateEnhancedTipAmount(
          finalScore,
          this.sectorId
        );

      if (tipAmount === 0) {
        this.debugLog(
          `Ship ${ship.id} (${ship.pilotName}) scored ${finalScore} - no tip (below threshold)`
        );
        return;
      }

      const tipType = aboutInfo.hasAboutContract ? "enhanced" : "standard";
      const stationInfo =
        aboutInfo.hasAboutContract && aboutInfo.stationName
          ? ` (station: "${aboutInfo.stationName}")`
          : "";

      console.log(
        `💰 Ship ${ship.id} (${ship.pilotName}) scored ${finalScore} - attempting ${tipType} tip of ${tipAmount}${stationInfo}`
      );

      // Get the player address
      const playerAddress = await this.blockchainManager.getSectorOwner(
        this.sectorId
      );
      if (!playerAddress) {
        console.log(
          `❌ Could not find sector owner for sector ${this.sectorId}, skipping tip`
        );
        return;
      }

      console.log(`   ├─ Sector owner: ${playerAddress}`);
      console.log(`   ├─ Pilot address: ${ship.pilotAddress}`);
      console.log(`   └─ Tip amount: ${tipAmount} points`);

      // Execute the tip transaction
      try {
        const txHash = await this.blockchainManager.executePilotTip(
          ship.privateKey,
          playerAddress,
          tipAmount
        );

        const tipTypeText = aboutInfo.hasAboutContract
          ? " (enhanced)"
          : " (standard)";
        console.log(
          `✅ Pilot ${ship.pilotName} tipped player ${tipAmount} points${tipTypeText}! (tx: ${txHash})`
        );

        // Broadcast tip event
        broadcastEvent({
          type: "pilot_tip",
          timestamp: Date.now(),
          data: {
            shipId: ship.id,
            pilotAddress: ship.pilotAddress,
            pilotName: ship.pilotName,
            playerAddress,
            tipAmount,
            finalScore,
            transactionHash: txHash,
            aboutInfo: {
              hasAboutContract: aboutInfo.hasAboutContract,
              stationName: aboutInfo.stationName,
              tipType: aboutInfo.hasAboutContract ? "enhanced" : "standard",
            },
          },
        });
      } catch (error: any) {
        console.error(`❌ Failed to execute tip transaction: ${error.message}`);

        // Broadcast failed tip event
        broadcastEvent({
          type: "pilot_tip",
          timestamp: Date.now(),
          data: {
            shipId: ship.id,
            pilotAddress: ship.pilotAddress,
            pilotName: ship.pilotName,
            playerAddress,
            tipAmount,
            finalScore,
            error: error.message,
            aboutInfo: {
              hasAboutContract: aboutInfo.hasAboutContract,
              stationName: aboutInfo.stationName,
              tipType: aboutInfo.hasAboutContract ? "enhanced" : "standard",
            },
          },
        });
      }
    } catch (error: any) {
      console.error(`❌ Error in handlePilotTipping: ${error.message}`);
      console.error(`   └─ ${error.stack || error}`);
    }
  }
}

