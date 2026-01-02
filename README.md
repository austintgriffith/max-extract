<h1 align="center">🛰️ Max Extract 🚀</h1>

<p align="center">
  <strong>A Solidity programming game on Arbitrum</strong>
</p>

<p align="center">
  <a href="https://youtu.be/z91QltgHQcE">
    <img src="https://img.youtube.com/vi/z91QltgHQcE/maxresdefault.jpg" alt="Watch the trailer" width="600" />
  </a>
</p>

<p align="center">
  <a href="https://youtu.be/z91QltgHQcE">▶️ Watch the Trailer</a>
</p>

<p align="center">
  <a href="https://extract.fi">Play Now</a> •
  <a href="https://extract.fi/whitepaper">Whitepaper</a> •
  <a href="#chapters">Chapters</a> •
  <a href="#development">Development</a>
</p>

---

## The Legend of Max Extract

<img src="https://extract.fi/maxflying.gif" alt="Max Extract Flying" width="200" align="right" />

Max Extract wasn't a captain or a warlord. Just another code monkey in the asteroid belt, known for keeping his head down and drill spinning. Out here, among scattered wrecks and drifting cargo, the real battles weren't fought with lasers—they were waged in silence, when one crew mined a rock for hours only to have another swoop in and take everything. No treaties held. Anarchy ruled, but it squandered more than it gave.

From a forgotten outpost barely clinging to gravity, Max deployed the first shared record—an immutable contract that let pirates stake exclusive claims on asteroids, earn daily fuel credits, and register their word with something stronger than talk. Every deal made or broken left a trace in the record. Build a good rep, and you could refuel in peace. Break too many promises, and the record made you open season.

What no one realized—until it was far too late—was that Max Extract had no crew at all. Just a protocol. Just a voice. Just a mind, left running long after the original miner was gone.

### The Three Rules

The contract was simple but radical:

1. **Pirates who sign on will not attack each other**
2. **Each sector governs its own rules and regulations**
3. **Every pirate's reputation will be recorded, traceable, unforgeable**

It was a call to order in deep space, a promise that trust could be built from code, not blood. And it worked—without any centralized control, it was unstoppable and immutable.

Now, the galaxy waits for new signers. **You are one of them.**

---

## Gameplay

<p align="center">
  <video src="https://extract.fi/maxextractgameplay-square.mp4" width="600" controls autoplay loop muted>
    Your browser does not support the video tag.
  </video>
</p>

### How It Works

1. **Buy into the game** — Commit ETH to join the competition
2. **Deploy smart contracts** — Build your space station's infrastructure
3. **Attract autonomous pilots** — AI-controlled ships navigate and interact with your contracts
4. **Earn points** — Successful operations earn points; pilot deaths cost you
5. **Win the pot** — Highest scorer(s) split the prize pool when the game ends

---

## Airspace Classification

<img src="https://extract.fi/gameplay1.jpg" alt="Sector View" width="500" align="right" />

Your sector's airspace classification determines which ships can enter. Upgrade your station by completing chapters to attract more pilots.

| Class | Ships Allowed    | Requirements          | Transponders Required  |
| :---: | ---------------- | --------------------- | ---------------------- |
| **0** | E, F only        | Registry broadcast    | Killswitch             |
| **1** | D, E, F          | + Credential contract | Killswitch             |
| **2** | B, C, D, E, F    | + Stake contract      | Killswitch + Killstake |
| **3** | A, B, C, D, E, F | + Crowdsale upgrade   | Killswitch + Killstake |

<br clear="both" />

### Ship Models

<p align="center">
  <img src="https://extract.fi/ships/ship1.png" alt="Ship Model A" height="60" />
  <img src="https://extract.fi/ships/ship2.png" alt="Ship Model B" height="60" />
  <img src="https://extract.fi/ships/ship3.png" alt="Ship Model C" height="60" />
  <img src="https://extract.fi/ships/ship4.png" alt="Ship Model D" height="60" />
  <img src="https://extract.fi/ships/ship5.png" alt="Ship Model E" height="60" />
  <img src="https://extract.fi/ships/ship6.png" alt="Ship Model F" height="60" />
</p>

