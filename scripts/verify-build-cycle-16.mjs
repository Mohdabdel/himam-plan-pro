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

const spec = read("specs/himam_build_cycle_16_execution_plan_2026-09-22.md");
const seed = read("src/lib/seed-sample-student.ts");
const packageJson = read("package.json");
const ci = read(".github/workflows/quality-gates.yml");

requireText("cycle16 scope", spec, "COMPLETE_UPSTREAM_TRIAL_PATH");
requireText("assessment records seeded", seed, "saveAssessmentRecords");
requireText("official reviewed file seeded", seed, "buildSourceFilePipeline");
requireText("source pipelines seeded", seed, "saveSourceFilePipelines");
requireText("information records seeded", seed, "saveInformationRecords");
requireText("family platform tool seeded", seed, "FAMILY_VISION_CORE");
requireText("learner platform tool seeded", seed, "LEARNER_VOICE_CORE");
requireText("additional worksite tool seeded", seed, "MASARAT_COMMUNITY_WORKSITE_SKILLS_EVALUATION");
requireText("current level preparation seeded", seed, "himam_plan_preparation_");
requireText("structured support services seeded", seed, "serviceType");
requireText("age 14 transition trial seeded", seed, "AGE_14_PLUS");
requireText("package script", packageJson, "\"verify:build-cycle-16\"");
requireText("ci runs cycle16", ci, "npm run verify:build-cycle-16");

const result = {
  verification: "build-cycle-16",
  verifiedAt: "2026-09-22",
  status: failures.length === 0 ? "PASS" : "FAIL",
  cycle: "BUILD_CYCLE_16",
  scope: "COMPLETE_UPSTREAM_TRIAL_PATH",
  checkCount: checks.length,
  failures,
};

writeFileSync(
  resolve(root, "verification/build-cycle-16-run.json"),
  `${JSON.stringify(result, null, 2)}\n`,
);

if (failures.length > 0) {
  console.error(JSON.stringify(result, null, 2));
  process.exit(1);
}

console.log(JSON.stringify(result, null, 2));
