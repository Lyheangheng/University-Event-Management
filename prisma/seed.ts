import { PrismaClient, AttendanceSessionType, AttendanceStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // 1. Clean existing development data in reverse dependency order
  await prisma.attendance.deleteMany();
  await prisma.attendanceSession.deleteMany();
  await prisma.event.deleteMany();
  await prisma.student.deleteMany();
  await prisma.admin.deleteMany();

  console.log('Cleared existing data.');

  // 2. Create Development Admin
  // Note: Hashed password representation for development only (password: "AdminPass123!")
  const adminPasswordHash = bcrypt.hashSync('AdminPass123!', 10);
  const devAdmin = await prisma.admin.create({
    data: {
      username: 'admin',
      passwordHash: adminPasswordHash,
      name: 'System Administrator',
    },
  });
  console.log(`Created admin: ${devAdmin.username}`);

  // 3. Create Development Students
  const student1 = await prisma.student.create({
    data: {
      studentId: '66010001',
      fullName: 'Somchai Jaidee',
      year: 1,
      faculty: 'Engineering',
      major: 'Computer Engineering',
      lineUserId: 'U11112222333344445555666677778888',
      lineDisplayName: 'Somchai.J',
    },
  });

  const student2 = await prisma.student.create({
    data: {
      studentId: '66010002',
      fullName: 'Somsri Rakdee',
      year: 1,
      faculty: 'Science',
      major: 'Information Technology',
      lineUserId: 'U88887777666655554444333322221111',
      lineDisplayName: 'Somsri.R',
    },
  });

  console.log(`Created students: ${student1.studentId}, ${student2.studentId}`);

  // 4. Create Sample Event
  const eventDate = new Date('2026-10-10T09:00:00Z');
  const startTime = new Date('2026-10-10T09:00:00Z');
  const endTime = new Date('2026-10-10T12:00:00Z');

  const sampleEvent = await prisma.event.create({
    data: {
      title: 'University Orientation 2026',
      description: 'Welcome orientation ceremony and information session for first year students.',
      date: eventDate,
      startTime: startTime,
      endTime: endTime,
      location: 'University Main Auditorium',
      targetGroup: '1st Year Students',
      imageUrl: 'https://images.unsplash.com/photo-1523580494863-6f3031224c94',
      createdById: devAdmin.id,
    },
  });

  console.log(`Created event: ${sampleEvent.title}`);

  // 5. Create Attendance Sessions (CHECK_IN & CHECK_OUT)
  const checkInSession = await prisma.attendanceSession.create({
    data: {
      eventId: sampleEvent.id,
      sessionType: AttendanceSessionType.CHECK_IN,
      token: 'session_token_checkin_dev_sample_123',
      startTime: new Date('2026-10-10T09:00:00Z'),
      endTime: new Date('2026-10-10T09:10:00Z'), // start + 10 minutes
    },
  });

  const checkOutSession = await prisma.attendanceSession.create({
    data: {
      eventId: sampleEvent.id,
      sessionType: AttendanceSessionType.CHECK_OUT,
      token: 'session_token_checkout_dev_sample_456',
      startTime: new Date('2026-10-10T11:45:00Z'), // end - 15 minutes
      endTime: new Date('2026-10-10T12:00:00Z'),
    },
  });

  console.log(`Created attendance sessions: ${checkInSession.sessionType}, ${checkOutSession.sessionType}`);

  // 6. Create Sample Attendance Record
  const sampleAttendance = await prisma.attendance.create({
    data: {
      studentId: student1.id,
      eventId: sampleEvent.id,
      checkInTime: new Date('2026-10-10T09:05:00Z'),
      checkInProofUrl: 'https://storage.example.com/proofs/checkin_66010001.jpg',
      status: AttendanceStatus.INCOMPLETE,
    },
  });

  console.log(`Created sample attendance for student ${student1.studentId} on event ${sampleEvent.title}`);

  console.log('✅ Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
