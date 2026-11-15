import axios from 'axios';
import fs from 'fs';
import path from 'path';

const NODE_URL = 'http://127.0.0.1:5000/api';

async function testAllExports() {
  console.log('🧪 Testing Multi-Format Export Endpoints (No AI calls required)...');

  // 1. Get any public presentation from discover
  const discRes = await axios.get(`${NODE_URL}/public/discover?limit=1`);
  const items = discRes.data.items || discRes.data.presentations || [];
  if (items.length === 0) {
    console.log('No presentations found to test export.');
    return;
  }

  const testDeck = items[0];
  const presId = testDeck.id || testDeck._id;
  console.log(`Using Presentation: "${testDeck.title}" (ID: ${presId})`);

  const formats = ['pptx', 'pdf', 'png', 'html', 'json', 'zip', 'notes'];
  const results = {};

  for (const fmt of formats) {
    try {
      const res = await axios.get(`${NODE_URL}/presentations/${presId}/export/${fmt}`, {
        responseType: 'arraybuffer'
      });
      const sizeBytes = res.data.length || res.data.byteLength || 0;
      const contentType = res.headers['content-type'];
      results[fmt] = { status: 'PASS', sizeBytes, contentType };
      console.log(`  ✓ Export [${fmt.toUpperCase()}]: ${sizeBytes} bytes, Content-Type: ${contentType}`);
    } catch (err) {
      results[fmt] = { status: 'FAIL', error: err.message };
      console.error(`  ✗ Export [${fmt.toUpperCase()}]: FAILED - ${err.message}`);
    }
  }

  const allPassed = Object.values(results).every(r => r.status === 'PASS');
  console.log(`\nExport Test Result: ${allPassed ? 'ALL PASSED ✅' : 'SOME FAILED ❌'}`);
}

testAllExports().catch(err => {
  console.error('Export test runner error:', err.message);
  process.exit(1);
});
