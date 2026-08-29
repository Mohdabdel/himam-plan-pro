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

const plan = read("specs/himam_build_cycle_04_execution_plan_2026-08-29.md");
const types = read("src/types/himam.ts");
const processing = read("src/lib/learner-profile-processing.ts");
const coverage = read("src/routes/students.$id.coverage.tsx");
const goals = read("src/routes/students.$id.iep.goals.tsx");
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
  requireText(`cycle04 gate ${gate}`, plan, gate);
}

requireText("profile component id type", types, "ProfileComponentId");
requireText("profile component importance type", types, "ProfileComponentImportance");
requireText("profile goal impact type", types, "ProfileGoalImpact");
requireText("profile component element type", types, "ProfileComponentElement");
requireText("profile component coverage type", types, "ProfileComponentCoverage");
requireText("profile component matrix type", types, "LearnerProfileComponentMatrix");
requireText("processing model has matrix", types, "componentMatrix: LearnerProfileComponentMatrix");

requireText("component names configured", processing, "COMPONENT_NAMES_AR");
requireText("required components configured", processing, "REQUIRED_PROFILE_COMPONENTS");
requireText("component classifier", processing, "classifyProfileComponentIds");
requireText("matrix builder", processing, "buildProfileComponentMatrix");
requireText("family voice component", processing, "family_voice");
requireText("learner voice component", processing, "learner_voice");
requireText("family priorities element", processing, "أولويات الأسرة");
requireText("family vision element", processing, "رؤية الأسرة");
requireText("goal validity impact", processing, "blocks_or_weakens_goal_validity");
requireText("goal quality personalization impact", processing, "improves_goal_personalization");
requireText("retrieval hints", processing, "goalRetrievalHintsAr");
requireText("blocking gaps", processing, "blockingGapsAr");
requireText("matrix included in model", processing, "componentMatrix,");

requireText("coverage shows component matrix", coverage, "مصفوفة مكونات البروفايل");
requireText("coverage shows goal validity", coverage, "صحة الهدف");
requireText("coverage explains sorting engine", coverage, "يفرز المحرك المدخلات إلى مكونات أساسية");
requireText("coverage shows blocking gaps", coverage, "فجوات مؤثرة");

requireText("goals imports component element", goals, "ProfileComponentElement");
requireText("goals maps components to domain", goals, "componentElementsForDomain");
requireText("goals source note uses matrix", goals, "مصفوفة مكونات البروفايل");
requireText("goals shows component elements", goals, "selectedProfileComponentElements");
requireText("goals shows impact label", goals, "profileImpactLabel");
requireText("goals panel exists", goals, "ProfileComponentMatrixPanel");
requireText("goals panel inserted", goals, "<ProfileComponentMatrixPanel model={profileProcessing} />");

requireText("package script", packageJson, "\"verify:build-cycle-04\"");
requireText("ci runs cycle04", ci, "npm run verify:build-cycle-04");

const result = {
  verification: "build-cycle-04",
  verifiedAt: "2026-08-29",
  status: failures.length === 0 ? "PASS" : "FAIL",
  cycle: "BUILD_CYCLE_04",
  scope: "PROFILE_COMPONENT_PROCESSING_ENGINE",
  requiredGateCount: gates.length,
  checkCount: checks.length,
  failures,
};

writeFileSync(
  resolve(root, "verification/build-cycle-04-run.json"),
  `${JSON.stringify(result, null, 2)}\n`,
);

if (failures.length > 0) {
  console.error(JSON.stringify(result, null, 2));
  process.exit(1);
}

console.log(JSON.stringify(result, null, 2));
