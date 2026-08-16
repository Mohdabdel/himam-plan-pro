import { assertConceptIds } from "./concepts.js";
import type {
  AgeBand,
  ClassifiedInformation,
  ConceptId,
  GoalOpportunity,
  InformationGap,
  InformationInsight,
  InformationRole,
  InformationSource,
  KnowledgeSupportItem,
  Learner,
  SufficiencyReview,
  SupportOpportunity,
  TraceRef,
} from "./types.js";

function id(prefix: string, parts: string[]) {
  return `${prefix}_${parts.join("_")}`.replace(/[^a-zA-Z0-9_]/g, "_");
}

export function getAgeBand(ageYears: number | null): AgeBand | null {
  if (ageYears === null) return null;
  if (ageYears < 9) return "UNDER_9";
  if (ageYears < 14) return "AGE_9_TO_13";
  return "AGE_14_PLUS";
}

function trace(source: InformationSource, field?: string): TraceRef {
  return { sourceId: source.id, sourceKind: source.kind, field };
}

function sourceConcepts(source: InformationSource, fallback: ConceptId[]): ConceptId[] {
  const concepts = source.declaredConcepts?.length ? source.declaredConcepts : fallback;
  assertConceptIds(concepts);
  return concepts;
}

function sourceRole(source: InformationSource): InformationRole {
  if (source.status !== "completed") return "unclassified_pending_review";
  if (source.kind === "official_assessment" || source.kind === "functional_observation") {
    return "performance_evidence";
  }
  if (
    source.kind === "family_voice" ||
    source.kind === "learner_voice" ||
    source.kind === "interest_survey" ||
    source.kind === "career_inclination"
  ) {
    return "supporting_information";
  }
  if (source.kind === "prior_report") return "suggested_inference";
  return "unclassified_pending_review";
}

export function classifySource(learner: Learner, source: InformationSource): ClassifiedInformation {
  const role = sourceRole(source);
  const conceptIds = sourceConcepts(source, ["SELF_DET", "COMMUNITY"]);
  const base = {
    id: id(role, [source.id]),
    learnerId: learner.id,
    label: source.title,
    traceRefs: [trace(source)],
  };

  if (role === "performance_evidence") {
    return {
      ...base,
      role,
      conceptIds,
      confidence: source.kind === "official_assessment" ? "structured" : "provisional",
    };
  }

  if (role === "supporting_information") {
    const supportType: KnowledgeSupportItem["supportType"] =
      source.kind === "family_voice"
        ? "priority"
        : source.kind === "learner_voice"
          ? "preference"
          : source.kind === "career_inclination"
            ? "motivation"
            : "context";
    return {
      ...base,
      role,
      conceptIds,
      supportType,
    };
  }

  if (role === "suggested_inference") {
    return {
      ...base,
      role,
      conceptIds,
      reason: "Prior or external records require human review before becoming current performance evidence.",
      status: "suggested",
    };
  }

  return {
    ...base,
    role,
    reason: source.status === "skipped" ? "Source was skipped." : "Source is not structured enough for automatic classification.",
  };
}

function insightFromClassified(item: ClassifiedInformation): InformationInsight {
  const role = item.role;
  const bodyByRole: Record<InformationRole, string> = {
    performance_evidence: "Structured performance information can support present-level review when confirmed by the specialist.",
    supporting_information: "This source supports priorities, context, motivation, or goal wording, but does not establish learner level by itself.",
    suggested_inference: "This is an advisory inference that requires human confirmation before downstream use.",
    unclassified_pending_review: "This information should be reviewed before it affects planning.",
  };

  return {
    id: id("insight", [item.id]),
    learnerId: item.learnerId,
    title: item.label,
    body: bodyByRole[role],
    conceptIds: "conceptIds" in item ? item.conceptIds : [],
    role,
    traceRefs: item.traceRefs,
  };
}

