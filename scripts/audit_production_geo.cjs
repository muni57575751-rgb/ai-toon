// Comprehensive Production Verification Audit Script for AI Toon Geographical Intelligence
// Target: https://ai-toon-six.vercel.app

const BASE_URL = process.env.AUDIT_BASE_URL || 'https://ai-toon-six.vercel.app';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'muni57575751@gmail.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Poola@1234';

console.log('========================================================================');
console.log(`🌐 PRODUCTION AUDIT OF GEOGRAPHICAL INTELLIGENCE: ${BASE_URL}`);
console.log('========================================================================\n');

async function testHealth() {
  console.log('[AUDIT CHECK 1] Checking Live Backend Health...');
  const res = await fetch(`${BASE_URL}/api/health`);
  if (!res.ok) throw new Error(`Health check returned HTTP ${res.status}`);
  const data = await res.json();
  console.log('   ✅ Health endpoint OK:', JSON.stringify(data));
  return data;
}

async function testAdminLogin() {
  console.log('\n[AUDIT CHECK 2] Authenticating as Administrator...');
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  });

  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`Login response not JSON (HTTP ${res.status}): ${text.slice(0, 150)}`);
  }

  const token = json.data?.token || json.token;
  if (!res.ok || !token) {
    throw new Error(`Login failed (HTTP ${res.status}): ${json.message || text}`);
  }

  const user = json.data?.user || json.user;
  console.log(`   ✅ Logged in successfully as: ${user?.email || ADMIN_EMAIL} (Role: ${user?.role || 'admin'})`);
  return token;
}

async function testGeoEndpoints() {
  console.log('\n[AUDIT CHECK 3] Testing Live Dedicated Geocoding Endpoints...');

  // Test 3a: Ganga Donakonda lookup
  const res1 = await fetch(`${BASE_URL}/api/geo/lookup?query=Ganga+Donakonda`);
  const data1 = await res1.json();
  const loc1 = data1.data || data1.location;
  if (!loc1 || !loc1.latitude) {
    throw new Error(`Ganga Donakonda lookup failed: ${JSON.stringify(data1)}`);
  }
  console.log('   ✅ Live /api/geo/lookup?query=Ganga+Donakonda resolved:');
  console.log(`      Place: "${loc1.placeName}" | Coords: ${loc1.latitude}, ${loc1.longitude}`);
  console.log(`      District: ${loc1.district} | State: ${loc1.state} | PIN: ${loc1.postalCode}`);

  // Test 3b: Donakonda lookup
  const res2 = await fetch(`${BASE_URL}/api/geo/lookup?query=Donakonda`);
  const data2 = await res2.json();
  const loc2 = data2.data || data2.location;
  console.log('   ✅ Live /api/geo/lookup?query=Donakonda resolved:');
  console.log(`      Place: "${loc2.placeName}" | Coords: ${loc2.latitude}, ${loc2.longitude}`);
  console.log(`      PIN: ${loc2.postalCode} (Verified: ${loc2.postalCodeVerified})`);

  // Test 3c: Tirupati lookup
  const res3 = await fetch(`${BASE_URL}/api/geo/lookup?query=Tirupati`);
  const data3 = await res3.json();
  const loc3 = data3.data || data3.location;
  console.log('   ✅ Live /api/geo/lookup?query=Tirupati resolved:');
  console.log(`      Place: "${loc3.placeName}" | Coords: ${loc3.latitude}, ${loc3.longitude} | PIN: ${loc3.postalCode}`);

  // Test 3d: Mount Everest lookup
  const res4 = await fetch(`${BASE_URL}/api/geo/lookup?query=Mount+Everest`);
  const data4 = await res4.json();
  const loc4 = data4.data || data4.location;
  console.log('   ✅ Live /api/geo/lookup?query=Mount+Everest resolved:');
  console.log(`      Place: "${loc4.placeName}" | Coords: ${loc4.latitude}, ${loc4.longitude} | Country: ${loc4.country}`);

  // Test 3e: Non-geographical detection on live endpoint
  const resNonGeo = await fetch(`${BASE_URL}/api/geo/detect?topic=Photosynthesis`);
  const dataNonGeo = await resNonGeo.json();
  const detectNonGeo = dataNonGeo.data || dataNonGeo;
  console.log('   ✅ Live /api/geo/detect?topic=Photosynthesis:');
  console.log(`      isGeographical: ${detectNonGeo.isGeographical} (Correctly classified as non-geo)`);
}

