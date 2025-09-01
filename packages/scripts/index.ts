import { GameServer } from "./GameServer";

// Check if DEBUG mode is enabled
const DEBUG_MODE = process.env.DEBUG === "true" || process.env.DEBUG === "1";
const DEBUG_TIMEOUT = 30 * 1000; // 30 seconds in milliseconds

async function main() {
  try {
    if (DEBUG_MODE) {
      console.log("🐛 DEBUG MODE ENABLED");
      console.log("⏰ Server will automatically shut down after 30 seconds");
      console.log("📊 Extra debug information will be logged\n");
    }

    console.log("🌌 Max Extract Protocol Game Server\n");

    // Initialize and start the game server
    const gameServer = new GameServer(DEBUG_MODE);
    await gameServer.start(8000);

    // Set up debug timeout if in debug mode
    let debugTimeout: NodeJS.Timeout | null = null;
    if (DEBUG_MODE) {
      debugTimeout = setTimeout(() => {
        console.log("\n⏰ DEBUG MODE: 30 seconds elapsed, shutting down...");
        gameServer.stop();
        process.exit(0);
      }, DEBUG_TIMEOUT);

      console.log(`🐛 DEBUG: Timeout set for ${DEBUG_TIMEOUT / 1000} seconds`);
    }

    // Graceful shutdown
    process.on("SIGINT", () => {
      console.log("\n🛑 Shutting down game server...");
      if (debugTimeout) {
        clearTimeout(debugTimeout);
      }
      gameServer.stop();
      process.exit(0);
    });
  } catch (error: any) {
    console.error("Error starting Max Extract Game Server:", error.message);
    console.log("\n💡 Make sure your local chain is running with: yarn chain");
    console.log("💡 And contracts are deployed with: yarn deploy");
  }
}

main().catch(console.error);
