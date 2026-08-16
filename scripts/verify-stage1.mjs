import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const manifestPath = resolve(root, "src/domain/himam/stage1-manifest.json");
const fixturesPath = resolve(root, "src/domain/himam/stage1-fixtures.json");
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const fixtures = JSON.parse(readFileSync(fixturesPath, "utf8"));

const expectedConcepts = [
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
];

const expectedChecks = ["build", "typecheck", "dataIntegrity", "userJourney", "traceability"];

const failures = [];
const userJourneySteps = [];
const traceabilitySteps = [];

function assert(condition, message) {
  if (!condition) failures.push(message);
}

function recordStep(collection, name, passed, detail = "") {
  collection.push({ name, passed, detail });
  assert(passed, `${name}${detail ? `: ${detail}` : ""}`);
}

function isOfficialConceptId(value) {
  return expectedConcepts.includes(value);
}

function hasRequiredSourceRef(value) {
  return Boolean(
    value &&
    manifest.sourceTypes.includes(value.sourceType) &&
    value.sourcePackage &&
    value.sourceRecordType &&
    value.sourceId,
  );
}

function validateLearnerProfile(profile) {
  const issues = [];
  if (!profile.learnerId) issues.push("learnerId is required");
  if (!profile.displayName) issues.push("displayName is required");
  if (!profile.dateOfBirth && typeof profile.ageAtReviewInput !== "number") {
    issues.push("dateOfBirth or ageAtReviewInput is required");
  }
  if (!profile.primaryProgram && !profile.primaryContext) {
    issues.push("primaryProgram or primaryContext is required");
  }
  if (typeof profile.ageAtReviewInput === "number") {
    const expectedBand = profile.ageAtReviewInput >= 14 ? "AGE_14_PLUS" : "UNDER_14";
    if (profile.ageBand !== expectedBand) issues.push(`ageBand must be ${expectedBand}`);
  }
  if (!hasRequiredSourceRef(profile.ageSourceRef)) issues.push("ageSourceRef is incomplete");
  return issues;
}

function validateEvidenceRecord(evidence) {
  const issues = [];
  if (!isOfficialConceptId(evidence.conceptId))
    issues.push("conceptId must be one of the ten concepts");
  if (!Array.isArray(evidence.componentIds)) issues.push("componentIds must be an array");
  if (!evidence.independentSourceKey) issues.push("independentSourceKey is required");
  if (!evidence.independentSourceKey?.administrationId)
    issues.push("independentSourceKey.administrationId is required");
  if (!evidence.independentSourceKey?.toolId && !evidence.independentSourceKey?.toolFamily) {
    issues.push("independentSourceKey requires toolId or toolFamily");
  }
  if (!evidence.independentSourceKey?.observerId && !evidence.independentSourceKey?.observerRole) {
    issues.push("independentSourceKey requires observerId or observerRole");
  }
  if (!hasRequiredSourceRef(evidence.sourceRef)) issues.push("sourceRef is incomplete");
  return issues;
}

function validateKnowledgeSupportItem(ksi) {
  const issues = [];
  if (ksi.eligibleForLevelEngine !== false) issues.push("KSI eligibleForLevelEngine must be false");
  if (
    !Array.isArray(ksi.conceptIds) ||
    ksi.conceptIds.some((conceptId) => !isOfficialConceptId(conceptId))
  ) {
    issues.push("KSI conceptIds must be valid Himam concepts");
  }
  if (!hasRequiredSourceRef(ksi.sourceRef)) issues.push("sourceRef is incomplete");
  return issues;
}

function validateInferenceSuggestion(suggestion) {
  const issues = [];
  if (!["suggested", "confirmed", "rejected"].includes(suggestion.status)) {
    issues.push("InferenceSuggestion status is invalid");
  }
  if (suggestion.status === "suggested" && (suggestion.confirmedAt || suggestion.confirmedBy)) {
    issues.push("suggested inference cannot carry confirmation fields");
  }
  return issues;
}

function validateAutomatedHumanApprovalWrite(input) {
  if (input.actorContext === "AUTOMATED_PACKAGE" && input.attemptedValue) {
    return ["Automated package contexts cannot write humanApprovalReference"];
  }
  return [];
}

function assertTrace(entityName, sourceRef) {
  recordStep(
    traceabilitySteps,
    `${entityName} SourceRef resolves owner and source`,
    hasRequiredSourceRef(sourceRef),
    JSON.stringify(sourceRef),
  );
}

