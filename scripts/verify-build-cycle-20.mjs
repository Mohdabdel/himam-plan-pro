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

const spec = read("specs/himam_build_cycle_20_execution_plan_2026-09-30.md");
const goals = read("src/routes/students.$id.iep.goals.tsx");
const plan = read("src/routes/students.$id.plan.tsx");
const packageJson = read("package.json");
const ci = read(".github/workflows/quality-gates.yml");

requireText("cycle20 scope", spec, "AI_SUGGESTION_PROVENANCE_TO_PLAN");
requireText("goal type has ai suggestion", goals, "aiSuggestion?:");
requireText("proposal saves ai suggestion", goals, "aiSuggestion: {");
requireText("goal stores ai layer name", goals, "layerName: goalAiSuggestions.policy.layerName");
requireText("goal stores ai why", goals, "whyAr: proposal.whyAr");
requireText("goal displays ai marker", goals, "وسم طبقة AI");
requireText("plan raw goal has ai suggestion", plan, "aiSuggestion?:");
requireText("plan entry carries ai suggestion", plan, "iepAiSuggestion");
requireText("plan displays ai marker", plan, "الهدف بدأ كمقترح مساعد قابل للمراجعة");
requireText("package script", packageJson, "\"verify:build-cycle-20\"");
requireText("ci runs cycle20", ci, "npm run verify:build-cycle-20");

const result = {
  verification: "build-cycle-20",
  verifiedAt: "2026-09-30",
  status: failures.length === 0 ? "PASS" : "FAIL",
  cycle: "BUILD_CYCLE_20",
  scope: "AI_SUGGESTION_PROVENANCE_TO_PLAN",
  checkCount: checks.length,
  failures,
};

writeFileSync(
  resolve(root, "verification/build-cycle-20-run.json"),
  `${JSON.stringify(result, null, 2)}\n`,
);

if (failures.length > 0) {
  console.error(JSON.stringify(result, null, 2));
  process.exit(1);
}

console.log(JSON.stringify(result, null, 2));
