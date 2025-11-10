// Pilot assignment tracking and management

import { PilotAssignment, SECTOR_CONFIG } from "../../types";
import type { CharacterManager } from "./CharacterManager";

export class PilotManager {
  private pilotAssignments: Map<string, PilotAssignment> = new Map();
  private debugMode: boolean;
  private characterManager: CharacterManager | null = null;
  private federationTimer: NodeJS.Timeout | null = null;

  constructor(debugMode: boolean = false) {
    this.debugMode = debugMode;
  }
  
  /**
   * Set the character manager reference for federation management
   */
  public setCharacterManager(characterManager: CharacterManager): void {
    this.characterManager = characterManager;
    // Start federation timer
    this.startFederationTimer();
  }
  
  /**
   * Start the background timer to release pilots from federation
   */
  private startFederationTimer(): void {
    if (this.federationTimer) {
      return; // Already running
    }
    
    this.federationTimer = setInterval(() => {
      this.checkFederationTimers();
    }, 10000); // Check every 10 seconds
    
    this.debugLog("Federation timer started");
  }
  
  /**
   * Check all pilots in federation and release those who have completed their time
   */
  private checkFederationTimers(): void {
    if (!this.characterManager) {
      return;
    }
    
    const now = Date.now();
    const characters = this.characterManager.getAllCharacters();
    
    for (const character of characters) {
      if (character.federationStatus.inFederation) {
        const elapsed = now - (character.federationStatus.federationEntryTime || 0);
        
        if (elapsed >= SECTOR_CONFIG.FEDERATION_LOCK_TIME) {
          // Release pilot from federation
          character.federationStatus.inFederation = false;
          character.federationStatus.federationEntryTime = null;
          
          console.log(
            `🏛️ Pilot ${character.firstname} ${character.lastname} released from Federation Space`
          );
        }
      }
    }
  }
  
  /**
   * Enter a pilot into Federation Space
   */
  public enterFederation(pilotAddress: string, cargoAmount: number): void {
    if (!this.characterManager) {
      console.error("CharacterManager not set in PilotManager");
      return;
    }
    
    const character = this.characterManager.getCharacterByAddress(pilotAddress);
    if (!character) {
      console.error(`Character not found for pilot ${pilotAddress}`);
      return;
    }
    
    character.federationStatus.inFederation = true;
    character.federationStatus.federationEntryTime = Date.now();
    character.federationStatus.cargoSold = cargoAmount;
    
    this.debugLog(`Pilot ${character.firstname} ${character.lastname} entered Federation Space with ${cargoAmount} cargo`);
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
    
    // Check if pilot is in federation
    if (this.characterManager) {
      const character = this.characterManager.getCharacterByAddress(pilotAddress);
      if (character && character.federationStatus.inFederation) {
        return false; // Not available while in federation
      }
    }
    
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
