"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { NextPage } from "next";
import { Address } from "~~/components/scaffold-eth";
import { useScaffoldReadContract } from "~~/hooks/scaffold-eth";
import { useGameServerStats } from "~~/hooks/useGameServerStatus";
import { usePilotsData } from "~~/hooks/usePilotsData";
import { Pilot } from "~~/types/sector";

interface PlayerData {
  address: string;
  sectorId?: string;
  registryAddress?: string;
  name?: string;
  social?: string;
  score?: number;
}

const PilotRow = ({ pilot }: { pilot: Pilot }) => {
  // Get stat color based on value (0-100)
  const getStatColor = (value: number) => {
    if (value >= 75) return "text-success";
    if (value >= 50) return "text-warning";
    if (value >= 25) return "text-info";
    return "text-error";
  };

  return (
    <tr>
      <td>
        <div className="flex items-center justify-center">
          <Image
            src={`/ships/ship${pilot.shipType}.png`}
            alt={`Ship ${pilot.shipType}`}
            width={32}
            height={32}
            className="object-contain rotate-90"
            title={`Ship #${pilot.shipType}`}
          />
        </div>
      </td>
      <td>
        <span className="text-sm font-medium">{pilot.name}</span>
      </td>
      <td>
        <div className="flex items-center gap-2">
          <Address address={pilot.address} size="sm" />
          <span
            className={`font-mono text-xs ${
              parseFloat(pilot.ethBalance) > 0.001
                ? "text-success"
                : parseFloat(pilot.ethBalance) > 0
                  ? "text-warning"
                  : "text-error"
            }`}
            title="ETH Balance"
          >
            {parseFloat(pilot.ethBalance).toFixed(4)}
          </span>
        </div>
      </td>
      <td>
        {pilot.death.isDead ? (
          <span className="badge badge-error badge-sm">💀 Dead</span>
        ) : pilot.assignment.isAssigned && pilot.assignment.currentSectorId ? (
          <Link
            href={`/sector/${pilot.assignment.currentSectorId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="badge badge-primary badge-sm hover:badge-primary-focus cursor-pointer"
          >
            s{pilot.assignment.currentSectorId.slice(0, 8)}...
          </Link>
        ) : (
          <span className="badge badge-success badge-sm">Available</span>
        )}
      </td>
      <td>
        <span className={`font-mono text-xs ${getStatColor(pilot.stats.fuel)}`} title="Fuel">
          {pilot.stats.fuel.toFixed(1)}
        </span>
      </td>
      <td>
        <span className={`font-mono text-xs ${getStatColor(pilot.stats.cargo)}`} title="Cargo">
          {pilot.stats.cargo}
        </span>
      </td>
      <td>
        <span className={`font-mono text-xs ${getStatColor(pilot.stats.aggression)}`} title="Aggression">
          {pilot.stats.aggression}
        </span>
      </td>
      <td>
        <span className={`font-mono text-xs ${getStatColor(pilot.stats.intelligence)}`} title="Intelligence">
          {pilot.stats.intelligence}
        </span>
      </td>
      <td>
        <span className={`font-mono text-xs ${getStatColor(pilot.stats.dexterity)}`} title="Dexterity">
          {pilot.stats.dexterity}
        </span>
      </td>
    </tr>
  );
};

const PlayerRow = ({ player, index, sectorId }: { player: PlayerData; index: number; sectorId?: string }) => {
  // Only allow social links that start with https://
  const isValidSocialUrl = player.social && player.social.startsWith("https://");

  // Truncate name if it's longer than 22 characters (length of "Skycaptain Bussywrecker")
  const truncateName = (name: string) => {
    if (name.length > 22) {
      return name.slice(0, 22) + "...";
    }
    return name;
  };

  return (
    <tr>
      <td className="text-xs">{index + 1}</td>
      <td>
        {player.name ? (
          isValidSocialUrl ? (
            <a
              href={player.social}
              target="_blank"
              rel="noopener noreferrer"
              className="link link-primary text-sm hover:link-primary-focus font-medium"
            >
              {truncateName(player.name)}
            </a>
          ) : (
            <span className="text-sm font-medium">{truncateName(player.name)}</span>
          )
        ) : (
          <span className="text-xs opacity-50">-</span>
        )}
      </td>
      <td>
        <Address address={player.address} size="sm" />
      </td>
      <td>
        {sectorId ? (
          <Link
            href={`/sector/${sectorId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="badge badge-primary badge-sm hover:badge-primary-focus cursor-pointer"
          >
            s{sectorId.slice(0, 8)}...
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
        {player.score !== undefined ? (
          <span className="font-mono text-sm">{player.score.toLocaleString()}</span>
        ) : (
          <span className="text-xs opacity-50">0</span>
        )}
      </td>
    </tr>
  );
};

const CountdownTimer = ({ endTime }: { endTime: bigint }) => {
  const [timeLeft, setTimeLeft] = useState<string>("");
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    const updateCountdown = () => {
      const now = Math.floor(Date.now() / 1000);
      const endTimeSeconds = Number(endTime);
      const difference = endTimeSeconds - now;

      if (difference <= 0) {
        setTimeLeft("00:00:00");
        setIsExpired(true);
        return;
      }

      const hours = Math.floor(difference / 3600);
      const minutes = Math.floor((difference % 3600) / 60);
      const seconds = difference % 60;

      setTimeLeft(
        `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`,
      );
      setIsExpired(false);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [endTime]);

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm opacity-70">Time Left:</span>
      <span className={`font-mono text-lg ${isExpired ? "text-error" : "text-primary"}`}>{timeLeft}</span>
      {isExpired && <span className="badge badge-error badge-sm">Expired</span>}
    </div>
  );
};

const WinnersDisplay = ({ winners, winningScore }: { winners: string[]; winningScore: bigint }) => {
  if (!winners || winners.length === 0) {
    return (
      <div className="alert alert-info">
        <span>🤷 No winners - no players participated in the game</span>
      </div>
    );
  }

  return (
    <div className="alert alert-success">
      <div className="flex flex-col gap-2 w-full">
        <div className="flex items-center gap-2">
          <span className="text-lg">🏆</span>
          <span className="font-bold">{winners.length === 1 ? "Winner!" : `${winners.length} Winners! (Tie)`}</span>
          <span className="badge badge-primary">Score: {winningScore.toString()}</span>
        </div>
        <div className="space-y-1">
          {winners.map((winner, index) => (
            <div key={winner} className="flex items-center gap-2">
              <span className="text-sm opacity-70">{index + 1}.</span>
              <Address address={winner} size="sm" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const Dashboard: NextPage = () => {
  const [players, setPlayers] = useState<PlayerData[]>([]);
  const [playerSectors, setPlayerSectors] = useState<Map<string, string>>(new Map());
  const [playerRegistries, setPlayerRegistries] = useState<Map<string, string>>(new Map());
  const [playerNames, setPlayerNames] = useState<Map<string, string>>(new Map());
  const [playerSocials, setPlayerSocials] = useState<Map<string, string>>(new Map());
  const [playerScores, setPlayerScores] = useState<Map<string, number>>(new Map());

  // Get game server stats
  const { stats: gameServerStats, status: gameServerStatus, error: gameServerError } = useGameServerStats();

  // Get pilots data
  const { pilots: pilotsData, isLoading: pilotsLoading, error: pilotsError } = usePilotsData();

  // Read players from the Game contract
  const { data: playersData } = useScaffoldReadContract({
    contractName: "Game",
    functionName: "getPlayers",
  });

  // Read all sectors with their owners and registries in one call
  const { data: sectorsWithOwnersAndRegistries } = useScaffoldReadContract({
    contractName: "MaxExtract",
    functionName: "getPlayerData" as any,
  });
  // Read game info
  const { data: gameInfo } = useScaffoldReadContract({
    contractName: "Game",
    functionName: "getGameInfo",
  });

  // Read game end time
  const { data: gameEndTime } = useScaffoldReadContract({
    contractName: "Game",
    functionName: "gameEndTime",
  });

  // Read if game can be settled
  const { data: canGameSettle } = useScaffoldReadContract({
    contractName: "Game",
    functionName: "canGameSettle",
  });

  // Read game winners (only available after settlement)
  const { data: gameWinners } = useScaffoldReadContract({
    contractName: "Game",
    functionName: "getGameWinners",
  });

  // Read winning score (only available after settlement)
  const { data: winningScore } = useScaffoldReadContract({
    contractName: "Game",
    functionName: "winningScore",
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
      }));
      setPlayers(playerList);
    }
  }, [playersData]);

  useEffect(() => {
    if (
      sectorsWithOwnersAndRegistries &&
      Array.isArray(sectorsWithOwnersAndRegistries) &&
      sectorsWithOwnersAndRegistries.length >= 6
    ) {
      // Build maps of player addresses to their sector IDs, registry addresses, names, socials, and scores
      const [sectorIds, owners, registries, names, socials, scores] = sectorsWithOwnersAndRegistries as unknown as [
        bigint[],
        string[],
        string[],
        string[],
        string[],
        bigint[],
      ];
      const sectorMap = new Map<string, string>();
      const registryMap = new Map<string, string>();
      const nameMap = new Map<string, string>();
      const socialMap = new Map<string, string>();
      const scoreMap = new Map<string, number>();

      for (let i = 0; i < sectorIds.length; i++) {
        const sectorId = sectorIds[i].toString();
        const owner = owners[i];
        const registry = registries[i];
        const name = names[i];
        const social = socials[i];
        const score = Number(scores[i]);

        if (owner && sectorId !== "0") {
          sectorMap.set(owner.toLowerCase(), sectorId);
          if (registry && registry !== "0x0000000000000000000000000000000000000000") {
            registryMap.set(owner.toLowerCase(), registry);
          }
          if (name && name.trim() !== "") {
            nameMap.set(owner.toLowerCase(), name);
          }
          if (social && social.trim() !== "") {
            socialMap.set(owner.toLowerCase(), social);
          }
        }

        // Always set score for the owner, even if they don't have a sector
        if (owner) {
          scoreMap.set(owner.toLowerCase(), score);
        }
      }

      setPlayerSectors(sectorMap);
      setPlayerRegistries(registryMap);
      setPlayerNames(nameMap);
      setPlayerSocials(socialMap);
      setPlayerScores(scoreMap);
    }
  }, [sectorsWithOwnersAndRegistries]);

  const formatEntropy = (entropyValue: string | undefined) => {
    if (!entropyValue || entropyValue === "0x0000000000000000000000000000000000000000000000000000000000000000") {
      return "Not set";
    }
    return `${entropyValue.slice(0, 10)}...${entropyValue.slice(-8)}`;
  };

  const formatGameState = (state: number) => {
    switch (state) {
      case 0:
        return "Open";
      case 1:
        return "Active";
      case 2:
        return "Settled";
      default:
        return "Unknown";
    }
  };

  return (
    <div className="flex items-center flex-col grow pt-10">
      <div className="px-5 w-full max-w-4xl">
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            {/* Game Status */}
            <div className="space-y-4 mb-8">
              {/* Game State and Basic Info */}
              <div className="flex flex-wrap items-center justify-center gap-4 p-4 bg-base-200 rounded-lg">
                <div
                  className={`badge badge-lg ${
                    gameInfo && Number(gameInfo[0]) === 2
                      ? "badge-success"
                      : gameInfo && Number(gameInfo[0]) === 1
                        ? "badge-warning"
                        : "badge-primary"
                  }`}
                >
                  {gameInfo ? formatGameState(Number(gameInfo[0])) : "Loading..."}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm opacity-70">Players:</span>
                  <span className="font-mono">{gameInfo ? Number(gameInfo[1]).toString() : "0"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm opacity-70">Buy-in:</span>
                  <span className="font-mono">{gameInfo ? `${Number(gameInfo[2]) / 1e18}Ξ` : "0Ξ"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm opacity-70">Pot:</span>
                  <span className="font-mono">
                    {gameInfo ? `${(Number(gameInfo[1]) * Number(gameInfo[2])) / 1e18}Ξ` : "0Ξ"}
                  </span>
                </div>
                {/* Countdown Timer for Active Games */}
                {gameInfo && Number(gameInfo[0]) === 1 && gameEndTime && (
                  <CountdownTimer endTime={gameEndTime as bigint} />
                )}
                {/* Settlement Status */}
                {canGameSettle && <div className="badge badge-error badge-lg animate-pulse">Can Settle!</div>}
              </div>

              {/* Winners Display for Settled Games */}
              {gameInfo &&
                Number(gameInfo[0]) === 2 &&
                (gameWinners && winningScore !== undefined && winningScore !== null ? (
                  <WinnersDisplay winners={gameWinners as string[]} winningScore={winningScore as bigint} />
                ) : (
                  <div className="alert alert-warning">
                    <span>🔄 Game is settled but winners data is still loading...</span>
                  </div>
                ))}
            </div>

            {/* Game Server Status */}
            <div className="flex flex-wrap items-center justify-center gap-4 mb-8 p-2 bg-base-300 rounded-lg">
              <div
                className={`badge badge-lg ${gameServerStatus === "online" ? "badge-success" : gameServerStatus === "offline" ? "badge-error" : "badge-warning"}`}
              >
                Game Server: {gameServerStatus}
              </div>
              {gameServerStats && (
                <>
                  <div className="flex items-center gap-2">
                    <span className="text-sm opacity-70">Sectors:</span>
                    <span className="font-mono">{gameServerStats.sectors.total}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm opacity-70">Asteroids:</span>
                    <span className="font-mono">{gameServerStats.sectors.totalAsteroids.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm opacity-70">Ships:</span>
                    <span className="font-mono">{gameServerStats.sectors.totalShips.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm opacity-70">Simulation:</span>
                    <span
                      className={`badge badge-sm ${gameServerStats.simulation.isRunning ? "badge-success" : "badge-error"}`}
                    >
                      {gameServerStats.simulation.isRunning ? "Running" : "Stopped"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm opacity-70">WebSocket:</span>
                    <span className="font-mono">{gameServerStats.websocket.totalConnections}</span>
                  </div>
                </>
              )}
              {gameServerError && <div className="text-xs text-error opacity-70">Error: {gameServerError}</div>}
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
                        <th>Station Name</th>
                        <th>Address</th>
                        <th>Sector</th>
                        <th>Registry</th>
                        <th>Score</th>
                      </tr>
                    </thead>
                    <tbody>
                      {players
                        .map(player => {
                          const sectorId = playerSectors.get(player.address.toLowerCase());
                          const registryAddress = playerRegistries.get(player.address.toLowerCase());
                          const name = playerNames.get(player.address.toLowerCase());
                          const social = playerSocials.get(player.address.toLowerCase());
                          const score = playerScores.get(player.address.toLowerCase()) || 0;
                          return { ...player, registryAddress, name, social, score, sectorId };
                        })
                        .sort((a, b) => (b.score || 0) - (a.score || 0)) // Sort by score, highest first
                        .map((player, index) => (
                          <PlayerRow key={player.address} player={player} index={index} sectorId={player.sectorId} />
                        ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {/* Pilots List */}
            {pilotsData && pilotsData.pilots.length > 0 && (
              <>
                <div className="divider">
                  Pilots
                  <div className="flex items-center gap-2 ml-4">
                    <div className="flex items-center gap-1">
                      <span className="text-xs opacity-70">Total:</span>
                      <span className="font-mono text-xs">{pilotsData.summary.total}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-xs opacity-70">Assigned:</span>
                      <span className="font-mono text-xs">{pilotsData.summary.assigned}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-xs opacity-70">Available:</span>
                      <span className="font-mono text-xs">{pilotsData.summary.available}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-xs opacity-70">Dead:</span>
                      <span className="font-mono text-xs">{pilotsData.summary.dead}</span>
                    </div>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="table table-sm">
                    <thead>
                      <tr>
                        <th></th>
                        <th>Pilot Name</th>
                        <th>Address</th>
                        <th>Status</th>
                        <th title="Fuel">⛽</th>
                        <th title="Cargo">📦</th>
                        <th title="Aggression">⚔️</th>
                        <th title="Intelligence">🧠</th>
                        <th title="Dexterity">🏃</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pilotsData.pilots
                        .sort((a, b) => a.name.localeCompare(b.name))
                        .map(pilot => (
                          <PilotRow key={pilot.address} pilot={pilot} />
                        ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {/* Pilots Loading/Error States */}
            {pilotsLoading && (
              <>
                <div className="divider">Pilots</div>
                <div className="flex justify-center items-center py-8">
                  <span className="loading loading-spinner loading-md"></span>
                  <span className="ml-2">Loading pilots...</span>
                </div>
              </>
            )}

            {pilotsError && (
              <>
                <div className="divider">Pilots</div>
                <div className="alert alert-error">
                  <span>Error loading pilots: {pilotsError}</span>
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
