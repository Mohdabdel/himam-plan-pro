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

const spec = read("specs/himam_build_cycle_12_execution_plan_2026-09-20.md");
const currentLevelDraft = read("src/lib/current-level-draft.ts");
const iep = read("src/routes/students.$id.iep.tsx");
const goals = read("src/routes/students.$id.iep.goals.tsx");
const packageJson = read("package.json");
const ci = read(".github/workflows/quality-gates.yml");

requireText("cycle12 scope", spec, "INFORMATION_PROCESSING_TO_CURRENT_LEVEL_AND_GOAL_AUTHORING");
requireText("current level builder exported", currentLevelDraft, "buildProcessedCurrentLevelRows");
requireText("current level type exported", currentLevelDraft, "ProcessedCurrentLevelRow");
requireText("current level uses assessment records", currentLevelDraft, "assessmentRecords");
requireText("current level uses profile processing", currentLevelDraft, "profileProcessing");
requireText("current level classifies strengths", currentLevelDraft, "strengthLinesFromProfiles");
requireText("current level classifies needs", currentLevelDraft, "needLinesFromProfiles");

requireText("iep imports processed rows", iep, "buildProcessedCurrentLevelRows");
requireText("iep shows source summary per row", iep, "row.sourceSummaryAr");
requireText("iep keeps detail file toggle", iep, "استدعاء الملف التفصيلي لمعالجة مصادر المعلومات");

requireText("goals imports processed rows", goals, "buildProcessedCurrentLevelRows");
requireText("goals builds current level rows", goals, "const currentLevelRows = buildProcessedCurrentLevelRows");
requireText("goals selects current level row", goals, "selectedCurrentLevelRow");
requireText("goals current level card", goals, "مسودة مستوى الأداء الحالي للمجال المختار");

requireText("package script", packageJson, "\"verify:build-cycle-12\"");
requireText("ci runs cycle12", ci, "npm run verify:build-cycle-12");

const result = {
  verification: "build-cycle-12",
  verifiedAt: "2026-09-20",
  status: failures.length === 0 ? "PASS" : "FAIL",
  cycle: "BUILD_CYCLE_12",
  scope: "INFORMATION_PROCESSING_TO_CURRENT_LEVEL_AND_GOAL_AUTHORING",
  checkCount: checks.length,
  failures,
};

writeFileSync(
  resolve(root, "verification/build-cycle-12-run.json"),
  `${JSON.stringify(result, null, 2)}\n`,
);

if (failures.length > 0) {
  console.error(JSON.stringify(result, null, 2));
  process.exit(1);
}

console.log(JSON.stringify(result, null, 2));
