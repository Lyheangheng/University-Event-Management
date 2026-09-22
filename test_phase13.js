const http = require('http');
const crypto = require('crypto');
const { LocalStorageProvider } = require('./apps/api/dist/storage/local-storage.provider');
const { StorageService } = require('./apps/api/dist/storage/storage.service');
const { AttendanceService } = require('./apps/api/dist/attendance/attendance.service');
const { EventsService } = require('./apps/api/dist/events/events.service');
const { LineService } = require('./apps/api/dist/line/line.service');

const API_PORT = 3001;

function makeRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = Buffer.alloc(0);
      res.on('data', (chunk) => {
        body = Buffer.concat([body, chunk]);
      });
      res.on('end', () => {
        const text = body.toString('utf-8');
        try {
          const parsed = JSON.parse(text);
          resolve({ status: res.statusCode, headers: res.headers, body: parsed, rawBody: body });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, body: text, rawBody: body });
        }
      });
    });

    req.on('error', (err) => reject(err));

    if (postData) {
      if (Buffer.isBuffer(postData)) {
        req.write(postData);
      } else if (typeof postData === 'object') {
        req.write(JSON.stringify(postData));
      } else {
        req.write(postData);
      }
    }
    req.end();
  });
}

async function runPhase13SecurityTests() {
  console.log('====================================================');
  console.log('    PHASE 13: SECURITY & VALIDATION TEST SUITE       ');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`[PASS] ${message}`);
      passed++;
    } else {
      console.error(`[FAIL] ${message}`);
      failed++;
    }
  }

  // 1. Direct Storage Unit & Security Checks
  console.log('--- 1. File & Storage Security Tests (O, P, Q) ---');
  const localStorageProvider = new LocalStorageProvider();
  const mockConfigService = {
    get: (key) => (key === 'storageProvider' ? 'local' : null),
  };
  const storageService = new StorageService(mockConfigService, localStorageProvider);

  // Test O: Path traversal upload / retrieval attempt rejected
  try {
    await storageService.getFilePath('../../package.json', 'proofs');
    assert(false, 'O. Path traversal attempt should have thrown exception');
  } catch (err) {
    assert(
      err.message.includes('Path traversal') || err.message.includes('Invalid filename'),
      'O. Path traversal request safely rejected',
    );
  }

  // Test P: Oversized upload rejected
  try {
    const hugeBuffer = Buffer.alloc(5 * 1024 * 1024 + 100);
    await storageService.saveFile(
      { originalname: 'huge.jpg', buffer: hugeBuffer, mimetype: 'image/jpeg', size: hugeBuffer.length },
      { subfolder: 'proofs' },
    );
    assert(false, 'P. Oversized upload should have been rejected');
  } catch (err) {
    assert(err.message.includes('5MB maximum limit') || err.message.includes('exceeds'), 'P. Oversized upload (> 5 MB) safely rejected');
  }

  // Test Q: Unsupported file type rejected
  try {
    const txtBuffer = Buffer.from('malicious script execution payload');
    await storageService.saveFile(
      { originalname: 'script.sh', buffer: txtBuffer, mimetype: 'text/plain', size: txtBuffer.length },
      { subfolder: 'proofs' },
    );
    assert(false, 'Q. Unsupported file type should have been rejected');
  } catch (err) {
    assert(err.message.includes('Invalid file type'), 'Q. Unsupported file type (text/plain) safely rejected');
  }

  // 2. Production Environment Auth Scoping Test (E)
  console.log('\n--- 2. Environment Scoping & Impersonation Security (E) ---');
  try {
    const mockPrisma = {};
    const mockConfigProd = {
      get: (key) => (key === 'nodeEnv' ? 'production' : null),
    };
    const prodAttendanceService = new AttendanceService(mockPrisma, mockConfigProd, storageService);
    await prodAttendanceService.resolveStudent('65010001');
    assert(false, 'E. Production environment x-dev-student-id should have been rejected');
  } catch (err) {
    assert(
      err.message.includes('production environment'),
      'E. Production environment safely rejects x-dev-student-id header bypass',
    );
  }

  // 3. HTTP Server Endpoints Security & Authorization Tests (A - X)
  console.log('\n--- 3. API Route Security & Authorization Checks ---');

  // Test A: Unauthenticated admin endpoint returns 401
  const unauthAdmin = await makeRequest({
    hostname: 'localhost',
    port: API_PORT,
    path: '/api/auth/admin/me',
    method: 'GET',
  });
  assert(unauthAdmin.status === 401, 'A. Unauthenticated request to /api/auth/admin/me rejects with HTTP 401 Unauthorized');

  // Test C: Invalid JWT returns 401
  const badJwtRes = await makeRequest({
    hostname: 'localhost',
    port: API_PORT,
    path: '/api/auth/admin/me',
    method: 'GET',
    headers: { Authorization: 'Bearer invalid.jwt.token' },
  });
  assert(badJwtRes.status === 401, 'C. Request with invalid JWT token rejects with HTTP 401 Unauthorized');

  // Test D: Expired/malformed JWT rejected
  const fakePayload = Buffer.from(JSON.stringify({ sub: 'admin-id', role: 'ADMIN', exp: 1000 })).toString('base64');
  const fakeToken = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${fakePayload}.invalid_signature`;
  const expiredJwtRes = await makeRequest({
    hostname: 'localhost',
    port: API_PORT,
    path: '/api/auth/admin/me',
    method: 'GET',
    headers: { Authorization: `Bearer ${fakeToken}` },
  });
  assert(expiredJwtRes.status === 401, 'D. Request with forged/expired JWT signature rejects with HTTP 401 Unauthorized');

  // Test H: Event mutation without admin token returns 401/403
  const eventCreateNoAuth = await makeRequest(
    {
      hostname: 'localhost',
      port: API_PORT,
      path: '/api/events',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    { title: 'Unauthorized Event', description: 'Test', date: '2026-10-01', startTime: '2026-10-01T09:00:00Z', endTime: '2026-10-01T10:00:00Z', location: 'Hall A', targetGroup: 'All' },
  );
  assert(
    eventCreateNoAuth.status === 401 || eventCreateNoAuth.status === 403,
    'H. Event creation without admin token rejects with HTTP 401/403',
  );

  // Test N: Invalid attendance session token returns 404
  const invalidSessionRes = await makeRequest({
    hostname: 'localhost',
    port: API_PORT,
    path: '/api/attendance/sessions/invalid_session_token_999',
    method: 'GET',
  });
  assert(invalidSessionRes.status === 404, 'N. Invalid attendance session token returns HTTP 404 Not Found');

  // Test R: Invalid LINE Webhook signature returns 401
  const webhookBadSig = await makeRequest(
    {
      hostname: 'localhost',
      port: API_PORT,
      path: '/api/line/webhook',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-line-signature': 'forged_signature_value',
      },
    },
    { events: [] },
  );
  assert(webhookBadSig.status === 401, 'R. LINE Webhook request with invalid signature rejects with HTTP 401 Unauthorized');

  // Test S: Invalid LINE ID token returns 401
  const verifyTokenBad = await makeRequest(
    {
      hostname: 'localhost',
      port: API_PORT,
      path: '/api/line/verify-token',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    { idToken: 'invalid_line_id_token' },
  );
  assert(verifyTokenBad.status === 401, 'S. LINE verify-token with invalid ID token rejects with HTTP 401 Unauthorized');

  // Test T: Secrets/access tokens not exposed in API responses
  const healthRes = await makeRequest({
    hostname: 'localhost',
    port: API_PORT,
    path: '/api/health',
    method: 'GET',
  });
  const textResponse = JSON.stringify(healthRes.body);
  assert(
    !textResponse.includes('LINE_CHANNEL_SECRET') && !textResponse.includes('JWT_SECRET') && !textResponse.includes('POSTGRES_PASSWORD'),
    'T. API response payloads do not leak system environment secrets',
  );

  // Test U: Malformed request body / invalid DTO types rejected with 400
  const malformedVerifyToken = await makeRequest(
    {
      hostname: 'localhost',
      port: API_PORT,
      path: '/api/line/verify-token',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    { idToken: 12345 }, // Invalid type (number instead of string)
  );
  assert(malformedVerifyToken.status === 400, 'U. Malformed request body (invalid type for idToken) rejects with HTTP 400 Bad Request');

  console.log('\n====================================================');
  console.log(` SUMMARY: ${passed} passed, ${failed} failed`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase13SecurityTests();
