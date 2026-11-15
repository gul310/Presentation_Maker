import express from "express";
import cors from "cors";
import path from "path";
import mongoose from "mongoose";
import { config } from "./config/config.js";
import { connectDB } from "./config/db.js";
import { authenticate } from "./middleware/auth.js";
import { ensureAdminAndSettings } from "./services/adminSeed.js";

import authRoutes from "./routes/auth.routes.js";
import userRoutes from "./routes/user.routes.js";
import guestRoutes from "./routes/guest.routes.js";
import presentationRoutes from "./routes/presentation.routes.js";
import publicRoutes from "./routes/public.routes.js";
import ratingRoutes from "./routes/rating.routes.js";
import reviewRoutes from "./routes/review.routes.js";
import templateRoutes from "./routes/template.routes.js";
import subscriptionRoutes from "./routes/subscription.routes.js";
import marketplaceRoutes from "./routes/marketplace.routes.js";
import practiceRoutes from "./routes/practice.routes.js";
import aiRoutes from "./routes/ai.routes.js";
import imageRoutes from "./routes/image.routes.js";
import adminRoutes from "./routes/admin.routes.js";

const app = express();

// Security Headers Middleware (OWASP Recommendation)
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.removeHeader("X-Powered-By");
  next();
});

// Login Rate Limiting (In-Memory IP Limiter for Brute-Force Prevention)
const loginAttempts = new Map<string, { count: number; resetAt: number }>();
app.use("/api/auth/login", (req, res, next) => {
  if (req.method !== "POST") return next();
  const ip = req.ip || req.socket.remoteAddress || "unknown_ip";
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute
  const maxAttempts = 30; // 30 attempts per minute per IP

  const record = loginAttempts.get(ip);
  if (!record || now > record.resetAt) {
    loginAttempts.set(ip, { count: 1, resetAt: now + windowMs });
    return next();
  }

  record.count += 1;
  if (record.count > maxAttempts) {
    res.status(429).json({
      detail: "Too many login attempts. Please wait one minute before trying again."
    });
    return;
  }
  next();
});

// Global Middleware
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl) or any localhost/dev origin
    if (!origin || origin.includes("localhost") || origin.includes("127.0.0.1") || config.corsOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(null, true); // Permissive in dev
    }
  },
  credentials: true,
  exposedHeaders: ["Content-Disposition", "Content-Type"]
}));

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Static uploads directory for screenshots and marketplace assets
app.use("/uploads", express.static(path.resolve(process.cwd(), "uploads")));

// Context Authentication Middleware
app.use(authenticate);

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/guest", guestRoutes);
app.use("/api/presentations", presentationRoutes);
app.use("/api/public", publicRoutes);
app.use("/api/ratings", ratingRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/templates", templateRoutes);
app.use("/api/subscriptions", subscriptionRoutes);
app.use("/api/marketplace", marketplaceRoutes);
app.use("/api/practice", practiceRoutes);
app.use("/api/images", imageRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api", imageRoutes);
app.use("/api", aiRoutes);
app.use("/api/ai", aiRoutes);

// Health check
app.get(["/health", "/api/health"], (req, res) => {
  res.json({
    status: "ok",
    service: "PresentAI Node.js Backend Gateway",
    timestamp: new Date().toISOString(),
    database: "MongoDB"
  });
});

app.get("/", (req, res) => {
  res.json({
    message: "Welcome to PresentAI Node.js API Gateway",
    health: "/api/health",
    docs: "/api/docs"
  });
});

// Centralized Express Error Handling Middleware (Part 14)
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(`[Server Error] ${req.method} ${req.url}:`, err);
  const status = err.status || err.statusCode || 500;
  res.status(status).json({
    detail: err.message || "An unexpected internal server error occurred."
  });
});

// Start Server with Graceful Shutdown (Sections 14 & 15)
const start = async () => {
  await connectDB();
  await ensureAdminAndSettings();
  const server = app.listen(config.port, () => {
    console.log(`[PresentAI Backend] Gateway running on http://localhost:${config.port}`);
  });

  const gracefulShutdown = async (signal: string) => {
    console.log(`\n[PresentAI Backend] Received ${signal}. Starting graceful shutdown...`);
    server.close(async () => {
      console.log("[PresentAI Backend] HTTP server closed.");
      try {
        await mongoose.disconnect();
        console.log("[PresentAI Backend] MongoDB connection closed.");
      } catch (err) {
        console.error("[PresentAI Backend] Error disconnecting MongoDB:", err);
      }
      process.exit(0);
    });
  };

  process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
  process.on("SIGINT", () => gracefulShutdown("SIGINT"));
};

start();
