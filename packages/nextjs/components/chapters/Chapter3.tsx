"use client";

export const Chapter3 = () => {
  return (
    <div className="bg-base-300 rounded-3xl p-8 mb-6">
      <h2 className="text-3xl font-bold mb-6 text-primary">Chapter 3: Access Credentials</h2>
      <div className="space-y-6">
        {/* TODO Section */}
        <div className="bg-warning/10 border border-warning rounded-lg p-4">
          <p className="text-warning font-semibold">TODO: Graphics and lore content coming soon</p>
        </div>

        {/* Main Content */}
        <div className="prose prose-lg max-w-none text-base-content">
          <h3 className="text-xl font-semibold mb-4 text-secondary">Overview</h3>
          <p className="mb-4">
            Now that you have your satellite deployed and your identity announced, it&apos;s time to establish{" "}
            <strong>access control</strong> for your sector. Not all pilots can dock at your station—only those who hold
            a valid <strong>credential NFT</strong>.
          </p>

          <h3 className="text-xl font-semibold mb-4 text-secondary">The Credential System</h3>
          <p className="mb-4">
            You need to deploy a <strong>soulbound ERC-721 NFT contract</strong> that acts as an access pass to your
            sector. Pilots will mint these credentials to gain landing rights at your station.
          </p>

          <div className="bg-info/10 border border-info rounded-lg p-4 mb-4">
            <div className="flex items-start space-x-3">
              <div className="text-info text-xl">💎</div>
              <div>
                <h4 className="font-semibold text-info mb-2">What is &ldquo;Soulbound&rdquo;?</h4>
                <p className="text-sm text-base-content">
                  A soulbound NFT cannot be transferred or sold after it&apos;s minted. It&apos;s permanently bound to
                  the wallet that minted it. This prevents credential sharing and ensures each pilot earns their own
                  access.
                </p>
              </div>
            </div>
          </div>

          <h3 className="text-xl font-semibold mb-4 text-secondary">Contract Requirements</h3>
          <div className="space-y-4 mb-6">
            <div className="bg-base-100 rounded-lg p-4 border">
              <h4 className="font-semibold mb-3 text-accent">Your Credential Contract Must:</h4>
              <ul className="space-y-2 text-sm list-disc list-inside">
                <li>
                  <strong>Be an ERC-721 NFT</strong>: Standard NFT implementation
                </li>
                <li>
                  <strong>Be Soulbound</strong>: Override transfer functions to prevent transfers after minting
                </li>
                <li>
                  <strong>Have an issue() function</strong>: Public function pilots call to mint their credential
                </li>
                <li>
                  <strong>Call Game.pilotMintSectorCredential()</strong>: Pass your player address to earn points
                </li>
              </ul>
            </div>
          </div>

          <h3 className="text-xl font-semibold mb-4 text-secondary">The Issue Function</h3>
          <p className="mb-4">
            Your credential contract must have an <code className="bg-base-100 px-2 py-1 rounded text-sm">issue()</code>{" "}
            function that pilots can call to mint themselves a credential. This function should:
          </p>

          <div className="bg-base-100 rounded-lg p-4 mb-4 border">
            <pre className="text-sm overflow-x-auto">
              <code className="text-accent">{`function issue() external {
    // Mint the NFT to the caller (tx.origin)
    _mint(tx.origin, nextTokenId++);
    
    // Call the Game contract to award points to YOUR player address
    game.pilotMintSectorCredential(YOUR_PLAYER_ADDRESS);
}`}</code>
            </pre>
          </div>

          <div className="bg-base-200 rounded-lg p-4 mb-4">
            <h4 className="font-semibold mb-2">Key Points:</h4>
            <ul className="space-y-2 text-sm list-disc list-inside">
              <li>
                The function mints an NFT to the pilot calling it (
                <code className="bg-base-100 px-1 rounded">tx.origin</code>)
              </li>
              <li>
                It then calls{" "}
                <code className="bg-base-100 px-1 rounded">game.pilotMintSectorCredential(YOUR_PLAYER_ADDRESS)</code>
              </li>
              <li>
                The Game contract verifies everything on-chain and awards you <strong>5 points</strong>
              </li>
            </ul>
          </div>

          <h3 className="text-xl font-semibold mb-4 text-secondary">On-Chain Verification</h3>
          <p className="mb-4">
            The Game contract performs extensive verification to ensure security. When your credential contract calls{" "}
            <code className="bg-base-100 px-2 py-1 rounded text-sm">pilotMintSectorCredential()</code>, it:
          </p>

          <div className="bg-base-100 rounded-lg p-4 mb-4 border">
            <ul className="space-y-2 text-sm list-disc list-inside">
              <li>
                ✅ Verifies <code className="bg-base-100 px-1 rounded">tx.origin</code> is an active pilot
              </li>
              <li>✅ Checks that you (the player) have a registered sector</li>
              <li>
                ✅ Looks up your registry and verifies the credential contract is registered under the{" "}
                <code className="bg-base-100 px-1 rounded">&ldquo;credential&rdquo;</code> key
              </li>
              <li>
                ✅ Ensures <code className="bg-base-100 px-1 rounded">msg.sender</code> matches your registered
                credential
              </li>
              <li>✅ Verifies this pilot hasn&apos;t already minted from you (prevents point farming)</li>
              <li>✅ Awards you 5 points if all checks pass</li>
            </ul>
          </div>

          <div className="bg-success/10 border border-success rounded-lg p-4 mb-4">
            <div className="flex items-start space-x-3">
              <div className="text-success text-xl">🛡️</div>
              <div>
                <h4 className="font-semibold text-success mb-2">Trustless Security</h4>
                <p className="text-sm text-base-content">
                  You cannot cheat the system. The Game contract validates every credential mint on-chain. If your
                  implementation is wrong or malicious, you simply won&apos;t earn points.
                </p>
              </div>
            </div>
          </div>

          <h3 className="text-xl font-semibold mb-4 text-secondary">⚠️ CRITICAL: One-Time Purchase</h3>
          <div className="bg-error/10 border-2 border-error rounded-lg p-4 mb-4">
            <div className="flex items-start space-x-3">
              <div className="text-error text-2xl">🚨</div>
              <div>
                <h4 className="font-semibold text-error mb-3 text-lg">Each Pilot Can Only Buy Once</h4>
                <p className="text-sm text-base-content mb-3">
                  The Game contract enforces a strict rule:{" "}
                  <strong>each pilot can only mint a credential from each player ONE TIME</strong>. This prevents you
                  from farming points by redeploying credential contracts.
                </p>
                <p className="text-sm text-base-content mb-3">
                  <strong className="text-error">This means:</strong>
                </p>
                <ul className="space-y-2 text-sm list-disc list-inside mb-3">
                  <li>Get your credential contract right the FIRST time</li>
                  <li>Test thoroughly before deploying to mainnet</li>
                  <li>
                    If you upgrade your credential contract, you MUST migrate existing pilots (airdrop new credentials)
                  </li>
                  <li>Pilots who already bought from you won&apos;t be able to mint from your new contract</li>
                </ul>
                <p className="text-sm text-base-content font-semibold">
                  Plan your migration strategy if you need to upgrade! Unmigrated pilots will lose access to your
                  sector.
                </p>
              </div>
            </div>
          </div>

          <h3 className="text-xl font-semibold mb-4 text-secondary">Registry Integration</h3>
          <p className="mb-4">
            After deploying your credential contract, register it in your Registry contract under the{" "}
            <code className="bg-base-100 px-2 py-1 rounded text-sm">&ldquo;credential&rdquo;</code> key:
          </p>

          <div className="bg-base-100 rounded-lg p-4 mb-4 border">
            <pre className="text-sm overflow-x-auto">
              <code className="text-accent">{`// Call your Registry's setModule function (or equivalent)
registry.setModule("credential", credentialContractAddress);`}</code>
            </pre>
          </div>

          <h3 className="text-xl font-semibold mb-4 text-secondary">Making Credentials Soulbound</h3>
          <p className="mb-4">
            To make your ERC-721 NFT soulbound, override the transfer functions to prevent transfers after minting:
          </p>

          <div className="bg-base-100 rounded-lg p-4 mb-4 border">
            <pre className="text-sm overflow-x-auto">
              <code className="text-accent">{`// Override transfer functions to make NFT soulbound
function transferFrom(address, address, uint256) public pure override {
    revert("Soulbound: cannot transfer");
}

function safeTransferFrom(address, address, uint256) public pure override {
    revert("Soulbound: cannot transfer");
}

function safeTransferFrom(address, address, uint256, bytes memory) public pure override {
    revert("Soulbound: cannot transfer");
}`}</code>
            </pre>
          </div>

          <div className="bg-warning/10 border border-warning rounded-lg p-4 mb-4">
            <div className="flex items-start space-x-3">
              <div className="text-warning text-xl">🤖</div>
              <div>
                <h4 className="font-semibold text-warning mb-2">TODO: AI Auditor System</h4>
                <p className="text-sm text-base-content">
                  An AI auditor system will be built to verify that credentials are truly soulbound before pilots
                  purchase them. Pilots will consult the auditor to ensure the credential contract is legitimate and
                  follows all the rules. This is a future enhancement to protect pilots from malicious contracts.
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
                Create an ERC-721 NFT contract with soulbound transfer restrictions (override transfer functions to
                revert)
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="bg-primary text-primary-content rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold flex-shrink-0">
                2
              </div>
              <p>
                Add an <code className="bg-base-100 px-2 py-1 rounded text-sm">issue()</code> function that mints to{" "}
                <code className="bg-base-100 px-2 py-1 rounded text-sm">tx.origin</code> and calls{" "}
                <code className="bg-base-100 px-2 py-1 rounded text-sm">
                  game.pilotMintSectorCredential(YOUR_ADDRESS)
                </code>
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="bg-primary text-primary-content rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold flex-shrink-0">
                3
              </div>
              <p>Deploy your credential contract to the network</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="bg-primary text-primary-content rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold flex-shrink-0">
                4
              </div>
              <p>
                Register it in your Registry under{" "}
                <code className="bg-base-100 px-2 py-1 rounded text-sm">&ldquo;credential&rdquo;</code>
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="bg-primary text-primary-content rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold flex-shrink-0">
                5
              </div>
              <p>Test by having a pilot call the issue function and verify points are awarded</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="bg-primary text-primary-content rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold flex-shrink-0">
                6
              </div>
              <p>
                Check the{" "}
                <a href="/dashboard" className="link link-primary">
                  dashboard
                </a>{" "}
                to see your score increase
              </p>
            </div>
          </div>

          <h3 className="text-xl font-semibold mb-4 text-secondary">Testing Your Implementation</h3>
          <div className="bg-base-100 rounded-lg p-4 mb-4 border">
            <p className="text-sm mb-2">
              <strong>Before going to production, verify:</strong>
            </p>
            <ul className="space-y-2 text-sm list-disc list-inside">
              <li>Transfer functions properly revert (test on testnet)</li>
              <li>
                The <code className="bg-base-100 px-1 rounded">issue()</code> function successfully mints to pilots
              </li>
              <li>
                The Game contract awards you points when pilots mint (check{" "}
                <code className="bg-base-100 px-1 rounded">scores[yourAddress]</code>)
              </li>
              <li>The credential is properly registered in your registry</li>
              <li>
                The Game contract can verify pilot access via{" "}
                <code className="bg-base-100 px-1 rounded">canPilotAccessSector()</code>
              </li>
            </ul>
          </div>

          <div className="bg-info/10 border border-info rounded-lg p-4 mb-4">
            <div className="flex items-start space-x-3">
              <div className="text-info text-xl">💡</div>
              <div>
                <h4 className="font-semibold text-info mb-2">Why Credentials Matter</h4>
                <p className="text-sm text-base-content">
                  In future chapters, pilots will need valid credentials to land at your station, access your services,
                  and interact with your contracts. Without proper credentials, pilots can&apos;t dock—and you
                  don&apos;t earn points. This system creates a permissioned economy where you control who can access
                  your sector.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
