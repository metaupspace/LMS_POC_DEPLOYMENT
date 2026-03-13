import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('MONGODB_URI is not defined. Check your .env.local file.');
  process.exit(1);
}

async function addIndexes() {
  console.info('Connecting to MongoDB...');
  await mongoose.connect(MONGODB_URI!);
  const db = mongoose.connection.db;
  if (!db) {
    console.error('Database connection not established');
    process.exit(1);
  }

  console.info('Connected. Adding indexes...\n');

  // LearnerProgress — most queried collection
  await db.collection('learnerprogresses').createIndex({ user: 1, course: 1 });
  await db.collection('learnerprogresses').createIndex({ course: 1, status: 1 });
  console.info('  LearnerProgress indexes created');

  // Notifications — polled frequently
  await db.collection('notifications').createIndex({ user: 1, read: 1, createdAt: -1 });
  console.info('  Notification indexes created');

  // TrainingSessions — queried by date, status, instructor
  await db.collection('trainingsessions').createIndex({ date: 1, status: 1 });
  await db.collection('trainingsessions').createIndex({ instructor: 1 });
  await db.collection('trainingsessions').createIndex({ enrolledStaff: 1 });
  console.info('  TrainingSession indexes created');

  // Courses — queried by status, coach, assignedStaff
  await db.collection('courses').createIndex({ status: 1 });
  await db.collection('courses').createIndex({ coach: 1 });
  await db.collection('courses').createIndex({ assignedStaff: 1 });
  console.info('  Course indexes created');

  // Gamification — one per user
  await db.collection('gamifications').createIndex({ user: 1 }, { unique: true });
  console.info('  Gamification indexes created');

  // ProofOfWork — queried by user + course
  await db.collection('proofofworks').createIndex({ user: 1, course: 1 });
  console.info('  ProofOfWork indexes created');

  // TestAttempt — queried by user + test
  await db.collection('testattempts').createIndex({ user: 1, test: 1 });
  console.info('  TestAttempt indexes created');

  // Certification — one per user per test
  await db.collection('certifications').createIndex({ user: 1, test: 1 }, { unique: true });
  console.info('  Certification indexes created');

  // CertificationTest — queried by status, assignedStaff
  await db.collection('certificationtests').createIndex({ status: 1 });
  await db.collection('certificationtests').createIndex({ assignedStaff: 1 });
  console.info('  CertificationTest indexes created');

  // Users — compound index for role+status queries
  await db.collection('users').createIndex({ role: 1, status: 1 });
  console.info('  User indexes created');

  console.info('\nAll indexes created successfully');
  await mongoose.disconnect();
  process.exit(0);
}

addIndexes().catch((err) => {
  console.error('Failed to add indexes:', err);
  process.exit(1);
});
