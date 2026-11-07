import { createRequire } from "node:module";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const compiledDir = resolve(root, ".tmp/transition-architecture");
const failures = [];

function assert(condition, message) {
  if (!condition) failures.push(message);
}

mkdirSync(compiledDir, { recursive: true });
const tscCmd = resolve(root, "node_modules/.bin/tsc.cmd");
const tscBin = existsSync(tscCmd) ? tscCmd : resolve(root, "node_modules/.bin/tsc");

const files = [
  "src/domain/himam/concepts.ts",
  "src/domain/himam/source-types.ts",
  "src/domain/himam/transition-architecture.ts",
  "src/domain/himam/pre-cvi-crosswalk.ts",
  "src/domain/himam/types.ts",
  "src/domain/himam/schemas.ts",
  "src/domain/himam/validators.ts",
];

const args = [
  "--target", "ES2022",
  "--module", "CommonJS",
  "--moduleResolution", "Node",
  "--skipLibCheck",
  "--strict",
  "--noEmit", "false",
  "--outDir", compiledDir,
  ...files,
];

const command = [`"${tscBin}"`, ...args.map((arg) => `"${arg}"`)].join(" ");
const result = spawnSync(command, {
  cwd: root,
  encoding: "utf8",
  shell: true,
});

if (result.status !== 0) {
  failures.push(`Transition architecture compilation failed: ${result.stderr || result.stdout}`);
}

writeFileSync(resolve(compiledDir, "package.json"), '{"type":"commonjs"}\n');

if (failures.length === 0) {
  const require = createRequire(import.meta.url);
  const architecture = require(resolve(compiledDir, "transition-architecture.js"));
  const crosswalk = require(resolve(compiledDir, "pre-cvi-crosswalk.js"));
  const validators = require(resolve(compiledDir, "validators.js"));

  assert(
    architecture.GATE_A_PRE_CVI_SCHEME.validationStatus === "pre_cvi",
    "Gate A scheme must remain pre_cvi",
  );
  assert(
    architecture.GATE_A_PRE_CVI_SCHEME.frozenForProduction === true,
    "Gate A pre-CVI scheme must stay frozen for production",
  );
  assert(
    architecture.isSchemeProductionEligible(architecture.GATE_A_PRE_CVI_SCHEME) === false,
    "Gate A pre-CVI scheme must not be production eligible",
  );
  assert(
    crosswalk.GATE_A_PRE_CVI_COMPETENCIES.length === 22,
    "Gate A pre-CVI registry must contain exactly 22 candidate competencies",
  );
  assert(
    crosswalk.GATE_A_PRE_CVI_PERFORMANCE_DIMENSIONS.length === 4,
    "Gate A pre-CVI registry must contain exactly four performance/access dimensions",
  );
  assert(
    crosswalk.GATE_A_PRE_CVI_COMPETENCIES.every(
      (item) => item.ref.validationStatus === "pre_cvi" && item.ref.entityType === "COMPETENCY",
    ),
    "All Gate A candidate competencies must remain pre_cvi competency refs",
  );
  assert(
    crosswalk.GATE_A_PRE_CVI_PERFORMANCE_DIMENSIONS.every(
      (item) => item.ref.validationStatus === "pre_cvi" && item.ref.entityType === "PERFORMANCE_DIMENSION",
    ),
    "All Gate A performance dimensions must remain pre_cvi dimension refs",
  );
  assert(
    crosswalk.LEGACY_CONCEPT_TO_GATE_A_PRE_CVI.every(
      (mapping) => mapping.mappingStatus === "provisional" && mapping.mappingType === "related",
    ),
    "All legacy-to-Gate-A mappings must remain provisional related mappings",
  );
  assert(
    crosswalk.PRE_CVI_CROSSWALK_GOVERNANCE.productionUseAllowed === false &&
      crosswalk.PRE_CVI_CROSSWALK_GOVERNANCE.maySetLearnerLevel === false &&
      crosswalk.PRE_CVI_CROSSWALK_GOVERNANCE.mayGenerateRequiredGoal === false &&
      crosswalk.PRE_CVI_CROSSWALK_GOVERNANCE.mayAssignCurriculumAutomatically === false,
    "Pre-CVI governance must block production decisions",
  );

  assert(
    validators.validateTransitionSchemeDefinition(architecture.GATE_A_PRE_CVI_SCHEME).ok,
    "Gate A pre-CVI scheme should pass governance validation while frozen",
  );

  const invalidScheme = {
    ...architecture.GATE_A_PRE_CVI_SCHEME,
    frozenForProduction: false,
  };
  assert(
    !validators.validateTransitionSchemeDefinition(invalidScheme).ok,
    "A pre-CVI scheme must fail validation if unfrozen for production",
  );

  const firstMapping = crosswalk.LEGACY_CONCEPT_TO_GATE_A_PRE_CVI[0];
  const invalidValidatedMapping = {
    ...firstMapping,
    mappingStatus: "validated",
  };
  assert(
    !validators.validateTransitionMapping(invalidValidatedMapping).ok,
    "A mapping involving pre-CVI entities must not validate as final",
  );
}

if (failures.length > 0) {
  console.error("Transition architecture verification failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("Transition architecture compilation PASS");
console.log("Pre-CVI governance PASS");
console.log("22 candidate competencies PASS");
console.log("4 performance/access dimensions PASS");
console.log("Legacy concept crosswalk remains provisional PASS");
