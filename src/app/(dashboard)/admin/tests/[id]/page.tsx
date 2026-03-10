'use client';

import { useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Users,
  ClipboardCheck,
  Trophy,
  BarChart3,
  Pencil,
  UserPlus,
  X,
} from 'lucide-react';

import {
  Card,
  Badge,
  Button,
  LoadingSpinner,
  SearchBar,
} from '@/components/ui';
import { useAppDispatch } from '@/store/hooks';
import { addToast } from '@/store/slices/uiSlice';
import {
  useGetTestByIdQuery,
  useAssignTestStaffMutation,
  type TestData,
} from '@/store/slices/api/testApi';
import { useGetUsersQuery } from '@/store/slices/api/userApi';
import { getErrorMessage } from '@/lib/utils/getErrorMessage';

type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'default';

const statusVariantMap: Record<string, BadgeVariant> = {
  draft: 'default',
  active: 'success',
  archived: 'warning',
};

export default function TestDetailPage() {
  const params = useParams();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const testId = params.id as string;

  const { data: testResponse, isLoading } = useGetTestByIdQuery(testId);
  const test = testResponse?.data as TestData | undefined;

  const [showAssignPanel, setShowAssignPanel] = useState(false);
  const [staffSearch, setStaffSearch] = useState('');

  const { data: staffData } = useGetUsersQuery(
    { role: 'staff', limit: 100, search: staffSearch || undefined },
    { skip: !showAssignPanel }
  );

  const [assignStaff, { isLoading: isAssigning }] = useAssignTestStaffMutation();

  const assignedIds = new Set(test?.assignedStaff?.map((s) => s._id) ?? []);
  const availableStaff = (staffData?.data ?? []).filter(
    (s) => !assignedIds.has(s._id)
  );

  const handleAssign = useCallback(
    async (staffId: string) => {
      try {
        await assignStaff({ testId, staffIds: [staffId] }).unwrap();
        dispatch(
          addToast({ type: 'success', message: 'Staff assigned successfully', duration: 3000 })
        );
      } catch (err) {
        dispatch(
          addToast({ type: 'error', message: getErrorMessage(err), duration: 4000 })
        );
      }
    },
    [testId, assignStaff, dispatch]
  );

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <LoadingSpinner variant="inline" text="Loading test..." />
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
      <div className="flex items-center justify-between">
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
            <p className="text-body-md text-primary-main font-medium">
              <Trophy className="inline h-4 w-4 mr-xs" />
              {test.certificationTitle}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-sm">
          <Button
            variant="secondary"
            leftIcon={<BarChart3 className="h-4 w-4" />}
            onClick={() => router.push(`/admin/tests/${testId}/results`)}
          >
            Results
          </Button>
          <Button
            leftIcon={<Pencil className="h-4 w-4" />}
            onClick={() => router.push(`/admin/tests/${testId}/edit`)}
          >
            Edit
          </Button>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-md">
        <Card>
          <p className="text-caption text-text-secondary">Status</p>
          <Badge variant={statusVariantMap[test.status] ?? 'default'}>
            {test.status.charAt(0).toUpperCase() + test.status.slice(1)}
          </Badge>
        </Card>
        <Card>
          <p className="text-caption text-text-secondary">Questions</p>
          <p className="text-h2 font-bold">{test.questions?.length || 0}</p>
        </Card>
        <Card>
          <p className="text-caption text-text-secondary">Passing Score</p>
          <p className="text-h2 font-bold">{test.passingScore}%</p>
        </Card>
        <Card>
          <p className="text-caption text-text-secondary">Time Limit</p>
          <p className="text-h2 font-bold">
            {test.timeLimitMinutes > 0 ? `${test.timeLimitMinutes}m` : 'None'}
          </p>
        </Card>
        <Card>
          <p className="text-caption text-text-secondary">Max Attempts</p>
          <p className="text-h2 font-bold">{test.maxAttempts}</p>
        </Card>
      </div>

      {/* Description */}
      {test.description && (
        <Card>
          <h2 className="text-h3 font-semibold mb-sm">Description</h2>
          <p className="text-body-md text-text-secondary">{test.description}</p>
        </Card>
      )}

      {/* Configuration */}
      <Card>
        <h2 className="text-h3 font-semibold mb-md">Configuration</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-md text-body-md">
          <div>
            <p className="text-text-secondary text-caption">Domain</p>
            <p className="font-medium">{test.domain || '—'}</p>
          </div>
          <div>
            <p className="text-text-secondary text-caption">Shuffle Questions</p>
            <p className="font-medium">{test.shuffleQuestions ? 'Yes' : 'No'}</p>
          </div>
          <div>
            <p className="text-text-secondary text-caption">Created</p>
            <p className="font-medium">
              {new Date(test.createdAt).toLocaleDateString()}
            </p>
          </div>
          <div>
            <p className="text-text-secondary text-caption">Created By</p>
            <p className="font-medium">{test.createdBy?.name || '—'}</p>
          </div>
        </div>
      </Card>

      {/* Questions Preview */}
      <Card>
        <h2 className="text-h3 font-semibold mb-md flex items-center gap-sm">
          <ClipboardCheck className="h-5 w-5" /> Questions ({test.questions?.length || 0})
        </h2>
        {!test.questions || test.questions.length === 0 ? (
          <p className="text-body-md text-text-secondary">No questions added yet.</p>
        ) : (
          <div className="space-y-sm">
            {test.questions.map((q, idx) => (
              <div
                key={idx}
                className="border border-border-light rounded-md p-md"
              >
                <div className="flex items-start justify-between gap-sm">
                  <p className="text-body-md font-medium">
                    <span className="text-text-secondary mr-sm">Q{idx + 1}.</span>
                    {q.questionText}
                  </p>
                  <span className="text-caption text-text-secondary whitespace-nowrap">
                    {q.points} pt{q.points !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="mt-sm grid grid-cols-1 md:grid-cols-2 gap-xs">
                  {q.options.map((opt, optIdx) => (
                    <div
                      key={optIdx}
                      className={`text-caption px-sm py-xs rounded-sm ${
                        opt.isCorrect
                          ? 'bg-success/10 text-success font-medium'
                          : 'bg-surface-background text-text-secondary'
                      }`}
                    >
                      {String.fromCharCode(65 + optIdx)}. {opt.text}
                      {opt.isCorrect && ' ✓'}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Assigned Staff */}
      <Card>
        <div className="flex items-center justify-between mb-md">
          <h2 className="text-h3 font-semibold flex items-center gap-sm">
            <Users className="h-5 w-5" /> Assigned Staff ({test.assignedStaff?.length || 0})
          </h2>
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<UserPlus className="h-4 w-4" />}
            onClick={() => setShowAssignPanel(!showAssignPanel)}
          >
            {showAssignPanel ? 'Close' : 'Assign Staff'}
          </Button>
        </div>

        {/* Assign Panel */}
        {showAssignPanel && (
          <div className="mb-md p-md bg-surface-background rounded-md border border-border-light">
            <div className="flex items-center justify-between mb-sm">
              <p className="text-body-md font-medium">Select staff to assign</p>
              <button
                type="button"
                onClick={() => setShowAssignPanel(false)}
                className="text-text-secondary hover:text-text-primary"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <SearchBar
              value={staffSearch}
              onChange={setStaffSearch}
              placeholder="Search staff..."
              className="mb-sm"
            />
            <div className="max-h-[200px] overflow-y-auto space-y-xs">
              {availableStaff.length === 0 ? (
                <p className="text-caption text-text-secondary py-sm text-center">
                  {staffSearch ? 'No matching staff found.' : 'All staff are already assigned.'}
                </p>
              ) : (
                availableStaff.map((staff) => (
                  <div
                    key={staff._id}
                    className="flex items-center justify-between p-sm rounded-sm hover:bg-surface-white transition-colors"
                  >
                    <div>
                      <p className="text-body-md font-medium">{staff.name}</p>
                      <p className="text-caption text-text-secondary">
                        {staff.empId} — {staff.email}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleAssign(staff._id)}
                      disabled={isAssigning}
                    >
                      Assign
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Assigned List */}
        {!test.assignedStaff || test.assignedStaff.length === 0 ? (
          <p className="text-body-md text-text-secondary">No staff assigned yet.</p>
        ) : (
          <div className="space-y-xs">
            {test.assignedStaff.map((staff) => (
              <div
                key={staff._id}
                className="flex items-center gap-md p-sm border border-border-light rounded-sm"
              >
                <div className="w-8 h-8 rounded-full bg-primary-main/10 flex items-center justify-center text-primary-main font-medium text-caption">
                  {staff.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-body-md font-medium">{staff.name}</p>
                  <p className="text-caption text-text-secondary">
                    {staff.empId} — {staff.email}
                    {staff.domain && ` — ${staff.domain}`}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
