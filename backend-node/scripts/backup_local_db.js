import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';

const LOCAL_URI = 'mongodb://127.0.0.1:27017/presentai_db';
const BACKUP_DIR = path.resolve('./backup_local_presentai_db');

async function backupLocalDatabase() {
  console.log('Connecting to local MongoDB...');
  await mongoose.connect(LOCAL_URI);
  console.log('Connected to local MongoDB.');

  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }

  const db = mongoose.connection.db;
  if (!db) {
    throw new Error('Database connection failed.');
  }

  const collections = await db.listCollections().toArray();
  console.log(`Found ${collections.length} collections in local presentai_db:`);

  const summary = [];

  for (const collInfo of collections) {
    const collName = collInfo.name;
    const coll = db.collection(collName);
    const count = await coll.countDocuments();
    const docs = await coll.find({}).toArray();
    const indexes = await coll.indexes();

    const backupData = {
      collection: collName,
      count,
      indexes,
      documents: docs
    };

    const filePath = path.join(BACKUP_DIR, `${collName}.json`);
    fs.writeFileSync(filePath, JSON.stringify(backupData, null, 2), 'utf-8');

    console.log(`- ${collName}: ${count} documents (backup saved to ${collName}.json)`);
    summary.push({ collection: collName, count, indexesCount: indexes.length });
  }

  fs.writeFileSync(path.join(BACKUP_DIR, 'summary.json'), JSON.stringify(summary, null, 2), 'utf-8');
  console.log(`\n✅ Local database backup completed successfully in ${BACKUP_DIR}`);

  await mongoose.disconnect();
}

backupLocalDatabase().catch(err => {
  console.error('❌ Backup failed:', err.message);
  process.exit(1);
});
