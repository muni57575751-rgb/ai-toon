import { wikimediaProvider } from './services/imageSearch/wikimedia.provider.js';
import { imageSearchService, ImageSearchService } from './services/imageSearch/imageSearch.service.js';
import { imageSearchCache } from './services/imageSearch/imageSearch.cache.js';
import type { IImageSearchProvider } from './services/imageSearch/imageSearch.types.js';

async function runImageSearchTests() {
  console.log('====================================================');
  console.log('    AI TOON: IMAGE SEARCH & FALLBACK TEST SUITE     ');
  console.log('====================================================\n');

  let passedTests = 0;
  const totalTests = 5;

  const topicsToTest = [
    {
      topic: 'How Does Artificial Intelligence Work?',
      query: 'artificial intelligence neural network diagram',
    },
    {
      topic: 'How Does Photosynthesis Work?',
      query: 'photosynthesis leaf sunlight carbon dioxide water oxygen diagram',
    },
    {
      topic: 'How Do Earthquakes Happen?',
      query: 'tectonic plates fault seismic waves educational diagram',
    },
    {
      topic: 'How Does Binary Search Work?',
      query: 'binary search sorted array middle element diagram',
    },
    {
      topic: 'How Does the Human Heart Pump Blood?',
      query: 'labeled heart blood flow diagram',
    },
  ];

  // TEST 1: Topic-aware image search for all 5 required educational topics
  console.log('--- TEST 1: Public Image Search Across All 5 Topics ---');
  let topicSuccessCount = 0;

  for (const item of topicsToTest) {
    try {
      const startTime = Date.now();
      const result = await imageSearchService.findEducationalImage(item.query);
      const elapsed = Date.now() - startTime;

      if (result && result.imageUrl && result.sourcePageUrl && result.license) {
        console.log(`✅ [${item.topic}]`);
        console.log(`   Query: "${item.query}"`);
        console.log(`   Title: "${result.title}"`);
        console.log(`   Image URL: ${result.imageUrl.slice(0, 75)}...`);
        console.log(`   Source Page: ${result.sourcePageUrl}`);
        console.log(`   Author: ${result.author}`);
        console.log(`   License: ${result.license}`);
        console.log(`   Dimensions: ${result.width}x${result.height} (${elapsed}ms)\n`);
        topicSuccessCount++;
      } else {
        console.error(`❌ [${item.topic}] No suitable educational image found for query: "${item.query}"`);
      }
    } catch (err) {
      console.error(`❌ [${item.topic}] Failed with error:`, err);
    }
  }

  if (topicSuccessCount === topicsToTest.length) {
    console.log(`✅ Test 1 PASSED: All 5 topics retrieved authentic educational images with full metadata.\n`);
    passedTests++;
  } else {
    console.error(`❌ Test 1 FAILED: Only ${topicSuccessCount}/${topicsToTest.length} topics succeeded.\n`);
  }

  // TEST 2: Caching & In-flight Deduplication
  console.log('--- TEST 2: In-Memory Caching & Deduplication ---');
  {
    const testQuery = 'binary search sorted array middle element diagram';
    const statsBefore = imageSearchCache.getStats();
    const startTime = Date.now();
    const cachedResult = await imageSearchService.findEducationalImage(testQuery);
    const elapsed = Date.now() - startTime;
    const statsAfter = imageSearchCache.getStats();

    if (cachedResult && elapsed < 10 && statsAfter.hits > statsBefore.hits) {
      console.log(`✅ Test 2 PASSED: Cached query responded in ${elapsed}ms without network call (Hits: ${statsAfter.hits}, HitRate: ${statsAfter.hitRate}).\n`);
      passedTests++;
    } else {
      console.error(`❌ Test 2 FAILED: Expected instant cache hit (<10ms). Elapsed: ${elapsed}ms`, { statsBefore, statsAfter });
    }
  }

  // TEST 3: Metadata Validation (No broken URLs, no tiny thumbnails, valid license)
  console.log('--- TEST 3: Metadata Integrity & Quality Validation ---');
  {
    const result = await wikimediaProvider.searchImage('photosynthesis diagram');
    if (
      result &&
      result.imageUrl.startsWith('https://') &&
      result.sourcePageUrl.startsWith('https://') &&
      result.license &&
      (result.width || 0) >= 200 &&
      (result.height || 0) >= 150
    ) {
      console.log(`✅ Test 3 PASSED: Returned valid HTTPS URLs, minimum diagram dimensions (${result.width}x${result.height}), and explicit license (${result.license}).\n`);
      passedTests++;
    } else {
      console.error('❌ Test 3 FAILED: Image failed quality or metadata validation.', result);
    }
  }

  // TEST 4: Graceful Fallback When Provider Fails or Times Out
  console.log('--- TEST 4: Graceful Fallback Handling on Provider Failure ---');
  {
    const failingProvider: IImageSearchProvider = {
      name: 'FailingMockProvider',
      searchImage: async () => {
        throw new Error('Simulated network timeout 503');
      },
    };
    const testService = new ImageSearchService(failingProvider);

    const mockStory: any = {
      id: 'mock_story_fallback',
      title: 'Earthquakes and Plate Tectonics',
      topic: 'Earthquakes',
      keyPoints: [],
      illustrations: [
        {
          id: 'ill_1',
          title: 'Tectonic Plates Sliding',
          caption: 'Plates grind against each other',
          description: 'Fault line under stress',
          keyword: 'earthquake_tectonic',
          positionIndex: 2,
        },
      ],
    };

    const enhanced = await testService.enhanceStoryIllustrations(mockStory);
    const ill = enhanced.illustrations[0];

    if (ill.sourceType === 'svg_fallback' && ill.imageUrl === undefined) {
      console.log(`✅ Test 4 PASSED: When image provider fails, illustrations seamlessly maintain sourceType="svg_fallback" without throwing errors.\n`);
      passedTests++;
    } else {
      console.error('❌ Test 4 FAILED: Did not correctly fallback to SVG.', ill);
    }
  }

  // TEST 5: Lesson Illustration Enhancement Pipeline
  console.log('--- TEST 5: End-to-End Lesson Illustration Enhancement Pipeline ---');
  {
    const lessonToEnhance: any = {
      id: 'test_pipeline_story',
      title: 'The Human Heart and Circulatory System',
      topic: 'Human Heart',
      keyPoints: [
        { pointNumber: 1, heading: 'The Four Chambers', bulletPoints: ['Atria and ventricles.'] },
      ],
      illustrations: [
        {
          id: 'heart_ill_1',
          title: 'Heart Blood Flow Diagram',
          caption: 'Oxygen-rich and oxygen-poor blood paths through heart chambers',
          description: 'Detailed diagram of human heart with blue and red circulation arrows',
          keyword: 'heart_blood_flow',
          searchQuery: 'labeled heart blood flow diagram',
          positionIndex: 2,
        },
      ],
    };

    const enhanced = await imageSearchService.enhanceStoryIllustrations(lessonToEnhance);
    const enhancedIll = enhanced.illustrations[0];

    if (enhancedIll.imageUrl && enhancedIll.sourceType === 'wikimedia' && enhancedIll.sourcePageUrl) {
      console.log(`✅ Test 5 PASSED: Lesson enhanced with authentic diagram: "${enhancedIll.title}" from ${enhancedIll.sourcePageUrl}`);
      passedTests++;
    } else {
      console.error('❌ Test 5 FAILED: Illustration was not enhanced.', enhancedIll);
    }
  }

  console.log('\n====================================================');
  console.log(`   TEST RESULTS: ${passedTests}/${totalTests} TESTS PASSED`);
  console.log('====================================================');

  if (passedTests === totalTests) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runImageSearchTests().catch((err) => {
  console.error('Unhandled test failure:', err);
  process.exit(1);
});
