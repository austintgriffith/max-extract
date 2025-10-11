"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { NextPage } from "next";
import { Address } from "~~/components/scaffold-eth";
import { useScaffoldReadContract } from "~~/hooks/scaffold-eth";

interface PlayerData {
  address: string;
  sectorId?: number;
  registryAddress?: string;
  sectorStats?: {
    name: string;
    status: string;
    asteroidCount: number;
    score: number;
  };
}

const PlayerRow = ({ player, index, sectorId }: { player: PlayerData; index: number; sectorId?: string }) => {
  return (
    <tr>
      <td className="text-xs">{index + 1}</td>
      <td>
        <Address address={player.address} size="sm" />
      </td>
      <td>
        {sectorId ? (
          <Link
            href={`/sector/${sectorId}`}
            className="badge badge-primary badge-sm hover:badge-primary-focus cursor-pointer"
          >
            Sector {sectorId.slice(0, 8)}...
          </Link>
        ) : (
          <span className="badge badge-ghost badge-sm">No Sector</span>
        )}
      </td>
      <td>
        {player.registryAddress ? (
          <Address address={player.registryAddress} size="sm" />
        ) : (
          <span className="badge badge-ghost badge-sm">No Registry</span>
        )}
      </td>
      <td>
        {player.sectorStats ? (
          <span className="badge badge-success badge-sm">{player.sectorStats.status}</span>
        ) : (
          <span className="badge badge-ghost badge-sm">-</span>
        )}
      </td>
      <td>
        {player.sectorStats ? (
          <span className="font-mono text-sm">{player.sectorStats.score.toLocaleString()}</span>
        ) : (
          <span className="text-xs opacity-50">-</span>
        )}
      </td>
    </tr>
  );
};

