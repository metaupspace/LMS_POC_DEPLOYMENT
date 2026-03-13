import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI;
const DEFAULT_PASSWORD = 'Test@12345';

if (!MONGODB_URI) {
  console.error('MONGODB_URI is not defined. Check your .env.local file.');
  process.exit(1);
}

// ── User Schema (inline to avoid Next.js import issues) ──

const userSchema = new mongoose.Schema({
  empId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin', 'manager', 'coach', 'staff'], required: true },
  domain: { type: String, default: '' },
  location: { type: String, default: '' },
  status: { type: String, enum: ['active', 'offboarded'], default: 'active' },
  profileImage: { type: String, default: '' },
  preferredLanguage: { type: String, default: 'en' },
  firstLogin: { type: Boolean, default: false },
  refreshToken: { type: String, default: '' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

const User = mongoose.models.User || mongoose.model('User', userSchema);

// ── Seed Data ──

const managers = [
  { empId: 'MNG-001', name: 'Rajesh Kumar', email: 'rajesh.kumar@metaupspace.com', phone: '+919876543001', domain: 'Operations', location: 'Mumbai' },
  { empId: 'MNG-002', name: 'Priya Sharma', email: 'priya.sharma@metaupspace.com', phone: '+919876543002', domain: 'Technical', location: 'Delhi' },
  { empId: 'MNG-003', name: 'Amit Patel', email: 'amit.patel@metaupspace.com', phone: '+919876543003', domain: 'Safety', location: 'Ahmedabad' },
  { empId: 'MNG-004', name: 'Sunita Verma', email: 'sunita.verma@metaupspace.com', phone: '+919876543004', domain: 'HR', location: 'Bangalore' },
  { empId: 'MNG-005', name: 'Vikram Singh', email: 'vikram.singh@metaupspace.com', phone: '+919876543005', domain: 'Quality', location: 'Pune' },
];

const coaches = [
  { empId: 'CH-001', name: 'Deepak Yadav', email: 'deepak.yadav@metaupspace.com', phone: '+919876543011', domain: 'Electrical', location: 'Mumbai' },
  { empId: 'CH-002', name: 'Kavita Nair', email: 'kavita.nair@metaupspace.com', phone: '+919876543012', domain: 'Plumbing', location: 'Delhi' },
  { empId: 'CH-003', name: 'Ravi Shankar', email: 'ravi.shankar@metaupspace.com', phone: '+919876543013', domain: 'Welding', location: 'Chennai' },
  { empId: 'CH-004', name: 'Meena Devi', email: 'meena.devi@metaupspace.com', phone: '+919876543014', domain: 'Safety', location: 'Ahmedabad' },
  { empId: 'CH-005', name: 'Arjun Reddy', email: 'arjun.reddy@metaupspace.com', phone: '+919876543015', domain: 'Carpentry', location: 'Hyderabad' },
];

const staff = [
  { empId: 'SF-001', name: 'Suresh Babu', email: 'suresh.babu@metaupspace.com', phone: '+919876543021', domain: 'Electrical', location: 'Mumbai' },
  { empId: 'SF-002', name: 'Lakshmi Prasad', email: 'lakshmi.prasad@metaupspace.com', phone: '+919876543022', domain: 'Plumbing', location: 'Delhi' },
  { empId: 'SF-003', name: 'Ramesh Gupta', email: 'ramesh.gupta@metaupspace.com', phone: '+919876543023', domain: 'Welding', location: 'Chennai' },
  { empId: 'SF-004', name: 'Anita Kumari', email: 'anita.kumari@metaupspace.com', phone: '+919876543024', domain: 'Safety', location: 'Ahmedabad' },
  { empId: 'SF-005', name: 'Manoj Tiwari', email: 'manoj.tiwari@metaupspace.com', phone: '+919876543025', domain: 'Carpentry', location: 'Hyderabad' },
];

// ── Main ──

async function seed() {
  console.info('Connecting to MongoDB...');
  await mongoose.connect(MONGODB_URI!);
  console.info('Connected\n');

  // Find admin for createdBy
  const admin = await User.findOne({ role: 'admin' });
  if (!admin) {
    console.error('Admin user not found. Run seed-admin first.');
    process.exit(1);
  }

  const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, 12);
  let created = 0;
  let skipped = 0;

  const allUsers = [
    ...managers.map(u => ({ ...u, role: 'manager' as const })),
    ...coaches.map(u => ({ ...u, role: 'coach' as const })),
    ...staff.map(u => ({ ...u, role: 'staff' as const })),
  ];

  for (const userData of allUsers) {
    const existing = await User.findOne({ empId: userData.empId });
    if (existing) {
      console.info(`  SKIP    ${userData.role.toUpperCase().padEnd(7)} ${userData.empId} - ${userData.name} (already exists)`);
      skipped++;
      continue;
    }

    await User.create({
      ...userData,
      password: hashedPassword,
      status: 'active',
      firstLogin: false,
      createdBy: admin._id,
    });

    console.info(`  CREATE  ${userData.role.toUpperCase().padEnd(7)} ${userData.empId} - ${userData.name}`);
    created++;
  }

  console.info('\n' + '-'.repeat(50));
  console.info(`Results: ${created} created, ${skipped} skipped`);
  console.info('-'.repeat(50));
  console.info(`\nPassword for all users: ${DEFAULT_PASSWORD}`);
  console.info('\nCredentials:\n');

  console.info('MANAGERS:');
  managers.forEach(m => console.info(`   ${m.empId} / ${DEFAULT_PASSWORD} - ${m.name}`));

  console.info('\nCOACHES:');
  coaches.forEach(c => console.info(`   ${c.empId} / ${DEFAULT_PASSWORD} - ${c.name}`));

  console.info('\nSTAFF:');
  staff.forEach(s => console.info(`   ${s.empId} / ${DEFAULT_PASSWORD} - ${s.name}`));

  console.info('');
  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
