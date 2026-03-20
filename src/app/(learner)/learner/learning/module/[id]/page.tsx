'use client';

import {
  useState,
  useMemo,
  useCallback,
  useRef,
  useEffect,
} from 'react';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Star,
  X,
  Award,
  Upload,
  BookOpen,
  ChevronRight,
  CheckCircle2,
  ClipboardList,
  Play,
  FileText,
} from 'lucide-react';
import { VideoPlayer, Card, Button, FileUpload } from '@/components/ui';
import TextContentViewer from '@/components/learner/TextContentViewer';
import VideoDownloadButton from '@/components/learner/VideoDownloadButton';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { addToast } from '@/store/slices/uiSlice';
import {
  useGetModuleByIdQuery,
  getQuizId,
  type ModuleContentData,
} from '@/store/slices/api/moduleApi';
import {
  useGetCourseByIdQuery,
  useGetCourseModulesQuery,
} from '@/store/slices/api/courseApi';
import {
  useGetQuizByIdQuery,
  useAttemptQuizMutation,
  type QuizQuestionData,
} from '@/store/slices/api/quizApi';
import {
  useGetProgressQuery,
  useUpdateProgressMutation,
  type ProgressData,
} from '@/store/slices/api/progressApi';
import { useUploadProofMutation } from '@/store/slices/api/proofOfWorkApi';
import { useGetUserGamificationQuery } from '@/store/slices/api/gamificationApi';
import { POINTS } from '@/hooks/usePointsCalculation';
import { BADGE_TIERS } from '@/lib/constants';

// ─── Constants ──────────────────────────────────────────────

const VIDEO_POINTS = POINTS.VIDEO_COMPLETION;
const QUIZ_POINTS = POINTS.QUIZ_PASS;
const PROOF_POINTS = POINTS.PROOF_OF_WORK_APPROVED;
const MAX_FILE_SIZE_MB = 2;

// ─── Types ──────────────────────────────────────────────────

type ViewPhase = 'content' | 'content_complete' | 'quiz_ready' | 'quiz' | 'proof' | 'completion' | 'review';

interface QuizAnswer {
  questionIndex: number;
  selectedOption: number;
}

// ─── Skeleton Components ────────────────────────────────────

function ContentSkeleton() {
  return (
    <div className="animate-pulse space-y-lg">
      {/* Points bar skeleton */}
      <div className="h-12 w-full rounded-md bg-border-light" />
      {/* Video area skeleton */}
      <div className="h-[220px] w-full rounded-md bg-border-light" />
      {/* Title skeleton */}
      <div className="space-y-sm">
        <div className="h-6 w-3/4 rounded-sm bg-border-light" />
        <div className="h-4 w-full rounded-sm bg-border-light" />
      </div>
      {/* Button skeleton */}
      <div className="h-12 w-full rounded-sm bg-border-light" />
    </div>
  );
}

// ─── Points Progress Bar ────────────────────────────────────

interface PointsBarProps {
  current: number;
  max: number;
}

function PointsProgressBar({ current, max }: PointsBarProps) {
  const percent = max > 0 ? Math.min(100, Math.round((current / max) * 100)) : 0;

  return (
    <div className="flex items-center gap-md">
      <span className="text-body-md font-semibold text-text-primary whitespace-nowrap">
        {current}
      </span>
      <div className="flex-1 h-[6px] rounded-full bg-surface-background overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-amber-400 to-primary-main transition-all duration-700"
          style={{ width: `${percent}%` }}
        />
      </div>
      <span className="text-body-md font-semibold text-text-secondary whitespace-nowrap flex items-center gap-[2px]">
        {max}
        <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
      </span>
    </div>
  );
}

// ─── Content Progress Bar (green, under video) ──────────────

function ContentProgressBar({ percent }: { percent: number }) {
  return (
    <div className="h-[4px] w-full rounded-full bg-surface-background overflow-hidden">
      <div
        className="h-full rounded-full bg-success transition-all duration-500"
        style={{ width: `${Math.min(100, percent)}%` }}
      />
    </div>
  );
}

// ─── Video Content View ─────────────────────────────────────

interface VideoContentViewProps {
  content: ModuleContentData;
  onComplete: () => void;
  isCompleted: boolean;
  downloadAllowed?: boolean;
  moduleTitle?: string;
  courseTitle?: string;
}

function VideoContentView({ content, onComplete, isCompleted, downloadAllowed, moduleTitle, courseTitle }: VideoContentViewProps) {
  const [videoProgress, setVideoProgress] = useState(0);
  const completedRef = useRef(isCompleted);

  const handleComplete = useCallback(() => {
    if (!completedRef.current) {
      completedRef.current = true;
      onComplete();
    }
  }, [onComplete]);

  useEffect(() => {
    setVideoProgress(0);
    completedRef.current = isCompleted;
  }, [content.data, isCompleted]);

  return (
    <div className="space-y-md">
      <VideoPlayer
        src={content.data}
        hlsUrl={content.hlsUrl}
        title={content.title}
        downloadable={content.downloadable}
        onProgress={(percent) => {
          setVideoProgress(percent);
          if (percent >= 90) {
            handleComplete();
          }
        }}
        onEnded={() => {
          setVideoProgress(100);
          handleComplete();
        }}
      />

      {/* Content title */}
      <h2 className="text-h3 font-semibold text-text-primary">
        {content.title}
      </h2>

      {/* Green progress bar */}
      <ContentProgressBar percent={isCompleted ? 100 : videoProgress} />

      {/* Manual fallback for YouTube where tracking may be unreliable */}
      {!isCompleted && (
        <div className="flex items-center justify-between">
          <p className="text-text-secondary text-caption">
            Watch at least 90% to auto-complete
          </p>
          <button
            type="button"
            onClick={handleComplete}
            className="text-caption text-primary-main hover:underline"
          >
            Mark as watched
          </button>
        </div>
      )}

      {/* Download button */}
      {downloadAllowed && content.downloadable && (
        <VideoDownloadButton
          videoUrl={content.data}
          title={`${courseTitle || 'Video'} - ${moduleTitle || 'Module'} - ${content.title || 'Content'}`}
          className="mt-sm"
        />
      )}
    </div>
  );
}

