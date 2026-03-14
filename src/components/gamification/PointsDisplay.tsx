import { Star } from 'lucide-react';

interface PointsDisplayProps {
  points: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function PointsDisplay({ points, size = 'md', className = '' }: PointsDisplayProps) {
  const sizeClass = {
    sm: 'text-body-md',
    md: 'text-body-lg',
    lg: 'text-h2',
  }[size];

  const iconSize = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6',
  }[size];

  return (
    <div className={`flex items-center gap-xs ${className}`}>
      <Star className={`${iconSize} text-amber-400 fill-amber-400`} />
      <span className={`${sizeClass} font-semibold text-text-primary`}>
        {points.toLocaleString()}
      </span>
    </div>
  );
}
