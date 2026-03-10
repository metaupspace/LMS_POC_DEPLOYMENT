'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  useStartTestMutation,
  useSubmitTestMutation,
  useReportViolationMutation,
  type TestQuestion,
} from '@/store/slices/api/testApi';
import { getErrorMessage } from '@/lib/utils/getErrorMessage';
import {
  AlertTriangle,
  Clock,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  Wifi,
  WifiOff,
} from 'lucide-react';

// ─── IndexedDB helpers for offline persistence ──────────

const DB_NAME = 'lms_test_offline';
const STORE_NAME = 'test_answers';

async function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE_NAME, { keyPath: 'attemptId' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function saveToIDB(attemptId: string, data: Record<string, unknown>) {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  tx.objectStore(STORE_NAME).put({
    attemptId,
    ...data,
    savedAt: Date.now(),
  });
  await new Promise<void>((res, rej) => {
    tx.oncomplete = () => res();
    tx.onerror = () => rej(tx.error);
  });
}

async function loadFromIDB(
  attemptId: string
): Promise<Record<string, unknown> | null> {
  const db = await openDB();
  return new Promise((resolve) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).get(attemptId);
    req.onsuccess = () => resolve((req.result as Record<string, unknown>) || null);
    req.onerror = () => resolve(null);
  });
}

async function clearFromIDB(attemptId: string) {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  tx.objectStore(STORE_NAME).delete(attemptId);
}

// ─── Types ──────────────────────────────────────────────

type TestPhase = 'instructions' | 'testing' | 'submitting' | 'result';

interface ViolationRecord {
  type: string;
  details: string;
  timestamp: string;
}

interface TestResult {
  score: number;
  correctCount: number;
  totalQuestions: number;
  passed: boolean;
  passingScore: number;
  certification: { title: string; earnedAt: string } | null;
  attemptNumber: number;
  maxAttempts: number;
  attemptsRemaining: number;
  totalViolations: number;
}

interface TestState {
  attemptId: string;
  questions: TestQuestion[];
  timeLimitMinutes: number;
  startedAt: string;
}

// ─── Component ──────────────────────────────────────────

