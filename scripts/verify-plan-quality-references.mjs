import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, resolve } from "node:path";
import { mkdtempSync, rmSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const runtimeDir = mkdtempSync(resolve(tmpdir(), "himam-quality-refs-"));
const require = createRequire(import.meta.url);
const ts = require("typescript");

const failures = [];
const userJourneyChecks = [];
const traceabilityChecks = [];

function assert(condition, message) {
  if (!condition) failures.push(message);
}

function step(collection, name, passed, detail = "") {
  collection.push({ name, passed, detail });
  assert(passed, `${name}${detail ? `: ${detail}` : ""}`);
}

try {
  const source = readFileSync(resolve(root, "src/domain/himam/plan-quality-references.ts"), "utf8");
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
      verbatimModuleSyntax: false,
    },
  }).outputText;
  writeFileSync(resolve(runtimeDir, "plan-quality-references.js"), transpiled, "utf8");

  const refsModule = await import(pathToFileURL(resolve(runtimeDir, "plan-quality-references.js")));
  const { PLAN_QUALITY_REFERENCE_SOURCES, PLAN_QUALITY_CRITERIA } = refsModule;
  const sourceIds = new Set(PLAN_QUALITY_REFERENCE_SOURCES.map((source) => source.sourceId));

  step(
    userJourneyChecks,
    "plan quality reference sources registered",
    PLAN_QUALITY_REFERENCE_SOURCES.length >= 8,
    `${PLAN_QUALITY_REFERENCE_SOURCES.length} sources`,
  );
  step(
    userJourneyChecks,
    "quality criteria cover goal and plan review",
    PLAN_QUALITY_CRITERIA.length >= 25 &&
      PLAN_QUALITY_CRITERIA.some((criterion) => criterion.scope === "GOAL") &&
      PLAN_QUALITY_CRITERIA.some((criterion) => criterion.scope === "PLAN") &&
      PLAN_QUALITY_CRITERIA.some((criterion) => criterion.scope === "TRANSITION_PLAN"),
    `${PLAN_QUALITY_CRITERIA.length} criteria`,
  );
  step(
    userJourneyChecks,
    "new IEP quality indicator criteria are represented",
    [
      "PLAN_REQUIRED_COMPONENTS_COMPLETE",
      "PLAN_SOURCE_ATTRIBUTION_AND_INTERPRETATION",
      "PLAN_INDIVIDUALIZED_NON_GENERIC",
      "PLAN_NEED_STATEMENTS_TRACEABLE",
      "PLAN_ADAPTATIONS_SERVICES_ALIGNMENT",
      "PLAN_PROGRESS_REPORTING_SUFFICIENCY",
      "PLAN_PARENT_INPUT_INTEGRATED",
    ].every((criterionId) =>
      PLAN_QUALITY_CRITERIA.some((criterion) => criterion.criterionId === criterionId),
    ),
    "structural, source, generic-language, need, services, progress, and family-input criteria",
  );
  step(
    userJourneyChecks,
    "AGE_14_PLUS transition review remains advisory",
    PLAN_QUALITY_CRITERIA.some(
      (criterion) =>
        criterion.criterionId === "PLAN_TRANSITION_ASSESSMENT_AGE_14_PLUS" &&
        criterion.advisoryOnly === true &&
        criterion.blocksHumanApprovalAutomatically === false &&
        criterion.affectsNumericQualityScore === false,
    ),
    "transition planning age signal cannot block or score",
  );
  step(
    userJourneyChecks,
    "quality references cannot approve plans",
    PLAN_QUALITY_REFERENCE_SOURCES.every(
      (source) =>
        source.authority === "ADVISORY_REFERENCE_ONLY" &&
        source.producesHumanApproval === false &&
        source.producesNumericPlatformApproval === false,
    ),
    "all sources are advisory only",
  );

  for (const criterion of PLAN_QUALITY_CRITERIA) {
    step(
      traceabilityChecks,
      `${criterion.criterionId} source references resolve`,
      criterion.sourceIds.length > 0 && criterion.sourceIds.every((sourceId) => sourceIds.has(sourceId)),
      criterion.sourceIds.join(", "),
    );
  }

  step(
    traceabilityChecks,
    "quality reference source file exists",
    existsSync(resolve(root, "src/domain/himam/plan-quality-references.ts")),
    "src/domain/himam/plan-quality-references.ts",
  );
} finally {
  rmSync(runtimeDir, { recursive: true, force: true });
}

if (failures.length > 0) {
  console.error("Plan quality reference verification failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("Plan quality reference data-integrity verification PASS");
console.log("Plan quality reference userJourney verification PASS");
console.log("Plan quality reference traceability verification PASS");
console.log(`User journey checks: ${userJourneyChecks.length}`);
console.log(`Traceability checks: ${traceabilityChecks.length}`);
