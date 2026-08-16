import { OFFICIAL_CONCEPTS } from "@/data/concepts";
import type { ConceptId, EvidenceRecord, LearnerProfile, ProfileSource } from "@/types/himam";

function emptyConcepts(): LearnerProfile["concepts"] {
  return OFFICIAL_CONCEPTS.reduce((acc, concept) => {
    acc[concept.id] = {
      conceptId: concept.id,
      calibrationStatus: "not_started",
      evidence: [],
      currentLevel: null,
      coverage: "limited",
      confidence: "low",
      completionRecommendation: null,
    };
    return acc;
  }, {} as Record<ConceptId, LearnerProfile["concepts"][ConceptId]>);
}

export function profileStorageKey(learnerId: string) {
  return `himam_unified_profile_${learnerId}`;
}

export function createLearnerProfile(input: {
  learnerId: string;
  learnerNameAr: string;
}): LearnerProfile {
  const now = new Date().toISOString();
  return {
    profileMeta: {
      profileId: crypto.randomUUID(),
      learnerId: input.learnerId,
      learnerNameAr: input.learnerNameAr,
      createdAt: now,
      updatedAt: now,
      status: "draft",
    },
    sources: [],
    evidencePool: [],
    concepts: emptyConcepts(),
  };
}

export function loadLearnerProfile(learnerId: string): LearnerProfile | null {
  try {
    const raw = localStorage.getItem(profileStorageKey(learnerId));
    return raw ? JSON.parse(raw) as LearnerProfile : null;
  } catch {
    return null;
  }
}

export function saveLearnerProfile(profile: LearnerProfile) {
  const updated: LearnerProfile = {
    ...profile,
    profileMeta: {
      ...profile.profileMeta,
      updatedAt: new Date().toISOString(),
    },
  };
  localStorage.setItem(profileStorageKey(profile.profileMeta.learnerId), JSON.stringify(updated));
  return updated;
}

export function ensureLearnerProfile(input: {
  learnerId: string;
  learnerNameAr: string;
}) {
  const existing = loadLearnerProfile(input.learnerId);
  if (existing) return existing;
  return saveLearnerProfile(createLearnerProfile(input));
}

export function addProfileSource(profile: LearnerProfile, source: ProfileSource): LearnerProfile {
  const exists = profile.sources.some((item) => item.id === source.id);
  return {
    ...profile,
    sources: exists
      ? profile.sources.map((item) => item.id === source.id ? source : item)
      : [...profile.sources, source],
  };
}

export function addEvidenceRecord(profile: LearnerProfile, evidence: EvidenceRecord): LearnerProfile {
  const existingEvidence = profile.evidencePool.filter((item) => item.id !== evidence.id);
  const concept = profile.concepts[evidence.conceptId];
  const conceptEvidence = (concept?.evidence ?? []).filter((item) => item.id !== evidence.id);

  return {
    ...profile,
    evidencePool: [...existingEvidence, evidence],
    concepts: {
      ...profile.concepts,
      [evidence.conceptId]: {
        ...(concept ?? {
          conceptId: evidence.conceptId,
          calibrationStatus: "not_started",
          evidence: [],
        }),
        calibrationStatus: "incomplete",
        evidence: [...conceptEvidence, evidence],
      },
    },
  };
}
