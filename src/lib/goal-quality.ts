// ── Goal quality model ───────────────────────────────────────────────────────
// Computes the two-axis quality checklist for a single transition goal from
// data that already exists elsewhere in the journey (coverage, family voice,
// learner voice) — no new data source is introduced, and nothing here
// produces a numeric score. Every signal resolves to one of three states:
// "done" | "needs" | "advisory". "advisory" always means either the item is
// non-blocking by nature (e.g. linked life practice) or the upstream data it
// would check against doesn't exist yet for this student.

import {
  getQualityReferenceIdsForCriterion,
  type QualityCriterionId,
  type QualityReferenceSourceId,
} from "@/domain/himam/plan-quality-references";
import type { LearnerProfileProcessingModel } from "@/types/himam";

export type QualityState = "done" | "needs" | "advisory";

export type QualityItem = {
  axis: 1 | 2;
  label: string;
  state: QualityState;
  note?: string;
  hardStop?: boolean;
  /** True when this hard-stop item is still unresolved but a documented
   *  professional override exists for it — it no longer blocks saving,
   *  but stays visibly "needs" rather than silently flipping to "done". */
  overridden?: boolean;
};

export type GoalOverride = {
  reason: string;
  note?: string;
  at: string;
};

export type GoalQualityInput = {
  goalText: string;
  goalTrigger?: string;
  performanceAnchor?: string;
  context: string;
  criterion: string;
  measurementMethod: string;
  evidenceRef: string;
  lifePractice: string;
  domainCode: string;
  coverage: {
    filledDomains?: string[];
    failedDomains?: string[];
    emergingDomains?: string[];
  } | null;
  family: {
    priorities?: string[];
    vision5y?: string;
  } | null;
  learnerVoice: {
    q_love?: string;
    q_good?: string;
  } | null;
  override?: GoalOverride | null;
};

export type QualityFindingSeverity = "blocking" | "warning" | "advisory";
export type QualityFindingScope = "goal" | "plan" | "transition";
export type QualityFindingSource =
  | "evidence"
  | "profile_component"
  | "goal_text"
  | "measurement"
  | "plan_coherence"
  | "transition_reference";

export type GoalPlanQualityFinding = {
  id: string;
  severity: QualityFindingSeverity;
  scope: QualityFindingScope;
  source: QualityFindingSource;
  messageAr: string;
  criterionIds: QualityCriterionId[];
  sourceReferences: QualityReferenceSourceId[];
};

export type GoalPlanQualityRubricResult = {
  blockingFindings: GoalPlanQualityFinding[];
  warnings: GoalPlanQualityFinding[];
  advisories: GoalPlanQualityFinding[];
  sourceReferences: QualityReferenceSourceId[];
  reviewSummaryAr: string;
  decisionBoundary: "review_support_only";
  producesApproval: false;
  producesNumericScore: false;
};

function normalizeWords(text: string): Set<string> {
  return new Set(
    text
      .split(/[\s،.,؛:؟!/-]+/)
      .map((w) => w.trim())
      .filter((w) => w.length >= 3),
  );
}

/** Simple word-overlap check — not semantic matching. Used only as a light,
 *  honest signal that a goal's wording touches an already-documented source. */
function hasWordOverlap(a: string, b: string): boolean {
  const wordsB = normalizeWords(b);
  for (const w of normalizeWords(a)) if (wordsB.has(w)) return true;
  return false;
}

