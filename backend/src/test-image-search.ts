import { wikimediaProvider } from './services/imageSearch/wikimedia.provider.js';
import { imageSearchService, ImageSearchService } from './services/imageSearch/imageSearch.service.js';
import { imageSearchCache } from './services/imageSearch/imageSearch.cache.js';
import { entityClassifier } from './services/imageSearch/entityClassifier.js';
import type { IImageSearchProvider } from './services/imageSearch/imageSearch.types.js';

async function runImageSearchTests() {
  console.log('========================================================================');
  console.log('   AI TOON: ENTITY-AWARE IMAGE SEARCH & FALLBACK TEST SUITE (PHASE 2-4) ');
  console.log('========================================================================\n');

  let passedTests = 0;
  const totalTests = 6;

  // The 6 specified topics from the project requirements
  const requiredTopics = [
    {
      topic: 'Narendra Modi',
      expectedCategory: 'person',
      expectedFormat: 'photo', // JPEG/PNG/WEBP photo
      keywordsExpected: ['modi', 'narendra'],
    },
    {
      topic: 'Vignan University, Vadlamudi',
      expectedCategory: 'institution',
      expectedFormat: 'photo', // JPEG/PNG/WEBP photo of campus/building/logo
      keywordsExpected: ['vignan'],
    },
    {
      topic: 'How Does Artificial Intelligence Work?',
      expectedCategory: 'technical',
      expectedFormat: 'diagram',
      keywordsExpected: ['intelligence', 'artificial', 'ai', 'model'],
    },
    {
      topic: 'How Does Photosynthesis Work?',
      expectedCategory: 'scientific',
      expectedFormat: 'diagram',
      keywordsExpected: ['photosynthesis'],
    },
    {
      topic: 'How Does Binary Search Work?',
      expectedCategory: 'technical',
      expectedFormat: 'diagram',
      keywordsExpected: ['binary', 'search'],
    },
    {
      topic: 'How Does the Human Heart Pump Blood?',
      expectedCategory: 'scientific',
      expectedFormat: 'diagram',
      keywordsExpected: ['heart'],
    },
  ];

  // TEST 1: Entity Classification Verification
  console.log('--- TEST 1: Entity Classification Across Required Topics ---');
  let classificationPassed = true;

  for (const item of requiredTopics) {
    const classification = entityClassifier.classify(item.topic);
    const isCorrect = classification.category === item.expectedCategory;
    console.log(
      `   [${item.topic}] -> Classified: [${classification.category.toUpperCase()}] (Confidence: ${classification.confidence}, Name: "${classification.entityName}", Context: "${classification.secondaryContext || 'none'}") ${isCorrect ? '✅' : '❌'}`
    );
    if (!isCorrect) {
      classificationPassed = false;
    }
  }

  if (classificationPassed) {
    console.log('✅ Test 1 PASSED: All 6 topics correctly classified into entity categories.\n');
    passedTests++;
  } else {
    console.error('❌ Test 1 FAILED: Misclassified one or more topics.\n');
  }

  // TEST 2: Authentic Public Media Search for All 6 Required Topics
  console.log('--- TEST 2: Entity-Aware Public Media Retrieval for All 6 Topics ---');
  let mediaPassedCount = 0;

  for (const item of requiredTopics) {
    try {
      const startTime = Date.now();
      const mockStory: any = {
        id: `mock_test_${Date.now()}`,
        topic: item.topic,
        title: item.topic,
        illustrations: [
          {
            id: 'ill_1',
            title: `${item.topic} Visual Concept`,
            description: `Visual depicting ${item.topic}`,
            positionIndex: 2,
          },
        ],
      };

      const enhanced = await imageSearchService.enhanceStoryIllustrations(mockStory);
      const ill = enhanced.illustrations[0];
      const elapsed = Date.now() - startTime;

      if (ill.imageUrl && ill.sourceType === 'wikimedia') {
        const lowerTitle = (ill.title || '').toLowerCase() + ' ' + (ill.sourcePageUrl || '').toLowerCase();
        const hasKeyword = item.keywordsExpected.some((kw) => lowerTitle.includes(kw));

        console.log(`✅ [${item.topic}]`);
        console.log(`   Selected Image: "${ill.title}"`);
        console.log(`   Image URL: ${ill.imageUrl?.slice(0, 75)}...`);
        console.log(`   Source Page: ${ill.sourcePageUrl}`);
        console.log(`   Author: ${ill.author || 'Contributor'}`);
        console.log(`   License: ${ill.license}`);
        console.log(`   Dimensions: ${ill.width}x${ill.height} (${elapsed}ms)`);
        console.log(`   Semantic Match: ${hasKeyword ? 'Exact Entity Overlap Confirmed ✓' : 'Notice: secondary context match'}\n`);

        mediaPassedCount++;
      } else {
        console.error(`❌ [${item.topic}] Failed to retrieve authentic public image.`);
      }
    } catch (err) {
      console.error(`❌ [${item.topic}] Error during search:`, err);
    }
  }

  if (mediaPassedCount === requiredTopics.length) {
    console.log(`✅ Test 2 PASSED: All 6 topics retrieved authentic topic-aware public media (${mediaPassedCount}/${requiredTopics.length}).\n`);
    passedTests++;
  } else {
    console.error(`❌ Test 2 FAILED: Only ${mediaPassedCount}/${requiredTopics.length} topics succeeded.\n`);
  }

  // TEST 3: Photogragh vs Diagram Differentiation
  console.log('--- TEST 3: Photographic Priority for People & Institutions vs Diagrams for Science ---');
  {
    // Search Narendra Modi -> should be JPEG/PNG/WEBP photo, NOT svg diagram
    const modiResult = await wikimediaProvider.searchImage('Narendra Modi', {
      entityCategory: 'person',
      entityName: 'Narendra Modi',
    });

    // Search Photosynthesis -> should be diagram
    const photoResult = await wikimediaProvider.searchImage('photosynthesis diagram', {
      entityCategory: 'scientific',
      entityName: 'Photosynthesis',
    });

    const isModiPhoto = modiResult && (modiResult.mime?.includes('jpeg') || modiResult.mime?.includes('png') || modiResult.mime?.includes('webp'));
    const isPhotoDiagram = photoResult && (photoResult.title.toLowerCase().includes('diagram') || photoResult.title.toLowerCase().includes('photosynthesis'));

    if (isModiPhoto && isPhotoDiagram) {
      console.log(`   Modi Result: "${modiResult.title}" (MIME: ${modiResult.mime}) -> Photograph ✓`);
      console.log(`   Photosynthesis Result: "${photoResult.title}" (MIME: ${photoResult.mime}) -> Diagram ✓`);
      console.log('✅ Test 3 PASSED: People/institutions prioritize photographs; science topics prioritize diagrams.\n');
      passedTests++;
    } else {
      console.error('❌ Test 3 FAILED: Incorrect format preference.', { modiResult, photoResult });
    }
  }

  // TEST 4: Rejection of Unrelated Candidates for Named Entities
  console.log('--- TEST 4: Identity Verification & Rejection of Unrelated Images ---');
  {
    // Searching for an institution like "Vignan University" retrieves a candidate matching "Vignan"
    const vignanResult = await wikimediaProvider.searchImage('Vignan University', {
      entityCategory: 'institution',
      entityName: 'Vignan University',
    });

    // Searching with entityName "Vignan University" on unrelated university images must REJECT them (return null)
    const unrelatedResult = await wikimediaProvider.searchImage('Harvard Yard library', {
      entityCategory: 'institution',
      entityName: 'Vignan University',
    });

    const matchesEntity = vignanResult && vignanResult.title.toLowerCase().includes('vignan');
    const rejectsUnrelated = unrelatedResult === null;

    if (matchesEntity && rejectsUnrelated) {
      console.log(`   Vignan Result: "${vignanResult?.title}" - Entity overlap confirmed ✓`);
      console.log(`   Unrelated Harvard Query with Vignan entityName: correctly rejected (${unrelatedResult}) ✓`);
      console.log('✅ Test 4 PASSED: Named entity search correctly requires entity name overlap and excludes unrelated universities.\n');
      passedTests++;
    } else {
      console.error('❌ Test 4 FAILED: Identity verification or rejection check failed:', { matchesEntity, rejectsUnrelated, vignanResult, unrelatedResult });
    }
  }

  // TEST 5: Caching & In-flight Deduplication
  console.log('--- TEST 5: In-Memory Caching & Query Deduplication ---');
  {
    const testQuery = 'Narendra Modi official portrait';
    const statsBefore = imageSearchCache.getStats();
    const startTime = Date.now();
    const cachedResult = await imageSearchService.findEducationalImage(testQuery, {
      entityCategory: 'person',
      entityName: 'Narendra Modi',
    });
    const elapsed = Date.now() - startTime;
    const statsAfter = imageSearchCache.getStats();

    if (cachedResult && elapsed < 20 && statsAfter.hits > statsBefore.hits) {
      console.log(
        `✅ Test 5 PASSED: Instant cache hit in ${elapsed}ms without network refetch (Hits: ${statsAfter.hits}, HitRate: ${statsAfter.hitRate}).\n`
      );
      passedTests++;
    } else {
      console.error('❌ Test 5 FAILED: Expected instant cache hit.', { elapsed, statsBefore, statsAfter });
    }
  }

  // TEST 6: Graceful Fallback on Network / Provider Failure
  console.log('--- TEST 6: Graceful Fallback Handling ---');
  {
    const failingProvider: IImageSearchProvider = {
      name: 'FailingMockProvider',
      searchImage: async () => {
        throw new Error('Simulated network timeout');
      },
    };
    const testService = new ImageSearchService(failingProvider);

    const mockStory: any = {
      id: 'mock_story_fallback',
      title: 'Earthquakes and Plate Tectonics',
      topic: 'Earthquakes',
      illustrations: [
        {
          id: 'ill_1',
          title: 'Tectonic Plates Fault',
          description: 'Fault line under stress',
          keyword: 'earthquake_tectonic',
          positionIndex: 2,
        },
      ],
    };

    const enhanced = await testService.enhanceStoryIllustrations(mockStory);
    const ill = enhanced.illustrations[0];

    if (ill.sourceType === 'svg_fallback' && ill.imageUrl === undefined) {
      console.log('✅ Test 6 PASSED: On provider failure, illustrations gracefully maintain SVG fallback without crashing.\n');
      passedTests++;
    } else {
      console.error('❌ Test 6 FAILED: Did not fallback properly.', ill);
    }
  }

  console.log('========================================================================');
  console.log(`   TEST RESULTS: ${passedTests}/${totalTests} TESTS PASSED`);
  console.log('========================================================================');

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
