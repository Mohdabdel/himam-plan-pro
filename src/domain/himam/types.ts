import type { ConceptId } from "./concepts";
import type { SourceRef, SourceType } from "./source-types";

export type EntityId = string;
export type ISODate = string;
export type ISODateTime = string;
export type ExternalReference = string;

export type AgeStage = "UNDER_14" | "AGE_14_PLUS";

export type AvailabilityStatus =
  | "AVAILABLE"
  | "MISSING"
  | "NOT_APPLICABLE"
  | "DECLINED"
  | "PENDING";

export type PrivacyConsentStatus = "PERMITTED" | "RESTRICTED" | "NOT_PERMITTED" | "UNKNOWN";

export type LearnerProfile = {
  learnerId: EntityId;
  displayName: string;
  dateOfBirth?: ISODate;
  ageAtReviewInput?: number;
  ageBand: AgeStage;
  ageSourceRef: SourceRef;
  institutionId: EntityId;
  primaryProgram?: string;
  primaryContext?: string;
  familyVisionAvailability: AvailabilityStatus;
  learnerVoiceAvailability: AvailabilityStatus;
  privacyConsentStatus: PrivacyConsentStatus;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
};

export type PortfolioId =
  | "PF_CURRENT_PERFORMANCE"
  | "PF_PRIORITY"
  | "PF_CONTEXT"
  | "PF_SUPPORT"
  | "PF_VOICE_PREFERENCE"
  | "PF_PATHWAY"
  | "PF_REPORT";

export type OperationalFunctionCode =
  | "ESTABLISH_CURRENT_PERFORMANCE"
  | "IDENTIFY_SUPPORT"
  | "IDENTIFY_PRIORITY"
  | "IDENTIFY_ENABLING_CONTEXT"
  | "IDENTIFY_BARRIER_CONTEXT"
  | "IDENTIFY_EFFECTIVE_SUPPORT"
  | "IDENTIFY_INEFFECTIVE_SUPPORT"
  | "RISK_PRIORITY"
  | "PATHWAY_INPUT"
  | "PRESERVE_FUNCTION"
  | "FUTURE_CONTEXT"
  | "ACTIVITY_INPUT"
  | "REPORT_INPUT";

export type EvidenceStatus = "accepted" | "excluded" | "superseded";
export type EvidenceType =
  | "PERFORMANCE_ASSESSMENT"
  | "FUNCTIONAL_OBSERVATION"
  | "HISTORICAL_PERFORMANCE";
export type MappingMode = "CATALOG_FIXED" | "EXPLICIT_SELECTION" | "INFERRED_CONFIRMED";

export type IndependentSourceKey = {
  sourceType: SourceType;
  administrationId: EntityId;
  toolId?: EntityId;
  toolFamily?: string;
  observerId?: EntityId;
  observerRole?: string;
  observedAt: ISODateTime;
  dateWindowKey?: string;
  contextCode?: string;
};

export type EvidenceRecord = {
  evidenceId: EntityId;
  learnerId: EntityId;
  sourceResponseId: EntityId;
  evidenceType: EvidenceType;
  conceptId: ConceptId;
  competencyId?: EntityId;
  componentIds: EntityId[];
  performanceCode: string;
  supportCodes: string[];
  observedAt: ISODateTime;
  portfolioTargetIds: PortfolioId[];
  evidenceStatus: EvidenceStatus;
  mappingMode: MappingMode;
  eligibleForLevelEngine: boolean;
  independentSourceKey: IndependentSourceKey;
  sourceRef: SourceRef;
};

export type KnowledgeInformationType =
  | "LEARNER_VOICE"
  | "FAMILY_VISION"
  | "INTEREST_SURVEY"
  | "INCLINATION_SURVEY"
  | "TRANSITION_SURVEY_CHECKLIST"
  | "PERSON_CENTERED_PLANNING"
  | "HISTORICAL_SUPPORT"
  | "HISTORICAL_CONTEXT"
  | "HISTORICAL_PRIORITY"
  | "RECOMMENDATION"
  | "OTHER_SUPPORTING_INFORMATION";

export type KnowledgeSupportItem = {
  knowledgeItemId: EntityId;
  learnerId: EntityId;
  sourceResponseId: EntityId;
  informationType: KnowledgeInformationType;
  conceptIds: ConceptId[];
  portfolioTargetIds: PortfolioId[];
  operationalFunction: OperationalFunctionCode;
  responseCode: string;
  capturedAt: ISODateTime;
  mappingMode: MappingMode;
  eligibleForLevelEngine: false;
  eligibleForPriorityEngine: boolean;
  eligibleForReport: boolean;
  sourceRef: SourceRef;
};

export type InferenceStatus = "suggested" | "confirmed" | "rejected";

export type InferenceSuggestion = {
  suggestionId: EntityId;
  sourceResponseId: EntityId;
  suggestedTargetType: "CONCEPT" | "COMPETENCY" | "PORTFOLIO" | "OPERATIONAL_FUNCTION";
  suggestedValue: string;
  reasonCode: string;
  confidence: number;
  status: InferenceStatus;
  createdBy: string;
  createdAt: ISODateTime;
  confirmedBy?: EntityId | null;
  confirmedAt?: ISODateTime | null;
};

