import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const tsc = resolve(root, "../../node_modules/typescript/bin/tsc");
const prototypeDir = resolve(root, ".prototype");
const publicDir = resolve(root, "public");

rmSync(prototypeDir, { recursive: true, force: true });
execFileSync("node", [tsc, "--project", "tsconfig.prototype.json"], {
  cwd: root,
  stdio: "pipe",
});

const workflowModule = await import(
  pathToFileURL(resolve(root, ".prototype/domain/fixtures/trial-workflow.js")).href
);

mkdirSync(publicDir, { recursive: true });
writeFileSync(
  resolve(publicDir, "prototype-data.json"),
  `${JSON.stringify(workflowModule.trialWorkflow, null, 2)}\n`,
  "utf8",
);

console.log("Prototype data generated: public/prototype-data.json");
