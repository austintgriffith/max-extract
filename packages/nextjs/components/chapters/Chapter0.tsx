"use client";

import Link from "next/link";
import { formatEther } from "viem";
import { Address } from "~~/components/scaffold-eth";
import { useDeployedContractInfo, useScaffoldReadContract } from "~~/hooks/scaffold-eth";

export const Chapter0 = () => {
  const { data: maxExtractContract } = useDeployedContractInfo("MaxExtract");
  const { data: gameContract } = useDeployedContractInfo("Game");
  const { data: auditorContract } = useDeployedContractInfo("Auditor");

  const { data: buyInPrice } = useScaffoldReadContract({
    contractName: "Game",
    functionName: "BUY_IN_PRICE",
  });

  return (
    <div className="space-y-6">
      {/* TODO Section */}
      <div className="bg-warning/10 border border-warning rounded-lg p-4">
        <p className="text-warning font-semibold">TODO: Graphics and lore content coming soon</p>
      </div>

      {/* Main Content */}
      <div className="prose prose-lg max-w-none text-base-content">
        <h3 className="text-xl font-semibold mb-4 text-secondary">The Signal Relay System</h3>
        <p className="mb-4">
          A legendary figure known only as <strong>Max Extract</strong> deployed a series of smart contracts (
          <Link href="/contracts" className="text-accent hover:underline">
            view all contracts
          </Link>
          ) across the blockchain—a decentralized protocol designed to coordinate space exploration and resource
          extraction across thousands of sectors. You, the programmer, will deploy your own contracts that launch a{" "}
          <strong>space station relay</strong>, connecting your sector to the Max Extract protocol. Your station
          receives telemetry from pilots navigating your airspace and broadcasts critical signals back to the main
          network.
        </p>

        <div className="bg-base-100 rounded-lg p-4 mb-4 border">
          <h4 className="font-semibold mb-3 text-accent">Core Contracts:</h4>
          <div className="space-y-2 text-sm">
            {maxExtractContract && (
              <div className="flex items-center space-x-2">
                <span className="font-semibold">MaxExtract:</span>
                <Address address={maxExtractContract.address} />
              </div>
            )}
            {gameContract && (
              <div className="flex items-center space-x-2">
                <span className="font-semibold">Game:</span>
                <Address address={gameContract.address} />
              </div>
            )}
            {auditorContract && (
              <div className="flex items-center space-x-2">
                <span className="font-semibold">Auditor:</span>
                <Address address={auditorContract.address} />
              </div>
            )}
          </div>
        </div>

        <h3 className="text-xl font-semibold mb-4 text-secondary">How The Protocol Works</h3>
        <p className="mb-4">
          To join the network, programmers must first <strong>buy into the game</strong>—a commitment that grants you
          the right to broadcast your own satellite and claim a sector of space. Once you&apos;ve bought in, you deploy
          smart contracts that define the rules and services of your sector. Pilots discover your contracts, interact
          with them, and relay critical data back through the Max Extract system.
        </p>

        <p className="mb-4">
          The protocol generates <strong>rolling round entropy</strong> from universe-wide randomness—like all sectors
          getting a simultaneous dice roll—creating parallel random events across the network that determine when pilots
          get an &ldquo;opening&rdquo; to hyperjump into a system. Each sector has an{" "}
          <strong>airspace classification</strong> (Class 0 through 3) that dictates which <strong>ship models</strong>{" "}
          (A through F) can safely enter. Larger, more rugged ships (Models E and F) can handle dangerous Class 0
          airspace, while smaller vessels (Models A and B) require the safety of upgraded Class 3 sectors. As you
          progress through the chapters and build out your station infrastructure, your airspace classification
          improves, attracting more diverse pilot traffic.
        </p>

        <div className="bg-info/10 border-2 border-info rounded-lg p-6 mb-4">
          <div className="flex items-start space-x-3">
            <div className="text-info text-2xl">🛰️</div>
            <div>
              <h4 className="font-semibold text-info mb-3">Stations and Transponders</h4>
              <p className="text-sm text-base-content mb-3">
                Your sector begins as a <strong>Class 0 station</strong>—a bare-bones satellite relay. Through the
                chapters ahead, you&apos;ll upgrade to Class 1, 2, and eventually Class 3 by deploying credential
                systems, staking mechanisms, and refueling infrastructure.
              </p>
              <p className="text-sm text-base-content">
                All pilots must equip <strong>transponders</strong> to operate in your airspace. The{" "}
                <strong>killswitch transponder</strong> broadcasts death signals when a pilot is eliminated, while the{" "}
                <strong>killstake transponder</strong> enables automatic slashing of stakes when kills occur—protecting
                you from point penalties and maintaining order in your sector.
              </p>
            </div>
          </div>
        </div>

        <h3 className="text-xl font-semibold mb-4 text-secondary">The Auditing System</h3>
        <p className="mb-4">
          Not all contracts are trustworthy. The <strong>Pirate Council</strong> established an official{" "}
          <strong>Auditor contract</strong> that validates all sector contracts before pilots will interact with them.
          You&apos;ll submit your contracts for audit at each chapter, spending points to ensure your code meets the
          protocol&apos;s standards. Pilots only trust audited contracts—anything else is considered too risky.
        </p>

        <h3 className="text-xl font-semibold mb-4 text-secondary">Your Journey Begins</h3>
        <div className="bg-accent/10 border border-accent rounded-lg p-6">
          <p className="mb-3">
            The chapters ahead will guide you through deploying your registry, announcing your identity, establishing
            credentials, implementing staking and slashing, and running a crowdsale to upgrade your station. Each step
            builds on the last, transforming your bare satellite into a thriving sector hub.
          </p>
          <p className="mb-3">
            You&apos;ll earn points for successful operations and lose points when pilots die in your sector. Your goal:
            build the safest, most profitable sector in the network.
          </p>
          <p className="text-sm opacity-80">Ready to broadcast your signal? Chapter 1 awaits.</p>
        </div>

        <h3 className="text-xl font-semibold mb-4 mt-6 text-secondary">Game Economics</h3>
        <div className="bg-base-100 rounded-lg p-6 border">
          <h4 className="font-semibold mb-3 text-accent">Buy-In and Scoring</h4>
          <p className="mb-3">
            To enter the competition, programmers must <strong>buy into the game</strong> with a payment of{" "}
            {buyInPrice ? (
              <strong className="text-accent">{formatEther(buyInPrice)} ETH</strong>
            ) : (
              <strong className="text-accent">loading...</strong>
            )}
            . All players start with <strong>0 points</strong> and must earn their way to victory through successful
            sector operations.
          </p>
          <p className="mb-3">
            Points are awarded when pilots successfully mint credentials from your sector (+2 points each), when your
            station is upgraded (+10 points), and through other protocol interactions. However, if a pilot dies in your
            sector without proper transponder protections, you&apos;ll lose points—a harsh penalty that keeps station
            operators honest.
          </p>

          <h4 className="font-semibold mb-3 mt-4 text-accent">Winner Payouts</h4>
          <p className="mb-3">
            When the game timer expires, anyone can trigger settlement. The contract identifies the{" "}
            <strong>highest scoring player(s)</strong> and distributes the entire pot among them. If multiple players
            tie for first place, they <strong>split the pot equally</strong>—cooperation through competition.
          </p>
          <p className="text-sm opacity-80">
            The pot grows with each buy-in and can be sweetened by additional contributions. Build the safest sector,
            attract the most pilots, and claim your share of the prize pool.
          </p>
        </div>
      </div>
    </div>
  );
};
