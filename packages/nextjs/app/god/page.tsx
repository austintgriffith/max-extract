"use client";

import { useState } from "react";
import { keccak256, toBytes } from "viem";
import { useAccount } from "wagmi";
import { Address } from "~~/components/scaffold-eth";
import { useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { notification } from "~~/utils/scaffold-eth";

export default function GodPage() {
  const { address } = useAccount();
  const [randomNumber, setRandomNumber] = useState<string>("");
  const [commitmentHash, setCommitmentHash] = useState<string>("");

  // Read the god address from the Universe contract
  const { data: godAddress } = useScaffoldReadContract({
    contractName: "Universe",
    functionName: "GOD",
  });

  // Check if current user is god
  const isGod = address && godAddress && address.toLowerCase() === godAddress.toLowerCase();

  // Read contract state
  const { data: commitRevealState } = useScaffoldReadContract({
    contractName: "Universe",
    functionName: "getCommitRevealState",
  });

  const { data: entropy } = useScaffoldReadContract({
    contractName: "Universe",
    functionName: "getEntropy",
  });

  // Write functions
  const { writeContractAsync: writeUniverseAsync } = useScaffoldWriteContract({
    contractName: "Universe",
  });

  // Generate initial entropy (large random number)
  const generateInitialEntropy = () => {
    // Generate a large random number (256-bit)
    const randomBytes = new Uint8Array(32);
    crypto.getRandomValues(randomBytes);

    // Convert to hex string
    const randomHex = Array.from(randomBytes)
      .map(b => b.toString(16).padStart(2, "0"))
      .join("");

    // Convert to decimal string for display
    const randomBigInt = BigInt("0x" + randomHex);
    const randomDecimal = randomBigInt.toString();

    setRandomNumber(randomDecimal);

    // Generate commitment hash: keccak256(randomNumber)
    const hash = keccak256(toBytes(randomBigInt));
    setCommitmentHash(hash);

    notification.success("Initial entropy generated! You can now commit the hash on-chain.");
  };

  const handleCommit = async () => {
    if (!commitmentHash) {
      notification.error("Please generate initial entropy first");
      return;
    }

    try {
      await writeUniverseAsync({
        functionName: "commit",
        args: [commitmentHash as `0x${string}`],
      });
      notification.success("Commitment submitted successfully!");
    } catch {
      notification.error("Error submitting commitment");
    }
  };

  const handleReveal = async () => {
    if (!randomNumber) {
      notification.error("No random number to reveal");
      return;
    }

    try {
      await writeUniverseAsync({
        functionName: "reveal",
        args: [BigInt(randomNumber)],
      });
      notification.success("Entropy revealed successfully!");
    } catch {
      notification.error("Error revealing entropy");
    }
  };

  if (!isGod) {
    return (
      <div className="flex items-center flex-col flex-grow pt-8">
        <div className="px-5">
          <h1 className="text-center mb-8">
            <span className="block text-4xl font-bold">🌌 Universe God Panel</span>
          </h1>
          <div className="bg-base-300 rounded-3xl p-8 text-center">
            <p className="text-lg mb-4">Access Denied</p>
            <p className="mb-4">Only the God address can access this panel.</p>
            <div className="mb-4">
              <span className="font-bold">God Address: </span>
              {godAddress ? <Address address={godAddress} /> : "Loading..."}
            </div>
            <div>
              <span className="font-bold">Your Address: </span>
              {address ? <Address address={address} /> : "Not connected"}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const [commitmentMade, commitBlock, entropySet] = commitRevealState || [false, 0n, false];

  return (
    <div className="flex items-center flex-col flex-grow pt-8">
      <div className="px-5 w-full max-w-4xl">
        <h1 className="text-center mb-8">
          <span className="block text-4xl font-bold">🌌 Universe God Panel</span>
          <span className="block text-sm font-normal">Commit-Reveal Entropy System</span>
        </h1>

        {/* Status Panel */}
        <div className="bg-base-300 rounded-3xl p-6 mb-6">
          <h2 className="text-2xl font-bold mb-4">System Status</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="stat">
              <div className="stat-title">Commitment</div>
              <div className={`stat-value text-lg ${commitmentMade ? "text-success" : "text-warning"}`}>
                {commitmentMade ? "Made" : "Pending"}
              </div>
              {commitmentMade && <div className="stat-desc">Block: {commitBlock?.toString()}</div>}
            </div>
            <div className="stat">
              <div className="stat-title">Entropy</div>
              <div className={`stat-value text-lg ${entropySet ? "text-success" : "text-warning"}`}>
                {entropySet ? "Set" : "Pending"}
              </div>
            </div>
            <div className="stat">
              <div className="stat-title">Current Block</div>
              <div className="stat-value text-lg text-info">
                {/* Block number would be shown here */}
                Live
              </div>
            </div>
          </div>
        </div>

        {/* Entropy Display */}
        {entropySet && entropy && (
          <div className="bg-success/10 border border-success rounded-3xl p-6 mb-6">
            <h2 className="text-2xl font-bold mb-4 text-success">🎲 Universe Entropy Set!</h2>
            <div className="font-mono text-sm break-all bg-base-100 p-4 rounded-lg">{entropy}</div>
            <p className="text-sm mt-2 opacity-70">
              The universe entropy is now immutable and will be used for all random generation.
            </p>
          </div>
        )}

        {/* Commit-Reveal Interface */}
        {!entropySet && (
          <div className="bg-base-300 rounded-3xl p-6">
            <h2 className="text-2xl font-bold mb-6">Commit-Reveal Process</h2>

            {/* Step 1: Generate Initial Entropy */}
            {!commitmentMade && (
              <div className="mb-8">
                <h3 className="text-xl font-semibold mb-4">Step 1: Generate Initial Entropy</h3>
                <p className="text-sm mb-4 opacity-70">
                  Click the button below to generate a cryptographically secure random number that will be used as the
                  seed for universe entropy.
                </p>

                <button className="btn btn-primary btn-lg mb-4" onClick={generateInitialEntropy}>
                  🎲 Generate Initial Entropy
                </button>

                {randomNumber && (
                  <div className="space-y-4">
                    <div>
                      <label className="label">
                        <span className="label-text">Generated Random Number</span>
                      </label>
                      <div className="font-mono text-xs bg-base-100 p-3 rounded-lg break-all border">
                        {randomNumber}
                      </div>
                      <p className="text-xs mt-1 opacity-60">⚠️ Keep this secret until the reveal step!</p>
                    </div>

                    <div>
                      <label className="label">
                        <span className="label-text">Commitment Hash (keccak256 of random number)</span>
                      </label>
                      <div className="font-mono text-sm bg-base-100 p-3 rounded-lg break-all border">
                        {commitmentHash}
                      </div>
                    </div>

                    <button className="btn btn-success" onClick={handleCommit}>
                      📡 Commit Hash On-Chain
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Step 2: Reveal */}
            {commitmentMade && !entropySet && (
              <div className="mb-8">
                <h3 className="text-xl font-semibold mb-4">Step 2: Reveal & Generate Final Entropy</h3>
                <div className="alert alert-info mb-4">
                  <span>
                    Commitment made in block {commitBlock?.toString()}. You can now reveal in any subsequent block to
                    generate the final universe entropy.
                  </span>
                </div>

                {randomNumber && (
                  <div className="space-y-4">
                    <div>
                      <label className="label">
                        <span className="label-text">Your Random Number (ready to reveal)</span>
                      </label>
                      <div className="font-mono text-xs bg-base-100 p-3 rounded-lg break-all border">
                        {randomNumber}
                      </div>
                    </div>

                    <div className="bg-info/10 border border-info rounded-lg p-4">
                      <p className="text-sm">
                        <strong>Final entropy will be:</strong>
                        <br />
                        keccak256(randomNumber + commitBlockHash)
                      </p>
                      <p className="text-xs mt-2 opacity-70">
                        This combines your secret with the unpredictable commit block hash for maximum security.
                      </p>
                    </div>

                    <button className="btn btn-success btn-lg" onClick={handleReveal}>
                      🌌 Reveal & Set Universe Entropy
                    </button>
                  </div>
                )}

                {!randomNumber && (
                  <div className="alert alert-warning">
                    <span>Random number not found. Please refresh and start over with Step 1.</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Instructions */}
        <div className="bg-base-200 rounded-3xl p-6 mt-6">
          <h3 className="text-xl font-bold mb-4">How it Works</h3>
          <div className="space-y-2 text-sm">
            <p>
              <strong>1. Generate:</strong> Create a large cryptographically secure random number
            </p>
            <p>
              <strong>2. Commit:</strong> Hash the random number and commit the hash on-chain
            </p>
            <p>
              <strong>3. Wait:</strong> The commitment is recorded with the current block number
            </p>
            <p>
              <strong>4. Reveal:</strong> In a subsequent block, reveal the random number
            </p>
            <p>
              <strong>5. Entropy:</strong> Final entropy = keccak256(randomNumber + commitBlockHash)
            </p>
            <p className="text-warning">
              <strong>⚠️ Important:</strong> Keep your random number secret until the reveal step!
            </p>
            <p className="text-info">
              <strong>🔒 Security:</strong> The commit block hash adds unpredictable entropy that even God cannot
              control!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
