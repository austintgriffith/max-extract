"use client";

import { useState } from "react";
import { formatEther } from "viem";
import { useAccount } from "wagmi";
import { Address } from "~~/components/scaffold-eth";
import { useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";

export const GameBuyIn = () => {
  const { address: connectedAddress } = useAccount();
  const [isLoading, setIsLoading] = useState(false);

  // Read game state and info
  const { data: gameInfo } = useScaffoldReadContract({
    contractName: "Game",
    functionName: "getGameInfo",
  });

  const { data: players } = useScaffoldReadContract({
    contractName: "Game",
    functionName: "getPlayers",
  });

  const { data: contractBalance } = useScaffoldReadContract({
    contractName: "Game",
    functionName: "getBalance",
  });

  const { data: isPlayerAlready } = useScaffoldReadContract({
    contractName: "Game",
    functionName: "isPlayer",
    args: [connectedAddress as `0x${string}`],
    query: {
      enabled: !!connectedAddress,
    },
  });

  // Write contract hook for buying in
  const { writeContractAsync: writeGameAsync } = useScaffoldWriteContract({
    contractName: "Game",
  });

  const handleBuyIn = async () => {
    if (!gameInfo || !connectedAddress) return;

    try {
      setIsLoading(true);
      await writeGameAsync({
        functionName: "buyIn",
        value: gameInfo[2], // buyInPrice from gameInfo
      });
    } catch (error) {
      console.error("Error buying in:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Extract game state info
  const gameState = gameInfo?.[0];
  const playerCount = gameInfo?.[1];
  const buyInPrice = gameInfo?.[2];
  const isGameOpen = gameState === 0; // GameState.Open = 0

  if (!gameInfo) {
    return (
      <div className="flex flex-col items-center space-y-4 p-6 bg-base-200 rounded-lg">
        <div className="loading loading-spinner loading-md"></div>
        <p>Loading game information...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center space-y-6 p-6 bg-base-200 rounded-lg max-w-2xl mx-auto">
      {/* Total Pot */}
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-2">Total Pot</h3>
        <div className="text-3xl font-bold text-primary">
          {contractBalance ? `${formatEther(contractBalance)} ETH` : "0 ETH"}
        </div>
      </div>

      {/* Buy-in Section */}
      {isGameOpen && (
        <div className="text-center space-y-4">
          <div>
            <h3 className="text-lg font-semibold mb-2">Buy-in Price</h3>
            <div className="text-xl font-bold">{buyInPrice ? `${formatEther(buyInPrice)} ETH` : "Loading..."}</div>
          </div>

          {connectedAddress ? (
            <div>
              {isPlayerAlready ? (
                <div className="alert alert-info">
                  <span>✅ You have already bought into this game!</span>
                </div>
              ) : (
                <button
                  className={`btn btn-primary btn-lg ${isLoading ? "loading" : ""}`}
                  onClick={handleBuyIn}
                  disabled={isLoading}
                >
                  {isLoading ? "Buying In..." : "Buy Into Game"}
                </button>
              )}
            </div>
          ) : (
            <div className="alert alert-warning">
              <span>Connect your wallet to buy into the game</span>
            </div>
          )}
        </div>
      )}

      {/* Players List */}
      <div className="w-full">
        <h3 className="text-lg font-semibold mb-4 text-center">Players ({playerCount?.toString() || "0"})</h3>

        {players && players.length > 0 ? (
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {players.map((player: string, index: number) => (
              <div key={player} className="flex items-center justify-between p-3 bg-base-100 rounded-lg">
                <div className="flex items-center space-x-2">
                  <span className="badge badge-outline">#{index + 1}</span>
                  <Address address={player} />
                </div>
                {player === connectedAddress && <span className="badge badge-primary">You</span>}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center text-base-content/60 py-8">No players have bought in yet</div>
        )}
      </div>

      {/* Game State Info */}
      <div className="text-center text-sm text-base-content/60">
        {isGameOpen ? <p>Game is open for new players to buy in</p> : <p>Game is active - no new buy-ins allowed</p>}
      </div>
    </div>
  );
};
