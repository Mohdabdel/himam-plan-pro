import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const tsc = resolve(root, "../../node_modules/typescript/bin/tsc");

function pass(label) {
  console.log(`PASS ${label}`);
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

execFileSync(process.execPath, [tsc, "--project", resolve(root, "tsconfig.json"), "--outDir", resolve(root, ".tmp-stage-a")], {
  cwd: root,
  stdio: "pipe",
});
pass("typescript domain compilation");

const types = readFileSync(resolve(root, "src/domain/types.ts"), "utf8");
const sufficiency = readFileSync(resolve(root, "src/domain/sufficiency-reviewer.ts"), "utf8");
const fixture = readFileSync(resolve(root, "src/fixtures/trial-learner.ts"), "utf8");

for (const concept of [
  "SAFETY",
  "SELF_DET",
  "COMM",
  "SELF_CARE",
  "MOBILITY",
  "SOCIAL",
  "COMMUNITY",
  "HEALTH",
  "ACADEMIC",
  "LEARNING_TECH",
]) {
  assert(types.includes(`"${concept}"`), `Missing concept ${concept}`);
}
pass("ten Himam concepts are present");

for (const token of [
  "EvidenceRecord",
  "KnowledgeSupportItem",
  "InferenceSuggestion",
  "InformationInsight",
  "GoalOpportunity",
  "SupportOpportunity",
  "InformationGap",
  "SufficiencyReview",
]) {
  assert(types.includes(`type ${token}`) || types.includes(`export type ${token}`), `Missing type ${token}`);
}
pass("stage A domain records are present");

for (const token of [
  "reviewInformationSufficiency",
  "career_inclination_14_plus",
  "official_assessment",
  "family_voice",
  "learner_voice",
  "performance_evidence",
  "supporting_information",
]) {
  assert(sufficiency.includes(token), `Missing sufficiency logic token ${token}`);
}
pass("sufficiency reviewer contains required operating rules");

for (const token of [
  "trialLearner",
  "official_assessment",
  "family_voice",
  "learner_voice",
  "prior_report",
]) {
  assert(fixture.includes(token), `Missing fixture token ${token}`);
}
pass("trial fixture covers minimum journey sources");

console.log("Stage A verification PASS");
