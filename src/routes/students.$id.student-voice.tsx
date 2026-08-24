import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { INFORMATION_TOOLS } from "@/data/information-tools";
import { InformationToolApplication } from "@/components/information-tool-application";
import { PlanComponentsStatus } from "@/components/plan-components-status";
import { loadPlanComponentStatus } from "@/components/plan-components-status-store";
import {
  hasInformationRecordResponse,
  loadInformationRecords,
  upsertInformationRecord,
} from "@/lib/information-records";
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
import type { InformationRecord } from "@/types/himam";

export const Route = createFileRoute("/students/$id/student-voice")({
  component: StudentVoicePage,
  head: () => ({
    meta: [
      { title: "صوت المتعلم - همم" },
      { name: "description", content: "استيفاء صوت المتعلم واهتماماته واختياراته." },
    ],
  }),
});

type StoredStudent = {
  id: string;
  name: string;
  center?: string;
  status?: string;
};

type AppliedMode = "yes" | "no" | "";

function loadStudent(id: string): StoredStudent | null {
  try {
    const list = JSON.parse(localStorage.getItem("himam_students") || "[]") as StoredStudent[];
    return list.find((item) => item.id === id) ?? null;
  } catch {
    return null;
  }
}

function updateJourney(id: string) {
  try {
    const list = JSON.parse(localStorage.getItem("himam_students") || "[]") as StoredStudent[];
    localStorage.setItem("himam_students", JSON.stringify(
      list.map((item) => (
        item.id === id
          ? { ...item, status: advanceStage(item.status ?? "draft", "learner_voice_completed") }
          : item
      )),
    ));
  } catch {
    /* noop */
  }
}

function skipJourney(id: string) {
  try {
    const list = JSON.parse(localStorage.getItem("himam_students") || "[]") as StoredStudent[];
    localStorage.setItem("himam_students", JSON.stringify(
      list.map((item) => (
        item.id === id
          ? { ...item, status: advanceStage(item.status ?? "draft", "learner_voice_skipped") }
          : item
      )),
    ));
  } catch {
    /* noop */
  }
}

