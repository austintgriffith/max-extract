import { useEffect, useState } from "react";
import { SectorSnapshot } from "~~/types/sector";
import { getGameServerHttpUrl } from "~~/utils/scaffold-eth/getGameServerUrl";

interface UseSectorDataProps {
  sectorId: string;
}

interface UseSectorDataReturn {
  sectorData: SectorSnapshot | null;
  setSectorData: React.Dispatch<React.SetStateAction<SectorSnapshot | null>>;
  error: string | null;
}

export const useSectorData = ({ sectorId }: UseSectorDataProps): UseSectorDataReturn => {
  const [sectorData, setSectorData] = useState<SectorSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load initial sector data
  useEffect(() => {
    if (!sectorId) return;

    const loadSectorData = async () => {
      try {
        const response = await fetch(`${getGameServerHttpUrl()}/sector/${sectorId}`);
        if (!response.ok) {
          throw new Error(`Sector ${sectorId} not found`);
        }
        const data = await response.json();
        setSectorData(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load sector data");
        console.error("Error loading sector data:", err);
      }
    };

    loadSectorData();
  }, [sectorId]);

  return {
    sectorData,
    setSectorData,
    error,
  };
};
