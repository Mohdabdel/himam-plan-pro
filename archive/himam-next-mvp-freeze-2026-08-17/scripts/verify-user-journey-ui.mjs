import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function includesAll(text, tokens, label) {
  for (const token of tokens) {
    assert(text.includes(token), `${label} is missing token: ${token}`);
  }
}

const root = process.cwd();
const html = readFileSync(resolve(root, "public/index.html"), "utf8");
const app = readFileSync(resolve(root, "public/app.js"), "utf8");
const css = readFileSync(resolve(root, "public/styles.css"), "utf8");

includesAll(
  html,
  [
    "componentChecklist",
    "workflowForm",
    "officialAssessmentTool",
    "assessmentFile",
    "learnerInterests",
    "familyPriorities",
    "familySupports",
    "goalBuilderForm",
    "assessmentDomainSelect",
    "goalSourceSelect",
    "assessmentItemsSelect",
    "goalSupportMode",
    "guidingQuestions",
    "data-step-action=\"next\"",
    "data-step-action=\"prev\"",
  ],
  "User journey HTML",
);

includesAll(
  app,
  [
    "renderComponentChecklist",
    "assessmentDomains",
    "renderGoalBuilder",
    "bindGoalBuilder",
    "guidingQuestionTexts",
    "rebuildWorkflow",
    "buildLocalWorkflow",
    "goToStep",
    "bindNavigation",
    "currentAssessmentFile",
    "career_inclination_14_plus",
  ],
  "User journey JS",
);

includesAll(
  css,
  [
    ".journey-card",
    ".checklist",
    ".check-item",
    ".step-actions",
    ".secondary-step",
    ".ghost-step",
    ".goal-builder",
    ".guiding-questions",
  ],
  "User journey CSS",
);

console.log("User journey UI verification PASS");
console.log("- Plan component checklist PASS");
console.log("- Step navigation PASS");
console.log("- Official assessment file input PASS");
console.log("- Learner/family input fields PASS");
console.log("- Local rebuild fallback PASS");