export function computeGoalQuality(input: GoalQualityInput): QualityItem[] {
  const goalText = input.goalText.trim();
  const hasCriterion = input.criterion.trim().length > 0;
  const hasMeasurement = input.measurementMethod.trim().length > 0;
  const hasEvidence = input.evidenceRef.trim().length > 0 || !!input.performanceAnchor?.trim();

  // احتياج/أولوية: مبني على مجالات التغطية المتعثرة/الناشئة (تقييم حقيقي)
  // أو تطابق كلمة مع أولويات الأسرة المسجّلة فعليًا.
  const domainIsNeed =
    !!input.coverage &&
    ((input.coverage.failedDomains ?? []).includes(input.domainCode) ||
      (input.coverage.emergingDomains ?? []).includes(input.domainCode));
  const priorityMatch =
    !!input.family?.priorities?.length &&
    input.family.priorities.some((p) => goalText.includes(p));
  let needState: QualityState;
  let needNote: string | undefined;
  if (domainIsNeed || priorityMatch) {
    needState = "done";
  } else if (!input.coverage && !input.family) {
    needState = "advisory";
    needNote = "لا تتوفر بيانات تغطية أو صوت أسرة بعد لتقييم هذا المؤشر.";
  } else {
    needState = "needs";
    needNote = "راجع مجالات التغطية المتعثرة أو أولويات الأسرة المسجَّلة للتأكد من ارتباط الهدف بها.";
  }

  // نقطة قوة/اهتمام: تطابق كلمة مع "ماذا تحب / ما الذي تجيده" من صوت المتعلم الفعلي.
  const loveOverlap = !!input.learnerVoice?.q_love && hasWordOverlap(goalText, input.learnerVoice.q_love);
  const goodOverlap = !!input.learnerVoice?.q_good && hasWordOverlap(goalText, input.learnerVoice.q_good);
  let strengthState: QualityState;
  let strengthNote: string | undefined;
  if (loveOverlap || goodOverlap) {
    strengthState = "done";
  } else if (!input.learnerVoice) {
    strengthState = "advisory";
    strengthNote = "لم يُسجَّل صوت المتعلم بعد لهذا المتعلم.";
  } else {
    strengthState = "needs";
    strengthNote = "راجع ما يحبه المتعلم أو يجيده في صوت المتعلم لتوظيفه ضمن صياغة الهدف.";
  }

  // رؤية بعيدة المدى: تطابق كلمة مع رؤية الأسرة (5 سنوات) إن وُثِّقت.
  let visionState: QualityState;
  let visionNote: string;
  if (!input.family?.vision5y?.trim()) {
    visionState = "advisory";
    visionNote = "لم تُوثَّق رؤية بعيدة المدى للأسرة بعد — راجع الاتساق العام يدويًا.";
  } else if (hasWordOverlap(goalText, input.family.vision5y)) {
    visionState = "done";
    visionNote = "يتوافق لفظيًا مع رؤية الأسرة المسجَّلة.";
  } else {
    visionState = "needs";
    visionNote = "راجع اتساق الهدف مع رؤية الأسرة المسجَّلة بعيدة المدى.";
  }

  // يدعم الانتقال: هل هذا المجال مُقيَّم فعليًا ضمن التغطية المحفوظة؟
  let transitionState: QualityState;
  let transitionNote: string;
  if (!input.coverage) {
    transitionState = "advisory";
    transitionNote = "لم يُحفظ تقييم/تغطية بعد لهذا المتعلم.";
  } else if ((input.coverage.filledDomains ?? []).includes(input.domainCode)) {
    transitionState = "done";
    transitionNote = "هذا المجال مُقيَّم ضمن التغطية الحالية.";
  } else {
    transitionState = "needs";
    transitionNote = "هذا المجال لم يُقيَّم بعد ضمن التغطية الحالية.";
  }

  const items: QualityItem[] = [
    {
      axis: 1, label: "مرتبط بمصدر", state: hasEvidence ? "done" : "needs",
      note: hasEvidence ? undefined : "اربط بند تقييم أو مصدر أدلة في «الدليل المرتبط».",
    },
    { axis: 1, label: "يعكس احتياجاً أو أولوية", state: needState, note: needNote },
    { axis: 1, label: "يوظف نقطة قوة أو اهتمام", state: strengthState, note: strengthNote },
    { axis: 1, label: "يسير في إطار رؤية بعيدة المدى", state: visionState, note: visionNote },
    {
      axis: 1, label: "فعل سلوكي أو جملة واضحة",
      state: goalText.length > 15 ? "done" : "needs",
      note: goalText.length > 15 ? undefined : "وسّع نص الهدف ليصف سلوكًا ملاحَظًا بوضوح.",
    },
    {
      axis: 1, label: "سياق وظيفي", state: input.context.trim() ? "done" : "needs",
      note: input.context.trim() ? undefined : "اختر السياق الواقعي الذي سيُمارَس فيه الهدف.",
    },
    {
      axis: 1, label: "قابل للقياس", hardStop: true, state: hasCriterion ? "done" : "needs",
      note: hasCriterion ? undefined : "أضف معيارًا محددًا في حقل «المعيار».",
    },
    { axis: 1, label: "يدعم الانتقال", state: transitionState, note: transitionNote },
    {
      axis: 1, label: "ممارسة حياتية مرتبطة",
      state: "advisory",
      note: input.lifePractice.trim() ? "تمت إضافة ممارسة حياتية مرتبطة." : "حقل إرشادي غير ملزم.",
    },
    {
      axis: 2, label: "طريقة القياس", hardStop: true, state: hasMeasurement ? "done" : "needs",
      note: hasMeasurement ? undefined : "حدد طريقة القياس المناسبة لهذا الهدف.",
    },
    {
      axis: 2, label: "معيار الإتقان", hardStop: true, state: hasCriterion ? "done" : "needs",
      note: hasCriterion ? undefined : "لا يمكن المتابعة دون معيار إتقان واضح.",
    },
    {
      axis: 2, label: "توافق القياس مع المعيار",
      state: /\d/.test(input.criterion) && hasMeasurement ? "done" : "needs",
      note: /\d/.test(input.criterion) && hasMeasurement ? undefined : "أضف نسبة أو تكرارًا رقميًا في المعيار ليتوافق مع طريقة القياس.",
    },
    {
      axis: 2, label: "وجود مصدر / دليل مرتبط مناسب", hardStop: true, state: hasEvidence ? "done" : "needs",
      note: hasEvidence ? undefined : "اربط بند تقييم أو ملاحظة داعمة.",
    },
  ];

  if (input.override) {
    for (const item of items) {
      if (item.hardStop && item.state === "needs") {
        item.overridden = true;
        item.note = `متجاوَز مهنيًا — السبب: ${input.override.reason}`;
      }
    }
  }

  return items;
}

