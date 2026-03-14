import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db/connect';
import LearnerProgress from '@/lib/db/models/LearnerProgress';
import TestAttempt from '@/lib/db/models/TestAttempt';
import Certification from '@/lib/db/models/Certification';
import ProofOfWork from '@/lib/db/models/ProofOfWork';
import TrainingSession from '@/lib/db/models/TrainingSession';
import User from '@/lib/db/models/User';
import { withAuth } from '@/lib/auth/rbac';
import { successResponse } from '@/lib/utils/apiResponse';

export const GET = withAuth(async (req: NextRequest) => {
  await connectDB();
  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '5');
  const daysBack = 30;
  const since = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);

  // Fetch recent events from multiple collections in parallel
  const [
    recentProgress,
    recentAttempts,
    recentCertifications,
    recentProofs,
    recentAttendance,
    recentUsers,
  ] = await Promise.all([
    // Module completions (last 30 days)
    LearnerProgress.find({
      status: 'completed',
      completedAt: { $gte: since },
    })
      .populate('user', 'name empId')
      .populate('module', 'title')
      .populate('course', 'title')
      .sort({ completedAt: -1 })
      .limit(100)
      .lean(),

    // Test attempts (last 30 days)
    TestAttempt.find({
      status: 'graded',
      submittedAt: { $gte: since },
    })
      .populate('user', 'name empId')
      .populate('test', 'title certificationTitle')
      .sort({ submittedAt: -1 })
      .limit(100)
      .lean(),

    // Certifications earned (last 30 days)
    Certification.find({
      earnedAt: { $gte: since },
    })
      .populate('user', 'name empId')
      .populate('test', 'title')
      .sort({ earnedAt: -1 })
      .limit(100)
      .lean(),

    // Proof submissions (last 30 days)
    ProofOfWork.find({
      submittedAt: { $gte: since },
    })
      .populate('user', 'name empId')
      .populate('course', 'title')
      .sort({ submittedAt: -1 })
      .limit(100)
      .lean(),

    // Session attendance (last 30 days)
    TrainingSession.find({
      'attendance.markedAt': { $gte: since },
    })
      .populate('attendance.staff', 'name empId')
      .select('title attendance date')
      .sort({ updatedAt: -1 })
      .limit(50)
      .lean(),

    // New users (last 30 days)
    User.find({
      createdAt: { $gte: since },
      role: { $ne: 'admin' },
    })
      .select('name empId role createdAt')
      .sort({ createdAt: -1 })
      .limit(50)
      .lean(),
  ]);

  // Normalize all events into a single timeline
  const activities: any[] = [];

  // Module completions
  for (const p of recentProgress) {
    const prog = p as any;
    activities.push({
      type: 'module_completed',
      icon: '\u{1F4D6}',
      user: prog.user,
      message: `completed module "${prog.module?.title || 'Unknown'}" in ${prog.course?.title || 'Unknown'}`,
      timestamp: prog.completedAt,
      metadata: { courseId: prog.course?._id, moduleId: prog.module?._id },
    });
  }

  // Test attempts
  for (const a of recentAttempts) {
    const attempt = a as any;
    activities.push({
      type: attempt.passed ? 'test_passed' : 'test_failed',
      icon: attempt.passed ? '\u2705' : '\u274C',
      user: attempt.user,
      message: attempt.passed
        ? `passed "${attempt.test?.title || 'Unknown'}" with ${attempt.score}%`
        : `scored ${attempt.score}% on "${attempt.test?.title || 'Unknown'}" (not passed)`,
      timestamp: attempt.submittedAt,
      metadata: { testId: attempt.test?._id, score: attempt.score },
    });
  }

  // Certifications
  for (const c of recentCertifications) {
    const cert = c as any;
    activities.push({
      type: 'certification_earned',
      icon: '\u{1F3C6}',
      user: cert.user,
      message: `earned certification "${cert.title}"`,
      timestamp: cert.earnedAt,
      metadata: { testId: cert.test?._id, certTitle: cert.title },
    });
  }

  // Proof submissions
  for (const p of recentProofs) {
    const proof = p as any;
    const statusText =
      proof.status === 'approved'
        ? 'proof approved'
        : proof.status === 'redo_requested'
          ? 'proof needs redo'
          : 'submitted proof of work';
    activities.push({
      type: `proof_${proof.status}`,
      icon:
        proof.status === 'approved'
          ? '\u2705'
          : proof.status === 'redo_requested'
            ? '\u{1F504}'
            : '\u{1F4CE}',
      user: proof.user,
      message: `${statusText} for "${proof.course?.title || 'Unknown'}"`,
      timestamp:
        proof.status === 'approved' || proof.status === 'redo_requested'
          ? proof.reviewedAt
          : proof.submittedAt,
      metadata: { courseId: proof.course?._id },
    });
  }

  // Attendance
  for (const session of recentAttendance) {
    const sess = session as any;
    for (const att of sess.attendance || []) {
      if (att.markedAt && new Date(att.markedAt) >= since) {
        activities.push({
          type: 'attendance_marked',
          icon: '\u{1F4CB}',
          user: att.staff,
          message: `marked attendance for "${sess.title}"`,
          timestamp: att.markedAt,
          metadata: { sessionId: sess._id },
        });
      }
    }
  }

  // New users
  for (const u of recentUsers) {
    const usr = u as any;
    activities.push({
      type: 'user_created',
      icon: '\u{1F464}',
      user: { name: usr.name, empId: usr.empId },
      message: `joined as ${usr.role}`,
      timestamp: usr.createdAt,
      metadata: { role: usr.role },
    });
  }

  // Sort all by timestamp (newest first)
  activities.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  // Paginate
  const total = activities.length;
  const start = (page - 1) * limit;
  const paginated = activities.slice(start, start + limit);
  const hasMore = start + limit < total;

  return successResponse({
    activities: paginated,
    pagination: {
      page,
      limit,
      total,
      hasMore,
      totalPages: Math.ceil(total / limit),
    },
  });
}, ['admin', 'manager']);
