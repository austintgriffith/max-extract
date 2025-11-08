"use client";

import { useEffect, useState } from "react";
import { formatEther, keccak256, toBytes } from "viem";
import { useAccount } from "wagmi";
import { Address, AddressInput } from "~~/components/scaffold-eth";
import deployedContracts from "~~/contracts/deployedContracts";
import { useScaffoldReadContract, useScaffoldWriteContract, useTargetNetwork } from "~~/hooks/scaffold-eth";
import { notification } from "~~/utils/scaffold-eth";

interface PayoutRecipient {
  address: string;
  percentage: string;
}

export default function GodPage() {
  const { address } = useAccount();
  const { targetNetwork } = useTargetNetwork();
  const [randomNumber, setRandomNumber] = useState<string>("");
  const [commitmentHash, setCommitmentHash] = useState<string>("");

  // Payout state
  const [recipients, setRecipients] = useState<PayoutRecipient[]>([{ address: "", percentage: "" }]);

  // MaxExtract address state
  const [maxExtractAddress, setMaxExtractAddress] = useState<string>("");

  // Read the god address from the Universe contract
  const { data: godAddress } = useScaffoldReadContract({
    contractName: "Universe",
    functionName: "GOD",
  });

  // Pre-populate MaxExtract address from deployed contracts
  useEffect(() => {
    const networkId = targetNetwork.id;
    const networkContracts = deployedContracts[networkId as keyof typeof deployedContracts];

    if (networkContracts && networkContracts.MaxExtract) {
      setMaxExtractAddress(networkContracts.MaxExtract.address);
    }
  }, [targetNetwork]);

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

  // Read Game contract balance
  const { data: gameBalance } = useScaffoldReadContract({
    contractName: "Game",
    functionName: "getBalance",
  });

  // Read Game state
  const { data: gameState } = useScaffoldReadContract({
    contractName: "Game",
    functionName: "state",
  });

  // Read visible chapters
  const { data: visibleChapters } = useScaffoldReadContract({
    contractName: "Game",
    functionName: "getVisibleChapters",
  });

  // Read current MaxExtract address
  const { data: currentMaxExtractAddress } = useScaffoldReadContract({
    contractName: "Game",
    functionName: "maxExtract",
  });

  // Write functions
  const { writeContractAsync: writeUniverseAsync } = useScaffoldWriteContract({
    contractName: "Universe",
  });

  const { writeContractAsync: writeGameAsync } = useScaffoldWriteContract({
    contractName: "Game",
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

  // Payout helper functions
  const addRecipient = () => {
    setRecipients([...recipients, { address: "", percentage: "" }]);
  };

  const removeRecipient = (index: number) => {
    if (recipients.length > 1) {
      setRecipients(recipients.filter((_, i) => i !== index));
    }
  };

  const updateRecipient = (index: number, field: keyof PayoutRecipient, value: string) => {
    const updated = [...recipients];
    updated[index][field] = value;
    setRecipients(updated);
  };

  const getTotalPercentage = () => {
    return recipients.reduce((total, recipient) => {
      const percentage = parseFloat(recipient.percentage) || 0;
      return total + percentage;
    }, 0);
  };

  const isPayoutValid = () => {
    const totalPercentage = getTotalPercentage();
    const hasValidRecipients = recipients.every(r => r.address && r.percentage);
    return totalPercentage === 1000 && hasValidRecipients && gameBalance && gameBalance > 0n;
  };

  const handlePayout = async () => {
    if (!isPayoutValid()) return;

    try {
      const addresses = recipients.map(r => r.address);
      const percentages = recipients.map(r => BigInt(Math.round(parseFloat(r.percentage))));

      await writeGameAsync({
        functionName: "payoutPot",
        args: [addresses, percentages],
      });

      notification.success("Payout executed successfully!");
      // Reset form
      setRecipients([{ address: "", percentage: "" }]);
    } catch (error) {
      console.error("Payout error:", error);
      notification.error("Error executing payout");
    }
  };

  // Game state handlers
  const handleOpenBuyIns = async () => {
    try {
      await writeGameAsync({
        functionName: "setState",
        args: [0], // 0 = Open
      });
      notification.success("Buy-ins opened!");
    } catch (error) {
      console.error("Error opening buy-ins:", error);
      notification.error("Error opening buy-ins");
    }
  };

  const handleCloseBuyIns = async () => {
    try {
      await writeGameAsync({
        functionName: "setState",
        args: [1], // 1 = Active
      });
      notification.success("Buy-ins closed!");
    } catch (error) {
      console.error("Error closing buy-ins:", error);
      notification.error("Error closing buy-ins");
    }
  };

  // Chapter management handlers
  const handleMakeChapter1Visible = async () => {
    try {
      await writeGameAsync({
        functionName: "showChapters",
        args: [[1]], // Array containing chapter 1
      });
      notification.success("Chapter 1 is now visible!");
    } catch (error) {
      console.error("Error making chapter 1 visible:", error);
      notification.error("Error making chapter 1 visible");
    }
  };

  const handleUnlockChapter2 = async () => {
    try {
      await writeGameAsync({
        functionName: "showChapters",
        args: [[1, 2]], // Array containing chapters 1 and 2
      });
      notification.success("Chapter 2 unlocked! Both chapters 1 and 2 are now visible!");
    } catch (error) {
      console.error("Error unlocking chapter 2:", error);
      notification.error("Error unlocking chapter 2");
    }
  };

  const handleUnlockChapter3 = async () => {
    try {
      await writeGameAsync({
        functionName: "showChapters",
        args: [[1, 2, 3]], // Array containing chapters 1, 2, and 3
      });
      notification.success("Chapter 3 unlocked! All three chapters are now visible!");
    } catch (error) {
      console.error("Error unlocking chapter 3:", error);
      notification.error("Error unlocking chapter 3");
    }
  };

  const handleUnlockChapter4 = async () => {
    try {
      await writeGameAsync({
        functionName: "showChapters",
        args: [[1, 2, 3, 4]], // Array containing chapters 1, 2, 3, and 4
      });
      notification.success("Chapter 4 unlocked! All four chapters are now visible!");
    } catch (error) {
      console.error("Error unlocking chapter 4:", error);
      notification.error("Error unlocking chapter 4");
    }
  };

  const handleUnlockChapter5 = async () => {
    try {
      await writeGameAsync({
        functionName: "showChapters",
        args: [[1, 2, 3, 4, 5]], // Array containing chapters 1, 2, 3, 4, and 5
      });
      notification.success("Chapter 5 unlocked! All five chapters are now visible!");
    } catch (error) {
      console.error("Error unlocking chapter 5:", error);
      notification.error("Error unlocking chapter 5");
    }
  };

  // MaxExtract address update handler
  const handleUpdateMaxExtract = async () => {
    if (!maxExtractAddress) {
      notification.error("Please enter a valid MaxExtract address");
      return;
    }

    try {
      await writeGameAsync({
        functionName: "setMaxExtract",
        args: [maxExtractAddress as `0x${string}`],
      });
      notification.success("MaxExtract address updated successfully!");
      setMaxExtractAddress(""); // Clear the input after successful update
    } catch (error) {
      console.error("Error updating MaxExtract address:", error);
      notification.error("Error updating MaxExtract address");
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

        {/* Game State Control */}
        <div className="bg-base-300 rounded-3xl p-6 mb-6">
          <h2 className="text-2xl font-bold mb-4">🎮 Game State Control</h2>

          {/* Current Game State Display */}
          <div className="bg-base-200 rounded-lg p-4 mb-4">
            <div className="flex justify-between items-center">
              <span className="text-lg font-semibold">Current Game State:</span>
              <span className={`text-2xl font-bold ${gameState === 0 ? "text-success" : "text-warning"}`}>
                {gameState === 0 ? "🟢 Open (Buy-ins Allowed)" : "🔴 Active (Buy-ins Closed)"}
              </span>
            </div>
          </div>

          {/* State Control Buttons */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              className={`btn btn-lg ${gameState === 0 ? "btn-disabled" : "btn-success"}`}
              onClick={handleOpenBuyIns}
              disabled={gameState === 0}
            >
              🟢 Open Buy-Ins (State 0)
            </button>
            <button
              className={`btn btn-lg ${gameState === 1 ? "btn-disabled" : "btn-warning"}`}
              onClick={handleCloseBuyIns}
              disabled={gameState === 1}
            >
              🔴 Close Buy-Ins (State 1)
            </button>
          </div>

          {/* Info */}
          <div className="mt-4 text-sm opacity-70">
            <p>
              <strong>Open (State 0):</strong> Players can buy into the game
            </p>
            <p>
              <strong>Active (State 1):</strong> Game is active, no more buy-ins allowed
            </p>
          </div>
        </div>

        {/* Chapter Management */}
        <div className="bg-base-300 rounded-3xl p-6 mb-6">
          <h2 className="text-2xl font-bold mb-4">📖 Chapter Management</h2>

          {/* Current Visible Chapters Display */}
          <div className="bg-base-200 rounded-lg p-4 mb-4">
            <div className="flex justify-between items-center">
              <span className="text-lg font-semibold">Currently Visible Chapters:</span>
              <span className="text-xl font-bold text-info">
                {visibleChapters && visibleChapters.length > 0 ? `[${visibleChapters.join(", ")}]` : "None"}
              </span>
            </div>
          </div>

          {/* Chapter Control Buttons */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <button
              className={`btn btn-lg ${visibleChapters && visibleChapters.includes(1) ? "btn-disabled" : "btn-primary"}`}
              onClick={handleMakeChapter1Visible}
              disabled={visibleChapters && visibleChapters.includes(1)}
            >
              📖 Make Chapter 1 Visible
            </button>
            <button
              className={`btn btn-lg ${visibleChapters && visibleChapters.includes(2) ? "btn-disabled" : "btn-secondary"}`}
              onClick={handleUnlockChapter2}
              disabled={visibleChapters && visibleChapters.includes(2)}
            >
              🚀 Unlock Chapter 2: The Announcement
            </button>
            <button
              className={`btn btn-lg ${visibleChapters && visibleChapters.includes(3) ? "btn-disabled" : "btn-accent"}`}
              onClick={handleUnlockChapter3}
              disabled={visibleChapters && visibleChapters.includes(3)}
            >
              🎫 Unlock Chapter 3: Access Credentials
            </button>
            <button
              className={`btn btn-lg ${visibleChapters && visibleChapters.includes(4) ? "btn-disabled" : "btn-info"}`}
              onClick={handleUnlockChapter4}
              disabled={visibleChapters && visibleChapters.includes(4)}
            >
              ⚔️ Unlock Chapter 4: Staking/Slashing
            </button>
            <button
              className={`btn btn-lg ${visibleChapters && visibleChapters.includes(5) ? "btn-disabled" : "btn-success"}`}
              onClick={handleUnlockChapter5}
              disabled={visibleChapters && visibleChapters.includes(5)}
            >
              💰 Unlock Chapter 5: The Crowdsale
            </button>
          </div>

          {/* Info */}
          <div className="mt-4 text-sm opacity-70">
            <p>
              <strong>Chapter 1:</strong> Required for players to broadcast sectors via MaxExtract protocol
            </p>
            <p>
              <strong>Chapter 2:</strong> Players deploy About contracts with name/social info to increase tip potential
            </p>
            <p>
              <strong>Chapter 3:</strong> Players deploy soulbound NFT credentials for sector access control (2 points
              per pilot mint)
            </p>
            <p>
              <strong>Chapter 4:</strong> Coming soon - new gameplay mechanics
            </p>
            <p>
              <strong>Chapter 5:</strong> Players run crowdsales to raise 50k credits and upgrade stations (10 points)
            </p>
            <p>
              <strong>Note:</strong> Only visible chapters can be accessed by players in the game
            </p>
          </div>
        </div>

        {/* MaxExtract Address Configuration */}
        <div className="bg-base-300 rounded-3xl p-6 mb-6">
          <h2 className="text-2xl font-bold mb-4">🔗 MaxExtract Contract Configuration</h2>

          {/* Current MaxExtract Address Display */}
          <div className="bg-base-200 rounded-lg p-4 mb-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-lg font-semibold">MaxExtract Address in Game Contract:</span>
              <span className="text-sm font-mono">
                {currentMaxExtractAddress &&
                currentMaxExtractAddress !== "0x0000000000000000000000000000000000000000" ? (
                  <Address address={currentMaxExtractAddress} />
                ) : (
                  <span className="text-warning">⚠️ Not Set</span>
                )}
              </span>
            </div>
            <p className="text-sm opacity-70">
              The Game contract needs to know the address of the MaxExtract contract to verify player credentials and
              sector ownership.
            </p>
          </div>

          {/* MaxExtract Address Input */}
          <div className="space-y-4">
            <div>
              <label className="label">
                <span className="label-text font-semibold">Deployed MaxExtract Address</span>
                <span className="label-text-alt text-success">✓ Auto-detected from deployed contracts</span>
              </label>
              <AddressInput
                value={maxExtractAddress}
                onChange={value => setMaxExtractAddress(value)}
                placeholder="0x... MaxExtract contract address"
              />
              <div className="label">
                <span className="label-text-alt opacity-70">
                  This address is pre-filled from your deployed contracts. Just click the button below to set it in the
                  Game contract.
                </span>
              </div>
            </div>

            <button
              className={`btn btn-lg w-full ${maxExtractAddress ? "btn-primary" : "btn-disabled"}`}
              onClick={handleUpdateMaxExtract}
              disabled={!maxExtractAddress}
            >
              🔗 Set MaxExtract Address in Game Contract
            </button>
          </div>

          {/* Info */}
          <div className="mt-4 text-sm opacity-70">
            <p>
              <strong>💡 Note:</strong> This enables credential minting and sector-based features. Each pilot that mints
              a sector credential awards 2 points to the player.
            </p>
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

        {/* Payout Section */}
        <div className="bg-base-300 rounded-3xl p-6 mt-6">
          <h2 className="text-2xl font-bold mb-6">💰 Game Pot Payout</h2>

          {/* Current Balance */}
          <div className="bg-primary/10 border border-primary rounded-lg p-4 mb-6">
            <div className="flex justify-between items-center">
              <span className="text-lg font-semibold">Current Game Pot:</span>
              <span className="text-2xl font-bold text-primary">
                {gameBalance ? `${formatEther(gameBalance)} ETH` : "0 ETH"}
              </span>
            </div>
          </div>

          {gameBalance && gameBalance > 0n ? (
            <div className="space-y-6">
              {/* Recipients List */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Recipients & Percentages</h3>

                {recipients.map((recipient, index) => (
                  <div key={index} className="flex gap-3 items-end">
                    <div className="flex-1">
                      <label className="label">
                        <span className="label-text">Address {index + 1}</span>
                      </label>
                      <AddressInput
                        value={recipient.address}
                        onChange={value => updateRecipient(index, "address", value)}
                        placeholder="0x..."
                      />
                    </div>

                    <div className="w-32">
                      <label className="label">
                        <span className="label-text">Percentage</span>
                      </label>
                      <input
                        type="number"
                        className="input input-bordered w-full"
                        placeholder="0"
                        value={recipient.percentage}
                        onChange={e => updateRecipient(index, "percentage", e.target.value)}
                        min="0"
                        max="1000"
                        step="0.1"
                      />
                    </div>

                    <button
                      className="btn btn-error btn-sm mb-1"
                      onClick={() => removeRecipient(index)}
                      disabled={recipients.length === 1}
                    >
                      ✕
                    </button>
                  </div>
                ))}

                <button className="btn btn-secondary btn-sm" onClick={addRecipient}>
                  + Add Recipient
                </button>
              </div>

              {/* Percentage Calculator */}
              <div className="bg-base-200 rounded-lg p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-semibold">Total Percentage:</span>
                  <span
                    className={`text-lg font-bold ${
                      getTotalPercentage() === 1000
                        ? "text-success"
                        : getTotalPercentage() > 1000
                          ? "text-error"
                          : "text-warning"
                    }`}
                  >
                    {getTotalPercentage().toFixed(1)} / 1000
                  </span>
                </div>
                <div className="text-sm opacity-70">Must equal exactly 1000 (100.0%) to execute payout</div>

                {/* Percentage breakdown */}
                {recipients.length > 0 && (
                  <div className="mt-3 space-y-1">
                    {recipients.map((recipient, index) => {
                      const percentage = parseFloat(recipient.percentage) || 0;
                      const ethAmount = gameBalance ? (BigInt(Math.round(percentage)) * gameBalance) / 1000n : 0n;

                      return (
                        <div key={index} className="flex justify-between text-sm">
                          <span>
                            {recipient.address
                              ? `${recipient.address.slice(0, 6)}...${recipient.address.slice(-4)}`
                              : `Recipient ${index + 1}`}
                            :
                          </span>
                          <span>
                            {percentage.toFixed(1)}% = {formatEther(ethAmount)} ETH
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Payout Button */}
              <button
                className={`btn btn-lg w-full ${isPayoutValid() ? "btn-success" : "btn-disabled"}`}
                onClick={handlePayout}
                disabled={!isPayoutValid()}
              >
                {isPayoutValid()
                  ? "💸 Execute Payout"
                  : `Cannot Execute: ${
                      getTotalPercentage() !== 1000
                        ? "Percentages must equal 1000"
                        : !recipients.every(r => r.address && r.percentage)
                          ? "Fill all fields"
                          : "No balance to payout"
                    }`}
              </button>
            </div>
          ) : (
            <div className="text-center py-8 opacity-70">
              <p className="text-lg">No funds available for payout</p>
              <p className="text-sm">The game pot is currently empty</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
