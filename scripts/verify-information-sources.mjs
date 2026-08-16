import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, resolve } from "node:path";
import { mkdirSync, mkdtempSync, rmSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const runtimeDir = mkdtempSync(resolve(tmpdir(), "himam-info-sources-"));
const require = createRequire(import.meta.url);
const ts = require("typescript");

const failures = [];
function assert(condition, message) {
  if (!condition) failures.push(message);
}

try {
  const assessmentToolsSource = readFileSync(resolve(root, "src/data/assessment-tools.ts"), "utf8")
    .replace(/@\/types\/himam/g, "../types/himam");
  const reviewSource = readFileSync(resolve(root, "src/lib/information-source-review.ts"), "utf8")
    .replace(/@\/data\/assessment-tools/g, "../data/assessment-tools.js");

  const compile = (source, filename) => ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
      verbatimModuleSyntax: false,
    },
  }).outputText;

  writeFileSync(resolve(runtimeDir, "package.json"), '{"type":"module"}\n', "utf8");
  mkdirSync(resolve(runtimeDir, "types"), { recursive: true });
  mkdirSync(resolve(runtimeDir, "data"), { recursive: true });
  mkdirSync(resolve(runtimeDir, "lib"), { recursive: true });
  writeFileSync(resolve(runtimeDir, "types/himam.js"), "export {};\n", "utf8");
  writeFileSync(resolve(runtimeDir, "data/assessment-tools.js"), compile(assessmentToolsSource), "utf8");
  writeFileSync(resolve(runtimeDir, "lib/information-source-review.js"), compile(reviewSource), "utf8");

  const toolsModule = await import(pathToFileURL(resolve(runtimeDir, "data/assessment-tools.js")));
  const reviewModule = await import(pathToFileURL(resolve(runtimeDir, "lib/information-source-review.js")));
  const { ASSESSMENT_TOOLS } = toolsModule;
  const {
    isDevelopmentalAssessmentUnder9,
    reviewAssessmentTransitionCoverage,
  } = reviewModule;

  const toolIds = ASSESSMENT_TOOLS.map((tool) => tool.id);
  assert(toolIds.includes("TTAP-3"), "official assessment list should include TTAP");
  assert(toolIds.includes("PEP-3"), "official assessment list should include PEP-3");
  assert(toolIds.includes("PEP-R"), "official assessment list should include PEP-R");
  assert(toolIds.includes("PORTAGE_PROFILE"), "official assessment list should include Portage");
  assert(toolIds.includes("OTHER_OFFICIAL_ASSESSMENT"), "official assessment list should include Other");
  assert(new Set(toolIds).size === toolIds.length, "assessment tool IDs should be unique");

  const review = reviewAssessmentTransitionCoverage({
    ageBand: "AGE_14_PLUS",
    selectedToolId: "PEP-3",
  });
  assert(review.reviewed === true, "AGE_14_PLUS should activate transition coverage review");
  assert(review.advisoryOnly === true, "coverage review should be advisory only");
  assert(review.affectsLearnerLevel === false, "coverage review must not affect learner level");
  assert(review.blocksWorkflow === false, "coverage review must not block workflow");
  assert(review.missingAreas.includes("learner_voice"), "coverage review should identify learner voice when missing");

  const under14Review = reviewAssessmentTransitionCoverage({
    ageBand: "UNDER_14",
    selectedToolId: "TTAP-3",
  });
  assert(under14Review.status === "NOT_ACTIVATED", "UNDER_14 should not activate transition-specific review");

  assert(
    isDevelopmentalAssessmentUnder9({ ageYears: 8, selectedToolId: "PEP-3" }) === true,
    "developmental tool under age 9 should trigger developmental-processing discussion flag",
  );
  assert(
    isDevelopmentalAssessmentUnder9({ ageYears: 14, selectedToolId: "PEP-3" }) === false,
    "developmental-processing discussion flag should not trigger for age 14 plus",
  );
} finally {
  rmSync(runtimeDir, { recursive: true, force: true });
}

if (failures.length > 0) {
  console.error("Information sources verification failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("Information sources data-integrity verification PASS");
console.log("Information sources userJourney verification PASS");
console.log("Information sources traceability boundary verification PASS");
