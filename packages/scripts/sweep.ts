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

// Load environment variables from packages/scripts/.env
dotenv.config({ path: path.join(__dirname, ".env") });

// Fetch current ETH price from CoinGecko API
async function fetchEthPrice(): Promise<number> {
  try {
    const response = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd"
    );
    const data = await response.json();
    return data.ethereum.usd;
  } catch (error) {
    console.warn("⚠️  Failed to fetch ETH price, using fallback of $2500");
    return 2500; // Fallback price
  }
}

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
  remainingBalance: string; // Balance left after sweep attempt
  success: boolean;
  error?: string;
  txHash?: string;
}

async function sweepPilots() {
  console.log("🧹 Starting pilot ETH sweep...\n");

  // Fetch current ETH price
  const ethPriceUsd = await fetchEthPrice();
  console.log(`💵 Current ETH price: $${ethPriceUsd.toFixed(2)}\n`);

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

      // Skip if balance is zero
      if (balance === 0n) {
        console.log(
          `⏭️  Skipping ${pilot.name} (${address.slice(0, 8)}...) - balance: 0 ETH`
        );
        results.push({
          address,
          name: pilot.name,
          initialBalance: "0",
          swept: "0",
          remainingBalance: "0",
          success: false,
          error: "Zero balance",
        });
        continue;
      }

      console.log(`\n🔍 Checking ${pilot.name} (${address.slice(0, 8)}...):`);
      console.log(`   📊 Balance: ${formatEther(balance)} ETH`);

      // Create wallet client for this pilot
      const pilotAccount = privateKeyToAccount(
        pilot.privateKey as `0x${string}`
      );
      const pilotWalletClient = createWalletClient({
        account: pilotAccount,
        chain,
        transport: http(rpcUrl),
      });

      // Get gas price with buffer for base fee fluctuations
      let gasPrice = await publicClient.getGasPrice();
      console.log(`   ⛽ Base gas price: ${formatEther(gasPrice)} ETH per gas unit`);
      
      // On Arbitrum, add a 10% buffer to account for base fee increases
      // This prevents "maxFeePerGas cannot be lower than block base fee" errors
      // while minimizing dust left behind
      if (chainId === 42161) {
        gasPrice = (gasPrice * 110n) / 100n;
        console.log(`   ⛽ Gas price (with 10% buffer): ${formatEther(gasPrice)} ETH per gas unit`);
      }

      // Estimate gas for the transaction
      // Standard ETH transfer is 21000 gas, but Arbitrum might need more
      let gasLimit: bigint;
      try {
        gasLimit = await publicClient.estimateGas({
          account: pilotAccount.address,
          to: godAccount.address,
          value: 1n, // Estimate with minimal value
        });
        console.log(`   📏 Estimated gas limit: ${gasLimit}`);
        
        // For Arbitrum, use the estimate directly (it's very accurate)
        // For localhost, add a 50% buffer to account for variability
        if (chainId === 42161) {
          gasLimit = (gasLimit * 103n) / 100n; // 3% buffer for Arbitrum
        } else {
          gasLimit = (gasLimit * 150n) / 100n; // 50% buffer for localhost
        }
      } catch (estimateError) {
        console.log(`   ⚠️  Gas estimation failed, using fallback`);
        // Fallback: use higher limit for L2s, standard for others
        gasLimit = chainId === 42161 ? 100000n : 21000n;
      }

      const gasCost = gasLimit * gasPrice;
      console.log(`   💸 Total gas cost: ${formatEther(gasCost)} ETH`);

      if (balance <= gasCost) {
        console.log(`   ⏭️  Cannot sweep - insufficient balance after gas`);
        results.push({
          address,
          name: pilot.name,
          initialBalance: formatEther(balance),
          swept: "0",
          remainingBalance: formatEther(balance),
          success: false,
          error: `Insufficient: balance ${formatEther(balance)} ETH, gas ${formatEther(gasCost)} ETH`,
        });
        continue;
      }

      const amountToSend = balance - gasCost;
      console.log(`   💰 Amount to sweep: ${formatEther(amountToSend)} ETH`);
      console.log(`   🚀 Sending transaction...`);

      // Send ETH to GOD
      const hash = await pilotWalletClient.sendTransaction({
        to: godAccount.address,
        value: amountToSend,
        gas: gasLimit,
        gasPrice: gasPrice,
        chain,
      });

      console.log(`   ✅ Success! Swept ${formatEther(amountToSend)} ETH`);
      console.log(`   📝 Tx: ${hash}`);

      totalSwept += amountToSend;
      successCount++;

      results.push({
        address,
        name: pilot.name,
        initialBalance: formatEther(balance),
        swept: formatEther(amountToSend),
        remainingBalance: "0", // Successfully swept, nothing left
        success: true,
        txHash: hash,
      });
    } catch (error: any) {
      console.error(`❌ Failed to sweep ${pilot.name} (${address.slice(0, 8)}...): ${error.message}\n`);
      
      // Try to get the current balance even after error
      let remainingBalance = "unknown";
      try {
        const currentBalance = await publicClient.getBalance({
          address: address as `0x${string}`,
        });
        remainingBalance = formatEther(currentBalance);
      } catch {
        // Ignore balance fetch errors
      }
      
      results.push({
        address,
        name: pilot.name,
        initialBalance: remainingBalance !== "unknown" ? remainingBalance : "unknown",
        swept: "0",
        remainingBalance: remainingBalance,
        success: false,
        error: error.message,
      });
    }
  }

  // Get GOD's final balance
  const godFinalBalance = await publicClient.getBalance({
    address: godAccount.address,
  });

  // Calculate total remaining unswept ETH
  let totalRemaining = 0;
  let unsweptCount = 0;
  for (const result of results) {
    if (!result.success && result.remainingBalance !== "unknown" && result.remainingBalance !== "0") {
      totalRemaining += parseFloat(result.remainingBalance);
      unsweptCount++;
    }
  }
  
  const totalRemainingUsd = totalRemaining * ethPriceUsd;
  const totalSweptUsd = parseFloat(formatEther(totalSwept)) * ethPriceUsd;

  // Print summary
  console.log("\n" + "=".repeat(60));
  console.log("📊 SWEEP SUMMARY");
  console.log("=".repeat(60));
  console.log(`✅ Successful sweeps: ${successCount}/${pilotsMap.size}`);
  console.log(`💰 Total swept: ${formatEther(totalSwept)} ETH ($${totalSweptUsd.toFixed(2)} USD)`);
  console.log(`👑 GOD initial balance: ${formatEther(godInitialBalance)} ETH`);
  console.log(`👑 GOD final balance: ${formatEther(godFinalBalance)} ETH`);
  console.log(
    `📈 GOD balance change: ${formatEther(godFinalBalance - godInitialBalance)} ETH`
  );
  console.log("-".repeat(60));
  console.log(`💸 Total remaining unswept: ${totalRemaining.toFixed(18)} ETH ($${totalRemainingUsd.toFixed(2)} USD)`);
  console.log(`📦 Unswept wallets: ${unsweptCount}/${pilotsMap.size}`);
  console.log("=".repeat(60));
  console.log("\n✨ Sweep complete!");
}

// Run the sweep
sweepPilots()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 Sweep failed:", error);
    process.exit(1);
  });

