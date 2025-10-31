import { SectorEvent } from "~~/types/sector";

const STORAGE_PREFIX = "sector_events_";
const MAX_EVENTS = 200;
const EVENT_EXPIRY_MS = 60 * 60 * 1000; // 1 hour

interface StoredSectorEvents {
  events: SectorEvent[];
  timestamp: number;
  sectorId: string;
}

/**
 * Generates a storage key for a given sector
 */
const getStorageKey = (sectorId: string): string => {
  return `${STORAGE_PREFIX}${sectorId}`;
};

/**
 * Checks if stored events are still valid (less than 1 hour old)
 */
const isStorageValid = (timestamp: number): boolean => {
  return Date.now() - timestamp < EVENT_EXPIRY_MS;
};

/**
 * Loads events from localStorage for a given sector
 * Returns empty array if no valid data exists
 */
export const loadSectorEvents = (sectorId: string): SectorEvent[] => {
  try {
    const key = getStorageKey(sectorId);
    const stored = localStorage.getItem(key);

    if (!stored) {
      return [];
    }

    const data: StoredSectorEvents = JSON.parse(stored);

    // Check if data is expired
    if (!isStorageValid(data.timestamp)) {
      // Clean up expired data
      localStorage.removeItem(key);
      return [];
    }

    // Verify it's for the correct sector
    if (data.sectorId !== sectorId) {
      localStorage.removeItem(key);
      return [];
    }

    return data.events || [];
  } catch (error) {
    console.error("Error loading sector events from localStorage:", error);
    return [];
  }
};

/**
 * Saves events to localStorage for a given sector
 * Automatically culls to MAX_EVENTS (keeping the most recent)
 */
export const saveSectorEvents = (sectorId: string, events: SectorEvent[]): void => {
  try {
    const key = getStorageKey(sectorId);

    // Cull to max events, keeping most recent
    const culledEvents = events.slice(-MAX_EVENTS);

    const data: StoredSectorEvents = {
      events: culledEvents,
      timestamp: Date.now(),
      sectorId,
    };

    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error("Error saving sector events to localStorage:", error);
    // If localStorage is full, try to clean up old sector data
    try {
      cleanupOldSectorData();
      // Try saving again after cleanup
      localStorage.setItem(
        getStorageKey(sectorId),
        JSON.stringify({
          events: events.slice(-MAX_EVENTS),
          timestamp: Date.now(),
          sectorId,
        }),
      );
    } catch (retryError) {
      console.error("Failed to save events even after cleanup:", retryError);
    }
  }
};

/**
 * Cleans up expired sector event data from localStorage
 */
export const cleanupOldSectorData = (): void => {
  try {
    const keysToRemove: string[] = [];

    // Iterate through all localStorage keys
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(STORAGE_PREFIX)) {
        try {
          const stored = localStorage.getItem(key);
          if (stored) {
            const data: StoredSectorEvents = JSON.parse(stored);
            if (!isStorageValid(data.timestamp)) {
              keysToRemove.push(key);
            }
          }
        } catch {
          // If we can't parse it, remove it
          keysToRemove.push(key);
        }
      }
    }

    // Remove expired keys
    keysToRemove.forEach(key => localStorage.removeItem(key));

    if (keysToRemove.length > 0) {
      console.log(`Cleaned up ${keysToRemove.length} expired sector event storage(s)`);
    }
  } catch (error) {
    console.error("Error cleaning up old sector data:", error);
  }
};

/**
 * Clears events for a specific sector
 */
export const clearSectorEvents = (sectorId: string): void => {
  try {
    const key = getStorageKey(sectorId);
    localStorage.removeItem(key);
  } catch (error) {
    console.error("Error clearing sector events:", error);
  }
};
