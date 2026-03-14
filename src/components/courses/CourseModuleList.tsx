'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight, Star } from 'lucide-react';
import ModuleStatusIcon from './ModuleStatusIcon';

interface ModuleItem {
  _id: string;
  title: string;
  status: 'completed' | 'in_progress' | 'not_started';
  points?: number;
  isQuizPending?: boolean;
}

interface CourseModuleListProps {
  modules: ModuleItem[];
  onModuleClick?: (_moduleId: string) => void;
  defaultExpanded?: boolean;
  className?: string;
}

export default function CourseModuleList({
  modules,
  onModuleClick,
  defaultExpanded = false,
  className = '',
}: CourseModuleListProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  if (modules.length === 0) return null;

  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between rounded-md px-sm py-xs text-body-md font-medium text-text-secondary hover:text-text-primary hover:bg-surface-background transition-colors"
      >
        <span>Modules</span>
        {expanded ? (
          <ChevronDown className="h-4 w-4" />
        ) : (
          <ChevronRight className="h-4 w-4" />
        )}
      </button>

      {expanded && (
        <div className="mt-xs space-y-[2px]">
          {modules.map((mod) => (
            <button
              key={mod._id}
              type="button"
              onClick={() => onModuleClick?.(mod._id)}
              className="flex w-full items-center gap-sm rounded-md px-sm py-xs text-left hover:bg-surface-background transition-colors"
            >
              <div className="flex-shrink-0">
                <ModuleStatusIcon
                  status={mod.status}
                  isQuizPending={mod.isQuizPending}
                />
              </div>
              <span className="flex-1 text-body-md text-text-primary line-clamp-1">
                {mod.title}
              </span>
              {mod.isQuizPending ? (
                <span className="text-caption text-primary-main font-semibold bg-primary-light px-sm py-[2px] rounded-full">
                  Take Quiz
                </span>
              ) : (mod.points ?? 0) > 0 ? (
                <span className="text-caption text-amber-500 font-medium flex items-center gap-[2px]">
                  <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                  {mod.points}
                </span>
              ) : null}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
