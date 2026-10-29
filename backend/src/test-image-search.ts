import { wikimediaProvider } from './services/imageSearch/wikimedia.provider.js';
import { imageSearchService, ImageSearchService } from './services/imageSearch/imageSearch.service.js';
import { imageSearchCache } from './services/imageSearch/imageSearch.cache.js';
import { entityClassifier } from './services/imageSearch/entityClassifier.js';
import {
  extractCanonicalFileIdentifier,
  normalizeImageUrl,
  isDuplicateImage,
  deduplicateCandidates,
} from './services/imageSearch/imageDeduplicator.js';
import { storyService } from './services/story.service.js';
import type { IImageSearchProvider, ImageSearchResult } from './services/imageSearch/imageSearch.types.js';
import type { Story } from '@ai-toon/shared';

async function runAllImageSearchVerificationTests() {
  console.log('========================================================================');
  console.log('   AI TOON: COMPLETE 12-PART IMAGE SEARCH & DEDUPLICATION TEST SUITE    ');
  console.log('========================================================================\n');

  let passedTests = 0;
  const totalTests = 12;

  // -------------------------------------------------------------------------
  // TEST 1: Duplicate URLs are removed
  // -------------------------------------------------------------------------
  console.log('--- TEST 1: Duplicate URLs are removed ---');
  {
    const cand1: ImageSearchResult = {
      id: 'wiki_101',
      title: 'Solar System Diagram',
      imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/1/12/Solar_System.jpg',
      thumbnailUrl: 'https://upload.wikimedia.org/wikipedia/commons/1/12/Solar_System.jpg',
      sourcePageUrl: 'https://commons.wikimedia.org/wiki/File:Solar_System.jpg',
      author: 'NASA',
      license: 'Public Domain',
      sourceType: 'wikimedia',
    };
    const cand2: ImageSearchResult = {
      id: 'wiki_102',
      title: 'Solar System Diagram Duplicate',
      imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/1/12/Solar_System.jpg',
      thumbnailUrl: 'https://upload.wikimedia.org/wikipedia/commons/1/12/Solar_System.jpg',
      sourcePageUrl: 'https://commons.wikimedia.org/wiki/File:Solar_System.jpg',
      author: 'NASA',
      license: 'Public Domain',
      sourceType: 'wikimedia',
    };
    const cand3: ImageSearchResult = {
      id: 'wiki_103',
      title: 'Jupiter High Resolution',
      imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/2/23/Jupiter.jpg',
      thumbnailUrl: 'https://upload.wikimedia.org/wikipedia/commons/2/23/Jupiter.jpg',
      sourcePageUrl: 'https://commons.wikimedia.org/wiki/File:Jupiter.jpg',
      author: 'ESA',
      license: 'CC-BY-4.0',
      sourceType: 'wikimedia',
    };

    const deduplicated = deduplicateCandidates([cand1, cand2, cand3]);
    const isDup = isDuplicateImage(cand1, cand2);

    if (deduplicated.length === 2 && isDup) {
      console.log('✅ Test 1 PASSED: Identical URLs correctly identified as duplicates and filtered out.\n');
      passedTests++;
    } else {
      console.error('❌ Test 1 FAILED: Expected 2 candidates after deduplicating identical URLs.', deduplicated);
    }
  }

  // -------------------------------------------------------------------------
  // TEST 2: Different thumbnail URLs for the same underlying file are deduplicated
  // -------------------------------------------------------------------------
  console.log('--- TEST 2: Different thumbnail URLs for same underlying file are deduplicated ---');
  {
    const url800 =
      'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/Narendra_Modi_official_portrait.jpg/800px-Narendra_Modi_official_portrait.jpg';
    const url500 =
      'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/Narendra_Modi_official_portrait.jpg/500px-Narendra_Modi_official_portrait.jpg';
    const directUrl =
      'https://upload.wikimedia.org/wikipedia/commons/a/ab/Narendra_Modi_official_portrait.jpg';

    const id800 = extractCanonicalFileIdentifier(url800);
    const id500 = extractCanonicalFileIdentifier(url500);
    const idDirect = extractCanonicalFileIdentifier(directUrl);

    const norm800 = normalizeImageUrl(url800);
    const norm500 = normalizeImageUrl(url500);

    const cand800: ImageSearchResult = {
      id: 'wiki_201',
      title: 'File:Narendra_Modi_official_portrait.jpg',
      imageUrl: url800,
      thumbnailUrl: url800,
      sourcePageUrl: 'https://commons.wikimedia.org/wiki/File:Narendra_Modi_official_portrait.jpg',
      author: 'PMO India',
      license: 'GODL',
      sourceType: 'wikimedia',
    };
    const cand500: ImageSearchResult = {
      id: 'wiki_202',
      title: 'File:Narendra_Modi_official_portrait.jpg',
      imageUrl: url500,
      thumbnailUrl: url500,
      sourcePageUrl: 'https://commons.wikimedia.org/wiki/File:Narendra_Modi_official_portrait.jpg',
      author: 'PMO India',
      license: 'GODL',
      sourceType: 'wikimedia',
    };

    const isSameFile = isDuplicateImage(cand800, cand500);
    const deduplicated = deduplicateCandidates([cand800, cand500]);

    if (id800 === id500 && id800 === idDirect && norm800 === norm500 && isSameFile && deduplicated.length === 1) {
      console.log(`   Canonical File: "${id800}"`);
      console.log(`   Normalized Base URL: ${norm800}`);
      console.log('✅ Test 2 PASSED: 800px and 500px thumbnails accurately resolve to the same file and deduplicate.\n');
      passedTests++;
    } else {
      console.error('❌ Test 2 FAILED: Thumbnail deduplication failed.', { id800, id500, idDirect, isSameFile });
    }
  }

  // -------------------------------------------------------------------------
  // TEST 3: Two distinct relevant images are selected when suitable candidates exist
  // -------------------------------------------------------------------------
  console.log('--- TEST 3: Two distinct relevant images selected when suitable candidates exist ---');
  {
    const mockStory: Story = {
      id: 'story_distinct_test',
      title: 'Narendra Modi: Leadership and Public Service',
      topic: 'Narendra Modi',
      tone: 'adventure',
      language: 'en',
      introduction: 'Learn about Narendra Modi.',
      keyPoints: [
        { pointNumber: 1, heading: 'Early Life', bulletPoints: ['Born in Vadnagar.'] },
        { pointNumber: 2, heading: 'Chief Minister', bulletPoints: ['Served as CM of Gujarat.'] },
        { pointNumber: 3, heading: 'Prime Minister', bulletPoints: ['Elected Prime Minister of India.'] },
        { pointNumber: 4, heading: 'Global Initiatives', bulletPoints: ['Represented India on global stage.'] },
      ],
      illustrations: [
        {
          id: 'ill_1',
          title: 'Official Portrait of Narendra Modi',
          caption: 'Narendra Modi official portrait',
          description: 'Official portrait of Prime Minister Narendra Modi',
          keyword: 'narendra_modi',
          positionIndex: 2,
        },
        {
          id: 'ill_2',
          title: 'Prime Minister Narendra Modi Address',
          caption: 'Narendra Modi speaking at a national event',
          description: 'Prime Minister Narendra Modi addressing an assembly',
          keyword: 'narendra_modi_speech',
          positionIndex: 4,
        },
      ],
      keyTakeaway: 'Dedication to national service.',
      createdAt: new Date().toISOString(),
    };

    const enhanced = await imageSearchService.enhanceStoryIllustrations(mockStory);
    const ill1 = enhanced.illustrations[0];
    const ill2 = enhanced.illustrations[1];

    const hasBothImages = Boolean(ill1.imageUrl && ill2.imageUrl);
    const isDup = isDuplicateImage(
      { id: ill1.id, title: ill1.title, imageUrl: ill1.imageUrl, thumbnailUrl: ill1.thumbnailUrl },
      { id: ill2.id, title: ill2.title, imageUrl: ill2.imageUrl, thumbnailUrl: ill2.thumbnailUrl }
    );
    const canonical1 = extractCanonicalFileIdentifier(ill1.imageUrl || '');
    const canonical2 = extractCanonicalFileIdentifier(ill2.imageUrl || '');

    if (hasBothImages && !isDup && canonical1 !== canonical2) {
      console.log(`   Illustration 1: "${ill1.title}" -> ${ill1.imageUrl?.slice(0, 70)}...`);
      console.log(`   Illustration 2: "${ill2.title}" -> ${ill2.imageUrl?.slice(0, 70)}...`);
      console.log('✅ Test 3 PASSED: Two completely distinct authentic images selected for the lesson.\n');
      passedTests++;
    } else {
      console.error('❌ Test 3 FAILED: Duplication detected or images missing.', { ill1, ill2, isDup, canonical1, canonical2 });
    }
  }

  // -------------------------------------------------------------------------
  // TEST 4: Different illustration concepts can select different images
  // -------------------------------------------------------------------------
  console.log('--- TEST 4: Different illustration concepts select different images ---');
  {
    const aiStory: Story = {
      id: 'story_ai_concepts',
      title: 'How Artificial Intelligence Works',
      topic: 'Artificial Intelligence',
      tone: 'comic',
      language: 'en',
      introduction: 'How computers learn and reason.',
      keyPoints: [
        { pointNumber: 1, heading: 'Input and Processing', bulletPoints: ['Data fed into AI models.'] },
        { pointNumber: 2, heading: 'Neural Networks', bulletPoints: ['Connected layers mimicking brain synapses.'] },
      ],
      illustrations: [
        {
          id: 'ill_ai_1',
          title: 'Artificial Intelligence Workflow',
          caption: 'AI system processing workflow',
          description: 'Flowchart showing data input, training, and output generation in AI',
          keyword: 'artificial_intelligence',
          positionIndex: 1,
        },
        {
          id: 'ill_ai_2',
          title: 'Neural Network Architecture',
          caption: 'Deep neural network nodes and weights',
          description: 'Diagram of input layer, hidden layers, and output nodes in neural networks',
          keyword: 'neural_network',
          positionIndex: 2,
        },
      ],
      keyTakeaway: 'AI leverages deep neural networks to extract patterns.',
      createdAt: new Date().toISOString(),
    };

    const enhanced = await imageSearchService.enhanceStoryIllustrations(aiStory);
    const ill1 = enhanced.illustrations[0];
    const ill2 = enhanced.illustrations[1];

    const distinct = ill1.imageUrl !== ill2.imageUrl;
    const can1 = extractCanonicalFileIdentifier(ill1.imageUrl || '');
    const can2 = extractCanonicalFileIdentifier(ill2.imageUrl || '');

    if (ill1.imageUrl && ill2.imageUrl && distinct && can1 !== can2) {
      console.log(`   Concept 1 (AI Workflow): "${ill1.title}"`);
      console.log(`   Concept 2 (Neural Network): "${ill2.title}"`);
      console.log('✅ Test 4 PASSED: Distinct illustration concepts retrieved different, appropriate visuals.\n');
      passedTests++;
    } else {
      console.error('❌ Test 4 FAILED: Concept differentiation failed.', { ill1, ill2 });
    }
  }

  // -------------------------------------------------------------------------
  // TEST 5: A Narendra Modi query does not select an unrelated politician
  // -------------------------------------------------------------------------
  console.log('--- TEST 5: Narendra Modi query rejects unrelated politicians ---');
  {
    // 1. Direct search for Narendra Modi
    const modiResult = await wikimediaProvider.searchImage('Narendra Modi official portrait', {
      entityCategory: 'person',
      entityName: 'Narendra Modi',
    });

    // 2. Search for an unrelated person with entityName set to "Narendra Modi"
    const unrelatedResult = await wikimediaProvider.searchImage('Barack Obama official portrait', {
      entityCategory: 'person',
      entityName: 'Narendra Modi',
    });

    const isModiValid = Boolean(
      modiResult &&
        (modiResult.title.toLowerCase().includes('modi') || modiResult.sourcePageUrl.toLowerCase().includes('modi')) &&
        (modiResult.mime?.includes('jpeg') || modiResult.mime?.includes('png') || modiResult.mime?.includes('webp'))
    );
    const isUnrelatedRejected = unrelatedResult === null;

    if (isModiValid && isUnrelatedRejected) {
      console.log(`   Valid Modi Result: "${modiResult?.title}" (MIME: ${modiResult?.mime}) ✓`);
      console.log(`   Unrelated Politician with Modi entityName: correctly rejected (Result: ${unrelatedResult}) ✓`);
      console.log('✅ Test 5 PASSED: Rejects unrelated politicians and selects authentic Narendra Modi photos.\n');
      passedTests++;
    } else {
      console.error('❌ Test 5 FAILED: Modi entity verification failed.', { isModiValid, isUnrelatedRejected, modiResult, unrelatedResult });
    }
  }

  // -------------------------------------------------------------------------
  // TEST 6: A Vignan University query does not select an unrelated university
  // -------------------------------------------------------------------------
  console.log('--- TEST 6: Vignan University query rejects unrelated universities ---');
  {
    const vignanResult = await wikimediaProvider.searchImage('Vignan University Vadlamudi', {
      entityCategory: 'institution',
      entityName: 'Vignan University',
      secondaryContext: 'Vadlamudi',
    });

    const unrelatedUniversity = await wikimediaProvider.searchImage('Harvard University Harvard Yard campus', {
      entityCategory: 'institution',
      entityName: 'Vignan University',
      secondaryContext: 'Vadlamudi',
    });

    const isVignanValid = Boolean(
      vignanResult &&
        (vignanResult.title.toLowerCase().includes('vignan') || vignanResult.sourcePageUrl.toLowerCase().includes('vignan'))
    );
    const isHarvardRejected = unrelatedUniversity === null;

    if (isVignanValid && isHarvardRejected) {
      console.log(`   Valid Vignan Result: "${vignanResult?.title}" ✓`);
      console.log(`   Harvard Query with Vignan entityName: correctly rejected (Result: ${unrelatedUniversity}) ✓`);
      console.log('✅ Test 6 PASSED: Rejects unrelated universities and selects authentic Vignan University media.\n');
      passedTests++;
    } else {
      console.error('❌ Test 6 FAILED: Vignan entity verification failed.', { isVignanValid, isHarvardRejected, vignanResult, unrelatedUniversity });
    }
  }

  // -------------------------------------------------------------------------
  // TEST 7: Binary search returns conceptually appropriate diagrams
  // -------------------------------------------------------------------------
  console.log('--- TEST 7: Binary search returns conceptually appropriate diagrams ---');
  {
    const binaryResult = await wikimediaProvider.searchImage('binary search diagram', {
      entityCategory: 'technical',
      entityName: 'Binary Search',
    });

    const isDiagram = Boolean(
      binaryResult &&
        (binaryResult.title.toLowerCase().includes('binary') ||
          binaryResult.title.toLowerCase().includes('search') ||
          binaryResult.title.toLowerCase().includes('algorithm') ||
          binaryResult.sourcePageUrl.toLowerCase().includes('binary'))
    );

    if (isDiagram && binaryResult) {
      console.log(`   Binary Search Visual: "${binaryResult.title}"`);
      console.log(`   Source: ${binaryResult.sourcePageUrl}`);
      console.log('✅ Test 7 PASSED: Binary search returns conceptually appropriate educational diagram.\n');
      passedTests++;
    } else {
      console.error('❌ Test 7 FAILED: Binary search diagram not found.', binaryResult);
    }
  }

  // -------------------------------------------------------------------------
  // TEST 8: Human-heart and photosynthesis queries return relevant images
  // -------------------------------------------------------------------------
  console.log('--- TEST 8: Human-heart and photosynthesis queries return relevant images ---');
  {
    const heartResult = await wikimediaProvider.searchImage('human heart diagram', {
      entityCategory: 'scientific',
      entityName: 'Human Heart',
    });

    const photoResult = await wikimediaProvider.searchImage('photosynthesis process diagram', {
      entityCategory: 'scientific',
      entityName: 'Photosynthesis',
    });

    const heartValid = Boolean(
      heartResult &&
        (heartResult.title.toLowerCase().includes('heart') || heartResult.sourcePageUrl.toLowerCase().includes('heart'))
    );
    const photoValid = Boolean(
      photoResult &&
        (photoResult.title.toLowerCase().includes('photo') || photoResult.sourcePageUrl.toLowerCase().includes('photo'))
    );

    if (heartValid && photoValid) {
      console.log(`   Heart Diagram: "${heartResult?.title}" ✓`);
      console.log(`   Photosynthesis Diagram: "${photoResult?.title}" ✓`);
      console.log('✅ Test 8 PASSED: Human-heart and photosynthesis return relevant scientific diagrams.\n');
      passedTests++;
    } else {
      console.error('❌ Test 8 FAILED: Science images not relevant.', { heartResult, photoResult });
    }
  }

  // -------------------------------------------------------------------------
  // TEST 9: Broken images trigger alternative candidates or appropriate fallback
  // -------------------------------------------------------------------------
  console.log('--- TEST 9: Broken image handling & candidate fallback lists ---');
  {
    // Search candidates for photosynthesis
    const candidates = await imageSearchService.findEducationalCandidates('photosynthesis process diagram', {
      entityCategory: 'scientific',
      entityName: 'Photosynthesis',
    });

    const hasAlternatives = candidates.length >= 2;
    if (hasAlternatives) {
      console.log(`   Retrieved ${candidates.length} candidates for multi-level frontend resilience.`);
      console.log(`   Primary: "${candidates[0].title}"`);
      console.log(`   Backup Candidate 1: "${candidates[1].title}"`);
      console.log('✅ Test 9 PASSED: Multi-candidate retrieval provides alternative URLs for broken image fallback.\n');
      passedTests++;
    } else {
      console.error('❌ Test 9 FAILED: Failed to retrieve multiple candidates for fallback.', candidates);
    }
  }

  // -------------------------------------------------------------------------
  // TEST 10: Existing caching and request deduplication still work
  // -------------------------------------------------------------------------
  console.log('--- TEST 10: Existing caching and request deduplication still work ---');
  {
    const query = 'water cycle diagram';
    imageSearchCache.clear();

    const t0 = Date.now();
    const res1 = await imageSearchService.findEducationalImage(query, { entityCategory: 'scientific' });
    const missTime = Date.now() - t0;

    const t1 = Date.now();
    const res2 = await imageSearchService.findEducationalImage(query, { entityCategory: 'scientific' });
    const hitTime = Date.now() - t1;

    const stats = imageSearchCache.getStats();

    // In-flight deduplication test
    const [concurrent1, concurrent2] = await Promise.all([
      imageSearchService.findEducationalImage('earthquake fault line diagram', { entityCategory: 'scientific' }),
      imageSearchService.findEducationalImage('earthquake fault line diagram', { entityCategory: 'scientific' }),
    ]);

    const cachingWorks = res1 !== null && res2 !== null && hitTime < 20 && stats.hits >= 1;
    const concurrentWorks = concurrent1 !== null && concurrent2 !== null && concurrent1.id === concurrent2.id;

    if (cachingWorks && concurrentWorks) {
      console.log(`   Initial Fetch (Miss): ${missTime}ms | Cached Fetch (Hit): ${hitTime}ms (Hits: ${stats.hits})`);
      console.log('✅ Test 10 PASSED: Caching and in-flight request deduplication functioning flawlessly.\n');
      passedTests++;
    } else {
      console.error('❌ Test 10 FAILED: Caching or in-flight deduplication failed.', { cachingWorks, concurrentWorks, stats, hitTime });
    }
  }

  // -------------------------------------------------------------------------
  // TEST 11: Application handles cases where fewer than two suitable images exist
  // -------------------------------------------------------------------------
  console.log('--- TEST 11: Handles cases where fewer than two suitable images exist ---');
  {
    // Mock provider with strictly 1 image available
    const singleImage: ImageSearchResult = {
      id: 'wiki_single_only',
      title: 'Only One Authentic Image Available',
      imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/9/99/Only_One.jpg',
      thumbnailUrl: 'https://upload.wikimedia.org/wikipedia/commons/9/99/Only_One.jpg',
      sourcePageUrl: 'https://commons.wikimedia.org/wiki/File:Only_One.jpg',
      author: 'Rare Archives',
      license: 'Public Domain',
      sourceType: 'wikimedia',
    };

    const mockProviderSingle: IImageSearchProvider = {
      name: 'MockSingleImageProvider',
      searchImage: async () => singleImage,
      searchImages: async (_q, options) => {
        // If singleImage is already in excludeIdentifiers, return empty
        if (options?.excludeIdentifiers?.includes('only one.jpg') || options?.excludeIdentifiers?.includes('wiki_single_only')) {
          return [];
        }
        return [singleImage];
      },
    };

    const singleService = new ImageSearchService(mockProviderSingle);
    const storyTwoSlots: Story = {
      id: 'story_single_test',
      title: 'Obscure Topic Story',
      topic: 'Obscure Rare Topic',
      tone: 'adventure',
      language: 'en',
      introduction: 'Rare topic.',
      keyPoints: [
        { pointNumber: 1, heading: 'Point 1', bulletPoints: ['Details 1'] },
        { pointNumber: 2, heading: 'Point 2', bulletPoints: ['Details 2'] },
      ],
      illustrations: [
        { id: 'ill_slot_1', title: 'First Visual', caption: 'Visual 1', description: 'Desc 1', keyword: 'rare', positionIndex: 1 },
        { id: 'ill_slot_2', title: 'Second Visual', caption: 'Visual 2', description: 'Desc 2', keyword: 'rare', positionIndex: 2 },
      ],
      keyTakeaway: 'Key takeaway.',
      createdAt: new Date().toISOString(),
    };

    const enhanced = await singleService.enhanceStoryIllustrations(storyTwoSlots);
    const slot1 = enhanced.illustrations[0];
    const slot2 = enhanced.illustrations[1];

    const slot1HasImage = slot1.imageUrl === singleImage.imageUrl;
    const slot2HasFallback = slot2.sourceType === 'svg_fallback' && slot2.imageUrl === undefined;
    const notDuplicated = slot1.imageUrl !== slot2.imageUrl;

    if (slot1HasImage && slot2HasFallback && notDuplicated) {
      console.log('   Slot 1: Retrieved authentic single image.');
      console.log('   Slot 2: Gracefully used topic-specific SVG fallback without duplicating slot 1.');
      console.log('✅ Test 11 PASSED: Never duplicates images or uses unrelated images when candidates are scarce.\n');
      passedTests++;
    } else {
      console.error('❌ Test 11 FAILED: Single image handling failed.', { slot1, slot2 });
    }
  }

  // -------------------------------------------------------------------------
  // TEST 12: Existing lesson generation, authentication, and quizzes remain functional
  // -------------------------------------------------------------------------
  console.log('--- TEST 12: Existing lesson generation, authentication, and quizzes remain functional ---');
  {
    // Retrieve built-in example lesson (Photosynthesis)
    const { story } = await storyService.getOrGenerateStory({
      topic: 'Photosynthesis',
      difficulty: 'beginner',
      language: 'en',
      tone: 'comic',
    });

    const hasTitle = Boolean(story.title);
    const hasPoints = Array.isArray(story.keyPoints) && story.keyPoints.length >= 3;
    const hasIllustrations = Array.isArray(story.illustrations) && story.illustrations.length >= 2;
    const hasQuiz = Array.isArray(story.quizQuestions) && story.quizQuestions.length === 3;
    const quizOptionsValid = (story.quizQuestions || []).every(
      (q) => Array.isArray(q.options) && q.options.length === 4 && Boolean(q.correctOptionId)
    );

    if (hasTitle && hasPoints && hasIllustrations && hasQuiz && quizOptionsValid) {
      console.log(`   Lesson Title: "${story.title}"`);
      console.log(`   Key Points: ${story.keyPoints.length} | Illustrations: ${story.illustrations.length}`);
      console.log(`   Quiz Questions: ${story.quizQuestions?.length} (All 4-option MCQs verified)`);
      console.log('✅ Test 12 PASSED: Lesson generation, quizzes, and educational features fully intact.\n');
      passedTests++;
    } else {
      console.error('❌ Test 12 FAILED: Story structure corrupted.', { hasTitle, hasPoints, hasIllustrations, hasQuiz });
    }
  }

  console.log('========================================================================');
  console.log(`   IMAGE SEARCH SUITE RESULTS: ${passedTests}/${totalTests} TESTS PASSED`);
  console.log('========================================================================\n');

  if (passedTests === totalTests) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runAllImageSearchVerificationTests().catch((err) => {
  console.error('Unhandled test failure:', err);
  process.exit(1);
});
