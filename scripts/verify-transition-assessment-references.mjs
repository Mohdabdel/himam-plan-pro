import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, resolve } from "node:path";
import { mkdtempSync, rmSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const runtimeDir = mkdtempSync(resolve(tmpdir(), "himam-transition-refs-"));
const require = createRequire(import.meta.url);
const ts = require("typescript");
const manifest = JSON.parse(readFileSync(resolve(root, "src/domain/himam/stage1-manifest.json"), "utf8"));

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
  const source = readFileSync(resolve(root, "src/domain/himam/transition-assessment-references.ts"), "utf8");
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
      verbatimModuleSyntax: false,
    },
  }).outputText;
  writeFileSync(resolve(runtimeDir, "transition-assessment-references.js"), transpiled, "utf8");

  const refsModule = await import(pathToFileURL(resolve(runtimeDir, "transition-assessment-references.js")));
  const {
    TRANSITION_ASSESSMENT_REFERENCE_SOURCES,
    TRANSITION_ASSESSMENT_PRINCIPLES,
  } = refsModule;
  const sourceIds = new Set(TRANSITION_ASSESSMENT_REFERENCE_SOURCES.map((source) => source.sourceId));

  step(
    userJourneyChecks,
    "transition assessment reference sources registered",
    TRANSITION_ASSESSMENT_REFERENCE_SOURCES.length === 7,
    `${TRANSITION_ASSESSMENT_REFERENCE_SOURCES.length} sources`,
  );
  step(
    userJourneyChecks,
    "all transition references are knowledge-only",
    TRANSITION_ASSESSMENT_REFERENCE_SOURCES.every(
      (source) =>
        source.knowledgeOnly === true &&
        source.implementsStage4 === false &&
        source.createsEvidenceRecord === false &&
        source.advisoryOnly === true,
    ),
    "no source can silently create Stage 4, EvidenceRecord, or approval",
  );
  step(
    userJourneyChecks,
    "tool-template documents are represented",
    [
      "ADOLESCENT_AUTONOMY_CHECKLIST",
      "IEP_DISABILITY_AWARENESS_CHECKLIST",
      "FAMILY_INVOLVEMENT_TRANSITION_ASSESSMENT",
      "HIMAM_FAMILY_VISION_SNAPSHOT_AND_PICTURE_CARDS",
    ].every((sourceId) =>
      TRANSITION_ASSESSMENT_REFERENCE_SOURCES.some(
        (source) => source.sourceId === sourceId && source.libraryPlacement === "REFERENCE_AND_TOOL_TEMPLATE",
      ),
    ),
    "autonomy, IEP awareness, and family involvement templates",
  );
  step(
    userJourneyChecks,
    "transition methodology references remain reference-only",
    [
      "NSTTAC_AGE_APPROPRIATE_TRANSITION_ASSESSMENT_GUIDE",
      "OSSE_ASSESSMENT_FOR_TRANSITION_PART_ONE",
      "OSSE_ASSESSMENT_FOR_TRANSITION_PART_TWO",
    ].every((sourceId) =>
      TRANSITION_ASSESSMENT_REFERENCE_SOURCES.some(
        (source) => source.sourceId === sourceId && source.libraryPlacement === "REFERENCE_ONLY",
      ),
    ),
    "NSTTAC and training presentations do not become direct input tools",
  );
  step(
    userJourneyChecks,
    "required transition principles are represented",
    [
      "AGE_APPROPRIATE_TRANSITION_ASSESSMENT",
      "MULTIPLE_SOURCES_AND_METHODS",
      "TRIANGULATION_EXPRESSED_TESTED_DEMONSTRATED",
      "ASSESSMENT_TO_GOAL_TRANSLATION",
      "FAMILY_EARLY_INVOLVEMENT",
      "FAMILY_VISION_VISUAL_CHOICE_WITH_SUPPORTS",
      "SELF_AWARENESS_AND_IEP_PARTICIPATION",
      "AUTONOMY_DAILY_LIVING_COVERAGE",
      "CAREER_AND_HOUSING_FUTURE_SKILLS",
    ].every((principleId) =>
      TRANSITION_ASSESSMENT_PRINCIPLES.some((principle) => principle.principleId === principleId),
    ),
    `${TRANSITION_ASSESSMENT_PRINCIPLES.length} principles`,
  );
  step(
    userJourneyChecks,
    "Stage 4 remains deferred for every principle",
    TRANSITION_ASSESSMENT_PRINCIPLES.every(
      (principle) =>
        principle.stage4Effect === "DEFERRED_NO_CALIBRATION" &&
        ["KNOWLEDGE_SUPPORT_ONLY", "CATALOG_COVERAGE_ONLY"].includes(principle.stage3Effect),
    ),
    "principles cannot create calibration results",
  );
  step(
    traceabilityChecks,
    "all principle source references resolve",
    TRANSITION_ASSESSMENT_PRINCIPLES.every(
      (principle) => principle.sourceIds.length > 0 && principle.sourceIds.every((sourceId) => sourceIds.has(sourceId)),
    ),
    "sourceIds resolve to transition reference sources",
  );
  step(
    traceabilityChecks,
    "all principle concepts use official Himam concepts",
    TRANSITION_ASSESSMENT_PRINCIPLES.every(
      (principle) =>
        principle.conceptIds.length > 0 &&
        principle.conceptIds.every((conceptId) => manifest.conceptIds.includes(conceptId)),
    ),
    "no 11th concept introduced",
  );
  step(
    traceabilityChecks,
    "transition reference source file exists",
    existsSync(resolve(root, "src/domain/himam/transition-assessment-references.ts")),
    "src/domain/himam/transition-assessment-references.ts",
  );
} finally {
  rmSync(runtimeDir, { recursive: true, force: true });
}

if (failures.length > 0) {
  console.error("Transition assessment reference verification failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("Transition assessment reference data-integrity verification PASS");
console.log("Transition assessment reference userJourney verification PASS");
console.log("Transition assessment reference traceability verification PASS");
console.log(`User journey checks: ${userJourneyChecks.length}`);
console.log(`Traceability checks: ${traceabilityChecks.length}`);
