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
    failures.push(`${label} still includes ${forbidden}`);
    return;
  }
  checks.push(label);
}

const spec = read("specs/himam_build_cycle_23_execution_plan_2026-09-30.md");
const goals = read("src/routes/students.$id.iep.goals.tsx");
const packageJson = read("package.json");
const ci = read(".github/workflows/quality-gates.yml");

requireText("cycle23 scope", spec, "GOAL_SCREEN_COGNITIVE_LOAD_REDUCTION");
forbidText("goals hidden structure panel", goals, "هيكلة توليد الأهداف");
forbidText("goals hidden knowledge panel", goals, "الإطار المعرفي الداعم");
requireText("goals arabic interface font", goals, "IBM Plex Sans Arabic");
requireText("goals first operating choice", goals, "حدد آلية إعداد الأهداف من خيارات المنصة");
requireText("package script", packageJson, "\"verify:build-cycle-23\"");
requireText("ci runs cycle23", ci, "npm run verify:build-cycle-23");

const result = {
  verification: "build-cycle-23",
  verifiedAt: "2026-09-30",
  status: failures.length === 0 ? "PASS" : "FAIL",
  cycle: "BUILD_CYCLE_23",
  scope: "GOAL_SCREEN_COGNITIVE_LOAD_REDUCTION",
  checkCount: checks.length,
  failures,
};

writeFileSync(
  resolve(root, "verification/build-cycle-23-run.json"),
  `${JSON.stringify(result, null, 2)}\n`,
);

if (failures.length > 0) {
  console.error(JSON.stringify(result, null, 2));
  process.exit(1);
}

console.log(JSON.stringify(result, null, 2));
