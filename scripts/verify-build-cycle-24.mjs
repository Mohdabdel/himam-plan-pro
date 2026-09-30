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

const spec = read("specs/himam_build_cycle_24_execution_plan_2026-09-30.md");
const goals = read("src/routes/students.$id.iep.goals.tsx");
const plan = read("src/routes/students.$id.plan.tsx");
const packageJson = read("package.json");
const ci = read(".github/workflows/quality-gates.yml");

requireText("cycle24 scope", spec, "GOAL_TO_PLAN_HANDOFF_REVIEW");
requireText("goals handoff model", goals, "const goalHandoffReview");
requireText("goals handoff persisted", goals, "goalHandoffReview,");
requireText("goals handoff title", goals, "تقرير انتقال الأهداف إلى الخطة");
requireText("goals blocker detail", goals, "تفاصيل الموانع قبل رفع الخطة");
requireText("plan raw handoff type", plan, "goalHandoffReview?:");
requireText("plan handoff state", plan, "setGoalHandoffReview(rawIEP?.goalHandoffReview ?? null)");
requireText("plan handoff title", plan, "تقرير انتقال الأهداف من شاشة الإعداد");
requireText("plan handoff metric", plan, "function PlanHandoffMetric");
requireText("package script", packageJson, "\"verify:build-cycle-24\"");
requireText("ci runs cycle24", ci, "npm run verify:build-cycle-24");

const result = {
  verification: "build-cycle-24",
  verifiedAt: "2026-09-30",
  status: failures.length === 0 ? "PASS" : "FAIL",
  cycle: "BUILD_CYCLE_24",
  scope: "GOAL_TO_PLAN_HANDOFF_REVIEW",
  checkCount: checks.length,
  failures,
};

writeFileSync(
  resolve(root, "verification/build-cycle-24-run.json"),
  `${JSON.stringify(result, null, 2)}\n`,
);

if (failures.length > 0) {
  console.error(JSON.stringify(result, null, 2));
  process.exit(1);
}

console.log(JSON.stringify(result, null, 2));