function StudentVoicePage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [student, setStudent] = useState<StoredStudent | null>(null);
  const [componentStatus, setComponentStatus] = useState(() => loadPlanComponentStatus(id));
  const [appliedMode, setAppliedMode] = useState<AppliedMode>("");
  const [appliedToolName, setAppliedToolName] = useState("");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [draftText, setDraftText] = useState("");
  const [reviewerNotes, setReviewerNotes] = useState("");
  const [extractionWarning, setExtractionWarning] = useState("");
  const [toolCategory, setToolCategory] = useState("رؤية المتعلم");
  const [selectedLibraryToolId, setSelectedLibraryToolId] = useState("");
  const [platformRecord, setPlatformRecord] = useState<InformationRecord | null>(null);
  const [sourcePipelines, setSourcePipelines] = useState<SourceFilePipelineRecord[]>([]);
  const [error, setError] = useState("");

  const learnerVoiceTools = useMemo(() => (
    INFORMATION_TOOLS.filter((tool) => (
      tool.category === "learner_voice" ||
      tool.category === "interest_survey" ||
      tool.category === "preference_survey" ||
      tool.category === "career_interest" ||
      tool.category === "person_centered_planning"
    ))
  ), []);

  useEffect(() => {
    setStudent(loadStudent(id));
    setComponentStatus(loadPlanComponentStatus(id));
    setSourcePipelines(loadSourceFilePipelines(id));
    try {
      const saved = JSON.parse(localStorage.getItem(`himam_learner_voice_${id}`) || "null");
      if (saved) {
        setAppliedMode(saved.appliedMode ?? "");
        setAppliedToolName(saved.appliedToolName ?? "");
        setToolCategory(saved.toolCategory ?? "رؤية المتعلم");
        setSelectedLibraryToolId(saved.selectedLibraryToolId ?? "");
        if (saved.platformInformationRecordId) {
          setPlatformRecord(loadInformationRecords(id).find((record) => record.id === saved.platformInformationRecordId) ?? null);
        }
      }
    } catch {
      /* noop */
    }
  }, [id]);

  async function handleFileChange(file: File | null) {
    setUploadedFile(file);
    setDraftText("");
    setExtractionWarning("");
    if (!file) return;
    const result = await readAllowedSourceFileDraft(file);
    if (result.failureReason) {
      setExtractionWarning(result.failureReason);
    }
    setDraftText(result.statements.join("\n"));
  }

  async function saveCurrent() {
    if (!appliedMode) {
      setError("يرجى تحديد هل طُبقت أداة أو نموذج لاستيفاء صوت المتعلم.");
      return false;
    }
    if (appliedMode === "yes" && !appliedToolName.trim()) {
      setError("يرجى تحديد الأداة أو النموذج المطبق.");
      return false;
    }
    if (appliedMode === "yes" && !uploadedFile) {
      setError("يرجى رفع نتائج الأداة أو النموذج المطبق.");
      return false;
    }
    if (appliedMode === "no" && !selectedLibraryToolId) {
      setError("يرجى اختيار أداة من مكتبة صوت المتعلم.");
      return false;
    }
    const reviewedStatements = splitSourceDraftText(draftText);
    if (appliedMode === "yes" && reviewedStatements.length === 0) {
      setError("راجع مسودة قراءة الملف وأدخل بنداً وصفياً واحداً على الأقل قبل اعتماد صوت المتعلم.");
      return false;
    }
    if (appliedMode === "no" && !hasInformationRecordResponse(platformRecord)) {
      setError("يرجى تطبيق أداة صوت المتعلم داخل المنصة وإدخال استجابة وصفية واحدة على الأقل.");
      return false;
    }

    const selectedTool = learnerVoiceTools.find((tool) => tool.id === selectedLibraryToolId);
    let nextPipelines = sourcePipelines;
    if (appliedMode === "yes" && uploadedFile) {
      const readResult = await readAllowedSourceFileDraft(uploadedFile);
      const draftPipeline = buildSourceFileDraftPipeline({
        learnerId: id,
        sourceNameAr: appliedToolName.trim(),
        file: uploadedFile,
        purpose: "LEARNER_VOICE_FORM",
        statements: readResult.statements.length > 0 ? readResult.statements : reviewedStatements,
        outputChannel: "KNOWLEDGE_SUPPORT_ITEM",
        extractionFailureReason: readResult.statements.length === 0 ? readResult.failureReason : undefined,
      });
      const pipeline = applySourceExtractionReview(draftPipeline, {
        decision: "approved_for_structured_response",
        reviewerRole: "SPECIALIST",
        reviewerNotes: reviewerNotes.trim() || "راجع المختص مسودة صوت المتعلم واعتمد البنود الوصفية.",
        correctedStatements: [
          ...reviewedStatements,
          `${appliedToolName.trim()} مرفوع ومراجع كمصدر وصفي لصوت المتعلم واهتماماته وتفضيلاته.`,
        ],
        outputChannel: "KNOWLEDGE_SUPPORT_ITEM",
      });
      nextPipelines = appendSourceFilePipeline(id, pipeline);
    }
    if (appliedMode === "no" && platformRecord) {
      upsertInformationRecord(id, platformRecord);
    }
    localStorage.setItem(`himam_learner_voice_${id}`, JSON.stringify({
      appliedMode,
      appliedToolName: appliedToolName.trim(),
      uploadedFileName: uploadedFile?.name,
      uploadedFileType: uploadedFile?.type,
      toolCategory,
      selectedLibraryToolId,
      selectedLibraryToolName: selectedTool?.nameAr,
      platformInformationRecordId: platformRecord?.id,
      savedAt: new Date().toISOString(),
      outputPolicy: "knowledge_support_only",
      sourcePipelineIds: nextPipelines.map((pipeline) => pipeline.pipelineId),
    }));
    updateJourney(id);
    setSourcePipelines(nextPipelines);
    setDraftText("");
    setReviewerNotes("");
    setExtractionWarning("");
    setComponentStatus(loadPlanComponentStatus(id));
    setError("");
    return true;
  }

  async function handleNext() {
    if (!(await saveCurrent())) return;
    navigate({ to: "/students/$id/family", params: { id } });
  }

  function handleSkip() {
    skipJourney(id);
    navigate({ to: "/students/$id/family", params: { id } });
  }

  return (
    <div className="min-h-screen bg-[#FAF7F2]" dir="rtl" lang="ar">
      <header className="flex items-center justify-between px-8 py-4" style={{ backgroundColor: "#0F3D3E" }}>
        <Link
          to="/students/$id/assessment/official"
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
          <span className="font-bold text-[#0F3D3E]">صوت المتعلم</span>
        </nav>

        <PlanComponentsStatus learnerId={id} current="learnerVoice" status={componentStatus} />

        <section className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-bold text-[#D9764A]">صوت المتعلم</p>
          <h2 className="mt-1 text-2xl font-bold text-[#0F3D3E]">
            هل طبقت أي نماذج أو استبيانات لاستيفاء صوت المتعلم مثل اهتمامات المتعلم واختياراته أو رؤية المتعلم؟
          </h2>

          <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
            <button
              type="button"
              onClick={() => setAppliedMode("yes")}
              className="rounded-xl border p-4 text-right transition hover:border-[#0F3D3E]"
              style={{
                backgroundColor: appliedMode === "yes" ? "#E6F2F1" : "white",
                borderColor: appliedMode === "yes" ? "#0F3D3E" : "#E7E5E4",
              }}
            >
              <p className="text-sm font-bold text-[#0F3D3E]">نعم</p>
              <p className="mt-1 text-xs leading-6 text-stone-500">تم تطبيق أداة أو نموذج خارج المنصة، وسيتم رفع نتائجه.</p>
            </button>
            <button
              type="button"
              onClick={() => setAppliedMode("no")}
              className="rounded-xl border p-4 text-right transition hover:border-[#0F3D3E]"
              style={{
                backgroundColor: appliedMode === "no" ? "#E6F2F1" : "white",
                borderColor: appliedMode === "no" ? "#0F3D3E" : "#E7E5E4",
              }}
            >
              <p className="text-sm font-bold text-[#0F3D3E]">لا</p>
              <p className="mt-1 text-xs leading-6 text-stone-500">يمكن تطبيق أحد النماذج والأدوات التي تستعرض صوت المتعلم لإثراء الخطة الفردية التربوية.</p>
            </button>
          </div>

          {appliedMode === "yes" && (
            <div className="mt-5 grid grid-cols-1 gap-4 rounded-xl bg-stone-50 p-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold text-stone-500">حدد الأداة أو النموذج المطبق</label>
                <input
                  type="text"
                  value={appliedToolName}
                  onChange={(event) => setAppliedToolName(event.target.value)}
                  className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-800 outline-none focus:border-[#0F3D3E]"
                  placeholder="مثال: رؤية المتعلم، اختيارات وتفضيلات المتعلم، اهتمامات المتعلم"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-stone-500">نافذة تحميل النتائج</label>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.png,.jpg,.jpeg"
                  onChange={(event) => void handleFileChange(event.target.files?.[0] ?? null)}
                  className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-800 outline-none file:ml-3 file:rounded-md file:border-0 file:bg-[#0F3D3E] file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-white focus:border-[#0F3D3E]"
                />
                {uploadedFile && <p className="mt-2 text-xs font-bold text-[#0F3D3E]">{uploadedFile.name}</p>}
                {extractionWarning && (
                  <p className="mt-2 rounded-lg border border-[#D9764A]/30 bg-[#FBE9E1] px-3 py-2 text-xs leading-6 text-stone-700">
                    لم تكف القراءة الآلية للملف. أدخل أو صحح البنود الوصفية قبل الاعتماد.
                  </p>
                )}
              </div>
              <div className="md:col-span-2">
                <label className="mb-1 block text-xs font-semibold text-stone-500">مسودة قراءة الملف القابلة للتصحيح</label>
                <textarea
                  value={draftText}
                  onChange={(event) => setDraftText(event.target.value)}
                  rows={5}
                  className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm leading-7 text-stone-800 outline-none focus:border-[#0F3D3E]"
                  placeholder="راجع البنود المستخلصة من الملف أو أدخل وصف صوت المتعلم يدوياً، كل بند في سطر مستقل."
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
            </div>
          )}

          {appliedMode === "no" && (
            <div className="mt-5 rounded-xl bg-stone-50 p-4">
              <p className="text-sm leading-7 text-stone-600">
                يمكنكم تطبيق أحد النماذج والأدوات التي تستعرض صوت المتعلم لإثراء الخطة الفردية التربوية.
              </p>
              <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-stone-500">نوع أداة صوت المتعلم</label>
                  <select
                    value={toolCategory}
                    onChange={(event) => setToolCategory(event.target.value)}
                    className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-800 outline-none focus:border-[#0F3D3E]"
                  >
                    <option>رؤية المتعلم</option>
                    <option>اختيارات وتفضيلات المتعلم</option>
                    <option>اهتمامات المتعلم</option>
                  </select>
                </div>
                <div>
                  <p className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs leading-6 text-stone-600">
                    اختر الأداة في نموذج التطبيق أدناه ثم أدخل إجابات المتعلم أو ما لوحظ من اختياراته وتفضيلاته.
                  </p>
                </div>
              </div>
              <InformationToolApplication
                learnerId={id}
                tools={learnerVoiceTools}
                selectedToolId={selectedLibraryToolId}
                record={platformRecord}
                onSelectedToolIdChange={setSelectedLibraryToolId}
                onRecordChange={setPlatformRecord}
              />
            </div>
          )}

          {sourcePipelines.some((pipeline) => pipeline.file.purpose === "LEARNER_VOICE_FORM") && (
            <div className="mt-5 rounded-xl border border-[#9EC7C3] bg-[#F4FAF9] p-4">
              <p className="text-sm font-bold text-[#0F3D3E]">ملفات صوت المتعلم المراجعة</p>
              <div className="mt-3 space-y-2">
                {sourcePipelines
                  .filter((pipeline) => pipeline.file.purpose === "LEARNER_VOICE_FORM")
                  .map((pipeline) => {
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
              to="/students/$id/assessment/official"
              params={{ id }}
              className="flex-1 rounded-xl border border-stone-300 bg-white px-5 py-3 text-center text-base font-bold text-stone-700 transition hover:bg-stone-50"
            >
              رجوع
            </Link>
            <button
              type="button"
              onClick={handleSkip}
              className="flex-1 rounded-xl border border-[#D9764A] bg-white px-5 py-3 text-base font-bold text-[#D9764A] transition hover:bg-[#FBE9E1]"
            >
              تخطي
            </button>
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
