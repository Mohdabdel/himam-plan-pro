export type QualityReferenceSourceId =
  | "IEP_GOAL_QUALITY_RUBRIC_2023"
  | "IEP_QUALITY_AND_RIGOR_RUBRIC"
  | "ARABIC_IEP_PLAN_QUALITY_CHECKLIST"
  | "IEP_QUALITY_INDICATORS_CHECKLIST_2013"
  | "UNDERSTOOD_IEP_GOAL_TRACKER"
  | "UNDERSTOOD_IEP_TOOLKIT"
  | "PARENT_INPUT_VISION_STATEMENT_TEMPLATE"
  | "UNDIVIDED_VISION_STATEMENT_TEMPLATE";

export type QualityCriterionId =
  | "GOAL_NEED_ALIGNMENT"
  | "GOAL_STANDARD_OR_DISABILITY_NEED_ALIGNMENT"
  | "GOAL_SPECIFIC_SKILL"
  | "GOAL_BASELINE_PRESENT"
  | "GOAL_MEASURABLE_ANNUAL"
  | "GOAL_ACTION_CONDITION_CRITERION"
  | "GOAL_RIGOR_AGE_CIRCUMSTANCE"
  | "GOAL_TIME_BOUND"
  | "GOAL_PROGRESS_MONITORING"
  | "PLAN_PLAAFP_MULTI_SOURCE"
  | "PLAN_PLAAFP_OBSERVABLE_MEASURABLE"
  | "PLAN_STRENGTHS_SUPPORTS_BARRIERS"
  | "PLAN_TRANSITION_ASSESSMENT_AGE_14_PLUS"
  | "PLAN_POSTSECONDARY_GOALS"
  | "PLAN_TRANSITION_SERVICES_ACTIVITIES"
  | "PLAN_ANNUAL_GOALS_LINK_TO_TRANSITION"
  | "PLAN_REQUIRED_COMPONENTS_COMPLETE"
  | "PLAN_SOURCE_ATTRIBUTION_AND_INTERPRETATION"
  | "PLAN_INDIVIDUALIZED_NON_GENERIC"
  | "PLAN_NEED_STATEMENTS_TRACEABLE"
  | "PLAN_OBJECTIVES_ALIGNED"
  | "PLAN_ADAPTATIONS_SERVICES_ALIGNMENT"
  | "PLAN_PROGRESS_REPORTING_SUFFICIENCY"
  | "PLAN_PARENT_INPUT_INTEGRATED"
  | "PLAN_TEAM_ROLES_AND_IMPLEMENTATION_SUPPORT";

export type QualityCriterionScope = "GOAL" | "PLAN" | "TRANSITION_PLAN";
export type QualityCriterionAuthority = "ADVISORY_REFERENCE_ONLY";

export type QualityReferenceSource = {
  sourceId: QualityReferenceSourceId;
  title: string;
  sourceKind: "docx" | "pdf";
  packageOwner: "9A";
  authority: QualityCriterionAuthority;
  producesHumanApproval: false;
  producesNumericPlatformApproval: false;
};

export type QualityCriterionReference = {
  criterionId: QualityCriterionId;
  labelAr: string;
  scope: QualityCriterionScope;
  sourceIds: QualityReferenceSourceId[];
  advisoryOnly: true;
  blocksHumanApprovalAutomatically: false;
  affectsNumericQualityScore: false;
  implementationNote: string;
};

