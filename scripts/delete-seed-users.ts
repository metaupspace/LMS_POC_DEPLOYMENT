import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('MONGODB_URI is not defined. Check your .env.local file.');
  process.exit(1);
}

const SEED_EMP_IDS = [
  'MNG-001', 'MNG-002', 'MNG-003', 'MNG-004', 'MNG-005',
  'CH-001', 'CH-002', 'CH-003', 'CH-004', 'CH-005',
  'SF-001', 'SF-002', 'SF-003', 'SF-004', 'SF-005',
];

// Inline schemas to avoid Next.js import issues
const userSchema = new mongoose.Schema({}, { strict: false, collection: 'users' });
const progressSchema = new mongoose.Schema({}, { strict: false, collection: 'learnerprogresses' });
const gamificationSchema = new mongoose.Schema({}, { strict: false, collection: 'gamifications' });
const proofSchema = new mongoose.Schema({}, { strict: false, collection: 'proofofworks' });
const attemptSchema = new mongoose.Schema({}, { strict: false, collection: 'testattempts' });
const certSchema = new mongoose.Schema({}, { strict: false, collection: 'certifications' });
const notifSchema = new mongoose.Schema({}, { strict: false, collection: 'notifications' });

const User = mongoose.models.User || mongoose.model('User', userSchema);
const Progress = mongoose.models.Progress || mongoose.model('Progress', progressSchema);
const Gamification = mongoose.models.Gamification || mongoose.model('Gamification', gamificationSchema);
const Proof = mongoose.models.Proof || mongoose.model('Proof', proofSchema);
const Attempt = mongoose.models.Attempt || mongoose.model('Attempt', attemptSchema);
const Cert = mongoose.models.Cert || mongoose.model('Cert', certSchema);
const Notif = mongoose.models.Notif || mongoose.model('Notif', notifSchema);

async function cleanup() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(MONGODB_URI!);
  console.log('Connected\n');

  // Find seed users
  const seedUsers = await User.find({ empId: { $in: SEED_EMP_IDS } });
  const seedUserIds = seedUsers.map((u: any) => u._id);

  if (seedUserIds.length === 0) {
    console.log('No seed users found. Nothing to delete.');
    await mongoose.disconnect();
    process.exit(0);
  }

  console.log(`Found ${seedUserIds.length} seed users to delete:\n`);
  seedUsers.forEach((u: any) => console.log(`   ${u.empId} - ${u.name} (${u.role})`));

  // Delete related data
  const results = await Promise.all([
    Progress.deleteMany({ user: { $in: seedUserIds } }),
    Gamification.deleteMany({ user: { $in: seedUserIds } }),
    Proof.deleteMany({ user: { $in: seedUserIds } }),
    Attempt.deleteMany({ user: { $in: seedUserIds } }),
    Cert.deleteMany({ user: { $in: seedUserIds } }),
    Notif.deleteMany({ user: { $in: seedUserIds } }),
    User.deleteMany({ empId: { $in: SEED_EMP_IDS } }),
  ]);

  console.log('\nDeleted:');
  console.log(`   Users:          ${results[6].deletedCount}`);
  console.log(`   Progress:       ${results[0].deletedCount}`);
  console.log(`   Gamification:   ${results[1].deletedCount}`);
  console.log(`   Proof of Work:  ${results[2].deletedCount}`);
  console.log(`   Test Attempts:  ${results[3].deletedCount}`);
  console.log(`   Certifications: ${results[4].deletedCount}`);
  console.log(`   Notifications:  ${results[5].deletedCount}`);

  console.log('\nCleanup complete');
  await mongoose.disconnect();
  process.exit(0);
}

cleanup().catch((err) => {
  console.error('Cleanup failed:', err);
  process.exit(1);
});
