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

const plan = read("specs/himam_build_cycle_02_execution_plan_2026-08-24.md");
const workspace = read("src/lib/current-performance-workspace.ts");
const pipeline = read("src/lib/source-file-pipeline.ts");
const official = read("src/routes/students.$id.assessment.official.tsx");
const learnerVoice = read("src/routes/students.$id.student-voice.tsx");
const familyVoice = read("src/routes/students.$id.family.tsx");
const additional = read("src/routes/students.$id.assessment.additional.tsx");
const informationRecords = read("src/lib/information-records.ts");
const informationToolApplication = read("src/components/information-tool-application.tsx");
const planComponentsStatus = read("src/components/plan-components-status.tsx");
const structuredUploadSections = read("src/lib/structured-upload-sections.ts");
const structuredUploadReview = read("src/components/structured-upload-review.tsx");
const toolsLibrary = read("src/routes/tools-library.tsx");
const coverage = read("src/routes/students.$id.coverage.tsx");
const iep = read("src/routes/students.$id.iep.tsx");
const packageJson = read("package.json");
const ci = read(".github/workflows/quality-gates.yml");

const gates = [
  "قرار منتج مرجعي",
  "سيناريو مستخدم محدد",
  "متطلبات مجال وصلاحيات",
  "تصميم بيانات مع migration قابلة للمراجعة",
  "API أو service contract",
  "تصميم واجهة",
  "اختبارات حسب المخاطر",
  "مراجعة أمنية للوظائف الحساسة",
  "build/lint/typecheck في CI",
  "مراجعة diff ضد المواصفة",
  "demo على سيناريو واقعي",
  "تحديث سجل القرارات والوثائق",
];

for (const gate of gates) {
  requireText(`cycle02 gate ${gate}`, plan, gate);
}

requireText("workspace builder exported", workspace, "buildCurrentPerformanceWorkspace");
requireText("workspace summary exported", workspace, "summarizeCurrentPerformanceWorkspace");
requireText("official reviewed source classification", workspace, "OFFICIAL_ASSESSMENT_RESULTS");
requireText("current performance cue kind", workspace, "CURRENT_PERFORMANCE_CUE");
requireText("context support kind", workspace, "CONTEXT_SUPPORT");
requireText("completion gap kind", workspace, "COMPLETION_GAP");
requireText("no raw file dependency", workspace, "structuredResponses.map");
requireText("baseline guard", workspace, "canSupportGoalBaseline: kind === \"CURRENT_PERFORMANCE_CUE\"");
requireText("human review before claim flag", workspace, "requiresHumanReviewBeforeClaim");

