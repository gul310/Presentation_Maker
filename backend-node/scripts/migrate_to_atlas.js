import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';

const BACKUP_DIR = path.resolve('./backup_local_presentai_db');

function castDocTypes(doc) {
  if (!doc || typeof doc !== 'object') return doc;

  if (Array.isArray(doc)) {
    return doc.map(castDocTypes);
  }

  const newDoc = {};
  for (const [key, value] of Object.entries(doc)) {
    if (value === null || value === undefined) {
      newDoc[key] = value;
    } else if (typeof value === 'string' && /^[0-9a-fA-F]{24}$/.test(value) && (key === '_id' || key.endsWith('_id') || key.endsWith('Id'))) {
      newDoc[key] = new mongoose.Types.ObjectId(value);
    } else if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value) && (key.endsWith('_at') || key.endsWith('Date') || key === 'renews_at' || key === 'published_at')) {
      newDoc[key] = new Date(value);
    } else if (typeof value === 'object') {
      newDoc[key] = castDocTypes(value);
    } else {
      newDoc[key] = value;
    }
  }
  return newDoc;
}

export async function migrateDataToAtlas(atlasUri) {
  if (!atlasUri) {
    throw new Error('Atlas URI is required for migration.');
  }

  console.log('Connecting to MongoDB Atlas Cluster0...');
  const conn = await mongoose.connect(atlasUri);
  console.log(`Connected to Atlas: ${conn.connection.host}/${conn.connection.name}`);

  const targetDb = mongoose.connection.db;
  if (!targetDb) {
    throw new Error('Atlas DB connection failed.');
  }

  if (!fs.existsSync(BACKUP_DIR)) {
    throw new Error(`Backup directory not found at ${BACKUP_DIR}. Please run backup first.`);
  }

  const summaryFile = path.join(BACKUP_DIR, 'summary.json');
  if (!fs.existsSync(summaryFile)) {
    throw new Error('Backup summary.json not found.');
  }

  const summary = JSON.parse(fs.readFileSync(summaryFile, 'utf-8'));
  const results = [];

  for (const item of summary) {
    const collName = item.collection;
    const backupFile = path.join(BACKUP_DIR, `${collName}.json`);
    if (!fs.existsSync(backupFile)) {
      console.warn(`Warning: ${backupFile} not found, skipping.`);
      continue;
    }

    const backupContent = JSON.parse(fs.readFileSync(backupFile, 'utf-8'));
    const rawDocs = backupContent.documents || [];
    const targetColl = targetDb.collection(collName);

    console.log(`\nMigrating collection "${collName}" (${rawDocs.length} documents)...`);

    if (rawDocs.length > 0) {
      const typedDocs = rawDocs.map(castDocTypes);

      // Perform bulk upsert to preserve exact _id and prevent duplicates
      const operations = typedDocs.map(doc => ({
        replaceOne: {
          filter: { _id: doc._id },
          replacement: doc,
          upsert: true
        }
      }));

      const bulkRes = await targetColl.bulkWrite(operations);
      console.log(`- ${collName}: Matched ${bulkRes.matchedCount}, Upserted ${bulkRes.upsertedCount}, Modified ${bulkRes.modifiedCount}`);
    }

    // Recreate custom indexes (excluding default _id index)
    const indexes = backupContent.indexes || [];
    for (const idx of indexes) {
      if (idx.name === '_id_') continue;
      try {
        const { key, name, unique, sparse, background } = idx;
        const options = { name };
        if (unique) options.unique = true;
        if (sparse) options.sparse = true;
        if (background) options.background = true;

        await targetColl.createIndex(key, options);
        console.log(`- Created index "${name}" on ${collName}`);
      } catch (idxErr) {
        console.warn(`- Index creation notice for "${idx.name}":`, idxErr.message);
      }
    }

    const finalCount = await targetColl.countDocuments();
    results.push({
      collection: collName,
      sourceCount: rawDocs.length,
      atlasCount: finalCount
    });
  }

  console.log('\n--- Migration Summary ---');
  for (const res of results) {
    console.log(`Collection "${res.collection}": Source=${res.sourceCount} -> Atlas=${res.atlasCount}`);
  }

  await mongoose.disconnect();
  return results;
}

// If run directly from CLI
import dotenv from 'dotenv';
dotenv.config();

const targetUri = process.argv[2] || process.env.MONGODB_URI;
migrateDataToAtlas(targetUri)
  .then(() => {
    console.log('\n✅ Data migration to Atlas completed successfully!');
    process.exit(0);
  })
  .catch(err => {
    console.error('\n❌ Data migration failed:', err.message);
    process.exit(1);
  });
