import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ASSESSMENT_TOOLS } from "@/data/assessment-tools";
import {
  createAssessmentRecord,
  loadAssessmentRecords,
  saveAssessmentRecords,
} from "@/lib/assessment-records";
import {
  coverageAreaLabelAr,
  reviewAssessmentTransitionCoverage,
} from "@/lib/information-source-review";
import { PlanComponentsStatus } from "@/components/plan-components-status";
import { loadPlanComponentStatus } from "@/components/plan-components-status-store";
import { advanceStage } from "@/lib/journey";
import {
  applySourceExtractionReview,
  appendSourceFilePipeline,
  buildSourceFileDraftPipeline,
  loadSourceFilePipelines,
  readAllowedSourceFileDraft,
  summarizeSourceFilePipeline,
  splitSourceDraftText,
  type SourceFilePipelineRecord,
} from "@/lib/source-file-pipeline";
import type { AssessmentRecord } from "@/types/himam";

export const Route = createFileRoute("/students/$id/assessment/official")({
  component: OfficialAssessmentPage,
  head: () => ({
    meta: [
      { title: "أداة التقييم الرسمية - همم" },
      { name: "description", content: "تحديد أداة التقييم الرسمية ورفع نتائجها." },
    ],
  }),
});

type StoredStudent = {
  id: string;
  name: string;
  center?: string;
  ageYears?: number | null;
  ageBand?: "UNDER_14" | "AGE_14_PLUS";
  status?: string;
  tool?: string;
};

const ACCEPTED_OFFICIAL_RESULT_EXTENSIONS = ".pdf,.docx,.xlsx,.csv,.txt,.json";
const ACCEPTED_OFFICIAL_RESULT_LABEL_AR = "PDF, DOCX, XLSX, CSV, TXT, JSON";

function hasInterpretedAssessmentStatements(statements: string[]) {
  return statements.some((statement) => {
    const normalized = statement.trim();
    return (
      normalized.length >= 20 &&
      !normalized.startsWith("تعذر") &&
      !normalized.startsWith("تم رفع")
    );
  });
}

function loadStudent(id: string): StoredStudent | null {
  try {
    const list = JSON.parse(localStorage.getItem("himam_students") || "[]") as StoredStudent[];
    return list.find((item) => item.id === id) ?? null;
  } catch {
    return null;
  }
}

function updateStudentAssessmentTool(id: string, toolId: string) {
  try {
    const list = JSON.parse(localStorage.getItem("himam_students") || "[]") as StoredStudent[];
    localStorage.setItem("himam_students", JSON.stringify(
      list.map((item) => (
        item.id === id
          ? { ...item, tool: toolId, status: advanceStage(item.status ?? "draft", "assessment_in_progress") }
          : item
      )),
    ));
  } catch {
    /* noop */
  }
}

function OfficialAssessmentPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [student, setStudent] = useState<StoredStudent | null>(null);
  const [records, setRecords] = useState<AssessmentRecord[]>([]);
  const [toolId, setToolId] = useState("TTAP-3");
  const [customToolName, setCustomToolName] = useState("");
  const [upload, setUpload] = useState<File | null>(null);
  const [draftText, setDraftText] = useState("");
  const [reviewerNotes, setReviewerNotes] = useState("");
  const [extractionWarning, setExtractionWarning] = useState("");
  const [draftReaderOpen, setDraftReaderOpen] = useState(false);
  const [additionalToolName, setAdditionalToolName] = useState("");
  const [additionalToolNotes, setAdditionalToolNotes] = useState("");
  const [additionalUpload, setAdditionalUpload] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [componentStatus, setComponentStatus] = useState(() => loadPlanComponentStatus(id));
  const [sourcePipelines, setSourcePipelines] = useState<SourceFilePipelineRecord[]>([]);

  useEffect(() => {
    const loadedStudent = loadStudent(id);
    const loadedRecords = loadAssessmentRecords(id);
    setStudent(loadedStudent);
    setRecords(loadedRecords);
    setComponentStatus(loadPlanComponentStatus(id));
    setSourcePipelines(loadSourceFilePipelines(id));
    if (loadedStudent?.tool) setToolId(loadedStudent.tool);
  }, [id]);

  const selectedTool = ASSESSMENT_TOOLS.find((item) => item.id === toolId);
  const coverageReview = reviewAssessmentTransitionCoverage({
    ageBand: student?.ageBand,
    selectedToolId: toolId,
  });
  async function handleUploadChange(file: File | null) {
    setUpload(file);
    setExtractionWarning("");
    setDraftText("");
    if (!file) return;
    const result = await readAllowedSourceFileDraft(file);
    if (result.failureReason) {
      setExtractionWarning(result.failureReason);
    }
    setDraftText(result.statements.join("\n"));
  }

  async function handleSave() {
    if (!toolId) {
      setError("يرجى تحديد أداة التقييم الرسمية.");
      return false;
    }
    if (toolId === "OTHER_OFFICIAL_ASSESSMENT" && !customToolName.trim()) {
      setError("يرجى كتابة اسم الأداة عند اختيار أخرى.");
      return false;
    }
    if (!upload) {
      setError("يرجى رفع نتائج التقييم الرسمي أو التقرير.");
      return false;
    }
    const reviewedStatements = splitSourceDraftText(draftText);
    if (reviewedStatements.length === 0) {
      setError(`لم ينتج الملف قراءة قابلة للمراجعة. ارفع ملف نتائج بصيغة مدعومة (${ACCEPTED_OFFICIAL_RESULT_LABEL_AR}) أو استخدم نموذج نتائج منظم قابل للقراءة.`);
      return false;
    }
    if (!hasInterpretedAssessmentStatements(reviewedStatements)) {
      setError("الحد الأدنى ليس رفع الملف فقط؛ يجب أن يحتوي الملف أو مسودة قراءته على نتيجة تقييم رسمية مفسرة يمكن مراجعتها قبل المتابعة.");
      return false;
    }

    const record = createAssessmentRecord({
      learnerId: id,
      toolId,
      assessorName: "",
      assessmentDate: "",
      ageBand: student?.ageBand,
      uploadedFileName: upload.name,
      uploadedFileType: upload.type,
    });
    const savedRecord = toolId === "OTHER_OFFICIAL_ASSESSMENT" && customToolName.trim()
      ? { ...record, toolNameAr: customToolName.trim() }
      : record;
    const completedRecord: AssessmentRecord = {
      ...savedRecord,
      status: "completed",
      domains: savedRecord.domains,
    };
    const readResult = await readAllowedSourceFileDraft(upload);
    const sourceDraftPipeline = buildSourceFileDraftPipeline({
      learnerId: id,
      sourceNameAr: `نتائج ${savedRecord.toolNameAr}`,
      file: upload,
      purpose: "OFFICIAL_ASSESSMENT_RESULTS",
      sourceType: "INSTITUTIONAL_ASSESSMENT",
      statements: reviewedStatements,
      outputChannel: "KNOWLEDGE_SUPPORT_ITEM",
      extractionFailureReason: readResult.statements.length === 0 ? readResult.failureReason : undefined,
    });
    const sourcePipeline = applySourceExtractionReview(sourceDraftPipeline, {
      decision: "approved_for_structured_response",
      reviewerRole: "SPECIALIST",
      reviewerNotes: reviewerNotes.trim() || "راجع المختص مسودة قراءة ملف التقييم الرسمي واعتمد البنود المصححة.",
      correctedStatements: [
        ...reviewedStatements,
        `نتائج ${savedRecord.toolNameAr} مرفوعة ومراجعة كمصدر رسمي لبناء مستوى الأداء الحالي.`,
        coverageReview.missingAreas.length > 0
          ? `توجد فجوات تغطية انتقالية تحتاج مراجعة: ${coverageReview.missingAreas.map((area) => coverageAreaLabelAr(area)).join("، ")}.`
          : "لا توجد فجوات تغطية انتقالية ظاهرة من اختيار الأداة الحالي.",
      ],
      outputChannel: "KNOWLEDGE_SUPPORT_ITEM",
    });

    const next = [
      ...records,
      {
        ...completedRecord,
        processingNotesAr: [
          ...(completedRecord.processingNotesAr ?? []),
          "تم إنشاء مسار قراءة ومراجعة للنتائج المرفوعة وتحويلها إلى استجابات منظمة قبل استخدامها في بناء البروفايل ومستوى الأداء الحالي والأهداف.",
        ],
      },
    ];
    saveAssessmentRecords(id, next);
    const nextPipelines = appendSourceFilePipeline(id, sourcePipeline);
    if (additionalToolName.trim() || additionalToolNotes.trim() || additionalUpload) {
      localStorage.setItem(`himam_additional_assessment_intent_${id}`, JSON.stringify({
        toolName: additionalToolName.trim(),
        notes: additionalToolNotes.trim(),
        uploadedFileName: additionalUpload?.name ?? "",
        uploadedFileType: additionalUpload?.type ?? "",
        savedAt: new Date().toISOString(),
        status: "pending_structured_processing",
      }));
    }
    updateStudentAssessmentTool(id, toolId);
    setRecords(next);
    setSourcePipelines(nextPipelines);
    setUpload(null);
    setDraftText("");
    setReviewerNotes("");
    setAdditionalToolName("");
    setAdditionalToolNotes("");
    setAdditionalUpload(null);
    setExtractionWarning("");
    setComponentStatus(loadPlanComponentStatus(id));
    setError("");
    return true;
  }

  async function handleNext() {
    if (records.length === 0) {
      const saved = await handleSave();
      if (!saved) return;
    }
    navigate({ to: "/students/$id/student-voice", params: { id } });
  }

  return (
    <div className="min-h-screen bg-[#FAF7F2]" dir="rtl" lang="ar">
      <header className="flex items-center justify-between px-8 py-4" style={{ backgroundColor: "#0F3D3E" }}>
        <Link
          to="/students/$id/assessment"
          params={{ id }}
          className="rounded-lg border border-white/30 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
        >
          رجوع
        </Link>
        <h1 className="text-2xl font-bold text-white">همم</h1>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-8 md:px-8">
        <nav aria-label="مسار الصفحة" className="mb-2.5 flex flex-wrap items-center gap-1.5 text-xs text-stone-400">
          <Link to="/" className="font-bold text-stone-600 underline">لوحة المتعلمين</Link>
          <span>←</span>
          <span>{student?.name ?? "المتعلم"}</span>
          <span>←</span>
          <Link to="/students/$id/assessment" params={{ id }} className="font-bold text-stone-600 underline">مصادر جمع المعلومات</Link>
          <span>←</span>
          <span className="font-bold text-[#0F3D3E]">أداة التقييم الرسمية</span>
        </nav>

        <PlanComponentsStatus learnerId={id} current="assessment" status={componentStatus} />

        <section className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-bold text-[#D9764A]">أداة التقييم الرسمية</p>
          <h2 className="mt-1 text-2xl font-bold text-[#0F3D3E]">حدد أداة التقييم الرسمية التي تم اعتمادها مع المتعلم لبناء الخطة التربوية الفردية</h2>
          <p className="mt-2 text-sm leading-7 text-stone-600">
            قم برفع ملف نتائج التقييم النهائية. يمكنك مراجعة مسودة القراءة قبل تحويلها إلى مرجعية مهنية للبروفايل ومستوى الأداء الحالي.
          </p>
          {(student?.ageBand === "AGE_14_PLUS" || (typeof student?.ageYears === "number" && student.ageYears >= 14)) && selectedTool && (
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-7 text-amber-800">
              وفق معايير أدوات تقييم الانتقال الملائمة للعمر، قد لا تغطي أداة {selectedTool.nameAr} مستويات الأداء الحالية لعدد من مجالات الاهتمام المطلوبة في خطة الطالب مثل تقرير المصير، الوعي الذاتي، ومهارات الحياة. يظهر هذا التنويه لأن المتعلم ضمن إطار التخطيط للانتقال.
            </div>
          )}

          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-stone-500">أداة التقييم الرسمية</label>
              <select
                value={toolId}
                onChange={(event) => setToolId(event.target.value)}
                className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-800 outline-none focus:border-[#0F3D3E]"
              >
                {ASSESSMENT_TOOLS.map((tool) => (
                  <option key={tool.id} value={tool.id}>{tool.nameAr}</option>
                ))}
              </select>
            </div>
            {toolId === "OTHER_OFFICIAL_ASSESSMENT" && (
              <div>
                <label className="mb-1 block text-xs font-semibold text-stone-500">اسم الأداة</label>
                <input
                  type="text"
                  value={customToolName}
                  onChange={(event) => setCustomToolName(event.target.value)}
                  className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-800 outline-none focus:border-[#0F3D3E]"
                  placeholder="اكتب اسم الأداة المعتمدة لدى المؤسسة"
                />
              </div>
            )}
          </div>
        </section>

        <section className="mt-6 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
          <h3 className="text-xl font-bold text-[#0F3D3E]">نتائج التقييم الرسمي</h3>
          <p className="mt-2 text-sm leading-7 text-stone-600">
            يتم التعامل مع التقييمات الرسمية كأدوات مطبقة خارج منصة همم، وتعالج المنصة نتائجها المرفوعة بعد مراجعة المختص.
          </p>

          <div className="mt-5 grid grid-cols-1 gap-4">
            <div className="rounded-xl border border-[#0F3D3E] bg-[#E6F2F1] p-4">
              <p className="text-sm font-bold text-[#0F3D3E]">رفع النتائج</p>
              <p className="mt-2 text-xs font-bold text-[#0F3D3E]">
                الصيغ المقبولة: {ACCEPTED_OFFICIAL_RESULT_LABEL_AR}
              </p>
              <input
                type="file"
                accept={ACCEPTED_OFFICIAL_RESULT_EXTENSIONS}
                onChange={(event) => {
                  void handleUploadChange(event.target.files?.[0] ?? null);
                }}
                className="mt-3 w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-800 outline-none file:ml-3 file:rounded-md file:border-0 file:bg-[#0F3D3E] file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-white focus:border-[#0F3D3E]"
              />
              {upload && <p className="mt-2 text-xs font-bold text-[#0F3D3E]">{upload.name}</p>}
              {extractionWarning && (
                <p className="mt-2 rounded-lg border border-[#D9764A]/30 bg-[#FBE9E1] px-3 py-2 text-xs leading-6 text-stone-700">
                  لم تُنشأ قراءة آلية قابلة للمراجعة لهذا النوع من الملفات. استخدم صيغة مدعومة أو نموذج نتائج منظم قابل للقراءة قبل المتابعة.
                </p>
              )}
            </div>
          </div>

          {upload && selectedTool && (
            <div className="mt-5 rounded-xl border border-[#9EC7C3] bg-white p-4">
              <p className="text-sm font-bold text-[#0F3D3E]">مجالات مرجعية لقراءة نتائج {selectedTool.nameAr}</p>
              <p className="mt-1 text-xs leading-6 text-stone-600">
                تستخدم هذه المجالات كخريطة قراءة وتصنيف فقط. لا يدخل المختص درجات أو تقديرات يدوية هنا، ولا تنشئ المنصة تصحيحاً بديلاً للأداة الرسمية.
              </p>
              <div className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-2">
                {selectedTool.domains.map((domain) => (
                  <div key={domain.code} className="rounded-lg border border-stone-200 bg-stone-50 p-3">
                    <p className="text-sm font-bold text-[#0F3D3E]">{domain.nameAr}</p>
                    <p className="mt-1 text-[11px] leading-5 text-stone-500">
                      المفاهيم المرتبطة: {domain.linkedConcepts.join("، ")}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {upload && (
            <div className="mt-5 rounded-xl border border-stone-200 bg-white p-4">
              <button
                type="button"
                onClick={() => setDraftReaderOpen((open) => !open)}
                className="w-full text-right text-sm font-bold text-[#0F3D3E]"
              >
                مسودة قراءة الملف القابلة للتصحيح {draftReaderOpen ? "▲" : "▼"}
              </button>
              {draftReaderOpen && (
                <div className="mt-3">
                  <textarea
                    value={draftText}
                    onChange={(event) => setDraftText(event.target.value)}
                    rows={5}
                    className="w-full rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-sm leading-7 text-stone-800 outline-none focus:border-[#0F3D3E]"
                    placeholder="راجع النص المقروء من ملف النتائج فقط. لا تدخل درجات جديدة هنا؛ صحح القراءة أو احذف ما لا يمثل نتيجة مفسرة من التقرير."
                  />
                </div>
              )}
            </div>
          )}

          <div className="mt-5 rounded-xl border border-[#9EC7C3] bg-[#F4FAF9] p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-[#0F3D3E]">معالج نتائج أدوات التقييم الرسمية</p>
              <p className="mt-1 text-xs leading-6 text-stone-600">
                  من خلال هذا الخيار يتم تنفيذ عملية مراجعة ومعالجة لنتائج عدد من أدوات التقييم الرسمية كنماذج تجريبية، كما أن خيار ضبط وإضافة أدوات خاصة متاح بناء على طلب المستخدم.
              </p>
              </div>
              <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-[#0F3D3E]">
                {ASSESSMENT_TOOLS.filter((tool) => tool.id !== "OTHER_OFFICIAL_ASSESSMENT").length} أدوات
              </span>
            </div>
            <select
              value={toolId}
              onChange={(event) => setToolId(event.target.value)}
              className="mt-3 w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-800 outline-none focus:border-[#0F3D3E]"
            >
              {ASSESSMENT_TOOLS.filter((tool) => tool.id !== "OTHER_OFFICIAL_ASSESSMENT").map((tool) => (
                <option key={tool.id} value={tool.id}>{tool.nameAr}</option>
              ))}
            </select>
          </div>

          <div className="mt-5 rounded-xl border border-stone-200 bg-white p-4">
            <p className="text-sm font-bold text-[#0F3D3E]">هل تود رفع نتائج تقييمات إضافية تم تطبيقها على المتعلم، رسمية أو غير رسمية؟</p>
            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
              <input
                type="text"
                value={additionalToolName}
                onChange={(event) => setAdditionalToolName(event.target.value)}
                className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-800 outline-none focus:border-[#0F3D3E]"
                placeholder="اسم الأداة"
              />
              <input
                type="text"
                value={additionalToolNotes}
                onChange={(event) => setAdditionalToolNotes(event.target.value)}
                className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-800 outline-none focus:border-[#0F3D3E]"
                placeholder="إدخال يدوي مختصر"
              />
              <input
                type="file"
                accept={ACCEPTED_OFFICIAL_RESULT_EXTENSIONS}
                onChange={(event) => setAdditionalUpload(event.target.files?.[0] ?? null)}
                className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-800 outline-none file:ml-3 file:rounded-md file:border-0 file:bg-[#0F3D3E] file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-white focus:border-[#0F3D3E]"
              />
            </div>
            {(additionalToolName || additionalToolNotes || additionalUpload) && (
              <p className="mt-2 text-xs font-bold text-[#0F3D3E]">
                سيتم ربط هذا المدخل لاحقاً بمسار معالجة التقييمات الإضافية.
              </p>
            )}
          </div>

          {records.length > 0 && (
            <div className="mt-5 space-y-3">
              {records.map((record) => (
                <div key={record.id} className="rounded-xl border border-stone-100 bg-white p-4">
                  <p className="text-sm font-bold text-[#0F3D3E]">{record.toolNameAr}</p>
                  <p className="mt-1 text-xs text-stone-500">
                    الملف: {record.uploadedFileName || "غير مرفوع"}
                  </p>
                </div>
              ))}
            </div>
          )}

          {sourcePipelines.length > 0 && (
            <div className="mt-5 rounded-xl border border-[#9EC7C3] bg-[#F4FAF9] p-4">
              <p className="text-sm font-bold text-[#0F3D3E]">مسار قراءة ومراجعة الملفات المرفوعة</p>
              <div className="mt-3 space-y-2">
                {sourcePipelines.map((pipeline) => {
                  const summary = summarizeSourceFilePipeline(pipeline);
                  return (
                    <div key={summary.id} className="rounded-lg border border-white bg-white px-3 py-2">
                      <p className="text-xs font-bold text-[#0F3D3E]">{summary.labelAr}</p>
                      <p className="mt-1 text-xs leading-6 text-stone-600">
                        {summary.fileName} - {summary.statusAr} - {summary.responseCount} استجابة منظمة
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {error && (
            <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</p>
          )}

          <div className="mt-6 flex flex-col gap-3 md:flex-row">
            <Link
              to="/students/$id/assessment"
              params={{ id }}
              className="flex-1 rounded-xl border border-stone-300 bg-white px-5 py-3 text-center text-base font-bold text-stone-700 transition hover:bg-stone-50"
            >
              رجوع
            </Link>
            <button
              type="button"
              onClick={handleNext}
              className="flex-1 rounded-xl px-5 py-3 text-base font-bold text-white transition hover:opacity-90"
              style={{ backgroundColor: "#0F3D3E" }}
            >
              التالي
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
