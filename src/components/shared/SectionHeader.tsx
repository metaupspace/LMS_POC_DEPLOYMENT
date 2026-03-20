interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  action?: { label: string; onClick: () => void };
  icon?: React.ReactNode;
  className?: string;
}

export default function SectionHeader({ title, subtitle, action, icon, className = '' }: SectionHeaderProps) {
  return (
    <div className={`flex items-center justify-between mb-4 ${className}`}>
      <div>
        <h2 className="text-lg sm:text-xl font-semibold flex items-center gap-2">
          {icon}
          {title}
        </h2>
        {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
      {action && (
        <button onClick={action.onClick} className="text-sm text-primary-main hover:underline">
          {action.label} →
        </button>
      )}
    </div>
  );
}
