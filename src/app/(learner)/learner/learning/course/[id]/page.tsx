'use client';

import { useState, useMemo, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Timer,
  Circle,
  Star,
  Award,
  Upload,
  FileText,
  AlertCircle,
  PartyPopper,
} from 'lucide-react';
import { Card, Badge, Button, FileUpload } from '@/components/ui';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { addToast } from '@/store/slices/uiSlice';
import {
  useGetCourseByIdQuery,
  useGetCourseModulesQuery,
  type CourseData,
  type ModuleData,
} from '@/store/slices/api/courseApi';
import { useGetProgressQuery, type ProgressData } from '@/store/slices/api/progressApi';
import {
  useGetProofsQuery,
  useUploadProofMutation,
  type ProofOfWorkData,
} from '@/store/slices/api/proofOfWorkApi';
import { useGetUserGamificationQuery } from '@/store/slices/api/gamificationApi';

// ─── Constants ──────────────────────────────────────────────

const BADGE_TIERS = [
  { name: 'Rookie', threshold: 1000 },
  { name: 'Silver', threshold: 2000 },
  { name: 'Gold', threshold: 3000 },
  { name: 'Premium', threshold: 5000 },
] as const;

const MAX_FILE_SIZE_MB = 2;
const ACCEPTED_FILE_TYPES = 'image/*,application/pdf';

// ─── Helpers ────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ─── Skeleton Components ────────────────────────────────────

function HeaderSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-[220px] w-full rounded-md bg-border-light" />
      <div className="mt-lg space-y-md">
        <div className="h-7 w-3/4 rounded-sm bg-border-light" />
        <div className="h-4 w-full rounded-sm bg-border-light" />
        <div className="h-4 w-2/3 rounded-sm bg-border-light" />
        <div className="flex gap-sm">
          <div className="h-6 w-16 rounded-full bg-border-light" />
          <div className="h-6 w-16 rounded-full bg-border-light" />
        </div>
        <div className="h-4 w-1/3 rounded-sm bg-border-light" />
      </div>
    </div>
  );
}

function ModulesListSkeleton() {
  return (
    <div className="animate-pulse space-y-sm">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-center gap-md p-md rounded-md bg-surface-white">
          <div className="h-8 w-8 rounded-full bg-border-light flex-shrink-0" />
          <div className="flex-1 space-y-xs">
            <div className="h-4 w-3/4 rounded-sm bg-border-light" />
            <div className="h-3 w-1/3 rounded-sm bg-border-light" />
          </div>
          <div className="h-5 w-5 rounded-full bg-border-light flex-shrink-0" />
        </div>
      ))}
    </div>
  );
}

function ProofSkeleton() {
  return (
    <div className="animate-pulse space-y-md">
      <div className="h-5 w-32 rounded-sm bg-border-light" />
      <div className="h-4 w-full rounded-sm bg-border-light" />
      <div className="h-[120px] w-full rounded-md bg-border-light" />
    </div>
  );
}

// ─── Points Progress Bar ────────────────────────────────────

interface PointsBarProps {
  earned: number;
  max: number;
}

