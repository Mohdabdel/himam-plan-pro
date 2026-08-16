export const HIMAM_CONCEPT_IDS = [
  "SAFETY",
  "SELF_DET",
  "COMM",
  "SELF_CARE",
  "MOBILITY",
  "SOCIAL",
  "COMMUNITY",
  "HEALTH",
  "ACADEMIC",
  "LEARNING_TECH",
] as const;

export type ConceptId = (typeof HIMAM_CONCEPT_IDS)[number];

export const HIMAM_CONCEPT_REGISTRY_VERSION = "himam-concepts-v1.1";

export const HIMAM_CONCEPT_LABELS_AR: Record<ConceptId, string> = {
  SAFETY: "السلامة الشخصية",
  SELF_DET: "تقرير المصير",
  COMM: "الاتصال الوظيفي",
  SELF_CARE: "العناية الذاتية",
  MOBILITY: "التنقل المستقل",
  SOCIAL: "العلاقات الاجتماعية",
  COMMUNITY: "المشاركة المجتمعية",
  HEALTH: "الصحة واللياقة",
  ACADEMIC: "المهارات الأكاديمية الوظيفية",
  LEARNING_TECH: "التعلم المستمر والاستخدام التقني",
};

export function isConceptId(value: string): value is ConceptId {
  return HIMAM_CONCEPT_IDS.includes(value as ConceptId);
}

export function hasLegacyHimamPrefix(value: string): boolean {
  return value.startsWith("HIMAMPRO_");
}
