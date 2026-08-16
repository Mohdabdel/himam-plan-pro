import type {
  EvidenceRecord,
  InferenceSuggestion,
  KnowledgeSupportItem,
  LearnerProfile,
  VerificationRun,
} from "./types";
import {
  validateAutomatedHumanApprovalWrite,
  validateConceptValue,
  validateEvidenceRecord,
  validateInferenceSuggestion,
  validateKnowledgeSupportItem,
  validateLearnerProfile,
  validateVerificationRun,
} from "./validators";

const now = "2026-08-09T00:00:00.000Z";

export const validLearnerProfileFixture: LearnerProfile = {
  learnerId: "learner-age-14-plus",
  displayName: "متعلم تجريبي",
  ageAtReviewInput: 14,
  ageBand: "AGE_14_PLUS",
  ageSourceRef: {
    sourceType: "LEARNER_PROFILE",
    sourcePackage: "UPSTREAM_PROFILE",
    sourceRecordType: "LearnerProfile",
    sourceId: "learner-age-14-plus",
  },
  institutionId: "institution-demo",
  primaryProgram: "transition-readiness",
  familyVisionAvailability: "MISSING",
  learnerVoiceAvailability: "AVAILABLE",
  privacyConsentStatus: "PERMITTED",
  createdAt: now,
  updatedAt: now,
};

export const validEvidenceRecordFixture: EvidenceRecord = {
  evidenceId: "evidence-1",
  learnerId: "learner-age-14-plus",
  sourceResponseId: "response-1",
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
    administrationId: "administration-1",
    toolId: "tool-safety-1",
    observerRole: "SPECIALIST",
    observedAt: now,
    contextCode: "SCHOOL",
  },
  sourceRef: {
    sourceType: "INSTITUTIONAL_ASSESSMENT",
    sourcePackage: "3A",
    sourceRecordType: "StructuredResponse",
    sourceId: "response-1",
    provenanceRef: "administration-1",
  },
};

export const validKnowledgeSupportItemFixture: KnowledgeSupportItem = {
  knowledgeItemId: "ksi-1",
  learnerId: "learner-age-14-plus",
  sourceResponseId: "response-voice-1",
  informationType: "LEARNER_VOICE",
  conceptIds: ["COMM"],
  portfolioTargetIds: ["PF_VOICE_PREFERENCE"],
  operationalFunction: "IDENTIFY_PRIORITY",
  responseCode: "PREFERS_VISUAL_CHOICES",
  capturedAt: now,
  mappingMode: "EXPLICIT_SELECTION",
  eligibleForLevelEngine: false,
  eligibleForPriorityEngine: true,
  eligibleForReport: true,
  sourceRef: {
    sourceType: "LEARNER_VOICE",
    sourcePackage: "3A",
    sourceRecordType: "KnowledgeSupportItem",
    sourceId: "ksi-1",
  },
};

export const validInferenceSuggestionFixture: InferenceSuggestion = {
  suggestionId: "inference-1",
  sourceResponseId: "response-inferred-1",
  suggestedTargetType: "CONCEPT",
  suggestedValue: "COMM",
  reasonCode: "TEXT_CLASSIFIED_TO_COMM",
  confidence: 0.72,
  status: "suggested",
  createdBy: "system",
  createdAt: now,
};

export const stage1VerificationRunFixture: VerificationRun = {
  verificationRunId: "VR-STAGE-01-DRAFT",
  packageId: "STAGE-01-KNOWLEDGE-VALIDATION",
  deliveryMaturity: "CODE_PRESENT_NOT_VERIFIED",
  startedAt: now,
  completedAt: now,
  checks: {
    build: { status: "NOT_RUN" },
    typecheck: { status: "NOT_RUN" },
    dataIntegrity: { status: "PASS", command: "npm run verify:stage1" },
    userJourney: { status: "NOT_RUN", notes: "Internal validation harness only at this stage" },
    traceability: { status: "PASS", notes: "Fixtures expose SourceRef and owner package" },
  },
  modifiedFiles: [],
  completedItems: ["Stage 1 domain contracts", "Stage 1 validators", "Stage 1 fixtures"],
  incompleteItems: ["Repository build/typecheck VerificationRun evidence"],
  knownGaps: ["Canonical competency/component registry not yet wired"],
  overallStatus: "NOT_VERIFIED",
};

export function runStage1FixtureChecks() {
  return [
    {
      name: "concept registry accepts official concept",
      result: validateConceptValue("SAFETY"),
      expectOk: true,
    },
    {
      name: "concept registry rejects 11th concept",
      result: validateConceptValue("MONEY_MANAGEMENT"),
      expectOk: false,
    },
    {
      name: "concept registry rejects HIMAMPRO_ prefix",
      result: validateConceptValue("HIMAMPRO_COMM"),
      expectOk: false,
    },
    {
      name: "valid learner profile",
      result: validateLearnerProfile(validLearnerProfileFixture),
      expectOk: true,
    },
    {
      name: "valid evidence record",
      result: validateEvidenceRecord(validEvidenceRecordFixture),
      expectOk: true,
    },
    {
      name: "valid KSI",
      result: validateKnowledgeSupportItem(validKnowledgeSupportItemFixture),
      expectOk: true,
    },
    {
      name: "valid suggested inference",
      result: validateInferenceSuggestion(validInferenceSuggestionFixture),
      expectOk: true,
    },
    {
      name: "automated human approval write rejected",
      result: validateAutomatedHumanApprovalWrite({
        actorContext: "AUTOMATED_PACKAGE",
        attemptedValue: "approval-ref-1",
      }),
      expectOk: false,
    },
    {
      name: "verification run shape",
      result: validateVerificationRun(stage1VerificationRunFixture),
      expectOk: true,
    },
  ];
}
