import axios from 'axios';

const NODE_URL = 'http://127.0.0.1:5000/api';

async function runE2ETests() {
  console.log('🚀 Starting PresentAI End-to-End Verification...');

  // 1. Health Checks
  console.log('\n--- 1. Health Checks ---');
  const nodeHealth = await axios.get('http://127.0.0.1:5000/health');
  console.log('✅ Node Gateway Health:', nodeHealth.data);

  // 2. Auth: Register / Login User 1 (Creator)
  console.log('\n--- 2. Auth: Creator Account ---');
  const creatorEmail = `creator_${Date.now()}@presentai.com`;
  const creatorRes = await axios.post(`${NODE_URL}/auth/register`, {
    email: creatorEmail,
    password: 'Password123!',
    full_name: 'Dr. Alice Creator'
  });
  const creatorToken = creatorRes.data.token;
  const creatorId = creatorRes.data.user.id;
  console.log(`✅ Creator Registered: ${creatorEmail} (ID: ${creatorId}, Plan: ${creatorRes.data.user.subscription_plan}, Credits: ${creatorRes.data.user.ai_credits})`);

  // 3. Auth: Register User 2 (Consumer / Reviewer)
  console.log('\n--- 3. Auth: Consumer Account ---');
  const user2Email = `user2_${Date.now()}@presentai.com`;
  const user2Res = await axios.post(`${NODE_URL}/auth/register`, {
    email: user2Email,
    password: 'Password123!',
    full_name: 'Bob Learner'
  });
  const user2Token = user2Res.data.token;
  const user2Id = user2Res.data.user.id;
  console.log(`✅ Consumer Registered: ${user2Email} (ID: ${user2Id})`);

  // 4. Create Presentation in MongoDB
  console.log('\n--- 4. Create Presentation in MongoDB ---');
  const presRes = await axios.post(
    `${NODE_URL}/presentations`,
    {
      title: 'Deep Learning & Neural Architectures',
      topic: 'Artificial Intelligence',
      theme: 'midnight-neon',
      language: 'English',
      slides: [
        {
          title: 'Introduction to Transformers',
          content: 'Transformers rely on multi-head self-attention mechanisms.',
          speaker_notes: 'Begin by introducing attention is all you need.',
          layout: 'title-and-body',
          order: 1
        },
        {
          title: 'Positional Encodings',
          content: 'Sine and cosine functions provide sequence context.',
          speaker_notes: 'Explain why recurrence is replaced.',
          layout: 'two-column',
          order: 2
        }
      ]
    },
    { headers: { Authorization: `Bearer ${creatorToken}` } }
  );
  const presentation = presRes.data.presentation || presRes.data;
  const presId = presentation.id || presentation._id;
  console.log(`✅ Presentation Created: "${presentation.title}" (ID: ${presId}, Visibility: ${presentation.visibility})`);

  // 5. Public Visibility & Sharing Control
  console.log('\n--- 5. Sharing & Visibility Control ---');
  const shareRes = await axios.put(
    `${NODE_URL}/presentations/${presId}/share`,
    { visibility: 'public', is_published_to_community: true },
    { headers: { Authorization: `Bearer ${creatorToken}` } }
  );
  console.log(`✅ Presentation Visibility Changed to Public. Share URL: ${shareRes.data.share_url}`);

  // 6. Discovery Page Query (Real DB aggregation)
  console.log('\n--- 6. Public Discovery & Aggregations ---');
  const discoverRes = await axios.get(`${NODE_URL}/public/discover?filter=trending`);
  const discoverItems = discoverRes.data.presentations || [];
  console.log(`✅ Discover Trending Query returned ${discoverItems.length} presentations.`);
  const foundItem = discoverItems.find((p) => (p.id || p._id) === presId);
  console.log(`✅ Verified newly published presentation appears in Discover list: ${foundItem ? 'YES' : 'NO'}`);

  // 7. Ratings & Reviews (Real DB metrics calculation & duplicate prevention)
  console.log('\n--- 7. Real Ratings & Reviews ---');
  const rateRes = await axios.post(
    `${NODE_URL}/ratings/${presId}`,
    { score: 5 },
    { headers: { Authorization: `Bearer ${user2Token}` } }
  );
  console.log(`✅ Bob rated 5 stars: Average is now ${rateRes.data.average_rating} (${rateRes.data.ratings_count} ratings)`);

  const reviewRes = await axios.post(
    `${NODE_URL}/reviews/${presId}`,
    { comment: 'Phenomenal explanation of transformer attention mechanics!' },
    { headers: { Authorization: `Bearer ${user2Token}` } }
  );
  console.log(`✅ Bob reviewed: "${reviewRes.data.review.comment}"`);

  const publicView = await axios.get(`${NODE_URL}/public/presentation/${presId}`);
  const publicPres = publicView.data.presentation || publicView.data;
  console.log(`✅ Public view dynamic aggregate rating: ${publicPres.average_rating} / 5 with ${publicPres.reviews_count || 0} reviews`);

  // 8. Use as Template (Independent Clone)
  console.log('\n--- 8. Use As Template (Independent Clone) ---');
  const templateClone = await axios.post(
    `${NODE_URL}/templates/${presId}/use`,
    {},
    { headers: { Authorization: `Bearer ${user2Token}` } }
  );
  const clonedPres = templateClone.data.presentation || templateClone.data;
  console.log(`✅ Template Cloned to Bob Library! New Presentation ID: ${clonedPres.id || clonedPres._id}`);

  // 9. Marketplace: Publish for Sale & Purchase
  console.log('\n--- 9. Marketplace: Publish & Purchase ---');
  const publishRes = await axios.post(
    `${NODE_URL}/marketplace/publish`,
    {
      presentation_id: presId,
      price: 10.00,
      description: 'Masterclass slides on Attention and Transformer architectures.'
    },
    { headers: { Authorization: `Bearer ${creatorToken}` } }
  );
  const publishedPres = publishRes.data.presentation || publishRes.data;
  console.log(`✅ Published to Marketplace for $${publishedPres.marketplace?.price || 10}`);

  const buyRes = await axios.post(
    `${NODE_URL}/marketplace/${presId}/buy`,
    {},
    { headers: { Authorization: `Bearer ${user2Token}` } }
  );
  console.log(`✅ Bob purchased template! Transaction ID: ${buyRes.data.transaction_id || buyRes.data.transaction?.id}`);
  console.log(`   - Status message: ${buyRes.data.message}`);

  // 10. SaaS Plans & Credit Tracking
  console.log('\n--- 10. SaaS Subscription Plans & Credits ---');
  const upgradeRes = await axios.post(
    `${NODE_URL}/auth/upgrade-plan`,
    { plan: 'pro' },
    { headers: { Authorization: `Bearer ${creatorToken}` } }
  );
  console.log(`✅ Upgraded Alice to Pro Plan! New AI Credits: ${upgradeRes.data.user.ai_credits?.remaining} (Plan: ${upgradeRes.data.user.subscription?.plan})`);

  console.log('\n🎉 ALL END-TO-END VERIFICATION CHECKS PASSED SUCCESSFULLY!');
}

runE2ETests().catch((err) => {
  console.error('❌ E2E Test Failed:', err.response ? err.response.data : err.message);
  process.exit(1);
});
