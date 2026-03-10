'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Users,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

import {
  Card,
  Badge,
  LoadingSpinner,
} from '@/components/ui';
import { useGetTestByIdQuery, type TestData } from '@/store/slices/api/testApi';

// ─── Component ──────────────────────────────────────────

export default function TestResultsPage() {
  const params = useParams();
  const router = useRouter();
  const testId = params.id as string;

  const { data: testResponse, isLoading } = useGetTestByIdQuery(testId);
  const test = testResponse?.data as TestData | undefined;

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <LoadingSpinner variant="inline" text="Loading results..." />
      </div>
    );
  }

  if (!test) {
    return (
      <div className="text-center py-xl">
        <p className="text-body-lg text-text-secondary">Test not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-lg max-w-5xl">
      {/* Header */}
      <div className="flex items-center gap-md">
        <button
          type="button"
          onClick={() => router.push('/admin/tests')}
          className="text-text-secondary hover:text-text-primary transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-h1 text-text-primary">{test.title}</h1>
          <p className="text-body-md text-primary-main">
            {'\u{1F3C6}'} {test.certificationTitle}
          </p>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-md">
        <Card>
          <p className="text-caption text-text-secondary">Questions</p>
          <p className="text-h2 font-bold">{test.questions?.length || 0}</p>
        </Card>
        <Card>
          <p className="text-caption text-text-secondary">Assigned Staff</p>
          <p className="text-h2 font-bold">
            {test.assignedStaff?.length || 0}
          </p>
        </Card>
        <Card>
          <p className="text-caption text-text-secondary">Passing Score</p>
          <p className="text-h2 font-bold">{test.passingScore}%</p>
        </Card>
        <Card>
          <p className="text-caption text-text-secondary">Max Attempts</p>
          <p className="text-h2 font-bold">{test.maxAttempts}</p>
        </Card>
      </div>

      {/* Staff Results */}
      <Card>
        <h2 className="text-h3 font-semibold mb-md flex items-center gap-sm">
          <Users className="h-5 w-5" /> Staff Results
        </h2>

        {!test.assignedStaff || test.assignedStaff.length === 0 ? (
          <p className="text-body-md text-text-secondary">
            No staff assigned yet.
          </p>
        ) : (
          <div className="space-y-sm">
            {test.assignedStaff.map((staff) => (
              <StaffResultRow
                key={staff._id}
                staff={staff}
                testId={testId}
              />
            ))}
          </div>
        )}
      </Card>

      {/* Test Config Details */}
      <Card>
        <h2 className="text-h3 font-semibold mb-md">Configuration</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-md text-body-md">
          <div>
            <p className="text-text-secondary text-caption">Time Limit</p>
            <p className="font-medium">
              {test.timeLimitMinutes > 0
                ? `${test.timeLimitMinutes} minutes`
                : 'No limit'}
            </p>
          </div>
          <div>
            <p className="text-text-secondary text-caption">Shuffle</p>
            <p className="font-medium">
              {test.shuffleQuestions ? 'Yes' : 'No'}
            </p>
          </div>
          <div>
            <p className="text-text-secondary text-caption">Status</p>
            <Badge
              variant={
                test.status === 'active'
                  ? 'success'
                  : test.status === 'draft'
                    ? 'default'
                    : 'warning'
              }
            >
              {test.status}
            </Badge>
          </div>
          <div>
            <p className="text-text-secondary text-caption">Domain</p>
            <p className="font-medium">{test.domain || '—'}</p>
          </div>
        </div>
      </Card>
    </div>
  );
}

// ─── Staff Result Row (with expandable attempts) ────────

interface StaffResultRowProps {
  staff: { _id: string; name: string; empId: string; email: string; domain?: string };
  testId: string;
}

function StaffResultRow({ staff }: StaffResultRowProps) {
  const [expanded, setExpanded] = useState(false);

  // We get attempt data from the test detail endpoint for admin view.
  // For a real production app, you'd fetch per-staff attempts here.
  // For now, the admin test detail includes assignedStaff but not per-staff attempts.
  // This would need a dedicated admin endpoint. For MVP, we show staff info.

  return (
    <div className="border border-border-light rounded-md">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-md hover:bg-surface-background transition-colors text-left"
      >
        <div className="flex items-center gap-md">
          <div className="w-8 h-8 rounded-full bg-primary-main/10 flex items-center justify-center text-primary-main font-medium text-caption">
            {staff.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-body-md font-medium">{staff.name}</p>
            <p className="text-caption text-text-secondary">
              {staff.empId} — {staff.email}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-sm">
          {staff.domain && (
            <span className="text-caption text-text-secondary">
              {staff.domain}
            </span>
          )}
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-text-secondary" />
          ) : (
            <ChevronDown className="h-4 w-4 text-text-secondary" />
          )}
        </div>
      </button>
      {expanded && (
        <div className="border-t border-border-light p-md">
          <p className="text-caption text-text-secondary">
            Detailed attempt history will be available here. Staff member is assigned to this test.
          </p>
        </div>
      )}
    </div>
  );
}
