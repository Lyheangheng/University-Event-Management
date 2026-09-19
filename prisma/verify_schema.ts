import { 
  PrismaClient, 
  AttendanceSessionType, 
  AttendanceStatus,
  Prisma
} from '@prisma/client';

console.log('--- Phase 1 Database Schema Verification ---');

// 1. Verify Student fields
const sampleStudent: Prisma.StudentCreateInput = {
  id: 'uuid-1',
  studentId: '66010001',
  fullName: 'Somchai Jaidee',
  year: 1,
  faculty: 'Engineering',
  major: 'Computer Engineering',
  lineUserId: 'U11112222',
  lineDisplayName: 'Somchai',
  linePictureUrl: null
};

// 2. Verify Admin fields
const sampleAdmin: Prisma.AdminCreateInput = {
  id: 'uuid-2',
  username: 'admin',
  passwordHash: '$2b$10$xyz',
  name: 'Admin User'
};

// 3. Verify Event fields
const sampleEvent: Prisma.EventCreateInput = {
  id: 'uuid-3',
  title: 'University Orientation',
  description: 'First year orientation event',
  date: new Date(),
  startTime: new Date(),
  endTime: new Date(),
  location: 'Auditorium',
  targetGroup: '1st Year Students',
  imageUrl: null
};

// 4. Verify AttendanceSession fields & enum
const sampleSession: Prisma.AttendanceSessionCreateInput = {
  id: 'uuid-4',
  event: { connect: { id: sampleEvent.id } },
  sessionType: AttendanceSessionType.CHECK_IN,
  token: 'token_checkin_123',
  startTime: new Date(),
  endTime: new Date()
};

// 5. Verify Attendance fields & status enum
const sampleAttendance: Prisma.AttendanceCreateInput = {
  id: 'uuid-5',
  student: { connect: { id: sampleStudent.id } },
  event: { connect: { id: sampleEvent.id } },
  checkInTime: new Date(),
  checkInProofUrl: 'https://example.com/proof.jpg',
  status: AttendanceStatus.INCOMPLETE
};

console.log('✅ Student create input model verified:', sampleStudent.studentId);
console.log('✅ Admin create input model verified:', sampleAdmin.username);
console.log('✅ Event create input model verified:', sampleEvent.title);
console.log('✅ AttendanceSession create input model verified:', sampleSession.sessionType, sampleSession.token);
console.log('✅ Attendance create input model verified:', sampleAttendance.status);
console.log('✅ All Phase 1 Prisma models compiled and type-checked cleanly!');
