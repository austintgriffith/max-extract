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
                  <strong>Call Game.pilotMintSectorCredential(sectorId)</strong>: Pass your sector ID to earn points
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
    // Mint the NFT to the pilot calling this function
    _mint(msg.sender, nextTokenId++);

    // Call the Game contract directly with your sector ID
    game.pilotMintSectorCredential(YOUR_SECTOR_ID);
}`}</code>
            </pre>
          </div>

          <div className="bg-base-200 rounded-lg p-4 mb-4">
            <h4 className="font-semibold mb-2">Key Points:</h4>
            <ul className="space-y-2 text-sm list-disc list-inside">
              <li>
                The function mints an NFT to the pilot calling it (
                <code className="bg-base-100 px-1 rounded">msg.sender</code>)
              </li>
              <li>
                It then calls <code className="bg-base-100 px-1 rounded">game.pilotMintSectorCredential(sectorId)</code>{" "}
                directly
              </li>
              <li>
                The Game contract verifies everything on-chain and awards you <strong>2 points</strong>
              </li>
            </ul>
          </div>

          <h3 className="text-xl font-semibold mb-4 text-secondary">On-Chain Verification</h3>
          <p className="mb-4">
            The Game contract performs extensive verification to ensure security. When your credential contract calls{" "}
            <code className="bg-base-100 px-2 py-1 rounded text-sm">pilotMintSectorCredential(sectorId)</code>, it:
          </p>

          <div className="bg-base-100 rounded-lg p-4 mb-4 border">
            <ul className="space-y-2 text-sm list-disc list-inside">
              <li>
                ✅ Verifies <code className="bg-base-100 px-1 rounded">tx.origin</code> is an active pilot (the original
                transaction signer)
              </li>
              <li>✅ Gets the registry for the given sector ID</li>
              <li>
                ✅ Looks up the registered credential contract from the registry under{" "}
                <code className="bg-base-100 px-1 rounded">&ldquo;credential&rdquo;</code> key
              </li>
              <li>
                ✅ Verifies <code className="bg-base-100 px-1 rounded">msg.sender</code> matches the registered
                credential contract
              </li>
              <li>✅ Derives the player address from the sector owner (cannot be spoofed)</li>
              <li>✅ Verifies this pilot hasn&apos;t already minted from you (prevents point farming)</li>
              <li>✅ Awards you 2 points if all checks pass</li>
            </ul>
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
            <code className="bg-base-100 px-2 py-1 rounded text-sm">&ldquo;credential&rdquo;</code> key.
          </p>

          <h3 className="text-xl font-semibold mb-4 text-secondary">Verify</h3>
          <p className="mb-4">
            Make sure everyone can read your credential contract code by getting it verified in the block explorer.
          </p>

          <h3 className="text-xl font-semibold mb-4 text-secondary">Audit</h3>
          <p className="mb-4">Submit your credential contract to the official Auditor contract for an audit.</p>

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
                <code className="bg-base-100 px-2 py-1 rounded text-sm">msg.sender</code> and calls{" "}
                <code className="bg-base-100 px-2 py-1 rounded text-sm">game.pilotMintSectorCredential(sectorId)</code>
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
              <p>Verify your credential contract in the block explorer</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="bg-primary text-primary-content rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold flex-shrink-0">
                6
              </div>
              <p>Get your credential contract audited</p>
            </div>
          </div>

          <h3 className="text-xl font-semibold mb-4 mt-6 text-secondary">Credentials Go Live</h3>
          <div className="bg-accent/10 border border-accent rounded-lg p-6">
            <p className="mb-3">
              Once your credential contract is audited and working, pilots can start minting credentials to access your
              station.
            </p>
            <p>
              Each credential mint earns you <strong>2 points</strong>, and pilots will need valid credentials to land
              at your station and interact with your contracts.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
