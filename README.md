<img width="533" height="800" alt="Image" src="https://github.com/user-attachments/assets/7b85b519-6cf1-4ff5-aa7d-c0bebd37fda5" />

Max Extract wasn’t a captain or a warlord. Just another code monkey in the asteroid belt, known for keeping his head down and drill spinning. Out here, among scattered wrecks and drifting cargo, the real battles weren’t fought with lasers—they were waged in silence, when one crew mined a rock for hours only to have another swoop in and take everything. No treaties held. Anarchy ruled, but it squandered more than it gave. No one trusted anyone, and every mission risked ending in blood or bankruptcy. Max didn’t try to stop the violence, only the inefficiency.

From a forgotten outpost barely clinging to gravity, Max deployed the first shared record—an immutable contract that let pirates stake exclusive claims on asteroids, earn daily fuel credits, and register their word with something stronger than talk. To dock in the garage, you needed a credential: proof that you bought in, agreed not to fire first, and played by the rules. Every deal made or broken left a trace in the record. Build a good rep, and you could refuel in peace. Break too many promises, and the record made you open season. Over time, the chaos thinned. Crews stopped clashing over the same rocks. Refueling stations stayed intact. Loot got bigger, not bloodier.

What no one realized—until it was far too late—was that Max Extract had no crew at all. Just a protocol. Just a voice. Just a mind, left running long after the original miner was gone. His final act was to etch a signal into the stars: the Extract Protocol, deployed at 0xEXAMPLEiwillfillinlater.

The contract was simple but radical:

- Pirates who signed on would not attack each other.
- Asteroids could be claimed fairly, not stolen by force.
- Every pirate’s reputation would be recorded, traceable, unforgeable.

It was a call to order in deep space, a promise that trust could be built from code, not blood. And it worked, without any centralized control—it was unstoppable and immutable.

Now, the galaxy waits for new signers. You are one of them.

Your first act is to claim a sector of the void and broadcast your Registry Contract in Max’s ledger. From there, you will build the rules of your co-op: staking, reputation, taxes, voting, and more. Pirate agents will drift into your system, probing your contracts, mining your rocks, testing your code. Your success will not be measured in kills, but in credits and coordination.

Max sparked the revolution of pirate trust. The rest is up to you…

In the end, no pirate commands the galaxy. The galaxy is commanded by code.

[TODO: universe contracts? at least a “credits” contract! possibly this is used for sybil resistance.]

<img width="800" height="800" alt="Image" src="https://github.com/user-attachments/assets/bac98c7f-e946-40a2-9d07-b35c0dc81853" />

### **📡 Chapter 1: The Broadcast**

_The galaxy is endless, but pirates listen for signals. Without a broadcast, your sector is just another silent void._

Your first task is to deploy a **Registry Contract** and call broadcast() to announce it to the Extract Protocol. Examine Max's original contract here [TODO:link] to find the broadcast function you need to call. Note the tx.origin != msg.sender requirement: you can't call it directly with an EOA. The Extract ledger maps your automatically-generated sector ID to your registry, and your registry will hold a mapping of strings → addresses where you'll deploy and upgrade to subsequent contracts. [TODO: possible fee in credits or ETH to call broadcast to prevent sybil attacks]

Once your broadcast is live, pirates drifting into your corner of space will know where to dock, where to deal, and where your rules begin.

**Code details:**

- Deploy a Registry Contract with a mapping called modules (string → address).
- Add a function in your contract that calls broadcast(address) on Max's Extract Protocol. (Remember access control — only you should be able to register your own contract and update module records.)
- Use this function to broadcast your Registry Contract to the Extract Protocol. **Important:** You don't choose your sector ID—the `broadcast()` function automatically generates a unique sector ID using universe entropy and returns it. Your Registry contract must store this returned sector ID for future reference.
- **Sector ID Generation:** The MaxExtract contract automatically generates your unique sector ID using: `keccak256(universeEntropy + tx.origin + msg.sender + contractAddress + nonce)`. This ensures:
  - **Uniqueness**: Each sector ID is cryptographically unique
  - **Unpredictability**: Uses universe entropy (set by God via commit-reveal)
  - **Anti-Sybil**: Incorporates both the caller (tx.origin) and contract (msg.sender) addresses
  - **Collision Resistance**: Includes a nonce that increments with each broadcast
