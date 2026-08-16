import type { EvidenceRecord, InferenceSuggestion, KnowledgeSupportItem, LearnerProfile } from "./types";

const now = "2026-08-09T00:00:00.000Z";

export const under14LearnerFixture: LearnerProfile = {
  learnerId: "learner-under-14",
  displayName: "متعلم أقل من 14",
  ageAtReviewInput: 11,
  ageBand: "UNDER_14",
  ageSourceRef: {
    sourceType: "LEARNER_PROFILE",
    sourcePackage: "UPSTREAM_PROFILE",
    sourceRecordType: "LearnerProfile",
    sourceId: "learner-under-14",
  },
  institutionId: "institution-demo",
  primaryContext: "school",
  familyVisionAvailability: "MISSING",
  learnerVoiceAvailability: "AVAILABLE",
  privacyConsentStatus: "PERMITTED",
  createdAt: now,
  updatedAt: now,
};

export const age14PlusLearnerFixture: LearnerProfile = {
  learnerId: "learner-age-14-plus",
  displayName: "متعلم 14 فأكثر",
  ageAtReviewInput: 16,
  ageBand: "AGE_14_PLUS",
  ageSourceRef: {
    sourceType: "LEARNER_PROFILE",
    sourcePackage: "UPSTREAM_PROFILE",
    sourceRecordType: "LearnerProfile",
    sourceId: "learner-age-14-plus",
  },
  institutionId: "institution-demo",
  primaryProgram: "transition-readiness",
  familyVisionAvailability: "AVAILABLE",
  learnerVoiceAvailability: "MISSING",
  privacyConsentStatus: "PERMITTED",
  createdAt: now,
  updatedAt: now,
};

export const stage2EvidenceFixture: EvidenceRecord = {
  evidenceId: "stage2-evidence-1",
  learnerId: age14PlusLearnerFixture.learnerId,
  sourceResponseId: "stage2-response-assessment-1",
  evidenceType: "PERFORMANCE_ASSESSMENT",
  conceptId: "SAFETY",
  competencyId: "SAF-C001",
  componentIds: ["SAF-C001-M001"],
  performanceCode: "FUNCTIONALLY_COMPLETED",
  supportCodes: ["DIRECT_SUPPORT"],
  observedAt: now,
  portfolioTargetIds: ["PF_CURRENT_PERFORMANCE"],
  evidenceStatus: "accepted",
  mappingMode: "CATALOG_FIXED",
  eligibleForLevelEngine: true,
  independentSourceKey: {
    sourceType: "INSTITUTIONAL_ASSESSMENT",
    administrationId: "stage2-admin-1",
    toolFamily: "institutional-assessment",
    observerRole: "SPECIALIST",
    observedAt: now,
    contextCode: "SCHOOL",
  },
  sourceRef: {
    sourceType: "INSTITUTIONAL_ASSESSMENT",
    sourcePackage: "3A",
    sourceRecordType: "StructuredResponse",
    sourceId: "stage2-response-assessment-1",
    provenanceRef: "stage2-admin-1",
  },
};

export const stage2KnowledgeSupportFixture: KnowledgeSupportItem = {
  knowledgeItemId: "stage2-ksi-family-1",
  learnerId: age14PlusLearnerFixture.learnerId,
  sourceResponseId: "stage2-response-family-1",
  informationType: "FAMILY_VISION",
  conceptIds: ["SELF_CARE"],
  portfolioTargetIds: ["PF_PRIORITY"],
  operationalFunction: "IDENTIFY_PRIORITY",
  responseCode: "FAMILY_PRIORITY_DAILY_INDEPENDENCE",
  capturedAt: now,
  mappingMode: "EXPLICIT_SELECTION",
  eligibleForLevelEngine: false,
  eligibleForPriorityEngine: true,
  eligibleForReport: true,
  sourceRef: {
    sourceType: "FAMILY_VISION",
    sourcePackage: "3A",
    sourceRecordType: "KnowledgeSupportItem",
    sourceId: "stage2-ksi-family-1",
    provenanceRef: "stage2-response-family-1",
  },
};

export const stage2InferenceSuggestionFixture: InferenceSuggestion = {
  suggestionId: "stage2-inference-1",
  sourceResponseId: "stage2-response-open-text-1",
  suggestedTargetType: "CONCEPT",
  suggestedValue: "COMM",
  reasonCode: "OPEN_TEXT_MENTIONS_REQUESTING_HELP",
  confidence: 0.68,
  status: "suggested",
  createdBy: "system",
  createdAt: now,
};

export const invalidStage2LearnerAgeBandFixture: LearnerProfile = {
  ...under14LearnerFixture,
  learnerId: "learner-invalid-age-band",
  ageAtReviewInput: 10,
  ageBand: "AGE_14_PLUS",
};

export const invalidStage2KnowledgeSupportLevelFixture = {
  ...stage2KnowledgeSupportFixture,
  knowledgeItemId: "stage2-ksi-invalid-level",
  eligibleForLevelEngine: true,
};