const Dashboard: NextPage = () => {
  const [players, setPlayers] = useState<PlayerData[]>([]);
  const [playerSectors, setPlayerSectors] = useState<Map<string, string>>(new Map());
  const [playerRegistries, setPlayerRegistries] = useState<Map<string, string>>(new Map());

  // Read players from the Game contract
  const { data: playersData } = useScaffoldReadContract({
    contractName: "Game",
    functionName: "getPlayers",
  });

  // Read all sectors with their owners and registries in one call
  const { data: sectorsWithOwnersAndRegistries } = useScaffoldReadContract({
    contractName: "MaxExtract",
    functionName: "getSectorsWithOwnersAndRegistries" as any,
  });
  // Read game info
  const { data: gameInfo } = useScaffoldReadContract({
    contractName: "Game",
    functionName: "getGameInfo",
  });

  // Read entropy from Universe contract
  const { data: entropy } = useScaffoldReadContract({
    contractName: "Universe",
    functionName: "getEntropy",
  });

  // Read rolling entropy state
  const { data: rollingState } = useScaffoldReadContract({
    contractName: "Universe",
    functionName: "getRollingState",
  });

  // Read commit-reveal state
  const { data: commitRevealState } = useScaffoldReadContract({
    contractName: "Universe",
    functionName: "getCommitRevealState",
  });

  // Read main commitment hash
  const { data: commitmentHash } = useScaffoldReadContract({
    contractName: "Universe",
    functionName: "getCommitmentHash" as any,
  });

  useEffect(() => {
    if (playersData) {
      // Convert addresses to PlayerData objects
      const playerList: PlayerData[] = (playersData as string[]).map(address => ({
        address,
        sectorId: undefined,
        sectorStats: undefined,
      }));
      setPlayers(playerList);
    }
  }, [playersData]);

  useEffect(() => {
    if (
      sectorsWithOwnersAndRegistries &&
      Array.isArray(sectorsWithOwnersAndRegistries) &&
      sectorsWithOwnersAndRegistries.length >= 3
    ) {
      // Build maps of player addresses to their sector IDs and registry addresses
      const [sectorIds, owners, registries] = sectorsWithOwnersAndRegistries as unknown as [
        bigint[],
        string[],
        string[],
      ];
      const sectorMap = new Map<string, string>();
      const registryMap = new Map<string, string>();

      for (let i = 0; i < sectorIds.length; i++) {
        const sectorId = sectorIds[i].toString();
        const owner = owners[i];
        const registry = registries[i];
        if (owner && sectorId !== "0") {
          sectorMap.set(owner.toLowerCase(), sectorId);
          if (registry && registry !== "0x0000000000000000000000000000000000000000") {
            registryMap.set(owner.toLowerCase(), registry);
          }
        }
      }

      setPlayerSectors(sectorMap);
      setPlayerRegistries(registryMap);
    }
  }, [sectorsWithOwnersAndRegistries]);

  const formatEntropy = (entropyValue: string | undefined) => {
    if (!entropyValue || entropyValue === "0x0000000000000000000000000000000000000000000000000000000000000000") {
      return "Not set";
    }
    return `${entropyValue.slice(0, 10)}...${entropyValue.slice(-8)}`;
  };

  const formatGameState = (state: number) => {
    return state === 0 ? "Open" : "Active";
  };

  return (
    <div className="flex items-center flex-col grow pt-10">
      <div className="px-5 w-full max-w-4xl">
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title text-2xl mb-6">Game Status</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div>
                <div className="text-sm opacity-70 mb-1">Game State</div>
                <div className="text-lg font-semibold">
                  {gameInfo ? formatGameState(Number(gameInfo[0])) : "Loading..."}
                </div>
              </div>
              <div>
                <div className="text-sm opacity-70 mb-1">Players</div>
                <div className="text-lg font-semibold">{gameInfo ? Number(gameInfo[1]).toString() : "0"}</div>
              </div>
              <div>
                <div className="text-sm opacity-70 mb-1">Buy-in Price</div>
                <div className="text-lg font-semibold">{gameInfo ? `${Number(gameInfo[2]) / 1e18} ETH` : "0 ETH"}</div>
              </div>
              <div>
                <div className="text-sm opacity-70 mb-1">Total Pot</div>
                <div className="text-lg font-semibold">
                  {gameInfo ? `${(Number(gameInfo[1]) * Number(gameInfo[2])) / 1e18} ETH` : "0 ETH"}
                </div>
              </div>
            </div>

            <div className="divider">Universe Entropy</div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm opacity-70">Commit:</span>
                  <span className="font-mono text-sm">
                    {commitmentHash ? formatEntropy(commitmentHash as unknown as string) : "None"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm opacity-70">Reveal:</span>
                  <span className={`badge badge-sm ${commitRevealState?.[2] ? "badge-success" : "badge-warning"}`}>
                    {commitRevealState?.[2] ? "Revealed" : "Pending"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm opacity-70">Randomness Hash:</span>
                  <span className="font-mono text-sm">{formatEntropy(entropy as string)}</span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm opacity-70">Round Number:</span>
                  <span className="text-sm">{rollingState ? Number(rollingState[1]).toString() : "0"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm opacity-70">Commit:</span>
                  <span className="font-mono text-sm">{formatEntropy(rollingState?.[2] as string)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm opacity-70">Reveal:</span>
                  <span className="font-mono text-sm">{formatEntropy(rollingState?.[0] as string)}</span>
                </div>
              </div>
            </div>

            {/* Players List */}
            {players.length > 0 && (
              <>
                <div className="divider">Players</div>
                <div className="overflow-x-auto">
                  <table className="table table-sm">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Address</th>
                        <th>Sector</th>
                        <th>Registry</th>
                        <th>Status</th>
                        <th>Score</th>
                      </tr>
                    </thead>
                    <tbody>
                      {players.map((player, index) => {
                        const sectorId = playerSectors.get(player.address.toLowerCase());
                        const registryAddress = playerRegistries.get(player.address.toLowerCase());
                        const playerWithRegistry = { ...player, registryAddress };
                        return (
                          <PlayerRow
                            key={player.address}
                            player={playerWithRegistry}
                            index={index}
                            sectorId={sectorId}
                          />
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
