/**
 * Analysis-only mapping of Gate A performance/access dimensions to the current
 * Himam implementation/evidence model.
 *
 * This file does not alter UI, scoring, reporting, or production decisions.
 * It documents what is already captured, what is conflated, and what future
 * implementation changes may be required after CVI and architecture review.
 */

export type PerformanceDimensionCoverageStatus =
  | "partially_present"
  | "conflated"
  | "missing"
  | "present_but_insufficient";

export type PerformanceDimensionImplementationAnalysis = {
  dimensionId: "PD01" | "PD02" | "PD03" | "PD04";
  labelAr: string;
  currentCoverage: PerformanceDimensionCoverageStatus;
  currentSignals: string[];
  currentRisks: string[];
  futureDataNeeds: string[];
  futureUiNeeds: string[];
  futureReportNeeds: string[];
  productionChangeNow: false;
};

export const PERFORMANCE_DIMENSION_IMPLEMENTATION_ANALYSIS: PerformanceDimensionImplementationAnalysis[] = [
  {
    dimensionId: "PD01",
    labelAr: "التعميم",
    currentCoverage: "conflated",
    currentSignals: [
      "TrainingSession.performance يتضمن generalized كحالة أداء نهائية.",
      "TrainingSession.evidenceType يتضمن generalization_probe.",
      "TrainingSession.context يسجل سياق الجلسة.",
      "mvp-calibration يرفع المستوى عند تعدد البيئات والمصادر، لكنه لا يسجل التعميم كبعد مستقل.",
    ],
    currentRisks: [
      "خلط اكتساب المهارة مع التعميم داخل متغير performance واحد.",
      "generalized لا يثبت تلقائيا اختلاف الشخص/المكان/المهمة أو مستوى الدعم.",
      "لا توجد مقارنة صريحة بين سياق التعلم والسياق الجديد.",
    ],
    futureDataNeeds: [
      "baseContextRef",
      "probeContextRef",
      "contextNoveltyType: person | place | task | combination",
      "supportAtProbe",
      "generalizationResult",
      "evidenceRefs[]",
    ],
    futureUiNeeds: [
      "فصل حالة إتقان المهارة عن سؤال: هل ظهر الأداء في سياق جديد؟",
      "اختيار نوع السياق الجديد عند استخدام مسبار تعميم.",
      "عدم إظهار PD01 للكفاءات التي لا يكون النقل عبر السياقات ذا معنى.",
    ],
    futureReportNeeds: [
      "عرض التعميم كخاصية أداء مستقلة لا كدرجة إتقان.",
      "إظهار أين تحقق التعميم وبأي دعم.",
    ],
    productionChangeNow: false,
  },
  {
    dimensionId: "PD02",
    labelAr: "الصيانة/الاستمرارية",
    currentCoverage: "missing",
    currentSignals: [
      "TrainingSession.date يوفر طابعًا زمنيًا للجلسة.",
      "وجود جلسات متعددة يسمح نظريًا بتحليل زمني لاحق.",
    ],
    currentRisks: [
      "لا يوجد تعريف لفترة الصيانة أو إعادة القياس.",
      "تكرار الجلسات لا يساوي اختبار احتفاظ بعد توقف/انخفاض التدريب.",
      "التقرير لا يميز الأداء الحديث عن الأداء المحتفظ به بمرور الزمن.",
    ],
    futureDataNeeds: [
      "maintenanceProbeDueAt",
      "maintenanceInterval",
      "maintenanceProbeAt",
      "maintenanceResult",
      "reteachingSinceLastProbe",
      "supportAtMaintenanceProbe",
      "evidenceRefs[]",
    ],
    futureUiNeeds: [
      "مسبار متابعة زمني منفصل عن جلسة التدريب العادية.",
      "تحديد فترة المتابعة بحسب طبيعة المهارة، لا مدة موحدة لكل المهارات.",
    ],
    futureReportNeeds: [
      "تمييز تحقق المهارة عن استمرارها عبر الزمن.",
      "إظهار تاريخ آخر تحقق صيانة ومستوى الدعم.",
    ],
    productionChangeNow: false,
  },
  {
    dimensionId: "PD03",
    labelAr: "الاستخدام الفعال للدعم",
    currentCoverage: "partially_present",
    currentSignals: [
      "TrainingSession.supportLevel يسجل intensive/moderate/minimal_reminder/none.",
      "EvidenceRecord.supportCodes يسجل وجود الدعم في بعض سجلات الأدلة.",
      "mvp-calibration يحول الدعم إلى قيمة عددية ضمن مستوى المفهوم.",
    ],
    currentRisks: [
      "النموذج الحالي يسجل شدة الدعم أكثر من نوعه أو مصدره أو قابليته للاستمرار.",
      "mvp-calibration يكافئ قلة الدعم عدديا، ما قد يساوي بين النجاح وقلة الاعتماد على دعم مشروع.",
      "لا يميز النظام بين دعم فعال متاح في البيئة المستهدفة ودعم مؤقت غير قابل للاستدامة.",
    ],
    futureDataNeeds: [
      "supportType",
      "supportIntensity",
      "supportProvider",
      "supportAvailabilityInTargetContext",
      "supportSustainability",
      "supportEffectiveness",
      "learnerInitiatedSupportUse",
    ],
    futureUiNeeds: [
      "فصل نوع الدعم عن شدته.",
      "تسجيل هل مكّن الدعم أداء وظيفيًا ناجحًا وهل هو متاح في السياق الحقيقي.",
      "عدم معاقبة استخدام الدعم المشروع تلقائيًا.",
    ],
    futureReportNeeds: [
      "عرض الأداء مع وصف الدعم الذي مكّنه.",
      "تمييز الاستقلال دون دعم عن النجاح الوظيفي بدعم مناسب دون وضع أحدهما كقيمة إنسانية أعلى مطلقًا.",
    ],
    productionChangeNow: false,
  },
  {
    dimensionId: "PD04",
    labelAr: "السلامة الوظيفية عبر السياقات",
    currentCoverage: "present_but_insufficient",
    currentSignals: [
      "SAFETY مفهوم مستقل في سجل المفاهيم الحالي.",
      "مصفوفة الكفاءات الحالية تحتوي عائلات سلامة مفصلة.",
      "بعض عائلات التنقل والصحة والعناية تتضمن عناصر سلامة سياقية.",
      "TrainingSession.context وnotes قد يحتويان معلومات سلامة لكن دون بنية مستقلة.",
    ],
    currentRisks: [
      "اعتبار السلامة مجالًا مستقلاً فقط قد يخفي كونها بعد أداء عابرًا للعمل والتنقل والصحة والمجتمع.",
      "عدم وجود سجل منظم لما هو خطر خاص بالسياق وما هي الاستجابة المتوقعة.",
      "احتمال خلط السلامة بالامتثال أو منع الاختيار الشخصي إن لم تضبط الحدود.",
    ],
    futureDataNeeds: [
      "safetyDemandRef",
      "contextSpecificHazard",
      "expectedSafetyResponse",
      "supportOrEscalationPlan",
      "safetyPerformanceResult",
      "evidenceRefs[]",
    ],
    futureUiNeeds: [
      "إظهار PD04 فقط عندما يكون للمهمة متطلب سلامة فعلي ذو صلة.",
      "ربط السلامة بالسيناريو/المهمة بدل قائمة عامة جامدة.",
      "إتاحة طلب الدعم أو الانسحاب الآمن كأداء صحيح عند ملاءمته.",
    ],
    futureReportNeeds: [
      "عرض السلامة داخل السياق الذي قيست فيه.",
      "عدم تحويل PD04 إلى درجة سلامة عامة للشخص.",
    ],
    productionChangeNow: false,
  },
];

export const PERFORMANCE_DIMENSION_ARCHITECTURE_DECISION = {
  changeImplementationUiNow: false,
  changeReportUiNow: false,
  changeMvpCalibrationNow: false,
  preserveCurrentTrainingSessionStorage: true,
  preserveLegacySafetyConcept: true,
  postCviPriorityOrder: ["PD03", "PD01", "PD02", "PD04"] as const,
  rationaleAr:
    "البنية الحالية تحتوي إشارات مفيدة، لكنها لا تفصل أبعاد الأداء الأربعة بصورة كافية. لذلك تُحفظ البيانات الحالية ويؤجل تغيير الواجهة/القياس إلى ما بعد CVI ومراجعة نموذج التنفيذ.",
} as const;

export function getPerformanceDimensionAnalysis(id: "PD01" | "PD02" | "PD03" | "PD04") {
  return PERFORMANCE_DIMENSION_IMPLEMENTATION_ANALYSIS.find((item) => item.dimensionId === id) ?? null;
}
