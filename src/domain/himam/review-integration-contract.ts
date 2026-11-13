import type { TransitionEntityRef } from "./transition-architecture";
import type {
  ReviewLearningCandidateType,
  SharedTransitionEntityRef,
} from "./shared/himam-review-contract.v1";

export * from "./shared/himam-review-contract.v1";

export function toSharedTransitionEntityRef(
  ref: TransitionEntityRef,
): SharedTransitionEntityRef {
  return ref;
}

export type ReviewCandidateDecision = {
  candidateId: string;
  decision: "accepted" | "rejected" | "edited";
  decidedBy: string;
  decidedAt: string;
  rationale?: string;
  editedPayload?: Record<string, unknown>;
};

export type AcceptedReviewLearning = {
  acceptedLearningId: string;
  learnerRef: string;
  sourceReviewCaseId: string;
  sourceCandidateId: string;
  learningType: ReviewLearningCandidateType;
  acceptedPayload: Record<string, unknown>;
  status: "active" | "superseded" | "withdrawn";
  acceptedBy: string;
  acceptedAt: string;
};

export const HIMAM_REVIEW_INTEGRATION_GOVERNANCE = {
  networkConnectionEnabled: false,
  engineMayReadProfileSnapshot: true,
  engineProfileAccessMode: "readonly",
  engineMayWriteLearnerProfileDirectly: false,
  planFindingsMayUpdateProfile: false,
  learningCandidatesMayUpdateProfileDirectly: false,
  acceptedLearningRequiresHumanDecision: true,
  diagnosisTransferRequired: false,
  profileSnapshotMustBePurposeLimited: true,
  sharedKnowledgeLayerMayBeVersionAligned: true,
} as const;
