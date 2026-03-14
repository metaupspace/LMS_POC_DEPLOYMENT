import { POINTS } from '@/lib/constants';

export { POINTS };

/** Calculate total earned points for a module given its progress state. */
export function calculateModulePoints(progress: {
  videoPoints?: number;
  quizPoints?: number;
  proofOfWorkPoints?: number;
}): number {
  return (progress.videoPoints ?? 0) + (progress.quizPoints ?? 0) + (progress.proofOfWorkPoints ?? 0);
}

/** Check if a module meets the minimum completion threshold (video + quiz). */
export function isModuleComplete(progress: {
  videoPoints?: number;
  quizPoints?: number;
}): boolean {
  const earned = (progress.videoPoints ?? 0) + (progress.quizPoints ?? 0);
  return earned >= POINTS.MODULE_COMPLETION_MIN;
}

/** Max possible points per module (video + quiz + proof of work). */
export const MAX_MODULE_POINTS =
  POINTS.VIDEO_COMPLETION + POINTS.QUIZ_PASS + POINTS.PROOF_OF_WORK_APPROVED;
