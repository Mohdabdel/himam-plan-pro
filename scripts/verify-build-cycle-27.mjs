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

function rejectText(label, content, rejected) {
  if (content.includes(rejected)) {
    failures.push(`${label} still includes ${rejected}`);
    return;
  }
  checks.push(label);
}

const spec = read("specs/himam_build_cycle_27_execution_plan_2026-10-01.md");
const assessmentHub = read("src/routes/students.$id.assessment.tsx");
const packageJson = read("package.json");
const ci = read(".github/workflows/quality-gates.yml");

requireText("cycle27 scope", spec, "ASSESSMENT_HUB_SINGLE_VISIBLE_PATH");
requireText("main journey retained", assessmentHub, "JourneyStepper");
requireText("primary official next retained", assessmentHub, "التالي: أداة التقييم الرسمية");
requireText("subcomponents hidden rationale", assessmentHub, "المكونات الفرعية مخفية هنا لتقليل التشتيت");
requireText("optional components reveal", assessmentHub, "عرض مكونات جمع المعلومات");
requireText("optional components hide", assessmentHub, "إخفاء مكونات جمع المعلومات");
requireText("optional review framing", assessmentHub, "مساحة مراجعة اختيارية وليست مسارا إضافيا");
requireText("component status kept on demand", assessmentHub, "PlanComponentsStatus");
requireText("component disclosure state", assessmentHub, "componentDetailsOpen");
rejectText("linear sub-step chips removed", assessmentHub, "LINEAR_STEPS");
requireText("package script", packageJson, "\"verify:build-cycle-27\"");
requireText("ci runs cycle27", ci, "npm run verify:build-cycle-27");

const result = {
  verification: "build-cycle-27",
  verifiedAt: "2026-10-01",
  status: failures.length === 0 ? "PASS" : "FAIL",
  cycle: "BUILD_CYCLE_27",
  scope: "ASSESSMENT_HUB_SINGLE_VISIBLE_PATH",
  checkCount: checks.length,
  failures,
};

writeFileSync(
  resolve(root, "verification/build-cycle-27-run.json"),
  `${JSON.stringify(result, null, 2)}\n`,
);

if (failures.length > 0) {
  console.error(JSON.stringify(result, null, 2));
  process.exit(1);
}

console.log(JSON.stringify(result, null, 2));
