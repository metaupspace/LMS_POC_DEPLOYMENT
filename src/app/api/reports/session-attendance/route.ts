import { type NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db/connect';
import TrainingSession from '@/lib/db/models/TrainingSession';
import { withAuth } from '@/lib/auth/rbac';
import { errorResponse } from '@/lib/utils/apiResponse';
import { generatePDFReport, generateExcelReport } from '@/lib/utils/reportGenerator';

// GET /api/reports/session-attendance
export const GET = withAuth(
  async (request: NextRequest) => {
    try {
      await connectDB();

      const { searchParams } = new URL(request.url);
      const format = searchParams.get('format') ?? 'pdf';
      const sessionId = searchParams.get('sessionId');

      if (!sessionId) {
        return errorResponse('Session ID is required', 400);
      }

      const session = await TrainingSession.findById(sessionId)
        .populate('instructor', 'name empId')
        .populate('enrolledStaff', 'name empId email')
        .populate('attendance.staff', 'name empId')
        .lean();

      if (!session) {
        return errorResponse('Session not found', 404);
      }

      const attendanceMap = new Map(
        session.attendance.map((a) => {
          const staff = a.staff as unknown as Record<string, string>;
          return [staff?._id?.toString?.() ?? '', a];
        })
      );

      const headers = ['Employee ID', 'Name', 'Email', 'Status', 'Marked At'];

      const enrolledStaff = session.enrolledStaff as unknown as Array<Record<string, string>>;
      const data: string[][] = enrolledStaff.map((staff) => {
        const staffId = staff?._id?.toString?.() ?? '';
        const record = attendanceMap.get(staffId);

        return [
          staff?.empId ?? '',
          staff?.name ?? '',
          staff?.email ?? '',
          record ? record.status : 'absent',
          record?.markedAt ? new Date(record.markedAt).toLocaleString() : '-',
        ];
      });

      const instructor = session.instructor as unknown as Record<string, string>;
      const title = `Session Attendance: ${session.title} (${new Date(session.date).toLocaleDateString()}) - Instructor: ${instructor?.name ?? 'N/A'}`;

      if (format === 'excel') {
        const arrayBuffer = await generateExcelReport(title, headers, data);
        return new NextResponse(arrayBuffer, {
          headers: {
            'Content-Type':
              'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': `attachment; filename="session-attendance-${Date.now()}.xlsx"`,
          },
        });
      }

      const arrayBuffer = await generatePDFReport(title, headers, data);
      return new NextResponse(arrayBuffer, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="session-attendance-${Date.now()}.pdf"`,
        },
      });
    } catch (err) {
      console.error('[Reports/SessionAttendance] Error:', err instanceof Error ? err.message : err);
      return errorResponse('Internal server error', 500);
    }
  },
  ['admin', 'manager']
);
