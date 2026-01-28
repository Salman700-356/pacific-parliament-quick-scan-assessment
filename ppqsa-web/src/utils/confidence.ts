export type ConfidenceLabel = "High" | "Medium" | "Low";

export function confidenceLabel(answeredExcludingNA: number, totalQuestions: number): ConfidenceLabel {
  if (!Number.isFinite(answeredExcludingNA) || !Number.isFinite(totalQuestions)) return "Low";
  if (totalQuestions <= 0) return "Low";

  const ratio = answeredExcludingNA / totalQuestions;

  if (ratio >= 0.75) return "High";
  if (ratio >= 0.5) return "Medium";
  return "Low";
}
