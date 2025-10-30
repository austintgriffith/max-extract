# Pilot ETH Sweep Script

This script sweeps (withdraws) all ETH from pilot wallets listed in the backup files and sends it back to the GOD account.

## Usage

```bash
# From the root directory
yarn sweep

# Or from packages/scripts directory
yarn sweep
```

## What it does

1. **Reads all pilot backup files** from `packages/scripts/pilot-backups/`
2. **Collects unique pilots** by their public address (removes duplicates across backup files)
3. **Checks each pilot's ETH balance** on the blockchain
4. **Calculates gas costs** and ensures the pilot has enough ETH to cover the transfer
5. **Sweeps the ETH** by sending `balance - gasCost` to the GOD account
6. **Provides a detailed summary** of all transfers

## Requirements

The script uses environment variables from your `.env` file:

- `CHAINID` - The chain ID (default: 31337 for local Foundry)
- `RPC` - The RPC URL (default: http://127.0.0.1:8545)
- `GODPRIVATEKEY` - **Required** - The private key of the GOD account that will receive the swept ETH

## Output

The script provides:

- Progress updates for each pilot sweep
- Success/failure status for each transfer
- Transaction hashes for successful sweeps
- A summary showing:
  - Number of successful sweeps
  - Total ETH swept
  - GOD account balance before and after
  - Detailed results for each pilot

## Example Output

```
🧹 Starting pilot ETH sweep...

🔗 Connected to chain ID: 31337
🔗 RPC URL: http://127.0.0.1:8545

👑 GOD address: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266

💰 GOD initial balance: 10000.0 ETH

📁 Found 2 backup file(s):
   - pilots-2025-10-30T14-42-12-532Z.json
   - pilots-latest.json

👨‍✈️ Found 5 unique pilot(s) to sweep

🔍 Sweeping Jihan Word (0xb05936da...):
   📊 Balance: 0.1234 ETH
   💰 Sending: 0.1232 ETH
   🔒 Gas cost: 0.0002 ETH
✅ Swept 0.1232 ETH (tx: 0x7e8d3c...)

...

============================================================
📊 SWEEP SUMMARY
============================================================
✅ Successful sweeps: 5/5
💰 Total swept: 0.5123 ETH
👑 GOD initial balance: 10000.0 ETH
👑 GOD final balance: 10000.5123 ETH
📈 GOD balance change: 0.5123 ETH
============================================================
```

## Safety Features

- **Minimum balance check**: Skips pilots with very low balances (< 0.001 ETH on localhost, < 0.0001 ETH on Arbitrum)
- **Gas reservation**: Always reserves enough ETH for the transfer transaction
- **Error handling**: Continues processing other pilots even if one fails
- **Detailed logging**: Shows exactly what's happening for each pilot

## When to use this

- After a game session ends and you want to reclaim pilot ETH
- When cleaning up test pilots
- Before redeploying contracts
- To consolidate funds back to the GOD account

## Notes

- The script reads ALL `.json` files in `pilot-backups/` directory
- Duplicate pilots (same address in multiple files) are only swept once
- Failed transfers are logged but don't stop the script
- The script requires the pilot's private key from the backup file to send transactions