function PointsProgressBar({ earned, max }: PointsBarProps) {
  const percent = max > 0 ? Math.min(100, Math.round((earned / max) * 100)) : 0;

  return (
    <div className="rounded-md bg-surface-white p-md shadow-sm">
      <div className="flex items-center justify-between text-body-md">
        <span className="text-text-secondary">Course Points</span>
        <span className="font-semibold text-text-primary">
          <span className="text-primary-main">{earned}</span> / {max}
        </span>
      </div>
      <div className="mt-sm h-3 w-full overflow-hidden rounded-full bg-surface-background">
        <div
          className="h-full rounded-full bg-gradient-to-r from-amber-400 to-primary-main transition-all duration-700"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

// ─── Module Status Icon ─────────────────────────────────────

function ModuleStatusIcon({ status }: { status: string }) {
  switch (status) {
    case 'completed':
      return <CheckCircle2 className="h-5 w-5 text-success" />;
    case 'in_progress':
      return <Timer className="h-5 w-5 text-amber-500" />;
    default:
      return <Circle className="h-5 w-5 text-text-disabled" />;
  }
}

// ─── Module List Row ────────────────────────────────────────

interface ModuleRowProps {
  module: ModuleData;
  progress: ProgressData | undefined;
  isActive: boolean;
}

function ModuleRow({ module, progress, isActive }: ModuleRowProps) {
  const router = useRouter();
  const status = progress?.status ?? 'not_started';
  const points = progress?.totalModulePoints ?? 0;

  const handleClick = useCallback(() => {
    router.push(`/learner/learning/module/${module._id}`);
  }, [router, module._id]);

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`
        flex w-full items-center gap-md rounded-md p-md text-left
        transition-colors duration-200 hover:bg-surface-background
        ${isActive ? 'border-l-[3px] border-primary-main bg-primary-light/50' : 'bg-surface-white'}
      `}
    >
      {/* Order number */}
      <div
        className={`
          flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-body-md font-semibold
          ${
            status === 'completed'
              ? 'bg-success/10 text-success'
              : status === 'in_progress'
                ? 'bg-amber-50 text-amber-600'
                : 'bg-surface-background text-text-secondary'
          }
        `}
      >
        {module.order}
      </div>

      {/* Title + points */}
      <div className="flex-1 min-w-0">
        <p className="text-body-lg font-medium text-text-primary line-clamp-1">
          {module.title}
        </p>
        {points > 0 && (
          <p className="mt-[2px] text-caption text-text-secondary flex items-center gap-xs">
            <Star className="h-3 w-3 text-amber-400 fill-amber-400" />
            {points} pts earned
          </p>
        )}
      </div>

      {/* Status icon */}
      <div className="flex-shrink-0">
        <ModuleStatusIcon status={status} />
      </div>
    </button>
  );
}

// ─── Proof of Work Section ──────────────────────────────────

interface ProofOfWorkSectionProps {
  course: CourseData;
  proof: ProofOfWorkData | null;
  userId: string;
}

