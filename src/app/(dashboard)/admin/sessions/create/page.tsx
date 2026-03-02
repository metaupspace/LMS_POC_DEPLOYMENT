'use client';

import { useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Search } from 'lucide-react';
import Link from 'next/link';

import { Button, Card, Input, FileUpload, Dropdown, LoadingSpinner } from '@/components/ui';
import { useAppDispatch } from '@/store/hooks';
import { addToast } from '@/store/slices/uiSlice';
import { useCreateSessionMutation } from '@/store/slices/api/sessionApi';
import { useGetUsersQuery, type UserData } from '@/store/slices/api/userApi';
import { getErrorMessage } from '@/lib/utils/getErrorMessage';
import { useUploadFileMutation } from '@/store/slices/api/uploadApi';

// ─── Form Schema ────────────────────────────────────────────
// We create a client-side variant that handles string-to-date and string-to-number coercion
// matching the server-side createSessionSchema structure.

const createSessionFormSchema = z.object({
  title: z
    .string({ required_error: 'Title is required' })
    .trim()
    .min(1, 'Title is required')
    .max(200, 'Title must be at most 200 characters'),
  description: z.string().trim().optional().default(''),
  domain: z.string().trim().optional().default(''),
  location: z.string().trim().optional().default(''),
  date: z.string({ required_error: 'Date is required' }).min(1, 'Date is required'),
  timeSlot: z
    .string({ required_error: 'Time slot is required' })
    .trim()
    .min(1, 'Time slot is required'),
  duration: z.coerce
    .number({ required_error: 'Duration is required' })
    .int('Duration must be a whole number')
    .positive('Duration must be positive'),
  mode: z.enum(['offline', 'online']).optional().default('offline'),
  meetingLink: z.string().trim().optional().default(''),
  thumbnail: z.string().optional().default(''),
  instructor: z.string({ required_error: 'Instructor is required' }).min(1, 'Instructor is required'),
  enrolledStaff: z.array(z.string()).optional().default([]),
});

type CreateSessionFormData = z.infer<typeof createSessionFormSchema>;

// ─── Component ──────────────────────────────────────────────