export type InformationToolCategory =
  | "INSTITUTIONAL_ASSESSMENT"
  | "FUNCTIONAL_OBSERVATION"
  | "LEARNER_VOICE"
  | "FAMILY_VISION"
  | "INTEREST_SURVEY"
  | "INCLINATION_SURVEY"
  | "TRANSITION_SURVEY_CHECKLIST"
  | "PERSON_CENTERED_PLANNING";

export type ResponseValueType = "TEXT" | "SINGLE_SELECT" | "MULTI_SELECT" | "RATING";

export type ToolOutputChannel =
  | "EVIDENCE_RECORD"
  | "KNOWLEDGE_SUPPORT_ITEM"
  | "INFERENCE_SUGGESTION";

export type InformationToolOption = {
  optionId: EntityId;
  labelKey: string;
  responseCode: string;
  conceptIds?: ConceptId[];
};

export type InformationToolQuestion = {
  questionId: EntityId;
  promptKey: string;
  responseValueType: ResponseValueType;
  required: boolean;
  conceptIds: ConceptId[];
  portfolioTargetIds: PortfolioId[];
  operationalFunction: OperationalFunctionCode;
  outputChannel: ToolOutputChannel;
  options?: InformationToolOption[];
};

export type InformationToolDefinition = {
  toolId: EntityId;
  version: string;
  nameKey: string;
  descriptionKey: string;
  category: InformationToolCategory;
  sourceType: SourceType;
  active: boolean;
  questions: InformationToolQuestion[];
};

export type ToolAdministration = {
  administrationId: EntityId;
  learnerId: EntityId;
  toolId: EntityId;
  toolVersion: string;
  administeredByRole: string;
  administeredAt: ISODateTime;
  status: "draft" | "completed" | "void";
  sourceRef: SourceRef;
};

export type StructuredResponse = {
  responseId: EntityId;
  administrationId: EntityId;
  learnerId: EntityId;
  toolId: EntityId;
  questionId: EntityId;
  responseValueType: ResponseValueType;
  responseCode: string;
  valueText?: string;
  selectedOptionIds: EntityId[];
  conceptIds: ConceptId[];
  portfolioTargetIds: PortfolioId[];
  operationalFunction: OperationalFunctionCode;
  outputChannel: ToolOutputChannel;
  capturedAt: ISODateTime;
  sourceRef: SourceRef;
};

export type SourceFileSensitivity =
  | "INTERNAL_OPERATIONAL"
  | "EDUCATIONAL"
  | "PROFESSIONAL_SENSITIVE"
  | "MEDIA_SENSITIVE";

export type SourceFileReadFailureReason =
  | "FILE_METADATA_MISSING"
  | "FILE_UNREADABLE"
  | "FILE_PROTECTED"
  | "UNSUPPORTED_FILE_REQUIRES_MANUAL_REVIEW";

export type UploadedSourcePurpose =
  | "OFFICIAL_ASSESSMENT_RESULTS"
  | "LEARNER_VOICE_FORM"
  | "FAMILY_VISION_FORM"
  | "ADDITIONAL_INFORMATION_SOURCE"
  | "PRIOR_REPORT"
  | "WORK_SAMPLE"
  | "EXECUTION_MEDIA";

export type UploadedSourceFile = {
  fileId: EntityId;
  learnerId: EntityId;
  sourceType: SourceType;
  purpose: UploadedSourcePurpose;
  fileName: string;
  mimeType: string;
  sizeBytes?: number;
  uploadedByRole: string;
  uploadedAt: ISODateTime;
  sensitivity: SourceFileSensitivity;
  consentStatus: PrivacyConsentStatus;
  extractionStatus: "not_started" | "draft_created" | "needs_review" | "reviewed" | "failed";
  sourceRef: SourceRef;
};

export type ProtectedSourceFileMetadata = {
  metadataId: EntityId;
  fileId: EntityId;
  learnerId: EntityId;
  originalFileName: string;
  mimeType: string;
  sizeBytes?: number;
  sensitivity: SourceFileSensitivity;
  consentStatus: PrivacyConsentStatus;
  protectedStoragePolicy: "METADATA_ONLY_NO_RAW_CONTENT";
  readFailureReason?: SourceFileReadFailureReason;
  uploadedByRole: string;
  uploadedAt: ISODateTime;
  reviewAccessRoles: string[];
  sourceRef: SourceRef;
};

export type AiDraftBoundary =
  | "DRAFT_ONLY_REQUIRES_HUMAN_REVIEW"
  | "NO_AUTOMATED_DECISION"
  | "SOURCE_SUMMARY_ONLY";

export type ExtractedSourceItem = {
  itemId: EntityId;
  statement: string;
  locationRef?: string;
  proposedOutputChannel: ToolOutputChannel | "UNCLASSIFIED_PENDING_REVIEW";
  proposedConceptIds: ConceptId[];
  confidence: number;
};

