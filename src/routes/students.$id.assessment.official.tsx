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
  isDevelopmentalAssessmentUnder9,
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
import type { AssessmentRecord, AssessmentRating } from "@/types/himam";

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

type EntryMode = "upload" | "platform";

type DomainInput = {
  rating: AssessmentRating;
  note: string;
};

const RATING_LABELS: Record<AssessmentRating, string> = {
  pass: "متقن/ناجح",
  emerge: "ناشئ/يحتاج دعم",
  fail: "لم يظهر بعد",
  not_observed: "غير ملاحظ",
};

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

function buildAppliedToolStatements(domainInputs: Record<string, DomainInput>) {
  return Object.values(domainInputs)
    .filter((domain) => domain.rating !== "not_observed")
    .map((domain) => domain.note.trim())
    .filter(Boolean)
    .map((note) => note.length >= 20 ? note : "")
    .filter(Boolean);
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
  const [assessorName, setAssessorName] = useState("");
  const [assessmentDate, setAssessmentDate] = useState("");
  const [entryMode, setEntryMode] = useState<EntryMode>("upload");
  const [domainInputs, setDomainInputs] = useState<Record<string, DomainInput>>({});
  const [upload, setUpload] = useState<File | null>(null);
  const [draftText, setDraftText] = useState("");
  const [reviewerNotes, setReviewerNotes] = useState("");
  const [extractionWarning, setExtractionWarning] = useState("");
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
  const developmentalUnder9 = isDevelopmentalAssessmentUnder9({
    ageYears: student?.ageYears ?? null,
    selectedToolId: toolId,
  });

  useEffect(() => {
    if (!selectedTool) return;
    setDomainInputs((current) => {
      const next: Record<string, DomainInput> = {};
      for (const domain of selectedTool.domains) {
        next[domain.code] = current[domain.code] ?? { rating: "not_observed", note: "" };
      }
      return next;
    });
  }, [selectedTool]);

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
    if (entryMode === "upload" && !upload) {
      setError("يرجى رفع نتائج التقييم الرسمي أو التقرير.");
      return false;
    }
    const appliedToolStatements = selectedTool
      ? buildAppliedToolStatements(domainInputs)
      : [];
    const reviewedStatements = entryMode === "platform"
      ? appliedToolStatements
      : splitSourceDraftText(draftText);
    if (reviewedStatements.length === 0) {
      setError(entryMode === "platform"
        ? "أدخل نتيجة مفسرة واحدة على الأقل في مجال من مجالات أداة التقييم قبل الحفظ."
        : "راجع مسودة قراءة الملف وأدخل نتيجة تقييم رسمية مفسرة واحدة على الأقل قبل تحويلها إلى استجابات منظمة.");
      return false;
    }
    if (!hasInterpretedAssessmentStatements(reviewedStatements)) {
      setError("الحد الأدنى ليس رفع الملف فقط؛ اكتب نتيجة مفسرة مثل الدرجة أو الملاحظة المهنية ومعناها الوظيفي قبل المتابعة.");
      return false;
    }

    const record = createAssessmentRecord({
      learnerId: id,
      toolId,
      assessorName,
      assessmentDate,
      ageBand: student?.ageBand,
      uploadedFileName: entryMode === "upload" ? upload?.name : undefined,
      uploadedFileType: entryMode === "upload" ? upload?.type : undefined,
    });
    const savedRecord = toolId === "OTHER_OFFICIAL_ASSESSMENT" && customToolName.trim()
      ? { ...record, toolNameAr: customToolName.trim() }
      : record;
    const completedRecord: AssessmentRecord = {
      ...savedRecord,
      status: "completed",
      domains: savedRecord.domains.map((domain) => {
        const input = domainInputs[domain.domainCode];
        return input
          ? { ...domain, rating: input.rating, note: input.note.trim() || undefined }
          : domain;
      }),
    };
    const readResult = entryMode === "upload" && upload
      ? await readAllowedSourceFileDraft(upload)
      : { statements: reviewedStatements };
    const pipelineFile = entryMode === "upload" && upload
      ? upload
      : {
          name: `تطبيق ${savedRecord.toolNameAr} داخل منصة همم.himam-assessment`,
          type: "application/himam-assessment+json",
          size: reviewedStatements.join("\n").length,
        };
    const sourceDraftPipeline = buildSourceFileDraftPipeline({
      learnerId: id,
      sourceNameAr: `نتائج ${savedRecord.toolNameAr}`,
      file: pipelineFile,
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
          entryMode === "platform"
            ? "تم تطبيق أداة من مكتبة التقييم داخل المنصة وتحويل نتائجها المفسرة إلى استجابات منظمة قبل استخدامه في بناء الأهداف."
            : "تم إنشاء مسار قراءة ومراجعة للملف المرفوع وتحويله إلى استجابات منظمة قبل استخدامه في بناء الأهداف.",
        ],
      },
    ];
    saveAssessmentRecords(id, next);
    const nextPipelines = appendSourceFilePipeline(id, sourcePipeline);
    updateStudentAssessmentTool(id, toolId);
    setRecords(next);
    setSourcePipelines(nextPipelines);
    setUpload(null);
    setDraftText("");
    setDomainInputs({});
    setReviewerNotes("");
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
            اختر اسم الأداة المطبقة من القائمة. عند اختيار "أخرى" تفتح مساحة لكتابة اسم الأداة يدويا.
          </p>

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
            <div>
              <label className="mb-1 block text-xs font-semibold text-stone-500">اسم المقيم أو المختص</label>
              <input
                type="text"
                value={assessorName}
                onChange={(event) => setAssessorName(event.target.value)}
                className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-800 outline-none focus:border-[#0F3D3E]"
                placeholder="اختياري"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-stone-500">تاريخ التطبيق</label>
              <input
                type="date"
                value={assessmentDate}
                onChange={(event) => setAssessmentDate(event.target.value)}
                className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-800 outline-none focus:border-[#0F3D3E]"
              />
            </div>
          </div>
        </section>

        <section className="mt-6 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
          <h3 className="text-xl font-bold text-[#0F3D3E]">نتائج التقييم الرسمي</h3>
          <p className="mt-2 text-sm leading-7 text-stone-600">
            قم بتحديد طريقة إدخال نتائج التقييم: رفع ملف نتائج مطبق خارج المنصة، أو تطبيق أداة من مكتبة همم وإدخال نتائجها المفسرة داخل المنصة.
          </p>

          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div
              className="rounded-xl border p-4"
              style={{
                backgroundColor: entryMode === "platform" ? "#E6F2F1" : "#F8FAFC",
                borderColor: entryMode === "platform" ? "#0F3D3E" : "#E7E5E4",
              }}
            >
              <p className="text-sm font-bold text-[#0F3D3E]">التطبيق بمنصة همم</p>
              <p className="mt-2 text-xs leading-6 text-stone-500">
                استخدم مجالات الأداة المختارة من المكتبة، وأدخل لكل مجال نتيجة مفسرة قابلة للمراجعة.
              </p>
              <button
                type="button"
                onClick={() => setEntryMode("platform")}
                className="mt-3 rounded-lg border border-[#0F3D3E] bg-white px-4 py-2 text-xs font-bold text-[#0F3D3E]"
              >
                تطبيق الأداة داخل المنصة
              </button>
            </div>

            <div
              className="rounded-xl border p-4"
              style={{
                backgroundColor: entryMode === "upload" ? "#E6F2F1" : "#FFFFFF",
                borderColor: entryMode === "upload" ? "#0F3D3E" : "#9EC7C3",
              }}
            >
              <p className="text-sm font-bold text-[#0F3D3E]">رفع النتائج</p>
              <p className="mt-2 text-xs leading-6 text-stone-600">
                ارفع ملف نتائج التقييم أو التقرير كما طبقه المختص خارج منصة همم.
              </p>
              <input
                type="file"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.png,.jpg,.jpeg"
                onChange={(event) => {
                  setEntryMode("upload");
                  void handleUploadChange(event.target.files?.[0] ?? null);
                }}
                className="mt-3 w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-800 outline-none file:ml-3 file:rounded-md file:border-0 file:bg-[#0F3D3E] file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-white focus:border-[#0F3D3E]"
              />
              {upload && <p className="mt-2 text-xs font-bold text-[#0F3D3E]">{upload.name}</p>}
              {extractionWarning && (
                <p className="mt-2 rounded-lg border border-[#D9764A]/30 bg-[#FBE9E1] px-3 py-2 text-xs leading-6 text-stone-700">
                  لم تُنشأ قراءة آلية قابلة للاعتماد لهذا النوع من الملفات. أدخل نتائج التقييم الرسمية المفسرة يدوياً في مسودة القراءة قبل المتابعة.
                </p>
              )}
            </div>
          </div>

          {entryMode === "platform" && selectedTool && (
            <div className="mt-5 rounded-xl border border-[#9EC7C3] bg-white p-4">
              <p className="text-sm font-bold text-[#0F3D3E]">تطبيق {selectedTool.nameAr}</p>
              <p className="mt-1 text-xs leading-6 text-stone-600">
                أدخل نتيجة مفسرة لكل مجال تم تقييمه. المجال غير الملاحظ لا يدخل في الحد الأدنى ولا يستخدم كخط أساس.
              </p>
              <div className="mt-4 space-y-3">
                {selectedTool.domains.map((domain) => {
                  const input = domainInputs[domain.code] ?? { rating: "not_observed", note: "" };
                  return (
                    <div key={domain.code} className="rounded-lg border border-stone-200 bg-stone-50 p-3">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-bold text-[#0F3D3E]">{domain.nameAr}</p>
                          <p className="mt-1 text-[11px] leading-5 text-stone-500">
                            المفاهيم المرتبطة: {domain.linkedConcepts.join("، ")}
                          </p>
                        </div>
                        <select
                          value={input.rating}
                          onChange={(event) => setDomainInputs((current) => ({
                            ...current,
                            [domain.code]: {
                              ...(current[domain.code] ?? { note: "" }),
                              rating: event.target.value as AssessmentRating,
                            },
                          }))}
                          className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs font-bold text-stone-700 outline-none focus:border-[#0F3D3E]"
                        >
                          {Object.entries(RATING_LABELS).map(([rating, label]) => (
                            <option key={rating} value={rating}>{label}</option>
                          ))}
                        </select>
                      </div>
                      <textarea
                        value={input.note}
                        onChange={(event) => setDomainInputs((current) => ({
                          ...current,
                          [domain.code]: {
                            ...(current[domain.code] ?? { rating: "not_observed" }),
                            note: event.target.value,
                          },
                        }))}
                        rows={2}
                        className="mt-3 w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs leading-6 text-stone-800 outline-none focus:border-[#0F3D3E]"
                        placeholder="اكتب نتيجة مفسرة: ماذا ظهر؟ ما مستوى الدعم؟ وما المعنى الوظيفي لهذه النتيجة؟"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {upload && (
            <div className="mt-5 rounded-xl border border-stone-200 bg-white p-4">
              <label className="mb-1 block text-xs font-semibold text-stone-500">مسودة قراءة الملف القابلة للتصحيح</label>
              <textarea
                value={draftText}
                onChange={(event) => setDraftText(event.target.value)}
                rows={5}
                className="w-full rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-sm leading-7 text-stone-800 outline-none focus:border-[#0F3D3E]"
                placeholder="مثال: في مجال التواصل الوظيفي حصل المتعلم على مستوى ناشئ؛ يحتاج إلى دعم بصري للبدء والاستجابة في سياق المجموعة. اكتب كل نتيجة مفسرة في سطر مستقل."
              />
              <label className="mt-3 mb-1 block text-xs font-semibold text-stone-500">ملاحظة المراجعة</label>
              <input
                type="text"
                value={reviewerNotes}
                onChange={(event) => setReviewerNotes(event.target.value)}
                className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-800 outline-none focus:border-[#0F3D3E]"
                placeholder="اختياري - سبب اعتماد البنود أو التصحيح"
              />
            </div>
          )}

          {selectedTool && (
            <div className="mt-5 rounded-xl border border-stone-200 bg-stone-50 p-4">
              <p className="text-sm font-bold text-[#0F3D3E]">ملاحظة معالجة معرفية</p>
              <p className="mt-2 text-xs leading-6 text-stone-600">{selectedTool.descriptionAr}</p>
              {coverageReview.reviewed && coverageReview.missingAreas.length > 0 && (
                <p className="mt-2 text-xs leading-6 text-stone-600">
                  توصيات تغطية مرتبطة بالعمر: {coverageReview.missingAreas.map((area) => coverageAreaLabelAr(area)).join("، ")}
                </p>
              )}
              {developmentalUnder9 && (
                <p className="mt-2 rounded-lg border border-[#D9764A]/30 bg-[#FBE9E1] px-3 py-2 text-xs leading-6 text-stone-700">
                  نقطة واجبة المناقشة لاحقا: عمر المتعلم أقل من 9 سنوات والأداة نمائية؛ معالجة النتائج وترشيح المنهج والدروس ستحتاج مسارا نمائيا مختلفا.
                </p>
              )}
            </div>
          )}

          <div className="mt-5 rounded-xl border border-[#9EC7C3] bg-[#F4FAF9] p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-[#0F3D3E]">مكتبة أدوات التقييم المتاحة للتجربة</p>
                <p className="mt-1 text-xs leading-6 text-stone-600">
                  هذه مكتبة محولات مرجعية للأدوات المطبقة خارج همم. لا تطبق الأداة كاملة داخل المنصة حالياً، لكنها توضح الأداة ومجالاتها وتدعم تفسير النتائج المرفوعة يدوياً.
                </p>
              </div>
              <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-[#0F3D3E]">
                {ASSESSMENT_TOOLS.filter((tool) => tool.id !== "OTHER_OFFICIAL_ASSESSMENT").length} أدوات
              </span>
            </div>
            <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
              {ASSESSMENT_TOOLS.filter((tool) => tool.id !== "OTHER_OFFICIAL_ASSESSMENT").map((tool) => (
                <button
                  key={tool.id}
                  type="button"
                  onClick={() => setToolId(tool.id)}
                  className="rounded-lg border border-white bg-white px-3 py-2 text-right transition hover:border-[#0F3D3E]"
                >
                  <p className="text-xs font-bold text-[#0F3D3E]">{tool.nameAr}</p>
                  <p className="mt-1 line-clamp-2 text-[11px] leading-5 text-stone-500">{tool.descriptionAr}</p>
                </button>
              ))}
            </div>
          </div>

          {records.length > 0 && (
            <div className="mt-5 space-y-3">
              {records.map((record) => (
                <div key={record.id} className="rounded-xl border border-stone-100 bg-white p-4">
                  <p className="text-sm font-bold text-[#0F3D3E]">{record.toolNameAr}</p>
                  <p className="mt-1 text-xs text-stone-500">
                    الملف: {record.uploadedFileName || "غير مرفوع"} {record.assessmentDate ? `- تاريخ التطبيق: ${record.assessmentDate}` : ""}
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
