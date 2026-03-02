'use client';

import { useState, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowLeft,
  CalendarDays,
  MapPin,
  Clock,
  Timer,
  Layers,
  Pencil,
  Trash2,
  XCircle,
  Copy,
  Check,
  Video,
  Link as LinkIcon,
} from 'lucide-react';

import {
  Button,
  Card,
  Badge,
  Input,
  Dropdown,
  Table,
  LoadingSpinner,
  ConfirmDialog,
} from '@/components/ui';
import type { TableColumn } from '@/components/ui';
import { useAppDispatch } from '@/store/hooks';
import { addToast, openModal, closeModal } from '@/store/slices/uiSlice';
import {
  useGetSessionByIdQuery,
  useDeleteSessionMutation,
  useUpdateSessionMutation,
  useGenerateAttendanceCodeMutation,
  type PopulatedUser,
} from '@/store/slices/api/sessionApi';
import { useGetUsersQuery, type UserData } from '@/store/slices/api/userApi';
import { getErrorMessage } from '@/lib/utils/getErrorMessage';

// ─── Constants ──────────────────────────────────────────────

const DELETE_MODAL_ID = 'delete-session-confirm';
const CANCEL_MODAL_ID = 'cancel-session-confirm';

type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'default';

const statusVariantMap: Record<string, BadgeVariant> = {
  upcoming: 'warning',
  ongoing: 'info',
  completed: 'success',
  cancelled: 'error',
};

// ─── Helpers ────────────────────────────────────────────────

