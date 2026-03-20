import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  iconColor?: string;
  iconBg?: string;
  trend?: { value: string; positive: boolean };
  className?: string;
}

export default function StatCard({ label, value, icon: Icon, iconColor, iconBg, trend, className = '' }: StatCardProps) {
  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-4 sm:p-5 ${className}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs sm:text-sm text-gray-500">{label}</p>
          <p className="text-xl sm:text-2xl font-bold mt-1">{value}</p>
          {trend && (
            <p className={`text-xs mt-1 ${trend.positive ? 'text-green-600' : 'text-red-500'}`}>
              {trend.value}
            </p>
          )}
        </div>
        {Icon && (
          <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center ${iconBg || 'bg-gray-50'}`}>
            <Icon size={22} className={iconColor || 'text-gray-500'} />
          </div>
        )}
      </div>
    </div>
  );
}
