const { Server } = require("socket.io");

let io;

const allowedOrigins = [
  "http://localhost:5173",
  "https://fairshare-splits.vercel.app",
  process.env.FRONTEND_URL,
].filter(Boolean);

const initializeSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: allowedOrigins,
      methods: ["GET", "POST"],
      credentials: true,
    },

    transports: ["websocket", "polling"],

    // Allow reconnection
    pingInterval: 25000,
    pingTimeout: 20000,
  });

  io.on("connection", (socket) => {
    console.log("Socket connected:", socket.id);

    socket.on("join-user", (userId) => {
      if (!userId) {
        return;
      }

      const room = `user:${userId}`;

      socket.join(room);

      console.log(`Socket ${socket.id} joined ${room}`);
    });

    socket.on("join-household", (householdId) => {
      if (!householdId) {
        return;
      }

      const room = `household:${householdId}`;

      socket.join(room);

      console.log(`Socket ${socket.id} joined ${room}`);
    });

    socket.on("leave-household", (householdId) => {
      if (!householdId) {
        return;
      }

      const room = `household:${householdId}`;

      socket.leave(room);

      console.log(`Socket ${socket.id} left ${room}`);
    });

    socket.on("disconnect", (reason) => {
      console.log(`Socket disconnected: ${socket.id}`, reason);
    });
  });

  return io;
};

const getIO = () => {
  if (!io) {
    throw new Error("Socket.IO has not been initialized");
  }

  return io;
};

module.exports = {
  initializeSocket,
  getIO,
};
