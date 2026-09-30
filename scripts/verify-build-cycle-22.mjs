import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const read = (path) => readFileSync(resolve(root, path), "utf8");

const checks = [];
const failures = [];

function requireText(label, content, expected) {
  if (!content.includes(expected)) {
    failures.push(`${label} missing ${expected}`);
    return;
  }
  checks.push(label);
}

const spec = read("specs/himam_build_cycle_22_execution_plan_2026-09-30.md");
const goals = read("src/routes/students.$id.iep.goals.tsx");
const packageJson = read("package.json");
const ci = read(".github/workflows/quality-gates.yml");

requireText("cycle22 scope", spec, "GOAL_AI_PROPOSAL_VISIBLE_DOMAIN_ROUTING");
requireText("goals routing marker", goals, "GOAL_AI_PROPOSAL_VISIBLE_DOMAIN_ROUTING");
requireText("goals routing helper", goals, "function routeAiProposalDomain");
requireText("goals visible domain input", goals, "goalDomainOptions");
requireText("goals opportunity code match", goals, "domain.code === opportunityCode");
requireText("goals opportunity name match", goals, "domain.name === opportunityName");
requireText("goals current domain fallback", goals, "domain.code === input.currentDomainCode");
requireText("goals first visible fallback", goals, "visibleDomains[0]?.code");
requireText("goals add proposal uses current opportunities", goals, "goalOpportunityCards.find((card) => card.id === proposal.opportunityId)");
requireText("goals add proposal uses initial opportunities", goals, "initialGoalOpportunityCards.find((card) => card.id === proposal.opportunityId)");
requireText("goals start proposal routed domain", goals, "domainCode: routedDomainCode || current.domainCode");
requireText("package script", packageJson, "\"verify:build-cycle-22\"");
requireText("ci runs cycle22", ci, "npm run verify:build-cycle-22");

const result = {
  verification: "build-cycle-22",
  verifiedAt: "2026-09-30",
  status: failures.length === 0 ? "PASS" : "FAIL",
  cycle: "BUILD_CYCLE_22",
  scope: "GOAL_AI_PROPOSAL_VISIBLE_DOMAIN_ROUTING",
  checkCount: checks.length,
  failures,
};

writeFileSync(
  resolve(root, "verification/build-cycle-22-run.json"),
  `${JSON.stringify(result, null, 2)}\n`,
);

if (failures.length > 0) {
  console.error(JSON.stringify(result, null, 2));
  process.exit(1);
}

console.log(JSON.stringify(result, null, 2));
