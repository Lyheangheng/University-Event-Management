import * as assert from 'assert';
import { AttendanceService } from './attendance.service';
import { UnauthorizedException } from '@nestjs/common';
import { getRequiredJwtSecret, DEV_DEFAULT_JWT_SECRET } from '../config/jwt-secret.helper';

async function runRegressionTests() {
  console.log('--- Running Attendance Auth & Submission Regression Tests ---');

  const mockStudent = {
    id: 'student-uuid-123',
    studentId: 'STD-66001',
    fullName: 'Test Student',
    faculty: 'Engineering',
    major: 'Computer Science',
    year: 3,
    lineUserId: 'U1234567890',
  };

  const mockSession = {
    id: 'session-uuid-456',
    eventId: 'event-uuid-789',
    sessionType: 'CHECK_IN' as any,
    token: 'valid-session-token-xyz',
    startTime: new Date(Date.now() - 5 * 60 * 1000),
    endTime: new Date(Date.now() + 5 * 60 * 1000),
    event: { id: 'event-uuid-789', title: 'University Tech Symposium' },
  };

  const mockPrisma: any = {
    student: {
      findUnique: async ({ where }: any) => {
        if (where.id === mockStudent.id || where.lineUserId === mockStudent.lineUserId) {
          return mockStudent;
        }
        return null;
      },
      findFirst: async () => mockStudent,
    },
    attendanceSession: {
      findUnique: async ({ where }: any) => {
        if (where.token === mockSession.token) return mockSession;
        return null;
      },
    },
    attendance: {
      findUnique: async () => null,
      create: async ({ data }: any) => ({
        id: 'att-record-123',
        ...data,
        status: 'INCOMPLETE',
      }),
    },
  };

  const mockConfig: any = {
    get: (key: string) => {
      if (key === 'nodeEnv' || key === 'NODE_ENV') return 'production';
      if (key === 'jwtSecret' || key === 'JWT_SECRET') return 'prod-test-secret-key-12345';
      return null;
    },
  };

  const mockStorage: any = {
    saveFile: async () => ({ url: 'https://r2.storage/proofs/test.jpg' }),
  };

  const mockJwt: any = {
    verify: (token: string) => {
      if (token === 'valid.jwt.token') return { sub: mockStudent.id, role: 'STUDENT' };
      throw new Error('jwt malformed');
    },
    sign: () => 'valid.jwt.token',
  };

  const mockLineMessaging: any = {
    sendPushMessage: async () => true,
    notifyEventAnnouncement: async () => 0,
    notifyCheckInOpened: async () => 0,
    notifyCheckOutOpened: async () => 0,
  };

  const service = new AttendanceService(
    mockPrisma,
    mockConfig,
    mockStorage,
    mockJwt,
    mockLineMessaging,
  );

  // Test 1: Authenticated Production Student Resolution
  console.log('Test 1: Authenticated production student resolution via Bearer JWT...');
  const student = await service.resolveStudent(undefined, 'Bearer valid.jwt.token');
  assert.strictEqual(student.id, mockStudent.id, 'Should resolve student ID from JWT sub');
  assert.strictEqual(student.studentId, mockStudent.studentId, 'Should resolve student code');
  console.log('✅ Test 1 Passed: Authenticated JWT student resolution succeeded.');

  // Test 2: Unauthenticated Production Rejection (No JWT)
  console.log('Test 2: Unauthenticated production rejection (Missing JWT)...');
  try {
    await service.resolveStudent(undefined, undefined);
    assert.fail('Should have thrown UnauthorizedException');
  } catch (err: any) {
    assert(err instanceof UnauthorizedException, 'Error should be UnauthorizedException');
    assert.strictEqual(err.message, 'Student authentication required in production environment');
  }
  console.log('✅ Test 2 Passed: Missing JWT rejected in production.');

  // Test 3: Dev Header Bypass Prevention in Production
  console.log('Test 3: Dev header bypass attempt rejected in production...');
  try {
    await service.resolveStudent('STD-66001', undefined);
    assert.fail('Should have thrown UnauthorizedException');
  } catch (err: any) {
    assert(err instanceof UnauthorizedException, 'Dev header should not bypass auth in production');
  }
  console.log('✅ Test 3 Passed: Dev header bypass blocked in production.');

  // Test 4: Authenticated Production Attendance Submission
  console.log('Test 4: Authenticated production attendance submission...');
  const mockFile = {
    originalname: 'proof.jpg',
    buffer: Buffer.from('image-bytes'),
    mimetype: 'image/jpeg',
    size: 1024,
  };
  const subResult = await service.submitAttendance(
    'valid-session-token-xyz',
    undefined,
    mockFile,
    'Great conference!',
    'Bearer valid.jwt.token',
  );
  assert.strictEqual(subResult.message, 'Check-in recorded successfully.');
  assert.strictEqual(subResult.studentId, mockStudent.studentId);
  console.log('✅ Test 4 Passed: Production attendance submission with Bearer JWT succeeded.');

  // Test 5: Unauthenticated Production Attendance Submission Rejection
  console.log('Test 5: Unauthenticated production attendance submission rejection...');
  try {
    await service.submitAttendance(
      'valid-session-token-xyz',
      'STD-66001',
      mockFile,
      'Feedback',
      undefined,
    );
    assert.fail('Should have thrown UnauthorizedException');
  } catch (err: any) {
    assert(err instanceof UnauthorizedException, 'Submission without JWT must be rejected');
  }
  console.log('✅ Test 5 Passed: Unauthenticated submission rejected.');

  // Test 6: Production submission with Bearer JWT when studentIdOrParam is also present
  console.log('Test 6: Production submission with Bearer JWT when studentIdOrParam is also present...');
  const subResultWithParam = await service.submitAttendance(
    'valid-session-token-xyz',
    'student-uuid-123',
    mockFile,
    'Feedback',
    'Bearer valid.jwt.token',
  );
  assert.strictEqual(subResultWithParam.message, 'Check-in recorded successfully.');
  assert.strictEqual(subResultWithParam.studentId, mockStudent.studentId);
  console.log('✅ Test 6 Passed: Submission with both JWT and student param succeeded in production.');

  // Test 7: Production JWT Secret Requirement Security Guard
  console.log('Test 7: Production JWT Secret requirement security guard...');
  const prodConfigNoSecret: any = {
    get: (key: string) => (key === 'nodeEnv' || key === 'NODE_ENV' ? 'production' : null),
  };
  try {
    getRequiredJwtSecret(prodConfigNoSecret);
    assert.fail('Should have thrown critical production security Error');
  } catch (err: any) {
    assert(err.message.includes('CRITICAL PRODUCTION SECURITY ERROR'), 'Should reject missing JWT_SECRET in production');
  }

  const prodConfigDevSecret: any = {
    get: (key: string) => {
      if (key === 'nodeEnv' || key === 'NODE_ENV') return 'production';
      if (key === 'jwtSecret' || key === 'JWT_SECRET') return DEV_DEFAULT_JWT_SECRET;
      return null;
    },
  };
  try {
    getRequiredJwtSecret(prodConfigDevSecret);
    assert.fail('Should have thrown critical production security Error');
  } catch (err: any) {
    assert(err.message.includes('CRITICAL PRODUCTION SECURITY ERROR'), 'Should reject dev secret fallback in production');
  }

  const devConfigNoSecret: any = {
    get: (key: string) => (key === 'nodeEnv' || key === 'NODE_ENV' ? 'development' : null),
  };
  const devSecret = getRequiredJwtSecret(devConfigNoSecret);
  assert.strictEqual(devSecret, DEV_DEFAULT_JWT_SECRET, 'Should allow dev fallback in development mode');
  console.log('✅ Test 7 Passed: Production JWT secret requirement security guard verified.');

  // Test 8 (Phase 16.15 A & E): LocalStorageProvider file streaming and path traversal rejection
  console.log('Test 8: LocalStorageProvider file streaming & path traversal rejection...');
  const { LocalStorageProvider } = await import('../storage/local-storage.provider');
  const { extractAndSanitizeFilename } = await import('../storage/storage.interface');
  const localProvider = new LocalStorageProvider();
  const fs = await import('fs');
  const path = await import('path');

  // Create temporary test file in uploads/proofs
  const testUploadDir = path.join(process.cwd(), 'uploads', 'proofs');
  if (!fs.existsSync(testUploadDir)) {
    fs.mkdirSync(testUploadDir, { recursive: true });
  }
  const testFileName = `test-stream-${Date.now()}.jpg`;
  const testFilePath = path.join(testUploadDir, testFileName);
  fs.writeFileSync(testFilePath, 'dummy-image-bytes-data');

  try {
    const localResult = await localProvider.getFileStream(testFileName, 'proofs');
    assert.strictEqual(localResult.mimetype, 'image/jpeg');
    assert(localResult.stream, 'Stream should be returned for local file');
    assert.strictEqual(localResult.contentLength, 22);

    // Consume stream data before unlinking test file
    await new Promise((resolve) => {
      localResult.stream.on('data', () => {});
      localResult.stream.on('end', resolve);
      localResult.stream.on('error', resolve);
    });

    // Test path traversal rejection
    try {
      await localProvider.getFileStream('../../etc/passwd', 'proofs');
      assert.fail('Should have rejected path traversal attempt');
    } catch (err: any) {
      assert.strictEqual(err.status, 400, 'Path traversal must return 400 Bad Request');
    }
  } finally {
    if (fs.existsSync(testFilePath)) {
      fs.unlinkSync(testFilePath);
    }
  }
  console.log('✅ Test 8 Passed: LocalStorageProvider file stream retrieval & path traversal guard verified.');

  // Test 9 (Phase 16.15 B, F, 7): S3StorageProvider GetObjectCommand, URL parsing & Missing object handling
  console.log('Test 9: S3StorageProvider GetObjectCommand, URL key extraction & missing object handling...');
  const { S3StorageProvider } = await import('../storage/s3-storage.provider');
  const { Readable } = await import('stream');

  let sendCalledWith: any = null;
  const mockS3Client: any = {
    send: async (command: any) => {
      sendCalledWith = command;
      if (command.input.Key === 'proofs/missing-file.jpg') {
        const error: any = new Error('NoSuchKey');
        error.name = 'NoSuchKey';
        error.$metadata = { httpStatusCode: 404 };
        throw error;
      }
      return {
        Body: Readable.from(['mock-s3-stream-data']),
        ContentType: 'image/jpeg',
        ContentLength: 18,
      };
    },
  };

  const mockS3Config: any = {
    get: (key: string) => {
      if (key === 'S3_BUCKET') return 'test-r2-bucket';
      if (key === 'S3_ENDPOINT') return 'https://acc123.r2.cloudflarestorage.com';
      if (key === 'S3_ACCESS_KEY_ID') return 'key123';
      if (key === 'S3_SECRET_ACCESS_KEY') return 'secret456';
      return null;
    },
  };

  const s3Provider = new S3StorageProvider(mockS3Config);
  (s3Provider as any).s3Client = mockS3Client;

  // Test retrieval with full R2 URL string (Requirement 7)
  const fullR2Url = 'https://acc123.r2.cloudflarestorage.com/test-r2-bucket/proofs/1712345678-abc.jpg';
  const s3Result = await s3Provider.getFileStream(fullR2Url, 'proofs');
  assert.strictEqual(s3Result.mimetype, 'image/jpeg');
  assert.strictEqual(s3Result.contentLength, 18);
  assert.strictEqual(sendCalledWith.input.Bucket, 'test-r2-bucket');
  assert.strictEqual(sendCalledWith.input.Key, 'proofs/1712345678-abc.jpg');

  // Test missing object handling (Requirement 11/12.F)
  try {
    await s3Provider.getFileStream('missing-file.jpg', 'proofs');
    assert.fail('Should have thrown NotFoundException');
  } catch (err: any) {
    assert.strictEqual(err.status, 404, 'Missing R2 object must return 404 Not Found');
  }
  console.log('✅ Test 9 Passed: S3StorageProvider GetObjectCommand, R2 URL parsing & missing object error verified.');

  // Test 10 (Phase 16.15 C & D): extractAndSanitizeFilename security validation
  console.log('Test 10: extractAndSanitizeFilename key sanitization...');
  assert.strictEqual(
    extractAndSanitizeFilename('https://account.r2.cloudflarestorage.com/bucket/proofs/123-abc.png'),
    '123-abc.png',
  );
  assert.strictEqual(
    extractAndSanitizeFilename('/api/attendance/uploads/proofs/456-def.webp'),
    '456-def.webp',
  );

  const invalidKeys = [
    '../../etc/passwd',
    '..\\..\\windows\\system32',
    'proofs/..%2f..%2fsecret',
    'filename\0.jpg',
  ];
  for (const badKey of invalidKeys) {
    try {
      extractAndSanitizeFilename(badKey);
      assert.fail(`Should have rejected bad key: ${badKey}`);
    } catch (err: any) {
      assert.strictEqual(err.status, 400);
    }
  }
  console.log('✅ Test 10 Passed: extractAndSanitizeFilename security validations verified.');

  // Test 11 (Phase 16.17): EventsService createEvent triggers LineMessagingService announcement
  console.log('Test 11: EventsService createEvent triggers LineMessagingService announcement...');
  const { EventsService } = await import('../events/events.service');
  let announcementCalledWith: any = null;
  const mockLineMessagingService: any = {
    notifyEventAnnouncement: async (event: any) => {
      announcementCalledWith = event;
      return 1;
    },
    notifyCheckInOpened: async (event: any, token: string) => 1,
    notifyCheckOutOpened: async (event: any, token: string) => 1,
  };
  const mockPrismaEvents: any = {
    event: {
      create: async ({ data }: any) => ({
        id: 'event-new-123',
        ...data,
      }),
    },
  };
  const eventsService = new EventsService(mockPrismaEvents, mockLineMessagingService);
  const createdEvent = await eventsService.createEvent(
    {
      title: 'Annual Tech Summit',
      description: 'University tech summit',
      date: new Date().toISOString(),
      startTime: new Date().toISOString(),
      endTime: new Date(Date.now() + 3600000).toISOString(),
      location: 'Grand Hall',
      targetGroup: 'All Students',
    },
    'admin-123',
  );
  assert.strictEqual(createdEvent.title, 'Annual Tech Summit');
  assert.strictEqual(announcementCalledWith.id, 'event-new-123');
  console.log('✅ Test 11 Passed: EventsService createEvent successfully triggered LINE announcement.');

  // Test 12 (Phase 16.17): EventsService createEvent succeeds even if LINE push throws an error
  console.log('Test 12: EventsService createEvent succeeds when LINE push fails...');
  const mockFailingLineService: any = {
    notifyEventAnnouncement: async () => {
      throw new Error('LINE API 500 Internal Error');
    },
  };
  const eventsServiceFail = new EventsService(mockPrismaEvents, mockFailingLineService);
  const createdEventFail = await eventsServiceFail.createEvent(
    {
      title: 'Resilient Event',
      description: 'Test resilience',
      date: new Date().toISOString(),
      startTime: new Date().toISOString(),
      endTime: new Date(Date.now() + 3600000).toISOString(),
      location: 'Room 101',
      targetGroup: 'All',
    },
    'admin-123',
  );
  assert.strictEqual(createdEventFail.title, 'Resilient Event');
  console.log('✅ Test 12 Passed: Event creation succeeded despite LINE notification error.');

  // Test 13 (Phase 16.19): getProjectorSession creates persistent QR identifiers
  console.log('Test 13: getProjectorSession creates persistent CHECK_IN and CHECK_OUT sessions...');
  const now = Date.now();
  const mockCheckInEvent = {
    id: 'event-persistent-1',
    title: 'Persistent Event',
    startTime: new Date(now - 2 * 60 * 1000), // active checkin
    endTime: new Date(now + 120 * 60 * 1000),
  };
  let createdSessions: any[] = [];
  const mockPrismaSessions: any = {
    event: {
      findUnique: async ({ where }: any) => mockCheckInEvent,
    },
    attendanceSession: {
      findFirst: async ({ where }: any) => createdSessions.find(s => s.sessionType === where.sessionType),
      create: async ({ data }: any) => {
        const s = { id: `sess-${data.sessionType}`, ...data };
        createdSessions.push(s);
        return s;
      },
      findUnique: async ({ where }: any) => createdSessions.find(s => s.token === where.token),
    },
    student: {
      findUnique: async () => null,
      findFirst: async () => null,
    }
  };
  const attendanceServicePersistent = new AttendanceService(
    mockPrismaSessions,
    mockConfig,
    mockStorage,
    mockJwt,
    mockLineMessaging,
  );

  const ciSess1 = await attendanceServicePersistent.getProjectorSession('event-persistent-1', 'CHECK_IN' as any);
  assert(ciSess1, 'ciSess1 must not be null');
  assert.strictEqual(ciSess1.sessionType, 'CHECK_IN');

  const coSess1 = await attendanceServicePersistent.getProjectorSession('event-persistent-1', 'CHECK_OUT' as any);
  assert(coSess1, 'coSess1 must not be null');
  assert.strictEqual(coSess1.sessionType, 'CHECK_OUT');

  // Both QRs persist identically on subsequent calls
  const ciSess2 = await attendanceServicePersistent.getProjectorSession('event-persistent-1', 'CHECK_IN' as any);
  assert.strictEqual(ciSess1.token, ciSess2.token, 'CHECK_IN token should persist');

  const coSess2 = await attendanceServicePersistent.getProjectorSession('event-persistent-1', 'CHECK_OUT' as any);
  assert.strictEqual(coSess1.token, coSess2.token, 'CHECK_OUT token should persist');
  console.log('✅ Test 13 Passed: getProjectorSession persistent QR identifiers verified.');

  // Test 14 (Phase 16.19): getSessionByToken independently enforces CHECK_IN and CHECK_OUT windows
  console.log('Test 14: getSessionByToken enforces validity windows based on server time and event boundaries...');
  
  // Set up mock session where event is returned with the session
  const mockSessionWithEvent = {
    ...ciSess1,
    event: mockCheckInEvent
  };
  mockPrismaSessions.attendanceSession.findUnique = async () => mockSessionWithEvent;
  
  const fetchedSess = await attendanceServicePersistent.getSessionByToken(ciSess1.token, undefined, undefined);
  assert.strictEqual(fetchedSess.isValid, true, 'Should be valid because we are within 30 min of startTime');

  // Let's test checking out (which should be false currently)
  const mockCoSessionWithEvent = {
    ...coSess1,
    event: mockCheckInEvent
  };
  mockPrismaSessions.attendanceSession.findUnique = async () => mockCoSessionWithEvent;
  const fetchedCoSess = await attendanceServicePersistent.getSessionByToken(coSess1.token, undefined, undefined);
  assert.strictEqual(fetchedCoSess.isValid, false, 'Should be invalid because checkout window is at endTime +/- 30m');
  console.log('✅ Test 14 Passed: getSessionByToken validity logic verified.');

  // Test 15 (Phase 16.23C): Verify LINE check-in and check-out notification triggers when window is open
  console.log('Test 15: getProjectorSession and getSessionByToken trigger LINE check-in and check-out notifications when open...');
  let checkInTriggered = false;
  let checkOutTriggered = false;
  const mockNotificationLineService: any = {
    notifyEventAnnouncement: async () => 1,
    notifyCheckInOpened: async (evt: any, token: string) => {
      checkInTriggered = true;
      return 1;
    },
    notifyCheckOutOpened: async (evt: any, token: string) => {
      checkOutTriggered = true;
      return 1;
    },
  };
  const attendanceServiceNotificationTest = new AttendanceService(
    mockPrismaSessions,
    mockConfig,
    mockStorage,
    mockJwt,
    mockNotificationLineService,
  );

  // Active check-in session window
  await attendanceServiceNotificationTest.getProjectorSession('event-persistent-1', 'CHECK_IN' as any);
  assert.strictEqual(checkInTriggered, true, 'getProjectorSession should trigger notifyCheckInOpened when window is active');

  // Active check-out session window
  const activeCheckOutEvent = {
    id: 'event-persistent-2',
    title: 'Ending Event',
    startTime: new Date(now - 120 * 60 * 1000),
    endTime: new Date(now - 5 * 60 * 1000), // active checkout (within 30m of endTime)
  };
  mockPrismaSessions.attendanceSession.findUnique = async () => ({
    id: 'sess-co-2',
    sessionType: 'CHECK_OUT',
    token: 'token-co-2',
    startTime: new Date(now - 35 * 60 * 1000),
    endTime: new Date(now + 25 * 60 * 1000),
    event: activeCheckOutEvent,
  });
  await attendanceServiceNotificationTest.getSessionByToken('token-co-2', undefined, undefined);
  assert.strictEqual(checkOutTriggered, true, 'getSessionByToken should trigger notifyCheckOutOpened when window is active');
  console.log('✅ Test 15 Passed: Check-in and Check-out LINE notification triggers verified.');

  console.log('--- ALL REGRESSION TESTS PASSED SUCCESSFULLY ---');
}

runRegressionTests().catch((err) => {
  console.error('❌ Regression Test Failed:', err);
  process.exit(1);
});


