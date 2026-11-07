import { describe, expect, it } from "vitest";
import {
  buildReviewProfileSnapshot,
  createReviewIntegrationInboxItem,
  getHumanReviewQueue,
  acceptReviewLearningCandidate,
} from "./review-integration-service";
import {
  HIMAM_REVIEW_INTEGRATION_PROTOCOL,
  type ReviewIntegrationPackage,
} from "./review-integration-contract";

describe("Himam review integration end-to-end synthetic flow", () => {
  it("creates a readonly profile snapshot and receives a review package without automatic learner mutation", () => {
    const snapshot = buildReviewProfileSnapshot({
      learnerRef: "learner-synthetic-001",
      profileVersion: "profile-v1",
      generatedAt: "2026-11-07T00:00:00.000Z",
      acceptedEvidenceSummaries: [
        {
          evidenceRef: "ev-1",
          summary: "أداء وظيفي متحقق في سياق المدرسة مع دعم لفظي خفيف.",
          context: "school",
          supportSummary: "minimal verbal support",
        },
      ],
      acceptedPlanningPriorities: [
        {
          priorityRef: "prio-1",
          summary: "توسيع الأداء إلى سياق مجتمعي.",
          sourceRefs: ["ev-1"],
        },
      ],
      goalHistory: [
        {
          goalRef: "goal-prev-1",
          goalText: "استخدام وسيلة تنقل مألوفة بدعم.",
          status: "completed",
          evidenceRefs: ["ev-1"],
        },
      ],
      acceptedSupportSummaries: [
        {
          supportRef: "sup-1",
          summary: "التوجيه اللفظي الخفيف فعال في السياق الحالي.",
          context: "school",
        },
      ],
      learnerVoiceSummary: "يفضل المشاركة في أنشطة مجتمعية عملية.",
      familyVisionSummary: "ترغب الأسرة في زيادة المشاركة المجتمعية الآمنة.",
    });

    expect(snapshot.protocolVersion).toBe(HIMAM_REVIEW_INTEGRATION_PROTOCOL);
    expect(snapshot.readonly).toBe(true);
    expect(snapshot.purpose).toBe("PLAN_REVIEW");

    const pkg: ReviewIntegrationPackage = {
      protocolVersion: HIMAM_REVIEW_INTEGRATION_PROTOCOL,
      reviewEngine: "smart-iep-engine",
      reviewEngineVersion: "supervisory-v5",
      reviewCaseId: "RC-SYNTH-001",
      learnerRef: snapshot.learnerRef,
      sourcePlanRef: "synthetic-plan.pdf",
      generatedAt: "2026-11-07T00:10:00.000Z",
      profileSnapshotVersionUsed: snapshot.profileVersion,
      interactionModes: [
        "PLAN_QUALITY_GATE",
        "PROFILE_PLAN_CONSISTENCY",
        "LONGITUDINAL_LEARNING",
      ],
      planFindings: [
        {
          findingId: "pf-1",
          category: "GOAL_QUALITY",
          severity: "IMPORTANT",
          summary: "الهدف يحتاج معيار قياس أكثر تحديدًا.",
          planRefs: ["goal-current-1"],
          destination: "PLAN_ONLY",
        },
      ],
      profileComparisonFindings: [
        {
          findingId: "pc-1",
          comparisonType: "GOAL_REPEATS_COMPLETED_TARGET",
          summary: "الخطة الجديدة تعيد هدفًا موثقًا سابقًا كمكتمل دون توضيح تقدّم جديد.",
          profileRefs: ["goal-prev-1"],
          planRefs: ["goal-current-1"],
          confidence: "HIGH",
          requiresHumanReview: true,
        },
      ],
      learningCandidates: [
        {
          candidateId: "lc-1",
          candidateType: "PLANNING_IMPLICATION",
          summary: "النظر في الانتقال من إعادة تدريب المهارة إلى تعميمها في المجتمع.",
          sourceReviewCaseId: "RC-SYNTH-001",
          sourcePlanRefs: ["goal-current-1"],
          supportingEvidenceRefs: ["ev-1"],
          proposedPayload: {
            implication: "generalize_to_community",
            sourceGoalRef: "goal-prev-1",
          },
          status: "candidate",
          requiresHumanApproval: true,
        },
      ],
      reviewDecision: "جاهزة بعد تعديلات محدودة",
      provenanceRefs: ["synthetic-e2e-test"],
    };

    const inbox = createReviewIntegrationInboxItem(pkg, "2026-11-07T00:11:00.000Z");
    expect(inbox.status).toBe("received");
    expect(inbox.planFindingCount).toBe(1);
    expect(inbox.profileComparisonFindingCount).toBe(1);
    expect(inbox.learningCandidateCount).toBe(1);

    const queue = getHumanReviewQueue(pkg);
    expect(queue.profileComparisons).toHaveLength(1);
    expect(queue.learningCandidates).toHaveLength(1);

    const rejected = acceptReviewLearningCandidate({
      learnerRef: snapshot.learnerRef,
      candidate: queue.learningCandidates[0],
      reviewCaseId: pkg.reviewCaseId,
      decision: {
        candidateId: "lc-1",
        decision: "rejected",
        decidedBy: "synthetic-reviewer",
        decidedAt: "2026-11-07T00:12:00.000Z",
      },
    });
    expect(rejected).toBeNull();

    const accepted = acceptReviewLearningCandidate({
      learnerRef: snapshot.learnerRef,
      candidate: queue.learningCandidates[0],
      reviewCaseId: pkg.reviewCaseId,
      decision: {
        candidateId: "lc-1",
        decision: "accepted",
        decidedBy: "synthetic-reviewer",
        decidedAt: "2026-11-07T00:13:00.000Z",
      },
    });
    expect(accepted?.learningType).toBe("PLANNING_IMPLICATION");
    expect(accepted?.status).toBe("active");
    expect(accepted?.sourceReviewCaseId).toBe("RC-SYNTH-001");
  });
});
