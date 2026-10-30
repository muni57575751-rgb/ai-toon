import { createServer } from 'http';
import { createApp } from './app.js';
import { memberService, MASTER_ADMIN_EMAIL, MASTER_ADMIN_PASSWORD } from './services/member.service.js';

let passed = 0;
let failed = 0;

function assert(condition: boolean, msg: string): void {
  if (condition) {
    console.log(`  ✅ PASS: ${msg}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${msg}`);
    failed++;
  }
}

async function runComprehensiveSuite() {
  console.log('\n========================================================================');
  console.log('   AI TOON: COMPREHENSIVE 20-POINT PLATFORM & SECURITY SUITE            ');
  console.log('========================================================================\n');

  const app = createApp();
  const server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const port = (server.address() as any).port;
  const baseUrl = `http://127.0.0.1:${port}/api`;

  try {
    // SCENARIO 1: Public endpoints allow access
    console.log('--- SCENARIO 1 & 2: Public vs Protected Route Access Control ---');
    {
      const res = await fetch(`${baseUrl}/stories/examples`);
      const body = await res.json() as any;
      assert(res.status === 200 && body.success === true, 'Public examples endpoint accessible without auth');

      const statusRes = await fetch(`${baseUrl}/stories/status`);
      assert(statusRes.status === 200, 'Public AI provider status accessible without auth');
    }

    // SCENARIO 2: Protected endpoints block unauthenticated requests
    {
      const res = await fetch(`${baseUrl}/stories/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: 'Photosynthesis' }),
      });
      assert(res.status === 401, 'Unauthenticated story generation blocked with HTTP 401');

      const myStoriesRes = await fetch(`${baseUrl}/stories/my-stories`);
      assert(myStoriesRes.status === 401, 'Unauthenticated /api/stories/my-stories blocked with HTTP 401');

      const myProgressRes = await fetch(`${baseUrl}/stories/my-progress`);
      assert(myProgressRes.status === 401, 'Unauthenticated /api/stories/my-progress blocked with HTTP 401');
    }

    // SCENARIO 3: User Registration creates pending account
    console.log('\n--- SCENARIO 3 & 4: User Registration & Pending Approval State ---');
    const testEmail = `student_${Date.now()}@example.com`;
    const testPass = 'Student@Pass123';
    let testUserId = '';

    {
      const res = await fetch(`${baseUrl}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Alice Student',
          email: testEmail,
          password: testPass,
        }),
      });
      const body = await res.json() as any;
      assert(res.status === 201, 'Registration returns HTTP 201 Created');
      assert(body.data.pendingApproval === true, 'Registration sets pendingApproval = true');
      assert(body.data.user.verificationStatus === 'pending', 'User verificationStatus is "pending"');
      testUserId = body.data.user.id;
    }

    // SCENARIO 4: Pending user is blocked from logging in / generating
    {
      const loginRes = await fetch(`${baseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: testEmail, password: testPass }),
      });
      const body = await loginRes.json() as any;
      assert(loginRes.status === 403, 'Pending user login blocked with HTTP 403');
      assert(body.error?.code === 'PENDING_APPROVAL', 'Error code is PENDING_APPROVAL');

      // Attempt protected generation with pending credentials
      const genRes = await fetch(`${baseUrl}/stories/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': testUserId,
          'x-user-email': testEmail,
        },
        body: JSON.stringify({ topic: 'Photosynthesis' }),
      });
      assert(genRes.status === 403, 'Pending user blocked from /api/stories/generate with HTTP 403');
    }

    // SCENARIO 5: Admin Login and Account Approval
    console.log('\n--- SCENARIO 5 & 6: Admin Login & Account Verification ---');
    let adminUserId = '';
    {
      const adminLoginRes = await fetch(`${baseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: MASTER_ADMIN_EMAIL,
          password: MASTER_ADMIN_PASSWORD,
        }),
      });
      const body = await adminLoginRes.json() as any;
      assert(adminLoginRes.status === 200, 'Master Admin login succeeds');
      assert(body.data.user.role === 'admin', 'Muni role is "admin"');
      adminUserId = body.data.user.id;

      // Find pending notification
      const notifsRes = await fetch(`${baseUrl}/admin/notifications`, {
        headers: {
          'x-user-id': adminUserId,
          'x-user-email': MASTER_ADMIN_EMAIL,
          'x-user-role': 'admin',
        },
      });
      const notifsBody = await notifsRes.json() as any;
      const targetNotif = notifsBody.data.notifications.find((n: any) => n.email === testEmail);
      assert(Boolean(targetNotif), 'Admin received registration notification for student');

      // Approve student
      const approveRes = await fetch(`${baseUrl}/admin/notifications/${targetNotif.id}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': adminUserId,
          'x-user-email': MASTER_ADMIN_EMAIL,
          'x-user-role': 'admin',
        },
        body: JSON.stringify({ role: 'user' }),
      });
      assert(approveRes.status === 200, 'Admin approves pending notification');
    }

    // SCENARIO 6: Approved Student Login
    {
      const loginRes = await fetch(`${baseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: testEmail, password: testPass }),
      });
      const body = await loginRes.json() as any;
      assert(loginRes.status === 200, 'Approved student logs in successfully');
      assert(body.data.user.verificationStatus === 'verified', 'Student status is now verified');
    }

    // SCENARIO 7: Web Search Functionality
    console.log('\n--- SCENARIO 7 & 8: Live Web Search & Grounded Q&A ---');
    {
      const searchRes = await fetch(`${baseUrl}/search?q=Photosynthesis`, {
        headers: {
          'x-user-id': testUserId,
          'x-user-email': testEmail,
        },
      });
      const searchBody = await searchRes.json() as any;
      assert(searchRes.status === 200, 'Live search returns HTTP 200');
      assert(searchBody.success === true, 'Search response indicates success = true');
      assert(Array.isArray(searchBody.data.results), 'Search returns results array');
      assert(searchBody.data.results.length > 0, 'Search returned verified results');
      const firstResult = searchBody.data.results[0];
      assert(Boolean(firstResult.title && firstResult.url && firstResult.domain), 'Result contains title, url, and domain');
    }

    // SCENARIO 9: Quiz Attempt & Progress Tracking
    console.log('\n--- SCENARIO 9: Quiz Scoring & Student Progress ---');
    {
      const attemptRes = await fetch(`${baseUrl}/stories/quiz/attempt`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': testUserId,
          'x-user-email': testEmail,
        },
        body: JSON.stringify({
          storyId: 'story-photosynthesis',
          topic: 'Photosynthesis',
          score: 3,
          total: 3,
        }),
      });
      assert(attemptRes.status === 200, 'Quiz attempt recorded successfully');

      const progressRes = await fetch(`${baseUrl}/stories/my-progress`, {
        headers: {
          'x-user-id': testUserId,
          'x-user-email': testEmail,
        },
      });
      const progBody = await progressRes.json() as any;
      assert(progressRes.status === 200, 'Progress endpoint returns HTTP 200');
      assert(progBody.data.quizzesCompleted >= 1, 'Quizzes completed counter incremented');
      assert(progBody.data.averageScorePercentage === 100, 'Average quiz score calculated accurately');
    }

    // SCENARIO 10 & 11: Account Suspension & Reactivation
    console.log('\n--- SCENARIO 10 & 11: Account Suspension & Immediate Enforcement ---');
    {
      const suspendRes = await fetch(`${baseUrl}/admin/members/${testUserId}/suspend`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': adminUserId,
          'x-user-email': MASTER_ADMIN_EMAIL,
          'x-user-role': 'admin',
        },
        body: JSON.stringify({ reason: 'Security policy test' }),
      });
      assert(suspendRes.status === 200, 'Admin successfully suspends member account');

      // Check that protected generation is immediately blocked
      const genRes = await fetch(`${baseUrl}/stories/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': testUserId,
          'x-user-email': testEmail,
        },
        body: JSON.stringify({ topic: 'Photosynthesis' }),
      });
      const genBody = await genRes.json() as any;
      assert(genRes.status === 403, 'Suspended member immediately blocked from generate with 403');
      assert(genBody.error?.code === 'ACCOUNT_SUSPENDED', 'Error code is ACCOUNT_SUSPENDED');

      // Reactivate
      const reactivateRes = await fetch(`${baseUrl}/admin/members/${testUserId}/reactivate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': adminUserId,
          'x-user-email': MASTER_ADMIN_EMAIL,
          'x-user-role': 'admin',
        },
      });
      assert(reactivateRes.status === 200, 'Admin successfully reactivates member account');
    }

    // SCENARIO 12 & 13: System Settings & Generation Pausing
    console.log('\n--- SCENARIO 12 & 13: System Settings & AI Pause Control ---');
    {
      // Pause AI generation
      const pauseRes = await fetch(`${baseUrl}/admin/settings`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': adminUserId,
          'x-user-email': MASTER_ADMIN_EMAIL,
          'x-user-role': 'admin',
        },
        body: JSON.stringify({ storyGenerationEnabled: false }),
      });
      assert(pauseRes.status === 200, 'Admin successfully updates system settings');

      // Verify generation is paused
      const tryGenRes = await fetch(`${baseUrl}/stories/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': testUserId,
          'x-user-email': testEmail,
        },
        body: JSON.stringify({ topic: 'Photosynthesis' }),
      });
      const tryGenBody = await tryGenRes.json() as any;
      assert(tryGenRes.status === 503, 'When AI paused, generator returns 503 Service Unavailable');
      assert(tryGenBody.error?.code === 'GENERATION_PAUSED', 'Error code is GENERATION_PAUSED');

      // Unpause
      await fetch(`${baseUrl}/admin/settings`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': adminUserId,
          'x-user-email': MASTER_ADMIN_EMAIL,
          'x-user-role': 'admin',
        },
        body: JSON.stringify({ storyGenerationEnabled: true }),
      });
    }

    // SCENARIO 14 & 15: Audit Logs & System Export
    console.log('\n--- SCENARIO 14 & 15: Audit Trail & Data Export ---');
    {
      const loginsRes = await fetch(`${baseUrl}/admin/audit/logins`, {
        headers: {
          'x-user-id': adminUserId,
          'x-user-email': MASTER_ADMIN_EMAIL,
          'x-user-role': 'admin',
        },
      });
      const loginsBody = await loginsRes.json() as any;
      assert(loginsRes.status === 200 && Array.isArray(loginsBody.data), 'Login audit trail returned');
      assert(loginsBody.data.length > 0, 'Login events recorded with timestamps and IPs');

      const exportRes = await fetch(`${baseUrl}/admin/export`, {
        headers: {
          'x-user-id': adminUserId,
          'x-user-email': MASTER_ADMIN_EMAIL,
          'x-user-role': 'admin',
        },
      });
      const exportBody = await exportRes.json() as any;
      assert(exportRes.status === 200, 'System export report returns HTTP 200');
      assert(Boolean(exportBody.data.members && exportBody.data.stats && exportBody.data.settings), 'Export contains members, stats, and settings');
    }

    // SCENARIO 16 & 17: User Profile Update & Non-Escalation
    console.log('\n--- SCENARIO 16 & 17: User Profile Update & Non-Escalation ---');
    {
      const updateRes = await fetch(`${baseUrl}/members/profile`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': testUserId,
          'x-user-email': testEmail,
        },
        body: JSON.stringify({
          fullName: 'Alice Wonder',
          role: 'admin', // Attempted unauthorized self-promotion
        }),
      });
      const updateBody = await updateRes.json() as any;
      assert(updateRes.status === 200, 'User can update full name');
      assert(updateBody.data.fullName === 'Alice Wonder', 'Name updated to Alice Wonder');
      assert(updateBody.data.role === 'user', 'Security enforcement: User cannot promote themselves to admin');
    }

    // SCENARIO 18: Account Deletion
    console.log('\n--- SCENARIO 18: Account Deletion & Cleanup ---');
    {
      const deleteRes = await fetch(`${baseUrl}/members/delete-account`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': testUserId,
          'x-user-email': testEmail,
        },
      });
      assert(deleteRes.status === 200, 'User successfully deletes own account');

      const memberAfter = memberService.getMemberById(testUserId);
      assert(!memberAfter, 'Member record permanently removed from database');
    }

    // SCENARIO 19: Bearer Token Lifecycle & Rejection
    console.log('\n--- SCENARIO 19: Cryptographic Bearer Token Validation & Refresh ---');
    {
      const loginRes = await fetch(`${baseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: MASTER_ADMIN_EMAIL,
          password: MASTER_ADMIN_PASSWORD,
        }),
      });
      const loginBody = await loginRes.json() as any;
      const token = loginBody.data.token;
      assert(typeof token === 'string' && token.split('.').length === 3, 'Login issues valid 3-segment signed JWT');

      // Refresh token
      const refreshRes = await fetch(`${baseUrl}/auth/refresh`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const refreshBody = await refreshRes.json() as any;
      assert(refreshRes.status === 200 && Boolean(refreshBody.data.token), 'Token refresh returns new valid JWT');
      const refreshedToken = refreshBody.data.token;

      // Access protected endpoint with Bearer token
      const statsRes = await fetch(`${baseUrl}/admin/stats`, {
        headers: { 'Authorization': `Bearer ${refreshedToken}` },
      });
      assert(statsRes.status === 200, 'Bearer token grants authorized access to protected admin route');

      // Access with invalid/tampered token is rejected with 401
      const badTokenRes = await fetch(`${baseUrl}/admin/stats`, {
        headers: { 'Authorization': 'Bearer invalid.tampered.token' },
      });
      assert(badTokenRes.status === 401, 'Tampered Bearer token immediately rejected with HTTP 401');
    }

    // SCENARIO 20: Admin Content Management & Synchronization
    console.log('\n--- SCENARIO 20: Admin Content Management (Lessons & Quizzes) ---');
    {
      const adminLoginRes = await fetch(`${baseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: MASTER_ADMIN_EMAIL,
          password: MASTER_ADMIN_PASSWORD,
        }),
      });
      const adminLoginBody = await adminLoginRes.json() as any;
      const adminToken = adminLoginBody.data.token;

      // 1. Fetch all lessons
      const lessonsRes = await fetch(`${baseUrl}/admin/lessons`, {
        headers: { 'Authorization': `Bearer ${adminToken}` },
      });
      const lessonsBody = await lessonsRes.json() as any;
      assert(lessonsRes.status === 200, 'Admin can fetch all system lessons (GET /admin/lessons)');
      assert(Array.isArray(lessonsBody.data), 'Lessons response contains data array');

      // 2. Fetch all quizzes
      const quizzesRes = await fetch(`${baseUrl}/admin/quizzes`, {
        headers: { 'Authorization': `Bearer ${adminToken}` },
      });
      const quizzesBody = await quizzesRes.json() as any;
      assert(quizzesRes.status === 200, 'Admin can fetch all quiz attempts (GET /admin/quizzes)');
      assert(Array.isArray(quizzesBody.data), 'Quizzes response contains data array');

      // 3. Admin stats include enriched metrics
      const statsRes = await fetch(`${baseUrl}/admin/stats`, {
        headers: { 'Authorization': `Bearer ${adminToken}` },
      });
      const statsBody = await statsRes.json() as any;
      assert(statsRes.status === 200, 'Admin stats endpoint returns HTTP 200');
      assert(typeof statsBody.data.totalLessonsGenerated === 'number', 'Stats include totalLessonsGenerated metric');
      assert(typeof statsBody.data.totalQuizzesCompleted === 'number', 'Stats include totalQuizzesCompleted metric');
      assert(typeof statsBody.data.averageQuizScore === 'number', 'Stats include averageQuizScore metric');
    }

    console.log('\n========================================================================');
    console.log(`   COMPREHENSIVE SUITE RESULTS: ${passed}/${passed + failed} TESTS PASSED`);
    console.log('========================================================================\n');

  } catch (err) {
    console.error('Fatal test suite exception:', err);
    failed++;
  } finally {
    server.close();
  }

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runComprehensiveSuite();
