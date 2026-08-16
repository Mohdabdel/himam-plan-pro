export const HIMAM_CONCEPT_IDS = [
  "SAFETY",
  "SELF_DET",
  "COMM",
  "SELF_CARE",
  "MOBILITY",
  "SOCIAL",
  "COMMUNITY",
  "HEALTH",
  "ACADEMIC",
  "LEARNING_TECH",
] as const;

export type ConceptId = (typeof HIMAM_CONCEPT_IDS)[number];

export type AgeBand = "UNDER_9" | "AGE_9_TO_13" | "AGE_14_PLUS";

export type Learner = {
  id: string;
  name: string;
  ageYears: number | null;
  diagnosis?: string;
  institution?: string;
  entryType?: "new" | "returning";
};

export type SourceKind =
  | "official_assessment"
  | "functional_observation"
  | "learner_voice"
  | "family_voice"
  | "interest_survey"
  | "career_inclination"
  | "additional_document"
  | "prior_report";

export type InformationRole =
  | "performance_evidence"
  | "supporting_information"
  | "suggested_inference"
  | "unclassified_pending_review";

export type SourceStatus = "draft" | "completed" | "skipped";

export type InformationSource = {
  id: string;
  learnerId: string;
  kind: SourceKind;
  status: SourceStatus;
  title: string;
  collectedAt?: string;
  uploadedFileName?: string;
  selectedToolId?: string;
  selectedToolName?: string;
  declaredConcepts?: ConceptId[];
  declaredPriorities?: string[];
  declaredSupports?: string[];
  declaredInterests?: string[];
  summary?: string;
};

export type TraceRef = {
  sourceId: string;
  sourceKind: SourceKind;
  field?: string;
};

export type EvidenceRecord = {
  id: string;
  learnerId: string;
  role: "performance_evidence";
  label: string;
  conceptIds: ConceptId[];
  traceRefs: TraceRef[];
  confidence: "provisional" | "structured";
};

export type KnowledgeSupportItem = {
  id: string;
  learnerId: string;
  role: "supporting_information";
  label: string;
  conceptIds: ConceptId[];
  supportType: "priority" | "preference" | "context" | "support" | "motivation" | "risk";
  traceRefs: TraceRef[];
};

export type InferenceSuggestion = {
  id: string;
  learnerId: string;
  role: "suggested_inference";
  label: string;
  conceptIds: ConceptId[];
  reason: string;
  traceRefs: TraceRef[];
  status: "suggested";
};

export type UnclassifiedInformation = {
  id: string;
  learnerId: string;
  role: "unclassified_pending_review";
  label: string;
  reason: string;
  traceRefs: TraceRef[];
};

export type ClassifiedInformation =
  | EvidenceRecord
  | KnowledgeSupportItem
  | InferenceSuggestion
  | UnclassifiedInformation;

export type InformationInsight = {
  id: string;
  learnerId: string;
  title: string;
  body: string;
  conceptIds: ConceptId[];
  role: InformationRole;
  traceRefs: TraceRef[];
};

export type GoalOpportunity = {
  id: string;
  learnerId: string;
  title: string;
  rationale: string;
  conceptIds: ConceptId[];
  sourceRole: InformationRole;
  readiness: "ready_for_goal_draft" | "needs_human_review" | "needs_more_information";
  traceRefs: TraceRef[];
};

export type SupportOpportunity = {
  id: string;
  learnerId: string;
  title: string;
  suggestedConditionPhrase: string;
  conceptIds: ConceptId[];
  traceRefs: TraceRef[];
};

export type InformationGap = {
  id: string;
  learnerId: string;
  severity: "blocking" | "quality" | "enrichment";
  title: string;
  recommendation: string;
  blocksWorkflow: boolean;
};

export type SufficiencyReview = {
  learnerId: string;
  ageBand: AgeBand | null;
  minimumReady: boolean;
  classifiedInformation: ClassifiedInformation[];
  insights: InformationInsight[];
  goalOpportunities: GoalOpportunity[];
  supportOpportunities: SupportOpportunity[];
  gaps: InformationGap[];
};

export type GoalDraftStatus = "draft_ready_for_human_review" | "needs_revision";

export type GoalDraftElementKey =
  | "learner_timeframe"
  | "condition"
  | "observable_behavior"
  | "clarifying_details"
  | "performance_criterion"
  | "measurement_method";

export type GoalDraftElement = {
  key: GoalDraftElementKey;
  label: string;
  value: string;
};

export type GoalDraft = {
  id: string;
  learnerId: string;
  sourceOpportunityId: string;
  conceptIds: ConceptId[];
  status: GoalDraftStatus;
  text: string;
  elements: GoalDraftElement[];
  traceRefs: TraceRef[];
  humanApprovalReference?: never;
};

export type GoalQualityIssue = {
  id: string;
  severity: "hard_stop" | "quality" | "advisory";
  title: string;
  recommendation: string;
};

export type GoalQualityReview = {
  goalDraftId: string;
  readyForHumanReview: boolean;
  issues: GoalQualityIssue[];
};

export type GoalDraftInput = {
  learner: Learner;
  opportunity: GoalOpportunity;
  support?: SupportOpportunity;
  timeframe?: string;
  behavior: string;
  clarifyingDetails?: string;
  performanceCriterion?: string;
  measurementMethod?: string;
};

export type ReportClaimType =
  | "learner_profile"
  | "information_sufficiency"
  | "goal_draft"
  | "goal_quality"
  | "human_review_boundary";

export type ReportClaim = {
  id: string;
  learnerId: string;
  type: ReportClaimType;
  title: string;
  body: string;
  sourceRefs: TraceRef[];
};

export type EndToEndTraceStep = {
  label: string;
  recordId: string;
  recordType:
    | "Learner"
    | "InformationSource"
    | "ClassifiedInformation"
    | "InformationInsight"
    | "GoalOpportunity"
    | "SupportOpportunity"
    | "GoalDraft"
    | "GoalQualityReview"
    | "ReportClaim";
};

export type EndToEndTrace = {
  claimId: string;
  steps: EndToEndTraceStep[];
  complete: boolean;
};

export type ReportPackage = {
  id: string;
  learnerId: string;
  status: "draft_ready_for_human_review" | "needs_revision";
  claims: ReportClaim[];
  traces: EndToEndTrace[];
  humanApprovalReference?: never;
};

export type ReportBuildInput = {
  learner: Learner;
  sufficiencyReview: SufficiencyReview;
  goalDraft: GoalDraft;
  goalQualityReview: GoalQualityReview;
};

export type OperatingWorkflow = {
  learner: Learner;
  sources: InformationSource[];
  sufficiencyReview: SufficiencyReview;
  goalDraft: GoalDraft | null;
  goalQualityReview: GoalQualityReview | null;
  reportPackage: ReportPackage | null;
};
