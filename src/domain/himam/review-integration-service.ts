import {
  HIMAM_REVIEW_INTEGRATION_PROTOCOL,
  type AcceptedReviewLearning,
  type ReviewCandidateDecision,
  type ReviewIntegrationPackage,
  type ReviewLearningCandidate,
  type ReviewProfileSnapshot,
} from "./review-integration-contract";

export type ReviewIntegrationInboxItem = {
  packageId: string;
  receivedAt: string;
  reviewCaseId: string;
  sourcePlanRef: string;
  learnerRef?: string;
  planFindingCount: number;
  profileComparisonFindingCount: number;
  learningCandidateCount: number;
  status: "received" | "under_review" | "processed" | "rejected";
};

export function buildReviewProfileSnapshot(
  input: Omit<ReviewProfileSnapshot, "protocolVersion" | "purpose" | "readonly">,
): ReviewProfileSnapshot {
  return {
    ...input,
    protocolVersion: HIMAM_REVIEW_INTEGRATION_PROTOCOL,
    purpose: "PLAN_REVIEW",
    readonly: true,
  };
}

export function validateReviewIntegrationPackage(
  pkg: ReviewIntegrationPackage,
): { ok: true } | { ok: false; issues: string[] } {
  const issues: string[] = [];

  if (pkg.protocolVersion !== HIMAM_REVIEW_INTEGRATION_PROTOCOL) {
    issues.push("INCOMPATIBLE_PROTOCOL_VERSION");
  }
  if (pkg.reviewEngine !== "smart-iep-engine") {
    issues.push("UNSUPPORTED_REVIEW_ENGINE");
  }
  if (!pkg.reviewCaseId) issues.push("MISSING_REVIEW_CASE_ID");
  if (!pkg.sourcePlanRef) issues.push("MISSING_SOURCE_PLAN_REF");
  if (!pkg.generatedAt) issues.push("MISSING_GENERATED_AT");

  if (pkg.planFindings.some((item) => item.destination !== "PLAN_ONLY")) {
    issues.push("PLAN_FINDING_DESTINATION_INVALID");
  }
  if (pkg.learningCandidates.some((item) => item.status !== "candidate" || item.requiresHumanApproval !== true)) {
    issues.push("LEARNING_CANDIDATE_GOVERNANCE_INVALID");
  }
  if (pkg.profileComparisonFindings.some((item) => item.requiresHumanReview !== true)) {
    issues.push("PROFILE_COMPARISON_REQUIRES_HUMAN_REVIEW");
  }

  return issues.length > 0 ? { ok: false, issues } : { ok: true };
}

export function createReviewIntegrationInboxItem(
  pkg: ReviewIntegrationPackage,
  receivedAt = new Date().toISOString(),
): ReviewIntegrationInboxItem {
  const validation = validateReviewIntegrationPackage(pkg);
  if (!validation.ok) {
    throw new Error(`Invalid review integration package: ${validation.issues.join(", ")}`);
  }

  return {
    packageId: `${pkg.protocolVersion}:${pkg.reviewCaseId}`,
    receivedAt,
    reviewCaseId: pkg.reviewCaseId,
    sourcePlanRef: pkg.sourcePlanRef,
    learnerRef: pkg.learnerRef,
    planFindingCount: pkg.planFindings.length,
    profileComparisonFindingCount: pkg.profileComparisonFindings.length,
    learningCandidateCount: pkg.learningCandidates.length,
    status: "received",
  };
}

export function getPlanOnlyFindings(pkg: ReviewIntegrationPackage) {
  return pkg.planFindings;
}

export function getHumanReviewQueue(pkg: ReviewIntegrationPackage): {
  profileComparisons: ReviewIntegrationPackage["profileComparisonFindings"];
  learningCandidates: ReviewLearningCandidate[];
} {
  return {
    profileComparisons: pkg.profileComparisonFindings,
    learningCandidates: pkg.learningCandidates,
  };
}

export function acceptReviewLearningCandidate(input: {
  learnerRef: string;
  candidate: ReviewLearningCandidate;
  decision: ReviewCandidateDecision;
  reviewCaseId: string;
}): AcceptedReviewLearning | null {
  if (input.decision.candidateId !== input.candidate.candidateId) {
    throw new Error("Candidate decision does not match candidate.");
  }
  if (input.decision.decision === "rejected") return null;

  const acceptedPayload =
    input.decision.decision === "edited" && input.decision.editedPayload
      ? input.decision.editedPayload
      : input.candidate.proposedPayload;

  return {
    acceptedLearningId: `arl-${input.reviewCaseId}-${input.candidate.candidateId}`,
    learnerRef: input.learnerRef,
    sourceReviewCaseId: input.reviewCaseId,
    sourceCandidateId: input.candidate.candidateId,
    learningType: input.candidate.candidateType,
    acceptedPayload,
    status: "active",
    acceptedBy: input.decision.decidedBy,
    acceptedAt: input.decision.decidedAt,
  };
}

export const REVIEW_INTEGRATION_SERVICE_GOVERNANCE = {
  mayCreateReadonlyProfileSnapshot: true,
  mayReceiveReviewPackage: true,
  mayRoutePlanFindingsBackToPlan: true,
  mayQueueProfileComparisonsForHumanReview: true,
  mayQueueLearningCandidatesForHumanReview: true,
  mayCreateAcceptedReviewLearningAfterHumanDecision: true,
  mayWriteLearnerProfileDirectly: false,
  mayCreateGoalAutomatically: false,
  mayChangeCompetencyLevelAutomatically: false,
  mayDeleteHistoricalData: false,
} as const;
