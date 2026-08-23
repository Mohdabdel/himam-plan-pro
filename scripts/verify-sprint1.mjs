import { createRequire } from "node:module";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const compiledDir = resolve(root, ".tmp/sprint1-runtime");
const failures = [];
const userJourney = [];
const traceability = [];

function assert(condition, message) {
  if (!condition) failures.push(message);
}

function step(collection, message) {
  collection.push(message);
}

function compileDomainRuntime() {
  mkdirSync(compiledDir, { recursive: true });
  const tsc = resolve(root, "node_modules/.bin/tsc.cmd");
  const tscBin = existsSync(tsc) ? tsc : resolve(root, "node_modules/.bin/tsc");
  const files = [
    "src/domain/himam/concepts.ts",
    "src/domain/himam/source-types.ts",
    "src/domain/himam/types.ts",
    "src/domain/himam/schemas.ts",
    "src/domain/himam/validators.ts",
    "src/domain/himam/sprint1-fixtures.ts",
  ];
  const args = [
    "--target",
    "ES2022",
    "--module",
    "CommonJS",
    "--moduleResolution",
    "Node",
    "--skipLibCheck",
    "--strict",
    "--noEmit",
    "false",
    "--outDir",
    compiledDir,
    ...files,
  ];
  const command = [`"${tscBin}"`, ...args.map((arg) => `"${arg}"`)].join(" ");
  const result = spawnSync(command, {
    cwd: root,
    encoding: "utf8",
    shell: true,
  });

  if (result.status !== 0) {
    failures.push(`Sprint 1 runtime compilation failed: ${result.stderr || result.stdout}`);
  }
  writeFileSync(resolve(compiledDir, "package.json"), '{"type":"commonjs"}\n');
}

function validSourceRef(sourceRef) {
  return Boolean(
    sourceRef &&
      sourceRef.sourceType &&
      sourceRef.sourcePackage &&
      sourceRef.sourceRecordType &&
      sourceRef.sourceId,
  );
}

compileDomainRuntime();

if (failures.length === 0) {
  const require = createRequire(import.meta.url);
  const fixtures = require(resolve(compiledDir, "sprint1-fixtures.js"));
  const validators = require(resolve(compiledDir, "validators.js"));

  const positiveChecks = [
    ["UploadedSourceFile", fixtures.uploadedAssessmentFileFixture, validators.validateUploadedSourceFile],
    ["ExtractedSourceDraft", fixtures.extractedAssessmentDraftFixture, validators.validateExtractedSourceDraft],
    ["SourceExtractionReview", fixtures.sourceExtractionReviewFixture, validators.validateSourceExtractionReview],
    ["EvidenceRecord from reviewed response", fixtures.reviewedEvidenceFixture, validators.validateEvidenceRecord],
    ["GoalDraft", fixtures.goalDraftFixture, validators.validateGoalDraft],
    ["GoalApprovalRecord", fixtures.goalApprovalRecordFixture, validators.validateGoalApprovalRecord],
    ["PlanDraft", fixtures.planDraftFixture, validators.validatePlanDraft],
    ["PlanQualityReview", fixtures.planQualityReviewFixture, validators.validatePlanQualityReview],
    ["PlanApprovalRecord", fixtures.planApprovalRecordFixture, validators.validatePlanApprovalRecord],
  ];

  for (const [label, value, validate] of positiveChecks) {
    const result = validate(value);
    assert(result.ok, `${label} should validate: ${JSON.stringify(result.issues)}`);
  }
  step(userJourney, "Validated Sprint 1 positive data contracts");

  const invalid = fixtures.invalidSprint1Fixtures;
  const negativeChecks = [
    ["File without consent cannot enter extraction", invalid.noConsentExtractionFile, validators.validateUploadedSourceFile],
    ["Extraction cannot become automated decision", invalid.extractionAsDecision, validators.validateExtractedSourceDraft],
    ["Approved extraction review requires StructuredResponse", invalid.approvedReviewWithoutStructuredResponse, validators.validateSourceExtractionReview],
    ["EvidenceRecord cannot trace directly to raw uploaded file", invalid.rawFileEvidence, validators.validateEvidenceRecord],
    ["GoalDraft requires baseline EvidenceRecord", invalid.goalWithoutBaseline, validators.validateGoalDraft],
    ["Approved PlanApprovalRecord requires approved goals", invalid.planApprovalWithoutGoals, validators.validatePlanApprovalRecord],
  ];

  for (const [label, value, validate] of negativeChecks) {
    const result = validate(value);
    assert(!result.ok, `${label} should be rejected`);
  }
  step(userJourney, "Rejected Sprint 1 negative boundary violations");

  assert(
    fixtures.sourceExtractionReviewFixture.createdStructuredResponseIds.includes(fixtures.reviewedEvidenceFixture.sourceResponseId),
    "Reviewed extraction should be the provenance parent of reviewed evidence StructuredResponse",
  );
  step(traceability, "SourceExtractionReview links extracted draft to StructuredResponse");

  assert(validSourceRef(fixtures.uploadedAssessmentFileFixture.sourceRef), "UploadedSourceFile SourceRef should resolve");
  step(traceability, "UploadedSourceFile SourceRef resolves");
  assert(validSourceRef(fixtures.extractedAssessmentDraftFixture.sourceRef), "ExtractedSourceDraft SourceRef should resolve");
  step(traceability, "ExtractedSourceDraft SourceRef resolves");
  assert(validSourceRef(fixtures.sourceExtractionReviewFixture.sourceRef), "SourceExtractionReview SourceRef should resolve");
  step(traceability, "SourceExtractionReview SourceRef resolves");
  assert(validSourceRef(fixtures.goalApprovalRecordFixture.sourceRef), "GoalApprovalRecord SourceRef should resolve");
  step(traceability, "GoalApprovalRecord SourceRef resolves");
  assert(validSourceRef(fixtures.planApprovalRecordFixture.sourceRef), "PlanApprovalRecord SourceRef should resolve");
  step(traceability, "PlanApprovalRecord SourceRef resolves");

  assert(
    fixtures.goalDraftFixture.baselineEvidenceIds.includes(fixtures.reviewedEvidenceFixture.evidenceId),
    "GoalDraft should use EvidenceRecord baseline, not KSI",
  );
  step(traceability, "GoalDraft baseline traces to EvidenceRecord");

  assert(
    fixtures.planDraftFixture.goalApprovalIds.includes(fixtures.goalApprovalRecordFixture.approvalId),
    "PlanDraft should include approved goal records",
  );
  assert(
    fixtures.planApprovalRecordFixture.approvedGoalApprovalIds.includes(fixtures.goalApprovalRecordFixture.approvalId),
    "PlanApprovalRecord should approve explicit goal approval records",
  );
  step(traceability, "Plan approval traces to goal approval records");
}

if (failures.length > 0) {
  console.error("Sprint 1 verification failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("Sprint 1 data-integrity verification PASS");
console.log("Sprint 1 internal userJourney verification PASS");
console.log("Sprint 1 traceability verification PASS");
console.log(`User journey checks: ${userJourney.length}`);
console.log(`Traceability checks: ${traceability.length}`);

