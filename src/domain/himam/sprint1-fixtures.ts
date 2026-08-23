import type {
  EvidenceRecord,
  ExtractedSourceDraft,
  GoalApprovalRecord,
  GoalDraft,
  PlanApprovalRecord,
  PlanDraft,
  PlanQualityReview,
  SourceExtractionReview,
  UploadedSourceFile,
} from "./types";

const now = "2026-08-23T00:00:00.000Z";
const learnerId = "learner-age-14-plus";

export const uploadedAssessmentFileFixture: UploadedSourceFile = {
  fileId: "file-assessment-1",
  learnerId,
  sourceType: "INSTITUTIONAL_ASSESSMENT",
  purpose: "OFFICIAL_ASSESSMENT_RESULTS",
  fileName: "ttap-summary.pdf",
  mimeType: "application/pdf",
  sizeBytes: 120000,
  uploadedByRole: "SPECIALIST",
  uploadedAt: now,
  sensitivity: "PROFESSIONAL_SENSITIVE",
  consentStatus: "PERMITTED",
  extractionStatus: "draft_created",
  sourceRef: {
    sourceType: "UPLOADED_SOURCE_FILE",
    sourcePackage: "3A",
    sourceRecordType: "UploadedSourceFile",
    sourceId: "file-assessment-1",
  },
};

export const extractedAssessmentDraftFixture: ExtractedSourceDraft = {
  draftId: "extract-assessment-1",
  fileId: uploadedAssessmentFileFixture.fileId,
  learnerId,
  extractedAt: now,
  extractedBy: "SYSTEM_EXTRACTION",
  status: "needs_review",
  aiDraftBoundary: "DRAFT_ONLY_REQUIRES_HUMAN_REVIEW",
  items: [
    {
      itemId: "extract-item-1",
      statement: "The learner completes a safety routine with direct support.",
      locationRef: "page:2",
      proposedOutputChannel: "EVIDENCE_RECORD",
      proposedConceptIds: ["SAFETY"],
      confidence: 0.74,
    },
  ],
  sourceRef: {
    sourceType: "UPLOADED_SOURCE_FILE",
    sourcePackage: "3A",
    sourceRecordType: "UploadedSourceFile",
    sourceId: uploadedAssessmentFileFixture.fileId,
  },
};

export const sourceExtractionReviewFixture: SourceExtractionReview = {
  reviewId: "review-extract-1",
  draftId: extractedAssessmentDraftFixture.draftId,
  fileId: uploadedAssessmentFileFixture.fileId,
  learnerId,
  reviewedByRole: "SPECIALIST",
  reviewedAt: now,
  decision: "approved_for_structured_response",
  reviewerNotes: "Confirmed against uploaded report summary.",
  createdStructuredResponseIds: ["structured-response-from-file-1"],
  sourceRef: {
    sourceType: "UPLOADED_SOURCE_FILE",
    sourcePackage: "3A",
    sourceRecordType: "ExtractedSourceDraft",
    sourceId: extractedAssessmentDraftFixture.draftId,
  },
};

export const reviewedEvidenceFixture: EvidenceRecord = {
  evidenceId: "evidence-from-reviewed-file-1",
  learnerId,
  sourceResponseId: "structured-response-from-file-1",
  evidenceType: "PERFORMANCE_ASSESSMENT",
  conceptId: "SAFETY",
  competencyId: "SAF-C001",
  componentIds: ["SAF-C001-M001"],
  performanceCode: "COMPLETES_WITH_DIRECT_SUPPORT",
  supportCodes: ["DIRECT_SUPPORT"],
  observedAt: now,
  portfolioTargetIds: ["PF_CURRENT_PERFORMANCE"],
  evidenceStatus: "accepted",
  mappingMode: "EXPLICIT_SELECTION",
  eligibleForLevelEngine: true,
  independentSourceKey: {
    sourceType: "INSTITUTIONAL_ASSESSMENT",
    administrationId: "admin-from-file-1",
    toolFamily: "official-assessment-upload",
    observerRole: "SPECIALIST",
    observedAt: now,
    contextCode: "CENTER",
  },
  sourceRef: {
    sourceType: "INSTITUTIONAL_ASSESSMENT",
    sourcePackage: "3A",
    sourceRecordType: "StructuredResponse",
    sourceId: "structured-response-from-file-1",
    provenanceRef: sourceExtractionReviewFixture.reviewId,
  },
};

