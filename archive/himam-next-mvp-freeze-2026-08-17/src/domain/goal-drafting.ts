import type {
  GoalDraft,
  GoalDraftElement,
  GoalDraftInput,
  GoalQualityIssue,
  GoalQualityReview,
  TraceRef,
} from "./types.js";

export const VAGUE_GOAL_WORDS = [
  "understand",
  "know",
  "improve",
  "learn",
  "appreciate",
  "يفهم",
  "يعرف",
  "يحسن",
  "يتعلم",
  "يدرك",
] as const;

function id(prefix: string, parts: string[]) {
  return `${prefix}_${parts.join("_")}`.replace(/[^a-zA-Z0-9_]/g, "_");
}

function valueOrMissing(value: string | undefined, placeholder: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : `[missing ${placeholder}]`;
}

function uniqueTraceRefs(traceRefs: TraceRef[]) {
  const seen = new Set<string>();
  return traceRefs.filter((traceRef) => {
    const key = `${traceRef.sourceKind}:${traceRef.sourceId}:${traceRef.field ?? ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function buildGoalDraft(input: GoalDraftInput): GoalDraft {
  const timeframe = input.timeframe?.trim() || "By the end of the plan period";
  const condition =
    input.support?.suggestedConditionPhrase.replace("the learner will...", `${input.learner.name} will`) ||
    `Given appropriate materials and support, ${input.learner.name} will`;
  const behavior = valueOrMissing(input.behavior, "observable behavior");
  const clarifyingDetails = input.clarifyingDetails?.trim() || "in a relevant daily-life context";
  const performanceCriterion = valueOrMissing(input.performanceCriterion, "performance criterion");
  const measurementMethod = valueOrMissing(input.measurementMethod, "measurement method");

  const elements: GoalDraftElement[] = [
    {
      key: "learner_timeframe",
      label: "Learner and timeframe",
      value: timeframe,
    },
    {
      key: "condition",
      label: "Condition",
      value: condition,
    },
    {
      key: "observable_behavior",
      label: "Observable behavior",
      value: behavior,
    },
    {
      key: "clarifying_details",
      label: "Clarifying details",
      value: clarifyingDetails,
    },
    {
      key: "performance_criterion",
      label: "Performance criterion",
      value: performanceCriterion,
    },
    {
      key: "measurement_method",
      label: "Measurement method",
      value: measurementMethod,
    },
  ];

  const traceRefs = uniqueTraceRefs([
    ...input.opportunity.traceRefs,
    ...(input.support?.traceRefs ?? []),
  ]);
  const text = `${timeframe}, ${condition} ${behavior} ${clarifyingDetails} with ${performanceCriterion}, as measured by ${measurementMethod}.`;
  const missingRequired = elements.some((element) => element.value.includes("[missing"));
  const status =
    missingRequired || input.opportunity.readiness !== "ready_for_goal_draft"
      ? "needs_revision"
      : "draft_ready_for_human_review";

  return {
    id: id("goal_draft", [input.learner.id, input.opportunity.id]),
    learnerId: input.learner.id,
    sourceOpportunityId: input.opportunity.id,
    conceptIds: input.opportunity.conceptIds,
    status,
    text,
    elements,
    traceRefs,
  };
}

export function reviewGoalQuality(draft: GoalDraft): GoalQualityReview {
  const issues: GoalQualityIssue[] = [];
  const elementByKey = new Map(draft.elements.map((element) => [element.key, element.value]));

  for (const key of ["observable_behavior", "performance_criterion", "measurement_method"] as const) {
    const value = elementByKey.get(key);
    if (!value || value.includes("[missing")) {
      issues.push({
        id: id("goal_quality", [draft.id, key]),
        severity: "hard_stop",
        title: `Missing ${key.replace(/_/g, " ")}`,
        recommendation: "Complete this required element before the goal can be sent for human review.",
      });
    }
  }

  const lowerGoalText = draft.text.toLowerCase();
  const vagueWord = VAGUE_GOAL_WORDS.find((word) => lowerGoalText.includes(word));
  if (vagueWord) {
    issues.push({
      id: id("goal_quality", [draft.id, "vague_language"]),
      severity: "quality",
      title: "Vague goal language detected",
      recommendation: `Replace "${vagueWord}" with an observable action such as identify, complete, select, request, write, or perform.`,
    });
  }

  if (draft.traceRefs.length === 0) {
    issues.push({
      id: id("goal_quality", [draft.id, "traceability"]),
      severity: "hard_stop",
      title: "Goal has no source trace",
      recommendation: "Link the goal to a current information source before review.",
    });
  }

  return {
    goalDraftId: draft.id,
    readyForHumanReview:
      draft.status === "draft_ready_for_human_review" &&
      !issues.some((issue) => issue.severity === "hard_stop"),
    issues,
  };
}
