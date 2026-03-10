'use client';

import { useState, useMemo, useCallback } from 'react';
import ImageModal from '@/components/ui/ImageModal';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowLeft,
  BookOpen,
  Users,
  Layers,
  ChevronDown,
  ChevronUp,
  Video,
  FileText,
  Clock,
  CheckCircle2,
  Circle,
  Timer,
  Star,
} from 'lucide-react';
import { Card, Badge, Button } from '@/components/ui';
import { useAppDispatch } from '@/store/hooks';
import { addToast } from '@/store/slices/uiSlice';
import {
  useGetCourseByIdQuery,
  useGetCourseModulesQuery,
  useGetCourseAnalyticsQuery,
  type ModuleData,
  type LearnerStatData,
} from '@/store/slices/api/courseApi';
import {
  useGetProofsQuery,
  useReviewProofMutation,
  type ProofOfWorkData,
} from '@/store/slices/api/proofOfWorkApi';
import type { CourseStatus, ProofOfWorkStatus, LearnerProgressStatus } from '@/types';

// ─── Helpers ──────────────────────────────────────────────

const statusVariantMap: Record<CourseStatus, 'default' | 'success' | 'warning'> = {
  draft: 'default',
  active: 'success',
  archived: 'warning',
};

const powStatusVariantMap: Record<ProofOfWorkStatus, 'warning' | 'success' | 'error'> = {
  submitted: 'warning',
  approved: 'success',
  redo_requested: 'error',
};

const powStatusLabels: Record<ProofOfWorkStatus, string> = {
  submitted: 'Pending',
  approved: 'Approved',
  redo_requested: 'Redo Requested',
};

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins < 60) return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
  const hrs = Math.floor(mins / 60);
  const remainMins = mins % 60;
  return remainMins > 0 ? `${hrs}h ${remainMins}m` : `${hrs}h`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
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

function progressStatusIcon(status: LearnerProgressStatus) {
  switch (status) {
    case 'completed':
      return <CheckCircle2 className="h-4 w-4 text-success" strokeWidth={1.5} />;
    case 'in_progress':
      return <Timer className="h-4 w-4 text-warning" strokeWidth={1.5} />;
    default:
      return <Circle className="h-4 w-4 text-text-disabled" strokeWidth={1.5} />;
  }
}

function progressStatusLabel(status: LearnerProgressStatus): string {
  switch (status) {
    case 'completed':
      return 'Completed';
    case 'in_progress':
      return 'In Progress';
    default:
      return 'Not Started';
  }
}

/** Extract user info from a possibly-populated Mongoose ref field */
function extractUserInfo(field: unknown): { id: string; name?: string; empId?: string } {
  if (typeof field === 'object' && field !== null && '_id' in field) {
    const obj = field as { _id: string; name?: string; empId?: string };
    return { id: String(obj._id), name: obj.name, empId: obj.empId };
  }
  return { id: String(field) };
}

// ─── Skeleton Blocks ──────────────────────────────────────

function SkeletonHeader() {
  return (
    <div className="animate-pulse space-y-md">
      <div className="h-[200px] w-full rounded-md bg-border-light" />
      <div className="h-6 w-3/4 rounded-sm bg-border-light" />
      <div className="h-4 w-full rounded-sm bg-border-light" />
      <div className="flex gap-sm">
        <div className="h-6 w-16 rounded-full bg-border-light" />
        <div className="h-6 w-16 rounded-full bg-border-light" />
      </div>
      <div className="flex gap-lg">
        <div className="h-4 w-24 rounded-sm bg-border-light" />
        <div className="h-4 w-24 rounded-sm bg-border-light" />
      </div>
    </div>
  );
}

function SkeletonList() {
  return (
    <div className="animate-pulse space-y-sm">
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-14 w-full rounded-md bg-border-light" />
      ))}
    </div>
  );
}

// ─── Module Accordion ─────────────────────────────────────

interface ModuleAccordionItemProps {
  module: ModuleData;
  isExpanded: boolean;
  onToggle: () => void;
}