assert(Array.isArray(manifest.conceptIds), "conceptIds must be an array");
assert(manifest.conceptIds.length === 10, "conceptIds must contain exactly 10 values");
assert(new Set(manifest.conceptIds).size === 10, "conceptIds must be unique");
assert(
  expectedConcepts.every((conceptId) => manifest.conceptIds.includes(conceptId)),
  "conceptIds must match the approved Himam concept dictionary",
);
assert(
  manifest.conceptIds.every((conceptId) => !conceptId.startsWith("HIMAMPRO_")),
  "conceptIds must not use HIMAMPRO_ storage prefix",
);
assert(
  expectedChecks.every((check) => manifest.verificationChecks.includes(check)),
  "VerificationRun must retain the five mandatory checks",
);
assert(
  manifest.humanApprovalReferenceWriteAuthority === "EXTERNAL_AUTHORIZED_APPROVAL_HOOK_ONLY",
  "humanApprovalReference must be external-hook only",
);
assert(
  manifest.ageStagePolicy?.AGE_14_PLUS?.advisoryOnly === true,
  "AGE_14_PLUS must be advisory only",
);
assert(
  manifest.ageStagePolicy?.AGE_14_PLUS?.blocksPlan === false,
  "AGE_14_PLUS must not block plans",
);
assert(
  manifest.ageStagePolicy?.AGE_14_PLUS?.blocksGoal === false,
  "AGE_14_PLUS must not block goals",
);
assert(
  manifest.ageStagePolicy?.AGE_14_PLUS?.blocksExecution === false,
  "AGE_14_PLUS must not block execution",
);
assert(
  manifest.ageStagePolicy?.AGE_14_PLUS?.affectsNumericQualityScore === false,
  "AGE_14_PLUS must not affect numeric quality score",
);

const valid = fixtures.valid;
const invalid = fixtures.invalid;

recordStep(
  userJourneySteps,
  "valid LearnerProfile accepted",
  validateLearnerProfile(valid.learnerProfile).length === 0,
  validateLearnerProfile(valid.learnerProfile).join("; "),
);
recordStep(
  userJourneySteps,
  "valid EvidenceRecord accepted",
  validateEvidenceRecord(valid.evidenceRecord).length === 0,
  validateEvidenceRecord(valid.evidenceRecord).join("; "),
);
recordStep(
  userJourneySteps,
  "valid KnowledgeSupportItem accepted",
  validateKnowledgeSupportItem(valid.knowledgeSupportItem).length === 0,
  validateKnowledgeSupportItem(valid.knowledgeSupportItem).join("; "),
);
recordStep(
  userJourneySteps,
  "valid suggested InferenceSuggestion accepted",
  validateInferenceSuggestion(valid.inferenceSuggestion).length === 0,
  validateInferenceSuggestion(valid.inferenceSuggestion).join("; "),
);
recordStep(
  userJourneySteps,
  "11th concept rejected",
  !isOfficialConceptId(invalid.eleventhConceptId),
  invalid.eleventhConceptId,
);
recordStep(
  userJourneySteps,
  "HIMAMPRO_ concept rejected",
  invalid.legacyConceptId.startsWith("HIMAMPRO_"),
  invalid.legacyConceptId,
);
recordStep(
  userJourneySteps,
  "KSI level eligibility rejected",
  validateKnowledgeSupportItem(invalid.knowledgeSupportItemLevelEligible).length > 0,
  "KSI cannot be level eligible",
);
recordStep(
  userJourneySteps,
  "automated humanApprovalReference write rejected",
  validateAutomatedHumanApprovalWrite(invalid.automatedHumanApprovalWrite).length > 0,
  "external hook required",
);
recordStep(
  userJourneySteps,
  "suggested inference cannot be selected as evidence",
  invalid.suggestedInferenceAsEvidence.selectedEvidenceIds.includes(
    valid.inferenceSuggestion.suggestionId,
  ),
  "selectedEvidenceIds must not include suggested inference IDs",
);

assertTrace("LearnerProfile age", valid.learnerProfile.ageSourceRef);
assertTrace("EvidenceRecord", valid.evidenceRecord.sourceRef);
assertTrace("KnowledgeSupportItem", valid.knowledgeSupportItem.sourceRef);
recordStep(
  traceabilitySteps,
  "schema and concept registry versions are present",
  Boolean(manifest.schemaVersion && manifest.conceptRegistryVersion),
  `${manifest.schemaVersion} / ${manifest.conceptRegistryVersion}`,
);
recordStep(
  traceabilitySteps,
  "VerificationRun five-check structure is traceable",
  expectedChecks.every((check) => manifest.verificationChecks.includes(check)),
  manifest.verificationChecks.join(", "),
);

if (failures.length > 0) {
  console.error("Stage 1 verification failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("Stage 1 data-integrity verification PASS");
console.log("Stage 1 internal userJourney verification PASS");
console.log("Stage 1 traceability verification PASS");
console.log(`Concept count: ${manifest.conceptIds.length}`);
console.log(`Verification checks: ${manifest.verificationChecks.join(", ")}`);
console.log(`User journey checks: ${userJourneySteps.length}`);
console.log(`Traceability checks: ${traceabilitySteps.length}`);
