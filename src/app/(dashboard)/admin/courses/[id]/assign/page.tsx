'use client';

import { useState, useMemo, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  UserCheck,
  Users,
  Search,
} from 'lucide-react';
import { useGetCourseByIdQuery, useUpdateCourseMutation, useAssignCourseMutation } from '@/store/slices/api/courseApi';
import { useGetUsersQuery } from '@/store/slices/api/userApi';
import type { UserData } from '@/store/slices/api/userApi';
import { useAppDispatch } from '@/store/hooks';
import { addToast } from '@/store/slices/uiSlice';
import { Button, Card, Badge, LoadingSpinner, Dropdown, SearchBar } from '@/components/ui';

// ─── Main Page ────────────────────────────────────────────

export default function AssignCoursePage() {
  const params = useParams();
  const dispatch = useAppDispatch();
  const id = params.id as string;

  // ── API Calls ─────────────────────────────────────────

  const { data: courseRes, isLoading: courseLoading } = useGetCourseByIdQuery(id);
  const { data: coachesRes, isLoading: coachesLoading } = useGetUsersQuery({
    role: 'coach',
    limit: 100,
    status: 'active',
  });
  const { data: staffRes, isLoading: staffLoading } = useGetUsersQuery({
    role: 'staff',
    limit: 100,
    status: 'active',
  });

  const [updateCourse, { isLoading: isUpdatingCoach }] = useUpdateCourseMutation();
  const [assignCourse, { isLoading: isAssigning }] = useAssignCourseMutation();

  // ── Derived Data ──────────────────────────────────────

  const course = courseRes?.data;
  const coaches = useMemo(() => coachesRes?.data ?? [], [coachesRes]);
  const staffList = useMemo(() => staffRes?.data ?? [], [staffRes]);
  const assignedStaffSet = useMemo(
    () => new Set((course?.assignedStaff ?? []).map((s) => typeof s === 'string' ? s : s._id)),
    [course?.assignedStaff]
  );

  // ── Local State ───────────────────────────────────────

  const [selectedCoachId, setSelectedCoachId] = useState<string>('');
  const [staffSearch, setStaffSearch] = useState('');
  const [selectedStaffIds, setSelectedStaffIds] = useState<Set<string>>(new Set());
  const [initialized, setInitialized] = useState(false);

  // Initialize selections from course data once loaded
  if (course && !initialized) {
    if (course.coach) {
      const coachId = typeof course.coach === 'object' && course.coach !== null
        ? (course.coach as unknown as { _id: string })._id
        : course.coach;
      setSelectedCoachId(coachId);
    }
    setSelectedStaffIds(new Set(course.assignedStaff.map((s) => typeof s === 'string' ? s : s._id)));
    setInitialized(true);
  }

  // ── Filtered Staff ────────────────────────────────────

  const filteredStaff = useMemo(() => {
    if (!staffSearch.trim()) return staffList;
    const query = staffSearch.toLowerCase();
    return staffList.filter(
      (s: UserData) =>
        s.name.toLowerCase().includes(query) ||
        s.empId.toLowerCase().includes(query) ||
        s.domain.toLowerCase().includes(query) ||
        s.location.toLowerCase().includes(query)
    );
  }, [staffList, staffSearch]);

  // ── Select All Logic ──────────────────────────────────

  const allFilteredSelected = filteredStaff.length > 0 && filteredStaff.every((s: UserData) => selectedStaffIds.has(s._id));
  const someFilteredSelected = filteredStaff.some((s: UserData) => selectedStaffIds.has(s._id));

  // ── Handlers ──────────────────────────────────────────

  const toggleStaff = useCallback((staffId: string) => {
    setSelectedStaffIds((prev) => {
      const next = new Set(prev);
      if (next.has(staffId)) {
        next.delete(staffId);
      } else {
        next.add(staffId);
      }
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    setSelectedStaffIds((prev) => {
      const next = new Set(prev);
      if (allFilteredSelected) {
        // Deselect all filtered
        filteredStaff.forEach((s: UserData) => next.delete(s._id));
      } else {
        // Select all filtered
        filteredStaff.forEach((s: UserData) => next.add(s._id));
      }
      return next;
    });
  }, [allFilteredSelected, filteredStaff]);

  const handleCoachAssign = async () => {
    if (!selectedCoachId) return;
    try {
      await updateCourse({ id, body: { coach: selectedCoachId } }).unwrap();
      dispatch(addToast({ type: 'success', message: 'Coach assigned successfully.', duration: 3000 }));
    } catch (err: unknown) {
      const error = err as { data?: { message?: string } };
      dispatch(
        addToast({
          type: 'error',
          message: error.data?.message ?? 'Failed to assign coach.',
          duration: 4000,
        })
      );
    }
  };

  const handleStaffAssign = async () => {
    const staffIds = Array.from(selectedStaffIds);
    if (staffIds.length === 0) {
      dispatch(addToast({ type: 'warning', message: 'Please select at least one staff member.', duration: 3000 }));
      return;
    }
    try {
      await assignCourse({ id, body: { staffIds } }).unwrap();
      dispatch(addToast({ type: 'success', message: `${staffIds.length} staff assigned successfully.`, duration: 3000 }));
    } catch (err: unknown) {
      const error = err as { data?: { message?: string } };
      dispatch(
        addToast({
          type: 'error',
          message: error.data?.message ?? 'Failed to assign staff.',
          duration: 4000,
        })
      );
    }
  };

  // ── Coach dropdown items ──────────────────────────────

  const coachItems = coaches.map((c: UserData) => ({
    label: `${c.name} (${c.empId})`,
    value: c._id,
  }));

  // ── Loading State ─────────────────────────────────────

  if (courseLoading) {
    return (
      <div className="flex items-center justify-center py-2xl">
        <LoadingSpinner variant="inline" text="Loading course..." />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="flex flex-col items-center justify-center gap-md py-2xl">
        <p className="text-body-lg text-error">Course not found.</p>
        <Link href="/admin/courses">
          <Button variant="secondary" leftIcon={<ArrowLeft className="h-4 w-4" strokeWidth={1.5} />}>
            Back to Courses
          </Button>
        </Link>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────

  const selectedCount = selectedStaffIds.size;
  const newAssignments = Array.from(selectedStaffIds).filter((sid) => !assignedStaffSet.has(sid)).length;

  return (
    <div className="space-y-lg">
      {/* Header */}
      <div className="flex items-center gap-md">
        <Link
          href={`/admin/courses/${id}`}
          className="flex h-10 w-10 items-center justify-center rounded-sm text-text-secondary transition-colors hover:bg-surface-background hover:text-text-primary"
        >
          <ArrowLeft className="h-5 w-5" strokeWidth={1.5} />
        </Link>
        <div>
          <h1 className="text-h2 text-text-primary">Assign Course</h1>
          <p className="text-body-md text-text-secondary">{course.title}</p>
        </div>
      </div>

      {/* Coach Assignment Section */}
      <Card
        header={
          <div className="flex items-center gap-sm">
            <UserCheck className="h-5 w-5 text-primary-main" strokeWidth={1.5} />
            <h3 className="text-h3 text-text-primary">Assign Coach</h3>
          </div>
        }
      >
        {coachesLoading ? (
          <LoadingSpinner variant="inline" text="Loading coaches..." />
        ) : (
          <div className="space-y-md">
            {/* Current coach display */}
            {course.coach && (() => {
              const currentCoachId = typeof course.coach === 'object' && course.coach !== null
                ? (course.coach as unknown as { _id: string })._id
                : course.coach;
              const currentCoachName = typeof course.coach === 'object' && course.coach !== null
                ? (course.coach as unknown as { name: string }).name
                : coaches.find((c: UserData) => c._id === currentCoachId)?.name ?? currentCoachId;
              return (
                <div className="flex items-center gap-sm rounded-sm bg-surface-background px-md py-sm">
                  <span className="text-caption text-text-secondary">Current Coach:</span>
                  <span className="text-body-md font-medium text-text-primary">
                    {currentCoachName}
                  </span>
                  <Badge variant="success">Assigned</Badge>
                </div>
              );
            })()}

            {/* Coach selector */}
            <div className="max-w-md">
              <Dropdown
                label="Select Coach"
                items={coachItems}
                value={selectedCoachId}
                onChange={(val) => setSelectedCoachId(val)}
                placeholder="Choose a coach..."
              />
            </div>

            <Button
              variant="primary"
              size="md"
              onClick={handleCoachAssign}
              isLoading={isUpdatingCoach}
              disabled={!selectedCoachId || selectedCoachId === (typeof course.coach === 'object' && course.coach !== null ? (course.coach as unknown as { _id: string })._id : course.coach)}
              leftIcon={<UserCheck className="h-4 w-4" strokeWidth={1.5} />}
            >
              {course.coach ? 'Change Coach' : 'Assign Coach'}
            </Button>
          </div>
        )}
      </Card>

      {/* Staff Assignment Section */}
      <Card
        header={
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-sm">
              <Users className="h-5 w-5 text-primary-main" strokeWidth={1.5} />
              <h3 className="text-h3 text-text-primary">Assign Staff</h3>
            </div>
            <div className="flex items-center gap-md">
              <span className="text-body-md text-text-secondary">
                {selectedCount} selected
                {assignedStaffSet.size > 0 && (
                  <span className="ml-xs">({assignedStaffSet.size} currently assigned)</span>
                )}
              </span>
            </div>
          </div>
        }
        footer={
          <div className="flex items-center justify-between w-full">
            <p className="text-body-md text-text-secondary">
              {newAssignments > 0 ? `${newAssignments} new assignment${newAssignments !== 1 ? 's' : ''} will be made` : 'No changes'}
            </p>
            <Button
              variant="primary"
              size="md"
              onClick={handleStaffAssign}
              isLoading={isAssigning}
              disabled={selectedCount === 0}
              leftIcon={<Users className="h-4 w-4" strokeWidth={1.5} />}
            >
              Assign Selected ({selectedCount})
            </Button>
          </div>
        }
      >
        {staffLoading ? (
          <LoadingSpinner variant="inline" text="Loading staff..." />
        ) : (
          <div className="space-y-md">
            {/* Search */}
            <div className="max-w-md">
              <SearchBar
                value={staffSearch}
                onChange={(val) => setStaffSearch(val)}
                placeholder="Search staff by name, EMP ID, domain, location..."
              />
            </div>

            {/* Staff Table */}
            {filteredStaff.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-xl">
                <Search className="mb-sm h-8 w-8 text-text-disabled" strokeWidth={1.5} />
                <p className="text-body-md text-text-secondary">
                  {staffSearch ? 'No staff match your search.' : 'No active staff members found.'}
                </p>
              </div>
            ) : (
              <>
                {/* Desktop Table */}
                <div className="hidden overflow-x-auto rounded-md border border-border-light bg-surface-white md:block">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border-light">
                        <th className="px-md py-sm text-left">
                          <label className="flex items-center gap-sm cursor-pointer">
                            <input
                              type="checkbox"
                              checked={allFilteredSelected}
                              ref={(el) => {
                                if (el) {
                                  el.indeterminate = someFilteredSelected && !allFilteredSelected;
                                }
                              }}
                              onChange={toggleSelectAll}
                              className="h-4 w-4 rounded border-border-light text-primary-main accent-primary-main cursor-pointer"
                            />
                            <span className="text-caption font-semibold uppercase tracking-wider text-text-secondary">
                              Select All
                            </span>
                          </label>
                        </th>
                        <th className="px-md py-sm text-left text-caption font-semibold uppercase tracking-wider text-text-secondary">
                          Name
                        </th>
                        <th className="px-md py-sm text-left text-caption font-semibold uppercase tracking-wider text-text-secondary">
                          EMP ID
                        </th>
                        <th className="px-md py-sm text-left text-caption font-semibold uppercase tracking-wider text-text-secondary">
                          Domain
                        </th>
                        <th className="px-md py-sm text-left text-caption font-semibold uppercase tracking-wider text-text-secondary">
                          Location
                        </th>
                        <th className="px-md py-sm text-left text-caption font-semibold uppercase tracking-wider text-text-secondary">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredStaff.map((staff: UserData) => {
                        const isSelected = selectedStaffIds.has(staff._id);
                        const wasAssigned = assignedStaffSet.has(staff._id);
                        return (
                          <tr
                            key={staff._id}
                            onClick={() => toggleStaff(staff._id)}
                            className={`
                              border-b border-border-light last:border-b-0 cursor-pointer transition-colors
                              ${isSelected ? 'bg-primary-light/40' : 'hover:bg-surface-background'}
                            `}
                          >
                            <td className="px-md py-sm">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleStaff(staff._id)}
                                onClick={(e) => e.stopPropagation()}
                                className="h-4 w-4 rounded border-border-light text-primary-main accent-primary-main cursor-pointer"
                              />
                            </td>
                            <td className="px-md py-sm text-body-md font-medium text-text-primary">
                              {staff.name}
                            </td>
                            <td className="px-md py-sm text-body-md text-text-secondary">
                              {staff.empId}
                            </td>
                            <td className="px-md py-sm text-body-md text-text-secondary">
                              {staff.domain}
                            </td>
                            <td className="px-md py-sm text-body-md text-text-secondary">
                              {staff.location}
                            </td>
                            <td className="px-md py-sm">
                              {wasAssigned ? (
                                <Badge variant="success">Assigned</Badge>
                              ) : isSelected ? (
                                <Badge variant="info">New</Badge>
                              ) : null}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Card List */}
                <div className="flex flex-col gap-sm md:hidden">
                  {filteredStaff.map((staff: UserData) => {
                    const isSelected = selectedStaffIds.has(staff._id);
                    const wasAssigned = assignedStaffSet.has(staff._id);
                    return (
                      <div
                        key={staff._id}
                        onClick={() => toggleStaff(staff._id)}
                        className={`
                          flex items-start gap-md rounded-md border border-border-light p-md cursor-pointer transition-colors
                          ${isSelected ? 'border-primary-main bg-primary-light/40' : 'bg-surface-white active:bg-surface-background'}
                        `}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleStaff(staff._id)}
                          onClick={(e) => e.stopPropagation()}
                          className="mt-[2px] h-4 w-4 rounded border-border-light text-primary-main accent-primary-main cursor-pointer"
                        />
                        <div className="flex-1 space-y-[2px]">
                          <div className="flex items-center justify-between">
                            <span className="text-body-md font-medium text-text-primary">{staff.name}</span>
                            {wasAssigned && <Badge variant="success">Assigned</Badge>}
                            {!wasAssigned && isSelected && <Badge variant="info">New</Badge>}
                          </div>
                          <p className="text-caption text-text-secondary">{staff.empId}</p>
                          <p className="text-caption text-text-secondary">{staff.domain} &middot; {staff.location}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
