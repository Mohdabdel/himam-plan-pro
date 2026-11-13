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

const plan = read("specs/himam_build_cycle_03_execution_plan_2026-08-29.md");
const types = read("src/types/himam.ts");
const classifier = read("src/lib/information-classification.ts");
const processing = read("src/lib/learner-profile-processing.ts");
const informationRecords = read("src/lib/information-records.ts");
const pipeline = read("src/lib/source-file-pipeline.ts");
const coverage = read("src/routes/students.$id.coverage.tsx");
const iep = read("src/routes/students.$id.iep.tsx");
const goals = read("src/routes/students.$id.iep.goals.tsx");
const goalOpportunityEngine = read("src/lib/goal-opportunity-engine.ts");
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
  requireText(`cycle03 gate ${gate}`, plan, gate);
}

requireText("processed input type", types, "ProcessedProfileInput");
requireText("processed concept profile type", types, "ProcessedConceptProfile");
requireText("goal opportunity type", types, "ProfileGoalOpportunity");
requireText("processing model type", types, "LearnerProfileProcessingModel");
requireText("classifier exports concept classifier", classifier, "classifyConceptIdsFromText");
requireText("classifier exports signal classifier", classifier, "classifySignalKindsFromText");
requireText("classifier protects performance claims", classifier, "canCandidateInformPerformance");
requireText("classifier uses concept aliases", classifier, "CONCEPT_ALIAS_MAP");
requireText("profile processing exported", processing, "buildLearnerProfileProcessingModel");
requireText("platform tools become processed inputs", processing, "platformToolInputs");
requireText("reviewed uploads become processed inputs", processing, "reviewedUploadInputs");
requireText("concept profile builder", processing, "buildConceptProfile");
requireText("performance draft builder", processing, "buildCurrentPerformanceDraft");
requireText("goal opportunities generated", processing, "buildGoalOpportunities");
requireText("readiness state", processing, "profile_ready_for_goal_review");
requireText("psychometric boundary", processing, "أي تطبيق أو تصحيح سيكومتري كامل يحتاج عقد أداة وترخيص مستقل");
requireText("official assessment upload-only boundary", read("src/routes/students.$id.assessment.official.tsx"), "التقييمات الرسمية كأدوات مطبقة خارج منصة همم");
requireText("official assessment no manual scoring fields", read("src/routes/students.$id.assessment.official.tsx"), "لا يدخل المختص درجات أو تقديرات يدوية هنا");
requireText("information records use signal classifier", informationRecords, "classifySignalKindsFromText");
requireText("information records performance guard", informationRecords, "canCandidateInformPerformance");
requireText("source pipeline classifies concepts", pipeline, "conceptIdsForStatement");
requireText("source pipeline no default-only mapping", pipeline, "classifyConceptIdsFromText");
requireText("coverage imports profile processing", coverage, "buildLearnerProfileProcessingModel");
requireText("coverage shows unified profile", coverage, "قراءة موحدة من الأدوات والملفات");
requireText("coverage shows performance drafts", coverage, "currentPerformanceDraftAr");
requireText("coverage shows goal opportunities", coverage, "topGoalOpportunities");
requireText("iep imports profile processing", iep, "buildLearnerProfileProcessingModel");
requireText("iep shows processed profile counts", iep, "processedProfileInputCount");
requireText("goals imports profile processing", goals, "buildLearnerProfileProcessingModel");
requireText("goals has processed profile source", goals, "processed_information_profile");
requireText("goals maps domains to concepts", goalOpportunityEngine, "conceptIdsForDomain");
requireText("goals filters profile by selected domain", goalOpportunityEngine, ".includes(opportunity.conceptId)");
requireText("goals renders profile panel", goals, "ProfileProcessingPanel");
requireText("goals shows profile opportunities in source step", goalOpportunityEngine, "topGoalOpportunities.slice(0, 6)");
requireText("package script", packageJson, "\"verify:build-cycle-03\"");
requireText("ci runs cycle03", ci, "npm run verify:build-cycle-03");

const result = {
  verification: "build-cycle-03",
  verifiedAt: "2026-08-29",
  status: failures.length === 0 ? "PASS" : "FAIL",
  cycle: "BUILD_CYCLE_03",
  scope: "INFORMAL_TOOLS_AND_REVIEWED_FILES_TO_PROFILE_PROCESSING",
  requiredGateCount: gates.length,
  checkCount: checks.length,
  failures,
};

writeFileSync(
  resolve(root, "verification/build-cycle-03-run.json"),
  `${JSON.stringify(result, null, 2)}\n`,
);

if (failures.length > 0) {
  console.error(JSON.stringify(result, null, 2));
  process.exit(1);
}

console.log(JSON.stringify(result, null, 2));
