/**
 * Post-CVI migration plan.
 *
 * Governance document only. This file defines the safe sequence for moving
 * from the current legacy-active architecture to a validated competency-driven
 * architecture after external CVI and explicit Gate Pass.
 *
 * No step in this plan is executable by this module.
 */

export type MigrationGateStatus = "not_ready" | "ready" | "passed" | "failed";
export type MigrationStepStatus = "blocked" | "planned" | "ready_after_gate" | "post_gate_only";

export type PostCviMigrationGate = {
  gateId: string;
  titleAr: string;
  status: MigrationGateStatus;
  requirementsAr: string[];
  blocksSteps: string[];
};

export type PostCviMigrationStep = {
  stepId: string;
  order: number;
  titleAr: string;
  status: MigrationStepStatus;
  purposeAr: string;
  actionsAr: string[];
  preserveAr: string[];
  stopConditionsAr: string[];
  verificationAr: string[];
  rollbackAr: string[];
};

export const POST_CVI_MIGRATION_GATES: PostCviMigrationGate[] = [
  {
    gateId: "GATE_CVI_COMPLETE",
    titleAr: "اكتمال التحكيم الخارجي CVI",
    status: "not_ready",
    requirementsAr: [
      "اكتمال تقييم الصلة والوضوح للعناصر المرشحة.",
      "توثيق قرارات الإبقاء أو التعديل أو الدمج أو الحذف أو الإضافة.",
      "توثيق الملاحظات النوعية على التداخل والتغطية.",
    ],
    blocksSteps: ["M01", "M02", "M03", "M04", "M05", "M06", "M07"],
  },
  {
    gateId: "GATE_TAXONOMY_DECISION",
    titleAr: "اعتماد مخطط الكفاءات بعد CVI",
    status: "not_ready",
    requirementsAr: [
      "إنشاء إصدار validated جديد لمخطط الكفاءات.",
      "حسم وضع العناصر المعدلة أو المدمجة أو المتقاعدة.",
      "حسم وضع PD01–PD04 بعد المراجعة.",
      "اعتماد provenance/version لكل كيان.",
    ],
    blocksSteps: ["M02", "M03", "M04", "M05", "M06", "M07"],
  },
  {
    gateId: "GATE_CROSSWALK_REVIEW",
    titleAr: "مراجعة الـCrosswalk البشري",
    status: "not_ready",
    requirementsAr: [
      "مراجعة المفاهيم القديمة مقابل الكفاءات المعتمدة.",
      "مراجعة عائلات مصفوفة الكفاءات الحالية مقابل المخطط المعتمد.",
      "تأكيد العلاقات exact/broader/narrower/related/unmapped.",
      "الإبقاء على الفجوات غير المحسومة ظاهرة وعدم فرض تطابق مصطنع.",
    ],
    blocksSteps: ["M03", "M04", "M05", "M06", "M07"],
  },
  {
    gateId: "GATE_SYNTHETIC_VALIDATION",
    titleAr: "اختبار اصطناعي/مجهول الهوية",
    status: "not_ready",
    requirementsAr: [
      "اختبار العقود الجديدة ببيانات اصطناعية أو مجهولة الهوية.",
      "اختبار عدم فقد البيانات القديمة.",
      "اختبار التتبع من الهدف إلى الكفاءة والسيناريو والشاهد.",
      "اختبار PD01–PD04 دون استخدام بيانات حقيقية قبل النجاح.",
    ],
    blocksSteps: ["M05", "M06", "M07"],
  },
  {
    gateId: "GATE_HUMAN_APPROVAL",
    titleAr: "اعتماد بشري صريح للترحيل",
    status: "not_ready",
    requirementsAr: [
      "موافقة بشرية صريحة على بدء الترحيل.",
      "اعتماد خطة rollback.",
      "اعتماد النسخة المرجعية التي سيُعاد إليها عند الفشل.",
    ],
    blocksSteps: ["M05", "M06", "M07"],
  },
];

