import { Award } from 'lucide-react';
import { Card, Badge } from '@/components/ui';

interface CertificationCardProps {
  title: string;
  testTitle?: string;
  score: number;
  earnedAt?: string;
  className?: string;
}

export default function CertificationCard({
  title,
  testTitle,
  score,
  earnedAt,
  className = '',
}: CertificationCardProps) {
  return (
    <Card className={`border-success/30 ${className}`}>
      <div className="flex items-start justify-between gap-md">
        <div className="flex items-start gap-sm min-w-0">
          <div className="w-10 h-10 bg-amber-50 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
            <Award className="h-5 w-5 text-amber-500" />
          </div>
          <div className="min-w-0">
            {testTitle && (
              <p className="text-body-md font-medium text-text-primary truncate">
                {testTitle}
              </p>
            )}
            <p className="text-body-md font-semibold text-primary-main mt-0.5">
              {title}
            </p>
            <div className="flex items-center gap-md mt-xs text-caption text-text-secondary">
              <span className="text-success font-medium">
                Score: {score}%
              </span>
              {earnedAt && (
                <span>
                  {new Date(earnedAt).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </span>
              )}
            </div>
          </div>
        </div>
        <Badge variant="success">Certified</Badge>
      </div>
    </Card>
  );
}
