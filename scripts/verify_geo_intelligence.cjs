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

function matchesCategory(actual, expected) {
  if (actual === expected) return true;
  if (Array.isArray(expected)) {
    return expected.some((exp) => matchesCategory(actual, exp));
  }
  const aliases = {
    GEOGRAPHICAL_PLACE: ['PLACE', 'INSTITUTION', 'GEOGRAPHICAL_PLACE'],
    PLACE: ['PLACE', 'INSTITUTION', 'GEOGRAPHICAL_PLACE'],
    INSTITUTION: ['PLACE', 'INSTITUTION', 'GEOGRAPHICAL_PLACE'],
    SCIENCE: ['SCIENCE', 'SCIENCE_CONCEPT'],
    SCIENCE_CONCEPT: ['SCIENCE', 'SCIENCE_CONCEPT'],
    TECHNOLOGY: ['TECHNOLOGY', 'TECHNOLOGY_CONCEPT'],
    TECHNOLOGY_CONCEPT: ['TECHNOLOGY', 'TECHNOLOGY_CONCEPT'],
    HISTORY: ['HISTORY', 'HISTORICAL_EVENT'],
    HISTORICAL_EVENT: ['HISTORY', 'HISTORICAL_EVENT'],
    GENERAL: ['GENERAL', 'GENERAL_TOPIC'],
    GENERAL_TOPIC: ['GENERAL', 'GENERAL_TOPIC'],
    FOOD: ['FOOD'],
    ANIMAL: ['ANIMAL'],
    PERSON: ['PERSON'],
  };
  return Boolean(aliases[expected] && aliases[expected].includes(actual));
}