export const POST_CVI_MIGRATION_STEPS: PostCviMigrationStep[] = [
  {
    stepId: "M01",
    order: 1,
    titleAr: "تجميد baseline قبل الترحيل",
    status: "post_gate_only",
    purposeAr: "إنشاء نقطة رجوع ثابتة قبل أي تغيير تشغيلي.",
    actionsAr: [
      "تثبيت tag/commit للنسخة السابقة للترحيل.",
      "توثيق إصدارات schemas والregistries الحالية.",
      "توثيق مفاتيح التخزين الحالية ومسارات البيانات.",
    ],
    preserveAr: [
      "جميع learner profiles الحالية.",
      "الأهداف والخطط الحالية.",
      "الجلسات والتقارير القديمة.",
      "conceptId legacy.",
    ],
    stopConditionsAr: [
      "عدم القدرة على تحديد baseline موحد.",
      "وجود تغييرات غير مدققة على main.",
    ],
    verificationAr: [
      "إمكانية إعادة تشغيل النسخة baseline.",
      "مطابقة checksum/commit المرجعي.",
    ],
    rollbackAr: [
      "العودة إلى baseline دون ترحيل أي سجل.",
    ],
  },
  {
    stepId: "M02",
    order: 2,
    titleAr: "تسجيل المخطط validated دون تفعيله",
    status: "post_gate_only",
    purposeAr: "إدخال الإصدار المعتمد بجانب المخططات القديمة دون إحلاله.",
    actionsAr: [
      "إضافة validated competency scheme جديد.",
      "إضافة validated performance-dimension scheme عند اعتمادها.",
      "الاحتفاظ بـpre-CVI scheme تاريخيًا وعدم الكتابة فوقه.",
    ],
    preserveAr: [
      "himam-concepts legacy scheme.",
      "existing competency matrix.",
      "pre-CVI Gate A registry.",
    ],
    stopConditionsAr: [
      "عدم اكتمال قرارات CVI.",
      "عدم وجود version/provenance واضح.",
    ],
    verificationAr: [
      "كل كيان validated يحمل version ومصدرًا.",
      "لا يوجد كيان pre_cvi تمت ترقيته ضمنيًا.",
    ],
    rollbackAr: [
      "تعطيل المخطط الجديد مع إبقاء البيانات التاريخية دون تغيير.",
    ],
  },
  {
    stepId: "M03",
    order: 3,
    titleAr: "اعتماد Crosswalk versioned",
    status: "post_gate_only",
    purposeAr: "ربط legacy/current matrix بالمخطط الجديد دون حذف أي معرفات قديمة.",
    actionsAr: [
      "إنشاء mapping records validated فقط للعلاقات التي تمت مراجعتها.",
      "إبقاء related/unmapped عند عدم اليقين.",
      "تحديد عناصر merge/retire دون حذف السجلات القديمة.",
    ],
    preserveAr: [
      "المعرفات القديمة.",
      "تاريخ المصفوفة الحالية.",
      "الفجوات غير المحسومة.",
    ],
    stopConditionsAr: [
      "وجود تطابق قسري غير مدعوم.",
      "محاولة حذف legacy ids.",
    ],
    verificationAr: [
      "إمكانية تتبع كل mapping إلى rationale/provenance.",
      "عدم وجود mapping validated يعتمد على pre_cvi entity.",
    ],
    rollbackAr: [
      "إلغاء تفعيل crosswalk الجديد والعودة للlegacy mapping.",
    ],
  },
  {
    stepId: "M04",
    order: 4,
    titleAr: "تجهيز dual-read / legacy-write",
    status: "post_gate_only",
    purposeAr: "السماح بقراءة المراجع الجديدة دون تغيير تخزين الإنتاج بعد.",
    actionsAr: [
      "قراءة competencyRefs الجديدة عندما توجد.",
      "الاستمرار في الكتابة إلى الحقول legacy الحالية.",
      "إظهار metadata الجديدة في أدوات الاختبار الداخلية فقط.",
    ],
    preserveAr: [
      "صيغة TrainingSession الحالية.",
      "صيغة EvidenceRecord القديمة.",
      "كل الشاشات الحالية.",
    ],
    stopConditionsAr: [
      "أي تغيير في بيانات المستخدم المرئية دون موافقة.",
      "أي فشل في قراءة سجل قديم.",
    ],
    verificationAr: [
      "قراءة 100% من السجلات القديمة.",
      "عدم اختلاف التقارير الحالية.",
    ],
    rollbackAr: [
      "تعطيل dual-read والعودة إلى legacy-only.",
    ],
  },
  {
    stepId: "M05",
    order: 5,
    titleAr: "تفعيل العقود الجديدة في بيئة اختبار",
    status: "post_gate_only",
    purposeAr: "اختبار Goal↔Competency↔Scenario وFunctionalPerformanceRecord دون بيانات حقيقية.",
    actionsAr: [
      "تفعيل GoalCompetencyLink في بيئة اختبار فقط.",
      "تفعيل FunctionalScenarioAssignment في بيئة اختبار.",
      "تفعيل FunctionalPerformanceRecord وPD01–PD04.",
      "اختبار CurriculumDiscoveredGap كمرشح يتطلب مراجعة بشرية.",
    ],
    preserveAr: [
      "عدم ترحيل بيانات المستخدمين.",
      "عدم تغيير production storage.",
    ],
    stopConditionsAr: [
      "فشل traceability.",
      "فقدان سياق أو دعم أو provenance.",
      "أي إنشاء هدف تلقائي غير مصرح.",
    ],
    verificationAr: [
      "اختبارات end-to-end اصطناعية.",
      "اختبارات human approval.",
      "اختبارات rollback.",
    ],
    rollbackAr: [
      "حذف بيانات الاختبار الجديدة وإبقاء الإنتاج دون تغيير.",
    ],
  },
  {
    stepId: "M06",
    order: 6,
    titleAr: "ترحيل تدريجي اختياري للسجلات الجديدة فقط",
    status: "post_gate_only",
    purposeAr: "بدء الكتابة بالعقود الجديدة للسجلات الجديدة دون إعادة كتابة التاريخ.",
    actionsAr: [
      "new records use new refs + legacy compatibility fields.",
      "old records remain untouched.",
      "تسجيل migrationVersion لكل سجل جديد.",
    ],
    preserveAr: [
      "السجلات التاريخية كما هي.",
      "إمكانية تشغيل التقرير legacy.",
    ],
    stopConditionsAr: [
      "انخفاض قابلية القراءة للخلف.",
      "اختلاف غير مفسر في التقرير أو التخطيط.",
    ],
    verificationAr: [
      "dual-report comparison.",
      "traceability comparison.",
      "human review of sample cases.",
    ],
    rollbackAr: [
      "إيقاف الكتابة الجديدة والعودة للlegacy write.",
    ],
  },
  {
    stepId: "M07",
    order: 7,
    titleAr: "توسيع تدريجي للواجهة والتقرير",
    status: "post_gate_only",
    purposeAr: "إظهار الكفاءات وأبعاد الأداء للمستخدم بعد استقرار البيانات.",
    actionsAr: [
      "تحديث plan/implementation/report على دفعات مستقلة.",
      "إظهار PD01–PD04 وصفيا دون readiness score غير متحقق.",
      "إبقاء labels القديمة عند الحاجة للتوافق.",
    ],
    preserveAr: [
      "مسار المستخدم الأساسي.",
      "القرارات البشرية.",
      "إمكانية الرجوع للعرض القديم.",
    ],
    stopConditionsAr: [
      "أي التباس بين skill mastery وgeneralization.",
      "أي خفض تلقائي بسبب استخدام دعم مشروع.",
      "أي عرض validated غير مدعوم.",
    ],
    verificationAr: [
      "اختبارات UX.",
      "اختبارات accessibility.",
      "اختبارات report parity.",
      "مراجعة بشرية لحالات مختارة.",
    ],
    rollbackAr: [
      "feature flags لإخفاء العرض الجديد والعودة للواجهة القديمة.",
    ],
  },
];

export const POST_CVI_MIGRATION_GOVERNANCE = {
  executableNow: false,
  requiresExplicitGatePass: true,
  destructiveMigrationAllowed: false,
  historicalRewriteAllowed: false,
  automaticLegacyReclassificationAllowed: false,
  defaultStrategy: "additive_versioned_dual_read_then_gradual_write",
  rollbackRequiredAtEveryStep: true,
  humanApprovalRequiredBeforeProductionWrite: true,
} as const;

export function getMigrationStep(stepId: string) {
  return POST_CVI_MIGRATION_STEPS.find((step) => step.stepId === stepId) ?? null;
}
