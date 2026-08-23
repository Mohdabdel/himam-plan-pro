import type {
  GoalApprovalRecord,
  GoalDraft,
  PlanDraft,
  PlanQualityReview,
} from "@/domain/himam";
import {
  validateGoalApprovalRecord,
  validateGoalDraft,
  validatePlanDraft,
  validatePlanQualityReview,
} from "@/domain/himam";

export type ApprovableGoalInput = {
  id: string;
  domainCode: string;
  text: string;
  context?: string;
  criterion?: string;
  measurementMethod?: string;
  evidenceRef?: string;
};

export type GoalApprovalBundle = {
  localGoalId: string;
  domainCode: string;
  goalDraft: GoalDraft;
  approval: GoalApprovalRecord;
};

export type PlanGovernanceBundle = {
  planDraft: PlanDraft;
  qualityReview: PlanQualityReview;
};

function id(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}

function assertValid(label: string, result: { ok: boolean; issues: Array<{ message: string }> }) {
  if (!result.ok) {
    throw new Error(`${label}: ${result.issues.map((issue) => issue.message).join("; ")}`);
  }
}

function stableEvidenceId(goal: ApprovableGoalInput) {
  return `evidence-${goal.domainCode}-${goal.id}`;
}

function stableStructuredResponseId(goal: ApprovableGoalInput) {
  return `structured-response-${goal.domainCode}-${goal.id}`;
}

export function goalApprovalsKey(learnerId: string) {
  return `himam_goal_approvals_${learnerId}`;
}

export function planGovernanceKey(learnerId: string) {
  return `himam_plan_governance_${learnerId}`;
}

export function loadGoalApprovalBundles(learnerId: string): GoalApprovalBundle[] {
  try {
    return JSON.parse(localStorage.getItem(goalApprovalsKey(learnerId)) || "[]") as GoalApprovalBundle[];
  } catch {
    return [];
  }
}

export function saveGoalApprovalBundles(learnerId: string, bundles: GoalApprovalBundle[]) {
  localStorage.setItem(goalApprovalsKey(learnerId), JSON.stringify(bundles));
  return bundles;
}

export function loadPlanGovernanceBundle(learnerId: string): PlanGovernanceBundle | null {
  try {
    return JSON.parse(localStorage.getItem(planGovernanceKey(learnerId)) || "null") as PlanGovernanceBundle | null;
  } catch {
    return null;
  }
}

export function savePlanGovernanceBundle(learnerId: string, bundle: PlanGovernanceBundle) {
  localStorage.setItem(planGovernanceKey(learnerId), JSON.stringify(bundle));
  return bundle;
}

export function buildGoalApprovalBundles(input: {
  learnerId: string;
  goals: ApprovableGoalInput[];
  decidedByRole?: string;
}): GoalApprovalBundle[] {
  const now = new Date().toISOString();
  return input.goals
    .filter((goal) => goal.text.trim())
    .map((goal) => {
      const goalDraftId = id("goal-draft");
      const goalDraft: GoalDraft = {
        goalDraftId,
        learnerId: input.learnerId,
        goalText: goal.text,
        baselineEvidenceIds: [stableEvidenceId(goal)],
        knowledgeContextIds: goal.evidenceRef ? [stableStructuredResponseId(goal)] : [],
        measurementMethod: goal.measurementMethod || "طريقة قياس محددة في شاشة الهدف",
        criterion: goal.criterion || "معيار إتقان محدد في شاشة الهدف",
        context: goal.context || "سياق وظيفي محدد في شاشة الهدف",
        status: "quality_ready",
        createdByRole: "SPECIALIST",
        createdAt: now,
        sourceRef: {
          sourceType: "INSTITUTIONAL_ASSESSMENT",
          sourcePackage: "6A",
          sourceRecordType: "StructuredResponse",
          sourceId: stableStructuredResponseId(goal),
        },
      };

      const approval: GoalApprovalRecord = {
        approvalId: id("goal-approval"),
        learnerId: input.learnerId,
        goalDraftId,
        decision: "approved_for_plan_inclusion",
        decidedByRole: input.decidedByRole ?? "SPECIALIST",
        decidedAt: now,
        qualityCheckId: `quality-check-${goal.id}`,
        decisionRationale: "استوفى الهدف عناصر الحفظ الحرجة واعتمد كوحدة قابلة للإدراج في الخطة.",
        sourceRef: {
          sourceType: "GOAL",
          sourcePackage: "6A",
          sourceRecordType: "GoalDraft",
          sourceId: goalDraftId,
        },
      };

      assertValid("GoalDraft", validateGoalDraft(goalDraft));
      assertValid("GoalApprovalRecord", validateGoalApprovalRecord(approval));

      return {
        localGoalId: goal.id,
        domainCode: goal.domainCode,
        goalDraft,
        approval,
      };
    });
}

export function buildPlanGovernanceBundle(input: {
  learnerId: string;
  goalApprovalIds: string[];
  planPeriodStart?: string;
  createdByRole?: string;
  findings?: string[];
}): PlanGovernanceBundle {
  const now = new Date().toISOString();
  const start = input.planPeriodStart || now.slice(0, 10);
  const endYear = Number(start.slice(0, 4)) + 1;
  const end = `${endYear}${start.slice(4)}`;
  const planDraftId = id("plan-draft");

  const planDraft: PlanDraft = {
    planDraftId,
    learnerId: input.learnerId,
    goalApprovalIds: input.goalApprovalIds,
    planPeriodStart: start,
    planPeriodEnd: end,
    status: "ready_for_review",
    createdByRole: input.createdByRole ?? "SPECIALIST",
    createdAt: now,
    sourceRef: {
      sourceType: "GOAL",
      sourcePackage: "6A",
      sourceRecordType: "GoalApprovalRecord",
      sourceId: input.goalApprovalIds[0] ?? "missing-goal-approval",
    },
  };

  const qualityReview: PlanQualityReview = {
    reviewId: id("plan-quality-review"),
    planDraftId,
    learnerId: input.learnerId,
    reviewedAt: now,
    status: input.goalApprovalIds.length > 0 ? "passed" : "needs_revision",
    findings: input.findings?.length
      ? input.findings
      : ["الخطة مبنية من أهداف معتمدة كوحدات، وتحتاج اعتماد المختص الأعلى قبل اعتبارها نهائية."],
    sourceRef: {
      sourceType: "PLAN_QUALITY",
      sourcePackage: "9A",
      sourceRecordType: "PlanDraft",
      sourceId: planDraftId,
    },
  };

  assertValid("PlanDraft", validatePlanDraft(planDraft));
  assertValid("PlanQualityReview", validatePlanQualityReview(qualityReview));

  return { planDraft, qualityReview };
}
