"use client";

import { useEffect, useState } from "react";

export interface DeathEvent {
  victimAddress: string;
  victimName: string;
  killerAddress: string | null;
  killerName: string;
  deathTime: number | null;
  timeSinceDeath: number | null;
}

export interface KillerStats {
  address: string;
  name: string;
  kills: number;
}

export interface DeathStatsResponse {
  summary: {
    totalDeaths: number;
    recentDeaths: number;
    totalKillers: number;
  };
  recentDeaths: DeathEvent[];
  killerLeaderboard: KillerStats[];
  allDeaths: DeathEvent[];
}

export const useDeathStats = (refreshInterval: number = 30000) => {
  const [deathStats, setDeathStats] = useState<DeathStatsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDeathStats = async () => {
    try {
      const response = await fetch("/api/deaths");
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setDeathStats(data);
      setError(null);
    } catch (err) {
      console.error("Failed to fetch death statistics:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDeathStats();

    const interval = setInterval(fetchDeathStats, refreshInterval);
    return () => clearInterval(interval);
  }, [refreshInterval]);

  return {
    deathStats,
    isLoading,
    error,
    refetch: fetchDeathStats,
  };
};
