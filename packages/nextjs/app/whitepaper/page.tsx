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
            padding: "1in",
            fontSize: "11pt",
            lineHeight: "1.55",
            fontFamily: '"Times New Roman", "STIX Two Text", "Georgia", serif',
            textRendering: "optimizeLegibility",
          }}
        >
          {/* Title Block */}
          <div className="text-center mb-8">
            <h1
              className="font-bold mb-4"
              style={{
                fontSize: "1.85rem",
                margin: "2rem 0 0.25rem",
                fontWeight: "700",
              }}
            >
              Extract Protocol: A Decentralized Framework for Asteroid Mining Rights
            </h1>
            <div
              className="mb-6"
              style={{
                color: "#555",
                marginBottom: "1.25rem",
                fontSize: "1rem",
              }}
            >
              Max Extract
            </div>
          </div>

          {/* Abstract */}
          <section className="mb-8" style={{ margin: "2rem 0", fontSize: "0.975rem" }}>
            <div
              className="mb-2"
              style={{
                fontVariant: "small-caps",
                letterSpacing: "0.04em",
                color: "#555",
                marginBottom: "0.25rem",
                fontWeight: "600",
              }}
            >
              Abstract
            </div>
            <p
              className="text-justify"
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
              className="text-justify"
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
          </section>

          {/* Table of Contents */}
          <nav
            className="mb-8"
            style={{
              margin: "2rem 0",
              fontSize: "0.95rem",
            }}
          >
            <h2
              className="font-bold mb-4"
              style={{
                fontSize: "1.2rem",
                fontWeight: "700",
                marginBottom: "1rem",
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
                  <span className="text-gray-500 mr-2">2.</span>The Problem of Asteroid Mining Anarchy
                </span>
                <span>4</span>
              </div>
              <div className="flex justify-between border-b border-dotted border-gray-300 pb-1">
                <span>
                  <span className="text-gray-500 mr-2">3.</span>Protocol Design
                </span>
                <span>6</span>
              </div>
              <div className="flex justify-between border-b border-dotted border-gray-300 pb-1">
                <span>
                  <span className="text-gray-500 mr-2">4.</span>Implementation
                </span>
                <span>8</span>
              </div>
              <div className="flex justify-between border-b border-dotted border-gray-300 pb-1">
                <span>
                  <span className="text-gray-500 mr-2">5.</span>Economic Model
                </span>
                <span>10</span>
              </div>
              <div className="flex justify-between border-b border-dotted border-gray-300 pb-1">
                <span>
                  <span className="text-gray-500 mr-2">6.</span>Conclusion
                </span>
                <span>12</span>
              </div>
            </div>
          </nav>

          {/* Section 1 */}
          <section className="mb-6">
            <h2
              className="font-bold mb-4"
              style={{
                fontSize: "1.3rem",
                fontWeight: "700",
                marginTop: "2.2rem",
                marginBottom: "1rem",
              }}
            >
              <span className="text-gray-500 mr-2">1.</span>Introduction
            </h2>
            <p
              className="text-justify mb-4"
              style={{
                textAlign: "justify",
                hyphens: "auto",
                margin: "0 0 0.9rem",
              }}
            >
              The asteroid belt represents humanity&apos;s greatest untapped resource frontier, yet its exploitation
              remains hampered by fundamental coordination failures. Traditional governance structures prove inadequate
              in the vast emptiness of space, where enforcement is costly and trust is scarce. This paper presents the
              Extract Protocol, a blockchain-based solution that establishes property rights and reputation systems for
              asteroid mining operations.
            </p>
            <p
              className="text-justify mb-4"
              style={{
                textAlign: "justify",
                hyphens: "auto",
                margin: "0 0 0.9rem",
              }}
            >
              <em>[Content continues...]</em>
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
