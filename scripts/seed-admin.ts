import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
const MONGODB_URI = process.env.MONGODB_URI;

async function seedAdmin() {
  if (!MONGODB_URI) {
    console.error('MONGODB_URI is not defined. Check your .env.local file.');
    process.exit(1);
  }

  const adminEmail = process.env.ADMIN_EMAIL ?? 'admin@lmsplatform.com';
  const adminPassword = process.env.ADMIN_PASSWORD ?? 'Admin@123456';
  const adminName = process.env.ADMIN_NAME ?? 'Super Admin';

  try {
    console.info('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.info('Connected to MongoDB');

    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('Database connection not established');
    }

    const usersCollection = db.collection('users');
    const gamificationCollection = db.collection('gamifications');

    // Check if admin already exists
    const existingAdmin = await usersCollection.findOne({ role: 'admin' });

    if (existingAdmin) {
      console.info('Admin user already exists:');
      console.info(`  Email: ${existingAdmin.email as string}`);
      console.info(`  EmpId: ${existingAdmin.empId as string}`);
      console.info('Skipping seed.');
      await mongoose.disconnect();
      return;
    }

    // Hash password
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(adminPassword, salt);

    const now = new Date();

    // Create admin user
    const adminUser = await usersCollection.insertOne({
      empId: 'ADMIN001',
      name: adminName,
      email: adminEmail,
      phone: '',
      password: hashedPassword,
      role: 'admin',
      domain: '',
      location: '',
      status: 'active',
      profileImage: '',
      preferredLanguage: 'en',
      firstLogin: true,
      refreshToken: '',
      createdAt: now,
      updatedAt: now,
    });

    console.info('Admin user created successfully');
    console.info(`  ID: ${adminUser.insertedId.toString()}`);
    console.info(`  EmpId: ADMIN001`);
    console.info(`  Email: ${adminEmail}`);
    console.info(`  Password: ${adminPassword}`);

    // Create associated Gamification record
    await gamificationCollection.insertOne({
      user: adminUser.insertedId,
      totalPoints: 0,
      badges: [],
      streak: {
        current: 0,
        longest: 0,
        lastActivityDate: null,
      },
      createdAt: now,
      updatedAt: now,
    });

    console.info('Gamification record created for admin');

    await mongoose.disconnect();
    console.info('Seed completed successfully');
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Seed failed:', message);
    await mongoose.disconnect();
    process.exit(1);
  }
}

seedAdmin();
