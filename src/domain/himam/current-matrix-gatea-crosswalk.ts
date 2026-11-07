/**
 * Provisional family-level crosswalk between the existing Himam competency
 * matrix and Gate A pre-CVI candidates.
 *
 * This file does NOT modify src/data/competency-matrix.ts and is not imported
 * by production recommendation logic. It exists only for architecture review,
 * coverage audit, and post-CVI migration planning.
 */

export type ExistingMatrixDisposition =
  | "retain"
  | "map"
  | "merge_candidate"
  | "gap"
  | "defer_until_cvi";

export type ExistingFamilyGateACrosswalk = {
  gateAId: string;
  currentFamilyIds: string[];
  disposition: ExistingMatrixDisposition;
  noteAr: string;
};

export const EXISTING_FAMILY_TO_GATE_A_PRE_CVI: ExistingFamilyGateACrosswalk[] = [
  {
    gateAId: "AX25",
    currentFamilyIds: ["SD-CF01", "SD-CF02", "SD-CF06", "SD-CF07"],
    disposition: "gap",
    noteAr: "توجد عناصر اختيار وتخطيط عامة، لكن استكشاف أدوار العمل والاختيار المهني كخبرة مقارنة مستقلة غير ممثل بوضوح في عائلة مهنية مخصصة.",
  },
  {
    gateAId: "AX01",
    currentFamilyIds: ["ACA-CF08", "ACA-CF09", "SC-CF08"],
    disposition: "map",
    noteAr: "التسلسل وتنفيذ الخطوات ممثلان، لكنهما موزعان على الأكاديميات الوظيفية والعناية؛ يحتاجان ربطًا سياقيًا بمهمة العمل بدل إنشاء تكرار جديد.",
  },
  {
    gateAId: "AX02",
    currentFamilyIds: ["COMM-CF05", "COMM-CF09", "COMM-CF11"],
    disposition: "map",
    noteAr: "طلب التوجيه/المساعدة والمدافعة ممثلان بوضوح؛ التخصيص لسياق العمل هو الفارق الأساسي.",
  },
  {
    gateAId: "AX03",
    currentFamilyIds: ["SD-CF03", "SD-CF05", "SD-CF10"],
    disposition: "merge_candidate",
    noteAr: "المتابعة وإدارة التغير موجودتان بصورة عامة، لكن المثابرة والعودة للمهمة بعد التوقف ليست عائلة مستقلة واضحة؛ قد تستمد من عدة عائلات دون إنشاء بنية مكررة.",
  },
  {
    gateAId: "AX04",
    currentFamilyIds: ["SAF-CF04", "SAF-CF05", "SAF-CF07", "SAF-CF09"],
    disposition: "map",
    noteAr: "السلامة الحالية أوسع بكثير من سلامة مهمة العمل؛ يلزم mapping سياقي لا استبدال عائلات السلامة.",
  },
  {
    gateAId: "AX05",
    currentFamilyIds: ["SD-CF10", "COMTY-CF11", "MOB-CF11"],
    disposition: "map",
    noteAr: "التكيف والاستعادة بعد تغير أو تعطل ممثلان في أكثر من سياق؛ Gate A يضيّقها إلى تغير وظيفي محدود.",
  },

  {
    gateAId: "AX06",
    currentFamilyIds: ["SD-CF01", "SD-CF02", "SD-CF06", "SD-CF07"],
    disposition: "map",
    noteAr: "الاختيار والموازنة والتخطيط ممثلة، بينما محتوى خيارات التعلم اللاحق يأتي من السياق/المسار لا من كفاءة جديدة بالضرورة.",
  },
  {
    gateAId: "AX07",
    currentFamilyIds: ["SD-CF05", "SD-CF07", "ACA-CF12", "LT-CF12"],
    disposition: "map",
    noteAr: "التخطيط طويل الأمد وأدوات التعلم/التقنية موجودة؛ يحتاج الربط بمتطلبات برنامج تعليمي لاحق محدد.",
  },
  {
    gateAId: "AX08",
    currentFamilyIds: ["COMM-CF09", "COMM-CF11", "SD-CF08", "SD-CF09", "LT-CF11"],
    disposition: "map",
    noteAr: "المناصرة وطلب التيسير والمشاركة الرسمية موجودة؛ Gate A يحددها في الوصول للتعلم.",
  },

  {
    gateAId: "AX10",
    currentFamilyIds: ["SD-CF01", "SD-CF02", "SD-CF04", "SD-CF06"],
    disposition: "retain",
    noteAr: "المشاركة في القرار المدعوم ممثلة مباشرة في بنية تقرير المصير الحالية.",
  },
  {
    gateAId: "AX11",
    currentFamilyIds: ["SC-CF02", "SC-CF08", "SC-CF09", "SC-CF12"],
    disposition: "retain",
    noteAr: "إدارة روتين الحياة اليومية ممثلة بقوة؛ Gate A أوسع ويجب أن يستخدم العائلات الحالية كمكونات لا أن يحل محلها.",
  },
  {
    gateAId: "AX12",
    currentFamilyIds: ["ACA-CF04", "ACA-CF06", "COMTY-CF06"],
    disposition: "merge_candidate",
    noteAr: "المهارات العددية والشراء والخدمات موجودة، لكن المشاركة المالية الوظيفية أوسع من الحساب؛ تحتاج تجميعًا وظيفيًا عبر عائلات متعددة.",
  },
  {
    gateAId: "AX13",
    currentFamilyIds: ["MOB-CF02", "MOB-CF03", "MOB-CF05", "MOB-CF06", "MOB-CF07", "MOB-CF08", "MOB-CF09", "MOB-CF10", "MOB-CF11"],
    disposition: "retain",
    noteAr: "التنقل من أكثر المجالات تفصيلًا في المصفوفة الحالية؛ Gate A يعمل كمظلة كفاءة عليا ولا ينبغي أن يسطح هذا التفصيل.",
  },

  {
    gateAId: "AX14",
    currentFamilyIds: ["COMTY-CF01", "COMTY-CF04", "COMTY-CF05", "COMTY-CF08", "COMTY-CF10", "COMTY-CF12"],
    disposition: "retain",
    noteAr: "المشاركة المجتمعية ذات الدور ممثلة بقوة، مع تفصيل أكبر في المصفوفة الحالية.",
  },
  {
    gateAId: "AX26",
    currentFamilyIds: ["SOC-CF05", "SOC-CF06", "SOC-CF08", "SOC-CF10"],
    disposition: "retain",
    noteAr: "بناء العلاقة والمحافظة عليها ممثل مباشرة؛ ينبغي مراجعة الصياغات القديمة التي قد تميل للامتثال الاجتماعي عند الانتقال بعد CVI.",
  },
  {
    gateAId: "AX15",
    currentFamilyIds: ["COMM-CF04", "COMM-CF06", "COMM-CF07", "SOC-CF03", "SOC-CF08"],
    disposition: "map",
    noteAr: "التواصل الاجتماعي الوظيفي موزع بين الاتصال والعلاقات الاجتماعية؛ Gate A قد يوفر مظلة استخدام وظيفي دون دمج بنيوي متسرع.",
  },
  {
    gateAId: "AX16",
    currentFamilyIds: ["SD-CF01", "COMM-CF02", "SAF-CF02", "SAF-CF10"],
    disposition: "merge_candidate",
    noteAr: "الاختيار/الرفض والحدود موزعة بين تقرير المصير والتواصل والسلامة؛ هذا مثال واضح على كفاءة عابرة للمفاهيم القديمة.",
  },
  {
    gateAId: "AX17",
    currentFamilyIds: ["COMTY-CF06", "COMTY-CF09", "COMTY-CF12", "COMM-CF05"],
    disposition: "map",
    noteAr: "استخدام الموارد والدعم المجتمعي ممثل، مع ضرورة قياس الاستخدام الفعلي لا المعرفة الاسمية.",
  },

  {
    gateAId: "AX18",
    currentFamilyIds: ["HEA-CF02", "HEA-CF04", "HEA-CF07", "COMM-CF02"],
    disposition: "retain",
    noteAr: "التواصل عن الحاجة الصحية ممثل مباشرة مع فصل جيد نسبيًا بين محتوى الحاجة الصحية وقناة الاتصال.",
  },
  {
    gateAId: "AX19",
    currentFamilyIds: ["HEA-CF03", "HEA-CF05", "HEA-CF06", "SC-CF09"],
    disposition: "retain",
    noteAr: "المشاركة في الروتين الصحي موجودة بتدرج مفصل؛ يجب فقط ضبط حدود القرارات الطبية عالية المخاطر.",
  },
  {
    gateAId: "AX20",
    currentFamilyIds: ["HEA-CF02", "HEA-CF04", "COMM-CF05", "COMTY-CF06"],
    disposition: "merge_candidate",
    noteAr: "الوصول إلى الدعم الصحي موزع بين الصحة والتواصل والموارد المجتمعية؛ يحتاج سيناريو صحي متخصص بدل تكرار عائلة عامة جديدة.",
  },

  {
    gateAId: "AX24",
    currentFamilyIds: ["SD-CF03", "SD-CF05", "SD-CF07", "SD-CF10", "ACA-CF07", "LT-CF07", "LT-CF12"],
    disposition: "retain",
    noteAr: "التخطيط والمراجعة والتتبع ممثلة بوضوح وعلى مستويات مختلفة؛ Gate A قد يكون طبقة كفاءة عابرة تنظّم هذا التفصيل.",
  },
];

export const CURRENT_MATRIX_CROSSWALK_GOVERNANCE = {
  productionUseAllowed: false,
  matrixRowsModified: false,
  gateAStillPreCvi: true,
  familyLevelOnly: true,
  allowedUses: ["architecture_review", "coverage_audit", "post_cvi_migration_planning"],
  prohibitedUses: ["learner_scoring", "goal_generation", "automatic_curriculum_assignment"],
} as const;

export function summarizeExistingMatrixGateACrosswalk() {
  return EXISTING_FAMILY_TO_GATE_A_PRE_CVI.reduce<Record<ExistingMatrixDisposition, number>>(
    (acc, item) => {
      acc[item.disposition] += 1;
      return acc;
    },
    {
      retain: 0,
      map: 0,
      merge_candidate: 0,
      gap: 0,
      defer_until_cvi: 0,
    },
  );
}
