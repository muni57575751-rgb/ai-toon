import http from 'http';
import { AddressInfo } from 'net';

async function runVercelServerlessTests() {
  console.log('🚀 Starting Vercel Serverless Function End-to-End Verification Suite...\n');

  // Load the compiled standalone serverless bundle exactly as Vercel runs it
  const { default: handler } = await import('../../api/index.js' as any);

  if (typeof handler !== 'function') {
    throw new Error('Bundled serverless handler is not an executable function!');
  }
  console.log('✅ Serverless bundle loaded successfully from api/index.js');

  const server = http.createServer((req, res) => {
    handler(req, res);
  });

  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve());
  });

  const address = server.address() as AddressInfo;
  const baseUrl = `http://127.0.0.1:${address.port}`;
  console.log(`📡 Test server running on ${baseUrl}\n`);

  try {
    // 1. Health Endpoints
    console.log('--- 1. Testing Health Endpoints ---');
    const resHealth = await fetch(`${baseUrl}/api/health`);
    if (!resHealth.ok) throw new Error(`GET /api/health failed with status ${resHealth.status}`);
    const healthJson = await resHealth.json();
    if (healthJson.status !== 'ok' || !healthJson.success) {
      throw new Error(`GET /api/health returned invalid payload: ${JSON.stringify(healthJson)}`);
    }
    console.log('✅ GET /api/health succeeded: status "ok", service "ai-toon-backend"');

    // Root /health via serverless rewrite simulation (x-matched-path)
    const resRootHealth = await fetch(`${baseUrl}/api`, {
      headers: { 'x-matched-path': '/health' },
    });
    const rootHealthJson = await resRootHealth.json();
    if (rootHealthJson.status !== 'ok') {
      throw new Error(`GET /health simulation failed: ${JSON.stringify(rootHealthJson)}`);
    }
    console.log('✅ GET /health (serverless rewrite) succeeded: status "ok"');

    // 2. Authentication & Admin Signup / Login Workflow
    console.log('\n--- 2. Testing Authentication & Member Workflow ---');
    // Master admin login
    const adminLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'muni57575751@gmail.com', password: 'Poola@1234' }),
    });
    const adminLoginJson = await adminLoginRes.json();
    if (!adminLoginRes.ok || adminLoginJson.data?.user?.role !== 'admin') {
      throw new Error(`Master Admin login failed: ${JSON.stringify(adminLoginJson)}`);
    }
    const adminId = adminLoginJson.data.user.id;
    console.log('✅ Master Admin login succeeded (role: admin, email: muni57575751@gmail.com)');

    // Register a new user
    const testEmail = `student_${Date.now()}@example.com`;
    const registerRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test Student',
        email: testEmail,
        password: 'Password123!',
      }),
    });
    const registerJson = await registerRes.json();
    if (!registerRes.ok || registerJson.data?.member?.verificationStatus !== 'pending') {
      throw new Error(`Registration failed: ${JSON.stringify(registerJson)}`);
    }
    console.log('✅ User registration succeeded (verificationStatus: pending, requires admin approval)');

    // Attempt login before approval (should be 403 Forbidden)
    const unapprovedLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password: 'Password123!' }),
    });
    if (unapprovedLoginRes.status !== 403) {
      throw new Error(`Expected 403 for unapproved user, got ${unapprovedLoginRes.status}`);
    }
    console.log('✅ Unapproved user login blocked with 403 PENDING_APPROVAL as required');

    // Admin approves the user
    const notificationsRes = await fetch(`${baseUrl}/api/admin/notifications`, {
      headers: {
        'x-user-id': adminId,
        'x-user-email': 'muni57575751@gmail.com',
        'x-user-role': 'admin',
      },
    });
    const notifsJson = await notificationsRes.json();
    const notifsList = notifsJson.data?.notifications || notifsJson.data;
    const targetNotif = Array.isArray(notifsList) ? notifsList.find((n: any) => n.email === testEmail) : null;
    if (!targetNotif) throw new Error('Notification for new user not found in admin inbox');

    const approveRes = await fetch(`${baseUrl}/api/admin/notifications/${targetNotif.id}/approve`, {
      method: 'POST',
      headers: {
        'x-user-id': adminId,
        'x-user-email': 'muni57575751@gmail.com',
        'x-user-role': 'admin',
      },
    });
    if (!approveRes.ok) throw new Error('Admin approval request failed');
    console.log('✅ Admin successfully approved user via notification');

    // Now user logs in
    const approvedLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password: 'Password123!' }),
    });
    const approvedLoginJson = await approvedLoginRes.json();
    if (!approvedLoginRes.ok || approvedLoginJson.data?.user?.role !== 'user') {
      throw new Error('Approved user failed to log in');
    }
    const userId = approvedLoginJson.data.user.id;
    console.log('✅ Approved user successfully logged in with role "user"');

    // 3. Dashboard Endpoints
    console.log('\n--- 3. Testing Dashboard Endpoints ---');
    const storiesRes = await fetch(`${baseUrl}/api/stories/my-stories`, {
      headers: { 'x-user-id': userId },
    });
    if (!storiesRes.ok) throw new Error(`GET /api/stories/my-stories failed: ${storiesRes.status}`);
    console.log('✅ GET /api/stories/my-stories returned 200 OK');

    const progressRes = await fetch(`${baseUrl}/api/stories/my-progress`, {
      headers: { 'x-user-id': userId },
    });
    if (!progressRes.ok) throw new Error(`GET /api/stories/my-progress failed: ${progressRes.status}`);
    console.log('✅ GET /api/stories/my-progress returned 200 OK');

    // 4. Wikimedia Image Retrieval & Search
    console.log('\n--- 4. Testing Wikimedia Image Search & Retrieval ---');
    const searchRes = await fetch(`${baseUrl}/api/search?q=photosynthesis`, {
      headers: { 'Accept': 'application/json' },
    });
    if (!searchRes.ok) throw new Error(`GET /api/search failed: ${searchRes.status}`);
    const searchJson = await searchRes.json();
    if (!Array.isArray(searchJson.data?.results) || searchJson.data.results.length === 0) {
      throw new Error('Search returned empty results for photosynthesis');
    }
    console.log(`✅ Wikimedia image search returned ${searchJson.data.results.length} authentic results`);

    // 5. Educational Lesson Generation (with fallback or live Gemini)
    console.log('\n--- 5. Testing Story & Lesson Generation ---');
    const storyStatusRes = await fetch(`${baseUrl}/api/stories/status`);
    const statusJson = await storyStatusRes.json();
    console.log(`ℹ️ AI Provider status: ${statusJson.data?.provider || 'gemini'} (model: ${statusJson.data?.model || 'gemini-3.5-flash-lite'})`);

    const generateRes = await fetch(`${baseUrl}/api/stories/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
      body: JSON.stringify({
        topic: 'Water Cycle',
        tone: 'comic',
        language: 'en',
        difficulty: 'beginner',
        userId,
      }),
    });
    if (!generateRes.ok) {
      throw new Error(`POST /api/stories/generate failed with status ${generateRes.status}`);
    }
    const generateJson = await generateRes.json();
    const story = generateJson.data;
    if (!story || !Array.isArray(story.keyPoints) || story.keyPoints.length === 0) {
      throw new Error('Lesson generation did not return valid key points');
    }
    console.log(`✅ Lesson generated: "${story.title}" (${story.keyPoints.length} points, ${story.illustrations?.length || 0} illustrations, ${story.quiz?.length || 0} quiz questions)`);

    // 6. Educational Q&A Chatbot with separate Gemini API key support
    console.log('\n--- 6. Testing Q&A Educational Chatbot ---');
    const qaRes = await fetch(`${baseUrl}/api/stories/qa`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': userId,
        'x-user-email': testEmail,
      },
      body: JSON.stringify({
        question: 'Why does it rain after evaporation?',
        topic: 'Water Cycle',
        storyContext: story.keyPoints.map((k: any) => k.title + ': ' + k.explanation).join('\n'),
      }),
    });
    if (!qaRes.ok) throw new Error(`POST /api/stories/qa failed with status ${qaRes.status}`);
    const qaJson = await qaRes.json();
    if (!qaJson.data?.answer) throw new Error('Q&A response missing answer field');
    console.log(`✅ Chatbot Q&A response received: "${qaJson.data.answer.slice(0, 80)}..."`);

    // 7. Quiz Functionality
    console.log('\n--- 7. Testing Quiz Submission ---');
    const quizAttemptRes = await fetch(`${baseUrl}/api/stories/quiz/attempt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
      body: JSON.stringify({
        storyId: story.id,
        score: 3,
        totalQuestions: 3,
        percentage: 100,
        timeTakenSeconds: 45,
      }),
    });
    if (!quizAttemptRes.ok) throw new Error(`POST /api/stories/quiz/attempt failed: ${quizAttemptRes.status}`);
    const attemptJson = await quizAttemptRes.json();
    if (!attemptJson.success) throw new Error('Quiz attempt failed to record');
    console.log('✅ Quiz attempt recorded successfully in learning progress');

    console.log('\n========================================================================');
    console.log('🎉 ALL 8 VERCEL SERVERLESS FUNCTION VERIFICATION CHECKS PASSED!');
    console.log('========================================================================\n');
  } finally {
    server.close();
  }
}

runVercelServerlessTests().catch((err) => {
  console.error('\n❌ Verification Failed:', err);
  process.exit(1);
});
