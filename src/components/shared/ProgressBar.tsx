interface ProgressBarProps {
  value: number;          // 0-100
  size?: 'sm' | 'md' | 'lg';
  color?: 'primary' | 'success' | 'warning' | 'gradient';
  showLabel?: boolean;
  label?: string;
  className?: string;
}

export default function ProgressBar({
  value,
  size = 'md',
  color = 'primary',
  showLabel = false,
  label,
  className = '',
}: ProgressBarProps) {
  const percent = Math.min(100, Math.max(0, value));

  const heightClass = { sm: 'h-1.5', md: 'h-2', lg: 'h-3' }[size];
  const colorClass = {
    primary: 'bg-primary-main',
    success: 'bg-green-500',
    warning: 'bg-yellow-500',
    gradient: 'bg-gradient-to-r from-amber-400 to-primary-main',
  }[color];

  return (
    <div className={className}>
      {(showLabel || label) && (
        <div className="flex items-center justify-between mb-1">
          {label && <span className="text-xs text-gray-500">{label}</span>}
          {showLabel && <span className="text-xs font-medium">{percent}%</span>}
        </div>
      )}
      <div className={`w-full overflow-hidden rounded-full bg-gray-200 ${heightClass}`}>
        <div
          className={`${heightClass} rounded-full transition-all duration-500 ${colorClass}`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
