'use client';

import { useState, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { BookOpen, Users, Layers } from 'lucide-react';
import { Card, Badge, SearchBar } from '@/components/ui';
import { useAppSelector } from '@/store/hooks';
import { useGetCoursesQuery, type CourseData } from '@/store/slices/api/courseApi';

// ─── Skeleton Card ─────────────────────────────────────────

function SkeletonCourseCard() {
  return (
    <div className="rounded-md bg-surface-white shadow-sm overflow-hidden animate-pulse">
      <div className="h-[160px] w-full bg-border-light" />
      <div className="p-lg space-y-md">
        <div className="h-5 w-3/4 rounded-sm bg-border-light" />
        <div className="h-6 w-20 rounded-full bg-border-light" />
        <div className="flex gap-lg">
          <div className="h-4 w-24 rounded-sm bg-border-light" />
          <div className="h-4 w-20 rounded-sm bg-border-light" />
        </div>
      </div>
    </div>
  );
}

// ─── Course Card ───────────────────────────────────────────

interface CourseCardProps {
  course: CourseData;
}

function CourseCard({ course }: CourseCardProps) {
  return (
    <Link href={`/coach/courses/${course._id}`} className="block">
      <Card noPadding hoverable className="overflow-hidden active:scale-[0.99] transition-transform">
        {/* Thumbnail */}
        <div className="relative h-[160px] w-full bg-surface-background">
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
              <BookOpen className="h-12 w-12 text-primary-main opacity-50" strokeWidth={1.5} />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-lg">
          {/* Title */}
          <h3 className="text-h3 font-semibold text-text-primary line-clamp-1">
            {course.title}
          </h3>

          {/* Domain badge */}
          <div className="mt-sm">
            <Badge variant="info">{course.domain}</Badge>
          </div>

          {/* Stats row */}
          <div className="mt-md flex items-center gap-md text-body-md text-text-secondary">
            <span className="flex items-center gap-xs">
              <Layers className="h-4 w-4 flex-shrink-0" strokeWidth={1.5} />
              {course.modules.length} Module{course.modules.length !== 1 ? 's' : ''}
            </span>
            <span className="text-text-disabled">&bull;</span>
            <span className="flex items-center gap-xs">
              <Users className="h-4 w-4 flex-shrink-0" strokeWidth={1.5} />
              {course.assignedStaff.length} Enrolled
            </span>
          </div>
        </div>
      </Card>
    </Link>
  );
}

// ─── Main Page ─────────────────────────────────────────────

export default function CoachCourses() {
  const user = useAppSelector((s) => s.auth.user);
  const [search, setSearch] = useState('');

  const { data: coursesResponse, isLoading } = useGetCoursesQuery(
    {
      coach: user?.id,
      limit: 50,
      status: 'active',
    },
    { skip: !user?.id }
  );

  const courses = useMemo(() => coursesResponse?.data ?? [], [coursesResponse?.data]);

  // Client-side search filter on title and domain
  const filteredCourses = useMemo(() => {
    if (!search.trim()) return courses;
    const query = search.toLowerCase().trim();
    return courses.filter(
      (c) =>
        c.title.toLowerCase().includes(query) ||
        c.domain.toLowerCase().includes(query)
    );
  }, [courses, search]);

  // ── Loading state ──
  if (isLoading) {
    return (
      <div className="space-y-lg">
        <h2 className="text-h2 text-text-primary">My Courses</h2>
        <div className="h-[44px] w-full rounded-sm bg-border-light animate-pulse" />
        <SkeletonCourseCard />
        <SkeletonCourseCard />
        <SkeletonCourseCard />
      </div>
    );
  }

  return (
    <div className="space-y-lg">
      <h2 className="text-h2 text-text-primary">My Courses</h2>

      {/* Search Bar */}
      <SearchBar
        value={search}
        onChange={setSearch}
        placeholder="Search by title or domain..."
        debounceMs={200}
      />

      {/* Course Cards */}
      {filteredCourses.length > 0 ? (
        <div className="space-y-md">
          {filteredCourses.map((course) => (
            <CourseCard key={course._id} course={course} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-md bg-surface-white py-2xl px-lg text-center shadow-sm">
          <BookOpen className="h-12 w-12 text-text-disabled" strokeWidth={1.5} />
          <p className="mt-md text-body-lg font-medium text-text-secondary">
            {search.trim() ? 'No courses match your search' : 'No courses assigned'}
          </p>
          <p className="mt-xs text-body-md text-text-disabled">
            {search.trim()
              ? 'Try a different search term'
              : 'Courses assigned to you will appear here'}
          </p>
        </div>
      )}
    </div>
  );
}