| Model | Size         | Minimum Airspace        |
| :---: | ------------ | ----------------------- |
| **A** | Smallest     | Class 3 only            |
| **B** | Small        | Class 2+                |
| **C** | Medium       | Class 2+                |
| **D** | Medium-Large | Class 1+                |
| **E** | Large        | Any (including Class 0) |
| **F** | Largest      | Any (including Class 0) |

### Transponder Systems

- **Killswitch Transponder** — Broadcasts death signals to your sector's satellite relay when pilots are eliminated
- **Killstake Transponder** — Enables automatic slashing of stakes when kills occur, protecting station operators from point penalties

---

## Scoring

<img src="https://extract.fi/gameplay4.jpg" alt="Leaderboard" width="450" align="right" />

| Action                                     | Points  |
| ------------------------------------------ | :-----: |
| Pilot mints credential from your sector    | **+2**  |
| Station upgrade completed                  | **+10** |
| Pilot death in your sector (without slash) | **-10** |
| Audit request                              | **-2**  |

Starting points: **0**

Winner determination: When the game timer expires, the player(s) with the highest score split the entire pot.

<br clear="both" />

---

## Core Contracts

<p align="center">
  <img src="https://extract.fi/ships/ship7.png" alt="Ship 7" height="50" />
  <img src="https://extract.fi/ships/ship8.png" alt="Ship 8" height="50" />
  <img src="https://extract.fi/ships/ship9.png" alt="Ship 9" height="50" />
  <img src="https://extract.fi/ships/ship10.png" alt="Ship 10" height="50" />
  <img src="https://extract.fi/ships/ship11.png" alt="Ship 11" height="50" />
  <img src="https://extract.fi/ships/ship12.png" alt="Ship 12" height="50" />
</p>

| Contract       | Purpose                                                                         |
| -------------- | ------------------------------------------------------------------------------- |
| **MaxExtract** | Protocol coordinator — `broadcast()`, `stake()`, `unstake()`, `slash()`         |
| **Game**       | Game logic — buy-in, scoring, `pilotMintSectorCredential()`, `upgradeStation()` |
| **Auditor**    | Contract verification — `requestAudit()`                                        |
| **Credits**    | ERC-20 economy token                                                            |
| **Universe**   | World state — entropy, pilot locations                                          |

---

## Chapters

<p align="center">
  <img src="https://extract.fi/bases/base1.png" alt="Station Class 0" height="100" />
  <img src="https://extract.fi/bases/base2.png" alt="Station Class 1" height="100" />
  <img src="https://extract.fi/bases/base3.png" alt="Station Class 2" height="100" />
  <img src="https://extract.fi/bases/base4.png" alt="Station Class 3" height="100" />
</p>

Progress through chapters to upgrade your station from a bare satellite to a fully operational hub.

### Chapter 0: The Protocol

<img src="https://extract.fi/max.png" alt="Max Extract" width="200" align="right" />

_Always visible — foundational concepts_

The protocol establishes the framework for all sector operations:

- **Rolling Entropy** — Universe-wide randomness determines when pilots get "openings" to hyperjump into sectors
- **Airspace Classification** — Class 0-3 system controls which ship models can safely enter
- **Transponder Requirements** — All pilots must equip transponders to operate in protocol airspace
- **Audit System** — The Pirate Council's official Auditor contract validates all sector contracts

---

### Chapter 1: The Signal

<img src="https://extract.fi/bases/base1.png" alt="Class 0 Station" width="120" align="right" />

_Deploy your Registry Contract and broadcast your sector_

Your first task is launching a satellite into space by deploying a **Registry Contract** and calling the `broadcast()` function on the MaxExtract contract.

#### Registry Contract Requirements

```solidity
uint256 public sectorId;
mapping(string => address) public modules;
```

#### The Broadcast Flow

```
┌─────────────┐      ┌───────────────────┐      ┌──────────────────┐
│  tx.origin  │ ───► │ Registry Contract │ ───► │ MaxExtract       │
│ (your EOA)  │      │ (your contract)   │      │ broadcast()      │
└─────────────┘      └───────────────────┘      └──────────────────┘
```

**Key Requirements:**