// ─── Text Content View (using TextContentViewer component) ──

// ─── Quiz Option Card ───────────────────────────────────────

interface QuizOptionProps {
  text: string;
  image: string;
  index: number;
  isSelected: boolean;
  disabled: boolean;
  onSelect: () => void;
}

function QuizOptionCard({
  text,
  image,
  index,
  isSelected,
  disabled,
  onSelect,
}: QuizOptionProps) {
  const optionLetters = ['A', 'B', 'C', 'D', 'E', 'F'];
  const letter = optionLetters[index] ?? String(index + 1);

  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      className={`
        flex w-full items-center gap-md rounded-lg bg-[#FFF8ED] px-md py-md
        text-left transition-all duration-200
        ${isSelected ? 'border-2 border-primary-main' : 'border border-border-light'}
        ${disabled ? 'cursor-default' : 'cursor-pointer active:scale-[0.98]'}
      `}
    >
      {/* Letter indicator */}
      <div
        className={`
          flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full
          text-body-md font-semibold
          ${isSelected ? 'bg-primary-main text-white' : 'bg-white text-text-primary'}
        `}
      >
        {letter}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {image && (
          <div className="relative mb-sm h-[80px] w-full overflow-hidden rounded-sm bg-surface-background">
            <Image
              src={image}
              alt={`Option ${letter}`}
              fill
              unoptimized
              className="object-contain"
              sizes="(max-width: 768px) 100vw, 50vw"
            />
          </div>
        )}
        <p className="text-body-lg text-text-primary">{text}</p>
      </div>
    </button>
  );
}

// ─── Quiz Phase Component ───────────────────────────────────

interface QuizPhaseProps {
  quizId: string;
  existingProgress: ProgressData | null;
  // eslint-disable-next-line no-unused-vars
  onComplete: (passed: boolean, earnedPoints: number) => void;
}

interface AttemptResultState {
  score: number;
  passed: boolean;
  correctCount: number;
  totalQuestions: number;
  attemptsRemaining: number;
  attemptNumber: number;
  maxAttempts: number;
  pointsEarned: number;
}

