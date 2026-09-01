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

const plan = read("specs/himam_build_cycle_06_execution_plan_2026-08-31.md");
const reportRoute = read("src/routes/students.$id.report.tsx");
const goalRoute = read("src/routes/students.$id.iep.goals.tsx");
const planRoute = read("src/routes/students.$id.plan.tsx");
const packageJson = read("package.json");
const ci = read(".github/workflows/quality-gates.yml");

requireText("cycle06 scope", plan, "REPORT_READINESS_GATE");
requireText("cycle06 final boundary", plan, "FINAL_REPORT_BOUNDARY = PLAN_APPROVAL_REQUIRED");
requireText("cycle06 no generated on visit", plan, "فتح شاشة التقرير لا يعني توليد تقرير نهائي");
requireText("cycle06 approved plan required", plan, "PlanApprovalRecord.decision = approved");
requireText("cycle06 print disabled", plan, "أزرار الطباعة تكون معطلة");

requireText("report readiness contract", reportRoute, "evaluateReportReadiness");
requireText("report generated only when ready", reportRoute, "readiness.finalReportReady");
requireText("report loads plan approval", reportRoute, "loadPlanApprovalRecord");
requireText("report checks approved plan", reportRoute, "planApproval?.decision !== \"approved\"");
requireText("report checks blocked goal draft", reportRoute, "blocked_until_progress_findings_resolved");
requireText("report checks submitted goals", reportRoute, "goalApprovalIds");
requireText("report checks activities", reportRoute, "activities_selected");
requireText("report neutral browser title", reportRoute, "{ title: \"التقرير — همم\" }");
requireText("report draft title", reportRoute, "مسودة مراجعة التقرير");
requireText("report readiness gate UI", reportRoute, "بوابة جاهزية التقرير");
requireText("report print disabled", reportRoute, "disabled={!finalReportReady}");
requireText("report no direct print without gate", reportRoute, "function handlePrint()");

requireText("goals draft progress tag source", goalRoute, "draftProgressTag");
requireText("plan creates approval record", planRoute, "buildPlanApprovalRecord");
requireText("package script", packageJson, "\"verify:build-cycle-06\"");
requireText("ci runs cycle06", ci, "npm run verify:build-cycle-06");

const result = {
  verification: "build-cycle-06",
  verifiedAt: "2026-08-31",
  status: failures.length === 0 ? "PASS" : "FAIL",
  cycle: "BUILD_CYCLE_06",
  scope: "REPORT_READINESS_GATE",
  checkCount: checks.length,
  failures,
};

writeFileSync(
  resolve(root, "verification/build-cycle-06-run.json"),
  `${JSON.stringify(result, null, 2)}\n`,
);

if (failures.length > 0) {
  console.error(JSON.stringify(result, null, 2));
  process.exit(1);
}

console.log(JSON.stringify(result, null, 2));
