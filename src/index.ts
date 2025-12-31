import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import mongoose from "mongoose";
import path from "path";
import adminRoutes from "./routes/adminRoutes";
import campaignRoutes from "./routes/campaignRoutes";
import ngoRoutes from "./routes/ngoRoutes";
import paymentRoutes from "./routes/paymentRoutes";
import userRoutes from "./routes/userRoutes";
// Load environment variables
dotenv.config();

const app = express();
const v1Router = express.Router();
const port = process.env.PORT || 5001;
const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/givetoafrica";

// Middleware
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// Routes
v1Router.use("/users", userRoutes);
v1Router.use("/ngos", ngoRoutes);
v1Router.use("/campaigns", campaignRoutes);
v1Router.use("/payment", paymentRoutes);
v1Router.use("/admin", adminRoutes);

// API routes
app.use("/api/v1", v1Router);

app.get("/ping", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Server running successfully.",
  });
});

app.get("/server", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Server running successfully at /server endpoint.",
  });
});

// Connect to MongoDB
mongoose
  .connect(MONGODB_URI)
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("MongoDB connection error:", err));

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
