import type { ConceptId } from "@/types/himam";

// Aliases preserve the official ten-concept model while allowing older
// drafts and parallel curriculum labels to be routed without creating new
// top-level concepts.
export const CONCEPT_ALIAS_MAP: Record<string, ConceptId[]> = {
  السلامة: ["SAFETY"],
  "السلامة الشخصية": ["SAFETY"],
  "الصحة والسلامة": ["SAFETY", "HEALTH"],
  التواصل: ["COMM"],
  "التواصل الوظيفي": ["COMM"],
  "الاتصال الوظيفي": ["COMM"],
  "العناية الذاتية": ["SELF_CARE"],
  "الحياة اليومية": ["SELF_CARE"],
  "مهارات الحياة اليومية": ["SELF_CARE"],
  "الاستقلال الشخصي": ["SELF_CARE", "SELF_DET"],
  "تقرير المصير": ["SELF_DET"],
  "المناصرة الذاتية": ["SELF_DET", "COMM"],
  "إدارة المال": ["ACADEMIC", "SELF_DET", "COMMUNITY"],
  "الإدارة المالية": ["ACADEMIC", "SELF_DET", "COMMUNITY"],
  العمل: ["COMMUNITY", "SELF_DET", "ACADEMIC"],
  "المهارات المهنية": ["COMMUNITY", "SELF_DET", "ACADEMIC"],
  "التخطيط الانتقالي": ["SELF_DET", "COMMUNITY"],
};

export function resolveConceptAliases(label: string): ConceptId[] {
  return CONCEPT_ALIAS_MAP[label.trim()] ?? [];
}
