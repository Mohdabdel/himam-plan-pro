import { HIMAM_CONCEPT_IDS, type ConceptId } from "./types.js";

export const CONCEPT_LABELS_AR: Record<ConceptId, string> = {
  SAFETY: "السلامة",
  SELF_DET: "تقرير المصير",
  COMM: "التواصل",
  SELF_CARE: "العناية الذاتية",
  MOBILITY: "التنقل",
  SOCIAL: "العلاقات الاجتماعية",
  COMMUNITY: "المشاركة المجتمعية",
  HEALTH: "الصحة",
  ACADEMIC: "المهارات الأكاديمية الوظيفية",
  LEARNING_TECH: "التعلم والتقنية",
};

export function isConceptId(value: string): value is ConceptId {
  return HIMAM_CONCEPT_IDS.includes(value as ConceptId);
}

export function assertConceptIds(values: readonly string[]) {
  const invalid = values.filter((value) => !isConceptId(value));
  if (invalid.length > 0) {
    throw new Error(`Invalid Himam concept ids: ${invalid.join(", ")}`);
  }
}
