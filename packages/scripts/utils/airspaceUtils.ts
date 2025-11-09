// Airspace class utilities for sector access control

/**
 * Get the ship model letter (A-F) from ship type number (1-12)
 * Ships 1-3 → Model A (smallest)
 * Ships 4-5 → Model B
 * Ships 6-7 → Model C
 * Ship 8 → Model D
 * Ships 9-10 → Model E
 * Ships 11-12 → Model F (largest)
 */
export function getShipModel(shipType: number): string {
  if (shipType >= 1 && shipType <= 3) return "A";
  if (shipType >= 4 && shipType <= 5) return "B";
  if (shipType >= 6 && shipType <= 7) return "C";
  if (shipType === 8) return "D";
  if (shipType >= 9 && shipType <= 10) return "E";
  if (shipType >= 11 && shipType <= 12) return "F";
  return "?"; // Unknown ship type
}

/**
 * Check if a ship type can enter a specific airspace class
 *
 * Airspace Class Rules:
 * - Class 0 (Base 1-2): Only ship models E, F can enter
 * - Class 1 (Base 3): Ship models D, E, F can enter
 * - Class 2 (Base 3+ with staking): Ship models B, C, D, E, F can enter
 * - Class 3 (Base 4+): All ship models A-F can enter
 */
export function canShipEnterAirspaceClass(
  shipType: number,
  airspaceClass: number
): boolean {
  const shipModel = getShipModel(shipType);

  switch (airspaceClass) {
    case 0:
      // Class 0: Only E, F (ships 9-12)
      return shipModel === "E" || shipModel === "F";
    case 1:
      // Class 1: D, E, F (ships 8-12)
      return shipModel === "D" || shipModel === "E" || shipModel === "F";
    case 2:
      // Class 2: B, C, D, E, F (ships 4-12)
      return (
        shipModel === "B" ||
        shipModel === "C" ||
        shipModel === "D" ||
        shipModel === "E" ||
        shipModel === "F"
      );
    case 3:
      // Class 3: All models A-F (ships 1-12)
      return true;
    default:
      // Unknown airspace class, deny access
      return false;
  }
}

/**
 * Get the minimum airspace class needed for a ship model
 */
export function getAirspaceClassForShipModel(shipModel: string): number {
  switch (shipModel) {
    case "A":
      return 3; // Needs Class 3
    case "B":
    case "C":
      return 2; // Needs Class 2
    case "D":
      return 1; // Needs Class 1
    case "E":
    case "F":
      return 0; // Can enter Class 0
    default:
      return 999; // Unknown model, can't enter anywhere
  }
}

/**
 * Get a human-readable description of which ship models can enter an airspace class
 */
export function getAirspaceAccessDescription(airspaceClass: number): string {
  switch (airspaceClass) {
    case 0:
      return "Models E, F only";
    case 1:
      return "Models D, E, F";
    case 2:
      return "Models B, C, D, E, F";
    case 3:
      return "All models (A-F)";
    default:
      return "Unknown";
  }
}