async function run() {
  console.log('========================================================================');
  console.log('🌍 AI TOON CONTEXT-AWARE GEOGRAPHICAL CLASSIFICATION & MAP AUDIT');
  console.log('========================================================================\n');

  // Load backend app
  const { createApp } = await import('../backend/dist/app.js');
  const app = createApp();

  const getJson = (endpoint) => dispatch(app, 'GET', `/api${endpoint}`);

  const testCases = [
    // 1. People (Must NOT have map)
    {
      id: 1,
      topic: 'Virat Kohli',
      expectedCategory: 'PERSON',
      expectedRequiresMap: false,
    },
    {
      id: 2,
      topic: 'MS Dhoni',
      expectedCategory: 'PERSON',
      expectedRequiresMap: false,
    },
    {
      id: 3,
      topic: 'Albert Einstein',
      expectedCategory: 'PERSON',
      expectedRequiresMap: false,
    },

    // 2. Science Concepts (Must NOT have map)
    {
      id: 4,
      topic: 'Photosynthesis',
      expectedCategory: 'SCIENCE',
      expectedRequiresMap: false,
    },
    {
      id: 5,
      topic: 'Solar System',
      expectedCategory: 'SCIENCE',
      expectedRequiresMap: false,
    },

    // 3. Technology Concepts (Must NOT have map)
    {
      id: 6,
      topic: 'Binary Search',
      expectedCategory: 'TECHNOLOGY',
      expectedRequiresMap: false,
    },
    {
      id: 7,
      topic: 'Artificial Intelligence',
      expectedCategory: 'TECHNOLOGY',
      expectedRequiresMap: false,
    },

    // 4. Food (Must NOT have map)
    {
      id: 8,
      topic: 'Biryani',
      expectedCategory: 'FOOD',
      expectedRequiresMap: false,
    },
    {
      id: 9,
      topic: 'Jalebi',
      expectedCategory: 'FOOD',
      expectedRequiresMap: false,
    },

    // 5. Geographical Places (MUST HAVE MAP)
    {
      id: 10,
      topic: 'Guntur',
      expectedCategory: 'GEOGRAPHICAL_PLACE',
      expectedRequiresMap: true,
      expectedState: 'Andhra Pradesh',
      expectedDistrict: 'Guntur',
      approxLat: 16.30,
      approxLon: 80.43,
    },
    {
      id: 11,
      topic: 'Tirupati',
      expectedCategory: 'GEOGRAPHICAL_PLACE',
      expectedRequiresMap: true,
      expectedState: 'Andhra Pradesh',
      expectedDistrict: 'Tirupati',
      approxLat: 13.62,
      approxLon: 79.41,
    },
    {
      id: 12,
      topic: 'Donakonda',
      expectedCategory: 'GEOGRAPHICAL_PLACE',
      expectedRequiresMap: true,
      expectedState: 'Andhra Pradesh',
      approxLat: 15.89,
      approxLon: 79.49,
    },
    {
      id: 13,
      topic: 'Hyderabad',
      expectedCategory: 'GEOGRAPHICAL_PLACE',
      expectedRequiresMap: true,
      expectedState: 'Telangana',
      approxLat: 17.38,
      approxLon: 78.48,
    },
    {
      id: 14,
      topic: 'India',
      expectedCategory: 'GEOGRAPHICAL_PLACE',
      expectedRequiresMap: true,
      approxLat: 20.59,
      approxLon: 78.96,
    },
    {
      id: 15,
      topic: 'Mount Everest',
      expectedCategory: 'GEOGRAPHICAL_PLACE',
      expectedRequiresMap: true,
      approxLat: 27.98,
      approxLon: 86.92,
    },
    {
      id: 16,
      topic: 'Taj Mahal',
      expectedCategory: 'GEOGRAPHICAL_PLACE',
      expectedRequiresMap: true,
      expectedState: 'Uttar Pradesh',
      approxLat: 27.17,
      approxLon: 78.04,
    },

    // 6. Institutions (Physical location relevant: MUST HAVE MAP)
    {
      id: 17,
      topic: 'Oxford University',
      expectedCategory: 'GEOGRAPHICAL_PLACE',
      expectedRequiresMap: true,
      approxLat: 51.75,
      approxLon: -1.25,
    },
    {
      id: 18,
      topic: 'Location of Oxford University',
      expectedCategory: 'GEOGRAPHICAL_PLACE',
      expectedRequiresMap: true,
      approxLat: 51.75,
      approxLon: -1.25,
    },

    // 7. Explicit Location Queries about People (MUST HAVE MAP with verified place)
    {
      id: 19,
      topic: 'Birthplace of Virat Kohli',
      expectedCategory: 'GEOGRAPHICAL_PLACE',
      expectedRequiresMap: true,
      expectedPlaceName: 'New Delhi',
      approxLat: 28.61,
      approxLon: 77.20,
    },
    {
      id: 20,
      topic: 'Where is Virat Kohli from?',
      expectedCategory: 'GEOGRAPHICAL_PLACE',
      expectedRequiresMap: true,
      expectedPlaceName: 'New Delhi',
      approxLat: 28.61,
      approxLon: 77.20,
    },

    // 8. Ambiguous single terms (MUST HIDE MAP & BE MARKED AS AMBIGUOUS)
    {
      id: 21,
      topic: 'Washington',
      expectedCategory: 'GENERAL',
      expectedRequiresMap: false,
      expectedAmbiguous: true,
    },
    {
      id: 22,
      topic: 'Jordan',
      expectedCategory: 'GENERAL',
      expectedRequiresMap: false,
      expectedAmbiguous: true,
    },
    {
      id: 23,
      topic: 'Victoria',
      expectedCategory: 'GENERAL',
      expectedRequiresMap: false,
      expectedAmbiguous: true,
    },
  ];

  let passedCount = 0;

  for (const tc of testCases) {
    console.log(`\n[TEST ${tc.id}/${testCases.length}] Testing Topic: "${tc.topic}"...`);
    const detectRes = await getJson(`/geo/detect?topic=${encodeURIComponent(tc.topic)}`);

    if (!detectRes.ok || !detectRes.data || !detectRes.data.data) {
      throw new Error(`Endpoint failed for "${tc.topic}": ${detectRes.status} ${detectRes.text}`);
    }

    const { category, requiresMap, locationDetails, reasoning, isAmbiguous, ambiguityOptions } = detectRes.data.data;

    console.log(`   🏷️  Classified Category: [${category}] (Expected: [${tc.expectedCategory}])`);
    console.log(`   🗺️  Map Required: ${requiresMap} (Expected: ${tc.expectedRequiresMap})`);
    if (reasoning) {
      console.log(`   💡 Reasoning: ${reasoning}`);
    }

    // 1. Verify Category matches
    if (!matchesCategory(category, tc.expectedCategory)) {
      throw new Error(`FAIL on "${tc.topic}": expected category ${tc.expectedCategory}, got ${category}`);
    }

    // 2. Verify requiresMap matches
    if (requiresMap !== tc.expectedRequiresMap) {
      throw new Error(`FAIL on "${tc.topic}": expected requiresMap=${tc.expectedRequiresMap}, got ${requiresMap}`);
    }

    // 3. For Ambiguous topics, ensure isAmbiguous is true and options provided
    if (tc.expectedAmbiguous) {
      if (!isAmbiguous) {
        throw new Error(`FAIL on "${tc.topic}": expected isAmbiguous=true, got ${isAmbiguous}`);
      }
      if (!Array.isArray(ambiguityOptions) || ambiguityOptions.length < 2) {
        throw new Error(`FAIL on "${tc.topic}": expected ambiguityOptions list with options.`);
      }
      console.log(`   🔀 Ambiguity detected successfully: ${ambiguityOptions.join(' | ')}`);
    }

    // 4. For Non-map topics, ensure location is null
    if (!tc.expectedRequiresMap) {
      if (locationDetails !== null) {
        throw new Error(`FAIL on "${tc.topic}": expected locationDetails to be null when requiresMap=false.`);
      }
      console.log(`   ✅ Correctly classified — Map is strictly HIDDEN.`);
      passedCount++;
      continue;
    }

    // 5. For Map topics, ensure location details exist and coordinates match
    if (!locationDetails) {
      throw new Error(`FAIL on "${tc.topic}": expected locationDetails object, got null.`);
    }

    console.log(`   📍 Resolved Location: "${locationDetails.placeName}" (${locationDetails.category})`);
    console.log(`      Coordinates: ${locationDetails.latitude}, ${locationDetails.longitude}`);
    console.log(`      Admin: ${locationDetails.district || '—'} Dist., ${locationDetails.state || '—'}, ${locationDetails.country || '—'}`);
    console.log(`      Postal Code: ${locationDetails.postalCode ? `${locationDetails.postalCode} (Verified)` : 'Unverified'}`);

    if (tc.expectedPlaceName && !locationDetails.placeName.toLowerCase().includes(tc.expectedPlaceName.toLowerCase())) {
      throw new Error(`FAIL on "${tc.topic}": expected placeName containing "${tc.expectedPlaceName}", got "${locationDetails.placeName}"`);
    }

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
