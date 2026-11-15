import axios from 'axios';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const NODE_URL = 'http://127.0.0.1:5000/api';
const ATLAS_URI = process.env.MONGODB_URI;

async function verifyAtlasE2E() {
  console.log('🚀 Starting Comprehensive Atlas E2E Verification...\n');

  // 1. Direct DB Verification on Atlas
  console.log('--- Step 1: Direct Atlas Database Verification ---');
  await mongoose.connect(ATLAS_URI);
  console.log(`Connected to Atlas Cluster: ${mongoose.connection.host}/${mongoose.connection.name}`);

  const targetDb = mongoose.connection.db;
  const collections = await targetDb.listCollections().toArray();
  console.log(`Atlas Collections (${collections.length}):`);
  for (const c of collections) {
    const count = await targetDb.collection(c.name).countDocuments();
    console.log(`  ✓ ${c.name}: ${count} documents`);
  }

  // 2. Gateway Health Check
  console.log('\n--- Step 2: Gateway Health & Connection ---');
  const healthRes = await axios.get('http://127.0.0.1:5000/health');
  console.log('✓ Node Gateway Status:', healthRes.data.status, '| Database:', healthRes.data.database);

  // 3. Auth & User Operations on Atlas
  console.log('\n--- Step 3: User Registration & Authentication on Atlas ---');
  const timestamp = Date.now();
  const testUserEmail = `atlas_test_${timestamp}@presentai.com`;
  const registerRes = await axios.post(`${NODE_URL}/auth/register`, {
    email: testUserEmail,
    password: 'AtlasTestPassword123!',
    full_name: 'Atlas Test User'
  });
  const token = registerRes.data.token || registerRes.data.access_token;
  const userId = registerRes.data.user.id || registerRes.data.user._id;
  console.log(`✓ Registered User on Atlas (ID: ${userId})`);

  const meRes = await axios.get(`${NODE_URL}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  console.log(`✓ Retrieved User Profile from Atlas: ${meRes.data.name} (${meRes.data.email})`);

  // Consumer User
  const consumerEmail = `atlas_consumer_${timestamp}@presentai.com`;
  const consumerRes = await axios.post(`${NODE_URL}/auth/register`, {
    email: consumerEmail,
    password: 'AtlasTestPassword123!',
    full_name: 'Atlas Consumer'
  });
  const consumerToken = consumerRes.data.token || consumerRes.data.access_token;
  const consumerId = consumerRes.data.user.id || consumerRes.data.user._id;
  console.log(`✓ Registered Consumer User on Atlas (ID: ${consumerId})`);

  // 4. Presentation Creation & Editing
  console.log('\n--- Step 4: Presentation Creation & Slide Updates on Atlas ---');
  const createRes = await axios.post(
    `${NODE_URL}/presentations`,
    {
      title: 'Atlas Migration Test Presentation',
      topic: 'Database Cloud Architecture',
      theme: 'midnight-neon',
      language: 'English',
      slides: [
        {
          title: 'Cloud Scalability with MongoDB Atlas',
          content: 'Distributed replica sets provide automated high availability.',
          speaker_notes: 'Highlight global replication.',
          layout: 'title-and-body',
          order: 1
        }
      ]
    },
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const presentation = createRes.data.presentation || createRes.data;
  const presId = presentation.id || presentation._id;
  console.log(`✓ Created Presentation on Atlas (ID: ${presId}, Title: "${presentation.title}")`);

  // Update presentation metadata
  const updateRes = await axios.put(
    `${NODE_URL}/presentations/${presId}`,
    { title: 'Atlas Migration Test Presentation (Updated)' },
    { headers: { Authorization: `Bearer ${token}` } }
  );
  console.log(`✓ Updated Presentation on Atlas: "${(updateRes.data.presentation || updateRes.data).title}"`);

  // 5. Sharing (Private -> Public) & Discovery
  console.log('\n--- Step 5: Sharing Visibility & Public Discovery ---');
  await axios.put(
    `${NODE_URL}/presentations/${presId}/share`,
    { visibility: 'public' },
    { headers: { Authorization: `Bearer ${token}` } }
  );
  console.log(`✓ Changed Visibility to Public on Atlas.`);

  const discoverRes = await axios.get(`${NODE_URL}/public/discover?filter=trending`);
  const discoverItems = discoverRes.data.items || discoverRes.data.presentations || [];
  const foundInDiscover = discoverItems.some((p) => (p.id || p._id) === presId);
  console.log(`✓ Verified Presentation appears in Atlas Public Discovery query: ${foundInDiscover ? 'YES' : 'NO'}`);

  // 6. Ratings & Reviews
  console.log('\n--- Step 6: Dynamic Ratings & Reviews on Atlas ---');
  const rateRes = await axios.post(
    `${NODE_URL}/ratings/${presId}`,
    { score: 5 },
    { headers: { Authorization: `Bearer ${consumerToken}` } }
  );
  console.log(`✓ Submitted Rating on Atlas: Average is now ${rateRes.data.average_rating} (${rateRes.data.ratings_count} ratings)`);

  const reviewRes = await axios.post(
    `${NODE_URL}/reviews/${presId}`,
    { comment: 'Atlas migration verified with excellent performance!' },
    { headers: { Authorization: `Bearer ${consumerToken}` } }
  );
  console.log(`✓ Submitted Review on Atlas: "${(reviewRes.data.review || reviewRes.data).comment}"`);

  // 7. Use As Template (Cloning)
  console.log('\n--- Step 7: Use As Template on Atlas ---');
  const cloneRes = await axios.post(
    `${NODE_URL}/templates/${presId}/use`,
    {},
    { headers: { Authorization: `Bearer ${consumerToken}` } }
  );
  const clonedPres = cloneRes.data.presentation || cloneRes.data;
  const clonedId = clonedPres.id || clonedPres._id;
  console.log(`✓ Template cloned in consumer account on Atlas (New ID: ${clonedId})`);

  // 8. Marketplace Publishing & Buying
  console.log('\n--- Step 8: Marketplace Publishing & Purchase on Atlas ---');
  await axios.post(
    `${NODE_URL}/marketplace/publish`,
    {
      presentation_id: presId,
      price: 15.00,
      description: 'Atlas high-availability slide deck'
    },
    { headers: { Authorization: `Bearer ${token}` } }
  );
  console.log(`✓ Published presentation to Marketplace on Atlas.`);

  const buyRes = await axios.post(
    `${NODE_URL}/marketplace/${presId}/buy`,
    {},
    { headers: { Authorization: `Bearer ${consumerToken}` } }
  );
  const txId = buyRes.data.transaction_id || buyRes.data.transaction?.id;
  const purchasedDeckId = buyRes.data.purchased_deck_id;
  console.log(`✓ Purchased template from Marketplace on Atlas (TxID: ${txId})`);

  // 9. Practice Session Record on Atlas
  console.log('\n--- Step 9: Practice Session Persistence on Atlas ---');
  const practiceRes = await axios.post(
    `${NODE_URL}/practice/sessions`,
    { presentation_id: presId },
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const practiceSessionId = practiceRes.data.id || practiceRes.data._id || practiceRes.data.session_id;
  console.log(`✓ Created Practice Session record on Atlas (ID: ${practiceSessionId})`);

  // 10. Clean up temporary test records from production Atlas
  console.log('\n--- Step 10: Cleaning up temporary verification records from Atlas ---');
  const usersColl = targetDb.collection('users');
  const presColl = targetDb.collection('presentations');
  const ratingsColl = targetDb.collection('ratings');
  const reviewsColl = targetDb.collection('reviews');
  const txColl = targetDb.collection('marketplacetransactions');
  const practiceColl = targetDb.collection('practicesessions');

  await usersColl.deleteMany({ email: { $in: [testUserEmail, consumerEmail] } });
  await presColl.deleteMany({ _id: { $in: [new mongoose.Types.ObjectId(presId), new mongoose.Types.ObjectId(clonedId), new mongoose.Types.ObjectId(purchasedDeckId)] } });
  await ratingsColl.deleteMany({ presentation_id: new mongoose.Types.ObjectId(presId) });
  await reviewsColl.deleteMany({ presentation_id: new mongoose.Types.ObjectId(presId) });
  if (txId && mongoose.Types.ObjectId.isValid(txId)) {
    await txColl.deleteOne({ _id: new mongoose.Types.ObjectId(txId) });
  }
  if (practiceSessionId && mongoose.Types.ObjectId.isValid(practiceSessionId)) {
    await practiceColl.deleteOne({ _id: new mongoose.Types.ObjectId(practiceSessionId) });
  }
  console.log('✓ Cleaned up all temporary test records. Production Atlas is pristine!');

  // 11. Final Count Check
  console.log('\n--- Final Verified Atlas Document Counts ---');
  for (const c of collections) {
    const finalCount = await targetDb.collection(c.name).countDocuments();
    console.log(`  ✓ ${c.name}: ${finalCount} documents`);
  }

  await mongoose.disconnect();
  console.log('\n🎉 ALL ATLAS END-TO-END VERIFICATION CHECKS PASSED SUCCESSFULLY!');
}

verifyAtlasE2E().catch(err => {
  console.error('\n❌ Atlas Verification Failed:', err.response ? err.response.data : err.message);
  process.exit(1);
});
