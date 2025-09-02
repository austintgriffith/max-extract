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
  private debugMode: boolean;

  constructor(debugMode: boolean = false) {
    this.debugMode = debugMode;
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

    if (this.debugMode) {
      this.debugLog("GameServer initialized in DEBUG mode");
    }
  }

  private debugLog(message: string, data?: any): void {
    if (this.debugMode) {
      const timestamp = new Date().toISOString().split("T")[1].split(".")[0];
      if (data) {
        console.log(`🐛 [${timestamp}] ${message}:`, data);
      } else {
        console.log(`🐛 [${timestamp}] ${message}`);
      }
    }
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
          } else if (
            data.type === "ship_vector_matched" &&
            data.sectorId &&
            data.shipId
          ) {
            // Handle frontend notification that a ship has matched vector with target (asteroid or ship)
            const sector = this.sectors.get(data.sectorId);
            if (sector) {
              const targetType = data.targetShipId ? "ship" : "asteroid";
              const targetId = data.targetShipId || data.asteroidId;

              sector.handleVectorMatching(
                data.shipId,
                targetId,
                data.position,
                data.velocity,
                targetType
              );
            }
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
      this.debugLog("Loading sectors from contract...");

      // Check if MaxExtract contract is deployed
      const contracts = deployedContracts[31337];
      if (!contracts || !contracts.MaxExtract) {
        console.error(
          "⚠️  MaxExtract contract not found in deployedContracts. Make sure to deploy all contracts first."
        );
        console.log("💡 Run: yarn deploy");
        this.debugLog("MaxExtract contract not found");
        return;
      }

      const maxExtractContract = contracts.MaxExtract;
      if (!maxExtractContract.address) {
        console.error("⚠️  MaxExtract contract address is undefined");
        this.debugLog("MaxExtract contract address is undefined");
        return;
      }

      this.debugLog(
        `Calling getActiveSectors on contract: ${maxExtractContract.address}`
      );

      const activeSectors = (await publicClient.readContract({
        address: maxExtractContract.address,
        abi: maxExtractContract.abi,
        functionName: "getActiveSectors",
      })) as bigint[];

      this.debugLog(
        `Found ${activeSectors.length} active sectors from contract`
      );

      let newSectorsAdded = false;
      for (const sectorId of activeSectors) {
        const sectorIdStr = sectorId.toString();
        if (!this.sectors.has(sectorIdStr)) {
          this.sectors.set(
            sectorIdStr,
            new Sector(sectorIdStr, undefined, this.debugMode)
          );
          console.log(`  ✅ New Sector ${sectorIdStr} initialized`);
          this.debugLog(`Created new sector: ${sectorIdStr}`);
          newSectorsAdded = true;
        }
      }

      // Only log if we found new sectors
      if (newSectorsAdded) {
        console.log(`📡 Loaded ${activeSectors.length} sectors from contract`);
      }

      this.debugLog(`Total sectors managed: ${this.sectors.size}`);
    } catch (error) {
      console.error("Error loading sectors from contract:", error);
      this.debugLog("Failed to load sectors from contract", error);
    }
  }

  private startSimulation(): void {
    this.debugLog("Starting simulation loop");

    const simulate = async () => {
      this.debugLog("Simulation tick starting...");

      // Reload sectors from contract periodically
      await this.loadSectorsFromContract();

      // Update all sectors
      let totalAsteroids = 0;
      let totalShips = 0;
      for (const [sectorId, sector] of this.sectors.entries()) {
        const snapshot = sector.getSnapshot();
        totalAsteroids += Object.keys(snapshot.asteroids).length;
        totalShips += Object.keys(snapshot.ships).length;

        this.debugLog(
          `Sector ${sectorId}: ${
            Object.keys(snapshot.asteroids).length
          } asteroids, ${Object.keys(snapshot.ships).length} ships`
        );
        sector.update();
      }

      this.debugLog(
        `Total across all sectors: ${totalAsteroids} asteroids, ${totalShips} ships`
      );

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
