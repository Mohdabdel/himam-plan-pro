import { createRequire } from "node:module";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const compiledDir = resolve(root, ".tmp/sprint6-runtime");
const failures = [];
const checks = [];

function assert(condition, message) {
  if (!condition) failures.push(message);
}

function step(message) {
  checks.push(message);
}

function read(path) {
  return readFileSync(resolve(root, path), "utf8");
}

function compileRuntime() {
  mkdirSync(compiledDir, { recursive: true });
  const tsc = resolve(root, "node_modules/.bin/tsc.cmd");
  const tscBin = existsSync(tsc) ? tsc : resolve(root, "node_modules/.bin/tsc");
  const files = [
    "src/domain/himam/concepts.ts",
    "src/domain/himam/source-types.ts",
    "src/domain/himam/types.ts",
    "src/domain/himam/schemas.ts",
    "src/domain/himam/validators.ts",
    "src/domain/himam/sprint6-e2e-fixtures.ts",
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
    failures.push(`Sprint 6 runtime compilation failed: ${result.stderr || result.stdout}`);
  }
  writeFileSync(resolve(compiledDir, "package.json"), '{"type":"commonjs"}\n');
}

function validSourceRef(sourceRef, sourceTypes) {
  return Boolean(
    sourceRef &&
      sourceTypes.SOURCE_TYPES.includes(sourceRef.sourceType) &&
      sourceTypes.SOURCE_PACKAGES.includes(sourceRef.sourcePackage) &&
      sourceTypes.SOURCE_RECORD_TYPES.includes(sourceRef.sourceRecordType) &&
      sourceRef.sourceId,
  );
}

compileRuntime();

if (failures.length === 0) {
  const require = createRequire(import.meta.url);
  const sourceTypes = require(resolve(compiledDir, "source-types.js"));
  const { validateEndToEndTrace } = require(resolve(compiledDir, "validators.js"));
  const {
    sprint6EndToEndTraceFixture,
    sprint6RequiredStepCodes,
  } = require(resolve(compiledDir, "sprint6-e2e-fixtures.js"));

  const validation = validateEndToEndTrace(sprint6EndToEndTraceFixture);
  assert(validation.ok, `EndToEndTrace fixture should validate: ${JSON.stringify(validation.issues)}`);
  step("Validated EndToEndTrace domain contract");

  const stepCodes = sprint6EndToEndTraceFixture.steps.map((item) => item.stepCode);
  assert(stepCodes.length === 11, "Sprint 6 trace must contain exactly 11 MVP journey steps");
  assert(
    sprint6RequiredStepCodes.every((code, index) => stepCodes[index] === code),
    "Sprint 6 trace steps must preserve the canonical MVP journey order",
  );
  step("Verified canonical MVP journey order");

  assert(
    sprint6EndToEndTraceFixture.steps.every((item) => item.status === "PASS"),
    "All Sprint 6 E2E trace steps must pass",
  );
  assert(sprint6EndToEndTraceFixture.overallStatus === "PASS", "Sprint 6 E2E trace overall status must pass");
  step("Verified all E2E steps passed");

  assert(
    sprint6EndToEndTraceFixture.steps.every((item) => validSourceRef(item.sourceRef, sourceTypes)),
    "Each Sprint 6 E2E step must carry a valid SourceRef",
  );
  assert(validSourceRef(sprint6EndToEndTraceFixture.sourceRef, sourceTypes), "EndToEndTrace sourceRef must resolve");
  step("Verified SourceRef traceability for every E2E step");

  const sprint5Run = read("verification/sprint5-verification-run.json");
  assert(sprint5Run.includes('"protectedMetadata": "PASS"'), "Sprint 6 depends on protected metadata closure from Sprint 5");
  assert(sprint5Run.includes('"failureClassificationCount": 4'), "Sprint 6 depends on literal Sprint 5 failure taxonomy");
  step("Verified Sprint 5 file metadata and failure taxonomy prerequisites");

  const packageJson = read("package.json");
  assert(packageJson.includes('"verify:sprint6"'), "package.json must expose verify:sprint6");
  const verification = read("verification/sprint6-verification-run.json");
  assert(verification.includes('"overallStatus": "PASS"'), "Sprint 6 verification run must be PASS");
  assert(verification.includes('"remainingStageGaps": []'), "Sprint 6 must not leave remaining stage gaps");
  step("Verified Sprint 6 package metadata");
}

if (failures.length > 0) {
  console.error("Sprint 6 verification failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("Sprint 6 E2E trace verification PASS");
console.log("Sprint 6 journey order verification PASS");
console.log("Sprint 6 traceability verification PASS");
console.log(`Sprint 6 checks: ${checks.length}`);
