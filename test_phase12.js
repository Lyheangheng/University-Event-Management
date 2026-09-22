const http = require('http');
const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
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

function createMultipartBody(fields, file) {
  const boundary = `--------------------------${Date.now().toString(16)}${crypto.randomBytes(8).toString('hex')}`;
  const parts = [];

  if (fields) {
    for (const [key, value] of Object.entries(fields)) {
      parts.push(
        Buffer.from(
          `--${boundary}\r\nContent-Disposition: form-data; name="${key}"\r\n\r\n${value}\r\n`,
        ),
      );
    }
  }

  if (file) {
    const fieldName = file.fieldName || 'photo';
    const filename = file.filename || 'test.jpg';
    const mimetype = file.mimetype || 'image/jpeg';
    const buffer = file.buffer || Buffer.from('test image contents');

    parts.push(
      Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="${fieldName}"; filename="${filename}"\r\nContent-Type: ${mimetype}\r\n\r\n`,
      ),
    );
    parts.push(buffer);
    parts.push(Buffer.from('\r\n'));
  }

  parts.push(Buffer.from(`--${boundary}--\r\n`));

  const bodyBuffer = Buffer.concat(parts);
  return {
    boundary,
    contentType: `multipart/form-data; boundary=${boundary}`,
    bodyBuffer,
  };
}

async function runPhase12Tests() {
  console.log('====================================================');
  console.log('    PHASE 12: FILE & IMAGE HANDLING TEST SUITE      ');
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
    // 1. Core Regression & Health Checks
    console.log('--- 1. Health & Core Regression Checks ---');
    const health = await makeRequest({
      hostname: 'localhost',
      port: API_PORT,
      path: '/api/health',
      method: 'GET',
    });
    assert(health.status === 200 && health.body.data?.status === 'ok', 'GET /api/health returns 200 OK');

    const adminLogin = await makeRequest(
      {
        hostname: 'localhost',
        port: API_PORT,
        path: '/api/auth/admin/login',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
      { username: 'admin', password: 'AdminPass123!' },
    );
    assert(adminLogin.status === 200 && adminLogin.body.data?.accessToken, 'Admin login succeeds');
    const adminToken = adminLogin.body.data?.accessToken;

    // 2. Prepare test event & session in DB
    console.log('\n--- 2. Setting Up Test Event & Active Session ---');
    const now = new Date();
    const startTime = new Date(now.getTime() - 2 * 60 * 1000); // 2 mins ago
    const endTime = new Date(now.getTime() + 8 * 60 * 1000); // 8 mins from now (check-in window)

    const testEvent = await prisma.event.create({
      data: {
        title: `Phase 12 Storage Test Event ${Date.now()}`,
        description: 'Automated test event for Phase 12 file handling verification',
        date: now,
        startTime,
        endTime,
        location: 'Building 1, Room 101',
        targetGroup: 'All Students',
      },
    });

    const activeSessionRes = await makeRequest({
      hostname: 'localhost',
      port: API_PORT,
      path: `/api/attendance/events/${testEvent.id}/session`,
      method: 'GET',
    });
    assert(
      activeSessionRes.status === 200 && activeSessionRes.body.token,
      'Created active CHECK_IN session for test event',
    );
    const checkInToken = activeSessionRes.body.token;

    // Fetch default test student
    const student = await prisma.student.findFirst();
    assert(!!student, 'Default student found in database for attendance testing');

    // 3. Storage Validation & File Handling Tests (A - I)
    console.log('\n--- 3. Storage & Upload Validation Tests (Requirements A-I) ---');

    // Test A: Valid JPEG Upload succeeds
    const jpegBuffer = Buffer.from('\xFF\xD8\xFF\xE0\x00\x10JFIF\x00\x01\x01\x01\x00\x48\x00\x48\x00\x00\xFF\xDB');
    const jpegPayload = createMultipartBody(
      { feedback: 'Test JPEG proof upload' },
      { fieldName: 'photo', filename: 'my_photo.jpg', mimetype: 'image/jpeg', buffer: jpegBuffer },
    );
    const jpegRes = await makeRequest(
      {
        hostname: 'localhost',
        port: API_PORT,
        path: `/api/attendance/sessions/${checkInToken}/submit`,
        method: 'POST',
        headers: {
          'Content-Type': jpegPayload.contentType,
          'Content-Length': jpegPayload.bodyBuffer.length,
          'x-dev-student-id': student.studentId,
        },
      },
      jpegPayload.bodyBuffer,
    );
    assert(jpegRes.status === 201 || jpegRes.status === 200, 'A. Valid JPEG upload succeeds (HTTP 200/201)');
    const proofUrl = jpegRes.body.data?.attendanceId ? jpegRes.body.data?.proofUrl || jpegRes.body.message : null;

    // Retrieve attendance record to get exact saved proof filename
    const attRecord = await prisma.attendance.findUnique({
      where: {
        studentId_eventId: {
          studentId: student.id,
          eventId: testEvent.id,
        },
      },
    });
    assert(!!attRecord?.checkInProofUrl, 'Attendance record saved checkInProofUrl in DB');
    const checkInProofUrl = attRecord?.checkInProofUrl || '';
    const proofFilename = checkInProofUrl.split('/').pop() || '';

    // Test F: Generated filename is safe and does not contain original filename 'my_photo.jpg'
    assert(
      proofFilename !== 'my_photo.jpg' && !proofFilename.includes('my_photo'),
      'F. Server-generated safe filename replaces original filename',
    );

    // Test G: Stored proof can be retrieved through GET endpoint
    const getProofRes = await makeRequest({
      hostname: 'localhost',
      port: API_PORT,
      path: `/api/attendance/uploads/proofs/${proofFilename}`,
      method: 'GET',
    });
    assert(
      getProofRes.status === 200 && (getProofRes.headers['content-type']?.includes('image/jpeg') || getProofRes.headers['content-type']?.includes('image/jpg')),
      'G. GET stored proof returns HTTP 200 OK with image/jpeg Content-Type header',
    );

    // Create a second test event for PNG and WebP uploads
    const testEvent2 = await prisma.event.create({
      data: {
        title: `Phase 12 PNG/WebP Test Event ${Date.now()}`,
        description: 'Automated test event 2',
        date: now,
        startTime,
        endTime,
        location: 'Building 2',
        targetGroup: 'All Students',
      },
    });
    const sessionRes2 = await makeRequest({
      hostname: 'localhost',
      port: API_PORT,
      path: `/api/attendance/events/${testEvent2.id}/session`,
      method: 'GET',
    });
    const checkInToken2 = sessionRes2.body.token;

    // Test B: Valid PNG upload succeeds
    const pngBuffer = Buffer.from('\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15\xc4\x89');
    const pngPayload = createMultipartBody(
      { feedback: 'Test PNG' },
      { fieldName: 'photo', filename: 'test.png', mimetype: 'image/png', buffer: pngBuffer },
    );
    const pngRes = await makeRequest(
      {
        hostname: 'localhost',
        port: API_PORT,
        path: `/api/attendance/sessions/${checkInToken2}/submit`,
        method: 'POST',
        headers: {
          'Content-Type': pngPayload.contentType,
          'Content-Length': pngPayload.bodyBuffer.length,
          'x-dev-student-id': student.studentId,
        },
      },
      pngPayload.bodyBuffer,
    );
    assert(pngRes.status === 201 || pngRes.status === 200, 'B. Valid PNG upload succeeds');

    // Create a third test event for WebP, size limit, and bad MIME type tests
    const testEvent3 = await prisma.event.create({
      data: {
        title: `Phase 12 WebP/Validation Test Event ${Date.now()}`,
        description: 'Automated test event 3',
        date: now,
        startTime,
        endTime,
        location: 'Building 3',
        targetGroup: 'All Students',
      },
    });
    const sessionRes3 = await makeRequest({
      hostname: 'localhost',
      port: API_PORT,
      path: `/api/attendance/events/${testEvent3.id}/session`,
      method: 'GET',
    });
    const checkInToken3 = sessionRes3.body.token;

    // Test C: Valid WebP upload succeeds
    const webpBuffer = Buffer.from('RIFF\x1a\x00\x00\x00WEBPVP8 \x0e\x00\x00\x00\x30\x01\x00\x9d\x01\x2a\x01\x00\x01\x00\x02');
    const webpPayload = createMultipartBody(
      { feedback: 'Test WebP' },
      { fieldName: 'photo', filename: 'test.webp', mimetype: 'image/webp', buffer: webpBuffer },
    );
    const webpRes = await makeRequest(
      {
        hostname: 'localhost',
        port: API_PORT,
        path: `/api/attendance/sessions/${checkInToken3}/submit`,
        method: 'POST',
        headers: {
          'Content-Type': webpPayload.contentType,
          'Content-Length': webpPayload.bodyBuffer.length,
          'x-dev-student-id': student.studentId,
        },
      },
      webpPayload.bodyBuffer,
    );
    assert(webpRes.status === 201 || webpRes.status === 200, 'C. Valid WebP upload succeeds');

    // Test D: Oversized file (> 5 MB) is rejected with 400
    const oversizedBuffer = Buffer.alloc(5 * 1024 * 1024 + 100);
    const oversizedPayload = createMultipartBody(
      {},
      { fieldName: 'photo', filename: 'huge.jpg', mimetype: 'image/jpeg', buffer: oversizedBuffer },
    );
    const oversizedRes = await makeRequest(
      {
        hostname: 'localhost',
        port: API_PORT,
        path: `/api/attendance/sessions/${checkInToken3}/submit`,
        method: 'POST',
        headers: {
          'Content-Type': oversizedPayload.contentType,
          'Content-Length': oversizedPayload.bodyBuffer.length,
          'x-dev-student-id': student.studentId,
        },
      },
      oversizedPayload.bodyBuffer,
    );
    assert(oversizedRes.status === 400, 'D. File larger than 5 MB is safely rejected with HTTP 400 Bad Request');

    // Test E: Unsupported MIME type is rejected with 400
    const txtBuffer = Buffer.from('This is text file content not image');
    const txtPayload = createMultipartBody(
      {},
      { fieldName: 'photo', filename: 'doc.txt', mimetype: 'text/plain', buffer: txtBuffer },
    );
    const txtRes = await makeRequest(
      {
        hostname: 'localhost',
        port: API_PORT,
        path: `/api/attendance/sessions/${checkInToken3}/submit`,
        method: 'POST',
        headers: {
          'Content-Type': txtPayload.contentType,
          'Content-Length': txtPayload.bodyBuffer.length,
          'x-dev-student-id': student.studentId,
        },
      },
      txtPayload.bodyBuffer,
    );
    assert(txtRes.status === 400, 'E. Unsupported MIME type (text/plain) is rejected with HTTP 400 Bad Request');

    // Test H: Path traversal attempt is rejected
    const traversalRes = await makeRequest({
      hostname: 'localhost',
      port: API_PORT,
      path: '/api/attendance/uploads/proofs/..%2F..%2Fpackage.json',
      method: 'GET',
    });
    assert(
      traversalRes.status === 400 || traversalRes.status === 404,
      'H. Path traversal attempt safely rejected (HTTP 400/404)',
    );

    // Test I: Missing proof returns 404
    const missingRes = await makeRequest({
      hostname: 'localhost',
      port: API_PORT,
      path: '/api/attendance/uploads/proofs/non_existent_file_12345.jpg',
      method: 'GET',
    });
    assert(missingRes.status === 404, 'I. Missing proof photo returns HTTP 404 Not Found');

    // 4. Attendance Workflows & Admin Inspection (J - L)
    console.log('\n--- 4. Check-in / Check-out & Admin Inspection (Requirements J-L) ---');

    // Test J: Check-in with proof already executed above for testEvent
    assert(attRecord?.status === 'INCOMPLETE', 'J. Check-in recorded with proof upload (Status: INCOMPLETE)');

    // Test K: Check-out with proof upload
    // Update event1 time window to simulate check-out window (startTime = 30m ago, endTime = now)
    const checkOutStart = new Date(now.getTime() - 25 * 60 * 1000);
    const checkOutEnd = new Date(now.getTime() + 1000);
    await prisma.event.update({
      where: { id: testEvent.id },
      data: {
        startTime: checkOutStart,
        endTime: checkOutEnd,
      },
    });

    const checkOutSessionRes = await makeRequest({
      hostname: 'localhost',
      port: API_PORT,
      path: `/api/attendance/events/${testEvent.id}/session`,
      method: 'GET',
    });
    assert(
      checkOutSessionRes.status === 200 && checkOutSessionRes.body.token,
      'Created active CHECK_OUT session for test event',
    );
    const checkOutToken = checkOutSessionRes.body.token;

    const checkOutPayload = createMultipartBody(
      { feedback: 'Checking out event' },
      { fieldName: 'photo', filename: 'checkout.jpg', mimetype: 'image/jpeg', buffer: jpegBuffer },
    );
    const checkOutRes = await makeRequest(
      {
        hostname: 'localhost',
        port: API_PORT,
        path: `/api/attendance/sessions/${checkOutToken}/submit`,
        method: 'POST',
        headers: {
          'Content-Type': checkOutPayload.contentType,
          'Content-Length': checkOutPayload.bodyBuffer.length,
          'x-dev-student-id': student.studentId,
        },
      },
      checkOutPayload.bodyBuffer,
    );
    assert(
      checkOutRes.status === 200 || checkOutRes.status === 201,
      'K. Check-out recorded successfully with proof upload',
    );

    const updatedAtt = await prisma.attendance.findUnique({
      where: {
        studentId_eventId: {
          studentId: student.id,
          eventId: testEvent.id,
        },
      },
    });
    assert(
      updatedAtt?.status === 'COMPLETED' && !!updatedAtt?.checkOutProofUrl,
      'K. Attendance status updated to COMPLETED with checkOutProofUrl',
    );

    // Test L: Admin attendance inspection page retrieves proof images correctly
    const adminAttRes = await makeRequest({
      hostname: 'localhost',
      port: API_PORT,
      path: `/api/events/${testEvent.id}/attendance`,
      method: 'GET',
      headers: {
        Authorization: `Bearer ${adminToken}`,
      },
    });
    assert(
      adminAttRes.status === 200 &&
        adminAttRes.body.data?.records?.length > 0 &&
        !!adminAttRes.body.data.records[0].checkInProofUrl,
      'L. Admin attendance inspection payload contains proof URLs',
    );

    // 5. Phase 9, 10, 11 Regression Tests (M - O)
    console.log('\n--- 5. Phase 9, 10, 11 Regression Checks (Requirements M-O) ---');

    // Test M: Attendance lifecycle integrity
    assert(adminAttRes.body.data.summary.completedCount >= 1, 'M. Phase 9 attendance lifecycle summary counts correct');

    // Test N: Admin event management
    const adminEventsRes = await makeRequest({
      hostname: 'localhost',
      port: API_PORT,
      path: '/api/events',
      method: 'GET',
    });
    assert(adminEventsRes.status === 200 && Array.isArray(adminEventsRes.body.data), 'N. Phase 10 admin event endpoints operational');

    // Test O: LINE/LIFF endpoints from Phase 11
    const lineVerifyRes = await makeRequest(
      {
        hostname: 'localhost',
        port: API_PORT,
        path: '/api/line/verify-token',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
      { idToken: 'invalid_token_example' },
    );
    assert(lineVerifyRes.status === 401, 'O. Phase 11 LINE endpoints respond as expected (401 Unauthorized for invalid token)');

    // Clean up created test events & attendance records
    await prisma.attendance.deleteMany({
      where: {
        eventId: { in: [testEvent.id, testEvent2.id, testEvent3.id] },
      },
    });
    await prisma.attendanceSession.deleteMany({
      where: {
        eventId: { in: [testEvent.id, testEvent2.id, testEvent3.id] },
      },
    });
    await prisma.event.deleteMany({
      where: {
        id: { in: [testEvent.id, testEvent2.id, testEvent3.id] },
      },
    });

    console.log('\n====================================================');
    console.log(` SUMMARY: ${passed} passed, ${failed} failed`);
    console.log('====================================================\n');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Test execution error:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runPhase12Tests();
