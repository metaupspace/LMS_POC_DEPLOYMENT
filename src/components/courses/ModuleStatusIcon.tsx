import { CheckCircle2, Timer, Circle, ClipboardList } from 'lucide-react';

type ModuleStatus = 'completed' | 'in_progress' | 'not_started';

interface ModuleStatusIconProps {
  status: ModuleStatus;
  isQuizPending?: boolean;
  size?: number;
}

export default function ModuleStatusIcon({
  status,
  isQuizPending = false,
  size = 16,
}: ModuleStatusIconProps) {
  if (status === 'completed') {
    return <CheckCircle2 size={size} className="text-success" strokeWidth={1.5} />;
  }
  if (isQuizPending) {
    return <ClipboardList size={size} className="text-primary-main" strokeWidth={1.5} />;
  }
  if (status === 'in_progress') {
    return <Timer size={size} className="text-amber-500" strokeWidth={1.5} />;
  }
  return <Circle size={size} className="text-text-disabled" strokeWidth={1.5} />;
}