export const goalDraftFixture: GoalDraft = {
  goalDraftId: "goal-draft-1",
  learnerId,
  goalText: "Within the plan period, given a visual checklist, the learner will complete a safety routine with no more than one prompt in 4 of 5 opportunities.",
  baselineEvidenceIds: [reviewedEvidenceFixture.evidenceId],
  knowledgeContextIds: ["stage2-ksi-family-1"],
  measurementMethod: "direct observation checklist",
  criterion: "4 of 5 opportunities across 3 sessions",
  context: "center routine",
  status: "quality_ready",
  createdByRole: "SPECIALIST",
  createdAt: now,
  sourceRef: {
    sourceType: "INSTITUTIONAL_ASSESSMENT",
    sourcePackage: "3A",
    sourceRecordType: "EvidenceRecord",
    sourceId: reviewedEvidenceFixture.evidenceId,
  },
};

export const goalApprovalRecordFixture: GoalApprovalRecord = {
  approvalId: "goal-approval-1",
  learnerId,
  goalDraftId: goalDraftFixture.goalDraftId,
  decision: "approved_for_plan_inclusion",
  decidedByRole: "SPECIALIST",
  decidedAt: now,
  qualityCheckId: "goal-quality-1",
  decisionRationale: "Goal has baseline evidence, measurement method, criterion, and context.",
  sourceRef: {
    sourceType: "GOAL",
    sourcePackage: "6A",
    sourceRecordType: "GoalDraft",
    sourceId: goalDraftFixture.goalDraftId,
  },
};

export const planDraftFixture: PlanDraft = {
  planDraftId: "plan-draft-1",
  learnerId,
  goalApprovalIds: [goalApprovalRecordFixture.approvalId],
  planPeriodStart: "2026-09-01",
  planPeriodEnd: "2027-08-31",
  status: "ready_for_review",
  createdByRole: "SPECIALIST",
  createdAt: now,
  sourceRef: {
    sourceType: "GOAL",
    sourcePackage: "6A",
    sourceRecordType: "GoalApprovalRecord",
    sourceId: goalApprovalRecordFixture.approvalId,
  },
};

export const planQualityReviewFixture: PlanQualityReview = {
  reviewId: "plan-quality-review-1",
  planDraftId: planDraftFixture.planDraftId,
  learnerId,
  reviewedAt: now,
  status: "passed",
  findings: ["Plan contains at least one goal approved for inclusion."],
  sourceRef: {
    sourceType: "PLAN_QUALITY",
    sourcePackage: "9A",
    sourceRecordType: "PlanDraft",
    sourceId: planDraftFixture.planDraftId,
  },
};

export const planApprovalRecordFixture: PlanApprovalRecord = {
  approvalId: "plan-approval-1",
  planDraftId: planDraftFixture.planDraftId,
  learnerId,
  decision: "approved",
  decidedByRole: "LEAD_SPECIALIST",
  decidedAt: now,
  planQualityReviewId: planQualityReviewFixture.reviewId,
  approvedGoalApprovalIds: [goalApprovalRecordFixture.approvalId],
  decisionRationale: "Plan goals and review findings are sufficient for approval.",
  sourceRef: {
    sourceType: "PLAN_QUALITY",
    sourcePackage: "9A",
    sourceRecordType: "PlanQualityReview",
    sourceId: planQualityReviewFixture.reviewId,
  },
};

export const invalidSprint1Fixtures = {
  noConsentExtractionFile: {
    ...uploadedAssessmentFileFixture,
    fileId: "file-no-consent",
    consentStatus: "NOT_PERMITTED",
    extractionStatus: "draft_created",
    sourceRef: {
      ...uploadedAssessmentFileFixture.sourceRef,
      sourceId: "file-no-consent",
    },
  },
  extractionAsDecision: {
    ...extractedAssessmentDraftFixture,
    draftId: "extract-invalid-decision",
    aiDraftBoundary: "NO_AUTOMATED_DECISION",
  },
  approvedReviewWithoutStructuredResponse: {
    ...sourceExtractionReviewFixture,
    reviewId: "review-invalid-no-response",
    createdStructuredResponseIds: [],
  },
  rawFileEvidence: {
    ...reviewedEvidenceFixture,
    evidenceId: "evidence-invalid-raw-file",
    sourceRef: {
      sourceType: "UPLOADED_SOURCE_FILE",
      sourcePackage: "3A",
      sourceRecordType: "UploadedSourceFile",
      sourceId: uploadedAssessmentFileFixture.fileId,
    },
  },
  goalWithoutBaseline: {
    ...goalDraftFixture,
    goalDraftId: "goal-invalid-no-baseline",
    baselineEvidenceIds: [],
  },
  planApprovalWithoutGoals: {
    ...planApprovalRecordFixture,
    approvalId: "plan-approval-invalid-no-goals",
    approvedGoalApprovalIds: [],
  },
} as const;

