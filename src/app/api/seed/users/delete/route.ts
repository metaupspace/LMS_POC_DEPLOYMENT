import { connectDB } from '@/lib/db/connect';
import User from '@/lib/db/models/User';
import LearnerProgress from '@/lib/db/models/LearnerProgress';
import Gamification from '@/lib/db/models/Gamification';
import ProofOfWork from '@/lib/db/models/ProofOfWork';
import TestAttempt from '@/lib/db/models/TestAttempt';
import Certification from '@/lib/db/models/Certification';
import Notification from '@/lib/db/models/Notification';
import { successResponse, errorResponse } from '@/lib/utils/apiResponse';

const SEED_EMP_IDS = [
  'MNG-001', 'MNG-002', 'MNG-003', 'MNG-004', 'MNG-005',
  'CH-001', 'CH-002', 'CH-003', 'CH-004', 'CH-005',
  'SF-001', 'SF-002', 'SF-003', 'SF-004', 'SF-005',
];

export async function GET() {
  try {
    // Production guard
    if (process.env.NODE_ENV === 'production' && process.env.ALLOW_SEED !== 'true') {
      return errorResponse('Seed endpoints are disabled in production', 403);
    }

    await connectDB();

    // Find seed users
    const seedUsers = await User.find({ empId: { $in: SEED_EMP_IDS } });
    const seedUserIds = seedUsers.map(u => u._id);

    if (seedUserIds.length === 0) {
      return successResponse({ message: 'No seed users found to delete' });
    }

    // Clean up related data
    const [progress, gamification, proofs, attempts, certs, notifs, users] = await Promise.all([
      LearnerProgress.deleteMany({ user: { $in: seedUserIds } }),
      Gamification.deleteMany({ user: { $in: seedUserIds } }),
      ProofOfWork.deleteMany({ user: { $in: seedUserIds } }),
      TestAttempt.deleteMany({ user: { $in: seedUserIds } }),
      Certification.deleteMany({ user: { $in: seedUserIds } }),
      Notification.deleteMany({ user: { $in: seedUserIds } }),
      User.deleteMany({ empId: { $in: SEED_EMP_IDS } }),
    ]);

    return successResponse({
      message: `Deleted ${users.deletedCount} seed users and related data`,
      deleted: {
        users: users.deletedCount,
        progress: progress.deletedCount,
        gamification: gamification.deletedCount,
        proofs: proofs.deletedCount,
        testAttempts: attempts.deletedCount,
        certifications: certs.deletedCount,
        notifications: notifs.deletedCount,
      },
    });
  } catch (err: any) {
    console.error('[Seed Delete] Error:', err);
    return errorResponse(err.message || 'Delete failed', 500);
  }
}