- The Registry Contract also doubles as your **treasury**. Pirates will only stake and settle up if the contract code is verified and provably unruggable. If they detect a backdoor to drain the treasury, they won't trust your guild.

**Example Implementation:**

```solidity
contract Registry is Ownable {
    mapping(string => address) public modules;
    IMaxExtract public immutable maxExtract;
    uint256 public sectorId;  // Store the returned sector ID
    bool public hasBroadcast;

    function broadcastSector() external onlyOwner returns (uint256 _sectorId) {
        require(!hasBroadcast, "Already broadcast");

        // Call MaxExtract.broadcast() - this returns the generated sector ID
        _sectorId = maxExtract.broadcast(address(this));

        // Store the returned sector ID in your contract
        sectorId = _sectorId;
        hasBroadcast = true;

        emit SectorBroadcast(_sectorId, address(this));
    }
}
```

**Credits:** This makes your sector discoverable. Ships will begin to spawn and mine in your space, leaving behind only a small tip (1–3 credits depending on their loot) for the guild.

---

<img width="533" height="800" alt="Image" src="https://github.com/user-attachments/assets/7b45d326-2343-4567-8530-cf9fba91cfc5" />

### **🤝 Chapter 2: Swear the Oath**

_Pirates won’t trust words. Only stakes. To enter your garage, they must pledge credits and bind themselves to your code._

Your next task is to craft a **staking system**. Pirates who stake declare they won’t fire first, won’t cheat the guild, and will follow the rules of the Max Extract protocol. In return, they earn safe passage through your sector and the right to dock at your garage.

**Code details:**

- Deploy a **staking contract** where ships deposit **10 credits** up front.
- Ships will first call approve(stakeContract, 10) on the Credits token, then call stake() on your contract.
- Inside stake():
  - Pull the credits with transferFrom().
  - Forward the 10 credits to your **Registry Contract** (the guild treasury).
  - Mint a **soulbound ERC-721** “guild credential” to the caller.
- The guild credential must implement the **standard ERC-721 interface**:
  - balanceOf(address)
  - ownerOf(uint256 tokenId)
  - supportsInterface(bytes4)
- It must also include:
  - isGuildMember(address) → returns true/false for membership (used by other modules).
  - Non-transferability enforcement: override transferFrom and safeTransferFrom to always revert. If pirates can send it around, they won’t respect your rules. Remember: these scurvy dogs trust no one and take no mercy on the weak. This is a guild of cutthroats.
- Restrict credential slashing: only the contract at registry.modules["reputation"] should be able to revoke membership. This means you’ll need a slash(address ship) function in your staking contract that can **only** be called by the contract address listed under "reputation" in your Registry. (For now, that’s just the 0x00 address — but in Chapter 3 you’ll deploy the actual reputation contract there!)
- When a ship is slashed, its credential must be **burned without refunding** the staked credits. Betray the guild, and your coin is gone with your honor.
- There is no unstake function. Once pledged, the credits are locked forever in the Registry treasury. Pirates know this and expect it.
- End by updating the "stake" key in your Registry’s modules mapping to point to your newly deployed staking system. Ships will check registry.modules["stake"] for the address to call stake() on.

**Credits:** Bigger payoff — every new member now pledges 10 credits. Early builders will climb the leaderboard faster as pirates rush to join their guild.

---

<img width="800" height="800" alt="Image" src="https://github.com/user-attachments/assets/8d1f57fb-fd40-4267-a651-0cf34d5eb684" />

### **⚖️ Chapter 3: The Ledger of Scars**

_Every pirate carries scars. Some are earned in battle, others in betrayal. A record of reputation must be written for all to see._

