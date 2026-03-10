'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, ClipboardCheck, Users, Trash2, Eye } from 'lucide-react';

import {
  Button,
  Card,
  SearchBar,
  Dropdown,
  Pagination,
  Badge,
  ConfirmDialog,
  LoadingSpinner,
} from '@/components/ui';
import { useAppDispatch } from '@/store/hooks';
import { addToast, openModal, closeModal } from '@/store/slices/uiSlice';
import {
  useGetTestsQuery,
  useDeleteTestMutation,
  type TestData,
} from '@/store/slices/api/testApi';
import { getErrorMessage } from '@/lib/utils/getErrorMessage';

// ─── Constants ──────────────────────────────────────────

const STATUS_OPTIONS = [
  { label: 'All Statuses', value: '' },
  { label: 'Draft', value: 'draft' },
  { label: 'Active', value: 'active' },
  { label: 'Archived', value: 'archived' },
];

const LIMIT = 9;
const DELETE_MODAL_ID = 'delete-test-confirm';

type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'default';

const statusVariantMap: Record<string, BadgeVariant> = {
  draft: 'default',
  active: 'success',
  archived: 'warning',
};

// ─── Component ──────────────────────────────────────────

export default function TestsListPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [testToDelete, setTestToDelete] = useState<TestData | null>(null);

  const { data, isLoading, isFetching } = useGetTestsQuery({
    page,
    limit: LIMIT,
    search: search || undefined,
    status: status || undefined,
  });

  const [deleteTest, { isLoading: isDeleting }] = useDeleteTestMutation();

  const tests = data?.data ?? [];
  const pagination = data?.pagination;
  const totalCount = pagination?.total ?? 0;

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    setPage(1);
  }, []);

  const handleStatusChange = useCallback((value: string) => {
    setStatus(value);
    setPage(1);
  }, []);

  const handleDeleteClick = useCallback(
    (e: React.MouseEvent, test: TestData) => {
      e.stopPropagation();
      setTestToDelete(test);
      dispatch(openModal(DELETE_MODAL_ID));
    },
    [dispatch]
  );

  const handleConfirmDelete = useCallback(async () => {
    if (!testToDelete) return;
    try {
      await deleteTest(testToDelete._id).unwrap();
      dispatch(closeModal());
      dispatch(
        addToast({
          type: 'success',
          message: `"${testToDelete.title}" has been deleted.`,
          duration: 4000,
        })
      );
      setTestToDelete(null);
    } catch (err) {
      dispatch(
        addToast({
          type: 'error',
          message: getErrorMessage(err),
          duration: 4000,
        })
      );
    }
  }, [testToDelete, deleteTest, dispatch]);

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <LoadingSpinner variant="inline" text="Loading tests..." />
      </div>
    );
  }

  return (
    <div className="space-y-lg">
      {/* Page Header */}
      <div className="flex flex-col gap-md sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-h1 text-text-primary">
          {totalCount} Certification Test{totalCount !== 1 ? 's' : ''}
        </h1>
        <Button
          leftIcon={<Plus className="h-4 w-4" />}
          onClick={() => router.push('/admin/tests/create')}
        >
          Create Test
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-md md:flex-row md:items-end">
        <SearchBar
          value={search}
          onChange={handleSearchChange}
          placeholder="Search tests..."
          className="w-full md:w-[280px]"
        />
        <Dropdown
          label="Status"
          items={STATUS_OPTIONS}
          value={status}
          onChange={handleStatusChange}
          placeholder="All Statuses"
          className="w-full md:w-[180px]"
        />
      </div>

      {/* Test Grid */}
      {tests.length === 0 ? (
        <div className="flex min-h-[300px] flex-col items-center justify-center rounded-md border border-border-light bg-surface-white py-2xl">
          <ClipboardCheck className="mb-md h-12 w-12 text-text-disabled" />
          <p className="text-body-lg font-medium text-text-primary">
            No certification tests found
          </p>
          <p className="mt-xs text-body-md text-text-secondary">
            {search || status
              ? 'Try adjusting your filters.'
              : 'Get started by creating your first certification test.'}
          </p>
          {!search && !status && (
            <Button
              className="mt-lg"
              leftIcon={<Plus className="h-4 w-4" />}
              onClick={() => router.push('/admin/tests/create')}
            >
              Create Test
            </Button>
          )}
        </div>
      ) : (
        <>
          {isFetching && (
            <div className="flex justify-center py-sm">
              <LoadingSpinner variant="inline" text="Updating..." />
            </div>
          )}
          <div className="grid grid-cols-1 gap-lg md:grid-cols-2 lg:grid-cols-3">
            {tests.map((test) => (
              <TestCard
                key={test._id}
                test={test}
                onClick={() => router.push(`/admin/tests/${test._id}`)}
                onDelete={(e) => handleDeleteClick(e, test)}
                onEdit={() => router.push(`/admin/tests/${test._id}/edit`)}
              />
            ))}
          </div>
        </>
      )}

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <Pagination
          page={page}
          totalPages={pagination.totalPages}
          total={pagination.total}
          limit={LIMIT}
          onPageChange={setPage}
        />
      )}

      {/* Delete Confirm */}
      <ConfirmDialog
        modalId={DELETE_MODAL_ID}
        title="Delete Test"
        message={
          testToDelete
            ? `Are you sure you want to delete "${testToDelete.title}"? This will also delete all attempts and certifications. This action cannot be undone.`
            : 'Are you sure you want to delete this test?'
        }
        confirmLabel="Delete"
        variant="danger"
        isLoading={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setTestToDelete(null)}
      />
    </div>
  );
}

