'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowLeft,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronRight,
  Video,
  FileText,
  HelpCircle,
  Clock,
  Users,
  BookOpen,
  ImageIcon,
  Calendar,
  Target,
  Briefcase,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { useGetCourseByIdQuery, useGetCourseModulesQuery, useDeleteCourseMutation, useUpdateCourseMutation } from '@/store/slices/api/courseApi';
import type { ModuleData } from '@/store/slices/api/courseApi';
import { useGetUserByIdQuery } from '@/store/slices/api/userApi';
import { useAppDispatch } from '@/store/hooks';
import { addToast, openModal, closeModal } from '@/store/slices/uiSlice';
import { Button, Card, Badge, LoadingSpinner, ConfirmDialog } from '@/components/ui';
import type { CourseStatus } from '@/types';

// ─── Helpers ──────────────────────────────────────────────

const statusVariantMap: Record<CourseStatus, 'default' | 'success' | 'warning'> = {
  draft: 'default',
  active: 'success',
  archived: 'warning',
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins < 60) return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
  const hrs = Math.floor(mins / 60);
  const remainMins = mins % 60;
  return remainMins > 0 ? `${hrs}h ${remainMins}m` : `${hrs}h`;
}

function contentTypeIcon(type: string) {
  switch (type) {
    case 'video':
      return <Video className="h-4 w-4 text-primary-main" strokeWidth={1.5} />;
    case 'text':
      return <FileText className="h-4 w-4 text-blue-500" strokeWidth={1.5} />;
    default:
      return <FileText className="h-4 w-4 text-text-secondary" strokeWidth={1.5} />;
  }
}

// ─── Module Accordion Item ────────────────────────────────

interface ModuleAccordionProps {
  module: ModuleData;
  isExpanded: boolean;
  onToggle: () => void;
}

