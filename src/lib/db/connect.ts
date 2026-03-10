import mongoose from 'mongoose';

// Register all models so they're available for populate() in any route.
// In Next.js App Router, each API route is a separate entry point —
// models are only registered if their file is imported.
import './models/User';
import './models/Course';
import './models/Module';
import './models/Quiz';
import './models/TrainingSession';
import './models/LearnerProgress';
import './models/ProofOfWork';
import './models/Gamification';
import './models/Notification';
import './models/CertificationTest';
import './models/TestAttempt';
import './models/Certification';

const MONGODB_URI = process.env.MONGODB_URI;

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  // eslint-disable-next-line no-var, no-unused-vars
  var mongooseCache: MongooseCache | undefined;
}

const cached: MongooseCache = global.mongooseCache ?? { conn: null, promise: null };

if (!global.mongooseCache) {
  global.mongooseCache = cached;
}

export async function connectDB(): Promise<typeof mongoose> {
  if (!MONGODB_URI) {
    throw new Error('MONGODB_URI environment variable is not defined');
  }

  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts: mongoose.ConnectOptions = {
      maxPoolSize: 10,
      minPoolSize: 2,
      socketTimeoutMS: 45000,
      serverSelectionTimeoutMS: 5000,
      heartbeatFrequencyMS: 10000,
    };

    mongoose.connection.on('connected', () => {
      console.info('[MongoDB] Connected successfully');
    });

    mongoose.connection.on('error', (err) => {
      console.error('[MongoDB] Connection error:', err.message);
    });

    mongoose.connection.on('disconnected', () => {
      console.info('[MongoDB] Disconnected. Attempting reconnection...');
      cached.conn = null;
      cached.promise = null;
    });

    cached.promise = mongoose.connect(MONGODB_URI, opts);
  }

  cached.conn = await cached.promise;
  return cached.conn;
}

export async function disconnectDB(): Promise<void> {
  if (cached.conn) {
    await mongoose.disconnect();
    cached.conn = null;
    cached.promise = null;
    console.info('[MongoDB] Disconnected gracefully');
  }
}
