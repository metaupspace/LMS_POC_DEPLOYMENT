'use client';

import { Plus, Trash2, CheckCircle2 } from 'lucide-react';
import { Button, Input } from '@/components/ui';

interface QuestionOption {
  text: string;
  image?: string;
}

interface TestQuestion {
  questionText: string;
  questionImage?: string;
  points: number;
  options: QuestionOption[];
  correctOptionIndex: number;
}

interface TestQuestionBuilderProps {
  questions: TestQuestion[];
  onChange: (_questions: TestQuestion[]) => void;
  className?: string;
}

export default function TestQuestionBuilder({
  questions,
  onChange,
  className = '',
}: TestQuestionBuilderProps) {
  const updateQuestion = (index: number, updates: Partial<TestQuestion>) => {
    const updated = [...questions];
    const existing = updated[index];
    if (!existing) return;
    updated[index] = { ...existing, ...updates };
    onChange(updated);
  };

  const addQuestion = () => {
    onChange([
      ...questions,
      {
        questionText: '',
        points: 1,
        options: [{ text: '' }, { text: '' }],
        correctOptionIndex: 0,
      },
    ]);
  };

  const removeQuestion = (index: number) => {
    if (questions.length <= 1) return;
    onChange(questions.filter((_, i) => i !== index));
  };

  const updateOption = (qIdx: number, optIdx: number, text: string) => {
    const updated = [...questions];
    const q = updated[qIdx];
    if (!q) return;
    const opts = [...q.options];
    const existingOpt = opts[optIdx];
    if (existingOpt) opts[optIdx] = { ...existingOpt, text };
    updated[qIdx] = { ...q, options: opts };
    onChange(updated);
  };

  const addOption = (qIdx: number) => {
    const updated = [...questions];
    const q = updated[qIdx];
    if (!q) return;
    updated[qIdx] = {
      ...q,
      options: [...q.options, { text: '' }],
    };
    onChange(updated);
  };

  const removeOption = (qIdx: number, optIdx: number) => {
    const q = questions[qIdx];
    if (!q || q.options.length <= 2) return;
    const updated = [...questions];
    const opts = q.options.filter((_, i) => i !== optIdx);
    let correctIdx = q.correctOptionIndex;
    if (optIdx === correctIdx) correctIdx = 0;
    else if (optIdx < correctIdx) correctIdx--;
    updated[qIdx] = { ...q, options: opts, correctOptionIndex: correctIdx };
    onChange(updated);
  };

  return (
    <div className={`space-y-lg ${className}`}>
      {questions.map((q, qIdx) => (
        <div
          key={qIdx}
          className="rounded-md border border-border-light bg-surface-white p-lg space-y-md"
        >
          <div className="flex items-center justify-between">
            <h4 className="text-body-md font-semibold text-text-primary">
              Question {qIdx + 1}
            </h4>
            {questions.length > 1 && (
              <button
                type="button"
                onClick={() => removeQuestion(qIdx)}
                className="rounded-sm p-xs text-text-secondary hover:text-error hover:bg-error/10 transition-colors"
                aria-label="Delete question"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>

          <textarea
            value={q.questionText}
            onChange={(e) => updateQuestion(qIdx, { questionText: e.target.value })}
            placeholder="Enter question text..."
            rows={2}
            className="w-full rounded-sm border border-border-light bg-surface-white px-md py-sm text-body-md text-text-primary placeholder:text-text-secondary focus:border-border-focus focus:outline-none focus:ring-2 focus:ring-border-focus/20 resize-none"
          />

          <Input
            type="number"
            label="Points"
            value={String(q.points)}
            onChange={(e) => updateQuestion(qIdx, { points: Number(e.target.value) || 1 })}
            className="w-24"
          />

          {/* Options */}
          <div className="space-y-sm">
            <p className="text-caption font-medium text-text-secondary">Options</p>
            {q.options.map((opt, optIdx) => (
              <div key={optIdx} className="flex items-center gap-sm">
                <button
                  type="button"
                  onClick={() => updateQuestion(qIdx, { correctOptionIndex: optIdx })}
                  className={`flex-shrink-0 rounded-full p-[2px] transition-colors ${
                    q.correctOptionIndex === optIdx
                      ? 'text-success'
                      : 'text-text-disabled hover:text-text-secondary'
                  }`}
                  aria-label={`Mark option ${optIdx + 1} as correct`}
                >
                  <CheckCircle2 className="h-5 w-5" />
                </button>
                <input
                  type="text"
                  value={opt.text}
                  onChange={(e) => updateOption(qIdx, optIdx, e.target.value)}
                  placeholder={`Option ${String.fromCharCode(65 + optIdx)}`}
                  className="flex-1 rounded-sm border border-border-light bg-surface-white px-md py-sm text-body-md text-text-primary placeholder:text-text-secondary focus:border-border-focus focus:outline-none focus:ring-2 focus:ring-border-focus/20"
                />
                {q.options.length > 2 && (
                  <button
                    type="button"
                    onClick={() => removeOption(qIdx, optIdx)}
                    className="flex-shrink-0 rounded-sm p-xs text-text-disabled hover:text-error transition-colors"
                    aria-label="Remove option"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={() => addOption(qIdx)}
              className="flex items-center gap-xs text-caption text-primary-main hover:underline"
            >
              <Plus className="h-3.5 w-3.5" /> Add option
            </button>
          </div>
        </div>
      ))}

      <Button
        variant="secondary"
        size="md"
        leftIcon={<Plus className="h-4 w-4" />}
        onClick={addQuestion}
      >
        Add Question
      </Button>
    </div>
  );
}
