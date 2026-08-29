export type ConceptId =
  | "SAFETY"
  | "SELF_DET"
  | "COMM"
  | "SELF_CARE"
  | "MOBILITY"
  | "SOCIAL"
  | "COMMUNITY"
  | "HEALTH"
  | "ACADEMIC"
  | "LEARNING_TECH";

export type MvpConceptId = "SAFETY" | "SELF_CARE" | "COMM";

export type SourceType =
  | "formal_tool"
  | "informal_tool"
  | "functional_observation"
  | "learner_voice"
  | "family_voice"
  | "team_report"
  | "file_review";

export type EvidenceType =
  | "strength"
  | "emerging"
  | "need"
  | "support_condition"
  | "personal_voice";

export type PerformanceContext = {
  environment?: "home" | "center_school" | "community" | "work" | "other";
  routine?: string;
  supportPresent?: "none" | "minimal_reminder" | "moderate" | "intensive" | "unknown";
  notesAr?: string;
};

export type ProfileSource = {
  id: string;
  type: SourceType;
  name: string;
  date?: string;
  assessorId?: string;
  setting?: string;
  status?: "draft" | "verified" | "archived";
};

export type EvidenceRecord = {
  id: string;
  sourceId: string;
  conceptId: ConceptId;
  evidenceType: EvidenceType;
  textAr: string;
  directness?: "direct" | "indirect";
  context?: PerformanceContext;
  createdAt: string;
};

export type AssessmentRating = "pass" | "emerge" | "fail" | "not_observed";

export type AssessmentDomainResult = {
  domainCode: string;
  domainNameAr: string;
  rating: AssessmentRating;
  note?: string;
  linkedConcepts: ConceptId[];
};

export type AssessmentRecord = {
  id: string;
  learnerId: string;
  toolId: string;
  toolNameAr: string;
  sourceType: SourceType;
  assessorName?: string;
  assessmentDate?: string;
  uploadedFileName?: string;
  uploadedFileType?: string;
  uploadedAt?: string;
  transitionCoverageStatus?:
    | "NOT_ACTIVATED"
    | "ADEQUATE_COVERAGE"
    | "PARTIAL_COVERAGE"
    | "PRIORITY_INFORMATION_GAPS_IDENTIFIED";
  transitionCoverageMissingAreas?: string[];
  processingNotesAr?: string[];
  status: "draft" | "completed";
  domains: AssessmentDomainResult[];
  createdAt: string;
  updatedAt: string;
};

export type InformationRecord = {
  id: string;
  learnerId: string;
  toolId: string;
  toolNameAr: string;
  category:
    | "family_vision"
    | "learner_voice"
    | "interest_survey"
    | "preference_survey"
    | "career_interest"
    | "transition_checklist"
    | "person_centered_planning";
  responses: Array<{
    questionId: string;
    promptAr: string;
    value: string | string[];
    linkedConcepts: ConceptId[];
    targetPortfolio: string;
    operatingRoles: string[];
    outputPolicy?: "knowledge_support_only" | "conditional_evidence_candidate";
  }>;
  createdAt: string;
  updatedAt: string;
};

export type InformationProcessingSignalKind =
  | "profile_strength"
  | "profile_need"
  | "support_condition"
  | "priority_hint"
  | "risk_context"
  | "motivation_context"
  | "evidence_candidate";

export type InformationProcessingSignal = {
  id: string;
  sourceRecordId: string;
  sourceToolId: string;
  sourceToolNameAr: string;
  kind: InformationProcessingSignalKind;
  labelAr: string;
  valueAr: string;
  linkedConcepts: ConceptId[];
  targetPortfolio: string;
  operatingRoles: string[];
  processingLevel: "structured_descriptive" | "evidence_candidate" | "requires_specialist_interpretation";
  canInformCurrentPerformance: boolean;
  canSupportGoalSelection: boolean;
  requiresSpecialistInterpretation: boolean;
};

export type InformationProcessingConceptSummary = {
  conceptId: ConceptId;
  signalCount: number;
  evidenceCandidateCount: number;
  priorityHintCount: number;
  supportConditionCount: number;
  needOrRiskCount: number;
  sourceToolNamesAr: string[];
};

export type InformationProcessingProfile = {
  learnerId: string;
  recordCount: number;
  signalCount: number;
  evidenceCandidateCount: number;
  currentPerformanceCandidateCount: number;
  goalSelectionSignalCount: number;
  processingStage: "none" | "initial_structured_processing" | "medium_profile_processing";
  signals: InformationProcessingSignal[];
  conceptSummaries: InformationProcessingConceptSummary[];
  limitationsAr: string[];
};

