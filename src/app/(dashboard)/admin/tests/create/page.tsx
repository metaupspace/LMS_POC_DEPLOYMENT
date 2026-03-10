'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Plus, Trash2, Check, X } from 'lucide-react';

import {
  Button,
  Card,
  Input,
  Dropdown,
  LoadingSpinner,
} from '@/components/ui';
import { useAppDispatch } from '@/store/hooks';
import { addToast } from '@/store/slices/uiSlice';
import { getErrorMessage } from '@/lib/utils/getErrorMessage';
import {
  useCreateTestMutation,
  useUpdateTestMutation,
  useGetTestByIdQuery,
  useAssignTestStaffMutation,
} from '@/store/slices/api/testApi';
import { useGetUsersQuery } from '@/store/slices/api/userApi';

// ─── Types ──────────────────────────────────────────────

interface OptionFormData {
  text: string;
  image: string;
  isCorrect: boolean;
}

interface QuestionFormData {
  id: string;
  questionText: string;
  questionImage: string;
  options: OptionFormData[];
  points: number;
}

// ─── Component ──────────────────────────────────────────

export default function CreateTestPage({ editId: editIdProp }: { editId?: string } = {}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dispatch = useAppDispatch();

  const editId = editIdProp || searchParams.get('edit');
  const isEditing = !!editId;

  // Queries & mutations
  const { data: testResponse, isLoading: loadingTest } = useGetTestByIdQuery(
    editId!,
    { skip: !editId }
  );
  const { data: usersResponse } = useGetUsersQuery({
    role: 'staff',
    status: 'active',
    limit: 500,
  });

  const [createTest, { isLoading: creating }] = useCreateTestMutation();
  const [updateTest, { isLoading: updating }] = useUpdateTestMutation();
  const [assignStaff] = useAssignTestStaffMutation();

  const staffList = usersResponse?.data ?? [];

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [domain, setDomain] = useState('');
  const [certificationTitle, setCertificationTitle] = useState('');
  const [passingScore, setPassingScore] = useState(70);
  const [maxAttempts, setMaxAttempts] = useState(1);
  const [timeLimitMinutes, setTimeLimitMinutes] = useState(60);
  const [shuffleQuestions, setShuffleQuestions] = useState(true);
  const [status, setStatus] = useState('draft');
  const [selectedStaff, setSelectedStaff] = useState<string[]>([]);

  const [questions, setQuestions] = useState<QuestionFormData[]>([
    {
      id: crypto.randomUUID(),
      questionText: '',
      questionImage: '',
      options: [
        { text: '', image: '', isCorrect: true },
        { text: '', image: '', isCorrect: false },
      ],
      points: 1,
    },
  ]);

  // Populate form when editing
  useEffect(() => {
    if (!testResponse?.data) return;
    const test = testResponse.data;
    setTitle(test.title);
    setDescription(test.description);
    setDomain(test.domain);
    setCertificationTitle(test.certificationTitle);
    setPassingScore(test.passingScore);
    setMaxAttempts(test.maxAttempts);
    setTimeLimitMinutes(test.timeLimitMinutes);
    setShuffleQuestions(test.shuffleQuestions);
    setStatus(test.status);
    setSelectedStaff(test.assignedStaff?.map((s) => s._id) || []);

    if (test.questions?.length) {
      setQuestions(
        test.questions.map((q) => ({
          id: crypto.randomUUID(),
          questionText: q.questionText,
          questionImage: q.questionImage || '',
          options: q.options.map((o) => ({
            text: o.text,
            image: o.image || '',
            isCorrect: o.isCorrect || false,
          })),
          points: q.points,
        }))
      );
    }
  }, [testResponse]);

  // ─── Question Handlers ────────────────────────────────

  const addQuestion = () => {
    setQuestions((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        questionText: '',
        questionImage: '',
        options: [
          { text: '', image: '', isCorrect: true },
          { text: '', image: '', isCorrect: false },
        ],
        points: 1,
      },
    ]);
  };

  const removeQuestion = (idx: number) => {
    if (questions.length <= 1) return;
    setQuestions((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateQuestion = (
    idx: number,
    field: keyof QuestionFormData,
    value: unknown
  ) => {
    setQuestions((prev) =>
      prev.map((q, i) => (i === idx ? { ...q, [field]: value } : q))
    );
  };

  const addOption = (qIdx: number) => {
    setQuestions((prev) =>
      prev.map((q, i) =>
        i === qIdx
          ? {
              ...q,
              options: [
                ...q.options,
                { text: '', image: '', isCorrect: false },
              ],
            }
          : q
      )
    );
  };

  const removeOption = (qIdx: number, oIdx: number) => {
    setQuestions((prev) =>
      prev.map((q, i) =>
        i === qIdx && q.options.length > 2
          ? { ...q, options: q.options.filter((_, j) => j !== oIdx) }
          : q
      )
    );
  };

  const updateOption = (
    qIdx: number,
    oIdx: number,
    field: keyof OptionFormData,
    value: unknown
  ) => {
    setQuestions((prev) =>
      prev.map((q, i) =>
        i === qIdx
          ? {
              ...q,
              options: q.options.map((o, j) => {
                if (j !== oIdx) {
                  // If marking this as correct, unmark others
                  if (field === 'isCorrect' && value === true) {
                    return { ...o, isCorrect: false };
                  }
                  return o;
                }
                return { ...o, [field]: value };
              }),
            }
          : q
      )
    );
  };

  // ─── Staff Selection ──────────────────────────────────

  const toggleStaff = (staffId: string) => {
    setSelectedStaff((prev) =>
      prev.includes(staffId)
        ? prev.filter((id) => id !== staffId)
        : [...prev, staffId]
    );
  };

  // ─── Submit ───────────────────────────────────────────

  const handleSubmit = useCallback(async () => {
    // Validate
    if (!title.trim()) {
      dispatch(addToast({ type: 'error', message: 'Title is required', duration: 4000 }));
      return;
    }
    if (!certificationTitle.trim()) {
      dispatch(
        addToast({
          type: 'error',
          message: 'Certification title is required',
          duration: 4000,
        })
      );
      return;
    }

    const hasEmptyQuestions = questions.some(
      (q) =>
        !q.questionText.trim() ||
        q.options.some((o) => !o.text.trim()) ||
        !q.options.some((o) => o.isCorrect)
    );
    if (hasEmptyQuestions) {
      dispatch(
        addToast({
          type: 'error',
          message:
            'All questions must have text, all options must have text, and each question needs a correct answer.',
          duration: 4000,
        })
      );
      return;
    }

    const testData = {
      title: title.trim(),
      description: description.trim(),
      domain: domain.trim(),
      certificationTitle: certificationTitle.trim(),
      passingScore,
      maxAttempts,
      timeLimitMinutes,
      shuffleQuestions,
      status,
      questions: questions.map((q) => ({
        questionText: q.questionText.trim(),
        questionImage: q.questionImage || undefined,
        options: q.options.map((o) => ({
          text: o.text.trim(),
          image: o.image || undefined,
          isCorrect: o.isCorrect,
        })),
        points: q.points,
      })),
    };

    try {
      let testId: string | null | undefined = editId;

      if (isEditing && editId) {
        await updateTest({ id: editId, body: testData }).unwrap();
      } else {
        const res = await createTest(testData).unwrap();
        testId = res.data?._id || res.data?.id;
      }

      // Assign staff if selected
      if (testId && selectedStaff.length > 0) {
        await assignStaff({
          testId,
          staffIds: selectedStaff,
        })
          .unwrap()
          .catch(() => {});
      }

      dispatch(
        addToast({
          type: 'success',
          message: isEditing
            ? 'Test updated successfully'
            : 'Test created successfully',
          duration: 4000,
        })
      );
      router.push('/admin/tests');
    } catch (err) {
      dispatch(
        addToast({
          type: 'error',
          message: getErrorMessage(err),
          duration: 4000,
        })
      );
    }
  }, [
    title,
    description,
    domain,
    certificationTitle,
    passingScore,
    maxAttempts,
    timeLimitMinutes,
    shuffleQuestions,
    status,
    questions,
    selectedStaff,
    editId,
    isEditing,
    createTest,
    updateTest,
    assignStaff,
    dispatch,
    router,
  ]);

  if (isEditing && loadingTest) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <LoadingSpinner variant="inline" text="Loading test..." />
      </div>
    );
  }

  return (
    <div className="space-y-lg max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-md">
        <button
          type="button"
          onClick={() => router.push('/admin/tests')}
          className="text-text-secondary hover:text-text-primary transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-h1 text-text-primary">
          {isEditing ? 'Edit Test' : 'Create Certification Test'}
        </h1>
      </div>

      {/* Basic Info */}
      <Card>
        <h2 className="text-h3 font-semibold mb-md">Test Details</h2>
        <div className="space-y-md">
          <Input
            label="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Electrician Level 1 Certification"
            required
          />
          <Input
            label="Certification Title (awarded on pass)"
            value={certificationTitle}
            onChange={(e) => setCertificationTitle(e.target.value)}
            placeholder='e.g., "Experienced Electrician - 1"'
            required
          />
          <Input
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Brief description of the test"
          />
          <Input
            label="Domain"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            placeholder="e.g., Electrical, Plumbing"
          />
        </div>
      </Card>

      {/* Test Configuration */}
      <Card>
        <h2 className="text-h3 font-semibold mb-md">Configuration</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-md">
          <div>
            <label className="text-body-md font-medium text-text-primary mb-xs block">
              Passing Score (%)
            </label>
            <input
              type="number"
              min={0}
              max={100}
              value={passingScore}
              onChange={(e) => setPassingScore(Number(e.target.value))}
              className="w-full rounded-md border border-border-main px-md py-sm text-body-md focus:border-primary-main focus:outline-none focus:ring-1 focus:ring-primary-main"
            />
          </div>
          <div>
            <label className="text-body-md font-medium text-text-primary mb-xs block">
              Max Attempts
            </label>
            <input
              type="number"
              min={1}
              max={10}
              value={maxAttempts}
              onChange={(e) => setMaxAttempts(Number(e.target.value))}
              className="w-full rounded-md border border-border-main px-md py-sm text-body-md focus:border-primary-main focus:outline-none focus:ring-1 focus:ring-primary-main"
            />
          </div>
          <div>
            <label className="text-body-md font-medium text-text-primary mb-xs block">
              Time Limit (minutes, 0 = no limit)
            </label>
            <input
              type="number"
              min={0}
              value={timeLimitMinutes}
              onChange={(e) => setTimeLimitMinutes(Number(e.target.value))}
              className="w-full rounded-md border border-border-main px-md py-sm text-body-md focus:border-primary-main focus:outline-none focus:ring-1 focus:ring-primary-main"
            />
          </div>
        </div>

        <div className="flex items-center gap-lg mt-md">
          <label className="flex items-center gap-sm cursor-pointer">
            <input
              type="checkbox"
              checked={shuffleQuestions}
              onChange={(e) => setShuffleQuestions(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-primary-main focus:ring-primary-main"
            />
            <span className="text-body-md">Shuffle questions</span>
          </label>
        </div>

        <div className="mt-md">
          <Dropdown
            label="Status"
            items={[
              { label: 'Draft', value: 'draft' },
              { label: 'Active', value: 'active' },
              { label: 'Archived', value: 'archived' },
            ]}
            value={status}
            onChange={setStatus}
            className="w-[180px]"
          />
        </div>
      </Card>

      {/* Questions */}
      <Card>
        <div className="flex items-center justify-between mb-md">
          <h2 className="text-h3 font-semibold">
            Questions ({questions.length})
          </h2>
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={addQuestion}
          >
            Add Question
          </Button>
        </div>

        <div className="space-y-lg">
          {questions.map((q, qIdx) => (
            <div
              key={q.id}
              className="border border-border-light rounded-md p-md"
            >
              <div className="flex items-start justify-between mb-sm">
                <span className="text-body-md font-medium text-text-secondary">
                  Question {qIdx + 1}
                </span>
                <div className="flex items-center gap-sm">
                  <div className="flex items-center gap-xs">
                    <label className="text-caption text-text-secondary">
                      Points:
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={q.points}
                      onChange={(e) =>
                        updateQuestion(qIdx, 'points', Number(e.target.value))
                      }
                      className="w-16 rounded border border-border-main px-sm py-xs text-caption text-center focus:border-primary-main focus:outline-none"
                    />
                  </div>
                  {questions.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeQuestion(qIdx)}
                      className="text-text-secondary hover:text-error transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>

              <textarea
                value={q.questionText}
                onChange={(e) =>
                  updateQuestion(qIdx, 'questionText', e.target.value)
                }
                placeholder="Enter question text..."
                rows={2}
                className="w-full rounded-md border border-border-main px-md py-sm text-body-md focus:border-primary-main focus:outline-none focus:ring-1 focus:ring-primary-main resize-none mb-sm"
              />

              {/* Options */}
              <div className="space-y-sm">
                {q.options.map((opt, oIdx) => (
                  <div key={oIdx} className="flex items-center gap-sm">
                    <button
                      type="button"
                      onClick={() =>
                        updateOption(qIdx, oIdx, 'isCorrect', true)
                      }
                      className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                        opt.isCorrect
                          ? 'border-success bg-success text-white'
                          : 'border-gray-300 hover:border-success'
                      }`}
                      title={
                        opt.isCorrect ? 'Correct answer' : 'Mark as correct'
                      }
                    >
                      {opt.isCorrect && <Check className="h-3 w-3" />}
                    </button>
                    <input
                      type="text"
                      value={opt.text}
                      onChange={(e) =>
                        updateOption(qIdx, oIdx, 'text', e.target.value)
                      }
                      placeholder={`Option ${String.fromCharCode(65 + oIdx)}`}
                      className="flex-1 rounded-md border border-border-main px-md py-sm text-body-md focus:border-primary-main focus:outline-none focus:ring-1 focus:ring-primary-main"
                    />
                    {q.options.length > 2 && (
                      <button
                        type="button"
                        onClick={() => removeOption(qIdx, oIdx)}
                        className="text-text-secondary hover:text-error transition-colors"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
                {q.options.length < 6 && (
                  <button
                    type="button"
                    onClick={() => addOption(qIdx)}
                    className="text-caption text-primary-main hover:underline"
                  >
                    + Add option
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Assign Staff */}
      <Card>
        <h2 className="text-h3 font-semibold mb-md">
          Assign Staff ({selectedStaff.length} selected)
        </h2>
        <div className="max-h-[300px] overflow-y-auto space-y-xs">
          {staffList.length === 0 ? (
            <p className="text-body-md text-text-secondary">
              No active staff members found.
            </p>
          ) : (
            staffList.map((user) => {
              const userId = user._id;
              const isSelected = selectedStaff.includes(userId);
              return (
                <label
                  key={userId}
                  className={`flex items-center gap-sm p-sm rounded-md cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-primary-main/5 border border-primary-main/20'
                      : 'hover:bg-surface-background'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleStaff(userId)}
                    className="h-4 w-4 rounded border-gray-300 text-primary-main focus:ring-primary-main"
                  />
                  <span className="text-body-md">
                    {user.name}{' '}
                    <span className="text-text-secondary text-caption">
                      ({user.empId})
                    </span>
                  </span>
                </label>
              );
            })
          )}
        </div>
      </Card>

      {/* Actions */}
      <div className="flex items-center justify-end gap-md pb-lg">
        <Button
          variant="secondary"
          onClick={() => router.push('/admin/tests')}
        >
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={creating || updating}>
          {creating || updating
            ? 'Saving...'
            : isEditing
              ? 'Update Test'
              : 'Create Test'}
        </Button>
      </div>
    </div>
  );
}
