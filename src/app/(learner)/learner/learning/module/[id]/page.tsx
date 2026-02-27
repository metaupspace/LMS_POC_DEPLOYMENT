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
  Check,
  X,
  Award,
  Upload,
  BookOpen,
  ChevronRight,
} from 'lucide-react';
import { VideoPlayer, Card, Button, FileUpload } from '@/components/ui';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { addToast } from '@/store/slices/uiSlice';
import {
  useGetModuleByIdQuery,
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

// ─── Constants ──────────────────────────────────────────────

const BADGE_TIERS = [
  { name: 'Rookie', threshold: 1000, icon: '\u{1F949}' },
  { name: 'Silver', threshold: 2000, icon: '\u{1F948}' },
  { name: 'Gold', threshold: 3000, icon: '\u{1F947}' },
  { name: 'Premium', threshold: 5000, icon: '\u{1F48E}' },
] as const;

const MAX_MODULE_POINTS = 100;
const VIDEO_POINTS = 30;
const MAX_FILE_SIZE_MB = 2;

// ─── Types ──────────────────────────────────────────────────

type ViewPhase = 'content' | 'quiz' | 'proof' | 'completion';

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
}

function VideoContentView({ content, onComplete, isCompleted }: VideoContentViewProps) {
  const [videoProgress, setVideoProgress] = useState(0);
  const completedRef = useRef(isCompleted);

  const handleComplete = useCallback(() => {
    if (!completedRef.current) {
      completedRef.current = true;
      onComplete();
    }
  }, [onComplete]);

  // Track video time for the green progress bar
  // VideoPlayer fires onComplete when >90% watched, so we estimate progress
  // via a simple interval approach while video is mounted
  useEffect(() => {
    // Reset on new content
    setVideoProgress(0);
    completedRef.current = isCompleted;
  }, [content.data, isCompleted]);

  return (
    <div className="space-y-md">
      <VideoPlayer
        src={content.data}
        title={content.title}
        downloadable={content.downloadable}
        onComplete={() => {
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
    </div>
  );
}

// ─── Text Content View ──────────────────────────────────────

interface TextContentViewProps {
  content: ModuleContentData;
  onComplete: () => void;
  isCompleted: boolean;
}

function TextContentView({ content, onComplete, isCompleted }: TextContentViewProps) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const completedRef = useRef(isCompleted);

  useEffect(() => {
    completedRef.current = isCompleted;
  }, [isCompleted]);

  // IntersectionObserver on the sentinel div at bottom
  useEffect(() => {
    if (isCompleted) return;

    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && !completedRef.current) {
            completedRef.current = true;
            onComplete();
          }
        }
      },
      { threshold: 1.0 }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [isCompleted, onComplete]);

  return (
    <div className="space-y-md">
      <h2 className="text-h3 font-semibold text-text-primary">
        {content.title}
      </h2>

      <div className="rounded-md bg-surface-white p-lg shadow-sm">
        <div
          className="prose prose-sm max-w-none text-body-md text-text-primary leading-relaxed whitespace-pre-wrap"
        >
          {content.data}
        </div>
        {/* Sentinel for scroll completion detection */}
        <div ref={sentinelRef} className="h-[1px]" />
      </div>
    </div>
  );
}

// ─── Quiz Option Card ───────────────────────────────────────

interface QuizOptionProps {
  text: string;
  image: string;
  index: number;
  isSelected: boolean;
  isSubmitted: boolean;
  isCorrect: boolean;
  isUserAnswer: boolean;
  onSelect: () => void;
}