export type ProcessedProfileInputOrigin =
  | "platform_tool_application"
  | "reviewed_uploaded_source";

export type ProcessedProfileInput = {
  id: string;
  learnerId: string;
  origin: ProcessedProfileInputOrigin;
  sourceNameAr: string;
  sourceRecordId: string;
  sourcePurpose?: string;
  labelAr: string;
  valueAr: string;
  conceptIds: ConceptId[];
  signalKinds: InformationProcessingSignalKind[];
  targetPortfolio?: string;
  provenanceLabel: string;
  canInformCurrentPerformance: boolean;
  canSupportGoalSelection: boolean;
  requiresSpecialistInterpretation: boolean;
};

export type ProfileGoalOpportunity = {
  id: string;
  conceptId: ConceptId;
  titleAr: string;
  rationaleAr: string;
  sourceInputIds: string[];
  priority: "high" | "medium" | "low";
  requiresBaselineReview: boolean;
};

export type ProcessedConceptProfile = {
  conceptId: ConceptId;
  conceptNameAr: string;
  sourceCount: number;
  signalCount: number;
  strengths: ProcessedProfileInput[];
  needs: ProcessedProfileInput[];
  priorities: ProcessedProfileInput[];
  supportConditions: ProcessedProfileInput[];
  evidenceCandidates: ProcessedProfileInput[];
  currentPerformanceDraftAr: string;
  coverage: "limited" | "moderate" | "good";
  confidence: "low" | "medium" | "high";
  goalOpportunities: ProfileGoalOpportunity[];
  gapsAr: string[];
};

export type LearnerProfileProcessingModel = {
  learnerId: string;
  generatedAt: string;
  inputCount: number;
  reviewedUploadedSourceCount: number;
  platformToolRecordCount: number;
  conceptProfiles: ProcessedConceptProfile[];
  topGoalOpportunities: ProfileGoalOpportunity[];
  profileReadiness:
    | "no_processed_information"
    | "processed_information_available"
    | "profile_ready_for_goal_review";
  limitationsAr: string[];
};

export type KnowledgeSupportItem = {
  id: string;
  sourceRecordId: string;
  labelAr: string;
  valueAr: string;
  linkedConcepts: ConceptId[];
  targetPortfolio: string;
  operatingRoles: string[];
};

export type ConceptProfile = {
  conceptId: ConceptId;
  calibrationStatus: "not_started" | "incomplete" | "provisional" | "final";
  evidence: EvidenceRecord[];
  currentLevel?: number | null;
  coverage?: "limited" | "moderate" | "good";
  confidence?: "low" | "medium" | "high";
  completionRecommendation?: string | null;
};

export type LearnerProfile = {
  profileMeta: {
    profileId: string;
    learnerId: string;
    learnerNameAr: string;
    createdAt: string;
    updatedAt: string;
    status: "draft" | "active" | "under_review" | "archived";
  };
  sources: ProfileSource[];
  evidencePool: EvidenceRecord[];
  concepts: Record<ConceptId, ConceptProfile>;
};

export type CompetencyFamily = {
  familyId: string;
  conceptId: ConceptId;
  familyNameAr: string;
  definition: string;
  scopeInclude?: string;
  scopeExclude?: string;
  confidence?: string;
};

export type FunctionalCompetency = {
  competencyId: string;
  familyId: string;
  conceptId: ConceptId;
  description: string;
};

export type CompetencyComponent = {
  componentId: string;
  competencyId: string;
  description: string;
  sourceType?: string;
};

export type ComponentRelation = {
  relationType: string;
  fromId: string;
  toId: string;
  description?: string;
};

export type CurriculumComponentLink = {
  competencyId: string;
  linkedHimamSkillIds: string[];
  coverageStatus: "REPRESENTED" | "PARTIALLY_REPRESENTED" | "NOT_REPRESENTED" | "INFERRED" | string;
};

export type RoleTaskRequirement = {
  role: string;
  task: string;
  requiredCompetencyIds: string[];
};

export type CurriculumActivitySuggestion = {
  competencyId: string;
  competencyDescription: string;
  familyNameAr: string;
  componentIds: string[];
  componentDescriptions: string[];
  linkedHimamSkillIds: string[];
  coverageStatus: string;
  roleTasks: Array<{ role: string; task: string }>;
  rationaleAr: string;
};