export default function CreateSessionPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();

  // ── Mutations / Queries ─────────────────────────────────
  const [createSession, { isLoading: isCreating }] = useCreateSessionMutation();
  const [uploadFile, { isLoading: isUploading }] = useUploadFileMutation();

  // Fetch coaches for instructor dropdown
  const { data: coachesData, isLoading: isLoadingCoaches } = useGetUsersQuery({
    role: 'coach',
    limit: 100,
    status: 'active',
  });

  // Fetch staff for enrollment
  const { data: staffData, isLoading: isLoadingStaff } = useGetUsersQuery({
    role: 'staff',
    limit: 200,
    status: 'active',
  });

  const coaches = useMemo(() => coachesData?.data ?? [], [coachesData]);
  const staffList = useMemo(() => staffData?.data ?? [], [staffData]);

  // ── Staff multi-select state ────────────────────────────
  const [selectedStaffIds, setSelectedStaffIds] = useState<string[]>([]);
  const [staffSearch, setStaffSearch] = useState('');

  // ── Thumbnail state ─────────────────────────────────────
  const [thumbnailPreview, setThumbnailPreview] = useState('');
  const [thumbnailFileName, setThumbnailFileName] = useState('');

  // ── Form ────────────────────────────────────────────────
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CreateSessionFormData>({
    resolver: zodResolver(createSessionFormSchema),
    defaultValues: {
      title: '',
      description: '',
      domain: '',
      location: '',
      date: '',
      timeSlot: '',
      duration: undefined,
      mode: 'offline',
      meetingLink: '',
      thumbnail: '',
      instructor: '',
      enrolledStaff: [],
    },
  });

  const instructorValue = watch('instructor');
  const modeValue = watch('mode');

  // ── Instructor dropdown items ───────────────────────────
  const instructorItems = useMemo(
    () =>
      coaches.map((c: UserData) => ({
        label: `${c.name} (${c.empId})`,
        value: c._id,
      })),
    [coaches]
  );

  // ── Filtered staff for multi-select ─────────────────────
  const filteredStaff = useMemo(
    () =>
      staffList.filter(
        (s: UserData) =>
          s.name.toLowerCase().includes(staffSearch.toLowerCase()) ||
          s.empId.toLowerCase().includes(staffSearch.toLowerCase())
      ),
    [staffList, staffSearch]
  );

  // ── Handlers ────────────────────────────────────────────

  const handleModeChange = useCallback(
    (value: string) => {
      setValue('mode', value as 'offline' | 'online', { shouldValidate: true });
      if (value === 'offline') {
        setValue('meetingLink', '');
      }
    },
    [setValue]
  );

  const handleInstructorChange = useCallback(
    (value: string) => {
      setValue('instructor', value, { shouldValidate: true });
    },
    [setValue]
  );

  const handleStaffToggle = useCallback(
    (staffId: string) => {
      setSelectedStaffIds((prev) => {
        const next = prev.includes(staffId)
          ? prev.filter((id) => id !== staffId)
          : [...prev, staffId];
        setValue('enrolledStaff', next);
        return next;
      });
    },
    [setValue]
  );

  const handleThumbnailSelect = useCallback(
    async (file: File) => {
      try {
        const formData = new FormData();
        formData.append('file', file);
        const result = await uploadFile(formData).unwrap();
        if (result.data) {
          setValue('thumbnail', result.data.url);
          setThumbnailPreview(result.data.url);
          setThumbnailFileName(file.name);
        }
      } catch (err) {
        dispatch(
          addToast({
            type: 'error',
            message: getErrorMessage(err),
            duration: 4000,
          })
        );
      }
    },
    [uploadFile, setValue, dispatch]
  );

  const handleThumbnailRemove = useCallback(() => {
    setValue('thumbnail', '');
    setThumbnailPreview('');
    setThumbnailFileName('');
  }, [setValue]);

  const onSubmit = useCallback(
    async (formData: CreateSessionFormData) => {
      try {
        await createSession({
          title: formData.title,
          description: formData.description || '',
          domain: formData.domain || '',
          location: formData.location || '',
          date: formData.date,
          timeSlot: formData.timeSlot,
          duration: formData.duration,
          mode: formData.mode || 'offline',
          meetingLink: formData.mode === 'online' ? (formData.meetingLink || '') : '',
          thumbnail: formData.thumbnail || undefined,
          instructor: formData.instructor,
          enrolledStaff: formData.enrolledStaff,
        }).unwrap();

        dispatch(
          addToast({
            type: 'success',
            message: 'Session scheduled successfully!',
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
    },
    [createSession, dispatch, router]
  );

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
        <h1 className="text-h1 text-text-primary">Schedule Training Session</h1>
      </div>

      {/* ── Form Card ───────────────────────────────────── */}
      <Card>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-lg">
          {/* Title */}
          <Input
            label="Title"
            placeholder="Enter session title"
            error={errors.title?.message}
            {...register('title')}
          />

          {/* Description */}
          <div className="flex flex-col gap-xs">
            <label
              htmlFor="description"
              className="text-body-md font-medium text-text-primary"
            >
              Description
            </label>
            <textarea
              id="description"
              placeholder="Enter session description"
              rows={4}
              className={`w-full rounded-sm border bg-surface-white px-md py-[10px] text-body-md text-text-primary placeholder:text-text-secondary transition-colors duration-200 focus:border-border-focus focus:outline-none focus:ring-2 focus:ring-border-focus/20 ${
                errors.description
                  ? 'border-error focus:border-error focus:ring-error/20'
                  : 'border-border-light'
              }`}
              {...register('description')}
            />
            {errors.description && (
              <p className="text-caption text-error" role="alert">
                {errors.description.message}
              </p>
            )}
          </div>

          {/* Domain & Location */}
          <div className="grid grid-cols-1 gap-lg md:grid-cols-2">
            <Input
              label="Domain"
              placeholder="e.g. Sales, Engineering"
              error={errors.domain?.message}
              {...register('domain')}
            />
            <Input
              label="Location"
              placeholder="e.g. Conference Room A"
              error={errors.location?.message}
              {...register('location')}
            />
          </div>

          {/* Date, Time Slot, Duration */}
          <div className="grid grid-cols-1 gap-lg md:grid-cols-3">
            <Input
              label="Date"
              type="date"
              error={errors.date?.message}
              {...register('date')}
            />
            <Input
              label="Time Slot"
              type="time"
              error={errors.timeSlot?.message}
              {...register('timeSlot')}
            />
            <Input
              label="Duration (minutes)"
              type="number"
              placeholder="e.g. 60"
              error={errors.duration?.message}
              {...register('duration', { valueAsNumber: true })}
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
              value={modeValue ?? 'offline'}
              onChange={handleModeChange}
              placeholder="Select mode"
            />
            {modeValue === 'online' && (
              <Input
                label="Meeting Link"
                placeholder="https://meet.google.com/..."
                error={errors.meetingLink?.message}
                {...register('meetingLink')}
              />
            )}
          </div>

          {/* Thumbnail */}
          <div className="flex flex-col gap-xs">
            <label className="text-body-md font-medium text-text-primary">
              Thumbnail (optional)
            </label>
            <FileUpload
              accept="image/*"
              maxSizeMB={2}
              onFileSelect={handleThumbnailSelect}
              onRemove={handleThumbnailRemove}
              previewUrl={thumbnailPreview}
              fileName={thumbnailFileName}
              error={isUploading ? 'Uploading...' : undefined}
            />
          </div>

          {/* Instructor */}
          <div className="flex flex-col gap-xs">
            {isLoadingCoaches ? (
              <LoadingSpinner variant="inline" text="Loading instructors..." />
            ) : (
              <Dropdown
                label="Instructor"
                items={instructorItems}
                value={instructorValue}
                onChange={handleInstructorChange}
                placeholder="Select an instructor"
              />
            )}
            {errors.instructor && (
              <p className="text-caption text-error" role="alert">
                {errors.instructor.message}
              </p>
            )}
          </div>

          {/* Enrolled Staff Multi-Select */}
          <div className="flex flex-col gap-sm">
            <label className="text-body-md font-medium text-text-primary">
              Enrolled Staff ({selectedStaffIds.length} selected)
            </label>

            <div className="relative">
              <input
                type="text"
                value={staffSearch}
                onChange={(e) => setStaffSearch(e.target.value)}
                placeholder="Search staff..."
                className="w-full rounded-sm border border-border-light bg-surface-white py-[10px] pl-md pr-[40px] text-body-md text-text-primary placeholder:text-text-secondary transition-colors duration-200 focus:border-border-focus focus:outline-none focus:ring-2 focus:ring-border-focus/20"
              />
              <span className="pointer-events-none absolute right-md top-1/2 -translate-y-1/2 text-text-secondary">
                <Search className="h-4 w-4" />
              </span>
            </div>

            {isLoadingStaff ? (
              <LoadingSpinner variant="inline" text="Loading staff..." />
            ) : (
              <div className="max-h-[240px] overflow-y-auto rounded-sm border border-border-light bg-surface-white">
                {filteredStaff.length === 0 ? (
                  <p className="px-md py-sm text-body-md text-text-secondary">
                    No staff found.
                  </p>
                ) : (
                  filteredStaff.map((staff: UserData) => (
                    <label
                      key={staff._id}
                      className="flex cursor-pointer items-center gap-sm px-md py-sm transition-colors hover:bg-surface-background"
                    >
                      <input
                        type="checkbox"
                        checked={selectedStaffIds.includes(staff._id)}
                        onChange={() => handleStaffToggle(staff._id)}
                        className="h-4 w-4 rounded-sm border-border-light text-primary-main focus:ring-border-focus"
                      />
                      <span className="text-body-md text-text-primary">
                        {staff.name}
                      </span>
                      <span className="text-caption text-text-secondary">
                        ({staff.empId})
                      </span>
                    </label>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-md border-t border-border-light pt-lg">
            <Button
              type="button"
              variant="secondary"
              onClick={() => router.push('/admin/sessions')}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              isLoading={isCreating}
              disabled={isCreating || isUploading}
            >
              Schedule Session
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
