import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure .env is discovered whether executed from root or backend-node directory
const candidateEnvPaths = [
  path.resolve(__dirname, "../../.env"), // e.g. dist/config/../../.env -> backend-node/.env
  path.resolve(__dirname, "../.env"),
  path.resolve(process.cwd(), "backend-node/.env"),
  path.resolve(process.cwd(), ".env"),
];

for (const envPath of candidateEnvPaths) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
  }
}

export const config = {
  port: process.env.PORT ? parseInt(process.env.PORT, 10) : 5000,
  nodeEnv: process.env.NODE_ENV || "development",
  mongoUri: process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/presentai_db",
  jwtSecret: process.env.JWT_SECRET || process.env.JWT_SECRET_KEY || "presentai_dev_secret_key_change_me_in_prod_9988776655",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  corsOrigins: (process.env.CORS_ORIGIN || "http://localhost:5173,http://127.0.0.1:5173").split(",").map(s => s.trim()),
  pythonAiServiceUrl: process.env.PYTHON_AI_SERVICE_URL || "http://127.0.0.1:8002",
  maxGuestGenerations: process.env.MAX_GUEST_GENERATIONS ? parseInt(process.env.MAX_GUEST_GENERATIONS, 10) : 2,
  unsplashAccessKey: (process.env.UNSPLASH_ACCESS_KEY || "").trim(),
  unsplashSecretKey: (process.env.UNSPLASH_SECRET_KEY || "").trim()
};
