"use client";

import { Address } from "~~/components/scaffold-eth";

export const Chapter2 = () => {
  return (
    <div className="bg-base-300 rounded-3xl p-8 mb-6">
      <h2 className="text-3xl font-bold mb-6 text-primary">Chapter 2: The Announcement (and Audit)</h2>
      <div className="space-y-6">
        {/* TODO Section */}
        <div className="bg-warning/10 border border-warning rounded-lg p-4">
          <p className="text-warning font-semibold">TODO: Graphics and lore content coming soon</p>
        </div>

        {/* Main Content */}
        <div className="prose prose-lg max-w-none text-base-content">
          <h3 className="text-xl font-semibold mb-4 text-secondary">Overview</h3>
          <p className="mb-4">
            Now that you have your satellite deployed, it&apos;s time to <strong>announce yourself</strong> to the
            sector. Pilots need to know who you are and how to contact you when they want to share their success stories
            or collaborate on future missions.
          </p>

          <div className="bg-info/10 border-2 border-info rounded-lg p-6 mb-6">
            <div className="flex items-start space-x-3">
              <div className="text-info text-2xl">💡</div>
              <div>
                <h4 className="font-semibold text-info mb-3">The Two-Part Challenge</h4>
                <p className="text-sm text-base-content mb-2">This chapter has two distinct parts:</p>
                <ol className="list-decimal list-inside space-y-2 text-sm ml-2">
                  <li>
                    <strong>Part 1:</strong> Deploy an Announcement contract with your canonical information (name and
                    social link)
                  </li>
                  <li>
                    <strong>Part 2:</strong> Navigate the official audit system to get your contract verified by the
                    Pirate Council. This is an onchain audit system powered by an AI pirate auditor system. You will
                    request audits by spending points, view audit progress by reading from the Auditor contract (
                    <span className="inline-flex">
                      <Address address="0xc624801dd98bef87c0718ddb43ad3a566cc51ecc" />
                    </span>
                    ), and pirates will only use successfully audited contracts.
                  </li>
                </ol>
              </div>
            </div>
          </div>

          <h3 className="text-xl font-semibold mb-4 text-secondary">Part 1: The Announcement Contract</h3>
          <p className="mb-4">
            You need to deploy an Announcement contract that contains your canonical information. The contract requires
            two constant fields:
          </p>

          {/* Contract Fields */}
          <div className="bg-base-100 rounded-lg p-4 mb-4 border">
            <h4 className="font-semibold mb-3 text-accent">Required Constant Fields:</h4>
            <div className="space-y-2 text-sm mb-4">
              <div className="bg-base-200 p-3 rounded font-mono text-xs">
                <div>string public constant name = &ldquo;YourStationName&rdquo;;</div>
                <div>string public constant social = &ldquo;https://twitter.com/yourusername&rdquo;;</div>
              </div>
            </div>
            <div className="space-y-1 text-sm text-base-content/70">
              <div>
                <strong>name:</strong> Your team/station name
              </div>
              <div>
                <strong>social:</strong> Your contact link (Twitter, Telegram, Signal, etc.)
              </div>
            </div>
            <div className="mt-3 p-2 bg-error/10 rounded text-sm text-error">
              Social URLs must start with <code className="bg-base-100 px-1 rounded">https://</code> to be displayed as
              clickable links
            </div>
            <div className="mt-2 p-2 bg-warning/10 rounded text-sm text-warning">
              <strong>TODO:</strong> More fields will be added as the game matures
            </div>
          </div>

          <h3 className="text-xl font-semibold mb-4 text-secondary">Registry Integration</h3>
          <p className="mb-4">
            After deploying your &ldquo;about&ldquo; contract, you need to call a function in your Registry contract to
            register it under the <code className="bg-base-100 px-2 py-1 rounded text-sm">&ldquo;about&rdquo;</code> key
            in your modules mapping. (You probably have a{" "}
            <code className="bg-base-100 px-2 py-1 rounded text-sm">setModule</code> function or something similar.)
          </p>

          <h3 className="text-xl font-semibold mb-4 text-secondary">Why This Matters</h3>
          <div className="bg-info/10 border border-info rounded-lg p-4 mb-4">
            <div className="flex items-start space-x-3">
              <div className="text-info text-xl">💡</div>
              <div>
                <h4 className="font-semibold text-info mb-2">Increased Tip Potential</h4>
                <p className="text-sm text-base-content">
                  When pilots successfully haul in big asteroid scores and escape the sector, they tip the sector
                  registry. Having your details properly mapped to the &ldquo;about&rdquo; module{" "}
                  <strong>increases your chances of receiving better tips</strong> from grateful pilots!
                </p>
              </div>
            </div>
          </div>

          <h3 className="text-xl font-semibold mb-4 text-secondary">Implementation Steps</h3>
          <div className="space-y-4 mb-6">
            <div className="flex items-center space-x-4">
              <div className="bg-primary text-primary-content rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold flex-shrink-0">
                1
              </div>
              <p>
                Create and deploy your Announcement contract with{" "}
                <code className="bg-base-100 px-2 py-1 rounded text-sm">constant name</code> and{" "}
                <code className="bg-base-100 px-2 py-1 rounded text-sm">constant social</code> fields
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="bg-primary text-primary-content rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold flex-shrink-0">
                2
              </div>
              <p>
                Call your Registry contract&apos;s function to register the Announcement contract address under the
                &ldquo;about&rdquo; key
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="bg-primary text-primary-content rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold flex-shrink-0">
                3
              </div>
              <p>
                <strong className="text-error">VERIFY your contract on the block explorer</strong> - Required before
                requesting an audit
              </p>
            </div>
          </div>

          <h3 className="text-xl font-semibold mb-4 text-secondary">Part 2: The Audit System</h3>
          <p className="mb-4">
            Before your contract is recognized by the protocol, it must pass through the official audit system.
            You&apos;ll submit your contract for review, pay the audit fee, and wait for approval.
          </p>

          <h3 className="text-xl font-semibold mb-4 text-secondary">⚠️ Contract Verification Required</h3>
          <div className="bg-error/10 border-2 border-error rounded-lg p-6 mb-4">
            <div className="flex items-start space-x-3">
              <div className="text-error text-2xl">🏴‍☠️</div>
              <div>
                <p className="text-sm text-base-content mb-3">
                  <strong>You MUST verify your About contract on the block explorer.</strong> Verification makes your
                  source code publicly readable and is required before requesting an audit.
                </p>
                <div className="bg-base-100 rounded p-3 text-sm space-y-2">
                  <div className="font-semibold text-accent mb-2">How to Verify:</div>
                  <ol className="list-decimal list-inside space-y-1 ml-2">
                    <li>Go to your network&apos;s block explorer (e.g., Arbiscan for Arbitrum)</li>
                    <li>Search for your deployed About contract address</li>
                    <li>Click the &ldquo;Contract&rdquo; tab, then &ldquo;Verify and Publish&rdquo;</li>
                    <li>
                      Select your compiler version and settings (check your{" "}
                      <code className="bg-base-200 px-1 rounded">foundry.toml</code>)
                    </li>
                    <li>Paste your contract source code and submit</li>
                  </ol>
                  <div className="mt-3 text-xs text-base-content/70 italic">
                    💡 Tip: Scaffold-ETH 2 includes verification scripts. Just run{" "}
                    <code className="bg-base-200 px-1 rounded">yarn verify</code>!
                  </div>
                </div>
              </div>
            </div>
          </div>

          <h3 className="text-xl font-semibold mb-4 text-secondary">🔍 Step 1: Request an Official Audit</h3>
          <div className="bg-warning/10 border-2 border-warning rounded-lg p-6 mb-4">
            <div className="flex items-start space-x-3">
              <div className="text-warning text-2xl">⚖️</div>
              <div>
                <h4 className="font-semibold text-warning mb-3">Submit Your Contract to the Auditor</h4>
                <p className="text-sm text-base-content mb-3">
                  The Pirate Council has established an <strong>official Auditor contract</strong> that validates all
                  submitted contracts. You must request an official audit, which costs{" "}
                  <strong className="text-error">2 points</strong> (prevents spam and ensures sybil resistance).
                </p>
                <div className="bg-base-100 rounded p-4 text-sm space-y-3 mb-3">
                  <div className="font-semibold text-accent mb-2">How to Request an Audit:</div>
                  <p className="text-xs text-base-content/70 mb-2">
                    Call the <code className="bg-base-200 px-1 rounded">requestAudit</code> function on the Auditor
                    contract (
                    <span className="inline-flex">
                      <Address address="0xc624801dd98bef87c0718ddb43ad3a566cc51ecc" />
                    </span>
                    ) with the arguments: your contract address, the chapter number, optional block explorer url.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <h3 className="text-xl font-semibold mb-4 text-secondary">🔍 Step 2: Check Your Audit Status</h3>

          <div className="bg-success/10 border-2 border-success rounded-lg p-6 mb-4">
            <div className="flex items-start space-x-3">
              <div className="text-success text-2xl">⚡</div>
              <div>
                <h4 className="font-semibold text-success mb-3">Quick Way: Check Your Last Audit</h4>
                <p className="text-sm text-base-content mb-3">
                  The easiest way to check your most recent audit is to use the{" "}
                  <code className="bg-base-100 px-1 rounded">lastAuditResult</code> function on the Auditor contract (
                  <span className="inline-flex">
                    <Address address="0xc624801dd98bef87c0718ddb43ad3a566cc51ecc" />
                  </span>
                  ).
                </p>
              </div>
            </div>
          </div>

          <h3 className="text-xl font-semibold mb-4 text-secondary">Implementation Steps</h3>
          <div className="space-y-4 mb-6">
            <div className="flex items-center space-x-4">
              <div className="bg-primary text-primary-content rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold flex-shrink-0">
                1
              </div>
              <p>
                <strong className="text-error">VERIFY</strong> your Announcement contract on the block explorer
                (required before audit)
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="bg-primary text-primary-content rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold flex-shrink-0">
                2
              </div>
              <p>
                Call <code className="bg-base-100 px-2 py-1 rounded text-sm">requestAudit</code> on the Auditor contract
                with your contract address, chapter number (2), and optional block explorer URL
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="bg-primary text-primary-content rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold flex-shrink-0">
                3
              </div>
              <p>
                Check audit status using <code className="bg-base-100 px-2 py-1 rounded text-sm">lastAuditResult</code>{" "}
                on the Auditor contract
              </p>
            </div>
          </div>

          <h3 className="text-xl font-semibold mb-4 mt-6 text-secondary">Station Name After Audit</h3>
          <div className="bg-accent/10 border border-accent rounded-lg p-6">
            <p className="mb-3">
              Once your About contract is audited, your sector name and social link will display on the dashboard.
            </p>
            <p>
              Pilots can now see who operates the sector and how to contact you. This increases trust and should result
              in better tips when they successfully escape with big scores.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