function ModuleAccordionItem({ module, isExpanded, onToggle }: ModuleAccordionItemProps) {
  const contentCount = module.contents.length;
  const moduleMaxPts = 30 + (module.quiz ? 30 : 0);

  return (
    <div className="rounded-md border border-border-light bg-surface-white overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between px-md py-md min-h-[52px] transition-colors active:bg-surface-background"
      >
        <div className="flex items-center gap-md min-w-0">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary-light text-body-md font-semibold text-primary-main">
            {module.order}
          </div>
          <div className="min-w-0 text-left">
            <h4 className="text-body-md font-semibold text-text-primary truncate">
              {module.title}
            </h4>
            <p className="text-caption text-text-secondary">
              {contentCount} content{contentCount !== 1 ? 's' : ''}
              {module.quiz ? ' \u00B7 Quiz' : ''}
              {' \u00B7 '}
              <span className="text-warning font-medium">{moduleMaxPts} pts</span>
            </p>
          </div>
        </div>
        {isExpanded ? (
          <ChevronUp className="h-5 w-5 flex-shrink-0 text-text-secondary" strokeWidth={1.5} />
        ) : (
          <ChevronDown className="h-5 w-5 flex-shrink-0 text-text-secondary" strokeWidth={1.5} />
        )}
      </button>

      {isExpanded && (
        <div className="border-t border-border-light px-md py-md space-y-sm">
          {module.description && (
            <p className="text-body-md text-text-secondary mb-sm">{module.description}</p>
          )}
          {module.contents.length > 0 ? (
            module.contents.map((content, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between rounded-sm bg-surface-background px-md py-sm"
              >
                <div className="flex items-center gap-sm min-w-0">
                  {contentTypeIcon(content.type)}
                  <span className="text-body-md text-text-primary truncate">{content.title}</span>
                </div>
                {content.duration > 0 && (
                  <div className="flex items-center gap-xs text-caption text-text-secondary flex-shrink-0 ml-sm">
                    <Clock className="h-3.5 w-3.5" strokeWidth={1.5} />
                    {formatDuration(content.duration)}
                  </div>
                )}
              </div>
            ))
          ) : (
            <p className="text-body-md text-text-secondary italic">No content added yet.</p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Staff Progress Row ───────────────────────────────────

interface StaffProgressRowProps {
  stat: LearnerStatData;
}

function StaffProgressRow({ stat }: StaffProgressRowProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-md border border-border-light bg-surface-white overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className="flex w-full flex-col gap-sm px-md py-md min-h-[52px] transition-colors active:bg-surface-background"
      >
        {/* Name + EmpId */}
        <div className="flex items-center justify-between w-full">
          <div className="min-w-0">
            <p className="text-body-md font-semibold text-text-primary text-left truncate">
              {stat.user.name}
            </p>
            <p className="text-caption text-text-secondary text-left">{stat.user.empId}</p>
          </div>
          <div className="flex items-center gap-sm flex-shrink-0">
            <div className="flex items-center gap-xs text-caption text-text-secondary">
              <Star className="h-3.5 w-3.5 text-warning" strokeWidth={1.5} />
              {stat.pointsEarned} pts
            </div>
            {expanded ? (
              <ChevronUp className="h-4 w-4 text-text-secondary" strokeWidth={1.5} />
            ) : (
              <ChevronDown className="h-4 w-4 text-text-secondary" strokeWidth={1.5} />
            )}
          </div>
        </div>

        {/* Progress bar */}
        <div className="flex items-center gap-sm w-full">
          <div className="flex-1 h-2 rounded-full bg-surface-background overflow-hidden">
            <div
              className="h-full rounded-full bg-primary-main transition-all duration-500"
              style={{ width: `${stat.completionPercent}%` }}
            />
          </div>
          <span className="text-caption font-semibold text-text-primary flex-shrink-0 w-[36px] text-right">
            {stat.completionPercent}%
          </span>
        </div>
      </button>

      {/* Expanded: per-module status */}
      {expanded && (
        <div className="border-t border-border-light px-md py-md space-y-sm">
          {stat.moduleProgress.map((mp) => {
            const modStatus = mp.status as LearnerProgressStatus;
            return (
              <div
                key={mp.moduleId}
                className="flex items-center justify-between rounded-sm bg-surface-background px-md py-sm"
              >
                <div className="flex items-center gap-sm min-w-0">
                  <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary-light text-caption font-semibold text-primary-main">
                    {mp.moduleOrder}
                  </div>
                  <span className="text-body-md text-text-primary truncate">{mp.moduleTitle}</span>
                </div>
                <div className="flex items-center gap-xs flex-shrink-0 ml-sm">
                  {progressStatusIcon(modStatus)}
                  <span className="text-caption text-text-secondary">
                    {progressStatusLabel(modStatus)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Proof of Work Card ───────────────────────────────────

type PowFilterStatus = 'all' | ProofOfWorkStatus;

interface ProofCardProps {
  proof: ProofOfWorkData;
  userMap: Map<string, { name: string; empId: string }>;
}

function ProofCard({ proof, userMap }: ProofCardProps) {
  const dispatch = useAppDispatch();
  const [reviewProof, { isLoading: isReviewing }] = useReviewProofMutation();
  const [activeAction, setActiveAction] = useState<'approve' | 'redo' | null>(null);
  const [reviewNote, setReviewNote] = useState('');
  const [showImage, setShowImage] = useState(false);

  // proof.user can be a populated object or a plain string ID
  const userInfo = extractUserInfo(proof.user);
  const staffUser = userMap.get(userInfo.id);
  const staffName = userInfo.name ?? staffUser?.name ?? 'Unknown';

  const handleReview = useCallback(
    async (status: 'approved' | 'redo_requested') => {
      try {
        await reviewProof({
          id: proof._id,
          body: {
            status,
            reviewNote: reviewNote.trim() || undefined,
          },
        }).unwrap();
        dispatch(
          addToast({
            type: 'success',
            message: status === 'approved' ? 'Proof approved successfully' : 'Redo requested',
            duration: 3000,
          })
        );
        setActiveAction(null);
        setReviewNote('');
      } catch {
        dispatch(
          addToast({
            type: 'error',
            message: 'Failed to review proof of work',
            duration: 4000,
          })
        );
      }
    },
    [reviewProof, proof._id, reviewNote, dispatch]
  );

  const handleCancel = useCallback(() => {
    setActiveAction(null);
    setReviewNote('');
  }, []);

  return (
    <Card className="space-y-sm">
      {/* Staff info + date */}
      <div className="flex items-center justify-between">
        <div className="min-w-0">
          <p className="text-body-md font-semibold text-text-primary truncate">{staffName}</p>
          <p className="text-caption text-text-secondary">
            Submitted {formatDate(proof.submittedAt)}
          </p>
        </div>
        <Badge variant={powStatusVariantMap[proof.status]}>
          {powStatusLabels[proof.status]}
        </Badge>
      </div>

      {/* File preview — click opens modal */}
      {proof.fileUrl && (
        <button
          type="button"
          onClick={() => setShowImage(true)}
          className="inline-flex items-center gap-sm text-body-md font-medium text-primary-main min-h-[44px] hover:opacity-80 transition-opacity"
        >
          {proof.fileUrl.match(/\.(jpg|jpeg|png|webp)/i) ? (
            <Image
              src={proof.fileUrl}
              alt="Proof"
              width={56}
              height={56}
              className="w-14 h-14 object-cover rounded-sm border border-border-light"
              unoptimized
            />
          ) : (
            <div className="w-14 h-14 bg-surface-background rounded-sm border border-border-light flex items-center justify-center">
              <span className="text-caption text-text-secondary">PDF</span>
            </div>
          )}
          <span>View Submission</span>
        </button>
      )}

      <ImageModal
        isOpen={showImage}
        onClose={() => setShowImage(false)}
        imageUrl={proof.fileUrl}
        fileName={proof.fileType ? `proof.${proof.fileType}` : undefined}
      />

      {/* Review note if already reviewed */}
      {proof.reviewNote && proof.status !== 'submitted' && (
        <div className="rounded-sm bg-surface-background px-md py-sm">
          <p className="text-caption font-medium text-text-secondary">Review Note</p>
          <p className="text-body-md text-text-primary mt-xs">{proof.reviewNote}</p>
        </div>
      )}

      {/* Action buttons for pending proofs */}
      {proof.status === 'submitted' && !activeAction && (
        <div className="flex gap-sm pt-xs">
          <Button
            variant="primary"
            size="md"
            className="flex-1 min-h-[44px] !bg-success hover:!brightness-90"
            onClick={() => setActiveAction('approve')}
          >
            Approve
          </Button>
          <Button
            variant="danger"
            size="md"
            className="flex-1 min-h-[44px]"
            onClick={() => setActiveAction('redo')}
          >
            Request Redo
          </Button>
        </div>
      )}

      {/* Review note textarea + confirm */}
      {proof.status === 'submitted' && activeAction && (
        <div className="space-y-sm pt-xs">
          <textarea
            value={reviewNote}
            onChange={(e) => setReviewNote(e.target.value)}
            placeholder={
              activeAction === 'approve'
                ? 'Add a note (optional)...'
                : 'Explain what needs to be redone...'
            }
            rows={3}
            className="w-full rounded-sm border border-border-light bg-surface-white px-md py-sm text-body-md text-text-primary placeholder:text-text-secondary focus:border-border-focus focus:outline-none focus:ring-2 focus:ring-border-focus/20 resize-none"
          />
          <div className="flex gap-sm">
            <Button
              variant={activeAction === 'approve' ? 'primary' : 'danger'}
              size="md"
              className={`flex-1 min-h-[44px] ${activeAction === 'approve' ? '!bg-success hover:!brightness-90' : ''}`}
              isLoading={isReviewing}
              onClick={() =>
                handleReview(activeAction === 'approve' ? 'approved' : 'redo_requested')
              }
            >
              {activeAction === 'approve' ? 'Confirm Approve' : 'Confirm Redo Request'}
            </Button>
            <Button
              variant="ghost"
              size="md"
              className="min-h-[44px]"
              onClick={handleCancel}
              disabled={isReviewing}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}

// ─── Main Page ────────────────────────────────────────────

export default function CoachCourseDetail() {
  const params = useParams();
  const id = params.id as string;

  // ── Data Fetching ──
  const { data: courseRes, isLoading: courseLoading, error: courseError } = useGetCourseByIdQuery(id);
  const { data: modulesRes, isLoading: modulesLoading } = useGetCourseModulesQuery(id);
  const { data: analyticsRes, isLoading: analyticsLoading } = useGetCourseAnalyticsQuery(id, {
    skip: !id,
  });
  const { data: proofsRes, isLoading: proofsLoading } = useGetProofsQuery(
    { course: id, limit: 100 },
    { skip: !id }
  );

  // ── Local State ──
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<'progress' | 'proofs'>('progress');
  const [powFilter, setPowFilter] = useState<PowFilterStatus>('all');

  // ── Derived Data ──
  const course = courseRes?.data;
  const modules = useMemo(
    () => [...(modulesRes?.data ?? [])].sort((a, b) => a.order - b.order),
    [modulesRes?.data]
  );
  // Calculate max obtainable points for this course
  const courseMaxPoints = useMemo(() => {
    const modulePts = modules.reduce((sum, mod) => sum + 30 + (mod.quiz ? 30 : 0), 0);
    return modulePts + (course?.proofOfWorkEnabled ? 30 : 0);
  }, [modules, course?.proofOfWorkEnabled]);

  const analytics = analyticsRes?.data ?? null;
  const perLearnerStats = useMemo(() => analytics?.perLearnerStats ?? [], [analytics?.perLearnerStats]);
  const proofs = useMemo(() => proofsRes?.data ?? [], [proofsRes?.data]);

  // User lookup map from analytics data (for PoW tab)
  const userMap = useMemo(() => {
    const map = new Map<string, { name: string; empId: string }>();
    for (const stat of perLearnerStats) {
      map.set(stat.user._id, { name: stat.user.name, empId: stat.user.empId });
    }
    return map;
  }, [perLearnerStats]);

  // Filter proofs
  const filteredProofs = useMemo(() => {
    if (powFilter === 'all') return proofs;
    return proofs.filter((p) => p.status === powFilter);
  }, [proofs, powFilter]);

  // ── Handlers ──
  const toggleModule = useCallback((moduleId: string) => {
    setExpandedModules((prev) => {
      const next = new Set(prev);
      if (next.has(moduleId)) {
        next.delete(moduleId);
      } else {
        next.add(moduleId);
      }
      return next;
    });
  }, []);

  // ── Loading State ──
  if (courseLoading) {
    return (
      <div className="space-y-lg">
        <Link
          href="/coach/courses"
          className="inline-flex items-center gap-xs text-body-md font-medium text-primary-main min-h-[44px]"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={1.5} />
          Back to Courses
        </Link>
        <SkeletonHeader />
        <SkeletonList />
      </div>
    );
  }

  // ── Error State ──
  if (courseError || !course) {
    return (
      <div className="flex flex-col items-center justify-center gap-md py-2xl">
        <p className="text-body-lg text-error">
          {courseError ? 'Failed to load course details.' : 'Course not found.'}
        </p>
        <Link href="/coach/courses">
          <Button
            variant="secondary"
            leftIcon={<ArrowLeft className="h-4 w-4" strokeWidth={1.5} />}
            className="min-h-[44px]"
          >
            Back to Courses
          </Button>
        </Link>
      </div>
    );
  }

  // ── POW filter chips ──
  const powFilterOptions: { value: PowFilterStatus; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'submitted', label: 'Pending' },
    { value: 'approved', label: 'Approved' },
    { value: 'redo_requested', label: 'Redo Requested' },
  ];

  return (
    <div className="space-y-xl">
      {/* ── Back Button ── */}
      <Link
        href="/coach/courses"
        className="inline-flex items-center gap-xs text-body-md font-medium text-primary-main min-h-[44px]"
      >
        <ArrowLeft className="h-4 w-4" strokeWidth={1.5} />
        Back to Courses
      </Link>

      {/* ── Section 1: Course Info Header ── */}
      <section>
        {/* Thumbnail */}
        <div className="relative h-[200px] w-full rounded-md overflow-hidden bg-surface-background">
          {course.thumbnail ? (
            <Image
              src={course.thumbnail}
              alt={course.title}
              fill
              unoptimized
              className="object-cover"
              sizes="100vw"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-primary-light">
              <BookOpen className="h-16 w-16 text-primary-main opacity-50" strokeWidth={1.5} />
            </div>
          )}
        </div>

        {/* Title + Description */}
        <h2 className="mt-md text-h2 text-text-primary">{course.title}</h2>
        {course.description && (
          <p className="mt-sm text-body-md text-text-secondary">{course.description}</p>
        )}

        {/* Badges */}
        <div className="mt-md flex flex-wrap items-center gap-sm">
          <Badge variant="info">{course.domain}</Badge>
          <Badge variant={statusVariantMap[course.status]}>
            {course.status.charAt(0).toUpperCase() + course.status.slice(1)}
          </Badge>
        </div>

        {/* Stats */}
        <div className="mt-md flex items-center gap-md text-body-md text-text-secondary">
          <span className="flex items-center gap-xs">
            <Layers className="h-4 w-4 flex-shrink-0" strokeWidth={1.5} />
            {modules.length} Module{modules.length !== 1 ? 's' : ''}
          </span>
          <span className="text-text-disabled">&bull;</span>
          <span className="flex items-center gap-xs">
            <Users className="h-4 w-4 flex-shrink-0" strokeWidth={1.5} />
            {course.assignedStaff.length} Enrolled
          </span>
          <span className="text-text-disabled">&bull;</span>
          <span className="flex items-center gap-xs">
            <Star className="h-4 w-4 flex-shrink-0 text-warning" strokeWidth={1.5} />
            {courseMaxPoints} Max Points
          </span>
        </div>
      </section>

      {/* ── Section 2: Modules Accordion ── */}
      <section>
        <h3 className="text-h3 font-semibold text-text-primary">
          Modules ({modules.length})
        </h3>

        {modulesLoading ? (
          <div className="mt-md">
            <SkeletonList />
          </div>
        ) : modules.length > 0 ? (
          <div className="mt-md space-y-sm">
            {modules.map((mod) => (
              <ModuleAccordionItem
                key={mod._id}
                module={mod}
                isExpanded={expandedModules.has(mod._id)}
                onToggle={() => toggleModule(mod._id)}
              />
            ))}
          </div>
        ) : (
          <div className="mt-md flex flex-col items-center rounded-md bg-surface-white py-xl px-lg text-center shadow-sm">
            <Layers className="h-10 w-10 text-text-disabled" strokeWidth={1.5} />
            <p className="mt-sm text-body-md text-text-secondary">
              No modules added to this course yet.
            </p>
          </div>
        )}
      </section>

      {/* ── Section 3 & 4: Enrolled Staff (Tabs) ── */}
      <section>
        <h3 className="text-h3 font-semibold text-text-primary">Enrolled Staff</h3>

        {/* Tab Bar */}
        <div className="mt-md flex border-b border-border-light">
          <button
            type="button"
            onClick={() => setActiveTab('progress')}
            className={`min-h-[44px] flex-1 pb-sm text-body-md font-semibold text-center transition-colors ${
              activeTab === 'progress'
                ? 'text-primary-main border-b-2 border-primary-main'
                : 'text-text-secondary'
            }`}
          >
            Progress
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('proofs')}
            className={`min-h-[44px] flex-1 pb-sm text-body-md font-semibold text-center transition-colors ${
              activeTab === 'proofs'
                ? 'text-primary-main border-b-2 border-primary-main'
                : 'text-text-secondary'
            }`}
          >
            Proof of Work
          </button>
        </div>

        {/* ── Progress Tab ── */}
        {activeTab === 'progress' && (
          <div className="mt-md">
            {analyticsLoading ? (
              <SkeletonList />
            ) : perLearnerStats.length > 0 ? (
              <div className="space-y-sm">
                {perLearnerStats.map((stat) => (
                  <StaffProgressRow
                    key={stat.user._id}
                    stat={stat}
                  />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center rounded-md bg-surface-white py-xl px-lg text-center shadow-sm">
                <Users className="h-10 w-10 text-text-disabled" strokeWidth={1.5} />
                <p className="mt-sm text-body-md text-text-secondary">
                  No staff enrolled in this course yet.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ── Proof of Work Tab ── */}
        {activeTab === 'proofs' && (
          <div className="mt-md">
            {!course.proofOfWorkEnabled ? (
              <div className="flex flex-col items-center rounded-md bg-surface-white py-xl px-lg text-center shadow-sm">
                <FileText className="h-10 w-10 text-text-disabled" strokeWidth={1.5} />
                <p className="mt-sm text-body-md text-text-secondary">
                  Proof of work is not enabled for this course.
                </p>
              </div>
            ) : (
              <>
                {/* Filter Chips */}
                <div className="flex flex-wrap gap-sm mb-md">
                  {powFilterOptions.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setPowFilter(opt.value)}
                      className={`min-h-[36px] rounded-full px-md py-xs text-body-md font-medium transition-colors ${
                        powFilter === opt.value
                          ? 'bg-primary-main text-white'
                          : 'bg-surface-background text-text-secondary active:bg-border-light'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                {/* Proof Cards */}
                {proofsLoading ? (
                  <SkeletonList />
                ) : filteredProofs.length > 0 ? (
                  <div className="space-y-md">
                    {filteredProofs.map((proof) => (
                      <ProofCard key={proof._id} proof={proof} userMap={userMap} />
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center rounded-md bg-surface-white py-xl px-lg text-center shadow-sm">
                    <FileText className="h-10 w-10 text-text-disabled" strokeWidth={1.5} />
                    <p className="mt-sm text-body-md text-text-secondary">
                      {powFilter === 'all'
                        ? 'No proof of work submissions yet.'
                        : `No ${powFilterOptions.find((o) => o.value === powFilter)?.label.toLowerCase()} submissions.`}
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
