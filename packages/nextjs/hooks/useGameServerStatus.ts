"use client";

import { useEffect, useState } from "react";

export type GameServerStatus = "checking" | "online" | "offline";

export interface GameServerStats {
  status: string;
  timestamp: string;
  sectors: {
    total: number;
    totalAsteroids: number;
    totalShips: number;
    details: Array<{
      id: string;
      asteroidCount: number;
      shipCount: number;
      subscriberCount: number;
    }>;
  };
  simulation: {
    isRunning: boolean;
    innerLoopRunning: boolean;
    outerLoopRunning: boolean;
    innerLoopInterval: number;
    outerLoopInterval: number;
  };
  websocket: {
    totalConnections: number;
    sectorSubscriptions: Record<string, number>;
  };
  entropy: {
    isAvailable: boolean;
    currentEntropy: string | null;
    latestRound: number;
    revealsCount: number;
  };
  server: {
    uptime: number;
    memory: NodeJS.MemoryUsage;
    nodeVersion: string;
    platform: string;
  };
}

export const useGameServerStatus = () => {
  const [gameServerStatus, setGameServerStatus] = useState<GameServerStatus>("checking");

  useEffect(() => {
    const checkGameServer = async () => {
      try {
        const response = await fetch("http://localhost:8000/api/health");
        if (response.ok) {
          setGameServerStatus("online");
        } else {
          setGameServerStatus("offline");
        }
      } catch {
        setGameServerStatus("offline");
      }
    };

    checkGameServer();
    const interval = setInterval(checkGameServer, 10000); // Check every 10 seconds
    return () => clearInterval(interval);
  }, []);

  return gameServerStatus;
};

export const useGameServerStats = () => {
  const [stats, setStats] = useState<GameServerStats | null>(null);
  const [status, setStatus] = useState<GameServerStatus>("checking");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch("http://localhost:8000/api/stats");
        if (response.ok) {
          const data = await response.json();
          setStats(data);
          setStatus("online");
          setError(null);
        } else {
          setStatus("offline");
          setError(`HTTP ${response.status}: ${response.statusText}`);
        }
      } catch (err) {
        setStatus("offline");
        setError(err instanceof Error ? err.message : "Unknown error");
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 10000); // Check every 10 seconds
    return () => clearInterval(interval);
  }, []);

  return { stats, status, error };
};
