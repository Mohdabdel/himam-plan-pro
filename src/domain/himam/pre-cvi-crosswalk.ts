import type { ConceptId } from "./concepts";
import type {
  CompetencyDefinition,
  PerformanceDimensionDefinition,
  TransitionEntityRef,
  TransitionMapping,
} from "./transition-architecture";
import { GATE_A_PRE_CVI_SCHEME, HIMAM_LEGACY_CONCEPT_SCHEME } from "./transition-architecture";

function gateARef(entityId: string, entityType: "COMPETENCY" | "PERFORMANCE_DIMENSION" = "COMPETENCY"): TransitionEntityRef {
  return {
    schemeId: entityType === "COMPETENCY" ? GATE_A_PRE_CVI_SCHEME.schemeId : "gate-a-performance-dimensions",
    schemeVersion: GATE_A_PRE_CVI_SCHEME.schemeVersion,
    entityType,
    entityId,
    validationStatus: "pre_cvi",
  };
}

function legacyConceptRef(entityId: ConceptId): TransitionEntityRef {
  return {
    schemeId: HIMAM_LEGACY_CONCEPT_SCHEME.schemeId,
    schemeVersion: HIMAM_LEGACY_CONCEPT_SCHEME.schemeVersion,
    entityType: "TRANSITION_CONCEPT",
    entityId,
    validationStatus: "legacy_active",
  };
}

export const GATE_A_PRE_CVI_COMPETENCIES: CompetencyDefinition[] = [
  { ref: gateARef("AX25"), outcomeFamilyId: "EMPLOYMENT_WORK", labelAr: "استكشاف أدوار العمل والاختيار المهني", provenanceRefs: ["Gate A pre-CVI model"] },
  { ref: gateARef("AX01"), outcomeFamilyId: "EMPLOYMENT_WORK", labelAr: "بدء المهمة وتسلسلها", provenanceRefs: ["Gate A pre-CVI model"] },
  { ref: gateARef("AX02"), outcomeFamilyId: "EMPLOYMENT_WORK", labelAr: "طلب التوضيح أو المساعدة في العمل", provenanceRefs: ["Gate A pre-CVI model"] },
  { ref: gateARef("AX03"), outcomeFamilyId: "EMPLOYMENT_WORK", labelAr: "المثابرة والعودة للمهمة", provenanceRefs: ["Gate A pre-CVI model"] },
  { ref: gateARef("AX04"), outcomeFamilyId: "EMPLOYMENT_WORK", labelAr: "السلامة المرتبطة بالمهمة", provenanceRefs: ["Gate A pre-CVI model"] },
  { ref: gateARef("AX05"), outcomeFamilyId: "EMPLOYMENT_WORK", labelAr: "التكيف مع تغير وظيفي محدود", provenanceRefs: ["Gate A pre-CVI model"] },

  { ref: gateARef("AX06"), outcomeFamilyId: "POSTSECONDARY_LEARNING", labelAr: "استكشاف خيارات التعلم واتخاذ قرار", provenanceRefs: ["Gate A pre-CVI model"] },
  { ref: gateARef("AX07"), outcomeFamilyId: "POSTSECONDARY_LEARNING", labelAr: "تخطيط مسار التعليم اللاحق", provenanceRefs: ["Gate A pre-CVI model"] },
  { ref: gateARef("AX08"), outcomeFamilyId: "POSTSECONDARY_LEARNING", labelAr: "المناصرة الذاتية للوصول للتعلم", provenanceRefs: ["Gate A pre-CVI model"] },

  { ref: gateARef("AX10"), outcomeFamilyId: "INDEPENDENT_LIVING", labelAr: "المشاركة في قرار شخصي مدعوم", provenanceRefs: ["Gate A pre-CVI model"] },
  { ref: gateARef("AX11"), outcomeFamilyId: "INDEPENDENT_LIVING", labelAr: "إدارة روتين الحياة اليومية", provenanceRefs: ["Gate A pre-CVI model"] },
  { ref: gateARef("AX12"), outcomeFamilyId: "INDEPENDENT_LIVING", labelAr: "المشاركة المالية الوظيفية", provenanceRefs: ["Gate A pre-CVI model"] },
  { ref: gateARef("AX13"), outcomeFamilyId: "INDEPENDENT_LIVING", labelAr: "التنقل والوصول للمجتمع", provenanceRefs: ["Gate A pre-CVI model"] },

  { ref: gateARef("AX14"), outcomeFamilyId: "COMMUNITY_RELATIONSHIPS", labelAr: "مشاركة مجتمعية ذات دور", provenanceRefs: ["Gate A pre-CVI model"] },
  { ref: gateARef("AX26"), outcomeFamilyId: "COMMUNITY_RELATIONSHIPS", labelAr: "بناء والحفاظ على علاقة ذات معنى", provenanceRefs: ["Gate A pre-CVI model"] },
  { ref: gateARef("AX15"), outcomeFamilyId: "COMMUNITY_RELATIONSHIPS", labelAr: "تواصل اجتماعي وظيفي", provenanceRefs: ["Gate A pre-CVI model"] },
  { ref: gateARef("AX16"), outcomeFamilyId: "COMMUNITY_RELATIONSHIPS", labelAr: "الاختيار والرفض والحدود الشخصية", provenanceRefs: ["Gate A pre-CVI model"] },
  { ref: gateARef("AX17"), outcomeFamilyId: "COMMUNITY_RELATIONSHIPS", labelAr: "الوصول إلى دعم مجتمعي", provenanceRefs: ["Gate A pre-CVI model"] },

  { ref: gateARef("AX18"), outcomeFamilyId: "HEALTH_WELLBEING", labelAr: "التواصل عن حاجة صحية", provenanceRefs: ["Gate A pre-CVI model"] },
  { ref: gateARef("AX19"), outcomeFamilyId: "HEALTH_WELLBEING", labelAr: "المشاركة في روتين صحي بدعم مناسب", provenanceRefs: ["Gate A pre-CVI model"] },
  { ref: gateARef("AX20"), outcomeFamilyId: "HEALTH_WELLBEING", labelAr: "الوصول إلى دعم صحي مناسب", provenanceRefs: ["Gate A pre-CVI model"] },

  { ref: gateARef("AX24"), outcomeFamilyId: "CROSS_CUTTING", labelAr: "التخطيط الذاتي والمراجعة", provenanceRefs: ["Gate A pre-CVI model"] },
];

