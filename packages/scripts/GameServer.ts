import express from "express";
import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { createPublicClient, http } from "viem";
import { foundry } from "viem/chains";
import { Sector } from "./Sector";
import { SECTOR_CONFIG } from "./types";
import deployedContracts from "../nextjs/contracts/deployedContracts";

// Create a public client for reading from the local foundry chain
const publicClient = createPublicClient({
  chain: foundry,
  transport: http("http://127.0.0.1:8545"), // Default foundry RPC URL
});

export class GameServer {
  private app: express.Application;
  private server: any;
  private wss: WebSocketServer;
  private sectors: Map<string, Sector> = new Map();
  private simulationInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.app = express();
    this.server = createServer(this.app);
    this.wss = new WebSocketServer({
      server: this.server,
      verifyClient: (info: any) => {
        // Allow all origins for development
        return true;
      },
    });

    this.setupMiddleware();
    this.setupRoutes();
    this.setupWebSocket();
  }

  private setupMiddleware(): void {
    this.app.use(express.json());
    this.app.use((req, res, next) => {
      res.header("Access-Control-Allow-Origin", "*");
      res.header(
        "Access-Control-Allow-Headers",
        "Origin, X-Requested-With, Content-Type, Accept"
      );
      next();
    });
  }

  private setupRoutes(): void {
    // Get sector snapshot
    this.app.get("/sector/:sectorId", (req, res) => {
      const { sectorId } = req.params;

      if (!this.sectors.has(sectorId)) {
        return res.status(404).json({ error: "Sector not found" });
      }

      const sector = this.sectors.get(sectorId)!;
      res.json(sector.getSnapshot());
    });

    // Health check
    this.app.get("/api/health", (req, res) => {
      res.json({
        status: "healthy",
        sectorCount: this.sectors.size,
        uptime: process.uptime(),
      });
    });

    // Get all sectors (for admin/debugging)
    this.app.get("/api/sectors", (req, res) => {
      const sectorList = Array.from(this.sectors.keys()).map((id) => ({
        id,
        asteroidCount: this.sectors.get(id)!.asteroids.size,
        shipCount: this.sectors.get(id)!.ships.size,
        subscriberCount: this.sectors.get(id)!.subscribers.size,
      }));
      res.json(sectorList);
    });
  }

  private setupWebSocket(): void {
    this.wss.on("connection", (ws, req) => {
      console.log("WebSocket connection established");

      ws.on("message", (message) => {
        try {
          const data = JSON.parse(message.toString());

          if (data.type === "subscribe" && data.sectorId) {
            if (!this.sectors.has(data.sectorId)) {
              return ws.send(
                JSON.stringify({
                  type: "error",
                  message: "Sector not found",
                })
              );
            }

            const sector = this.sectors.get(data.sectorId)!;
            sector.addSubscriber(ws);

            ws.send(
              JSON.stringify({
                type: "subscribed",
                sectorId: data.sectorId,
                timestamp: Date.now(),
              })
            );
          }
        } catch (error) {
          console.error("WebSocket message error:", error);
        }
      });

      ws.on("close", () => {
        // Remove subscriber from all sectors
        for (const sector of this.sectors.values()) {
          sector.removeSubscriber(ws);
        }
        console.log("WebSocket connection closed");
      });
    });
  }

  private async loadSectorsFromContract(): Promise<void> {
    try {
      // Check if MaxExtract contract is deployed
      const contracts = deployedContracts[31337];
      if (!contracts || !contracts.MaxExtract) {
        console.error(
          "⚠️  MaxExtract contract not found in deployedContracts. Make sure to deploy all contracts first."
        );
        console.log("💡 Run: yarn deploy");
        return;
      }

      const maxExtractContract = contracts.MaxExtract;
      if (!maxExtractContract.address) {
        console.error("⚠️  MaxExtract contract address is undefined");
        return;
      }

      const activeSectors = (await publicClient.readContract({
        address: maxExtractContract.address,
        abi: maxExtractContract.abi,
        functionName: "getActiveSectors",
      })) as bigint[];

      let newSectorsAdded = false;
      for (const sectorId of activeSectors) {
        const sectorIdStr = sectorId.toString();
        if (!this.sectors.has(sectorIdStr)) {
          this.sectors.set(sectorIdStr, new Sector(sectorIdStr));
          console.log(`  ✅ New Sector ${sectorIdStr} initialized`);
          newSectorsAdded = true;
        }
      }

      // Only log if we found new sectors
      if (newSectorsAdded) {
        console.log(`📡 Loaded ${activeSectors.length} sectors from contract`);
      }
    } catch (error) {
      console.error("Error loading sectors from contract:", error);
    }
  }

  private startSimulation(): void {
    const simulate = async () => {
      // Reload sectors from contract periodically
      await this.loadSectorsFromContract();

      // Update all sectors
      for (const sector of this.sectors.values()) {
        sector.update();
      }

      // Schedule next update
      this.simulationInterval = setTimeout(
        simulate,
        SECTOR_CONFIG.UPDATE_INTERVAL
      );
    };

    simulate();
  }

  public async start(port: number = 8000): Promise<void> {
    // Load initial sectors
    await this.loadSectorsFromContract();

    // Start simulation
    this.startSimulation();

    this.server.listen(port, () => {
      console.log(`🚀 Max Extract Game Server running on port ${port}`);
      console.log(`📡 WebSocket server ready for connections`);
      console.log(`🌌 Simulating ${this.sectors.size} sectors`);
      console.log(`⏱️  Update interval: ${SECTOR_CONFIG.UPDATE_INTERVAL}ms`);
    });
  }

  public stop(): void {
    if (this.simulationInterval) {
      clearTimeout(this.simulationInterval);
    }
    this.server.close();
  }
}
