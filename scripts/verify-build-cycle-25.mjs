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

const spec = read("specs/himam_build_cycle_25_execution_plan_2026-09-30.md");
const report = read("src/routes/students.$id.report.tsx");
const packageJson = read("package.json");
const ci = read(".github/workflows/quality-gates.yml");

requireText("cycle25 scope", spec, "REPORT_HANDOFF_REVIEW_TRACE");
requireText("report raw handoff type", report, "goalHandoffReview?:");
requireText("report handoff title", report, "تقرير انتقال الأهداف إلى الخطة");
requireText("report handoff metric", report, "function ReportHandoffMetric");
requireText("report started metric", report, "value={iep.goalHandoffReview.totalStartedGoals}");
requireText("report ready metric", report, "value={iep.goalHandoffReview.readyGoalCount}");
requireText("report blocked metric", report, "value={iep.goalHandoffReview.blockedGoalCount}");
requireText("report blocker summaries", report, "iep.goalHandoffReview.blockerSummaries.map");
requireText("package script", packageJson, "\"verify:build-cycle-25\"");
requireText("ci runs cycle25", ci, "npm run verify:build-cycle-25");

const result = {
  verification: "build-cycle-25",
  verifiedAt: "2026-09-30",
  status: failures.length === 0 ? "PASS" : "FAIL",
  cycle: "BUILD_CYCLE_25",
  scope: "REPORT_HANDOFF_REVIEW_TRACE",
  checkCount: checks.length,
  failures,
};

writeFileSync(
  resolve(root, "verification/build-cycle-25-run.json"),
  `${JSON.stringify(result, null, 2)}\n`,
);

if (failures.length > 0) {
  console.error(JSON.stringify(result, null, 2));
  process.exit(1);
}

console.log(JSON.stringify(result, null, 2));