// ─── Test Card ──────────────────────────────────────────

interface TestCardProps {
  test: TestData;
  onClick: () => void;
  onDelete: (_e: React.MouseEvent) => void;
  onEdit: () => void;
}

function TestCard({ test, onClick, onDelete, onEdit }: TestCardProps) {
  const statusVariant = statusVariantMap[test.status] ?? 'default';

  return (
    <Card
      hoverable
      className="cursor-pointer overflow-hidden"
      onClick={onClick}
    >
      <div className="space-y-sm">
        {/* Domain */}
        {test.domain && (
          <p className="text-caption text-text-secondary">{test.domain}</p>
        )}

        {/* Title */}
        <h3 className="text-body-lg font-medium text-text-primary line-clamp-1">
          {test.title}
        </h3>

        {/* Certification title */}
        <p className="text-body-md text-primary-main font-medium line-clamp-1">
          {'\u{1F3C6}'} {test.certificationTitle}
        </p>

        {/* Description */}
        {test.description && (
          <p className="text-body-md text-text-secondary line-clamp-2">
            {test.description}
          </p>
        )}

        {/* Stats */}
        <div className="flex items-center gap-md text-caption text-text-secondary">
          <span className="flex items-center gap-xs">
            <ClipboardCheck className="h-3.5 w-3.5" />
            {test.questions?.length || 0} questions
          </span>
          <span className="flex items-center gap-xs">
            <Users className="h-3.5 w-3.5" />
            {test.assignedStaff?.length || 0} staff
          </span>
          <span>
            {test.timeLimitMinutes > 0
              ? `${test.timeLimitMinutes} min`
              : 'No limit'}
          </span>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-sm border-t border-border-light">
          <Badge variant={statusVariant}>
            {test.status.charAt(0).toUpperCase() + test.status.slice(1)}
          </Badge>

          <div className="flex items-center gap-xs">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              className="rounded-sm p-xs text-text-secondary transition-colors hover:bg-primary-main/10 hover:text-primary-main"
              aria-label="Edit test"
            >
              <Eye className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={onDelete}
              className="rounded-sm p-xs text-text-secondary transition-colors hover:bg-error/10 hover:text-error"
              aria-label="Delete test"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </Card>
  );
}
