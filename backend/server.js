const express = require("express");
require("dotenv").config();
const cookieParser = require("cookie-parser");
const cors = require("cors");
const http = require("http");

const authRoutes = require("./routes/auth.routes");
const householdRoutes = require("./routes/household.routes");
const expenseRoutes = require("./routes/expense.routes");
const settlementRoutes = require("./routes/settlement.routes");
const reportRoutes = require("./routes/report.routes");
const availabilityRoutes = require("./routes/availability.routes");
const notificationRoutes = require("./routes/notification.routes");
const profileRoutes = require("./routes/profile.routes");
const emailRoutes = require("./routes/email.routes");

const { initializeSocket } = require("./config/socket");
const {
  startWeeklySettlementEmailJob,
} = require("./jobs/weeklySettlementEmail.job");

const db = require("./config/db");
const app = express();
app.use(express.json());
app.use(cookieParser());
const server = http.createServer(app);

initializeSocket(server);

const allowedOrigins = [
  "http://localhost:5173",
  "https://fairshare-splits.vercel.app",
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  }),
);

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
});