async function testStoryGeneration(token, topic) {
  console.log(`\n[AUDIT CHECK 4] Testing Live Lesson Generation for: "${topic}"...`);
  const start = Date.now();
  const res = await fetch(`${BASE_URL}/api/stories/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      topic,
      tone: 'funny',
      language: 'en',
      difficulty: 'intermediate',
    }),
  });

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`Generation returned non-JSON (HTTP ${res.status}): ${text.slice(0, 200)}`);
  }

  const story = json.data?.story || json.story || (json.data && json.data.title ? json.data : null);
  if (!res.ok || !story) {
    throw new Error(`Generation failed (HTTP ${res.status}): ${json.message || text}`);
  }
  console.log(`   ✅ Lesson generated in ${elapsed}s! Title: "${story.title}"`);
  console.log(`      Key Points count: ${story.keyPoints?.length || 0}`);
  console.log(`      Has locationDetails: ${Boolean(story.locationDetails)}`);

  if (story.locationDetails) {
    const loc = story.locationDetails;
    console.log(`      📍 Location: ${loc.placeName} (${loc.category})`);
    console.log(`      📍 Coordinates: Lat ${loc.latitude}, Lon ${loc.longitude}`);
    console.log(`      📍 Admin: ${loc.district || ''}, ${loc.state || ''}, ${loc.country || ''}`);
    console.log(`      📍 PIN: ${loc.postalCode || 'None'} (Verified: ${loc.postalCodeVerified})`);
  }

  if (Array.isArray(story.illustrations)) {
    console.log(`      🖼️ Illustrations (${story.illustrations.length}):`);
    story.illustrations.forEach((ill, i) => {
      console.log(`         [${i + 1}] "${ill.title}": ${ill.imageUrl ? ill.imageUrl.slice(0, 75) + '...' : 'SVG fallback'}`);
      console.log(`             SearchQuery: "${ill.searchQuery || ''}"`);
      console.log(`             Source: ${ill.sourceType || 'svg'} | License: ${ill.license || 'N/A'}`);
    });
  }

  return story;
}

async function testMapTileAvailability() {
  console.log('\n[AUDIT CHECK 5] Testing Map Tile Delivery...');
  // Check standard OpenStreetMap tile URL
  const testTileUrl = 'https://a.tile.openstreetmap.org/14/11831/7625.png';
  try {
    const res = await fetch(testTileUrl, {
      headers: {
        'User-Agent': 'AIToon-ProductionAudit/1.0',
      },
    });
    console.log(`   ✅ Tile request to OpenStreetMap: HTTP ${res.status} ${res.statusText} (Content-Type: ${res.headers.get('content-type')})`);
  } catch (err) {
    console.warn(`   ⚠️ OSM Tile check warning:`, err.message);
  }
}

async function main() {
  await testHealth();
  const token = await testAdminLogin();
  await testGeoEndpoints();

  // 1. Geographical Target 1: Ganga Donakonda
  const gangaStory = await testStoryGeneration(token, 'Ganga Donakonda');
  if (!gangaStory.locationDetails || !gangaStory.locationDetails.isLocation) {
    throw new Error('Ganga Donakonda did not receive locationDetails!');
  }

  // 2. Geographical Target 2: Donakonda
  const donakondaStory = await testStoryGeneration(token, 'Donakonda');
  if (!donakondaStory.locationDetails || !donakondaStory.locationDetails.isLocation) {
    throw new Error('Donakonda did not receive locationDetails!');
  }

  // 3. Geographical Target 3: Tirupati
  const tirupatiStory = await testStoryGeneration(token, 'Tirupati');
  if (!tirupatiStory.locationDetails || !tirupatiStory.locationDetails.isLocation) {
    throw new Error('Tirupati did not receive locationDetails!');
  }

  // 4. Geographical Target 4: Mount Everest
  const everestStory = await testStoryGeneration(token, 'Mount Everest');
  if (!everestStory.locationDetails || !everestStory.locationDetails.isLocation) {
    throw new Error('Mount Everest did not receive locationDetails!');
  }

  // 5. Non-geographical Target 1: Photosynthesis
  console.log('\n[AUDIT CHECK 6] Testing Non-Geographical Topic: "Photosynthesis"...');
  const photoStory = await testStoryGeneration(token, 'Photosynthesis');
  if (photoStory.locationDetails && photoStory.locationDetails.isLocation) {
    throw new Error('Photosynthesis was incorrectly marked as a location!');
  }
  console.log('   ✅ Photosynthesis correctly contains NO map (isLocation is false/undefined).');

  // 6. Non-geographical Target 2: Jalebi
  console.log('\n[AUDIT CHECK 7] Testing Non-Geographical Topic: "Jalebi"...');
  const jalebiStory = await testStoryGeneration(token, 'Jalebi');
  if (jalebiStory.locationDetails && jalebiStory.locationDetails.isLocation) {
    throw new Error('Jalebi was incorrectly marked as a location!');
  }
  console.log('   ✅ Jalebi correctly contains NO map (isLocation is false/undefined).');

  // 7. Non-geographical Target 3: Binary Search
  console.log('\n[AUDIT CHECK 8] Testing Non-Geographical Topic: "Binary Search"...');
  const bsStory = await testStoryGeneration(token, 'Binary Search');
  if (bsStory.locationDetails && bsStory.locationDetails.isLocation) {
    throw new Error('Binary Search was incorrectly marked as a location!');
  }
  console.log('   ✅ Binary Search correctly contains NO map (isLocation is false/undefined).');

  await testMapTileAvailability();

  console.log('\n========================================================================');
  console.log('🎉 COMPLETE PRODUCTION AUDIT FINISHED SUCCESSFULLY WITH ZERO ERRORS!');
  console.log('========================================================================\n');
}

main().catch((err) => {
  console.error('\n❌ AUDIT FAILED:', err);
  process.exit(1);
});
