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
  "src/domain/himam/current-matrix-gatea-crosswalk.ts",
  "src/domain/himam/performance-dimension-implementation-analysis.ts",
  "src/domain/himam/end-to-end-operational-map.ts",
  "src/domain/himam/post-cvi-contracts.ts",
  "src/domain/himam/post-cvi-migration-plan.ts",
  "src/domain/himam/review-integration-contract.ts",
  "src/domain/himam/review-integration-service.ts",
  "src/domain/himam/review-integration-transport.ts",
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
  const matrixCrosswalk = require(resolve(compiledDir, "current-matrix-gatea-crosswalk.js"));
  const performanceAnalysis = require(resolve(compiledDir, "performance-dimension-implementation-analysis.js"));
  const operationalMap = require(resolve(compiledDir, "end-to-end-operational-map.js"));
  const postCviContracts = require(resolve(compiledDir, "post-cvi-contracts.js"));
  const migrationPlan = require(resolve(compiledDir, "post-cvi-migration-plan.js"));
  const reviewContract = require(resolve(compiledDir, "review-integration-contract.js"));
  const reviewService = require(resolve(compiledDir, "review-integration-service.js"));
  const reviewTransport = require(resolve(compiledDir, "review-integration-transport.js"));

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

  const matrixSummary = matrixCrosswalk.summarizeExistingMatrixGateACrosswalk();
  assert(
    matrixCrosswalk.EXISTING_FAMILY_TO_GATE_A_PRE_CVI.length === 22,
    "Current matrix crosswalk must cover all 22 Gate A candidate competencies",
  );
  assert(
    performanceAnalysis.PERFORMANCE_DIMENSION_IMPLEMENTATION_ANALYSIS.length === 4,
    "Performance-dimension implementation analysis must cover PD01-PD04",
  );
  assert(
    operationalMap.HIMAM_END_TO_END_OPERATIONAL_MAP.length === 9,
    "End-to-end operational map must cover the nine agreed architecture stages",
  );
  assert(
    postCviContracts.POST_CVI_CONTRACT_GOVERNANCE.productionUseAllowed === false &&
      postCviContracts.POST_CVI_CONTRACT_GOVERNANCE.uiUseAllowed === false &&
      postCviContracts.POST_CVI_CONTRACT_GOVERNANCE.storageMigrationAllowed === false &&
      postCviContracts.POST_CVI_CONTRACT_GOVERNANCE.automaticGoalCreationAllowed === false &&
      postCviContracts.POST_CVI_CONTRACT_GOVERNANCE.automaticProfileMutationAllowed === false,
    "Post-CVI contracts must remain inactive before explicit Gate Pass",
  );
  assert(
    migrationPlan.POST_CVI_MIGRATION_STEPS.length === 7,
    "Post-CVI migration plan must contain the seven ordered migration steps",
  );
  assert(
    reviewContract.HIMAM_REVIEW_INTEGRATION_PROTOCOL === "himam-review-integration-v1",
    "Review integration protocol must remain versioned",
  );
  assert(
    reviewContract.HIMAM_REVIEW_INTEGRATION_GOVERNANCE.engineMayWriteLearnerProfileDirectly === false &&
      reviewContract.HIMAM_REVIEW_INTEGRATION_GOVERNANCE.learningCandidatesMayUpdateProfileDirectly === false &&
      reviewContract.HIMAM_REVIEW_INTEGRATION_GOVERNANCE.acceptedLearningRequiresHumanDecision === true,
    "Review integration must block direct engine write-back",
  );
  assert(
    reviewService.REVIEW_INTEGRATION_SERVICE_GOVERNANCE.mayWriteLearnerProfileDirectly === false &&
      reviewService.REVIEW_INTEGRATION_SERVICE_GOVERNANCE.mayCreateGoalAutomatically === false &&
      reviewService.REVIEW_INTEGRATION_SERVICE_GOVERNANCE.mayChangeCompetencyLevelAutomatically === false,
    "Himam integration service must remain human-governed",
  );
  assert(
    reviewTransport.HIMAM_REVIEW_TRANSPORT_FEATURE.enabled === false &&
      reviewTransport.HIMAM_REVIEW_TRANSPORT_FEATURE.syntheticOnly === true &&
      reviewTransport.HIMAM_REVIEW_TRANSPORT_GOVERNANCE.realDataAllowed === false &&
      reviewTransport.HIMAM_REVIEW_TRANSPORT_GOVERNANCE.endpointBindingAllowedNow === false,
    "Review transport must remain synthetic-only and endpoint-unbound",
  );

  const syntheticPackage = {
    protocolVersion: reviewContract.HIMAM_REVIEW_INTEGRATION_PROTOCOL,
    reviewEngine: "smart-iep-engine",
    reviewEngineVersion: "test",
    reviewCaseId: "RC-TEST",
    sourcePlanRef: "synthetic-plan",
    generatedAt: "2026-11-07T00:00:00.000Z",
    interactionModes: ["PLAN_QUALITY_GATE"],
    planFindings: [],
    profileComparisonFindings: [],
    learningCandidates: [{
      candidateId: "cand-1",
      candidateType: "PLANNING_IMPLICATION",
      summary: "synthetic",
      sourceReviewCaseId: "RC-TEST",
      sourcePlanRefs: [],
      supportingEvidenceRefs: [],
      proposedPayload: { test: true },
      status: "candidate",
      requiresHumanApproval: true,
    }],
    provenanceRefs: ["synthetic"],
  };
  assert(
    reviewService.validateReviewIntegrationPackage(syntheticPackage).ok,
    "Synthetic review integration package should validate",
  );
  const rejectedLearning = reviewService.acceptReviewLearningCandidate({
    learnerRef: "learner-test",
    candidate: syntheticPackage.learningCandidates[0],
    reviewCaseId: "RC-TEST",
    decision: {
      candidateId: "cand-1",
      decision: "rejected",
      decidedBy: "human-reviewer",
      decidedAt: "2026-11-07T00:00:00.000Z",
    },
  });
  assert(
    rejectedLearning === null,
    "Rejected review learning candidate must not create accepted learning",
  );

  const syntheticSnapshot = reviewService.buildReviewProfileSnapshot({
    learnerRef: "learner-test",
    profileVersion: "profile-v1",
    generatedAt: "2026-11-07T00:00:00.000Z",
    acceptedEvidenceSummaries: [{
      evidenceRef: "ev-1",
      summary: "synthetic accepted performance evidence",
      context: "school",
      supportSummary: "minimal verbal support",
    }],
    acceptedPlanningPriorities: [{
      priorityRef: "prio-1",
      summary: "generalize performance to community",
      sourceRefs: ["ev-1"],
    }],
    goalHistory: [{
      goalRef: "goal-prev-1",
      goalText: "synthetic previous goal",
      status: "completed",
      evidenceRefs: ["ev-1"],
    }],
    acceptedSupportSummaries: [{
      supportRef: "sup-1",
      summary: "minimal verbal support is effective",
      context: "school",
    }],
  });
  assert(
    syntheticSnapshot.readonly === true &&
      syntheticSnapshot.purpose === "PLAN_REVIEW",
    "Profile snapshot must be purpose-limited and read-only",
  );

  const syntheticE2EPackage = {
    ...syntheticPackage,
    reviewCaseId: "RC-E2E",
    learnerRef: syntheticSnapshot.learnerRef,
    sourcePlanRef: "synthetic-e2e-plan",
    profileSnapshotVersionUsed: syntheticSnapshot.profileVersion,
    interactionModes: ["PLAN_QUALITY_GATE", "PROFILE_PLAN_CONSISTENCY", "LONGITUDINAL_LEARNING"],
    planFindings: [{
      findingId: "pf-1",
      category: "GOAL_QUALITY",
      severity: "IMPORTANT",
      summary: "synthetic plan-only quality issue",
      planRefs: ["goal-current-1"],
      destination: "PLAN_ONLY",
    }],
    profileComparisonFindings: [{
      findingId: "pc-1",
      comparisonType: "GOAL_REPEATS_COMPLETED_TARGET",
      summary: "synthetic profile-plan comparison",
      profileRefs: ["goal-prev-1"],
      planRefs: ["goal-current-1"],
      confidence: "HIGH",
      requiresHumanReview: true,
    }],
    learningCandidates: [{
      candidateId: "cand-e2e-1",
      candidateType: "PLANNING_IMPLICATION",
      summary: "consider generalization instead of retraining",
      sourceReviewCaseId: "RC-E2E",
      sourcePlanRefs: ["goal-current-1"],
      supportingEvidenceRefs: ["ev-1"],
      proposedPayload: { implication: "generalize_to_community" },
      status: "candidate",
      requiresHumanApproval: true,
    }],
    provenanceRefs: ["synthetic-e2e"],
  };
  assert(
    reviewService.validateReviewIntegrationPackage(syntheticE2EPackage).ok,
    "Synthetic E2E review package should validate",
  );
  const envelope = {
    protocolVersion: reviewTransport.HIMAM_REVIEW_TRANSPORT_FEATURE.protocolVersion,
    transportId: "transport-e2e-1",
    createdAt: "2026-11-07T00:11:00.000Z",
    synthetic: true,
    payload: syntheticE2EPackage,
  };
  const inbox = reviewTransport.receiveReviewPackageEnvelope(envelope);
  assert(
    inbox.status === "received" &&
      inbox.planFindingCount === 1 &&
      inbox.profileComparisonFindingCount === 1 &&
      inbox.learningCandidateCount === 1,
    "Synthetic E2E package should enter the Himam inbox without mutation",
  );
  const queue = reviewService.getHumanReviewQueue(syntheticE2EPackage);
  assert(
    queue.profileComparisons.length === 1 && queue.learningCandidates.length === 1,
    "Profile comparisons and learning candidates must enter human review queue",
  );
  const acceptedLearning = reviewService.acceptReviewLearningCandidate({
    learnerRef: syntheticSnapshot.learnerRef,
    candidate: queue.learningCandidates[0],
    reviewCaseId: syntheticE2EPackage.reviewCaseId,
    decision: {
      candidateId: "cand-e2e-1",
      decision: "accepted",
      decidedBy: "human-reviewer",
      decidedAt: "2026-11-07T00:13:00.000Z",
    },
  });
  assert(
    acceptedLearning?.learningType === "PLANNING_IMPLICATION" &&
      acceptedLearning?.status === "active" &&
      acceptedLearning?.sourceReviewCaseId === "RC-E2E",
    "Only a human-approved learning candidate may become AcceptedReviewLearning",
  );
  assert(
    migrationPlan.POST_CVI_MIGRATION_GATES.length === 5,
    "Post-CVI migration plan must contain the five explicit gates",
  );
  assert(
    migrationPlan.POST_CVI_MIGRATION_GOVERNANCE.executableNow === false &&
      migrationPlan.POST_CVI_MIGRATION_GOVERNANCE.destructiveMigrationAllowed === false &&
      migrationPlan.POST_CVI_MIGRATION_GOVERNANCE.historicalRewriteAllowed === false &&
      migrationPlan.POST_CVI_MIGRATION_GOVERNANCE.automaticLegacyReclassificationAllowed === false,
    "Migration plan must remain non-executable and non-destructive before Gate Pass",
  );
  assert(
    migrationPlan.POST_CVI_MIGRATION_STEPS.every(
      (step, index) => step.order === index + 1 && step.rollbackAr.length > 0,
    ),
    "Migration steps must be ordered and carry rollback instructions",
  );
  assert(
    operationalMap.HIMAM_OPERATIONAL_ARCHITECTURE_GOVERNANCE.uiChangesAuthorized === false &&
      operationalMap.HIMAM_OPERATIONAL_ARCHITECTURE_GOVERNANCE.productionLogicChangesAuthorized === false &&
      operationalMap.HIMAM_OPERATIONAL_ARCHITECTURE_GOVERNANCE.gateAProductionUseAuthorized === false,
    "Operational map must preserve the pre-CVI freeze on UI, production logic, and Gate A use",
  );
  assert(
    performanceAnalysis.PERFORMANCE_DIMENSION_IMPLEMENTATION_ANALYSIS.every(
      (item) => item.productionChangeNow === false,
    ),
    "Performance-dimension analysis must remain non-operative before CVI",
  );
  assert(
    performanceAnalysis.PERFORMANCE_DIMENSION_ARCHITECTURE_DECISION.changeImplementationUiNow === false &&
      performanceAnalysis.PERFORMANCE_DIMENSION_ARCHITECTURE_DECISION.changeReportUiNow === false &&
      performanceAnalysis.PERFORMANCE_DIMENSION_ARCHITECTURE_DECISION.changeMvpCalibrationNow === false,
    "Pre-CVI performance-dimension work must not change UI, reporting, or calibration",
  );
  assert(
    matrixCrosswalk.CURRENT_MATRIX_CROSSWALK_GOVERNANCE.productionUseAllowed === false &&
      matrixCrosswalk.CURRENT_MATRIX_CROSSWALK_GOVERNANCE.matrixRowsModified === false,
    "Current matrix crosswalk must remain non-governing and non-mutating",
  );
  assert(
    matrixSummary.gap >= 1,
    "Crosswalk should preserve identified gaps rather than force artificial matches",
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
console.log("Current competency matrix Gate A crosswalk PASS");
console.log("Performance dimension implementation analysis PASS");
console.log("End-to-end operational architecture map PASS");
console.log("Post-CVI inactive contracts governance PASS");
console.log("Post-CVI migration plan governance PASS");
console.log("Review engine integration governance PASS");
console.log("Synthetic-only transport governance PASS");