export const GATE_A_PRE_CVI_PERFORMANCE_DIMENSIONS: PerformanceDimensionDefinition[] = [
  {
    ref: gateARef("PD01", "PERFORMANCE_DIMENSION"),
    labelAr: "التعميم",
    descriptionAr: "ظهور الكفاءة في شخص أو مكان أو مهمة جديدة مع توثيق مستوى الدعم.",
    appliesToEntityTypes: ["COMPETENCY", "ENABLING_SKILL", "FUNCTIONAL_SCENARIO"],
    provenanceRefs: ["Gate A pre-CVI dimensions"],
  },
  {
    ref: gateARef("PD02", "PERFORMANCE_DIMENSION"),
    labelAr: "الصيانة/الاستمرارية",
    descriptionAr: "استمرار الأداء بعد فترة محددة دون إعادة تدريس كاملة.",
    appliesToEntityTypes: ["COMPETENCY", "ENABLING_SKILL"],
    provenanceRefs: ["Gate A pre-CVI dimensions"],
  },
  {
    ref: gateARef("PD03", "PERFORMANCE_DIMENSION"),
    labelAr: "الاستخدام الفعال للدعم",
    descriptionAr: "نوع وشدة ومصدر واستدامة الدعم الذي يمكّن أداءً وظيفيًا ناجحًا.",
    appliesToEntityTypes: ["COMPETENCY", "ENABLING_SKILL", "FUNCTIONAL_SCENARIO"],
    provenanceRefs: ["Gate A pre-CVI dimensions"],
  },
  {
    ref: gateARef("PD04", "PERFORMANCE_DIMENSION"),
    labelAr: "السلامة الوظيفية عبر السياقات",
    descriptionAr: "تطبيق إجراءات السلامة ذات الصلة بالسياق والوصول للمساعدة وفق خطة الدعم.",
    appliesToEntityTypes: ["COMPETENCY", "FUNCTIONAL_SCENARIO"],
    provenanceRefs: ["Gate A pre-CVI dimensions"],
  },
];

const CONCEPT_TO_GATE_A: Record<ConceptId, string[]> = {
  SAFETY: ["AX04", "AX13", "AX16", "AX19", "AX20"],
  SELF_DET: ["AX25", "AX06", "AX08", "AX10", "AX16", "AX24"],
  COMM: ["AX02", "AX08", "AX15", "AX16", "AX18", "AX20"],
  SELF_CARE: ["AX11", "AX19"],
  MOBILITY: ["AX13"],
  SOCIAL: ["AX14", "AX26", "AX15", "AX16"],
  COMMUNITY: ["AX13", "AX14", "AX17", "AX20"],
  HEALTH: ["AX18", "AX19", "AX20"],
  ACADEMIC: ["AX06", "AX07", "AX12", "AX24"],
  LEARNING_TECH: ["AX06", "AX07", "AX08", "AX24"],
};

/**
 * Provisional semantic crosswalk only.
 *
 * Existing competency-matrix rows are already grouped by legacy conceptId.
 * Therefore the current matrix participates in this three-way crosswalk through
 * its existing conceptId field; no current competency row is rewritten here.
 *
 * These mappings MUST NOT drive learner levels, goals, curriculum assignment,
 * or any production decision before CVI and explicit human approval.
 */
export const LEGACY_CONCEPT_TO_GATE_A_PRE_CVI: TransitionMapping[] =
  (Object.entries(CONCEPT_TO_GATE_A) as Array<[ConceptId, string[]]>).flatMap(
    ([conceptId, competencyIds]) =>
      competencyIds.map((competencyId) => ({
        mappingId: `legacy-${conceptId}-to-gatea-${competencyId}`,
        from: legacyConceptRef(conceptId),
        to: gateARef(competencyId),
        mappingType: "related" as const,
        mappingStatus: "provisional" as const,
        rationale:
          "تقاطع دلالي أولي بين مفهوم همم الواسع والكفاءة المرشحة؛ لا يعني التكافؤ ولا يحل محل التحكيم أو المطابقة التفصيلية.",
        provenanceRefs: [
          "src/data/competency-matrix.ts#conceptId",
          "Gate A pre-CVI model",
        ],
      })),
  );

export const PRE_CVI_CROSSWALK_GOVERNANCE = {
  productionUseAllowed: false,
  maySetLearnerLevel: false,
  mayGenerateRequiredGoal: false,
  mayAssignCurriculumAutomatically: false,
  maySupportArchitectureReview: true,
  maySupportCoverageAudit: true,
  requiresHumanReview: true,
  noteAr:
    "هذا الربط تحليلي مؤقت فقط. لا تُرقّى أي علاقة إلى validated قبل اكتمال CVI والمراجعة النوعية وقرار Gate Pass الصريح.",
} as const;