function ModuleAccordionItem({ module, isExpanded, onToggle }: ModuleAccordionProps) {
  const contentCount = module.contents.length;
  const hasQuiz = Boolean(module.quiz);

  return (
    <div className="rounded-md border border-border-light bg-surface-white overflow-hidden">
      {/* Module Header */}
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between px-lg py-md transition-colors hover:bg-surface-background"
      >
        <div className="flex items-center gap-md">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-light text-body-md font-semibold text-primary-main">
            {module.order}
          </div>
          <div className="text-left">
            <h4 className="text-body-lg font-medium text-text-primary">{module.title}</h4>
            <p className="mt-[2px] text-caption text-text-secondary">
              {contentCount} content{contentCount !== 1 ? 's' : ''}
              {hasQuiz ? ' \u00B7 Quiz included' : ''}
            </p>
          </div>
        </div>
        {isExpanded ? (
          <ChevronDown className="h-5 w-5 text-text-secondary" strokeWidth={1.5} />
        ) : (
          <ChevronRight className="h-5 w-5 text-text-secondary" strokeWidth={1.5} />
        )}
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-border-light px-lg py-md">
          {module.description && (
            <p className="mb-md text-body-md text-text-secondary">{module.description}</p>
          )}

          {/* Contents List */}
          {contentCount > 0 && (
            <div className="mb-md">
              <h5 className="mb-sm text-caption font-semibold uppercase tracking-wider text-text-secondary">
                Contents
              </h5>
              <ul className="flex flex-col gap-sm">
                {module.contents.map((content, idx) => (
                  <li
                    key={idx}
                    className="flex items-center justify-between rounded-sm bg-surface-background px-md py-sm"
                  >
                    <div className="flex items-center gap-sm">
                      {contentTypeIcon(content.type)}
                      <span className="text-body-md text-text-primary">{content.title}</span>
                      <Badge variant="default">{content.type}</Badge>
                    </div>
                    {content.duration > 0 && (
                      <div className="flex items-center gap-xs text-caption text-text-secondary">
                        <Clock className="h-3.5 w-3.5" strokeWidth={1.5} />
                        {formatDuration(content.duration)}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Quiz Info */}
          {hasQuiz && (
            <div className="rounded-sm border border-primary-main/20 bg-primary-light/50 p-md">
              <div className="flex items-center gap-sm mb-sm">
                <HelpCircle className="h-4 w-4 text-primary-main" strokeWidth={1.5} />
                <span className="text-body-md font-medium text-primary-main">
                  Assessment
                </span>
              </div>
              {typeof module.quiz === 'object' && module.quiz !== null && (
                <div className="space-y-sm">
                  <div className="flex gap-lg text-caption text-text-secondary">
                    <span>Questions: {module.quiz.questions.length}</span>
                    <span>Passing Score: {module.quiz.passingScore}%</span>
                    <span>Max Attempts: {module.quiz.maxAttempts}</span>
                  </div>
                  <div className="space-y-xs">
                    {module.quiz.questions.map((q, qi) => (
                      <div key={qi} className="rounded-sm bg-surface-white px-md py-sm">
                        <p className="text-body-md text-text-primary">
                          <span className="font-medium text-text-secondary">Q{qi + 1}.</span> {q.questionText}
                        </p>
                        <div className="mt-xs flex flex-wrap gap-sm">
                          {q.options.map((opt, oi) => (
                            <span
                              key={oi}
                              className={`inline-flex items-center gap-xs rounded-sm px-sm py-xs text-caption ${
                                opt.isCorrect
                                  ? 'bg-success/10 text-success font-medium'
                                  : 'bg-surface-background text-text-secondary'
                              }`}
                            >
                              {opt.isCorrect && <CheckCircle className="h-3 w-3" />}
                              {opt.text}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {!hasQuiz && contentCount === 0 && (
            <p className="text-body-md text-text-secondary italic">No content added yet.</p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────

export default function CourseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const id = params.id as string;

  const { data: courseRes, isLoading: courseLoading, error: courseError } = useGetCourseByIdQuery(id);
  const { data: modulesRes, isLoading: modulesLoading } = useGetCourseModulesQuery(id);
  const [deleteCourse, { isLoading: isDeleting }] = useDeleteCourseMutation();
  const [updateCourse, { isLoading: isUpdatingStatus }] = useUpdateCourseMutation();

  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());

  const course = courseRes?.data;
  const modules = modulesRes?.data ?? [];
  const sortedModules = [...modules].sort((a, b) => a.order - b.order);

  // Fetch coach data if assigned
  const coachId = course?.coach;
  const { data: coachRes } = useGetUserByIdQuery(coachId!, { skip: !coachId });
  const coach = coachRes?.data;

  // ── Handlers ──────────────────────────────────────────

  const toggleModule = (moduleId: string) => {
    setExpandedModules((prev) => {
      const next = new Set(prev);
      if (next.has(moduleId)) {
        next.delete(moduleId);
      } else {
        next.add(moduleId);
      }
      return next;
    });
  };

  const handleDelete = async () => {
    try {
      await deleteCourse(id).unwrap();
      dispatch(closeModal());
      dispatch(addToast({ type: 'success', message: 'Course deleted successfully.', duration: 3000 }));
      router.push('/admin/courses');
    } catch (err: unknown) {
      const error = err as { data?: { message?: string } };
      dispatch(
        addToast({
          type: 'error',
          message: error.data?.message ?? 'Failed to delete course.',
          duration: 4000,
        })
      );
    }
  };

  const handleToggleStatus = async () => {
    if (!course) return;
    const newStatus = course.status === 'active' ? 'draft' : 'active';
    try {
      await updateCourse({ id, body: { status: newStatus } }).unwrap();
      dispatch(
        addToast({
          type: 'success',
          message: newStatus === 'active' ? 'Course published successfully.' : 'Course moved to draft.',
          duration: 3000,
        })
      );
    } catch (err: unknown) {
      const error = err as { data?: { message?: string } };
      dispatch(
        addToast({
          type: 'error',
          message: error.data?.message ?? 'Failed to update course status.',
          duration: 4000,
        })
      );
    }
  };

  // ── Loading State ─────────────────────────────────────

  if (courseLoading) {
    return (
      <div className="flex items-center justify-center py-2xl">
        <LoadingSpinner variant="inline" text="Loading course details..." />
      </div>
    );
  }

  // ── Error State ───────────────────────────────────────

  if (courseError || !course) {
    return (
      <div className="flex flex-col items-center justify-center gap-md py-2xl">
        <p className="text-body-lg text-error">
          {courseError ? 'Failed to load course details.' : 'Course not found.'}
        </p>
        <Link href="/admin/courses">
          <Button variant="secondary" leftIcon={<ArrowLeft className="h-4 w-4" strokeWidth={1.5} />}>
            Back to Courses
          </Button>
        </Link>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────

  return (
    <div className="space-y-lg">
      {/* Header */}
      <div className="flex flex-col gap-md sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-md">
          <Link
            href="/admin/courses"
            className="flex h-10 w-10 items-center justify-center rounded-sm text-text-secondary transition-colors hover:bg-surface-background hover:text-text-primary"
          >
            <ArrowLeft className="h-5 w-5" strokeWidth={1.5} />
          </Link>
          <h1 className="text-h2 text-text-primary">Course Details</h1>
        </div>
        <div className="flex items-center gap-sm">
          {course.status !== 'archived' && (
            <Button
              variant={course.status === 'active' ? 'secondary' : 'primary'}
              size="sm"
              isLoading={isUpdatingStatus}
              onClick={handleToggleStatus}
            >
              {course.status === 'active' ? 'Unpublish' : 'Publish'}
            </Button>
          )}
          <Link href={`/admin/courses/create?edit=${id}`}>
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<Pencil className="h-4 w-4" strokeWidth={1.5} />}
            >
              Edit
            </Button>
          </Link>
          <Button
            variant="danger"
            size="sm"
            leftIcon={<Trash2 className="h-4 w-4" strokeWidth={1.5} />}
            onClick={() => dispatch(openModal('delete-course'))}
          >
            Delete
          </Button>
        </div>
      </div>

      {/* Course Info Card */}
      <Card>
        {/* Thumbnail */}
        <div className="mb-lg overflow-hidden rounded-md bg-surface-background">
          {course.thumbnail ? (
            <div className="relative h-[240px] w-full">
              <Image
                src={course.thumbnail}
                alt={course.title}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 800px"
              />
            </div>
          ) : (
            <div className="flex h-[200px] items-center justify-center">
              <ImageIcon className="h-16 w-16 text-text-disabled" strokeWidth={1} />
            </div>
          )}
        </div>

        {/* Title & Description */}
        <h2 className="text-h2 text-text-primary">{course.title}</h2>
        <p className="mt-sm text-body-md text-text-secondary">{course.description}</p>

        {/* Info Grid */}
        <div className="mt-lg grid grid-cols-1 gap-md sm:grid-cols-2 lg:grid-cols-3">
          {/* Domain */}
          <div className="flex items-center gap-sm">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary-light">
              <Briefcase className="h-4 w-4 text-primary-main" strokeWidth={1.5} />
            </div>
            <div>
              <p className="text-caption text-text-secondary">Domain</p>
              <p className="text-body-md font-medium text-text-primary">{course.domain}</p>
            </div>
          </div>

          {/* Status */}
          <div className="flex items-center gap-sm">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary-light">
              <CheckCircle className="h-4 w-4 text-primary-main" strokeWidth={1.5} />
            </div>
            <div>
              <p className="text-caption text-text-secondary">Status</p>
              <Badge variant={statusVariantMap[course.status]}>
                {course.status.charAt(0).toUpperCase() + course.status.slice(1)}
              </Badge>
            </div>
          </div>

          {/* Passing Threshold */}
          <div className="flex items-center gap-sm">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary-light">
              <Target className="h-4 w-4 text-primary-main" strokeWidth={1.5} />
            </div>
            <div>
              <p className="text-caption text-text-secondary">Passing Threshold</p>
              <p className="text-body-md font-medium text-text-primary">{course.passingThreshold}%</p>
            </div>
          </div>

          {/* Proof of Work */}
          <div className="flex items-center gap-sm">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary-light">
              {course.proofOfWorkEnabled ? (
                <CheckCircle className="h-4 w-4 text-success" strokeWidth={1.5} />
              ) : (
                <XCircle className="h-4 w-4 text-text-disabled" strokeWidth={1.5} />
              )}
            </div>
            <div>
              <p className="text-caption text-text-secondary">Proof of Work</p>
              <p className="text-body-md font-medium text-text-primary">
                {course.proofOfWorkEnabled ? 'Enabled' : 'Disabled'}
              </p>
            </div>
          </div>

          {/* Created Date */}
          <div className="flex items-center gap-sm">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary-light">
              <Calendar className="h-4 w-4 text-primary-main" strokeWidth={1.5} />
            </div>
            <div>
              <p className="text-caption text-text-secondary">Created</p>
              <p className="text-body-md font-medium text-text-primary">{formatDate(course.createdAt)}</p>
            </div>
          </div>

          {/* Assigned Coach */}
          <div className="flex items-center gap-sm">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary-light">
              <Users className="h-4 w-4 text-primary-main" strokeWidth={1.5} />
            </div>
            <div>
              <p className="text-caption text-text-secondary">Assigned Coach</p>
              <p className="text-body-md font-medium text-text-primary">
                {coach ? coach.name : 'Not assigned'}
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Modules Section */}
      <Card
        header={
          <div className="flex items-center gap-sm">
            <BookOpen className="h-5 w-5 text-primary-main" strokeWidth={1.5} />
            <h3 className="text-h3 text-text-primary">
              Modules ({sortedModules.length})
            </h3>
          </div>
        }
      >
        {modulesLoading ? (
          <LoadingSpinner variant="inline" text="Loading modules..." />
        ) : sortedModules.length === 0 ? (
          <p className="text-body-md text-text-secondary">No modules have been added to this course yet.</p>
        ) : (
          <div className="flex flex-col gap-sm">
            {sortedModules.map((mod) => (
              <ModuleAccordionItem
                key={mod._id}
                module={mod}
                isExpanded={expandedModules.has(mod._id)}
                onToggle={() => toggleModule(mod._id)}
              />
            ))}
          </div>
        )}
      </Card>

      {/* Enrolled Staff Section */}
      <Card
        header={
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-sm">
              <Users className="h-5 w-5 text-primary-main" strokeWidth={1.5} />
              <h3 className="text-h3 text-text-primary">Enrolled Staff</h3>
            </div>
            <Link href={`/admin/courses/${id}/assign`}>
              <Button variant="primary" size="sm">
                Manage Assignments
              </Button>
            </Link>
          </div>
        }
      >
        {course.assignedStaff.length > 0 ? (
          <div>
            <p className="text-body-md text-text-primary">
              <span className="font-semibold">{course.assignedStaff.length}</span> staff enrolled
            </p>
            <div className="mt-sm flex flex-wrap gap-sm">
              {course.assignedStaff.slice(0, 8).map((staff, idx) => {
                const isPopulated = typeof staff === 'object' && staff !== null;
                const key = isPopulated ? staff._id : String(staff);
                const label = isPopulated ? `${staff.name} (${staff.empId})` : String(staff);
                return (
                  <span
                    key={key || idx}
                    className="inline-flex rounded-full bg-surface-background px-md py-xs text-caption text-text-secondary"
                  >
                    {label}
                  </span>
                );
              })}
              {course.assignedStaff.length > 8 && (
                <span className="inline-flex rounded-full bg-primary-light px-md py-xs text-caption font-medium text-primary-main">
                  +{course.assignedStaff.length - 8} more
                </span>
              )}
            </div>
          </div>
        ) : (
          <p className="text-body-md text-text-secondary">No staff enrolled yet.</p>
        )}
      </Card>

      {/* Delete Confirm Dialog */}
      <ConfirmDialog
        modalId="delete-course"
        title="Delete Course"
        message={`Are you sure you want to delete "${course.title}"? This action cannot be undone.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        isLoading={isDeleting}
        onConfirm={handleDelete}
      />
    </div>
  );
}
