# Auditor Service Setup

The Auditor service watches the Auditor smart contract for audit requests from players and automatically verifies their contracts via Etherscan.

## Environment Variables

Create a `.env` file in `/packages/scripts/` with the following content:

```env
# Anthropic API Key for Claude AI auditing (REQUIRED)
ANTHROPIC_API_KEY=sk-ant-api03-...

# Etherscan API Key for contract verification
ETHERSCAN_API_KEY=HNJUWFBUER5JV7I23DIXDPP3GSRNEQDFR5

# Optional: Override RPC URL (defaults to http://localhost:8545)
# RPC_URL=http://localhost:8545

# Optional: Override Auditor Private Key (defaults to Anvil account #4: 0x3FB7c3260e8Dcd7F8019c814799049648C5c0116)
# AUDITORPRIVATEKEY=0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a
```

### Required Environment Variables

- **ANTHROPIC_API_KEY**: Your Anthropic API key for Claude AI. Get one at https://console.anthropic.com/
- **AUDITORPRIVATEKEY**: Private key for the auditor account (defaults to Anvil test account)

### Optional Environment Variables

- **ETHERSCAN_API_KEY**: Used to fetch verified contract source code from block explorers
- **RPC_URL**: Custom RPC endpoint (defaults to local Anvil at http://localhost:8545)

## Running the Auditor Service

### Local Development

1. Make sure your local blockchain is running:

   ```bash
   yarn chain
   ```

2. Deploy the contracts (including the Auditor contract):

   ```bash
   yarn deploy
   ```

3. Start the auditor service:
   ```bash
   yarn auditor
   ```

The auditor service will:

- Poll the Auditor contract every 5 seconds for new audit requests
- For each pending audit:
  - Check if contract is already successfully audited (skip if yes)
  - Verify the contract bytecode exists on chain
  - Load the chapter definition file for the requested chapter
  - Fetch the source code from Etherscan/Arbiscan
  - Send source code and chapter requirements to Claude AI for validation
  - Mark the audit as "Audited" if Claude determines it passes all requirements
  - Mark the audit as "Failed" if validation fails (with detailed reason from Claude)

### Production (Arbitrum)

For production deployment on Arbitrum, you'll need to:

1. Update the chain configuration in `Auditor.ts` from `foundry` to `arbitrum`
2. Set the RPC_URL in `.env` to an Arbitrum RPC endpoint
3. Set the AUDITORPRIVATEKEY to a funded Arbitrum account
4. Ensure the Auditor contract is deployed on Arbitrum and the deployment address is in the broadcast JSON

## How It Works

### Player Workflow

1. Player deploys their contract (e.g., an "About" contract for Chapter 2)
2. Player verifies their contract on Arbiscan
3. Player calls `requestAudit(contractAddress, chapterNumber, blockExplorerUrl)` on the Auditor contract
   - This costs 2 points (deducted from their game score)
   - The blockExplorerUrl is optional (defaults to arbiscan pattern)

### Auditor Service Workflow

1. Service detects new audit request
2. Checks if contract is already successfully audited (early exit if yes)
3. Loads chapter definition file for the requested chapter
4. If no definition exists: calls `markFailed(requestId, "Unknown chapter")`
5. Fetches contract bytecode from blockchain
6. Queries Etherscan API v2 to get verified source code
7. Sends source code + chapter definition to Claude AI for validation
8. Claude analyzes the contract and determines PASS or FAIL
9. If PASS: calls `markAudited(requestId)` and sets `isAudited[contract] = true`
10. If FAIL: calls `markFailed(requestId, reason)` with Claude's detailed explanation

### Chapter Definitions

Chapter definitions are stored in `/packages/scripts/definitions/` as text files (e.g., `chapter2Definition.txt`). These files contain:

- Human-readable requirements for the chapter's contract
- Strict validation rules (e.g., "must use constant keyword")
- Pass/fail conditions
- Examples and clarifications

Claude AI reads these definitions and validates contracts against them with high accuracy.

### Checking Audit Status

Anyone can check which chapter a contract is audited for by calling:

```solidity
uint8 auditedChapter = auditorContract.isAudited(contractAddress);
// Returns chapter number (0 = not audited, 1-255 = audited for that chapter)

// Example checks:
if (auditedChapter == 0) {
    // Contract not audited
}
if (auditedChapter == 2) {
    // Contract successfully audited for Chapter 2
}
```

Get all your audit requests:

```solidity
uint256[] memory myAuditIds = auditorContract.getAuditsByAddress(myAddress);
```

Get detailed audit request information:

```solidity
AuditRequest memory request = auditorContract.getAuditRequest(requestId);
```

### Re-auditing for Different Chapters

A contract can be audited for multiple chapters! If your contract passes Chapter 2 audit, you can request an audit for Chapter 3, and the system will re-audit it against the new requirements. The `isAudited` mapping will be updated to reflect the most recent successful chapter audit.

## Logging

The auditor service provides detailed logging:

- ✓ = Success/Found
- ❌ = Error/Failed
- 📨 = New request detected
- 🔍 = Processing request
- 📝 = Writing result to blockchain
