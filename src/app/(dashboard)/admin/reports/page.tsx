'use client';

import { useState, useCallback } from 'react';
import { FileText, Download } from 'lucide-react';

import { Button, Card, Dropdown, Input, LoadingSpinner } from '@/components/ui';
import { useAppDispatch } from '@/store/hooks';
import { addToast } from '@/store/slices/uiSlice';
import {
  useLazyGenerateLearnerProgressReportQuery,
  useLazyGenerateSessionAttendanceReportQuery,
} from '@/store/slices/api/reportApi';
import { useGetCoursesQuery } from '@/store/slices/api/courseApi';
import { useGetSessionsQuery } from '@/store/slices/api/sessionApi';
import { getErrorMessage } from '@/lib/utils/getErrorMessage';

// ─── Types ──────────────────────────────────────────────────

type ReportFormat = 'pdf' | 'excel';

// ─── Component ──────────────────────────────────────────────

export default function ReportsPage() {
  const dispatch = useAppDispatch();

  // ── Learner Progress Report State ───────────────────────
  const [lpCourse, setLpCourse] = useState('');
  const [lpUser, setLpUser] = useState('');
  const [lpFormat, setLpFormat] = useState<ReportFormat>('pdf');

  // ── Session Attendance Report State ─────────────────────
  const [saSession, setSaSession] = useState('');
  const [saFormat, setSaFormat] = useState<ReportFormat>('pdf');

  // ── Queries ─────────────────────────────────────────────
  const { data: coursesData, isLoading: isLoadingCourses } = useGetCoursesQuery({
    limit: 100,
  });

  const { data: sessionsData, isLoading: isLoadingSessions } = useGetSessionsQuery({
    limit: 100,
    sortBy: 'date',
    sortOrder: 'desc',
  });

  const courses = coursesData?.data ?? [];
  const sessions = sessionsData?.data ?? [];

  // ── Lazy Queries for Report Generation ──────────────────
  const [triggerLearnerProgressReport, { isFetching: isGeneratingLP }] =
    useLazyGenerateLearnerProgressReportQuery();
  const [triggerSessionAttendanceReport, { isFetching: isGeneratingSA }] =
    useLazyGenerateSessionAttendanceReportQuery();

  // ── Dropdown Items ──────────────────────────────────────
  const courseItems = [
    { label: 'All Courses', value: '' },
    ...courses.map((c) => ({
      label: c.title,
      value: c._id,
    })),
  ];

  const sessionItems = [
    { label: 'All Sessions', value: '' },
    ...sessions.map((s) => ({
      label: `${s.title} (${new Date(s.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })})`,
      value: s._id,
    })),
  ];

  // ── Handlers ────────────────────────────────────────────

  const handleDownloadBlob = useCallback((blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const handleGenerateLearnerProgress = useCallback(async () => {
    try {
      const result = await triggerLearnerProgressReport({
        course: lpCourse || undefined,
        user: lpUser || undefined,
        format: lpFormat,
      }).unwrap();

      if (result instanceof Blob) {
        const ext = lpFormat === 'pdf' ? 'pdf' : 'xlsx';
        handleDownloadBlob(result, `learner-progress-report.${ext}`);
      }

      dispatch(
        addToast({
          type: 'success',
          message: 'Report generated successfully!',
          duration: 4000,
        })
      );
    } catch (err) {
      dispatch(
        addToast({
          type: 'error',
          message: getErrorMessage(err),
          duration: 4000,
        })
      );
    }
  }, [triggerLearnerProgressReport, lpCourse, lpUser, lpFormat, handleDownloadBlob, dispatch]);

  const handleGenerateSessionAttendance = useCallback(async () => {
    try {
      const result = await triggerSessionAttendanceReport({
        session: saSession || undefined,
        format: saFormat,
      }).unwrap();

      if (result instanceof Blob) {
        const ext = saFormat === 'pdf' ? 'pdf' : 'xlsx';
        handleDownloadBlob(result, `session-attendance-report.${ext}`);
      }

      dispatch(
        addToast({
          type: 'success',
          message: 'Report generated successfully!',
          duration: 4000,
        })
      );
    } catch (err) {
      dispatch(
        addToast({
          type: 'error',
          message: getErrorMessage(err),
          duration: 4000,
        })
      );
    }
  }, [triggerSessionAttendanceReport, saSession, saFormat, handleDownloadBlob, dispatch]);

  // ── Render ──────────────────────────────────────────────

  return (
    <div className="space-y-lg">
      {/* ── Page Header ─────────────────────────────────── */}
      <h1 className="text-h1 text-text-primary">Reports</h1>

      {/* ── Report Cards Grid ───────────────────────────── */}
      <div className="grid grid-cols-1 gap-lg lg:grid-cols-2">
        {/* ── Card 1: Learner Progress Report ─────────── */}
        <Card>
          <div className="space-y-lg">
            <div className="flex items-center gap-sm">
              <FileText className="h-5 w-5 text-primary-main" />
              <h3 className="text-h3 text-text-primary">Learner Progress Report</h3>
            </div>

            {/* Course Filter */}
            {isLoadingCourses ? (
              <LoadingSpinner variant="inline" text="Loading courses..." />
            ) : (
              <Dropdown
                label="Course (optional)"
                items={courseItems}
                value={lpCourse}
                onChange={setLpCourse}
                placeholder="All Courses"
              />
            )}

            {/* User Filter */}
            <Input
              label="Staff / User (optional)"
              placeholder="Enter user ID or name"
              value={lpUser}
              onChange={(e) => setLpUser(e.target.value)}
            />

            {/* Format Selection */}
            <div className="flex flex-col gap-xs">
              <label className="text-body-md font-medium text-text-primary">
                Format
              </label>
              <div className="flex gap-sm">
                <button
                  type="button"
                  onClick={() => setLpFormat('pdf')}
                  className={`flex-1 rounded-sm px-lg py-sm text-body-md font-medium transition-colors ${
                    lpFormat === 'pdf'
                      ? 'bg-primary-main text-white'
                      : 'border border-border-light bg-surface-white text-text-primary hover:bg-surface-background'
                  }`}
                >
                  PDF
                </button>
                <button
                  type="button"
                  onClick={() => setLpFormat('excel')}
                  className={`flex-1 rounded-sm px-lg py-sm text-body-md font-medium transition-colors ${
                    lpFormat === 'excel'
                      ? 'bg-primary-main text-white'
                      : 'border border-border-light bg-surface-white text-text-primary hover:bg-surface-background'
                  }`}
                >
                  Excel
                </button>
              </div>
            </div>

            {/* Generate Button */}
            <Button
              isBlock
              isLoading={isGeneratingLP}
              leftIcon={<Download className="h-4 w-4" />}
              onClick={handleGenerateLearnerProgress}
            >
              Generate Report
            </Button>
          </div>
        </Card>

        {/* ── Card 2: Session Attendance Report ───────── */}
        <Card>
          <div className="space-y-lg">
            <div className="flex items-center gap-sm">
              <FileText className="h-5 w-5 text-primary-main" />
              <h3 className="text-h3 text-text-primary">Session Attendance Report</h3>
            </div>

            {/* Session Filter */}
            {isLoadingSessions ? (
              <LoadingSpinner variant="inline" text="Loading sessions..." />
            ) : (
              <Dropdown
                label="Session"
                items={sessionItems}
                value={saSession}
                onChange={setSaSession}
                placeholder="All Sessions"
              />
            )}

            {/* Format Selection */}
            <div className="flex flex-col gap-xs">
              <label className="text-body-md font-medium text-text-primary">
                Format
              </label>
              <div className="flex gap-sm">
                <button
                  type="button"
                  onClick={() => setSaFormat('pdf')}
                  className={`flex-1 rounded-sm px-lg py-sm text-body-md font-medium transition-colors ${
                    saFormat === 'pdf'
                      ? 'bg-primary-main text-white'
                      : 'border border-border-light bg-surface-white text-text-primary hover:bg-surface-background'
                  }`}
                >
                  PDF
                </button>
                <button
                  type="button"
                  onClick={() => setSaFormat('excel')}
                  className={`flex-1 rounded-sm px-lg py-sm text-body-md font-medium transition-colors ${
                    saFormat === 'excel'
                      ? 'bg-primary-main text-white'
                      : 'border border-border-light bg-surface-white text-text-primary hover:bg-surface-background'
                  }`}
                >
                  Excel
                </button>
              </div>
            </div>

            {/* Generate Button */}
            <Button
              isBlock
              isLoading={isGeneratingSA}
              leftIcon={<Download className="h-4 w-4" />}
              onClick={handleGenerateSessionAttendance}
            >
              Generate Report
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
