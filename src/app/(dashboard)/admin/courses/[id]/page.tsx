'use client';

import { useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowLeft,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronUp,
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
  Save,
  X,
  TrendingUp,
} from 'lucide-react';
import { useGetCourseByIdQuery, useGetCourseModulesQuery, useDeleteCourseMutation, useUpdateCourseMutation, useGetCourseAnalyticsQuery } from '@/store/slices/api/courseApi';
import type { ModuleData, LearnerStatData, ModuleStatData, ModuleProgressData } from '@/store/slices/api/courseApi';
import { useUpdateModuleMutation, useDeleteModuleMutation } from '@/store/slices/api/moduleApi';
import { useAppDispatch } from '@/store/hooks';
import { addToast, openModal, closeModal } from '@/store/slices/uiSlice';
import { getErrorMessage } from '@/lib/utils/getErrorMessage';
import { Button, Card, Badge, LoadingSpinner, ConfirmDialog, Input } from '@/components/ui';
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
  isEditing: boolean;
  editTitle: string;
  editDescription: string;
  onEditTitleChange: (_value: string) => void;
  onEditDescriptionChange: (_value: string) => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
  onDelete: () => void;
  isSaving: boolean;
}

function ModuleAccordionItem({
  module,
  isExpanded,
  onToggle,
  isEditing,
  editTitle,
  editDescription,
  onEditTitleChange,
  onEditDescriptionChange,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onDelete,
  isSaving,
}: ModuleAccordionProps) {
  const contentCount = module.contents.length;
  const hasQuiz = Boolean(module.quiz);

  return (
    <div className="rounded-md border border-border-light bg-surface-white overflow-hidden">
      {/* Module Header */}
      <div className="flex items-center justify-between px-lg py-md">
        <button
          type="button"
          onClick={onToggle}
          className="flex flex-1 items-center gap-md text-left transition-colors hover:opacity-80"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-light text-body-md font-semibold text-primary-main">
            {module.order}
          </div>
          <div>
            <h4 className="text-body-lg font-medium text-text-primary">{module.title}</h4>
            <p className="mt-[2px] text-caption text-text-secondary">
              {contentCount} content{contentCount !== 1 ? 's' : ''}
              {hasQuiz ? ' \u00B7 Quiz included' : ''}
            </p>
          </div>
        </button>
        <div className="flex items-center gap-xs">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onStartEdit(); }}
            className="rounded-sm p-xs text-text-secondary transition-colors hover:bg-surface-background hover:text-primary-main"
            aria-label="Edit module"
          >
            <Pencil className="h-4 w-4" strokeWidth={1.5} />
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="rounded-sm p-xs text-text-secondary transition-colors hover:bg-error/10 hover:text-error"
            aria-label="Delete module"
          >
            <Trash2 className="h-4 w-4" strokeWidth={1.5} />
          </button>
          {isExpanded ? (
            <ChevronDown className="h-5 w-5 text-text-secondary" strokeWidth={1.5} />
          ) : (
            <ChevronRight className="h-5 w-5 text-text-secondary" strokeWidth={1.5} />
          )}
        </div>
      </div>

      {/* Inline Edit Form */}
      {isEditing && (
        <div className="border-t border-border-light bg-surface-background px-lg py-md">
          <div className="space-y-sm">
            <Input
              label="Title"
              value={editTitle}
              onChange={(e) => onEditTitleChange(e.target.value)}
              placeholder="Module title"
            />
            <div className="flex flex-col gap-xs">
              <label className="text-body-md font-medium text-text-primary">
                Description
              </label>
              <textarea
                value={editDescription}
                onChange={(e) => onEditDescriptionChange(e.target.value)}
                placeholder="Module description"
                rows={3}
                className="w-full rounded-sm border border-border-light bg-surface-white px-md py-[10px] text-body-md text-text-primary placeholder:text-text-secondary transition-colors duration-200 focus:border-border-focus focus:outline-none focus:ring-2 focus:ring-border-focus/20"
              />
            </div>
            <div className="flex items-center gap-sm pt-xs">
              <Button
                size="sm"
                variant="primary"
                leftIcon={<Save className="h-3.5 w-3.5" />}
                onClick={onSaveEdit}
                isLoading={isSaving}
              >
                Save
              </Button>
              <Button
                size="sm"
                variant="secondary"
                leftIcon={<X className="h-3.5 w-3.5" />}
                onClick={onCancelEdit}
                disabled={isSaving}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Expanded Content */}
      {isExpanded && !isEditing && (
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

// ─── Learner Row (expandable) ─────────────────────────────

function LearnerRow({ learner }: { learner: LearnerStatData }) {
  const [expanded, setExpanded] = useState(false);

  const statusBadge = {
    completed: { label: 'Completed', bg: 'bg-green-50', text: 'text-success' },
    in_progress: { label: 'In Progress', bg: 'bg-orange-50', text: 'text-warning' },
    not_started: { label: 'Not Started', bg: 'bg-gray-100', text: 'text-text-secondary' },
  }[learner.courseStatus] ?? { label: 'Unknown', bg: 'bg-gray-100', text: 'text-text-secondary' };

  return (
    <>
      <tr className="border-b border-border-light hover:bg-surface-background transition-colors">
        <td className="py-3 px-2">
          <span className="text-body-md font-medium">{learner.user.name}</span>
        </td>
        <td className="py-3 px-2 text-body-md text-text-secondary">{learner.user.empId}</td>
        <td className="py-3 px-2 text-center">
          <span className={`inline-block px-2 py-1 rounded-full text-caption font-medium ${statusBadge.bg} ${statusBadge.text}`}>
            {statusBadge.label}
          </span>
        </td>
        <td className="py-3 px-2 text-center text-body-md">
          <span className="text-success font-medium">{learner.modulesCompleted}</span>
          <span className="text-text-secondary">/{learner.totalModules}</span>
        </td>
        <td className="py-3 px-2">
          <div className="flex items-center gap-2 justify-center">
            <div className="w-20 bg-gray-200 rounded-full h-2">
              <div
                className="bg-primary-main h-2 rounded-full"
                style={{ width: `${learner.completionPercent}%` }}
              />
            </div>
            <span className="text-caption font-medium min-w-[32px]">{learner.completionPercent}%</span>
          </div>
        </td>
        <td className="py-3 px-2 text-center text-body-md font-medium text-primary-main">
          {learner.pointsEarned}
        </td>
        <td className="py-3 px-2 text-center text-body-md">{learner.totalPoints}</td>
        <td className="py-3 px-2 text-center text-body-md">{learner.streak}</td>
        <td className="py-3 px-2 text-center">
          <button onClick={() => setExpanded(!expanded)} className="text-primary-main hover:text-primary-hover">
            {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
        </td>
      </tr>

      {expanded && (
        <tr>
          <td colSpan={9} className="bg-surface-background px-6 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {learner.moduleProgress.map((mp: ModuleProgressData) => (
                <div key={mp.moduleId} className="bg-white rounded-md p-3 border border-border-light">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-body-md font-medium">{mp.moduleTitle}</span>
                    <span className={`text-caption px-2 py-0.5 rounded-full ${
                      mp.status === 'completed' ? 'bg-green-50 text-success' :
                      mp.status === 'in_progress' ? 'bg-orange-50 text-warning' :
                      'bg-gray-100 text-text-secondary'
                    }`}>
                      {mp.status === 'completed' ? 'Done' : mp.status === 'in_progress' ? 'In Progress' : 'Not Started'}
                    </span>
                  </div>
                  <div className="space-y-1 text-caption text-text-secondary">
                    <div className="flex justify-between">
                      <span>Video</span>
                      <span className={mp.videoCompleted ? 'text-success font-medium' : ''}>
                        {mp.videoCompleted ? `${mp.videoPoints} pts` : '\u2014'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Quiz</span>
                      <span className={mp.quizPassed ? 'text-success font-medium' : ''}>
                        {mp.quizPassed ? `${mp.quizPoints} pts` : '\u2014'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Proof of Work</span>
                      <span className={mp.proofOfWorkPoints > 0 ? 'text-success font-medium' : ''}>
                        {mp.proofOfWorkPoints > 0 ? `${mp.proofOfWorkPoints} pts` : '\u2014'}
                      </span>
                    </div>
                    <div className="flex justify-between border-t border-border-light pt-1 mt-1">
                      <span className="font-medium text-text-primary">Total</span>
                      <span className="font-semibold text-primary-main">{mp.totalModulePoints} pts</span>
                    </div>
                  </div>
                  {mp.completedAt && (
                    <p className="text-caption text-text-disabled mt-2">
                      Completed {new Date(mp.completedAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
              ))}
            </div>

            {learner.badges?.length > 0 && (
              <div className="mt-3 flex items-center gap-2">
                <span className="text-caption text-text-secondary">Badges:</span>
                {learner.badges.map((b) => (
                  <span key={b.name} className="text-body-md" title={`${b.name} \u2014 earned ${new Date(b.earnedAt).toLocaleDateString()}`}>
                    {b.icon}
                  </span>
                ))}
              </div>
            )}
          </td>
        </tr>
      )}
    </>
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
  const { data: analyticsRes, isLoading: analyticsLoading } = useGetCourseAnalyticsQuery(id);
  const [deleteCourse, { isLoading: isDeleting }] = useDeleteCourseMutation();
  const [updateCourse, { isLoading: isUpdatingStatus }] = useUpdateCourseMutation();
  const [updateModule, { isLoading: isUpdatingModule }] = useUpdateModuleMutation();
  const [deleteModule, { isLoading: isDeletingModule }] = useDeleteModuleMutation();

  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());

  // Module edit state
  const [editingModuleId, setEditingModuleId] = useState<string | null>(null);
  const [editModuleTitle, setEditModuleTitle] = useState('');
  const [editModuleDescription, setEditModuleDescription] = useState('');
  const [deletingModuleId, setDeletingModuleId] = useState<string | null>(null);

  const course = courseRes?.data;
  const modules = modulesRes?.data ?? [];
  const sortedModules = [...modules].sort((a, b) => a.order - b.order);
  const analytics = analyticsRes?.data;

  // Extract coach data from populated course response
  const coach = course?.coach && typeof course.coach === 'object' ? course.coach : null;

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

  // ── Module Handlers ─────────────────────────────────────

  const handleStartModuleEdit = useCallback((mod: ModuleData) => {
    setEditingModuleId(mod._id);
    setEditModuleTitle(mod.title);
    setEditModuleDescription(mod.description || '');
  }, []);

  const handleCancelModuleEdit = useCallback(() => {
    setEditingModuleId(null);
    setEditModuleTitle('');
    setEditModuleDescription('');
  }, []);

  const handleSaveModuleEdit = useCallback(async () => {
    if (!editingModuleId || !editModuleTitle.trim()) return;
    try {
      await updateModule({
        id: editingModuleId,
        courseId: id,
        body: {
          title: editModuleTitle.trim(),
          description: editModuleDescription.trim(),
        },
      }).unwrap();
      dispatch(addToast({ type: 'success', message: 'Module updated successfully.', duration: 3000 }));
      setEditingModuleId(null);
    } catch (err) {
      dispatch(addToast({ type: 'error', message: getErrorMessage(err), duration: 4000 }));
    }
  }, [editingModuleId, editModuleTitle, editModuleDescription, updateModule, id, dispatch]);

  const handleDeleteModule = useCallback(async () => {
    if (!deletingModuleId) return;
    try {
      await deleteModule({ id: deletingModuleId, courseId: id }).unwrap();
      dispatch(closeModal());
      dispatch(addToast({ type: 'success', message: 'Module deleted successfully.', duration: 3000 }));
      setDeletingModuleId(null);
    } catch (err) {
      dispatch(addToast({ type: 'error', message: getErrorMessage(err), duration: 4000 }));
    }
  }, [deletingModuleId, deleteModule, id, dispatch]);

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
                isEditing={editingModuleId === mod._id}
                editTitle={editingModuleId === mod._id ? editModuleTitle : ''}
                editDescription={editingModuleId === mod._id ? editModuleDescription : ''}
                onEditTitleChange={setEditModuleTitle}
                onEditDescriptionChange={setEditModuleDescription}
                onStartEdit={() => handleStartModuleEdit(mod)}
                onCancelEdit={handleCancelModuleEdit}
                onSaveEdit={handleSaveModuleEdit}
                onDelete={() => {
                  setDeletingModuleId(mod._id);
                  dispatch(openModal('delete-module'));
                }}
                isSaving={isUpdatingModule}
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

      {/* Learner Analytics Section */}
      <div>
        <Card
          header={
            <div className="flex items-center gap-sm">
              <TrendingUp className="h-5 w-5 text-primary-main" strokeWidth={1.5} />
              <h3 className="text-h3 text-text-primary">Learner Analytics</h3>
            </div>
          }
        >
          {analyticsLoading ? (
            <div className="animate-pulse space-y-md">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-md">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-24 bg-gray-200 rounded-md" />
                ))}
              </div>
            </div>
          ) : analytics ? (
            <div className="space-y-lg">
              {/* Summary Stat Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-md">
                <div className="rounded-md border border-border-light p-md">
                  <div className="flex items-center gap-sm">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-light">
                      <Users size={20} className="text-primary-main" strokeWidth={1.5} />
                    </div>
                    <div>
                      <p className="text-h2 font-semibold">{analytics.courseSummary.totalLearners}</p>
                      <p className="text-caption text-text-secondary">Total Learners</p>
                    </div>
                  </div>
                </div>

                <div className="rounded-md border border-border-light p-md">
                  <div className="flex items-center gap-sm">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-50">
                      <CheckCircle size={20} className="text-success" strokeWidth={1.5} />
                    </div>
                    <div>
                      <p className="text-h2 font-semibold text-success">{analytics.courseSummary.learnersCompleted}</p>
                      <p className="text-caption text-text-secondary">Completed</p>
                    </div>
                  </div>
                </div>

                <div className="rounded-md border border-border-light p-md">
                  <div className="flex items-center gap-sm">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-50">
                      <Clock size={20} className="text-warning" strokeWidth={1.5} />
                    </div>
                    <div>
                      <p className="text-h2 font-semibold text-warning">{analytics.courseSummary.learnersInProgress}</p>
                      <p className="text-caption text-text-secondary">In Progress</p>
                    </div>
                  </div>
                </div>

                <div className="rounded-md border border-border-light p-md">
                  <div className="flex items-center gap-sm">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50">
                      <TrendingUp size={20} className="text-blue-500" strokeWidth={1.5} />
                    </div>
                    <div>
                      <p className="text-h2 font-semibold">{analytics.courseSummary.courseCompletionRate}%</p>
                      <p className="text-caption text-text-secondary">Completion Rate</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Overall Progress Bar */}
              <div>
                <h4 className="text-body-lg font-medium mb-sm">Overall Course Progress</h4>
                <div className="flex items-center gap-md mb-xs">
                  <div className="flex-1 bg-gray-200 rounded-full h-4">
                    <div
                      className="h-4 rounded-full transition-all duration-500"
                      style={{
                        width: `${analytics.courseSummary.courseCompletionRate}%`,
                        background:
                          analytics.courseSummary.courseCompletionRate === 100
                            ? '#34A853'
                            : analytics.courseSummary.courseCompletionRate > 50
                              ? '#FF7A1A'
                              : '#FABE19',
                      }}
                    />
                  </div>
                  <span className="text-body-md font-semibold min-w-[48px]">
                    {analytics.courseSummary.courseCompletionRate}%
                  </span>
                </div>
                <div className="flex justify-between text-caption text-text-secondary">
                  <span>
                    {analytics.courseSummary.learnersCompleted} of {analytics.courseSummary.totalLearners} learners completed all modules
                  </span>
                  <span>Avg {analytics.courseSummary.avgPointsPerLearner} pts/learner</span>
                </div>
              </div>

              {/* Per-Module Breakdown */}
              {analytics.perModuleStats?.length > 0 && (
                <div>
                  <h4 className="text-body-lg font-medium mb-sm">Module Breakdown</h4>
                  <div className="space-y-md">
                    {analytics.perModuleStats.map((mod: ModuleStatData, idx: number) => (
                      <div key={mod.moduleId} className="border-b border-border-light pb-md last:border-0 last:pb-0">
                        <div className="flex justify-between items-center mb-xs">
                          <div className="flex items-center gap-sm">
                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-light text-primary-main text-caption font-semibold">
                              {mod.order || idx + 1}
                            </span>
                            <span className="text-body-md font-medium">{mod.title}</span>
                          </div>
                          <span className="text-body-md font-semibold">{mod.completionRate}%</span>
                        </div>
                        <div className="flex-1 bg-gray-200 rounded-full h-2 mb-xs">
                          <div
                            className="bg-primary-main h-2 rounded-full transition-all"
                            style={{ width: `${mod.completionRate}%` }}
                          />
                        </div>
                        <div className="flex gap-md text-caption text-text-secondary">
                          <span className="text-success">{mod.completed} completed</span>
                          <span className="text-warning">{mod.inProgress} in progress</span>
                          <span>{mod.notStarted} not started</span>
                          <span className="ml-auto">Avg {mod.avgPoints} pts</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Per-Learner Table */}
              <div>
                <h4 className="text-body-lg font-medium mb-sm">Learner Progress Details</h4>
                {analytics.perLearnerStats?.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border-light">
                          <th className="text-left text-caption uppercase text-text-secondary py-3 px-2">Learner</th>
                          <th className="text-left text-caption uppercase text-text-secondary py-3 px-2">Emp ID</th>
                          <th className="text-center text-caption uppercase text-text-secondary py-3 px-2">Status</th>
                          <th className="text-center text-caption uppercase text-text-secondary py-3 px-2">Modules</th>
                          <th className="text-center text-caption uppercase text-text-secondary py-3 px-2">Progress</th>
                          <th className="text-center text-caption uppercase text-text-secondary py-3 px-2">Course Pts</th>
                          <th className="text-center text-caption uppercase text-text-secondary py-3 px-2">Total Pts</th>
                          <th className="text-center text-caption uppercase text-text-secondary py-3 px-2">Streak</th>
                          <th className="text-center text-caption uppercase text-text-secondary py-3 px-2">Details</th>
                        </tr>
                      </thead>
                      <tbody>
                        {analytics.perLearnerStats.map((learner: LearnerStatData) => (
                          <LearnerRow key={learner.user._id} learner={learner} />
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-text-secondary text-body-md py-md text-center">No learners assigned yet</p>
                )}
              </div>
            </div>
          ) : (
            <p className="text-text-secondary text-body-md">No analytics data available</p>
          )}
        </Card>
      </div>

      {/* Delete Course Confirm Dialog */}
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

      {/* Delete Module Confirm Dialog */}
      <ConfirmDialog
        modalId="delete-module"
        title="Delete Module"
        message={`Are you sure you want to delete this module? Associated quiz and progress records will also be deleted.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        isLoading={isDeletingModule}
        onConfirm={handleDeleteModule}
      />
    </div>
  );
}
