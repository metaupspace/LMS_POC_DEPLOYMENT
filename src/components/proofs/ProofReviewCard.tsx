'use client';

import { useState, useCallback } from 'react';
import ImageModal from '@/components/ui/ImageModal';
import { Card, Badge, Button } from '@/components/ui';
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

interface ProofReviewCardProps {
  proofId: string;
  staffName: string;
  submittedAt: string;
  status: ProofOfWorkStatus;
  fileUrl?: string;
  fileType?: string;
  reviewNote?: string;
  onReview: (proofId: string, status: 'approved' | 'redo_requested', note: string) => Promise<void>;
  isReviewing?: boolean;
}

export default function ProofReviewCard({
  proofId,
  staffName,
  submittedAt,
  status,
  fileUrl,
  fileType,
  reviewNote,
  onReview,
  isReviewing = false,
}: ProofReviewCardProps) {
  const [activeAction, setActiveAction] = useState<'approve' | 'redo' | null>(null);
  const [note, setNote] = useState('');
  const [showImage, setShowImage] = useState(false);

  const handleReview = useCallback(async () => {
    const reviewStatus = activeAction === 'approve' ? 'approved' as const : 'redo_requested' as const;
    await onReview(proofId, reviewStatus, note.trim());
    setActiveAction(null);
    setNote('');
  }, [proofId, activeAction, note, onReview]);

  const handleCancel = useCallback(() => {
    setActiveAction(null);
    setNote('');
  }, []);

  return (
    <Card className="space-y-sm">
      {/* Staff info + date */}
      <div className="flex items-center justify-between">
        <div className="min-w-0">
          <p className="text-body-md font-semibold text-text-primary truncate">{staffName}</p>
          <p className="text-caption text-text-secondary">
            Submitted{' '}
            {new Date(submittedAt).toLocaleDateString('en-IN', {
              day: '2-digit', month: 'short', year: 'numeric',
            })}
          </p>
        </div>
        <Badge variant={statusVariantMap[status]}>
          {statusLabelMap[status]}
        </Badge>
      </div>

      {/* File preview */}
      {fileUrl && (
        <button
          type="button"
          onClick={() => setShowImage(true)}
          className="inline-flex items-center gap-sm text-body-md font-medium text-primary-main min-h-[44px] hover:opacity-80 transition-opacity"
        >
          <ProofThumbnail fileUrl={fileUrl} fileType={fileType} />
          <span>View Submission</span>
        </button>
      )}

      <ImageModal
        isOpen={showImage}
        onClose={() => setShowImage(false)}
        imageUrl={fileUrl || ''}
        fileName={fileType ? `proof.${fileType}` : undefined}
        fileType={fileType}
      />

      {/* Review note if already reviewed */}
      {reviewNote && status !== 'submitted' && (
        <div className="rounded-sm bg-surface-background px-md py-sm">
          <p className="text-caption font-medium text-text-secondary">Review Note</p>
          <p className="text-body-md text-text-primary mt-xs">{reviewNote}</p>
        </div>
      )}

      {/* Action buttons for pending proofs */}
      {status === 'submitted' && !activeAction && (
        <div className="flex gap-sm pt-xs">
          <Button
            variant="primary"
            size="md"
            className="flex-1 min-h-[44px] !bg-success hover:!brightness-90"
            onClick={() => setActiveAction('approve')}
          >
            Approve
          </Button>
          <Button
            variant="danger"
            size="md"
            className="flex-1 min-h-[44px]"
            onClick={() => setActiveAction('redo')}
          >
            Request Redo
          </Button>
        </div>
      )}

      {/* Review note textarea + confirm */}
      {status === 'submitted' && activeAction && (
        <div className="space-y-sm pt-xs">
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={
              activeAction === 'approve'
                ? 'Add a note (optional)...'
                : 'Explain what needs to be redone...'
            }
            rows={3}
            className="w-full rounded-sm border border-border-light bg-surface-white px-md py-sm text-body-md text-text-primary placeholder:text-text-secondary focus:border-border-focus focus:outline-none focus:ring-2 focus:ring-border-focus/20 resize-none"
          />
          <div className="flex gap-sm">
            <Button
              variant={activeAction === 'approve' ? 'primary' : 'danger'}
              size="md"
              className={`flex-1 min-h-[44px] ${activeAction === 'approve' ? '!bg-success hover:!brightness-90' : ''}`}
              isLoading={isReviewing}
              onClick={handleReview}
            >
              {activeAction === 'approve' ? 'Confirm Approve' : 'Confirm Redo Request'}
            </Button>
            <Button
              variant="ghost"
              size="md"
              className="min-h-[44px]"
              onClick={handleCancel}
              disabled={isReviewing}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