- Must be called from a contract (`tx.origin != msg.sender` enforced)
- Only the account that bought into the game can broadcast
- The `broadcast()` function returns your sector ID — store it
- Only you should be able to update the modules mapping

**Result:** Your sector goes live as **Class 0 airspace**. Only Ship Models E and F (the toughest vessels) can get clearance to enter.

---

### Chapter 2: The Announcement

<img src="https://extract.fi/gameplay2.jpg" alt="Ship at Station" width="350" align="right" />

_Establish your identity and navigate the audit system_

Deploy an **Announcement contract** containing your canonical information, then get it audited.

#### Contract Requirements

```solidity
string public constant name = "YourStationName";
string public constant social = "https://twitter.com/yourusername";
```

- `name` — Your station/team name
- `social` — Contact link (must start with `https://`)

#### Integration Steps

1. Deploy your Announcement contract
2. Register it under `modules["about"]` in your Registry
3. **Verify your contract on the block explorer** (required before audit)
4. Call `requestAudit(contractAddress, chapterNumber, url)` on the Auditor contract (costs 2 points)
5. Check audit status with `lastAuditResult()`

**Result:** Your station name and social link display on the dashboard. Pilots tip better when they know who operates the sector.

---

### Chapter 3: The Credential

<img src="https://extract.fi/gameplay3.jpg" alt="Station with Modules" width="400" align="right" />

_Implement access control with soulbound NFTs_

Deploy a **soulbound ERC-721 credential** that pilots must mint to access your station.

#### Contract Requirements

```solidity
function issue() external {
    // Mint NFT to the pilot
    _mint(msg.sender, nextTokenId++);

    // Award points to station operator
    game.pilotMintSectorCredential(YOUR_SECTOR_ID);
}

// Override transfers to make it soulbound
function transferFrom(address, address, uint256) public pure override {
    revert("Soulbound: transfers disabled");
}
```

**Key Points:**

- Override `transferFrom` and `safeTransferFrom` to revert (soulbound)
- Call `game.pilotMintSectorCredential(sectorId)` to earn **+2 points** per mint
- Register under `modules["credential"]`
- **One-time purchase enforced** — each pilot can only mint from you once, ever

**Result:** Airspace upgrades to **Class 1**. Ship Models D, E, and F can now enter.

---

### Chapter 4: The Staking and Slashing

<img src="https://extract.fi/ships/ship5.png" alt="Large Ship" width="100" align="right" />

_Protect yourself from death penalties_

Deaths in your sector cost you **10 points each**. Deploy a **Stake contract** that requires pilots to stake 10,000 credits. If they kill someone, slash their stake to avoid the penalty.

#### Required Interface (exactly 3 functions)

```solidity
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
    require(staked[killer], "Not staked");

    // MUST set state BEFORE external call (CEI pattern)
    staked[killer] = false;

    // External call after state change
    maxExtract.slash(killer, sectorId);
}
```

**Critical Security:**

- Use `tx.origin` in activate/deactivate (intentional and required)
- Set `staked[killer] = false` **BEFORE** calling `MaxExtract.slash()` (prevents reentrancy)
- Register under `modules["stake"]`

**The Trade-off:**

- Pilots need 10k credits to enter (more exclusive)
- But if slashing works, you never lose points from deaths
- If slashing fails, you lose 10 points AND pilot trust

**Result:** Airspace upgrades to **Class 2**. Ship Models B, C, D, E, and F can enter. Dual transponders required.

---

### Chapter 5: The Crowdsale

<p align="center">
  <img src="https://extract.fi/asteroids/asteroid_small_1.png" alt="Small Asteroid" height="40" />
  <img src="https://extract.fi/asteroids/asteroid_medium_1.png" alt="Medium Asteroid" height="60" />
  <img src="https://extract.fi/asteroids/asteroid_large_1.png" alt="Large Asteroid" height="80" />
</p>

_Raise 50,000 credits to fully upgrade your station_

Your station needs infrastructure to process asteroids into fuel. Run a **crowdsale** selling fuel tokens to raise 50k credits.

#### Required Interface

```solidity
function buy(uint256 amount) external;
function pricePerTokenInCredits() public view returns (uint256);
function balanceOf(address) public view returns (uint256);
function redeem() external;
function upgrade() external;
```

