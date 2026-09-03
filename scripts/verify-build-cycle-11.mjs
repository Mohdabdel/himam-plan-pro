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

function forbidText(label, content, forbidden) {
  if (content.includes(forbidden)) {
    failures.push(`${label} still contains ${forbidden}`);
    return;
  }
  checks.push(label);
}

const spec = read("specs/himam_build_cycle_11_execution_plan_2026-09-04.md");
const official = read("src/routes/students.$id.assessment.official.tsx");
const iep = read("src/routes/students.$id.iep.tsx");
const packageJson = read("package.json");
const ci = read(".github/workflows/quality-gates.yml");

requireText("cycle11 scope", spec, "OFFICIAL_ASSESSMENT_PROCESSOR_AND_CURRENT_LEVEL_DRAFT");
requireText("official assessment applied title", official, "أداة التقييم الرسمية المطبقة مع المتعلم");
requireText("official processor tooltip", official, "عن طريق معالج نتائج التقييم الرسمية يتم تنفيذ عملية مراجعة ومعالجة");
requireText("official single tool selector", official, "اختر الأداة المطبقة");
requireText("official domain review hidden", official, "domainReviewOpen");
forbidText("official duplicate processor title removed", official, "معالج نتائج أدوات التقييم الرسمية</p>");

requireText("current level proposed draft", iep, "النقاط التالية مسودة مقترحة أعدتها المنصة");
requireText("current level detail toggle state", iep, "detailsOpen");
requireText("current level detail file toggle", iep, "استدعاء الملف التفصيلي لمعالجة مصادر المعلومات");
requireText("current level summary metrics", iep, "SummaryMetric");

requireText("package script", packageJson, "\"verify:build-cycle-11\"");
requireText("ci runs cycle11", ci, "npm run verify:build-cycle-11");

const result = {
  verification: "build-cycle-11",
  verifiedAt: "2026-09-04",
  status: failures.length === 0 ? "PASS" : "FAIL",
  cycle: "BUILD_CYCLE_11",
  scope: "OFFICIAL_ASSESSMENT_PROCESSOR_AND_CURRENT_LEVEL_DRAFT",
  checkCount: checks.length,
  failures,
};

writeFileSync(
  resolve(root, "verification/build-cycle-11-run.json"),
  `${JSON.stringify(result, null, 2)}\n`,
);

if (failures.length > 0) {
  console.error(JSON.stringify(result, null, 2));
  process.exit(1);
}

console.log(JSON.stringify(result, null, 2));
