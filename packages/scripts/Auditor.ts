import { createPublicClient, createWalletClient, http, Address } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { foundry, arbitrum } from "viem/chains";
import Anthropic from "@anthropic-ai/sdk";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";

// Load environment variables
dotenv.config();

// Etherscan API configuration
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY || "";
const ETHERSCAN_API_BASE = "https://api.etherscan.io/v2/api";

// Anthropic API configuration
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || "";

// Deployment configuration
const BROADCAST_PATH = path.join(
  __dirname,
  "../foundry/broadcast/Deploy.s.sol/31337/run-latest.json"
);
const POLL_INTERVAL = 2000;

// Track processed audit requests
let lastProcessedIndex = -1;

// Auditor contract ABI (only the functions we need) - using raw ABI format
const auditorAbi = [
  {
    inputs: [],
    name: "getAuditRequestCount",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "_index", type: "uint256" }],
    name: "getAuditRequest",
    outputs: [
      {
        components: [
          { name: "contractAddress", type: "address" },
          { name: "requester", type: "address" },
          { name: "chapterNumber", type: "uint8" },
          { name: "blockExplorerUrl", type: "string" },
          { name: "timestamp", type: "uint256" },
          { name: "status", type: "uint8" },
          { name: "failureReason", type: "string" },
        ],
        name: "",
        type: "tuple",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getPendingAudits",
    outputs: [{ name: "", type: "uint256[]" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "", type: "address" }],
    name: "isAudited",
    outputs: [{ name: "", type: "uint8" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "_requestId", type: "uint256" }],
    name: "markAudited",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "_requestId", type: "uint256" },
      { name: "_reason", type: "string" },
    ],
    name: "markFailed",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "gameContract",
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

