"use client";

import { Address } from "~~/components/scaffold-eth";
import { useDeployedContractInfo } from "~~/hooks/scaffold-eth";

export const Chapter1 = () => {
  const { data: maxExtractContract } = useDeployedContractInfo("MaxExtract");
  return (
    <div className="bg-base-300 rounded-3xl p-8 mb-6">
      <h2 className="text-3xl font-bold mb-6 text-primary">Chapter 1: The Signal</h2>
      <div className="space-y-6">
        {/* TODO Section */}
        <div className="bg-warning/10 border border-warning rounded-lg p-4">
          <p className="text-warning font-semibold">TODO: Graphics and lore content coming soon</p>
        </div>

        {/* Main Content */}
        <div className="prose prose-lg max-w-none text-base-content">
          <h3 className="text-xl font-semibold mb-4 text-secondary">Overview</h3>
          <div className="mb-4">
            To participate in the Max Extract Protocol, you need to deploy a <strong>Registry Contract</strong> that
            calls the <code className="bg-base-100 px-2 py-1 rounded text-sm">broadcast</code> function on the
            MaxExtract contract (
            {maxExtractContract && (
              <span className="inline-flex">
                <Address address={maxExtractContract.address} />
              </span>
            )}
            ).
          </div>

          <h3 className="text-xl font-semibold mb-4 text-secondary">Your Registry Contract</h3>
          <p className="mb-4">
            This contract will act as your <strong>registry</strong> where pilots can discover and interact with your
            deployed contracts in the sector.
          </p>

          {/* Code Block */}
          <div className="bg-base-100 rounded-lg p-4 mb-4 border">
            <pre className="text-sm overflow-x-auto">
              <code className="text-accent">{`uint256 public sectorId; // Store your sector ID
mapping(string => address) public modules; // Your module registry`}</code>
            </pre>
          </div>

          <h3 className="text-xl font-semibold mb-4 text-secondary">Key Requirements</h3>
          <div className="space-y-4 mb-6">
            <p className="mb-3">
              <strong>Access Control:</strong> Only you should be able to update the modules mapping as you deploy new
              contracts.
            </p>
            <p className="mb-3">
              <strong>Broadcast Function:</strong> Include a function that calls the{" "}
              <code className="bg-base-100 px-2 py-1 rounded text-sm">broadcast()</code> function on the MaxExtract
              contract. This function returns your sector ID which you should store.
            </p>
            <p className="mb-3">
              <strong>Account Verification:</strong> Must be triggered by the same account that bought into the game{" "}
              <a
                href="https://arbiscan.io/address/0x7dacc49eB4C0539252d5FCf6653d596bB2DFF26F#code#F1#L121"
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent hover:underline"
              >
                (see code)
              </a>
              .
            </p>
          </div>

          {/* Flow Diagram */}
          <div className="bg-base-100 rounded-lg p-6 mb-6 border">
            <div className="flex items-center justify-center space-x-4 text-sm">
              <div className="bg-primary/10 border border-primary rounded-lg px-4 py-2 text-center">
                <div className="font-semibold text-primary">tx.origin</div>
                <div className="text-xs text-base-content/70">(your buy-in eoa)</div>
              </div>
              <div className="text-primary text-xl">→</div>
              <div className="bg-secondary/10 border border-secondary rounded-lg px-4 py-2 text-center">
                <div className="font-semibold text-secondary">Registry Contract</div>
                <div className="text-xs text-base-content/70">(your contract)</div>
              </div>
              <div className="text-primary text-xl">→</div>
              <div className="bg-accent/10 border border-accent rounded-lg px-4 py-2 text-center">
                <div className="font-semibold text-accent">MaxExtract Contract</div>
                <div className="text-xs text-base-content/70">(broadcast function)</div>
              </div>
            </div>
          </div>

          <h3 className="text-xl font-semibold mb-4 text-secondary">The Broadcast Process</h3>
          <p className="mb-3">
            By triggering the broadcast function, you will <strong>launch a tiny satellite</strong> into a sector of
            space.
          </p>
          <p className="mb-3">
            Your sector will start as <strong>&ldquo;Class 0&rdquo; airspace</strong>, the most dangerous
            classification. Only the largest, most rugged ships can safely navigate these uncharted conditions.
          </p>

          <div className="bg-error/10 border-2 border-error rounded-lg p-6 mb-4">
            <div className="flex items-start space-x-3">
              <div className="text-error text-2xl">🚨</div>
              <div>
                <h4 className="font-semibold text-error mb-3">Class 0 Airspace Restrictions</h4>
                <p className="text-sm text-base-content mb-3">
                  Only <strong>Ship Models E and F</strong> (the largest and most capable vessels) can get clearance to
                  enter Class 0 airspace. Smaller ships simply cannot handle the hazardous conditions.
                </p>
                <p className="text-sm text-base-content">
                  All pilots must be equipped with a <strong>killswitch transponder</strong> that broadcasts death
                  signals to your relay station (your satellite), which relays critical events to the Max Extract
                  system.
                </p>
              </div>
            </div>
          </div>

          <h3 className="text-xl font-semibold mb-4 text-secondary">Getting an Opening</h3>
          <div className="bg-info/10 border-2 border-info rounded-lg p-6 mb-4">
            <div className="flex items-start space-x-3">
              <div className="text-info text-2xl">🛫</div>
              <div>
                <p className="text-sm text-base-content mb-3">
                  Pilots are constantly monitoring space traffic patterns, waiting for an{" "}
                  <strong>&ldquo;opening&rdquo;</strong> to their desired sector. When the rolling entropy aligns and
                  conditions are favorable, a pilot gets their opening and can attempt entry.
                </p>
                <p className="text-sm text-base-content">
                  However, even with an opening, pilots must meet all airspace requirements. If their ship model is too
                  small for the airspace class, they&apos;ll be denied entry and must wait for another opening.
                </p>
              </div>
            </div>
          </div>

          <p className="mb-3">
            Pilots that successfully enter will interact with your registry to discover what contracts are available for
            interaction.
          </p>
          <p className="mb-3">
            Once your satellite is deployed, pilots who successfully score big asteroids and escape the sector will tip
            your registry contract as a reward for providing valuable services!
          </p>
          <p className="mb-4">
            The <code className="bg-base-100 px-2 py-1 rounded text-sm">broadcast()</code> function returns your sector
            ID directly, which your registry contract should store. You can also check your sector ID anytime using{" "}
            <code className="bg-base-100 px-2 py-1 rounded text-sm">playerToSector(yourAddress)</code> on the MaxExtract
            contract.
          </p>

          <h3 className="text-xl font-semibold mb-4 mt-6 text-secondary">Registry Updates</h3>
          <p className="mb-4">
            Need to deploy a new registry? Update your registry address at any time by calling the{" "}
            <code className="bg-base-100 px-2 py-1 rounded text-sm">updateRegistry()</code> function on the MaxExtract
            contract from your new registry contract. Like{" "}
            <code className="bg-base-100 px-2 py-1 rounded text-sm">broadcast()</code>, this function returns your
            sector ID which your new registry should store.
          </p>

          <h3 className="text-xl font-semibold mb-4 text-secondary">Implementation Steps</h3>
          <div className="space-y-4 mb-6">
            <div className="flex items-center space-x-4">
              <div className="bg-primary text-primary-content rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold flex-shrink-0">
                1
              </div>
              <p>
                Create and deploy your Registry contract with a{" "}
                <code className="bg-base-100 px-2 py-1 rounded text-sm">modules</code> mapping and access control
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="bg-primary text-primary-content rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold flex-shrink-0">
                2
              </div>
              <p>
                Call the <code className="bg-base-100 px-2 py-1 rounded text-sm">broadcast()</code> function on the
                MaxExtract contract from your Registry to launch your satellite and store the returned sector ID
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="bg-primary text-primary-content rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold flex-shrink-0">
                3
              </div>
              <p>
                Your sector is now live! You can verify your sector ID is stored correctly by checking{" "}
                <code className="bg-base-100 px-2 py-1 rounded text-sm">playerToSector(yourAddress)</code> on the
                MaxExtract contract
              </p>
            </div>
          </div>

          <h3 className="text-xl font-semibold mb-4 mt-6 text-secondary">Your Sector Goes Live</h3>
          <div className="bg-accent/10 border border-accent rounded-lg p-6">
            <p className="mb-3">
              <strong>As soon as you call the broadcast function</strong>, your sector becomes active and pilots can
              start getting openings to enter your airspace!
            </p>
            <p className="mb-3">
              A <strong>link to your sector</strong> will appear in your title bar, allowing you to monitor activity and
              see which pilots are exploring your space.
            </p>
            <p className="mb-3">
              Remember: your sector starts as <strong>Class 0 airspace</strong> - the most dangerous classification.
              Only Ship Models E and F can get clearance to enter. These are the battle-hardened veterans with the most
              capable vessels.
            </p>
            <p>
              As you progress through the chapters and upgrade your station, your airspace classification will improve,
              allowing smaller ship models to safely navigate your sector.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
