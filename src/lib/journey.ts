// ── Journey / progress model ─────────────────────────────────────────────────
// Single source of truth for where a student sits in the specialist journey:
// assessment → coverage → family → student-voice → iep → plan → report.
// Every route that advances a student's progress should go through
// `advanceStage()` so status never regresses; every screen that needs to
// know "where am I / what's next" should read through the helpers below
// instead of comparing raw status strings.

export type StudentStage =
  | "not_started"
  | "assessment_in_progress"
  | "assessment_completed"
  | "coverage_ready"
  | "family_completed"
  | "learner_voice_completed"
  | "learner_voice_skipped"
  | "iep_completed"
  | "plan_completed"
  | "report_ready"
  | "report_generated";

export const STAGE_RANK: Record<StudentStage, number> = {
  not_started: 0,
  assessment_in_progress: 1,
  assessment_completed: 2,
  coverage_ready: 3,
  family_completed: 4,
  learner_voice_completed: 5,
  learner_voice_skipped: 5,
  iep_completed: 6,
  plan_completed: 7,
  // plan_completed just means the plan step was saved; report_ready means it
  // was saved WITH at least one real-context activity selected, so the
  // report will be meaningful rather than triggering its "no activities" warning.
  report_ready: 8,
  report_generated: 9,
};

// Status strings written by earlier versions of this app, mapped forward so
// students created before this model still resume in the right place.
const LEGACY_STAGE_MAP: Record<string, StudentStage> = {
  assessment: "not_started",
  voice_completed: "learner_voice_completed",
};

export function getStudentStage(raw: string | undefined | null): StudentStage {
  if (!raw) return "not_started";
  if (raw in STAGE_RANK) return raw as StudentStage;
  return LEGACY_STAGE_MAP[raw] ?? "not_started";
}

export function getStageRank(raw: string | undefined | null): number {
  return STAGE_RANK[getStudentStage(raw)];
}

/**
 * Only ever move a student's stage forward. Prevents a later re-save of an
 * earlier step (e.g. a draft re-save, or the 30s assessment auto-save) from
 * regressing progress already made, and ensures a "skip" is still recorded
 * as real progress rather than silently vanishing on resume.
 */
export function advanceStage(
  current: string | undefined | null,
  candidate: StudentStage,
): StudentStage {
  const currentStage = getStudentStage(current);
  return STAGE_RANK[candidate] > STAGE_RANK[currentStage] ? candidate : currentStage;
}

export type StepId =
  | "assessment"
  | "coverage"
  | "family"
  | "learner_voice"
  | "iep"
  | "plan"
  | "report";

export type StepDef = {
  id: StepId;
  label: string;
  routeTo: string;
  /** Stage rank reached once this step is done. */
  completionRank: number;
};

export const JOURNEY_STEPS: StepDef[] = [
  { id: "assessment", label: "التقييم", routeTo: "/students/$id/assessment", completionRank: STAGE_RANK.assessment_completed },
  { id: "coverage", label: "التغطية", routeTo: "/students/$id/coverage", completionRank: STAGE_RANK.coverage_ready },
  { id: "family", label: "صوت الأسرة", routeTo: "/students/$id/family", completionRank: STAGE_RANK.family_completed },
  { id: "learner_voice", label: "صوت المتعلم", routeTo: "/students/$id/student-voice", completionRank: STAGE_RANK.learner_voice_completed },
  { id: "iep", label: "الخطة التربوية", routeTo: "/students/$id/iep", completionRank: STAGE_RANK.iep_completed },
  { id: "plan", label: "الخطة التنفيذية", routeTo: "/students/$id/plan", completionRank: STAGE_RANK.plan_completed },
  { id: "report", label: "التقرير", routeTo: "/students/$id/report", completionRank: STAGE_RANK.report_generated },
];

function unlockRankFor(index: number): number {
  return index === 0 ? 0 : JOURNEY_STEPS[index - 1].completionRank;
}

/** The furthest step a student may jump into directly (backward is always
 *  allowed; forward is capped here — this is that cap). */
export function getFurthestAccessibleStepIndex(raw: string | undefined | null): number {
  const rank = getStageRank(raw);
  let idx = 0;
  for (let i = 0; i < JOURNEY_STEPS.length; i++) {
    if (unlockRankFor(i) <= rank) idx = i;
  }
  return idx;
}

export function getNextIncompleteStepIndex(raw: string | undefined | null): number {
  const rank = getStageRank(raw);
  for (let i = 0; i < JOURNEY_STEPS.length; i++) {
    if (JOURNEY_STEPS[i].completionRank > rank) return i;
  }
  return JOURNEY_STEPS.length - 1;
}

export function getNextAction(raw: string | undefined | null): { label: string; to: string } {
  const stage = getStudentStage(raw);
  if (stage === "report_generated") {
    return { label: "عرض التقرير", to: "/students/$id/report" };
  }
  const step = JOURNEY_STEPS[getNextIncompleteStepIndex(raw)];
  return { label: "استكمال", to: step.routeTo };
}
