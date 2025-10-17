"use client";

import { MarkdownWithMath } from "~~/components/MarkdownWithMath";

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
            // Remove aspectRatio so content can expand vertically
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
              extract.fi
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
              TODO
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
                  <span className="text-gray-500 mr-2">2.</span>Randomness
                </span>
                <span>4</span>
              </div>
              <div className="flex justify-between border-b border-dotted border-gray-300 pb-1">
                <span>
                  <span className="text-gray-500 mr-2">3.</span>The Problem of Extraction Anarchy
                </span>
                <span>6</span>
              </div>
              <div className="flex justify-between border-b border-dotted border-gray-300 pb-1">
                <span>
                  <span className="text-gray-500 mr-2">4.</span>Protocol Design
                </span>
                <span>8</span>
              </div>
              <div className="flex justify-between border-b border-dotted border-gray-300 pb-1">
                <span>
                  <span className="text-gray-500 mr-2">5.</span>Implementation
                </span>
                <span>10</span>
              </div>
              <div className="flex justify-between border-b border-dotted border-gray-300 pb-1">
                <span>
                  <span className="text-gray-500 mr-2">6.</span>Economic Model
                </span>
                <span>12</span>
              </div>
              <div className="flex justify-between border-b border-dotted border-gray-300 pb-1">
                <span>
                  <span className="text-gray-500 mr-2">7.</span>Conclusion
                </span>
                <span>14</span>
              </div>
            </div>
          </nav>

          {/* Section 1 */}
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
            <p
              className="text-justify mb-4"
              style={{
                textAlign: "justify",
                hyphens: "auto",
                margin: "0 0 0.9rem",
              }}
            >
              TODO
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
              2&nbsp;&nbsp;&nbsp;&nbsp;Randomness
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
              including the GOD address, due to the dependency on future block hashes.
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
              function.
            </p>

            <p
              className="text-justify mb-4"
              style={{
                textAlign: "justify",
                hyphens: "auto",
                margin: "0 0 0.9rem",
              }}
            >
              This approach ensures that each sector has access to high-quality randomness that is both unpredictable
              and verifiable, while maintaining independence between sectors. When the rolling entropy updates, all
              sectors automatically receive fresh randomness for their ongoing operations.
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
        </div>
      </div>
    </div>
  );
};

export default WhitepaperPage;