// Game contract ABI (only the function we need)
const gameAbi = [
  {
    inputs: [],
    name: "getVisibleChapters",
    outputs: [{ name: "", type: "uint8[]" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

interface AuditRequest {
  contractAddress: Address;
  requester: Address;
  chapterNumber: number;
  blockExplorerUrl: string;
  timestamp: bigint;
  status: number;
  failureReason: string;
}

interface EtherscanSourceCodeResponse {
  status: string;
  message: string;
  result: Array<{
    SourceCode: string;
    ABI: string;
    ContractName: string;
    CompilerVersion: string;
    OptimizationUsed: string;
    Runs: string;
    ConstructorArguments: string;
    EVMVersion: string;
    Library: string;
    LicenseType: string;
    Proxy: string;
    Implementation: string;
    SwarmSource: string;
  }>;
}

interface EtherscanBytecodeResponse {
  status: string;
  message: string;
  result: string; // The bytecode as a hex string
}

class AuditorService {
  private publicClient: any;
  private walletClient: any;
  private auditorContract: Address;
  private account: any;
  private currentAuditorAddress: string | null = null;
  private isRestarting: boolean = false;
  private debugMode: boolean = false;
  private anthropic: Anthropic;

  constructor() {
    // Check for debug mode
    this.debugMode = process.env.DEBUG === "true" || process.env.DEBUG === "1";

    if (this.debugMode) {
      console.log("🐛 DEBUG MODE ENABLED\n");
    }

    // Load deployment info
    const deploymentInfo = this.loadDeploymentInfo();
    this.auditorContract = deploymentInfo.auditorAddress as Address;

    // Setup blockchain clients
    const chain = foundry; // Change to arbitrum for production
    const rpcUrl = process.env.RPC_URL || "http://localhost:8545";

    this.publicClient = createPublicClient({
      chain,
      transport: http(rpcUrl),
    });

    // Setup wallet for auditor - MUST be set in environment
    const privateKey = process.env.AUDITORPRIVATEKEY;

    if (!privateKey) {
      console.error("\n❌ Error: AUDITORPRIVATEKEY not set in environment");
      console.log("\n💡 Please set the auditor's private key:");
      console.log("   export AUDITORPRIVATEKEY=0x...");
      console.log("\n   Or add it to your .env file:");
      console.log("   AUDITORPRIVATEKEY=0x...");
      console.log(
        "\n   The auditor address should match the one used in deployment:"
      );
      console.log("   Default: 0x3FB7c3260e8Dcd7F8019c814799049648C5c0116\n");
      process.exit(1);
    }

    this.account = privateKeyToAccount(privateKey as `0x${string}`);

    this.walletClient = createWalletClient({
      account: this.account,
      chain,
      transport: http(rpcUrl),
    });

    // Initialize Anthropic client
    if (!ANTHROPIC_API_KEY) {
      console.error("\n❌ Error: ANTHROPIC_API_KEY not set in environment");
      console.log("\n💡 Please set your Anthropic API key:");
      console.log("   export ANTHROPIC_API_KEY=sk-ant-...");
      console.log("\n   Or add it to your .env file:");
      console.log("   ANTHROPIC_API_KEY=sk-ant-...\n");
      process.exit(1);
    }

    this.anthropic = new Anthropic({
      apiKey: ANTHROPIC_API_KEY,
    });

    console.log("🔍 Auditor Service Initialized");
    console.log("📋 Auditor Contract:", this.auditorContract);
    console.log("👤 Auditor Address:", this.account.address);
    console.log("🔗 RPC URL:", rpcUrl);
    console.log(
      "🔑 Etherscan API Key:",
      ETHERSCAN_API_KEY ? "✓ Set" : "✗ Not Set"
    );
    console.log(
      "🤖 Anthropic API Key:",
      ANTHROPIC_API_KEY ? "✓ Set" : "✗ Not Set"
    );
  }

  private debugLog(message: string, data?: any): void {
    if (this.debugMode) {
      const timestamp = new Date().toISOString().split("T")[1].split(".")[0];
      if (data !== undefined) {
        console.log(
          `🐛 [${timestamp}] ${message}:`,
          JSON.stringify(data, null, 2)
        );
      } else {
        console.log(`🐛 [${timestamp}] ${message}`);
      }
    }
  }

  private loadDeploymentInfo(): { auditorAddress: string } {
    try {
      // Try to read from environment variable first
      if (process.env.AUDITOR_CONTRACT_ADDRESS) {
        return {
          auditorAddress: process.env.AUDITOR_CONTRACT_ADDRESS,
        };
      }

      // Otherwise, read from broadcast JSON
      const broadcastData = JSON.parse(
        fs.readFileSync(BROADCAST_PATH, "utf-8")
      );

      // Find the Auditor contract in the transactions
      let auditorAddress: string | null = null;

      for (const tx of broadcastData.transactions) {
        if (tx.contractName === "Auditor" && tx.contractAddress) {
          auditorAddress = tx.contractAddress;
          break;
        }
      }

      if (!auditorAddress) {
        throw new Error("Auditor contract not found in broadcast data");
      }

      return {
        auditorAddress,
      };
    } catch (error: any) {
      console.error("Error loading deployment info:", error.message);
      console.log("\n💡 Make sure contracts are deployed:");
      console.log("   yarn deploy");
      console.log("\n💡 Or set AUDITOR_CONTRACT_ADDRESS in your .env file");
      throw error;
    }
  }

  async start() {
    console.log("\n🚀 Starting Auditor Service...");
    console.log(`⏰ Polling every ${POLL_INTERVAL}ms\n`);

    // Initialize current address
    this.currentAuditorAddress = this.auditorContract.toLowerCase();

    // Start polling loop
    while (true) {
      try {
        // Check for contract changes
        await this.checkForContractChanges();

        // Skip polling if we're restarting
        if (!this.isRestarting) {
          await this.pollAudits();
        }
      } catch (error: any) {
        console.error("❌ Error in polling loop:", error.message);
      }

      // Wait before next poll
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL));
    }
  }

  /**
   * Check if Auditor contract has been redeployed
   */
  private async checkForContractChanges(): Promise<void> {
    try {
      // Read the latest broadcast file
      const broadcastData = JSON.parse(
        fs.readFileSync(BROADCAST_PATH, "utf-8")
      );

      // Find the Auditor contract in the transactions
      let newAuditorAddress: string | null = null;

      for (const tx of broadcastData.transactions) {
        if (tx.contractName === "Auditor" && tx.contractAddress) {
          newAuditorAddress = tx.contractAddress.toLowerCase();
          break;
        }
      }

      if (!newAuditorAddress) {
        return; // No Auditor contract found, skip check
      }

      // If this is the first check, just store the address
      if (this.currentAuditorAddress === null) {
        this.currentAuditorAddress = newAuditorAddress;
        return;
      }

      // Check if address has changed
      if (newAuditorAddress !== this.currentAuditorAddress) {
        console.log("\n🔄 Auditor contract change detected!");
        console.log(`   Old: ${this.currentAuditorAddress}`);
        console.log(`   New: ${newAuditorAddress}`);
        console.log("   Restarting auditor service...\n");

        await this.restartWithNewContract(newAuditorAddress);
      }
    } catch (error: any) {
      // Silently fail if broadcast file doesn't exist or can't be read
      // This is normal during development
    }
  }

  /**
   * Restart the auditor service with a new contract address
   */
  private async restartWithNewContract(
    newAuditorAddress: string
  ): Promise<void> {
    try {
      this.isRestarting = true;

      // Update contract address
      this.auditorContract = newAuditorAddress as Address;
      this.currentAuditorAddress = newAuditorAddress;

      // Reset processing index to start from scratch with new contract
      lastProcessedIndex = -1;

      console.log("✅ Auditor service restarted successfully");
      console.log(`📋 New Auditor Contract: ${this.auditorContract}\n`);

      this.isRestarting = false;
    } catch (error: any) {
      console.error("❌ Error restarting auditor service:", error.message);
      this.isRestarting = false;
      throw error;
    }
  }

  private async pollAudits() {
    try {
      this.debugLog("Polling for new audit requests...");

      // Get total audit request count
      const count = (await this.publicClient.readContract({
        address: this.auditorContract,
        abi: auditorAbi,
        functionName: "getAuditRequestCount",
      })) as bigint;

      const totalCount = Number(count);

      this.debugLog(`Total audit request count: ${totalCount}`);
      this.debugLog(`Last processed index: ${lastProcessedIndex}`);

      // Process any new requests
      if (totalCount > lastProcessedIndex + 1) {
        const newRequestCount = totalCount - lastProcessedIndex - 1;
        console.log(`\n📨 Found ${newRequestCount} new audit request(s)`);
        this.debugLog(
          `Processing requests from ${lastProcessedIndex + 1} to ${
            totalCount - 1
          }`
        );

        for (let i = lastProcessedIndex + 1; i < totalCount; i++) {
          await this.processAuditRequest(i);
        }

        lastProcessedIndex = totalCount - 1;
        this.debugLog(`Updated last processed index to: ${lastProcessedIndex}`);
      } else {
        this.debugLog("No new audit requests found");
      }
    } catch (error: any) {
      console.error("Error polling audits:", error.message);
      this.debugLog("Poll error details", error);
    }
  }

  /**
   * Load chapter definition file
   */
  private loadChapterDefinition(chapterNumber: number): string | null {
    try {
      const definitionPath = path.join(
        __dirname,
        "definitions",
        `chapter${chapterNumber}Definition.txt`
      );

      this.debugLog(`Loading chapter definition from: ${definitionPath}`);

      if (!fs.existsSync(definitionPath)) {
        this.debugLog(`Chapter definition file not found: ${definitionPath}`);
        return null;
      }

      const definition = fs.readFileSync(definitionPath, "utf-8");
      this.debugLog(
        `Loaded chapter ${chapterNumber} definition (${definition.length} chars)`
      );

      return definition;
    } catch (error: any) {
      console.error(
        `Error loading chapter ${chapterNumber} definition:`,
        error.message
      );
      this.debugLog("Chapter definition load error", error);
      return null;
    }
  }

  /**
   * Audit contract source code using Claude AI
   */
  private async auditWithClaude(
    sourceCode: string,
    chapterDefinition: string
  ): Promise<{ passed: boolean; reason: string }> {
    try {
      this.debugLog("Starting Claude AI audit...");

      const prompt = `You are a smart contract auditor for the Max Extract game. Your job is to review a Solidity contract and determine if it meets the requirements defined in the chapter definition.

CHAPTER DEFINITION:
${chapterDefinition}

CONTRACT SOURCE CODE:
${sourceCode}

INSTRUCTIONS:
1. Carefully analyze the contract source code
2. Check if it meets ALL requirements in the chapter definition
3. Be STRICT about the requirements
4. Respond with a JSON object containing your verdict

Respond ONLY with valid JSON in this exact format (no markdown, no code blocks, just the JSON):
{
  "verdict": "PASS" or "FAIL",
  "reason": "A clear, concise explanation (max 200 characters)"
}`;

      this.debugLog("Sending request to Claude API...");

      const message = await this.anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
      });

      this.debugLog("Received response from Claude API", {
        id: message.id,
        model: message.model,
        stopReason: message.stop_reason,
      });

      // Extract text from response
      const responseText =
        message.content[0].type === "text" ? message.content[0].text : "";

      this.debugLog("Claude response text", responseText);

      // Parse JSON response
      let jsonResponse: { verdict: string; reason: string };

      try {
        // Try to extract JSON from response (in case Claude wraps it in markdown)
        let jsonText = responseText.trim();

        // Remove markdown code blocks if present
        if (jsonText.startsWith("```")) {
          const match = jsonText.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
          if (match) {
            jsonText = match[1];
          }
        }

        jsonResponse = JSON.parse(jsonText);
      } catch (parseError: any) {
        console.error("❌ Could not parse Claude JSON response");
        this.debugLog("JSON parse error", {
          error: parseError.message,
          responseText: responseText.substring(0, 500),
        });
        return {
          passed: false,
          reason: "AI audit failed: Could not parse response",
        };
      }

      const verdict = jsonResponse.verdict?.toUpperCase();
      let reason = jsonResponse.reason || "No reason provided";

      if (verdict !== "PASS" && verdict !== "FAIL") {
        console.error("❌ Invalid verdict in response:", verdict);
        this.debugLog("Invalid verdict", jsonResponse);
        return {
          passed: false,
          reason: "AI audit failed: Invalid verdict format",
        };
      }

      // Truncate reason to 200 characters for on-chain storage
      if (reason.length > 200) {
        reason = reason.substring(0, 197) + "...";
      }

      console.log(`\n   🤖 Claude AI Verdict: ${verdict}`);
      console.log(`   💭 Reason: ${reason}`);

      return {
        passed: verdict === "PASS",
        reason: reason,
      };
    } catch (error: any) {
      console.error("Error in Claude AI audit:", error.message);
      this.debugLog("Claude audit error", error);
      return {
        passed: false,
        reason: `AI audit error: ${error.message.substring(0, 150)}`,
      };
    }
  }

  private async processAuditRequest(requestId: number) {
    console.log(`\n🔍 Processing Audit Request #${requestId}`);
    this.debugLog(`Starting audit process for request #${requestId}`);

    try {
      this.debugLog(
        `Calling getAuditRequest(${requestId}) on contract ${this.auditorContract}`
      );

      // Get the audit request details (returns tuple as object with named properties)
      const response = (await this.publicClient.readContract({
        address: this.auditorContract,
        abi: auditorAbi,
        functionName: "getAuditRequest",
        args: [BigInt(requestId)],
      })) as {
        contractAddress: Address;
        requester: Address;
        chapterNumber: number;
        blockExplorerUrl: string;
        timestamp: bigint;
        status: number;
        failureReason: string;
      };

      this.debugLog("Raw response from contract", response);

      const request: AuditRequest = {
        contractAddress: response.contractAddress,
        requester: response.requester,
        chapterNumber: response.chapterNumber,
        blockExplorerUrl: response.blockExplorerUrl,
        timestamp: response.timestamp,
        status: response.status,
        failureReason: response.failureReason,
      };

      this.debugLog("Parsed audit request", request);

      console.log(`   Contract: ${request.contractAddress}`);
      console.log(`   Requester: ${request.requester}`);
      console.log(`   Chapter: ${request.chapterNumber}`);
      console.log(
        `   Status: ${
          request.status === 0
            ? "Pending"
            : request.status === 1
            ? "Audited"
            : "Failed"
        }`
      );

      // Skip if not pending
      if (request.status !== 0) {
        console.log(`   ⏭️  Skipping (already processed)`);
        this.debugLog(
          `Request #${requestId} already processed, status: ${request.status}`
        );
        return;
      }

      // Check if chapter is visible
      console.log(
        `   🔍 Checking if Chapter ${request.chapterNumber} is visible...`
      );
      this.debugLog(`Getting game contract address from auditor contract`);

      const gameContractAddress = (await this.publicClient.readContract({
        address: this.auditorContract,
        abi: auditorAbi,
        functionName: "gameContract",
      })) as Address;

      this.debugLog(`Game contract address: ${gameContractAddress}`);

      const visibleChapters = (await this.publicClient.readContract({
        address: gameContractAddress,
        abi: gameAbi,
        functionName: "getVisibleChapters",
      })) as number[];

      this.debugLog(`Visible chapters: ${visibleChapters}`);

      const isChapterVisible = visibleChapters.includes(request.chapterNumber);

      if (!isChapterVisible) {
        console.log(
          `   ❌ Chapter ${request.chapterNumber} is not yet visible`
        );
        console.log(
          `   Visible chapters: ${visibleChapters.join(", ") || "none"}`
        );
        await this.markAsFailed(requestId, "This chapter is not yet visible");
        return;
      }

      console.log(`   ✓ Chapter ${request.chapterNumber} is visible`);

      this.debugLog(
        `Fetching bytecode for contract ${request.contractAddress}`
      );

      // Get contract bytecode from blockchain
      const bytecode = await this.publicClient.getBytecode({
        address: request.contractAddress,
      });

      this.debugLog(
        `Bytecode result: ${
          bytecode ? `${bytecode.length} bytes` : "null or empty"
        }`
      );

      if (!bytecode || bytecode === "0x") {
        console.log(`   ❌ No bytecode found at address`);
        this.debugLog("No bytecode - marking as failed");
        await this.markAsFailed(requestId, "No bytecode found at address");
        return;
      }

      console.log(`   ✓ Bytecode found on chain (${bytecode.length} bytes)`);

      // Check if contract is already audited for this specific chapter
      this.debugLog(
        `Checking if contract is already audited for chapter ${request.chapterNumber}...`
      );
      const auditedChapter = (await this.publicClient.readContract({
        address: this.auditorContract,
        abi: auditorAbi,
        functionName: "isAudited",
        args: [request.contractAddress],
      })) as number;

      this.debugLog(`Contract audited chapter: ${auditedChapter}`);

      if (auditedChapter === request.chapterNumber) {
        console.log(
          `   ✓ Contract already successfully audited for Chapter ${request.chapterNumber} - skipping audit process`
        );
        this.debugLog(
          "Contract already audited for this chapter on-chain, not re-auditing"
        );
        return;
      } else if (auditedChapter > 0) {
        console.log(
          `   ℹ️  Contract was previously audited for Chapter ${auditedChapter}, now auditing for Chapter ${request.chapterNumber}`
        );
      }

      // Load chapter definition
      console.log(
        `   📖 Loading Chapter ${request.chapterNumber} definition...`
      );
      const chapterDefinition = this.loadChapterDefinition(
        request.chapterNumber
      );

      if (!chapterDefinition) {
        console.log(
          `   ❌ Unknown chapter ${request.chapterNumber} - no definition found`
        );
        await this.markAsFailed(
          requestId,
          `Unknown chapter ${request.chapterNumber}`
        );
        return;
      }

      console.log(`   ✓ Chapter definition loaded`);

      // Parse the block explorer URL to extract the contract address for verification
      // The URL format is like: https://arbiscan.io/address/0x.../code
      const chainId = await this.publicClient.getChainId();
      this.debugLog(`Chain ID: ${chainId}`);

      let addressToVerify = request.contractAddress;

      console.log(`\n   🔗 Block Explorer URL Processing:`);
      console.log(`   Original Contract Address: ${request.contractAddress}`);
      console.log(
        `   Block Explorer URL: ${request.blockExplorerUrl || "(not provided)"}`
      );

      // If a custom URL is provided, extract the address from it
      if (
        request.blockExplorerUrl &&
        request.blockExplorerUrl.includes("/address/")
      ) {
        const urlMatch = request.blockExplorerUrl.match(
          /\/address\/(0x[a-fA-F0-9]+)/
        );
        if (urlMatch) {
          addressToVerify = urlMatch[1] as Address;
          this.debugLog(`Extracted address from URL: ${addressToVerify}`);
          console.log(`   ✓ Extracted address from URL: ${addressToVerify}`);
          if (
            addressToVerify.toLowerCase() !==
            request.contractAddress.toLowerCase()
          ) {
            console.log(
              `   ⚠️  WARNING: Extracted address differs from contract address!`
            );
          }
        } else {
          console.log(
            `   ⚠️  Could not extract address from URL (using contract address)`
          );
        }
      } else {
        console.log(
          `   ✓ Using contract address for verification (no custom URL)`
        );
      }

      this.debugLog(
        `Fetching source code from Etherscan for ${addressToVerify}`
      );

      // Fetch source code from Etherscan
      const sourceCodeData = await this.fetchSourceCodeFromEtherscan(
        addressToVerify
      );

      this.debugLog(
        "Etherscan response",
        sourceCodeData
          ? {
              ContractName: sourceCodeData.ContractName,
              CompilerVersion: sourceCodeData.CompilerVersion,
              SourceCodeLength: sourceCodeData.SourceCode?.length || 0,
            }
          : null
      );

      if (!sourceCodeData) {
        console.log(`   ❌ Source code not verified on block explorer`);
        this.debugLog("No source code data from Etherscan - marking as failed");
        await this.markAsFailed(
          requestId,
          "Source code not verified on block explorer"
        );
        return;
      }

      console.log(`   ✓ Source code found on Etherscan`);
      console.log(`   Contract Name: ${sourceCodeData.ContractName}`);
      console.log(`   Compiler: ${sourceCodeData.CompilerVersion}`);

      if (
        !sourceCodeData.SourceCode ||
        sourceCodeData.SourceCode.length === 0
      ) {
        console.log(`   ❌ Audit FAILED - Source code empty`);
        this.debugLog("Source code is empty or null - marking as failed");
        await this.markAsFailed(requestId, "Source code is empty");
        return;
      }

      // Compare local bytecode with Etherscan bytecode
      console.log(`\n   🔍 Verifying bytecode match...`);

      // Get local bytecode for the contract being audited
      const localBytecode = await this.publicClient.getBytecode({
        address: request.contractAddress,
      });

      // Determine which chain to fetch from based on block explorer URL
      const chainInfo = this.getChainFromExplorerUrl(
        request.blockExplorerUrl || ""
      );

      if (!chainInfo) {
        console.log(
          `   ❌ Could not determine chain from block explorer URL: ${request.blockExplorerUrl}`
        );
        await this.markAsFailed(
          requestId,
          "Invalid block explorer URL - could not determine chain"
        );
        return;
      }

      console.log(
        `   📡 Fetching bytecode from ${chainInfo.chainName} RPC for ${addressToVerify}...`
      );

      // Fetch bytecode directly from the chain's RPC
      const remoteBytecode = await this.fetchBytecodeFromChain(
        addressToVerify,
        chainInfo
      );

      if (!remoteBytecode) {
        console.log(
          `   ⚠️  Could not fetch bytecode from ${chainInfo.chainName} RPC`
        );
        console.log(`   💡 Check that:`);
        console.log(
          `      - The address exists on ${chainInfo.chainName} (chainId ${chainInfo.chainId})`
        );
        console.log(`      - The block explorer URL is correct`);
        console.log(`      - The RPC endpoint is accessible`);
        console.log(`   💡 Run with DEBUG=true to see RPC call details`);
      }

      this.debugLog("Bytecode comparison", {
        localLength: localBytecode?.length || 0,
        remoteLength: remoteBytecode?.length || 0,
        addressesMatch:
          request.contractAddress.toLowerCase() ===
          addressToVerify.toLowerCase(),
      });

      // Output detailed bytecode information for inspection
      console.log(`\n   📊 BYTECODE COMPARISON DETAILS:`);
      console.log(`   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(
        `   Local Contract (being audited): ${request.contractAddress}`
      );
      console.log(
        `   ${chainInfo.chainName} Contract (verified):  ${addressToVerify}`
      );
      console.log(`   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

      if (localBytecode) {
        console.log(`\n   📍 LOCAL BYTECODE (${request.contractAddress}):`);
        console.log(`   Length: ${localBytecode.length} characters`);
        console.log(`   First 200 chars: ${localBytecode.substring(0, 200)}`);
        console.log(
          `   Last 200 chars:  ${localBytecode.substring(
            Math.max(0, localBytecode.length - 200)
          )}`
        );
      } else {
        console.log(`\n   📍 LOCAL BYTECODE: NULL or EMPTY`);
      }

      if (remoteBytecode) {
        console.log(
          `\n   📍 ${chainInfo.chainName.toUpperCase()} BYTECODE (${addressToVerify}):`
        );
        console.log(`   Length: ${remoteBytecode.length} characters`);
        console.log(`   First 200 chars: ${remoteBytecode.substring(0, 200)}`);
        console.log(
          `   Last 200 chars:  ${remoteBytecode.substring(
            Math.max(0, remoteBytecode.length - 200)
          )}`
        );
      } else {
        console.log(
          `\n   📍 ${chainInfo.chainName.toUpperCase()} BYTECODE: NULL or EMPTY`
        );
      }

      console.log(
        `\n   🔎 Bytecode Match: ${
          localBytecode === remoteBytecode ? "✅ YES" : "❌ NO"
        }`
      );
      if (localBytecode && remoteBytecode && localBytecode !== remoteBytecode) {
        console.log(
          `   📏 Length difference: ${Math.abs(
            (localBytecode?.length || 0) - (remoteBytecode?.length || 0)
          )} characters`
        );
      }
      console.log(`   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

      // Check that we have both bytecodes
      if (!localBytecode || localBytecode === "0x") {
        console.log(`   ❌ No bytecode found at local address`);
        await this.markAsFailed(
          requestId,
          "No bytecode found at local contract address"
        );
        return;
      }

      if (!remoteBytecode || remoteBytecode === "0x") {
        console.log(
          `   ❌ No bytecode found on ${chainInfo.chainName} for verified address`
        );
        await this.markAsFailed(
          requestId,
          `No bytecode found on ${chainInfo.chainName} for verification address`
        );
        return;
      }

      // Verify bytecode match
      if (localBytecode !== remoteBytecode) {
        console.log(
          `   ❌ Bytecode mismatch between local contract and ${chainInfo.chainName} verified contract`
        );
        console.log(`   Local:           ${request.contractAddress}`);
        console.log(`   ${chainInfo.chainName}: ${addressToVerify}`);
        this.debugLog("Bytecode mismatch detected");
        await this.markAsFailed(
          requestId,
          `Bytecode mismatch: Local contract does not match verified source on ${chainInfo.chainName}`
        );
        return;
      }

      console.log(
        `   ✅ Bytecode verification passed - Local matches ${chainInfo.chainName}!`
      );
      console.log(`   Bytecode length: ${localBytecode.length} characters`);

      // Show source code info
      console.log(`\n   📄 Source Code Info:`);
      console.log(`   Length: ${sourceCodeData.SourceCode.length} characters`);
      console.log(
        `   Lines: ${sourceCodeData.SourceCode.split("\n").length} lines`
      );

      // Show a preview of the source code
      const sourcePreview =
        sourceCodeData.SourceCode.length > 500
          ? sourceCodeData.SourceCode.substring(0, 500) + "..."
          : sourceCodeData.SourceCode;
      console.log(`\n   📄 Source Code Preview:`);
      console.log(`   ${sourcePreview.split("\n").slice(0, 10).join("\n   ")}`);
      if (sourceCodeData.SourceCode.split("\n").length > 10) {
        console.log(
          `   ... (${sourceCodeData.SourceCode.split("\n").length} total lines)`
        );
      }

      // Audit with Claude AI
      console.log(`\n   🤖 Starting AI-powered contract audit...`);
      const auditResult = await this.auditWithClaude(
        sourceCodeData.SourceCode,
        chapterDefinition
      );

      if (auditResult.passed) {
        console.log(`\n   ✅ Audit PASSED`);
        this.debugLog("AI audit passed - marking as audited");
        await this.markAsAudited(requestId);
      } else {
        console.log(`\n   ❌ Audit FAILED`);
        console.log(`   Reason: ${auditResult.reason}`);
        this.debugLog("AI audit failed - marking as failed");
        await this.markAsFailed(requestId, auditResult.reason);
      }
    } catch (error: any) {
      console.error(`   ❌ Error processing audit request:`, error.message);
      this.debugLog("Error during audit processing", {
        message: error.message,
        stack: error.stack,
        cause: error.cause,
      });

      // Truncate error message to avoid gas issues (max 100 chars)
      const errorMsg = error.message || "Unknown error";
      const truncatedError =
        errorMsg.length > 100 ? errorMsg.substring(0, 97) + "..." : errorMsg;

      this.debugLog(`Truncated error for contract: "${truncatedError}"`);

      try {
        await this.markAsFailed(requestId, truncatedError);
      } catch (markError: any) {
        console.error(
          `   ⚠️  Failed to mark audit as failed:`,
          markError.message
        );
        this.debugLog("Error marking as failed", markError);
        // Don't throw - we want to continue processing other audits
      }
    }
  }

  /**
   * Determine chain info from block explorer URL
   */
  private getChainFromExplorerUrl(url: string): {
    chainId: number;
    chainName: string;
    rpcUrl: string;
  } | null {
    if (url.includes("arbiscan.io")) {
      return {
        chainId: 42161,
        chainName: "Arbitrum One",
        rpcUrl: "https://arb1.arbitrum.io/rpc",
      };
    } else if (url.includes("etherscan.io")) {
      return {
        chainId: 1,
        chainName: "Ethereum Mainnet",
        rpcUrl: "https://eth.llamarpc.com",
      };
    } else if (url.includes("optimistic.etherscan.io")) {
      return {
        chainId: 10,
        chainName: "Optimism",
        rpcUrl: "https://mainnet.optimism.io",
      };
    } else if (url.includes("basescan.org")) {
      return {
        chainId: 8453,
        chainName: "Base",
        rpcUrl: "https://mainnet.base.org",
      };
    }
    return null;
  }

  /**
   * Fetch bytecode directly from a chain's RPC
   */
  private async fetchBytecodeFromChain(
    contractAddress: Address,
    chainInfo: { chainId: number; chainName: string; rpcUrl: string }
  ): Promise<string | null> {
    try {
      this.debugLog(
        `Fetching bytecode from ${chainInfo.chainName} RPC: ${chainInfo.rpcUrl}`
      );

      // Create a public client for the target chain
      const targetChainClient = createPublicClient({
        chain: {
          id: chainInfo.chainId,
          name: chainInfo.chainName,
          network: chainInfo.chainName.toLowerCase().replace(/\s+/g, "-"),
          nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
          rpcUrls: {
            default: { http: [chainInfo.rpcUrl] },
            public: { http: [chainInfo.rpcUrl] },
          },
        },
        transport: http(chainInfo.rpcUrl),
      });

      // Get bytecode from the chain
      const bytecode = await targetChainClient.getBytecode({
        address: contractAddress,
      });

      if (!bytecode || bytecode === "0x") {
        console.error(
          `   ❌ No bytecode at address ${contractAddress} on ${chainInfo.chainName}`
        );
        return null;
      }

      console.log(
        `   ✓ Fetched bytecode from ${chainInfo.chainName} RPC (${bytecode.length} characters)`
      );
      this.debugLog(`Bytecode from ${chainInfo.chainName}`, {
        length: bytecode.length,
      });

      return bytecode;
    } catch (error: any) {
      console.error(
        `   ❌ Error fetching bytecode from ${chainInfo.chainName} RPC:`,
        error.message
      );
      this.debugLog("Chain RPC bytecode fetch error", error);
      return null;
    }
  }

  private async fetchSourceCodeFromEtherscan(
    contractAddress: Address
  ): Promise<any | null> {
    try {
      // Use Etherscan API to get source code
      const url = `${ETHERSCAN_API_BASE}?chainid=42161&module=contract&action=getsourcecode&address=${contractAddress}&apikey=${ETHERSCAN_API_KEY}`;

      this.debugLog(
        `Fetching from Etherscan URL: ${url.replace(
          ETHERSCAN_API_KEY,
          "***API_KEY***"
        )}`
      );

      const response = await fetch(url);

      // Check if response is actually JSON
      const contentType = response.headers.get("content-type");
      this.debugLog(`Response content-type: ${contentType}`);

      if (!contentType || !contentType.includes("application/json")) {
        const text = await response.text();
        this.debugLog(
          "Non-JSON response from Etherscan (first 200 chars)",
          text.substring(0, 200)
        );
        console.error(
          `   Error: Etherscan returned non-JSON response (${contentType})`
        );
        if (!ETHERSCAN_API_KEY) {
          console.error(`   💡 Tip: Set ETHERSCAN_API_KEY in your .env file`);
        }
        return null;
      }

      const data: EtherscanSourceCodeResponse = await response.json();

      this.debugLog("Etherscan API response", {
        status: data.status,
        message: data.message,
        resultCount: data.result?.length || 0,
      });

      if (data.status === "1" && data.result && data.result.length > 0) {
        this.debugLog("Etherscan verification found", {
          contractName: data.result[0].ContractName,
          compilerVersion: data.result[0].CompilerVersion,
          hasSourceCode: !!data.result[0].SourceCode,
        });
        return data.result[0];
      }

      this.debugLog("No verification data from Etherscan");
      return null;
    } catch (error: any) {
      console.error(`   Error fetching from Etherscan:`, error.message);
      this.debugLog("Etherscan fetch error", error);
      return null;
    }
  }

  private async markAsAudited(requestId: number) {
    try {
      this.debugLog(`Calling markAudited(${requestId})`);

      const hash = await this.walletClient.writeContract({
        address: this.auditorContract,
        abi: auditorAbi,
        functionName: "markAudited",
        args: [BigInt(requestId)],
      });

      console.log(`   📝 Marked as audited (tx: ${hash})`);
      this.debugLog(`Transaction hash: ${hash}`);

      // Wait for transaction confirmation
      this.debugLog("Waiting for transaction receipt...");
      const receipt = await this.publicClient.waitForTransactionReceipt({
        hash,
      });
      console.log(`   ✓ Transaction confirmed`);
      this.debugLog("Transaction receipt", {
        blockNumber: receipt.blockNumber,
        status: receipt.status,
        gasUsed: receipt.gasUsed?.toString(),
      });
    } catch (error: any) {
      console.error(`   Error marking as audited:`, error.message);
      this.debugLog("markAsAudited error", error);
      throw error;
    }
  }

  private async markAsFailed(requestId: number, reason: string) {
    try {
      this.debugLog(`Calling markFailed(${requestId}, "${reason}")`);

      const hash = await this.walletClient.writeContract({
        address: this.auditorContract,
        abi: auditorAbi,
        functionName: "markFailed",
        args: [BigInt(requestId), reason],
      });

      console.log(`   📝 Marked as failed (tx: ${hash})`);
      this.debugLog(`Transaction hash: ${hash}`);

      // Wait for transaction confirmation
      this.debugLog("Waiting for transaction receipt...");
      const receipt = await this.publicClient.waitForTransactionReceipt({
        hash,
      });
      console.log(`   ✓ Transaction confirmed`);
      this.debugLog("Transaction receipt", {
        blockNumber: receipt.blockNumber,
        status: receipt.status,
        gasUsed: receipt.gasUsed?.toString(),
      });
    } catch (error: any) {
      console.error(`   Error marking as failed:`, error.message);
      this.debugLog("markAsFailed error", error);
      throw error;
    }
  }
}

// Main execution
async function main() {
  try {
    const auditor = new AuditorService();
    await auditor.start();
  } catch (error: any) {
    console.error("Fatal error:", error.message);
    process.exit(1);
  }
}

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("\n\n🛑 Shutting down Auditor Service...");
  process.exit(0);
});

main().catch(console.error);
