'use client';

import { useAppDispatch } from '@/store/hooks';
import { closeModal } from '@/store/slices/uiSlice';
import Modal from './Modal';
import Button from './Button';

interface ConfirmDialogProps {
  modalId: string;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'primary';
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel?: () => void;
}

export default function ConfirmDialog({
  modalId,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  isLoading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const dispatch = useAppDispatch();

  const handleCancel = () => {
    dispatch(closeModal());
    onCancel?.();
  };

  return (
    <Modal
      modalId={modalId}
      title={title}
      maxWidth="sm"
      onClose={handleCancel}
      footer={
        <>
          <Button
            variant="secondary"
            size="md"
            onClick={handleCancel}
            disabled={isLoading}
          >
            {cancelLabel}
          </Button>
          <Button
            variant={variant}
            size="md"
            onClick={onConfirm}
            isLoading={isLoading}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p className="text-body-lg text-text-secondary">{message}</p>
    </Modal>
  );
}
