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

const plan = read("specs/himam_build_cycle_02_execution_plan_2026-08-24.md");
const workspace = read("src/lib/current-performance-workspace.ts");
const coverage = read("src/routes/students.$id.coverage.tsx");
const packageJson = read("package.json");
const ci = read(".github/workflows/quality-gates.yml");

const gates = [
  "قرار منتج مرجعي",
  "سيناريو مستخدم محدد",
  "متطلبات مجال وصلاحيات",
  "تصميم بيانات مع migration قابلة للمراجعة",
  "API أو service contract",
  "تصميم واجهة",
  "اختبارات حسب المخاطر",
  "مراجعة أمنية للوظائف الحساسة",
  "build/lint/typecheck في CI",
  "مراجعة diff ضد المواصفة",
  "demo على سيناريو واقعي",
  "تحديث سجل القرارات والوثائق",
];

for (const gate of gates) {
  requireText(`cycle02 gate ${gate}`, plan, gate);
}

requireText("workspace builder exported", workspace, "buildCurrentPerformanceWorkspace");
requireText("workspace summary exported", workspace, "summarizeCurrentPerformanceWorkspace");
requireText("official reviewed source classification", workspace, "OFFICIAL_ASSESSMENT_RESULTS");
requireText("current performance cue kind", workspace, "CURRENT_PERFORMANCE_CUE");
requireText("context support kind", workspace, "CONTEXT_SUPPORT");
requireText("completion gap kind", workspace, "COMPLETION_GAP");
requireText("no raw file dependency", workspace, "structuredResponses.map");
requireText("baseline guard", workspace, "canSupportGoalBaseline: kind === \"CURRENT_PERFORMANCE_CUE\"");
requireText("human review before claim flag", workspace, "requiresHumanReviewBeforeClaim");

requireText("coverage imports workspace", coverage, "buildCurrentPerformanceWorkspace");
requireText("coverage loads pipelines", coverage, "loadSourceFilePipelines");
requireText("coverage displays current performance cards", coverage, "بطاقات أداء وسياق من مصادر مرفوعة ومراجعة");
requireText("coverage shows provenance", coverage, "provenanceLabel");
requireText("coverage shows baseline readiness", coverage, "baselineReady");

requireText("package script", packageJson, "\"verify:build-cycle-02\"");
requireText("ci runs cycle02", ci, "npm run verify:build-cycle-02");

const result = {
  verification: "build-cycle-02",
  verifiedAt: "2026-08-24",
  status: failures.length === 0 ? "PASS" : "FAIL",
  cycle: "BUILD_CYCLE_02",
  scope: "CURRENT_PERFORMANCE_FROM_REVIEWED_SOURCE_FILES",
  requiredGateCount: gates.length,
  checkCount: checks.length,
  failures,
};

writeFileSync(
  resolve(root, "verification/build-cycle-02-run.json"),
  `${JSON.stringify(result, null, 2)}\n`,
);

if (failures.length > 0) {
  console.error(JSON.stringify(result, null, 2));
  process.exit(1);
}

console.log(JSON.stringify(result, null, 2));