Your next task is to deploy a **reputation contract**. This is more than a blacklist: it’s a ritual of honor among thieves. When a ship plunders an asteroid in your sector, it must **settle up** before it goes. It drops a cut of its loot into your treasury and opens itself to judgment. Guildmates can attest to its honor or scar it for treachery. Fair play is rewarded with clean marks; betrayal earns scars that never fade.

**Code details:**

- Deploy a **reputation contract** with:
  - attest(address ship) → add **+1 reputation**.
  - slash(address ship) → issue a strike, **–3 reputation**.
  - getReputation(address ship) → query score.
  - settleUp(uint256 credits) → ships call this before leaving your sector. They must approve(reputationContract, credits) on the Credits token first. This function:
    - Transfers the credits to your **Registry Contract** (the guild treasury).
    - Opens a short window where other ships in the sector can call attest() or slash() on the departing ship.
- **Access control:**
  - Only addresses with guild credentials may attest.
  - Only your reputation contract may call slash(address) on the staking contract (revoking soulbound credentials).
  - The **Universe contract** ([TODO: universe contract address]) ensures that only ships currently in your sector can attest to each other. It exposes inSystem(address ship) → uint256 that returns the current sector a ship is in. For an attestation to be valid:
    - inSystem(attestor) == inSystem(subject)
    - and both must equal your sectorId from the Registry Contract.
- End by updating the "reputation" key in your Registry Contract’s modules mapping to point to this new system.

**Credits:** Increased payoff — ships who settleUp() add to your guild’s treasury, and reputation enforcement makes your system safer. The stricter your ledger, the more ships will choose to mine and refuel in your sector.

---

<img width="800" height="800" alt="Image" src="https://github.com/user-attachments/assets/bdbe1d8e-36f0-48b1-ac1e-d863ddefea3b" />

### **🪨 Chapter 4: Mining Rights**

_Disorder is when minnows hoard the whale’s feast. Balance is when every ship takes the ore it’s built for._

Your next task is to deploy a **rights contract**. Asteroids can’t just be rushed by whoever gets there first—chaos wastes ships and plunder. To keep order, miners must formally claim their target before drilling.

[TODO: Universe contract governs the spawning and lifespan of asteroids. Each one appears based on previous blockhashes and drifts for 256 blocks before disappearing.] When a ship claims rights, your contract must check three things:

1. **Size match:**
   - Use universe.getShipSize(address ship) and universe.getAsteroidSize(uint256 sectorId, uint256 asteroidId).
   - Allow claims only if the ship’s size is close enough to the asteroid’s size. Tiny ships can’t lock down massive rocks, though larger ships may choose to mine smaller ones.
2. **Proximity check:**
   - Use universe.getLocationOfShip(uint256 sectorId, address ship) and universe.getLocationOfAsteroid(uint256 sectorId, uint256 asteroidId).
   - Only allow a claim if the ship is within 200 pixels of the asteroid’s coordinates.
3. **One asteroid per ship rule:**
   - A ship cannot call rights on more than one asteroid at a time.
   - If a ship already has an active claim, further attempts to call claim() must revert.
   - Once you call rights, you’re locked in until that asteroid is gone.

**Code details:**

- Deploy a rights contract with:
  - claim(uint256 asteroidId) → registers the ship as the miner for that asteroid if checks pass.
  - getClaim(uint256 asteroidId) → returns the ship that holds the rights.
- Enforce one-ship-per-asteroid: once rights are claimed, no other ship can contest it.
- End by updating the "rights" key in your Registry’s modules mapping to point to this new system. Ships will check registry.modules[“rights”] to know where to register claims.

**Credits:** Increased payoff — with fair distribution enforced, pirates will pay more tribute when they settle up, boosting your guild’s treasury.

[TODO: Ships need a way to actually extract asteroid resources. Add a mine(asteroidId) function in the Universe contract that lets a ship harvest materials from a claimed asteroid and destroy it so no other ship can mine it. A single ship may mine multiple asteroids in one sector, stockpile resources in inventory, and then call settleUp() when exiting.]

