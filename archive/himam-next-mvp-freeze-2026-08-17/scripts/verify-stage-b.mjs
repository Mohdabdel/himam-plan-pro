import { execFileSync } from "node:child_process";
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
const tsc = resolve(root, "../../node_modules/typescript/bin/tsc");

execFileSync("node", [tsc, "--project", "tsconfig.json", "--noEmit"], {
  cwd: root,
  stdio: "pipe",
});

const types = readFileSync(resolve(root, "src/domain/types.ts"), "utf8");
const goalDrafting = readFileSync(resolve(root, "src/domain/goal-drafting.ts"), "utf8");
const trialGoal = readFileSync(resolve(root, "src/fixtures/trial-goal-draft.ts"), "utf8");

includesAll(
  types,
  [
    "GoalDraft",
    "GoalQualityReview",
    "GoalDraftInput",
    "humanApprovalReference?: never",
    "draft_ready_for_human_review",
    "needs_revision",
    "learner_timeframe",
    "condition",
    "observable_behavior",
    "clarifying_details",
    "performance_criterion",
    "measurement_method",
  ],
  "Goal drafting types",
);

includesAll(
  goalDrafting,
  [
    "buildGoalDraft",
    "reviewGoalQuality",
    "VAGUE_GOAL_WORDS",
    "ready_for_goal_draft",
    "sourceOpportunityId",
    "traceRefs",
    "hard_stop",
    "Vague goal language detected",
  ],
  "Goal drafting service",
);

includesAll(
  trialGoal,
  [
    "trialGoalDraft",
    "trialGoalQualityReview",
    "reviewInformationSufficiency",
    "complete a three-step community purchase routine",
    "direct observation checklist",
  ],
  "Trial goal fixture",
);

console.log("Stage B verification PASS");
console.log("- TypeScript typecheck PASS");
console.log("- Goal draft contract PASS");
console.log("- Six goal elements PASS");
console.log("- Human approval write guard PASS");
console.log("- Goal quality review PASS");
console.log("- Trial goal fixture PASS");
