"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
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
      <div className="flex items-center flex-col grow">
        {/* Hero Image - Full Width with Bleed */}
        <div className="w-full mb-8 -mx-10">
          <Image
            src="/maxwidenotext.jpg"
            alt="Max Extract"
            width={1200}
            height={800}
            className="w-[calc(100%+80px)] rounded-lg shadow-2xl"
            priority
          />
        </div>

        <div className="px-5 max-w-6xl mx-auto">
          {/* Story Text */}
          <div className="prose prose-lg max-w-none text-base-content mb-8 px-8 py-6">
            <p className="text-lg leading-relaxed mb-8 px-4">
              Max Extract wasn&apos;t a captain or a warlord. Just another code monkey in the asteroid belt, known for
              keeping his head down and drill spinning. Out here, among scattered wrecks and drifting cargo, the real
              battles weren&apos;t fought with lasers—they were waged in silence, when one crew mined a rock for hours
              only to have another swoop in and take everything. No treaties held. Anarchy ruled, but it squandered more
              than it gave. No one trusted anyone, and every mission risked ending in blood or bankruptcy. Max
              didn&apos;t try to stop the violence, only the inefficiency.
            </p>
            <p className="text-lg leading-relaxed px-4">
              From a forgotten outpost barely clinging to gravity, Max deployed the first shared record—an immutable
              contract that let pirates stake exclusive claims on asteroids, earn daily fuel credits, and register their
              word with something stronger than talk. To dock in the garage, you needed a credential: proof that you
              bought in, agreed not to fire first, and played by the rules. Every deal made or broken left a trace in
              the record. Build a good rep, and you could refuel in peace. Break too many promises, and the record made
              you open season. Over time, the chaos thinned. Crews stopped clashing over the same rocks. Refueling
              stations stayed intact. Loot got bigger, not bloodier.
            </p>
          </div>

          {/* Connection Status */}
          <div className="bg-base-200 rounded-lg p-6 mb-6">
            <div className="flex justify-center items-center space-x-2 flex-col mb-4">
              <p className="font-medium">Connected Address:</p>
              <Address address={connectedAddress} />
            </div>

            <div className="text-center">
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
          </div>

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