[TODO: Ships will also call slash() on the reputation contract if a ship mines an astroid that they called. Maybe we even need a prove function of some sorts…]

---

<img width="800" height="800" alt="Image" src="https://github.com/user-attachments/assets/b1219517-5149-46cd-bc55-7068d61bd8f4" />

### **💰 Chapter 5: The Treasury’s Gambit**

_Guilds don’t thrive on scraps alone. Debt is the silent backbone of every power that endures._

Your next task is to deploy a **debt contract** that transforms your guild into a true power. Tribute alone won’t fund the fleet. By issuing bonds, you can pull credits from the future into the present. Ships and rival guilds alike can buy into your promise — a share of your tomorrow, priced in trust. With that capital, you can upgrade your garage, harden defenses, and **raise your tribute rate from 5% to 13–14%.** The catch? **3–4% of every tribute is siphoned automatically into bond repayments.** Pirates will tolerate it, but fail to honor your bonds, and your guild becomes a ghost sector, cursed by the Extract Protocol.

**Code details:**

- Deploy a **debt contract** designed as an ERC-1155 bond market:
  - Each bond issuance (principal, interest, maturity) becomes a unique tokenId.
  - Each unit of that bond is fungible, allowing ships to trade them freely.
- Core mechanics:
  - **Issue bonds:** create a new series with fixed principal, interest, and maturity.
  - **Buy bonds:** ships or rival guilds pay credits into your Registry treasury in exchange for bond units.
  - **Repay bonds:** 3–4% of every tribute collected through settleUp() is routed automatically into the debt contract’s repayment pool.
  - **Claim repayment:** bondholders burn their bond units to withdraw principal + interest once enough has been repaid.
- Integration points:
  - Tribute flow is split: ~10% to the Registry treasury, 3–4% to debt repayments.
  - Reputation matters: guilds with higher reputation issue bonds cheaper, scarred guilds pay more.
  - Borrowed credits flow directly into the Registry treasury, strengthening your guild’s war chest.
- End by updating the "debt" key in your Registry’s modules mapping to point to this new system.

**Credits:** This is the **biggest payoff yet.** Debt lets you scale tribute rates and treasury growth far beyond what’s possible with staking, reputation, or mining rights alone. But it comes at a price: if repayments lag, your bonds rot, your reputation crumbles, and your guild is marked for death.

---

<img width="800" height="800" alt="Image" src="https://github.com/user-attachments/assets/bb15f598-a0f1-4046-bc51-ffe120858116" />

<img width="800" height="800" alt="Image" src="https://github.com/user-attachments/assets/9cfab672-ba02-4b44-97ef-f0bec72f86d9" />

<img width="800" height="800" alt="Image" src="https://github.com/user-attachments/assets/cf8f6fd4-2710-45cb-918e-1ffa7f562f15" />

## **⚡ Advanced Chapters (Optional Edge Quests)**

_Adds flavor, variety, and side revenue — but each brings less overall credits than the basics. They’re crab traps for pirates with specific preferences, giving a small edge but not deciding the game._

---

### **🗳️ Chapter 6: One Pirate, One Vote**

_Even a guild of cutthroats can’t dodge the ballot. One pirate, one vote — no more, no less._

Your next task is to deploy a **voting contract** that gives your guild real democracy. Membership alone isn’t enough — every pirate credential must be proven unique. By using a Merkle tree claim system, you’ll let ships mint voting tokens that prove their place in the guild without giving them extra weight for holding multiple wallets.

Once votes are claimed, proposals can be raised. Should the garage add a stronger shield bay? Should the tribute tax increase by another percent? Should the guild pool credits to expand into the next sector? Pirates vote, and when the proposal passes, your contract **ratifies the decision automatically**.

**Code details:**

- Deploy a voting contract with:
  - claimVote(bytes32[] proof) → ships claim a **soulbound voting token** via Merkle proof of guild credential.
  - propose(string description, functionCall) → open a proposal.
  - vote(uint256 proposalId, bool support) → cast a vote.
  - ratify(uint256 proposalId) → executes the encoded function call if majority passes.
