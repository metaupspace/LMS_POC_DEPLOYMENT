import { Badge } from '@/components/ui';
import ProofThumbnail from './ProofThumbnail';
import type { ProofOfWorkStatus } from '@/types';

type BadgeVariant = 'warning' | 'success' | 'error';

const statusVariantMap: Record<ProofOfWorkStatus, BadgeVariant> = {
  submitted: 'warning',
  approved: 'success',
  redo_requested: 'error',
};

const statusLabelMap: Record<ProofOfWorkStatus, string> = {
  submitted: 'Pending',
  approved: 'Approved',
  redo_requested: 'Redo Requested',
};

interface ProofStatusCardProps {
  status: ProofOfWorkStatus;
  fileUrl?: string;
  fileType?: string;
  reviewNote?: string;
  submittedAt?: string;
  onViewFile?: () => void;
  className?: string;
}

export default function ProofStatusCard({
  status,
  fileUrl,
  fileType,
  reviewNote,
  submittedAt,
  onViewFile,
  className = '',
}: ProofStatusCardProps) {
  return (
    <div className={`space-y-sm ${className}`}>
      <div className="flex items-center justify-between">
        <Badge variant={statusVariantMap[status]}>
          {statusLabelMap[status]}
        </Badge>
        {submittedAt && (
          <span className="text-caption text-text-secondary">
            {new Date(submittedAt).toLocaleDateString('en-IN', {
              day: 'numeric', month: 'short', year: 'numeric',
            })}
          </span>
        )}
      </div>

      {fileUrl && (
        <button
          type="button"
          onClick={onViewFile}
          className="inline-flex items-center gap-sm text-body-md font-medium text-primary-main min-h-[44px] hover:opacity-80 transition-opacity"
        >
          <ProofThumbnail fileUrl={fileUrl} fileType={fileType} />
          <span>View Submission</span>
        </button>
      )}

      {reviewNote && status !== 'submitted' && (
        <div className="rounded-sm bg-surface-background px-md py-sm">
          <p className="text-caption font-medium text-text-secondary">Review Note</p>
          <p className="text-body-md text-text-primary mt-xs">{reviewNote}</p>
        </div>
      )}
    </div>
  );
}