export function summarizeQuality(items: QualityItem[]): { done: number; needs: number; advisory: number } {
  const summary = { done: 0, needs: 0, advisory: 0 };
  for (const item of items) summary[item.state]++;
  return summary;
}

/** Whether this goal has any unresolved, non-overridden hard-stop item. Only
 *  meaningful once the goal has actual text — an empty, not-yet-started goal
 *  is not a blocker. */
export function hasHardStopViolation(goalText: string, items: QualityItem[]): boolean {
  if (!goalText.trim()) return false;
  return items.some((item) => item.hardStop && item.state === "needs" && !item.overridden);
}

function referencesFor(criterionIds: QualityCriterionId[]) {
  return Array.from(new Set(criterionIds.flatMap(getQualityReferenceIdsForCriterion)));
}

function finding(input: Omit<GoalPlanQualityFinding, "sourceReferences">): GoalPlanQualityFinding {
  return {
    ...input,
    sourceReferences: referencesFor(input.criterionIds),
  };
}

function looksLikeContextOnlySource(anchor: string) {
  return /KSI|دعم معرفي|صوت الأسرة|صوت المتعلم|أولويات الأسرة|رؤية الأسرة/i.test(anchor);
}

export function evaluateGoalPlanQuality(input: GoalQualityInput & {
  learnerAgeYears?: number | null;
  profileProcessing?: LearnerProfileProcessingModel | null;
}): GoalPlanQualityRubricResult {
  const qualityItems = computeGoalQuality(input);
  const goalText = input.goalText.trim();
  const trigger = input.goalTrigger?.trim() ?? "";
  const anchor = input.performanceAnchor?.trim() || input.evidenceRef.trim();
  const blockingFindings: GoalPlanQualityFinding[] = [];
  const warnings: GoalPlanQualityFinding[] = [];
  const advisories: GoalPlanQualityFinding[] = [];

  if (goalText && !anchor) {
    blockingFindings.push(finding({
      id: "goal-performance-anchor-missing",
      severity: "blocking",
      scope: "goal",
      source: "evidence",
      messageAr: "لا يمكن اعتبار الهدف جاهزاً لأن مرتكز الأداء / الخط القاعدي غير محدد أو غير قابل للتتبع.",
      criterionIds: ["GOAL_BASELINE_PRESENT", "GOAL_NEED_ALIGNMENT"],
    }));
  }

  if (goalText && anchor && looksLikeContextOnlySource(anchor)) {
    blockingFindings.push(finding({
      id: "goal-performance-anchor-context-only",
      severity: "blocking",
      scope: "goal",
      source: "evidence",
      messageAr: "مرتكز الأداء يبدو مصدراً سياقياً مثل صوت الأسرة أو الدعم المعرفي؛ يلزم دليل أداء أو نتيجة مراجعة لاستخدامه كخط أساس.",
      criterionIds: ["GOAL_BASELINE_PRESENT", "PLAN_PARENT_INPUT_INTEGRATED"],
    }));
  }

  if (goalText && !trigger) {
    warnings.push(finding({
      id: "goal-trigger-missing",
      severity: "warning",
      scope: "goal",
      source: "profile_component",
      messageAr: "باعث الهدف غير محدد؛ يفضل توثيق سبب اختيار الهدف من صوت الأسرة أو المتعلم أو ملاحظة الفريق أو متطلبات الانتقال.",
      criterionIds: ["GOAL_NEED_ALIGNMENT", "PLAN_PARENT_INPUT_INTEGRATED"],
    }));
  }

  for (const item of qualityItems) {
    if (item.hardStop && item.state === "needs" && !item.overridden) {
      blockingFindings.push(finding({
        id: `goal-quality-${item.label}`,
        severity: "blocking",
        scope: "goal",
        source: item.label.includes("قياس") || item.label.includes("إتقان") ? "measurement" : "goal_text",
        messageAr: item.note ?? item.label,
        criterionIds: item.label.includes("قياس") || item.label.includes("إتقان")
          ? ["GOAL_MEASURABLE_ANNUAL", "GOAL_ACTION_CONDITION_CRITERION"]
          : ["GOAL_SPECIFIC_SKILL"],
      }));
    }
  }

  if (input.profileProcessing && !input.profileProcessing.componentMatrix.goalValidityReady) {
    warnings.push(finding({
      id: "profile-component-validity-gaps",
      severity: "warning",
      scope: "plan",
      source: "profile_component",
      messageAr: `توجد فجوات في مكونات البروفايل المؤثرة على صحة الأهداف: ${input.profileProcessing.componentMatrix.blockingGapsAr.join(" ")}`,
      criterionIds: ["PLAN_PLAAFP_MULTI_SOURCE", "PLAN_SOURCE_ATTRIBUTION_AND_INTERPRETATION"],
    }));
  }

  if ((input.learnerAgeYears ?? 0) >= 14 && !input.lifePractice.trim() && !goalText.includes("انتقال")) {
    advisories.push(finding({
      id: "age-14-transition-link-advisory",
      severity: "advisory",
      scope: "transition",
      source: "transition_reference",
      messageAr: "عمر المتعلم 14 فأعلى؛ راجع ارتباط الهدف بمفهوم انتقال أو ممارسة حياتية عند انطباق ذلك.",
      criterionIds: ["PLAN_TRANSITION_ASSESSMENT_AGE_14_PLUS", "PLAN_ANNUAL_GOALS_LINK_TO_TRANSITION"],
    }));
  }

  if (trigger && anchor) {
    advisories.push(finding({
      id: "goal-trigger-anchor-separated",
      severity: "advisory",
      scope: "goal",
      source: "evidence",
      messageAr: "تم فصل باعث الهدف عن مرتكز الأداء؛ راجع أن الصياغة النهائية تستفيد من الاثنين دون خلط بين الأولوية والخط القاعدي.",
      criterionIds: ["GOAL_NEED_ALIGNMENT", "GOAL_BASELINE_PRESENT"],
    }));
  }

  const sourceReferences = Array.from(new Set([
    ...blockingFindings,
    ...warnings,
    ...advisories,
  ].flatMap((item) => item.sourceReferences)));

  return {
    blockingFindings,
    warnings,
    advisories,
    sourceReferences,
    reviewSummaryAr: blockingFindings.length > 0
      ? `توجد ${blockingFindings.length} موانع جودة قبل اعتماد الهدف أو الخطة.`
      : warnings.length > 0
        ? `لا توجد موانع اعتماد آلية، لكن توجد ${warnings.length} تنبيهات جودة تحتاج مراجعة.`
        : "لا توجد موانع ظاهرة في مراجعة الجودة الحالية؛ القرار النهائي يبقى للمختص.",
    decisionBoundary: "review_support_only",
    producesApproval: false,
    producesNumericScore: false,
  };
}
