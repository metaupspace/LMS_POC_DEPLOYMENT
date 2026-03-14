import { Badge } from '@/components/ui';
import { getDisplayStatus, type SessionDisplayStatus } from '@/hooks/useSessionStatus';

export { getDisplayStatus, type SessionDisplayStatus };

type BadgeVariant = 'warning' | 'info' | 'success' | 'error' | 'default';

const statusVariantMap: Record<SessionDisplayStatus, BadgeVariant> = {
  upcoming: 'warning',
  ongoing: 'info',
  completed: 'success',
  cancelled: 'error',
};

const statusLabelMap: Record<SessionDisplayStatus, string> = {
  upcoming: 'Upcoming',
  ongoing: 'Ongoing',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

interface SessionStatusBadgeProps {
  status: SessionDisplayStatus;
  label?: string;
  className?: string;
}

export default function SessionStatusBadge({ status, label, className }: SessionStatusBadgeProps) {
  return (
    <Badge variant={statusVariantMap[status]} className={className}>
      {label || statusLabelMap[status]}
    </Badge>
  );
}