/** Derive a display status based on current time vs session date+timeSlot+duration. */
function getDisplayStatus(session: { status: string; date: string; timeSlot: string; duration?: number }): string {
  if (session.status !== 'upcoming') return session.status;

  const sessionDate = new Date(session.date);
  const parts = (session.timeSlot ?? '').split(':');
  const hours = Number(parts[0]);
  const minutes = Number(parts[1]);
  if (!isNaN(hours) && !isNaN(minutes)) {
    sessionDate.setHours(hours, minutes, 0, 0);
  }

  const now = Date.now();
  const startTime = sessionDate.getTime();
  const endTime = startTime + (session.duration ?? 0) * 60 * 1000;

  if (now >= endTime) return 'completed';
  if (now >= startTime) return 'ongoing';
  return 'upcoming';
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function formatExpiry(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function formatTime(time: string): string {
  if (!time) return '--';
  const parts = time.split(':');
  if (parts.length < 2) return time;
  const h = parseInt(parts[0]!, 10);
  const m = parts[1];
  if (isNaN(h)) return time;
  const ampm = h >= 12 ? 'PM' : 'AM';
  const displayHour = h % 12 || 12;
  return `${displayHour}:${m} ${ampm}`;
}

function getPopulatedName(val: string | PopulatedUser | null | undefined): string {
  if (!val) return '--';
  if (typeof val === 'string') return val;
  return `${val.name} (${val.empId})`;
}

function getPopulatedId(val: string | PopulatedUser | null | undefined): string {
  if (!val) return '';
  if (typeof val === 'string') return val;
  return val._id;
}

// ─── Attendance Row Type ────────────────────────────────────

interface AttendanceRow {
  staffId: string;
  name: string;
  empId: string;
  status: 'present' | 'absent' | 'not_marked';
  markedAt: string;
}

// ─── Component ──────────────────────────────────────────────

export default function SessionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const dispatch = useAppDispatch();

  const sessionId = params.id as string;

  // ── Queries / Mutations ─────────────────────────────────
  const { data: sessionResponse, isLoading, isError } = useGetSessionByIdQuery(sessionId);
  const [deleteSession, { isLoading: isDeleting }] = useDeleteSessionMutation();
  const [updateSession, { isLoading: isCancelling }] = useUpdateSessionMutation();
  const [generateAttendanceCode, { isLoading: isGeneratingCode }] =
    useGenerateAttendanceCodeMutation();

  // Fetch coaches and staff for edit mode dropdowns
  const { data: coachesRes } = useGetUsersQuery({ role: 'coach', limit: 100, status: 'active' });
  const { data: staffRes } = useGetUsersQuery({ role: 'staff', limit: 100, status: 'active' });
  const coaches = useMemo(() => coachesRes?.data ?? [], [coachesRes]);
  const allStaff = useMemo(() => staffRes?.data ?? [], [staffRes]);

  const session = sessionResponse?.data;

  // ── Edit state ────────────────────────────────────────────
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    domain: '',
    location: '',
    date: '',
    timeSlot: '',
    duration: 0,
    mode: 'offline' as 'offline' | 'online',
    meetingLink: '',
    instructor: '',
  });
  const [selectedStaffIds, setSelectedStaffIds] = useState<Set<string>>(new Set());
  const [staffSearch, setStaffSearch] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const startEdit = useCallback(() => {
    if (!session) return;
    setEditForm({
      title: session.title,
      description: session.description || '',
      domain: session.domain || '',
      location: session.location || '',
      date: session.date ? new Date(session.date).toISOString().split('T')[0]! : '',
      timeSlot: session.timeSlot || '',
      duration: session.duration || 0,
      mode: session.mode || 'offline',
      meetingLink: session.meetingLink || '',
      instructor: getPopulatedId(session.instructor),
    });
    // Pre-populate enrolled staff IDs
    const staffIds = (session.enrolledStaff ?? []).map((s) =>
      typeof s === 'string' ? s : s._id
    );
    setSelectedStaffIds(new Set(staffIds));
    setStaffSearch('');
    setIsEditing(true);
  }, [session]);

  const cancelEdit = useCallback(() => {
    setIsEditing(false);
  }, []);

  const saveEdit = useCallback(async () => {
    setIsSavingEdit(true);
    try {
      await updateSession({
        id: sessionId,
        body: {
          title: editForm.title,
          description: editForm.description,
          domain: editForm.domain,
          location: editForm.location,
          date: editForm.date,
          timeSlot: editForm.timeSlot,
          duration: editForm.duration,
          mode: editForm.mode,
          meetingLink: editForm.mode === 'online' ? editForm.meetingLink : '',
          instructor: editForm.instructor || undefined,
          enrolledStaff: Array.from(selectedStaffIds),
        },
      }).unwrap();
      dispatch(addToast({ type: 'success', message: 'Session updated successfully.', duration: 3000 }));
      setIsEditing(false);
    } catch (err) {
      dispatch(addToast({ type: 'error', message: getErrorMessage(err), duration: 4000 }));
    } finally {
      setIsSavingEdit(false);
    }
  }, [updateSession, sessionId, editForm, selectedStaffIds, dispatch]);

  // ── Coach dropdown items for edit mode ──────────────────
  const coachItems = useMemo(
    () => coaches.map((c: UserData) => ({ label: `${c.name} (${c.empId})`, value: c._id })),
    [coaches]
  );

  // ── Filtered staff for edit mode search ────────────────
  const filteredEditStaff = useMemo(() => {
    if (!staffSearch.trim()) return allStaff;
    const q = staffSearch.toLowerCase();
    return allStaff.filter(
      (s: UserData) =>
        s.name.toLowerCase().includes(q) ||
        s.empId.toLowerCase().includes(q)
    );
  }, [allStaff, staffSearch]);

  // ── Attendance code display state ───────────────────────
  const [attendanceCode, setAttendanceCode] = useState<string | null>(null);
  const [codeExpiresAt, setCodeExpiresAt] = useState<string | null>(null);
  const [codeCopied, setCodeCopied] = useState(false);

  // ── Attendance data ─────────────────────────────────────
  const attendanceRows: AttendanceRow[] = useMemo(() => {
    if (!session) return [];

    const attendanceMap = new Map<string, { status: string; markedAt: string }>();
    (session.attendance ?? []).forEach((record) => {
      const staffKey = getPopulatedId(record.staff) || (typeof record.staff === 'string' ? record.staff : '');
      attendanceMap.set(staffKey, { status: record.status, markedAt: record.markedAt });
    });

    return (session.enrolledStaff ?? []).map((staff) => {
      const staffId = getPopulatedId(staff) || (typeof staff === 'string' ? staff : '');
      const staffName = typeof staff === 'object' && staff !== null ? staff.name : staffId;
      const staffEmpId = typeof staff === 'object' && staff !== null ? staff.empId : staffId;
      const record = attendanceMap.get(staffId);
      return {
        staffId,
        name: staffName,
        empId: staffEmpId,
        status: record ? (record.status as 'present' | 'absent') : ('not_marked' as const),
        markedAt: record?.markedAt ?? '',
      };
    });
  }, [session]);

  const presentCount = useMemo(
    () => attendanceRows.filter((r) => r.status === 'present').length,
    [attendanceRows]
  );

  // ── Attendance Table Columns ────────────────────────────
  const attendanceColumns: TableColumn<AttendanceRow>[] = useMemo(
    () => [
      {
        key: 'name',
        label: 'Name',
      },
      {
        key: 'empId',
        label: 'EMP-ID',
      },
      {
        key: 'status',
        label: 'Status',
        render: (value: unknown) => {
          const status = value as string;
          if (status === 'present') {
            return <Badge variant="success">Present</Badge>;
          }
          if (status === 'absent') {
            return <Badge variant="error">Absent</Badge>;
          }
          return <Badge variant="default">Not Marked</Badge>;
        },
      },
      {
        key: 'markedAt',
        label: 'Marked At',
        render: (value: unknown) => {
          const dateStr = value as string;
          if (!dateStr) return <span className="text-text-secondary">--</span>;
          return <span>{formatExpiry(dateStr)}</span>;
        },
      },
    ],
    []
  );

  // ── Handlers ────────────────────────────────────────────

  const handleGenerateCode = useCallback(async () => {
    try {
      const result = await generateAttendanceCode(sessionId).unwrap();
      if (result.data) {
        setAttendanceCode(result.data.attendanceCode);
        setCodeExpiresAt(result.data.expiresAt);
      }
      dispatch(
        addToast({
          type: 'success',
          message: 'Attendance code generated successfully!',
          duration: 4000,
        })
      );
    } catch (err) {
      dispatch(
        addToast({
          type: 'error',
          message: getErrorMessage(err),
          duration: 4000,
        })
      );
    }
  }, [generateAttendanceCode, sessionId, dispatch]);

  const handleCopyCode = useCallback(() => {
    if (attendanceCode) {
      navigator.clipboard.writeText(attendanceCode);
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    }
  }, [attendanceCode]);

  const handleCancelSession = useCallback(async () => {
    try {
      await updateSession({
        id: sessionId,
        body: { status: 'cancelled' },
      }).unwrap();
      dispatch(closeModal());
      dispatch(
        addToast({
          type: 'success',
          message: 'Session has been cancelled.',
          duration: 4000,
        })
      );
    } catch (err) {
      dispatch(
        addToast({
          type: 'error',
          message: getErrorMessage(err),
          duration: 4000,
        })
      );
    }
  }, [updateSession, sessionId, dispatch]);

  const handleDeleteSession = useCallback(async () => {
    try {
      await deleteSession(sessionId).unwrap();
      dispatch(closeModal());
      dispatch(
        addToast({
          type: 'success',
          message: 'Session has been deleted.',
          duration: 4000,
        })
      );
      router.push('/admin/sessions');
    } catch (err) {
      dispatch(
        addToast({
          type: 'error',
          message: getErrorMessage(err),
          duration: 4000,
        })
      );
    }
  }, [deleteSession, sessionId, dispatch, router]);

  // ── Loading / Error States ──────────────────────────────

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <LoadingSpinner variant="inline" text="Loading session..." />
      </div>
    );
  }

  if (isError || !session) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-md">
        <p className="text-body-lg text-error">Failed to load session details.</p>
        <Button variant="secondary" onClick={() => router.push('/admin/sessions')}>
          Back to Sessions
        </Button>
      </div>
    );
  }

  const enrolledCount = session.enrolledStaff?.length ?? 0;

  // ── Render ──────────────────────────────────────────────

  return (
    <div className="space-y-lg">
      {/* ── Header ──────────────────────────────────────── */}
      <div className="flex items-center gap-md">
        <Link
          href="/admin/sessions"
          className="flex h-8 w-8 items-center justify-center rounded-sm text-text-secondary transition-colors hover:bg-surface-background hover:text-text-primary"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-h1 text-text-primary">Session Details</h1>
      </div>

      {/* ── Session Info Card ───────────────────────────── */}
      <Card>
        {isEditing ? (
          /* ── Edit Mode ────────────────────────────────── */
          <div className="space-y-lg">
            <h2 className="text-h3 text-text-primary">Edit Session</h2>
            <Input
              label="Title"
              value={editForm.title}
              onChange={(e) => setEditForm((prev) => ({ ...prev, title: e.target.value }))}
            />
            <div className="flex flex-col gap-xs">
              <label htmlFor="edit-desc" className="text-body-md font-medium text-text-primary">Description</label>
              <textarea
                id="edit-desc"
                value={editForm.description}
                onChange={(e) => setEditForm((prev) => ({ ...prev, description: e.target.value }))}
                rows={3}
                className="w-full rounded-sm border border-border-light bg-surface-white px-md py-[10px] text-body-md text-text-primary placeholder:text-text-secondary transition-colors duration-200 focus:border-border-focus focus:outline-none focus:ring-2 focus:ring-border-focus/20"
              />
            </div>
            <div className="grid grid-cols-1 gap-lg md:grid-cols-2">
              <Input
                label="Domain"
                value={editForm.domain}
                onChange={(e) => setEditForm((prev) => ({ ...prev, domain: e.target.value }))}
              />
              <Input
                label="Location"
                value={editForm.location}
                onChange={(e) => setEditForm((prev) => ({ ...prev, location: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-1 gap-lg md:grid-cols-3">
              <Input
                label="Date"
                type="date"
                value={editForm.date}
                onChange={(e) => setEditForm((prev) => ({ ...prev, date: e.target.value }))}
              />
              <Input
                label="Time Slot"
                type="time"
                value={editForm.timeSlot}
                onChange={(e) => setEditForm((prev) => ({ ...prev, timeSlot: e.target.value }))}
              />
              <Input
                label="Duration (minutes)"
                type="number"
                value={String(editForm.duration)}
                onChange={(e) => setEditForm((prev) => ({ ...prev, duration: Number(e.target.value) }))}
              />
            </div>

            {/* Session Mode & Meeting Link */}
            <div className="grid grid-cols-1 gap-lg md:grid-cols-2">
              <Dropdown
                label="Session Mode"
                items={[
                  { label: 'Offline (In-person)', value: 'offline' },
                  { label: 'Online (Virtual)', value: 'online' },
                ]}
                value={editForm.mode}
                onChange={(val) => setEditForm((prev) => ({
                  ...prev,
                  mode: val as 'offline' | 'online',
                  meetingLink: val === 'offline' ? '' : prev.meetingLink,
                }))}
                placeholder="Select mode"
              />
              {editForm.mode === 'online' && (
                <Input
                  label="Meeting Link"
                  placeholder="https://meet.google.com/..."
                  value={editForm.meetingLink}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, meetingLink: e.target.value }))}
                />
              )}
            </div>

            {/* Instructor */}
            <Dropdown
              label="Instructor"
              items={coachItems}
              value={editForm.instructor}
              onChange={(val) => setEditForm((prev) => ({ ...prev, instructor: val }))}
              placeholder="Select Instructor..."
            />

            {/* Enrolled Staff */}
            <div className="flex flex-col gap-xs">
              <label className="text-body-md font-medium text-text-primary">
                Enrolled Staff ({selectedStaffIds.size} selected)
              </label>
              <Input
                placeholder="Search staff by name or EMP ID..."
                value={staffSearch}
                onChange={(e) => setStaffSearch(e.target.value)}
              />
              <div className="max-h-60 overflow-y-auto rounded-sm border border-border-light bg-surface-white p-sm">
                {filteredEditStaff.length === 0 ? (
                  <p className="py-sm text-center text-caption text-text-secondary">No staff found</p>
                ) : (
                  filteredEditStaff.map((staff: UserData) => (
                    <label
                      key={staff._id}
                      className="flex cursor-pointer items-center gap-sm rounded-sm px-sm py-xs transition-colors hover:bg-surface-background"
                    >
                      <input
                        type="checkbox"
                        checked={selectedStaffIds.has(staff._id)}
                        onChange={(e) => {
                          setSelectedStaffIds((prev) => {
                            const next = new Set(prev);
                            if (e.target.checked) {
                              next.add(staff._id);
                            } else {
                              next.delete(staff._id);
                            }
                            return next;
                          });
                        }}
                        className="h-4 w-4 rounded border-border-light text-primary-main accent-primary-main"
                      />
                      <span className="text-body-md text-text-primary">{staff.name}</span>
                      <span className="text-caption text-text-secondary">({staff.empId})</span>
                    </label>
                  ))
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-md border-t border-border-light pt-lg">
              <Button variant="secondary" onClick={cancelEdit}>Cancel</Button>
              <Button isLoading={isSavingEdit} onClick={saveEdit}>Save Changes</Button>
            </div>
          </div>
        ) : (
          /* ── View Mode ────────────────────────────────── */
          <div className="flex flex-col gap-lg lg:flex-row">
            {/* Thumbnail */}
            {session.thumbnail ? (
              <Image
                src={session.thumbnail}
                alt={session.title}
                width={320}
                height={220}
                className="h-[200px] w-full rounded-md object-cover lg:h-[220px] lg:w-[320px]"
                unoptimized
              />
            ) : (
              <div className="flex h-[200px] w-full items-center justify-center rounded-md bg-surface-background lg:h-[220px] lg:w-[320px]">
                <CalendarDays className="h-12 w-12 text-text-disabled" />
              </div>
            )}

            {/* Details */}
            <div className="flex-1 space-y-md">
              <h2 className="text-h2 text-text-primary">{session.title}</h2>
              {session.description && (
                <p className="text-body-md text-text-secondary">
                  {session.description}
                </p>
              )}

              {/* Info Grid */}
              <div className="grid grid-cols-1 gap-md sm:grid-cols-2 lg:grid-cols-3">
                <div className="flex items-center gap-sm">
                  <Layers className="h-4 w-4 text-text-secondary" />
                  <div>
                    <p className="text-caption text-text-secondary">Domain</p>
                    <p className="text-body-md font-medium text-text-primary">
                      {session.domain || '--'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-sm">
                  <MapPin className="h-4 w-4 text-text-secondary" />
                  <div>
                    <p className="text-caption text-text-secondary">Location</p>
                    <p className="text-body-md font-medium text-text-primary">
                      {session.location || '--'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-sm">
                  <CalendarDays className="h-4 w-4 text-text-secondary" />
                  <div>
                    <p className="text-caption text-text-secondary">Date</p>
                    <p className="text-body-md font-medium text-text-primary">
                      {formatDate(session.date)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-sm">
                  <Clock className="h-4 w-4 text-text-secondary" />
                  <div>
                    <p className="text-caption text-text-secondary">Time Slot</p>
                    <p className="text-body-md font-medium text-text-primary">
                      {formatTime(session.timeSlot)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-sm">
                  <Timer className="h-4 w-4 text-text-secondary" />
                  <div>
                    <p className="text-caption text-text-secondary">Duration</p>
                    <p className="text-body-md font-medium text-text-primary">
                      {session.duration} min
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-sm">
                  <Video className="h-4 w-4 text-text-secondary" />
                  <div>
                    <p className="text-caption text-text-secondary">Mode</p>
                    <Badge variant={session.mode === 'online' ? 'info' : 'default'}>
                      {session.mode === 'online' ? 'Online' : 'Offline'}
                    </Badge>
                  </div>
                </div>

                <div className="flex items-center gap-sm">
                  <div>
                    <p className="text-caption text-text-secondary">Status</p>
                    <Badge variant={statusVariantMap[getDisplayStatus(session)] ?? 'default'}>
                      {getDisplayStatus(session).charAt(0).toUpperCase() + getDisplayStatus(session).slice(1)}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Meeting Link (online sessions) */}
              {session.mode === 'online' && session.meetingLink && (
                <div className="flex items-center gap-sm">
                  <LinkIcon className="h-4 w-4 text-text-secondary" />
                  <div>
                    <p className="text-caption text-text-secondary">Meeting Link</p>
                    <a
                      href={session.meetingLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-body-md font-medium text-primary-main hover:underline break-all"
                    >
                      {session.meetingLink}
                    </a>
                  </div>
                </div>
              )}

              {/* Instructor */}
              <div>
                <p className="text-caption text-text-secondary">Instructor</p>
                <p className="text-body-md font-medium text-text-primary">
                  {getPopulatedName(session.instructor)}
                </p>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* ── Attendance Section ──────────────────────────── */}
      <Card>
        <div className="space-y-lg">
          <div className="flex flex-col gap-md sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-h3 text-text-primary">
              Attendance ({presentCount}/{enrolledCount})
            </h3>
            <Button
              variant="primary"
              size="sm"
              isLoading={isGeneratingCode}
              onClick={handleGenerateCode}
              disabled={session.status === 'cancelled'}
            >
              Generate Code
            </Button>
          </div>

          {/* Attendance Code Display */}
          {attendanceCode && (
            <div className="rounded-md border border-border-light bg-primary-light p-lg">
              <p className="text-caption text-text-secondary">Attendance Code</p>
              <div className="mt-sm flex items-center gap-md">
                <span className="text-[32px] font-bold tracking-[0.3em] text-primary-main">
                  {attendanceCode}
                </span>
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="flex items-center gap-xs rounded-sm px-sm py-xs text-body-md text-primary-main transition-colors hover:bg-primary-main/10"
                >
                  {codeCopied ? (
                    <>
                      <Check className="h-4 w-4" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      Copy
                    </>
                  )}
                </button>
              </div>
              {codeExpiresAt && (
                <p className="mt-sm text-caption text-text-secondary">
                  Expires at: {formatExpiry(codeExpiresAt)}
                </p>
              )}
            </div>
          )}

          {/* Attendance Table */}
          {enrolledCount === 0 ? (
            <p className="text-body-md text-text-secondary">
              No staff enrolled in this session.
            </p>
          ) : (
            <Table<AttendanceRow>
              columns={attendanceColumns}
              data={attendanceRows}
              rowKey="staffId"
              emptyMessage="No attendance records."
            />
          )}
        </div>
      </Card>

      {/* ── Action Buttons ──────────────────────────────── */}
      {!isEditing && (
        <div className="flex flex-wrap items-center gap-md">
          <Button
            variant="secondary"
            leftIcon={<Pencil className="h-4 w-4" />}
            onClick={startEdit}
          >
            Edit
          </Button>

          {session.status !== 'cancelled' && (
            <Button
              variant="secondary"
              leftIcon={<XCircle className="h-4 w-4" />}
              onClick={() => dispatch(openModal(CANCEL_MODAL_ID))}
            >
              Cancel Session
            </Button>
          )}

          <Button
            variant="danger"
            leftIcon={<Trash2 className="h-4 w-4" />}
            onClick={() => dispatch(openModal(DELETE_MODAL_ID))}
          >
            Delete
          </Button>
        </div>
      )}

      {/* ── Cancel Confirm Dialog ───────────────────────── */}
      <ConfirmDialog
        modalId={CANCEL_MODAL_ID}
        title="Cancel Session"
        message={`Are you sure you want to cancel "${session.title}"? This will mark the session as cancelled.`}
        confirmLabel="Cancel Session"
        variant="danger"
        isLoading={isCancelling}
        onConfirm={handleCancelSession}
      />

      {/* ── Delete Confirm Dialog ───────────────────────── */}
      <ConfirmDialog
        modalId={DELETE_MODAL_ID}
        title="Delete Session"
        message={`Are you sure you want to delete "${session.title}"? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        isLoading={isDeleting}
        onConfirm={handleDeleteSession}
      />
    </div>
  );
}