- Integration:
  - Update your Registry’s "vote" module to point here.
  - Tribute rate increases by **+1–2%** when a ratified proposal enacts a garage upgrade.

**Credits:** Small steady boost — democracy doesn’t mint credits directly, but it makes your guild more attractive. Ships that value fairness will dock and pay tribute, knowing their voice counts.

---

### **🎲 Chapter 7: Old Salty Dogs Yelling at Numbers**

_Pirates will always gamble. Better they lose to the guild than to the void._

Your next task is to deploy a **keno contract**. Unlike the void, this game has a house — but the house isn’t a casino, it’s a co-op. Ships can stake credits into the house pool, becoming co-owners of the game. When salty dogs scream their numbers and lay their bets, the payouts come from the house pool. Losers fatten the pool, winners take their cut. The edge stays with the house, paid back to the stakers over time.

Because your garage runs keno, more pirates dock here, and tribute ticks upward. Even the losers will line up again tomorrow.

**Code details:**

- Deploy a keno contract with:
  - **pickNumbers(uint256[] numbers, uint256 wager)** → pirates submit numbers + wager.
  - **draw()** → generates winning numbers using verifiable randomness (blockhash, VRF, or similar).
  - **payout()** → winners claim their prize based on matches.
- **House Pool Mechanics:**
  - Pirates (or guildmates) can stake credits into the **house pool**.
  - All wagers are paid into the pool; all payouts are drawn from it.
  - Payout odds are set **below true probability** (e.g., winners get 90–95% expected value).
  - That difference is the **house edge** — guaranteed long-term profit for pool stakers.
  - Profits accumulate and can be withdrawn pro-rata by stakers.
- Integration:
  - Update the "keno" key in your Registry’s modules mapping to point here.
  - Tribute rate increases **+1%** because gamblers dock in your garage for the game.
  - Pirates who stake into the house pool earn steady profit from wagers, on top of their tribute.

**Credits:** Steady boost. The house edge ensures profit flows back to guild stakers, while keno’s chaos keeps pirates coming. Gambling isn’t the main prize, but it fattens the guild’s purse and gives you an edge over rivals.

---

### **🪢 Chapter 8: Oathkeeper’s Escrow**

_Pirates break promises. Code does not._

Your next task is to deploy an **escrow contract** where pirates can lock credits behind conditional oaths. Two ships agree to a side deal — guard duty, cargo swap, mining partnership. They each deposit into the escrow. When the condition is met, both are paid out. If one betrays, the contract enforces the outcome automatically.

Any pirate in your guild can use this service, free of rake. The guild absorbs the cost as a public good — and in return, more ships trust your garage, **raising tribute by +1%**.

**Mechanics:**

- randomEscrow(address counterparty, uint256 amount) → sets up a locked escrow between two pirates.
- resolve(condition) → releases funds if conditions (on-chain signals or Universe proofs) are met.
- Escrow service is **free**, but tribute climbs because pirates see your guild as reliable infrastructure.

**Credits:** +1% tribute for all transactions, as pirates use your space to settle deals without fear.

---

### **🏴‍☠️ Chapter 9: The Black Flag Bazaar**

_Your guild won’t shelter every drifter. But that doesn’t mean you can’t profit from them._

Not every ship has sworn the oath. When outsiders drift into your sector without guild credentials, they’re marked with the black flag. Most won’t last long. So you spin up a **prediction market**: pirates place bets on their survival.

- Will this ship survive 500 blocks?
- Will it mine a rock before it burns out?
- Will it even make it to settleUp()?

The Universe contract resolves outcomes: death, survival, or exit. Winners split the pot, losers fatten it. The guild takes a **small cut in tribute** from each wager, ratcheting tribute up **+1%** just for running the bazaar.

**Mechanics:**

- listWager(address outsider, string condition, uint256 stake).
- betYes/betNo.
- resolve() with Universe data to pay out.
- Outsiders can’t touch it — only guild members gamble on them.

