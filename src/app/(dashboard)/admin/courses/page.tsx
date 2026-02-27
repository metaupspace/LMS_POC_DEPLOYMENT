'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Plus, BookOpen, Users, Layers } from 'lucide-react';

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
import { useTranslation } from '@/i18n';
import {
  useGetCoursesQuery,
  useDeleteCourseMutation,
  type CourseData,
} from '@/store/slices/api/courseApi';
import type { CourseStatus } from '@/types';
import { getErrorMessage } from '@/lib/utils/getErrorMessage';

// ─── Constants ───────────────────────────────────────────────

const STATUS_OPTIONS = [
  { label: 'All Statuses', value: '' },
  { label: 'Draft', value: 'draft' },
  { label: 'Active', value: 'active' },
  { label: 'Archived', value: 'archived' },
];

const SORT_OPTIONS = [
  { label: 'Newest First', value: 'createdAt:desc' },
  { label: 'Oldest First', value: 'createdAt:asc' },
  { label: 'Title A-Z', value: 'title:asc' },
  { label: 'Title Z-A', value: 'title:desc' },
];

const LIMIT = 9;

const DELETE_MODAL_ID = 'delete-course-confirm';

// ─── Status Badge Variant Mapping ────────────────────────────

type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'default';

const statusVariantMap: Record<string, BadgeVariant> = {
  draft: 'default',
  active: 'success',
  archived: 'warning',
};

// ─── Component ───────────────────────────────────────────────

