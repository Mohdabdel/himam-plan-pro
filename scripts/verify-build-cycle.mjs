import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outputPath = resolve(root, "verification/build-cycle-01-run.json");

function read(path) {
  return readFileSync(resolve(root, path), "utf8");
}

const files = {
  checklist: read("specs/himam_pre_programming_governance_checklist_2026-08-24.md"),
  plan: read("specs/himam_build_cycle_01_execution_plan_2026-08-24.md"),
  workflowMaps: read("specs/himam_workflow_maps.md"),
  screenScenarios: read("specs/himam_screen_operating_scenarios_2026-08-24.md"),
  architecture: read("specs/himam_architecture_readiness_pack_2026-08-24.md"),
  manifest: read("specs/himam_governing_files_manifest.json"),
  packageJson: read("package.json"),
  ci: read(".github/workflows/quality-gates.yml"),
};

const packageJson = JSON.parse(files.packageJson);
const failures = [];

function requireIncludes(name, text, phrases) {
  for (const phrase of phrases) {
    if (!text.includes(phrase)) {
      failures.push(`${name} is missing required phrase: ${phrase}`);
    }
  }
}

const buildCycleGates = [
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

requireIncludes("Pre-programming checklist", files.checklist, buildCycleGates);
requireIncludes("Build cycle 01 plan", files.plan, buildCycleGates);
requireIncludes("Build cycle 01 plan", files.plan, [
  "BUILD_CYCLE_01_SCOPE = GOVERNANCE_AUTOMATION_AND_CI",
  "PRODUCT_FEATURE_CHANGE = NO",
  "READY_TO_COMMIT_WHEN = verify:build-cycle + governing-files + typecheck + lint + build PASS",
]);

requireIncludes("Workflow maps", files.workflowMaps, [
  "WORKFLOW_MAPS = ACCEPTED_FOR_PHASED_PROGRAMMING",
  "EVERY_ROUTE_REQUIRES_WORKFLOW_MAPPING = ACTIVE",
  "إثبات أنه أخف من البديل",
]);

requireIncludes("Screen scenarios", files.screenScenarios, [
  "SCREEN_OPERATING_SCENARIOS = ACCEPTED_FOR_PHASED_PROGRAMMING",
  "NO_DUPLICATE_ENTRY_RULE = ACTIVE",
  "NO_SYSTEM_GUESSING_RULE = ACTIVE",
]);

requireIncludes("Architecture readiness pack", files.architecture, [
  "ARCHITECTURE_READINESS_PACK = ACCEPTED_FOR_PHASED_PROGRAMMING",
  "PRODUCTION_SECURITY_READINESS = NOT_YET_ACCEPTED",
]);

requireIncludes("CI workflow", files.ci, [
  "npm ci",
  "npm run verify:governing-files",
  "npm run verify:build-cycle",
  "npm run typecheck",
  "npm run lint",
  "npm run build",
]);

if (!packageJson.scripts?.["verify:build-cycle"]) {
  failures.push("package.json must expose verify:build-cycle.");
}

const result = {
  verification: "build-cycle-01",
  verifiedAt: "2026-08-24",
  status: failures.length === 0 ? "PASS" : "FAIL",
  cycle: "BUILD_CYCLE_01",
  scope: "GOVERNANCE_AUTOMATION_AND_CI",
  productFeatureChange: false,
  migrationRequired: false,
  requiredGateCount: buildCycleGates.length,
  checks: {
    buildCycleGatesDocumented: buildCycleGates.every((gate) => files.checklist.includes(gate) && files.plan.includes(gate)) ? "PASS" : "FAIL",
    workflowMapsReady: files.workflowMaps.includes("WORKFLOW_MAPS = ACCEPTED_FOR_PHASED_PROGRAMMING") ? "PASS" : "FAIL",
    screenScenariosReady: files.screenScenarios.includes("SCREEN_OPERATING_SCENARIOS = ACCEPTED_FOR_PHASED_PROGRAMMING") ? "PASS" : "FAIL",
    architectureReadinessReady: files.architecture.includes("ARCHITECTURE_READINESS_PACK = ACCEPTED_FOR_PHASED_PROGRAMMING") ? "PASS" : "FAIL",
    ciQualityGatesRegistered: files.ci.includes("npm run verify:build-cycle") ? "PASS" : "FAIL",
    packageScriptRegistered: packageJson.scripts?.["verify:build-cycle"] ? "PASS" : "FAIL",
  },
  failures,
};

writeFileSync(outputPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");

if (failures.length > 0) {
  console.error(JSON.stringify(result, null, 2));
  process.exit(1);
}

console.log(JSON.stringify(result, null, 2));