function QuizOptionCard({
  text,
  image,
  index,
  isSelected,
  isSubmitted,
  isCorrect,
  isUserAnswer,
  onSelect,
}: QuizOptionProps) {
  const optionLetters = ['A', 'B', 'C', 'D', 'E', 'F'];
  const letter = optionLetters[index] ?? String(index + 1);

  let borderClass = 'border border-border-light';
  let iconNode: React.ReactNode = null;

  if (isSubmitted) {
    if (isCorrect) {
      borderClass = 'border-2 border-success';
      iconNode = (
        <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-success">
          <Check className="h-3.5 w-3.5 text-white" />
        </div>
      );
    } else if (isUserAnswer && !isCorrect) {
      borderClass = 'border-2 border-error';
      iconNode = (
        <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-error">
          <X className="h-3.5 w-3.5 text-white" />
        </div>
      );
    }
  } else if (isSelected) {
    borderClass = 'border-2 border-success';
  }

  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={isSubmitted}
      className={`
        flex w-full items-center gap-md rounded-lg bg-[#FFF8ED] px-md py-md
        text-left transition-all duration-200
        ${borderClass}
        ${isSubmitted ? 'cursor-default' : 'cursor-pointer active:scale-[0.98]'}
      `}
    >
      {/* Letter indicator */}
      <div
        className={`
          flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full
          text-body-md font-semibold
          ${isSelected && !isSubmitted ? 'bg-success text-white' : 'bg-white text-text-primary'}
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

      {/* Result icon */}
      {iconNode}
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

function QuizPhase({ quizId, existingProgress, onComplete }: QuizPhaseProps) {
  const dispatch = useAppDispatch();

  const { data: quizResponse, isLoading: isLoadingQuiz } = useGetQuizByIdQuery(quizId);
  const [attemptQuiz, { isLoading: isSubmittingQuiz }] = useAttemptQuizMutation();

  const quiz = useMemo(() => quizResponse?.data ?? null, [quizResponse]);
  const questions: QuizQuestionData[] = useMemo(() => quiz?.questions ?? [], [quiz]);

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswerRevealed, setIsAnswerRevealed] = useState(false);
  const [answers, setAnswers] = useState<QuizAnswer[]>([]);
  const [quizFinished, setQuizFinished] = useState(false);
  const [retryAvailable, setRetryAvailable] = useState(false);
  const [attemptsUsed, setAttemptsUsed] = useState(0);

  const currentQuestion = questions[currentQuestionIndex] ?? null;
  const isLastQuestion = currentQuestionIndex === questions.length - 1;

  // Previous attempts count
  const previousAttempts = useMemo(() => {
    return existingProgress?.quizAttempts?.length ?? 0;
  }, [existingProgress]);

  const maxAttempts = quiz?.maxAttempts ?? 3;

  // Find correct option index for current question
  const correctOptionIndex = useMemo(() => {
    if (!currentQuestion) return -1;
    return currentQuestion.options.findIndex((opt) => opt.isCorrect);
  }, [currentQuestion]);

  const handleSelectOption = useCallback((optionIndex: number) => {
    if (!isAnswerRevealed) {
      setSelectedOption(optionIndex);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAnswerRevealed]);

  const handleSubmitAnswer = useCallback(() => {
    if (selectedOption === null) return;
    setIsAnswerRevealed(true);
  }, [selectedOption]);

  const handleNextQuestion = useCallback(async () => {
    if (selectedOption === null) return;

    const answer: QuizAnswer = {
      questionIndex: currentQuestionIndex,
      selectedOption,
    };
    const updatedAnswers = [...answers, answer];
    setAnswers(updatedAnswers);

    if (isLastQuestion) {
      // Submit quiz to server
      try {
        const result = await attemptQuiz({
          id: quizId,
          body: { answers: updatedAnswers },
        }).unwrap();

        const attemptResult = result.data;
        if (attemptResult) {
          if (attemptResult.passed) {
            onComplete(true, attemptResult.pointsEarned);
          } else {
            const totalAttemptsUsed = previousAttempts + 1;
            setAttemptsUsed(totalAttemptsUsed);
            if (totalAttemptsUsed < maxAttempts) {
              setRetryAvailable(true);
              setQuizFinished(true);
            } else {
              // No attempts remaining
              setRetryAvailable(false);
              setQuizFinished(true);
            }
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
    } else {
      // Move to next question
      setCurrentQuestionIndex((prev) => prev + 1);
      setSelectedOption(null);
      setIsAnswerRevealed(false);
    }
  }, [
    selectedOption,
    currentQuestionIndex,
    answers,
    isLastQuestion,
    attemptQuiz,
    quizId,
    onComplete,
    previousAttempts,
    maxAttempts,
    dispatch,
  ]);

  const handleRetry = useCallback(() => {
    setCurrentQuestionIndex(0);
    setSelectedOption(null);
    setIsAnswerRevealed(false);
    setAnswers([]);
    setQuizFinished(false);
    setRetryAvailable(false);
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

  // ── Quiz finished (failed)
  if (quizFinished) {
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
            <p className="mt-sm text-body-lg text-text-secondary">
              You did not pass the quiz this time.
            </p>

            {retryAvailable ? (
              <div className="mt-lg">
                <p className="text-body-md text-text-secondary mb-md">
                  Attempts used: {attemptsUsed} / {maxAttempts}
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
              <p className="mt-lg text-body-md text-error font-medium">
                No attempts remaining. Contact your coach for assistance.
              </p>
            )}
          </div>
        </Card>
      </div>
    );
  }

  // ── Active quiz question
  if (!currentQuestion) return null;

  return (
    <div className="space-y-lg">
      {/* Question header */}
      <h3 className="text-h3 font-bold text-text-primary">
        Q{currentQuestionIndex + 1}. {currentQuestion.questionText}
      </h3>

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
            isSubmitted={isAnswerRevealed}
            isCorrect={optIdx === correctOptionIndex}
            isUserAnswer={selectedOption === optIdx}
            onSelect={() => handleSelectOption(optIdx)}
          />
        ))}
      </div>

      {/* Explanation (shown after reveal, for correct answer) */}
      {isAnswerRevealed && correctOptionIndex >= 0 && (
        <div className="rounded-md bg-success/5 border border-success/20 p-md">
          <p className="text-body-md text-text-secondary">
            <span className="font-semibold text-success">Correct Answer: </span>
            {currentQuestion.options[correctOptionIndex]?.text}
          </p>
        </div>
      )}

      {/* Submit / Next Question button */}
      {!isAnswerRevealed ? (
        <Button
          variant="primary"
          size="lg"
          isBlock
          disabled={selectedOption === null}
          onClick={handleSubmitAnswer}
          className="min-h-[48px]"
        >
          Submit
        </Button>
      ) : (
        <Button
          variant="primary"
          size="lg"
          isBlock
          isLoading={isSubmittingQuiz}
          onClick={handleNextQuestion}
          className="min-h-[48px]"
        >
          {isLastQuestion ? 'Finish Quiz' : 'Next Question'}
        </Button>
      )}

      {/* Progress indicator */}
      <p className="text-center text-caption text-text-secondary">
        Question {currentQuestionIndex + 1} of {questions.length}
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

  const hasQuiz = !!moduleData?.quiz;

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

      // If video was already completed and quiz passed, jump to completion or relevant phase
      if (progressData.videoCompleted && progressData.quizPassed) {
        // Already completed this module — show completion or content for review
        // Keep in content phase for review
      } else if (progressData.videoCompleted && !progressData.quizPassed && hasQuiz) {
        setPhase('quiz');
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

      // Transition to next phase
      if (hasQuiz) {
        setPhase('quiz');
      } else if (course?.proofOfWorkEnabled) {
        setPhase('proof');
      } else {
        setPhase('completion');
      }
    }
  }, [
    currentContentIndex,
    contents.length,
    allContentsCompleted,
    hasQuiz,
    course?.proofOfWorkEnabled,
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
      <PointsProgressBar current={displayPoints} max={MAX_MODULE_POINTS} />

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
                />
              ) : (
                <TextContentView
                  content={currentContent}
                  onComplete={() => handleContentComplete(currentContentIndex)}
                  isCompleted={isCurrentContentCompleted}
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
                ? hasQuiz
                  ? 'Continue to Quiz'
                  : 'Complete'
                : 'Next'}
          </Button>
        </div>
      )}

      {/* ── Phase: Quiz Assessment ── */}
      {phase === 'quiz' && moduleData.quiz && (
        <QuizPhase
          quizId={moduleData.quiz}
          existingProgress={progressData}
          onComplete={handleQuizComplete}
        />
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
