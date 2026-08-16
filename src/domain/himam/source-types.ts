export const SOURCE_TYPES = [
  "LEARNER_PROFILE",
  "INSTITUTIONAL_ASSESSMENT",
  "FUNCTIONAL_OBSERVATION",
  "LEARNER_VOICE",
  "FAMILY_VISION",
  "INTEREST_SURVEY",
  "INCLINATION_SURVEY",
  "TRANSITION_SURVEY_CHECKLIST",
  "PERSON_CENTERED_PLANNING",
  "PRIOR_REPORT",
  "EXECUTION_WITNESS",
  "SYSTEM_INFERENCE",
  "CALIBRATION_RESULT",
  "GOAL",
  "LESSON",
  "PLAN_QUALITY",
  "AGE_STAGE_ADVISORY",
  "REPORT",
] as const;

export type SourceType = (typeof SOURCE_TYPES)[number];

export const SOURCE_PACKAGES = [
  "UPSTREAM_PROFILE",
  "3A",
  "4A",
  "5A",
  "6A",
  "7A",
  "8A",
  "9A",
  "10A",
  "11A",
] as const;

export type SourcePackage = (typeof SOURCE_PACKAGES)[number];

export const SOURCE_RECORD_TYPES = [
  "LearnerProfile",
  "ToolCatalog",
  "ToolAdministration",
  "StructuredResponse",
  "EvidenceRecord",
  "KnowledgeSupportItem",
  "InferenceSuggestion",
  "ConceptCalibrationResult",
  "GoalBuildHandoff",
  "Goal",
  "LearnerPlan",
  "Lesson",
  "GoalLessonLink",
  "ExecutionSession",
  "ExecutionWitnessRecord",
  "ImpactRecord",
  "GeneralizationRecord",
  "PlanQualityAssessment",
  "SpecialistAlert",
  "HumanReviewItem",
  "ReportPackage",
  "ReportClaim",
  "EndToEndTrace",
  "VerificationRun",
] as const;

export type SourceRecordType = (typeof SOURCE_RECORD_TYPES)[number];

export type SourceRef = {
  sourceType: SourceType;
  sourcePackage: SourcePackage;
  sourceRecordType: SourceRecordType;
  sourceId: string;
  provenanceRef?: string;
};

export function isSourceType(value: string): value is SourceType {
  return SOURCE_TYPES.includes(value as SourceType);
}