export const PLAN_QUALITY_REFERENCE_SOURCES: QualityReferenceSource[] = [
  {
    sourceId: "IEP_GOAL_QUALITY_RUBRIC_2023",
    title: "Individualized Education Plan (IEP) Goal Quality Rubric - 2023",
    sourceKind: "docx",
    packageOwner: "9A",
    authority: "ADVISORY_REFERENCE_ONLY",
    producesHumanApproval: false,
    producesNumericPlatformApproval: false,
  },
  {
    sourceId: "IEP_QUALITY_AND_RIGOR_RUBRIC",
    title: "IEP Quality and Rigor Rubric",
    sourceKind: "pdf",
    packageOwner: "9A",
    authority: "ADVISORY_REFERENCE_ONLY",
    producesHumanApproval: false,
    producesNumericPlatformApproval: false,
  },
  {
    sourceId: "ARABIC_IEP_PLAN_QUALITY_CHECKLIST",
    title: "Arabic IEP plan quality checklist",
    sourceKind: "pdf",
    packageOwner: "9A",
    authority: "ADVISORY_REFERENCE_ONLY",
    producesHumanApproval: false,
    producesNumericPlatformApproval: false,
  },
  {
    sourceId: "IEP_QUALITY_INDICATORS_CHECKLIST_2013",
    title: "Individual Education Plan (IEP) Quality Indicators Checklist - 2013",
    sourceKind: "pdf",
    packageOwner: "9A",
    authority: "ADVISORY_REFERENCE_ONLY",
    producesHumanApproval: false,
    producesNumericPlatformApproval: false,
  },
  {
    sourceId: "UNDERSTOOD_IEP_GOAL_TRACKER",
    title: "Understood IEP Goal Tracker",
    sourceKind: "pdf",
    packageOwner: "9A",
    authority: "ADVISORY_REFERENCE_ONLY",
    producesHumanApproval: false,
    producesNumericPlatformApproval: false,
  },
  {
    sourceId: "UNDERSTOOD_IEP_TOOLKIT",
    title: "Navigating Individualized Education Programs (IEPs): Your Roadmap to Equitable Access",
    sourceKind: "pdf",
    packageOwner: "9A",
    authority: "ADVISORY_REFERENCE_ONLY",
    producesHumanApproval: false,
    producesNumericPlatformApproval: false,
  },
  {
    sourceId: "PARENT_INPUT_VISION_STATEMENT_TEMPLATE",
    title: "Parent Input and Vision Statement Template",
    sourceKind: "pdf",
    packageOwner: "9A",
    authority: "ADVISORY_REFERENCE_ONLY",
    producesHumanApproval: false,
    producesNumericPlatformApproval: false,
  },
  {
    sourceId: "UNDIVIDED_VISION_STATEMENT_TEMPLATE",
    title: "Undivided Vision Statement Template",
    sourceKind: "pdf",
    packageOwner: "9A",
    authority: "ADVISORY_REFERENCE_ONLY",
    producesHumanApproval: false,
    producesNumericPlatformApproval: false,
  },
];

