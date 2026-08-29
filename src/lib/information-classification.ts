import { OFFICIAL_CONCEPTS, isOfficialConceptId } from "@/data/concepts";
import { CONCEPT_ALIAS_MAP, resolveConceptAliases } from "@/data/concept-aliases";
import type { ConceptId, InformationProcessingSignalKind } from "@/types/himam";

const KEYWORD_CONCEPTS: Array<{ conceptId: ConceptId; keywords: string[] }> = [
  { conceptId: "SAFETY", keywords: ["سلامة", "خطر", "مخاطر", "حماية", "طوارئ", "سلوكيات صعبة", "محفزات", "أمان"] },
  { conceptId: "SELF_DET", keywords: ["اختيار", "قرار", "تقرير المصير", "مناصرة", "هدف", "رغبة", "أفضل", "أريد", "لا أريد"] },
  { conceptId: "COMM", keywords: ["تواصل", "اتصال", "تعبير", "لغة", "AAC", "إشارة", "صور", "تعليمات", "يفهم", "يطلب"] },
  { conceptId: "SELF_CARE", keywords: ["عناية", "استقلال", "نظافة", "ملابس", "طعام", "حمام", "روتين", "حياة يومية"] },
  { conceptId: "MOBILITY", keywords: ["تنقل", "مواصلات", "حركة", "انتقال", "مكان", "مجتمع", "طريق"] },
  { conceptId: "SOCIAL", keywords: ["اجتماعي", "أقران", "علاقات", "مجموعة", "تفاعل", "أسرة", "صديق"] },
  { conceptId: "COMMUNITY", keywords: ["مجتمع", "عمل", "تدريب", "موقع عمل", "مشاركة", "خدمة", "حي", "مسجد"] },
  { conceptId: "HEALTH", keywords: ["صحة", "لياقة", "دواء", "تعب", "نوم", "ألم", "حسي", "قلق"] },
  { conceptId: "ACADEMIC", keywords: ["أكاديمي", "قراءة", "كتابة", "أرقام", "مال", "وقت", "تعلم", "مهارة"] },
  { conceptId: "LEARNING_TECH", keywords: ["تقنية", "جهاز", "حاسوب", "هاتف", "تطبيق", "فيديو", "تعلم مستمر"] },
];

export function classifyConceptIdsFromText(text: string, fallback: ConceptId[] = ["COMM"]): ConceptId[] {
  const normalized = text.trim();
  if (!normalized) return fallback;
  const conceptIds = new Set<ConceptId>();

  for (const concept of OFFICIAL_CONCEPTS) {
    if (normalized.includes(concept.nameAr) || normalized.includes(concept.id)) {
      conceptIds.add(concept.id);
    }
  }

  for (const [alias, ids] of Object.entries(CONCEPT_ALIAS_MAP)) {
    if (normalized.includes(alias)) {
      ids.forEach((id) => conceptIds.add(id));
    }
  }

  for (const entry of KEYWORD_CONCEPTS) {
    if (entry.keywords.some((keyword) => normalized.includes(keyword))) {
      conceptIds.add(entry.conceptId);
    }
  }

  return conceptIds.size > 0 ? Array.from(conceptIds) : fallback;
}

export function normalizeConceptIds(values: string[] | undefined, fallbackText = ""): ConceptId[] {
  const direct = (values ?? []).filter(isOfficialConceptId);
  if (direct.length > 0) return Array.from(new Set(direct));
  return classifyConceptIdsFromText(fallbackText);
}

export function classifySignalKindsFromText(text: string): InformationProcessingSignalKind[] {
  const normalized = text.trim();
  const kinds = new Set<InformationProcessingSignalKind>();

  if (/قوة|يجيد|يستطيع|ينجح|تفضيل عال|أفضل أداء|يمكنه/i.test(normalized)) kinds.add("profile_strength");
  if (/احتياج|يحتاج|صعوبة|فشل|ناشئة|تجنب|لا يستطيع|فجوة|خطر/i.test(normalized)) kinds.add("profile_need");
  if (/دعم|مساندة|تسهيل|تكييف|استراتيجية|يساعد|نمذجة|تذكير/i.test(normalized)) kinds.add("support_condition");
  if (/أولوية|مهم|هدف|خطوة تالية|دلالة المصدر|الخطة/i.test(normalized)) kinds.add("priority_hint");
  if (/خطر|سلامة|مخاوف|محفز|سلوك|قلق|ألم|طوارئ/i.test(normalized)) kinds.add("risk_context");
  if (/يحب|يفضل|اهتمام|دافعية|تعزيز|مدعم/i.test(normalized)) kinds.add("motivation_context");
  if (/أداء|ملاحظة|مستوى|نجاح|ناشئة|فشل|قبل التعليم|بعده|سياق الأداء|نتائج/i.test(normalized)) kinds.add("evidence_candidate");

  if (kinds.size === 0) kinds.add("motivation_context");
  return Array.from(kinds);
}

export function canCandidateInformPerformance(text: string, kinds: InformationProcessingSignalKind[]) {
  return kinds.includes("evidence_candidate") && /أداء|ملاحظة|مستوى|نجاح|ناشئة|فشل|سياق|قبل|بعد|نتائج|تطبيق/i.test(text);
}

export function resolveAliasConcepts(label: string) {
  return resolveConceptAliases(label);
}
