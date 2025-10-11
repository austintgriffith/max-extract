import express from "express";
import { Sector } from "../Sector";
import { EntropyManager } from "./EntropyManager";
import { WebSocketManager } from "./WebSocketManager";

export class RouteManager {
  private app: express.Application;
  private sectors: Map<string, Sector>;
  private entropyManager: EntropyManager;
  private webSocketManager: WebSocketManager;
  private debugMode: boolean;

  constructor(
    app: express.Application,
    sectors: Map<string, Sector>,
    entropyManager: EntropyManager,
    webSocketManager: WebSocketManager,
    debugMode: boolean = false
  ) {
    this.app = app;
    this.sectors = sectors;
    this.entropyManager = entropyManager;
    this.webSocketManager = webSocketManager;
    this.debugMode = debugMode;

    this.setupRoutes();
  }

  private debugLog(message: string, data?: any): void {
    if (this.debugMode) {
      const timestamp = new Date().toISOString().split("T")[1].split(".")[0];
      if (data) {
        console.log(`🛣️  [${timestamp}] ${message}:`, data);
      } else {
        console.log(`🛣️  [${timestamp}] ${message}`);
      }
    }
  }

  private setupRoutes(): void {
    // Get sector snapshot
    this.app.get("/sector/:sectorId", (req, res) => {
      const { sectorId } = req.params;

      if (!this.sectors.has(sectorId)) {
        return res.status(404).json({ error: "Sector not found" });
      }

      const sector = this.sectors.get(sectorId)!;
      const snapshot = sector.getSnapshot();

      this.debugLog(`Sector snapshot requested: ${sectorId}`);
      res.json(snapshot);
    });

    // Health check
    this.app.get("/api/health", (req, res) => {
      const wsStats = this.webSocketManager.getStats();

      res.json({
        status: "healthy",
        sectorCount: this.sectors.size,
        uptime: process.uptime(),
        websocket: {
          totalConnections: wsStats.totalConnections,
          sectorSubscriptions: wsStats.sectorSubscriptions,
        },
      });
    });

    // Get all sectors (for admin/debugging)
    this.app.get("/api/sectors", (req, res) => {
      const sectorList = Array.from(this.sectors.keys()).map((id) => {
        const sector = this.sectors.get(id)!;
        const snapshot = sector.getSnapshot();

        return {
          id,
          asteroidCount: Object.keys(snapshot.asteroids).length,
          shipCount: Object.keys(snapshot.ships).length,
          subscriberCount: sector.subscribers.size,
        };
      });

      this.debugLog(`Sectors list requested: ${sectorList.length} sectors`);
      res.json(sectorList);
    });

    // Get rolling commit-reveal status
    this.app.get("/api/entropy", (req, res) => {
      const allReveals = this.entropyManager.getAllReveals();
      const latestRound = this.entropyManager.getLatestRound();
      const currentRollingEntropy =
        this.entropyManager.getCurrentRollingEntropy();

      res.json({
        latestRound,
        revealsCount: Object.keys(allReveals).length,
        reveals: allReveals,
        currentRollingEntropy,
      });
    });

    // Get sector-specific entropy for testing
    this.app.get("/api/entropy/sector/:sectorId", (req, res) => {
      const { sectorId } = req.params;

      const currentRollingEntropy =
        this.entropyManager.getCurrentRollingEntropy();
      if (!currentRollingEntropy) {
        return res
          .status(400)
          .json({ error: "No rolling entropy available yet" });
      }

      try {
        const sectorDice = this.entropyManager.createSectorDice(sectorId);
        if (!sectorDice) {
          return res
            .status(500)
            .json({ error: "Failed to create sector dice" });
        }

        // Generate some sample rolls for demonstration
        const samples = {
          sectorId,
          rollingEntropy: currentRollingEntropy,
          sampleRolls: {
            single: sectorDice.roll(1),
            double: sectorDice.roll(2),
            quad: sectorDice.roll(4),
            percentage: sectorDice.rollPercent(),
            range1to10: sectorDice.rollBetween(1, 10),
            range1to100: sectorDice.rollBetween(1, 100),
            coinFlip: sectorDice.rollBool(),
          },
          dicePosition: sectorDice.getPosition(),
          remainingEntropy: sectorDice.getRemainingEntropy(),
        };

        this.debugLog(`Sector entropy requested: ${sectorId}`);
        res.json(samples);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    // WebSocket connection statistics
    this.app.get("/api/websocket/stats", (req, res) => {
      const stats = this.webSocketManager.getStats();
      res.json(stats);
    });

    // Server statistics
    this.app.get("/api/stats", (req, res) => {
      let totalAsteroids = 0;
      let totalShips = 0;

      for (const sector of this.sectors.values()) {
        const snapshot = sector.getSnapshot();
        totalAsteroids += Object.keys(snapshot.asteroids).length;
        totalShips += Object.keys(snapshot.ships).length;
      }

      const wsStats = this.webSocketManager.getStats();

      res.json({
        sectors: {
          total: this.sectors.size,
          totalAsteroids,
          totalShips,
        },
        websocket: wsStats,
        entropy: {
          isAvailable: this.entropyManager.getCurrentRollingEntropy() !== null,
          currentEntropy: this.entropyManager.getCurrentRollingEntropy(),
          latestRound: this.entropyManager.getLatestRound(),
        },
        server: {
          uptime: process.uptime(),
          memory: process.memoryUsage(),
        },
      });
    });
  }

  /**
   * Add custom route handlers
   */
  public addRoute(
    method: "get" | "post" | "put" | "delete",
    path: string,
    handler: express.RequestHandler
  ): void {
    this.app[method](path, handler);
    this.debugLog(`Added custom route: ${method.toUpperCase()} ${path}`);
  }

  /**
   * Add middleware
   */
  public addMiddleware(middleware: express.RequestHandler): void {
    this.app.use(middleware);
    this.debugLog("Added custom middleware");
  }
}
