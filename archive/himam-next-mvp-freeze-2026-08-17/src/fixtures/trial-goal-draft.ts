import { buildGoalDraft, reviewGoalQuality } from "../domain/goal-drafting.js";
import { reviewInformationSufficiency } from "../domain/sufficiency-reviewer.js";
import { trialLearner, trialSources } from "./trial-learner.js";

const trialSufficiencyReview = reviewInformationSufficiency(trialLearner, trialSources);
const performanceOpportunity = trialSufficiencyReview.goalOpportunities.find(
  (opportunity) => opportunity.readiness === "ready_for_goal_draft",
);

if (!performanceOpportunity) {
  throw new Error("Trial fixture requires one performance-anchored goal opportunity.");
}

export const trialGoalDraft = buildGoalDraft({
  learner: trialLearner,
  opportunity: performanceOpportunity,
  support: trialSufficiencyReview.supportOpportunities[0],
  timeframe: "By the end of the annual plan period",
  behavior: "complete a three-step community purchase routine",
  clarifyingDetails: "during a simulated or real community routine",
  performanceCriterion: "in 4 of 5 observed opportunities across three consecutive sessions",
  measurementMethod: "direct observation checklist and work-sample record",
});

export const trialGoalQualityReview = reviewGoalQuality(trialGoalDraft);
