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

const plan = read("specs/himam_build_cycle_05_execution_plan_2026-08-30.md");
const constitution = read("specs/himam_product_constitution.md");
const glossary = read("specs/himam_domain_glossary.md");
const workflows = read("specs/himam_workflow_maps.md");
const preProgramming = read("specs/himam_pre_programming_governance_checklist_2026-08-24.md");
const goalQuality = read("src/lib/goal-quality.ts");
const planQualityReferences = read("src/domain/himam/plan-quality-references.ts");
const transitionReferences = read("src/domain/himam/transition-assessment-references.ts");
const profileProcessing = read("src/lib/learner-profile-processing.ts");
const adoptedScreenFlow = read("specs/himam_adopted_screen_flow_concept_01_plus_goal_studio_2026-08-30.md");
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
  requireText(`cycle05 gate ${gate}`, plan, gate);
  requireText(`pre-programming gate ${gate}`, preProgramming, gate);
}

requireText("constitution value chain", constitution, "مصدر");
requireText("constitution no gaps rule", constitution, "لا يترك الفريق خلفه فجوات");
requireText("glossary KSI boundary", glossary, "KnowledgeSupportItem");
requireText("workflow goal plan path", workflows, "GoalQualityCheck");
requireText("workflow plan quality path", workflows, "PlanQualityReview");

requireText("cycle05 scope", plan, "GOAL_PLAN_QUALITY_RUBRIC_ENGINE");
requireText("cycle05 pre-programming applied", plan, "PRE_PROGRAMMING_GATE = APPLIED");
requireText("cycle05 review support boundary", plan, "RUBRIC_DECISION_BOUNDARY = REVIEW_SUPPORT_ONLY");
requireText("cycle05 no score", plan, "لا يوجد score نهائي");
requireText("cycle05 no cut scores", plan, "لا توجد cut scores");
requireText("cycle05 no auto approval", plan, "لا يوجد اعتماد آلي");
requireText("cycle05 KSI guard", plan, "لا يستخدم كمستوى أداء أو criterion");
requireText("cycle05 formal baseline guard", plan, "baseline");
requireText("cycle05 goal trigger term", plan, "باعث الهدف");
requireText("cycle05 performance anchor term", plan, "مرتكز الأداء / الخط القاعدي");
requireText("cycle05 adopted screen flow", plan, "ADOPTED_SCREEN_FLOW");
requireText("cycle05 transition age guard", plan, "عمر 14 فأعلى");
requireText("cycle05 service contract", plan, "evaluateGoalPlanQuality(input)");
requireText("cycle05 findings severity", plan, "QualityFindingSeverity");
requireText("cycle05 plan unit review", plan, "الخطة كوحدة متكاملة");

requireText("existing goal quality function", goalQuality, "computeGoalQuality");
requireText("implemented plan quality contract", goalQuality, "evaluateGoalPlanQuality");
requireText("implemented finding severity type", goalQuality, "QualityFindingSeverity");
requireText("implemented review support boundary", goalQuality, "decisionBoundary: \"review_support_only\"");
requireText("existing hard stop guard", goalQuality, "hasHardStopViolation");
requireText("plan quality criteria", planQualityReferences, "PLAN_QUALITY_CRITERIA");
requireText("plan quality source count", planQualityReferences, "IEP_GOAL_QUALITY_RUBRIC_2023");
requireText("transition principles", transitionReferences, "TRANSITION_ASSESSMENT_PRINCIPLES");
requireText("age 14 plan quality criterion", planQualityReferences, "PLAN_TRANSITION_ASSESSMENT_AGE_14_PLUS");
requireText("age 14 transition principle", transitionReferences, "Age 14 plus");
requireText("profile component matrix", profileProcessing, "buildProfileComponentMatrix");
requireText("adopted screen flow status", adoptedScreenFlow, "ADOPTED_SEQUENCE_BASE = SCREEN_FLOW_CONCEPT_01");
requireText("adopted goal source split", adoptedScreenFlow, "GOAL_SOURCE_SPLIT = GOAL_TRIGGER + PERFORMANCE_ANCHOR");
requireText("adopted formal assessment boundary", adoptedScreenFlow, "FORMAL_ASSESSMENT_MODE = UPLOADED_REVIEWED_RESULTS_ONLY");
requireText("adopted knowledge support display", adoptedScreenFlow, "KNOWLEDGE_SUPPORT_MODE = BACKGROUND_ON_DEMAND_OR_PARALLEL_FOR_INDEPENDENT_AUTHORING");
requireText("cycle05 guided questions no clutter", plan, "لا تزاحمه لوحة الدعم المعرفي المفتوحة افتراضياً");
requireText("adopted goal approval boundary", adoptedScreenFlow, "GOAL_APPROVAL_BOUNDARY = GoalDraft != GoalApprovalRecord != PlanApprovalRecord");

requireText("package script", packageJson, "\"verify:build-cycle-05\"");
requireText("ci runs cycle05", ci, "npm run verify:build-cycle-05");

const result = {
  verification: "build-cycle-05",
  verifiedAt: "2026-08-30",
  status: failures.length === 0 ? "PASS" : "FAIL",
  cycle: "BUILD_CYCLE_05",
  scope: "GOAL_PLAN_QUALITY_RUBRIC_ENGINE_PRE_PROGRAMMING_GATE",
  requiredGateCount: gates.length,
  checkCount: checks.length,
  failures,
};

writeFileSync(
  resolve(root, "verification/build-cycle-05-run.json"),
  `${JSON.stringify(result, null, 2)}\n`,
);

if (failures.length > 0) {
  console.error(JSON.stringify(result, null, 2));
  process.exit(1);
}

console.log(JSON.stringify(result, null, 2));