function QuizPhase({ quizId, existingProgress, onComplete }: QuizPhaseProps) {
  const dispatch = useAppDispatch();

  const { data: quizResponse, isLoading: isLoadingQuiz } = useGetQuizByIdQuery(quizId);
  const [attemptQuiz, { isLoading: isSubmittingQuiz }] = useAttemptQuizMutation();

  const quiz = useMemo(() => quizResponse?.data ?? null, [quizResponse]);
  const questions: QuizQuestionData[] = useMemo(() => quiz?.questions ?? [], [quiz]);

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [attemptResult, setAttemptResult] = useState<AttemptResultState | null>(null);

  const currentQuestion = questions[currentQuestionIndex] ?? null;
  const isLastQuestion = currentQuestionIndex === questions.length - 1;

  const maxAttempts = quiz?.maxAttempts ?? 3;
  const previousAttemptCount = existingProgress?.quizAttempts?.length ?? 0;

  const handleSelectOption = useCallback((optionIndex: number) => {
    setSelectedOption(optionIndex);
    setAnswers((prev) => ({ ...prev, [currentQuestionIndex]: optionIndex }));
  }, [currentQuestionIndex]);

  const handleNextQuestion = useCallback(() => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
      setSelectedOption(answers[currentQuestionIndex + 1] ?? null);
    }
  }, [currentQuestionIndex, questions.length, answers]);

  const handlePrevQuestion = useCallback(() => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((prev) => prev - 1);
      setSelectedOption(answers[currentQuestionIndex - 1] ?? null);
    }
  }, [currentQuestionIndex, answers]);

  const handleSubmitQuiz = useCallback(async () => {
    // Build answers array from the map
    const answerArray: QuizAnswer[] = Object.entries(answers).map(
      ([qIdx, optIdx]) => ({
        questionIndex: Number(qIdx),
        selectedOption: optIdx,
      })
    );

    if (answerArray.length < questions.length) {
      dispatch(
        addToast({
          type: 'error',
          message: `Please answer all ${questions.length} questions. You answered ${answerArray.length}.`,
          duration: 4000,
        })
      );
      return;
    }

    try {
      const result = await attemptQuiz({
        id: quizId,
        body: { answers: answerArray },
      }).unwrap();

      const data = result.data;
      if (data) {
        setAttemptResult({
          score: data.score,
          passed: data.passed,
          correctCount: data.correctCount,
          totalQuestions: data.totalQuestions,
          attemptsRemaining: data.attemptsRemaining,
          attemptNumber: data.attemptNumber,
          maxAttempts: data.maxAttempts,
          pointsEarned: data.pointsEarned,
        });

        if (data.passed) {
          onComplete(true, data.pointsEarned);
        }
      }
    } catch {
      dispatch(
        addToast({
          type: 'error',
          message: 'Failed to submit quiz. Please try again.',
          duration: 4000,
        })
      );
    }
  }, [answers, questions.length, attemptQuiz, quizId, onComplete, dispatch]);

  const handleRetry = useCallback(() => {
    setCurrentQuestionIndex(0);
    setSelectedOption(null);
    setAnswers({});
    setAttemptResult(null);
  }, []);

  // ── Loading state
  if (isLoadingQuiz) {
    return (
      <div className="animate-pulse space-y-lg">
        <div className="h-6 w-3/4 rounded-sm bg-border-light" />
        <div className="space-y-sm">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 w-full rounded-lg bg-border-light" />
          ))}
        </div>
        <div className="h-12 w-full rounded-sm bg-border-light" />
      </div>
    );
  }

  if (!quiz || questions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-md bg-surface-white py-2xl px-lg text-center shadow-sm">
        <BookOpen className="h-12 w-12 text-text-disabled" />
        <p className="mt-md text-body-lg font-medium text-text-secondary">
          No quiz questions available
        </p>
      </div>
    );
  }

  // ── Result screen (after submission)
  if (attemptResult && !attemptResult.passed) {
    return (
      <div className="space-y-lg">
        <Card className="text-center">
          <div className="py-lg">
            <div className="flex justify-center mb-md">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-error/10">
                <X className="h-8 w-8 text-error" />
              </div>
            </div>

            <h3 className="text-h2 font-bold text-text-primary">
              Not quite there yet
            </h3>
            <p className="mt-sm text-h3 font-semibold text-error">
              {attemptResult.score}%
            </p>
            <p className="mt-xs text-body-md text-text-secondary">
              {attemptResult.correctCount} of {attemptResult.totalQuestions} correct
              &middot; Need {quiz.passingScore}% to pass
            </p>

            {attemptResult.attemptsRemaining > 0 ? (
              <div className="mt-lg">
                <p className="text-body-md text-text-secondary mb-md">
                  Attempt {attemptResult.attemptNumber} of {attemptResult.maxAttempts}
                  &middot; {attemptResult.attemptsRemaining} remaining
                </p>
                <Button
                  variant="primary"
                  size="lg"
                  isBlock
                  onClick={handleRetry}
                  className="min-h-[48px]"
                >
                  Try Again
                </Button>
              </div>
            ) : (
              <div className="mt-lg">
                <p className="text-body-md text-error font-medium">
                  No attempts remaining. Contact your coach for assistance.
                </p>

                {/* Attempt history */}
                {existingProgress && existingProgress.quizAttempts.length > 0 && (
                  <div className="mt-lg text-left">
                    <p className="text-body-md font-medium text-text-primary mb-sm">
                      Attempt History
                    </p>
                    <div className="divide-y divide-border-light rounded-md border border-border-light">
                      {existingProgress.quizAttempts.map((a, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between px-md py-sm"
                        >
                          <span className="text-body-md text-text-secondary">
                            Attempt {idx + 1}
                          </span>
                          <span
                            className={`text-body-md font-semibold ${
                              a.passed ? 'text-success' : 'text-error'
                            }`}
                          >
                            {a.score}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </Card>
      </div>
    );
  }

  // ── Active quiz question
  if (!currentQuestion) return null;

  const allAnswered = Object.keys(answers).length === questions.length;

  return (
    <div className="space-y-lg">
      {/* Progress dots */}
      <div className="flex gap-xs">
        {questions.map((_, idx) => (
          <div
            key={idx}
            className={`h-1.5 flex-1 rounded-full cursor-pointer transition-colors ${
              idx === currentQuestionIndex
                ? 'bg-primary-main'
                : answers[idx] !== undefined
                  ? 'bg-success'
                  : 'bg-border-light'
            }`}
            onClick={() => {
              setCurrentQuestionIndex(idx);
              setSelectedOption(answers[idx] ?? null);
            }}
          />
        ))}
      </div>

      {/* Question header */}
      <div className="flex items-center justify-between">
        <h3 className="text-h3 font-bold text-text-primary">
          Q{currentQuestionIndex + 1}. {currentQuestion.questionText}
        </h3>
        <span className="text-caption text-text-secondary whitespace-nowrap ml-md">
          {currentQuestionIndex + 1}/{questions.length}
        </span>
      </div>

      {/* Question image (if any) */}
      {currentQuestion.questionImage && (
        <div className="relative h-[180px] w-full overflow-hidden rounded-md bg-surface-background">
          <Image
            src={currentQuestion.questionImage}
            alt={`Question ${currentQuestionIndex + 1}`}
            fill
            unoptimized
            className="object-contain"
            sizes="100vw"
          />
        </div>
      )}

      {/* Options */}
      <div className="space-y-sm">
        {currentQuestion.options.map((option, optIdx) => (
          <QuizOptionCard
            key={optIdx}
            text={option.text}
            image={option.image}
            index={optIdx}
            isSelected={selectedOption === optIdx}
            disabled={false}
            onSelect={() => handleSelectOption(optIdx)}
          />
        ))}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between gap-md">
        <Button
          variant="ghost"
          size="lg"
          disabled={currentQuestionIndex === 0}
          onClick={handlePrevQuestion}
          className="min-h-[48px]"
        >
          Previous
        </Button>

        {isLastQuestion ? (
          <Button
            variant="primary"
            size="lg"
            isBlock
            disabled={!allAnswered}
            isLoading={isSubmittingQuiz}
            onClick={handleSubmitQuiz}
            className="min-h-[48px]"
          >
            Submit ({Object.keys(answers).length}/{questions.length})
          </Button>
        ) : (
          <Button
            variant="primary"
            size="lg"
            isBlock
            disabled={selectedOption === null}
            onClick={handleNextQuestion}
            className="min-h-[48px]"
          >
            Next
          </Button>
        )}
      </div>

      {/* Attempt info */}
      <p className="text-center text-caption text-text-secondary">
        Attempt {previousAttemptCount + 1} of {maxAttempts}
      </p>
    </div>
  );
}

// ─── Proof of Work Phase Component ──────────────────────────

interface ProofPhaseProps {
  courseId: string;
  instructions: string;
  onComplete: () => void;
  onSkip: () => void;
}

function ProofPhase({ courseId, instructions, onComplete, onSkip }: ProofPhaseProps) {
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
    formData.append('courseId', courseId);

    try {
      await uploadProof(formData).unwrap();
      dispatch(
        addToast({
          type: 'success',
          message: 'Proof of work uploaded successfully!',
          duration: 3000,
        })
      );
      onComplete();
    } catch {
      dispatch(
        addToast({
          type: 'error',
          message: 'Failed to upload proof. Please try again.',
          duration: 4000,
        })
      );
    }
  }, [selectedFile, courseId, uploadProof, dispatch, onComplete]);

  return (
    <div className="space-y-lg">
      {/* Big heading */}
      <div className="text-center py-lg">
        <div className="flex justify-center mb-md">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-light">
            <Upload className="h-8 w-8 text-primary-main" />
          </div>
        </div>
        <h2 className="text-h2 font-bold text-text-primary">
          Upload proof of your learning
        </h2>
        {instructions && (
          <p className="mt-sm text-body-lg text-text-secondary">
            {instructions}
          </p>
        )}
      </div>

      {/* File upload */}
      <FileUpload
        accept="image/*"
        maxSizeMB={MAX_FILE_SIZE_MB}
        onFileSelect={handleFileSelect}
        onRemove={handleRemoveFile}
        fileName={selectedFile?.name}
      />

      {/* Upload button */}
      {selectedFile && (
        <Button
          variant="primary"
          size="lg"
          isBlock
          isLoading={isUploading}
          leftIcon={<Upload className="h-4 w-4" />}
          onClick={handleUpload}
          className="min-h-[48px]"
        >
          Upload Image
        </Button>
      )}

      {/* Skip button */}
      <Button
        variant="ghost"
        size="lg"
        isBlock
        onClick={onSkip}
        className="min-h-[48px]"
      >
        Skip
      </Button>
    </div>
  );
}

// ─── Completion Phase Component ─────────────────────────────

interface CompletionPhaseProps {
  earnedPoints: number;
  gamificationPoints: number;
  nextModuleId: string | null;
  nextModuleTitle: string | null;
  courseThumbnail: string;
}

function CompletionPhase({
  earnedPoints,
  gamificationPoints,
  nextModuleId,
  nextModuleTitle,
  courseThumbnail,
}: CompletionPhaseProps) {
  const router = useRouter();

  // Find next badge tier
  const nextBadge = useMemo(() => {
    for (const tier of BADGE_TIERS) {
      if (gamificationPoints < tier.threshold) return tier;
    }
    return null;
  }, [gamificationPoints]);

  const pointsToNextBadge = useMemo(() => {
    if (!nextBadge) return 0;
    return Math.max(0, nextBadge.threshold - gamificationPoints);
  }, [gamificationPoints, nextBadge]);

  const badgeProgressPercent = useMemo(() => {
    if (!nextBadge) return 100;
    const tierIndex = BADGE_TIERS.findIndex((t) => t.name === nextBadge.name);
    const prevTier = tierIndex > 0 ? BADGE_TIERS[tierIndex - 1] : undefined;
    const prevThreshold = prevTier?.threshold ?? 0;
    const range = nextBadge.threshold - prevThreshold;
    const progress = gamificationPoints - prevThreshold;
    return Math.min(100, Math.max(0, Math.round((progress / range) * 100)));
  }, [gamificationPoints, nextBadge]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-overlay p-md">
      <div className="w-full max-w-md rounded-lg bg-[#FFF8ED] p-xl overflow-y-auto max-h-[90vh]">
        {/* Congratulations */}
        <div className="text-center">
          <h1 className="text-h1 font-bold text-text-primary">
            Congratulations!
          </h1>
          <p className="mt-sm text-body-lg text-text-secondary">
            You earned
          </p>

          {/* Points card */}
          <div className="mt-md mx-auto inline-flex items-center gap-sm rounded-lg bg-surface-white px-xl py-lg shadow-sm">
            <span className="text-[40px] font-bold text-text-primary leading-none">
              {earnedPoints}
            </span>
            <Star className="h-8 w-8 text-amber-400 fill-amber-400" />
          </div>
        </div>

        {/* Badge progress */}
        {nextBadge && (
          <div className="mt-xl">
            <p className="text-body-md text-text-secondary text-center">
              You need{' '}
              <span className="font-semibold text-text-primary">{pointsToNextBadge}</span>
              {' '}more points to achieve{' '}
              <span className="font-semibold text-text-primary">{nextBadge.name}</span>
            </p>

            <div className="mt-md flex items-center gap-md">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-surface-white shadow-sm">
                <Award className="h-5 w-5 text-primary-main" />
              </div>
              <div className="flex-1">
                <div className="h-3 w-full overflow-hidden rounded-full bg-white">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-amber-400 to-primary-main transition-all duration-700"
                    style={{ width: `${badgeProgressPercent}%` }}
                  />
                </div>
                <p className="mt-xs text-caption text-text-secondary text-right">
                  {gamificationPoints.toLocaleString()} / {nextBadge.threshold.toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Up Next section */}
        {nextModuleId && nextModuleTitle && (
          <div className="mt-xl">
            <p className="text-body-md font-semibold text-text-secondary mb-md">
              Up Next
            </p>
            <div className="flex items-center gap-md rounded-md bg-surface-white p-md shadow-sm">
              {/* Thumbnail */}
              <div className="relative h-12 w-16 flex-shrink-0 overflow-hidden rounded-sm bg-surface-background">
                {courseThumbnail ? (
                  <Image
                    src={courseThumbnail}
                    alt={nextModuleTitle}
                    fill
                    unoptimized
                    className="object-cover"
                    sizes="64px"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <BookOpen className="h-5 w-5 text-text-disabled" />
                  </div>
                )}
              </div>
              <p className="flex-1 text-body-md font-medium text-text-primary line-clamp-2">
                {nextModuleTitle}
              </p>
              <ChevronRight className="h-5 w-5 text-text-secondary flex-shrink-0" />
            </div>
          </div>
        )}

        {/* Action button */}
        <div className="mt-xl">
          {nextModuleId ? (
            <Button
              variant="primary"
              size="lg"
              isBlock
              onClick={() => router.push(`/learner/learning/module/${nextModuleId}`)}
              className="min-h-[48px]"
            >
              Continue
            </Button>
          ) : (
            <Button
              variant="primary"
              size="lg"
              isBlock
              onClick={() => router.push('/learner/learning')}
              className="min-h-[48px]"
            >
              Back to My Learning
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Content Complete Screen ─────────────────────────────────

interface ContentCompleteScreenProps {
  hasQuiz: boolean;
  quizMeta: { questionCount: number; passingScore: number; maxAttempts: number } | null;
  onTakeQuiz: () => void;
  onBackToCourse: () => void;
  onContinueWithoutQuiz: () => void;
}

function ContentCompleteScreen({
  hasQuiz,
  quizMeta,
  onTakeQuiz,
  onBackToCourse,
  onContinueWithoutQuiz,
}: ContentCompleteScreenProps) {
  return (
    <div className="space-y-lg">
      <Card className="text-center">
        <div className="py-lg">
          <div className="flex justify-center mb-md">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
              <CheckCircle2 className="h-8 w-8 text-success" />
            </div>
          </div>

          <h3 className="text-h2 font-bold text-text-primary">
            Content Completed!
          </h3>
          <p className="mt-sm text-body-lg text-text-secondary">
            You&apos;ve finished all the content for this module
          </p>

          {/* Points earned */}
          <div className="mt-md inline-flex items-center gap-sm rounded-lg bg-amber-50 px-lg py-sm">
            <Star className="h-5 w-5 text-amber-400 fill-amber-400" />
            <span className="text-h3 font-bold text-text-primary">+{VIDEO_POINTS} pts</span>
          </div>
        </div>
      </Card>

      {hasQuiz && quizMeta && (
        <Card>
          <div className="flex items-start gap-md">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary-light">
              <ClipboardList className="h-5 w-5 text-primary-main" />
            </div>
            <div className="flex-1">
              <h4 className="text-body-lg font-semibold text-text-primary">
                Assessment Available
              </h4>
              <p className="mt-xs text-body-md text-text-secondary">
                {quizMeta.questionCount} question{quizMeta.questionCount !== 1 ? 's' : ''}
                {' '}&middot; Pass at {quizMeta.passingScore}%
                {' '}&middot; {quizMeta.maxAttempts} attempt{quizMeta.maxAttempts !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
        </Card>
      )}

      <div className="space-y-sm">
        {hasQuiz ? (
          <>
            <Button
              variant="primary"
              size="lg"
              isBlock
              leftIcon={<ClipboardList className="h-4 w-4" />}
              onClick={onTakeQuiz}
              className="min-h-[48px]"
            >
              Take Assessment
            </Button>
            <Button
              variant="ghost"
              size="lg"
              isBlock
              onClick={onBackToCourse}
              className="min-h-[48px]"
            >
              Back to Course
            </Button>
          </>
        ) : (
          <Button
            variant="primary"
            size="lg"
            isBlock
            onClick={onContinueWithoutQuiz}
            className="min-h-[48px]"
          >
            Continue
          </Button>
        )}
      </div>
    </div>
  );
}

// ─── Quiz Ready Screen (returning learner) ───────────────────

interface QuizReadyScreenProps {
  quizMeta: { questionCount: number; passingScore: number; maxAttempts: number } | null;
  existingProgress: ProgressData | null;
  onStartQuiz: () => void;
  onReviewContent: () => void;
  onBackToCourse: () => void;
}

function QuizReadyScreen({
  quizMeta,
  existingProgress,
  onStartQuiz,
  onReviewContent,
  onBackToCourse,
}: QuizReadyScreenProps) {
  const previousAttempts = existingProgress?.quizAttempts ?? [];
  const attemptsUsed = previousAttempts.length;
  const maxAttempts = quizMeta?.maxAttempts ?? 3;
  const attemptsRemaining = Math.max(0, maxAttempts - attemptsUsed);

  return (
    <div className="space-y-lg">
      <Card className="text-center">
        <div className="py-lg">
          <div className="flex justify-center mb-md">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-50">
              <ClipboardList className="h-8 w-8 text-primary-main" />
            </div>
          </div>

          <h3 className="text-h2 font-bold text-text-primary">
            Assessment Pending
          </h3>
          <p className="mt-sm text-body-lg text-text-secondary">
            You&apos;ve completed the content. Ready to take the quiz?
          </p>

          {/* Content completed badge */}
          <div className="mt-md inline-flex items-center gap-sm rounded-lg bg-success/10 px-lg py-sm">
            <CheckCircle2 className="h-4 w-4 text-success" />
            <span className="text-body-md font-medium text-success">Content Completed</span>
          </div>
        </div>
      </Card>

      {/* Quiz info */}
      {quizMeta && (
        <Card>
          <div className="flex items-start gap-md">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary-light">
              <ClipboardList className="h-5 w-5 text-primary-main" />
            </div>
            <div className="flex-1">
              <h4 className="text-body-lg font-semibold text-text-primary">
                Quiz Details
              </h4>
              <p className="mt-xs text-body-md text-text-secondary">
                {quizMeta.questionCount} question{quizMeta.questionCount !== 1 ? 's' : ''}
                {' '}&middot; Pass at {quizMeta.passingScore}%
              </p>
              <p className="mt-xs text-body-md text-text-secondary">
                {attemptsRemaining > 0 ? (
                  <>{attemptsRemaining} of {maxAttempts} attempt{maxAttempts !== 1 ? 's' : ''} remaining</>
                ) : (
                  <span className="text-error font-medium">No attempts remaining</span>
                )}
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Previous attempt history */}
      {previousAttempts.length > 0 && (
        <Card>
          <p className="text-body-md font-semibold text-text-primary mb-sm">
            Previous Attempts
          </p>
          <div className="divide-y divide-border-light rounded-md border border-border-light">
            {previousAttempts.map((a, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between px-md py-sm"
              >
                <span className="text-body-md text-text-secondary">
                  Attempt {idx + 1}
                </span>
                <span
                  className={`text-body-md font-semibold ${
                    a.passed ? 'text-success' : 'text-error'
                  }`}
                >
                  {a.score}%
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      <div className="space-y-sm">
        {attemptsRemaining > 0 ? (
          <Button
            variant="primary"
            size="lg"
            isBlock
            leftIcon={<ClipboardList className="h-4 w-4" />}
            onClick={onStartQuiz}
            className="min-h-[48px]"
          >
            {attemptsUsed > 0 ? 'Retry Assessment' : 'Start Assessment'}
          </Button>
        ) : (
          <div className="rounded-md bg-error/10 px-md py-md text-center">
            <p className="text-body-md text-error font-medium">
              No attempts remaining. Contact your coach for assistance.
            </p>
          </div>
        )}
        <Button
          variant="secondary"
          size="lg"
          isBlock
          onClick={onReviewContent}
          className="min-h-[48px]"
        >
          Review Content
        </Button>
        <Button
          variant="ghost"
          size="lg"
          isBlock
          onClick={onBackToCourse}
          className="min-h-[48px]"
        >
          Back to Course
        </Button>
      </div>
    </div>
  );
}

// ─── Review Phase (completed module, read-only) ─────────────

interface ReviewPhaseProps {
  moduleTitle: string;
  contents: ModuleContentData[];
  progressData: ProgressData | null;
  hasQuiz: boolean;
  quizMeta: { questionCount: number; passingScore: number; maxAttempts: number } | null;
  maxPoints: number;
  onBackToCourse: () => void;
  downloadAllowed?: boolean;
  courseTitle?: string;
}

function ReviewPhase({
  moduleTitle,
  contents,
  progressData,
  hasQuiz,
  quizMeta,
  maxPoints,
  onBackToCourse,
  downloadAllowed,
  courseTitle,
}: ReviewPhaseProps) {
  const [expandedContent, setExpandedContent] = useState<number | null>(null);

  const lastQuizAttempt = useMemo(() => {
    const attempts = progressData?.quizAttempts ?? [];
    return attempts.length > 0 ? attempts[attempts.length - 1] : null;
  }, [progressData]);

  return (
    <div className="space-y-lg">
      {/* Completed badge */}
      <Card className="overflow-hidden">
        <div className="flex items-center gap-md">
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-success">
            <CheckCircle2 className="h-6 w-6 text-white" />
          </div>
          <div className="flex-1">
            <p className="text-body-lg font-semibold text-success">Module Completed</p>
            <p className="mt-[2px] text-body-md text-text-secondary flex items-center gap-sm">
              <span className="flex items-center gap-[2px]">
                <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
                {progressData?.totalModulePoints ?? 0}/{maxPoints} points
              </span>
              {progressData?.completedAt && (
                <span>&middot; {new Date(progressData.completedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
              )}
            </p>
          </div>
        </div>
      </Card>

      {/* Module title */}
      <div>
        <h2 className="text-h3 font-semibold text-text-primary">{moduleTitle}</h2>
        <p className="mt-xs text-body-md text-text-secondary">Review Content</p>
      </div>

      {/* Content list — expandable, no tracking */}
      <div className="space-y-sm">
        {contents.map((content, idx) => (
          <Card key={idx} noPadding className="overflow-hidden">
            {/* Content header — clickable to expand */}
            <button
              type="button"
              onClick={() => setExpandedContent(expandedContent === idx ? null : idx)}
              className="flex w-full items-center justify-between px-md py-md text-left hover:bg-surface-background transition-colors"
            >
              <div className="flex items-center gap-sm flex-1 min-w-0">
                {content.type === 'video' ? (
                  <Play className="h-4 w-4 text-text-secondary flex-shrink-0" />
                ) : (
                  <FileText className="h-4 w-4 text-text-secondary flex-shrink-0" />
                )}
                <span className="text-body-md font-medium text-text-primary line-clamp-1">
                  {content.title || `Content ${idx + 1}`}
                </span>
              </div>
              <div className="flex items-center gap-sm flex-shrink-0 ml-sm">
                <CheckCircle2 className="h-4 w-4 text-success" />
                <ChevronRight
                  className={`h-4 w-4 text-text-secondary transition-transform duration-200 ${
                    expandedContent === idx ? 'rotate-90' : ''
                  }`}
                />
              </div>
            </button>

            {/* Expanded content body — no progress callbacks */}
            {expandedContent === idx && (
              <div className="border-t border-border-light p-md">
                {content.type === 'video' ? (
                  <div className="space-y-sm">
                    <VideoPlayer
                      src={content.data}
                      hlsUrl={content.hlsUrl}
                      title={content.title}
                      downloadable={content.downloadable}
                    />
                    {downloadAllowed && content.downloadable && (
                      <VideoDownloadButton
                        videoUrl={content.data}
                        title={`${courseTitle || 'Video'} - ${moduleTitle || 'Module'} - ${content.title || 'Content'}`}
                      />
                    )}
                  </div>
                ) : (
                  <div className="prose prose-sm max-w-none text-body-md text-text-primary leading-relaxed whitespace-pre-wrap">
                    {content.data}
                  </div>
                )}
              </div>
            )}
          </Card>
        ))}
      </div>

      {/* Quiz result summary (if quiz was taken) */}
      {hasQuiz && progressData?.quizPassed && (
        <Card>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-sm">
              <ClipboardList className="h-5 w-5 text-text-secondary" />
              <span className="text-body-md font-semibold text-text-primary">Assessment</span>
            </div>
            <span className="text-body-md font-semibold text-success flex items-center gap-xs">
              <CheckCircle2 className="h-4 w-4" />
              Passed
            </span>
          </div>
          <div className="mt-sm flex items-center gap-md text-body-md text-text-secondary">
            <span>Score: {lastQuizAttempt?.score ?? '—'}%</span>
            <span>&middot;</span>
            <span>Attempts: {progressData.quizAttempts.length}/{quizMeta?.maxAttempts ?? 3}</span>
            <span>&middot;</span>
            <span className="flex items-center gap-[2px]">
              <Star className="h-3 w-3 text-amber-400 fill-amber-400" />
              +{progressData.quizPoints} pts
            </span>
          </div>
        </Card>
      )}

      {/* Back button */}
      <Button
        variant="primary"
        size="lg"
        isBlock
        leftIcon={<ArrowLeft className="h-4 w-4" />}
        onClick={onBackToCourse}
        className="min-h-[48px]"
      >
        Back to Course
      </Button>
    </div>
  );
}

// ─── Main Page Component ────────────────────────────────────

export default function ModuleContentViewer() {
  const params = useParams();
  const router = useRouter();
  const moduleId = params.id as string;
  const user = useAppSelector((s) => s.auth.user);

  // ── State Machine ──
  const [phase, setPhase] = useState<ViewPhase>('content');
  const [currentContentIndex, setCurrentContentIndex] = useState(0);
  const [completedContents, setCompletedContents] = useState<Set<number>>(new Set());
  const [earnedModulePoints, setEarnedModulePoints] = useState(0);
  const [quizEarnedPoints, setQuizEarnedPoints] = useState(0);

  // ── Queries ──
  const { data: moduleResponse, isLoading: isLoadingModule } =
    useGetModuleByIdQuery(moduleId, { skip: !moduleId });

  const moduleData = useMemo(() => moduleResponse?.data ?? null, [moduleResponse]);
  const courseId = moduleData?.course ?? '';

  const { data: courseResponse } = useGetCourseByIdQuery(courseId, {
    skip: !courseId,
  });

  const { data: courseModulesResponse } = useGetCourseModulesQuery(courseId, {
    skip: !courseId,
  });

  const { data: progressResponse } = useGetProgressQuery(
    { module: moduleId, limit: 1 },
    { skip: !moduleId || !user?.id }
  );

  const { data: gamificationResponse } = useGetUserGamificationQuery(
    user?.id ?? '',
    { skip: !user?.id }
  );

  const [updateProgress] = useUpdateProgressMutation();

  // ── Derived data ──
  const course = useMemo(() => courseResponse?.data ?? null, [courseResponse]);

  const courseModules = useMemo(() => {
    const mods = courseModulesResponse?.data ?? [];
    return [...mods].sort((a, b) => a.order - b.order);
  }, [courseModulesResponse]);

  const progressData = useMemo<ProgressData | null>(() => {
    const list = progressResponse?.data ?? [];
    return list[0] ?? null;
  }, [progressResponse]);

  const gamification = useMemo(
    () => gamificationResponse?.data ?? null,
    [gamificationResponse]
  );

  const contents = useMemo<ModuleContentData[]>(
    () => moduleData?.contents ?? [],
    [moduleData]
  );

  const currentContent = contents[currentContentIndex] ?? null;

  const quizId = getQuizId(moduleData?.quiz ?? null);
  const hasQuiz = !!quizId;

  // Find the next module in the course
  const nextModule = useMemo(() => {
    if (!moduleData || courseModules.length === 0) return null;
    const currentOrder = moduleData.order;
    const next = courseModules.find((m) => m.order > currentOrder);
    return next ?? null;
  }, [moduleData, courseModules]);

  // Determine if content viewing is all done
  const allContentsCompleted = useMemo(() => {
    if (contents.length === 0) return false;
    return contents.every((_, idx) => completedContents.has(idx));
  }, [contents, completedContents]);

  const isCurrentContentCompleted = completedContents.has(currentContentIndex);

  // Calculate current points display
  const displayPoints = useMemo(() => {
    let points = progressData?.videoPoints ?? 0;
    points += progressData?.quizPoints ?? 0;
    points += progressData?.proofOfWorkPoints ?? 0;
    // Add locally-known earned points not yet reflected in server data
    return Math.max(points, earnedModulePoints);
  }, [progressData, earnedModulePoints]);

  // ── Hydrate completed contents from server progress ──
  useEffect(() => {
    if (progressData && progressData.completedContents.length > 0) {
      setCompletedContents(new Set(progressData.completedContents));
      setEarnedModulePoints(progressData.totalModulePoints);

      // Module already completed — go straight to read-only review mode
      if (progressData.status === 'completed') {
        setPhase('review');
        return;
      }

      // Video done + quiz passed but not officially completed (shouldn't happen, but handle)
      if (progressData.videoCompleted && progressData.quizPassed) {
        setPhase('review');
        return;
      }

      // Video done, quiz pending — show quiz ready screen
      if (progressData.videoCompleted && !progressData.quizPassed && hasQuiz) {
        setPhase('quiz_ready');
      }
    }
  }, [progressData, hasQuiz]);

  // ── Handlers ──

  const handleContentComplete = useCallback((contentIndex: number) => {
    setCompletedContents((prev) => {
      const updated = new Set(prev);
      updated.add(contentIndex);
      return updated;
    });

    // Persist content completion to server
    updateProgress({ moduleId, contentIndex }).catch(() => {});
  }, [updateProgress, moduleId]);

  const handleNextContent = useCallback(() => {
    if (currentContentIndex < contents.length - 1) {
      // Move to next content
      setCurrentContentIndex((prev) => prev + 1);
    } else if (allContentsCompleted) {
      // All contents done — progress was already saved per-content via handleContentComplete
      setEarnedModulePoints((prev) => Math.max(prev, VIDEO_POINTS));

      // Show content-complete summary screen (learner chooses next action)
      setPhase('content_complete');
    }
  }, [
    currentContentIndex,
    contents.length,
    allContentsCompleted,
  ]);

  const handleQuizComplete = useCallback(
    (passed: boolean, earnedPoints: number) => {
      if (passed) {
        setQuizEarnedPoints(earnedPoints);
        setEarnedModulePoints((prev) => prev + earnedPoints);

        if (course?.proofOfWorkEnabled) {
          setPhase('proof');
        } else {
          setPhase('completion');
        }
      }
    },
    [course?.proofOfWorkEnabled]
  );

  const handleProofComplete = useCallback(() => {
    setPhase('completion');
  }, []);

  const handleProofSkip = useCallback(() => {
    setPhase('completion');
  }, []);

  const handleBackToCourse = useCallback(() => {
    if (courseId) {
      router.push(`/learner/learning/course/${courseId}`);
    } else {
      router.push('/learner/learning');
    }
  }, [router, courseId]);

  // When no quiz exists (or quiz already passed), proceed from content_complete to next step
  const handleContentCompleteNext = useCallback(() => {
    if (course?.proofOfWorkEnabled) {
      setPhase('proof');
    } else {
      setPhase('completion');
    }
  }, [course?.proofOfWorkEnabled]);

  const handleReviewContent = useCallback(() => {
    setCurrentContentIndex(0);
    setPhase('content');
  }, []);

  const handleStartQuiz = useCallback(() => {
    setPhase('quiz');
  }, []);

  // Quiz metadata (from populated quiz object)
  const quizMeta = useMemo(() => {
    const quiz = moduleData?.quiz;
    if (!quiz || typeof quiz === 'string') return null;
    return {
      questionCount: quiz.questions?.length ?? 0,
      passingScore: quiz.passingScore ?? 70,
      maxAttempts: quiz.maxAttempts ?? 3,
    };
  }, [moduleData?.quiz]);

  // Dynamic max points for this module
  const moduleMaxPoints = useMemo(() => {
    let max = VIDEO_POINTS;
    if (hasQuiz) max += QUIZ_POINTS;
    if (course?.proofOfWorkEnabled) max += PROOF_POINTS;
    return max;
  }, [hasQuiz, course?.proofOfWorkEnabled]);

  // ── Loading state ──
  if (isLoadingModule) {
    return (
      <div className="space-y-lg pb-lg">
        {/* Back button */}
        <button
          type="button"
          onClick={() => router.back()}
          className="inline-flex items-center gap-xs text-body-md font-medium text-text-secondary"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <ContentSkeleton />
      </div>
    );
  }

  // ── Not found ──
  if (!moduleData) {
    return (
      <div className="space-y-lg pb-lg">
        <button
          type="button"
          onClick={() => router.back()}
          className="inline-flex items-center gap-xs text-body-md font-medium text-text-secondary hover:text-text-primary transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <div className="flex flex-col items-center justify-center rounded-md bg-surface-white py-2xl px-lg text-center shadow-sm">
          <BookOpen className="h-12 w-12 text-text-disabled" />
          <p className="mt-md text-body-lg font-medium text-text-secondary">
            Module not found
          </p>
          <p className="mt-xs text-body-md text-text-disabled">
            This module may have been removed or is not available.
          </p>
        </div>
      </div>
    );
  }

  // ─── Render ───────────────────────────────────────────────

  return (
    <div className="space-y-lg pb-lg">
      {/* ── Back Button ── */}
      <button
        type="button"
        onClick={() => {
          if (courseId) {
            router.push(`/learner/learning/course/${courseId}`);
          } else {
            router.back();
          }
        }}
        className="inline-flex items-center gap-xs text-body-md font-medium text-text-secondary hover:text-text-primary transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>

      {/* ── Points Progress Bar ── */}
      <PointsProgressBar current={displayPoints} max={moduleMaxPoints} />

      {/* ── Phase: Review (completed module, read-only) ── */}
      {phase === 'review' && (
        <ReviewPhase
          moduleTitle={moduleData.title}
          contents={contents}
          progressData={progressData}
          hasQuiz={hasQuiz}
          quizMeta={quizMeta}
          maxPoints={moduleMaxPoints}
          onBackToCourse={handleBackToCourse}
          downloadAllowed={course?.downloadAllowed !== false}
          courseTitle={course?.title}
        />
      )}

      {/* ── Phase: Content Viewing ── */}
      {phase === 'content' && (
        <div className="space-y-lg">
          {currentContent && (
            <>
              {currentContent.type === 'video' ? (
                <VideoContentView
                  content={currentContent}
                  onComplete={() => handleContentComplete(currentContentIndex)}
                  isCompleted={isCurrentContentCompleted}
                  downloadAllowed={course?.downloadAllowed !== false}
                  moduleTitle={moduleData?.title}
                  courseTitle={course?.title}
                />
              ) : (
                <TextContentViewer
                  content={currentContent}
                  isCompleted={isCurrentContentCompleted}
                  onComplete={() => handleContentComplete(currentContentIndex)}
                />
              )}
            </>
          )}

          {/* Content navigation dots */}
          {contents.length > 1 && (
            <div className="flex items-center justify-center gap-sm">
              {contents.map((_, idx) => (
                <div
                  key={idx}
                  className={`
                    h-2 rounded-full transition-all duration-300
                    ${idx === currentContentIndex ? 'w-6 bg-primary-main' : 'w-2'}
                    ${completedContents.has(idx) && idx !== currentContentIndex ? 'bg-success' : ''}
                    ${!completedContents.has(idx) && idx !== currentContentIndex ? 'bg-border-light' : ''}
                  `}
                />
              ))}
            </div>
          )}

          {/* Module title */}
          <div className="rounded-md bg-surface-white p-md shadow-sm">
            <h3 className="text-h3 font-semibold text-text-primary">
              {moduleData.title}
            </h3>
            {moduleData.description && (
              <p className="mt-xs text-body-md text-text-secondary line-clamp-2">
                {moduleData.description}
              </p>
            )}
          </div>

          {/* Next button */}
          <Button
            variant="primary"
            size="lg"
            isBlock
            disabled={!isCurrentContentCompleted}
            onClick={handleNextContent}
            className="min-h-[48px]"
          >
            {currentContentIndex < contents.length - 1
              ? 'Next'
              : allContentsCompleted
                ? 'Complete Content'
                : 'Next'}
          </Button>
        </div>
      )}

      {/* ── Phase: Content Complete (summary + choice) ── */}
      {phase === 'content_complete' && (
        <ContentCompleteScreen
          hasQuiz={hasQuiz && !progressData?.quizPassed}
          quizMeta={quizMeta}
          onTakeQuiz={handleStartQuiz}
          onBackToCourse={handleBackToCourse}
          onContinueWithoutQuiz={handleContentCompleteNext}
        />
      )}

      {/* ── Phase: Quiz Ready (returning learner) ── */}
      {phase === 'quiz_ready' && (
        <QuizReadyScreen
          quizMeta={quizMeta}
          existingProgress={progressData}
          onStartQuiz={handleStartQuiz}
          onReviewContent={handleReviewContent}
          onBackToCourse={handleBackToCourse}
        />
      )}

      {/* ── Phase: Quiz Assessment ── */}
      {phase === 'quiz' && quizId && (
        <div className="space-y-lg">
          <QuizPhase
            quizId={quizId}
            existingProgress={progressData}
            onComplete={handleQuizComplete}
          />
          <Button
            variant="ghost"
            size="lg"
            isBlock
            onClick={handleBackToCourse}
            className="min-h-[48px]"
          >
            Exit Quiz
          </Button>
        </div>
      )}

      {/* ── Phase: Proof of Work ── */}
      {phase === 'proof' && course && (
        <ProofPhase
          courseId={course._id}
          instructions={course.proofOfWorkInstructions}
          onComplete={handleProofComplete}
          onSkip={handleProofSkip}
        />
      )}

      {/* ── Phase: Completion ── */}
      {phase === 'completion' && (
        <CompletionPhase
          earnedPoints={earnedModulePoints}
          gamificationPoints={(gamification?.totalPoints ?? 0) + quizEarnedPoints}
          nextModuleId={nextModule?._id ?? null}
          nextModuleTitle={nextModule?.title ?? null}
          courseThumbnail={course?.thumbnail ?? ''}
        />
      )}
    </div>
  );
}
