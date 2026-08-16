import { createRequire } from "node:module";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const compiledDir = resolve(root, ".tmp/stage2-runtime");
const manifest = JSON.parse(
  readFileSync(resolve(root, "src/domain/himam/stage1-manifest.json"), "utf8"),
);
const fixtures = JSON.parse(
  readFileSync(resolve(root, "src/domain/himam/stage2-fixtures.json"), "utf8"),
);

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
    "src/domain/himam/concepts.ts",
    "src/domain/himam/source-types.ts",
    "src/domain/himam/types.ts",
    "src/domain/himam/schemas.ts",
    "src/domain/himam/validators.ts",
    "src/domain/himam/storage.ts",
    "src/domain/himam/stage2-repositories.ts",
  ];
  const command = [`"${tscBin}"`, ...args.map((arg) => `"${arg}"`)].join(" ");
  const result = spawnSync(command, {
    cwd: root,
    encoding: "utf8",
    shell: true,
  });

  if (result.status !== 0) {
    failures.push(`Stage 2 runtime compilation failed: ${result.stderr || result.stdout}`);
  }
  writeFileSync(resolve(compiledDir, "package.json"), '{"type":"commonjs"}\n');
}

function validSourceRef(sourceRef) {
  return Boolean(
    sourceRef &&
      manifest.sourceTypes.includes(sourceRef.sourceType) &&
      sourceRef.sourcePackage &&
      sourceRef.sourceRecordType &&
      sourceRef.sourceId,
  );
}

compileDomainRuntime();

if (failures.length === 0) {
  const require = createRequire(import.meta.url);
  const { createMemoryStore } = require(resolve(compiledDir, "storage.js"));
  const { createStage2Repositories, STAGE2_STORAGE_KEYS } = require(
    resolve(compiledDir, "stage2-repositories.js"),
  );

  const store = createMemoryStore();
  const repositories = createStage2Repositories(store);

  fixtures.learners.forEach((profile) => {
    const result = repositories.learners.save(profile);
    assert(result.ok, `LearnerProfile ${profile.learnerId} should save through repository`);
  });
  assert(repositories.learners.list().length === 2, "Learner repository should return two valid learners");
  step(userJourney, "Created UNDER_14 and AGE_14_PLUS LearnerProfile records through repository");

  const invalidLearnerResult = repositories.learners.save(fixtures.invalid.learnerAgeBand);
  assert(!invalidLearnerResult.ok, "Invalid learner age band should be rejected by repository");
  step(userJourney, "Rejected invalid learner age band through repository");

  fixtures.evidence.forEach((record) => {
    const result = repositories.evidence.save(record);
    assert(result.ok, `EvidenceRecord ${record.evidenceId} should save through repository`);
  });
  step(userJourney, "Saved accepted EvidenceRecord through repository");

  fixtures.knowledgeSupport.forEach((record) => {
    const result = repositories.knowledgeSupport.save(record);
    assert(result.ok, `KSI ${record.knowledgeItemId} should save through repository`);
  });
  step(userJourney, "Saved KnowledgeSupportItem through repository");

  const invalidKsiResult = repositories.knowledgeSupport.save(
    fixtures.invalid.knowledgeSupportLevelEligible,
  );
  assert(!invalidKsiResult.ok, "KSI with eligibleForLevelEngine=true should be rejected");
  step(userJourney, "Rejected KSI as level-eligible through repository");

  fixtures.inferenceSuggestions.forEach((record) => {
    const result = repositories.inferenceSuggestions.save(record);
    assert(result.ok, `InferenceSuggestion ${record.suggestionId} should save through repository`);
  });
  step(userJourney, "Saved suggested InferenceSuggestion through repository");

  const invalidLegacyConceptSuggestion = repositories.inferenceSuggestions.save({
    ...fixtures.inferenceSuggestions[0],
    suggestionId: "stage2-inference-invalid-legacy-concept",
    suggestedValue: "HIMAMPRO_COMM",
  });
  assert(
    !invalidLegacyConceptSuggestion.ok,
    "Suggested concept with HIMAMPRO_ prefix should be rejected",
  );

  const invalidUnknownConceptSuggestion = repositories.inferenceSuggestions.save({
    ...fixtures.inferenceSuggestions[0],
    suggestionId: "stage2-inference-invalid-unknown-concept",
    suggestedValue: "DAILY_LIVING",
  });
  assert(!invalidUnknownConceptSuggestion.ok, "Suggested unknown concept should be rejected");
  step(userJourney, "Rejected invalid concept inference suggestions through repository");

  const learnerId = fixtures.learners[1].learnerId;
  const learnerEvidence = repositories.evidence.listForLearner(learnerId);
  const learnerKsi = repositories.knowledgeSupport.listForLearner(learnerId);
  assert(learnerEvidence.length === 1, "Learner should have one EvidenceRecord");
  assert(learnerKsi.length === 1, "Learner should have one KSI");
  assert(learnerKsi.every((record) => record.eligibleForLevelEngine === false), "KSI must remain level-ineligible");
  step(userJourney, "Read EvidenceRecord and KSI separately for the same learner");

  const corruptEvidence = {
    ...fixtures.evidence[0],
    evidenceId: "stage2-evidence-corrupt-concept",
    conceptId: "DAILY_LIVING",
  };
  store.setItem(
    STAGE2_STORAGE_KEYS.evidence,
    JSON.stringify([...fixtures.evidence, corruptEvidence]),
  );
  assert(
    repositories.evidence.list().every((record) => manifest.conceptIds.includes(record.conceptId)),
    "Repository list should not return corrupted EvidenceRecord concept IDs",
  );
  step(userJourney, "Filtered corrupted stored EvidenceRecord during repository read");

  assert(validSourceRef(repositories.learners.findById(learnerId)?.ageSourceRef), "LearnerProfile ageSourceRef should resolve");
  step(traceability, "LearnerProfile ageSourceRef resolves");
  assert(validSourceRef(repositories.evidence.listForLearner(learnerId)[0]?.sourceRef), "EvidenceRecord SourceRef should resolve");
  step(traceability, "EvidenceRecord SourceRef resolves");
  assert(validSourceRef(repositories.knowledgeSupport.listForLearner(learnerId)[0]?.sourceRef), "KSI SourceRef should resolve");
  step(traceability, "KnowledgeSupportItem SourceRef resolves");
  assert(
    repositories.evidence.listForLearner(learnerId)[0]?.independentSourceKey?.administrationId,
    "Evidence independent source should resolve",
  );
  step(traceability, "EvidenceRecord IndependentSourceKey is present");
}

if (failures.length > 0) {
  console.error("Stage 2 verification failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("Stage 2 data-integrity verification PASS");
console.log("Stage 2 repository userJourney verification PASS");
console.log("Stage 2 traceability verification PASS");
console.log(`Learners: ${fixtures.learners.length}`);
console.log(`Evidence records: ${fixtures.evidence.length}`);
console.log(`KSI records: ${fixtures.knowledgeSupport.length}`);
console.log(`Inference suggestions: ${fixtures.inferenceSuggestions.length}`);
console.log(`User journey checks: ${userJourney.length}`);
console.log(`Traceability checks: ${traceability.length}`);
