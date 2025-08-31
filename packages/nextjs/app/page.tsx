"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { NextPage } from "next";
import { useAccount } from "wagmi";
import { BugAntIcon, GlobeAltIcon, MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { Address } from "~~/components/scaffold-eth";
import { useScaffoldReadContract } from "~~/hooks/scaffold-eth";

const Home: NextPage = () => {
  const { address: connectedAddress } = useAccount();
  const [gameServerStatus, setGameServerStatus] = useState<"checking" | "online" | "offline">("checking");

  // Read active sectors from the MaxExtract contract
  const { data: activeSectors } = useScaffoldReadContract({
    contractName: "MaxExtract",
    functionName: "getActiveSectors",
  });

  // Check game server status
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

  return (
    <>
      <div className="flex items-center flex-col grow pt-10">
        <div className="px-5">
          <h1 className="text-center">
            <span className="block text-2xl mb-2">Welcome to</span>
            <span className="block text-4xl font-bold">🌌 Max Extract</span>
          </h1>
          <div className="flex justify-center items-center space-x-2 flex-col">
            <p className="my-2 font-medium">Connected Address:</p>
            <Address address={connectedAddress} />
          </div>

          <div className="text-center mb-6">
            <div
              className={`badge ${
                gameServerStatus === "online"
                  ? "badge-success"
                  : gameServerStatus === "checking"
                    ? "badge-warning"
                    : "badge-error"
              }`}
            >
              Game Server: {gameServerStatus}
            </div>
          </div>

          <p className="text-center text-lg mb-4">
            Explore the simulated space sectors where asteroids drift and ships mine resources in real-time.
          </p>

          {/* Active Sectors */}
          {activeSectors && activeSectors.length > 0 && (
            <div className="text-center mb-6">
              <h2 className="text-xl font-bold mb-4">🚀 Active Sectors</h2>
              <div className="flex flex-wrap justify-center gap-2">
                {activeSectors.map((sectorId: bigint) => (
                  <Link
                    key={sectorId.toString()}
                    href={`/sector/${sectorId.toString()}`}
                    className="btn btn-primary btn-sm"
                  >
                    Sector {sectorId.toString().slice(0, 8)}...
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="grow bg-base-300 w-full mt-16 px-8 py-12">
          <div className="flex justify-center items-center gap-12 flex-col md:flex-row">
            <div className="flex flex-col bg-base-100 px-10 py-10 text-center items-center max-w-xs rounded-3xl">
              <GlobeAltIcon className="h-8 w-8 fill-secondary" />
              <p>
                Watch live sector simulations where ships mine asteroids in real-time. Each sector runs independently
                with its own physics and events.
              </p>
            </div>
            <div className="flex flex-col bg-base-100 px-10 py-10 text-center items-center max-w-xs rounded-3xl">
              <BugAntIcon className="h-8 w-8 fill-secondary" />
              <p>
                Debug and interact with the Max Extract smart contracts using the{" "}
                <Link href="/debug" passHref className="link">
                  Debug Contracts
                </Link>{" "}
                interface.
              </p>
            </div>
            <div className="flex flex-col bg-base-100 px-10 py-10 text-center items-center max-w-xs rounded-3xl">
              <MagnifyingGlassIcon className="h-8 w-8 fill-secondary" />
              <p>
                Explore blockchain transactions and contract interactions with the{" "}
                <Link href="/blockexplorer" passHref className="link">
                  Block Explorer
                </Link>{" "}
                tool.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Home;
