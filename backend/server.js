const express = require("express");
require("dotenv").config();

const cookieParser = require("cookie-parser");
const cors = require("cors");
const http = require("http");

// Routes
const authRoutes = require("./routes/auth.routes");
const householdRoutes = require("./routes/household.routes");
const expenseRoutes = require("./routes/expense.routes");
const settlementRoutes = require("./routes/settlement.routes");
const reportRoutes = require("./routes/report.routes");
const availabilityRoutes = require("./routes/availability.routes");
const notificationRoutes = require("./routes/notification.routes");
const profileRoutes = require("./routes/profile.routes");
const emailRoutes = require("./routes/email.routes");

// Socket
const { initializeSocket } = require("./config/socket");

// Jobs
const {
  startWeeklySettlementEmailJob,
} = require("./jobs/weeklySettlementEmail.job");

// Database
const db = require("./config/db");

const app = express();
const server = http.createServer(app);

const allowedOrigins = [
  "http://localhost:5173",
  "https://fairshare-splits.vercel.app",
  process.env.FRONTEND_URL,
].filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) {
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    console.log("Blocked CORS origin:", origin);

    return callback(new Error("Not allowed by CORS"));
  },

  credentials: true,

  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],

  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));

app.use(express.json());
app.use(cookieParser());

initializeSocket(server);

db.connect();

startWeeklySettlementEmailJob();

app.get("/", (req, res) => {
  res.send("Welcome to the FairShare API");
});

app.use("/api/auth", authRoutes);

app.use("/api/households", householdRoutes);

app.use("/api/users/availability", availabilityRoutes);

app.use("/api/expenses", expenseRoutes);

app.use("/api/settlements", settlementRoutes);

app.use("/api/reports", reportRoutes);

app.use("/api/notifications", notificationRoutes);

app.use("/api/email", emailRoutes);

app.use("/api/profile", profileRoutes);

const port = process.env.PORT || 5000;

server.listen(port, () => {
  console.log(`Server running on port ${port}`);

  console.log("Allowed CORS origins:", allowedOrigins);
});
