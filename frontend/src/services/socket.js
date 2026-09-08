import { io } from "socket.io-client";

const apiUrl =
  import.meta.env.VITE_API_URL ||
  "http://localhost:5000/api";

const socketUrl = apiUrl.replace(
  /\/api\/?$/,
  "",
);

const socket = io(socketUrl, {
  autoConnect: false,

  withCredentials: true,

  transports: ["websocket", "polling"],

  reconnection: true,

  reconnectionAttempts: Infinity,

  reconnectionDelay: 1000,

  reconnectionDelayMax: 5000,
});

export default socket;