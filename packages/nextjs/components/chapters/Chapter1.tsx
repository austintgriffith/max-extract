"use client";

export const Chapter1 = () => {
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
            <pre className="text-sm overflow-x-auto">
              <code className="text-accent">{`mapping(string => address) public modules;`}</code>
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
              <code className="bg-base-100 px-2 py-1 rounded text-sm">broadcast</code> function on the MaxExtract
              contract.
            </p>
            <p className="mb-3">
              <strong>Account Verification:</strong> Must be triggered by the same account that bought into the game
              [TODO: link to tx.origin line of contract in block explorer].
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
            Pilots that enter this space will interact with your registry to discover what contracts are available for
            interaction.
          </p>
          <p className="mb-4">
            After successfully broadcasting, you can use the{" "}
            <code className="bg-base-100 px-2 py-1 rounded text-sm">playerToSector(yourAddress)</code> function in the
            MaxExtract contract to check your assigned sector ID.
          </p>

          <h3 className="text-xl font-semibold mb-4 mt-6 text-secondary">Registry Updates</h3>
          <p className="mb-4">
            Update your registry to a new contract at any time by calling the following function on the Max Extract
            contract from your new registry contract [TODO: link to contract]:
          </p>
          <div className="bg-base-100 rounded-lg p-4 mb-4 border">
            <pre className="text-sm overflow-x-auto">
              <code className="text-accent">{`function updateRegistry() external`}</code>
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
