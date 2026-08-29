import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const manifestPath = resolve(root, "specs/himam_governing_files_manifest.json");
const indexPath = resolve(root, "specs/himam_project_governance_index.md");
const transitionPlanPath = resolve(root, "specs/himam_final_programming_transition_plan_2026-08-23.md");
const checklistPath = resolve(root, "specs/himam_pre_programming_governance_checklist_2026-08-24.md");
const outputPath = resolve(root, "verification/governing-files-organization-run.json");

const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const index = readFileSync(indexPath, "utf8");
const transitionPlan = readFileSync(transitionPlanPath, "utf8");
const checklist = readFileSync(checklistPath, "utf8");
const packageJson = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"));

const failures = [];
const governingFiles = manifest.governingFiles ?? [];
const supportingFiles = manifest.supportingFiles ?? [];

if (manifest.status !== "ACTIVE_CANONICAL_ORDER") {
  failures.push("Manifest status must be ACTIVE_CANONICAL_ORDER.");
}

if (!packageJson.scripts?.["verify:governing-files"]) {
  failures.push("package.json must expose verify:governing-files.");
}

const orders = governingFiles.map((file) => file.order);
orders.forEach((order, index) => {
  if (order !== index + 1) {
    failures.push(`Governing file order ${order} must equal ${index + 1}.`);
  }
});

const seenPaths = new Set();
for (const file of [...governingFiles, ...supportingFiles]) {
  if (!file.path) {
    failures.push("Every manifest file must include a path.");
    continue;
  }

  if (seenPaths.has(file.path)) {
    failures.push(`Duplicate manifest path: ${file.path}`);
  }
  seenPaths.add(file.path);

  try {
    readFileSync(resolve(root, file.path), "utf8");
  } catch {
    failures.push(`Missing manifest file: ${file.path}`);
  }
}

function assertOrderedList(documentText, documentName, file) {
  const basename = file.path.replace(/^specs\//, "");
  if (!documentText.includes(`${file.order}. \`${basename}\``)) {
    failures.push(`${documentName} is missing ordered file ${file.order}: ${basename}`);
  }
}

for (const file of governingFiles) {
  assertOrderedList(index, "Governance index", file);
  assertOrderedList(transitionPlan, "Transition plan", file);
  assertOrderedList(checklist, "Pre-programming checklist", file);
}

for (const requiredPhrase of [
  "لا يبدأ أي عمل تصميمي أو برمجي من ملف منفرد",
  "لا انتقال مع فجوة غير مغلقة أو غير مفسرة",
  "himam_governing_files_manifest.json",
]) {
  if (!index.includes(requiredPhrase)) {
    failures.push(`Governance index is missing required phrase: ${requiredPhrase}`);
  }
}

for (const requiredPhrase of [
  "بوابة الجاهزية الشاملة بعد المعرفة الجديدة",
  "KNOWLEDGE_READY_FOR_CODE",
  "KNOWLEDGE_READY_WITH_REGISTERED_LIMITS",
  "NOT_READY_FOR_CODE",
]) {
  if (!checklist.includes(requiredPhrase)) {
    failures.push(`Pre-programming checklist is missing comprehensive knowledge readiness phrase: ${requiredPhrase}`);
  }
}

const result = {
  verification: "governing-files-organization",
  verifiedAt: "2026-08-24",
  status: failures.length === 0 ? "PASS" : "FAIL",
  manifestStatus: manifest.status,
  governingFileCount: governingFiles.length,
  supportingFileCount: supportingFiles.length,
  canonicalFirstFile: governingFiles[0]?.path ?? null,
  canonicalLastFile: governingFiles.at(-1)?.path ?? null,
  checks: {
    manifestReadable: "PASS",
    allFilesExist: failures.some((failure) => failure.startsWith("Missing manifest file")) ? "FAIL" : "PASS",
    orderIsSequential: orders.every((order, index) => order === index + 1) ? "PASS" : "FAIL",
    indexOrderMatchesManifest: governingFiles.every((file) => index.includes(`${file.order}. \`${file.path.replace(/^specs\//, "")}\``)) ? "PASS" : "FAIL",
    transitionPlanOrderMatchesManifest: governingFiles.every((file) => transitionPlan.includes(`${file.order}. \`${file.path.replace(/^specs\//, "")}\``)) ? "PASS" : "FAIL",
    checklistOrderMatchesManifest: governingFiles.every((file) => checklist.includes(`${file.order}. \`${file.path.replace(/^specs\//, "")}\``)) ? "PASS" : "FAIL",
    packageScriptRegistered: packageJson.scripts?.["verify:governing-files"] ? "PASS" : "FAIL",
    progressRulePreserved: index.includes("لا انتقال مع فجوة غير مغلقة أو غير مفسرة") ? "PASS" : "FAIL",
    knowledgeReadinessGatePreserved: checklist.includes("بوابة الجاهزية الشاملة بعد المعرفة الجديدة") ? "PASS" : "FAIL",
  },
  failures,
};

writeFileSync(outputPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");

if (failures.length > 0) {
  console.error(JSON.stringify(result, null, 2));
  process.exit(1);
}

console.log(JSON.stringify(result, null, 2));
