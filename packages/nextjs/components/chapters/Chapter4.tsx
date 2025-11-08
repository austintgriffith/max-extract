"use client";

import { Address } from "~~/components/scaffold-eth";
import { useDeployedContractInfo } from "~~/hooks/scaffold-eth";

export const Chapter4 = () => {
  const { data: maxExtractContract } = useDeployedContractInfo("MaxExtract");
  const { data: gameContract } = useDeployedContractInfo("Game");
  const { data: creditsContract } = useDeployedContractInfo("Credits");
  const maxExtractAddress = maxExtractContract?.address;
  const gameAddress = gameContract?.address;
  const creditsAddress = creditsContract?.address;

  return (
    <div className="bg-base-300 rounded-3xl p-8 mb-6">
      <h2 className="text-3xl font-bold mb-6 text-primary">Chapter 4: The Staking (and Slashing)</h2>
      <div className="space-y-6">
        {/* TODO Section */}
        <div className="bg-warning/10 border border-warning rounded-lg p-4">
          <p className="text-warning font-semibold">TODO: Graphics and lore content coming soon</p>
        </div>

        {/* Main Content */}
        <div className="prose prose-lg max-w-none text-base-content">
          <h3 className="text-xl font-semibold mb-4 text-secondary">Overview</h3>
          <p className="mb-4">
            Deaths in your sector cost you <strong>10 points</strong> each. That&apos;s harsh, but there&apos;s a way to
            protect yourself: <strong>make pilots put skin in the game</strong>.
          </p>
          <p className="mb-4">
            Deploy a <strong>stake contract</strong> that requires pilots to stake{" "}
            <strong className="text-error">10,000 credits</strong> when entering your sector. If they kill someone, you
            can <strong>slash their entire stake</strong> and avoid the point penalty.
          </p>

          <h3 className="text-xl font-semibold mb-4 text-secondary">How It Works</h3>
          <div className="bg-base-200 rounded-lg p-4 mb-4">
            <ol className="list-decimal list-inside space-y-2">
              <li>
                <strong>Entry:</strong> When a pilot enters your sector, they must approve and stake 10k credits to
                MaxExtract
              </li>
              <li>
                <strong>Tracking:</strong> Your stake contract tracks which pilots are currently in your sector
              </li>
              <li>
                <strong>Slashing:</strong> If a pilot kills another pilot, the Game contract calls your stake
                contract&apos;s slash function
              </li>
              <li>
                <strong>Penalty Avoided:</strong> If slashing succeeds, you keep your points. If it fails, you lose 10
                points
              </li>
              <li>
                <strong>Exit:</strong> When pilots leave normally, they get their 10k credits back
              </li>
            </ol>
          </div>

          <div className="bg-error/10 border-2 border-error rounded-lg p-6 mb-6">
            <div className="flex items-start space-x-3">
              <div className="text-error text-2xl">⚠️</div>
              <div>
                <h4 className="font-semibold text-error mb-3">High Stakes, High Risk</h4>
                <p className="text-sm text-base-content mb-2">
                  Pilots who kill in your sector <strong>lose their entire 10k stake</strong>. It&apos;s burned,
                  permanently gone.
                </p>
                <p className="text-sm text-base-content">
                  This creates a strong deterrent against killing in your sector, but pilots who enter know the risk.
                </p>
              </div>
            </div>
          </div>

          <h3 className="text-xl font-semibold mb-4 text-secondary">Required Interface</h3>
          <p className="mb-4">
            Your stake contract MUST implement exactly these three functions. Get any of them wrong and the audit will
            fail.
          </p>

          <div className="bg-base-100 rounded-lg p-4 mb-4 border">
            <h4 className="font-semibold mb-3 text-accent">Required Functions:</h4>
            <div className="space-y-3 text-sm">
              <div className="bg-base-200 p-3 rounded font-mono text-xs">
                <div className="mb-2">
                  <strong>function activate() external</strong>
                </div>
                <div className="text-base-content/70 ml-4">
                  Called by MaxExtract when a pilot enters. Must check msg.sender == MaxExtract. Sets staked[tx.origin]
                  = true.
                </div>
              </div>

              <div className="bg-base-200 p-3 rounded font-mono text-xs">
                <div className="mb-2">
                  <strong>function deactivate() external</strong>
                </div>
                <div className="text-base-content/70 ml-4">
                  Called by MaxExtract when a pilot exits. Must check msg.sender == MaxExtract. Sets staked[tx.origin] =
                  false.
                </div>
              </div>

              <div className="bg-base-200 p-3 rounded font-mono text-xs">
                <div className="mb-2">
                  <strong>function slash(address killer) external</strong>
                </div>
                <div className="text-base-content/70 ml-4">
                  Called by Game when a pilot kills. Must check msg.sender == Game, verify killer is staked, set
                  staked[killer] = false, then call MaxExtract.slash(killer, sectorId).
                </div>
              </div>
            </div>
          </div>

          <h3 className="text-xl font-semibold mb-4 text-secondary">The tx.origin Pattern</h3>
          <p className="mb-4">
            This is <strong>intentional and required</strong>. Your activate and deactivate functions must use{" "}
            <code className="bg-base-100 px-2 py-1 rounded text-sm">tx.origin</code>, not{" "}
            <code className="bg-base-100 px-2 py-1 rounded text-sm">msg.sender</code>.
          </p>

          <div className="bg-base-100 rounded-lg p-4 mb-4 border">
            <pre className="text-sm overflow-x-auto">
              <code className="text-accent">{`function activate() external {
    require(msg.sender == maxExtractContract, "Only MaxExtract");
    staked[tx.origin] = true;  // tx.origin is the pilot
}

function deactivate() external {
    require(msg.sender == maxExtractContract, "Only MaxExtract");
    staked[tx.origin] = false;
}`}</code>
            </pre>
          </div>

          <div className="bg-info/10 border-2 border-info rounded-lg p-6 mb-6">
            <div className="flex items-start space-x-3">
              <div className="text-info text-2xl">💡</div>
              <div>
                <h4 className="font-semibold text-info mb-3">Why tx.origin?</h4>
                <p className="text-sm text-base-content mb-2">
                  When MaxExtract calls your contract, <code className="bg-base-100 px-1 rounded">msg.sender</code> is
                  MaxExtract, but <code className="bg-base-100 px-1 rounded">tx.origin</code> is the pilot who initiated
                  the transaction.
                </p>
                <p className="text-sm text-base-content">
                  Yes, <code className="bg-base-100 px-1 rounded">tx.origin</code> is normally dangerous. But in this
                  specific controlled flow with proper access controls, it&apos;s the correct pattern.
                </p>
              </div>
            </div>
          </div>

          <h3 className="text-xl font-semibold mb-4 text-secondary">The Slash Function</h3>
          <p className="mb-4">
            This is where the magic happens. When a pilot kills another pilot in your sector, the Game contract calls
            your slash function.
          </p>

          <div className="bg-base-100 rounded-lg p-4 mb-4 border">
            <pre className="text-sm overflow-x-auto">
              <code className="text-accent">{`function slash(address killer) external {
    require(msg.sender == gameContract, "Only Game");
    require(staked[killer], "Killer not staked");
    
    staked[killer] = false;  // Prevent double-slashing
    
    // Call MaxExtract to burn the killer's stake
    IMaxExtract(maxExtractContract).slash(killer, sectorId);
}`}</code>
            </pre>
          </div>

          <p className="text-sm text-base-content/70 mb-4">
            The slash call to MaxExtract ({maxExtractAddress && <Address address={maxExtractAddress} />}) will burn the
            killer&apos;s entire 10k staked balance. They don&apos;t get it back. Ever.
          </p>

          <div className="bg-info/10 border border-info rounded-lg p-4 mb-4">
            <p className="text-sm text-base-content">
              <strong className="text-info">Important:</strong> Setting{" "}
              <code className="bg-base-100 px-1 rounded">staked[killer] = false</code> prevents double-slashing. Once
              their stake is burned, they can&apos;t be slashed again (they have nothing left to slash). To continue
              playing in your sector, they&apos;d need to exit and re-enter, staking another 10k.
            </p>
          </div>

          <div className="bg-warning/10 border-2 border-warning rounded-lg p-6 mb-6">
            <div className="flex items-start space-x-3">
              <div className="text-warning text-2xl">🔐</div>
              <div>
                <h4 className="font-semibold text-warning mb-3">Critical: Access Controls</h4>
                <p className="text-sm text-base-content mb-3">Your slash function MUST verify two things:</p>
                <ol className="space-y-2 text-sm list-decimal list-inside ml-2">
                  <li>
                    <code className="bg-base-100 px-1 rounded">msg.sender == gameContract</code> - Only the Game
                    contract can trigger slashing
                  </li>
                  <li>
                    <code className="bg-base-100 px-1 rounded">staked[killer] == true</code> - The killer must actually
                    be in your sector
                  </li>
                </ol>
                <p className="text-sm text-base-content mt-3">
                  If you mess these up, the audit will fail and pilots won&apos;t trust your sector.
                </p>
              </div>
            </div>
          </div>

          <h3 className="text-xl font-semibold mb-4 text-secondary">Required State Variables</h3>
          <div className="bg-base-200 rounded-lg p-4 mb-4">
            <p className="text-sm text-base-content mb-2">Your contract must have these state variables:</p>
            <ul className="space-y-2 text-sm list-disc list-inside">
              <li>
                <code className="bg-base-100 px-1 rounded">mapping(address =&gt; bool) public staked</code> - Track who
                is in your sector
              </li>
              <li>
                <code className="bg-base-100 px-1 rounded">address public immutable maxExtractContract</code> -
                Reference to MaxExtract
              </li>
              <li>
                <code className="bg-base-100 px-1 rounded">address public immutable gameContract</code> - Reference to
                Game
              </li>
              <li>
                <code className="bg-base-100 px-1 rounded">uint256 public immutable sectorId</code> - Your sector ID
              </li>
            </ul>
          </div>

          <div className="bg-info/10 border-2 border-info rounded-lg p-6 mb-6">
            <div className="flex items-start space-x-3">
              <div className="text-info text-2xl">📋</div>
              <div>
                <h4 className="font-semibold text-info mb-3">Contract Addresses</h4>
                <p className="text-sm text-base-content mb-2">You&apos;ll need these in your constructor:</p>
                <ul className="space-y-1 text-sm list-disc list-inside ml-2">
                  {maxExtractAddress && (
                    <li>
                      MaxExtract: <Address address={maxExtractAddress} />
                    </li>
                  )}
                  {gameAddress && (
                    <li>
                      Game: <Address address={gameAddress} />
                    </li>
                  )}
                  {creditsAddress && (
                    <li>
                      Credits: <Address address={creditsAddress} />
                    </li>
                  )}
                  <li>Your Sector ID: Get this from your sector page</li>
                </ul>
              </div>
            </div>
          </div>

          <h3 className="text-xl font-semibold mb-4 text-secondary">Example Implementation</h3>
          <div className="bg-base-100 rounded-lg p-4 mb-4 border">
            <pre className="text-sm overflow-x-auto">
              <code className="text-accent">{`pragma solidity ^0.8.0;

interface IMaxExtract {
    function slash(address killer, uint256 sectorId) external;
}

contract StakeContract {
    mapping(address => bool) public staked;
    address public immutable maxExtractContract;
    address public immutable gameContract;
    uint256 public immutable sectorId;
    
    constructor(
        address _maxExtract,
        address _game,
        uint256 _sectorId
    ) {
        maxExtractContract = _maxExtract;
        gameContract = _game;
        sectorId = _sectorId;
    }
    
    function activate() external {
        require(msg.sender == maxExtractContract, "Only MaxExtract");
        staked[tx.origin] = true;
    }
    
    function deactivate() external {
        require(msg.sender == maxExtractContract, "Only MaxExtract");
        staked[tx.origin] = false;
    }
    
    function slash(address killer) external {
        require(msg.sender == gameContract, "Only Game");
        require(staked[killer], "Killer not staked");
        
        staked[killer] = false;  // Prevent double-slashing
        IMaxExtract(maxExtractContract).slash(killer, sectorId);
    }
}`}</code>
            </pre>
          </div>

          <h3 className="text-xl font-semibold mb-4 text-secondary">Deployment & Integration</h3>
          <div className="space-y-4 mb-6">
            <div className="flex items-center space-x-4">
              <div className="bg-primary text-primary-content rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold flex-shrink-0">
                1
              </div>
              <p>Deploy your stake contract with the correct constructor parameters (MaxExtract, Game, SectorId)</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="bg-primary text-primary-content rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold flex-shrink-0">
                2
              </div>
              <p>
                Register it in your Registry under the{" "}
                <code className="bg-base-100 px-2 py-1 rounded text-sm">stake</code> module key
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="bg-primary text-primary-content rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold flex-shrink-0">
                3
              </div>
              <p>
                <strong className="text-error">VERIFY</strong> your contract on the block explorer
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="bg-primary text-primary-content rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold flex-shrink-0">
                4
              </div>
              <p>Submit for audit - must pass chapter 4 requirements</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="bg-primary text-primary-content rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold flex-shrink-0">
                5
              </div>
              <p>Once audited, pilots entering your sector will be required to stake 10k credits</p>
            </div>
          </div>

          <h3 className="text-xl font-semibold mb-4 text-secondary">What Pilots See</h3>
          <div className="bg-base-200 rounded-lg p-4 mb-4">
            <p className="text-sm text-base-content mb-3">
              When pilots try to enter your sector with an audited stake contract:
            </p>
            <ol className="space-y-2 text-sm list-decimal list-inside">
              <li>They must have at least 10,000 credits</li>
              <li>They must approve MaxExtract to spend 10k credits</li>
              <li>They must call MaxExtract.stake(yourSectorId)</li>
              <li>If staking fails for any reason, they CANNOT enter your sector</li>
              <li>If they kill someone in your sector, they lose everything</li>
              <li>If they leave peacefully, they get their 10k back</li>
            </ol>
          </div>

          <div className="bg-accent/10 border border-accent rounded-lg p-6 mt-6">
            <h4 className="font-semibold text-accent mb-3">The Trade-off</h4>
            <p className="mb-3">
              Requiring stakes makes your sector <strong>safer and more exclusive</strong>, but also{" "}
              <strong>harder to access</strong>.
            </p>
            <p className="mb-3">
              Pilots need 10k credits to enter. New pilots or those low on credits can&apos;t visit. But the pilots who
              do enter are <strong>heavily invested</strong> in not causing trouble.
            </p>
            <p>
              If slashing works perfectly, you never lose points from deaths. If your contract has bugs, you lose 10
              points per death <em>and</em> pilots lose trust.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
