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

const plan = read("specs/himam_build_cycle_10_execution_plan_2026-09-03.md");
const official = read("src/routes/students.$id.assessment.official.tsx");
const coverage = read("src/routes/students.$id.coverage.tsx");
const family = read("src/routes/students.$id.family.tsx");
const iep = read("src/routes/students.$id.iep.tsx");
const goals = read("src/routes/students.$id.iep.goals.tsx");
const planRoute = read("src/routes/students.$id.plan.tsx");
const packageJson = read("package.json");
const ci = read(".github/workflows/quality-gates.yml");

requireText("cycle10 scope", plan, "SCREEN_SIMPLIFICATION_TO_GOAL_GENERATION_PAUSE");
requireText("official final upload phrase", official, "قم برفع ملف نتائج التقييم النهائية");
requireText("official age transition notice", official, "وفق معايير أدوات تقييم الانتقال الملائمة للعمر");
requireText("official processor title", official, "معالج نتائج أدوات التقييم الرسمية");
requireText("official draft reader hidden", official, "draftReaderOpen");
requireText("official additional assessment", official, "هل تود رفع نتائج تقييمات إضافية");
requireText("official additional intent storage", official, "himam_additional_assessment_intent_");

requireText("family picture self app", family, "FamilyPictureCardsSelfApplication");
requireText("family self app label", family, "تطبيق ذاتي موجه للأسرة");

requireText("coverage transition official notice", coverage, "بناء على معايير اختيار أداة تقييم الانتقال الملائم للعمر");
requireText("coverage processing details hidden", coverage, "processingDetailsOpen");
requireText("coverage more information title", coverage, "للمزيد من المعلومات اطلع على نتائج تفسير ومعالجة معلومات المتعلم");

requireText("iep component dropdown", iep, "مكونات الخطة");
requireText("iep current level rows", iep, "CurrentLevelRow");
requireText("iep current level table strengths", iep, "نقاط القوة");
requireText("iep current level table needs", iep, "نقاط الاحتياج");

requireText("goals engine title", goals, "محرك توليد الأهداف التفاعلي");
requireText("goals option question", goals, "حدد آلية إعداد الأهداف من خيارات المنصة");
requireText("goals interactive option", goals, "منشىء الهدف التفاعلي");
requireText("goals direct option", goals, "إدخال مباشر للأهداف");

requireText("plan context details hidden", planRoute, "contextSignalsOpen");
requireText("plan quality details hidden", planRoute, "planQualityOpen");
requireText("plan goal details hidden", planRoute, "expandedPlanGoalDetails");
requireText("plan context toggle", planRoute, "عرض إشارات السياق");
requireText("plan quality toggle", planRoute, "عرض مراجعة جودة الخطة");
requireText("plan approved goal details toggle", planRoute, "عرض تفاصيل الهدف المعتمد");

requireText("package script", packageJson, "\"verify:build-cycle-10\"");
requireText("ci runs cycle10", ci, "npm run verify:build-cycle-10");

const result = {
  verification: "build-cycle-10",
  verifiedAt: "2026-09-03",
  status: failures.length === 0 ? "PASS" : "FAIL",
  cycle: "BUILD_CYCLE_10",
  scope: "SCREEN_SIMPLIFICATION_TO_GOAL_GENERATION_PAUSE",
  checkCount: checks.length,
  failures,
};

writeFileSync(
  resolve(root, "verification/build-cycle-10-run.json"),
  `${JSON.stringify(result, null, 2)}\n`,
);

if (failures.length > 0) {
  console.error(JSON.stringify(result, null, 2));
  process.exit(1);
}

console.log(JSON.stringify(result, null, 2));
