const { Server } = require("socket.io");

let io;

const initializeSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: "http://localhost:5173",
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    socket.on("join-household", (householdId) => {
      socket.join(`household:${householdId}`);

      console.log(`Socket ${socket.id} joined household ${householdId}`);
    });
    socket.on("join-user", (userId) => {
      socket.join(`user:${userId}`);

      console.log(`Socket ${socket.id} joined user room ${userId}`);
    });
    socket.on("leave-household", (householdId) => {
      socket.leave(`household:${householdId}`);

      console.log(`Socket ${socket.id} left household ${householdId}`);
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