export default function CoursesListPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { t } = useTranslation();

  // ── Filters ────────────────────────────────────────────────
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [domain, setDomain] = useState('');
  const [status, setStatus] = useState('');
  const [sortValue, setSortValue] = useState('createdAt:desc');

  const [sortBy, sortOrder] = sortValue.split(':') as [string, 'asc' | 'desc'];

  // ── Delete State ───────────────────────────────────────────
  const [courseToDelete, setCourseToDelete] = useState<CourseData | null>(null);

  // ── Queries / Mutations ────────────────────────────────────
  const { data, isLoading, isFetching } = useGetCoursesQuery({
    page,
    limit: LIMIT,
    search: search || undefined,
    domain: domain || undefined,
    status: (status || undefined) as CourseStatus | undefined,
    sortBy,
    sortOrder,
  });

  const [deleteCourse, { isLoading: isDeleting }] = useDeleteCourseMutation();

  const courses = data?.data ?? [];
  const pagination = data?.pagination;
  const totalCount = pagination?.total ?? 0;

  // ── Handlers ───────────────────────────────────────────────

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    setPage(1);
  }, []);

  const handleStatusChange = useCallback((value: string) => {
    setStatus(value);
    setPage(1);
  }, []);

  const handleDomainChange = useCallback((value: string) => {
    setDomain(value);
    setPage(1);
  }, []);

  const handleSortChange = useCallback((value: string) => {
    setSortValue(value);
    setPage(1);
  }, []);

  const handleCardClick = useCallback(
    (courseId: string) => {
      router.push(`/admin/courses/${courseId}`);
    },
    [router]
  );

  const handleDeleteClick = useCallback(
    (e: React.MouseEvent, course: CourseData) => {
      e.stopPropagation();
      setCourseToDelete(course);
      dispatch(openModal(DELETE_MODAL_ID));
    },
    [dispatch]
  );

  const handleConfirmDelete = useCallback(async () => {
    if (!courseToDelete) return;
    try {
      await deleteCourse(courseToDelete._id).unwrap();
      dispatch(closeModal());
      dispatch(
        addToast({
          type: 'success',
          message: `"${courseToDelete.title}" has been deleted.`,
          duration: 4000,
        })
      );
      setCourseToDelete(null);
    } catch (err) {
      dispatch(
        addToast({
          type: 'error',
          message: getErrorMessage(err),
          duration: 4000,
        })
      );
    }
  }, [courseToDelete, deleteCourse, dispatch]);

  // ── Loading State ──────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <LoadingSpinner variant="inline" text="Loading courses..." />
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────

  return (
    <div className="space-y-lg">
      {/* ── Page Header ─────────────────────────────────────── */}
      <div className="flex flex-col gap-md sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-h1 text-text-primary">
          {totalCount} {t('courses.courses')}
        </h1>
        <Button
          leftIcon={<Plus className="h-4 w-4" />}
          onClick={() => router.push('/admin/courses/create')}
        >
          {t('courses.createCourse')}
        </Button>
      </div>

      {/* ── Filters Bar ─────────────────────────────────────── */}
      <div className="flex flex-col gap-md md:flex-row md:items-end">
        <SearchBar
          value={search}
          onChange={handleSearchChange}
          placeholder="Search courses..."
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
        <Dropdown
          label="Domain"
          items={
            domain
              ? [
                  { label: 'All Domains', value: '' },
                  { label: domain, value: domain },
                ]
              : [{ label: 'All Domains', value: '' }]
          }
          value={domain}
          onChange={handleDomainChange}
          placeholder="All Domains"
          className="w-full md:w-[180px]"
        />
        <Dropdown
          label="Sort By"
          items={SORT_OPTIONS}
          value={sortValue}
          onChange={handleSortChange}
          placeholder="Sort..."
          className="w-full md:w-[180px]"
        />
      </div>

      {/* ── Course Grid ─────────────────────────────────────── */}
      {courses.length === 0 ? (
        <div className="flex min-h-[300px] flex-col items-center justify-center rounded-md border border-border-light bg-surface-white py-2xl">
          <BookOpen className="mb-md h-12 w-12 text-text-disabled" />
          <p className="text-body-lg font-medium text-text-primary">
            No courses found
          </p>
          <p className="mt-xs text-body-md text-text-secondary">
            {search || status || domain
              ? 'Try adjusting your filters or search query.'
              : 'Get started by creating your first course.'}
          </p>
          {!search && !status && !domain && (
            <Button
              className="mt-lg"
              leftIcon={<Plus className="h-4 w-4" />}
              onClick={() => router.push('/admin/courses/create')}
            >
              Create Course
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
            {courses.map((course) => (
              <CourseCard
                key={course._id}
                course={course}
                onClick={() => handleCardClick(course._id)}
                onDelete={(e) => handleDeleteClick(e, course)}
              />
            ))}
          </div>
        </>
      )}

      {/* ── Pagination ──────────────────────────────────────── */}
      {pagination && pagination.totalPages > 1 && (
        <Pagination
          page={page}
          totalPages={pagination.totalPages}
          total={pagination.total}
          limit={LIMIT}
          onPageChange={setPage}
        />
      )}

      {/* ── Delete Confirm Dialog ───────────────────────────── */}
      <ConfirmDialog
        modalId={DELETE_MODAL_ID}
        title="Delete Course"
        message={
          courseToDelete
            ? `Are you sure you want to delete "${courseToDelete.title}"? This action cannot be undone.`
            : 'Are you sure you want to delete this course?'
        }
        confirmLabel="Delete"
        variant="danger"
        isLoading={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setCourseToDelete(null)}
      />
    </div>
  );
}

// ─── Course Card Sub-Component ─────────────────────────────────

interface CourseCardProps {
  course: CourseData;
  onClick: () => void;
  onDelete: (_e: React.MouseEvent) => void;
}

function CourseCard({ course, onClick, onDelete }: CourseCardProps) {
  const statusVariant = statusVariantMap[course.status] ?? 'default';

  return (
    <Card
      hoverable
      noPadding
      className="cursor-pointer overflow-hidden"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
    >
      {/* Thumbnail */}
      {course.thumbnail ? (
        <Image
          src={course.thumbnail}
          alt={course.title}
          width={400}
          height={140}
          className="h-[140px] w-full rounded-t-md object-cover"
          unoptimized
        />
      ) : (
        <div className="flex h-[140px] items-center justify-center rounded-t-md bg-surface-background">
          <BookOpen className="h-8 w-8 text-text-disabled" />
        </div>
      )}

      {/* Content */}
      <div className="p-md">
        {/* Domain */}
        {course.domain && (
          <p className="text-caption text-text-secondary">{course.domain}</p>
        )}

        {/* Title */}
        <h3 className="mt-xs text-body-lg font-medium text-text-primary line-clamp-1">
          {course.title}
        </h3>

        {/* Description */}
        <p className="mt-xs text-body-md text-text-secondary line-clamp-2">
          {course.description}
        </p>

        {/* Footer */}
        <div className="mt-md flex items-center justify-between">
          <div className="flex items-center gap-md text-caption text-text-secondary">
            <span className="flex items-center gap-xs">
              <Layers className="h-3.5 w-3.5" />
              {course.modules.length} {course.modules.length === 1 ? 'module' : 'modules'}
            </span>
            <span className="flex items-center gap-xs">
              <Users className="h-3.5 w-3.5" />
              {course.assignedStaff.length}
            </span>
          </div>
          <Badge variant={statusVariant}>
            {course.status.charAt(0).toUpperCase() + course.status.slice(1)}
          </Badge>
        </div>

        {/* Delete button */}
        <div className="mt-md flex justify-end">
          <button
            type="button"
            onClick={onDelete}
            className="rounded-sm p-xs text-text-secondary transition-colors hover:bg-error/10 hover:text-error"
            aria-label={`Delete ${course.title}`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              <line x1="10" y1="11" x2="10" y2="17" />
              <line x1="14" y1="11" x2="14" y2="17" />
            </svg>
          </button>
        </div>
      </div>
    </Card>
  );
}
