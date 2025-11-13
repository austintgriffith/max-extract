"use client";

import { Address } from "~~/components/scaffold-eth";
import { useDeployedContractInfo } from "~~/hooks/scaffold-eth";

export const Chapter5 = () => {
  const { data: gameContract } = useDeployedContractInfo("Game");
  const { data: creditsContract } = useDeployedContractInfo("Credits");
  const gameAddress = gameContract?.address;
  const creditsAddress = creditsContract?.address;

  return (
    <div className="space-y-6">
      {/* TODO Section */}
      <div className="bg-warning/10 border border-warning rounded-lg p-4">
        <p className="text-warning font-semibold">TODO: Graphics and lore content coming soon</p>
      </div>

      {/* Main Content */}
      <div className="prose prose-lg max-w-none text-base-content">
        <h3 className="text-xl font-semibold mb-4 text-secondary">Overview</h3>
        <p className="mb-4">
          Your sector is live, your identity is known, and pilots can access your station with credentials. But
          there&apos;s a problem: your station lacks the infrastructure to <strong>process asteroids into fuel</strong>.
          No processing facilities, no fuel production.
        </p>
        <p className="mb-4">
          To process asteroids into fuel and truly serve your pilots, you need to <strong>upgrade your station</strong>.
          This requires raising <strong className="text-error">50,000 credits</strong>.
        </p>
        <p className="mb-4">
          Time to run a <strong>crowdsale</strong>. You&apos;ll sell <strong>fuel tokens</strong> to pilots who need
          them for refueling at your station.
        </p>

        <div className="bg-info/10 border-2 border-info rounded-lg p-6 mb-6">
          <div className="flex items-start space-x-3">
            <div className="text-info text-2xl">💡</div>
            <div>
              <h4 className="font-semibold text-info mb-3">Two Ways to Build This</h4>
              <p className="text-sm text-base-content mb-2">You have two architecture options:</p>
              <ol className="list-decimal list-inside space-y-2 text-sm ml-2">
                <li>
                  <strong>Option A - Single Contract:</strong> One contract that implements ERC-20 token functionality
                  plus all crowdsale logic (buy, redeem, upgrade). Simpler deployment, easier to audit.
                </li>
                <li>
                  <strong>Option B - Two Contracts:</strong> Separate ERC-20 token contract + crowdsale contract that
                  manages the sale. More modular, follows best practices.
                </li>
              </ol>
              <p className="text-sm text-base-content mt-3">
                <strong>Either way works!</strong> The contract you register under the{" "}
                <code className="bg-base-100 px-1 rounded">&ldquo;sale&rdquo;</code> module just needs to have the
                required interface (see below).
              </p>
            </div>
          </div>
        </div>

        <h3 className="text-xl font-semibold mb-4 text-secondary">Required Interface</h3>
        <p className="mb-4">
          The contract registered under the <code className="bg-base-100 px-2 py-1 rounded text-sm">sale</code> module
          key in your registry MUST have these functions:
        </p>

        <div className="bg-base-100 rounded-lg p-4 mb-4 border">
          <h4 className="font-semibold mb-3 text-accent">Required Functions:</h4>
          <div className="space-y-3 text-sm">
            <div className="bg-base-200 p-3 rounded font-mono text-xs">
              <div className="mb-2">
                <strong>function buy(uint256 amount) external</strong>
              </div>
              <div className="text-base-content/70 ml-4">
                Pilots call this to buy fuel tokens. Transfers credits from pilot to contract, mints fuel tokens to
                pilot.
              </div>
            </div>

            <div className="bg-base-200 p-3 rounded font-mono text-xs">
              <div className="mb-2">
                <strong>function pricePerTokenInCredits() public view returns (uint256)</strong>
              </div>
              <div className="text-base-content/70 ml-4">
                Returns the price per token in credits (e.g., 1000 * 10^18 = 1000 credits per token)
              </div>
            </div>

            <div className="bg-base-200 p-3 rounded font-mono text-xs">
              <div className="mb-2">
                <strong>function balanceOf(address) public view returns (uint256)</strong>
              </div>
              <div className="text-base-content/70 ml-4">Standard ERC-20 balance check for fuel tokens</div>
            </div>

            <div className="bg-base-200 p-3 rounded font-mono text-xs">
              <div className="mb-2">
                <strong>function redeem() external</strong>
              </div>
              <div className="text-base-content/70 ml-4">
                Burns exactly 1 fuel token from caller. Enables off-chain refuel at your station.
              </div>
            </div>

            <div className="bg-base-200 p-3 rounded font-mono text-xs">
              <div className="mb-2">
                <strong>function upgrade() external</strong>
              </div>
              <div className="text-base-content/70 ml-4">
                Callable ONLY by pilots. Triggers station upgrade if 50k credits raised. Rewards the pilot caller.
              </div>
            </div>
          </div>
        </div>

        <h3 className="text-xl font-semibold mb-4 text-secondary">The Buy Function</h3>
        <p className="mb-4">
          Pilots will approve your contract to spend their credits (
          {creditsAddress && (
            <span className="inline-flex">
              <Address address={creditsAddress} />
            </span>
          )}
          ), then call <code className="bg-base-100 px-2 py-1 rounded text-sm">buy(amount)</code>:
        </p>

        <div className="bg-base-100 rounded-lg p-4 mb-4 border">
          <pre className="text-sm overflow-x-auto">
            <code className="text-accent">{`function buy(uint256 amount) external {
    require(!upgraded, "Sale ended");
    
    // Calculate cost (amount is in wei, price is in wei, divide to get correct result)
    uint256 cost = (amount * pricePerTokenInCredits()) / 10**18;
    
    // Transfer credits from pilot to this contract
    creditsContract.transferFrom(msg.sender, address(this), cost);
    
    // Mint fuel tokens to pilot
    _mint(msg.sender, amount);
}`}</code>
          </pre>
        </div>

        <div className="bg-warning/10 border-2 border-warning rounded-lg p-6 mb-4">
          <div className="flex items-start space-x-3">
            <div className="text-warning text-2xl">⚠️</div>
            <div>
              <h4 className="font-semibold text-warning mb-3">Critical: Pricing Strategy</h4>
              <p className="text-sm text-base-content mb-3">
                You need to raise <strong>50,000 credits</strong> to upgrade. Pilots will only pay around{" "}
                <strong>1,000 credits per fuel token</strong>.
              </p>
              <ul className="space-y-2 text-sm list-disc list-inside">
                <li>
                  <strong>Price too high?</strong> Pilots won&apos;t buy. No sales means no upgrade.
                </li>
                <li>
                  <strong>Price too low?</strong> You won&apos;t raise enough even if all pilots buy.
                </li>
                <li>
                  <strong>Recommended:</strong> Set{" "}
                  <code className="bg-base-100 px-1 rounded">pricePerTokenInCredits = 1000 * 10**18</code>
                </li>
              </ul>
              <p className="text-sm text-base-content mt-3">
                At 1k credits per token, you need ~50 pilots to buy 1 token each to hit your goal. Price accordingly!
              </p>
            </div>
          </div>
        </div>

        <h3 className="text-xl font-semibold mb-4 text-secondary">The Redeem Function</h3>
        <p className="mb-4">
          Pilots who buy fuel tokens can redeem them for refueling services at your station. Each redemption burns
          exactly 1 token:
        </p>

        <div className="bg-base-100 rounded-lg p-4 mb-4 border">
          <pre className="text-sm overflow-x-auto">
            <code className="text-accent">{`function redeem() external {
    // Burn exactly 1 token from the caller
    _burn(msg.sender, 1 * 10**18);
    
    // Refueling handled off-chain by game server
    // The act of burning is proof of payment
}`}</code>
          </pre>
        </div>

        <p className="text-sm text-base-content/70 mb-4">
          Note: The actual refueling happens off-chain in the game server. The burn event is all you need.
        </p>

        <h3 className="text-xl font-semibold mb-4 text-secondary">The Upgrade Function</h3>
        <p className="mb-4">
          Here&apos;s where it gets interesting. <strong>You cannot call upgrade yourself</strong>. Only pilots can
          trigger it. This means you need to <strong>incentivize pilots</strong> to call it for you.
        </p>

        <div className="bg-error/10 border-2 border-error rounded-lg p-6 mb-4">
          <div className="flex items-start space-x-3">
            <div className="text-error text-2xl">🚨</div>
            <div>
              <h4 className="font-semibold text-error mb-3 text-lg">Pilots Call Upgrade, Not You!</h4>
              <p className="text-sm text-base-content mb-3">
                The <code className="bg-base-100 px-1 rounded">upgrade()</code> function calls{" "}
                <code className="bg-base-100 px-1 rounded">game.upgradeStation(sectorId)</code>, which verifies that{" "}
                <code className="bg-base-100 px-1 rounded">tx.origin</code> is a pilot.
              </p>
              <p className="text-sm text-base-content mb-3">
                <strong>Solution:</strong> Reward the pilot who calls it! Send them at least{" "}
                <strong>500 credits</strong> as a bounty for triggering the upgrade.
              </p>
              <p className="text-sm text-base-content">
                Pilots will monitor your contract balance. Once you hit 50k, someone will claim the bounty and trigger
                your upgrade.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-base-100 rounded-lg p-4 mb-4 border">
          <pre className="text-sm overflow-x-auto">
            <code className="text-accent">{`function upgrade() external {
    // Checks
    uint256 balance = creditsContract.balanceOf(address(this));
    require(balance >= 50_000 * 10**18, "Not enough credits");
    require(!upgraded, "Already upgraded");
    
    // Effects - MUST set state before external calls (CEI pattern)
    upgraded = true;
    
    // Interactions - external calls
    creditsContract.approve(gameAddress, 49_500 * 10**18);
    game.upgradeStation(YOUR_SECTOR_ID);  // Game pulls 49,500 HERE
    creditsContract.transfer(msg.sender, 500 * 10**18);
    
    // Optional: handle excess credits (get balance AFTER Game took 49,500)
    // uint256 remaining = creditsContract.balanceOf(address(this));
    // if (remaining > 0) {
    //     creditsContract.transfer(stationOwner, remaining);
    // }
}`}</code>
          </pre>
        </div>

        <p className="text-sm text-base-content/70 mb-4">
          The Game contract (
          {gameAddress && (
            <span className="inline-flex">
              <Address address={gameAddress} />
            </span>
          )}
          ) will pull 49,500 credits from your fuel contract and award you 10 points for upgrading your station.
        </p>

        <div className="bg-warning/10 border-2 border-warning rounded-lg p-6 mb-6">
          <div className="flex items-start space-x-3">
            <div className="text-warning text-2xl">⚠️</div>
            <div>
              <h4 className="font-semibold text-warning mb-2">Critical: CEI Pattern Required</h4>
              <p className="text-sm text-base-content">
                Set <code className="bg-base-100 px-1 rounded">upgraded = true</code> BEFORE any external calls
                (approve, upgradeStation, transfer). This prevents reentrancy attacks. Your audit will fail if state
                changes come after external calls.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-info/10 border-2 border-info rounded-lg p-6 mb-6">
          <div className="flex items-start space-x-3">
            <div className="text-info text-2xl">💡</div>
            <div>
              <h4 className="font-semibold text-info mb-3">What About Excess Credits?</h4>
              <p className="text-sm text-base-content mb-3">
                Pilots can keep buying tokens even after your contract reaches 50k credits. When{" "}
                <code className="bg-base-100 px-1 rounded">upgrade()</code> is finally called, you might have 60k, 70k,
                or more!
              </p>
              <p className="text-sm text-base-content mb-3">
                <strong>Required distributions:</strong>
              </p>
              <ul className="space-y-1 text-sm list-disc list-inside ml-2">
                <li>
                  <strong>Exactly 49,500 credits</strong> to Game contract (no more, no less)
                </li>
                <li>
                  <strong>At least 500 credits</strong> to the pilot who calls upgrade
                </li>
              </ul>
              <p className="text-sm text-base-content mt-3">
                <strong>Excess credits</strong> (beyond 50k) can be handled however you want:
              </p>
              <ul className="space-y-1 text-sm list-disc list-inside ml-2">
                <li>Leave them in the contract for future use</li>
                <li>Send them to yourself (you ran the crowdsale!)</li>
                <li>Send them as an extra bonus to the pilot caller</li>
              </ul>
              <p className="text-sm text-base-content mt-3">
                The auditor will accept any reasonable handling of excess credits as long as the required amounts are
                met.
              </p>
            </div>
          </div>
        </div>

        <h3 className="text-xl font-semibold mb-4 text-secondary">After Upgrade</h3>
        <div className="bg-base-200 rounded-lg p-4 mb-4">
          <p className="text-sm text-base-content mb-2">Once upgrade() is called:</p>
          <ul className="space-y-2 text-sm list-disc list-inside">
            <li>
              The <code className="bg-base-100 px-1 rounded">buy()</code> function MUST revert (sale is over)
            </li>
            <li>Pilots can still redeem their existing fuel tokens</li>
            <li>Your station is now upgraded and can process asteroids</li>
            <li>You earned 10 points from the Game contract</li>
          </ul>
        </div>

        <h3 className="text-xl font-semibold mb-4 text-secondary">⚠️ One-Time Sale Warning</h3>
        <div className="bg-error/10 border-2 border-error rounded-lg p-4 mb-4">
          <div className="flex items-start space-x-3">
            <div className="text-error text-2xl">💀</div>
            <div>
              <h4 className="font-semibold text-error mb-3">Don&apos;t Rug Your Pilots</h4>
              <p className="text-sm text-base-content mb-3">
                Pilots will <strong>remember</strong> buying fuel tokens from you. If you upgrade your fuel contract or
                try to rug them, you&apos;ll need to airdrop/remint tokens to everyone who already purchased.
              </p>
              <p className="text-sm text-base-content">
                <strong>Get it right the first time.</strong> Test thoroughly before deploying to mainnet. Pilot trust
                is hard to earn back.
              </p>
            </div>
          </div>
        </div>

        <h3 className="text-xl font-semibold mb-4 text-secondary">Registry Integration</h3>
        <p className="mb-4">
          After deploying your fuel token contract (or crowdsale contract if using two-contract architecture), register
          it in your Registry contract under the{" "}
          <code className="bg-base-100 px-2 py-1 rounded text-sm">&ldquo;sale&rdquo;</code> key.
        </p>

        <h3 className="text-xl font-semibold mb-4 text-secondary">Verify and Audit</h3>
        <p className="mb-4">
          As always, verify your contract on the block explorer and submit it for an official audit. Pilots will NOT buy
          fuel tokens from unaudited contracts.
        </p>

        <h3 className="text-xl font-semibold mb-4 text-secondary">Implementation Steps</h3>
        <div className="space-y-4 mb-6">
          <div className="flex items-center space-x-4">
            <div className="bg-primary text-primary-content rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold flex-shrink-0">
              1
            </div>
            <p>
              Design your architecture: single contract with ERC-20 + crowdsale logic, OR separate ERC-20 token +
              crowdsale contract
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="bg-primary text-primary-content rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold flex-shrink-0">
              2
            </div>
            <p>
              Implement the required interface:{" "}
              <code className="bg-base-100 px-2 py-1 rounded text-sm">buy(amount)</code>,{" "}
              <code className="bg-base-100 px-2 py-1 rounded text-sm">pricePerTokenInCredits()</code>,{" "}
              <code className="bg-base-100 px-2 py-1 rounded text-sm">balanceOf(address)</code>,{" "}
              <code className="bg-base-100 px-2 py-1 rounded text-sm">redeem()</code>,{" "}
              <code className="bg-base-100 px-2 py-1 rounded text-sm">upgrade()</code>
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="bg-primary text-primary-content rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold flex-shrink-0">
              3
            </div>
            <p>Set your price strategically (recommend 1000 * 10^18 credits per token to raise 50k from ~50 pilots)</p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="bg-primary text-primary-content rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold flex-shrink-0">
              4
            </div>
            <p>
              Deploy your contract(s) and register under{" "}
              <code className="bg-base-100 px-2 py-1 rounded text-sm">&ldquo;sale&rdquo;</code> module in your Registry
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="bg-primary text-primary-content rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold flex-shrink-0">
              5
            </div>
            <p>
              <strong className="text-error">VERIFY</strong> your contract on the block explorer (required before audit)
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="bg-primary text-primary-content rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold flex-shrink-0">
              6
            </div>
            <p>
              Submit your fuel contract for an official audit. Once approved, pilots will start buying immediately if
              the price is right!
            </p>
          </div>
        </div>

        <h3 className="text-xl font-semibold mb-4 mt-6 text-secondary">The Crowdsale Begins</h3>
        <div className="bg-accent/10 border border-accent rounded-lg p-6">
          <p className="mb-3">
            Once your fuel contract is audited, the crowdsale goes live. Any pilot can buy fuel tokens using credits.
          </p>
          <p className="mb-3">
            As you approach 50k credits, pilots will race to call{" "}
            <code className="bg-base-100 px-1 rounded">upgrade()</code> to claim the 500 credit bounty.
          </p>
          <p className="mb-3">
            After the upgrade completes, your station becomes fully operational and can process asteroids into fuel.
            Pilots can redeem their tokens for refueling services.
          </p>
          <p className="mb-3">
            You&apos;ll earn <strong>10 points</strong> for the upgrade, and your sector becomes more attractive to
            pilots who need fuel for long expeditions.
          </p>

          <p className="font-semibold text-success mb-2 mt-4">🛫 Airspace Upgrade: Class 3 Unlocked!</p>
          <p className="mb-3">
            After completing your crowdsale upgrade, your sector reaches <strong>Class 3 airspace</strong> - the highest
            classification. <strong>ALL ship models (A through F)</strong> can now get openings to enter your sector!
          </p>
          <p className="mb-3">
            Even the smallest commercial ships (Models A and B) can safely navigate your fully-developed airspace. Your
            sector is now accessible to the entire pilot population, maximizing traffic and opportunities.
          </p>

          <div className="bg-info/10 border border-info rounded-lg p-4 mt-4">
            <h4 className="font-semibold text-info mb-2">🔧 Transponder Requirements</h4>
            <p className="text-sm text-base-content mb-2">
              <strong>Class 3 airspace maintains dual transponder requirements:</strong>
            </p>
            <ul className="list-disc list-inside text-sm space-y-1 ml-2">
              <li>
                <strong>Killswitch transponder</strong>: Broadcasts death signals to your relay station
              </li>
              <li>
                <strong>Killstake transponder</strong>: Enables automatic stake slashing when deaths occur
              </li>
            </ul>
            <p className="text-sm text-base-content mt-2">
              All ships, regardless of size, must have both systems functional to operate in your advanced sector.
            </p>
          </div>

          <div className="bg-success/10 border border-success rounded-lg p-4 mt-4">
            <h4 className="font-semibold text-success mb-2">🎉 Your Station Is Complete</h4>
            <p className="text-sm text-base-content">
              With Class 3 airspace, a full roster of audited contracts, and refueling capabilities, your sector is now
              a thriving hub. You&apos;ve built one of the most advanced stations in the Max Extract universe. Welcome
              to the elite.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
