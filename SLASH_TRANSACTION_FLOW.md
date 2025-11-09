# Chapter 4 Slash Transaction Flow Analysis

## Overview

This document explains the complete flow of slash transactions in the Max Extract Protocol Chapter 4 staking system, including the contracts involved and what the logs reveal about the failure.

## Contracts Involved

### 1. **Game.sol** (`packages/foundry/contracts/Game.sol`)

- Entry point for pilot death transactions
- Contains `deadMansSlash(address _killer, address _playerToPenalize)` function (line 448)
- Verifies conditions and initiates the slashing process

### 2. **Chapter4.sol** (Player-deployed contract)

- Middleware contract deployed by players
- Tracks which pilots are currently staked in a sector via `mapping(address => bool) public staked`
- Contains three required functions:
  - `activate()` - Called by MaxExtract when pilot enters (sets `staked[tx.origin] = true`)
  - `deactivate()` - Called by MaxExtract when pilot exits (sets `staked[tx.origin] = false`)
  - `slash(address killer)` - Called by Game when pilot kills (verifies and forwards to MaxExtract)

### 3. **MaxExtract.sol** (`packages/foundry/contracts/MaxExtract.sol`)

- Core protocol contract
- Holds all staked credits via `mapping(address => uint256) public stakedBalance`
- Contains `slash(address killer, uint256 sectorId)` function (line 458)
- Actually burns the killer's stake

### 4. **GameServer/SectorCombatManager** (`packages/scripts/sector/SectorCombatManager.ts`)

- Backend service that detects pilot deaths
- Executes the blockchain transactions on behalf of victims
- Located around line 359-601

## Normal Slash Transaction Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. PILOT DEATH DETECTED                                         │
│    Location: SectorCombatManager.ts:359 (executeDeadMansSwitch) │
│    Trigger: Ship collision/combat in game simulation            │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 2. CHECK PLAYER HAS AUDITED STAKE MODULE                        │
│    Location: SectorCombatManager.ts:425                         │
│    Action: Check if player's sector has audited Chapter4        │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 3. CALL Game.deadMansSlash()                                    │
│    Location: Game.sol:448                                       │
│    Caller: Victim pilot (via their private key)                │
│    Parameters:                                                  │
│      - _killer: Address of the pilot who killed victim         │
│      - _playerToPenalize: Sector owner address                 │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 4. Game.sol VERIFICATION STEPS (Lines 448-492)                  │
│    ✓ Check victim (msg.sender) is a pilot                      │
│    ✓ Check victim is not already dead                          │
│    ✓ Check _playerToPenalize is a player                       │
│    ✓ Mark victim as dead (deadPilots[msg.sender] = true)       │
│    ✓ Get player's sector ID                                    │
│    ✓ Get registry address from MaxExtract                      │
│    ✓ Get stake contract address from registry                  │
│    ✓ Verify stake contract is audited for chapter 4            │
│    ✓ Check killer has >= 10k staked in MaxExtract              │
│      (balanceBefore = maxExtract.getStakedBalance(_killer))    │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 5. CALL Chapter4.slash()                                        │
│    Location: Game.sol:495-497                                   │
│    Call: stakeContract.call(                                    │
│            abi.encodeWithSignature("slash(address)", _killer))  │
│    Target: Player's deployed Chapter4 contract                 │
│    Note: Uses low-level call, not typed interface              │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 6. Chapter4.slash() VERIFICATION                                │
│    Location: Player's Chapter4 contract (slash function)       │
│    ✓ Check msg.sender == gameContract                          │
│    ✓ Check staked[killer] == true                              │
│       ⚠️  CRITICAL: This checks Chapter4's own mapping!        │
│    ✓ Get sectorId from registry                                │
│    ✓ Set staked[killer] = false                                │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 7. CALL MaxExtract.slash()                                      │
│    Location: Chapter4 contract                                 │
│    Call: IMaxExtractStaking(maxExtractContract)                │
│            .slash(killer, currentSectorId)                      │
│    Parameters:                                                  │
│      - killer: The pilot to be slashed                         │
│      - sectorId: The sector where killing occurred             │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 8. MaxExtract.slash() EXECUTION (Lines 458-481)                 │
│    ✓ Get registry for sector                                   │
│    ✓ Verify msg.sender is the audited stake module             │
│    ✓ Get killer's staked balance                               │
│    ✓ Require slashAmount > 0                                   │
│    ✓ Set stakedBalance[killer] = 0 (BURN THE STAKE)            │
│    ✓ Emit PilotSlashed event                                   │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 9. BACK TO Game.sol FINAL VERIFICATION (Lines 500-506)          │
│    ✓ Get killer's balance AFTER slash                          │
│    ✓ Require balanceAfter == 0                                 │
│    ✓ Require balanceBefore - balanceAfter >= 10k               │
│    ✓ Emit PilotDied event with 0 penalty                       │
└─────────────────────────────────────────────────────────────────┘
```

## The Two Deaths in Your Logs

### Death #1: SUCCESSFUL ✅

```
Victim: Slate Harbor (0x21f5B70A44198Cb8Cd43d08c8afB75D9bED7949a)
Killer: Cosmos Sinner (0xA29A6CfA29f0e187E4Ef31DCa06eBBcfFB7E2c08)
Block: 1370
Result: ✅ SLASH TRANSACTION SUCCEEDED
```

**What happened:**

1. Cosmos Sinner killed Slate Harbor
2. Game.sol checked Cosmos Sinner's stake: 10,000 CREDITS ✓
3. Game.sol called Chapter4.slash(Cosmos Sinner)
4. Chapter4 checked `staked[Cosmos Sinner]`: true ✓
5. Chapter4 called MaxExtract.slash(Cosmos Sinner, sectorId)
6. MaxExtract burned Cosmos Sinner's 10k stake
7. Game.sol verified the burn succeeded
8. **Result**: Cosmos Sinner now has `stakedBalance[Cosmos Sinner] = 0` in MaxExtract
9. **Result**: Cosmos Sinner now has `staked[Cosmos Sinner] = false` in Chapter4

### Death #2: REVERTED 🚨

```
Victim: Cosmos Sinner (0xA29A6CfA29f0e187E4Ef31DCa06eBBcfFB7E2c08)
Killer: Steam Orbit (0xcA63eE4403F138359Ec670979Fd4720C9189d7EB)
Block: 1376
Result: 🚨 SLASH TRANSACTION REVERTED
```

**Pre-slash debug info showed:**

```
🔍 SLASH DEBUG INFO:
   Killer: Steam Orbit
   Killer's staked balance in MaxExtract: 10000000000000000000000 (10000 CREDITS)
   Killer's staked status in Chapter4: true
   Block number: 1374
