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

const spec = read("specs/himam_build_cycle_13_execution_plan_2026-09-21.md");
const iep = read("src/routes/students.$id.iep.tsx");
const goals = read("src/routes/students.$id.iep.goals.tsx");
const packageJson = read("package.json");
const ci = read(".github/workflows/quality-gates.yml");

requireText("cycle13 scope", spec, "CURRENT_LEVEL_CREATION_REVIEW_AND_FREE_DOMAINS");
requireText("iep creation mechanism title", iep, "كيف أنشئت المسودة؟");
requireText("iep creation mechanism toggle", iep, "استدعاء آلية إنشاء مستوى الأداء والملف التفصيلي");
requireText("iep free domain button", iep, "إضافة مجال حر");
requireText("iep free domain placeholder", iep, "اكتب المجال أو اختره من المقترحات");
requireText("iep updates domain name", iep, "domainNameAr");

requireText("goals domain from current level", goals, "goalDomainOptions");
requireText("goals current level domain select", goals, "اختر المجال من مستوى الأداء الحالي");
requireText("goals free domain input", goals, "أو اكتب مجالاً حراً");
requireText("goals uses goal domain options", goals, "goalDomainOptions.map");

requireText("package script", packageJson, "\"verify:build-cycle-13\"");
requireText("ci runs cycle13", ci, "npm run verify:build-cycle-13");

const result = {
  verification: "build-cycle-13",
  verifiedAt: "2026-09-21",
  status: failures.length === 0 ? "PASS" : "FAIL",
  cycle: "BUILD_CYCLE_13",
  scope: "CURRENT_LEVEL_CREATION_REVIEW_AND_FREE_DOMAINS",
  checkCount: checks.length,
  failures,
};

writeFileSync(
  resolve(root, "verification/build-cycle-13-run.json"),
  `${JSON.stringify(result, null, 2)}\n`,
);

if (failures.length > 0) {
  console.error(JSON.stringify(result, null, 2));
  process.exit(1);
}

console.log(JSON.stringify(result, null, 2));
