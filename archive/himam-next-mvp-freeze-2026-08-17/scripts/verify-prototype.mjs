import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const root = process.cwd();
const tsc = resolve(root, "../../node_modules/typescript/bin/tsc");
execFileSync("node", [tsc, "--project", "tsconfig.prototype.json"], {
  cwd: root,
  stdio: "pipe",
});

const { buildOperatingWorkflow } = await import(
  pathToFileURL(resolve(root, ".prototype/domain/domain/workflow.js")).href
);
const { trialWorkflow } = await import(
  pathToFileURL(resolve(root, ".prototype/domain/fixtures/trial-workflow.js")).href
);

assert(trialWorkflow.sufficiencyReview.minimumReady, "Default trial workflow should meet minimum readiness.");
assert(trialWorkflow.goalDraft, "Default trial workflow should produce a goal draft.");
assert(trialWorkflow.reportPackage, "Default trial workflow should produce a report package.");

const blockedWorkflow = buildOperatingWorkflow({
  learner: {
    id: "blocked-test",
    name: "Blocked Test",
    ageYears: null,
    entryType: "new",
  },
  sources: [
    {
      id: "src-official-skipped",
      learnerId: "blocked-test",
      kind: "official_assessment",
      status: "skipped",
      title: "Official assessment skipped",
      declaredConcepts: ["SELF_CARE"],
    },
  ],
  goal: {
    behavior: "complete a routine",
    performanceCriterion: "in 4 of 5 opportunities",
    measurementMethod: "observation checklist",
  },
});

assert(!blockedWorkflow.sufficiencyReview.minimumReady, "Missing age and official assessment should block readiness.");
assert(
  blockedWorkflow.sufficiencyReview.gaps.some((gap) => gap.id.includes("age") && gap.blocksWorkflow),
  "Missing age should create a blocking gap.",
);
assert(
  blockedWorkflow.sufficiencyReview.gaps.some((gap) => gap.id.includes("official_assessment") && gap.blocksWorkflow),
  "Missing official assessment should create a blocking gap.",
);
assert(!blockedWorkflow.goalDraft, "Blocked workflow should not produce a goal draft.");
assert(!blockedWorkflow.reportPackage, "Blocked workflow should not produce a report package.");

console.log("Prototype verification PASS");
console.log("- Default workflow renders full A/B/C path PASS");
console.log("- Missing age blocks workflow PASS");
console.log("- Missing official assessment blocks workflow PASS");
console.log("- Blocked workflow does not generate goal/report PASS");
