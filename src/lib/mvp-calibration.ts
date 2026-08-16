import { MVP_CONCEPT_IDS } from "@/data/concepts";
import type { ConceptProfile, EvidenceRecord, LearnerProfile, MvpConceptId } from "@/types/himam";

const SOURCE_TYPE_WEIGHTS: Record<string, number> = {
  formal_tool: 3,
  functional_observation: 3,
  family_voice: 2,
  learner_voice: 2,
  team_report: 2,
  informal_tool: 2,
  file_review: 1,
};

const SUPPORT_SCORE: Record<string, number> = {
  none: 3,
  minimal_reminder: 2,
  moderate: 1,
  intensive: 0,
  unknown: 1,
};

function evidenceSourceType(profile: LearnerProfile, evidence: EvidenceRecord): string {
  return profile.sources.find((source) => source.id === evidence.sourceId)?.type ?? "file_review";
}

function evidenceWeight(profile: LearnerProfile, evidence: EvidenceRecord, conceptEvidence: EvidenceRecord[]) {
  const sourceScore = SOURCE_TYPE_WEIGHTS[evidenceSourceType(profile, evidence)] ?? 1;
  const environment = evidence.context?.environment;
  const contextScore = environment === "home" || environment === "community"
    ? 3
    : environment
      ? 1
      : 0;
  const sourceTypes = new Set(conceptEvidence.map((item) => evidenceSourceType(profile, item)));
  const repetitionScore = sourceTypes.size >= 2 ? 2 : conceptEvidence.length >= 2 ? 1 : 0;
  const relevanceScore = evidence.directness === "indirect" ? 1 : 3;
  const independenceScore = SUPPORT_SCORE[evidence.context?.supportPresent ?? "unknown"] ?? 1;
  return sourceScore + contextScore + repetitionScore + relevanceScore + independenceScore;
}

function deriveLevel(profile: LearnerProfile, evidence: EvidenceRecord[]) {
  if (evidence.length === 0) return null;
  const weighted = evidence.map((item) => ({
    evidence: item,
    weight: evidenceWeight(profile, item, evidence),
    support: SUPPORT_SCORE[item.context?.supportPresent ?? "unknown"] ?? 1,
  }));
  const strengths = weighted.filter((item) => item.evidence.evidenceType === "strength");
  const emerging = weighted.filter((item) => item.evidence.evidenceType === "emerging");
  const needs = weighted.filter((item) => item.evidence.evidenceType === "need");
  const sourceTypes = new Set(evidence.map((item) => evidenceSourceType(profile, item)));
  const envs = new Set(evidence.map((item) => item.context?.environment).filter(Boolean));

  if (strengths.length > 0) {
    const avgSupport = strengths.reduce((sum, item) => sum + item.support, 0) / strengths.length;
    if (avgSupport >= 2.5 && envs.size >= 2 && sourceTypes.size >= 2) return 5;
    if (avgSupport >= 2) return 4;
    return 3;
  }
  if (emerging.length > 0) return 2;
  if (needs.length > 0) return 1;
  return 2;
}

function deriveCoverage(profile: LearnerProfile, evidence: EvidenceRecord[]) {
  const sourceTypes = new Set(evidence.map((item) => evidenceSourceType(profile, item)));
  const envs = new Set(evidence.map((item) => item.context?.environment).filter(Boolean));
  const direct = evidence.some((item) => item.directness !== "indirect");

  if (sourceTypes.size >= 3 && envs.size >= 2 && direct) return "good" as const;
  if (sourceTypes.size >= 2 && envs.size >= 1) return "moderate" as const;
  return "limited" as const;
}

function deriveConfidence(profile: LearnerProfile, evidence: EvidenceRecord[]) {
  if (evidence.length === 0) return "low" as const;
  const strongCount = evidence.filter((item) => evidenceWeight(profile, item, evidence) >= 8).length;
  const hasNeedAndStrength =
    evidence.some((item) => item.evidenceType === "need") &&
    evidence.some((item) => item.evidenceType === "strength");

  if (hasNeedAndStrength && strongCount < 3) return "low" as const;
  if (strongCount >= 3) return "high" as const;
  if (strongCount >= 1) return "medium" as const;
  return "low" as const;
}

function recommendationFor(profile: LearnerProfile, conceptId: MvpConceptId, evidence: EvidenceRecord[]) {
  if (evidence.length === 0) return `أضف دليلا منظما واحدا على الأقل لمفهوم ${conceptId}.`;
  const sourceTypes = new Set(evidence.map((item) => evidenceSourceType(profile, item)));
  const hasNatural = evidence.some((item) => item.context?.environment === "home" || item.context?.environment === "community");
  const hasFamilyOrLearner = evidence.some((item) => {
    const sourceType = evidenceSourceType(profile, item);
    return sourceType === "family_voice" || sourceType === "learner_voice";
  });

  if (sourceTypes.size <= 1) return "التغطية من مصدر واحد فقط؛ أضف ملاحظة وظيفية أو صوت الأسرة/المتعلم عند توفره.";
  if (!hasNatural) return "لا توجد ملاحظة في بيئة طبيعية؛ أضف شاهدا من البيت أو المجتمع عند الإمكان.";
  if (!hasFamilyOrLearner) return "صوت الأسرة أو المتعلم غير مكتمل؛ لا يوقف الخطة لكنه يظهر كمساحة استكمال.";
  return null;
}

export function calibrateMvpConcept(profile: LearnerProfile, conceptId: MvpConceptId): ConceptProfile {
  const evidence = profile.evidencePool.filter((item) => item.conceptId === conceptId);
  const coverage = deriveCoverage(profile, evidence);
  const confidence = deriveConfidence(profile, evidence);
  const currentLevel = deriveLevel(profile, evidence);
  const completionRecommendation = recommendationFor(profile, conceptId, evidence);
  const calibrationStatus: ConceptProfile["calibrationStatus"] =
    evidence.length === 0
      ? "incomplete"
      : coverage === "good" && confidence === "high" && !completionRecommendation
        ? "final"
        : "provisional";

  return {
    conceptId,
    calibrationStatus,
    evidence,
    currentLevel,
    coverage,
    confidence,
    completionRecommendation,
  };
}

export function calibrateMvpProfile(profile: LearnerProfile): LearnerProfile {
  const concepts = { ...profile.concepts };
  for (const conceptId of MVP_CONCEPT_IDS) {
    concepts[conceptId] = calibrateMvpConcept(profile, conceptId);
  }
  return {
    ...profile,
    concepts,
  };
}
