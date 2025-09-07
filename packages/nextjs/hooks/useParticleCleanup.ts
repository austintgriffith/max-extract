import { useEffect } from "react";
import { Particle, SECTOR_CONFIG, SectorSnapshot, Vector2D } from "~~/types/sector";

interface UseParticleCleanupProps {
  particles: Particle[];
  setParticles: React.Dispatch<React.SetStateAction<Particle[]>>;
  setSectorData: React.Dispatch<React.SetStateAction<SectorSnapshot | null>>;
}

const calculatePosition = (
  entity: { position: Vector2D; velocity: Vector2D; spawnTime: number },
  currentTime: number,
): Vector2D => {
  const elapsed = currentTime - entity.spawnTime;
  return {
    x: entity.position.x + entity.velocity.x * (elapsed / 1000),
    y: entity.position.y + entity.velocity.y * (elapsed / 1000),
  };
};

export const useParticleCleanup = ({ particles, setParticles, setSectorData }: UseParticleCleanupProps) => {
  // Particle and ship cleanup effect
  useEffect(() => {
    const interval = setInterval(() => {
      const currentTime = Date.now();
      setParticles(prev => prev.filter(particle => currentTime - particle.spawnTime < particle.lifetime));

      // Also clean up ships that are way out of bounds (frontend safety net)
      setSectorData(prev => {
        if (!prev) return prev;

        const newData = { ...prev };
        let removedShips = 0;

        Object.keys(newData.ships).forEach(shipId => {
          const ship = newData.ships[shipId];
          const pos = calculatePosition(ship, currentTime);

          // Remove ships that are way beyond backend cleanup bounds
          if (pos.x < -200 || pos.x > SECTOR_CONFIG.WIDTH + 200 || pos.y < -200 || pos.y > SECTOR_CONFIG.HEIGHT + 200) {
            console.log(`Frontend cleanup: Removing ship ${shipId} at (${Math.round(pos.x)}, ${Math.round(pos.y)})`);
            delete newData.ships[shipId];
            removedShips++;
          }
        });

        return removedShips > 0 ? newData : prev;
      });
    }, 500); // Clean up every 500ms

    return () => clearInterval(interval);
  }, [particles, setParticles, setSectorData]);
};
