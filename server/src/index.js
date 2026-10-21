import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import { errorHandler } from "./middleware/errorHandler.js";
import authRoutes from "./routes/authRoutes.js";
import projectsRoutes from "./routes/projectsRoutes.js";
import modelsRoutes from "./routes/modelsRoutes.js";
import datasetsRoutes from "./routes/datasetsRoutes.js";
import optimizationRoutes from "./routes/optimizationRoutes.js";
import resultsRoutes from "./routes/resultsRoutes.js";
import historyRoutes from "./routes/historyRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import { failInterruptedRuns } from "./services/runService.js";

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(
  cors({
    origin: ["http://localhost:5173", "https://optimum-finance.vercel.app"],
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  }),
);

app.use(express.json());

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/projects", projectsRoutes);
app.use("/api", modelsRoutes); //to make match the route for modelsRoutes, we can use /api as the base path
app.use("/api", datasetsRoutes); //to make match the route for datasetsRoutes, we can use /api as the base path
app.use("/api", optimizationRoutes);
app.use("/api", resultsRoutes);
app.use("/api", historyRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/dashboard", dashboardRoutes);

// GET /  Root Route
app.get("/", (req, res) => {
  res.json({ message: "Optimum API is running successfully!" });
});

// GET /api/health
app.get("/api/health", (req, res) => {
  res.json({ ok: true, message: "Optimum API is running" });
});

// 404 Route Not Found Handler
app.use((req, res) => {
  res.status(404).json({ ok: false, message: "Route not found" });
});

// Global Error Handler (Must be registered last)
app.use(errorHandler);

// Start Server
app.listen(PORT, async () => {
  console.log(`Optimum API listening on http://localhost:${PORT}`);
  try {
    await failInterruptedRuns();
  } catch (err) {
    console.error("Startup database check failed:", err.message);
  }
});
