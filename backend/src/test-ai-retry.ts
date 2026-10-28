import { GeminiProvider } from './services/ai/gemini.provider.js';
import { StoryService } from './services/story.service.js';
import { config } from './config/env.js';

async function runTests() {
  console.log('====================================================');
  console.log('   AI TOON: AI RETRY & FALLBACK VERIFICATION TEST   ');
  console.log('====================================================\n');

  let passedTests = 0;
  let totalTests = 5;

  // Test 1: Confirm HTTP 401 does NOT trigger repeated retries
  console.log('--- TEST 1: Confirm HTTP 401 does not retry ---');
  {
    const provider = new GeminiProvider('fake-key-for-test');
    provider.setSimulation({ failStatus: 401, failCount: 5 });
    const startTime = Date.now();
    try {
      await provider.generateStory({
        topic: 'Gravity and orbits',
        tone: 'funny',
        language: 'en',
        difficulty: 'intermediate',
      }, 10000);
      console.error('❌ Test 1 FAILED: Expected 401 to throw error immediately.');
    } catch (err: unknown) {
      const elapsed = Date.now() - startTime;
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('Invalid or unauthorized') && elapsed < 2000) {
        console.log(`✅ Test 1 PASSED: 401 threw immediately in ${elapsed}ms without retrying.`);
        passedTests++;
      } else {
        console.error(`❌ Test 1 FAILED: Unexpected error or delay (${elapsed}ms): ${msg}`);
      }
    }
  }

  // Test 2: Simulated HTTP 503 followed by success (1 failure, retry succeeds)
  console.log('\n--- TEST 2: Simulated HTTP 503 with retry recovery ---');
  {
    const provider = new GeminiProvider(config.aiApiKey, config.aiModel);
    provider.setSimulation({ failStatus: 503, failCount: 1 });
    const startTime = Date.now();
    try {
      const result = await provider.generateStory({
        topic: 'Gravity and falling apples',
        tone: 'funny',
        language: 'en',
        difficulty: 'beginner',
      }, 30000);
      const elapsed = Date.now() - startTime;
      if (result && result.title && result.keyPoints.length >= 4) {
        console.log(`✅ Test 2 PASSED: 503 retried and succeeded in ${elapsed}ms. Story: "${result.title}" (${result.keyPoints.length} points).`);
        passedTests++;
      } else {
        console.error('❌ Test 2 FAILED: Result did not have required structure.', result);
      }
    } catch (err) {
      console.error('❌ Test 2 FAILED with error:', err);
    }
  }

  // Test 3: Repeated HTTP 503 failures (exhaust retries) & Fallback Verification
  console.log('\n--- TEST 3: Repeated HTTP 503 failures & strict fallback check ---');
  {
    const storyService = new StoryService();
    // Test 3a: Unrelated topic (e.g. Earthquakes) MUST NOT fallback to Photosynthesis
    const provider = new GeminiProvider(config.aiApiKey, config.aiModel);
    provider.setSimulation({ failStatus: 503, failCount: 5 });

    let correctlyBlockedUnrelatedFallback = false;
    try {
      await provider.generateStory({
        topic: 'Earthquakes and seismic waves',
        tone: 'adventure',
        language: 'en',
        difficulty: 'intermediate',
      }, 15000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('AI Toon is temporarily busy')) {
        correctlyBlockedUnrelatedFallback = true;
      }
    }

    // Test 3b: Genuinely matching topic (e.g. "Photosynthesis in green leaves") SHOULD fallback to built-in Photosynthesis
    const genuineFallbackStory = (storyService as any).findMatchingExample('Photosynthesis in green leaves');
    const unrelatedFallbackStory = (storyService as any).findMatchingExample('Earthquakes in geology');

    if (
      correctlyBlockedUnrelatedFallback &&
      genuineFallbackStory?.id === 'example_photosynthesis' &&
      unrelatedFallbackStory === null
    ) {
      console.log('✅ Test 3 PASSED: Repeated 503 errors threw friendly busy message. Genuine topics match fallback, unrelated topics (Earthquakes) return NO false fallback.');
      passedTests++;
    } else {
      console.error('❌ Test 3 FAILED:', {
        correctlyBlockedUnrelatedFallback,
        genuineFallbackStoryId: genuineFallbackStory?.id,
        unrelatedFallbackStory,
      });
    }
  }

  // Test 4: Built-in examples work without an API key
  console.log('\n--- TEST 4: Built-in examples work without API key ---');
  {
    const unconfiguredService = new StoryService(() => new GeminiProvider(''));
    const storyResult = await unconfiguredService.getOrGenerateStory({
      topic: 'The Solar System',
      tone: 'adventure',
      language: 'en',
      difficulty: 'intermediate',
    });

    let unrelatedFailedProperly = false;
    try {
      await unconfiguredService.getOrGenerateStory({
        topic: 'Quantum Computing and Superconductors',
        tone: 'comic',
        language: 'en',
        difficulty: 'advanced',
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('No AI API key is configured') || msg.includes('choose one of our built-in example stories')) {
        unrelatedFailedProperly = true;
      }
    }

    if (storyResult.story.id === 'example_solar_system' && unrelatedFailedProperly) {
      console.log(`✅ Test 4 PASSED: Built-in solar system loaded cleanly without API key, and unrelated topic correctly rejected with informative message.`);
      passedTests++;
    } else {
      console.error('❌ Test 4 FAILED:', { storyResultId: storyResult.story.id, unrelatedFailedProperly });
    }
  }

  // Test 5: Live generation success
  console.log('\n--- TEST 5: Live AI Generation Success ---');
  {
    const provider = new GeminiProvider(config.aiApiKey, config.aiModel);
    try {
      const startTime = Date.now();
      const liveResult = await provider.generateStory({
        topic: 'Gravity and Isaac Newton',
        tone: 'funny',
        language: 'en',
        difficulty: 'intermediate',
      }, 45000);
      const elapsed = Date.now() - startTime;
      console.log(`✅ Test 5 PASSED: Live generation succeeded in ${elapsed}ms: "${liveResult.title}" with ${liveResult.keyPoints.length} points and ${liveResult.illustrations.length} illustrations.`);
      passedTests++;
    } catch (err) {
      console.error('❌ Test 5 FAILED:', err);
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

runTests().catch((err) => {
  console.error('Unhandled test failure:', err);
  process.exit(1);
});
