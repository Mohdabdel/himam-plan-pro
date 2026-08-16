import { assertReportTraceability, buildReportPackage } from "../domain/reporting.js";
import { reviewInformationSufficiency } from "../domain/sufficiency-reviewer.js";
import { trialGoalDraft, trialGoalQualityReview } from "./trial-goal-draft.js";
import { trialLearner, trialSources } from "./trial-learner.js";

export const trialReportPackage = buildReportPackage({
  learner: trialLearner,
  sufficiencyReview: reviewInformationSufficiency(trialLearner, trialSources),
  goalDraft: trialGoalDraft,
  goalQualityReview: trialGoalQualityReview,
});

assertReportTraceability(trialReportPackage);
