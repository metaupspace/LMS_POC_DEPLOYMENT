'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  ArrowRight,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Check,
  X,
} from 'lucide-react';

import {
  Button,
  Card,
  Input,
  Dropdown,
  LoadingSpinner,
  FileUpload,
  VideoUpload,
} from '@/components/ui';
import { useAppDispatch } from '@/store/hooks';
import { addToast } from '@/store/slices/uiSlice';
import { getErrorMessage } from '@/lib/utils/getErrorMessage';
import {
  useCreateCourseMutation,
  useUpdateCourseMutation,
  useAssignCourseMutation,
  useGetCourseByIdQuery,
} from '@/store/slices/api/courseApi';
import { useCreateModuleMutation } from '@/store/slices/api/moduleApi';
import { useCreateQuizMutation } from '@/store/slices/api/quizApi';
import { useUploadFileMutation } from '@/store/slices/api/uploadApi';
import { useGetUsersQuery } from '@/store/slices/api/userApi';

// ─── Type Definitions ────────────────────────────────────────

interface ContentFormData {
  id: string;
  type: 'video' | 'text';
  title: string;
  data: string;
  duration: number;
}

interface QuizOptionFormData {
  text: string;
  isCorrect: boolean;
}

interface QuizQuestionFormData {
  id: string;
  questionText: string;
  options: QuizOptionFormData[];
  points: number;
}

interface QuizFormData {
  questions: QuizQuestionFormData[];
  passingScore: number;
  maxAttempts: number;
}

interface ModuleFormData {
  id: string;
  title: string;
  description: string;
  order: number;
  contents: ContentFormData[];
  quiz: QuizFormData | null;
  isExpanded: boolean;
}

interface CourseFormData {
  title: string;
  description: string;
  domain: string;
  passingThreshold: number;
  thumbnail: string;
  thumbnailFileName: string;
}

interface ProofOfWorkFormData {
  enabled: boolean;
  instructions: string;
  mandatory: boolean;
}

interface AssignmentFormData {
  coachId: string;
  staffIds: string[];
  staffSearch: string;
}

interface StepError {
  [field: string]: string;
}

// ─── Helper: Generate unique IDs ─────────────────────────────

let idCounter = 0;
function generateId(prefix: string): string {
  idCounter += 1;
  return `${prefix}-${Date.now()}-${idCounter}`;
}

// ─── Steps Configuration ─────────────────────────────────────

const STEPS = [
  { label: 'Basic Info', key: 'basic' },
  { label: 'Modules', key: 'modules' },
  { label: 'Proof of Work', key: 'proof' },
  { label: 'Assignment', key: 'assign' },
  { label: 'Review', key: 'review' },
] as const;

// ─── Default Creators ────────────────────────────────────────

function createDefaultContent(): ContentFormData {
  return {
    id: generateId('content'),
    type: 'video',
    title: '',
    data: '',
    duration: 0,
  };
}

function createDefaultQuizQuestion(): QuizQuestionFormData {
  return {
    id: generateId('question'),
    questionText: '',
    options: [
      { text: '', isCorrect: true },
      { text: '', isCorrect: false },
      { text: '', isCorrect: false },
      { text: '', isCorrect: false },
    ],
    points: 10,
  };
}

function createDefaultQuiz(): QuizFormData {
  return {
    questions: [createDefaultQuizQuestion()],
    passingScore: 60,
    maxAttempts: 3,
  };
}

function createDefaultModule(order: number): ModuleFormData {
  return {
    id: generateId('module'),
    title: '',
    description: '',
    order,
    contents: [],
    quiz: null,
    isExpanded: true,
  };
}

// ─── Component ───────────────────────────────────────────────

