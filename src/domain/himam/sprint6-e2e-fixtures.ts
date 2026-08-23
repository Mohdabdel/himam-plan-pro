import type { SourceRef } from "./source-types";
import type { EndToEndTrace, EndToEndTraceStepCode } from "./types";

const now = "2026-08-23T00:00:00.000Z";
const learnerId = "learner-sprint6-e2e";
const traceId = "trace-sprint6-mvp";

function sourceRef(sourceRecordType: SourceRef["sourceRecordType"], sourceId: string): SourceRef {
  const sourceType: SourceRef["sourceType"] =
    sourceRecordType === "LearnerProfile"
      ? "LEARNER_PROFILE"
      : sourceRecordType === "EndToEndTrace"
        ? "REPORT"
        : sourceRecordType === "PlanQualityReview" || sourceRecordType === "PlanApprovalRecord"
          ? "PLAN_QUALITY"
          : sourceRecordType === "GoalDraft" || sourceRecordType === "GoalApprovalRecord"
            ? "GOAL"
            : "UPLOADED_SOURCE_FILE";

  const sourcePackage: SourceRef["sourcePackage"] =
    sourceRecordType === "LearnerProfile"
      ? "UPSTREAM_PROFILE"
      : sourceRecordType === "EndToEndTrace"
        ? "11A"
        : sourceRecordType === "PlanQualityReview" || sourceRecordType === "PlanApprovalRecord"
          ? "9A"
          : sourceRecordType === "GoalDraft" || sourceRecordType === "GoalApprovalRecord"
            ? "8A"
            : "3A";

  return {
    sourceType,
    sourcePackage,
    sourceRecordType,
    sourceId,
  };
}

const orderedSteps: Array<[EndToEndTraceStepCode, SourceRef]> = [
  ["CREATE_LEARNER", sourceRef("LearnerProfile", learnerId)],
  ["UPLOAD_SOURCE", sourceRef("ProtectedSourceFileMetadata", "protected-file-metadata-sprint6")],
  ["CREATE_EXTRACTION_DRAFT", sourceRef("ExtractedSourceDraft", "extract-sprint6")],
  ["REVIEW_EXTRACTION", sourceRef("SourceExtractionReview", "review-sprint6")],
  ["INFORMATION_SUFFICIENCY", sourceRef("StructuredResponse", "structured-response-sprint6")],
  ["KNOWLEDGE_SUPPORT", sourceRef("KnowledgeSupportItem", "ksi-sprint6")],
  ["CREATE_GOAL_DRAFT", sourceRef("GoalDraft", "goal-draft-sprint6")],
  ["APPROVE_GOAL", sourceRef("GoalApprovalRecord", "goal-approval-sprint6")],
  ["CREATE_PLAN_DRAFT", sourceRef("PlanDraft", "plan-draft-sprint6")],
  ["APPROVE_PLAN", sourceRef("PlanApprovalRecord", "plan-approval-sprint6")],
  ["TRACE_COMPLETE", sourceRef("EndToEndTrace", traceId)],
];

export const sprint6EndToEndTraceFixture: EndToEndTrace = {
  traceId,
  learnerId,
  startedAt: now,
  completedAt: now,
  steps: orderedSteps.map(([stepCode, stepSourceRef]) => ({
    stepCode,
    sourceRef: stepSourceRef,
    status: "PASS",
    checkedAt: now,
  })),
  overallStatus: "PASS",
  sourceRef: sourceRef("EndToEndTrace", traceId),
};

export const sprint6RequiredStepCodes = orderedSteps.map(([stepCode]) => stepCode);
