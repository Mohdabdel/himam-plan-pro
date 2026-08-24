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

export const Route = createFileRoute("/students/$id/assessment/additional")({
  component: AdditionalSourcesPage,
  head: () => ({
    meta: [
      { title: "أدوات ومصادر إضافية - همم" },
      { name: "description", content: "إضافة مصادر معلومات داعمة للخطة التربوية الفردية." },
    ],
  }),
});

type StoredStudent = {
  id: string;
  name: string;
  center?: string;
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

function AdditionalSourcesPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [student, setStudent] = useState<StoredStudent | null>(null);
  const [componentStatus, setComponentStatus] = useState(() => loadPlanComponentStatus(id));
  const [appliedMode, setAppliedMode] = useState<AppliedMode>("");
  const [sourceName, setSourceName] = useState("");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [draftText, setDraftText] = useState("");
  const [reviewerNotes, setReviewerNotes] = useState("");
  const [extractionWarning, setExtractionWarning] = useState("");
  const [selectedToolId, setSelectedToolId] = useState("");
  const [platformRecord, setPlatformRecord] = useState<InformationRecord | null>(null);
  const [error, setError] = useState("");
  const [sourcePipelines, setSourcePipelines] = useState<SourceFilePipelineRecord[]>([]);

  const tools = useMemo(() => (
    INFORMATION_TOOLS.filter((tool) => (
      tool.category === "transition_checklist" ||
      tool.category === "person_centered_planning" ||
      tool.category === "career_interest" ||
      tool.category === "interest_survey" ||
      tool.category === "preference_survey"
    ))
  ), []);

  useEffect(() => {
    setStudent(loadStudent(id));
    setComponentStatus(loadPlanComponentStatus(id));
    setSourcePipelines(loadSourceFilePipelines(id));
    try {
      const saved = JSON.parse(localStorage.getItem(`himam_additional_sources_${id}`) || "null");
      if (saved?.selectedToolId) setSelectedToolId(saved.selectedToolId);
      if (saved?.platformInformationRecordId) {
        setPlatformRecord(loadInformationRecords(id).find((record) => record.id === saved.platformInformationRecordId) ?? null);
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
      setError("يرجى تحديد هل توجد أدوات أو مصادر إضافية تم تطبيقها.");
      return false;
    }
    if (appliedMode === "yes" && !sourceName.trim()) {
      setError("يرجى تحديد الأداة أو المصدر الإضافي.");
      return false;
    }
    if (appliedMode === "yes" && !uploadedFile) {
      setError("يرجى رفع نتائج المصدر الإضافي.");
      return false;
    }
    if (appliedMode === "no" && !selectedToolId) {
      setError("يرجى اختيار أداة أو نموذج من المكتبة.");
      return false;
    }
    if (appliedMode === "no" && !hasInformationRecordResponse(platformRecord)) {
      setError("يرجى تطبيق أداة المكتبة داخل المنصة وإدخال استجابة وصفية واحدة على الأقل.");
      return false;
    }
    const reviewedStatements = splitSourceDraftText(draftText);
    if (appliedMode === "yes" && reviewedStatements.length === 0) {
      setError("راجع مسودة قراءة الملف وأدخل بنداً واحداً على الأقل قبل تحويلها إلى استجابات منظمة.");
      return false;
    }

    const selectedTool = tools.find((tool) => tool.id === selectedToolId);
    let nextPipelines = sourcePipelines;
    if (appliedMode === "yes" && uploadedFile) {
      const readResult = await readAllowedSourceFileDraft(uploadedFile);
      const draftPipeline = buildSourceFileDraftPipeline({
        learnerId: id,
        sourceNameAr: sourceName.trim(),
        file: uploadedFile,
        purpose: "ADDITIONAL_INFORMATION_SOURCE",
        statements: readResult.statements.length > 0 ? readResult.statements : reviewedStatements,
        outputChannel: "KNOWLEDGE_SUPPORT_ITEM",
        extractionFailureReason: readResult.statements.length === 0 ? readResult.failureReason : undefined,
      });
      const pipeline = applySourceExtractionReview(draftPipeline, {
        decision: "approved_for_structured_response",
        reviewerRole: "SPECIALIST",
        reviewerNotes: reviewerNotes.trim() || "راجع المختص مسودة قراءة المصدر الإضافي واعتمد البنود المصححة.",
        correctedStatements: [
          ...reviewedStatements,
          `${sourceName.trim()} مرفوع ومراجع كمصدر معلومات إضافي لدعم فهم مستوى الأداء الحالي والسياق.`,
        ],
        outputChannel: "KNOWLEDGE_SUPPORT_ITEM",
      });
      nextPipelines = appendSourceFilePipeline(id, pipeline);
    }
    if (appliedMode === "no" && platformRecord) {
      upsertInformationRecord(id, platformRecord);
    }
    localStorage.setItem(`himam_additional_sources_${id}`, JSON.stringify({
      appliedMode,
      sourceName: sourceName.trim(),
      uploadedFileName: uploadedFile?.name,
      uploadedFileType: uploadedFile?.type,
      selectedToolId,
      selectedToolName: selectedTool?.nameAr,
      platformInformationRecordId: platformRecord?.id,
      savedAt: new Date().toISOString(),
      outputPolicy: "knowledge_support_only",
      sourcePipelineIds: nextPipelines.map((pipeline) => pipeline.pipelineId),
    }));
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
    navigate({ to: "/students/$id/coverage", params: { id } });
  }

  return (
    <div className="min-h-screen bg-[#FAF7F2]" dir="rtl" lang="ar">
      <header className="flex items-center justify-between px-8 py-4" style={{ backgroundColor: "#0F3D3E" }}>
        <Link
          to="/students/$id/family"
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
          <span className="font-bold text-[#0F3D3E]">أدوات ومصادر إضافية</span>
        </nav>

        <PlanComponentsStatus learnerId={id} current="additionalSources" status={componentStatus} />

        <section className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-bold text-[#D9764A]">أدوات ومصادر إضافية</p>
          <h2 className="mt-1 text-2xl font-bold text-[#0F3D3E]">
            هل هناك تقييمات أو استبيانات جمع معلومات إضافية تم تطبيقها مع المتعلم؟
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
              <p className="mt-1 text-xs leading-6 text-stone-500">تم تطبيق مصدر إضافي، وسيتم رفع نتائجه.</p>
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
              <p className="mt-1 text-xs leading-6 text-stone-500">يمكن تطبيق أحد النماذج الإضافية الواردة بمكتبة الأدوات والنماذج.</p>
            </button>
          </div>

          {appliedMode === "yes" && (
            <div className="mt-5 grid grid-cols-1 gap-4 rounded-xl bg-stone-50 p-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold text-stone-500">حدد الأداة أو النموذج المطبق</label>
                <input
                  type="text"
                  value={sourceName}
                  onChange={(event) => setSourceName(event.target.value)}
                  className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-800 outline-none focus:border-[#0F3D3E]"
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
                    لم تُستخدم قراءة آلية نهائية للملف. أدخل أو صحح البنود في مسودة القراءة قبل الاعتماد.
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
                  placeholder="راجع البنود المستخلصة من الملف أو أدخلها يدوياً، كل بند في سطر مستقل."
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
                يمكن تطبيق أحد النماذج والأدوات الإضافية داخل المنصة لإنتاج محتوى وصفي داعم قابل لإعادة الاستخدام في دعم المعرفة.
              </p>
              <InformationToolApplication
                learnerId={id}
                tools={tools}
                selectedToolId={selectedToolId}
                record={platformRecord}
                onSelectedToolIdChange={setSelectedToolId}
                onRecordChange={setPlatformRecord}
              />
            </div>
          )}

          {error && (
            <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</p>
          )}

          {sourcePipelines.length > 0 && (
            <div className="mt-5 rounded-xl border border-[#9EC7C3] bg-[#F4FAF9] p-4">
              <p className="text-sm font-bold text-[#0F3D3E]">مصادر مرفوعة تمت مراجعتها</p>
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

          <div className="mt-6 flex flex-col gap-3 md:flex-row">
            <Link
              to="/students/$id/family"
              params={{ id }}
              className="flex-1 rounded-xl border border-stone-300 bg-white px-5 py-3 text-center text-base font-bold text-stone-700 transition hover:bg-stone-50"
            >
              رجوع
            </Link>
            <button
              type="button"
              onClick={() => navigate({ to: "/students/$id/coverage", params: { id } })}
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