export default function CreateCoursePage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const searchParams = useSearchParams();
  const editId = searchParams.get('edit');
  const isEditMode = Boolean(editId);

  // ── Fetch existing course data for edit mode ──────────────
  const { data: existingCourseRes } = useGetCourseByIdQuery(editId!, { skip: !editId });

  // ── Step State ─────────────────────────────────────────────
  const [currentStep, setCurrentStep] = useState(0);
  const [errors, setErrors] = useState<StepError>({});

  // ── Form State ─────────────────────────────────────────────
  const [courseData, setCourseData] = useState<CourseFormData>({
    title: '',
    description: '',
    domain: '',
    passingThreshold: 70,
    thumbnail: '',
    thumbnailFileName: '',
  });

  const [modules, setModules] = useState<ModuleFormData[]>([]);

  const [proofOfWork, setProofOfWork] = useState<ProofOfWorkFormData>({
    enabled: false,
    instructions: '',
    mandatory: false,
  });

  const [assignment, setAssignment] = useState<AssignmentFormData>({
    coachId: '',
    staffIds: [],
    staffSearch: '',
  });

  const [isSaving, setIsSaving] = useState(false);

  // ── Mutations ──────────────────────────────────────────────
  const [createCourse] = useCreateCourseMutation();
  const [updateCourse] = useUpdateCourseMutation();
  const [createModule] = useCreateModuleMutation();
  const [createQuiz] = useCreateQuizMutation();
  const [assignCourse] = useAssignCourseMutation();
  const [uploadFile, { isLoading: isUploading }] = useUploadFileMutation();
  const [editLoaded, setEditLoaded] = useState(false);

  // ── Load existing course data for edit mode ─────────────────
  useEffect(() => {
    if (isEditMode && existingCourseRes?.data && !editLoaded) {
      const c = existingCourseRes.data;
      setCourseData({
        title: c.title,
        description: c.description,
        domain: c.domain || '',
        passingThreshold: c.passingThreshold ?? 70,
        thumbnail: c.thumbnail || '',
        thumbnailFileName: c.thumbnail ? 'existing-thumbnail' : '',
      });
      setProofOfWork({
        enabled: c.proofOfWorkEnabled ?? false,
        instructions: c.proofOfWorkInstructions || '',
        mandatory: c.proofOfWorkMandatory ?? false,
      });
      setAssignment((prev) => ({
        ...prev,
        coachId: c.coach
          ? typeof c.coach === 'object' ? c.coach._id : c.coach
          : '',
      }));
      setEditLoaded(true);
    }
  }, [isEditMode, existingCourseRes, editLoaded]);

  // ── User Queries (for assignment step) ─────────────────────
  const { data: coachesData } = useGetUsersQuery(
    { role: 'coach' as const, limit: 100 },
    { skip: currentStep < 3 }
  );
  const { data: staffData } = useGetUsersQuery(
    { role: 'staff' as const, limit: 100 },
    { skip: currentStep < 3 }
  );

  const coaches = coachesData?.data ?? [];
  const staffList = staffData?.data ?? [];

  const filteredStaff = assignment.staffSearch
    ? staffList.filter(
        (s) =>
          s.name.toLowerCase().includes(assignment.staffSearch.toLowerCase()) ||
          s.empId.toLowerCase().includes(assignment.staffSearch.toLowerCase())
      )
    : staffList;

  // ── Validation ─────────────────────────────────────────────

  const validateStep = useCallback(
    (step: number): boolean => {
      const newErrors: StepError = {};

      if (step === 0) {
        if (!courseData.title.trim()) newErrors.title = 'Title is required';
        if (!courseData.description.trim())
          newErrors.description = 'Description is required';
        if (
          courseData.passingThreshold < 0 ||
          courseData.passingThreshold > 100
        )
          newErrors.passingThreshold = 'Must be between 0 and 100';
      }

      if (step === 1) {
        modules.forEach((mod, mi) => {
          if (!mod.title.trim())
            newErrors[`module-${mi}-title`] = `Module ${mi + 1}: Title is required`;
          mod.contents.forEach((content, ci) => {
            if (!content.title.trim())
              newErrors[`module-${mi}-content-${ci}-title`] = `Content title is required`;
            if (!content.data.trim())
              newErrors[`module-${mi}-content-${ci}-data`] = `Content data is required`;
          });
          if (mod.quiz) {
            mod.quiz.questions.forEach((q, qi) => {
              if (!q.questionText.trim())
                newErrors[`module-${mi}-quiz-${qi}-text`] = `Question text is required`;
              const hasCorrect = q.options.some((o) => o.isCorrect);
              if (!hasCorrect)
                newErrors[`module-${mi}-quiz-${qi}-correct`] =
                  `At least one correct answer required`;
              q.options.forEach((o, oi) => {
                if (!o.text.trim())
                  newErrors[`module-${mi}-quiz-${qi}-option-${oi}`] =
                    `Option text is required`;
              });
            });
          }
        });
      }

      setErrors(newErrors);
      return Object.keys(newErrors).length === 0;
    },
    [courseData, modules]
  );

  // ── Navigation ─────────────────────────────────────────────

  const handleNext = useCallback(() => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, STEPS.length - 1));
    }
  }, [currentStep, validateStep]);

  const handleBack = useCallback(() => {
    setErrors({});
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  }, []);

  // ── Thumbnail Upload ───────────────────────────────────────

  const handleThumbnailSelect = useCallback(
    async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      try {
        const result = await uploadFile(formData).unwrap();
        if (result.data) {
          setCourseData((prev) => ({
            ...prev,
            thumbnail: result.data!.url,
            thumbnailFileName: file.name,
          }));
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
    [uploadFile, dispatch]
  );

  const handleThumbnailRemove = useCallback(() => {
    setCourseData((prev) => ({
      ...prev,
      thumbnail: '',
      thumbnailFileName: '',
    }));
  }, []);

  // ── Module Handlers ────────────────────────────────────────

  const addModule = useCallback(() => {
    setModules((prev) => [...prev, createDefaultModule(prev.length + 1)]);
  }, []);

  const removeModule = useCallback((moduleId: string) => {
    setModules((prev) => {
      const filtered = prev.filter((m) => m.id !== moduleId);
      return filtered.map((m, i) => ({ ...m, order: i + 1 }));
    });
  }, []);

  const toggleModuleExpand = useCallback((moduleId: string) => {
    setModules((prev) =>
      prev.map((m) =>
        m.id === moduleId ? { ...m, isExpanded: !m.isExpanded } : m
      )
    );
  }, []);

  const updateModule = useCallback(
    (moduleId: string, field: keyof ModuleFormData, value: string | number) => {
      setModules((prev) =>
        prev.map((m) => (m.id === moduleId ? { ...m, [field]: value } : m))
      );
    },
    []
  );

  // ── Content Handlers ───────────────────────────────────────

  const addContent = useCallback((moduleId: string) => {
    setModules((prev) =>
      prev.map((m) =>
        m.id === moduleId
          ? { ...m, contents: [...m.contents, createDefaultContent()] }
          : m
      )
    );
  }, []);

  const removeContent = useCallback((moduleId: string, contentId: string) => {
    setModules((prev) =>
      prev.map((m) =>
        m.id === moduleId
          ? { ...m, contents: m.contents.filter((c) => c.id !== contentId) }
          : m
      )
    );
  }, []);

  const updateContent = useCallback(
    (
      moduleId: string,
      contentId: string,
      field: keyof ContentFormData,
      value: string | number
    ) => {
      setModules((prev) =>
        prev.map((m) =>
          m.id === moduleId
            ? {
                ...m,
                contents: m.contents.map((c) =>
                  c.id === contentId ? { ...c, [field]: value } : c
                ),
              }
            : m
        )
      );
    },
    []
  );

  // ── Quiz Handlers ──────────────────────────────────────────

  const addQuiz = useCallback((moduleId: string) => {
    setModules((prev) =>
      prev.map((m) =>
        m.id === moduleId ? { ...m, quiz: createDefaultQuiz() } : m
      )
    );
  }, []);

  const removeQuiz = useCallback((moduleId: string) => {
    setModules((prev) =>
      prev.map((m) => (m.id === moduleId ? { ...m, quiz: null } : m))
    );
  }, []);

  const updateQuizField = useCallback(
    (moduleId: string, field: 'passingScore' | 'maxAttempts', value: number) => {
      setModules((prev) =>
        prev.map((m) =>
          m.id === moduleId && m.quiz
            ? { ...m, quiz: { ...m.quiz, [field]: value } }
            : m
        )
      );
    },
    []
  );

  const addQuizQuestion = useCallback((moduleId: string) => {
    setModules((prev) =>
      prev.map((m) =>
        m.id === moduleId && m.quiz
          ? {
              ...m,
              quiz: {
                ...m.quiz,
                questions: [...m.quiz.questions, createDefaultQuizQuestion()],
              },
            }
          : m
      )
    );
  }, []);

  const removeQuizQuestion = useCallback(
    (moduleId: string, questionId: string) => {
      setModules((prev) =>
        prev.map((m) =>
          m.id === moduleId && m.quiz
            ? {
                ...m,
                quiz: {
                  ...m.quiz,
                  questions: m.quiz.questions.filter(
                    (q) => q.id !== questionId
                  ),
                },
              }
            : m
        )
      );
    },
    []
  );

  const updateQuizQuestion = useCallback(
    (
      moduleId: string,
      questionId: string,
      field: keyof QuizQuestionFormData,
      value: string | number
    ) => {
      setModules((prev) =>
        prev.map((m) =>
          m.id === moduleId && m.quiz
            ? {
                ...m,
                quiz: {
                  ...m.quiz,
                  questions: m.quiz.questions.map((q) =>
                    q.id === questionId ? { ...q, [field]: value } : q
                  ),
                },
              }
            : m
        )
      );
    },
    []
  );

  const updateQuizOptionText = useCallback(
    (moduleId: string, questionId: string, optionIndex: number, text: string) => {
      setModules((prev) =>
        prev.map((m) =>
          m.id === moduleId && m.quiz
            ? {
                ...m,
                quiz: {
                  ...m.quiz,
                  questions: m.quiz.questions.map((q) => {
                    if (q.id !== questionId) return q;
                    const newOptions = q.options.map((o, i) =>
                      i === optionIndex ? { ...o, text } : o
                    );
                    return { ...q, options: newOptions };
                  }),
                },
              }
            : m
        )
      );
    },
    []
  );

  const setQuizOptionCorrect = useCallback(
    (moduleId: string, questionId: string, optionIndex: number) => {
      setModules((prev) =>
        prev.map((m) =>
          m.id === moduleId && m.quiz
            ? {
                ...m,
                quiz: {
                  ...m.quiz,
                  questions: m.quiz.questions.map((q) => {
                    if (q.id !== questionId) return q;
                    const newOptions = q.options.map((o, i) => ({
                      ...o,
                      isCorrect: i === optionIndex,
                    }));
                    return { ...q, options: newOptions };
                  }),
                },
              }
            : m
        )
      );
    },
    []
  );

  // ── Staff assignment handlers ──────────────────────────────

  const toggleStaff = useCallback((staffId: string) => {
    setAssignment((prev) => ({
      ...prev,
      staffIds: prev.staffIds.includes(staffId)
        ? prev.staffIds.filter((id) => id !== staffId)
        : [...prev.staffIds, staffId],
    }));
  }, []);

  const removeStaff = useCallback((staffId: string) => {
    setAssignment((prev) => ({
      ...prev,
      staffIds: prev.staffIds.filter((id) => id !== staffId),
    }));
  }, []);

  // ── Save Handler ───────────────────────────────────────────

  const handleSave = useCallback(
    async (publish: boolean) => {
      setIsSaving(true);
      try {
        let courseId: string;

        if (isEditMode && editId) {
          // Update existing course
          await updateCourse({
            id: editId,
            body: {
              title: courseData.title,
              description: courseData.description,
              domain: courseData.domain,
              thumbnail: courseData.thumbnail || undefined,
              coach: assignment.coachId || undefined,
              proofOfWorkEnabled: proofOfWork.enabled,
              proofOfWorkInstructions: proofOfWork.instructions || undefined,
              proofOfWorkMandatory: proofOfWork.mandatory,
              passingThreshold: courseData.passingThreshold,
              status: publish ? 'active' : 'draft',
            },
          }).unwrap();
          courseId = editId;
        } else {
          // 1. Create new course
          const courseResult = await createCourse({
            title: courseData.title,
            description: courseData.description,
            domain: courseData.domain,
            thumbnail: courseData.thumbnail || undefined,
            coach: assignment.coachId || undefined,
            proofOfWorkEnabled: proofOfWork.enabled,
            proofOfWorkInstructions: proofOfWork.instructions || undefined,
            proofOfWorkMandatory: proofOfWork.mandatory,
            passingThreshold: courseData.passingThreshold,
            status: publish ? 'active' : 'draft',
          }).unwrap();
          // POST returns toJSON() which renames _id → id; GET .lean() keeps _id
          const resData = courseResult.data as unknown as Record<string, unknown> | undefined;
          courseId = (resData?._id ?? resData?.id ?? '') as string;
          if (!courseId) throw new Error('Course creation failed');
        }

        // 2. Create modules (track partial failures)
        const moduleErrors: string[] = [];
        for (const mod of modules) {
          try {
            const moduleResult = await createModule({
              title: mod.title,
              description: mod.description,
              courseId,
              order: mod.order,
              contents: mod.contents.map((c) => ({
                type: c.type,
                title: c.title,
                data: c.data,
                duration: c.duration,
                downloadable: false,
              })),
            }).unwrap();

            // POST returns toJSON() which renames _id → id
            const modResData = moduleResult.data as unknown as Record<string, unknown> | undefined;
            const moduleId = (modResData?._id ?? modResData?.id ?? '') as string;

            // 3. Create quiz for this module if exists
            if (mod.quiz && mod.quiz.questions.length > 0 && moduleId) {
              try {
                await createQuiz({
                  module: moduleId,
                  questions: mod.quiz.questions.map((q) => ({
                    questionText: q.questionText,
                    questionImage: '',
                    options: q.options.map((o) => ({
                      text: o.text,
                      image: '',
                      isCorrect: o.isCorrect,
                    })),
                    points: q.points,
                  })),
                  passingScore: mod.quiz.passingScore,
                  maxAttempts: mod.quiz.maxAttempts,
                }).unwrap();
              } catch (quizErr) {
                moduleErrors.push(`Quiz for "${mod.title}": ${getErrorMessage(quizErr)}`);
              }
            }
          } catch (modErr) {
            moduleErrors.push(`Module "${mod.title}": ${getErrorMessage(modErr)}`);
          }
        }

        // 4. Assign staff if selected
        try {
          if (assignment.staffIds.length > 0) {
            await assignCourse({
              id: courseId,
              body: { staffIds: assignment.staffIds },
            }).unwrap();
          }
        } catch (assignErr) {
          moduleErrors.push(`Staff assignment: ${getErrorMessage(assignErr)}`);
        }

        if (moduleErrors.length > 0) {
          dispatch(
            addToast({
              type: 'warning',
              message: `Course saved but some items failed: ${moduleErrors[0]}`,
              duration: 6000,
            })
          );
        } else {
          dispatch(
            addToast({
              type: 'success',
              message: isEditMode
                ? 'Course updated successfully!'
                : publish
                  ? 'Course published successfully!'
                  : 'Course saved as draft.',
              duration: 4000,
            })
          );
        }
        router.push('/admin/courses');
      } catch (err) {
        dispatch(
          addToast({
            type: 'error',
            message: getErrorMessage(err),
            duration: 4000,
          })
        );
      } finally {
        setIsSaving(false);
      }
    },
    [
      courseData,
      modules,
      proofOfWork,
      assignment,
      isEditMode,
      editId,
      createCourse,
      updateCourse,
      createModule,
      createQuiz,
      assignCourse,
      dispatch,
      router,
    ]
  );

  // ── Compute summary counts ─────────────────────────────────
  const totalQuizCount = modules.filter((m) => m.quiz !== null).length;
  const selectedStaffNames = staffList.filter((s) =>
    assignment.staffIds.includes(s._id)
  );
  const selectedCoach = coaches.find((c) => c._id === assignment.coachId);

  // ── Render ─────────────────────────────────────────────────

  return (
    <div className="mx-auto max-w-4xl space-y-lg">
      {/* ── Header ────────────────────────────────────────────── */}
      <div className="flex items-center gap-md">
        <button
          type="button"
          onClick={() => router.push('/admin/courses')}
          className="flex items-center gap-xs text-body-md text-text-secondary transition-colors hover:text-text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <h1 className="text-h1 text-text-primary">{isEditMode ? 'Edit Course' : 'Create Course'}</h1>
      </div>

      {/* ── Step Indicator ────────────────────────────────────── */}
      <StepIndicator currentStep={currentStep} />

      {/* ── Saving overlay ────────────────────────────────────── */}
      {isSaving && (
        <LoadingSpinner variant="fullscreen" text="Saving course..." />
      )}

      {/* ── Step Content ──────────────────────────────────────── */}
      <Card>
        {/* Step 1: Basic Info */}
        {currentStep === 0 && (
          <div className="space-y-lg">
            <Input
              label="Title"
              value={courseData.title}
              onChange={(e) =>
                setCourseData((prev) => ({ ...prev, title: e.target.value }))
              }
              placeholder="Enter course title"
              error={errors.title}
            />
            <div className="flex flex-col gap-xs">
              <label
                htmlFor="description"
                className="text-body-md font-medium text-text-primary"
              >
                Description
              </label>
              <textarea
                id="description"
                value={courseData.description}
                onChange={(e) =>
                  setCourseData((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                placeholder="Enter course description"
                rows={4}
                className={`
                  w-full rounded-sm border bg-surface-white px-md py-[10px] text-body-md
                  text-text-primary placeholder:text-text-secondary
                  transition-colors duration-200
                  focus:border-border-focus focus:outline-none focus:ring-2 focus:ring-border-focus/20
                  ${errors.description ? 'border-error focus:border-error focus:ring-error/20' : 'border-border-light'}
                `}
              />
              {errors.description && (
                <p className="text-caption text-error" role="alert">
                  {errors.description}
                </p>
              )}
            </div>
            <Input
              label="Domain"
              value={courseData.domain}
              onChange={(e) =>
                setCourseData((prev) => ({ ...prev, domain: e.target.value }))
              }
              placeholder="e.g. Sales, Engineering, Marketing"
            />
            <Input
              label="Passing Threshold (%)"
              type="number"
              value={String(courseData.passingThreshold)}
              onChange={(e) =>
                setCourseData((prev) => ({
                  ...prev,
                  passingThreshold: Number(e.target.value),
                }))
              }
              error={errors.passingThreshold}
            />
            <div className="flex flex-col gap-xs">
              <span className="text-body-md font-medium text-text-primary">
                Thumbnail
              </span>
              <FileUpload
                accept="image/*"
                maxSizeMB={2}
                onFileSelect={handleThumbnailSelect}
                onRemove={handleThumbnailRemove}
                previewUrl={courseData.thumbnail || undefined}
                fileName={courseData.thumbnailFileName || undefined}
                error={isUploading ? 'Uploading...' : undefined}
              />
            </div>
          </div>
        )}

        {/* Step 2: Modules */}
        {currentStep === 1 && (
          <div className="space-y-lg">
            <div className="flex items-center justify-between">
              <h2 className="text-h3 text-text-primary">
                Modules ({modules.length})
              </h2>
              <Button
                size="sm"
                leftIcon={<Plus className="h-4 w-4" />}
                onClick={addModule}
              >
                Add Module
              </Button>
            </div>

            {modules.length === 0 && (
              <p className="py-xl text-center text-body-md text-text-secondary">
                No modules added yet. Click &quot;Add Module&quot; to get started.
              </p>
            )}

            {modules.map((mod, mi) => (
              <div
                key={mod.id}
                className="rounded-md border border-border-light"
              >
                {/* Module Header */}
                <div
                  className="flex cursor-pointer items-center justify-between bg-surface-background px-md py-sm"
                  onClick={() => toggleModuleExpand(mod.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ')
                      toggleModuleExpand(mod.id);
                  }}
                >
                  <span className="text-body-md font-medium text-text-primary">
                    Module {mod.order}
                    {mod.title ? `: ${mod.title}` : ''}
                  </span>
                  <div className="flex items-center gap-sm">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeModule(mod.id);
                      }}
                      className="rounded-sm p-xs text-text-secondary transition-colors hover:text-error"
                      aria-label={`Remove module ${mod.order}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                    {mod.isExpanded ? (
                      <ChevronUp className="h-4 w-4 text-text-secondary" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-text-secondary" />
                    )}
                  </div>
                </div>

                {/* Module Body */}
                {mod.isExpanded && (
                  <div className="space-y-md p-md">
                    <Input
                      label="Module Title"
                      value={mod.title}
                      onChange={(e) =>
                        updateModule(mod.id, 'title', e.target.value)
                      }
                      placeholder="Enter module title"
                      error={errors[`module-${mi}-title`]}
                    />
                    <div className="flex flex-col gap-xs">
                      <label className="text-body-md font-medium text-text-primary">
                        Module Description
                      </label>
                      <textarea
                        value={mod.description}
                        onChange={(e) =>
                          updateModule(mod.id, 'description', e.target.value)
                        }
                        placeholder="Enter module description"
                        rows={2}
                        className="w-full rounded-sm border border-border-light bg-surface-white px-md py-[10px] text-body-md text-text-primary placeholder:text-text-secondary transition-colors duration-200 focus:border-border-focus focus:outline-none focus:ring-2 focus:ring-border-focus/20"
                      />
                    </div>

                    {/* ── Contents ─────────────────────────────── */}
                    <div className="space-y-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-body-md font-medium text-text-primary">
                          Content ({mod.contents.length})
                        </span>
                        <Button
                          size="sm"
                          variant="secondary"
                          leftIcon={<Plus className="h-3 w-3" />}
                          onClick={() => addContent(mod.id)}
                        >
                          Add Content
                        </Button>
                      </div>

                      {mod.contents.map((content, ci) => (
                        <div
                          key={content.id}
                          className="rounded-sm border border-border-light p-sm"
                        >
                          <div className="mb-sm flex items-center justify-between">
                            <span className="text-caption font-medium text-text-secondary">
                              Content {ci + 1}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                removeContent(mod.id, content.id)
                              }
                              className="rounded-sm p-xs text-text-secondary transition-colors hover:text-error"
                              aria-label="Remove content"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          <div className="grid grid-cols-1 gap-sm sm:grid-cols-2">
                            <Dropdown
                              label="Type"
                              items={[
                                { label: 'Video', value: 'video' },
                                { label: 'Text', value: 'text' },
                              ]}
                              value={content.type}
                              onChange={(val) =>
                                updateContent(
                                  mod.id,
                                  content.id,
                                  'type',
                                  val
                                )
                              }
                            />
                            <Input
                              label="Title"
                              value={content.title}
                              onChange={(e) =>
                                updateContent(
                                  mod.id,
                                  content.id,
                                  'title',
                                  e.target.value
                                )
                              }
                              placeholder="Content title"
                              error={
                                errors[`module-${mi}-content-${ci}-title`]
                              }
                            />
                          </div>
                          {content.type === 'video' ? (
                            <div className="mt-sm">
                              <label className="block text-body-md font-medium text-text-primary mb-xs">
                                Video
                              </label>
                              <VideoUpload
                                value={content.data}
                                onChange={(url) =>
                                  updateContent(
                                    mod.id,
                                    content.id,
                                    'data',
                                    url
                                  )
                                }
                                onDurationDetected={(seconds) =>
                                  updateContent(
                                    mod.id,
                                    content.id,
                                    'duration',
                                    Math.ceil(seconds / 60)
                                  )
                                }
                              />
                              {errors[`module-${mi}-content-${ci}-data`] && (
                                <p className="text-error text-caption mt-1">
                                  {errors[`module-${mi}-content-${ci}-data`]}
                                </p>
                              )}
                            </div>
                          ) : (
                            <div className="mt-sm">
                              <Input
                                label="Text Content"
                                value={content.data}
                                onChange={(e) =>
                                  updateContent(
                                    mod.id,
                                    content.id,
                                    'data',
                                    e.target.value
                                  )
                                }
                                placeholder="Enter text content"
                                error={
                                  errors[`module-${mi}-content-${ci}-data`]
                                }
                              />
                            </div>
                          )}
                          <div className="mt-sm">
                            <Input
                              label="Duration (minutes)"
                              type="number"
                              value={String(content.duration)}
                              onChange={(e) =>
                                updateContent(
                                  mod.id,
                                  content.id,
                                  'duration',
                                  Number(e.target.value)
                                )
                              }
                            />
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* ── Quiz ─────────────────────────────────── */}
                    <div className="space-y-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-body-md font-medium text-text-primary">
                          Quiz
                        </span>
                        {!mod.quiz ? (
                          <Button
                            size="sm"
                            variant="secondary"
                            leftIcon={<Plus className="h-3 w-3" />}
                            onClick={() => addQuiz(mod.id)}
                          >
                            Add Quiz
                          </Button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => removeQuiz(mod.id)}
                            className="rounded-sm p-xs text-caption text-error transition-colors hover:bg-error/10"
                          >
                            Remove Quiz
                          </button>
                        )}
                      </div>

                      {mod.quiz && (
                        <div className="rounded-sm border border-border-light p-sm">
                          <div className="mb-md grid grid-cols-1 gap-sm sm:grid-cols-2">
                            <Input
                              label="Passing Score"
                              type="number"
                              value={String(mod.quiz.passingScore)}
                              onChange={(e) =>
                                updateQuizField(
                                  mod.id,
                                  'passingScore',
                                  Number(e.target.value)
                                )
                              }
                            />
                            <Input
                              label="Max Attempts"
                              type="number"
                              value={String(mod.quiz.maxAttempts)}
                              onChange={(e) =>
                                updateQuizField(
                                  mod.id,
                                  'maxAttempts',
                                  Number(e.target.value)
                                )
                              }
                            />
                          </div>

                          {mod.quiz.questions.map((question, qi) => (
                            <div
                              key={question.id}
                              className="mb-md rounded-sm border border-border-light p-sm last:mb-0"
                            >
                              <div className="mb-sm flex items-center justify-between">
                                <span className="text-caption font-medium text-text-secondary">
                                  Question {qi + 1}
                                </span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    removeQuizQuestion(mod.id, question.id)
                                  }
                                  className="rounded-sm p-xs text-text-secondary transition-colors hover:text-error"
                                  aria-label="Remove question"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                              <Input
                                label="Question"
                                value={question.questionText}
                                onChange={(e) =>
                                  updateQuizQuestion(
                                    mod.id,
                                    question.id,
                                    'questionText',
                                    e.target.value
                                  )
                                }
                                placeholder="Enter question text"
                                error={
                                  errors[`module-${mi}-quiz-${qi}-text`]
                                }
                              />
                              <div className="mt-sm space-y-sm">
                                <span className="text-caption text-text-secondary">
                                  Options (select the correct answer):
                                </span>
                                {question.options.map((option, oi) => (
                                  <div
                                    key={oi}
                                    className="flex items-center gap-sm"
                                  >
                                    <input
                                      type="radio"
                                      name={`correct-${mod.id}-${question.id}`}
                                      checked={option.isCorrect}
                                      onChange={() =>
                                        setQuizOptionCorrect(
                                          mod.id,
                                          question.id,
                                          oi
                                        )
                                      }
                                      className="h-4 w-4 accent-primary-main"
                                    />
                                    <Input
                                      value={option.text}
                                      onChange={(e) =>
                                        updateQuizOptionText(
                                          mod.id,
                                          question.id,
                                          oi,
                                          e.target.value
                                        )
                                      }
                                      placeholder={`Option ${String.fromCharCode(65 + oi)}`}
                                      error={
                                        errors[
                                          `module-${mi}-quiz-${qi}-option-${oi}`
                                        ]
                                      }
                                    />
                                  </div>
                                ))}
                                {errors[
                                  `module-${mi}-quiz-${qi}-correct`
                                ] && (
                                  <p
                                    className="text-caption text-error"
                                    role="alert"
                                  >
                                    {
                                      errors[
                                        `module-${mi}-quiz-${qi}-correct`
                                      ]
                                    }
                                  </p>
                                )}
                              </div>
                              <div className="mt-sm">
                                <Input
                                  label="Points"
                                  type="number"
                                  value={String(question.points)}
                                  onChange={(e) =>
                                    updateQuizQuestion(
                                      mod.id,
                                      question.id,
                                      'points',
                                      Number(e.target.value)
                                    )
                                  }
                                />
                              </div>
                            </div>
                          ))}

                          <Button
                            size="sm"
                            variant="ghost"
                            leftIcon={<Plus className="h-3 w-3" />}
                            onClick={() => addQuizQuestion(mod.id)}
                            className="mt-sm"
                          >
                            Add Question
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Step 3: Proof of Work */}
        {currentStep === 2 && (
          <div className="space-y-lg">
            <h2 className="text-h3 text-text-primary">Proof of Work</h2>

            {/* Toggle */}
            <label className="flex cursor-pointer items-center gap-md">
              <div className="relative">
                <input
                  type="checkbox"
                  checked={proofOfWork.enabled}
                  onChange={(e) =>
                    setProofOfWork((prev) => ({
                      ...prev,
                      enabled: e.target.checked,
                    }))
                  }
                  className="sr-only"
                />
                <div
                  className={`h-6 w-11 rounded-full transition-colors ${
                    proofOfWork.enabled
                      ? 'bg-primary-main'
                      : 'bg-border-light'
                  }`}
                >
                  <div
                    className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                      proofOfWork.enabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </div>
              </div>
              <span className="text-body-md font-medium text-text-primary">
                Enable Proof of Work
              </span>
            </label>

            {proofOfWork.enabled && (
              <div className="space-y-lg">
                <div className="flex flex-col gap-xs">
                  <label
                    htmlFor="pow-instructions"
                    className="text-body-md font-medium text-text-primary"
                  >
                    Instructions
                  </label>
                  <textarea
                    id="pow-instructions"
                    value={proofOfWork.instructions}
                    onChange={(e) =>
                      setProofOfWork((prev) => ({
                        ...prev,
                        instructions: e.target.value,
                      }))
                    }
                    placeholder="Describe what the learner must submit as proof of work..."
                    rows={4}
                    className="w-full rounded-sm border border-border-light bg-surface-white px-md py-[10px] text-body-md text-text-primary placeholder:text-text-secondary transition-colors duration-200 focus:border-border-focus focus:outline-none focus:ring-2 focus:ring-border-focus/20"
                  />
                </div>

                <label className="flex cursor-pointer items-center gap-md">
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={proofOfWork.mandatory}
                      onChange={(e) =>
                        setProofOfWork((prev) => ({
                          ...prev,
                          mandatory: e.target.checked,
                        }))
                      }
                      className="sr-only"
                    />
                    <div
                      className={`h-6 w-11 rounded-full transition-colors ${
                        proofOfWork.mandatory
                          ? 'bg-primary-main'
                          : 'bg-border-light'
                      }`}
                    >
                      <div
                        className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                          proofOfWork.mandatory
                            ? 'translate-x-5'
                            : 'translate-x-0'
                        }`}
                      />
                    </div>
                  </div>
                  <span className="text-body-md font-medium text-text-primary">
                    Mandatory
                  </span>
                </label>
              </div>
            )}
          </div>
        )}

        {/* Step 4: Assignment */}
        {currentStep === 3 && (
          <div className="space-y-lg">
            <h2 className="text-h3 text-text-primary">
              Assignment{' '}
              <span className="text-body-md font-normal text-text-secondary">
                (optional)
              </span>
            </h2>

            {/* Coach Dropdown */}
            <Dropdown
              label="Assign Coach"
              items={[
                { label: 'No Coach', value: '' },
                ...coaches.map((c) => ({
                  label: `${c.name} (${c.empId})`,
                  value: c._id,
                })),
              ]}
              value={assignment.coachId}
              onChange={(val) =>
                setAssignment((prev) => ({ ...prev, coachId: val }))
              }
              placeholder="Select a coach"
            />

            {/* Staff Multi-Select */}
            <div className="space-y-sm">
              <span className="text-body-md font-medium text-text-primary">
                Assign Staff
              </span>

              {/* Selected staff pills */}
              {assignment.staffIds.length > 0 && (
                <div className="flex flex-wrap gap-sm">
                  {selectedStaffNames.map((s) => (
                    <span
                      key={s._id}
                      className="inline-flex items-center gap-xs rounded-full bg-primary-light px-sm py-xs text-caption font-medium text-primary-main"
                    >
                      {s.name}
                      <button
                        type="button"
                        onClick={() => removeStaff(s._id)}
                        className="rounded-full p-[1px] transition-colors hover:bg-primary-main/20"
                        aria-label={`Remove ${s.name}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {/* Staff search */}
              <input
                type="text"
                value={assignment.staffSearch}
                onChange={(e) =>
                  setAssignment((prev) => ({
                    ...prev,
                    staffSearch: e.target.value,
                  }))
                }
                placeholder="Search staff by name or emp ID..."
                className="w-full rounded-sm border border-border-light bg-surface-white px-md py-[10px] text-body-md text-text-primary placeholder:text-text-secondary transition-colors duration-200 focus:border-border-focus focus:outline-none focus:ring-2 focus:ring-border-focus/20"
              />

              {/* Staff list */}
              <div className="max-h-[250px] overflow-y-auto rounded-sm border border-border-light">
                {filteredStaff.length === 0 ? (
                  <p className="px-md py-sm text-body-md text-text-secondary">
                    No staff found.
                  </p>
                ) : (
                  filteredStaff.map((s) => (
                    <label
                      key={s._id}
                      className="flex cursor-pointer items-center gap-sm px-md py-sm transition-colors hover:bg-surface-background"
                    >
                      <input
                        type="checkbox"
                        checked={assignment.staffIds.includes(s._id)}
                        onChange={() => toggleStaff(s._id)}
                        className="h-4 w-4 rounded accent-primary-main"
                      />
                      <span className="text-body-md text-text-primary">
                        {s.name}
                      </span>
                      <span className="text-caption text-text-secondary">
                        ({s.empId})
                      </span>
                    </label>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Step 5: Review */}
        {currentStep === 4 && (
          <div className="space-y-lg">
            <h2 className="text-h3 text-text-primary">Review</h2>

            <div className="space-y-md">
              {/* Course Details */}
              <div className="rounded-sm border border-border-light p-md">
                <h3 className="mb-sm text-body-md font-medium text-text-secondary">
                  Course Details
                </h3>
                <div className="space-y-sm">
                  <ReviewRow label="Title" value={courseData.title} />
                  <ReviewRow
                    label="Description"
                    value={courseData.description}
                  />
                  <ReviewRow
                    label="Domain"
                    value={courseData.domain || 'Not specified'}
                  />
                  <ReviewRow
                    label="Passing Threshold"
                    value={`${courseData.passingThreshold}%`}
                  />
                  <ReviewRow
                    label="Thumbnail"
                    value={courseData.thumbnail ? 'Uploaded' : 'None'}
                  />
                </div>
              </div>

              {/* Modules */}
              <div className="rounded-sm border border-border-light p-md">
                <h3 className="mb-sm text-body-md font-medium text-text-secondary">
                  Modules & Quizzes
                </h3>
                <div className="space-y-sm">
                  <ReviewRow
                    label="Total Modules"
                    value={String(modules.length)}
                  />
                  <ReviewRow
                    label="Total Quizzes"
                    value={String(totalQuizCount)}
                  />
                  {modules.map((mod) => (
                    <div key={mod.id} className="ml-md">
                      <p className="text-body-md text-text-primary">
                        {mod.order}. {mod.title || 'Untitled Module'}
                        <span className="ml-sm text-caption text-text-secondary">
                          ({mod.contents.length} content
                          {mod.contents.length !== 1 ? 's' : ''}
                          {mod.quiz
                            ? `, ${mod.quiz.questions.length} quiz question${mod.quiz.questions.length !== 1 ? 's' : ''}`
                            : ''}
                          )
                        </span>
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Proof of Work */}
              <div className="rounded-sm border border-border-light p-md">
                <h3 className="mb-sm text-body-md font-medium text-text-secondary">
                  Proof of Work
                </h3>
                <div className="space-y-sm">
                  <ReviewRow
                    label="Status"
                    value={proofOfWork.enabled ? 'Enabled' : 'Disabled'}
                  />
                  {proofOfWork.enabled && (
                    <>
                      <ReviewRow
                        label="Mandatory"
                        value={proofOfWork.mandatory ? 'Yes' : 'No'}
                      />
                      <ReviewRow
                        label="Instructions"
                        value={proofOfWork.instructions || 'None'}
                      />
                    </>
                  )}
                </div>
              </div>

              {/* Assignment */}
              <div className="rounded-sm border border-border-light p-md">
                <h3 className="mb-sm text-body-md font-medium text-text-secondary">
                  Assignment
                </h3>
                <div className="space-y-sm">
                  <ReviewRow
                    label="Coach"
                    value={
                      selectedCoach
                        ? `${selectedCoach.name} (${selectedCoach.empId})`
                        : 'Not assigned'
                    }
                  />
                  <ReviewRow
                    label="Assigned Staff"
                    value={
                      assignment.staffIds.length > 0
                        ? `${assignment.staffIds.length} staff member${assignment.staffIds.length !== 1 ? 's' : ''}`
                        : 'None'
                    }
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* ── Navigation Buttons ────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          {currentStep > 0 && (
            <Button
              variant="secondary"
              leftIcon={<ArrowLeft className="h-4 w-4" />}
              onClick={handleBack}
            >
              Back
            </Button>
          )}
        </div>
        <div className="flex items-center gap-sm">
          {currentStep < STEPS.length - 1 ? (
            <Button
              rightIcon={<ArrowRight className="h-4 w-4" />}
              onClick={handleNext}
            >
              Next
            </Button>
          ) : (
            <>
              <Button
                variant="secondary"
                onClick={() => handleSave(false)}
                disabled={isSaving}
              >
                Save as Draft
              </Button>
              <Button onClick={() => handleSave(true)} disabled={isSaving}>
                Publish
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Step Indicator Sub-Component ──────────────────────────────

interface StepIndicatorProps {
  currentStep: number;
}

function StepIndicator({ currentStep }: StepIndicatorProps) {
  return (
    <div className="flex items-center justify-between">
      {STEPS.map((step, index) => {
        const isCompleted = index < currentStep;
        const isActive = index === currentStep;
        const isUpcoming = index > currentStep;

        return (
          <div key={step.key} className="flex flex-1 items-center">
            {/* Step circle + label */}
            <div className="flex flex-col items-center">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-caption font-semibold transition-colors ${
                  isCompleted
                    ? 'bg-success text-white'
                    : isActive
                      ? 'bg-primary-main text-white'
                      : 'bg-border-light text-text-secondary'
                }`}
              >
                {isCompleted ? (
                  <Check className="h-4 w-4" />
                ) : (
                  index + 1
                )}
              </div>
              <span
                className={`mt-xs whitespace-nowrap text-caption ${
                  isActive
                    ? 'font-semibold text-text-primary'
                    : isCompleted
                      ? 'font-medium text-success'
                      : 'text-text-secondary'
                }`}
              >
                {step.label}
              </span>
            </div>

            {/* Connector line */}
            {index < STEPS.length - 1 && (
              <div
                className={`mx-sm mb-5 h-0.5 flex-1 ${
                  index < currentStep
                    ? 'bg-success'
                    : isUpcoming
                      ? 'bg-border-light'
                      : 'bg-border-light'
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Review Row Sub-Component ──────────────────────────────────

interface ReviewRowProps {
  label: string;
  value: string;
}

function ReviewRow({ label, value }: ReviewRowProps) {
  return (
    <div className="flex gap-md">
      <span className="min-w-[140px] text-body-md text-text-secondary">
        {label}:
      </span>
      <span className="text-body-md text-text-primary">{value}</span>
    </div>
  );
}
