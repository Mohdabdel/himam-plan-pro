import { buildGoalDraft, reviewGoalQuality } from "./goal-drafting.js";
import { buildReportPackage } from "./reporting.js";
import { reviewInformationSufficiency } from "./sufficiency-reviewer.js";
import type { InformationSource, Learner, OperatingWorkflow } from "./types.js";

export type WorkflowGoalInput = {
  timeframe?: string;
  behavior?: string;
  clarifyingDetails?: string;
  performanceCriterion?: string;
  measurementMethod?: string;
};

export type OperatingWorkflowInput = {
  learner: Learner;
  sources: InformationSource[];
  goal?: WorkflowGoalInput;
};

export function buildOperatingWorkflow(input: OperatingWorkflowInput): OperatingWorkflow {
  const sufficiencyReview = reviewInformationSufficiency(input.learner, input.sources);
  const opportunity = sufficiencyReview.goalOpportunities.find(
    (item) => item.readiness === "ready_for_goal_draft",
  );

  if (!opportunity) {
    return {
      learner: input.learner,
      sources: input.sources,
      sufficiencyReview,
      goalDraft: null,
      goalQualityReview: null,
      reportPackage: null,
    };
  }

  const goalDraft = buildGoalDraft({
    learner: input.learner,
    opportunity,
    support: sufficiencyReview.supportOpportunities[0],
    timeframe: input.goal?.timeframe ?? "By the end of the annual plan period",
    behavior: input.goal?.behavior ?? "complete a three-step community purchase routine",
    clarifyingDetails: input.goal?.clarifyingDetails ?? "during a simulated or real community routine",
    performanceCriterion:
      input.goal?.performanceCriterion ??
      "in 4 of 5 observed opportunities across three consecutive sessions",
    measurementMethod: input.goal?.measurementMethod ?? "direct observation checklist and work-sample record",
  });
  const goalQualityReview = reviewGoalQuality(goalDraft);
  const reportPackage = buildReportPackage({
    learner: input.learner,
    sufficiencyReview,
    goalDraft,
    goalQualityReview,
  });

  return {
    learner: input.learner,
    sources: input.sources,
    sufficiencyReview,
    goalDraft,
    goalQualityReview,
    reportPackage,
  };
}
