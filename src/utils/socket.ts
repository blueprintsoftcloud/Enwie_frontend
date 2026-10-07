import { io, Socket } from "socket.io-client";
import { domainUrl } from "./constant";

// Strip /api suffix to get the base server URL.
// When domainUrl is a relative path (e.g. "/api" in proxy mode), fall back to
// the current page origin so socket.io connects through the Vite proxy.
const rawServer = domainUrl.replace(/\/api$/, "");
const serverUrl = rawServer.startsWith("http") ? rawServer : window.location.origin;

const socket: Socket = io(serverUrl, {
  withCredentials: true,
  autoConnect: false,
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionAttempts: 10,
  // Starts on long-polling (works through any proxy) and upgrades to WebSocket
  // when the server/proxy supports it — matches the server's config. Falls back
  // to polling automatically if the upgrade isn't possible (e.g. some
  // shared-hosting reverse proxies).
  transports: ["polling", "websocket"],
});

socket.on("connect", () => {
  console.log("✅ Socket connected:", socket.id);
});

socket.on("disconnect", (reason: string) => {
  console.log("❌ Socket disconnected:", reason);
});

export default socket;