function ProofOfWorkSection({ course, proof, userId }: ProofOfWorkSectionProps) {
  const dispatch = useAppDispatch();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProof, { isLoading: isUploading }] = useUploadProofMutation();

  const handleFileSelect = useCallback((file: File) => {
    setSelectedFile(file);
  }, []);

  const handleRemoveFile = useCallback(() => {
    setSelectedFile(null);
  }, []);

  const handleUpload = useCallback(async () => {
    if (!selectedFile) return;

    // Validate file size
    if (selectedFile.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      dispatch(
        addToast({
          type: 'error',
          message: `File size must be under ${MAX_FILE_SIZE_MB}MB`,
          duration: 4000,
        })
      );
      return;
    }

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('course', course._id);
    formData.append('user', userId);

    try {
      await uploadProof(formData).unwrap();
      dispatch(
        addToast({
          type: 'success',
          message: 'Proof of work uploaded successfully!',
          duration: 3000,
        })
      );
      setSelectedFile(null);
    } catch {
      dispatch(
        addToast({
          type: 'error',
          message: 'Failed to upload proof of work. Please try again.',
          duration: 4000,
        })
      );
    }
  }, [selectedFile, course._id, userId, uploadProof, dispatch]);

  // ── If already submitted ──
  if (proof) {
    return (
      <Card className="overflow-hidden">
        <h3 className="text-h3 font-semibold text-text-primary flex items-center gap-sm">
          <FileText className="h-5 w-5 text-primary-main" />
          Proof of Work
        </h3>

        <div className="mt-md">
          {/* Status badge */}
          {proof.status === 'submitted' && (
            <div className="flex items-start gap-sm rounded-md bg-warning/10 p-md">
              <AlertCircle className="h-5 w-5 text-warning flex-shrink-0 mt-[2px]" />
              <div>
                <Badge variant="warning">Under Review</Badge>
                <p className="mt-xs text-body-md text-text-secondary">
                  Your submission is being reviewed by the coach.
                </p>
              </div>
            </div>
          )}

          {proof.status === 'approved' && (
            <div className="flex items-start gap-sm rounded-md bg-success/10 p-md">
              <CheckCircle2 className="h-5 w-5 text-success flex-shrink-0 mt-[2px]" />
              <div>
                <Badge variant="success">Approved</Badge>
                <p className="mt-xs text-body-md text-text-secondary flex items-center gap-xs">
                  <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
                  30 points earned
                </p>
              </div>
            </div>
          )}

          {proof.status === 'redo_requested' && (
            <div className="flex items-start gap-sm rounded-md bg-error/10 p-md">
              <AlertCircle className="h-5 w-5 text-error flex-shrink-0 mt-[2px]" />
              <div>
                <Badge variant="error">Redo Requested</Badge>
                {proof.reviewNote && (
                  <p className="mt-xs text-body-md text-text-secondary">
                    Coach note: {proof.reviewNote}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* File info */}
          <div className="mt-md flex items-center gap-sm rounded-md bg-surface-background p-md">
            <FileText className="h-5 w-5 text-text-secondary flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-body-md text-text-primary truncate">
                {proof.fileType || 'Uploaded file'}
              </p>
              <p className="text-caption text-text-secondary">
                {formatFileSize(proof.fileSize)} &mdash; {formatDate(proof.submittedAt)}
              </p>
            </div>
          </div>

          {/* Re-upload option for redo_requested */}
          {proof.status === 'redo_requested' && (
            <div className="mt-md">
              <p className="text-body-md font-medium text-text-primary mb-sm">
                Re-upload your proof of work
              </p>
              <FileUpload
                accept={ACCEPTED_FILE_TYPES}
                maxSizeMB={MAX_FILE_SIZE_MB}
                onFileSelect={handleFileSelect}
                onRemove={handleRemoveFile}
                fileName={selectedFile?.name}
              />
              {selectedFile && (
                <Button
                  variant="primary"
                  size="lg"
                  isBlock
                  isLoading={isUploading}
                  leftIcon={<Upload className="h-4 w-4" />}
                  onClick={handleUpload}
                  className="mt-md min-h-[44px]"
                >
                  Re-upload
                </Button>
              )}
            </div>
          )}
        </div>
      </Card>
    );
  }

  // ── Upload form (no submission yet) ──
  return (
    <Card className="overflow-hidden">
      <h3 className="text-h3 font-semibold text-text-primary flex items-center gap-sm">
        <FileText className="h-5 w-5 text-primary-main" />
        Proof of Work
      </h3>

      {course.proofOfWorkInstructions && (
        <p className="mt-sm text-body-md text-text-secondary">
          {course.proofOfWorkInstructions}
        </p>
      )}

      <div className="mt-md">
        <FileUpload
          accept={ACCEPTED_FILE_TYPES}
          maxSizeMB={MAX_FILE_SIZE_MB}
          onFileSelect={handleFileSelect}
          onRemove={handleRemoveFile}
          fileName={selectedFile?.name}
        />
      </div>

      {selectedFile && (
        <Button
          variant="primary"
          size="lg"
          isBlock
          isLoading={isUploading}
          leftIcon={<Upload className="h-4 w-4" />}
          onClick={handleUpload}
          className="mt-md min-h-[44px]"
        >
          Upload Proof of Work
        </Button>
      )}
    </Card>
  );
}

// ─── Course Completion Card ─────────────────────────────────

interface CompletionCardProps {
  totalPoints: number;
  gamificationPoints: number;
}

function CompletionCard({ totalPoints, gamificationPoints }: CompletionCardProps) {
  // Find next badge tier
  const nextBadge = useMemo(() => {
    for (const tier of BADGE_TIERS) {
      if (gamificationPoints < tier.threshold) return tier;
    }
    return null;
  }, [gamificationPoints]);

  const badgeProgress = useMemo(() => {
    if (!nextBadge) return 100;
    const tierIndex = BADGE_TIERS.findIndex((t) => t.name === nextBadge.name);
    const prevTier = tierIndex > 0 ? BADGE_TIERS[tierIndex - 1] : undefined;
    const prevThreshold = prevTier ? prevTier.threshold : 0;
    const range = nextBadge.threshold - prevThreshold;
    const progress = gamificationPoints - prevThreshold;
    return Math.min(100, Math.max(0, (progress / range) * 100));
  }, [gamificationPoints, nextBadge]);

  return (
    <Card noPadding className="overflow-hidden">
      <div className="bg-gradient-to-br from-success/10 via-emerald-50 to-amber-50 p-xl text-center">
        <div className="flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-success/20">
            <PartyPopper className="h-8 w-8 text-success" />
          </div>
        </div>

        <h3 className="mt-md text-h2 font-bold text-text-primary">
          Course Completed!
        </h3>

        <p className="mt-xs text-body-md text-text-secondary">
          Congratulations! You have completed all modules.
        </p>

        <div className="mt-lg flex items-center justify-center gap-sm">
          <Star className="h-6 w-6 text-amber-400 fill-amber-400" />
          <span className="text-h2 font-bold text-primary-main">{totalPoints}</span>
          <span className="text-body-lg text-text-secondary">points earned</span>
        </div>

        {/* Badge progress */}
        {nextBadge && (
          <div className="mt-lg rounded-md bg-surface-white/80 p-md">
            <div className="flex items-center justify-between text-body-md">
              <span className="text-text-secondary">Next badge</span>
              <span className="font-semibold text-text-primary flex items-center gap-xs">
                <Award className="h-4 w-4 text-primary-main" />
                {nextBadge.name}
              </span>
            </div>
            <div className="mt-sm h-2 w-full overflow-hidden rounded-full bg-surface-background">
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-400 to-primary-main transition-all duration-700"
                style={{ width: `${badgeProgress}%` }}
              />
            </div>
            <p className="mt-xs text-caption text-text-secondary">
              {gamificationPoints.toLocaleString()} / {nextBadge.threshold.toLocaleString()} pts
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}

// ─── Main Page Component ────────────────────────────────────

export default function CourseDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const user = useAppSelector((s) => s.auth.user);

  // ── Queries ──
  const { data: courseResponse, isLoading: isLoadingCourse } =
    useGetCourseByIdQuery(id, { skip: !id });

  const { data: modulesResponse, isLoading: isLoadingModules } =
    useGetCourseModulesQuery(id, { skip: !id });

  const { data: progressResponse, isLoading: isLoadingProgress } =
    useGetProgressQuery({ course: id, limit: 50 }, { skip: !id || !user?.id });

  const { data: proofsResponse, isLoading: isLoadingProofs } =
    useGetProofsQuery({ course: id, user: user?.id }, { skip: !id || !user?.id });

  const { data: gamificationResponse } =
    useGetUserGamificationQuery(user?.id ?? '', { skip: !user?.id });

  // ── Derived data ──
  const course = useMemo(() => courseResponse?.data ?? null, [courseResponse]);

  const modules = useMemo(() => {
    const mods = modulesResponse?.data ?? [];
    return [...mods].sort((a, b) => a.order - b.order);
  }, [modulesResponse]);

  const progressList = useMemo(() => progressResponse?.data ?? [], [progressResponse]);

  const proofs = useMemo(() => proofsResponse?.data ?? [], [proofsResponse]);

  const gamification = useMemo(() => gamificationResponse?.data ?? null, [gamificationResponse]);

  // Progress map keyed by moduleId
  const progressMap = useMemo(() => {
    const map = new Map<string, ProgressData>();
    for (const p of progressList) {
      map.set(p.module, p);
    }
    return map;
  }, [progressList]);

  // Latest proof of work submission
  const latestProof = useMemo<ProofOfWorkData | null>(() => {
    if (proofs.length === 0) return null;
    // Sort by submittedAt descending, return most recent
    const sorted = [...proofs].sort(
      (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
    );
    return sorted[0] ?? null;
  }, [proofs]);

  // Completion stats
  const completedModuleCount = useMemo(() => {
    return modules.filter((m) => progressMap.get(m._id)?.status === 'completed').length;
  }, [modules, progressMap]);

  const totalCoursePoints = useMemo(() => {
    return progressList.reduce((sum, p) => sum + p.totalModulePoints, 0);
  }, [progressList]);

  const maxCoursePoints = useMemo(() => {
    return modules.length * 100;
  }, [modules.length]);

  const allModulesCompleted = useMemo(() => {
    return modules.length > 0 && completedModuleCount === modules.length;
  }, [modules.length, completedModuleCount]);

  // Determine active (next) module: the first module that is not completed
  const activeModuleId = useMemo(() => {
    for (const mod of modules) {
      const p = progressMap.get(mod._id);
      if (!p || p.status !== 'completed') return mod._id;
    }
    return null;
  }, [modules, progressMap]);

  // ── Loading ──
  const isLoading = isLoadingCourse || isLoadingModules || isLoadingProgress;

  // ─── Render ───────────────────────────────────────────────

  return (
    <div className="space-y-lg pb-lg">
      {/* ── Back Button ── */}
      <Link
        href="/learner/learning"
        className="inline-flex items-center gap-xs text-body-md font-medium text-text-secondary hover:text-text-primary transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </Link>

      {isLoading ? (
        <>
          <HeaderSkeleton />
          <ModulesListSkeleton />
          <ProofSkeleton />
        </>
      ) : !course ? (
        <div className="flex flex-col items-center justify-center rounded-md bg-surface-white py-2xl px-lg text-center shadow-sm">
          <BookOpen className="h-12 w-12 text-text-disabled" />
          <p className="mt-md text-body-lg font-medium text-text-secondary">
            Course not found
          </p>
          <p className="mt-xs text-body-md text-text-disabled">
            This course may have been removed or is not available.
          </p>
        </div>
      ) : (
        <>
          {/* ── Points Progress Bar ── */}
          <PointsProgressBar earned={totalCoursePoints} max={maxCoursePoints} />

          {/* ── Section 1: Course Header ── */}
          <section>
            {/* Full-width thumbnail */}
            <div className="relative h-[220px] w-full overflow-hidden rounded-md bg-surface-background">
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
                  <BookOpen className="h-16 w-16 text-primary-main opacity-50" />
                </div>
              )}
            </div>

            {/* Course info */}
            <div className="mt-lg">
              <h1 className="text-h2 font-semibold text-text-primary">
                {course.title}
              </h1>

              {course.description && (
                <p className="mt-sm text-body-md text-text-secondary">
                  {course.description}
                </p>
              )}

              {/* Domain + Status badges */}
              <div className="mt-md flex flex-wrap items-center gap-sm">
                {course.domain && (
                  <Badge variant="info">{course.domain}</Badge>
                )}
                <Badge
                  variant={
                    course.status === 'active'
                      ? 'success'
                      : course.status === 'draft'
                        ? 'warning'
                        : 'default'
                  }
                >
                  {course.status.charAt(0).toUpperCase() + course.status.slice(1)}
                </Badge>
              </div>

              {/* Coach info */}
              {course.coach && (
                <p className="mt-sm text-body-md text-text-secondary">
                  Coach ID: {course.coach}
                </p>
              )}

              {/* Stats */}
              <div className="mt-md flex items-center gap-lg text-body-md text-text-secondary">
                <span className="flex items-center gap-xs">
                  <BookOpen className="h-4 w-4" />
                  {modules.length} module{modules.length !== 1 ? 's' : ''}
                </span>
                <span className="flex items-center gap-xs">
                  <CheckCircle2 className="h-4 w-4 text-success" />
                  {completedModuleCount} of {modules.length} completed
                </span>
              </div>
            </div>
          </section>

          {/* ── Section 2: Modules List ── */}
          <section>
            <h2 className="text-h3 font-semibold text-text-primary mb-md">
              Modules
            </h2>

            {isLoadingModules ? (
              <ModulesListSkeleton />
            ) : modules.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-md bg-surface-white py-xl px-lg text-center shadow-sm">
                <BookOpen className="h-10 w-10 text-text-disabled" />
                <p className="mt-sm text-body-md text-text-secondary">
                  No modules added yet
                </p>
              </div>
            ) : (
              <div className="space-y-sm">
                {modules.map((mod) => (
                  <ModuleRow
                    key={mod._id}
                    module={mod}
                    progress={progressMap.get(mod._id)}
                    isActive={mod._id === activeModuleId}
                  />
                ))}
              </div>
            )}
          </section>

          {/* ── Section 3: Proof of Work ── */}
          {course.proofOfWorkEnabled && (
            <section>
              {isLoadingProofs ? (
                <Card>
                  <ProofSkeleton />
                </Card>
              ) : (
                <ProofOfWorkSection
                  course={course}
                  proof={latestProof}
                  userId={user?.id ?? ''}
                />
              )}
            </section>
          )}

          {/* ── Section 4: Course Completion ── */}
          {allModulesCompleted && (
            <section>
              <CompletionCard
                totalPoints={totalCoursePoints}
                gamificationPoints={gamification?.totalPoints ?? 0}
              />
            </section>
          )}
        </>
      )}
    </div>
  );
}
