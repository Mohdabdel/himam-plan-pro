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

const plan = read("specs/himam_build_cycle_07_execution_plan_2026-09-01.md");
const goalRoute = read("src/routes/students.$id.iep.goals.tsx");
const packageJson = read("package.json");
const ci = read(".github/workflows/quality-gates.yml");

requireText("cycle07 scope", plan, "GOAL_AUTHORING_BASELINE_SOURCE_AND_COGNITIVE_LOAD");
requireText("cycle07 interactive creator", plan, "منشئ الهدف التفاعلي");
requireText("cycle07 direct entry", plan, "إدراج هدف مباشرة");
requireText("cycle07 baseline priority", plan, "FORMAL_THEN_INFORMAL_BASELINE_PRIORITY");
requireText("cycle07 details on demand", plan, "DETAILS_ON_DEMAND");

requireText("goal builder has baseline source", goalRoute, "baselineSourceId");
requireText("goal builder formal option", goalRoute, "formal_assessment");
requireText("goal builder informal option", goalRoute, "informal_assessment");
requireText("goal builder reviewed file option", goalRoute, "reviewed_file_sources");
requireText("goal route interactive mode button", goalRoute, "منشئ الهدف التفاعلي");
requireText("goal route direct mode button", goalRoute, "إدراج هدف مباشرة");
requireText("goal route baseline label", goalRoute, "مرجعية الخط القاعدي");
requireText("goal route formal item gate", goalRoute, "اختر بنداً واحداً على الأقل من بنود أداة التقييم الرسمية");
requireText("goal route extracts component", goalRoute, "GoalPreparationExtracts");
requireText("goal route source details hidden", goalRoute, "sourceDetailsOpen && <ReviewedFileSourcesPanel");
requireText("goal route processing details hidden", goalRoute, "processingDetailsOpen && <InformationProcessingPanel");
requireText("goal route profile details hidden", goalRoute, "profileDetailsOpen &&");
requireText("goal route details toggle", goalRoute, "DetailsToggleButton");

requireText("package script", packageJson, "\"verify:build-cycle-07\"");
requireText("ci runs cycle07", ci, "npm run verify:build-cycle-07");

const result = {
  verification: "build-cycle-07",
  verifiedAt: "2026-09-01",
  status: failures.length === 0 ? "PASS" : "FAIL",
  cycle: "BUILD_CYCLE_07",
  scope: "GOAL_AUTHORING_BASELINE_SOURCE_AND_COGNITIVE_LOAD",
  checkCount: checks.length,
  failures,
};

writeFileSync(
  resolve(root, "verification/build-cycle-07-run.json"),
  `${JSON.stringify(result, null, 2)}\n`,
);

if (failures.length > 0) {
  console.error(JSON.stringify(result, null, 2));
  process.exit(1);
}

console.log(JSON.stringify(result, null, 2));
