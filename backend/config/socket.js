const { Server } = require("socket.io");

let io;

const allowedOrigins = [
  "http://localhost:5173",
  "https://fairshare-splits.vercel.app",
];

const initializeSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: allowedOrigins,
      methods: ["GET", "POST"],
      credentials: true,
    },
    transports: ["polling", "websocket"],
  });

  io.on("connection", (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    socket.on("join-household", (householdId) => {
      if (!householdId) return;

      socket.join(`household:${householdId}`);

      console.log(
        `Socket ${socket.id} joined household ${householdId}`
      );
    });

    socket.on("join-user", (userId) => {
      if (!userId) return;

      socket.join(`user:${userId}`);

      console.log(`Socket ${socket.id} joined user room ${userId}`);
    });

    socket.on("leave-household", (householdId) => {
      if (!householdId) return;

      socket.leave(`household:${householdId}`);

      console.log(
        `Socket ${socket.id} left household ${householdId}`
      );
    });

    socket.on("disconnect", (reason) => {
      console.log(`Socket disconnected: ${socket.id}`, reason);
    });

    socket.on("connect_error", (error) => {
      console.error(`Socket error for ${socket.id}:`, error.message);
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