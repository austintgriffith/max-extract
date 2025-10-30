import * as chains from "viem/chains";

export type BaseConfig = {
  targetNetworks: readonly chains.Chain[];
  pollingInterval: number;
  alchemyApiKey: string;
  rpcOverrides?: Record<number, string>;
  walletConnectProjectId: string;
  onlyLocalBurnerWallet: boolean;
  gameServerHost: string;
  gameServerMethod: "http_ws" | "https_wss";
};

export type ScaffoldConfig = BaseConfig;

export const DEFAULT_ALCHEMY_API_KEY = "oKxs-03sij-U_N0iOlrSsZFr29-IqbuF";

const scaffoldConfig = {
  // The networks on which your DApp is live
  targetNetworks: [chains.arbitrum],
  // The interval at which your front-end polls the RPC servers for new data (it has no effect if you only target the local network (default is 4000))
  pollingInterval: 3000,
  // This is ours Alchemy's default API key.
  // You can get your own at https://dashboard.alchemyapi.io
  // It's recommended to store it in an env variable:
  // .env.local for local testing, and in the Vercel/system env config for live apps.
  alchemyApiKey: process.env.NEXT_PUBLIC_ALCHEMY_API_KEY || DEFAULT_ALCHEMY_API_KEY,
  // If you want to use a different RPC for a specific network, you can add it here.
  // The key is the chain ID, and the value is the HTTP RPC URL
  rpcOverrides: {
    // Example:
    // [chains.mainnet.id]: "https://mainnet.buidlguidl.com",
  },
  // This is ours WalletConnect's default project ID.
  // You can get your own at https://cloud.walletconnect.com
  // It's recommended to store it in an env variable:
  // .env.local for local testing, and in the Vercel/system env config for live apps.
  walletConnectProjectId: process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID || "3a8170812b534d0ff9d794f19a901d64",
  onlyLocalBurnerWallet: false,
  // Game server host for backend API and WebSocket connections
  // You can configure it in an env variable:
  // .env.local for local testing, and in the Vercel/system env config for live apps.
  gameServerHost:
    process.env.NEXT_PUBLIC_GAME_SERVER_HOST ||
    (process.env.NODE_ENV === "production" || process.env.VERCEL ? "backend.extract.fi" : "localhost:8000"),
  // Game server connection method (http_ws for local, https_wss for production with SSL)
  gameServerMethod:
    (process.env.NEXT_PUBLIC_GAME_SERVER_METHOD as "http_ws" | "https_wss") ||
    (process.env.NODE_ENV === "production" || process.env.VERCEL ? "https_wss" : "http_ws"),
} as const satisfies ScaffoldConfig;

export default scaffoldConfig;
