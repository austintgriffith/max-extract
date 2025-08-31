import { GameServer } from "./GameServer";

async function main() {
  try {
    console.log("🌌 Max Extract Protocol Game Server\n");

    // Initialize and start the game server
    const gameServer = new GameServer();
    await gameServer.start(8000);

    // Graceful shutdown
    process.on("SIGINT", () => {
      console.log("\n🛑 Shutting down game server...");
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
