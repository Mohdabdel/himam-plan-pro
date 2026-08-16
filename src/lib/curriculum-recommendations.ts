import {
  MVP_COMPETENCIES,
  MVP_COMPETENCY_COMPONENTS,
  MVP_COMPETENCY_FAMILIES,
  MVP_CURRICULUM_LINKS,
  MVP_ROLE_TASK_REQUIREMENTS,
} from "@/data/competency-matrix";
import { getConceptNameAr } from "@/data/concepts";
import type {
  CurriculumActivitySuggestion,
  FunctionalCompetency,
  MvpConceptId,
} from "@/types/himam";

export type CurriculumRecommendationInput = {
  conceptId: MvpConceptId;
  goalText?: string;
  preferredContext?: string;
  maxSuggestions?: number;
};

export function getCompetenciesByConcept(conceptId: MvpConceptId): FunctionalCompetency[] {
  return MVP_COMPETENCIES.filter((competency) => competency.conceptId === conceptId);
}

export function getComponentsByCompetency(competencyId: string) {
  return MVP_COMPETENCY_COMPONENTS.filter((component) => component.competencyId === competencyId);
}

export function getCurriculumLinksByCompetency(competencyId: string) {
  return MVP_CURRICULUM_LINKS.filter((link) => link.competencyId === competencyId);
}

function scoreCompetency(competency: FunctionalCompetency, goalText: string): number {
  if (!goalText.trim()) return 0;
  const compactGoal = goalText.replace(/\s+/g, " ");
  const tokens = competency.description
    .split(/\s+/)
    .filter((token) => token.length >= 4);

  return tokens.reduce((score, token) => (
    compactGoal.includes(token) ? score + 1 : score
  ), 0);
}

function coverageRank(status: string): number {
  if (status === "REPRESENTED") return 4;
  if (status === "PARTIALLY_REPRESENTED") return 3;
  if (status === "INFERRED") return 2;
  if (status === "NOT_REPRESENTED") return 1;
  return 0;
}

export function recommendCurriculumActivities({
  conceptId,
  goalText = "",
  preferredContext = "",
  maxSuggestions = 4,
}: CurriculumRecommendationInput): CurriculumActivitySuggestion[] {
  const conceptCompetencies = getCompetenciesByConcept(conceptId);
  const ranked = [...conceptCompetencies].sort((a, b) => {
    const textDelta = scoreCompetency(b, goalText) - scoreCompetency(a, goalText);
    if (textDelta !== 0) return textDelta;
    const aCoverage = getCurriculumLinksByCompetency(a.competencyId)[0]?.coverageStatus ?? "";
    const bCoverage = getCurriculumLinksByCompetency(b.competencyId)[0]?.coverageStatus ?? "";
    return coverageRank(bCoverage) - coverageRank(aCoverage);
  });

  return ranked.slice(0, maxSuggestions).map((competency) => {
    const family = MVP_COMPETENCY_FAMILIES.find((f) => f.familyId === competency.familyId);
    const components = getComponentsByCompetency(competency.competencyId).slice(0, 5);
    const curriculumLink = getCurriculumLinksByCompetency(competency.competencyId)[0];
    const roleTasks = MVP_ROLE_TASK_REQUIREMENTS
      .filter((task) => task.requiredCompetencyIds.includes(competency.competencyId))
      .slice(0, 2)
      .map((task) => ({ role: task.role, task: task.task }));

    const contextText = preferredContext
      ? ` في سياق ${preferredContext}`
      : "";

    return {
      competencyId: competency.competencyId,
      competencyDescription: competency.description,
      familyNameAr: family?.familyNameAr ?? "عائلة كفاءة غير محددة",
      componentIds: components.map((component) => component.componentId),
      componentDescriptions: components.map((component) => component.description),
      linkedHimamSkillIds: curriculumLink?.linkedHimamSkillIds ?? [],
      coverageStatus: curriculumLink?.coverageStatus ?? "UNMAPPED",
      roleTasks,
      rationaleAr: `الترشيح مرتبط بمفهوم ${getConceptNameAr(conceptId)} وبكفاءة: ${competency.description}${contextText}.`,
    };
  });
}
