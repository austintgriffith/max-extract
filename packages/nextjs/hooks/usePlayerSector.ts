"use client";

import { useAccount } from "wagmi";
import { useScaffoldReadContract } from "~~/hooks/scaffold-eth";

/**
 * Custom hook to get the sector ID for the connected player
 * @returns The sector ID for the connected player (0 if no sector)
 */
export const usePlayerSector = () => {
  const { address: connectedAddress } = useAccount();

  const { data: sectorId } = useScaffoldReadContract({
    contractName: "MaxExtract",
    functionName: "getPlayerSector",
    args: [connectedAddress],
    query: {
      enabled: !!connectedAddress,
    },
  });

  return {
    sectorId: sectorId ? sectorId.toString() : "0",
    hasPlayerSector: sectorId ? sectorId.toString() !== "0" : false,
    connectedAddress,
  };
};