```

**What should have happened:**

1. Steam Orbit killed Cosmos Sinner (who was already slashed and had 0 balance)
2. Game.sol should check Steam Orbit's stake: 10,000 CREDITS ✓
3. Game.sol should call Chapter4.slash(Steam Orbit)
4. Chapter4 should check `staked[Steam Orbit]`: true ✓
5. But... **THE TRANSACTION REVERTED**

## The Problem: Race Condition / State Inconsistency

Looking at the timeline between the deaths:

```
Block 1370: Cosmos Sinner slashed (Death #1)
Block 1374: Steam Orbit kills Cosmos Sinner
Block 1375: Block AFTER slash transaction sent
Block 1376: Slash transaction mined (REVERTED)
```

**Key observation from logs:**

```
📡 Victim transaction details (deadMansSlash):
   Address: 0xA29A6CfA29f0e187E4Ef31DCa06eBBcfFB7E2c08 (Cosmos Sinner)
   Nonce: 2
   ...
   Block number BEFORE: 1374
   Timestamp BEFORE: 2025-11-08T13:42:18.226Z
⏳ Sending deadMansSlash transaction...
📤 Transaction sent: 0x46640eadea9386ef2e400b9cfddeffc1286f557b3ad1fccda14db765182b3051
   Timestamp AFTER SEND: 2025-11-08T13:42:18.227Z

🚨 SLASH TRANSACTION REVERTED! 🚨
   Transaction: 0x46640eadea9386ef2e400b9cfddeffc1286f557b3ad1fccda14db765182b3051
   Block: 1376
   Gas Used: 149953
```

## Possible Root Causes

### Theory 1: Steam Orbit Unstaked Between Debug Check and Transaction

**Timeline:**

1. Block 1374: Debug check reads `staked[Steam Orbit] = true`
2. Block 1375: Steam Orbit unstakes (calls `deactivate()`, sets `staked[Steam Orbit] = false`)
3. Block 1376: Slash transaction executes, Chapter4 checks `staked[Steam Orbit]` → false → REVERT

**Evidence against this:**

- The logs show Steam Orbit unstaked BEFORE the kill, then restaked
- No unstake transaction between blocks 1374-1376 in the logs

### Theory 2: Chapter4 State Not Updated During Restake

**Timeline:**

1. Steam Orbit unstakes (calls `deactivate()`, sets `staked[Steam Orbit] = false`)
2. Steam Orbit restakes (calls `activate()`, SHOULD set `staked[Steam Orbit] = true`)
3. **BUT**: What if `activate()` failed silently or was called on a different Chapter4 instance?

**Evidence:**

```
✅ Pilot Steam Orbit successfully staked 10k credits in sector 2633639081...
```

This message comes from MaxExtract, not from Chapter4. The MaxExtract.stake() function:

```solidity
// Call activate on stake contract (tx.origin pattern)
(bool activateSuccess, ) = stakeContract.call(abi.encodeWithSignature("activate()"));
require(activateSuccess, "Activate failed");
```

**Question**: Did the `activate()` call actually succeed, or did MaxExtract not properly check the return value?

### Theory 3: Reading vs Execution State Difference

The debug logging reads state at block N:

```typescript
const isStaked = await publicClient.readContract({
  address: stakeContract,
  functionName: "staked",
  args: [killerShip.pilotAddress],
});
```

But the transaction executes at block N+2. Between these blocks, state could have changed.

### Theory 4: Multiple Chapter4 Instances

**Critical question**: Is there only ONE Chapter4 contract per sector, or could there be multiple?

If Steam Orbit staked through a different Chapter4 instance than the one being used for slashing, then:

- MaxExtract has `stakedBalance[Steam Orbit] = 10000` ✓
- Chapter4 Instance A has `staked[Steam Orbit] = false` (used for slashing)
- Chapter4 Instance B has `staked[Steam Orbit] = true` (used for debug reading)

**How to verify**: Check that the same stakeContract address is used for:

1. Debug reading (line 425-441 in SectorCombatManager.ts)
2. Game.sol slash call (line 478 in Game.sol)
3. MaxExtract stake/unstake calls

## Files Involved

### Backend (GameServer):

1. **`packages/scripts/sector/SectorCombatManager.ts`**

   - Lines 359-601: `executeDeadMansSwitch()` - Main death handler
   - Lines 425-483: Debug logging and slash attempt
   - Lines 511-539: Fallback to deadMansSwitch on error

2. **`packages/scripts/managers/blockchain/DeathMechanicsService.ts`**
   - Lines 163-357: `executeDeadMansSlash()` - Executes the actual transaction
   - Lines 214-247: Transaction sending and error handling

### Smart Contracts:

1. **`packages/foundry/contracts/Game.sol`**

   - Lines 448-507: `deadMansSlash()` - Main entry point

2. **`packages/foundry/contracts/MaxExtract.sol`**

   - Lines 384-415: `stake()` - Entry staking
   - Lines 421-450: `unstake()` - Exit staking
   - Lines 458-481: `slash()` - Actual stake burning

3. **Player's Chapter4.sol** (External)
   - `activate()`: Sets `staked[tx.origin] = true`
   - `deactivate()`: Sets `staked[tx.origin] = false`
   - `slash(address killer)`: Verifies `staked[killer]` and calls MaxExtract

## What The Logs Tell Us

### Pre-Slash State (Block 1374):

```
✅ Killer has 10k staked in MaxExtract
✅ Killer shows as staked in Chapter4
✅ All contracts initialized
✅ Auditor verified
```

### Transaction Execution (Block 1376):

```
🚨 Transaction REVERTED
⚠️  Gas Used: 149953 (more than just access checks)
⚠️  Fallback to deadMansSwitch succeeded
```

The gas usage (149,953) suggests the transaction got fairly far through execution before reverting. This indicates it likely:

1. Passed Game.sol checks (lines 448-492)
2. Reached Chapter4.slash()
3. Reverted at the `if (!staked[killer]) revert KillerNotStaked();` check

## Gas Optimization: Removing O(n) Pilot Lookup

### The Problem

The original `deadMansSlash` and `deadMansSwitch` functions used an **O(n) array iteration** to check if the victim was a pilot:

```solidity
bool isPilotInArray = false;
for (uint256 i = 0; i < pilots.length; i++) {
    if (pilots[i] == msg.sender) {
        isPilotInArray = true;
        break;
    }
}
if (!isPilotInArray) revert OnlyPilot();
```

This caused **variable gas costs** depending on:

- **Total number of pilots**: With 30 pilots, worst case = 30 iterations
- **Position in array**: Victim at index 0 = ~2k gas, at index 29 = ~62k gas

### Observed Gas Usage

From production data:

- **Low**: 128,008 gas (victim found early in array)
- **Medium**: 167,800 gas (victim in middle)
- **High**: 185,209 gas (victim near end)

**Variance: ~57,000 gas** (equivalent to ~27 array iterations)

### The Solution

Added `isPilotMapping` for **O(1) constant-time lookups**:

```solidity
// New state variable
mapping(address => bool) public isPilotMapping;

// Updated addPilot to populate mapping
function addPilot(address _pilot) external onlyGod {
    pilots.push(_pilot);
    isPilotMapping[_pilot] = true; // O(1) lookup
    emit PilotAdded(_pilot);
}

// Updated isPilot to use mapping
function isPilot(address _pilot) public view returns (bool) {
    if (deadPilots[_pilot]) return false;
    return isPilotMapping[_pilot]; // O(1) instead of O(n)
}

// Updated deadMansSlash to use mapping
function deadMansSlash(address _killer, address _playerToPenalize) external {
    if (!isPilotMapping[msg.sender]) revert OnlyPilot(); // O(1)
    // ... rest of function
}
```

### Expected Gas Savings

- **Before**: 128k - 185k gas (variance: ~57k)
- **After**: ~110k - 130k gas (variance: ~20k from other factors)
- **Savings**: ~20-60k gas per slash (10-30% reduction)
- **Consistency**: Gas usage now depends on actual work, not array position

### Benefits

1. ✅ **Predictable costs**: No more variance based on pilot array position
2. ✅ **Lower gas**: Saves 20-60k gas per transaction
3. ✅ **Better UX**: More consistent transaction costs for users
4. ✅ **Scalability**: Gas doesn't increase with more pilots

## Recommended Debugging Steps

### 1. Add More Detailed Logging in Chapter4

Modify the Chapter4 contract to emit events before every check:

```solidity
event SlashAttempt(address killer, bool wasStaked, uint256 sectorId);
event SlashSuccess(address killer, uint256 sectorId);

function slash(address killer) external {
    emit SlashAttempt(killer, staked[killer], registry.sectorId());
    // ... rest of function
}
```

### 2. Verify Contract Addresses Match

Add logging in SectorCombatManager.ts to confirm:

```typescript
console.log(`📍 Contract Address Verification:`);
console.log(`   Stake contract used for debug read: ${stakeContract}`);
console.log(`   Registry address: ${registryAddress}`);
console.log(`   Sector ID: ${sectorId}`);
```

### 3. Check Stake/Unstake Timing

Add timestamps to stake/unstake operations:

```typescript
console.log(`⏰ Stake operation timing:`);
console.log(`   Staked at block: ${stakeBlock}`);
console.log(`   Current block: ${currentBlock}`);
console.log(`   Blocks since stake: ${currentBlock - stakeBlock}`);
```

### 4. Read Chapter4 State Immediately Before Transaction

```typescript
// Right before sending slash transaction
const killerStakedStatus = await publicClient.readContract({
  address: stakeContract,
  functionName: "staked",
  args: [killerAddress],
  blockNumber: await publicClient.getBlockNumber(),
});
console.log(
  `🔍 Killer staked status at block ${blockNumber}: ${killerStakedStatus}`
);
```

### 5. Simulate the Transaction First

```typescript
try {
  await publicClient.simulateContract({
    address: gameContract.address,
    abi: gameContract.abi,
    functionName: "deadMansSlash",
    args: [killerAddress, playerAddress],
    account: victimAccount,
  });
  console.log(`✅ Simulation succeeded`);
} catch (simError) {
  console.log(`🚨 Simulation failed: ${simError.message}`);
}
```

## Conclusion

The most likely issue is a **state synchronization problem** between when the debug check reads `staked[killer]` and when the transaction executes. The 2-block delay (1374 → 1376) creates a window where:

1. State could change (pilot unstakes)
2. A different contract could be called
3. Network/mempool delays could cause ordering issues

**Immediate fix**: Add transaction simulation IMMEDIATELY before sending, using the exact same block number for both the check and the transaction.

**Long-term fix**: Consider adding a "stake lock" period where pilots cannot unstake for N blocks after staking, preventing rapid stake/unstake cycles that could cause race conditions.
