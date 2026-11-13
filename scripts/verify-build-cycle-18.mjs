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

const spec = read("specs/himam_build_cycle_18_execution_plan_2026-09-30.md");
const engine = read("src/lib/goal-opportunity-engine.ts");
const goals = read("src/routes/students.$id.iep.goals.tsx");
const goalAiLayer = read("src/lib/goal-ai-layer.ts");
const packageJson = read("package.json");
const ci = read(".github/workflows/quality-gates.yml");

requireText("cycle18 scope", spec, "GOAL_OPPORTUNITY_ENGINE_TO_PLAN_HANDOFF");
requireText("engine card contract", engine, "export type GoalOpportunityCard");
requireText("engine proposal contract", engine, "export type GoalProposal");
requireText("engine card builder", engine, "buildGoalOpportunityCards");
requireText("engine proposal builder", engine, "buildGoalProposals");
requireText("engine readiness gate", engine, "needs_evidence");
requireText("engine proposal variants", engine, "near_current_performance");
requireText("engine transition variant", engine, "functional_transition");
requireText("engine preparatory variant", engine, "preparatory");
requireText("goals route imports engine", goals, "@/lib/goal-opportunity-engine");
requireText("goals route builds cards", goalAiLayer, "buildGoalOpportunityCards");
requireText("goals route builds proposals", goalAiLayer, "buildGoalProposals");
requireText("goals route displays proposal card", goals, "GoalProposalCard");
requireText("goals route add proposal", goals, "addProposalToGoals");
requireText("goals route blocks no evidence proposal", goals, "proposal.readiness === \"needs_evidence\"");
requireText("package script", packageJson, "\"verify:build-cycle-18\"");
requireText("ci runs cycle18", ci, "npm run verify:build-cycle-18");

const result = {
  verification: "build-cycle-18",
  verifiedAt: "2026-09-30",
  status: failures.length === 0 ? "PASS" : "FAIL",
  cycle: "BUILD_CYCLE_18",
  scope: "GOAL_OPPORTUNITY_ENGINE_TO_PLAN_HANDOFF",
  checkCount: checks.length,
  failures,
};

writeFileSync(
  resolve(root, "verification/build-cycle-18-run.json"),
  `${JSON.stringify(result, null, 2)}\n`,
);

if (failures.length > 0) {
  console.error(JSON.stringify(result, null, 2));
  process.exit(1);
}

console.log(JSON.stringify(result, null, 2));
