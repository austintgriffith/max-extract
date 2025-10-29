import scaffoldConfig from "~~/scaffold.config";

/**
 * Get the HTTP URL for the game server
 * @returns Full HTTP URL (e.g., "http://localhost:8000")
 */
export const getGameServerHttpUrl = (): string => {
  return `http://${scaffoldConfig.gameServerHost}`;
};

/**
 * Get the WebSocket URL for the game server
 * @returns Full WebSocket URL (e.g., "ws://localhost:8000")
 */
export const getGameServerWsUrl = (): string => {
  return `ws://${scaffoldConfig.gameServerHost}`;
};
