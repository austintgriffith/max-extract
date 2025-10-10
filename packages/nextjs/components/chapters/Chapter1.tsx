"use client";

export const Chapter1 = () => {
  return (
    <div className="bg-base-300 rounded-3xl p-8 mb-6">
      <h2 className="text-3xl font-bold mb-6 text-primary">📖 Chapter 1: The Signal</h2>
      <div className="space-y-6">
        {/* TODO Section */}
        <div className="bg-warning/10 border border-warning rounded-lg p-4">
          <p className="text-warning font-semibold">🚧 TODO: Graphics and lore content coming soon</p>
        </div>

        {/* Main Content */}
        <div className="prose prose-lg max-w-none text-base-content">
          <h3 className="text-xl font-semibold mb-4 text-secondary">Overview</h3>
          <p className="mb-4">
            To participate in the Max Extract Protocol, you need to deploy a <strong>Registry Contract</strong> that
            calls the <code className="bg-base-100 px-2 py-1 rounded text-sm">broadcast</code> function on the
            MaxExtract contract [TODO: link to contract].
          </p>

          <h3 className="text-xl font-semibold mb-4 text-secondary">Your Registry Contract</h3>
          <p className="mb-4">
            This contract will act as your <strong>registry</strong> where pilots can discover and interact with your
            deployed contracts in the sector.
          </p>

          {/* Code Block */}
          <div className="bg-base-100 rounded-lg p-4 mb-4 border">
            <h4 className="text-sm font-semibold text-base-content/70 mb-2">Required Contract Structure:</h4>
            <pre className="text-sm overflow-x-auto">
              <code className="text-accent">{`mapping(string => address) public modules;`}</code>
            </pre>
          </div>

          <h3 className="text-xl font-semibold mb-4 text-secondary">Key Requirements</h3>
          <ul className="space-y-3 mb-4">
            <li className="flex items-start">
              <span className="text-primary mr-2">•</span>
              <span>
                <strong>Access Control:</strong> Only you should be able to update the modules mapping as you deploy new
                contracts
              </span>
            </li>
            <li className="flex items-start">
              <span className="text-primary mr-2">•</span>
              <span>
                <strong>Broadcast Function:</strong> Include a function that calls the{" "}
                <code className="bg-base-100 px-2 py-1 rounded text-sm">broadcast</code> function on the MaxExtract
                contract
              </span>
            </li>
            <li className="flex items-start">
              <span className="text-primary mr-2">•</span>
              <span>
                <strong>Account Verification:</strong> Must be triggered by the same account that bought into the game
                [TODO: link to tx.origin line of contract in block explorer]
              </span>
            </li>
          </ul>

          <h3 className="text-xl font-semibold mb-4 text-secondary">The Broadcast Process</h3>
          <div className="bg-info/10 border border-info rounded-lg p-4">
            <p className="mb-2">
              🛰️ By triggering the broadcast function, you will <strong>launch a tiny satellite</strong> into a sector
              of space.
            </p>
            <p>
              🚀 Pilots that enter this space will interact with your registry to discover what contracts are available
              for interaction.
            </p>
          </div>

          <h3 className="text-xl font-semibold mb-4 mt-6 text-secondary">Registry Updates</h3>
          <p className="mb-2">Update your registry contract at any time:</p>
          <div className="bg-base-100 rounded-lg p-4 border">
            <pre className="text-sm overflow-x-auto">
              <code className="text-accent">{`function updateRegistry(address newRegistry, uint256 sectorId) external`}</code>
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