function opportunitiesFromInsights(insights: InformationInsight[]): GoalOpportunity[] {
  return insights.map((insight) => {
    const ready =
      insight.role === "performance_evidence"
        ? "ready_for_goal_draft"
        : insight.role === "supporting_information"
          ? "needs_human_review"
          : "needs_more_information";

    return {
      id: id("goal_opp", [insight.id]),
      learnerId: insight.learnerId,
      title: `Goal opportunity from: ${insight.title}`,
      rationale:
        insight.role === "performance_evidence"
          ? "This opportunity is anchored in a performance source and may be used to draft a measurable goal."
          : "This opportunity can shape priority or wording, but needs another performance anchor before quality approval.",
      conceptIds: insight.conceptIds,
      sourceRole: insight.role,
      readiness: ready,
      traceRefs: insight.traceRefs,
    };
  });
}

function supportOpportunitiesFromSources(learner: Learner, sources: InformationSource[]): SupportOpportunity[] {
  const result: SupportOpportunity[] = [];

  for (const source of sources) {
    if (source.status !== "completed") continue;
    const supports = source.declaredSupports ?? [];
    for (const support of supports) {
      result.push({
        id: id("support_opp", [source.id, support]),
        learnerId: learner.id,
        title: support,
        suggestedConditionPhrase: `Given ${support}, the learner will...`,
        conceptIds: sourceConcepts(source, ["LEARNING_TECH", "SELF_DET"]),
        traceRefs: [trace(source, "declaredSupports")],
      });
    }
  }

  return result;
}

function buildGaps(learner: Learner, sources: InformationSource[], ageBand: AgeBand | null): InformationGap[] {
  const completed = new Set(sources.filter((source) => source.status === "completed").map((source) => source.kind));
  const gaps: InformationGap[] = [];

  if (learner.ageYears === null) {
    gaps.push({
      id: id("gap", [learner.id, "age"]),
      learnerId: learner.id,
      severity: "blocking",
      title: "Learner age is missing",
      recommendation: "Enter learner age or birth date before plan preparation.",
      blocksWorkflow: true,
    });
  }

  if (!completed.has("official_assessment")) {
    gaps.push({
      id: id("gap", [learner.id, "official_assessment"]),
      learnerId: learner.id,
      severity: "blocking",
      title: "Official assessment source is missing",
      recommendation: "Add at least one official assessment source before plan preparation.",
      blocksWorkflow: true,
    });
  }

  if (!completed.has("learner_voice")) {
    gaps.push({
      id: id("gap", [learner.id, "learner_voice"]),
      learnerId: learner.id,
      severity: "quality",
      title: "Learner voice is not documented",
      recommendation: "Collect learner voice to improve priority, motivation, and goal wording.",
      blocksWorkflow: false,
    });
  }

  if (!completed.has("family_voice")) {
    gaps.push({
      id: id("gap", [learner.id, "family_voice"]),
      learnerId: learner.id,
      severity: "quality",
      title: "Family voice is not documented",
      recommendation: "Collect family priorities and contexts to improve plan relevance.",
      blocksWorkflow: false,
    });
  }

  if (ageBand === "AGE_14_PLUS" && !completed.has("career_inclination")) {
    gaps.push({
      id: id("gap", [learner.id, "career_inclination_14_plus"]),
      learnerId: learner.id,
      severity: "quality",
      title: "Career inclination information is recommended for age 14+",
      recommendation: "Add career inclination or transition interest information. This is advisory and does not block workflow.",
      blocksWorkflow: false,
    });
  }

  return gaps;
}

export function reviewInformationSufficiency(learner: Learner, sources: InformationSource[]): SufficiencyReview {
  const ageBand = getAgeBand(learner.ageYears);
  const classifiedInformation = sources.map((source) => classifySource(learner, source));
  const insights = classifiedInformation.map(insightFromClassified);
  const goalOpportunities = opportunitiesFromInsights(insights);
  const supportOpportunities = supportOpportunitiesFromSources(learner, sources);
  const gaps = buildGaps(learner, sources, ageBand);

  return {
    learnerId: learner.id,
    ageBand,
    minimumReady: !gaps.some((gap) => gap.blocksWorkflow),
    classifiedInformation,
    insights,
    goalOpportunities,
    supportOpportunities,
    gaps,
  };
}
