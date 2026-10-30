const { EventEmitter } = require('events');
const { Readable } = require('stream');

function dispatch(app, method, url, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const req = new Readable({
      read() {
        if (body) {
          this.push(typeof body === 'string' ? body : JSON.stringify(body));
        }
        this.push(null);
      },
    });

    req.method = method;
    req.url = url;
    req.socket = { remoteAddress: '127.0.0.1' };
    req.connection = req.socket;
    if (body) {
      req.body = body;
    }
    req.headers = {
      'content-type': 'application/json',
      ...Object.fromEntries(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v])),
    };

    const res = new EventEmitter();
    res.statusCode = 200;
    res._headers = {};
    res.setHeader = (k, v) => {
      res._headers[k.toLowerCase()] = v;
    };
    res.getHeader = (k) => res._headers[k.toLowerCase()];
    res.writeHead = (status, hdrs) => {
      res.statusCode = status;
      if (hdrs) Object.assign(res._headers, hdrs);
      return res;
    };

    let responseData = '';
    res.write = (chunk) => {
      if (chunk) responseData += chunk.toString();
      return true;
    };
    res.end = (chunk) => {
      if (chunk) responseData += chunk.toString();
      let json = null;
      try {
        json = JSON.parse(responseData);
      } catch {}
      resolve({
        status: res.statusCode,
        ok: res.statusCode >= 200 && res.statusCode < 300,
        data: json,
        text: responseData,
      });
    };

    try {
      app(req, res);
    } catch (err) {
      reject(err);
    }
  });
}

