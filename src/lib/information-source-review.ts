import { getAssessmentToolDefinition, type TransitionCoverageArea } from "@/data/assessment-tools";

export type AgeBand = "UNDER_14" | "AGE_14_PLUS";

export type AssessmentTransitionCoverageStatus =
  | "NOT_ACTIVATED"
  | "ADEQUATE_COVERAGE"
  | "PARTIAL_COVERAGE"
  | "PRIORITY_INFORMATION_GAPS_IDENTIFIED";

export type AssessmentTransitionCoverageReview = {
  status: AssessmentTransitionCoverageStatus;
  reviewed: boolean;
  advisoryOnly: true;
  affectsLearnerLevel: false;
  blocksWorkflow: false;
  missingAreas: TransitionCoverageArea[];
  recommendationsAr: string[];
};

const AGE_14_PLUS_EXPECTED_AREAS: TransitionCoverageArea[] = [
  "learner_voice",
  "self_determination",
  "interests",
  "career_inclination",
  "community_participation",
  "functional_performance_across_settings",
  "daily_living",
  "family_priorities",
];

const AREA_LABELS_AR: Record<TransitionCoverageArea, string> = {
  learner_voice: "صوت المتعلم",
  self_determination: "تقرير المصير والاختيار",
  interests: "الاهتمامات",
  career_inclination: "الميول أو الاستكشاف المهني",
  community_participation: "المشاركة المجتمعية",
  functional_performance_across_settings: "الأداء الوظيفي عبر أكثر من سياق",
  daily_living: "الحياة اليومية والاستقلالية",
  health_safety: "الصحة والسلامة",
  family_priorities: "رؤية الأسرة وأولوياتها",
};

export function coverageAreaLabelAr(area: TransitionCoverageArea) {
  return AREA_LABELS_AR[area];
}

export function reviewAssessmentTransitionCoverage(input: {
  ageBand: AgeBand | string | null | undefined;
  selectedToolId: string;
}): AssessmentTransitionCoverageReview {
  const tool = getAssessmentToolDefinition(input.selectedToolId);
  if (input.ageBand !== "AGE_14_PLUS") {
    return {
      status: "NOT_ACTIVATED",
      reviewed: false,
      advisoryOnly: true,
      affectsLearnerLevel: false,
      blocksWorkflow: false,
      missingAreas: [],
      recommendationsAr: [],
    };
  }

  const covered = new Set(tool?.transitionCoverageProfile?.likelyCoverageAreas ?? []);
  const missingAreas = AGE_14_PLUS_EXPECTED_AREAS.filter((area) => !covered.has(area));
  const status: AssessmentTransitionCoverageStatus =
    missingAreas.length === 0
      ? "ADEQUATE_COVERAGE"
      : missingAreas.length <= 3
        ? "PARTIAL_COVERAGE"
        : "PRIORITY_INFORMATION_GAPS_IDENTIFIED";

  return {
    status,
    reviewed: true,
    advisoryOnly: true,
    affectsLearnerLevel: false,
    blocksWorkflow: false,
    missingAreas,
    recommendationsAr: missingAreas.map((area) => `قد يكون من المفيد استكمال معلومات حول: ${coverageAreaLabelAr(area)}.`),
  };
}

export function isDevelopmentalAssessmentUnder9(input: {
  ageYears: number | null | undefined;
  selectedToolId: string;
}) {
  const tool = getAssessmentToolDefinition(input.selectedToolId);
  return Boolean(
    typeof input.ageYears === "number" &&
      input.ageYears < 9 &&
      tool?.ageProcessingMode === "developmental_under_9",
  );
}
