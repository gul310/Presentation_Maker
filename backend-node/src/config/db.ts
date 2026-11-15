import mongoose from "mongoose";
import fs from "fs";
import path from "path";
import { config } from "./config.js";

const LOCAL_FALLBACK_URI = "mongodb://127.0.0.1:27017/presentai_db";
let memoryServer: any = null;

const seedBackupData = async (): Promise<void> => {
  try {
    const candidateDirs = [
      path.resolve("backend-node/backup_local_presentai_db"),
      path.resolve("./backup_local_presentai_db"),
      path.resolve(__dirname, "../../backup_local_presentai_db")
    ];
    const backupDir = candidateDirs.find((d) => fs.existsSync(d));
    if (!backupDir) return;
    const db = mongoose.connection.db;
    if (!db) return;

    const files = fs.readdirSync(backupDir).filter((f) => f.endsWith(".json") && f !== "summary.json");
    for (const file of files) {
      const collName = file.replace(".json", "");
      const raw = fs.readFileSync(path.join(backupDir, file), "utf-8");
      const content = JSON.parse(raw);
      if (content.documents && Array.isArray(content.documents) && content.documents.length > 0) {
        const count = await db.collection(collName).countDocuments();
        if (count === 0) {
          await db.collection(collName).insertMany(content.documents);
          console.log(`[MongoDB] Initialized ${content.documents.length} records into "${collName}"`);
        }
      }
    }
  } catch (err: any) {
    console.warn("[MongoDB] Seed info:", err.message);
  }
};

const DIRECT_ATLAS_URI = "mongodb://zawan9624_db_user:Zubairawan04@ac-to7bemk-shard-00-00.uyyaj0o.mongodb.net:27017,ac-to7bemk-shard-00-01.uyyaj0o.mongodb.net:27017,ac-to7bemk-shard-00-02.uyyaj0o.mongodb.net:27017/projectdb?ssl=true&authSource=admin&retryWrites=true&w=majority";

export const connectDB = async (): Promise<void> => {
  const primaryUri = config.mongoUri;

  // 1. Try Primary Cloud Atlas via direct shard hosts or SRV
  try {
    const conn = await mongoose.connect(DIRECT_ATLAS_URI, {
      serverSelectionTimeoutMS: 30000,
    });
    console.log(`[MongoDB] Atlas Connected successfully (direct replica set): ${conn.connection.host}/${conn.connection.name}`);
    return;
  } catch (directErr: any) {
    console.warn(`[MongoDB] Direct shard connect note (${directErr.message}), trying primary config URI...`);
  }

  try {
    const conn = await mongoose.connect(primaryUri, {
      serverSelectionTimeoutMS: 30000,
    });
    console.log(`[MongoDB] Atlas Connected successfully: ${conn.connection.host}/${conn.connection.name}`);
    return;
  } catch (error: any) {
    console.warn(`[MongoDB] Cloud Atlas connection unreachable (${error.message}). Checking local fallbacks...`);
  }

  // 2. Try Local MongoDB service if running
  try {
    const fallbackConn = await mongoose.connect(LOCAL_FALLBACK_URI, {
      serverSelectionTimeoutMS: 1500,
    });
    console.log(`[MongoDB] Local Service connected: ${fallbackConn.connection.host}/${fallbackConn.connection.name}`);
    return;
  } catch {
    // Local service not running, proceed to instant in-memory embedded DB
  }

  // 3. Instant In-Memory MongoDB Engine (100% offline, zero-block, instant registration & login)
  try {
    console.log("[MongoDB] Launching embedded in-memory MongoDB engine...");
    const { MongoMemoryServer } = await (eval('import("mongodb-memory-server")') as Promise<any>);
    memoryServer = await MongoMemoryServer.create();
    const memoryUri = memoryServer.getUri();
    const conn = await mongoose.connect(memoryUri);
    console.log(`[MongoDB] Embedded MongoDB running at: ${memoryUri}`);
    await seedBackupData();
  } catch (memErr: any) {
    console.error("[MongoDB] Failed to start embedded engine:", memErr.message);
  }
};
