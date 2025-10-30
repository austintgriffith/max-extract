import scaffoldConfig from "~~/scaffold.config";

/**
 * Get the HTTP URL for the game server
 * Uses the gameServerMethod from config to determine protocol:
 * - http_ws -> http://
 * - https_wss -> https://
 * @returns Full HTTP URL (e.g., "http://localhost:8000" or "https://backend.extract.fi:8000")
 */
export const getGameServerHttpUrl = (): string => {
  const host = scaffoldConfig.gameServerHost;
  const method = scaffoldConfig.gameServerMethod;

  const protocol = method === "https_wss" ? "https" : "http";
  return `${protocol}://${host}`;
};

/**
 * Get the WebSocket URL for the game server
 * Uses the gameServerMethod from config to determine protocol:
 * - http_ws -> ws://
 * - https_wss -> wss://
 * @returns Full WebSocket URL (e.g., "ws://localhost:8000" or "wss://backend.extract.fi:8000")
 */
export const getGameServerWsUrl = (): string => {
  const host = scaffoldConfig.gameServerHost;
  const method = scaffoldConfig.gameServerMethod;

  const protocol = method === "https_wss" ? "wss" : "ws";
  return `${protocol}://${host}`;
};
