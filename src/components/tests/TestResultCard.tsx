interface TestResultCardProps {
  score: number;
  correctCount: number;
  totalQuestions: number;
  passed: boolean;
  passingScore: number;
  certificationTitle?: string;
  attemptsRemaining?: number;
  maxAttempts?: number;
  totalViolations?: number;
  onBack: () => void;
}

export default function TestResultCard({
  score,
  correctCount,
  totalQuestions,
  passed,
  passingScore,
  certificationTitle,
  attemptsRemaining,
  // maxAttempts,
  totalViolations = 0,
  onBack,
}: TestResultCardProps) {
  return (
    <div className="bg-white rounded-lg shadow-lg max-w-lg w-full p-8 text-center">
      {passed ? (
        <>
          <div className="text-6xl mb-4">{'\u{1F3C6}'}</div>
          <h1 className="text-h1 font-bold text-success mb-2">Certified!</h1>
          {certificationTitle && (
            <p className="text-h2 font-semibold text-primary-main mb-2">
              &quot;{certificationTitle}&quot;
            </p>
          )}
          <p className="text-h1 font-bold text-success">{score}%</p>
          <p className="text-body-md text-text-secondary">
            {correctCount}/{totalQuestions} correct
          </p>
          <p className="text-primary-main font-medium mt-2">
            +50 gamification points
          </p>
        </>
      ) : (
        <>
          <div className="text-6xl mb-4">{'\u{1F614}'}</div>
          <h1 className="text-h1 font-bold text-error mb-2">Not Passed</h1>
          <p className="text-h1 font-bold text-error">{score}%</p>
          <p className="text-body-md text-text-secondary">
            {correctCount}/{totalQuestions} correct — Need {passingScore}%
          </p>
          {attemptsRemaining != null && attemptsRemaining > 0 ? (
            <p className="text-warning font-medium mt-2">
              {attemptsRemaining} attempt{attemptsRemaining > 1 ? 's' : ''} remaining
            </p>
          ) : (
            <p className="text-error font-medium mt-2">
              All attempts exhausted
            </p>
          )}
        </>
      )}

      {totalViolations > 0 && (
        <p className="text-caption text-text-disabled mt-4">
          {totalViolations} proctoring violation{totalViolations > 1 ? 's' : ''} recorded
        </p>
      )}

      <button
        onClick={onBack}
        className="w-full mt-6 py-3 bg-primary-main text-white rounded-md font-medium hover:bg-primary-hover transition-colors"
      >
        Back to Profile
      </button>
    </div>
  );
}
