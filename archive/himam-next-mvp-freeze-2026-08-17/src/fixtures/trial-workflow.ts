import { buildOperatingWorkflow } from "../domain/workflow.js";
import { trialLearner, trialSources } from "./trial-learner.js";

export const trialWorkflow = buildOperatingWorkflow({
  learner: trialLearner,
  sources: trialSources,
});
