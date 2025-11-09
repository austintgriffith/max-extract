// Ship scale factors for visual balance across different ship types
// Ships 1-3: Starter ships (smallest)
// Ships 4-7: Medium tier
// Ships 8-11: Advanced tier
// Ship 12: Flagship (largest)
export const SHIP_SCALE_FACTORS = [0.85, 0.85, 0.85, 1.2, 1.2, 1.2, 1.2, 1.35, 1.35, 1.35, 1.35, 1.5];

// Base scale factors for each base tier
// These will be used when players upgrade their bases through the game
export const BASE_SCALE_FACTORS = [0.25, 0.25, 0.7, 0.8, 0.95, 1.0];

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
