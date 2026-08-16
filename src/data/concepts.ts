import type { ConceptId, MvpConceptId } from "@/types/himam";

export const OFFICIAL_CONCEPTS: Array<{ id: ConceptId; nameAr: string; inMvp: boolean }> = [
  { id: "SAFETY", nameAr: "السلامة الشخصية", inMvp: true },
  { id: "SELF_DET", nameAr: "تقرير المصير", inMvp: false },
  { id: "COMM", nameAr: "الاتصال الوظيفي", inMvp: true },
  { id: "SELF_CARE", nameAr: "العناية الذاتية", inMvp: true },
  { id: "MOBILITY", nameAr: "التنقل المستقل", inMvp: false },
  { id: "SOCIAL", nameAr: "العلاقات الاجتماعية", inMvp: false },
  { id: "COMMUNITY", nameAr: "المشاركة المجتمعية", inMvp: false },
  { id: "HEALTH", nameAr: "الصحة واللياقة", inMvp: false },
  { id: "ACADEMIC", nameAr: "المهارات الأكاديمية الوظيفية", inMvp: false },
  { id: "LEARNING_TECH", nameAr: "التعلم المستمر والاستخدام التقني", inMvp: false },
];

export const MVP_CONCEPT_IDS: MvpConceptId[] = ["SAFETY", "SELF_CARE", "COMM"];

export function getConceptNameAr(conceptId: ConceptId): string {
  return OFFICIAL_CONCEPTS.find((c) => c.id === conceptId)?.nameAr ?? conceptId;
}

export function isOfficialConceptId(value: string): value is ConceptId {
  return OFFICIAL_CONCEPTS.some((concept) => concept.id === value);
}

export function isMvpConceptId(value: string): value is MvpConceptId {
  return MVP_CONCEPT_IDS.includes(value as MvpConceptId);
}
