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

const spec = read("specs/himam_build_cycle_28_execution_plan_2026-11-14.md");
const engine = read("src/lib/goal-opportunity-engine.ts");
const rules = read("src/lib/goal-reasoning-rules.mjs");
const profile = read("src/lib/learner-profile-processing.ts");
const tests = read("test/goal-reasoning-phase1.test.mjs");
const packageJson = read("package.json");
const ci = read(".github/workflows/quality-gates.yml");

requireText("cycle28 scope", spec, "GOAL_REASONING_PHASE1");
requireText("phase1 deterministic rules imported", engine, "@/lib/goal-reasoning-rules.mjs");
requireText("P2-12 measurement type", rules, "measurementForTopology");
requireText("baseline-derived criterion", rules, "criterionFromBaseline");
requireText("assessment priority trace", engine, "assessmentPriorityRefs");
requireText("P1-9 fidelity kind", engine, "assessmentFindingKind");
requireText("optional profile minimum formal assessment", profile, '"formal_assessment_results"');
requireText("optional profile minimum current performance", profile, '"current_performance"');
rejectText("family not required for goal validity", profile.match(/const REQUIRED_PROFILE_COMPONENTS[\\s\\S]*?];/)?.[0] ?? "", '"family_voice"');
rejectText("learner voice not required for goal validity", profile.match(/const REQUIRED_PROFILE_COMPONENTS[\\s\\S]*?];/)?.[0] ?? "", '"learner_voice"');
rejectText("priority not required for goal validity", profile.match(/const REQUIRED_PROFILE_COMPONENTS[\\s\\S]*?];/)?.[0] ?? "", '"priority"');
rejectText("fixed default context removed", engine, "function defaultContext");
rejectText("fixed default criterion removed", engine, "function defaultCriterion");
rejectText("fixed direct observation removed", engine, 'measurementMethodAr: "ملاحظة مباشرة"');
requireText("rationale no premature compass claim", engine, "البوصلة الطولية وتكييف الرؤية لم يُفعّلا بعد.");

for (const id of ["T6", "T7", "T8", "T9", "T11", "T14", "T15"]) {
  requireText(`test ${id}`, tests, `${id} —`);
}
requireText("test script", packageJson, '"test:goal-reasoning-phase1"');
requireText("cycle verifier script", packageJson, '"verify:build-cycle-28"');
requireText("ci runs reasoning tests", ci, "npm run test:goal-reasoning-phase1");
requireText("ci runs cycle28 verifier", ci, "npm run verify:build-cycle-28");

const result = {
  verification: "build-cycle-28",
  verifiedAt: "2026-11-14",
  status: failures.length === 0 ? "PASS" : "FAIL",
  cycle: "BUILD_CYCLE_28",
  scope: "GOAL_REASONING_PHASE1",
  checkCount: checks.length,
  failures,
};

writeFileSync(resolve(root, "verification/build-cycle-28-run.json"), `${JSON.stringify(result, null, 2)}\n`);

if (failures.length > 0) {
  console.error(JSON.stringify(result, null, 2));
  process.exit(1);
}

console.log(JSON.stringify(result, null, 2));