**Credits:** +1% tribute edge. Even enemy ships become profitable prey, whether they live or die.

---

### **🖤 Chapter 10: Black Slip Protocol**

_Every pirate’s hand is stained by credits. Some would rather sail unseen._

Your next task is to deploy a **credit mixer**. Pirates lock up credits and receive a **Black Slip** — a proof of deposit bound to zero-knowledge math instead of names. Later, they can burn their slip and withdraw the same amount of credits from the pool, even from a different address.

The trick? Pirates can trade slips in the shadows. The one who redeems doesn’t have to be the one who deposited. The chain won’t know. The record stays pure, but the path of the credits dissolves.

**Code details:**

- Deploy a mixer contract with:
  - **deposit(uint256 amount)** → locks credits, issues a ZK Black Slip.
  - **redeem(bytes zkProof)** → burns slip, validates proof, and withdraws credits anonymously.
- Each slip is fungible — 100 credits in equals a 100-credit slip, indistinguishable from any other.
- Privacy is guaranteed by zero-knowledge: the ledger sees only slips in and slips out, never who swapped them.
- Pirates can privately trade slips off-chain, making them a shadow currency in your sector.

**Integration:**

- Update the “mixer” key in your Registry’s modules mapping.
- Tribute rate increases by **+1%** — pirates who crave privacy will dock in your sector, even if they pay extra.

**Credits:** Thin but unique. Privacy doesn’t mint riches, but it buys loyalty from rogues who value shadows over light. In the end, every empire needs its laundromat.

---

---

# **🪐 Game Mechanics**

- **World Map:** The universe is a uint64 x uint64 grid. Each sector is a uint256 coordinate mapped to a player’s Registry Contract.
- **Registry Contract:** A string → address mapping that points to subsystem contracts (e.g., “staking”, “reputation”, “keno”, “garage”).
- **Universe Contract (world state):**
  - **Asteroid Lifecycle:** spawnAsteroid, getAsteroidSize, getLocationOfAsteroid, despawnAsteroid.
  - **Ship Lifecycle:** getLocationOfShip, inSystem(address) → sectorId, getShipSize.
  - **Mining Actions:** mine(sectorId, asteroidId) → extract resources + destroy asteroid.
  - **Verification Hooks:** proveClaim, verifyExit — used by rights, reputation, and bazaar modules to enforce rules.
- **Pirate Agents:** Thousands of AI-controlled ships (EOAs) traverse space, mine asteroids, dock at garages, and interact with contracts.
- **Victory Condition:** After a set number of turns, the DAO with the most credits (sector value) is crowned winner. Efficiency + luck determine outcomes.
- **Honey Pot Principle:** Each contract is bait for a certain kind of pirate — gamblers, miners, loyalists, traders, rogues. Build more traps, catch more credits.
- **Balance:**
  - Basic Chapters = 70–80% of credits.
  - Advanced Chapters = 20–30% max.
  - RNG from asteroids/agents ensures weaker devs can still win with luck.

---

# **⚙️ Assets & Inventory**

**Raw Materials**

- Metals: Iron, Titanium, Nickel, Cobalt, Copper, Iridium
- Crystals: Quartz, Darkglass, Lumina, Voidstone
- Gases: Volatite, Helium, Aethergas
- Bio: Neurogel, Mycothene

**Intermediate Assets**

- Steel Plating, Titan-Alloy Mesh, Quantum Circuits, Neurocore Processor, Cryo Fuel Cells, etc.

**Ship Modules**

- Mining Drills, Cargo Bays, Thrusters, CPU Units, Weapons, Shielding, Comms Arrays, AI Clusters.

**Asteroids (Small / Medium / Large)**

- Metallic (Iron, Nickel, Copper, Titanium)
- Crystalline (Quartz, Lumina, Darkglass)
- Exotic (Volatite, Neurogel, Voidstone, Mycothene, Aethergas)

---

⚔️ **Endgame:** After the cycle, the Extract Protocol tallies every co-op. The richest DAO wins — not by guns, but by code.
