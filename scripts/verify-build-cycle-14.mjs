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

const spec = read("specs/himam_build_cycle_14_execution_plan_2026-09-21.md");
const goals = read("src/routes/students.$id.iep.goals.tsx");
const packageJson = read("package.json");
const ci = read(".github/workflows/quality-gates.yml");

requireText("cycle14 scope", spec, "GOAL_SCREEN_COGNITIVE_LOAD_AND_FREE_SUPPORT_SERVICES");
requireText("goal info mark component", goals, "function InfoMark");
requireText("goal heading info mark", goals, "حدد آلية إعداد الأهداف من خيارات المنصة");
requireText("guided option info", goals, "مسار موجه يساعد على ربط الهدف");
requireText("direct option info", goals, "كتابة مستقلة للهدف");
requireText("free support textarea", goals, "اكتب خدمات الدعم المقررة، كل خدمة في سطر مستقل");
requireText("free support line split", goals, "split(/\\r?\\n/)");
requireText("matched background", goals, "background: \"#FAF7F2\"");
forbidText("closed support list removed", goals, "const SUPPORT_SERVICES");
forbidText("support toggle removed", goals, "toggleService");

requireText("package script", packageJson, "\"verify:build-cycle-14\"");
requireText("ci runs cycle14", ci, "npm run verify:build-cycle-14");

const result = {
  verification: "build-cycle-14",
  verifiedAt: "2026-09-21",
  status: failures.length === 0 ? "PASS" : "FAIL",
  cycle: "BUILD_CYCLE_14",
  scope: "GOAL_SCREEN_COGNITIVE_LOAD_AND_FREE_SUPPORT_SERVICES",
  checkCount: checks.length,
  failures,
};

writeFileSync(
  resolve(root, "verification/build-cycle-14-run.json"),
  `${JSON.stringify(result, null, 2)}\n`,
);

if (failures.length > 0) {
  console.error(JSON.stringify(result, null, 2));
  process.exit(1);
}

console.log(JSON.stringify(result, null, 2));
