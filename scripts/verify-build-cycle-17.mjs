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

const spec = read("specs/himam_build_cycle_17_execution_plan_2026-09-28.md");
const goals = read("src/routes/students.$id.iep.goals.tsx");
const packageJson = read("package.json");
const ci = read(".github/workflows/quality-gates.yml");

requireText("cycle17 scope", spec, "GOAL_BASELINE_FROM_UPSTREAM_SOURCES");
requireText("baseline candidate type", goals, "type BaselineCandidate");
requireText("baseline candidate builder", goals, "buildBaselineCandidates");
requireText("assessment record baseline source", goals, "assessment_record");
requireText("current level baseline source", goals, "current_level");
requireText("ttap fallback baseline source", goals, "ttap_item");
requireText("formal assessment saved result label", goals, "نتيجة تقييم رسمي محفوظة");
requireText("current level draft label", goals, "مسودة مستوى أداء حالي قابلة للمراجعة");
requireText("manual reviewed baseline fallback", goals, "اكتب تفسير الخط القاعدي يدوياً إن كان لديك مصدر مراجع");
requireText("manual anchor allowed when no selected candidate", goals, "!goalBuilder.performanceAnchor.trim()");
requireText("package script", packageJson, "\"verify:build-cycle-17\"");
requireText("ci runs cycle17", ci, "npm run verify:build-cycle-17");

const result = {
  verification: "build-cycle-17",
  verifiedAt: "2026-09-28",
  status: failures.length === 0 ? "PASS" : "FAIL",
  cycle: "BUILD_CYCLE_17",
  scope: "GOAL_BASELINE_FROM_UPSTREAM_SOURCES",
  checkCount: checks.length,
  failures,
};

writeFileSync(
  resolve(root, "verification/build-cycle-17-run.json"),
  `${JSON.stringify(result, null, 2)}\n`,
);

if (failures.length > 0) {
  console.error(JSON.stringify(result, null, 2));
  process.exit(1);
}

console.log(JSON.stringify(result, null, 2));
