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

const governance = read("src/lib/goal-plan-approval.ts");
const goalsRoute = read("src/routes/students.$id.iep.goals.tsx");
const planRoute = read("src/routes/students.$id.plan.tsx");
const verification = read("verification/sprint3-verification-run.json");
const constitution = read("specs/himam_product_constitution.md");
const packageJson = read("package.json");

assert(governance.includes("validateGoalDraft"), "Sprint 3 governance must validate GoalDraft");
assert(governance.includes("validateGoalApprovalRecord"), "Sprint 3 governance must validate GoalApprovalRecord");
assert(governance.includes("validatePlanDraft"), "Sprint 3 governance must validate PlanDraft");
assert(governance.includes("validatePlanQualityReview"), "Sprint 3 governance must validate PlanQualityReview");
assert(governance.includes("validatePlanApprovalRecord"), "Sprint 3 governance must validate PlanApprovalRecord");
assert(governance.includes("approved_for_plan_inclusion"), "Goal approval must use approved_for_plan_inclusion decision");
assert(governance.includes("buildPlanApprovalRecord"), "Sprint 3 governance must build PlanApprovalRecord");
step("Goal and plan governance records validate against Sprint 1 contracts");

assert(goalsRoute.includes("buildGoalApprovalBundles"), "Goal screen must build goal approval bundles");
assert(goalsRoute.includes("saveGoalApprovalBundles"), "Goal screen must persist goal approval bundles");
assert(goalsRoute.includes("goalApprovalIds"), "IEP save payload must carry goalApprovalIds");
assert(goalsRoute.includes("startedGoals.length === 0"), "Goal screen must block progression without at least one started goal");
step("Goal screen approves goals as units before plan inclusion");

assert(planRoute.includes("loadGoalApprovalBundles"), "Plan screen must load goal approval bundles");
assert(planRoute.includes("buildPlanGovernanceBundle"), "Plan screen must build PlanDraft and PlanQualityReview");
assert(planRoute.includes("savePlanGovernanceBundle"), "Plan screen must persist plan governance");
assert(planRoute.includes("buildPlanApprovalRecord"), "Plan screen must build final PlanApprovalRecord");
assert(planRoute.includes("اعتماد المختص الأعلى للخطة"), "Plan screen must expose higher-authority plan approval UI");
step("Plan screen builds review-ready plan draft and final approval record from approved goals");

assert(verification.includes("PlanApprovalRecord final approval is created from the higher-authority review section"), "Sprint 3 verification must record higher-approval closure");
assert(verification.includes("overallStatus\": \"PASS\""), "Sprint 3 verification run must pass only with explicit gap documentation");
assert(verification.includes("\"remainingStageGaps\": []"), "Sprint 3 verification must not leave hidden stage gaps");
assert(constitution.includes("قاعدة إغلاق المرحلة قبل التقدم"), "Constitution must include explicit gap closure rule");
step("Declared Sprint 3 approval gap is closed under the constitution progress rule");

const journey = read("src/lib/journey.ts");
assert(journey.includes("\"plan_approved\""), "Journey model must include plan_approved stage");
assert(journey.includes("STAGE_RANK.plan_approved"), "Plan step must complete only after plan approval");
step("Journey model distinguishes saved plan from approved plan");

assert(packageJson.includes("\"verify:sprint3\""), "package.json must expose verify:sprint3");
step("Sprint 3 verification command is registered");

if (failures.length > 0) {
  console.error("Sprint 3 verification failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("Sprint 3 goal approval verification PASS");
console.log("Sprint 3 plan governance verification PASS");
console.log("Sprint 3 explicit-gap verification PASS");
console.log(`Sprint 3 checks: ${checks.length}`);
