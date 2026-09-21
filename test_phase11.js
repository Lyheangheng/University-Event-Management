const http = require('http');
const crypto = require('crypto');

const API_BASE = 'http://localhost:3001/api';

function makeRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode, headers: res.headers, body: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, body });
        }
      });
    });

    req.on('error', (err) => reject(err));

    if (postData) {
      req.write(typeof postData === 'object' ? JSON.stringify(postData) : postData);
    }
    req.end();
  });
}

async function runPhase11Tests() {
  console.log('====================================================');
  console.log('     PHASE 11: LINE INTEGRATION VERIFICATION TESTS    ');
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

  try {
    // 1. Backend Health Check
    console.log('--- 1. Health & Core Endpoints Regression ---');
    const health = await makeRequest({
      hostname: 'localhost',
      port: 3001,
      path: '/api/health',
      method: 'GET',
    });
    assert(health.status === 200 && health.body.data?.status === 'ok', 'GET /api/health returns HTTP 200 OK');

    // 2. Events endpoint
    const events = await makeRequest({
      hostname: 'localhost',
      port: 3001,
      path: '/api/events',
      method: 'GET',
    });
    assert(events.status === 200 && Array.isArray(events.body.data), 'GET /api/events returns array of events');

    // 3. Admin Authentication
    const adminLogin = await makeRequest(
      {
        hostname: 'localhost',
        port: 3001,
        path: '/api/auth/admin/login',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
      { username: 'admin', password: 'AdminPass123!' }
    );
    assert(adminLogin.status === 200 && adminLogin.body.data?.accessToken, 'POST /api/auth/admin/login succeeds with AdminPass123!');

    // 4. LINE Webhook without signature header
    console.log('\n--- 2. LINE Webhook HMAC-SHA256 Signature Verification ---');
    const webhookNoSig = await makeRequest(
      {
        hostname: 'localhost',
        port: 3001,
        path: '/api/line/webhook',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
      { events: [] }
    );
    assert(webhookNoSig.status === 401, 'Webhook without x-line-signature header rejected with 401 Unauthorized');

    // 5. LINE Webhook with invalid signature header
    const webhookBadSig = await makeRequest(
      {
        hostname: 'localhost',
        port: 3001,
        path: '/api/line/webhook',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-line-signature': 'invalid_signature_base64==',
        },
      },
      { events: [] }
    );
    assert(webhookBadSig.status === 401, 'Webhook with invalid x-line-signature rejected with 401 Unauthorized');

    // 6. LINE Webhook with valid signature (using dev fallback channel secret)
    const channelSecret = process.env.LINE_CHANNEL_SECRET || 'dev_line_channel_secret_placeholder';
    const rawBody = JSON.stringify({ events: [{ type: 'follow', source: { userId: 'U1234567890' } }] });
    const validSignature = crypto
      .createHmac('SHA256', channelSecret.trim())
      .update(rawBody)
      .digest('base64');

    const webhookValid = await makeRequest(
      {
        hostname: 'localhost',
        port: 3001,
        path: '/api/line/webhook',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-line-signature': validSignature,
        },
      },
      rawBody
    );
    assert(webhookValid.status === 200 && webhookValid.body.success === true, 'Webhook with valid HMAC-SHA256 signature accepted with 200 OK');

    // 7. LINE Verify ID Token endpoint with invalid token
    console.log('\n--- 3. LINE ID Token OAuth Verification ---');
    const verifyInvalidToken = await makeRequest(
      {
        hostname: 'localhost',
        port: 3001,
        path: '/api/line/verify-token',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
      { idToken: 'invalid_token_example' }
    );
    assert(
      verifyInvalidToken.status === 401,
      'POST /api/line/verify-token with invalid ID token safely rejects with 401 Unauthorized'
    );

    // 8. LINE Link Student with invalid token
    const linkInvalidToken = await makeRequest(
      {
        hostname: 'localhost',
        port: 3001,
        path: '/api/line/link-student',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
      { idToken: 'invalid_token_example', studentId: '65010001' }
    );
    assert(
      linkInvalidToken.status === 401 || (linkInvalidToken.status === 400 && linkInvalidToken.body.success === false),
      'POST /api/line/link-student with invalid token safely rejects linking'
    );

    console.log('\n====================================================');
    console.log(` SUMMARY: ${passed} passed, ${failed} failed`);
    console.log('====================================================\n');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Test execution error:', err);
    process.exit(1);
  }
}

runPhase11Tests();
