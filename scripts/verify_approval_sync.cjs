const { EventEmitter } = require('events');
const { Readable } = require('stream');

function dispatch(app, method, url, body, headers = {}) {
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
  console.log('--- STARTING IN-PROCESS APPROVAL WORKFLOW VERIFICATION (TESTS A - F) ---');

  // Load backend app
  const { createApp } = await import('../backend/dist/app.js');
  const app = createApp();

  const postJson = (endpoint, data, headers = {}) => dispatch(app, 'POST', `/api${endpoint}`, data, headers);
  const getJson = (endpoint, headers = {}) => dispatch(app, 'GET', `/api${endpoint}`, null, headers);

  // 1. Log in Master Admin
  console.log('\n[TEST SETUP] Logging in Master Admin (muni57575751@gmail.com)...');
  const adminLogin = await postJson('/auth/login', {
    email: 'muni57575751@gmail.com',
    password: 'Poola@1234',
  });
  if (!adminLogin.ok || !adminLogin.data?.data?.token) {
    throw new Error(`Admin login failed: ${JSON.stringify(adminLogin.data)}`);
  }
  const adminToken = adminLogin.data.data.token;
  const adminHeaders = { Authorization: `Bearer ${adminToken}` };
  console.log('✅ Master Admin authenticated successfully.');

  // 2. TEST A: New Registration
  const ts = Date.now();
  const aliceEmail = `student_alice_${ts}@example.com`;
  console.log(`\n[TEST A] Registering new student account (${aliceEmail})...`);
  const regRes = await postJson('/auth/register', {
    name: 'Alice Student',
    email: aliceEmail,
    password: 'Password123!',
  });
  if (!regRes.ok || !regRes.data?.data?.user) {
    throw new Error(`Registration failed: ${JSON.stringify(regRes.data)}`);
  }
  const aliceUser = regRes.data.data.user;
  const aliceToken = regRes.data.data.token;
  const aliceHeaders = { Authorization: `Bearer ${aliceToken}` };

  if (aliceUser.verificationStatus !== 'pending') {
    throw new Error(`Expected pending status, got: ${aliceUser.verificationStatus}`);
  }
  console.log('✅ Student registered with pending verificationStatus.');

  // Verify Alice cannot access protected quiz or private actions while pending
  const aliceGenAttempt = await postJson(
    '/stories/generate',
    {
      topic: 'Gravity and Space',
      gradeLevel: '3rd Grade',
      readingLevel: 'intermediate',
      storyTone: 'funny',
    },
    aliceHeaders
  );
  if (aliceGenAttempt.status !== 403 || aliceGenAttempt.data?.error?.code !== 'PENDING_APPROVAL') {
    throw new Error(
      `Expected 403 PENDING_APPROVAL, got: ${aliceGenAttempt.status} ${JSON.stringify(aliceGenAttempt.data)}`
    );
  }
  console.log('✅ Protected endpoint strictly rejected pending student with HTTP 403 PENDING_APPROVAL.');

  // 3. TEST B: Admin Approval by User ID
  console.log('\n[TEST B] Admin approving Alice by user ID...');
  const approveRes = await postJson(
    `/admin/members/${aliceUser.id}/approve`,
    { role: 'user' },
    adminHeaders
  );
  if (!approveRes.ok || !approveRes.data?.success) {
    throw new Error(`Approval failed: ${JSON.stringify(approveRes.data)}`);
  }
  console.log('✅ Admin approval API returned HTTP 200 success.');

  // Verify member list still has Alice and status is verified
  const membersListRes = await getJson('/admin/members', adminHeaders);
  const aliceInList = membersListRes.data?.data?.members?.find((m) => m.id === aliceUser.id);
  if (!aliceInList) {
    throw new Error('Alice was deleted or missing from admin directory after approval!');
  }
  if (aliceInList.verificationStatus !== 'verified' && aliceInList.verificationStatus !== 'approved') {
    throw new Error(`Alice status in admin directory is not approved: ${aliceInList.verificationStatus}`);
  }
  console.log('✅ Alice remains present in Admin directory with approved status (never deleted).');

  // 4. TEST C: Student Session Refresh
  console.log('\n[TEST C] Verifying Alice session refresh without re-registration...');
  const aliceProfileRes = await getJson('/members/me', aliceHeaders);
  if (!aliceProfileRes.ok) {
    throw new Error(`Profile fetch failed: ${JSON.stringify(aliceProfileRes.data)}`);
  }
  const freshProfile = aliceProfileRes.data.data;
  if (freshProfile.verificationStatus !== 'verified' && freshProfile.verificationStatus !== 'approved') {
    throw new Error(`Profile status is not approved: ${freshProfile.verificationStatus}`);
  }
  const freshAliceToken = freshProfile.token;
  if (!freshAliceToken) {
    throw new Error('Backend did not return fresh JWT token upon profile refresh!');
  }
  console.log('✅ Student profile returned approved status and fresh JWT.');

  // Verify Alice with either stale token or fresh token can now access protected features
  // (Middleware checks live database!)
  const aliceCheckLiveStatus = await getJson('/members/me', { Authorization: `Bearer ${aliceToken}` });
  if (aliceCheckLiveStatus.data?.data?.verificationStatus !== 'verified') {
    throw new Error('Database check did not promote stale token to verified in middleware!');
  }
  console.log('✅ Stale token automatically resolves to live database approved status!');

  // 5. TEST D: Persistence Across Refreshes and Re-Logins
  console.log(`\n[TEST D] Re-authenticating Alice via /auth/login...`);
  const aliceReLogin = await postJson('/auth/login', {
    email: aliceEmail,
    password: 'Password123!',
  });
  if (!aliceReLogin.ok) {
    throw new Error(`Re-login failed: ${JSON.stringify(aliceReLogin.data)}`);
  }
  if (aliceReLogin.data.data.user.verificationStatus !== 'verified') {
    throw new Error(`Re-login returned non-verified status: ${aliceReLogin.data.data.user.verificationStatus}`);
  }
  console.log('✅ Re-login confirmed approval permanently persisted in database.');

  // 6. TEST E: Multiple Accounts Sync & Stats
  console.log('\n[TEST E] Testing multiple accounts (Bob, Charlie, David)...');
  const bobEmail = `bob_${ts}@example.com`;
  const charlieEmail = `charlie_${ts}@example.com`;
  const davidEmail = `david_${ts}@example.com`;

  await postJson('/auth/register', { name: 'Bob', email: bobEmail, password: 'Password123!' });
  const regCharlie = await postJson('/auth/register', { name: 'Charlie', email: charlieEmail, password: 'Password123!' });
  await postJson('/auth/register', { name: 'David', email: davidEmail, password: 'Password123!' });

  // Approve Bob and Charlie, leave David pending
  await postJson(`/admin/members/${regCharlie.data.data.user.id}/approve`, { role: 'user' }, adminHeaders);
  await postJson(`/admin/members/${bobEmail}/approve`, { role: 'user' }, adminHeaders);

  const statsRes = await getJson('/admin/members', adminHeaders);
  const allMembers = statsRes.data.data.members;
  const david = allMembers.find((m) => m.email === davidEmail);
  const bob = allMembers.find((m) => m.email === bobEmail);
  const charlie = allMembers.find((m) => m.email === charlieEmail);

  if (!david || david.verificationStatus !== 'pending') throw new Error('David should be pending');
  if (!bob || (bob.verificationStatus !== 'verified' && bob.verificationStatus !== 'approved')) throw new Error('Bob should be approved');
  if (!charlie || (charlie.verificationStatus !== 'verified' && charlie.verificationStatus !== 'approved')) throw new Error('Charlie should be approved');
  console.log('✅ Multiple accounts correctly separated (2 approved, 1 pending) in directory.');

  // 7. TEST F: Security & RBAC Checks
  console.log('\n[TEST F] Verifying Security: Student cannot call admin endpoints...');
  const studentHackingRes = await postJson(
    `/admin/members/${david.id}/approve`,
    { role: 'admin' },
    { Authorization: `Bearer ${aliceReLogin.data.data.token}` }
  );
  if (studentHackingRes.status !== 403 && studentHackingRes.status !== 401) {
    throw new Error(`Student was able to call admin approve! Status: ${studentHackingRes.status}`);
  }
  console.log('✅ Unauthorized student approval blocked with HTTP 403 Forbidden.');

  console.log('\n======================================================');
  console.log('🎉 ALL TESTS PASSED SUCCESSFULLY! (TESTS A, B, C, D, E, F)');
  console.log('======================================================\n');
}

run().catch((err) => {
  console.error('❌ TEST FAILED:', err);
  process.exit(1);
});
