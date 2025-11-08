"use client";

import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { useAccount } from "wagmi";
import { CheckCircleIcon, ClockIcon, XCircleIcon } from "@heroicons/react/24/outline";
import { Address, AddressInput } from "~~/components/scaffold-eth";
import { useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { notification } from "~~/utils/scaffold-eth";

type AuditStatus = 0 | 1 | 2; // Pending, Audited, Failed

const AuditsPage = () => {
  const { address: connectedAddress } = useAccount();
  const [contractAddress, setContractAddress] = useState("");
  const [selectedChapter, setSelectedChapter] = useState<number>(0);

  // Get visible chapters from Game contract
  const { data: visibleChapters } = useScaffoldReadContract({
    contractName: "Game",
    functionName: "getVisibleChapters",
  });

  // Get player's score from Game contract
  const { data: playerScore, refetch: refetchScore } = useScaffoldReadContract({
    contractName: "Game",
    functionName: "getPlayerScore",
    args: [connectedAddress],
  });

  // Get all audits for connected address
  const { data: auditsData, refetch: refetchAudits } = useScaffoldReadContract({
    contractName: "Auditor",
    functionName: "getAllAuditsForAddress",
    args: [connectedAddress],
  });

  // Write contract hook for requesting audits
  const { writeContractAsync: writeAuditorAsync } = useScaffoldWriteContract({
    contractName: "Auditor",
  });

  // Sort audits by timestamp (newest first)
  const sortedAudits = auditsData
    ? [...auditsData].sort((a, b) => {
        const timestampA = Number(a.timestamp);
        const timestampB = Number(b.timestamp);
        return timestampB - timestampA;
      })
    : [];

  const handleRequestAudit = async () => {
    if (!contractAddress) {
      notification.error("Please enter a contract address");
      return;
    }

    if (selectedChapter === 0) {
      notification.error("Please select a chapter");
      return;
    }

    try {
      await writeAuditorAsync({
        functionName: "requestAudit",
        args: [contractAddress as `0x${string}`, selectedChapter as number, ""],
      });

      notification.success("Audit request submitted!");

      // Reset form
      setContractAddress("");
      setSelectedChapter(0);

      // Refetch audits and score
      setTimeout(() => {
        refetchAudits();
        refetchScore();
      }, 2000);
    } catch (error) {
      console.error("Error requesting audit:", error);
    }
  };

  const getStatusBadge = (status: AuditStatus) => {
    switch (status) {
      case 0: // Pending
        return (
          <span className="badge badge-warning gap-2">
            <ClockIcon className="h-4 w-4" />
            Pending
          </span>
        );
      case 1: // Audited
        return (
          <span className="badge badge-success gap-2">
            <CheckCircleIcon className="h-4 w-4" />
            Audited
          </span>
        );
      case 2: // Failed
        return (
          <span className="badge badge-error gap-2">
            <XCircleIcon className="h-4 w-4" />
            Failed
          </span>
        );
      default:
        return null;
    }
  };

  if (!connectedAddress) {
    return (
      <div className="flex items-center flex-col flex-grow pt-10">
        <div className="px-5">
          <h1 className="text-center mb-4">
            <span className="block text-4xl font-bold">Audits</span>
          </h1>
          <p className="text-center text-lg">Please connect your wallet to view and request audits.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center flex-col flex-grow pt-10 px-5">
      <div className="w-full max-w-4xl">
        <h1 className="text-center mb-8">
          <span className="block text-4xl font-bold">Contract Audits</span>
          <span className="block text-sm text-gray-500 mt-2">Request and track your contract audits</span>
        </h1>

        {/* Request Audit Form */}
        <div className="card bg-base-100 shadow-xl mb-8">
          <div className="card-body">
            <div className="flex justify-between items-center mb-4">
              <h2 className="card-title">Request New Audit</h2>
              <div className="badge badge-lg badge-primary">
                {playerScore !== undefined ? `current balance: ${playerScore.toString()} points` : "Loading..."}
              </div>
            </div>

            <div className="form-control w-full mb-4">
              <label className="label">
                <span className="label-text">Contract Address</span>
              </label>
              <AddressInput value={contractAddress} onChange={setContractAddress} placeholder="0x..." />
            </div>

            <div className="form-control w-full mb-4">
              <label className="label">
                <span className="label-text">Chapter</span>
              </label>
              <select
                className="select select-bordered w-full"
                value={selectedChapter}
                onChange={e => setSelectedChapter(Number(e.target.value))}
              >
                <option value={0}>Select a chapter...</option>
                {visibleChapters?.map(chapter => (
                  <option key={chapter} value={chapter}>
                    Chapter {chapter}
                  </option>
                ))}
              </select>
            </div>

            <div className="card-actions justify-end">
              <button
                className="btn btn-primary"
                onClick={handleRequestAudit}
                disabled={!contractAddress || selectedChapter === 0}
              >
                Request Audit (2 points)
              </button>
            </div>
          </div>
        </div>

        {/* Audits List */}
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title mb-4">Your Audits</h2>

            {sortedAudits.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No audits requested yet.</p>
            ) : (
              <div className="space-y-4">
                {sortedAudits.map((audit, index) => (
                  <div
                    key={index}
                    className="border border-base-300 rounded-lg p-4 hover:bg-base-200 transition-colors"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-semibold">Contract:</span>
                          <Address address={audit.contractAddress} />
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                          <span>Chapter: {audit.chapterNumber}</span>
                          <span className="text-gray-500">
                            {formatDistanceToNow(new Date(Number(audit.timestamp) * 1000), {
                              addSuffix: true,
                            })}
                          </span>
                        </div>
                      </div>
                      <div>{getStatusBadge(Number(audit.status) as AuditStatus)}</div>
                    </div>

                    {Number(audit.status) === 2 && audit.failureReason && (
                      <div className="mt-3 p-3 bg-error/10 rounded-lg">
                        <p className="text-sm font-semibold text-error mb-1">Failure Reason:</p>
                        <p className="text-sm">{audit.failureReason}</p>
                      </div>
                    )}

                    {audit.blockExplorerUrl && (
                      <div className="mt-3">
                        <a
                          href={audit.blockExplorerUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm link link-primary"
                        >
                          View on Block Explorer →
                        </a>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuditsPage;
