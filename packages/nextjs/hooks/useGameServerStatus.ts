"use client";

import { useEffect, useState } from "react";

export type GameServerStatus = "checking" | "online" | "offline";

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
