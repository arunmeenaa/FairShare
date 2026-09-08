import { io } from "socket.io-client";

const apiUrl =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const socketUrl = apiUrl.replace(/\/api\/?$/, "");

const socket = io(socketUrl, {
  autoConnect: false,
  withCredentials: true,
  transports: ["polling", "websocket"],
});

export default socket;