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

  const service = new AttendanceService(
    mockPrisma,
    mockConfig,
    mockStorage,
    mockJwt,
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

  console.log('--- ALL REGRESSION TESTS PASSED SUCCESSFULLY ---');
}

runRegressionTests().catch((err) => {
  console.error('❌ Regression Test Failed:', err);
  process.exit(1);
});
