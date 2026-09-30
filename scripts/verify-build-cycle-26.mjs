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

function requireOrder(label, content, orderedTexts) {
  let cursor = -1;
  for (const text of orderedTexts) {
    const next = content.indexOf(text, cursor + 1);
    if (next === -1) {
      failures.push(`${label} missing ordered text ${text}`);
      return;
    }
    if (next < cursor) {
      failures.push(`${label} order failed at ${text}`);
      return;
    }
    cursor = next;
  }
  checks.push(label);
}

const spec = read("specs/himam_build_cycle_26_execution_plan_2026-09-30.md");
const journey = read("src/lib/journey.ts");
const assessmentHub = read("src/routes/students.$id.assessment.tsx");
const iepHub = read("src/routes/students.$id.iep.tsx");
const packageJson = read("package.json");
const ci = read(".github/workflows/quality-gates.yml");

requireText("cycle26 scope", spec, "LINEAR_JOURNEY_NAVIGATION_REVIEW");
requireOrder("journey operating order", journey, [
  'id: "assessment"',
  'id: "learner_voice"',
  'id: "family"',
  'id: "coverage"',
  'id: "iep"',
  'id: "plan"',
  'id: "implementation"',
  'id: "report"',
]);
requireOrder("journey rank order", journey, [
  "assessment_completed: 2",
  "learner_voice_completed: 3",
  "family_completed: 4",
  "coverage_ready: 5",
]);
requireText("assessment primary path", assessmentHub, "المسار الرئيسي للتجربة");
requireText("assessment official next", assessmentHub, "التالي: أداة التقييم الرسمية");
requireText("assessment cards secondary note", assessmentHub, "البطاقات التالية للاطلاع أو العودة لمكوّن محدد");
requireText("iep linear handler", iepHub, "function goToNextPlanComponent");
requireText("iep next current level", iepHub, "التالي: مستوى الأداء الحالي");
requireText("iep next specialist vision", iepHub, "التالي: رؤية المختص");
requireText("iep next goals", iepHub, "التالي: توليد الأهداف");
requireText("package script", packageJson, "\"verify:build-cycle-26\"");
requireText("ci runs cycle26", ci, "npm run verify:build-cycle-26");

const result = {
  verification: "build-cycle-26",
  verifiedAt: "2026-09-30",
  status: failures.length === 0 ? "PASS" : "FAIL",
  cycle: "BUILD_CYCLE_26",
  scope: "LINEAR_JOURNEY_NAVIGATION_REVIEW",
  checkCount: checks.length,
  failures,
};

writeFileSync(
  resolve(root, "verification/build-cycle-26-run.json"),
  `${JSON.stringify(result, null, 2)}\n`,
);

if (failures.length > 0) {
  console.error(JSON.stringify(result, null, 2));
  process.exit(1);
}

console.log(JSON.stringify(result, null, 2));