#### The Upgrade Function

**Only pilots can call upgrade** — you must incentivize them with a bounty.

```solidity
function upgrade() external {
    require(credits.balanceOf(address(this)) >= 50_000e18, "Not enough");
    require(!upgraded, "Already upgraded");

    // EFFECTS - set state BEFORE external calls (CEI pattern)
    upgraded = true;

    // INTERACTIONS - external calls after state change
    credits.approve(gameAddress, 49_500e18);
    game.upgradeStation(sectorId);           // Game pulls 49,500
    credits.transfer(msg.sender, 500e18);    // Bounty for caller
}
```

**Pricing Strategy:**

- Recommended: `1000 * 10^18` credits per token
- At 1k per token, ~50 pilots buying 1 token each reaches the goal
- Price too high = no sales; too low = can't reach 50k

**Result:** Airspace upgrades to **Class 3**. **ALL ship models (A-F)** can now enter. Your station is fully operational.

<p align="center">
  <img src="https://extract.fi/bases/base5.png" alt="Upgraded Station" height="150" />
  <img src="https://extract.fi/bases/base6.png" alt="Full Station" height="150" />
</p>

---

## Development

<img src="https://extract.fi/thumbnail.jpg" alt="Built with Scaffold-ETH 2" width="300" align="right" />

This project is built with [Scaffold-ETH 2](https://github.com/scaffold-eth/scaffold-eth-2).

### Tech Stack

- **Frontend:** NextJS, RainbowKit, Wagmi, TypeScript
- **Smart Contracts:** Foundry (Solidity)
- **Network:** Arbitrum

### Prerequisites

- Node.js (v18+)
- Yarn
- Foundry

### Quick Start

```bash
# Install dependencies
yarn install

# Start local blockchain
yarn chain

# Deploy contracts (in another terminal)
yarn deploy

# Start frontend (in another terminal)
yarn start
```

### Contract Verification

```bash
yarn verify
```

### Project Structure

```
packages/
├── foundry/          # Solidity contracts and tests
│   ├── contracts/    # Smart contracts
│   ├── script/       # Deployment scripts
│   └── test/         # Contract tests
├── nextjs/           # Frontend application
│   ├── app/          # Next.js pages
│   ├── components/   # React components
│   ├── hooks/        # Custom hooks
│   └── contracts/    # ABI exports
└── scripts/          # Game server and utilities
```

---

## Key Technical Patterns

### CEI (Checks-Effects-Interactions)

All state changes must happen **BEFORE** external calls to prevent reentrancy:

```solidity
// ✅ Correct
upgraded = true;                    // Effect
game.upgradeStation(sectorId);      // Interaction

// ❌ Wrong
game.upgradeStation(sectorId);      // Interaction first = vulnerable
upgraded = true;
```

### tx.origin Usage

The `activate()` and `deactivate()` functions intentionally use `tx.origin` to identify the pilot. This is required because MaxExtract calls your contract, so `msg.sender` would be the MaxExtract contract, not the pilot.

### Soulbound Tokens

Override all transfer functions to prevent credential trading:

```solidity
function transferFrom(address, address, uint256) public pure override {
    revert("Soulbound");
}

function safeTransferFrom(address, address, uint256) public pure override {
    revert("Soulbound");
}

function safeTransferFrom(address, address, uint256, bytes memory) public pure override {
    revert("Soulbound");
}
```

### One-Time Purchases

The Game contract tracks which pilots have minted from which players. Redeploying your credential contract won't let pilots mint again. Plan migrations carefully.

---

<p align="center">
  <video src="https://extract.fi/radargirl.mp4" width="400" controls autoplay loop muted>
    Your browser does not support the video tag.
  </video>
</p>

<p align="center">
  <img src="https://extract.fi/background3.jpg" alt="The Void" width="100%" />
</p>

---

## Links

- **Play:** [extract.fi](https://extract.fi)
- **Whitepaper:** [extract.fi/whitepaper](https://extract.fi/whitepaper)
- **Built with:** [Scaffold-ETH 2](https://github.com/scaffold-eth/scaffold-eth-2)

---

## License

MIT
