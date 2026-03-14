'use client';

import { useState, useCallback } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { Button, Badge } from '@/components/ui';

interface AttendanceCodeInputProps {
  isPresent: boolean;
  onSubmit: (_code: string) => Promise<void>;
  isLoading?: boolean;
}

export default function AttendanceCodeInput({ isPresent, onSubmit, isLoading }: AttendanceCodeInputProps) {
  const [code, setCode] = useState('');

  const handleSubmit = useCallback(async () => {
    await onSubmit(code);
    setCode('');
  }, [code, onSubmit]);

  if (isPresent) {
    return (
      <div className="flex items-center gap-sm rounded-md bg-success/10 px-md py-md">
        <CheckCircle2 className="h-5 w-5 text-success flex-shrink-0" />
        <Badge variant="success">Present</Badge>
      </div>
    );
  }

  return (
    <div className="space-y-sm">
      <input
        type="text"
        maxLength={6}
        inputMode="numeric"
        pattern="[0-9]*"
        placeholder="Enter 6-digit code"
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, ''))}
        className="
          w-full rounded-sm border border-border-light bg-surface-white
          px-md py-[10px] text-body-md text-text-primary text-center
          tracking-[4px] font-semibold
          placeholder:text-text-secondary placeholder:tracking-normal placeholder:font-normal
          focus:border-border-focus focus:outline-none focus:ring-2 focus:ring-border-focus/20
          transition-colors duration-200
        "
      />
      <Button
        variant="primary"
        size="lg"
        isBlock
        isLoading={isLoading}
        onClick={handleSubmit}
        disabled={code.length !== 6}
        className="min-h-[48px]"
      >
        Mark Attendance
      </Button>
    </div>
  );
}
