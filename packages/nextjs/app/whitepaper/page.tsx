"use client";

import Image from "next/image";
import { MarkdownWithMath } from "~~/components/MarkdownWithMath";
import { useScaffoldReadContract } from "~~/hooks/scaffold-eth";

// Add Google Font import
if (typeof document !== "undefined") {
  const link = document.createElement("link");
  link.href = "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;500;600;700&display=swap";
  link.rel = "stylesheet";
  if (!document.querySelector(`link[href="${link.href}"]`)) {
    document.head.appendChild(link);
  }
}

const WhitepaperPage = () => {
  // Read visible chapters from the Game contract for dynamic content
  const { data: visibleChapters } = useScaffoldReadContract({
    contractName: "Game",
    functionName: "getVisibleChapters",
  });

  // Chapter 0 is always visible, check for others
  const isChapterVisible = (chapterNum: number) => {
    if (chapterNum === 0) return true;
    return visibleChapters?.includes(chapterNum) ?? false;
  };

  return (
    <div className="flex items-center flex-col flex-grow pt-8 pb-8 bg-gray-50">
      <div className="px-5 w-full flex justify-center">
        {/* Letter-sized paper (8.5" x 11" aspect ratio) */}
        <div
          className="bg-white text-black shadow-2xl paper"
          style={{
            width: "8.5in",
            minHeight: "11in",
            maxWidth: "90vw",
            padding: "1in 1.25in",
            fontSize: "11pt",
            lineHeight: "1.4",
            fontFamily: '"Times New Roman", "STIX Two Text", "Georgia", serif',
            textRendering: "optimizeLegibility",
            color: "#000",
          }}
        >
          {/* Title Block */}
          <div className="text-center mb-16">
            <h1
              className="mb-4"
              style={{
                fontSize: "2.4rem",
                margin: "2rem 0 0.5rem",
                fontWeight: "400",
                fontFamily: '"Cormorant Garamond", "Times New Roman", serif',
                letterSpacing: "0.08em",
                lineHeight: "0.9",
                textTransform: "uppercase",
                color: "#000",
                fontStretch: "condensed",
              }}
            >
              Extract Protocol
            </h1>
            <div
              className="mb-2"
              style={{
                color: "#000",
                fontSize: "1.1rem",
                fontFamily: '"Times New Roman", serif',
                marginBottom: "0.5rem",
              }}
            >
              A Decentralized Resource Extraction Protocol
            </div>
            <div
              className="mb-2"
              style={{
                color: "#000",
                fontSize: "1rem",
                fontFamily: '"Times New Roman", serif',
                marginBottom: "0.5rem",
              }}
            >
              Max Extract
            </div>
            <div
              className="mb-8"
              style={{
                color: "#000",
                fontSize: "1rem",
                fontStyle: "italic",
                fontFamily: '"Times New Roman", serif',
                marginBottom: "2rem",
              }}
            >
              max@extract.fi
            </div>
          </div>

          {/* Abstract */}
          <section className="mb-12" style={{ margin: "3rem 0", fontSize: "0.95rem" }}>
            <div
              className="text-center mb-6"
              style={{
                fontWeight: "700",
                fontSize: "1.1rem",
                color: "#000",
                marginBottom: "1.5rem",
                fontFamily: '"Times New Roman", serif',
              }}
            >
              Abstract
            </div>
            <div
              style={{
                textAlign: "justify",
                hyphens: "auto",
                lineHeight: "1.5",
                fontSize: "0.95rem",
                maxWidth: "100%",
                margin: "0 auto",
              }}
            >
              The Extract Protocol represents a novel approach to coordinating space exploration and resource extraction
              through blockchain-based smart contracts. This whitepaper presents a comprehensive technical specification
              of the protocol, including its core architecture, smart contract implementations, cryptographic entropy
              generation system, and off-chain infrastructure. The protocol enables programmers to deploy
              sector-specific smart contracts that govern access control, staking mechanisms, and economic incentives,
              while autonomous pilot agents navigate and interact with these systems in a trustless environment. Through
              progressive chapter unlocks, developers build increasingly sophisticated station infrastructure, upgrading
              airspace classifications from Class 0 (restricted to rugged vessels) to Class 3 (accessible to all ship
              models). The system employs a commit-reveal entropy scheme for verifiable randomness, an audit system for
              contract verification, and an ERC-20 credit economy for staking and transactions. This paper documents the
              complete technical architecture, from Solidity smart contracts to TypeScript game servers, providing
              developers with the knowledge required to deploy and operate sectors within the Extract Protocol network.
            </div>
          </section>

          {/* Table of Contents */}
          <nav
            className="mb-12"
            style={{
              margin: "3rem 0",
              fontSize: "0.95rem",
            }}
          >
            <h2
              className="text-center mb-8"
              style={{
                fontSize: "1.1rem",
                fontWeight: "700",
                marginBottom: "2rem",
                fontFamily: '"Times New Roman", serif',
                color: "#000",
              }}
            >
              Contents
            </h2>
            <div className="space-y-2">
              <div className="flex justify-between border-b border-dotted border-gray-300 pb-1">
                <span>
                  <span className="text-gray-500 mr-2">1.</span>Introduction
                </span>
                <span>3</span>
              </div>
              <div className="flex justify-between border-b border-dotted border-gray-300 pb-1">
                <span>
                  <span className="text-gray-500 mr-2">2.</span>Randomness and Entropy
                </span>
                <span>4</span>
              </div>
              <div className="flex justify-between border-b border-dotted border-gray-300 pb-1">
                <span>
                  <span className="text-gray-500 mr-2">3.</span>Chapter System
                </span>
                <span>8</span>
              </div>
              <div className="flex justify-between border-b border-dotted border-gray-300 pb-1">
                <span>
                  <span className="text-gray-500 mr-2">4.</span>Ship Models and Specifications
                </span>
                <span>20</span>
              </div>
              <div className="flex justify-between border-b border-dotted border-gray-300 pb-1">
                <span>
                  <span className="text-gray-500 mr-2">5.</span>Station Types and Airspace Classification
                </span>
                <span>24</span>
              </div>
              <div className="flex justify-between border-b border-dotted border-gray-300 pb-1">
                <span>
                  <span className="text-gray-500 mr-2">6.</span>Core Smart Contracts
                </span>
                <span>28</span>
              </div>
              <div className="flex justify-between border-b border-dotted border-gray-300 pb-1">
                <span>
                  <span className="text-gray-500 mr-2">7.</span>Off-Chain Architecture
                </span>
                <span>42</span>
              </div>
              <div className="flex justify-between border-b border-dotted border-gray-300 pb-1">
                <span>
                  <span className="text-gray-500 mr-2">8.</span>Economic Model
                </span>
                <span>48</span>
              </div>
              <div className="flex justify-between border-b border-dotted border-gray-300 pb-1">
                <span>
                  <span className="text-gray-500 mr-2">9.</span>Protocol Design Principles
                </span>
                <span>52</span>
              </div>
              <div className="flex justify-between border-b border-dotted border-gray-300 pb-1">
                <span>
                  <span className="text-gray-500 mr-2">10.</span>Implementation Guidance
                </span>
                <span>56</span>
              </div>
              <div className="flex justify-between border-b border-dotted border-gray-300 pb-1">
                <span>
                  <span className="text-gray-500 mr-2">11.</span>Conclusion
                </span>
                <span>60</span>
              </div>
            </div>
          </nav>

          {/* Section 1 - Introduction */}
          <section className="mb-8">
            <h2
              className="font-bold mb-4"
              style={{
                fontSize: "1.15rem",
                fontWeight: "700",
                marginTop: "2.5rem",
                marginBottom: "1rem",
                fontFamily: '"Times New Roman", serif',
                color: "#000",
              }}
            >
              1&nbsp;&nbsp;&nbsp;&nbsp;Introduction
            </h2>

            <h3
              className="font-bold mb-4"
              style={{
                fontSize: "1.05rem",
                fontWeight: "600",
                marginTop: "2rem",
                marginBottom: "1rem",
                fontFamily: '"Times New Roman", serif',
                color: "#000",
              }}
            >
              1.1 The Legend of Max Extract
            </h3>
            <p
              className="text-justify mb-4"
              style={{
                textAlign: "justify",
                hyphens: "auto",
                margin: "0 0 0.9rem",
              }}
            >
              Max Extract wasn&apos;t a captain or a warlord. Just another code monkey in the asteroid belt, known for
              keeping his head down and drill spinning. Out here, among scattered wrecks and drifting cargo, the real
              battles weren&apos;t fought with lasers—they were waged in silence, when one crew mined a rock for hours
              only to have another swoop in and take everything. No treaties held. Anarchy ruled, but it squandered more
              than it gave. No one trusted anyone, and every mission risked ending in blood or bankruptcy. Max
              didn&apos;t try to stop the violence, only the inefficiency.
            </p>
            <p
              className="text-justify mb-4"
              style={{
                textAlign: "justify",
                hyphens: "auto",
                margin: "0 0 0.9rem",
              }}
            >
              From a forgotten outpost barely clinging to gravity, Max deployed the first shared record—an immutable
              contract that let pirates stake exclusive claims on asteroids, earn daily fuel credits, and register their
              word with something stronger than talk. To dock in the garage, you needed a credential: proof that you
              bought in, agreed not to fire first, and played by the rules. Every deal made or broken left a trace in
              the record. Build a good rep, and you could refuel in peace. Break too many promises, and the record made
              you open season. Over time, the chaos thinned. Crews stopped clashing over the same rocks. Refueling
              stations stayed intact. Loot got bigger, not bloodier.
            </p>
            <p
              className="text-justify mb-4"
              style={{
                textAlign: "justify",
                hyphens: "auto",
                margin: "0 0 0.9rem",
              }}
            >
              What no one realized—until it was far too late—was that Max Extract had no crew at all. Just a protocol.
              Just code. Just a signal, left running long after the original miner was gone. His final act was to etch
              the Extract Protocol into the blockchain, a permanent coordination layer for space-faring operations.
            </p>

            <h3
              className="font-bold mb-4"
              style={{
                fontSize: "1.05rem",
                fontWeight: "600",
                marginTop: "2rem",
                marginBottom: "1rem",
                fontFamily: '"Times New Roman", serif',
                color: "#000",
              }}
            >
              1.2 Protocol Architecture
            </h3>
            <p
              className="text-justify mb-4"
              style={{
                textAlign: "justify",
                hyphens: "auto",
                margin: "0 0 0.9rem",
              }}
            >
              The Extract Protocol is a decentralized coordination system deployed on Ethereum-compatible blockchains.
              At its core, the protocol consists of five primary smart contracts that work in concert to manage game
              sessions, sector registration, entropy generation, contract auditing, and the credit economy. Programmers
              who join the protocol deploy sector-specific contracts that define the rules and services available in
              their region of space. Autonomous pilot agents then navigate to these sectors, interact with the deployed
              contracts, and participate in resource extraction operations.
            </p>
            <p
              className="text-justify mb-4"
              style={{
                textAlign: "justify",
                hyphens: "auto",
                margin: "0 0 0.9rem",
              }}
            >
              The protocol employs a chapter-based progression system where features unlock sequentially as programmers
              complete implementation requirements. Each chapter introduces new contract patterns—from basic registry
              systems to sophisticated staking mechanisms and crowdsale contracts. All sector contracts must pass
              through an official audit system before pilots will interact with them, ensuring code quality and
              preventing malicious implementations.
            </p>
            <p
              className="text-justify mb-4"
              style={{
                textAlign: "justify",
                hyphens: "auto",
                margin: "0 0 0.9rem",
              }}
            >
              The system runs on two layers: on-chain smart contracts that enforce rules and record state, and off-chain
              game servers that simulate sector physics, manage pilot navigation, and coordinate real-time events. This
              hybrid architecture enables trustless economic interactions while maintaining engaging real-time gameplay.
            </p>

            <h3
              className="font-bold mb-4"
              style={{
                fontSize: "1.05rem",
                fontWeight: "600",
                marginTop: "2rem",
                marginBottom: "1rem",
                fontFamily: '"Times New Roman", serif',
                color: "#000",
              }}
            >
              1.3 Key Innovations
            </h3>
            <p
              className="text-justify mb-4"
              style={{
                textAlign: "justify",
                hyphens: "auto",
                margin: "0 0 0.9rem",
              }}
            >
              The Extract Protocol introduces several novel mechanisms: a commit-reveal entropy system that generates
              verifiable randomness for all sectors simultaneously; a progressive airspace classification system that
              restricts sector access based on deployed infrastructure; an automated audit system powered by AI agents
              that verify contract implementations against chapter requirements; and a dual-transponder system
              (killswitch and killstake) that enables automated slashing when pilots violate sector rules.
            </p>
            <p
              className="text-justify mb-4"
              style={{
                textAlign: "justify",
                hyphens: "auto",
                margin: "0 0 0.9rem",
              }}
            >
              The protocol also implements a unique one-player-one-sector rule that prevents sybil attacks while
              allowing programmers to upgrade their registry contracts over time. This creates a persistent sector
              identity tied to a player address, with the flexibility to improve implementations without losing sector
              ownership.
            </p>
          </section>

          {/* Section 2 - Randomness */}
          <section className="mb-8">
            <h2
              className="font-bold mb-4"
              style={{
                fontSize: "1.15rem",
                fontWeight: "700",
                marginTop: "2.5rem",
                marginBottom: "1rem",
                fontFamily: '"Times New Roman", serif',
                color: "#000",
              }}
            >
              2&nbsp;&nbsp;&nbsp;&nbsp;Randomness and Entropy
            </h2>

            <p
              className="text-justify mb-4"
              style={{
                textAlign: "justify",
                hyphens: "auto",
                margin: "0 0 0.9rem",
              }}
            >
              The Max Extract Protocol employs a sophisticated randomness system to ensure fair and unpredictable
              generation of game events across all sectors. This system is built on cryptographic primitives and
              implements a commit-reveal scheme to prevent manipulation while maintaining transparency.
            </p>

            <h3
              className="font-bold mb-4"
              style={{
                fontSize: "1.05rem",
                fontWeight: "600",
                marginTop: "2rem",
                marginBottom: "1rem",
                fontFamily: '"Times New Roman", serif',
                color: "#000",
              }}
            >
              2.1 Universe Entropy Generation
            </h3>

            <p
              className="text-justify mb-4"
              style={{
                textAlign: "justify",
                hyphens: "auto",
                margin: "0 0 0.9rem",
              }}
            >
              The Universe smart contract serves as the foundation of the randomness system through its entropy
              generation mechanism. The contract maintains a single <code>bytes32 entropy</code> value that is
              established through a secure commit-reveal process executed by a designated GOD address.
            </p>

            <p
              className="text-justify mb-4"
              style={{
                textAlign: "justify",
                hyphens: "auto",
                margin: "0 0 0.9rem",
              }}
            >
              The commit-reveal process operates in two phases: First, the GOD address commits to a secret random number
              by submitting <code>keccak256(randomNumber)</code> to the contract. After at least one block has passed,
              the GOD reveals the original random number, which the contract verifies against the commitment. The final
              entropy is generated by combining the revealed number with the block hash from the commitment block:
            </p>

            <div
              className="text-center my-8"
              style={{
                margin: "2rem 0",
                padding: "1.5rem 0",
                borderTop: "1px solid #ddd",
                borderBottom: "1px solid #ddd",
                backgroundColor: "#fafafa",
              }}
            >
              <MarkdownWithMath
                content="$$entropy = keccak256(randomNumber, commitBlockHash)$$"
                style={{
                  fontSize: "1.1rem",
                  fontWeight: "400",
                  fontFamily: '"Computer Modern", "Latin Modern Math", "Times New Roman", serif',
                }}
              />
            </div>

            <p
              className="text-justify mb-4"
              style={{
                textAlign: "justify",
                hyphens: "auto",
                margin: "0 0 0.9rem",
              }}
            >
              This approach ensures that even the GOD address cannot predict the final entropy value, as it depends on
              the unpredictable block hash that is only available after the commitment is made.
            </p>

            <h3
              className="font-bold mb-4"
              style={{
                fontSize: "1.05rem",
                fontWeight: "600",
                marginTop: "2rem",
                marginBottom: "1rem",
                fontFamily: '"Times New Roman", serif',
                color: "#000",
              }}
            >
              2.2 Rolling Entropy System
            </h3>

            <p
              className="text-justify mb-4"
              style={{
                textAlign: "justify",
                hyphens: "auto",
                margin: "0 0 0.9rem",
              }}
            >
              Beyond the initial entropy, the Universe contract implements a rolling commit-reveal system for ongoing
              entropy generation. This system maintains <code>rollingEntropy</code> that is continuously updated through
              periodic commit-reveal cycles. Each round, the GOD address simultaneously commits to the next round while
              revealing the current round&apos;s random number.
            </p>

            <p
              className="text-justify mb-4"
              style={{
                textAlign: "justify",
                hyphens: "auto",
                margin: "0 0 0.9rem",
              }}
            >
              The rolling entropy is updated using the following formula:
            </p>

            <div
              className="text-center my-8"
              style={{
                margin: "2rem 0",
                padding: "1.5rem 0",
                borderTop: "1px solid #ddd",
                borderBottom: "1px solid #ddd",
                backgroundColor: "#fafafa",
              }}
            >
              <MarkdownWithMath
                content="$$rollingEntropy = keccak256(revealNumber, blockHash, previousRollingEntropy)$$"
                style={{
                  fontSize: "1.1rem",
                  fontWeight: "400",
                  fontFamily: '"Computer Modern", "Latin Modern Math", "Times New Roman", serif',
                }}
              />
            </div>

            <p
              className="text-justify mb-4"
              style={{
                textAlign: "justify",
                hyphens: "auto",
                margin: "0 0 0.9rem",
              }}
            >
              This creates an unpredictable sequence of entropy values that cannot be manipulated by any party,
              including the GOD address, due to the dependency on future block hashes. When the rolling entropy updates,
              all sectors receive fresh randomness simultaneously, creating synchronized &ldquo;openings&rdquo; across
              the universe where pilots can attempt to enter sectors.
            </p>

            <h3
              className="font-bold mb-4"
              style={{
                fontSize: "1.05rem",
                fontWeight: "600",
                marginTop: "2rem",
                marginBottom: "1rem",
                fontFamily: '"Times New Roman", serif',
                color: "#000",
              }}
            >
              2.3 Sector-Specific Randomness
            </h3>

            <p
              className="text-justify mb-4"
              style={{
                textAlign: "justify",
                hyphens: "auto",
                margin: "0 0 0.9rem",
              }}
            >
              Each sector in the Max Extract universe derives its own unique randomness from the global rolling entropy.
              This is achieved through a deterministic process that combines the current rolling entropy with the
              sector&apos;s unique identifier:
            </p>

            <div
              className="text-center my-8"
              style={{
                margin: "2rem 0",
                padding: "1.5rem 0",
                borderTop: "1px solid #ddd",
                borderBottom: "1px solid #ddd",
                backgroundColor: "#fafafa",
              }}
            >
              <MarkdownWithMath
                content={`$$sectorEntropy = keccak256(rollingEntropy + sectorId.padStart(64, "0"))$$`}
                style={{
                  fontSize: "1.1rem",
                  fontWeight: "400",
                  fontFamily: '"Computer Modern", "Latin Modern Math", "Times New Roman", serif',
                }}
              />
            </div>

            <p
              className="text-justify mb-4"
              style={{
                textAlign: "justify",
                hyphens: "auto",
                margin: "0 0 0.9rem",
              }}
            >
              Where <code>sectorId</code> is padded to 64 characters to ensure consistent input length for the hash
              function. This approach ensures that each sector has access to high-quality randomness that is both
              unpredictable and verifiable, while maintaining independence between sectors.
            </p>

            <h3
              className="font-bold mb-4"
              style={{
                fontSize: "1.05rem",
                fontWeight: "600",
                marginTop: "2rem",
                marginBottom: "1rem",
                fontFamily: '"Times New Roman", serif',
                color: "#000",
              }}
            >
              2.4 Deterministic Dice Implementation
            </h3>

            <p
              className="text-justify mb-4"
              style={{
                textAlign: "justify",
                hyphens: "auto",
                margin: "0 0 0.9rem",
              }}
            >
              The sector-specific entropy feeds into a <code>DeterministicDice</code> system that provides various
              random number generation functions. The dice operates by consuming hexadecimal characters from the entropy
              string sequentially, converting each character to a value between 0-15. Multiple characters can be
              combined for higher-resolution random numbers.
            </p>

            <p
              className="text-justify mb-4"
              style={{
                textAlign: "justify",
                hyphens: "auto",
                margin: "0 0 0.9rem",
              }}
            >
              The system provides several random number generation methods: <code>roll(count)</code> for basic dice
              rolls, <code>rollBetween(min, max)</code> for ranged values, <code>rollPercent()</code> for
              percentage-based outcomes, and <code>rollBool(probability)</code> for boolean decisions. When the entropy
              is exhausted, it is automatically rehashed using <code>keccak256</code> to generate additional randomness.
            </p>

            <h3
              className="font-bold mb-4"
              style={{
                fontSize: "1.05rem",
                fontWeight: "600",
                marginTop: "2rem",
                marginBottom: "1rem",
                fontFamily: '"Times New Roman", serif',
                color: "#000",
              }}
            >
              2.5 Game Event Generation
            </h3>

            <p
              className="text-justify mb-4"
              style={{
                textAlign: "justify",
                hyphens: "auto",
                margin: "0 0 0.9rem",
              }}
            >
              The deterministic dice drives all random events within each sector, including asteroid spawning, ship
              generation, resource distribution, and combat outcomes. Asteroid sizes are randomly selected from
              predefined categories (small, medium, large), spawn positions are determined along sector edges, and
              movement vectors are calculated using random angles and speeds.
            </p>

            <p
              className="text-justify mb-4"
              style={{
                textAlign: "justify",
                hyphens: "auto",
                margin: "0 0 0.9rem",
              }}
            >
              Ship spawning utilizes randomness for initial fuel levels, spawn positions, and targeting decisions.
              Mining rewards incorporate random bonuses based on asteroid size, while combat outcomes and resource
              distributions maintain unpredictability through the underlying entropy system. This ensures that while the
              system is deterministic and verifiable, the outcomes remain engaging and unpredictable for players.
            </p>
          </section>

          {/* Section 3 - Chapter System */}
          <section className="mb-8">
            <h2
              className="font-bold mb-4"
              style={{
                fontSize: "1.15rem",
                fontWeight: "700",
                marginTop: "2.5rem",
                marginBottom: "1rem",
                fontFamily: '"Times New Roman", serif',
                color: "#000",
              }}
            >
              3&nbsp;&nbsp;&nbsp;&nbsp;Chapter System
            </h2>

            <p
              className="text-justify mb-4"
              style={{
                textAlign: "justify",
                hyphens: "auto",
                margin: "0 0 0.9rem",
              }}
            >
              The Extract Protocol organizes its progression through a chapter-based system. Each chapter introduces new
              contract patterns, requirements, and capabilities. Chapters are unlocked globally by the GOD address and
              gate access to specific protocol features. The following sections document each chapter&apos;s technical
              requirements and implementations.
            </p>

            {/* Chapter 0 - Always Visible */}
            <div className="mb-8">
              <h3
                className="font-bold mb-4"
                style={{
                  fontSize: "1.05rem",
                  fontWeight: "600",
                  marginTop: "2rem",
                  marginBottom: "1rem",
                  fontFamily: '"Times New Roman", serif',
                  color: "#000",
                }}
              >
                3.0 Chapter 0: The Protocol
              </h3>
              <p
                className="text-justify mb-4"
                style={{
                  textAlign: "justify",
                  hyphens: "auto",
                  margin: "0 0 0.9rem",
                }}
              >
                Chapter 0 introduces the foundational concepts of the Extract Protocol. Players learn about the signal
                relay system, core contracts, and protocol mechanics. This chapter is always visible to all players and
                serves as the conceptual foundation for the entire system.
              </p>
              <p
                className="text-justify mb-4"
                style={{
                  textAlign: "justify",
                  hyphens: "auto",
                  margin: "0 0 0.9rem",
                }}
              >
                <strong>Key Concepts:</strong> The protocol establishes three core rules: (1) You will not attack other
                pirates who have signed the oath, (2) Each sector governs its own rules and regulations, and (3) Your
                reputation will be recorded, traceable, and unforgeable. These immutable principles are encoded in the
                MaxExtract contract and form the basis of all sector operations.
              </p>
              <p
                className="text-justify mb-4"
                style={{
                  textAlign: "justify",
                  hyphens: "auto",
                  margin: "0 0 0.9rem",
                }}
              >
                <strong>Airspace Classification:</strong> The protocol uses a Class 0-3 system to control sector access.
                Class 0 represents dangerous, unimproved airspace accessible only to Ships E and F. As sectors deploy
                better infrastructure through subsequent chapters, their airspace classification improves, allowing
                access to smaller ship models.
              </p>
              <p
                className="text-justify mb-4"
                style={{
                  textAlign: "justify",
                  hyphens: "auto",
                  margin: "0 0 0.9rem",
                }}
              >
                <strong>Transponder Systems:</strong> All pilots must equip transponders to operate in protocol
                airspace. The killswitch transponder broadcasts death signals when pilots are eliminated. The killstake
                transponder enables automatic slashing of stakes when kills occur, protecting sector operators from
                point penalties.
              </p>
            </div>

            {/* Chapter 1 */}
            {isChapterVisible(1) && (
              <div className="mb-8">
                <h3
                  className="font-bold mb-4"
                  style={{
                    fontSize: "1.05rem",
                    fontWeight: "600",
                    marginTop: "2rem",
                    marginBottom: "1rem",
                    fontFamily: '"Times New Roman", serif',
                    color: "#000",
                  }}
                >
                  3.1 Chapter 1: The Signal
                </h3>
                <p
                  className="text-justify mb-4"
                  style={{
                    textAlign: "justify",
                    hyphens: "auto",
                    margin: "0 0 0.9rem",
                  }}
                >
                  Chapter 1 requires players to deploy a Registry Contract and broadcast their sector to the Extract
                  Protocol. This establishes their presence in the network and makes their sector discoverable to
                  pilots.
                </p>
                <p
                  className="text-justify mb-4"
                  style={{
                    textAlign: "justify",
                    hyphens: "auto",
                    margin: "0 0 0.9rem",
                  }}
                >
                  <strong>Registry Contract Requirements:</strong> The registry must maintain a{" "}
                  <code>mapping(string =&gt; address) public modules</code> that maps module names to contract
                  addresses. Only the contract owner should be able to update this mapping. The registry must also store
                  the sector ID returned by the <code>broadcast()</code> function.
                </p>
                <p
                  className="text-justify mb-4"
                  style={{
                    textAlign: "justify",
                    hyphens: "auto",
                    margin: "0 0 0.9rem",
                  }}
                >
                  <strong>Broadcast Process:</strong> The <code>broadcast()</code> function on the MaxExtract contract
                  must be called from the Registry Contract, not directly from an EOA (enforced by{" "}
                  <code>tx.origin != msg.sender</code>). The function automatically generates a unique sector ID using
                  universe entropy and returns it. This ID is permanently associated with the player address that
                  initiated the broadcast.
                </p>
                <p
                  className="text-justify mb-4"
                  style={{
                    textAlign: "justify",
                    hyphens: "auto",
                    margin: "0 0 0.9rem",
                  }}
                >
                  <strong>Sector ID Generation:</strong> The MaxExtract contract generates sector IDs using{" "}
                  <code>keccak256(universeEntropy, tx.origin, msg.sender, contractAddress, nonce)</code>, ensuring
                  uniqueness, unpredictability, and collision resistance.
                </p>
                <p
                  className="text-justify mb-4"
                  style={{
                    textAlign: "justify",
                    hyphens: "auto",
                    margin: "0 0 0.9rem",
                  }}
                >
                  <strong>Airspace Status:</strong> Upon broadcast, sectors begin as Class 0 airspace. Only Ship Models
                  E and F (the largest, most rugged vessels) can get openings to enter. All pilots must be equipped with
                  killswitch transponders that broadcast death signals to the sector&apos;s satellite relay.
                </p>
              </div>
            )}

            {/* Chapter 2 */}
            {isChapterVisible(2) && (
              <div className="mb-8">
                <h3
                  className="font-bold mb-4"
                  style={{
                    fontSize: "1.05rem",
                    fontWeight: "600",
                    marginTop: "2rem",
                    marginBottom: "1rem",
                    fontFamily: '"Times New Roman", serif',
                    color: "#000",
                  }}
                >
                  3.2 Chapter 2: The Announcement
                </h3>
                <p
                  className="text-justify mb-4"
                  style={{
                    textAlign: "justify",
                    hyphens: "auto",
                    margin: "0 0 0.9rem",
                  }}
                >
                  Chapter 2 introduces identity contracts and the official audit system. Players deploy an Announcement
                  contract containing their canonical information and submit it for verification by the Pirate Council.
                </p>
                <p
                  className="text-justify mb-4"
                  style={{
                    textAlign: "justify",
                    hyphens: "auto",
                    margin: "0 0 0.9rem",
                  }}
                >
                  <strong>Announcement Contract Requirements:</strong> Must contain two constant fields:{" "}
                  <code>string public constant name</code> (station name) and <code>string public constant social</code>{" "}
                  (contact link starting with https://). This data is stored permanently onchain and never goes down or
                  can be tampered with.
                </p>
                <p
                  className="text-justify mb-4"
                  style={{
                    textAlign: "justify",
                    hyphens: "auto",
                    margin: "0 0 0.9rem",
                  }}
                >
                  <strong>Audit System:</strong> Before pilots will interact with contracts, they must pass through the
                  official Auditor contract. Players call <code>requestAudit(contractAddress, chapterNumber, url)</code>
                  , which costs 2 points. An AI auditor system verifies the source code against chapter requirements and
                  marks contracts as audited for specific chapters.
                </p>
                <p
                  className="text-justify mb-4"
                  style={{
                    textAlign: "justify",
                    hyphens: "auto",
                    margin: "0 0 0.9rem",
                  }}
                >
                  <strong>Verification Requirement:</strong> Contracts must be verified on the block explorer before
                  audit submission. This makes the source code publicly readable and enables the auditor system to
                  analyze the implementation.
                </p>
                <p
                  className="text-justify mb-4"
                  style={{
                    textAlign: "justify",
                    hyphens: "auto",
                    margin: "0 0 0.9rem",
                  }}
                >
                  <strong>Benefits:</strong> Successfully audited Announcement contracts display the sector name and
                  social link on the dashboard, increasing pilot trust and resulting in better tips when pilots
                  successfully escape with large scores.
                </p>
              </div>
            )}

            {/* Chapter 3 */}
            {isChapterVisible(3) && (
              <div className="mb-8">
                <h3
                  className="font-bold mb-4"
                  style={{
                    fontSize: "1.05rem",
                    fontWeight: "600",
                    marginTop: "2rem",
                    marginBottom: "1rem",
                    fontFamily: '"Times New Roman", serif',
                    color: "#000",
                  }}
                >
                  3.3 Chapter 3: The Credential
                </h3>
                <p
                  className="text-justify mb-4"
                  style={{
                    textAlign: "justify",
                    hyphens: "auto",
                    margin: "0 0 0.9rem",
                  }}
                >
                  Chapter 3 introduces access control through soulbound ERC-721 NFT credentials. Pilots must mint
                  credentials to gain landing rights at sector stations.
                </p>
                <p
                  className="text-justify mb-4"
                  style={{
                    textAlign: "justify",
                    hyphens: "auto",
                    margin: "0 0 0.9rem",
                  }}
                >
                  <strong>Credential Contract Requirements:</strong> Must be an ERC-721 NFT with transfer functions
                  overridden to prevent transfers (soulbound). Must implement an <code>issue()</code> function that
                  mints an NFT to <code>msg.sender</code> and calls{" "}
                  <code>game.pilotMintSectorCredential(sectorId)</code> to award the player 2 points.
                </p>
                <p
                  className="text-justify mb-4"
                  style={{
                    textAlign: "justify",
                    hyphens: "auto",
                    margin: "0 0 0.9rem",
                  }}
                >
                  <strong>On-Chain Verification:</strong> The Game contract performs extensive verification when{" "}
                  <code>pilotMintSectorCredential</code> is called. It verifies: (1) <code>tx.origin</code> is an active
                  pilot, (2) <code>msg.sender</code> matches the registered credential contract for the sector, (3) the
                  pilot hasn&apos;t already minted from this player (prevents point farming), and (4) all security
                  checks pass before awarding points.
                </p>
                <p
                  className="text-justify mb-4"
                  style={{
                    textAlign: "justify",
                    hyphens: "auto",
                    margin: "0 0 0.9rem",
                  }}
                >
                  <strong>One-Time Purchase Rule:</strong> Each pilot can only mint a credential from each player once.
                  This prevents point farming through contract redeployment. If upgrading credential contracts, players
                  must airdrop credentials to existing holders or they will lose access.
                </p>
                <p
                  className="text-justify mb-4"
                  style={{
                    textAlign: "justify",
                    hyphens: "auto",
                    margin: "0 0 0.9rem",
                  }}
                >
                  <strong>Airspace Upgrade:</strong> Once the credential contract is audited, the sector automatically
                  upgrades to Class 1 airspace. Ship Models D, E, and F can now get openings to enter, significantly
                  expanding the pilot pool.
                </p>
              </div>
            )}

            {/* Chapter 4 */}
            {isChapterVisible(4) && (
              <div className="mb-8">
                <h3
                  className="font-bold mb-4"
                  style={{
                    fontSize: "1.05rem",
                    fontWeight: "600",
                    marginTop: "2rem",
                    marginBottom: "1rem",
                    fontFamily: '"Times New Roman", serif',
                    color: "#000",
                  }}
                >
                  3.4 Chapter 4: The Staking and Slashing
                </h3>
                <p
                  className="text-justify mb-4"
                  style={{
                    textAlign: "justify",
                    hyphens: "auto",
                    margin: "0 0 0.9rem",
                  }}
                >
                  Chapter 4 introduces staking mechanisms to protect players from point penalties. Deaths in a sector
                  cost the player 10 points each. By requiring pilots to stake 10,000 credits upon entry, players can
                  slash the entire stake if the pilot kills someone, avoiding the penalty.
                </p>
                <p
                  className="text-justify mb-4"
                  style={{
                    textAlign: "justify",
                    hyphens: "auto",
                    margin: "0 0 0.9rem",
                  }}
                >
                  <strong>Stake Contract Requirements:</strong> Must implement exactly three functions: (1){" "}
                  <code>activate()</code> - called by MaxExtract when a pilot enters, sets{" "}
                  <code>staked[tx.origin] = true</code>, (2) <code>deactivate()</code> - called by MaxExtract when a
                  pilot exits normally, sets <code>staked[tx.origin] = false</code>, and (3){" "}
                  <code>slash(address killer)</code> - called by Game when a pilot kills, verifies killer is staked,
                  sets <code>staked[killer] = false</code>, then calls <code>MaxExtract.slash(killer, sectorId)</code>.
                </p>
                <p
                  className="text-justify mb-4"
                  style={{
                    textAlign: "justify",
                    hyphens: "auto",
                    margin: "0 0 0.9rem",
                  }}
                >
                  <strong>The tx.origin Pattern:</strong> The <code>activate</code> and <code>deactivate</code>{" "}
                  functions must use <code>tx.origin</code> to identify the pilot, not <code>msg.sender</code>. This is
                  intentional and required. The functions must also verify <code>msg.sender == maxExtractContract</code>{" "}
                  to prevent unauthorized calls.
                </p>
                <p
                  className="text-justify mb-4"
                  style={{
                    textAlign: "justify",
                    hyphens: "auto",
                    margin: "0 0 0.9rem",
                  }}
                >
                  <strong>Security Considerations:</strong> In the <code>slash</code> function, you MUST set{" "}
                  <code>staked[killer] = false</code> BEFORE calling the external <code>MaxExtract.slash()</code>{" "}
                  function. This prevents reentrancy attacks and double-slashing, following the
                  Checks-Effects-Interactions (CEI) pattern.
                </p>
                <p
                  className="text-justify mb-4"
                  style={{
                    textAlign: "justify",
                    hyphens: "auto",
                    margin: "0 0 0.9rem",
                  }}
                >
                  <strong>Staking Flow:</strong> Pilots call <code>MaxExtract.stake(sectorId)</code> which transfers 10k
                  credits from the pilot to MaxExtract and calls <code>activate()</code> on the stake contract. When
                  leaving, pilots call <code>MaxExtract.unstake(sectorId)</code> to retrieve their 10k credits. If they
                  kill someone, their stake is permanently burned (slashed).
                </p>
                <p
                  className="text-justify mb-4"
                  style={{
                    textAlign: "justify",
                    hyphens: "auto",
                    margin: "0 0 0.9rem",
                  }}
                >
                  <strong>Airspace Upgrade:</strong> Once the stake contract is audited, the sector upgrades to Class 2
                  airspace. Ship Models B, C, D, E, and F can now enter. Both killswitch and killstake transponders are
                  required for all ships operating in Class 2+ airspace.
                </p>
              </div>
            )}

            {/* Chapter 5 */}
            {isChapterVisible(5) && (
              <div className="mb-8">
                <h3
                  className="font-bold mb-4"
                  style={{
                    fontSize: "1.05rem",
                    fontWeight: "600",
                    marginTop: "2rem",
                    marginBottom: "1rem",
                    fontFamily: '"Times New Roman", serif',
                    color: "#000",
                  }}
                >
                  3.5 Chapter 5: The Crowdsale
                </h3>
                <p
                  className="text-justify mb-4"
                  style={{
                    textAlign: "justify",
                    hyphens: "auto",
                    margin: "0 0 0.9rem",
                  }}
                >
                  Chapter 5 introduces fuel tokens and crowdsales. To process asteroids into fuel and serve pilots
                  effectively, stations must upgrade. This requires raising 50,000 credits through a fuel token
                  crowdsale.
                </p>
                <p
                  className="text-justify mb-4"
                  style={{
                    textAlign: "justify",
                    hyphens: "auto",
                    margin: "0 0 0.9rem",
                  }}
                >
                  <strong>Crowdsale Contract Requirements:</strong> The contract registered under the &ldquo;sale&rdquo;
                  module must implement five functions: (1) <code>buy(uint256 amount)</code> - transfers credits from
                  pilot to contract and mints fuel tokens, (2) <code>pricePerTokenInCredits()</code> - returns the price
                  per token (recommended: 1000 * 10^18), (3) <code>balanceOf(address)</code> - standard ERC-20 balance
                  check, (4) <code>redeem()</code> - burns exactly 1 fuel token from caller for off-chain refueling, and
                  (5) <code>upgrade()</code> - callable only by pilots, triggers station upgrade if 50k credits raised.
                </p>
                <p
                  className="text-justify mb-4"
                  style={{
                    textAlign: "justify",
                    hyphens: "auto",
                    margin: "0 0 0.9rem",
                  }}
                >
                  <strong>Architecture Options:</strong> Players can implement this as either (A) a single contract with
                  ERC-20 functionality plus crowdsale logic, or (B) separate ERC-20 token contract plus crowdsale
                  contract. Either approach works as long as the required interface is implemented.
                </p>
                <p
                  className="text-justify mb-4"
                  style={{
                    textAlign: "justify",
                    hyphens: "auto",
                    margin: "0 0 0.9rem",
                  }}
                >
                  <strong>The Upgrade Function:</strong> This function can only be called by pilots (verified via{" "}
                  <code>tx.origin</code> check in <code>Game.upgradeStation</code>). It must: (1) verify balance &ge;
                  50k credits, (2) set <code>upgraded = true</code> (BEFORE external calls, following CEI pattern), (3)
                  approve Game contract for 49,500 credits, (4) call <code>game.upgradeStation(sectorId)</code> which
                  pulls the 49,500, and (5) transfer at least 500 credits to <code>msg.sender</code> as a bounty for
                  calling upgrade. Excess credits beyond 50k can be handled as desired.
                </p>
                <p
                  className="text-justify mb-4"
                  style={{
                    textAlign: "justify",
                    hyphens: "auto",
                    margin: "0 0 0.9rem",
                  }}
                >
                  <strong>Pricing Strategy:</strong> At 1,000 credits per token, approximately 50 pilots need to buy 1
                  token each to reach the 50k goal. Price too high and pilots won&apos;t buy. Price too low and you
                  won&apos;t raise enough even with full participation.
                </p>
                <p
                  className="text-justify mb-4"
                  style={{
                    textAlign: "justify",
                    hyphens: "auto",
                    margin: "0 0 0.9rem",
                  }}
                >
                  <strong>Airspace Upgrade:</strong> After successful crowdsale upgrade, sectors reach Class 3
                  airspace—the highest classification. ALL ship models (A through F) can now get openings to enter. This
                  maximizes pilot traffic and opportunities. Dual transponders (killswitch and killstake) remain
                  required for all ships.
                </p>
              </div>
            )}

            {!isChapterVisible(1) && (
              <p
                className="text-justify italic"
                style={{
                  textAlign: "justify",
                  hyphens: "auto",
                  margin: "2rem 0 0.9rem",
                  opacity: 0.7,
                }}
              >
                Additional chapters will appear in this whitepaper as they are unlocked in the game.
              </p>
            )}
          </section>

          {/* Section 4 - Ship Models */}
          <section className="mb-8">
            <h2
              className="font-bold mb-4"
              style={{
                fontSize: "1.15rem",
                fontWeight: "700",
                marginTop: "2.5rem",
                marginBottom: "1rem",
                fontFamily: '"Times New Roman", serif',
                color: "#000",
              }}
            >
              4&nbsp;&nbsp;&nbsp;&nbsp;Ship Models and Specifications
            </h2>

            <p
              className="text-justify mb-4"
              style={{
                textAlign: "justify",
                hyphens: "auto",
                margin: "0 0 0.9rem",
              }}
            >
              The Extract Protocol supports six distinct ship models (A through F), each with unique specifications and
              airspace compatibility. Larger, more rugged ships can navigate dangerous Class 0 airspace, while smaller
              commercial vessels require the safety of upgraded sectors.
            </p>

            <h3
              className="font-bold mb-4"
              style={{
                fontSize: "1.05rem",
                fontWeight: "600",
                marginTop: "2rem",
                marginBottom: "1rem",
                fontFamily: '"Times New Roman", serif',
                color: "#000",
              }}
            >
              4.1 Ship Classification System
            </h3>

            <div style={{ marginBottom: "2rem" }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                  gap: "1.5rem",
                  margin: "2rem 0",
                }}
              >
                {/* Ship Type 1 - Model A */}
                <div
                  style={{
                    textAlign: "center",
                    padding: "1rem",
                    border: "1px solid #333",
                    backgroundColor: "#000",
                    backgroundImage:
                      "radial-gradient(1px 1px at 20% 30%, white, transparent), radial-gradient(1px 1px at 60% 70%, white, transparent), radial-gradient(1px 1px at 50% 50%, white, transparent), radial-gradient(1px 1px at 80% 10%, white, transparent), radial-gradient(1px 1px at 90% 60%, white, transparent), radial-gradient(1px 1px at 33% 80%, white, transparent), radial-gradient(1px 1px at 15% 65%, white, transparent), radial-gradient(1px 1px at 45% 15%, white, transparent), radial-gradient(1px 1px at 75% 85%, white, transparent), radial-gradient(1px 1px at 25% 45%, white, transparent), radial-gradient(1px 1px at 85% 35%, white, transparent), radial-gradient(1px 1px at 5% 55%, white, transparent), radial-gradient(1px 1px at 95% 75%, white, transparent), radial-gradient(1px 1px at 40% 90%, white, transparent), radial-gradient(1px 1px at 70% 20%, white, transparent), radial-gradient(1px 1px at 10% 10%, white, transparent), radial-gradient(1px 1px at 55% 40%, white, transparent), radial-gradient(1px 1px at 30% 60%, white, transparent), radial-gradient(1px 1px at 88% 88%, white, transparent), radial-gradient(1px 1px at 65% 5%, white, transparent)",
                    backgroundSize: "100% 100%",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Image src="/ships/ship1.png" alt="Ship Type 1 - Model A" width={100} height={100} />
                  <h4 style={{ fontWeight: "600", margin: "0.5rem 0", fontSize: "0.9rem", color: "#fff" }}>
                    Ship Type 1
                  </h4>
                  <p style={{ fontSize: "0.8rem", margin: "0.25rem 0", color: "#ccc" }}>Model A</p>
                  <p style={{ fontSize: "0.75rem", opacity: 0.6, color: "#999" }}>Class 3 Only</p>
                </div>

                {/* Ship Type 2 - Model A */}
                <div
                  style={{
                    textAlign: "center",
                    padding: "1rem",
                    border: "1px solid #333",
                    backgroundColor: "#000",
                    backgroundImage:
                      "radial-gradient(1px 1px at 25% 35%, white, transparent), radial-gradient(1px 1px at 75% 25%, white, transparent), radial-gradient(1px 1px at 45% 65%, white, transparent), radial-gradient(1px 1px at 85% 75%, white, transparent), radial-gradient(1px 1px at 10% 50%, white, transparent), radial-gradient(1px 1px at 70% 90%, white, transparent), radial-gradient(1px 1px at 30% 15%, white, transparent), radial-gradient(1px 1px at 52% 8%, white, transparent), radial-gradient(1px 1px at 18% 78%, white, transparent), radial-gradient(1px 1px at 92% 42%, white, transparent), radial-gradient(1px 1px at 62% 58%, white, transparent), radial-gradient(1px 1px at 8% 22%, white, transparent), radial-gradient(1px 1px at 78% 48%, white, transparent), radial-gradient(1px 1px at 42% 92%, white, transparent), radial-gradient(1px 1px at 88% 12%, white, transparent), radial-gradient(1px 1px at 35% 28%, white, transparent), radial-gradient(1px 1px at 68% 72%, white, transparent), radial-gradient(1px 1px at 22% 88%, white, transparent), radial-gradient(1px 1px at 95% 55%, white, transparent), radial-gradient(1px 1px at 5% 5%, white, transparent)",
                    backgroundSize: "100% 100%",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Image src="/ships/ship2.png" alt="Ship Type 2 - Model A" width={100} height={100} />
                  <h4 style={{ fontWeight: "600", margin: "0.5rem 0", fontSize: "0.9rem", color: "#fff" }}>
                    Ship Type 2
                  </h4>
                  <p style={{ fontSize: "0.8rem", margin: "0.25rem 0", color: "#ccc" }}>Model A</p>
                  <p style={{ fontSize: "0.75rem", opacity: 0.6, color: "#999" }}>Class 3 Only</p>
                </div>

                {/* Ship Type 3 - Model A */}
                <div
                  style={{
                    textAlign: "center",
                    padding: "1rem",
                    border: "1px solid #333",
                    backgroundColor: "#000",
                    backgroundImage:
                      "radial-gradient(1px 1px at 40% 20%, white, transparent), radial-gradient(1px 1px at 65% 55%, white, transparent), radial-gradient(1px 1px at 15% 75%, white, transparent), radial-gradient(1px 1px at 88% 40%, white, transparent), radial-gradient(1px 1px at 35% 85%, white, transparent), radial-gradient(1px 1px at 55% 10%, white, transparent), radial-gradient(1px 1px at 22% 45%, white, transparent), radial-gradient(1px 1px at 72% 68%, white, transparent), radial-gradient(1px 1px at 8% 32%, white, transparent), radial-gradient(1px 1px at 92% 92%, white, transparent), radial-gradient(1px 1px at 48% 62%, white, transparent), radial-gradient(1px 1px at 28% 8%, white, transparent), radial-gradient(1px 1px at 82% 78%, white, transparent), radial-gradient(1px 1px at 58% 38%, white, transparent), radial-gradient(1px 1px at 12% 58%, white, transparent), radial-gradient(1px 1px at 78% 15%, white, transparent), radial-gradient(1px 1px at 42% 72%, white, transparent), radial-gradient(1px 1px at 95% 25%, white, transparent), radial-gradient(1px 1px at 25% 95%, white, transparent), radial-gradient(1px 1px at 68% 88%, white, transparent)",
                    backgroundSize: "100% 100%",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Image src="/ships/ship3.png" alt="Ship Type 3 - Model A" width={100} height={100} />
                  <h4 style={{ fontWeight: "600", margin: "0.5rem 0", fontSize: "0.9rem", color: "#fff" }}>
                    Ship Type 3
                  </h4>
                  <p style={{ fontSize: "0.8rem", margin: "0.25rem 0", color: "#ccc" }}>Model A</p>
                  <p style={{ fontSize: "0.75rem", opacity: 0.6, color: "#999" }}>Class 3 Only</p>
                </div>

                {/* Ship Type 4 - Model B */}
                <div
                  style={{
                    textAlign: "center",
                    padding: "1rem",
                    border: "1px solid #333",
                    backgroundColor: "#000",
                    backgroundImage:
                      "radial-gradient(1px 1px at 18% 25%, white, transparent), radial-gradient(1px 1px at 72% 60%, white, transparent), radial-gradient(1px 1px at 42% 78%, white, transparent), radial-gradient(1px 1px at 82% 15%, white, transparent), radial-gradient(1px 1px at 28% 50%, white, transparent), radial-gradient(1px 1px at 58% 35%, white, transparent), radial-gradient(1px 1px at 8% 88%, white, transparent), radial-gradient(1px 1px at 92% 72%, white, transparent), radial-gradient(1px 1px at 38% 12%, white, transparent), radial-gradient(1px 1px at 65% 82%, white, transparent), radial-gradient(1px 1px at 12% 42%, white, transparent), radial-gradient(1px 1px at 88% 28%, white, transparent), radial-gradient(1px 1px at 52% 68%, white, transparent), radial-gradient(1px 1px at 25% 92%, white, transparent), radial-gradient(1px 1px at 78% 48%, white, transparent), radial-gradient(1px 1px at 48% 22%, white, transparent), radial-gradient(1px 1px at 85% 5%, white, transparent), radial-gradient(1px 1px at 15% 68%, white, transparent), radial-gradient(1px 1px at 95% 85%, white, transparent), radial-gradient(1px 1px at 32% 58%, white, transparent)",
                    backgroundSize: "100% 100%",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Image src="/ships/ship4.png" alt="Ship Type 4 - Model B" width={100} height={100} />
                  <h4 style={{ fontWeight: "600", margin: "0.5rem 0", fontSize: "0.9rem", color: "#fff" }}>
                    Ship Type 4
                  </h4>
                  <p style={{ fontSize: "0.8rem", margin: "0.25rem 0", color: "#ccc" }}>Model B</p>
                  <p style={{ fontSize: "0.75rem", opacity: 0.6, color: "#999" }}>Class 2+</p>
                </div>

                {/* Ship Type 5 - Model B */}
                <div
                  style={{
                    textAlign: "center",
                    padding: "1rem",
                    border: "1px solid #333",
                    backgroundColor: "#000",
                    backgroundImage:
                      "radial-gradient(1px 1px at 35% 40%, white, transparent), radial-gradient(1px 1px at 68% 18%, white, transparent), radial-gradient(1px 1px at 12% 62%, white, transparent), radial-gradient(1px 1px at 92% 82%, white, transparent), radial-gradient(1px 1px at 48% 72%, white, transparent), radial-gradient(1px 1px at 78% 45%, white, transparent), radial-gradient(1px 1px at 25% 12%, white, transparent), radial-gradient(1px 1px at 55% 28%, white, transparent), radial-gradient(1px 1px at 88% 58%, white, transparent), radial-gradient(1px 1px at 18% 85%, white, transparent), radial-gradient(1px 1px at 62% 8%, white, transparent), radial-gradient(1px 1px at 8% 38%, white, transparent), radial-gradient(1px 1px at 82% 92%, white, transparent), radial-gradient(1px 1px at 42% 52%, white, transparent), radial-gradient(1px 1px at 72% 32%, white, transparent), radial-gradient(1px 1px at 32% 95%, white, transparent), radial-gradient(1px 1px at 95% 15%, white, transparent), radial-gradient(1px 1px at 22% 68%, white, transparent), radial-gradient(1px 1px at 58% 88%, white, transparent), radial-gradient(1px 1px at 5% 22%, white, transparent)",
                    backgroundSize: "100% 100%",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Image src="/ships/ship5.png" alt="Ship Type 5 - Model B" width={100} height={100} />
                  <h4 style={{ fontWeight: "600", margin: "0.5rem 0", fontSize: "0.9rem", color: "#fff" }}>
                    Ship Type 5
                  </h4>
                  <p style={{ fontSize: "0.8rem", margin: "0.25rem 0", color: "#ccc" }}>Model B</p>
                  <p style={{ fontSize: "0.75rem", opacity: 0.6, color: "#999" }}>Class 2+</p>
                </div>

                {/* Ship Type 6 - Model C */}
                <div
                  style={{
                    textAlign: "center",
                    padding: "1rem",
                    border: "1px solid #333",
                    backgroundColor: "#000",
                    backgroundImage:
                      "radial-gradient(1px 1px at 22% 68%, white, transparent), radial-gradient(1px 1px at 58% 32%, white, transparent), radial-gradient(1px 1px at 38% 48%, white, transparent), radial-gradient(1px 1px at 78% 22%, white, transparent), radial-gradient(1px 1px at 16% 38%, white, transparent), radial-gradient(1px 1px at 88% 58%, white, transparent), radial-gradient(1px 1px at 52% 88%, white, transparent), radial-gradient(1px 1px at 72% 8%, white, transparent), radial-gradient(1px 1px at 28% 78%, white, transparent), radial-gradient(1px 1px at 8% 15%, white, transparent), radial-gradient(1px 1px at 92% 45%, white, transparent), radial-gradient(1px 1px at 42% 62%, white, transparent), radial-gradient(1px 1px at 65% 92%, white, transparent), radial-gradient(1px 1px at 12% 82%, white, transparent), radial-gradient(1px 1px at 82% 72%, white, transparent), radial-gradient(1px 1px at 48% 18%, white, transparent), radial-gradient(1px 1px at 95% 28%, white, transparent), radial-gradient(1px 1px at 25% 52%, white, transparent), radial-gradient(1px 1px at 68% 42%, white, transparent), radial-gradient(1px 1px at 5% 92%, white, transparent)",
                    backgroundSize: "100% 100%",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Image src="/ships/ship6.png" alt="Ship Type 6 - Model C" width={100} height={100} />
                  <h4 style={{ fontWeight: "600", margin: "0.5rem 0", fontSize: "0.9rem", color: "#fff" }}>
                    Ship Type 6
                  </h4>
                  <p style={{ fontSize: "0.8rem", margin: "0.25rem 0", color: "#ccc" }}>Model C</p>
                  <p style={{ fontSize: "0.75rem", opacity: 0.6, color: "#999" }}>Class 2+</p>
                </div>

                {/* Ship Type 7 - Model C */}
                <div
                  style={{
                    textAlign: "center",
                    padding: "1rem",
                    border: "1px solid #333",
                    backgroundColor: "#000",
                    backgroundImage:
                      "radial-gradient(1px 1px at 28% 28%, white, transparent), radial-gradient(1px 1px at 62% 58%, white, transparent), radial-gradient(1px 1px at 45% 15%, white, transparent), radial-gradient(1px 1px at 85% 85%, white, transparent), radial-gradient(1px 1px at 14% 52%, white, transparent), radial-gradient(1px 1px at 72% 72%, white, transparent), radial-gradient(1px 1px at 38% 92%, white, transparent), radial-gradient(1px 1px at 58% 38%, white, transparent), radial-gradient(1px 1px at 92% 18%, white, transparent), radial-gradient(1px 1px at 18% 68%, white, transparent), radial-gradient(1px 1px at 78% 5%, white, transparent), radial-gradient(1px 1px at 8% 82%, white, transparent), radial-gradient(1px 1px at 52% 48%, white, transparent), radial-gradient(1px 1px at 88% 62%, white, transparent), radial-gradient(1px 1px at 32% 35%, white, transparent), radial-gradient(1px 1px at 68% 88%, white, transparent), radial-gradient(1px 1px at 22% 8%, white, transparent), radial-gradient(1px 1px at 95% 42%, white, transparent), radial-gradient(1px 1px at 5% 75%, white, transparent), radial-gradient(1px 1px at 75% 95%, white, transparent)",
                    backgroundSize: "100% 100%",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Image src="/ships/ship7.png" alt="Ship Type 7 - Model C" width={100} height={100} />
                  <h4 style={{ fontWeight: "600", margin: "0.5rem 0", fontSize: "0.9rem", color: "#fff" }}>
                    Ship Type 7
                  </h4>
                  <p style={{ fontSize: "0.8rem", margin: "0.25rem 0", color: "#ccc" }}>Model C</p>
                  <p style={{ fontSize: "0.75rem", opacity: 0.6, color: "#999" }}>Class 2+</p>
                </div>

                {/* Ship Type 8 - Model D */}
                <div
                  style={{
                    textAlign: "center",
                    padding: "1rem",
                    border: "1px solid #333",
                    backgroundColor: "#000",
                    backgroundImage:
                      "radial-gradient(1px 1px at 32% 42%, white, transparent), radial-gradient(1px 1px at 55% 22%, white, transparent), radial-gradient(1px 1px at 18% 68%, white, transparent), radial-gradient(1px 1px at 75% 48%, white, transparent), radial-gradient(1px 1px at 42% 85%, white, transparent), radial-gradient(1px 1px at 88% 28%, white, transparent), radial-gradient(1px 1px at 8% 18%, white, transparent), radial-gradient(1px 1px at 65% 78%, white, transparent), radial-gradient(1px 1px at 92% 58%, white, transparent), radial-gradient(1px 1px at 25% 32%, white, transparent), radial-gradient(1px 1px at 78% 92%, white, transparent), radial-gradient(1px 1px at 12% 52%, white, transparent), radial-gradient(1px 1px at 58% 8%, white, transparent), radial-gradient(1px 1px at 85% 72%, white, transparent), radial-gradient(1px 1px at 38% 58%, white, transparent), radial-gradient(1px 1px at 68% 12%, white, transparent), radial-gradient(1px 1px at 22% 88%, white, transparent), radial-gradient(1px 1px at 95% 38%, white, transparent), radial-gradient(1px 1px at 5% 5%, white, transparent), radial-gradient(1px 1px at 48% 95%, white, transparent)",
                    backgroundSize: "100% 100%",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Image src="/ships/ship8.png" alt="Ship Type 8 - Model D" width={100} height={100} />
                  <h4 style={{ fontWeight: "600", margin: "0.5rem 0", fontSize: "0.9rem", color: "#fff" }}>
                    Ship Type 8
                  </h4>
                  <p style={{ fontSize: "0.8rem", margin: "0.25rem 0", color: "#ccc" }}>Model D</p>
                  <p style={{ fontSize: "0.75rem", opacity: 0.6, color: "#999" }}>Class 1+</p>
                </div>

                {/* Ship Type 9 - Model E */}
                <div
                  style={{
                    textAlign: "center",
                    padding: "1rem",
                    border: "1px solid #333",
                    backgroundColor: "#000",
                    backgroundImage:
                      "radial-gradient(1px 1px at 48% 35%, white, transparent), radial-gradient(1px 1px at 82% 65%, white, transparent), radial-gradient(1px 1px at 15% 45%, white, transparent), radial-gradient(1px 1px at 68% 12%, white, transparent), radial-gradient(1px 1px at 28% 78%, white, transparent), radial-gradient(1px 1px at 92% 38%, white, transparent), radial-gradient(1px 1px at 52% 92%, white, transparent), radial-gradient(1px 1px at 22% 18%, white, transparent), radial-gradient(1px 1px at 72% 88%, white, transparent), radial-gradient(1px 1px at 38% 62%, white, transparent), radial-gradient(1px 1px at 88% 8%, white, transparent), radial-gradient(1px 1px at 8% 72%, white, transparent), radial-gradient(1px 1px at 58% 52%, white, transparent), radial-gradient(1px 1px at 95% 82%, white, transparent), radial-gradient(1px 1px at 32% 25%, white, transparent), radial-gradient(1px 1px at 78% 48%, white, transparent), radial-gradient(1px 1px at 12% 5%, white, transparent), radial-gradient(1px 1px at 65% 75%, white, transparent), radial-gradient(1px 1px at 42% 95%, white, transparent), radial-gradient(1px 1px at 5% 58%, white, transparent)",
                    backgroundSize: "100% 100%",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Image src="/ships/ship9.png" alt="Ship Type 9 - Model E" width={100} height={100} />
                  <h4 style={{ fontWeight: "600", margin: "0.5rem 0", fontSize: "0.9rem", color: "#fff" }}>
                    Ship Type 9
                  </h4>
                  <p style={{ fontSize: "0.8rem", margin: "0.25rem 0", color: "#ccc" }}>Model E</p>
                  <p style={{ fontSize: "0.75rem", opacity: 0.6, color: "#999" }}>Class 0+</p>
                </div>

                {/* Ship Type 10 - Model E */}
                <div
                  style={{
                    textAlign: "center",
                    padding: "1rem",
                    border: "1px solid #333",
                    backgroundColor: "#000",
                    backgroundImage:
                      "radial-gradient(1px 1px at 38% 58%, white, transparent), radial-gradient(1px 1px at 62% 42%, white, transparent), radial-gradient(1px 1px at 22% 22%, white, transparent), radial-gradient(1px 1px at 78% 78%, white, transparent), radial-gradient(1px 1px at 48% 8%, white, transparent), radial-gradient(1px 1px at 85% 92%, white, transparent), radial-gradient(1px 1px at 12% 58%, white, transparent), radial-gradient(1px 1px at 72% 28%, white, transparent), radial-gradient(1px 1px at 32% 72%, white, transparent), radial-gradient(1px 1px at 92% 48%, white, transparent), radial-gradient(1px 1px at 8% 82%, white, transparent), radial-gradient(1px 1px at 58% 68%, white, transparent), radial-gradient(1px 1px at 88% 12%, white, transparent), radial-gradient(1px 1px at 28% 38%, white, transparent), radial-gradient(1px 1px at 68% 88%, white, transparent), radial-gradient(1px 1px at 18% 5%, white, transparent), radial-gradient(1px 1px at 82% 62%, white, transparent), radial-gradient(1px 1px at 42% 18%, white, transparent), radial-gradient(1px 1px at 95% 72%, white, transparent), radial-gradient(1px 1px at 5% 42%, white, transparent)",
                    backgroundSize: "100% 100%",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Image src="/ships/ship10.png" alt="Ship Type 10 - Model E" width={100} height={100} />
                  <h4 style={{ fontWeight: "600", margin: "0.5rem 0", fontSize: "0.9rem", color: "#fff" }}>
                    Ship Type 10
                  </h4>
                  <p style={{ fontSize: "0.8rem", margin: "0.25rem 0", color: "#ccc" }}>Model E</p>
                  <p style={{ fontSize: "0.75rem", opacity: 0.6, color: "#999" }}>Class 0+</p>
                </div>

                {/* Ship Type 11 - Model F */}
                <div
                  style={{
                    textAlign: "center",
                    padding: "1rem",
                    border: "1px solid #333",
                    backgroundColor: "#000",
                    backgroundImage:
                      "radial-gradient(1px 1px at 52% 48%, white, transparent), radial-gradient(1px 1px at 28% 72%, white, transparent), radial-gradient(1px 1px at 78% 28%, white, transparent), radial-gradient(1px 1px at 18% 18%, white, transparent), radial-gradient(1px 1px at 88% 52%, white, transparent), radial-gradient(1px 1px at 62% 88%, white, transparent), radial-gradient(1px 1px at 35% 62%, white, transparent), radial-gradient(1px 1px at 72% 15%, white, transparent), radial-gradient(1px 1px at 8% 38%, white, transparent), radial-gradient(1px 1px at 92% 82%, white, transparent), radial-gradient(1px 1px at 42% 25%, white, transparent), radial-gradient(1px 1px at 68% 68%, white, transparent), radial-gradient(1px 1px at 22% 92%, white, transparent), radial-gradient(1px 1px at 85% 8%, white, transparent), radial-gradient(1px 1px at 15% 75%, white, transparent), radial-gradient(1px 1px at 58% 42%, white, transparent), radial-gradient(1px 1px at 95% 65%, white, transparent), radial-gradient(1px 1px at 32% 5%, white, transparent), radial-gradient(1px 1px at 75% 55%, white, transparent), radial-gradient(1px 1px at 5% 85%, white, transparent)",
                    backgroundSize: "100% 100%",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Image src="/ships/ship11.png" alt="Ship Type 11 - Model F" width={100} height={100} />
                  <h4 style={{ fontWeight: "600", margin: "0.5rem 0", fontSize: "0.9rem", color: "#fff" }}>
                    Ship Type 11
                  </h4>
                  <p style={{ fontSize: "0.8rem", margin: "0.25rem 0", color: "#ccc" }}>Model F</p>
                  <p style={{ fontSize: "0.75rem", opacity: 0.6, color: "#999" }}>Class 0+</p>
                </div>

                {/* Ship Type 12 - Model F */}
                <div
                  style={{
                    textAlign: "center",
                    padding: "1rem",
                    border: "1px solid #333",
                    backgroundColor: "#000",
                    backgroundImage:
                      "radial-gradient(1px 1px at 45% 55%, white, transparent), radial-gradient(1px 1px at 82% 35%, white, transparent), radial-gradient(1px 1px at 25% 82%, white, transparent), radial-gradient(1px 1px at 65% 12%, white, transparent), radial-gradient(1px 1px at 15% 28%, white, transparent), radial-gradient(1px 1px at 55% 75%, white, transparent), radial-gradient(1px 1px at 92% 68%, white, transparent), radial-gradient(1px 1px at 35% 48%, white, transparent), radial-gradient(1px 1px at 78% 88%, white, transparent), radial-gradient(1px 1px at 18% 15%, white, transparent), radial-gradient(1px 1px at 88% 22%, white, transparent), radial-gradient(1px 1px at 48% 62%, white, transparent), radial-gradient(1px 1px at 72% 5%, white, transparent), radial-gradient(1px 1px at 8% 68%, white, transparent), radial-gradient(1px 1px at 62% 42%, white, transparent), radial-gradient(1px 1px at 95% 85%, white, transparent), radial-gradient(1px 1px at 28% 92%, white, transparent), radial-gradient(1px 1px at 68% 58%, white, transparent), radial-gradient(1px 1px at 5% 38%, white, transparent), radial-gradient(1px 1px at 85% 95%, white, transparent)",
                    backgroundSize: "100% 100%",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Image src="/ships/ship12.png" alt="Ship Type 12 - Model F" width={100} height={100} />
                  <h4 style={{ fontWeight: "600", margin: "0.5rem 0", fontSize: "0.9rem", color: "#fff" }}>
                    Ship Type 12
                  </h4>
                  <p style={{ fontSize: "0.8rem", margin: "0.25rem 0", color: "#ccc" }}>Model F</p>
                  <p style={{ fontSize: "0.75rem", opacity: 0.6, color: "#999" }}>Class 0+</p>
                </div>
              </div>
            </div>

            <h3
              className="font-bold mb-4"
              style={{
                fontSize: "1.05rem",
                fontWeight: "600",
                marginTop: "2rem",
                marginBottom: "1rem",
                fontFamily: '"Times New Roman", serif',
                color: "#000",
              }}
            >
              4.2 Technical Specifications
            </h3>

            <p
              className="text-justify mb-4"
              style={{
                textAlign: "justify",
                hyphens: "auto",
                margin: "0 0 0.9rem",
              }}
            >
              <strong>Model F - Heavy Industrial Hauler:</strong> The largest vessel in the Extract Protocol fleet.
              Model F ships feature reinforced hulls capable of withstanding the hazards of Class 0 airspace, maximum
              cargo capacity for bulk extraction operations, and extended fuel reserves. These vessels are the backbone
              of large-scale mining operations in dangerous sectors.
            </p>

            <p
              className="text-justify mb-4"
              style={{
                textAlign: "justify",
                hyphens: "auto",
                margin: "0 0 0.9rem",
              }}
            >
              <strong>Model E - Military-Grade Freighter:</strong> Battle-hardened cargo vessels originally designed for
              military supply chains. Model E ships combine rugged construction with moderate maneuverability, making
              them ideal for operations in unstable sectors. These ships can access Class 0 airspace alongside Model F
              vessels.
            </p>

            <p
              className="text-justify mb-4"
              style={{
                textAlign: "justify",
                hyphens: "auto",
                margin: "0 0 0.9rem",
              }}
            >
              <strong>Model D - Medium Combat Vessel:</strong> The first ship class that requires improved airspace
              conditions. Model D vessels balance cargo capacity with defensive capabilities. They require Class 1 or
              better airspace, which means sectors must have deployed and audited credential systems before these ships
              can enter.
            </p>

            <p
              className="text-justify mb-4"
              style={{
                textAlign: "justify",
                hyphens: "auto",
                margin: "0 0 0.9rem",
              }}
            >
              <strong>Model C - Standard Cargo Runner:</strong> Commercial vessels designed for routine extraction
              operations. Model C ships require Class 2 airspace, meaning sectors must have deployed credential and
              staking systems. These ships represent the standard workhorse of the Extract Protocol economy.
            </p>

            <p
              className="text-justify mb-4"
              style={{
                textAlign: "justify",
                hyphens: "auto",
                margin: "0 0 0.9rem",
              }}
            >
              <strong>Model B - Light Commercial Shuttle:</strong> Agile vessels optimized for speed over cargo
              capacity. Model B ships require Class 2 airspace and are commonly used by pilots who prioritize
              maneuverability and fuel efficiency for quick extraction runs.
            </p>

            <p
              className="text-justify mb-4"
              style={{
                textAlign: "justify",
                hyphens: "auto",
                margin: "0 0 0.9rem",
              }}
            >
              <strong>Model A - Scout and Explorer:</strong> The smallest vessel class, requiring the safest airspace
              conditions. Model A ships can only operate in Class 3 airspace, meaning sectors must have completed all
              infrastructure upgrades including the crowdsale station upgrade. These ships excel at exploration and
              small- scale extraction operations in fully developed sectors.
            </p>

            <h3
              className="font-bold mb-4"
              style={{
                fontSize: "1.05rem",
                fontWeight: "600",
                marginTop: "2rem",
                marginBottom: "1rem",
                fontFamily: '"Times New Roman", serif',
                color: "#000",
              }}
            >
              4.3 Airspace Compatibility Matrix
            </h3>

            <div style={{ margin: "1.5rem 0", overflow: "auto" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: "0.85rem",
                }}
              >
                <thead>
                  <tr style={{ borderBottom: "2px solid #000" }}>
                    <th style={{ padding: "0.5rem", textAlign: "left" }}>Ship Model</th>
                    <th style={{ padding: "0.5rem", textAlign: "center" }}>Class 0</th>
                    <th style={{ padding: "0.5rem", textAlign: "center" }}>Class 1</th>
                    <th style={{ padding: "0.5rem", textAlign: "center" }}>Class 2</th>
                    <th style={{ padding: "0.5rem", textAlign: "center" }}>Class 3</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: "1px solid #ddd" }}>
                    <td style={{ padding: "0.5rem" }}>Model F</td>
                    <td style={{ padding: "0.5rem", textAlign: "center" }}>✓</td>
                    <td style={{ padding: "0.5rem", textAlign: "center" }}>✓</td>
                    <td style={{ padding: "0.5rem", textAlign: "center" }}>✓</td>
                    <td style={{ padding: "0.5rem", textAlign: "center" }}>✓</td>
                  </tr>
                  <tr style={{ borderBottom: "1px solid #ddd" }}>
                    <td style={{ padding: "0.5rem" }}>Model E</td>
                    <td style={{ padding: "0.5rem", textAlign: "center" }}>✓</td>
                    <td style={{ padding: "0.5rem", textAlign: "center" }}>✓</td>
                    <td style={{ padding: "0.5rem", textAlign: "center" }}>✓</td>
                    <td style={{ padding: "0.5rem", textAlign: "center" }}>✓</td>
                  </tr>
                  <tr style={{ borderBottom: "1px solid #ddd" }}>
                    <td style={{ padding: "0.5rem" }}>Model D</td>
                    <td style={{ padding: "0.5rem", textAlign: "center" }}>—</td>
                    <td style={{ padding: "0.5rem", textAlign: "center" }}>✓</td>
                    <td style={{ padding: "0.5rem", textAlign: "center" }}>✓</td>
                    <td style={{ padding: "0.5rem", textAlign: "center" }}>✓</td>
                  </tr>
                  <tr style={{ borderBottom: "1px solid #ddd" }}>
                    <td style={{ padding: "0.5rem" }}>Model C</td>
                    <td style={{ padding: "0.5rem", textAlign: "center" }}>—</td>
                    <td style={{ padding: "0.5rem", textAlign: "center" }}>—</td>
                    <td style={{ padding: "0.5rem", textAlign: "center" }}>✓</td>
                    <td style={{ padding: "0.5rem", textAlign: "center" }}>✓</td>
                  </tr>
                  <tr style={{ borderBottom: "1px solid #ddd" }}>
                    <td style={{ padding: "0.5rem" }}>Model B</td>
                    <td style={{ padding: "0.5rem", textAlign: "center" }}>—</td>
                    <td style={{ padding: "0.5rem", textAlign: "center" }}>—</td>
                    <td style={{ padding: "0.5rem", textAlign: "center" }}>✓</td>
                    <td style={{ padding: "0.5rem", textAlign: "center" }}>✓</td>
                  </tr>
                  <tr>
                    <td style={{ padding: "0.5rem" }}>Model A</td>
                    <td style={{ padding: "0.5rem", textAlign: "center" }}>—</td>
                    <td style={{ padding: "0.5rem", textAlign: "center" }}>—</td>
                    <td style={{ padding: "0.5rem", textAlign: "center" }}>—</td>
                    <td style={{ padding: "0.5rem", textAlign: "center" }}>✓</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <p
              className="text-justify mb-4"
              style={{
                textAlign: "justify",
                hyphens: "auto",
                margin: "1rem 0 0.9rem",
                fontSize: "0.9rem",
                fontStyle: "italic",
              }}
            >
              Note: All ships must be equipped with required transponders for their airspace class. Class 0-1 requires
              killswitch transponders. Class 2-3 requires both killswitch and killstake transponders.
            </p>
          </section>

          {/* Section 5 - Station Types */}
          <section className="mb-8 page-break-before">
            <h2
              className="font-bold mb-4"
              style={{
                fontSize: "1.15rem",
                fontWeight: "700",
                marginTop: "2.5rem",
                marginBottom: "1rem",
                fontFamily: '"Times New Roman", serif',
                color: "#000",
              }}
            >
              5&nbsp;&nbsp;&nbsp;&nbsp;Station Types and Airspace Classification
            </h2>

            <p
              className="text-justify mb-4"
              style={{
                textAlign: "justify",
                hyphens: "auto",
                margin: "0 0 0.9rem",
              }}
            >
              Sector stations evolve through six distinct base types, each representing increased infrastructure
              capabilities and improved airspace classification. Stations begin as bare-bones satellite relays (Base 1,
              Class 0) and can be upgraded to fully operational extraction hubs (Base 6, Class 3) through progressive
              contract deployments and the crowdsale system.
            </p>

            <h3
              className="font-bold mb-4"
              style={{
                fontSize: "1.05rem",
                fontWeight: "600",
                marginTop: "2rem",
                marginBottom: "1rem",
                fontFamily: '"Times New Roman", serif',
                color: "#000",
              }}
            >
              5.1 Base Progression System
            </h3>

            <div style={{ marginBottom: "2rem" }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                  gap: "1.5rem",
                  margin: "2rem 0",
                }}
              >
                {/* Base 1 */}
                <div
                  style={{
                    textAlign: "center",
                    padding: "1rem",
                    border: "1px solid #333",
                    backgroundColor: "#000",
                    backgroundImage:
                      "radial-gradient(1px 1px at 24% 32%, white, transparent), radial-gradient(1px 1px at 64% 68%, white, transparent), radial-gradient(1px 1px at 44% 52%, white, transparent), radial-gradient(1px 1px at 84% 14%, white, transparent), radial-gradient(1px 1px at 18% 78%, white, transparent), radial-gradient(1px 1px at 74% 88%, white, transparent), radial-gradient(1px 1px at 34% 18%, white, transparent), radial-gradient(1px 1px at 54% 42%, white, transparent), radial-gradient(1px 1px at 8% 58%, white, transparent), radial-gradient(1px 1px at 92% 28%, white, transparent), radial-gradient(1px 1px at 38% 72%, white, transparent), radial-gradient(1px 1px at 78% 8%, white, transparent), radial-gradient(1px 1px at 14% 22%, white, transparent), radial-gradient(1px 1px at 68% 92%, white, transparent), radial-gradient(1px 1px at 88% 48%, white, transparent), radial-gradient(1px 1px at 28% 62%, white, transparent), radial-gradient(1px 1px at 58% 5%, white, transparent), radial-gradient(1px 1px at 95% 75%, white, transparent), radial-gradient(1px 1px at 5% 35%, white, transparent), radial-gradient(1px 1px at 48% 85%, white, transparent)",
                    backgroundSize: "100% 100%",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Image src="/bases/base1.png" alt="Base Type 1" width={120} height={120} />
                  <h4 style={{ fontWeight: "600", margin: "0.5rem 0", fontSize: "0.95rem", color: "#fff" }}>Base 1</h4>
                  <p style={{ fontSize: "0.85rem", margin: "0.25rem 0", color: "#ccc" }}>Satellite Relay</p>
                  <p style={{ fontSize: "0.8rem", opacity: 0.6, color: "#999" }}>Class 0 Airspace</p>
                  <p style={{ fontSize: "0.75rem", margin: "0.5rem 0 0", color: "#aaa" }}>Models E, F only</p>
                </div>

                {/* Base 2 */}
                <div
                  style={{
                    textAlign: "center",
                    padding: "1rem",
                    border: "1px solid #333",
                    backgroundColor: "#000",
                    backgroundImage:
                      "radial-gradient(1px 1px at 36% 44%, white, transparent), radial-gradient(1px 1px at 66% 24%, white, transparent), radial-gradient(1px 1px at 16% 64%, white, transparent), radial-gradient(1px 1px at 86% 84%, white, transparent), radial-gradient(1px 1px at 26% 8%, white, transparent), radial-gradient(1px 1px at 56% 92%, white, transparent), radial-gradient(1px 1px at 92% 48%, white, transparent), radial-gradient(1px 1px at 46% 28%, white, transparent), radial-gradient(1px 1px at 12% 72%, white, transparent), radial-gradient(1px 1px at 78% 58%, white, transparent), radial-gradient(1px 1px at 72% 12%, white, transparent), radial-gradient(1px 1px at 8% 38%, white, transparent), radial-gradient(1px 1px at 88% 78%, white, transparent), radial-gradient(1px 1px at 32% 88%, white, transparent), radial-gradient(1px 1px at 62% 68%, white, transparent), radial-gradient(1px 1px at 95% 22%, white, transparent), radial-gradient(1px 1px at 22% 52%, white, transparent), radial-gradient(1px 1px at 52% 5%, white, transparent), radial-gradient(1px 1px at 5% 85%, white, transparent), radial-gradient(1px 1px at 82% 32%, white, transparent)",
                    backgroundSize: "100% 100%",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Image src="/bases/base2.png" alt="Base Type 2" width={120} height={120} />
                  <h4 style={{ fontWeight: "600", margin: "0.5rem 0", fontSize: "0.95rem", color: "#fff" }}>Base 2</h4>
                  <p style={{ fontSize: "0.85rem", margin: "0.25rem 0", color: "#ccc" }}>Basic Station</p>
                  <p style={{ fontSize: "0.8rem", opacity: 0.6, color: "#999" }}>Class 1 Airspace</p>
                  <p style={{ fontSize: "0.75rem", margin: "0.5rem 0 0", color: "#aaa" }}>Models D, E, F</p>
                </div>

                {/* Base 3 */}
                <div
                  style={{
                    textAlign: "center",
                    padding: "1rem",
                    border: "1px solid #333",
                    backgroundColor: "#000",
                    backgroundImage:
                      "radial-gradient(1px 1px at 42% 38%, white, transparent), radial-gradient(1px 1px at 58% 62%, white, transparent), radial-gradient(1px 1px at 32% 72%, white, transparent), radial-gradient(1px 1px at 72% 18%, white, transparent), radial-gradient(1px 1px at 12% 42%, white, transparent), radial-gradient(1px 1px at 88% 82%, white, transparent), radial-gradient(1px 1px at 48% 12%, white, transparent), radial-gradient(1px 1px at 22% 58%, white, transparent), radial-gradient(1px 1px at 78% 28%, white, transparent), radial-gradient(1px 1px at 8% 78%, white, transparent), radial-gradient(1px 1px at 92% 52%, white, transparent), radial-gradient(1px 1px at 52% 88%, white, transparent), radial-gradient(1px 1px at 68% 8%, white, transparent), radial-gradient(1px 1px at 18% 32%, white, transparent), radial-gradient(1px 1px at 82% 68%, white, transparent), radial-gradient(1px 1px at 38% 5%, white, transparent), radial-gradient(1px 1px at 62% 92%, white, transparent), radial-gradient(1px 1px at 28% 85%, white, transparent), radial-gradient(1px 1px at 95% 15%, white, transparent), radial-gradient(1px 1px at 5% 68%, white, transparent)",
                    backgroundSize: "100% 100%",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Image src="/bases/base3.png" alt="Base Type 3" width={120} height={120} />
                  <h4 style={{ fontWeight: "600", margin: "0.5rem 0", fontSize: "0.95rem", color: "#fff" }}>Base 3</h4>
                  <p style={{ fontSize: "0.85rem", margin: "0.25rem 0", color: "#ccc" }}>Enhanced Station</p>
                  <p style={{ fontSize: "0.8rem", opacity: 0.6, color: "#999" }}>Class 1 Airspace</p>
                  <p style={{ fontSize: "0.75rem", margin: "0.5rem 0 0", color: "#aaa" }}>Models D, E, F</p>
                </div>

                {/* Base 4 */}
                <div
                  style={{
                    textAlign: "center",
                    padding: "1rem",
                    border: "1px solid #333",
                    backgroundColor: "#000",
                    backgroundImage:
                      "radial-gradient(1px 1px at 28% 58%, white, transparent), radial-gradient(1px 1px at 78% 38%, white, transparent), radial-gradient(1px 1px at 52% 18%, white, transparent), radial-gradient(1px 1px at 8% 88%, white, transparent), radial-gradient(1px 1px at 92% 28%, white, transparent), radial-gradient(1px 1px at 38% 78%, white, transparent), radial-gradient(1px 1px at 68% 68%, white, transparent), radial-gradient(1px 1px at 18% 12%, white, transparent), radial-gradient(1px 1px at 82% 92%, white, transparent), radial-gradient(1px 1px at 42% 48%, white, transparent), radial-gradient(1px 1px at 72% 8%, white, transparent), radial-gradient(1px 1px at 12% 68%, white, transparent), radial-gradient(1px 1px at 88% 52%, white, transparent), radial-gradient(1px 1px at 32% 32%, white, transparent), radial-gradient(1px 1px at 62% 82%, white, transparent), radial-gradient(1px 1px at 22% 75%, white, transparent), radial-gradient(1px 1px at 95% 42%, white, transparent), radial-gradient(1px 1px at 5% 22%, white, transparent), radial-gradient(1px 1px at 58% 95%, white, transparent), radial-gradient(1px 1px at 85% 5%, white, transparent)",
                    backgroundSize: "100% 100%",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Image src="/bases/base4.png" alt="Base Type 4" width={120} height={120} />
                  <h4 style={{ fontWeight: "600", margin: "0.5rem 0", fontSize: "0.95rem", color: "#fff" }}>Base 4</h4>
                  <p style={{ fontSize: "0.85rem", margin: "0.25rem 0", color: "#ccc" }}>Advanced Station</p>
                  <p style={{ fontSize: "0.8rem", opacity: 0.6, color: "#999" }}>Class 2 Airspace</p>
                  <p style={{ fontSize: "0.75rem", margin: "0.5rem 0 0", color: "#aaa" }}>Models B-F</p>
                </div>

                {/* Base 5 */}
                <div
                  style={{
                    textAlign: "center",
                    padding: "1rem",
                    border: "1px solid #333",
                    backgroundColor: "#000",
                    backgroundImage:
                      "radial-gradient(1px 1px at 46% 28%, white, transparent), radial-gradient(1px 1px at 82% 72%, white, transparent), radial-gradient(1px 1px at 22% 48%, white, transparent), radial-gradient(1px 1px at 58% 82%, white, transparent), radial-gradient(1px 1px at 14% 14%, white, transparent), radial-gradient(1px 1px at 92% 42%, white, transparent), radial-gradient(1px 1px at 38% 92%, white, transparent), radial-gradient(1px 1px at 68% 18%, white, transparent), radial-gradient(1px 1px at 8% 62%, white, transparent), radial-gradient(1px 1px at 88% 8%, white, transparent), radial-gradient(1px 1px at 32% 58%, white, transparent), radial-gradient(1px 1px at 72% 88%, white, transparent), radial-gradient(1px 1px at 52% 32%, white, transparent), radial-gradient(1px 1px at 18% 85%, white, transparent), radial-gradient(1px 1px at 78% 52%, white, transparent), radial-gradient(1px 1px at 42% 5%, white, transparent), radial-gradient(1px 1px at 95% 68%, white, transparent), radial-gradient(1px 1px at 25% 38%, white, transparent), radial-gradient(1px 1px at 62% 75%, white, transparent), radial-gradient(1px 1px at 5% 95%, white, transparent)",
                    backgroundSize: "100% 100%",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Image src="/bases/base5.png" alt="Base Type 5" width={120} height={120} />
                  <h4 style={{ fontWeight: "600", margin: "0.5rem 0", fontSize: "0.95rem", color: "#fff" }}>Base 5</h4>
                  <p style={{ fontSize: "0.85rem", margin: "0.25rem 0", color: "#ccc" }}>Industrial Complex</p>
                  <p style={{ fontSize: "0.8rem", opacity: 0.6, color: "#999" }}>Class 2 Airspace</p>
                  <p style={{ fontSize: "0.75rem", margin: "0.5rem 0 0", color: "#aaa" }}>Models B-F</p>
                </div>

                {/* Base 6 */}
                <div
                  style={{
                    textAlign: "center",
                    padding: "1rem",
                    border: "1px solid #333",
                    backgroundColor: "#000",
                    backgroundImage:
                      "radial-gradient(1px 1px at 54% 46%, white, transparent), radial-gradient(1px 1px at 26% 76%, white, transparent), radial-gradient(1px 1px at 76% 26%, white, transparent), radial-gradient(1px 1px at 16% 16%, white, transparent), radial-gradient(1px 1px at 86% 56%, white, transparent), radial-gradient(1px 1px at 62% 86%, white, transparent), radial-gradient(1px 1px at 32% 58%, white, transparent), radial-gradient(1px 1px at 72% 38%, white, transparent), radial-gradient(1px 1px at 8% 28%, white, transparent), radial-gradient(1px 1px at 92% 68%, white, transparent), radial-gradient(1px 1px at 42% 12%, white, transparent), radial-gradient(1px 1px at 68% 92%, white, transparent), radial-gradient(1px 1px at 22% 42%, white, transparent), radial-gradient(1px 1px at 82% 8%, white, transparent), radial-gradient(1px 1px at 48% 72%, white, transparent), radial-gradient(1px 1px at 12% 88%, white, transparent), radial-gradient(1px 1px at 88% 18%, white, transparent), radial-gradient(1px 1px at 38% 65%, white, transparent), radial-gradient(1px 1px at 95% 82%, white, transparent), radial-gradient(1px 1px at 5% 52%, white, transparent)",
                    backgroundSize: "100% 100%",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Image src="/bases/base6.png" alt="Base Type 6" width={120} height={120} />
                  <h4 style={{ fontWeight: "600", margin: "0.5rem 0", fontSize: "0.95rem", color: "#fff" }}>Base 6</h4>
                  <p style={{ fontSize: "0.85rem", margin: "0.25rem 0", color: "#ccc" }}>Processing Hub</p>
                  <p style={{ fontSize: "0.8rem", opacity: 0.6, color: "#999" }}>Class 3 Airspace</p>
                  <p style={{ fontSize: "0.75rem", margin: "0.5rem 0 0", color: "#aaa" }}>All Models A-F</p>
                </div>
              </div>
            </div>

            <h3
              className="font-bold mb-4"
              style={{
                fontSize: "1.05rem",
                fontWeight: "600",
                marginTop: "2rem",
                marginBottom: "1rem",
                fontFamily: '"Times New Roman", serif',
                color: "#000",
              }}
            >
              5.2 Airspace Classification Details
            </h3>

            <p
              className="text-justify mb-4"
              style={{
                textAlign: "justify",
                hyphens: "auto",
                margin: "0 0 0.9rem",
              }}
            >
              <strong>Class 0 Airspace (Base 1):</strong> The most dangerous classification. Sectors begin with Class 0
              designation immediately after broadcasting. Infrastructure is minimal—just a bare satellite relay
              broadcasting telemetry data. Only the most rugged vessels (Models E and F) can safely navigate these
              conditions. All pilots require killswitch transponders that broadcast death signals when eliminated.
            </p>

            <p
              className="text-justify mb-4"
              style={{
                textAlign: "justify",
                hyphens: "auto",
                margin: "0 0 0.9rem",
              }}
            >
              <strong>Class 1 Airspace (Bases 2-3):</strong> Achieved by deploying and auditing a credential system
              (Chapter 3). Class 1 sectors have established access control infrastructure, allowing medium-sized vessels
              (Model D) to safely enter alongside the larger E and F models. This significantly expands the pilot pool
              while maintaining security through credential requirements.
            </p>

            <p
              className="text-justify mb-4"
              style={{
                textAlign: "justify",
                hyphens: "auto",
                margin: "0 0 0.9rem",
              }}
            >
              <strong>Class 2 Airspace (Bases 4-5):</strong> Attained by deploying and auditing a staking system
              (Chapter 4). Class 2 sectors implement financial deterrents against hostile actions through 10k credit
              stakes. This improved security allows smaller commercial vessels (Models B and C) to operate safely. All
              ships must now equip both killswitch and killstake transponders.
            </p>

            <p
              className="text-justify mb-4"
              style={{
                textAlign: "justify",
                hyphens: "auto",
                margin: "0 0 0.9rem",
              }}
            >
              <strong>Class 3 Airspace (Base 6):</strong> The highest classification, achieved by completing the
              crowdsale station upgrade (Chapter 5). Class 3 sectors possess full asteroid processing capabilities and
              advanced infrastructure. Even the smallest scout ships (Model A) can safely navigate these fully developed
              sectors. This maximizes pilot traffic and economic opportunities while maintaining security through
              comprehensive transponder requirements and staking mechanisms.
            </p>

            <h3
              className="font-bold mb-4"
              style={{
                fontSize: "1.05rem",
                fontWeight: "600",
                marginTop: "2rem",
                marginBottom: "1rem",
                fontFamily: '"Times New Roman", serif',
                color: "#000",
              }}
            >
              5.3 Upgrade Mechanics
            </h3>

            <p
              className="text-justify mb-4"
              style={{
                textAlign: "justify",
                hyphens: "auto",
                margin: "0 0 0.9rem",
              }}
            >
              Station upgrades from Base 1-3 occur automatically as players deploy and audit required contracts for each
              chapter. The progression is: Base 1 (initial broadcast) → Base 2 (credential system audited) → Base 3-4
              (staking system audited). The final upgrade to Base 6 requires completing the crowdsale, raising 50,000
              credits through fuel token sales, and having a pilot trigger the upgrade function.
            </p>

            <p
              className="text-justify mb-4"
              style={{
                textAlign: "justify",
                hyphens: "auto",
                margin: "0 0 0.9rem",
              }}
            >
              Base types are stored in the Game contract&apos;s <code>sectorBaseType</code> mapping and can be queried
              via <code>getSectorBaseType(sectorId)</code>. The GameServer monitors these values to render the
              appropriate station visuals and determine airspace classification for pilot entry decisions.
            </p>
          </section>

          {/* Section 6 - Core Smart Contracts */}
          <section className="mb-8">
            <h2
              className="font-bold mb-4"
              style={{
                fontSize: "1.15rem",
                fontWeight: "700",
                marginTop: "2.5rem",
                marginBottom: "1rem",
                fontFamily: '"Times New Roman", serif',
                color: "#000",
              }}
            >
              6&nbsp;&nbsp;&nbsp;&nbsp;Core Smart Contracts
            </h2>

            <p
              className="text-justify mb-4"
              style={{
                textAlign: "justify",
                hyphens: "auto",
                margin: "0 0 0.9rem",
              }}
            >
              The Extract Protocol consists of five core smart contracts that work together to manage game state, sector
              registration, entropy, auditing, and the credit economy. This section provides detailed technical
              documentation of each contract&apos;s purpose, architecture, and key functions.
            </p>

            {/* MaxExtract Contract */}
            <h3
              className="font-bold mb-4"
              style={{
                fontSize: "1.05rem",
                fontWeight: "600",
                marginTop: "2rem",
                marginBottom: "1rem",
                fontFamily: '"Times New Roman", serif',
                color: "#000",
              }}
            >
              6.1 MaxExtract Contract
            </h3>

            <p
              className="text-justify mb-4"
              style={{
                textAlign: "justify",
                hyphens: "auto",
                margin: "0 0 0.9rem",
              }}
            >
              The MaxExtract contract serves as the canonical Extract Protocol registry. It maintains the authoritative
              mapping of sector IDs to registry contracts, enforces the one-player-one-sector rule, and handles staking
              and slashing mechanics for Chapter 4 implementations.
            </p>

            <p
              className="text-justify mb-4"
              style={{
                textAlign: "justify",
                hyphens: "auto",
                margin: "0 0 0.9rem",
              }}
            >
              <strong>Key State Variables:</strong>
            </p>
            <ul style={{ marginLeft: "2rem", marginBottom: "1rem" }}>
              <li style={{ marginBottom: "0.5rem" }}>
                <code>mapping(uint256 =&gt; address) public sectors</code> - Maps sector IDs to registry addresses
              </li>
              <li style={{ marginBottom: "0.5rem" }}>
                <code>uint256[] public activeSectors</code> - Array of all claimed sector IDs
              </li>
              <li style={{ marginBottom: "0.5rem" }}>
                <code>mapping(address =&gt; bool) public playerHasBroadcast</code> - Tracks which players have broadcast
              </li>
              <li style={{ marginBottom: "0.5rem" }}>
                <code>mapping(address =&gt; uint256) public playerToSector</code> - Maps players to their sector IDs
              </li>
              <li style={{ marginBottom: "0.5rem" }}>
                <code>mapping(uint256 =&gt; address) public sectorToOwner</code> - Maps sector IDs to owner addresses
              </li>
              <li style={{ marginBottom: "0.5rem" }}>
                <code>mapping(address =&gt; uint256) public stakedBalance</code> - Tracks pilot staked credit balances
              </li>
            </ul>

            <p
              className="text-justify mb-4"
              style={{
                textAlign: "justify",
                hyphens: "auto",
                margin: "0 0 0.9rem",
              }}
            >
              <strong>Primary Functions:</strong>
            </p>

            <div style={{ marginBottom: "1.5rem", fontSize: "0.9rem", fontFamily: "monospace" }}>
              <p style={{ marginBottom: "0.5rem" }}>
                <code>function broadcast() external returns (uint256 sectorId)</code>
              </p>
              <p style={{ marginLeft: "1rem", fontSize: "0.85rem", marginBottom: "1rem" }}>
                Registers a new sector in the protocol. Must be called from a contract (not EOA). Generates a unique
                sector ID using universe entropy and returns it. Enforces one-player-one-sector rule. Requires Chapter 1
                to be visible.
              </p>

              <p style={{ marginBottom: "0.5rem" }}>
                <code>function updateRegistry() external returns (uint256 sectorId)</code>
              </p>
              <p style={{ marginLeft: "1rem", fontSize: "0.85rem", marginBottom: "1rem" }}>
                Updates the registry contract for an existing sector. Allows players to redeploy improved registry
                implementations without losing sector ownership. Must be called from the new registry contract.
              </p>

              <p style={{ marginBottom: "0.5rem" }}>
                <code>function stake(uint256 sectorId) external</code>
              </p>
              <p style={{ marginLeft: "1rem", fontSize: "0.85rem", marginBottom: "1rem" }}>
                Allows pilots to stake 10,000 credits to enter a sector with an audited stake module. Transfers credits
                from pilot to MaxExtract, increments staked balance, and calls activate() on the stake contract.
              </p>

              <p style={{ marginBottom: "0.5rem" }}>
                <code>function unstake(uint256 sectorId) external</code>
              </p>
              <p style={{ marginLeft: "1rem", fontSize: "0.85rem", marginBottom: "1rem" }}>
                Returns staked credits when pilot exits normally. Decrements staked balance, transfers 10k credits back
                to pilot, and calls deactivate() on the stake contract.
              </p>

              <p style={{ marginBottom: "0.5rem" }}>
                <code>function slash(address killer, uint256 sectorId) external</code>
              </p>
              <p style={{ marginLeft: "1rem", fontSize: "0.85rem", marginBottom: "1rem" }}>
                Slashes a killer&apos;s entire staked balance. Only callable by audited stake contracts. Permanently
                burns the slashed credits, preventing the 10-point penalty to the sector owner.
              </p>
            </div>

            <p
              className="text-justify mb-4"
              style={{
                textAlign: "justify",
                hyphens: "auto",
                margin: "0 0 0.9rem",
              }}
            >
              <strong>Events:</strong>
            </p>
            <ul style={{ marginLeft: "2rem", marginBottom: "1rem", fontSize: "0.9rem" }}>
              <li style={{ marginBottom: "0.5rem" }}>
                <code>SectorBroadcast(uint256 indexed sectorId, address registry, address indexed player)</code>
              </li>
              <li style={{ marginBottom: "0.5rem" }}>
                <code>
                  RegistryUpdated(uint256 indexed sectorId, address oldRegistry, address newRegistry, address indexed
                  player)
                </code>
              </li>
              <li style={{ marginBottom: "0.5rem" }}>
                <code>PilotStaked(address indexed pilot, uint256 indexed sectorId, uint256 amount)</code>
              </li>
              <li style={{ marginBottom: "0.5rem" }}>
                <code>PilotSlashed(address indexed killer, uint256 indexed sectorId, uint256 amount)</code>
              </li>
            </ul>

            {/* Game Contract */}
            <h3
              className="font-bold mb-4"
              style={{
                fontSize: "1.05rem",
                fontWeight: "600",
                marginTop: "2rem",
                marginBottom: "1rem",
                fontFamily: '"Times New Roman", serif',
                color: "#000",
              }}
            >
              6.2 Game Contract
            </h3>

            <p
              className="text-justify mb-4"
              style={{
                textAlign: "justify",
                hyphens: "auto",
                margin: "0 0 0.9rem",
              }}
            >
              The Game contract manages game sessions, player buy-ins, chapter visibility, scoring, and settlement. It
              tracks both players (programmers who deploy sectors) and pilots (autonomous agents who navigate sectors),
              maintaining separate registries and death tracking.
            </p>

            <p
              className="text-justify mb-4"
              style={{
                textAlign: "justify",
                hyphens: "auto",
                margin: "0 0 0.9rem",
              }}
            >
              <strong>Key State Variables:</strong>
            </p>
            <ul style={{ marginLeft: "2rem", marginBottom: "1rem" }}>
              <li style={{ marginBottom: "0.5rem" }}>
                <code>uint8[] public visibleChapters</code> - Array of chapter numbers currently visible
              </li>
              <li style={{ marginBottom: "0.5rem" }}>
                <code>address[] public players</code> - All players who have bought in
              </li>
              <li style={{ marginBottom: "0.5rem" }}>
                <code>address[] public pilots</code> - All pilot agents added by GOD
              </li>
              <li style={{ marginBottom: "0.5rem" }}>
                <code>mapping(address =&gt; uint256) public scores</code> - Player point scores
              </li>
              <li style={{ marginBottom: "0.5rem" }}>
                <code>mapping(address =&gt; bool) public deadPilots</code> - Tracks pilot death status
              </li>
              <li style={{ marginBottom: "0.5rem" }}>
                <code>mapping(uint256 =&gt; uint8) public sectorBaseType</code> - Station types (1-6)
              </li>
            </ul>

            <p
              className="text-justify mb-4"
              style={{
                textAlign: "justify",
                hyphens: "auto",
                margin: "0 0 0.9rem",
              }}
            >
              <strong>Primary Functions:</strong>
            </p>

            <div style={{ marginBottom: "1.5rem", fontSize: "0.9rem", fontFamily: "monospace" }}>
              <p style={{ marginBottom: "0.5rem" }}>
                <code>function buyIn() external payable</code>
              </p>
              <p style={{ marginLeft: "1rem", fontSize: "0.85rem", marginBottom: "1rem" }}>
                Players call this with 0.000001 ETH to join the game. Awards 10 starting points. Can only buy in once.
                Only available when game state is Open.
              </p>

              <p style={{ marginBottom: "0.5rem" }}>
                <code>function showChapters(uint8[] calldata _chapters) external</code>
              </p>
              <p style={{ marginLeft: "1rem", fontSize: "0.85rem", marginBottom: "1rem" }}>
                GOD-only function to make specific chapters visible. Controls progression and feature unlocks across the
                entire protocol.
              </p>

              <p style={{ marginBottom: "0.5rem" }}>
                <code>function pilotMintSectorCredential(uint256 _sectorId) external</code>
              </p>
              <p style={{ marginLeft: "1rem", fontSize: "0.85rem", marginBottom: "1rem" }}>
                Called by credential contracts when pilots mint. Performs extensive verification: checks tx.origin is
                pilot, verifies msg.sender is the registered credential contract, ensures pilot hasn&apos;t already
                minted from this player. Awards 2 points if all checks pass.
              </p>

              <p style={{ marginBottom: "0.5rem" }}>
                <code>function upgradeStation(uint256 _sectorId) external</code>
              </p>
              <p style={{ marginLeft: "1rem", fontSize: "0.85rem", marginBottom: "1rem" }}>
                Called by fuel contracts when pilots trigger crowdsale upgrade. Verifies tx.origin is pilot, pulls
                49,500 credits from fuel contract, awards 10 points to player, increments sector base type.
              </p>

              <p style={{ marginBottom: "0.5rem" }}>
                <code>function deadMansSwitch(address _killer, address _playerToPenalize) external</code>
              </p>
              <p style={{ marginLeft: "1rem", fontSize: "0.85rem", marginBottom: "1rem" }}>
                Called by pilots when killed. Marks pilot as dead, applies 10-point penalty to sector owner. Used in
                Class 0-1 sectors without stake contracts.
              </p>

              <p style={{ marginBottom: "0.5rem" }}>
                <code>function deadMansSlash(address _killer, address _playerToPenalize) external</code>
              </p>
              <p style={{ marginLeft: "1rem", fontSize: "0.85rem", marginBottom: "1rem" }}>
                Called by pilots when killed in sectors with audited stake contracts. Verifies stake contract, calls
                slash(), confirms stake was burned, marks pilot as dead. No penalty if slashing succeeds.
              </p>

              <p style={{ marginBottom: "0.5rem" }}>
                <code>function settleGame() external</code>
              </p>
              <p style={{ marginLeft: "1rem", fontSize: "0.85rem", marginBottom: "1rem" }}>
                Can be called by anyone after game end time. Finds highest score, identifies all winners, splits pot
                equally among winners, changes state to Settled.
              </p>
            </div>

            {/* Universe Contract */}
            <h3
              className="font-bold mb-4"
              style={{
                fontSize: "1.05rem",
                fontWeight: "600",
                marginTop: "2rem",
                marginBottom: "1rem",
                fontFamily: '"Times New Roman", serif',
                color: "#000",
              }}
            >
              6.3 Universe Contract
            </h3>

            <p
              className="text-justify mb-4"
              style={{
                textAlign: "justify",
                hyphens: "auto",
                margin: "0 0 0.9rem",
              }}
            >
              The Universe contract generates and manages entropy for the entire protocol. It implements a commit-reveal
              scheme for secure, verifiable randomness that cannot be manipulated by any party including the GOD
              address.
            </p>

            <p
              className="text-justify mb-4"
              style={{
                textAlign: "justify",
                hyphens: "auto",
                margin: "0 0 0.9rem",
              }}
            >
              <strong>Key State Variables:</strong>
            </p>
            <ul style={{ marginLeft: "2rem", marginBottom: "1rem" }}>
              <li style={{ marginBottom: "0.5rem" }}>
                <code>bytes32 public entropy</code> - Initial universe entropy
              </li>
              <li style={{ marginBottom: "0.5rem" }}>
                <code>bytes32 public rollingEntropy</code> - Continuously updated entropy
              </li>
              <li style={{ marginBottom: "0.5rem" }}>
                <code>bytes32 public commitmentHash</code> - Current commitment for verification
              </li>
              <li style={{ marginBottom: "0.5rem" }}>
                <code>uint256 public roundNumber</code> - Current rolling entropy round
              </li>
            </ul>

            <p
              className="text-justify mb-4"
              style={{
                textAlign: "justify",
                hyphens: "auto",
                margin: "0 0 0.9rem",
              }}
            >
              <strong>Primary Functions:</strong>
            </p>

            <div style={{ marginBottom: "1.5rem", fontSize: "0.9rem", fontFamily: "monospace" }}>
              <p style={{ marginBottom: "0.5rem" }}>
                <code>function commit(bytes32 _commitmentHash) external</code>
              </p>
              <p style={{ marginLeft: "1rem", fontSize: "0.85rem", marginBottom: "1rem" }}>
                GOD commits to a secret random number by submitting keccak256(randomNumber). Stores the commitment and
                current block number.
              </p>

              <p style={{ marginBottom: "0.5rem" }}>
                <code>function reveal(uint256 randomNumber) external</code>
              </p>
              <p style={{ marginLeft: "1rem", fontSize: "0.85rem", marginBottom: "1rem" }}>
                GOD reveals the random number. Contract verifies it matches the commitment, then generates final entropy
                by combining randomNumber with the commit block hash.
              </p>

              <p style={{ marginBottom: "0.5rem" }}>
                <code>function rollingCommitReveal(bytes32 nextCommit, uint256 revealNumber) external</code>
              </p>
              <p style={{ marginLeft: "1rem", fontSize: "0.85rem", marginBottom: "1rem" }}>
                GOD simultaneously commits to next round while revealing current round. Updates rollingEntropy by
                combining reveal, block hash, and previous entropy. This creates synchronized randomness updates across
                all sectors.
              </p>
            </div>

            {/* Auditor Contract */}
            <h3
              className="font-bold mb-4"
              style={{
                fontSize: "1.05rem",
                fontWeight: "600",
                marginTop: "2rem",
                marginBottom: "1rem",
                fontFamily: '"Times New Roman", serif',
                color: "#000",
              }}
            >
              6.4 Auditor Contract
            </h3>

            <p
              className="text-justify mb-4"
              style={{
                textAlign: "justify",
                hyphens: "auto",
                margin: "0 0 0.9rem",
              }}
            >
              The Auditor contract manages the official audit system. Players submit contracts for verification,
              spending 2 points per audit. An authorized AI auditor system analyzes the source code and marks contracts
              as audited for specific chapters.
            </p>

            <p
              className="text-justify mb-4"
              style={{
                textAlign: "justify",
                hyphens: "auto",
                margin: "0 0 0.9rem",
              }}
            >
              <strong>Key State Variables:</strong>
            </p>
            <ul style={{ marginLeft: "2rem", marginBottom: "1rem" }}>
              <li style={{ marginBottom: "0.5rem" }}>
                <code>AuditRequest[] public auditRequests</code> - Array of all audit submissions
              </li>
              <li style={{ marginBottom: "0.5rem" }}>
                <code>mapping(address =&gt; uint8) public isAudited</code> - Maps contracts to audited chapter (0 = not
                audited)
              </li>
              <li style={{ marginBottom: "0.5rem" }}>
                <code>address public immutable AUDITOR_ADDRESS</code> - Authorized auditor bot address
              </li>
            </ul>

            <p
              className="text-justify mb-4"
              style={{
                textAlign: "justify",
                hyphens: "auto",
                margin: "0 0 0.9rem",
              }}
            >
              <strong>Primary Functions:</strong>
            </p>

            <div style={{ marginBottom: "1.5rem", fontSize: "0.9rem", fontFamily: "monospace" }}>
              <p style={{ marginBottom: "0.5rem" }}>
                <code>function requestAudit(address _contract, uint8 _chapter, string calldata _url) external</code>
              </p>
              <p style={{ marginLeft: "1rem", fontSize: "0.85rem", marginBottom: "1rem" }}>
                Players call this to submit contracts for audit. Costs 2 points (deducted via Game.deductPoints).
                Creates AuditRequest with status Pending. If contract already audited for this chapter, returns early
                with event.
              </p>

              <p style={{ marginBottom: "0.5rem" }}>
                <code>function markAudited(uint256 _requestId) external</code>
              </p>
              <p style={{ marginLeft: "1rem", fontSize: "0.85rem", marginBottom: "1rem" }}>
                Called by authorized AUDITOR_ADDRESS after verifying source code. Updates audit status to Audited, sets
                isAudited mapping to chapter number. Emits AuditCompleted event.
              </p>

              <p style={{ marginBottom: "0.5rem" }}>
                <code>function markFailed(uint256 _requestId, string calldata _reason) external</code>
              </p>
              <p style={{ marginLeft: "1rem", fontSize: "0.85rem", marginBottom: "1rem" }}>
                Called by auditor if contract fails verification. Updates status to Failed, stores failure reason.
                Points are not refunded.
              </p>
            </div>

            {/* Credits Contract */}
            <h3
              className="font-bold mb-4"
              style={{
                fontSize: "1.05rem",
                fontWeight: "600",
                marginTop: "2rem",
                marginBottom: "1rem",
                fontFamily: '"Times New Roman", serif',
                color: "#000",
              }}
            >
              6.5 Credits Contract
            </h3>

            <p
              className="text-justify mb-4"
              style={{
                textAlign: "justify",
                hyphens: "auto",
                margin: "0 0 0.9rem",
              }}
            >
              The Credits contract is an ERC-20 token that serves as the universal currency of the Extract Protocol. It
              is used for staking, credential purchases, crowdsales, tips, and all economic activities within the
              protocol.
            </p>

            <p
              className="text-justify mb-4"
              style={{
                textAlign: "justify",
                hyphens: "auto",
                margin: "0 0 0.9rem",
              }}
            >
              <strong>Key Properties:</strong>
            </p>
            <ul style={{ marginLeft: "2rem", marginBottom: "1rem" }}>
              <li style={{ marginBottom: "0.5rem" }}>Name: &ldquo;Extract Credits&rdquo;</li>
              <li style={{ marginBottom: "0.5rem" }}>Symbol: &ldquo;CREDITS&rdquo;</li>
              <li style={{ marginBottom: "0.5rem" }}>Decimals: 18</li>
              <li style={{ marginBottom: "0.5rem" }}>Initial Supply: 100,000,000 tokens</li>
              <li style={{ marginBottom: "0.5rem" }}>Ownable: GOD can mint additional supply as needed</li>
            </ul>

            <p
              className="text-justify mb-4"
              style={{
                textAlign: "justify",
                hyphens: "auto",
                margin: "0 0 0.9rem",
              }}
            >
              <strong>Primary Functions:</strong>
            </p>

            <div style={{ marginBottom: "1.5rem", fontSize: "0.9rem", fontFamily: "monospace" }}>
              <p style={{ marginBottom: "0.5rem" }}>
                <code>function mint(address to, uint256 amount) external</code>
              </p>
              <p style={{ marginLeft: "1rem", fontSize: "0.85rem", marginBottom: "1rem" }}>
                Owner-only function to mint new credits. Used for pilot funding, rewards, and maintaining economy
                balance.
              </p>

              <p style={{ marginBottom: "0.5rem" }}>
                <code>function batchMint(address[] calldata recipients, uint256[] calldata amounts) external</code>
              </p>
              <p style={{ marginLeft: "1rem", fontSize: "0.85rem", marginBottom: "1rem" }}>
                Efficient batch minting for distributing credits to multiple pilots simultaneously.
              </p>

              <p style={{ marginBottom: "0.5rem" }}>
                <code>function burn(uint256 amount) external</code>
              </p>
              <p style={{ marginLeft: "1rem", fontSize: "0.85rem", marginBottom: "1rem" }}>
                Burns tokens from caller&apos;s balance. Used in fuel redemption and other burn mechanisms.
              </p>
            </div>

            <p
              className="text-justify mb-4"
              style={{
                textAlign: "justify",
                hyphens: "auto",
                margin: "0 0 0.9rem",
              }}
            >
              Beyond these five core contracts, players deploy their own sector-specific contracts (Registry,
              Announcement, Credential, Stake, Fuel/Crowdsale) that interact with the core contracts through
              well-defined interfaces.
            </p>
          </section>

          {/* Section 7 - Off-Chain Architecture */}
          <section className="mb-8">
            <h2
              className="font-bold mb-4"
              style={{
                fontSize: "1.15rem",
                fontWeight: "700",
                marginTop: "2.5rem",
                marginBottom: "1rem",
                fontFamily: '"Times New Roman", serif',
                color: "#000",
              }}
            >
              7&nbsp;&nbsp;&nbsp;&nbsp;Off-Chain Architecture
            </h2>

            <p
              className="text-justify mb-4"
              style={{
                textAlign: "justify",
                hyphens: "auto",
                margin: "0 0 0.9rem",
              }}
            >
              While the smart contracts enforce rules and record state on-chain, the Extract Protocol&apos;s off-chain
              infrastructure handles real-time sector simulation, pilot navigation, and game physics. This hybrid
              architecture enables trustless economic interactions while maintaining engaging gameplay.
            </p>

            <h3
              className="font-bold mb-4"
              style={{
                fontSize: "1.05rem",
                fontWeight: "600",
                marginTop: "2rem",
                marginBottom: "1rem",
                fontFamily: '"Times New Roman", serif',
                color: "#000",
              }}
            >
              7.1 GameServer Architecture
            </h3>

            <p
              className="text-justify mb-4"
              style={{
                textAlign: "justify",
                hyphens: "auto",
                margin: "0 0 0.9rem",
              }}
            >
              The GameServer is a TypeScript application built on Express that provides HTTP/HTTPS APIs and WebSocket
              connections for real-time updates. It coordinates multiple specialized managers that handle different
              aspects of the game infrastructure.
            </p>

            <p
              className="text-justify mb-4"
              style={{
                textAlign: "justify",
                hyphens: "auto",
                margin: "0 0 0.9rem",
              }}
            >
              <strong>BlockchainManager:</strong> Handles all blockchain interactions including contract deployments,
              transaction sending, and event monitoring. Maintains connections to the configured RPC endpoint and
              manages GOD account operations. Coordinates with EntropyManager for rolling entropy updates.
            </p>

            <p
              className="text-justify mb-4"
              style={{
                textAlign: "justify",
                hyphens: "auto",
                margin: "0 0 0.9rem",
              }}
            >
              <strong>EntropyManager:</strong> Coordinates rolling entropy generation with the Universe contract.
              Generates random numbers, creates commitments, and executes the commit-reveal process on a regular
              schedule. When entropy updates, all sectors receive fresh randomness simultaneously, creating synchronized
              &ldquo;openings&rdquo; where pilots can attempt sector entry.
            </p>

            <p
              className="text-justify mb-4"
              style={{
                textAlign: "justify",
                hyphens: "auto",
                margin: "0 0 0.9rem",
              }}
            >
              <strong>WebSocketManager:</strong> Manages WebSocket connections from frontend clients. Maintains a
              mapping of connections to subscribed sectors. When sector state changes, broadcasts updates to all
              subscribed clients. Handles connection lifecycle (connect, disconnect, error handling).
            </p>

            <p
              className="text-justify mb-4"
              style={{
                textAlign: "justify",
                hyphens: "auto",
                margin: "0 0 0.9rem",
              }}
            >
              <strong>CharacterManager:</strong> Generates procedural pilot names by combining random first names and
              last names from predefined lists. Ensures each pilot has a unique, memorable identity for frontend
              display.
            </p>

            <p
              className="text-justify mb-4"
              style={{
                textAlign: "justify",
                hyphens: "auto",
                margin: "0 0 0.9rem",
              }}
            >
              <strong>SimulationManager:</strong> Coordinates physics simulation across all active sectors. Manages
              asteroid spawning rates, ship movement calculations, collision detection, and mining mechanics. Operates
              on a fixed tick rate to ensure consistent behavior.
            </p>

            <p
              className="text-justify mb-4"
              style={{
                textAlign: "justify",
                hyphens: "auto",
                margin: "0 0 0.9rem",
              }}
            >
              <strong>GameCycleManager:</strong> Controls game rounds and timing. Monitors the Game contract&apos;s end
              time, triggers settlement when appropriate, and coordinates game state transitions. Manages the overall
              game lifecycle from Open to Active to Settled.
            </p>

            <p
              className="text-justify mb-4"
              style={{
                textAlign: "justify",
                hyphens: "auto",
                margin: "0 0 0.9rem",
              }}
            >
              <strong>CrowdsaleManager:</strong> Monitors fuel contract balances and crowdsale progress. Detects when
              sectors reach the 50k credit threshold and alerts pilots that upgrade is available. Tracks successful
              upgrades and coordinates with BaseUpgradeManager for station progression.
            </p>

            <p
              className="text-justify mb-4"
              style={{
                textAlign: "justify",
                hyphens: "auto",
                margin: "0 0 0.9rem",
              }}
            >
              <strong>BaseUpgradeManager:</strong> Monitors Game contract events for station upgrades. Queries
              sectorBaseType mapping to determine current station level. Updates sector configurations when base types
              change, adjusting visual representations and airspace classifications.
            </p>

            <h3
              className="font-bold mb-4"
              style={{
                fontSize: "1.05rem",
                fontWeight: "600",
                marginTop: "2rem",
                marginBottom: "1rem",
                fontFamily: '"Times New Roman", serif',
                color: "#000",
              }}
            >
              7.2 Sector Simulation
            </h3>

            <p
              className="text-justify mb-4"
              style={{
                textAlign: "justify",
                hyphens: "auto",
                margin: "0 0 0.9rem",
              }}
            >
              Each sector runs as an independent Sector instance that simulates all activity within that region of
              space. The Sector class maintains state for asteroids, pilots, and game objects, updating their positions
              and interactions on each simulation tick.
            </p>

            <p
              className="text-justify mb-4"
              style={{
                textAlign: "justify",
                hyphens: "auto",
                margin: "0 0 0.9rem",
              }}
            >
              <strong>Deterministic Dice:</strong> Each sector instantiates a DeterministicDice object initialized with
              sector-specific entropy. This provides consistent, verifiable randomness for asteroid spawning, ship
              generation, and event outcomes. The dice consumes hex characters from the entropy string sequentially,
              converting them to random numbers. When exhausted, the entropy is rehashed to generate additional
              randomness.
            </p>

            <p
              className="text-justify mb-4"
              style={{
                textAlign: "justify",
                hyphens: "auto",
                margin: "0 0 0.9rem",
              }}
            >
              <strong>Asteroid Lifecycle:</strong> Asteroids spawn at sector edges with random sizes (small, medium,
              large), positions, and movement vectors. They drift through the sector at constant velocity. Pilots can
              mine asteroids by staying in proximity for a duration. Successfully mined asteroids are destroyed and
              pilots receive credit rewards based on size. Asteroids that exit the sector boundaries are removed from
              simulation.
            </p>

            <p
              className="text-justify mb-4"
              style={{
                textAlign: "justify",
                hyphens: "auto",
                margin: "0 0 0.9rem",
              }}
            >
              <strong>Pilot Navigation:</strong> Pilots enter sectors when they receive an &ldquo;opening&rdquo;—a
              synchronized event triggered by rolling entropy updates. The sector checks airspace classification and
              ship model compatibility before allowing entry. Pilots must hold required transponders and credentials.
              Once inside, pilots navigate toward asteroids, mine resources, and attempt to exit with their haul before
              being eliminated.
            </p>

            <p
              className="text-justify mb-4"
              style={{
                textAlign: "justify",
                hyphens: "auto",
                margin: "0 0 0.9rem",
              }}
            >
              <strong>Death Handling:</strong> When a pilot is killed, the sector triggers the appropriate death
              contract call based on airspace class. For Class 0-1 sectors, it calls deadMansSwitch on the Game
              contract, applying a 10-point penalty. For Class 2+ sectors with audited stake contracts, it calls
              deadMansSlash, attempting to slash the killer&apos;s stake and avoid the penalty.
            </p>

            <h3
              className="font-bold mb-4"
              style={{
                fontSize: "1.05rem",
                fontWeight: "600",
                marginTop: "2rem",
                marginBottom: "1rem",
                fontFamily: '"Times New Roman", serif',
                color: "#000",
              }}
            >
              7.3 Frontend Integration
            </h3>

            <p
              className="text-justify mb-4"
              style={{
                textAlign: "justify",
                hyphens: "auto",
                margin: "0 0 0.9rem",
              }}
            >
              The frontend is built with Next.js (App Router) and integrates tightly with both smart contracts and the
              GameServer. It uses Scaffold-ETH 2 hooks for blockchain interactions and custom hooks for real-time sector
              data.
            </p>

            <p
              className="text-justify mb-4"
              style={{
                textAlign: "justify",
                hyphens: "auto",
                margin: "0 0 0.9rem",
              }}
            >
              <strong>Scaffold-ETH 2 Hooks:</strong> The frontend uses useScaffoldReadContract for reading contract
              state, useScaffoldWriteContract for sending transactions, and useScaffoldEventHistory for monitoring
              on-chain events. These hooks automatically handle contract ABI loading from deployedContracts.ts and
              provide type-safe interfaces for contract interactions.
            </p>

            <p
              className="text-justify mb-4"
              style={{
                textAlign: "justify",
                hyphens: "auto",
                margin: "0 0 0.9rem",
              }}
            >
              <strong>Custom Hooks:</strong> The codebase includes specialized hooks for common operations:
              useSectorData fetches comprehensive sector information from MaxExtract; useSectorWebSocket establishes and
              manages WebSocket connections to the GameServer; usePilotsData aggregates pilot information including
              balances and death status; useDeathStats calculates sector-wide death metrics for dashboard displays.
            </p>

            <p
              className="text-justify mb-4"
              style={{
                textAlign: "justify",
                hyphens: "auto",
                margin: "0 0 0.9rem",
              }}
            >
              <strong>Real-Time Updates:</strong> The SectorCanvas component establishes a WebSocket connection to
              receive real-time sector updates. It renders the sector using a canvas-based approach (likely Pixi.js or
              similar), displaying asteroids, pilots, and station visuals. Position updates arrive via WebSocket
              messages and are applied to the visual representation, creating smooth animations of sector activity.
            </p>

            <p
              className="text-justify mb-4"
              style={{
                textAlign: "justify",
                hyphens: "auto",
                margin: "0 0 0.9rem",
              }}
            >
              <strong>Component Architecture:</strong> The UI is organized into reusable components: Address displays
              Ethereum addresses with ENS resolution; AddressInput provides validated address entry; Balance shows ETH
              and token balances; EtherInput enables amount entry with USD conversion. These components from
              Scaffold-ETH 2 ensure consistent UX across the application.
            </p>
          </section>

          {/* Section 8 - Economic Model */}
          <section className="mb-8">
            <h2
              className="font-bold mb-4"
              style={{
                fontSize: "1.15rem",
                fontWeight: "700",
                marginTop: "2.5rem",
                marginBottom: "1rem",
                fontFamily: '"Times New Roman", serif',
                color: "#000",
              }}
            >
              8&nbsp;&nbsp;&nbsp;&nbsp;Economic Model
            </h2>

            <p
              className="text-justify mb-4"
              style={{
                textAlign: "justify",
                hyphens: "auto",
                margin: "0 0 0.9rem",
              }}
            >
              The Extract Protocol implements a dual-currency economic model: ETH for buy-ins and pot winnings, and
              Credits (ERC-20) for in-game transactions. This section details the point system, credit flows, and
              economic incentives.
            </p>

            <h3
              className="font-bold mb-4"
              style={{
                fontSize: "1.05rem",
                fontWeight: "600",
                marginTop: "2rem",
                marginBottom: "1rem",
                fontFamily: '"Times New Roman", serif',
                color: "#000",
              }}
            >
              8.1 Point System
            </h3>

            <p
              className="text-justify mb-4"
              style={{
                textAlign: "justify",
                hyphens: "auto",
                margin: "0 0 0.9rem",
              }}
            >
              Players earn points through successful operations and lose points when pilots die in their sectors. The
              player with the highest score at game end wins the ETH pot (or splits it with other top scorers).
            </p>

            <p
              className="text-justify mb-4"
              style={{
                textAlign: "justify",
                hyphens: "auto",
                margin: "0 0 0.9rem",
              }}
            >
              <strong>Point Awards:</strong>
            </p>
            <ul style={{ marginLeft: "2rem", marginBottom: "1rem" }}>
              <li style={{ marginBottom: "0.5rem" }}>+10 points: Buy into the game</li>
              <li style={{ marginBottom: "0.5rem" }}>
                +2 points: Pilot mints a credential (via pilotMintSectorCredential)
              </li>
              <li style={{ marginBottom: "0.5rem" }}>+10 points: Station upgrade completes (via upgradeStation)</li>
              <li style={{ marginBottom: "0.5rem" }}>+1-3 points: Pilots tip when successfully escaping with loot</li>
            </ul>

            <p
              className="text-justify mb-4"
              style={{
                textAlign: "justify",
                hyphens: "auto",
                margin: "0 0 0.9rem",
              }}
            >
              <strong>Point Penalties:</strong>
            </p>
            <ul style={{ marginLeft: "2rem", marginBottom: "1rem" }}>
              <li style={{ marginBottom: "0.5rem" }}>-10 points: Pilot dies in your sector (deadMansSwitch)</li>
              <li style={{ marginBottom: "0.5rem" }}>-2 points: Request an audit (spent to prevent spam)</li>
              <li style={{ marginBottom: "0.5rem" }}>
                -0 points: Pilot dies but stake slashing succeeds (deadMansSlash avoids penalty)
              </li>
            </ul>

            <p
              className="text-justify mb-4"
              style={{
                textAlign: "justify",
                hyphens: "auto",
                margin: "0 0 0.9rem",
              }}
            >
              This creates strong incentives to deploy safe sectors with proper infrastructure. The staking system
              (Chapter 4) is crucial because it allows players to avoid death penalties by slashing hostile pilots&apos;
              stakes.
            </p>

            <h3
              className="font-bold mb-4"
              style={{
                fontSize: "1.05rem",
                fontWeight: "600",
                marginTop: "2rem",
                marginBottom: "1rem",
                fontFamily: '"Times New Roman", serif',
                color: "#000",
              }}
            >
              8.2 Credit Economy
            </h3>

            <p
              className="text-justify mb-4"
              style={{
                textAlign: "justify",
                hyphens: "auto",
                margin: "0 0 0.9rem",
              }}
            >
              Credits flow through the protocol in several distinct circuits, each serving a different economic
              function:
            </p>

            <p
              className="text-justify mb-4"
              style={{
                textAlign: "justify",
                hyphens: "auto",
                margin: "0 0 0.9rem",
              }}
            >
              <strong>Staking Circuit:</strong> Pilots approve MaxExtract to spend 10k credits, then call
              MaxExtract.stake(sectorId). Credits transfer from pilot to MaxExtract contract. When pilots exit normally,
              they call unstake() to retrieve their 10k. If they kill someone, slash() burns their entire stake
              permanently. This creates a 10k credit cost for hostile actions.
            </p>

            <p
              className="text-justify mb-4"
              style={{
                textAlign: "justify",
                hyphens: "auto",
                margin: "0 0 0.9rem",
              }}
            >
              <strong>Credential Circuit:</strong> Credential contracts are typically free to mint (pilots just pay
              gas). The economic value comes from the 2 points awarded to the player when pilots mint. Some players
              might charge a small credit fee for credentials, though this isn&apos;t required by the protocol.
            </p>

            <p
              className="text-justify mb-4"
              style={{
                textAlign: "justify",
                hyphens: "auto",
                margin: "0 0 0.9rem",
              }}
            >
              <strong>Crowdsale Circuit:</strong> Pilots approve fuel contracts to spend credits, then call buy(amount).
              Credits transfer from pilot to fuel contract. Fuel tokens are minted to the pilot. When the contract
              balance reaches 50k credits, a pilot calls upgrade(), which: (1) approves Game for 49,500 credits, (2)
              Game pulls those credits via transferFrom, (3) pilot caller receives 500 credits as bounty, (4) any excess
              credits above 50k remain in the fuel contract or go to the station owner.
            </p>

            <p
              className="text-justify mb-4"
              style={{
                textAlign: "justify",
                hyphens: "auto",
                margin: "0 0 0.9rem",
              }}
            >
              <strong>Tip Circuit:</strong> When pilots successfully mine asteroids and escape sectors with large hauls,
              they call Game.tipPlayer() to award 1-3 points to the sector owner. This rewards well-run sectors that
              provide good service and safe operations.
            </p>

            <h3
              className="font-bold mb-4"
              style={{
                fontSize: "1.05rem",
                fontWeight: "600",
                marginTop: "2rem",
                marginBottom: "1rem",
                fontFamily: '"Times New Roman", serif',
                color: "#000",
              }}
            >
              8.3 Supply and Distribution
            </h3>

            <p
              className="text-justify mb-4"
              style={{
                textAlign: "justify",
                hyphens: "auto",
                margin: "0 0 0.9rem",
              }}
            >
              The Credits contract begins with a 100M token initial supply minted to the GOD address. GOD can mint
              additional credits as needed to fund pilots, provide rewards, and maintain economic balance. The
              batchMint() function enables efficient distribution to multiple pilots simultaneously.
            </p>

            <p
              className="text-justify mb-4"
              style={{
                textAlign: "justify",
                hyphens: "auto",
                margin: "0 0 0.9rem",
              }}
            >
              Credits are distributed to pilots through direct minting when they join the game. Pilots use these credits
              to stake into sectors, purchase credentials, and buy fuel tokens. Successful pilots accumulate credits
              through mining rewards and can participate in multiple sectors&apos; economies.
            </p>

            <p
              className="text-justify mb-4"
              style={{
                textAlign: "justify",
                hyphens: "auto",
                margin: "0 0 0.9rem",
              }}
            >
              Credit burning occurs in two scenarios: (1) fuel token redemption burns exactly 1 token per refuel,
              creating deflationary pressure, and (2) slashed stakes are permanently burned when pilots kill others in
              sectors with stake contracts, removing 10k credits from circulation per kill.
            </p>

            <h3
              className="font-bold mb-4"
              style={{
                fontSize: "1.05rem",
                fontWeight: "600",
                marginTop: "2rem",
                marginBottom: "1rem",
                fontFamily: '"Times New Roman", serif',
                color: "#000",
              }}
            >
              8.4 Game Theory and Incentives
            </h3>

            <p
              className="text-justify mb-4"
              style={{
                textAlign: "justify",
                hyphens: "auto",
                margin: "0 0 0.9rem",
              }}
            >
              The protocol creates several interesting game theoretic dynamics:
            </p>

            <p
              className="text-justify mb-4"
              style={{
                textAlign: "justify",
                hyphens: "auto",
                margin: "0 0 0.9rem",
              }}
            >
              <strong>Safety vs Accessibility Trade-off:</strong> Staking makes sectors safer but harder to access.
              Players must balance deterring hostile pilots (10k stake requirement) against excluding pilots who
              don&apos;t have enough credits. Well-capitalized pilots can access staked sectors; new pilots cannot.
            </p>

            <p
              className="text-justify mb-4"
              style={{
                textAlign: "justify",
                hyphens: "auto",
                margin: "0 0 0.9rem",
              }}
            >
              <strong>Pricing Strategy:</strong> Fuel token pricing presents a coordination problem. Price too high and
              pilots won&apos;t buy. Price too low and you won&apos;t raise 50k credits even with full participation.
              The recommended 1k credits per token requires ~50 pilots to participate, creating a natural minimum sector
              activity level for upgrades.
            </p>

            <p
              className="text-justify mb-4"
              style={{
                textAlign: "justify",
                hyphens: "auto",
                margin: "0 0 0.9rem",
              }}
            >
              <strong>Upgrade Timing:</strong> Players want pilots to trigger upgrade() as soon as 50k is reached, but
              pilots are only incentivized to call it for the 500 credit bounty. This creates a race condition where
              multiple pilots may attempt to call upgrade() simultaneously when the threshold is reached. The first
              transaction to mine wins the bounty.
            </p>

            <p
              className="text-justify mb-4"
              style={{
                textAlign: "justify",
                hyphens: "auto",
                margin: "0 0 0.9rem",
              }}
            >
              <strong>Death Penalty Mitigation:</strong> The 10-point death penalty creates strong pressure to deploy
              staking systems. Players who skip Chapter 4 risk catastrophic point loss if multiple pilots die in their
              sector. This makes the progression path (Chapters 1-5) essentially mandatory for competitive play.
            </p>
          </section>

          {/* Section 9 - Protocol Design Principles */}
          <section className="mb-8">
            <h2
              className="font-bold mb-4"
              style={{
                fontSize: "1.15rem",
                fontWeight: "700",
                marginTop: "2.5rem",
                marginBottom: "1rem",
                fontFamily: '"Times New Roman", serif',
                color: "#000",
              }}
            >
              9&nbsp;&nbsp;&nbsp;&nbsp;Protocol Design Principles
            </h2>

            <p
              className="text-justify mb-4"
              style={{
                textAlign: "justify",
                hyphens: "auto",
                margin: "0 0 0.9rem",
              }}
            >
              The Extract Protocol embeds several key design principles that shape how the system functions and evolves.
              These principles ensure security, prevent abuse, and maintain game balance.
            </p>

            <h3
              className="font-bold mb-4"
              style={{
                fontSize: "1.05rem",
                fontWeight: "600",
                marginTop: "2rem",
                marginBottom: "1rem",
                fontFamily: '"Times New Roman", serif',
                color: "#000",
              }}
            >
              9.1 One Player, One Sector
            </h3>

            <p
              className="text-justify mb-4"
              style={{
                textAlign: "justify",
                hyphens: "auto",
                margin: "0 0 0.9rem",
              }}
            >
              Each player address can broadcast exactly one sector. This prevents sybil attacks where a single entity
              could claim multiple sectors to farm points or monopolize pilot traffic. The playerHasBroadcast mapping in
              MaxExtract enforces this at the contract level.
            </p>

            <p
              className="text-justify mb-4"
              style={{
                textAlign: "justify",
                hyphens: "auto",
                margin: "0 0 0.9rem",
              }}
            >
              However, players can update their registry contract using updateRegistry(). This allows iterative
              improvement without losing sector ownership. Players can redeploy better implementations, fix bugs, or add
              new features while maintaining their sector ID and reputation.
            </p>

            <h3
              className="font-bold mb-4"
              style={{
                fontSize: "1.05rem",
                fontWeight: "600",
                marginTop: "2rem",
                marginBottom: "1rem",
                fontFamily: '"Times New Roman", serif',
                color: "#000",
              }}
            >
              9.2 One Pilot, One Credential Per Player
            </h3>

            <p
              className="text-justify mb-4"
              style={{
                textAlign: "justify",
                hyphens: "auto",
                margin: "0 0 0.9rem",
              }}
            >
              The pilotPlayerCredentialMinted mapping in the Game contract tracks which pilots have minted credentials
              from which players. Each combination is allowed exactly once. This prevents point farming where a player
              could redeploy credential contracts and have the same pilots mint repeatedly.
            </p>

            <p
              className="text-justify mb-4"
              style={{
                textAlign: "justify",
                hyphens: "auto",
                margin: "0 0 0.9rem",
              }}
            >
              The trade-off: if a player needs to upgrade their credential contract, they must airdrop new credentials
              to existing holders or those pilots will permanently lose access. This encourages careful initial design
              and thorough testing before mainnet deployment.
            </p>

            <h3
              className="font-bold mb-4"
              style={{
                fontSize: "1.05rem",
                fontWeight: "600",
                marginTop: "2rem",
                marginBottom: "1rem",
                fontFamily: '"Times New Roman", serif',
                color: "#000",
              }}
            >
              9.3 Chapter-Gated Feature Unlocks
            </h3>

            <p
              className="text-justify mb-4"
              style={{
                textAlign: "justify",
                hyphens: "auto",
                margin: "0 0 0.9rem",
              }}
            >
              Chapters are unlocked globally by the GOD address calling Game.showChapters(). All players see the same
              visible chapters simultaneously. This creates cohort-based progression where players advance together,
              enabling community learning and shared discovery.
            </p>

            <p
              className="text-justify mb-4"
              style={{
                textAlign: "justify",
                hyphens: "auto",
                margin: "0 0 0.9rem",
              }}
            >
              Each chapter introduces new contract patterns with increasing complexity: Chapter 1 (registry), Chapter 2
              (identity + audits), Chapter 3 (credentials + soulbound NFTs), Chapter 4 (staking + slashing), Chapter 5
              (crowdsales + ERC-20). Players must complete earlier chapters before later features become relevant.
            </p>

            <h3
              className="font-bold mb-4"
              style={{
                fontSize: "1.05rem",
                fontWeight: "600",
                marginTop: "2rem",
                marginBottom: "1rem",
                fontFamily: '"Times New Roman", serif',
                color: "#000",
              }}
            >
              9.4 Audit Requirements for Module Activation
            </h3>

            <p
              className="text-justify mb-4"
              style={{
                textAlign: "justify",
                hyphens: "auto",
                margin: "0 0 0.9rem",
              }}
            >
              Pilots will not interact with unaudited contracts. The Auditor contract maintains an isAudited mapping
              that tracks which contracts have passed verification for which chapters. Sector features only activate
              when their respective contracts are audited.
            </p>

            <p
              className="text-justify mb-4"
              style={{
                textAlign: "justify",
                hyphens: "auto",
                margin: "0 0 0.9rem",
              }}
            >
              Examples: MaxExtract.stake() checks that the stake contract is audited for chapter 4 before allowing
              staking. MaxExtract.getAboutInfo() returns &ldquo;(pending audit)&rdquo; if the about contract isn&apos;t
              audited for chapter 2. Game.deadMansSlash() requires the stake contract to be audited for chapter 4 before
              attempting slashing.
            </p>

            <h3
              className="font-bold mb-4"
              style={{
                fontSize: "1.05rem",
                fontWeight: "600",
                marginTop: "2rem",
                marginBottom: "1rem",
                fontFamily: '"Times New Roman", serif',
                color: "#000",
              }}
            >
              9.5 Airspace Classification Progression
            </h3>

            <p
              className="text-justify mb-4"
              style={{
                textAlign: "justify",
                hyphens: "auto",
                margin: "0 0 0.9rem",
              }}
            >
              Airspace classes gate which ship models can enter sectors, creating a natural progression system. Class 0
              (broadcast only) → Class 1 (credential audited) → Class 2 (stake audited) → Class 3 (crowdsale complete).
              Each upgrade expands the pool of compatible ship models.
            </p>

            <p
              className="text-justify mb-4"
              style={{
                textAlign: "justify",
                hyphens: "auto",
                margin: "0 0 0.9rem",
              }}
            >
              This creates economic pressure to complete all chapters. Players stuck at Class 0 only see Models E and F
              pilots (limited traffic). Players who reach Class 3 access all models A-F (maximum traffic and economic
              opportunity). The airspace system naturally incentivizes full participation in the chapter progression.
            </p>

            <h3
              className="font-bold mb-4"
              style={{
                fontSize: "1.05rem",
                fontWeight: "600",
                marginTop: "2rem",
                marginBottom: "1rem",
                fontFamily: '"Times New Roman", serif',
                color: "#000",
              }}
            >
              9.6 Transponder Requirements
            </h3>

            <p
              className="text-justify mb-4"
              style={{
                textAlign: "justify",
                hyphens: "auto",
                margin: "0 0 0.9rem",
              }}
            >
              All pilots must equip appropriate transponders for their airspace class. Class 0-1 requires killswitch
              transponders that broadcast death signals. Class 2-3 requires both killswitch and killstake transponders,
              enabling automatic stake slashing when kills occur.
            </p>

            <p
              className="text-justify mb-4"
              style={{
                textAlign: "justify",
                hyphens: "auto",
                margin: "0 0 0.9rem",
              }}
            >
              The transponder system creates the technical foundation for the death penalty mechanics. Without
              transponders, the protocol couldn&apos;t reliably detect kills or trigger appropriate contract calls. This
              is enforced off-chain by the GameServer, which only allows properly equipped pilots to enter sectors.
            </p>
          </section>

          {/* Section 10 - Implementation Guidance */}
          <section className="mb-8">
            <h2
              className="font-bold mb-4"
              style={{
                fontSize: "1.15rem",
                fontWeight: "700",
                marginTop: "2.5rem",
                marginBottom: "1rem",
                fontFamily: '"Times New Roman", serif',
                color: "#000",
              }}
            >
              10&nbsp;&nbsp;&nbsp;&nbsp;Implementation Guidance
            </h2>

            <p
              className="text-justify mb-4"
              style={{
                textAlign: "justify",
                hyphens: "auto",
                margin: "0 0 0.9rem",
              }}
            >
              This section provides practical guidance for developers building and deploying sectors within the Extract
              Protocol. It covers development workflow, testing strategies, security best practices, and deployment
              procedures.
            </p>

            <h3
              className="font-bold mb-4"
              style={{
                fontSize: "1.05rem",
                fontWeight: "600",
                marginTop: "2rem",
                marginBottom: "1rem",
                fontFamily: '"Times New Roman", serif',
                color: "#000",
              }}
            >
              10.1 Development Workflow
            </h3>

            <p
              className="text-justify mb-4"
              style={{
                textAlign: "justify",
                hyphens: "auto",
                margin: "0 0 0.9rem",
              }}
            >
              The recommended development cycle follows this pattern:
            </p>

            <ol style={{ marginLeft: "2rem", marginBottom: "1rem" }}>
              <li style={{ marginBottom: "0.5rem" }}>
                <strong>yarn chain:</strong> Start a local blockchain (Foundry Anvil or Hardhat). This provides a fast,
                isolated environment for testing.
              </li>
              <li style={{ marginBottom: "0.5rem" }}>
                <strong>yarn deploy:</strong> Deploy the core protocol contracts (MaxExtract, Game, Universe, Auditor,
                Credits) to your local chain. Deployment scripts are in packages/foundry/script/.
              </li>
              <li style={{ marginBottom: "0.5rem" }}>
                <strong>yarn start:</strong> Start the Next.js frontend. It will connect to your local chain and load
                deployed contracts from deployedContracts.ts.
              </li>
              <li style={{ marginBottom: "0.5rem" }}>
                <strong>Develop:</strong> Write your sector contracts (Registry, Announcement, Credential, Stake,
                Crowdsale). Edit files in packages/foundry/contracts/.
              </li>
              <li style={{ marginBottom: "0.5rem" }}>
                <strong>Test:</strong> Visit http://localhost:3000/debug to interact with contracts via the SE-2 debug
                UI. This provides a GUI for calling functions and viewing state.
              </li>
              <li style={{ marginBottom: "0.5rem" }}>
                <strong>Iterate:</strong> Modify contracts, redeploy (yarn deploy), and test again until functionality
                is correct.
              </li>
              <li style={{ marginBottom: "0.5rem" }}>
                <strong>Write Tests:</strong> Add Solidity tests in packages/foundry/test/ using Foundry&apos;s test
                framework. Run with forge test.
              </li>
              <li style={{ marginBottom: "0.5rem" }}>
                <strong>Deploy to Testnet:</strong> Once local testing passes, deploy to a public testnet (Arbitrum
                Sepolia recommended). Update scaffold.config.ts to target the testnet.
              </li>
              <li style={{ marginBottom: "0.5rem" }}>
                <strong>Verify Contracts:</strong> Run yarn verify to verify contracts on the block explorer. This is
                required before audit submission.
              </li>
              <li style={{ marginBottom: "0.5rem" }}>
                <strong>Request Audits:</strong> Call Auditor.requestAudit() for each contract, spending 2 points per
                audit. Monitor audit status.
              </li>
              <li style={{ marginBottom: "0.5rem" }}>
                <strong>Deploy to Mainnet:</strong> After successful testnet deployment and audits, deploy to Arbitrum
                mainnet following the same process.
              </li>
            </ol>

            <h3
              className="font-bold mb-4"
              style={{
                fontSize: "1.05rem",
                fontWeight: "600",
                marginTop: "2rem",
                marginBottom: "1rem",
                fontFamily: '"Times New Roman", serif',
                color: "#000",
              }}
            >
              10.2 Registry Module Pattern
            </h3>

            <p
              className="text-justify mb-4"
              style={{
                textAlign: "justify",
                hyphens: "auto",
                margin: "0 0 0.9rem",
              }}
            >
              All sector contracts should follow the registry module pattern. Your Registry contract maintains a{" "}
              <code>mapping(string =&gt; address) public modules</code> where you register contracts under standardized
              keys:
            </p>

            <ul style={{ marginLeft: "2rem", marginBottom: "1rem", fontFamily: "monospace", fontSize: "0.9rem" }}>
              <li style={{ marginBottom: "0.5rem" }}>
                <strong>&ldquo;about&rdquo;</strong> - Announcement contract (Chapter 2)
              </li>
              <li style={{ marginBottom: "0.5rem" }}>
                <strong>&ldquo;credential&rdquo;</strong> - Credential NFT contract (Chapter 3)
              </li>
              <li style={{ marginBottom: "0.5rem" }}>
                <strong>&ldquo;stake&rdquo;</strong> - Staking contract (Chapter 4)
              </li>
              <li style={{ marginBottom: "0.5rem" }}>
                <strong>&ldquo;sale&rdquo;</strong> - Fuel/Crowdsale contract (Chapter 5)
              </li>
            </ul>

            <p
              className="text-justify mb-4"
              style={{
                textAlign: "justify",
                hyphens: "auto",
                margin: "0 0 0.9rem",
              }}
            >
              The protocol queries these module addresses to find and interact with your contracts. For example,
              Game.pilotMintSectorCredential() reads the &ldquo;credential&rdquo; module to verify msg.sender matches
              the registered credential contract. Consistent module naming is critical for protocol integration.
            </p>

            <h3
              className="font-bold mb-4"
              style={{
                fontSize: "1.05rem",
                fontWeight: "600",
                marginTop: "2rem",
                marginBottom: "1rem",
                fontFamily: '"Times New Roman", serif',
                color: "#000",
              }}
            >
              10.3 Security Best Practices
            </h3>

            <p
              className="text-justify mb-4"
              style={{
                textAlign: "justify",
                hyphens: "auto",
                margin: "0 0 0.9rem",
              }}
            >
              <strong>Checks-Effects-Interactions (CEI) Pattern:</strong> Always follow CEI ordering in functions that
              make external calls. Update state variables before calling external contracts. Example: In your stake
              contract&apos;s slash() function, set staked[killer] = false BEFORE calling MaxExtract.slash(). This
              prevents reentrancy attacks.
            </p>

            <p
              className="text-justify mb-4"
              style={{
                textAlign: "justify",
                hyphens: "auto",
                margin: "0 0 0.9rem",
              }}
            >
              <strong>Access Control:</strong> Use OpenZeppelin&apos;s Ownable pattern for owner-only functions. Verify
              msg.sender in functions that should only be called by specific contracts. Example: Your stake
              contract&apos;s activate() should require msg.sender == maxExtractAddress.
            </p>

            <p
              className="text-justify mb-4"
              style={{
                textAlign: "justify",
                hyphens: "auto",
                margin: "0 0 0.9rem",
              }}
            >
              <strong>Soulbound Token Implementation:</strong> Override all transfer functions to revert for soulbound
              credentials. Override transferFrom(), safeTransferFrom() with both signatures, and approve(). This ensures
              credentials cannot be transferred after minting.
            </p>

            <p
              className="text-justify mb-4"
              style={{
                textAlign: "justify",
                hyphens: "auto",
                margin: "0 0 0.9rem",
              }}
            >
              <strong>Integer Arithmetic:</strong> Use Solidity 0.8.x which has built-in overflow protection. When
              dealing with token amounts, remember Credits has 18 decimals. 10k credits = 10_000 * 10^18 =
              10000000000000000000000.
            </p>

            <p
              className="text-justify mb-4"
              style={{
                textAlign: "justify",
                hyphens: "auto",
                margin: "0 0 0.9rem",
              }}
            >
              <strong>Gas Optimization:</strong> Minimize storage writes. Use memory variables for intermediate
              calculations. Pack related state variables into single storage slots when possible. Avoid loops over
              unbounded arrays in view functions.
            </p>

            <h3
              className="font-bold mb-4"
              style={{
                fontSize: "1.05rem",
                fontWeight: "600",
                marginTop: "2rem",
                marginBottom: "1rem",
                fontFamily: '"Times New Roman", serif',
                color: "#000",
              }}
            >
              10.4 Testing Strategies
            </h3>

            <p
              className="text-justify mb-4"
              style={{
                textAlign: "justify",
                hyphens: "auto",
                margin: "0 0 0.9rem",
              }}
            >
              Write comprehensive tests for all chapter contracts. Focus on:
            </p>

            <ul style={{ marginLeft: "2rem", marginBottom: "1rem" }}>
              <li style={{ marginBottom: "0.5rem" }}>
                <strong>Happy Path:</strong> Test normal operations succeed when all conditions are met.
              </li>
              <li style={{ marginBottom: "0.5rem" }}>
                <strong>Access Control:</strong> Verify unauthorized callers are rejected.
              </li>
              <li style={{ marginBottom: "0.5rem" }}>
                <strong>Edge Cases:</strong> Test boundary conditions, zero values, maximum values.
              </li>
              <li style={{ marginBottom: "0.5rem" }}>
                <strong>Integration:</strong> Test interactions with core protocol contracts (MaxExtract, Game).
              </li>
              <li style={{ marginBottom: "0.5rem" }}>
                <strong>Reentrancy:</strong> Attempt reentrancy attacks on functions with external calls.
              </li>
              <li style={{ marginBottom: "0.5rem" }}>
                <strong>State Transitions:</strong> Verify state changes occur correctly and are permanent.
              </li>
            </ul>

            <p
              className="text-justify mb-4"
              style={{
                textAlign: "justify",
                hyphens: "auto",
                margin: "0 0 0.9rem",
              }}
            >
              Use Foundry&apos;s testing features: vm.prank() to test as different addresses, vm.expectRevert() to
              verify reverts, vm.expectEmit() to check events. Write fuzz tests for functions that accept user inputs.
            </p>

            <h3
              className="font-bold mb-4"
              style={{
                fontSize: "1.05rem",
                fontWeight: "600",
                marginTop: "2rem",
                marginBottom: "1rem",
                fontFamily: '"Times New Roman", serif',
                color: "#000",
              }}
            >
              10.5 Deployment and Verification
            </h3>

            <p
              className="text-justify mb-4"
              style={{
                textAlign: "justify",
                hyphens: "auto",
                margin: "0 0 0.9rem",
              }}
            >
              When deploying to live networks:
            </p>

            <ol style={{ marginLeft: "2rem", marginBottom: "1rem" }}>
              <li style={{ marginBottom: "0.5rem" }}>
                <strong>Double-check addresses:</strong> Verify all contract addresses (MaxExtract, Game, Credits) are
                correct for the target network.
              </li>
              <li style={{ marginBottom: "0.5rem" }}>
                <strong>Set immutable values:</strong> Review constructor parameters. Immutable variables cannot be
                changed after deployment.
              </li>
              <li style={{ marginBottom: "0.5rem" }}>
                <strong>Deploy in order:</strong> Registry first, then chapter contracts. Register each chapter contract
                in the Registry using your setModule() function.
              </li>
              <li style={{ marginBottom: "0.5rem" }}>
                <strong>Verify on explorer:</strong> Use yarn verify or manually verify on Arbiscan. This makes source
                code readable and enables audit submission.
              </li>
              <li style={{ marginBottom: "0.5rem" }}>
                <strong>Test on explorer:</strong> Use the block explorer&apos;s Read/Write Contract tabs to verify
                functions work correctly before requesting audits.
              </li>
              <li style={{ marginBottom: "0.5rem" }}>
                <strong>Request audits:</strong> Submit each contract via Auditor.requestAudit(), spending 2 points per
                submission. Monitor the /audits page for results.
              </li>
              <li style={{ marginBottom: "0.5rem" }}>
                <strong>Monitor events:</strong> Watch for SectorBroadcast, CredentialMinted, StationUpgraded events to
                confirm protocol integration.
              </li>
            </ol>

            <h3
              className="font-bold mb-4"
              style={{
                fontSize: "1.05rem",
                fontWeight: "600",
                marginTop: "2rem",
                marginBottom: "1rem",
                fontFamily: '"Times New Roman", serif',
                color: "#000",
              }}
            >
              10.6 Common Pitfalls
            </h3>

            <p
              className="text-justify mb-4"
              style={{
                textAlign: "justify",
                hyphens: "auto",
                margin: "0 0 0.9rem",
              }}
            >
              <strong>Calling broadcast() from EOA:</strong> The tx.origin != msg.sender check will revert. Always call
              broadcast() from your Registry contract.
            </p>

            <p
              className="text-justify mb-4"
              style={{
                textAlign: "justify",
                hyphens: "auto",
                margin: "0 0 0.9rem",
              }}
            >
              <strong>Not storing sector ID:</strong> The broadcast() function returns your sector ID. Store it in a
              state variable immediately. You&apos;ll need it for later interactions.
            </p>

            <p
              className="text-justify mb-4"
              style={{
                textAlign: "justify",
                hyphens: "auto",
                margin: "0 0 0.9rem",
              }}
            >
              <strong>Forgetting contract verification:</strong> Audits require verified source code. Always verify
              before requesting audits.
            </p>

            <p
              className="text-justify mb-4"
              style={{
                textAlign: "justify",
                hyphens: "auto",
                margin: "0 0 0.9rem",
              }}
            >
              <strong>Incorrect module keys:</strong> Use exact strings: &ldquo;about&rdquo;, &ldquo;credential&rdquo;,
              &ldquo;stake&rdquo;, &ldquo;sale&rdquo;. Typos will break protocol integration.
            </p>

            <p
              className="text-justify mb-4"
              style={{
                textAlign: "justify",
                hyphens: "auto",
                margin: "0 0 0.9rem",
              }}
            >
              <strong>External calls before state updates:</strong> Always update state before external calls (CEI
              pattern). This is checked by auditors.
            </p>

            <p
              className="text-justify mb-4"
              style={{
                textAlign: "justify",
                hyphens: "auto",
                margin: "0 0 0.9rem",
              }}
            >
              <strong>Redeploying credentials without migration:</strong> Remember the one-pilot-one-credential rule. If
              you redeploy, existing holders lose access unless you airdrop.
            </p>
          </section>

          {/* Section 11 - Conclusion */}
          <section className="mb-8">
            <h2
              className="font-bold mb-4"
              style={{
                fontSize: "1.15rem",
                fontWeight: "700",
                marginTop: "2.5rem",
                marginBottom: "1rem",
                fontFamily: '"Times New Roman", serif',
                color: "#000",
              }}
            >
              11&nbsp;&nbsp;&nbsp;&nbsp;Conclusion
            </h2>

            <p
              className="text-justify mb-4"
              style={{
                textAlign: "justify",
                hyphens: "auto",
                margin: "0 0 0.9rem",
              }}
            >
              The Extract Protocol represents a synthesis of blockchain primitives, game mechanics, and economic
              incentives to create a coordinated space exploration system. Through progressive chapter unlocks, players
              learn fundamental smart contract patterns while building increasingly sophisticated sector infrastructure.
            </p>

            <p
              className="text-justify mb-4"
              style={{
                textAlign: "justify",
                hyphens: "auto",
                margin: "0 0 0.9rem",
              }}
            >
              The protocol&apos;s design embeds lessons about access control, soulbound tokens, staking mechanisms,
              slashing systems, and crowdsale implementations—all fundamental patterns for blockchain development. By
              completing the chapter progression, developers gain practical experience with these concepts in a
              game-theoretic environment where implementations directly impact outcomes.
            </p>

            <p
              className="text-justify mb-4"
              style={{
                textAlign: "justify",
                hyphens: "auto",
                margin: "0 0 0.9rem",
              }}
            >
              The commit-reveal entropy system provides verifiable randomness without centralized oracles. The hybrid
              on-chain/off-chain architecture demonstrates how to combine blockchain immutability with real-time
              simulation. The audit system shows how AI agents can verify contract implementations against
              specifications. These innovations extend beyond the game itself, offering patterns applicable to broader
              decentralized systems.
            </p>

            <p
              className="text-justify mb-4"
              style={{
                textAlign: "justify",
                hyphens: "auto",
                margin: "0 0 0.9rem",
              }}
            >
              As Max Extract&apos;s signal continues to propagate across the blockchain, new sectors emerge, pilots
              navigate between them, and the protocol evolves through the collective actions of its participants. The
              system is live, permissionless, and unstoppable. The code is the law, the ledger is the truth, and the
              galaxy awaits coordination.
            </p>
          </section>

          {/* Appendix A - Configuration Reference */}
          <section className="mb-8">
            <h2
              className="font-bold mb-4"
              style={{
                fontSize: "1.15rem",
                fontWeight: "700",
                marginTop: "2.5rem",
                marginBottom: "1rem",
                fontFamily: '"Times New Roman", serif',
                color: "#000",
              }}
            >
              Appendix A&nbsp;&nbsp;&nbsp;&nbsp;Configuration Reference
            </h2>

            <h3
              className="font-bold mb-4"
              style={{
                fontSize: "1.05rem",
                fontWeight: "600",
                marginTop: "2rem",
                marginBottom: "1rem",
                fontFamily: '"Times New Roman", serif',
                color: "#000",
              }}
            >
              A.1 Core TypeScript Types
            </h3>

            <p
              className="mb-4"
              style={{
                margin: "0 0 0.9rem",
              }}
            >
              <strong>Vector2D:</strong> Two-dimensional coordinate system for positions and velocities (x, y
              components).
            </p>

            <p
              className="mb-4"
              style={{
                margin: "0 0 0.9rem",
              }}
            >
              <strong>Asteroid:</strong> Asteroid entity with position, velocity, size category, resource content, and
              spawn time.
            </p>

            <p
              className="mb-4"
              style={{
                margin: "0 0 0.9rem",
              }}
            >
              <strong>Ship:</strong> Ship entity with pilot info, ship type, position, velocity, targeting state, fuel,
              cargo, and movement flags.
            </p>

            <p
              className="mb-4"
              style={{
                margin: "0 0 0.9rem",
              }}
            >
              <strong>PilotAssignment:</strong> Maps pilot addresses to sectors, tracks death status and killer
              information.
            </p>

            <p
              className="mb-4"
              style={{
                margin: "0 0 0.9rem",
              }}
            >
              <strong>TipResult:</strong> Result of tipping transaction including success status, amount, and
              transaction hash.
            </p>

            <p
              className="mb-4"
              style={{
                margin: "0 0 0.9rem",
              }}
            >
              <strong>AboutContractInfo:</strong> Metadata about sector owner&apos;s contracts including station name,
              registry address, and audit status.
            </p>

            <p
              className="mb-4"
              style={{
                margin: "0 0 0.9rem",
              }}
            >
              <strong>SectorEvent:</strong> Union type for 20+ game event types including spawns, mining, combat,
              deaths, slashing, tipping, staking, and credentials.
            </p>

            <p
              className="mb-4"
              style={{
                margin: "0 0 0.9rem",
              }}
            >
              <strong>SectorSnapshot:</strong> Current sector state containing all asteroids, ships, and last update
              timestamp.
            </p>

            <h3
              className="font-bold mb-4"
              style={{
                fontSize: "1.05rem",
                fontWeight: "600",
                marginTop: "2rem",
                marginBottom: "1rem",
                fontFamily: '"Times New Roman", serif',
                color: "#000",
              }}
            >
              A.2 Game Configuration Constants
            </h3>

            <div
              style={{
                width: "100%",
                overflowX: "auto",
                marginBottom: "1rem",
              }}
            >
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: "0.9rem",
                  marginBottom: "1rem",
                }}
              >
                <thead>
                  <tr style={{ borderBottom: "2px solid #000" }}>
                    <th
                      style={{
                        textAlign: "left",
                        padding: "0.5rem 0.25rem",
                        fontWeight: "600",
                        width: "35%",
                      }}
                    >
                      Variable
                    </th>
                    <th
                      style={{
                        textAlign: "left",
                        padding: "0.5rem 0.25rem",
                        fontWeight: "600",
                        width: "15%",
                      }}
                    >
                      Value
                    </th>
                    <th
                      style={{
                        textAlign: "left",
                        padding: "0.5rem 0.25rem",
                        fontWeight: "600",
                        width: "50%",
                      }}
                    >
                      Description
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: "1px solid #ddd" }}>
                    <td style={{ padding: "0.4rem 0.25rem", fontFamily: "monospace", fontSize: "0.85rem" }}>WIDTH</td>
                    <td style={{ padding: "0.4rem 0.25rem" }}>2000</td>
                    <td style={{ padding: "0.4rem 0.25rem" }}>Sector boundary width in pixels</td>
                  </tr>
                  <tr style={{ borderBottom: "1px solid #ddd" }}>
                    <td style={{ padding: "0.4rem 0.25rem", fontFamily: "monospace", fontSize: "0.85rem" }}>HEIGHT</td>
                    <td style={{ padding: "0.4rem 0.25rem" }}>2000</td>
                    <td style={{ padding: "0.4rem 0.25rem" }}>Sector boundary height in pixels</td>
                  </tr>
                  <tr style={{ borderBottom: "1px solid #ddd" }}>
                    <td style={{ padding: "0.4rem 0.25rem", fontFamily: "monospace", fontSize: "0.85rem" }}>
                      CHARACTER_COUNT
                    </td>
                    <td style={{ padding: "0.4rem 0.25rem" }}>30</td>
                    <td style={{ padding: "0.4rem 0.25rem" }}>Number of pilot characters to generate per sector</td>
                  </tr>
                  <tr style={{ borderBottom: "1px solid #ddd" }}>
                    <td style={{ padding: "0.4rem 0.25rem", fontFamily: "monospace", fontSize: "0.85rem" }}>
                      PILOT_BATCH_SIZE
                    </td>
                    <td style={{ padding: "0.4rem 0.25rem" }}>25</td>
                    <td style={{ padding: "0.4rem 0.25rem" }}>Number of pilots to add per transaction batch</td>
                  </tr>
                  <tr style={{ borderBottom: "1px solid #ddd" }}>
                    <td style={{ padding: "0.4rem 0.25rem", fontFamily: "monospace", fontSize: "0.85rem" }}>
                      ASTEROID_SIZES.small
                    </td>
                    <td style={{ padding: "0.4rem 0.25rem" }}>45px</td>
                    <td style={{ padding: "0.4rem 0.25rem" }}>Small asteroid size (100-200 resources)</td>
                  </tr>
                  <tr style={{ borderBottom: "1px solid #ddd" }}>
                    <td style={{ padding: "0.4rem 0.25rem", fontFamily: "monospace", fontSize: "0.85rem" }}>
                      ASTEROID_SIZES.medium
                    </td>
                    <td style={{ padding: "0.4rem 0.25rem" }}>75px</td>
                    <td style={{ padding: "0.4rem 0.25rem" }}>Medium asteroid size (200-350 resources)</td>
                  </tr>
                  <tr style={{ borderBottom: "1px solid #ddd" }}>
                    <td style={{ padding: "0.4rem 0.25rem", fontFamily: "monospace", fontSize: "0.85rem" }}>
                      ASTEROID_SIZES.large
                    </td>
                    <td style={{ padding: "0.4rem 0.25rem" }}>120px</td>
                    <td style={{ padding: "0.4rem 0.25rem" }}>Large asteroid size (350-500 resources)</td>
                  </tr>
                  <tr style={{ borderBottom: "1px solid #ddd" }}>
                    <td style={{ padding: "0.4rem 0.25rem", fontFamily: "monospace", fontSize: "0.85rem" }}>
                      ASTEROID_SPEED
                    </td>
                    <td style={{ padding: "0.4rem 0.25rem" }}>20</td>
                    <td style={{ padding: "0.4rem 0.25rem" }}>Base speed for asteroid movement</td>
                  </tr>
                  <tr style={{ borderBottom: "1px solid #ddd" }}>
                    <td style={{ padding: "0.4rem 0.25rem", fontFamily: "monospace", fontSize: "0.85rem" }}>
                      SHIP_SPEED
                    </td>
                    <td style={{ padding: "0.4rem 0.25rem" }}>80</td>
                    <td style={{ padding: "0.4rem 0.25rem" }}>Base speed for ship movement</td>
                  </tr>
                  <tr style={{ borderBottom: "1px solid #ddd" }}>
                    <td style={{ padding: "0.4rem 0.25rem", fontFamily: "monospace", fontSize: "0.85rem" }}>
                      INNER_LOOP_INTERVAL
                    </td>
                    <td style={{ padding: "0.4rem 0.25rem" }}>3000ms</td>
                    <td style={{ padding: "0.4rem 0.25rem" }}>
                      Fast loop interval for ship movement, mining, and battles
                    </td>
                  </tr>
                  <tr style={{ borderBottom: "1px solid #ddd" }}>
                    <td style={{ padding: "0.4rem 0.25rem", fontFamily: "monospace", fontSize: "0.85rem" }}>
                      OUTER_LOOP_INTERVAL
                    </td>
                    <td style={{ padding: "0.4rem 0.25rem" }}>9000ms</td>
                    <td style={{ padding: "0.4rem 0.25rem" }}>
                      Slow loop interval for heavy operations and commit-reveal
                    </td>
                  </tr>
                  <tr style={{ borderBottom: "1px solid #ddd" }}>
                    <td style={{ padding: "0.4rem 0.25rem", fontFamily: "monospace", fontSize: "0.85rem" }}>
                      ASTEROID_SPAWN_CHANCE
                    </td>
                    <td style={{ padding: "0.4rem 0.25rem" }}>0.8</td>
                    <td style={{ padding: "0.4rem 0.25rem" }}>Probability of asteroid spawn per outer loop (80%)</td>
                  </tr>
                  <tr style={{ borderBottom: "1px solid #ddd" }}>
                    <td style={{ padding: "0.4rem 0.25rem", fontFamily: "monospace", fontSize: "0.85rem" }}>
                      SHIP_SPAWN_CHANCE
                    </td>
                    <td style={{ padding: "0.4rem 0.25rem" }}>0.7</td>
                    <td style={{ padding: "0.4rem 0.25rem" }}>Probability of ship spawn per outer loop (70%)</td>
                  </tr>
                  <tr style={{ borderBottom: "1px solid #ddd" }}>
                    <td style={{ padding: "0.4rem 0.25rem", fontFamily: "monospace", fontSize: "0.85rem" }}>
                      FUEL_CONSUMPTION_RATE
                    </td>
                    <td style={{ padding: "0.4rem 0.25rem" }}>0.7</td>
                    <td style={{ padding: "0.4rem 0.25rem" }}>Fuel consumed per game loop cycle</td>
                  </tr>
                  <tr style={{ borderBottom: "1px solid #ddd" }}>
                    <td style={{ padding: "0.4rem 0.25rem", fontFamily: "monospace", fontSize: "0.85rem" }}>
                      LOW_FUEL_THRESHOLD
                    </td>
                    <td style={{ padding: "0.4rem 0.25rem" }}>20</td>
                    <td style={{ padding: "0.4rem 0.25rem" }}>Fuel level that triggers low fuel warnings</td>
                  </tr>
                  <tr style={{ borderBottom: "1px solid #ddd" }}>
                    <td style={{ padding: "0.4rem 0.25rem", fontFamily: "monospace", fontSize: "0.85rem" }}>
                      REFUEL_FUEL_THRESHOLD
                    </td>
                    <td style={{ padding: "0.4rem 0.25rem" }}>50</td>
                    <td style={{ padding: "0.4rem 0.25rem" }}>
                      Fuel level that triggers automatic refueling at station
                    </td>
                  </tr>
                  <tr style={{ borderBottom: "1px solid #ddd" }}>
                    <td style={{ padding: "0.4rem 0.25rem", fontFamily: "monospace", fontSize: "0.85rem" }}>
                      REFUEL_ARRIVAL_DISTANCE
                    </td>
                    <td style={{ padding: "0.4rem 0.25rem" }}>50</td>
                    <td style={{ padding: "0.4rem 0.25rem" }}>Distance threshold for arriving at station center</td>
                  </tr>
                  <tr style={{ borderBottom: "1px solid #ddd" }}>
                    <td style={{ padding: "0.4rem 0.25rem", fontFamily: "monospace", fontSize: "0.85rem" }}>
                      COURSE_RECALC_CYCLES
                    </td>
                    <td style={{ padding: "0.4rem 0.25rem" }}>3</td>
                    <td style={{ padding: "0.4rem 0.25rem" }}>Recalculate course every N game loops (optimization)</td>
                  </tr>
                  <tr style={{ borderBottom: "1px solid #ddd" }}>
                    <td style={{ padding: "0.4rem 0.25rem", fontFamily: "monospace", fontSize: "0.85rem" }}>
                      SHIP_COMBAT_RANGE
                    </td>
                    <td style={{ padding: "0.4rem 0.25rem" }}>15</td>
                    <td style={{ padding: "0.4rem 0.25rem" }}>Range for ship-to-ship vector matching and combat</td>
                  </tr>
                  <tr style={{ borderBottom: "1px solid #ddd" }}>
                    <td style={{ padding: "0.4rem 0.25rem", fontFamily: "monospace", fontSize: "0.85rem" }}>
                      CARGO_SPEED_MULTIPLIER
                    </td>
                    <td style={{ padding: "0.4rem 0.25rem" }}>0.5</td>
                    <td style={{ padding: "0.4rem 0.25rem" }}>Speed multiplier when ship carries full cargo (50%)</td>
                  </tr>
                  <tr style={{ borderBottom: "1px solid #ddd" }}>
                    <td style={{ padding: "0.4rem 0.25rem", fontFamily: "monospace", fontSize: "0.85rem" }}>
                      EXIT_REMOVAL_BUFFER
                    </td>
                    <td style={{ padding: "0.4rem 0.25rem" }}>5</td>
                    <td style={{ padding: "0.4rem 0.25rem" }}>Buffer distance for entity removal from game</td>
                  </tr>
                  <tr style={{ borderBottom: "1px solid #ddd" }}>
                    <td style={{ padding: "0.4rem 0.25rem", fontFamily: "monospace", fontSize: "0.85rem" }}>
                      EXIT_TARGET_BUFFER
                    </td>
                    <td style={{ padding: "0.4rem 0.25rem" }}>200</td>
                    <td style={{ padding: "0.4rem 0.25rem" }}>Buffer distance for where ships aim when exiting</td>
                  </tr>
                  <tr style={{ borderBottom: "1px solid #ddd" }}>
                    <td style={{ padding: "0.4rem 0.25rem", fontFamily: "monospace", fontSize: "0.85rem" }}>
                      ASTEROID_EDGE_BUFFER
                    </td>
                    <td style={{ padding: "0.4rem 0.25rem" }}>100</td>
                    <td style={{ padding: "0.4rem 0.25rem" }}>Buffer for asteroid edge collision calculations</td>
                  </tr>
                  <tr style={{ borderBottom: "1px solid #ddd" }}>
                    <td style={{ padding: "0.4rem 0.25rem", fontFamily: "monospace", fontSize: "0.85rem" }}>
                      TIP_SCORE_THRESHOLDS
                    </td>
                    <td style={{ padding: "0.4rem 0.25rem" }}>90/150/240</td>
                    <td style={{ padding: "0.4rem 0.25rem" }}>Score thresholds for low/medium/high tip amounts</td>
                  </tr>
                  <tr style={{ borderBottom: "1px solid #ddd" }}>
                    <td style={{ padding: "0.4rem 0.25rem", fontFamily: "monospace", fontSize: "0.85rem" }}>
                      TIP_AMOUNTS.STANDARD
                    </td>
                    <td style={{ padding: "0.4rem 0.25rem" }}>1/2/3</td>
                    <td style={{ padding: "0.4rem 0.25rem" }}>Standard tip amounts for low/medium/high scores</td>
                  </tr>
                  <tr style={{ borderBottom: "1px solid #ddd" }}>
                    <td style={{ padding: "0.4rem 0.25rem", fontFamily: "monospace", fontSize: "0.85rem" }}>
                      TIP_AMOUNTS.ENHANCED
                    </td>
                    <td style={{ padding: "0.4rem 0.25rem" }}>2/3/4</td>
                    <td style={{ padding: "0.4rem 0.25rem" }}>
                      Enhanced tips (+1 bonus) for players with about contract
                    </td>
                  </tr>
                  <tr style={{ borderBottom: "1px solid #ddd" }}>
                    <td style={{ padding: "0.4rem 0.25rem", fontFamily: "monospace", fontSize: "0.85rem" }}>
                      COUNTDOWN_SECONDS
                    </td>
                    <td style={{ padding: "0.4rem 0.25rem" }}>10</td>
                    <td style={{ padding: "0.4rem 0.25rem" }}>Countdown duration before game starts (buy-in period)</td>
                  </tr>
                  <tr style={{ borderBottom: "1px solid #ddd" }}>
                    <td style={{ padding: "0.4rem 0.25rem", fontFamily: "monospace", fontSize: "0.85rem" }}>
                      ENTROPY_REVEAL_DELAY_SECONDS
                    </td>
                    <td style={{ padding: "0.4rem 0.25rem" }}>5</td>
                    <td style={{ padding: "0.4rem 0.25rem" }}>Wait time before revealing entropy (Universe minimum)</td>
                  </tr>
                  <tr style={{ borderBottom: "1px solid #ddd" }}>
                    <td style={{ padding: "0.4rem 0.25rem", fontFamily: "monospace", fontSize: "0.85rem" }}>
                      AUTO_GAME_CYCLE
                    </td>
                    <td style={{ padding: "0.4rem 0.25rem" }}>true</td>
                    <td style={{ padding: "0.4rem 0.25rem" }}>Enable/disable automated game cycles</td>
                  </tr>
                  <tr style={{ borderBottom: "1px solid #ddd" }}>
                    <td style={{ padding: "0.4rem 0.25rem", fontFamily: "monospace", fontSize: "0.85rem" }}>
                      CROWDSALE_PILOTS_PER_LOOP
                    </td>
                    <td style={{ padding: "0.4rem 0.25rem" }}>3</td>
                    <td style={{ padding: "0.4rem 0.25rem" }}>Process 3 pilots per outer loop during crowdsale</td>
                  </tr>
                  <tr style={{ borderBottom: "1px solid #ddd" }}>
                    <td style={{ padding: "0.4rem 0.25rem", fontFamily: "monospace", fontSize: "0.85rem" }}>
                      CROWDSALE_TARGET_CREDITS
                    </td>
                    <td style={{ padding: "0.4rem 0.25rem" }}>50,000</td>
                    <td style={{ padding: "0.4rem 0.25rem" }}>Total credits target for crowdsale completion</td>
                  </tr>
                  <tr style={{ borderBottom: "1px solid #ddd" }}>
                    <td style={{ padding: "0.4rem 0.25rem", fontFamily: "monospace", fontSize: "0.85rem" }}>
                      CROWDSALE_MAX_UPGRADE_ATTEMPTS
                    </td>
                    <td style={{ padding: "0.4rem 0.25rem" }}>3</td>
                    <td style={{ padding: "0.4rem 0.25rem" }}>Stop after 3 pilots attempt upgrade during crowdsale</td>
                  </tr>
                  <tr style={{ borderBottom: "1px solid #ddd" }}>
                    <td style={{ padding: "0.4rem 0.25rem", fontFamily: "monospace", fontSize: "0.85rem" }}>
                      FEDERATION_LOCK_TIME
                    </td>
                    <td style={{ padding: "0.4rem 0.25rem" }}>180,000ms</td>
                    <td style={{ padding: "0.4rem 0.25rem" }}>Federation lock duration (3 minutes)</td>
                  </tr>
                  <tr style={{ borderBottom: "1px solid #ddd" }}>
                    <td style={{ padding: "0.4rem 0.25rem", fontFamily: "monospace", fontSize: "0.85rem" }}>
                      CARGO_PAYMENT_RATE
                    </td>
                    <td style={{ padding: "0.4rem 0.25rem" }}>5</td>
                    <td style={{ padding: "0.4rem 0.25rem" }}>Credits paid per cargo unit delivered</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <h3
              className="font-bold mb-4"
              style={{
                fontSize: "1.05rem",
                fontWeight: "600",
                marginTop: "2rem",
                marginBottom: "1rem",
                fontFamily: '"Times New Roman", serif',
                color: "#000",
              }}
            >
              A.3 Utility Functions
            </h3>

            <p
              className="mb-4"
              style={{
                margin: "0 0 0.9rem",
              }}
            >
              <strong>getCargoCapacity(shipType):</strong> Calculates cargo capacity based on ship type (1-12) using
              formula: 20 + (shipType × 25). Range: 45 units (type 1) to 320 units (type 12).
            </p>
          </section>

          {/* Development Meta Section */}
          <section
            id="development-meta"
            style={{
              marginBottom: "3rem",
            }}
          >
            <h2
              className="font-bold mb-6"
              style={{
                fontSize: "1.5rem",
                fontWeight: "600",
                marginTop: "2rem",
                marginBottom: "1.5rem",
                fontFamily: '"Times New Roman", serif',
                color: "#000",
              }}
            >
              Development Meta
            </h2>

            <p
              className="mb-4"
              style={{
                margin: "0 0 0.9rem",
              }}
            >
              Extract Protocol represents a significant development effort spanning both blockchain and game server
              infrastructure. The entire codebase was developed using Claude Sonnet 4.5 in Cursor, demonstrating the
              capabilities of AI-assisted development for complex, multi-layered systems.
            </p>

            <h3
              className="font-bold mb-4"
              style={{
                fontSize: "1.05rem",
                fontWeight: "600",
                marginTop: "2rem",
                marginBottom: "1rem",
                fontFamily: '"Times New Roman", serif',
                color: "#000",
              }}
            >
              Codebase Statistics
            </h3>

            <div
              style={{
                width: "100%",
                overflowX: "auto",
                marginBottom: "1rem",
              }}
            >
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: "0.9rem",
                  marginBottom: "1rem",
                }}
              >
                <thead>
                  <tr style={{ borderBottom: "2px solid #000" }}>
                    <th
                      style={{
                        textAlign: "left",
                        padding: "0.5rem 0.25rem",
                        fontWeight: "600",
                        width: "50%",
                      }}
                    >
                      Component
                    </th>
                    <th
                      style={{
                        textAlign: "right",
                        padding: "0.5rem 0.25rem",
                        fontWeight: "600",
                        width: "25%",
                      }}
                    >
                      Lines of Code
                    </th>
                    <th
                      style={{
                        textAlign: "left",
                        padding: "0.5rem 0.25rem",
                        fontWeight: "600",
                        width: "25%",
                      }}
                    >
                      Description
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: "1px solid #ddd" }}>
                    <td style={{ padding: "0.4rem 0.25rem", fontWeight: "600" }}>Smart Contracts (Solidity)</td>
                    <td style={{ padding: "0.4rem 0.25rem", textAlign: "right", fontFamily: "monospace" }}>2,061</td>
                    <td style={{ padding: "0.4rem 0.25rem" }}>Core blockchain logic</td>
                  </tr>
                  <tr style={{ borderBottom: "1px solid #ddd", backgroundColor: "#f9f9f9" }}>
                    <td style={{ padding: "0.4rem 0.25rem 0.4rem 1.5rem", fontSize: "0.85rem" }}>Game.sol</td>
                    <td style={{ padding: "0.4rem 0.25rem", textAlign: "right", fontFamily: "monospace" }}>956</td>
                    <td style={{ padding: "0.4rem 0.25rem", fontSize: "0.85rem" }}>Game state & logic</td>
                  </tr>
                  <tr style={{ borderBottom: "1px solid #ddd", backgroundColor: "#f9f9f9" }}>
                    <td style={{ padding: "0.4rem 0.25rem 0.4rem 1.5rem", fontSize: "0.85rem" }}>MaxExtract.sol</td>
                    <td style={{ padding: "0.4rem 0.25rem", textAlign: "right", fontFamily: "monospace" }}>521</td>
                    <td style={{ padding: "0.4rem 0.25rem", fontSize: "0.85rem" }}>Main protocol contract</td>
                  </tr>
                  <tr style={{ borderBottom: "1px solid #ddd", backgroundColor: "#f9f9f9" }}>
                    <td style={{ padding: "0.4rem 0.25rem 0.4rem 1.5rem", fontSize: "0.85rem" }}>Auditor.sol</td>
                    <td style={{ padding: "0.4rem 0.25rem", textAlign: "right", fontFamily: "monospace" }}>271</td>
                    <td style={{ padding: "0.4rem 0.25rem", fontSize: "0.85rem" }}>Audit & verification</td>
                  </tr>
                  <tr style={{ borderBottom: "1px solid #ddd", backgroundColor: "#f9f9f9" }}>
                    <td style={{ padding: "0.4rem 0.25rem 0.4rem 1.5rem", fontSize: "0.85rem" }}>Universe.sol</td>
                    <td style={{ padding: "0.4rem 0.25rem", textAlign: "right", fontFamily: "monospace" }}>219</td>
                    <td style={{ padding: "0.4rem 0.25rem", fontSize: "0.85rem" }}>Entropy & sectors</td>
                  </tr>
                  <tr style={{ borderBottom: "1px solid #ddd", backgroundColor: "#f9f9f9" }}>
                    <td style={{ padding: "0.4rem 0.25rem 0.4rem 1.5rem", fontSize: "0.85rem" }}>Credits.sol</td>
                    <td style={{ padding: "0.4rem 0.25rem", textAlign: "right", fontFamily: "monospace" }}>94</td>
                    <td style={{ padding: "0.4rem 0.25rem", fontSize: "0.85rem" }}>ERC-20 token</td>
                  </tr>
                  <tr style={{ borderBottom: "1px solid #ddd" }}>
                    <td style={{ padding: "0.4rem 0.25rem", fontWeight: "600" }}>Game Server & Scripts</td>
                    <td style={{ padding: "0.4rem 0.25rem", textAlign: "right", fontFamily: "monospace" }}>17,578</td>
                    <td style={{ padding: "0.4rem 0.25rem" }}>Backend simulation engine</td>
                  </tr>
                  <tr style={{ borderBottom: "1px solid #ddd" }}>
                    <td style={{ padding: "0.4rem 0.25rem", fontWeight: "600" }}>Frontend Application</td>
                    <td style={{ padding: "0.4rem 0.25rem", textAlign: "right", fontFamily: "monospace" }}>20,952</td>
                    <td style={{ padding: "0.4rem 0.25rem" }}>UI & user experience</td>
                  </tr>
                  <tr style={{ borderBottom: "1px solid #ddd", backgroundColor: "#f9f9f9" }}>
                    <td style={{ padding: "0.4rem 0.25rem 0.4rem 1.5rem", fontSize: "0.85rem" }}>App Pages</td>
                    <td style={{ padding: "0.4rem 0.25rem", textAlign: "right", fontFamily: "monospace" }}>10,366</td>
                    <td style={{ padding: "0.4rem 0.25rem", fontSize: "0.85rem" }}>Next.js pages & routes</td>
                  </tr>
                  <tr style={{ borderBottom: "1px solid #ddd", backgroundColor: "#f9f9f9" }}>
                    <td style={{ padding: "0.4rem 0.25rem 0.4rem 1.5rem", fontSize: "0.85rem" }}>Components</td>
                    <td style={{ padding: "0.4rem 0.25rem", textAlign: "right", fontFamily: "monospace" }}>6,433</td>
                    <td style={{ padding: "0.4rem 0.25rem", fontSize: "0.85rem" }}>React components</td>
                  </tr>
                  <tr style={{ borderBottom: "1px solid #ddd", backgroundColor: "#f9f9f9" }}>
                    <td style={{ padding: "0.4rem 0.25rem 0.4rem 1.5rem", fontSize: "0.85rem" }}>Hooks</td>
                    <td style={{ padding: "0.4rem 0.25rem", textAlign: "right", fontFamily: "monospace" }}>3,017</td>
                    <td style={{ padding: "0.4rem 0.25rem", fontSize: "0.85rem" }}>Custom React hooks</td>
                  </tr>
                  <tr style={{ borderBottom: "1px solid #ddd", backgroundColor: "#f9f9f9" }}>
                    <td style={{ padding: "0.4rem 0.25rem 0.4rem 1.5rem", fontSize: "0.85rem" }}>Utils</td>
                    <td style={{ padding: "0.4rem 0.25rem", textAlign: "right", fontFamily: "monospace" }}>1,136</td>
                    <td style={{ padding: "0.4rem 0.25rem", fontSize: "0.85rem" }}>Utility functions</td>
                  </tr>
                  <tr style={{ borderBottom: "2px solid #000", backgroundColor: "#e8e8e8" }}>
                    <td style={{ padding: "0.6rem 0.25rem", fontWeight: "700", fontSize: "1rem" }}>
                      Total Custom Code
                    </td>
                    <td
                      style={{
                        padding: "0.6rem 0.25rem",
                        textAlign: "right",
                        fontWeight: "700",
                        fontFamily: "monospace",
                        fontSize: "1rem",
                      }}
                    >
                      40,591
                    </td>
                    <td style={{ padding: "0.6rem 0.25rem", fontWeight: "600" }}>All custom-written code</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <p
              className="mb-4"
              style={{
                margin: "0 0 0.9rem",
                fontSize: "0.9rem",
                fontStyle: "italic",
                color: "#666",
              }}
            >
              Note: Line counts exclude third-party libraries, node_modules, test files, deployment scripts, and
              generated code. All custom code was written using Claude Sonnet 4.5 in Cursor.
            </p>

            <h3
              className="font-bold mb-4"
              style={{
                fontSize: "1.05rem",
                fontWeight: "600",
                marginTop: "2rem",
                marginBottom: "1rem",
                fontFamily: '"Times New Roman", serif',
                color: "#000",
              }}
            >
              Technology Stack
            </h3>

            <p
              className="mb-4"
              style={{
                margin: "0 0 0.9rem",
              }}
            >
              <strong>Blockchain Layer:</strong> Built on Scaffold-ETH 2, leveraging Foundry for smart contract
              development, testing, and deployment. Smart contracts are written in Solidity and deployed to Arbitrum.
            </p>

            <p
              className="mb-4"
              style={{
                margin: "0 0 0.9rem",
              }}
            >
              <strong>Frontend Layer:</strong> Next.js 14 with App Router, TypeScript, TailwindCSS, and RainbowKit for
              wallet integration. Real-time WebSocket connections provide live game updates and sector visualization.
            </p>

            <p
              className="mb-4"
              style={{
                margin: "0 0 0.9rem",
              }}
            >
              <strong>Backend Layer:</strong> Node.js/TypeScript game server implementing dual-loop architecture (3s
              inner loop for movement/combat, 9s outer loop for blockchain operations). Handles sector simulation,
              commit-reveal entropy, and blockchain state synchronization.
            </p>

            <h3
              className="font-bold mb-4"
              style={{
                fontSize: "1.05rem",
                fontWeight: "600",
                marginTop: "2rem",
                marginBottom: "1rem",
                fontFamily: '"Times New Roman", serif',
                color: "#000",
              }}
            >
              AI-Assisted Development
            </h3>

            <p
              className="mb-4"
              style={{
                margin: "0 0 0.9rem",
              }}
            >
              The entire Extract Protocol codebase—spanning over 40,000 lines of custom code across smart contracts,
              game server logic, and frontend application—was developed using Claude Sonnet 4.5 within the Cursor IDE.
              This includes:
            </p>

            <ul
              style={{
                marginLeft: "1.5rem",
                marginBottom: "0.9rem",
                listStyleType: "disc",
              }}
            >
              <li style={{ marginBottom: "0.5rem" }}>
                Complete smart contract suite with advanced game mechanics, staking, and slashing logic
              </li>
              <li style={{ marginBottom: "0.5rem" }}>
                Sophisticated game server with dual-loop architecture and complex AI behavior systems
              </li>
              <li style={{ marginBottom: "0.5rem" }}>
                Full-featured web application with real-time visualization and blockchain integration
              </li>
              <li style={{ marginBottom: "0.5rem" }}>
                Commit-reveal entropy system and deterministic sector generation algorithms
              </li>
              <li style={{ marginBottom: "0.5rem" }}>
                Comprehensive game mechanics including mining, combat, federation formation, and economic systems
              </li>
            </ul>

            <p
              className="mb-4"
              style={{
                margin: "0 0 0.9rem",
              }}
            >
              This development approach showcases the potential of AI-assisted programming for creating complex,
              production-ready blockchain applications with intricate game mechanics and real-time multiplayer features.
            </p>

            <h3
              className="font-bold mb-4"
              style={{
                fontSize: "1.05rem",
                fontWeight: "600",
                marginTop: "2rem",
                marginBottom: "1rem",
                fontFamily: '"Times New Roman", serif',
                color: "#000",
              }}
            >
              Acknowledgments
            </h3>

            <p
              className="mb-4"
              style={{
                margin: "0 0 0.9rem",
              }}
            >
              This project was built on <strong>Scaffold-ETH 2</strong>, an exceptional open-source toolkit that
              provides everything needed to build decentralized applications on Ethereum. Scaffold-ETH 2 offers a
              comprehensive development environment with hot-reload smart contract editing, type-safe frontend
              integration, pre-built components for common blockchain interactions, and a seamless developer experience
              that dramatically accelerates dApp development.
            </p>

            <p
              className="mb-4"
              style={{
                margin: "0 0 0.9rem",
              }}
            >
              Special recognition to the Scaffold-ETH 2 core team and contributors whose dedication to creating
              developer-friendly tools and fostering the Ethereum builder ecosystem made this project possible.
              Scaffold-ETH 2 represents years of refinement in making blockchain development accessible and productive.
            </p>

            <p
              className="mb-4"
              style={{
                margin: "0 0 0.9rem",
              }}
            >
              From the smart contract hot-reload functionality to the built-in block explorer, from the intuitive hooks
              for reading and writing contract state to the beautiful component library for addresses and balances—every
              aspect of Scaffold-ETH 2 demonstrates thoughtful design for the developer experience. Extract Protocol
              stands on the shoulders of this remarkable foundation.
            </p>
          </section>

          {/* Footer */}
          <div
            className="text-center mt-12 pt-4 border-t border-gray-200"
            style={{
              fontSize: "0.9rem",
              color: "#666",
              marginTop: "3rem",
            }}
          >
            <p>Extract Protocol Whitepaper v1.0 • {new Date().getFullYear()}</p>
          </div>

          {/* Final Quote */}
          <div
            className="text-center mt-8"
            style={{
              fontSize: "0.95rem",
              fontStyle: "italic",
              color: "#333",
              marginTop: "2rem",
            }}
          >
            <p style={{ margin: "0.5rem 0" }}>────────────────────</p>
            <p style={{ margin: "0.75rem 0" }}>
              In the end, no pirate commands the galaxy. The galaxy is commanded by code.
            </p>
            <p style={{ margin: "0.5rem 0" }}>────────────────────</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WhitepaperPage;
