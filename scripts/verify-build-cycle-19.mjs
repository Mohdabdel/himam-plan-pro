import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const read = (path) => readFileSync(resolve(root, path), "utf8");

const checks = [];
const failures = [];

function requireText(label, content, expected) {
  if (!content.includes(expected)) {
    failures.push(`${label} missing ${expected}`);
    return;
  }
  checks.push(label);
}

const spec = read("specs/himam_build_cycle_19_execution_plan_2026-09-30.md");
const aiLayer = read("src/lib/goal-ai-layer.ts");
const goals = read("src/routes/students.$id.iep.goals.tsx");
const packageJson = read("package.json");
const ci = read(".github/workflows/quality-gates.yml");

requireText("cycle19 scope", spec, "BOUNDED_GOAL_AI_LAYER");
requireText("ai layer policy type", aiLayer, "export type GoalAiLayerPolicy");
requireText("ai layer suggestion set", aiLayer, "export type GoalAiSuggestionSet");
requireText("ai layer bounded function", aiLayer, "buildBoundedGoalAiSuggestions");
requireText("ai layer review support only", aiLayer, "decisionBoundary: \"review_support_only\"");
requireText("ai layer no approval", aiLayer, "producesApproval: false");
requireText("ai layer no baseline", aiLayer, "producesBaseline: false");
requireText("ai layer human review", aiLayer, "requiresHumanReview: true");
requireText("ai layer fallback", aiLayer, "rules_engine_when_model_unavailable");
requireText("goals imports ai layer", goals, "@/lib/goal-ai-layer");
requireText("goals displays ai layer title", goals, "طبقة AI المساندة لتوليد الأهداف");
requireText("goals shows ai limits", goals, "AiLayerPolicyDetails");
requireText("goals still blocks no evidence", goals, "proposal.readiness === \"needs_evidence\"");
requireText("package script", packageJson, "\"verify:build-cycle-19\"");
requireText("ci runs cycle19", ci, "npm run verify:build-cycle-19");

const result = {
  verification: "build-cycle-19",
  verifiedAt: "2026-09-30",
  status: failures.length === 0 ? "PASS" : "FAIL",
  cycle: "BUILD_CYCLE_19",
  scope: "BOUNDED_GOAL_AI_LAYER",
  checkCount: checks.length,
  failures,
};

writeFileSync(
  resolve(root, "verification/build-cycle-19-run.json"),
  `${JSON.stringify(result, null, 2)}\n`,
);

if (failures.length > 0) {
  console.error(JSON.stringify(result, null, 2));
  process.exit(1);
}

console.log(JSON.stringify(result, null, 2));
