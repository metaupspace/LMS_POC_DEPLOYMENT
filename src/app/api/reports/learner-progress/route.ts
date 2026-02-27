import { type NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db/connect';
import LearnerProgress from '@/lib/db/models/LearnerProgress';

import Gamification from '@/lib/db/models/Gamification';
import { withAuth } from '@/lib/auth/rbac';
import { errorResponse } from '@/lib/utils/apiResponse';
import { generatePDFReport, generateExcelReport } from '@/lib/utils/reportGenerator';
import type { FilterQuery } from 'mongoose';
import type { ILearnerProgress } from '@/types';

// GET /api/reports/learner-progress
export const GET = withAuth(
  async (request: NextRequest) => {
    try {
      await connectDB();

      const { searchParams } = new URL(request.url);
      const format = searchParams.get('format') ?? 'pdf';
      const courseId = searchParams.get('courseId');
      const userId = searchParams.get('userId');

      const filter: FilterQuery<ILearnerProgress> = {};
      if (courseId) filter.course = courseId;
      if (userId) filter.user = userId;

      const records = await LearnerProgress.find(filter)
        .populate('user', 'name empId email')
        .populate('course', 'title')
        .populate('module', 'title order')
        .sort({ 'user.name': 1 })
        .lean();

      // Get gamification data for unique users
      const userIds = [...new Set(records.map((r) => r.user?._id?.toString()).filter(Boolean))];
      const gamificationRecords = await Gamification.find({
        user: { $in: userIds },
      }).lean();
      const gamificationMap = new Map(
        gamificationRecords.map((g) => [g.user.toString(), g])
      );

      const headers = [
        'Employee ID',
        'Name',
        'Course',
        'Module',
        'Status',
        'Video',
        'Quiz',
        'PoW',
        'Total Points',
        'Badges',
      ];

      const data: string[][] = records.map((r) => {
        const user = r.user as unknown as Record<string, string>;
        const course = r.course as unknown as Record<string, string>;
        const mod = r.module as unknown as Record<string, string>;
        const gam = gamificationMap.get(user?._id?.toString?.() ?? '');

        return [
          user?.empId ?? '',
          user?.name ?? '',
          course?.title ?? '',
          mod?.title ?? '',
          r.status,
          r.videoCompleted ? 'Done' : 'Pending',
          r.quizPassed ? 'Passed' : 'Pending',
          String(r.proofOfWorkPoints),
          String(r.totalModulePoints),
          gam ? gam.badges.map((b) => b.name).join(', ') : '',
        ];
      });

      const title = 'Learner Progress Report';

      if (format === 'excel') {
        const arrayBuffer = await generateExcelReport(title, headers, data);
        return new NextResponse(arrayBuffer, {
          headers: {
            'Content-Type':
              'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': `attachment; filename="learner-progress-${Date.now()}.xlsx"`,
          },
        });
      }

      const arrayBuffer = await generatePDFReport(title, headers, data);
      return new NextResponse(arrayBuffer, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="learner-progress-${Date.now()}.pdf"`,
        },
      });
    } catch (err) {
      console.error('[Reports/LearnerProgress] Error:', err instanceof Error ? err.message : err);
      return errorResponse('Internal server error', 500);
    }
  },
  ['admin', 'manager']
);