export default function ProctoredTestPage() {
  const params = useParams();
  const router = useRouter();
  const testId = params.id as string;

  const [startTest] = useStartTestMutation();
  const [submitTest] = useSubmitTestMutation();
  const [reportViolation] = useReportViolationMutation();

  const [phase, setPhase] = useState<TestPhase>('instructions');
  const [testData, setTestData] = useState<TestState | null>(null);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [currentQ, setCurrentQ] = useState(0);
  const [violations, setViolations] = useState<ViolationRecord[]>([]);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [result, setResult] = useState<TestResult | null>(null);
  const [error, setError] = useState('');
  const [warning, setWarning] = useState('');
  const [loading, setLoading] = useState(false);
  const startTimeRef = useRef<number>(Date.now());
  const autoSaveRef = useRef<ReturnType<typeof setInterval>>();
  const violationsRef = useRef(violations);

  // Keep violations ref in sync for use in event handlers
  useEffect(() => {
    violationsRef.current = violations;
  }, [violations]);

  // ─── Online/Offline Detection ─────────────────────────

  useEffect(() => {
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  // ─── Add violation helper ─────────────────────────────

  const addViolation = useCallback(
    (type: string, details: string) => {
      const violation: ViolationRecord = {
        type,
        details,
        timestamp: new Date().toISOString(),
      };
      setViolations((prev) => [...prev, violation]);

      // Try to send to server (non-blocking)
      if (navigator.onLine && testData?.attemptId) {
        reportViolation({
          testId,
          attemptId: testData.attemptId,
          type,
          details,
        }).catch(() => {});
      }
    },
    [testData?.attemptId, testId, reportViolation]
  );

  // ─── Proctoring: Block copy/paste, right-click, keys ──

  useEffect(() => {
    if (phase !== 'testing') return;

    const blockCopy = (e: ClipboardEvent) => {
      e.preventDefault();
      addViolation('copy_paste', 'Attempted copy/paste');
    };
    const blockPaste = (e: ClipboardEvent) => {
      e.preventDefault();
      addViolation('copy_paste', 'Attempted paste');
    };
    const blockContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };
    const blockKeys = (e: KeyboardEvent) => {
      if (e.key === 'PrintScreen') {
        e.preventDefault();
        addViolation('screenshot', 'PrintScreen pressed');
      }
      if (
        e.ctrlKey &&
        ['c', 'v', 'a', 'p', 'C', 'V', 'A', 'P'].includes(e.key)
      ) {
        e.preventDefault();
        addViolation('copy_paste', `Ctrl+${e.key} blocked`);
      }
      if (e.metaKey && ['c', 'v', 'a', 'p'].includes(e.key)) {
        e.preventDefault();
        addViolation('copy_paste', `Cmd+${e.key} blocked`);
      }
      if (e.key === 'F12') {
        e.preventDefault();
        addViolation('devtools', 'F12 pressed');
      }
      if (e.ctrlKey && e.shiftKey && ['I', 'i'].includes(e.key)) {
        e.preventDefault();
        addViolation('devtools', 'DevTools shortcut blocked');
      }
    };

    document.addEventListener('copy', blockCopy);
    document.addEventListener('cut', blockCopy);
    document.addEventListener('paste', blockPaste);
    document.addEventListener('contextmenu', blockContextMenu);
    document.addEventListener('keydown', blockKeys);

    document.body.style.userSelect = 'none';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (document.body.style as any).webkitUserSelect = 'none';

    return () => {
      document.removeEventListener('copy', blockCopy);
      document.removeEventListener('cut', blockCopy);
      document.removeEventListener('paste', blockPaste);
      document.removeEventListener('contextmenu', blockContextMenu);
      document.removeEventListener('keydown', blockKeys);
      document.body.style.userSelect = '';
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (document.body.style as any).webkitUserSelect = '';
    };
  }, [phase, addViolation]);

  // ─── Proctoring: Tab switch / blur ────────────────────

  useEffect(() => {
    if (phase !== 'testing') return;

    const handleVisibility = () => {
      if (document.hidden) {
        addViolation('tab_switch', 'Tab became hidden');
        setWarning('Tab switch detected! This has been recorded.');
        setTimeout(() => setWarning(''), 5000);
      }
    };
    const handleBlur = () => {
      addViolation('tab_switch', 'Window lost focus');
      setWarning('Window focus lost! This has been recorded.');
      setTimeout(() => setWarning(''), 5000);
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('blur', handleBlur);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('blur', handleBlur);
    };
  }, [phase, addViolation]);

  // ─── Fullscreen ───────────────────────────────────────

  const requestFullscreen = async () => {
    try {
      await document.documentElement.requestFullscreen();
    } catch {
      // Mobile may not support fullscreen
    }
  };

  const exitFullscreen = () => {
    try {
      if (document.fullscreenElement) document.exitFullscreen();
    } catch {
      // ignore
    }
  };

  // ─── Timer ────────────────────────────────────────────

  useEffect(() => {
    if (
      phase !== 'testing' ||
      !testData?.timeLimitMinutes ||
      testData.timeLimitMinutes === 0
    )
      return;

    const startedAt = new Date(testData.startedAt).getTime();
    const totalMs = testData.timeLimitMinutes * 60 * 1000;
    const endTime = startedAt + totalMs;

    const interval = setInterval(() => {
      const remaining = Math.max(
        0,
        Math.floor((endTime - Date.now()) / 1000)
      );
      setTimeLeft(remaining);

      if (remaining === 0) {
        clearInterval(interval);
        handleSubmit(true);
      }
    }, 1000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, testData?.startedAt, testData?.timeLimitMinutes]);

  // ─── Auto-save to IndexedDB every 10s ────────────────

  useEffect(() => {
    if (phase !== 'testing' || !testData?.attemptId) return;

    autoSaveRef.current = setInterval(() => {
      saveToIDB(testData.attemptId, {
        testId,
        answers,
        violations: violationsRef.current,
        timeSpentSeconds: Math.floor(
          (Date.now() - startTimeRef.current) / 1000
        ),
      }).catch(() => {});
    }, 10000);

    return () => clearInterval(autoSaveRef.current);
  }, [phase, testData?.attemptId, testId, answers]);

  // ─── Start Test ───────────────────────────────────────

  const handleStart = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await startTest(testId).unwrap();
      const data = res?.data;
      if (!data) throw new Error('Failed to start test');

      setTestData({
        attemptId: data.attemptId,
        questions: data.questions,
        timeLimitMinutes: data.timeLimitMinutes,
        startedAt: data.startedAt,
      });
      startTimeRef.current = Date.now();

      // Restore answers if resuming
      if (data.resuming && data.answers) {
        const restored: Record<number, number> = {};
        data.answers.forEach((a) => {
          if (a.selectedOption >= 0) restored[a.questionIndex] = a.selectedOption;
        });
        setAnswers(restored);
      }

      // Try to restore from IndexedDB (offline backup)
      const offlineData = await loadFromIDB(data.attemptId);
      if (offlineData?.answers) {
        const offlineAnswers = offlineData.answers as Record<number, number>;
        const offlineCount = Object.keys(offlineAnswers).length;
        const serverCount = data.resuming
          ? data.answers.filter((a) => a.selectedOption >= 0).length
          : 0;
        if (offlineCount > serverCount) {
          setAnswers(offlineAnswers);
        }
      }

      await requestFullscreen();
      setPhase('testing');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  // ─── Submit Test ──────────────────────────────────────

  const handleSubmit = async (autoSubmit = false) => {
    if (!testData) return;

    if (!autoSubmit) {
      const unanswered =
        testData.questions.length - Object.keys(answers).length;
      if (unanswered > 0) {
        const confirmed = window.confirm(
          `You have ${unanswered} unanswered question${unanswered > 1 ? 's' : ''}. Submit anyway?`
        );
        if (!confirmed) return;
      }
    }

    setPhase('submitting');
    clearInterval(autoSaveRef.current);

    const finalAnswers = testData.questions.map((_, idx) => ({
      questionIndex: idx,
      selectedOption: answers[idx] ?? -1,
    }));

    const payload = {
      testId,
      attemptId: testData.attemptId,
      answers: finalAnswers,
      violations: violationsRef.current,
      timeSpentSeconds: Math.floor(
        (Date.now() - startTimeRef.current) / 1000
      ),
      wasOfflineSync: !navigator.onLine,
    };

    // Save to IndexedDB first as backup
    await saveToIDB(testData.attemptId, {
      ...payload,
      pendingSubmit: true,
    }).catch(() => {});

    try {
      // Wait for online if offline
      if (!navigator.onLine) {
        await new Promise<void>((resolve) => {
          const check = () => {
            if (navigator.onLine) {
              resolve();
              return;
            }
            setTimeout(check, 1000);
          };
          check();
        });
      }

      const res = await submitTest(payload).unwrap();
      const data = res?.data;
      if (!data) throw new Error('Submit failed');

      setResult(data);
      setPhase('result');
      exitFullscreen();

      await clearFromIDB(testData.attemptId).catch(() => {});
    } catch (err) {
      setError(
        `Submit failed: ${getErrorMessage(err)}. Your answers are saved locally. Please try again.`
      );
      setPhase('testing');
    }
  };

  // ─── Answer selection ─────────────────────────────────

  const selectAnswer = (questionIndex: number, optionIndex: number) => {
    setAnswers((prev) => ({ ...prev, [questionIndex]: optionIndex }));
  };

  // ─── Format timer ─────────────────────────────────────

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  const totalQ = testData?.questions?.length || 0;
  const answeredCount = Object.keys(answers).length;

  // ═══════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════

  // ─── Instructions Phase ───────────────────────────────

  if (phase === 'instructions') {
    return (
      <div className="min-h-screen bg-surface-background flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg max-w-lg w-full p-8">
          <h1 className="text-h1 font-bold mb-4 text-center">
            Certification Test
          </h1>

          <div className="bg-yellow-50 border border-warning rounded-md p-4 mb-6">
            <h2 className="text-body-md font-semibold flex items-center gap-2 mb-3">
              <AlertTriangle size={20} className="text-warning" /> Test Rules
            </h2>
            <ul className="space-y-2 text-body-md text-text-secondary">
              <li>
                Do NOT switch tabs or windows — violations are recorded
              </li>
              <li>Do NOT minimize the browser</li>
              <li>Copy, paste, and screenshots are blocked</li>
              <li>The test will enter fullscreen mode</li>
              <li>
                If internet disconnects, your answers are saved locally
              </li>
              <li>Answers will sync when you reconnect and submit</li>
              <li>All violations are recorded and visible to admin</li>
            </ul>
          </div>

          {error && (
            <div className="bg-red-50 border border-error rounded-md p-3 mb-4 text-error text-body-md">
              {error}
            </div>
          )}

          <button
            onClick={handleStart}
            disabled={loading}
            className="w-full py-4 bg-primary-main text-white rounded-md text-lg font-semibold hover:bg-primary-hover disabled:opacity-50 transition-colors"
          >
            {loading ? 'Starting...' : 'Start Test'}
          </button>
        </div>
      </div>
    );
  }

  // ─── Submitting Phase ─────────────────────────────────

  if (phase === 'submitting') {
    return (
      <div className="min-h-screen bg-surface-background flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-primary-main border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-h3 font-medium">
            {navigator.onLine
              ? 'Submitting your test...'
              : 'Waiting for internet connection...'}
          </p>
          {!navigator.onLine && (
            <p className="text-body-md text-text-secondary mt-2">
              Your answers are saved. They will be submitted when you
              reconnect.
            </p>
          )}
        </div>
      </div>
    );
  }

  // ─── Result Phase ─────────────────────────────────────

  if (phase === 'result' && result) {
    return (
      <div className="min-h-screen bg-surface-background flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg max-w-lg w-full p-8 text-center">
          {result.passed ? (
            <>
              <div className="text-6xl mb-4">{'\u{1F3C6}'}</div>
              <h1 className="text-h1 font-bold text-success mb-2">
                Certified!
              </h1>
              <p className="text-h2 font-semibold text-primary-main mb-2">
                &quot;{result.certification?.title}&quot;
              </p>
              <p className="text-h1 font-bold text-success">
                {result.score}%
              </p>
              <p className="text-body-md text-text-secondary">
                {result.correctCount}/{result.totalQuestions} correct
              </p>
              <p className="text-primary-main font-medium mt-2">
                +50 gamification points
              </p>
            </>
          ) : (
            <>
              <div className="text-6xl mb-4">{'\u{1F614}'}</div>
              <h1 className="text-h1 font-bold text-error mb-2">
                Not Passed
              </h1>
              <p className="text-h1 font-bold text-error">
                {result.score}%
              </p>
              <p className="text-body-md text-text-secondary">
                {result.correctCount}/{result.totalQuestions} correct — Need{' '}
                {result.passingScore}%
              </p>
              {result.attemptsRemaining > 0 ? (
                <p className="text-warning font-medium mt-2">
                  {result.attemptsRemaining} attempt
                  {result.attemptsRemaining > 1 ? 's' : ''} remaining
                </p>
              ) : (
                <p className="text-error font-medium mt-2">
                  All attempts exhausted
                </p>
              )}
            </>
          )}

          {result.totalViolations > 0 && (
            <p className="text-caption text-text-disabled mt-4">
              {result.totalViolations} proctoring violation
              {result.totalViolations > 1 ? 's' : ''} recorded
            </p>
          )}

          <button
            onClick={() => router.push('/learner/profile')}
            className="w-full mt-6 py-3 bg-primary-main text-white rounded-md font-medium hover:bg-primary-hover transition-colors"
          >
            Back to Profile
          </button>
        </div>
      </div>
    );
  }

  // ─── Testing Phase ────────────────────────────────────

  if (phase === 'testing' && testData) {
    const question = testData.questions[currentQ];
    if (!question) return null;

    return (
      <div className="min-h-screen bg-surface-background select-none">
        {/* Top bar */}
        <div className="sticky top-0 z-10 bg-white border-b border-border-light px-4 py-3">
          <div className="flex items-center justify-between max-w-3xl mx-auto">
            <div className="flex items-center gap-2 text-caption">
              {isOnline ? (
                <span className="text-success flex items-center gap-1">
                  <Wifi size={14} /> Online
                </span>
              ) : (
                <span className="text-error flex items-center gap-1">
                  <WifiOff size={14} /> Offline — answers saved locally
                </span>
              )}
            </div>
            {timeLeft !== null && (
              <div
                className={`flex items-center gap-1 font-mono text-body-md font-semibold ${
                  timeLeft < 60
                    ? 'text-error animate-pulse'
                    : timeLeft < 300
                      ? 'text-warning'
                      : 'text-text-primary'
                }`}
              >
                <Clock size={16} /> {formatTime(timeLeft)}
              </div>
            )}
            <span className="text-caption text-text-secondary">
              {answeredCount}/{totalQ} answered
            </span>
          </div>
        </div>

        {/* Warning banner */}
        {warning && (
          <div className="bg-error text-white text-center py-2 text-body-md font-medium">
            {warning}
          </div>
        )}

        {/* Error banner */}
        {error && (
          <div className="bg-red-50 text-error text-center py-2 text-body-md">
            {error}
          </div>
        )}

        {/* Question content */}
        <div className="max-w-3xl mx-auto p-4 mt-4">
          {/* Progress */}
          <div className="flex items-center gap-2 mb-4">
            <span className="text-caption text-text-secondary">
              Question {currentQ + 1} of {totalQ}
            </span>
            <div className="flex-1 bg-gray-200 rounded-full h-1.5">
              <div
                className="bg-primary-main h-1.5 rounded-full transition-[width] duration-200"
                style={{
                  width: `${((currentQ + 1) / totalQ) * 100}%`,
                }}
              />
            </div>
          </div>

          {/* Question */}
          <div className="bg-white rounded-lg p-6 shadow-sm border border-border-light mb-4">
            <p className="text-h3 font-medium mb-2">
              {question.questionText}
            </p>
            {question.questionImage && (
              <img
                src={question.questionImage}
                alt=""
                className="max-h-48 rounded-md mb-4"
              />
            )}
            <p className="text-caption text-text-secondary">
              {question.points} point{question.points > 1 ? 's' : ''}
            </p>
          </div>

          {/* Options */}
          <div className="space-y-3 mb-6">
            {question.options.map((opt, optIdx) => {
              const isSelected = answers[currentQ] === optIdx;
              return (
                <button
                  key={optIdx}
                  onClick={() => selectAnswer(currentQ, optIdx)}
                  className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                    isSelected
                      ? 'border-primary-main bg-orange-50'
                      : 'border-border-light bg-white hover:border-primary-main/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-8 h-8 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                        isSelected
                          ? 'border-primary-main bg-primary-main text-white'
                          : 'border-gray-300'
                      }`}
                    >
                      {isSelected ? (
                        <CheckCircle size={16} />
                      ) : (
                        <span className="text-caption text-text-secondary">
                          {String.fromCharCode(65 + optIdx)}
                        </span>
                      )}
                    </span>
                    <span className="text-body-md">{opt.text}</span>
                  </div>
                  {opt.image && (
                    <img
                      src={opt.image}
                      alt=""
                      className="mt-2 max-h-32 rounded"
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => setCurrentQ(Math.max(0, currentQ - 1))}
              disabled={currentQ === 0}
              className="flex items-center gap-1 px-4 py-2 text-text-secondary hover:text-text-primary disabled:opacity-30 transition-colors"
            >
              <ChevronLeft size={18} /> Previous
            </button>

            {currentQ < totalQ - 1 ? (
              <button
                onClick={() => setCurrentQ(currentQ + 1)}
                className="flex items-center gap-1 px-4 py-2 bg-primary-main text-white rounded-md hover:bg-primary-hover transition-colors"
              >
                Next <ChevronRight size={18} />
              </button>
            ) : (
              <button
                onClick={() => handleSubmit(false)}
                className="px-6 py-2 bg-success text-white rounded-md hover:bg-success/90 font-medium transition-colors"
              >
                Submit Test
              </button>
            )}
          </div>

          {/* Question navigator grid */}
          <div className="mt-8 bg-white rounded-lg p-4 border border-border-light">
            <p className="text-caption text-text-secondary mb-3">
              Question Navigator
            </p>
            <div className="grid grid-cols-10 gap-2">
              {Array.from({ length: totalQ }, (_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentQ(i)}
                  className={`w-8 h-8 rounded text-caption font-medium transition-colors ${
                    i === currentQ
                      ? 'bg-primary-main text-white'
                      : answers[i] !== undefined
                        ? 'bg-success text-white'
                        : 'bg-gray-100 text-text-secondary hover:bg-gray-200'
                  }`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
            <div className="flex gap-4 mt-3 text-caption text-text-secondary">
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-primary-main" /> Current
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-success" /> Answered
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-gray-100" /> Unanswered
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
