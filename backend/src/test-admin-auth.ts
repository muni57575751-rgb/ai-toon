import { createApp } from './app.js';
import type { Server } from 'http';
import { MASTER_ADMIN_EMAIL, MASTER_ADMIN_PASSWORD } from './services/member.service.js';

async function runTests() {
  console.log('🧪 Starting Authentication, Admin Credentials & Approval Workflow Tests...\n');
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
    // 1. Master Admin Login with muni57575751@gmail.com and Poola@1234
    let adminId = 'admin-muni-master';
    {
      const res = await fetch(`${baseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: MASTER_ADMIN_EMAIL,
          password: MASTER_ADMIN_PASSWORD,
        }),
      });
      const data = await res.json() as any;
      assert(res.status === 200, `Admin login with ${MASTER_ADMIN_EMAIL} and correct password succeeds`);
      assert(data.success === true, 'Login response has success = true');
      assert(data.data.user.role === 'admin', 'Muni user role is verified as "admin"');
      assert(data.data.user.email === MASTER_ADMIN_EMAIL, 'Email matches master admin email');
      adminId = data.data.user.id;
    }

    // 2. Master Admin with incorrect password MUST be rejected
    {
      const res = await fetch(`${baseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: MASTER_ADMIN_EMAIL,
          password: 'IncorrectPassword!99',
        }),
      });
      const data = await res.json() as any;
      assert(res.status === 401, 'Admin login with incorrect password returns 401 Unauthorized');
      assert(data.success === false, 'Rejected login response indicates success = false');
    }

    // 3. Unauthenticated request to /api/admin/members fails with 401
    {
      const res = await fetch(`${baseUrl}/admin/members`);
      assert(res.status === 401, 'Unauthenticated request to /api/admin/members returns 401');
    }

    // 4. Register a new user: John Doe
    const testUserEmail = `john.student.${Date.now()}@example.com`;
    const testUserPass = 'Student@1234';
    let newUserId = '';
    let notificationId = '';

    {
      const res = await fetch(`${baseUrl}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'John Doe',
          email: testUserEmail,
          password: testUserPass,
        }),
      });
      const data = await res.json() as any;
      assert(res.status === 201, 'User registration returns 201 Created');
      assert(data.data.pendingApproval === true, 'New account indicates pendingApproval = true');
      assert(data.data.member.verificationStatus === 'pending', 'New account status is "pending"');
      newUserId = data.data.member.id;
    }

    // 5. Newly registered user CANNOT log in while pending approval
    {
      const res = await fetch(`${baseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testUserEmail,
          password: testUserPass,
        }),
      });
      const data = await res.json() as any;
      assert(res.status === 403, 'Pending user login attempt is blocked with 403 Forbidden');
      assert(data.error?.code === 'PENDING_APPROVAL', 'Error code is PENDING_APPROVAL');
      assert(data.error?.message?.includes(MASTER_ADMIN_EMAIL), 'Message informs user about Admin approval requirement');
    }

    // 6. Admin Portal checks notifications and sees John Doe's pending registration
    {
      const res = await fetch(`${baseUrl}/admin/notifications`, {
        headers: {
          'x-user-id': adminId,
          'x-user-email': MASTER_ADMIN_EMAIL,
          'x-user-role': 'admin',
        },
      });
      const data = await res.json() as any;
      assert(res.status === 200, 'Admin can fetch /api/admin/notifications');
      assert(Array.isArray(data.data.notifications), 'Notifications array returned');
      const matchingNotif = data.data.notifications.find((n: any) => n.email === testUserEmail);
      assert(Boolean(matchingNotif), 'Admin received notification for newly registered account');
      assert(matchingNotif?.status === 'pending', 'Notification status is pending');
      notificationId = matchingNotif?.id || '';
    }

    // 7. Non-admin attempting to access admin notifications is blocked with 403
    {
      const res = await fetch(`${baseUrl}/admin/notifications`, {
        headers: {
          'x-user-id': newUserId,
          'x-user-email': testUserEmail,
          'x-user-role': 'user',
        },
      });
      assert(res.status === 403, 'Normal user blocked from admin notifications with 403 Forbidden');
    }

    // 8. Admin approves John Doe as a regular User
    {
      const res = await fetch(`${baseUrl}/admin/notifications/${notificationId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': adminId,
          'x-user-email': MASTER_ADMIN_EMAIL,
          'x-user-role': 'admin',
        },
        body: JSON.stringify({ role: 'user' }),
      });
      const data = await res.json() as any;
      assert(res.status === 200, 'Admin successfully approved account via notification');
      assert(data.data.member.verificationStatus === 'verified', 'Member is now verified');
      assert(data.data.member.role === 'user', 'Member role set to "user"');
      assert(data.data.notification.status === 'approved', 'Notification marked as approved');
    }

    // 9. Now John Doe CAN log in!
    {
      const res = await fetch(`${baseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testUserEmail,
          password: testUserPass,
        }),
      });
      const data = await res.json() as any;
      assert(res.status === 200, 'Approved user can now successfully log in');
      assert(data.data.user.role === 'user', 'Logged-in user role is "user"');
      assert(data.data.user.sessionStatus === 'logged_in', 'User session status is now "logged_in"');
    }

    // 10. Verify Admin Limit (5 Max):
    // Register 4 more accounts and promote them to Admin until we reach 5 admins total
    {
      const promoIds: string[] = [];
      for (let i = 1; i <= 4; i++) {
        const email = `admin.candidate.${i}.${Date.now()}@test.edu`;
        const regRes = await fetch(`${baseUrl}/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: `Admin Candidate ${i}`, email, password: 'Password@123' }),
        });
        const regData = await regRes.json() as any;
        const candidateId = regData.data.member.id;
        promoIds.push(candidateId);

        // Promote to admin
        const promoRes = await fetch(`${baseUrl}/admin/members/${candidateId}/role`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': adminId,
            'x-user-email': MASTER_ADMIN_EMAIL,
            'x-user-role': 'admin',
          },
          body: JSON.stringify({ role: 'admin' }),
        });
        const promoData = await promoRes.json() as any;
        assert(promoRes.status === 200, `Promoted candidate ${i} to Admin (total admins: ${promoData.data.stats.adminCount}/5)`);
      }

      // Check stats show 5/5 admins
      const statsRes = await fetch(`${baseUrl}/admin/stats`, {
        headers: {
          'x-user-id': adminId,
          'x-user-email': MASTER_ADMIN_EMAIL,
          'x-user-role': 'admin',
        },
      });
      const statsData = await statsRes.json() as any;
      assert(statsData.data.adminCount === 5, 'System currently has exactly 5 admins (5/5)');

      // Attempt to promote John Doe to a 6th admin -> MUST BE BLOCKED WITH 400!
      const p6 = await fetch(`${baseUrl}/admin/members/${newUserId}/role`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': adminId,
          'x-user-email': MASTER_ADMIN_EMAIL,
          'x-user-role': 'admin',
        },
        body: JSON.stringify({ role: 'admin' }),
      });
      const p6Data = await p6.json() as any;
      assert(p6.status === 400, 'Promotion to 6th admin is strictly rejected with 400 Bad Request');
      assert(p6Data.error?.code === 'ADMIN_LIMIT_EXCEEDED', 'Error code is ADMIN_LIMIT_EXCEEDED');
      assert(p6Data.error?.message?.includes('5'), 'Error message clearly specifies 5-admin quota limit');
    }

    // 11. Clean Reset: Wipe all accounts except Muni
    {
      const resetRes = await fetch(`${baseUrl}/admin/members/reset`, {
        method: 'POST',
        headers: {
          'x-user-id': adminId,
          'x-user-email': MASTER_ADMIN_EMAIL,
          'x-user-role': 'admin',
        },
      });
      const resetData = await resetRes.json() as any;
      assert(resetRes.status === 200, 'System reset succeeded');
      assert(resetData.data.members.length === 1, 'Only 1 member remains in system');
      assert(resetData.data.members[0].email === MASTER_ADMIN_EMAIL, `Only Master Admin (${MASTER_ADMIN_EMAIL}) remains`);
      assert(resetData.data.stats.adminCount === 1, 'Admin count reset back to 1');
    }

  } catch (err) {
    console.error('Unexpected error during testing:', err);
    failures++;
  } finally {
    server.close();
  }

  if (failures === 0) {
    console.log('\n🎉 ALL AUTHENTICATION, ADMIN & NOTIFICATION TESTS PASSED SUCCESSFULLY!');
  } else {
    console.error(`\n❌ ${failures} test(s) failed.`);
    process.exit(1);
  }
}

runTests();
