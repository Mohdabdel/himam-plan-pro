import type { TransitionEntityRef } from "./transition-architecture";

/**
 * Future-facing contracts for post-CVI implementation.
 *
 * IMPORTANT:
 * - These types are not wired into current UI, scoring, goal generation,
 *   curriculum recommendation, implementation storage, or reporting.
 * - They define the intended data contracts only.
 * - Production use requires explicit post-CVI approval and migration planning.
 */

export type GoalCompetencyLinkStatus =
  | "proposed"
  | "human_confirmed"
  | "superseded"
  | "rejected";

export type GoalCompetencyLink = {
  linkId: string;
  learnerId: string;
  goalId: string;
  competencyRefs: TransitionEntityRef[];
  enablingSkillRefs: TransitionEntityRef[];
  functionalScenarioRefs: TransitionEntityRef[];
  rationale?: string;
  linkStatus: GoalCompetencyLinkStatus;
  sourceEvidenceRefs: string[];
  createdAt: string;
  createdBy: string;
  confirmedBy?: string;
  confirmedAt?: string;
};

export type FunctionalScenarioAssignmentStatus =
  | "proposed"
  | "selected"
  | "completed"
  | "superseded"
  | "rejected";

export type FunctionalScenarioAssignment = {
  assignmentId: string;
  learnerId: string;
  scenarioRef: TransitionEntityRef;
  goalIds: string[];
  competencyRefs: TransitionEntityRef[];
  enablingSkillRefs: TransitionEntityRef[];
  targetContexts: string[];
  plannedSupports: string[];
  assignmentStatus: FunctionalScenarioAssignmentStatus;
  rationale?: string;
  createdAt: string;
  createdBy: string;
};

export type SkillPerformanceState =
  | "not_observed"
  | "attempted"
  | "emerging"
  | "performed_with_support"
  | "performed_independently";

export type GeneralizationProbeResult =
  | "not_applicable"
  | "not_run"
  | "not_observed"
  | "emerging"
  | "demonstrated";

export type MaintenanceProbeResult =
  | "not_applicable"
  | "not_due"
  | "not_run"
  | "not_retained"
  | "partially_retained"
  | "retained";

export type SupportEffectiveness =
  | "unknown"
  | "ineffective"
  | "partially_effective"
  | "effective";

export type SafetyPerformanceResult =
  | "not_applicable"
  | "not_observed"
  | "unsafe_without_support"
  | "safe_with_support"
  | "safe_independently"
  | "requested_help_or_withdrew_safely";

export type FunctionalPerformanceRecord = {
  recordId: string;
  learnerId: string;
  goalIds: string[];
  scenarioRef?: TransitionEntityRef;
  competencyRefs: TransitionEntityRef[];
  enablingSkillRefs: TransitionEntityRef[];

  observedAt: string;
  contextRef?: string;
  evidenceRefs: string[];

  skillPerformance: SkillPerformanceState;

  pd01Generalization?: {
    result: GeneralizationProbeResult;
    baseContextRef?: string;
    probeContextRef?: string;
    noveltyType?: "person" | "place" | "task" | "combination";
    supportAtProbe?: string[];
  };

  pd02Maintenance?: {
    result: MaintenanceProbeResult;
    plannedInterval?: string;
    dueAt?: string;
    probeAt?: string;
    reteachingSinceLastProbe?: boolean;
    supportAtProbe?: string[];
  };

  pd03SupportUse?: {
    supportType?: string;
    supportIntensity?: string;
    supportProvider?: string;
    availableInTargetContext?: boolean;
    sustainable?: boolean;
    effectiveness: SupportEffectiveness;
    learnerInitiatedUse?: boolean;
  };

  pd04Safety?: {
    safetyDemandRef?: string;
    contextualHazard?: string;
    expectedResponse?: string;
    result: SafetyPerformanceResult;
    escalationOrSupportPlanRef?: string;
  };

  notes?: string;
  createdAt: string;
  createdBy: string;
};

export type CurriculumDiscoveredGapStatus =
  | "candidate"
  | "human_reviewed"
  | "accepted_for_planning"
  | "rejected"
  | "superseded";

export type CurriculumDiscoveredGap = {
  gapId: string;
  learnerId: string;
  scenarioRef?: TransitionEntityRef;
  competencyRef?: TransitionEntityRef;
  enablingSkillRef?: TransitionEntityRef;
  observationRefs: string[];
  description: string;
  status: CurriculumDiscoveredGapStatus;
  proposedPlanningImplication?:
    | "consider_goal"
    | "increase_support"
    | "collect_more_evidence"
    | "reassess"
    | "change_context"
    | "other";
  createdAt: string;
  createdBy: string;
  reviewedBy?: string;
  reviewedAt?: string;
};

export const POST_CVI_CONTRACT_GOVERNANCE = {
  productionUseAllowed: false,
  uiUseAllowed: false,
  storageMigrationAllowed: false,
  automaticGoalCreationAllowed: false,
  automaticProfileMutationAllowed: false,
  requiresExplicitGatePass: true,
  requiresHumanConfirmationForGoalLinks: true,
  requiresHumanReviewForCurriculumDiscoveredGaps: true,
  currentLegacyStorageRemainsAuthoritative: true,
} as const;
