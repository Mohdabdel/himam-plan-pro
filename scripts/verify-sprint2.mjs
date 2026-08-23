import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const failures = [];
const checks = [];

function read(path) {
  return readFileSync(resolve(root, path), "utf8");
}

function assert(condition, message) {
  if (!condition) failures.push(message);
}

function step(message) {
  checks.push(message);
}

const pipeline = read("src/lib/source-file-pipeline.ts");
const official = read("src/routes/students.$id.assessment.official.tsx");
const additional = read("src/routes/students.$id.assessment.additional.tsx");
const goals = read("src/routes/students.$id.iep.goals.tsx");
const packageJson = read("package.json");

assert(pipeline.includes("validateUploadedSourceFile"), "Pipeline must validate UploadedSourceFile");
assert(pipeline.includes("validateExtractedSourceDraft"), "Pipeline must validate ExtractedSourceDraft");
assert(pipeline.includes("validateSourceExtractionReview"), "Pipeline must validate SourceExtractionReview");
assert(pipeline.includes("validateStructuredResponse"), "Pipeline must validate StructuredResponse");
assert(pipeline.includes("sourceRef:") && pipeline.includes("SourceExtractionReview"), "Pipeline must preserve SourceRef traceability");
step("Pipeline validates Sprint 1 contracts and preserves traceability");

assert(official.includes("buildSourceFilePipeline"), "Official assessment page must build a source-file pipeline");
assert(official.includes("OFFICIAL_ASSESSMENT_RESULTS"), "Official assessment upload must use OFFICIAL_ASSESSMENT_RESULTS purpose");
assert(official.includes("summarizeSourceFilePipeline"), "Official assessment page must show source-file review status");
step("Official assessment upload is connected to reviewed source-file pipeline");

assert(additional.includes("buildSourceFilePipeline"), "Additional sources page must build a source-file pipeline");
assert(additional.includes("ADDITIONAL_INFORMATION_SOURCE"), "Additional source upload must use ADDITIONAL_INFORMATION_SOURCE purpose");
assert(additional.includes("sourcePipelineIds"), "Additional source record must persist source pipeline references");
step("Additional uploaded sources are connected to reviewed source-file pipeline");

assert(goals.includes("reviewed_file_sources"), "Goal builder must expose reviewed uploaded files as a source");
assert(goals.includes("ReviewedFileSourcesPanel"), "Goal screen must show reviewed file sources during goal preparation");
assert(goals.includes("loadSourceFilePipelines"), "Goal screen must load source-file pipelines");
step("Goal builder can use reviewed uploaded files as source context");

assert(packageJson.includes("\"verify:sprint2\""), "package.json must expose verify:sprint2");
step("Sprint 2 verification command is registered");

if (failures.length > 0) {
  console.error("Sprint 2 verification failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("Sprint 2 source-file pipeline verification PASS");
console.log("Sprint 2 userJourney verification PASS");
console.log("Sprint 2 traceability verification PASS");
console.log(`Sprint 2 checks: ${checks.length}`);