export type ExtractedSourceDraft = {
  draftId: EntityId;
  fileId: EntityId;
  learnerId: EntityId;
  extractedAt: ISODateTime;
  extractedBy: "SYSTEM_EXTRACTION" | "HUMAN_ENTRY";
  status: "draft" | "needs_review" | "reviewed" | "failed";
  aiDraftBoundary: AiDraftBoundary;
  items: ExtractedSourceItem[];
  failureReason?: SourceFileReadFailureReason;
  sourceRef: SourceRef;
};

export type SourceExtractionReviewDecision =
  | "approved_for_structured_response"
  | "returned_for_correction"
  | "rejected";

export type SourceExtractionReview = {
  reviewId: EntityId;
  draftId: EntityId;
  fileId: EntityId;
  learnerId: EntityId;
  reviewedByRole: string;
  reviewedAt: ISODateTime;
  decision: SourceExtractionReviewDecision;
  reviewerNotes?: string;
  createdStructuredResponseIds: EntityId[];
  sourceRef: SourceRef;
};

export type GoalDraft = {
  goalDraftId: EntityId;
  learnerId: EntityId;
  goalText: string;
  baselineEvidenceIds: EntityId[];
  knowledgeContextIds: EntityId[];
  measurementMethod: string;
  criterion: string;
  context: string;
  status: "draft" | "quality_ready" | "returned_for_revision";
  createdByRole: string;
  createdAt: ISODateTime;
  sourceRef: SourceRef;
};

export type GoalApprovalRecord = {
  approvalId: EntityId;
  learnerId: EntityId;
  goalDraftId: EntityId;
  decision: "approved_for_plan_inclusion" | "returned_for_revision" | "rejected";
  decidedByRole: string;
  decidedAt: ISODateTime;
  qualityCheckId: EntityId;
  decisionRationale: string;
  sourceRef: SourceRef;
};

export type PlanDraft = {
  planDraftId: EntityId;
  learnerId: EntityId;
  goalApprovalIds: EntityId[];
  planPeriodStart: ISODate;
  planPeriodEnd: ISODate;
  status: "draft" | "ready_for_review" | "returned_for_revision";
  createdByRole: string;
  createdAt: ISODateTime;
  sourceRef: SourceRef;
};

export type PlanQualityReview = {
  reviewId: EntityId;
  planDraftId: EntityId;
  learnerId: EntityId;
  reviewedAt: ISODateTime;
  status: "passed" | "needs_revision";
  findings: string[];
  sourceRef: SourceRef;
};

export type PlanApprovalRecord = {
  approvalId: EntityId;
  planDraftId: EntityId;
  learnerId: EntityId;
  decision: "approved" | "returned_for_revision" | "rejected";
  decidedByRole: string;
  decidedAt: ISODateTime;
  planQualityReviewId: EntityId;
  approvedGoalApprovalIds: EntityId[];
  decisionRationale: string;
  sourceRef: SourceRef;
};

export type EndToEndTraceStepCode =
  | "CREATE_LEARNER"
  | "UPLOAD_SOURCE"
  | "CREATE_EXTRACTION_DRAFT"
  | "REVIEW_EXTRACTION"
  | "INFORMATION_SUFFICIENCY"
  | "KNOWLEDGE_SUPPORT"
  | "CREATE_GOAL_DRAFT"
  | "APPROVE_GOAL"
  | "CREATE_PLAN_DRAFT"
  | "APPROVE_PLAN"
  | "TRACE_COMPLETE";

export type EndToEndTraceStep = {
  stepCode: EndToEndTraceStepCode;
  sourceRef: SourceRef;
  status: "PASS" | "FAIL";
  checkedAt: ISODateTime;
};

export type EndToEndTrace = {
  traceId: EntityId;
  learnerId: EntityId;
  startedAt: ISODateTime;
  completedAt: ISODateTime;
  steps: EndToEndTraceStep[];
  overallStatus: "PASS" | "FAIL";
  sourceRef: SourceRef;
};

export type VerificationStatus = "NOT_RUN" | "PASS" | "FAIL" | "NOT_APPLICABLE";
export type DeliveryMaturity =
  | "KNOWLEDGE_SPEC_ONLY"
  | "CODE_PRESENT_NOT_VERIFIED"
  | "VERIFIED_IMPLEMENTATION";

export type VerificationCheck = {
  status: VerificationStatus;
  command?: string;
  exitCode?: number;
  evidence?: string[];
  notes?: string;
};

export type VerificationRun = {
  verificationRunId: EntityId;
  packageId: string;
  deliveryMaturity: DeliveryMaturity;
  commitSha?: string;
  startedAt: ISODateTime;
  completedAt?: ISODateTime;
  checks: {
    build: VerificationCheck;
    typecheck: VerificationCheck;
    dataIntegrity: VerificationCheck;
    userJourney: VerificationCheck;
    traceability: VerificationCheck;
  };
  modifiedFiles: string[];
  completedItems: string[];
  incompleteItems: string[];
  knownGaps: string[];
  overallStatus: "PASS" | "FAIL" | "NOT_VERIFIED";
};
