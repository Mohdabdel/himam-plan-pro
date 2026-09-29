import {
  buildGoalOpportunityCards,
  buildGoalProposals,
  type GoalOpportunityCard,
  type GoalProposal,
} from "@/lib/goal-opportunity-engine";
import type { ProcessedCurrentLevelRow } from "@/lib/current-level-draft";
import type {
  AssessmentRecord,
  LearnerProfileProcessingModel,
} from "@/types/himam";

export type GoalAiLayerPolicy = {
  layerName: "BOUNDED_GOAL_AI_LAYER";
  mode: "deterministic_ai_assist";
  decisionBoundary: "review_support_only";
  fallback: "rules_engine_when_model_unavailable";
  producesApproval: false;
  producesBaseline: false;
  producesNumericPsychometricScore: false;
  requiresHumanReview: true;
  guardrailsAr: string[];
};

export type GoalAiSuggestionSet = {
  policy: GoalAiLayerPolicy;
  opportunities: GoalOpportunityCard[];
  proposals: GoalProposal[];
  visibleSummaryAr: string;
  limitationAr: string;
};

export const GOAL_AI_LAYER_POLICY: GoalAiLayerPolicy = {
  layerName: "BOUNDED_GOAL_AI_LAYER",
  mode: "deterministic_ai_assist",
  decisionBoundary: "review_support_only",
  fallback: "rules_engine_when_model_unavailable",
  producesApproval: false,
  producesBaseline: false,
  producesNumericPsychometricScore: false,
  requiresHumanReview: true,
  guardrailsAr: [
    "لا تضيف الطبقة خطاً قاعدياً غير موجود في مصادر الأداء.",
    "لا تعتمد هدفاً أو خطة، ولا ترفع هدفاً لمسار الخطة.",
    "لا تستخدم صوت الأسرة أو المتعلم كدليل أداء منفرد.",
    "المقترحات غير المرتبطة بدليل تظهر كحاجة استكمال لا كهدف جاهز.",
    "كل مقترح يبقى قابلاً للتعديل والمراجعة البشرية.",
  ],
};

export function buildBoundedGoalAiSuggestions(input: {
  currentLevelRows: ProcessedCurrentLevelRow[];
  assessmentRecords: AssessmentRecord[];
  profileProcessing: LearnerProfileProcessingModel;
  planVisionAr?: string;
  familyVisionAr?: string;
  familyPrioritiesAr?: string[];
  learnerVoiceAr?: string;
  ageYears?: number | null;
  selectedDomainCode?: string;
  selectedDomainNameAr?: string;
  studentNameAr?: string;
  maxVisibleProposals?: number;
}): GoalAiSuggestionSet {
  const opportunities = buildGoalOpportunityCards({
    currentLevelRows: input.currentLevelRows,
    assessmentRecords: input.assessmentRecords,
    profileProcessing: input.profileProcessing,
    planVisionAr: input.planVisionAr,
    familyVisionAr: input.familyVisionAr,
    familyPrioritiesAr: input.familyPrioritiesAr,
    learnerVoiceAr: input.learnerVoiceAr,
    ageYears: input.ageYears,
  });

  const selectedOpportunities = opportunities
    .filter((card) => (
      !input.selectedDomainCode ||
      card.domainCode === input.selectedDomainCode ||
      card.domainNameAr === input.selectedDomainCode ||
      card.domainNameAr === input.selectedDomainNameAr
    ))
    .slice(0, 3);

  const proposals = selectedOpportunities.flatMap((opportunity) => (
    buildGoalProposals({
      opportunity,
      studentNameAr: input.studentNameAr,
      maxProposals: 3,
    })
  )).slice(0, input.maxVisibleProposals ?? 3);

  const evidenceBoundCount = proposals.filter((proposal) => proposal.readiness !== "needs_evidence").length;

  return {
    policy: GOAL_AI_LAYER_POLICY,
    opportunities: selectedOpportunities,
    proposals,
    visibleSummaryAr: proposals.length > 0
      ? `أنتجت طبقة AI ${proposals.length} مقترحات مضبوطة، منها ${evidenceBoundCount} مرتبطة بدليل كاف للإضافة كمسودة.`
      : "لا توجد مقترحات AI قابلة للعرض بعد؛ تحتاج الشاشة إلى مجال أو مستوى أداء/دليل سابق.",
    limitationAr: "هذه طبقة AI مساعدة داخل حدود المراجعة فقط؛ تستخدم fallback قواعدي حالياً ولا ترسل بيانات إلى نموذج خارجي.",
  };
}
