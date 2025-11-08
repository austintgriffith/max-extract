import { createPublicClient, createWalletClient, http, Address } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { foundry, arbitrum } from "viem/chains";
import Anthropic from "@anthropic-ai/sdk";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";

// Load environment variables from packages/scripts/.env
dotenv.config({ path: path.join(__dirname, ".env") });

// Etherscan API configuration
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY || "";
const ETHERSCAN_API_BASE = "https://api.etherscan.io/v2/api";

// Anthropic API configuration
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || "";

// API configuration
const CONTRACTS_API_URL =
  process.env.LOAD_CONTRACTS_FROM || "http://localhost:3000/api/contracts.json";

const POLL_INTERVAL = 2000;

// Debug auto-audit configuration
// Set to a chapter number to auto-accept all audits for that chapter (bypasses all checks)
// Set to 0 to disable auto-audit
const DEBUG_AUTO_AUDIT_CHAPTER = 4;

// Track processed audit requests
let lastProcessedIndex = -1;

// Auditor contract ABI (only the functions we need) - using raw ABI format
const auditorAbi = [
  {
    inputs: [],
    name: "AUDITOR_ADDRESS",
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
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
  private auditorContract!: Address; // Initialized in start() method
  private account: any;
  private currentAuditorAddress: string | null = null;
  private isRestarting: boolean = false;
  private debugMode: boolean = false;
  private skipBytecodeVerification: boolean = false;
  private anthropic: Anthropic;

  constructor() {
    // Check for debug mode
    this.debugMode = process.env.DEBUG === "true" || process.env.DEBUG === "1";

    // Check if bytecode verification should be skipped
    this.skipBytecodeVerification =
      process.env.SKIP_BYTECODE_VERIFICATION === "true" ||
      process.env.SKIP_BYTECODE_VERIFICATION === "1";

    if (this.debugMode) {
      console.log("🐛 DEBUG MODE ENABLED\n");
    }

    if (this.skipBytecodeVerification) {
      console.log("⚠️  BYTECODE VERIFICATION DISABLED");
      console.log("   Only source code will be verified by AI\n");
    }

    if (DEBUG_AUTO_AUDIT_CHAPTER > 0) {
      console.log("🚨 DEBUG AUTO-AUDIT ENABLED");
      console.log(
        `   Chapter ${DEBUG_AUTO_AUDIT_CHAPTER} audits will be AUTO-ACCEPTED`
      );
      console.log("   ⚠️  WARNING: All audit checks will be bypassed!\n");
    }

    // Setup blockchain clients - use environment configuration
    const chainId = process.env.CHAINID ? parseInt(process.env.CHAINID) : 31337;
    const rpcUrl =
      process.env.RPC || process.env.RPC_URL || "http://localhost:8545";

    // Determine chain based on chainId
    let chain;
    if (chainId === 42161) {
      chain = arbitrum;
    } else {
      chain = foundry;
    }

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
    console.log("👤 Auditor Address:", this.account.address);
    console.log("⛓️  Chain ID:", chainId);
    console.log("🌐 Chain Name:", chain.name);
    console.log("🔗 RPC URL:", rpcUrl);
    console.log("📡 Contracts API:", CONTRACTS_API_URL);
    console.log(
      "🔑 Etherscan API Key:",
      ETHERSCAN_API_KEY ? "✓ Set" : "✗ Not Set"
    );

    // Show masked API key to verify it's loaded correctly
    if (ANTHROPIC_API_KEY) {
      const maskedKey =
        ANTHROPIC_API_KEY.substring(0, 12) +
        "..." +
        ANTHROPIC_API_KEY.substring(ANTHROPIC_API_KEY.length - 4);
      console.log("🤖 Anthropic API Key:", maskedKey);
    } else {
      console.log("🤖 Anthropic API Key: ✗ Not Set");
    }
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

  /**
   * Fetch Auditor contract address from API
   */
  private async fetchAuditorAddressFromAPI(): Promise<string | null> {
    try {
      this.debugLog(`Fetching contracts from API: ${CONTRACTS_API_URL}`);

      const response = await fetch(CONTRACTS_API_URL);
      const data = await response.json();

      if (!data.success || !data.data) {
        throw new Error("Invalid API response format");
      }

      const chainId = this.publicClient.chain?.id || 31337;
      const chainData = data.data[chainId.toString()];

      if (!chainData || !chainData.contracts) {
        throw new Error(`No contracts found for chain ${chainId}`);
      }

      // Find Auditor contract
      const auditorContract = chainData.contracts.find(
        (c: any) => c.name === "Auditor"
      );

      if (!auditorContract) {
        throw new Error("Auditor contract not found in API response");
      }

      this.debugLog(
        `Found Auditor address from API: ${auditorContract.address}`
      );

      return auditorContract.address;
    } catch (error: any) {
      console.error(
        `❌ Failed to fetch Auditor address from API: ${error.message}`
      );
      this.debugLog("API fetch error details:", error);
      return null;
    }
  }

  async start() {
    console.log("\n🚀 Starting Auditor Service...");
    console.log(`⏰ Polling every ${POLL_INTERVAL}ms\n`);

    // Load Auditor contract address
    if (process.env.AUDITOR_CONTRACT_ADDRESS) {
      this.auditorContract = process.env.AUDITOR_CONTRACT_ADDRESS as Address;
      console.log("📋 Auditor Contract (from env):", this.auditorContract);
    } else {
      console.log("🔍 Fetching Auditor contract address from API...");
      const auditorAddress = await this.fetchAuditorAddressFromAPI();

      if (!auditorAddress) {
        console.error("\n❌ Error: Could not load Auditor contract address");
        console.log("\n💡 Please either:");
        console.log("   1. Set AUDITOR_CONTRACT_ADDRESS in your .env file");
        console.log(
          `   2. Ensure ${CONTRACTS_API_URL} is accessible and contains the Auditor contract`
        );
        process.exit(1);
      }

      this.auditorContract = auditorAddress as Address;
      console.log("📋 Auditor Contract (from API):", this.auditorContract);
    }

    // Initialize current address
    this.currentAuditorAddress = this.auditorContract.toLowerCase();

    // Verify that our private key matches the contract's AUDITOR_ADDRESS
    console.log("\n🔐 Verifying auditor address...");
    try {
      const contractAuditorAddress = (await this.publicClient.readContract({
        address: this.auditorContract,
        abi: auditorAbi,
        functionName: "AUDITOR_ADDRESS",
      })) as Address;

      console.log("   Contract AUDITOR_ADDRESS:", contractAuditorAddress);
      console.log("   Script Auditor Address:  ", this.account.address);

      if (
        contractAuditorAddress.toLowerCase() !==
        this.account.address.toLowerCase()
      ) {
        console.error("\n❌ FATAL ERROR: Auditor address mismatch!");
        console.error(`   The contract expects: ${contractAuditorAddress}`);
        console.error(`   But you are using:    ${this.account.address}`);
        console.error("\n💡 Solutions:");
        console.error(
          "   1. Update your AUDITORPRIVATEKEY in .env to match the contract's AUDITOR_ADDRESS"
        );
        console.error(
          "   2. Or redeploy the contract with the correct auditor address\n"
        );
        process.exit(1);
      }

      console.log("   ✅ Auditor address matches!\n");
    } catch (error: any) {
      console.error("\n❌ Error verifying auditor address:", error.message);
      console.error(
        "   Make sure the Auditor contract is deployed and accessible.\n"
      );
      process.exit(1);
    }

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
      // Fetch latest address from API
      const newAuditorAddress = await this.fetchAuditorAddressFromAPI();

      if (!newAuditorAddress) {
        return; // Could not fetch from API, skip check
      }

      const newAuditorAddressLower = newAuditorAddress.toLowerCase();

      // If this is the first check, just store the address
      if (this.currentAuditorAddress === null) {
        this.currentAuditorAddress = newAuditorAddressLower;
        return;
      }

      // Check if address has changed
      if (newAuditorAddressLower !== this.currentAuditorAddress) {
        console.log("\n🔄 Auditor contract change detected!");
        console.log(`   Old: ${this.currentAuditorAddress}`);
        console.log(`   New: ${newAuditorAddressLower}`);
        console.log("   Restarting auditor service...\n");

        await this.restartWithNewContract(newAuditorAddressLower);
      }
    } catch (error: any) {
      // Silently fail if API is not accessible
      // This is normal during development
      this.debugLog("Error checking for contract changes:", error);
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
          const madeApiCall = await this.processAuditRequest(i);

          // Only delay if we made an API call to avoid rate limiting
          // This ensures we stay under 30k tokens/minute
          if (madeApiCall && i < totalCount - 1) {
            console.log(
              `   ⏳ Waiting 5s before next audit to respect rate limits...`
            );
            await new Promise((resolve) => setTimeout(resolve, 5000));
          }
        }

        lastProcessedIndex = totalCount - 1;
        this.debugLog(`Updated last processed index to: ${lastProcessedIndex}`);
      } else {
        // Show a dot to indicate polling is active (only if not in debug mode)
        if (!this.debugMode) {
          process.stdout.write(".");
        } else {
          this.debugLog("No new audit requests found");
        }
      }
    } catch (error: any) {
      console.error("\nError polling audits:", error.message);
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
   * Retries up to MAX_RETRIES times if JSON parsing fails
   */
  private async auditWithClaude(
    sourceCode: string,
    chapterDefinition: string,
    maxRetries: number = 3
  ): Promise<{ passed: boolean; reason: string }> {
    let lastError: any = null;

    // Try up to maxRetries times
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        if (attempt > 1) {
          console.log(
            `\n   🔄 Retry attempt ${attempt}/${maxRetries} for AI audit...`
          );
        }

        this.debugLog(`Starting Claude AI audit (attempt ${attempt})...`);

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
          lastError = {
            type: "parse",
            message: parseError.message,
            responseText: responseText.substring(0, 500),
          };

          console.error(
            `   ⚠️  Could not parse Claude JSON response (attempt ${attempt}/${maxRetries})`
          );
          this.debugLog("JSON parse error", {
            attempt,
            error: parseError.message,
            responseText: responseText.substring(0, 500),
          });

          // If we have more retries, continue to next attempt
          if (attempt < maxRetries) {
            await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait 1 second before retry
            continue;
          }

          // No more retries - return error
          return {
            passed: false,
            reason: "AI audit failed: Could not parse response after retries",
          };
        }

        const verdict = jsonResponse.verdict?.toUpperCase();
        let reason = jsonResponse.reason || "No reason provided";

        if (verdict !== "PASS" && verdict !== "FAIL") {
          lastError = {
            type: "invalid_verdict",
            verdict,
            jsonResponse,
          };

          console.error(
            `   ⚠️  Invalid verdict in response (attempt ${attempt}/${maxRetries}):`,
            verdict
          );
          this.debugLog("Invalid verdict", jsonResponse);

          // If we have more retries, continue to next attempt
          if (attempt < maxRetries) {
            await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait 1 second before retry
            continue;
          }

          // No more retries - return error
          return {
            passed: false,
            reason: "AI audit failed: Invalid verdict format after retries",
          };
        }

        // Truncate reason to 200 characters for on-chain storage
        if (reason.length > 200) {
          reason = reason.substring(0, 197) + "...";
        }

        if (attempt > 1) {
          console.log(`   ✓ Successfully parsed response on retry!`);
        }

        console.log(`\n   🤖 Claude AI Verdict: ${verdict}`);
        console.log(`   💭 Reason: ${reason}`);

        return {
          passed: verdict === "PASS",
          reason: reason,
        };
      } catch (error: any) {
        lastError = {
          type: "api_error",
          message: error.message,
        };

        // Check if it's a rate limit error
        const isRateLimitError =
          error.message?.includes("rate_limit") ||
          error.message?.includes("rate limit") ||
          error.status === 429;

        if (isRateLimitError) {
          console.error(
            `   ⚠️  Rate limit hit (attempt ${attempt}/${maxRetries})`
          );
          this.debugLog("Rate limit error", error);

          // Use exponential backoff for rate limits (30s, 60s, 90s)
          const waitTime = attempt * 30000; // 30s per attempt

          if (attempt < maxRetries) {
            console.log(
              `   ⏳ Waiting ${waitTime / 1000}s to respect rate limits...`
            );
            await new Promise((resolve) => setTimeout(resolve, waitTime));
            continue;
          }
        } else {
          console.error(
            `   ⚠️  Error in Claude AI audit (attempt ${attempt}/${maxRetries}):`,
            error.message
          );
          this.debugLog("Claude audit error", error);

          // If we have more retries and it's a network/API error, retry
          if (attempt < maxRetries) {
            await new Promise((resolve) => setTimeout(resolve, 2000)); // Wait 2 seconds before retry
            continue;
          }
        }

        // No more retries - return error
        return {
          passed: false,
          reason: `AI audit error after retries: ${error.message.substring(
            0,
            120
          )}`,
        };
      }
    }

    // Should never reach here, but just in case
    return {
      passed: false,
      reason: "AI audit failed: Unknown error after retries",
    };
  }

  private async processAuditRequest(requestId: number): Promise<boolean> {
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
        return false; // No API call made
      }

      // Check for debug auto-audit
      if (
        DEBUG_AUTO_AUDIT_CHAPTER > 0 &&
        request.chapterNumber === DEBUG_AUTO_AUDIT_CHAPTER
      ) {
        console.log(
          `\n   🚨 DEBUG AUTO-AUDIT: Chapter ${request.chapterNumber} - BYPASSING ALL CHECKS`
        );
        console.log(`   ⚠️  AUTO-ACCEPTING without verification!`);
        console.log(`   Contract: ${request.contractAddress}`);
        console.log(`   Requester: ${request.requester}`);
        console.log(
          `\n   💡 To disable: Set DEBUG_AUTO_AUDIT_CHAPTER = 0 in Auditor.ts\n`
        );

        await this.markAsAudited(requestId);
        console.log(
          `   ✅ Auto-audit complete for Chapter ${request.chapterNumber}`
        );
        return false; // No API call made
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
        return false; // No API call made
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
        return false; // No API call made
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
        return false; // No API call made
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
        return false; // No API call made
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
        return false; // No API call made
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
        return false; // No API call made
      }

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
        return false; // No API call made
      }

      // Check if we should skip bytecode verification (ONLY if explicitly disabled via env var)
      if (this.skipBytecodeVerification) {
        console.log(
          `\n   ⚠️  BYTECODE VERIFICATION DISABLED (SKIP_BYTECODE_VERIFICATION=true)`
        );
        console.log(`   📄 Will only verify source code with AI audit`);
        console.log(`   🚨 WARNING: This bypasses the primary security check!`);

        // Show source code info
        console.log(`\n   📄 Source Code Info:`);
        console.log(
          `   Length: ${sourceCodeData.SourceCode.length} characters`
        );
        console.log(
          `   Lines: ${sourceCodeData.SourceCode.split("\n").length} lines`
        );

        // Show a preview of the source code
        const sourcePreview =
          sourceCodeData.SourceCode.length > 500
            ? sourceCodeData.SourceCode.substring(0, 500) + "..."
            : sourceCodeData.SourceCode;
        console.log(`\n   📄 Source Code Preview:`);
        console.log(
          `   ${sourcePreview.split("\n").slice(0, 10).join("\n   ")}`
        );
        if (sourceCodeData.SourceCode.split("\n").length > 10) {
          console.log(
            `   ... (${
              sourceCodeData.SourceCode.split("\n").length
            } total lines)`
          );
        }

        // Skip to AI audit
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

        return true; // API call was made - skip the rest of the bytecode verification
      }

      // Compare local bytecode with Etherscan bytecode
      console.log(`\n   🔍 Verifying bytecode match...`);

      // Get local bytecode for the contract being audited
      const localBytecode = await this.publicClient.getBytecode({
        address: request.contractAddress,
      });

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

      // Check that we have both bytecodes first
      if (!localBytecode || localBytecode === "0x") {
        console.log(`\n   ❌ No bytecode found at local address`);
        console.log(`   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
        await this.markAsFailed(
          requestId,
          "No bytecode found at local contract address"
        );
        return false; // No API call made
      }

      if (!remoteBytecode || remoteBytecode === "0x") {
        console.log(
          `\n   ❌ No bytecode found on ${chainInfo.chainName} for verified address`
        );
        console.log(`   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
        await this.markAsFailed(
          requestId,
          `No bytecode found on ${chainInfo.chainName} for verification address`
        );
        return false; // No API call made
      }

      // Compare bytecodes using smart comparison
      const comparison = this.compareBytecodes(localBytecode, remoteBytecode);

      console.log(
        `\n   🔎 Exact Bytecode Match: ${
          comparison.exactMatch ? "✅ YES" : "❌ NO"
        }`
      );
      console.log(
        `   📏 Length difference: ${Math.abs(
          localBytecode.length - remoteBytecode.length
        )} characters`
      );

      // ALWAYS show detailed bytecode comparison for debugging
      console.log(`\n   📊 DETAILED BYTECODE DUMP:`);
      console.log(`   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

      console.log(`\n   🔵 LOCAL BYTECODE (Full):`);
      console.log(`   First 500 chars: ${localBytecode.substring(0, 500)}`);
      console.log(
        `   Last 500 chars:  ${localBytecode.substring(
          Math.max(0, localBytecode.length - 500)
        )}`
      );
      console.log(`   Total length: ${localBytecode.length}`);

      console.log(`\n   🟢 REMOTE BYTECODE (Full):`);
      console.log(`   First 500 chars: ${remoteBytecode.substring(0, 500)}`);
      console.log(
        `   Last 500 chars:  ${remoteBytecode.substring(
          Math.max(0, remoteBytecode.length - 500)
        )}`
      );
      console.log(`   Total length: ${remoteBytecode.length}`);

      // Strip metadata and show those too
      const localStripped = this.stripMetadata(localBytecode);
      const remoteStripped = this.stripMetadata(remoteBytecode);

      console.log(`\n   🔵 LOCAL BYTECODE (Stripped):`);
      console.log(`   First 500 chars: ${localStripped.substring(0, 500)}`);
      console.log(
        `   Last 500 chars:  ${localStripped.substring(
          Math.max(0, localStripped.length - 500)
        )}`
      );
      console.log(`   Total length: ${localStripped.length}`);
      console.log(
        `   Removed: ${localBytecode.length - localStripped.length} chars`
      );

      console.log(`\n   🟢 REMOTE BYTECODE (Stripped):`);
      console.log(`   First 500 chars: ${remoteStripped.substring(0, 500)}`);
      console.log(
        `   Last 500 chars:  ${remoteStripped.substring(
          Math.max(0, remoteStripped.length - 500)
        )}`
      );
      console.log(`   Total length: ${remoteStripped.length}`);
      console.log(
        `   Removed: ${remoteBytecode.length - remoteStripped.length} chars`
      );

      console.log(`\n   🔍 COMPARISON RESULTS:`);
      console.log(
        `   Exact match: ${comparison.exactMatch ? "✅ YES" : "❌ NO"}`
      );
      console.log(
        `   Code match (stripped): ${comparison.codeMatch ? "✅ YES" : "❌ NO"}`
      );
      console.log(
        `   Stripped match: ${
          localStripped === remoteStripped ? "✅ YES" : "❌ NO"
        }`
      );

      if (!comparison.exactMatch) {
        // Find first difference
        let firstDiff = -1;
        for (
          let i = 0;
          i < Math.min(localBytecode.length, remoteBytecode.length);
          i++
        ) {
          if (localBytecode[i] !== remoteBytecode[i]) {
            firstDiff = i;
            break;
          }
        }

        if (firstDiff >= 0) {
          console.log(`\n   📍 First difference at position: ${firstDiff}`);
          console.log(
            `   Local:  ...${localBytecode.substring(
              Math.max(0, firstDiff - 20),
              firstDiff + 80
            )}...`
          );
          console.log(
            `   Remote: ...${remoteBytecode.substring(
              Math.max(0, firstDiff - 20),
              firstDiff + 80
            )}...`
          );

          // Check if difference is in metadata region (near the end)
          const metadataRegionStart = localBytecode.length - 150; // Metadata is typically in last ~100 chars
          if (firstDiff >= metadataRegionStart) {
            console.log(
              `   💡 Difference is in metadata region (compiler-generated hash)`
            );
          } else {
            console.log(
              `   ⚠️  Difference is in contract code region (position ${firstDiff}/${localBytecode.length})`
            );

            // Check if it looks like an address (40 hex chars)
            const localChunk = localBytecode.substring(
              firstDiff,
              firstDiff + 40
            );
            const remoteChunk = remoteBytecode.substring(
              firstDiff,
              firstDiff + 40
            );
            if (
              /^[a-f0-9]{40}$/i.test(localChunk) &&
              /^[a-f0-9]{40}$/i.test(remoteChunk)
            ) {
              console.log(
                `   💡 Appears to be an address difference (constructor arg or immutable variable):`
              );
              console.log(`      Local address:  0x${localChunk}`);
              console.log(`      Remote address: 0x${remoteChunk}`);
              console.log(
                `   ℹ️  This is expected when contracts are deployed with different constructor arguments`
              );
            }
          }
        }

        // Also check stripped versions for first difference
        let firstDiffStripped = -1;
        for (
          let i = 0;
          i < Math.min(localStripped.length, remoteStripped.length);
          i++
        ) {
          if (localStripped[i] !== remoteStripped[i]) {
            firstDiffStripped = i;
            break;
          }
        }

        if (firstDiffStripped >= 0) {
          console.log(
            `\n   📍 First difference in STRIPPED bytecode at position: ${firstDiffStripped}`
          );
          console.log(
            `   Local:  ...${localStripped.substring(
              Math.max(0, firstDiffStripped - 20),
              firstDiffStripped + 80
            )}...`
          );
          console.log(
            `   Remote: ...${remoteStripped.substring(
              Math.max(0, firstDiffStripped - 20),
              firstDiffStripped + 80
            )}...`
          );
        }

        if (comparison.reason) {
          console.log(`\n   📝 ${comparison.reason}`);
        }
      }
      console.log(`   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

      // Verify bytecode match - accept if code matches (even if metadata differs)
      if (!comparison.codeMatch) {
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
        return false; // No API call made
      }

      console.log(
        `   ✅ Bytecode verification passed - Local matches ${chainInfo.chainName}!`
      );
      if (comparison.exactMatch) {
        console.log(`   🎯 Perfect match (including metadata)`);
      } else {
        console.log(`   ✓ Code matches (metadata differs - this is normal)`);
      }
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

      return true; // API call was made
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

      return false; // Error occurred, uncertain if API call was made
    }
  }

  /**
   * Strip Solidity metadata hash from bytecode
   * Metadata hash is appended by the compiler and differs between compilations
   *
   * CBOR-encoded metadata formats:
   * - a1: Map with 1 entry (solc version only): a164736f6c63{version}{end}
   * - a2: Map with 2 entries (IPFS + solc): a264697066735822{ipfs-hash}64736f6c63{version}{end}
   * - a3+: Future formats with additional entries
   *
   * This function strips everything from the CBOR map prefix (a0-af) through the end,
   * as all of this is compiler-generated metadata that can vary between compilations.
   *
   * The metadata is ALWAYS at the very end and is relatively short (typically 50-100 bytes).
   * We look for the pattern starting from the end to avoid matching random 'a[0-9a-f]' in the code.
   */
  private stripMetadata(bytecode: string): string {
    if (!bytecode || bytecode.length < 100) {
      return bytecode;
    }

    // Match CBOR metadata at the END of bytecode:
    // The metadata section is always at the end and follows this pattern:
    // - Starts with 'a[0-9a-f]' (CBOR map with 0-15 entries)
    // - Contains '64736f6c63' (hex for "solc")
    // - Followed by version and length bytes
    // - Ends with '00[0-9a-f]{2}' (CBOR length encoding)
    //
    // We use a non-greedy match and limit to last ~300 chars to avoid
    // accidentally matching 'a[0-9a-f]' that appears in the actual code.
    //
    // Match from the last 300 characters only (metadata is typically 50-150 chars)
    const tailLength = Math.min(300, bytecode.length);
    const tail = bytecode.slice(-tailLength);
    const head = bytecode.slice(0, -tailLength);

    // Look for metadata pattern only in the tail
    // Use non-greedy match (.*?) and be more specific about the end pattern
    const metadataPattern =
      /a[0-9a-f](?:.*?)64736f6c63[a-f0-9]{6,}00[0-9a-f]{2}$/i;

    const strippedTail = tail.replace(metadataPattern, "");
    const stripped = head + strippedTail;

    this.debugLog("Metadata stripping", {
      originalLength: bytecode.length,
      strippedLength: stripped.length,
      removedBytes: bytecode.length - stripped.length,
      hadMetadata: bytecode !== stripped,
      tailOriginal: tail.slice(-100),
      tailStripped: strippedTail.slice(-100),
    });

    return stripped;
  }

  /**
   * Compare bytecodes with metadata-aware matching
   */
  private compareBytecodes(
    local: string,
    remote: string
  ): { exactMatch: boolean; codeMatch: boolean; reason?: string } {
    // Check exact match first
    const exactMatch = local === remote;

    if (exactMatch) {
      return { exactMatch: true, codeMatch: true };
    }

    // If not exact match, try stripping metadata
    const localStripped = this.stripMetadata(local);
    const remoteStripped = this.stripMetadata(remote);

    const codeMatch = localStripped === remoteStripped;

    if (codeMatch) {
      return {
        exactMatch: false,
        codeMatch: true,
        reason:
          "Bytecode matches after stripping compiler metadata (IPFS hash)",
      };
    }

    return {
      exactMatch: false,
      codeMatch: false,
      reason: "Bytecode differs in actual contract code, not just metadata",
    };
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
    contractAddress: Address,
    maxRetries: number = 3
  ): Promise<any | null> {
    const url = `${ETHERSCAN_API_BASE}?chainid=42161&module=contract&action=getsourcecode&address=${contractAddress}&apikey=${ETHERSCAN_API_KEY}`;

    // Always log the API call details (not just in debug mode)
    const maskedUrl = url.replace(
      ETHERSCAN_API_KEY,
      ETHERSCAN_API_KEY ? "***API_KEY***" : "***NO_KEY***"
    );

    // Retry loop for handling temporary network issues
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        if (attempt === 1) {
          console.log(`\n   🌐 Fetching source code from Etherscan V2 API...`);
          console.log(`   Chain ID: 42161 (Arbitrum One)`);
          console.log(`   Address: ${contractAddress}`);
          console.log(
            `   API Key: ${ETHERSCAN_API_KEY ? "✓ Set" : "✗ Not Set"}`
          );
          this.debugLog(`Full API URL: ${maskedUrl}`);
        } else {
          console.log(
            `\n   🔄 Retry attempt ${attempt}/${maxRetries} for Etherscan API...`
          );
        }

        const response = await fetch(url);

        // Log HTTP response details
        console.log(
          `   HTTP Status: ${response.status} ${response.statusText}`
        );
        this.debugLog(`Response headers:`, {
          contentType: response.headers.get("content-type"),
          contentLength: response.headers.get("content-length"),
        });

        // Check for temporary server errors (502, 503, 504)
        const isTemporaryError =
          response.status === 502 ||
          response.status === 503 ||
          response.status === 504;

        // Check if response is actually JSON
        const contentType = response.headers.get("content-type");

        if (!contentType || !contentType.includes("application/json")) {
          const text = await response.text();

          // Check if it's a temporary server error
          if (isTemporaryError) {
            console.error(
              `\n   ⚠️  Temporary server error (${response.status}): ${response.statusText}`
            );
            console.error(`   Response: ${text.substring(0, 200)}`);

            // If we have more retries, wait and try again
            if (attempt < maxRetries) {
              const waitTime = 7000; // 7 seconds
              console.log(`   ⏳ Waiting ${waitTime / 1000}s before retry...`);
              await new Promise((resolve) => setTimeout(resolve, waitTime));
              continue; // Try again
            }

            // No more retries - fail permanently
            console.error(
              `\n   ❌ ERROR: Etherscan API still unavailable after ${maxRetries} attempts`
            );
            console.error(
              `   This appears to be a temporary server issue on Etherscan's side.`
            );
            console.error(`\n   💡 To verify manually, visit:`);
            console.error(
              `      https://arbiscan.io/address/${contractAddress}#code\n`
            );
            return null;
          }

          // Not a temporary error - show detailed error information
          console.error(`\n   ❌ ERROR: Etherscan returned non-JSON response`);
          console.error(`   Content-Type: ${contentType || "(none)"}`);
          console.error(`   HTTP Status: ${response.status}`);
          console.error(`\n   📄 Response body (first 1000 chars):`);
          console.error(`   ${text.substring(0, 1000)}`);
          if (text.length > 1000) {
            console.error(`   ... (${text.length} total characters)`);
          }

          console.error(`\n   💡 Possible causes:`);
          if (!ETHERSCAN_API_KEY) {
            console.error(`      - ETHERSCAN_API_KEY is not set`);
          }
          console.error(`      - The contract may not be verified on Arbiscan`);
          console.error(`      - Etherscan API may be having issues`);
          console.error(`      - The API endpoint or format may have changed`);
          console.error(`\n   💡 To verify manually, visit:`);
          console.error(
            `      https://arbiscan.io/address/${contractAddress}#code\n`
          );

          this.debugLog("Full non-JSON response", text);
          return null;
        }

        const data: EtherscanSourceCodeResponse = await response.json();

        console.log(`   ✓ Received JSON response from Etherscan`);
        console.log(`   API Status: ${data.status} (${data.message})`);

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

          if (attempt > 1) {
            console.log(
              `   ✅ Successfully retrieved data after ${attempt} attempt(s)`
            );
          }

          return data.result[0];
        }

        // If we got JSON but no results - this is a permanent error (not verified)
        console.error(`\n   ❌ No verification data found`);
        console.error(`   API returned status: ${data.status}`);
        console.error(`   API message: ${data.message}`);
        console.error(
          `\n   💡 This usually means the contract is not verified.`
        );
        console.error(`   Please verify the contract at:`);
        console.error(
          `      https://arbiscan.io/address/${contractAddress}#code\n`
        );

        this.debugLog("No verification data from Etherscan", data);
        return null; // No point retrying if contract is not verified
      } catch (error: any) {
        // Network/fetch errors - retry if we have attempts left
        console.error(
          `\n   ⚠️  Exception while fetching from Etherscan (attempt ${attempt}/${maxRetries}):`,
          error.message
        );
        console.error(`   Error type: ${error.name}`);
        if (error.cause) {
          console.error(`   Cause: ${error.cause}`);
        }
        this.debugLog("Etherscan fetch error", error);

        // If we have more retries, wait and try again
        if (attempt < maxRetries) {
          const waitTime = 7000; // 7 seconds
          console.log(`   ⏳ Waiting ${waitTime / 1000}s before retry...`);
          await new Promise((resolve) => setTimeout(resolve, waitTime));
          continue; // Try again
        }

        // No more retries
        console.error(
          `\n   ❌ Failed to fetch from Etherscan after ${maxRetries} attempts`
        );
        return null;
      }
    }

    // Should never reach here, but just in case
    return null;
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
