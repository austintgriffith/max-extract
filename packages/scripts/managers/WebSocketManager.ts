import { WebSocketServer, WebSocket } from "ws";
import { Server } from "http";
import { Sector } from "../Sector";

export interface WebSocketMessage {
  type: string;
  sectorId?: string;
  shipId?: string;
  asteroidId?: string;
  targetShipId?: string;
  position?: any;
  velocity?: any;
}

export class WebSocketManager {
  private wss: WebSocketServer;
  private sectors: Map<string, Sector>;
  private debugMode: boolean;

  constructor(
    server: Server,
    sectors: Map<string, Sector>,
    debugMode: boolean = false
  ) {
    this.sectors = sectors;
    this.debugMode = debugMode;

    this.wss = new WebSocketServer({
      server: server,
      verifyClient: (info: any) => {
        // Allow all origins for development
        return true;
      },
    });

    this.setupWebSocket();
  }

  private debugLog(message: string, data?: any): void {
    if (this.debugMode) {
      const timestamp = new Date().toISOString().split("T")[1].split(".")[0];
      if (data) {
        console.log(`🔌 [${timestamp}] ${message}:`, data);
      } else {
        console.log(`🔌 [${timestamp}] ${message}`);
      }
    }
  }

  private setupWebSocket(): void {
    this.wss.on("connection", (ws, req) => {
      this.debugLog("WebSocket connection established");

      ws.on("message", (message) => {
        try {
          const data: WebSocketMessage = JSON.parse(message.toString());
          this.handleMessage(ws, data);
        } catch (error) {
          console.error("WebSocket message error:", error);
          this.sendError(ws, "Invalid message format");
        }
      });

      ws.on("close", () => {
        this.handleDisconnection(ws);
        this.debugLog("WebSocket connection closed");
      });

      ws.on("error", (error) => {
        console.error("WebSocket error:", error);
      });
    });
  }

  private handleMessage(ws: WebSocket, data: WebSocketMessage): void {
    switch (data.type) {
      case "subscribe":
        this.handleSubscription(ws, data);
        break;
      case "ship_vector_matched":
        this.handleVectorMatching(ws, data);
        break;
      default:
        this.sendError(ws, `Unknown message type: ${data.type}`);
    }
  }

  private handleSubscription(ws: WebSocket, data: WebSocketMessage): void {
    if (!data.sectorId) {
      return this.sendError(ws, "sectorId is required for subscription");
    }

    if (!this.sectors.has(data.sectorId)) {
      return this.sendError(ws, "Sector not found");
    }

    const sector = this.sectors.get(data.sectorId)!;
    sector.addSubscriber(ws);

    this.sendMessage(ws, {
      type: "subscribed",
      sectorId: data.sectorId,
      timestamp: Date.now(),
    });

    this.debugLog(`Client subscribed to sector: ${data.sectorId}`);
  }

  private handleVectorMatching(ws: WebSocket, data: WebSocketMessage): void {
    if (!data.sectorId || !data.shipId) {
      return this.sendError(
        ws,
        "sectorId and shipId are required for vector matching"
      );
    }

    const sector = this.sectors.get(data.sectorId);
    if (!sector) {
      return this.sendError(ws, "Sector not found");
    }

    const targetType = data.targetShipId ? "ship" : "asteroid";
    const targetId = data.targetShipId || data.asteroidId;

    if (!targetId) {
      return this.sendError(
        ws,
        "Either asteroidId or targetShipId is required"
      );
    }

    sector.handleVectorMatching(
      data.shipId,
      targetId,
      data.position,
      data.velocity,
      targetType
    );

    this.debugLog(
      `Vector matching handled for ship ${data.shipId} -> ${targetType} ${targetId}`
    );
  }

  private handleDisconnection(ws: WebSocket): void {
    // Remove subscriber from all sectors
    for (const sector of this.sectors.values()) {
      sector.removeSubscriber(ws);
    }
  }

  private sendMessage(ws: WebSocket, message: any): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  private sendError(ws: WebSocket, message: string): void {
    this.sendMessage(ws, {
      type: "error",
      message: message,
    });
  }

  /**
   * Broadcast a message to all connected clients in a specific sector
   */
  public broadcastToSector(sectorId: string, message: any): void {
    const sector = this.sectors.get(sectorId);
    if (sector) {
      // The sector handles its own broadcasting to subscribers
      // This method is here for future extensibility
      this.debugLog(`Broadcasting to sector ${sectorId}`, message);
    }
  }

  /**
   * Get the number of connected clients
   */
  public getConnectionCount(): number {
    return this.wss.clients.size;
  }

  /**
   * Get connection statistics
   */
  public getStats(): {
    totalConnections: number;
    sectorSubscriptions: { [sectorId: string]: number };
  } {
    const sectorSubscriptions: { [sectorId: string]: number } = {};

    for (const [sectorId, sector] of this.sectors.entries()) {
      sectorSubscriptions[sectorId] = sector.subscribers.size;
    }

    return {
      totalConnections: this.wss.clients.size,
      sectorSubscriptions,
    };
  }

  /**
   * Close all connections and cleanup
   */
  public close(): void {
    this.wss.close();
    this.debugLog("WebSocket server closed");
  }
}