async function run() {
  console.log('========================================================================');
  console.log('🌍 STARTING COMPLETE GEOGRAPHICAL INTELLIGENCE VERIFICATION (PHASE 9)');
  console.log('========================================================================\n');

  // Load backend app
  const { createApp } = await import('../backend/dist/app.js');
  const app = createApp();

  const getJson = (endpoint) => dispatch(app, 'GET', `/api${endpoint}`);

  const testCases = [
    {
      id: 1,
      topic: 'Donakonda, Andhra Pradesh',
      expectedIsLocation: true,
      expectedState: 'Andhra Pradesh',
      expectedDistrict: 'Prakasam',
      expectedPin: '523305',
      approxLat: 15.78,
      approxLon: 79.49,
    },
    {
      id: 2,
      topic: 'Ganga Donakonda',
      expectedIsLocation: true,
      expectedState: 'Andhra Pradesh',
      expectedDistrict: 'Prakasam',
      approxLat: 15.78,
      approxLon: 79.50,
    },
    {
      id: 3,
      topic: 'Tirupati',
      expectedIsLocation: true,
      expectedCategory: 'city',
      expectedState: 'Andhra Pradesh',
      expectedDistrict: 'Tirupati',
      expectedPin: '517501',
      approxLat: 13.62,
      approxLon: 79.41,
    },
    {
      id: 4,
      topic: 'Guntur',
      expectedIsLocation: true,
      expectedCategory: 'city',
      expectedState: 'Andhra Pradesh',
      expectedDistrict: 'Guntur',
      expectedPin: '522002',
      approxLat: 16.30,
      approxLon: 80.43,
    },
    {
      id: 5,
      topic: 'Pedanandipadu village',
      expectedIsLocation: true,
      expectedCountry: 'India',
    },
    {
      id: 6,
      topic: 'Taj Mahal',
      expectedIsLocation: true,
      expectedCategory: 'monument',
      expectedState: 'Uttar Pradesh',
      expectedPin: '282001',
      approxLat: 27.17,
      approxLon: 78.04,
    },
    {
      id: 7,
      topic: 'India',
      expectedIsLocation: true,
      expectedCategory: 'country',
      approxLat: 20.59,
      approxLon: 78.96,
    },
    {
      id: 8,
      topic: 'Mount Everest',
      expectedIsLocation: true,
      expectedCategory: 'mountain',
      approxLat: 27.98,
      approxLon: 86.92,
    },
    {
      id: 9,
      topic: 'Photosynthesis',
      expectedIsLocation: false, // Must NOT have a map!
    },
    {
      id: 10,
      topic: 'Jalebi',
      expectedIsLocation: false, // Must NOT have a map!
    },
  ];

  let passedCount = 0;

  for (const tc of testCases) {
    console.log(`\n[TEST ${tc.id}/10] Testing Topic: "${tc.topic}"...`);
    const detectRes = await getJson(`/geo/detect?topic=${encodeURIComponent(tc.topic)}`);

    if (!detectRes.ok || !detectRes.data) {
      throw new Error(`Endpoint failed for "${tc.topic}": ${detectRes.status} ${detectRes.text}`);
    }

    const { isLocation, locationDetails } = detectRes.data.data;

    // Check 1: Geographical vs Non-geographical classification
    if (isLocation !== tc.expectedIsLocation) {
      throw new Error(
        `FAIL on "${tc.topic}": expected isLocation=${tc.expectedIsLocation}, got ${isLocation}`
      );
    }

    if (!tc.expectedIsLocation) {
      if (locationDetails !== null) {
        throw new Error(`FAIL on "${tc.topic}": expected locationDetails to be null for non-geographical topic.`);
      }
      console.log(`   ✅ Correctly classified as NON-GEOGRAPHICAL (No map displayed).`);
      passedCount++;
      continue;
    }

    // Verify geographical details
    if (!locationDetails) {
      throw new Error(`FAIL on "${tc.topic}": expected locationDetails object, got null.`);
    }

    console.log(`   📍 Resolved: "${locationDetails.placeName}" (${locationDetails.category})`);
    console.log(`      Coordinates: ${locationDetails.latitude}, ${locationDetails.longitude}`);
    console.log(`      Admin: ${locationDetails.district || '—'} Dist., ${locationDetails.state || '—'}, ${locationDetails.country || '—'}`);
    console.log(`      Postal Code: ${locationDetails.postalCode ? `${locationDetails.postalCode} (Verified)` : 'Unverified'}`);

    // Verify coordinates exist and are valid numbers
    if (typeof locationDetails.latitude !== 'number' || typeof locationDetails.longitude !== 'number') {
      throw new Error(`FAIL on "${tc.topic}": coordinates missing or not numeric!`);
    }

    if (tc.approxLat && Math.abs(locationDetails.latitude - tc.approxLat) > 0.5) {
      throw new Error(`FAIL on "${tc.topic}": latitude ${locationDetails.latitude} differs from expected ~${tc.approxLat}`);
    }

    if (tc.approxLon && Math.abs(locationDetails.longitude - tc.approxLon) > 0.5) {
      throw new Error(`FAIL on "${tc.topic}": longitude ${locationDetails.longitude} differs from expected ~${tc.approxLon}`);
    }

    if (tc.expectedState && locationDetails.state !== tc.expectedState) {
      throw new Error(`FAIL on "${tc.topic}": expected state "${tc.expectedState}", got "${locationDetails.state}"`);
    }

    if (tc.expectedDistrict && locationDetails.district !== tc.expectedDistrict) {
      throw new Error(`FAIL on "${tc.topic}": expected district "${tc.expectedDistrict}", got "${locationDetails.district}"`);
    }

    if (tc.expectedPin && locationDetails.postalCode !== tc.expectedPin) {
      throw new Error(`FAIL on "${tc.topic}": expected postalCode "${tc.expectedPin}", got "${locationDetails.postalCode}"`);
    }

    if (!locationDetails.directionsUrl || !locationDetails.googleMapsUrl) {
      throw new Error(`FAIL on "${tc.topic}": directions / map links missing.`);
    }

    console.log(`   ✅ All geographical checks passed.`);
    passedCount++;
  }

  console.log('\n========================================================================');
  console.log(`🎉 ALL ${passedCount} / ${testCases.length} TESTS PASSED SUCCESSFULLY!`);
  console.log('========================================================================\n');
}

run().catch((err) => {
  console.error('\n❌ TEST RUN FAILED:', err);
  process.exit(1);
});
