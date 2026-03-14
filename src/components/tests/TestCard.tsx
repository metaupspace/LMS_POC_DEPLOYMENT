import { ClipboardCheck, Users, Trash2, Eye } from 'lucide-react';
import { Card, Badge } from '@/components/ui';

type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'default';

const statusVariantMap: Record<string, BadgeVariant> = {
  draft: 'default',
  active: 'success',
  archived: 'warning',
};

interface TestCardProps {
  title: string;
  certificationTitle: string;
  description?: string;
  domain?: string;
  questionCount: number;
  assignedStaffCount: number;
  timeLimitMinutes: number;
  status: string;
  onClick: () => void;
  onEdit?: () => void;
  onDelete?: (_e: React.MouseEvent) => void;
}

export default function TestCard({
  title,
  certificationTitle,
  description,
  domain,
  questionCount,
  assignedStaffCount,
  timeLimitMinutes,
  status,
  onClick,
  onEdit,
  onDelete,
}: TestCardProps) {
  const statusVariant = statusVariantMap[status] ?? 'default';

  return (
    <Card
      hoverable
      className="cursor-pointer overflow-hidden"
      onClick={onClick}
    >
      <div className="space-y-sm">
        {domain && (
          <p className="text-caption text-text-secondary">{domain}</p>
        )}

        <h3 className="text-body-lg font-medium text-text-primary line-clamp-1">
          {title}
        </h3>

        <p className="text-body-md text-primary-main font-medium line-clamp-1">
          {'\u{1F3C6}'} {certificationTitle}
        </p>

        {description && (
          <p className="text-body-md text-text-secondary line-clamp-2">
            {description}
          </p>
        )}

        <div className="flex items-center gap-md text-caption text-text-secondary">
          <span className="flex items-center gap-xs">
            <ClipboardCheck className="h-3.5 w-3.5" />
            {questionCount} questions
          </span>
          <span className="flex items-center gap-xs">
            <Users className="h-3.5 w-3.5" />
            {assignedStaffCount} staff
          </span>
          <span>
            {timeLimitMinutes > 0 ? `${timeLimitMinutes} min` : 'No limit'}
          </span>
        </div>

        <div className="flex items-center justify-between pt-sm border-t border-border-light">
          <Badge variant={statusVariant}>
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </Badge>

          {(onEdit || onDelete) && (
            <div className="flex items-center gap-xs">
              {onEdit && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit();
                  }}
                  className="rounded-sm p-xs text-text-secondary transition-colors hover:bg-primary-main/10 hover:text-primary-main"
                  aria-label="Edit test"
                >
                  <Eye className="h-4 w-4" />
                </button>
              )}
              {onDelete && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(e);
                  }}
                  className="rounded-sm p-xs text-text-secondary transition-colors hover:bg-error/10 hover:text-error"
                  aria-label="Delete test"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
