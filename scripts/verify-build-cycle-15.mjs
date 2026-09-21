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
    failures.push(`${label} should not include ${forbidden}`);
    return;
  }
  checks.push(label);
}

const spec = read("specs/himam_build_cycle_15_execution_plan_2026-09-21.md");
const goals = read("src/routes/students.$id.iep.goals.tsx");
const report = read("src/routes/students.$id.report.tsx");
const packageJson = read("package.json");
const ci = read(".github/workflows/quality-gates.yml");

requireText("cycle15 scope", spec, "STRUCTURED_SUPPORT_SERVICES_TABLE");
requireText("support service type", goals, "serviceType");
requireText("support service name", goals, "serviceName");
requireText("support service goals", goals, "linkedGoals");
requireText("support service add", goals, "addSupportService");
requireText("support service delete", goals, "deleteSupportService");
requireText("support service table type header", goals, "نوع الخدمة");
requireText("support service table name header", goals, "اسم الخدمة");
requireText("support service table goals header", goals, "الأهداف");
forbidText("support service action column", goals, "<th style={supportServiceCellStyle}>إجراء</th>");
requireText("legacy service normalization", goals, "normalizeSupportServices");
requireText("report service label compatibility", report, "serviceLabel");

requireText("package script", packageJson, "\"verify:build-cycle-15\"");
requireText("ci runs cycle15", ci, "npm run verify:build-cycle-15");

const result = {
  verification: "build-cycle-15",
  verifiedAt: "2026-09-21",
  status: failures.length === 0 ? "PASS" : "FAIL",
  cycle: "BUILD_CYCLE_15",
  scope: "STRUCTURED_SUPPORT_SERVICES_TABLE",
  checkCount: checks.length,
  failures,
};

writeFileSync(
  resolve(root, "verification/build-cycle-15-run.json"),
  `${JSON.stringify(result, null, 2)}\n`,
);

if (failures.length > 0) {
  console.error(JSON.stringify(result, null, 2));
  process.exit(1);
}

console.log(JSON.stringify(result, null, 2));
