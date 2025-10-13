import { useEffect, useState } from "react";
import { PilotsResponse } from "~~/types/sector";

interface UsePilotsDataReturn {
  pilots: PilotsResponse | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export const usePilotsData = (refreshInterval: number = 10000): UsePilotsDataReturn => {
  const [pilots, setPilots] = useState<PilotsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPilots = async () => {
    try {
      setError(null);
      const response = await fetch("http://localhost:8000/api/pilots");

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: PilotsResponse = await response.json();
      setPilots(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch pilots data";
      setError(errorMessage);
      console.error("Error fetching pilots data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const refetch = () => {
    setIsLoading(true);
    fetchPilots();
  };

  useEffect(() => {
    // Initial fetch
    fetchPilots();

    // Set up polling if refreshInterval is provided
    if (refreshInterval > 0) {
      const interval = setInterval(fetchPilots, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [refreshInterval]);

  return {
    pilots,
    isLoading,
    error,
    refetch,
  };
};
