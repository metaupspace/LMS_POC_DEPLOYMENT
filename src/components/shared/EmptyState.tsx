import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
  className?: string;
}

export default function EmptyState({ icon: Icon, title, description, action, className = '' }: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center py-12 px-4 text-center ${className}`}>
      <Icon size={48} className="text-gray-300 mb-3" />
      <p className="text-base font-medium text-gray-500">{title}</p>
      {description && <p className="text-sm text-gray-400 mt-1">{description}</p>}
      {action && (
        <button
          onClick={action.onClick}
          className="mt-3 text-sm text-primary-main hover:underline"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
