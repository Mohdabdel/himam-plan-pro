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

const plan = read("specs/himam_build_cycle_09_execution_plan_2026-09-01.md");
const planRoute = read("src/routes/students.$id.plan.tsx");
const reportRoute = read("src/routes/students.$id.report.tsx");
const packageJson = read("package.json");
const ci = read(".github/workflows/quality-gates.yml");

requireText("cycle09 scope", plan, "PLAN_TEMPLATE_CURRENT_PERFORMANCE_COMPONENT");
requireText("cycle09 current performance rule", plan, "CURRENT_PERFORMANCE_IS_PLAN_COMPONENT");
requireText("cycle09 output rule", plan, "APPROVED_PLAN_OUTPUT_INCLUDES_CURRENT_PERFORMANCE");

requireText("plan route current performance state", planRoute, "currentPerformanceStatement");
requireText("plan route current performance builder", planRoute, "buildPlanCurrentPerformanceStatement");
requireText("plan route basic data card", planRoute, "قالب مكونات الخطة");
requireText("plan route component label", planRoute, "مستوى الأداء الحالي كمكوّن خطة");
requireText("plan route class vision label", planRoute, "رؤية الخطة التربوية الفردية لفريق العمل الصفي");
requireText("plan route stores current performance", planRoute, "currentPerformanceStatement,");
requireText("plan route stores plan vision", planRoute, "planVision,");

requireText("report plan data current performance", reportRoute, "currentPerformanceStatement?: string");
requireText("report plan data vision", reportRoute, "planVision?: string");
requireText("report renders plan components", reportRoute, "مكونات الخطة المعتمدة");
requireText("report renders current performance", reportRoute, "plan.currentPerformanceStatement");
requireText("report renders plan vision", reportRoute, "plan.planVision");

requireText("package script", packageJson, "\"verify:build-cycle-09\"");
requireText("ci runs cycle09", ci, "npm run verify:build-cycle-09");

const result = {
  verification: "build-cycle-09",
  verifiedAt: "2026-09-01",
  status: failures.length === 0 ? "PASS" : "FAIL",
  cycle: "BUILD_CYCLE_09",
  scope: "PLAN_TEMPLATE_CURRENT_PERFORMANCE_COMPONENT",
  checkCount: checks.length,
  failures,
};

writeFileSync(
  resolve(root, "verification/build-cycle-09-run.json"),
  `${JSON.stringify(result, null, 2)}\n`,
);

if (failures.length > 0) {
  console.error(JSON.stringify(result, null, 2));
  process.exit(1);
}

console.log(JSON.stringify(result, null, 2));