export const PLAN_QUALITY_CRITERIA: QualityCriterionReference[] = [
  {
    criterionId: "GOAL_NEED_ALIGNMENT",
    labelAr: "ارتباط الهدف بمجال حاجة موثق أو أولوية مهنية واضحة",
    scope: "GOAL",
    sourceIds: ["IEP_GOAL_QUALITY_RUBRIC_2023", "IEP_QUALITY_AND_RIGOR_RUBRIC"],
    advisoryOnly: true,
    blocksHumanApprovalAutomatically: false,
    affectsNumericQualityScore: false,
    implementationNote: "Used to remind the specialist that a goal should be anchored in documented present levels, needs, or priorities.",
  },
  {
    criterionId: "GOAL_STANDARD_OR_DISABILITY_NEED_ALIGNMENT",
    labelAr: "اتساق الهدف مع معيار تعليمي أو احتياج ناتج عن الإعاقة",
    scope: "GOAL",
    sourceIds: ["IEP_GOAL_QUALITY_RUBRIC_2023"],
    advisoryOnly: true,
    blocksHumanApprovalAutomatically: false,
    affectsNumericQualityScore: false,
    implementationNote: "A compliance-oriented reference. Himam exposes it as a review item and does not make legal compliance determinations.",
  },
  {
    criterionId: "GOAL_SPECIFIC_SKILL",
    labelAr: "تحديد مهارة أو سلوك محدد بوضوح",
    scope: "GOAL",
    sourceIds: ["IEP_GOAL_QUALITY_RUBRIC_2023", "ARABIC_IEP_PLAN_QUALITY_CHECKLIST"],
    advisoryOnly: true,
    blocksHumanApprovalAutomatically: false,
    affectsNumericQualityScore: false,
    implementationNote: "Supports checking that the goal describes a clear observable skill rather than a broad activity.",
  },
  {
    criterionId: "GOAL_BASELINE_PRESENT",
    labelAr: "وجود خط أساس حالي يمكن قياس التقدم منه",
    scope: "GOAL",
    sourceIds: ["IEP_GOAL_QUALITY_RUBRIC_2023", "IEP_QUALITY_AND_RIGOR_RUBRIC"],
    advisoryOnly: true,
    blocksHumanApprovalAutomatically: false,
    affectsNumericQualityScore: false,
    implementationNote: "Requires a current performance reference before judging growth or progress monitoring quality.",
  },
  {
    criterionId: "GOAL_MEASURABLE_ANNUAL",
    labelAr: "قابلية الهدف السنوي للقياس والتحويل إلى جمع بيانات",
    scope: "GOAL",
    sourceIds: ["IEP_GOAL_QUALITY_RUBRIC_2023", "ARABIC_IEP_PLAN_QUALITY_CHECKLIST"],
    advisoryOnly: true,
    blocksHumanApprovalAutomatically: false,
    affectsNumericQualityScore: false,
    implementationNote: "Maps to measurable annual goal language and data-collection readiness.",
  },
  {
    criterionId: "GOAL_ACTION_CONDITION_CRITERION",
    labelAr: "تضمن الهدف فعلا وسياقا ومعيار تحقق",
    scope: "GOAL",
    sourceIds: ["IEP_GOAL_QUALITY_RUBRIC_2023", "IEP_QUALITY_AND_RIGOR_RUBRIC"],
    advisoryOnly: true,
    blocksHumanApprovalAutomatically: false,
    affectsNumericQualityScore: false,
    implementationNote: "Covers action direction, student action language, condition/support level, and criterion.",
  },
  {
    criterionId: "GOAL_RIGOR_AGE_CIRCUMSTANCE",
    labelAr: "ملاءمة الطموح لعمر المتعلم وظروفه وإمكانية إنجازه خلال عام",
    scope: "GOAL",
    sourceIds: ["IEP_GOAL_QUALITY_RUBRIC_2023", "IEP_QUALITY_AND_RIGOR_RUBRIC"],
    advisoryOnly: true,
    blocksHumanApprovalAutomatically: false,
    affectsNumericQualityScore: false,
    implementationNote: "Age and circumstances trigger professional review advice only; they do not block a goal or alter a numeric platform score.",
  },
  {
    criterionId: "GOAL_TIME_BOUND",
    labelAr: "وجود إطار زمني وتكرار متابعة ومعالم قصيرة المدى عند الحاجة",
    scope: "GOAL",
    sourceIds: ["IEP_GOAL_QUALITY_RUBRIC_2023", "ARABIC_IEP_PLAN_QUALITY_CHECKLIST"],
    advisoryOnly: true,
    blocksHumanApprovalAutomatically: false,
    affectsNumericQualityScore: false,
    implementationNote: "Covers annual due date, data collection frequency, and aligned benchmarks or short-term objectives where required.",
  },
  {
    criterionId: "GOAL_PROGRESS_MONITORING",
    labelAr: "وضوح طريقة مراقبة التقدم وربطها بالهدف",
    scope: "GOAL",
    sourceIds: ["IEP_QUALITY_AND_RIGOR_RUBRIC", "ARABIC_IEP_PLAN_QUALITY_CHECKLIST"],
    advisoryOnly: true,
    blocksHumanApprovalAutomatically: false,
    affectsNumericQualityScore: false,
    implementationNote: "Requires a visible progress monitoring plan, but approval remains a human team decision.",
  },
  {
    criterionId: "PLAN_PLAAFP_MULTI_SOURCE",
    labelAr: "اعتماد مستويات الأداء الحالية على مصادر بيانات متعددة",
    scope: "PLAN",
    sourceIds: ["IEP_QUALITY_AND_RIGOR_RUBRIC", "ARABIC_IEP_PLAN_QUALITY_CHECKLIST"],
    advisoryOnly: true,
    blocksHumanApprovalAutomatically: false,
    affectsNumericQualityScore: false,
    implementationNote: "Used later by plan-level review to flag weak present-level foundations.",
  },
  {
    criterionId: "PLAN_PLAAFP_OBSERVABLE_MEASURABLE",
    labelAr: "تضمن مستويات الأداء معلومات قابلة للملاحظة والقياس",
    scope: "PLAN",
    sourceIds: ["IEP_QUALITY_AND_RIGOR_RUBRIC", "ARABIC_IEP_PLAN_QUALITY_CHECKLIST"],
    advisoryOnly: true,
    blocksHumanApprovalAutomatically: false,
    affectsNumericQualityScore: false,
    implementationNote: "Separates descriptive profile information from performance statements that can support goal design.",
  },
  {
    criterionId: "PLAN_STRENGTHS_SUPPORTS_BARRIERS",
    labelAr: "توثيق نقاط القوة والدعم والعوائق واستثمارها في الخطة",
    scope: "PLAN",
    sourceIds: ["IEP_QUALITY_AND_RIGOR_RUBRIC"],
    advisoryOnly: true,
    blocksHumanApprovalAutomatically: false,
    affectsNumericQualityScore: false,
    implementationNote: "Connects learner strengths, preferred supports, and barriers to goals, accommodations, and teaching strategies.",
  },
  {
    criterionId: "PLAN_TRANSITION_ASSESSMENT_AGE_14_PLUS",
    labelAr: "لمن عمرهم 14 فأكثر: وجود تقييمات انتقالية حديثة وملائمة للعمر",
    scope: "TRANSITION_PLAN",
    sourceIds: ["IEP_QUALITY_AND_RIGOR_RUBRIC", "ARABIC_IEP_PLAN_QUALITY_CHECKLIST"],
    advisoryOnly: true,
    blocksHumanApprovalAutomatically: false,
    affectsNumericQualityScore: false,
    implementationNote: "AGE_14_PLUS triggers explicit transition planning advice only. It does not block the plan, goal, execution, or report.",
  },
  {
    criterionId: "PLAN_POSTSECONDARY_GOALS",
    labelAr: "وضوح أهداف ما بعد الثانوية عند انطباق التخطيط الانتقالي",
    scope: "TRANSITION_PLAN",
    sourceIds: ["IEP_QUALITY_AND_RIGOR_RUBRIC", "ARABIC_IEP_PLAN_QUALITY_CHECKLIST"],
    advisoryOnly: true,
    blocksHumanApprovalAutomatically: false,
    affectsNumericQualityScore: false,
    implementationNote: "Flags whether education/training, employment, and independent living goals are documented where relevant.",
  },
  {
    criterionId: "PLAN_TRANSITION_SERVICES_ACTIVITIES",
    labelAr: "ارتباط خدمات وأنشطة الانتقال بأهداف ما بعد الثانوية",
    scope: "TRANSITION_PLAN",
    sourceIds: ["IEP_QUALITY_AND_RIGOR_RUBRIC", "ARABIC_IEP_PLAN_QUALITY_CHECKLIST"],
    advisoryOnly: true,
    blocksHumanApprovalAutomatically: false,
    affectsNumericQualityScore: false,
    implementationNote: "Supports later review of services, community experiences, employment development, daily living, and vocational assessment where appropriate.",
  },
  {
    criterionId: "PLAN_ANNUAL_GOALS_LINK_TO_TRANSITION",
    labelAr: "ارتباط الأهداف السنوية بالاحتياج والخدمات والتوجه الانتقالي",
    scope: "TRANSITION_PLAN",
    sourceIds: ["IEP_QUALITY_AND_RIGOR_RUBRIC", "ARABIC_IEP_PLAN_QUALITY_CHECKLIST"],
    advisoryOnly: true,
    blocksHumanApprovalAutomatically: false,
    affectsNumericQualityScore: false,
    implementationNote: "Used to review whether annual goals support the broader transition direction without approving the plan automatically.",
  },
  {
    criterionId: "PLAN_REQUIRED_COMPONENTS_COMPLETE",
    labelAr: "اكتمال المكونات البنيوية الأساسية للخطة قبل المراجعة البشرية",
    scope: "PLAN",
    sourceIds: ["IEP_QUALITY_INDICATORS_CHECKLIST_2013", "UNDERSTOOD_IEP_TOOLKIT"],
    advisoryOnly: true,
    blocksHumanApprovalAutomatically: false,
    affectsNumericQualityScore: false,
    implementationNote: "Flags missing core sections, team information, service dates, and required review areas as human-review items rather than automated approval blockers.",
  },
  {
    criterionId: "PLAN_SOURCE_ATTRIBUTION_AND_INTERPRETATION",
    labelAr: "نسبة مصادر البيانات وتفسير نتائج الاختبارات بدلاً من سرد درجات خام فقط",
    scope: "PLAN",
    sourceIds: ["IEP_QUALITY_INDICATORS_CHECKLIST_2013", "UNDERSTOOD_IEP_TOOLKIT"],
    advisoryOnly: true,
    blocksHumanApprovalAutomatically: false,
    affectsNumericQualityScore: false,
    implementationNote: "Encourages source attribution, current observations, and interpreted assessment summaries in present-level statements.",
  },
  {
    criterionId: "PLAN_INDIVIDUALIZED_NON_GENERIC",
    labelAr: "خلو الخطة من العبارات العامة أو القوالب النمطية غير الفردية",
    scope: "PLAN",
    sourceIds: ["IEP_QUALITY_INDICATORS_CHECKLIST_2013"],
    advisoryOnly: true,
    blocksHumanApprovalAutomatically: false,
    affectsNumericQualityScore: false,
    implementationNote: "Used to flag generic statements that could apply to any learner and do not reflect the learner's individual performance.",
  },
  {
    criterionId: "PLAN_NEED_STATEMENTS_TRACEABLE",
    labelAr: "وجود عبارات احتياج قابلة للتتبع من مستويات الأداء وإلى الأهداف",
    scope: "PLAN",
    sourceIds: ["IEP_QUALITY_INDICATORS_CHECKLIST_2013"],
    advisoryOnly: true,
    blocksHumanApprovalAutomatically: false,
    affectsNumericQualityScore: false,
    implementationNote: "Each need statement should flow from PLAAFP and substantiate goals without being written as a service or accommodation request.",
  },
  {
    criterionId: "PLAN_OBJECTIVES_ALIGNED",
    labelAr: "اتساق الأهداف قصيرة المدى أو الأهداف المرحلية مع الهدف السنوي عند الحاجة",
    scope: "GOAL",
    sourceIds: ["IEP_QUALITY_INDICATORS_CHECKLIST_2013", "IEP_GOAL_QUALITY_RUBRIC_2023", "UNDERSTOOD_IEP_GOAL_TRACKER"],
    advisoryOnly: true,
    blocksHumanApprovalAutomatically: false,
    affectsNumericQualityScore: false,
    implementationNote: "Reviews whether short-term objectives or benchmarks are measurable, attainable within a year, and linked to the annual goal when required.",
  },
  {
    criterionId: "PLAN_ADAPTATIONS_SERVICES_ALIGNMENT",
    labelAr: "اتساق التعديلات والخدمات والدعم التقني مع احتياجات المتعلم",
    scope: "PLAN",
    sourceIds: ["IEP_QUALITY_INDICATORS_CHECKLIST_2013", "UNDERSTOOD_IEP_TOOLKIT", "UNDERSTOOD_IEP_GOAL_TRACKER"],
    advisoryOnly: true,
    blocksHumanApprovalAutomatically: false,
    affectsNumericQualityScore: false,
    implementationNote: "Connects accommodations, modifications, assistive technology, SDI, related services, and service location/intensity to documented learner needs.",
  },
  {
    criterionId: "PLAN_PROGRESS_REPORTING_SUFFICIENCY",
    labelAr: "كفاية متابعة التقدم وتقريرها بلغة محددة مرتبطة بمؤشرات الهدف",
    scope: "PLAN",
    sourceIds: ["IEP_QUALITY_INDICATORS_CHECKLIST_2013", "UNDERSTOOD_IEP_GOAL_TRACKER", "UNDERSTOOD_IEP_TOOLKIT"],
    advisoryOnly: true,
    blocksHumanApprovalAutomatically: false,
    affectsNumericQualityScore: false,
    implementationNote: "Progress reporting should include method, frequency, dated evidence, and whether progress is sufficient to meet the goal, not only broad labels like achieved or continue.",
  },
  {
    criterionId: "PLAN_PARENT_INPUT_INTEGRATED",
    labelAr: "إتاحة صوت الأسرة ورؤيتها كمدخل داعم عند بناء الخطة",
    scope: "PLAN",
    sourceIds: ["PARENT_INPUT_VISION_STATEMENT_TEMPLATE", "UNDIVIDED_VISION_STATEMENT_TEMPLATE", "UNDERSTOOD_IEP_TOOLKIT"],
    advisoryOnly: true,
    blocksHumanApprovalAutomatically: false,
    affectsNumericQualityScore: false,
    implementationNote: "Supports family vision, strengths, concerns, motivation, home context, and yearly priorities as supporting information. It never replaces performance evidence.",
  },
  {
    criterionId: "PLAN_TEAM_ROLES_AND_IMPLEMENTATION_SUPPORT",
    labelAr: "وضوح أدوار الفريق ومتطلبات دعم التنفيذ داخل البيئات الواقعية",
    scope: "PLAN",
    sourceIds: ["IEP_QUALITY_INDICATORS_CHECKLIST_2013", "UNDERSTOOD_IEP_TOOLKIT"],
    advisoryOnly: true,
    blocksHumanApprovalAutomatically: false,
    affectsNumericQualityScore: false,
    implementationNote: "Flags whether responsible team members, classroom implementation needs, training/support for staff, and collaboration needs are visible for human review.",
  },
];

export function getQualityReferenceIdsForCriterion(
  criterionId: QualityCriterionId,
): QualityReferenceSourceId[] {
  return PLAN_QUALITY_CRITERIA.find((criterion) => criterion.criterionId === criterionId)?.sourceIds ?? [];
}
