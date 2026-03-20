import { CheckCircle, Clock, AlertCircle, Ban, Play } from 'lucide-react';

type StatusType =
  | 'completed' | 'ongoing' | 'upcoming' | 'cancelled'
  | 'active' | 'draft' | 'archived'
  | 'approved' | 'pending' | 'rejected'
  | 'passed' | 'failed'
  | 'in_progress' | 'not_started'
  | 'certified' | 'exhausted';

interface StatusBadgeProps {
  status: StatusType;
  size?: 'sm' | 'md';
  className?: string;
}

const STATUS_CONFIG: Record<StatusType, { label: string; color: string; bg: string; icon?: any }> = {
  completed: { label: 'Completed', color: 'text-green-600', bg: 'bg-green-50', icon: CheckCircle },
  ongoing: { label: 'Ongoing', color: 'text-blue-600', bg: 'bg-blue-50', icon: Play },
  upcoming: { label: 'Upcoming', color: 'text-yellow-600', bg: 'bg-yellow-50', icon: Clock },
  cancelled: { label: 'Cancelled', color: 'text-red-600', bg: 'bg-red-50', icon: Ban },
  active: { label: 'Active', color: 'text-green-600', bg: 'bg-green-50' },
  draft: { label: 'Draft', color: 'text-yellow-600', bg: 'bg-yellow-50' },
  archived: { label: 'Archived', color: 'text-gray-500', bg: 'bg-gray-100' },
  approved: { label: 'Approved', color: 'text-green-600', bg: 'bg-green-50', icon: CheckCircle },
  pending: { label: 'Pending', color: 'text-yellow-600', bg: 'bg-yellow-50', icon: Clock },
  rejected: { label: 'Rejected', color: 'text-red-600', bg: 'bg-red-50', icon: AlertCircle },
  passed: { label: 'Passed', color: 'text-green-600', bg: 'bg-green-50', icon: CheckCircle },
  failed: { label: 'Failed', color: 'text-red-600', bg: 'bg-red-50', icon: AlertCircle },
  in_progress: { label: 'In Progress', color: 'text-blue-600', bg: 'bg-blue-50', icon: Play },
  not_started: { label: 'Not Started', color: 'text-gray-500', bg: 'bg-gray-100' },
  certified: { label: 'Certified', color: 'text-green-600', bg: 'bg-green-50', icon: CheckCircle },
  exhausted: { label: 'Exhausted', color: 'text-red-600', bg: 'bg-red-50', icon: Ban },
};

export default function StatusBadge({ status, size = 'sm', className = '' }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.not_started;
  const Icon = config.icon;

  return (
    <span className={`
      inline-flex items-center gap-1 rounded-full font-medium
      ${config.bg} ${config.color}
      ${size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm'}
      ${className}
    `}>
      {Icon && <Icon size={size === 'sm' ? 12 : 14} />}
      {config.label}
    </span>
  );
}
