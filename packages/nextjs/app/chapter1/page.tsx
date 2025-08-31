"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { Address, Balance } from "~~/components/scaffold-eth";
import { useScaffoldEventHistory, useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { useDeployedContractInfo } from "~~/hooks/scaffold-eth";
import { notification } from "~~/utils/scaffold-eth";

// The Registry contract owner address
const REGISTRY_OWNER = "0x05937Df8ca0636505d92Fd769d303A3D461587ed";

export default function Chapter1Page() {
  const { address } = useAccount();
  const [creditAmount, setCreditAmount] = useState<string>("");

  // Get the deployed Chapter1Registry contract info
  const { data: chapter1RegistryInfo } = useDeployedContractInfo("Chapter1Registry");

  // Check if current user is the registry owner
  const isOwner = address?.toLowerCase() === REGISTRY_OWNER.toLowerCase();

  // Read Chapter1Registry contract state
  const { data: registryInfo } = useScaffoldReadContract({
    contractName: "Chapter1Registry",
    functionName: "getRegistryInfo",
  });

  const { data: owner } = useScaffoldReadContract({
    contractName: "Chapter1Registry",
    functionName: "owner",
  });

  const { data: maxExtractAddress } = useScaffoldReadContract({
    contractName: "Chapter1Registry",
    functionName: "maxExtract",
  });

  const { data: creditsAddress } = useScaffoldReadContract({
    contractName: "Chapter1Registry",
    functionName: "credits",
  });

  // Read all active sectors from MaxExtract
  const { data: activeSectors } = useScaffoldReadContract({
    contractName: "MaxExtract",
    functionName: "getActiveSectors",
  });

  // Read sector broadcast events to get broadcaster (tx.origin) information
  const { data: sectorBroadcastEvents } = useScaffoldEventHistory({
    contractName: "MaxExtract",
    eventName: "SectorBroadcast",
    fromBlock: 0n,
    watch: true,
  });

  // Read some modules from our registry
  const { data: stakeModule } = useScaffoldReadContract({
    contractName: "Chapter1Registry",
    functionName: "getModule",
    args: ["stake"],
  });

  const { data: reputationModule } = useScaffoldReadContract({
    contractName: "Chapter1Registry",
    functionName: "getModule",
    args: ["reputation"],
  });

  // Write functions for our registry
  const { writeContractAsync: writeRegistryAsync } = useScaffoldWriteContract({
    contractName: "Chapter1Registry",
  });

  const { writeContractAsync: writeCreditsAsync } = useScaffoldWriteContract({
    contractName: "Credits",
  });

  // Extract data from registryInfo
  const sectorId = registryInfo?.[0] || 0n;
  const hasBroadcast = registryInfo?.[1] || false;
  const treasuryBalance = registryInfo?.[2] || 0n;

  const handleBroadcast = async () => {
    try {
      await writeRegistryAsync({
        functionName: "broadcastSector",
      });
      notification.success("Sector broadcast successful! Check the logs for your sector ID.");
    } catch (error) {
      console.error("Error broadcasting sector:", error);
      notification.error("Failed to broadcast sector");
    }
  };

  const handleDepositCredits = async () => {
    if (!creditAmount) {
      notification.error("Please enter a credit amount");
      return;
    }

    try {
      // First approve the Chapter1Registry to spend credits
      const registryAddress = chapter1RegistryInfo?.address;
      if (!registryAddress) {
        notification.error("Chapter1Registry address not found");
        return;
      }

      const amount = BigInt(parseFloat(creditAmount) * 10 ** 18); // Convert to wei

      await writeCreditsAsync({
        functionName: "approve",
        args: [registryAddress, amount],
      });

      // Then deposit the credits
      await writeRegistryAsync({
        functionName: "depositCredits",
        args: [amount, "Test deposit from Chapter 1 page"],
      });

      notification.success("Credits deposited successfully!");
      setCreditAmount("");
    } catch (error) {
      console.error("Error depositing credits:", error);
      notification.error("Failed to deposit credits");
    }
  };

  // Helper function to get broadcaster info from events
  const getBroadcasterForSector = (sectorId: bigint) => {
    if (!sectorBroadcastEvents) return null;

    const event = sectorBroadcastEvents.find(e => e.args.sectorId === sectorId);
    return event?.args.broadcaster || null;
  };

  return (
    <div className="flex items-center flex-col flex-grow pt-10">
      <div className="px-5 w-full max-w-6xl">
        <h1 className="text-center mb-8">
          <span className="block text-4xl font-bold">📡 Chapter 1: The Broadcast</span>
          <span className="block text-sm font-normal">Registry Contract & Max&apos;s Ledger</span>
        </h1>

        {/* All Sectors Panel */}
        <div className="bg-base-300 rounded-3xl p-6 mb-6">
          <h2 className="text-2xl font-bold mb-4">🌌 Max&apos;s Ledger - All Registered Sectors</h2>
          <div className="overflow-x-auto">
            <table className="table table-zebra w-full">
              <thead>
                <tr>
                  <th>Sector ID</th>
                  <th>Registry Contract</th>
                  <th>Broadcaster/Owner</th>
                  <th>Registry Owner</th>
                </tr>
              </thead>
              <tbody>
                {activeSectors && activeSectors.length > 0 ? (
                  activeSectors.map(sectorIdBigInt => {
                    const broadcaster = getBroadcasterForSector(sectorIdBigInt);
                    return (
                      <SectorRow key={sectorIdBigInt.toString()} sectorId={sectorIdBigInt} broadcaster={broadcaster} />
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={4} className="text-center text-gray-500">
                      No sectors registered yet. Be the first to broadcast!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="mt-4 p-4 bg-info/10 border border-info rounded-lg">
            <p className="text-sm">
              <strong>Max&apos;s Ledger:</strong> This is the canonical record of all sectors in the Extract Protocol.
              Each sector represents a guild&apos;s territory in the asteroid belt, registered through their Registry
              Contract.
            </p>
          </div>
        </div>

        {/* Your Registry Status Panel */}
        <div className="bg-base-300 rounded-3xl p-6 mb-6">
          <h2 className="text-2xl font-bold mb-4">🏴‍☠️ Your Registry Status</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="stat">
              <div className="stat-title">Broadcast Status</div>
              <div className="stat-value text-lg">
                {hasBroadcast ? (
                  <span className="text-success">✅ Broadcast</span>
                ) : (
                  <span className="text-warning">⏳ Not Broadcast</span>
                )}
              </div>
              <div className="stat-desc">
                {hasBroadcast ? `Sector ID: ${sectorId.toString()}` : "Ready to claim your sector"}
              </div>
            </div>
            <div className="stat">
              <div className="stat-title">Treasury Balance</div>
              <div className="stat-value text-lg">
                <Balance address={owner} className="text-lg" />
              </div>
              <div className="stat-desc">Credits in treasury</div>
            </div>
            <div className="stat">
              <div className="stat-title">Owner Status</div>
              <div className="stat-value text-lg">
                {isOwner ? (
                  <span className="text-success">👑 Owner</span>
                ) : (
                  <span className="text-neutral">👤 Visitor</span>
                )}
              </div>
              <div className="stat-desc">{isOwner ? "You control this registry" : "View-only access"}</div>
            </div>
          </div>
        </div>

        {/* Contract Information Panel */}
        <div className="bg-base-300 rounded-3xl p-6 mb-6">
          <h2 className="text-2xl font-bold mb-4">📋 Contract Information</h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="font-semibold">Registry Owner:</span>
              <Address address={owner} />
            </div>
            <div className="flex justify-between items-center">
              <span className="font-semibold">MaxExtract Protocol:</span>
              <Address address={maxExtractAddress} />
            </div>
            <div className="flex justify-between items-center">
              <span className="font-semibold">Credits Token:</span>
              <Address address={creditsAddress} />
            </div>
            <div className="flex justify-between items-center">
              <span className="font-semibold">Stake Module:</span>
              {stakeModule && stakeModule !== "0x0000000000000000000000000000000000000000" ? (
                <Address address={stakeModule} />
              ) : (
                <span className="text-gray-500">Not set</span>
              )}
            </div>
            <div className="flex justify-between items-center">
              <span className="font-semibold">Reputation Module:</span>
              {reputationModule && reputationModule !== "0x0000000000000000000000000000000000000000" ? (
                <Address address={reputationModule} />
              ) : (
                <span className="text-gray-500">Not set</span>
              )}
            </div>
          </div>
        </div>

        {/* Actions Panel - Only show if user is the owner */}
        {isOwner && (
          <div className="bg-base-300 rounded-3xl p-6 mb-6">
            <h2 className="text-2xl font-bold mb-4">⚡ Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Broadcast Sector */}
              <div className="card bg-base-100 shadow-xl">
                <div className="card-body">
                  <h3 className="card-title">📡 Broadcast Your Sector</h3>
                  {!hasBroadcast ? (
                    <div>
                      <p className="text-sm mb-4 opacity-70">
                        Click to broadcast your Registry to Max&apos;s ledger and claim your sector in the void.
                      </p>
                      <button className="btn btn-primary btn-lg" onClick={handleBroadcast}>
                        📡 Broadcast Sector to Max&apos;s Ledger
                      </button>
                    </div>
                  ) : (
                    <div>
                      <p className="text-success text-sm">
                        ✅ Your sector has been broadcast! Sector ID: {sectorId.toString()}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Deposit Credits */}
              <div className="card bg-base-100 shadow-xl">
                <div className="card-body">
                  <h3 className="card-title">💰 Deposit Credits to Treasury</h3>
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">Credit Amount</span>
                    </label>
                    <input
                      type="number"
                      placeholder="Enter amount (e.g., 100)"
                      className="input input-bordered"
                      value={creditAmount}
                      onChange={e => setCreditAmount(e.target.value)}
                    />
                    <button className="btn btn-secondary mt-4" onClick={handleDepositCredits}>
                      💰 Deposit Credits
                    </button>
                  </div>
                  <p className="text-xs mt-2 opacity-60">
                    Note: This will approve and transfer credits to the Registry treasury.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Progress Tracker */}
        <div className="bg-base-300 rounded-3xl p-6">
          <h2 className="text-2xl font-bold mb-4">🗺️ Chapter 1 Progress</h2>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className={`w-4 h-4 rounded-full ${hasBroadcast ? "bg-success" : "bg-warning"}`}></div>
              <span>Registry Contract Deployed & Broadcast</span>
              {hasBroadcast && <span className="text-success text-sm">✅ Complete</span>}
            </div>
            <div className="flex items-center gap-3">
              <div
                className={`w-4 h-4 rounded-full ${treasuryBalance > 0n ? "bg-success" : "bg-base-content/20"}`}
              ></div>
              <span>Treasury Funded</span>
              {treasuryBalance > 0n && <span className="text-success text-sm">✅ Complete</span>}
            </div>
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 rounded-full bg-base-content/20"></div>
              <span>Staking Module Deployed (Chapter 2)</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 rounded-full bg-base-content/20"></div>
              <span>Reputation System Active (Chapter 3)</span>
            </div>
          </div>

          <div className="mt-6 p-4 bg-info/10 border border-info rounded-lg">
            <p className="text-sm">
              <strong>What&apos;s Next:</strong> In Chapter 2, you&apos;ll deploy a staking contract where pirates
              deposit 10 credits to join your guild and receive soulbound ERC-721 credentials. The Registry will serve
              as the treasury collecting all staked credits.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Component to display individual sector rows
function SectorRow({ sectorId, broadcaster }: { sectorId: bigint; broadcaster: string | null }) {
  // Read the registry address for this sector
  const { data: registryAddress } = useScaffoldReadContract({
    contractName: "MaxExtract",
    functionName: "getSectorRegistry",
    args: [sectorId],
  });

  return (
    <tr>
      <td>
        <span className="font-mono text-sm">{sectorId.toString()}</span>
      </td>
      <td>
        {registryAddress ? <Address address={registryAddress} /> : <span className="text-gray-500">Loading...</span>}
      </td>
      <td>{broadcaster ? <Address address={broadcaster} /> : <span className="text-gray-500">Unknown</span>}</td>
      <td>
        <RegistryOwner />
      </td>
    </tr>
  );
}

// Component to safely read registry owner information
function RegistryOwner() {
  // Try to read owner from Chapter1Registry contract
  const { data: registryOwner } = useScaffoldReadContract({
    contractName: "Chapter1Registry",
    functionName: "owner",
  });

  if (!registryOwner) {
    // If it fails, this might not be a Chapter1Registry or might not implement Ownable
    return <span className="text-gray-500 text-xs">Unknown Registry Type</span>;
  }

  if (!registryOwner) {
    return <span className="text-gray-500">Loading...</span>;
  }

  return <Address address={registryOwner} />;
}
