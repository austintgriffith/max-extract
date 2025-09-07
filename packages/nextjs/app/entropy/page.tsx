"use client";

import { useEffect, useState } from "react";
import { keccak256 } from "viem";
import { useScaffoldReadContract } from "~~/hooks/scaffold-eth";

interface SectorEntropyData {
  sectorId: string;
  sectorEntropy: string;
  sampleRolls?: {
    single: number;
    percentage: number;
    range1to10: number;
    coinFlip: boolean;
  };
}

export default function EntropyPage() {
  const [sectorEntropies, setSectorEntropies] = useState<SectorEntropyData[]>([]);

  // Read rolling state from Universe contract
  const { data: rollingState, refetch: refetchRollingState } = useScaffoldReadContract({
    contractName: "Universe",
    functionName: "getRollingState",
  });

  // Read the original game entropy from Universe contract
  const { data: gameEntropy, refetch: refetchGameEntropy } = useScaffoldReadContract({
    contractName: "Universe",
    functionName: "getEntropy",
  });

  // Read active sectors from MaxExtract contract
  const { data: contractActiveSectors, refetch: refetchActiveSectors } = useScaffoldReadContract({
    contractName: "MaxExtract",
    functionName: "getActiveSectors",
  });

  // Calculate sector-specific entropy like the backend does
  const calculateSectorEntropy = (rollingEntropy: string, sectorId: string): string => {
    try {
      // Pad sector ID to 64 characters (32 bytes) like the backend
      const paddedSectorId = sectorId.padStart(64, "0");

      // Combine rolling entropy with padded sector ID
      const combined = (rollingEntropy + paddedSectorId) as `0x${string}`;

      // Hash with keccak256
      return keccak256(combined);
    } catch (error) {
      console.error("Error calculating sector entropy:", error);
      return "0x0";
    }
  };

  // Update sector entropies
  useEffect(() => {
    const updateSectorEntropies = async () => {
      if (rollingState && contractActiveSectors) {
        const contractRollingEntropy = rollingState[0] as string;
        const sectors: SectorEntropyData[] = [];

        // Process active sectors
        for (const sectorId of contractActiveSectors as bigint[]) {
          const sectorIdStr = sectorId.toString();

          // Calculate sector-specific entropy
          const sectorEntropy = calculateSectorEntropy(contractRollingEntropy, sectorIdStr);

          // Fetch backend sample rolls for this sector
          let sampleRolls;
          try {
            const response = await fetch(`http://localhost:8000/api/entropy/sector/${sectorIdStr}`);
            if (response.ok) {
              const sectorData = await response.json();
              sampleRolls = {
                single: sectorData.sampleRolls.single,
                percentage: sectorData.sampleRolls.percentage,
                range1to10: sectorData.sampleRolls.range1to10,
                coinFlip: sectorData.sampleRolls.coinFlip,
              };
            }
          } catch (error) {
            console.error(`Failed to fetch sector ${sectorIdStr} data:`, error);
          }

          sectors.push({
            sectorId: sectorIdStr,
            sectorEntropy,
            sampleRolls,
          });
        }

        setSectorEntropies(sectors);
      }
    };

    updateSectorEntropies();
  }, [rollingState, contractActiveSectors]);

  // Auto-refresh data every 2 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      refetchRollingState();
      refetchGameEntropy();
      refetchActiveSectors();
    }, 2000);

    return () => clearInterval(interval);
  }, [refetchRollingState, refetchGameEntropy, refetchActiveSectors]);

  const contractRollingEntropy = rollingState?.[0] as string;
  const contractRoundNumber = rollingState?.[1] as bigint;

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold mb-8 text-center">🎲 Game Entropy</h1>

      {/* Game Entropies */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Original Game Entropy */}
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title text-xl">🌌 Game Entropy</h2>
            <div className="bg-base-200 p-4 rounded-lg">
              <p className="font-mono text-sm break-all mb-2">{(gameEntropy as string) || "Loading..."}</p>
              <p className="text-xs text-gray-600">Set once during contract initialization</p>
            </div>
          </div>
        </div>

        {/* Rolling Entropy */}
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title text-xl">🎲 Rolling Entropy</h2>
            <div className="bg-base-200 p-4 rounded-lg">
              <p className="font-mono text-sm break-all mb-2">{contractRollingEntropy || "Loading..."}</p>
              <p className="text-xs text-gray-600">Round {contractRoundNumber?.toString()} • Updates every second</p>
            </div>
          </div>
        </div>
      </div>

      {/* Active Sectors */}
      <div className="card bg-base-100 shadow-xl mb-6">
        <div className="card-body">
          <h2 className="card-title text-2xl">🌌 Sector Entropy ({sectorEntropies.length})</h2>
          {sectorEntropies.length === 0 ? (
            <p className="text-gray-500">No active sectors found</p>
          ) : (
            <div className="space-y-4">
              {sectorEntropies.map(sector => (
                <div key={sector.sectorId} className="border border-base-300 rounded-lg p-4">
                  <h3 className="font-semibold mb-2">Sector {sector.sectorId}</h3>
                  <div className="bg-base-200 p-3 rounded">
                    <p className="font-mono text-sm break-all">{sector.sectorEntropy}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Live Updates Indicator */}
      <div className="fixed bottom-4 right-4">
        <div className="badge badge-info">🔄 Live updates</div>
      </div>
    </div>
  );
}
