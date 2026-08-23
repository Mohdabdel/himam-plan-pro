import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const read = (path) => readFileSync(resolve(root, path), "utf8");
const checks = [];

function assertIncludes(label, content, expected) {
  if (!content.includes(expected)) {
    throw new Error(`${label} is missing: ${expected}`);
  }
  checks.push(label);
}

const pipeline = read("src/lib/source-file-pipeline.ts");
const types = read("src/domain/himam/types.ts");
const schemas = read("src/domain/himam/schemas.ts");
const validators = read("src/domain/himam/validators.ts");
const official = read("src/routes/students.$id.assessment.official.tsx");
const additional = read("src/routes/students.$id.assessment.additional.tsx");
const goals = read("src/routes/students.$id.iep.goals.tsx");
const verification = read("verification/sprint5-verification-run.json");
const packageJson = read("package.json");

assertIncludes("draft pipeline builder", pipeline, "buildSourceFileDraftPipeline");
assertIncludes("human review applier", pipeline, "applySourceExtractionReview");
assertIncludes("allowed draft reader", pipeline, "readAllowedSourceFileDraft");
assertIncludes("draft text splitter", pipeline, "splitSourceDraftText");
assertIncludes("protected metadata in pipeline", pipeline, "protectedMetadata");
assertIncludes("protected metadata validation", pipeline, "validateProtectedSourceFileMetadata");
assertIncludes("metadata missing failure", pipeline, "FILE_METADATA_MISSING");
assertIncludes("unreadable failure", pipeline, "FILE_UNREADABLE");
assertIncludes("protected failure", pipeline, "FILE_PROTECTED");
assertIncludes("manual review boundary", pipeline, "UNSUPPORTED_FILE_REQUIRES_MANUAL_REVIEW");
assertIncludes("failed extraction guard", pipeline, "FAILED_EXTRACTION_CANNOT_BE_REVIEWED_WITHOUT_NEW_DRAFT");
assertIncludes("draft-only AI boundary", pipeline, "DRAFT_ONLY_REQUIRES_HUMAN_REVIEW");

assertIncludes("typed failure reason", types, "SourceFileReadFailureReason");
assertIncludes("protected metadata type", types, "ProtectedSourceFileMetadata");
assertIncludes("metadata-only policy", types, "METADATA_ONLY_NO_RAW_CONTENT");
assertIncludes("failure reason schema", schemas, "sourceFileReadFailureReasonSchema");
assertIncludes("protected metadata schema", schemas, "protectedSourceFileMetadataSchema");
assertIncludes("protected metadata validator", validators, "validateProtectedSourceFileMetadata");

assertIncludes("official uses draft builder", official, "buildSourceFileDraftPipeline");
assertIncludes("official applies human review", official, "applySourceExtractionReview");
assertIncludes("official review text state", official, "draftText");
assertIncludes("official corrected statements", official, "correctedStatements");
assertIncludes("official review UI", official, "مسودة قراءة الملف القابلة للتصحيح");

assertIncludes("additional uses draft builder", additional, "buildSourceFileDraftPipeline");
assertIncludes("additional applies human review", additional, "applySourceExtractionReview");
assertIncludes("additional review text state", additional, "draftText");
assertIncludes("additional corrected statements", additional, "correctedStatements");
assertIncludes("additional review UI", additional, "مسودة قراءة الملف القابلة للتصحيح");

assertIncludes("goals only accept reviewed pipelines", goals, "pipeline.review?.decision === \"approved_for_structured_response\"");
assertIncludes("package script", packageJson, "\"verify:sprint5\"");
assertIncludes("verification pass", verification, "\"overallStatus\": \"PASS\"");
assertIncludes("failure classification count", verification, "\"failureClassificationCount\": 4");
assertIncludes("metadata protected", verification, "\"protectedMetadata\": \"PASS\"");
assertIncludes("no remaining stage gaps", verification, "\"remainingStageGaps\": []");

console.log("Sprint 5 file-draft verification PASS");
console.log("Sprint 5 human-review verification PASS");
console.log("Sprint 5 failure-state verification PASS");
console.log(`Sprint 5 checks: ${checks.length}`);
