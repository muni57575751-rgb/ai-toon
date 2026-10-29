import { createApp } from './app.js';
import type { Server } from 'http';

async function runTests() {
  console.log('🧪 Starting Authentication & Admin Access Verification Tests...\n');
  const app = createApp();
  const server: Server = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });
  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : 5000;
  const baseUrl = `http://127.0.0.1:${port}/api`;

  let failures = 0;

  function assert(condition: boolean, testName: string, details?: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
    } else {
      console.error(`  ❌ FAIL: ${testName}`);
      if (details) console.error(`     Details: ${details}`);
      failures++;
    }
  }

  try {
    // 1. Unauthenticated request to admin API should fail with 401
    {
      const res = await fetch(`${baseUrl}/admin/members`);
      const data = await res.json() as any;
      assert(res.status === 401, 'Unauthenticated request to /api/admin/members returns 401 Unauthorized', `Status was ${res.status}`);
      assert(data.success === false, 'Response indicates success = false for unauthenticated call');
    }

    // 2. Normal user (non-admin) requesting admin API should fail with 403 Forbidden
    {
      const res = await fetch(`${baseUrl}/admin/members`, {
        headers: {
          'x-user-id': 'demo-student-id-123',
          'x-user-email': 'alex.explorer@student.aitoon.edu',
          'x-user-role': 'user',
        },
      });
      const data = await res.json() as any;
      assert(res.status === 403, 'Normal user request to /api/admin/members returns 403 Forbidden', `Status was ${res.status}`);
      assert(data.error?.code === 'FORBIDDEN_ADMIN_ONLY', 'Error code is FORBIDDEN_ADMIN_ONLY');
    }

    // 3. Normal user attempting to spoof role header (sending 'admin' role while actually user in DB)
    {
      const res = await fetch(`${baseUrl}/admin/members`, {
        headers: {
          'x-user-id': 'demo-student-id-123',
          'x-user-email': 'alex.explorer@student.aitoon.edu',
          'x-user-role': 'admin', // spoof attempt
        },
      });
      assert(res.status === 403, 'Spoofed admin role header by non-admin member is rejected with 403 Forbidden', `Status was ${res.status}`);
    }

    // 4. Genuine admin requesting admin members and stats
    let initialStats: any;
    {
      const res = await fetch(`${baseUrl}/admin/members`, {
        headers: {
          'x-user-id': 'admin-super-001',
          'x-user-email': 'admin@aitoon.edu',
          'x-user-role': 'admin',
        },
      });
      const data = await res.json() as any;
      assert(res.status === 200, 'Admin request to /api/admin/members succeeds with 200 OK');
      assert(data.success === true, 'Admin response success = true');
      assert(Array.isArray(data.data.members), 'Admin receives members list');
      assert(data.data.members.some((m: any) => m.sessionStatus === 'logged_in'), 'Admin sees logged-in members');
      assert(data.data.members.some((m: any) => m.sessionStatus === 'logged_out'), 'Admin sees logged-out members');
      assert(data.data.stats.maxAdmins === 5, 'Stats show maxAdmins = 5');
      initialStats = data.data.stats;
      console.log(`     Current Admins: ${initialStats.adminCount}/${initialStats.maxAdmins}, Total Members: ${initialStats.totalMembers}`);
    }

    // 5. Member session update (login and logout tracking)
    {
      // Log out alex
      const logoutRes = await fetch(`${baseUrl}/members/session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: 'demo-student-id-123',
          email: 'alex.explorer@student.aitoon.edu',
          status: 'logged_out',
        }),
      });
      const logoutData = await logoutRes.json() as any;
      assert(logoutData.data.sessionStatus === 'logged_out', 'Alex session correctly updated to logged_out');

      // Check admin view reflects Alex as logged_out
      const adminRes = await fetch(`${baseUrl}/admin/members`, {
        headers: {
          'x-user-id': 'admin-super-001',
          'x-user-email': 'admin@aitoon.edu',
          'x-user-role': 'admin',
        },
      });
      const adminData = await adminRes.json() as any;
      const alex = adminData.data.members.find((m: any) => m.id === 'demo-student-id-123');
      assert(alex?.sessionStatus === 'logged_out', 'Admin view immediately reflects Alex as logged_out');

      // Log alex back in
      const loginRes = await fetch(`${baseUrl}/members/session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: 'demo-student-id-123',
          email: 'alex.explorer@student.aitoon.edu',
          status: 'logged_in',
        }),
      });
      const loginData = await loginRes.json() as any;
      assert(loginData.data.sessionStatus === 'logged_in', 'Alex session correctly restored to logged_in');
    }

    // 6. Admin verifies an account and sets whether user or admin
    {
      // Verify priya and set as user
      const verifyRes = await fetch(`${baseUrl}/admin/members/user-priya-006/verify`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': 'admin-super-001',
          'x-user-email': 'admin@aitoon.edu',
          'x-user-role': 'admin',
        },
        body: JSON.stringify({
          verificationStatus: 'verified',
          role: 'user',
        }),
      });
      const verifyData = await verifyRes.json() as any;
      assert(verifyRes.status === 200, 'Admin can verify member and confirm role = user');
      assert(verifyData.data.member.verificationStatus === 'verified', 'Priya is now marked as verified');
      assert(verifyData.data.member.role === 'user', 'Priya confirmed as role = user');
    }

    // 7. Test Admin Limit: Fill up to 5 admins, then verify 6th admin attempt is REJECTED
    {
      // We start with 2 admins. Let's promote members until we reach 5 admins.
      // Promote maya -> admin (Admin #3)
      const p1 = await fetch(`${baseUrl}/admin/members/user-maya-004/role`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': 'admin-super-001',
          'x-user-email': 'admin@aitoon.edu',
          'x-user-role': 'admin',
        },
        body: JSON.stringify({ role: 'admin' }),
      });
      const p1Data = await p1.json() as any;
      assert(p1.status === 200 && p1Data.data.stats.adminCount === 3, 'Successfully promoted Maya to Admin (3/5)');

      // Promote rohit -> admin (Admin #4)
      const p2 = await fetch(`${baseUrl}/admin/members/user-rohit-005/role`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': 'admin-super-001',
          'x-user-email': 'admin@aitoon.edu',
          'x-user-role': 'admin',
        },
        body: JSON.stringify({ role: 'admin' }),
      });
      const p2Data = await p2.json() as any;
      assert(p2.status === 200 && p2Data.data.stats.adminCount === 4, 'Successfully promoted Rohit to Admin (4/5)');

      // Promote priya -> admin (Admin #5 - MAX LIMIT REACHED)
      const p3 = await fetch(`${baseUrl}/admin/members/user-priya-006/role`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': 'admin-super-001',
          'x-user-email': 'admin@aitoon.edu',
          'x-user-role': 'admin',
        },
        body: JSON.stringify({ role: 'admin' }),
      });
      const p3Data = await p3.json() as any;
      assert(p3.status === 200 && p3Data.data.stats.adminCount === 5, 'Successfully promoted Priya to Admin (5/5 slots full)');

      // NOW attempt to promote a 6th member (arjun) to admin -> MUST BE BLOCKED WITH 400!
      const p4 = await fetch(`${baseUrl}/admin/members/user-arjun-007/role`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': 'admin-super-001',
          'x-user-email': 'admin@aitoon.edu',
          'x-user-role': 'admin',
        },
        body: JSON.stringify({ role: 'admin' }),
      });
      const p4Data = await p4.json() as any;
      assert(p4.status === 400, 'Promotion to 6th admin is strictly rejected with 400 Bad Request', `Got status ${p4.status}`);
      assert(p4Data.error?.code === 'ADMIN_LIMIT_EXCEEDED', 'Error code is ADMIN_LIMIT_EXCEEDED');
      assert(p4Data.error?.message?.includes('5'), 'Error message clearly references the 5 admin limit');

      // Also verify setting role = admin during account verification is ALSO blocked when 5 admins exist
      const p5 = await fetch(`${baseUrl}/admin/members/user-arjun-007/verify`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': 'admin-super-001',
          'x-user-email': 'admin@aitoon.edu',
          'x-user-role': 'admin',
        },
        body: JSON.stringify({ verificationStatus: 'verified', role: 'admin' }),
      });
      const p5Data = await p5.json() as any;
      assert(p5.status === 400, 'Account verification with role = admin is blocked when 5 admins exist', `Got status ${p5.status}`);

      // Reset test state: Demote Maya and Rohit back to user so we keep 2-3 admins for demo
      await fetch(`${baseUrl}/admin/members/user-maya-004/role`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': 'admin-super-001',
          'x-user-email': 'admin@aitoon.edu',
          'x-user-role': 'admin',
        },
        body: JSON.stringify({ role: 'user' }),
      });
      await fetch(`${baseUrl}/admin/members/user-rohit-005/role`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': 'admin-super-001',
          'x-user-email': 'admin@aitoon.edu',
          'x-user-role': 'admin',
        },
        body: JSON.stringify({ role: 'user' }),
      });
      await fetch(`${baseUrl}/admin/members/user-priya-006/role`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': 'admin-super-001',
          'x-user-email': 'admin@aitoon.edu',
          'x-user-role': 'admin',
        },
        body: JSON.stringify({ role: 'user' }),
      });
      console.log('     Cleaned up test promotions back to default demo state.');
    }

  } catch (err) {
    console.error('Unexpected error during testing:', err);
    failures++;
  } finally {
    server.close();
  }

  if (failures === 0) {
    console.log('\n🎉 ALL AUTHENTICATION & ADMIN ACCESS TESTS PASSED SUCCESSFULLY!');
  } else {
    console.error(`\n❌ ${failures} test(s) failed.`);
    process.exit(1);
  }
}

runTests();

