import type {
  ReviewIntegrationPackage,
  ReviewProfileSnapshot,
} from "./review-integration-contract";
import {
  createReviewIntegrationInboxItem,
  validateReviewIntegrationPackage,
} from "./review-integration-service";

export const HIMAM_REVIEW_TRANSPORT_FEATURE = {
  enabled: false,
  syntheticOnly: true,
  protocolVersion: "himam-review-integration-v1",
} as const;

export type ReviewTransportEnvelope<TPayload> = {
  protocolVersion: typeof HIMAM_REVIEW_TRANSPORT_FEATURE.protocolVersion;
  transportId: string;
  createdAt: string;
  synthetic: boolean;
  payload: TPayload;
};

export function createProfileSnapshotEnvelope(
  snapshot: ReviewProfileSnapshot,
  transportId = `snapshot-${snapshot.learnerRef}-${snapshot.profileVersion}`,
): ReviewTransportEnvelope<ReviewProfileSnapshot> {
  if (!HIMAM_REVIEW_TRANSPORT_FEATURE.syntheticOnly) {
    throw new Error("Unexpected transport configuration.");
  }
  return {
    protocolVersion: HIMAM_REVIEW_TRANSPORT_FEATURE.protocolVersion,
    transportId,
    createdAt: new Date().toISOString(),
    synthetic: true,
    payload: snapshot,
  };
}

export function receiveReviewPackageEnvelope(
  envelope: ReviewTransportEnvelope<ReviewIntegrationPackage>,
) {
  if (!envelope.synthetic) {
    throw new Error("REAL_DATA_TRANSPORT_BLOCKED");
  }
  if (envelope.protocolVersion !== HIMAM_REVIEW_TRANSPORT_FEATURE.protocolVersion) {
    throw new Error("INCOMPATIBLE_PROTOCOL_VERSION");
  }
  const validation = validateReviewIntegrationPackage(envelope.payload);
  if (!validation.ok) {
    throw new Error(`INVALID_REVIEW_PACKAGE:${validation.issues.join(",")}`);
  }
  return createReviewIntegrationInboxItem(envelope.payload, envelope.createdAt);
}

export const HIMAM_REVIEW_TRANSPORT_GOVERNANCE = {
  realDataAllowed: false,
  automaticNetworkSendAllowed: false,
  automaticNetworkReceiveAllowed: false,
  endpointBindingAllowedNow: false,
  syntheticEnvelopeAllowed: true,
  directLearnerMutationAllowed: false,
} as const;