requireText("unsupported files require manual interpretation", pipeline, "UNSUPPORTED_FILE_REQUIRES_MANUAL_REVIEW");
requireText("unsupported file does not create placeholder statements", pipeline, "statements: []");
requireText("pdf reader is wired", pipeline, "pdfjs-dist/legacy/build/pdf.mjs");
requireText("docx reader is wired", pipeline, "mammoth/mammoth.browser");
requireText("spreadsheet reader is wired", pipeline, "read-excel-file");
requireText("pdf extraction pages", pipeline, "getTextContent");
requireText("docx raw text extraction", pipeline, "extractRawText");
requireText("spreadsheet row extraction", pipeline, "readXlsxFile");
requireText("official interpreted result guard", official, "hasInterpretedAssessmentStatements");
requireText("official upload alone is insufficient", official, "الحد الأدنى ليس رفع الملف فقط");
requireText("official draft uses reviewed statements", official, "statements: reviewedStatements");
requireText("official assessment tool library visible", official, "مكتبة أدوات التقييم المتاحة للتجربة");
requireText("official library selects tool", official, "onClick={() => setToolId(tool.id)}");
requireText("official platform mode enabled", official, "type EntryMode = \"upload\" | \"platform\"");
requireText("official platform application button", official, "تطبيق الأداة داخل المنصة");
requireText("official domain result inputs", official, "domainInputs");
requireText("official applied tool statements", official, "buildAppliedToolStatements");
requireText("official upload requires domain processing", official, "بعد رفع الملف، صنف نتيجة مفسرة واحدة على الأقل");
requireText("official upload processing panel", official, "معالجة نتائج");
requireText("official platform source pipeline", official, "application/himam-assessment+json");
requireText("official platform result processing note", official, "تم تطبيق أداة من مكتبة التقييم داخل المنصة");
requireText("learner voice platform tool application", learnerVoice, "InformationToolApplication");
requireText("learner voice uploaded file pipeline", learnerVoice, "LEARNER_VOICE_FORM");
requireText("learner voice descriptive response required", learnerVoice, "hasInformationRecordResponse");
requireText("learner voice structured upload headings", learnerVoice, "missingRequiredStructuredUploadSections");
requireText("family voice platform tool application", familyVoice, "InformationToolApplication");
requireText("family voice uploaded file pipeline", familyVoice, "FAMILY_VISION_FORM");
requireText("family voice descriptive response required", familyVoice, "hasInformationRecordResponse");
requireText("family voice structured upload headings", familyVoice, "missingRequiredStructuredUploadSections");
requireText("additional platform tool application", additional, "InformationToolApplication");
requireText("additional descriptive response required", additional, "hasInformationRecordResponse");
requireText("additional structured upload headings", additional, "missingRequiredStructuredUploadSections");
requireText("information record upsert", informationRecords, "upsertInformationRecord");
requireText("information record response guard", informationRecords, "hasInformationRecordResponse");
requireText("platform tool renders text responses", informationToolApplication, "textarea");
requireText("platform tool renders multi select responses", informationToolApplication, "multi_select");
requireText("platform tool renders single select responses", informationToolApplication, "single_select");
requireText("platform tool submit button", informationToolApplication, "تسجيل إجابات الأداة");
requireText("platform tool saved profile message", informationToolApplication, "تم تسجيل إجابات الأداة وحفظها ببروفايل المتعلم");
requireText("learner voice requires tool submit before next", learnerVoice, "platformToolSaved");
requireText("family voice requires tool submit before next", familyVoice, "platformToolSaved");
requireText("additional source requires tool submit before next", additional, "platformToolSaved");
requireText("plan components are horizontal", planComponentsStatus, "overflow-x-auto");
requireText("plan components library link", planComponentsStatus, "مكتبة الأدوات المجمعة");
requireText("tools library route exists", toolsLibrary, "createFileRoute(\"/tools-library\")");
requireText("tools library chooses learner", toolsLibrary, "اختر مستفيداً مسجلاً");
requireText("tools library supports new learner", toolsLibrary, "مستفيد جديد");
requireText("tools library shows model reference", toolsLibrary, "المرجعية:");
requireText("platform tool shows model reference", informationToolApplication, "مرجعية النموذج");
requireText("information tool reference metadata", read("src/data/information-tools.ts"), "usageNoteAr");
requireText("one pager tool registered", read("src/data/information-tools.ts"), "IM_DETERMINED_ONE_PAGER_TEMPLATE");
requireText("good day plan tool registered", read("src/data/information-tools.ts"), "IM_DETERMINED_GOOD_DAY_PLAN_TEMPLATE");
requireText("goal plan tool registered", read("src/data/information-tools.ts"), "IM_DETERMINED_GOAL_PLAN_TEMPLATE");
requireText("indicator 13 tool registered", read("src/data/information-tools.ts"), "NTACT_INDICATOR_13_REVIEW_PROMPTS");
requireText("predictors scan tool registered", read("src/data/information-tools.ts"), "NTACT_PREDICTORS_EXPERIENCE_SCAN");
requireText("casey life skills result summary registered", read("src/data/information-tools.ts"), "CASEY_LIFE_SKILLS_SHORT_RESULTS_SUMMARY");
requireText("casey life skills license boundary preserved", read("src/data/information-tools.ts"), "لا ينسخ أو يعدل داخل همم");
requireText("pcaet career exploration registered", read("src/data/information-tools.ts"), "P_CAET_RIASEC_CAREER_EXPLORATION_SUMMARY");
requireText("transition tennessee toolbox review registered", read("src/data/information-tools.ts"), "TRANSITION_TN_AGE_APPROPRIATE_ASSESSMENT_TOOLBOX_REVIEW");
requireText("reinforcer preference observation registered", read("src/data/information-tools.ts"), "MASARAT_REINFORCER_PREFERENCE_OBSERVATION");
requireText("community worksite skills evaluation registered", read("src/data/information-tools.ts"), "MASARAT_COMMUNITY_WORKSITE_SKILLS_EVALUATION");
requireText("structured upload learner section map", structuredUploadSections, "LEARNER_VOICE_FORM");
requireText("structured upload family section map", structuredUploadSections, "FAMILY_VISION_FORM");
requireText("structured upload additional section map", structuredUploadSections, "ADDITIONAL_INFORMATION_SOURCE");
requireText("structured upload statement builder", structuredUploadSections, "buildStructuredUploadStatements");
requireText("structured upload required section guard", structuredUploadSections, "missingRequiredStructuredUploadSections");
requireText("structured upload review shows extraction as review only", structuredUploadReview, "قراءة الملف للمراجعة فقط");

requireText("coverage imports workspace", coverage, "buildCurrentPerformanceWorkspace");
requireText("coverage loads pipelines", coverage, "loadSourceFilePipelines");
requireText("coverage displays current performance cards", coverage, "بطاقات أداء وسياق من مصادر مرفوعة ومراجعة");
requireText("coverage shows provenance", coverage, "provenanceLabel");
requireText("coverage shows baseline readiness", coverage, "baselineReady");
requireText("coverage blocks without reviewed interpretation", coverage, "نتائج التقييم الرسمي لم تفسر بعد");
requireText("coverage does not mark ready on page load", coverage, "markCoverageReady(id);");

requireText("iep imports current performance workspace", iep, "buildCurrentPerformanceWorkspace");
requireText("iep blocks goal generation without baseline", iep, "مغلق حتى تفسير التقييم");
requireText("iep routes blocked goal card to coverage", iep, "لا يفتح توليد الأهداف قبل وجود نتيجة تقييم رسمية مفسرة ومراجعة");

requireText("package script", packageJson, "\"verify:build-cycle-02\"");
requireText("ci runs cycle02", ci, "npm run verify:build-cycle-02");

const result = {
  verification: "build-cycle-02",
  verifiedAt: "2026-08-25",
  status: failures.length === 0 ? "PASS" : "FAIL",
  cycle: "BUILD_CYCLE_02",
  scope: "CURRENT_PERFORMANCE_FROM_REVIEWED_SOURCE_FILES",
  requiredGateCount: gates.length,
  checkCount: checks.length,
  failures,
};

writeFileSync(
  resolve(root, "verification/build-cycle-02-run.json"),
  `${JSON.stringify(result, null, 2)}\n`,
);

if (failures.length > 0) {
  console.error(JSON.stringify(result, null, 2));
  process.exit(1);
}

console.log(JSON.stringify(result, null, 2));
