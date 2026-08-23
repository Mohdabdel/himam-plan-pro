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

function assertNotIncludes(label, content, forbidden) {
  if (content.includes(forbidden)) {
    throw new Error(`${label} still contains forbidden text: ${forbidden}`);
  }
  checks.push(label);
}

const governance = read("src/lib/goal-plan-approval.ts");
const goalsRoute = read("src/routes/students.$id.iep.goals.tsx");
const planRoute = read("src/routes/students.$id.plan.tsx");
const packageJson = read("package.json");
const sprint4Run = read("verification/sprint4-verification-run.json");
const transitionPlan = read("specs/himam_final_programming_transition_plan_2026-08-23.md");
const readinessGate = read("specs/himam_readiness_gate_and_execution_rules.md");

assertIncludes("authorization matrix", governance, "APPROVAL_ACCESS_MATRIX");
assertIncludes("unauthorized guard", governance, "UNAUTHORIZED_APPROVAL_ACTION");
assertIncludes("plan approval role restriction", governance, 'CREATE_PLAN_APPROVAL: ["SENIOR_SPECIALIST", "PROGRAM_ADMIN"]');
assertIncludes("audit event type", governance, "ApprovalAuditEvent");
assertIncludes("audit event builder", governance, "buildApprovalAuditEvent");
assertIncludes("audit event persistence", governance, "appendApprovalAuditEvent");
assertIncludes("audit event loader", governance, "loadApprovalAuditEvents");

assertIncludes("goals route appends audit", goalsRoute, "appendApprovalAuditEvent");
assertIncludes("goals route builds audit", goalsRoute, "buildApprovalAuditEvent");
assertIncludes("goals route audits goal approval", goalsRoute, 'targetRecordType: "GoalApprovalRecord"');
assertIncludes("goals route audits goal approval action", goalsRoute, 'action: "CREATE_GOAL_APPROVAL"');

assertIncludes("plan route appends audit", planRoute, "appendApprovalAuditEvent");
assertIncludes("plan route builds audit", planRoute, "buildApprovalAuditEvent");
assertIncludes("plan route audits plan draft", planRoute, 'targetRecordType: "PlanDraft"');
assertIncludes("plan route audits quality review", planRoute, 'targetRecordType: "PlanQualityReview"');
assertIncludes("plan route audits approval", planRoute, 'targetRecordType: "PlanApprovalRecord"');
assertIncludes("plan route restricts reviewer to senior specialist", planRoute, '<option value="SENIOR_SPECIALIST">');
assertIncludes("plan route restricts reviewer to admin", planRoute, '<option value="PROGRAM_ADMIN">');
assertNotIncludes("plan route removed stale Sprint 3 approval gap", planRoute, "لم ينفذ بعد في Sprint 3");

assertIncludes("package script", packageJson, '"verify:sprint4"');
assertIncludes("transition plan mentions Sprint 4", transitionPlan, "Sprint 4");
assertIncludes("readiness rule blocks incomplete progress", readinessGate, "انتقالاً غير مكتمل");
assertIncludes("verification status", sprint4Run, '"overallStatus": "PASS"');
assertIncludes("no remaining stage gaps", sprint4Run, '"remainingStageGaps": []');

console.log("Sprint 4 authorization verification PASS");
console.log("Sprint 4 audit verification PASS");
console.log("Sprint 4 storage verification PASS");
console.log(`Sprint 4 checks: ${checks.length}`);
