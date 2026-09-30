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

const spec = read("specs/himam_build_cycle_21_execution_plan_2026-09-30.md");
const goals = read("src/routes/students.$id.iep.goals.tsx");
const packageJson = read("package.json");
const ci = read(".github/workflows/quality-gates.yml");

requireText("cycle21 scope", spec, "GOAL_AI_SMART_START");
requireText("goals initial suggestions", goals, "initialGoalAiSuggestions");
requireText("goals initial opportunities", goals, "initialGoalOpportunityCards");
requireText("goals smart start function", goals, "startFromAiProposal");
requireText("goals smart start title", goals, "بدء ذكي من طبقة AI");
requireText("goals smart start edit action", goals, "بدء التحرير");
requireText("goals smart start conditional before mode", goals, "!goalBuilder.mode");
requireText("goals prefill direct text", goals, "directGoalText: proposal.textAr");
requireText("goals opens knowledge support", goals, "setKnowledgeSupportOpen(true)");
requireText("package script", packageJson, "\"verify:build-cycle-21\"");
requireText("ci runs cycle21", ci, "npm run verify:build-cycle-21");

const result = {
  verification: "build-cycle-21",
  verifiedAt: "2026-09-30",
  status: failures.length === 0 ? "PASS" : "FAIL",
  cycle: "BUILD_CYCLE_21",
  scope: "GOAL_AI_SMART_START",
  checkCount: checks.length,
  failures,
};

writeFileSync(
  resolve(root, "verification/build-cycle-21-run.json"),
  `${JSON.stringify(result, null, 2)}\n`,
);

if (failures.length > 0) {
  console.error(JSON.stringify(result, null, 2));
  process.exit(1);
}

console.log(JSON.stringify(result, null, 2));
