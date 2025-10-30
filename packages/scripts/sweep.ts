import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";
import {
  createPublicClient,
  createWalletClient,
  http,
  formatEther,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { foundry, arbitrum } from "viem/chains";

// Load environment variables
dotenv.config();

interface PilotBackup {
  timestamp: string;
  characterCount: number;
  characters: Array<{
    firstname: string;
    lastname: string;
    ship: number;
    fuel: number;
    cargo: number;
    aggression: number;
    intelligence: number;
    dexterity: number;
    privateKey: string;
    publicAddress: string;
  }>;
}

interface SweepResult {
  address: string;
  name: string;
  initialBalance: string;
  swept: string;
  success: boolean;
  error?: string;
  txHash?: string;
}

async function sweepPilots() {
  console.log("🧹 Starting pilot ETH sweep...\n");

  // Load blockchain configuration
  const chainId = process.env.CHAINID ? parseInt(process.env.CHAINID) : 31337;
  const rpcUrl = process.env.RPC || "http://127.0.0.1:8545";
  const godPrivateKey = process.env.GODPRIVATEKEY || "";

  if (!godPrivateKey) {
    console.error("❌ GODPRIVATEKEY environment variable not set");
    process.exit(1);
  }

  // Setup chain
  const chain = chainId === 31337 ? foundry : arbitrum;
  console.log(`🔗 Connected to chain ID: ${chainId}`);
  console.log(`🔗 RPC URL: ${rpcUrl}\n`);

  // Create clients
  const publicClient = createPublicClient({
    chain,
    transport: http(rpcUrl),
  });

  const godAccount = privateKeyToAccount(godPrivateKey as `0x${string}`);
  console.log(`👑 GOD address: ${godAccount.address}\n`);

  // Get GOD's initial balance
  const godInitialBalance = await publicClient.getBalance({
    address: godAccount.address,
  });
  console.log(`💰 GOD initial balance: ${formatEther(godInitialBalance)} ETH\n`);

  // Read all pilot backup files
  const backupDir = path.join(__dirname, "pilot-backups");
  const files = fs.readdirSync(backupDir).filter((f) => f.endsWith(".json"));

  if (files.length === 0) {
    console.log("⚠️  No pilot backup files found");
    return;
  }

  console.log(`📁 Found ${files.length} backup file(s):`);
  files.forEach((f) => console.log(`   - ${f}`));
  console.log("");

  // Collect all unique pilots (by address)
  const pilotsMap = new Map<
    string,
    {
      privateKey: string;
      publicAddress: string;
      name: string;
    }
  >();

  for (const file of files) {
    const filePath = path.join(backupDir, file);
    const content = fs.readFileSync(filePath, "utf-8");
    const backup: PilotBackup = JSON.parse(content);

    for (const char of backup.characters) {
      if (!pilotsMap.has(char.publicAddress)) {
        pilotsMap.set(char.publicAddress, {
          privateKey: char.privateKey,
          publicAddress: char.publicAddress,
          name: `${char.firstname} ${char.lastname}`,
        });
      }
    }
  }

  console.log(`👨‍✈️ Found ${pilotsMap.size} unique pilot(s) to sweep\n`);

  // Sweep each pilot
  const results: SweepResult[] = [];
  let totalSwept = 0n;
  let successCount = 0;

  for (const [address, pilot] of pilotsMap.entries()) {
    try {
      // Get current balance
      const balance = await publicClient.getBalance({
        address: address as `0x${string}`,
      });

      const balanceEth = parseFloat(formatEther(balance));

      // Skip if balance is too low
      const minBalance = chainId === 31337 ? 0.001 : 0.0001;
      if (balanceEth < minBalance) {
        console.log(
          `⏭️  Skipping ${pilot.name} (${address.slice(0, 8)}...) - balance too low: ${balanceEth.toFixed(6)} ETH`
        );
        results.push({
          address,
          name: pilot.name,
          initialBalance: formatEther(balance),
          swept: "0",
          success: false,
          error: "Balance too low",
        });
        continue;
      }

      // Create wallet client for this pilot
      const pilotAccount = privateKeyToAccount(
        pilot.privateKey as `0x${string}`
      );
      const pilotWalletClient = createWalletClient({
        account: pilotAccount,
        chain,
        transport: http(rpcUrl),
      });

      // Get gas price
      const gasPrice = await publicClient.getGasPrice();

      // Estimate gas for the transaction by simulating with a small amount first
      // This handles different chain gas requirements (Arbitrum needs more than 21000)
      let gasLimit: bigint;
      try {
        gasLimit = await publicClient.estimateGas({
          account: pilotAccount.address,
          to: godAccount.address,
          value: 1n, // Estimate with minimal value
        });
        // Add 20% buffer to be safe
        gasLimit = (gasLimit * 120n) / 100n;
      } catch (estimateError) {
        // Fallback: use higher limit for L2s, standard for others
        gasLimit = chainId === 42161 ? 100000n : 21000n;
      }

      const gasCost = gasLimit * gasPrice;

      if (balance <= gasCost) {
        console.log(
          `⏭️  Skipping ${pilot.name} (${address.slice(0, 8)}...) - balance too low after gas`
        );
        results.push({
          address,
          name: pilot.name,
          initialBalance: formatEther(balance),
          swept: "0",
          success: false,
          error: "Balance too low after gas",
        });
        continue;
      }

      const amountToSend = balance - gasCost;

      console.log(`🔍 Sweeping ${pilot.name} (${address.slice(0, 8)}...):`);
      console.log(`   📊 Balance: ${formatEther(balance)} ETH`);
      console.log(`   💰 Sending: ${formatEther(amountToSend)} ETH`);
      console.log(`   🔒 Gas cost: ${formatEther(gasCost)} ETH (limit: ${gasLimit})`);

      // Send ETH to GOD
      const hash = await pilotWalletClient.sendTransaction({
        to: godAccount.address,
        value: amountToSend,
        gas: gasLimit,
        gasPrice: gasPrice,
        chain,
      });

      console.log(`✅ Swept ${formatEther(amountToSend)} ETH (tx: ${hash.slice(0, 10)}...)\n`);

      totalSwept += amountToSend;
      successCount++;

      results.push({
        address,
        name: pilot.name,
        initialBalance: formatEther(balance),
        swept: formatEther(amountToSend),
        success: true,
        txHash: hash,
      });
    } catch (error: any) {
      console.error(`❌ Failed to sweep ${pilot.name} (${address.slice(0, 8)}...): ${error.message}\n`);
      results.push({
        address,
        name: pilot.name,
        initialBalance: "unknown",
        swept: "0",
        success: false,
        error: error.message,
      });
    }
  }

  // Get GOD's final balance
  const godFinalBalance = await publicClient.getBalance({
    address: godAccount.address,
  });

  // Print summary
  console.log("\n" + "=".repeat(60));
  console.log("📊 SWEEP SUMMARY");
  console.log("=".repeat(60));
  console.log(`✅ Successful sweeps: ${successCount}/${pilotsMap.size}`);
  console.log(`💰 Total swept: ${formatEther(totalSwept)} ETH`);
  console.log(`👑 GOD initial balance: ${formatEther(godInitialBalance)} ETH`);
  console.log(`👑 GOD final balance: ${formatEther(godFinalBalance)} ETH`);
  console.log(
    `📈 GOD balance change: ${formatEther(godFinalBalance - godInitialBalance)} ETH`
  );
  console.log("=".repeat(60) + "\n");

  // Print detailed results
  if (results.length > 0) {
    console.log("📋 DETAILED RESULTS:");
    console.log("-".repeat(60));
    for (const result of results) {
      if (result.success) {
        console.log(`✅ ${result.name}`);
        console.log(`   Address: ${result.address}`);
        console.log(`   Initial: ${result.initialBalance} ETH`);
        console.log(`   Swept: ${result.swept} ETH`);
        console.log(`   Tx: ${result.txHash}`);
      } else {
        console.log(`❌ ${result.name}`);
        console.log(`   Address: ${result.address}`);
        console.log(`   Error: ${result.error}`);
      }
      console.log("");
    }
  }
}

// Run the sweep
sweepPilots()
  .then(() => {
    console.log("✨ Sweep complete!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 Sweep failed:", error);
    process.exit(1);
  });

