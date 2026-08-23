export type ComponentStatus = {
  assessment: boolean;
  learnerVoice: boolean;
  familyVoice: boolean;
  currentLevel: boolean;
  additionalSources: boolean;
};

export function loadPlanComponentStatus(learnerId: string): ComponentStatus {
  const has = (key: string) => {
    try {
      return Boolean(localStorage.getItem(key));
    } catch {
      return false;
    }
  };

  let assessment = false;
  try {
    const records = JSON.parse(localStorage.getItem(`himam_assessment_records_${learnerId}`) || "[]");
    assessment = Array.isArray(records) && records.length > 0;
  } catch {
    assessment = false;
  }

  return {
    assessment,
    learnerVoice: has(`himam_learner_voice_${learnerId}`),
    familyVoice: has(`himam_family_${learnerId}`),
    currentLevel: has(`himam_coverage_${learnerId}`),
    additionalSources: has(`himam_additional_sources_${learnerId}`),
  };
}
