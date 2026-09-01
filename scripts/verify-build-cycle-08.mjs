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

const plan = read("specs/himam_build_cycle_08_execution_plan_2026-09-01.md");
const planRoute = read("src/routes/students.$id.plan.tsx");
const governance = read("src/lib/goal-plan-approval.ts");
const packageJson = read("package.json");
const ci = read(".github/workflows/quality-gates.yml");

requireText("cycle08 scope", plan, "GOAL_TO_PLAN_APPROVAL_FLOW_REVIEW");
requireText("cycle08 approved units rule", plan, "PLAN_USES_APPROVED_GOAL_UNITS_ONLY");
requireText("cycle08 approval reset rule", plan, "PLAN_APPROVAL_RESET_ON_DRAFT_CHANGE");
requireText("cycle08 approval boundary", plan, "GoalDraft -> GoalQualityCheck -> GoalApprovalRecord -> PlanDraft");

requireText("plan route input issue state", planRoute, "planInputIssue");
requireText("plan route approved bundles", planRoute, "approvedGoalBundles");
requireText("plan route approved local ids", planRoute, "approvedLocalGoalIds");
requireText("plan route filters approved goals", planRoute, "approvedFlatGoals");
requireText("plan route blocks unapproved goals", planRoute, "no_approved_goals");
requireText("plan route blocks blocked draft", planRoute, "blocked_until_progress_findings_resolved");
requireText("plan route gate title", planRoute, "لا توجد أهداف معتمدة للإدراج");
requireText("plan route links back to goals", planRoute, "to=\"/students/$id/iep/goals\"");
requireText("plan route clears old plan approval", planRoute, "clearPlanApprovalRecord(id)");

requireText("governance clear function", governance, "export function clearPlanApprovalRecord");
requireText("governance removes plan approval key", governance, "localStorage.removeItem(planApprovalKey(learnerId))");
requireText("governance strips governance approval", governance, "planApproval: approval");

requireText("package script", packageJson, "\"verify:build-cycle-08\"");
requireText("ci runs cycle08", ci, "npm run verify:build-cycle-08");

const result = {
  verification: "build-cycle-08",
  verifiedAt: "2026-09-01",
  status: failures.length === 0 ? "PASS" : "FAIL",
  cycle: "BUILD_CYCLE_08",
  scope: "GOAL_TO_PLAN_APPROVAL_FLOW_REVIEW",
  checkCount: checks.length,
  failures,
};

writeFileSync(
  resolve(root, "verification/build-cycle-08-run.json"),
  `${JSON.stringify(result, null, 2)}\n`,
);

if (failures.length > 0) {
  console.error(JSON.stringify(result, null, 2));
  process.exit(1);
}

console.log(JSON.stringify(result, null, 2));
