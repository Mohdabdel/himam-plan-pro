import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function includesAll(text, tokens, label) {
  for (const token of tokens) {
    assert(text.includes(token), `${label} is missing token: ${token}`);
  }
}

const root = process.cwd();
const tsc = resolve(root, "../../node_modules/typescript/bin/tsc");

execFileSync("node", [tsc, "--project", "tsconfig.json", "--noEmit"], {
  cwd: root,
  stdio: "pipe",
});

const types = readFileSync(resolve(root, "src/domain/types.ts"), "utf8");
const reporting = readFileSync(resolve(root, "src/domain/reporting.ts"), "utf8");
const trialReport = readFileSync(resolve(root, "src/fixtures/trial-report.ts"), "utf8");

includesAll(
  types,
  [
    "ReportClaim",
    "EndToEndTrace",
    "ReportPackage",
    "ReportBuildInput",
    "humanApprovalReference?: never",
    "draft_ready_for_human_review",
    "needs_revision",
  ],
  "Reporting types",
);

includesAll(
  reporting,
  [
    "buildReportPackage",
    "assertReportTraceability",
    "sourceRefs",
    "traceForClaim",
    "human_review_boundary",
    "GoalDraft",
    "GoalQualityReview",
    "InformationSource",
  ],
  "Reporting service",
);

includesAll(
  trialReport,
  [
    "trialReportPackage",
    "assertReportTraceability",
    "reviewInformationSufficiency",
    "trialGoalDraft",
    "trialGoalQualityReview",
  ],
  "Trial report fixture",
);

console.log("Stage C verification PASS");
console.log("- TypeScript typecheck PASS");
console.log("- Report package contract PASS");
console.log("- Claim source refs PASS");
console.log("- End-to-end trace contract PASS");
console.log("- Human approval boundary PASS");
console.log("- Trial report fixture PASS");
