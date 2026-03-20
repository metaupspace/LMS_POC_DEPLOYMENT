interface QuestionNavigatorProps {
  totalQuestions: number;
  currentQuestion: number;
  answeredQuestions: Record<number, number>;
  onNavigate: (_questionIndex: number) => void;
  className?: string;
}

export default function QuestionNavigator({
  totalQuestions,
  currentQuestion,
  answeredQuestions,
  onNavigate,
  className = '',
}: QuestionNavigatorProps) {
  return (
    <div className={`bg-white rounded-lg p-4 border border-border-light ${className}`}>
      <p className="text-caption text-text-secondary mb-3">
        Question Navigator
      </p>
      <div className="grid grid-cols-10 gap-2">
        {Array.from({ length: totalQuestions }, (_, i) => (
          <button
            key={i}
            onClick={() => onNavigate(i)}
            className={`w-8 h-8 rounded text-caption font-medium transition-colors ${
              i === currentQuestion
                ? 'bg-primary-main text-white'
                : answeredQuestions[i] !== undefined
                  ? 'bg-success text-white'
                  : 'bg-gray-100 text-text-secondary hover:bg-gray-200'
            }`}
          >
            {i + 1}
          </button>
        ))}
      </div>
      <div className="flex gap-4 mt-3 text-caption text-text-secondary">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-primary-main" /> Current
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-success" /> Answered
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-gray-100" /> Unanswered
        </span>
      </div>
    </div>
  );
}
