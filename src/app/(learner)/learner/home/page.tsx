'use client';

import React, { useState, useMemo, useCallback } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  Play,
  Clock,
  BookOpen,
  MapPin,
  Video,
  ExternalLink,
  CheckCircle2,
  CalendarDays,
  ClipboardCheck,
} from 'lucide-react';
import { Card, Badge, Button } from '@/components/ui';
import { useAppDispatch } from '@/store/hooks';
import { addToast } from '@/store/slices/uiSlice';
import { useMarkAttendanceMutation, type SessionData } from '@/store/slices/api/sessionApi';
import type { ProgressData } from '@/store/slices/api/progressApi';
import type { CourseData } from '@/store/slices/api/courseApi';
import type { ModuleData } from '@/store/slices/api/moduleApi';
import { GamificationHeader } from '@/components/gamification';
import { getDisplayStatus } from '@/hooks/useSessionStatus';
import { GamificationSkeleton, SessionAttendanceSkeleton, CourseSkeleton } from '@/components/skeletons';
import { useLearnerHomeData } from '@/hooks/useLearnerHomeData';

// ─── Session Attendance Card ───────────────────────────────

function SessionAttendanceCard({ session, userId }: { session: SessionData; userId: string }) {
  const dispatch = useAppDispatch();
  // const router = useRouter();
  const [attendanceCode, setAttendanceCode] = useState('');
  const [markAttendance, { isLoading: isMarking }] = useMarkAttendanceMutation();

  const userAttendance = useMemo(
    () => session.attendance.find(
      (a) => (typeof a.staff === 'string' ? a.staff : a.staff._id) === userId
    ),
    [session.attendance, userId]
  );
  const isPresent = userAttendance?.status === 'present';

  const handleMarkAttendance = useCallback(async () => {
    if (attendanceCode.length !== 6) {
      dispatch(addToast({ type: 'warning', message: 'Please enter a valid 6-digit code', duration: 3000 }));
      return;
    }
    try {
      await markAttendance({ id: session._id, body: { attendanceCode } }).unwrap();
      dispatch(addToast({ type: 'success', message: 'Attendance Marked! +30 points', duration: 3000 }));
      setAttendanceCode('');
    } catch {
      dispatch(addToast({ type: 'error', message: 'Invalid attendance code. Please try again.', duration: 4000 }));
    }
  }, [attendanceCode, markAttendance, session._id, dispatch]);

  return (
    <Card noPadding className="overflow-hidden">
      <div className="relative h-[200px] w-full bg-surface-background">
        {session.thumbnail ? (
          <Image src={session.thumbnail} alt={session.title} fill unoptimized className="object-cover" sizes="100vw" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-primary-light">
            <CalendarDays className="h-12 w-12 text-primary-main opacity-50" />
          </div>
        )}
        {getDisplayStatus(session) === 'ongoing' && (
          <div className="absolute top-sm right-sm"><Badge variant="info">Ongoing</Badge></div>
        )}
      </div>
      <div className="p-lg">
        <h3 className="text-h3 font-semibold text-text-primary line-clamp-2">{session.title}</h3>
        <div className="mt-sm flex items-center gap-xs text-body-md text-text-secondary">
          {session.mode === 'online' ? <Video className="h-4 w-4 flex-shrink-0" /> : <MapPin className="h-4 w-4 flex-shrink-0" />}
          <span className="truncate">{session.mode === 'online' ? 'Online' : session.location} &mdash; {session.timeSlot}</span>
        </div>
        <div className="mt-xs flex items-center gap-xs text-body-md text-text-secondary">
          <Clock className="h-4 w-4 flex-shrink-0" /><span>{session.duration} min</span>
        </div>
        <div className="mt-xs text-body-md text-text-secondary">
          Coach: {typeof session.instructor === 'object' && session.instructor !== null ? session.instructor.name : (session.instructor ?? 'TBD')}
        </div>
        {session.mode === 'online' && session.meetingLink && (
          <a href={session.meetingLink} target="_blank" rel="noopener noreferrer"
            className="mt-md flex items-center justify-center gap-sm rounded-sm bg-blue-600 px-md py-[10px] text-body-md font-semibold text-white transition-colors hover:bg-blue-700 min-h-[48px]">
            <ExternalLink className="h-4 w-4" /> Join Now
          </a>
        )}
        <div className="mt-md">
          {isPresent ? (
            <div className="flex items-center gap-sm rounded-md bg-success/10 px-md py-md">
              <CheckCircle2 className="h-5 w-5 text-success flex-shrink-0" />
              <Badge variant="success">Present</Badge>
            </div>
          ) : (
            <div className="space-y-sm">
              <input type="text" maxLength={6} inputMode="numeric" pattern="[0-9]*"
                placeholder="Enter 6-digit code" value={attendanceCode}
                onChange={(e) => setAttendanceCode(e.target.value.replace(/[^0-9]/g, ''))}
                className="w-full rounded-sm border border-border-light bg-surface-white px-md py-[10px] text-body-md text-text-primary text-center tracking-[4px] font-semibold placeholder:text-text-secondary placeholder:tracking-normal placeholder:font-normal focus:border-border-focus focus:outline-none focus:ring-2 focus:ring-border-focus/20 transition-colors duration-200" />
              <Button variant="primary" size="lg" isBlock isLoading={isMarking}
                onClick={handleMarkAttendance} disabled={attendanceCode.length !== 6} className="min-h-[48px]">
                Mark Attendance
              </Button>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

// ─── Course Learning Card ──────────────────────────────────

function CourseLearningCard({ course, modules, progressMap }: {
  course: CourseData; modules: ModuleData[]; progressMap: Map<string, ProgressData>;
}) {
  const router = useRouter();
  const duration = modules.reduce((acc, mod) => acc + mod.contents.reduce((s, c) => s + (c.duration || 0), 0), 0);
  const completedCount = useMemo(() => modules.filter((m) => progressMap.get(m._id)?.status === 'completed').length, [modules, progressMap]);
  const hasInProgress = useMemo(() => modules.some((m) => progressMap.get(m._id)?.status === 'in_progress'), [modules, progressMap]);
  const progressPercent = modules.length > 0 ? Math.round((completedCount / modules.length) * 100) : 0;
  const showProgress = completedCount > 0 || hasInProgress;
  const navigateToCourse = useCallback(() => router.push(`/learner/learning/course/${course._id}`), [router, course._id]);

  return (
    <Card noPadding className="overflow-hidden">
      <button type="button" className="relative h-[180px] w-full bg-surface-background block" onClick={navigateToCourse}
        aria-label={`${hasInProgress ? 'Continue' : 'Start'} ${course.title}`}>
        {course.thumbnail ? (
          <Image src={course.thumbnail} alt={course.title} fill unoptimized className="object-cover" sizes="100vw" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-primary-light">
            <BookOpen className="h-12 w-12 text-primary-main opacity-50" />
          </div>
        )}
        <div className="absolute inset-0 flex items-center justify-center bg-black/20">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/90 shadow-md">
            <Play className="h-6 w-6 text-primary-main ml-[2px]" fill="currentColor" />
          </div>
        </div>
      </button>
      <div className="p-lg">
        {course.domain && <p className="text-caption text-text-secondary font-medium uppercase tracking-wide">{course.domain}</p>}
        <div className="mt-xs flex items-center gap-md text-body-md text-text-secondary">
          {duration > 0 && <span className="flex items-center gap-xs"><Clock className="h-3.5 w-3.5" />{duration} min</span>}
          <span className="flex items-center gap-xs"><BookOpen className="h-3.5 w-3.5" />{modules.length} module{modules.length !== 1 ? 's' : ''}</span>
        </div>
        <h3 className="mt-sm text-h3 font-semibold text-text-primary line-clamp-2">{course.title}</h3>
        {course.description && <p className="mt-xs text-body-md text-text-secondary line-clamp-2">{course.description}</p>}
        {showProgress && (
          <div className="mt-md">
            <div className="flex items-center justify-between text-caption text-text-secondary">
              <span>{completedCount} of {modules.length} modules</span>
              <span className="font-semibold text-primary-main">{progressPercent}%</span>
            </div>
            <div className="mt-xs h-2 w-full overflow-hidden rounded-full bg-surface-background">
              <div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-primary-main transition-all duration-500" style={{ width: `${progressPercent}%` }} />
            </div>
          </div>
        )}
        <Button variant="primary" size="lg" isBlock leftIcon={<Play className="h-4 w-4" fill="currentColor" />}
          onClick={navigateToCourse} className="mt-md min-h-[48px]">
          {hasInProgress ? 'Continue' : 'Start'}
        </Button>
      </div>
    </Card>
  );
}

// ─── Main Page Component ───────────────────────────────────

export default function LearnerHome() {
  const router = useRouter();
  const {
    user, isLoading, totalPoints, streakCurrent, earnedBadgeNames,
    todaySessions, assignedTests, learningCourses, hasInProgressCourse,
    courseModulesMap, progressMap,
  } = useLearnerHomeData();

  return (
    <div className="space-y-xl pb-lg">
      {/* Gamification Header */}
      <section>
        {isLoading.gamification ? (
          <GamificationSkeleton />
        ) : (
          <GamificationHeader
            totalPoints={totalPoints}
            streakCurrent={streakCurrent}
            earnedBadgeNames={earnedBadgeNames}
          />
        )}
      </section>

      {/* Today's Sessions */}
      {isLoading.sessions ? (
        <section>
          <h2 className="text-h3 font-semibold text-text-primary">Loading sessions...</h2>
          <div className="mt-md grid grid-cols-1 sm:grid-cols-2 gap-md"><SessionAttendanceSkeleton /></div>
        </section>
      ) : todaySessions.length > 0 ? (
        <section>
          <h2 className="text-h3 font-semibold text-text-primary">You have a session to attend today!</h2>
          <div className="mt-md grid grid-cols-1 sm:grid-cols-2 gap-md">
            {todaySessions.map((session) => (
              <SessionAttendanceCard key={session._id} session={session} userId={user?.id ?? ''} />
            ))}
          </div>
        </section>
      ) : null}

      {/* Certification Tests */}
      {assignedTests.length > 0 && (
        <section>
          <h2 className="text-h3 font-semibold text-text-primary flex items-center gap-sm">
            <ClipboardCheck className="h-5 w-5" /> Certification Tests
          </h2>
          <div className="mt-md grid grid-cols-1 sm:grid-cols-2 gap-sm">
            {assignedTests.map((test) => {
              const hasCert = !!test.myCertification;
              const attempts = test.myAttempts?.length ?? 0;
              const maxedOut = attempts >= test.maxAttempts;
              return (
                <Card key={test._id} className="flex items-center justify-between gap-md">
                  <div className="min-w-0 space-y-xs border-l-4 border-primary-main pl-md">
                    <p className="text-body-md font-medium text-text-primary truncate">{test.title}</p>
                    <p className="text-caption text-primary-main">{test.certificationTitle}</p>
                    <p className="text-caption text-text-secondary">
                      {test.questions?.length || 0} questions
                      {test.timeLimitMinutes > 0 && ` \u00B7 ${test.timeLimitMinutes} min`}
                      {` \u00B7 ${test.passingScore}% to pass`}
                    </p>
                  </div>
                  <div className="flex-shrink-0 mt-2">
                    {hasCert ? <Badge variant="success">Certified</Badge>
                      : maxedOut ? <Badge variant="error">No attempts left</Badge>
                      : <Button size="sm" onClick={() => router.push(`/learner/test/${test._id}`)}>Take Test</Button>}
                  </div>
                </Card>
              );
            })}
          </div>
        </section>
      )}

      {/* Continue Learning */}
      <section>
        <h2 className="text-h2 font-semibold text-text-primary">
          {hasInProgressCourse ? 'Continue Learning' : "Today's Task"}
        </h2>
        {isLoading.courses ? (
          <div className="mt-md grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-md">
            <CourseSkeleton /><CourseSkeleton />
          </div>
        ) : learningCourses.length > 0 ? (
          <div className="mt-md grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-md">
            {learningCourses.map((c) => (
              <CourseLearningCard key={c._id} course={c} modules={courseModulesMap.get(c._id) ?? []} progressMap={progressMap} />
            ))}
          </div>
        ) : (
          <div className="mt-md flex flex-col items-center justify-center rounded-md bg-surface-white py-2xl px-lg text-center shadow-sm">
            <BookOpen className="h-12 w-12 text-text-disabled" />
            <p className="mt-md text-body-lg font-medium text-text-secondary">No courses assigned yet</p>
            <p className="mt-xs text-body-md text-text-disabled">Your assigned courses will appear here</p>
          </div>
        )}
      </section>
    </div>
  );
}
