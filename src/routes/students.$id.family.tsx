import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { INFORMATION_TOOLS } from "@/data/information-tools";
import { InformationToolApplication } from "@/components/information-tool-application";
import { PlanComponentsStatus } from "@/components/plan-components-status";
import { StructuredUploadReview } from "@/components/structured-upload-review";
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
  type SourceFilePipelineRecord,
} from "@/lib/source-file-pipeline";
import {
  buildStructuredUploadStatements,
  getStructuredUploadSections,
  missingRequiredStructuredUploadSections,
  type StructuredUploadSectionValues,
} from "@/lib/structured-upload-sections";
import type { InformationRecord } from "@/types/himam";

export const Route = createFileRoute("/students/$id/family")({
  component: FamilyVoicePage,
  head: () => ({
    meta: [
      { title: "صوت الأسرة - همم" },
      { name: "description", content: "استيفاء رؤية الأسرة وأولوياتها ومخاوفها." },
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

function advanceFamilyStatus(id: string, stage: "family_completed" | "family_skipped") {
  try {
    const list = JSON.parse(localStorage.getItem("himam_students") || "[]") as StoredStudent[];
    localStorage.setItem("himam_students", JSON.stringify(
      list.map((item) => (
        item.id === id
          ? { ...item, status: advanceStage(item.status ?? "draft", stage) }
          : item
      )),
    ));
  } catch {
    /* noop */
  }
}

function FamilyVoicePage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [student, setStudent] = useState<StoredStudent | null>(null);
  const [componentStatus, setComponentStatus] = useState(() => loadPlanComponentStatus(id));
  const [appliedMode, setAppliedMode] = useState<AppliedMode>("");
  const [appliedToolName, setAppliedToolName] = useState("");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [extractedDraftText, setExtractedDraftText] = useState("");
  const [structuredValues, setStructuredValues] = useState<StructuredUploadSectionValues>({});
  const [reviewerNotes, setReviewerNotes] = useState("");
  const [extractionWarning, setExtractionWarning] = useState("");
  const [selectedLibraryToolId, setSelectedLibraryToolId] = useState("");
  const [platformRecord, setPlatformRecord] = useState<InformationRecord | null>(null);
  const [platformToolSaved, setPlatformToolSaved] = useState(false);
  const [sourcePipelines, setSourcePipelines] = useState<SourceFilePipelineRecord[]>([]);
  const [error, setError] = useState("");

  const familyTools = useMemo(() => (
    INFORMATION_TOOLS.filter((tool) => tool.category === "family_vision")
  ), []);
  const uploadSections = useMemo(() => getStructuredUploadSections("FAMILY_VISION_FORM"), []);

  useEffect(() => {
    setStudent(loadStudent(id));
    setComponentStatus(loadPlanComponentStatus(id));
    setSourcePipelines(loadSourceFilePipelines(id));
    try {
      const saved = JSON.parse(localStorage.getItem(`himam_family_${id}`) || "null");
      if (saved) {
        setAppliedMode(saved.appliedMode ?? "");
        setAppliedToolName(saved.appliedToolName ?? "");
        setSelectedLibraryToolId(saved.selectedLibraryToolId ?? "");
        if (saved.platformInformationRecordId) {
          setPlatformRecord(loadInformationRecords(id).find((record) => record.id === saved.platformInformationRecordId) ?? null);
          setPlatformToolSaved(true);
        }
      }
    } catch {
      /* noop */
    }
  }, [id]);

  async function handleFileChange(file: File | null) {
    setUploadedFile(file);
    setExtractedDraftText("");
    setStructuredValues({});
    setExtractionWarning("");
    if (!file) return;
    const result = await readAllowedSourceFileDraft(file);
    if (result.failureReason) {
      setExtractionWarning(result.failureReason);
    }
    setExtractedDraftText(result.statements.join("\n"));
  }

  function handlePlatformRecordChange(record: InformationRecord | null) {
    setPlatformRecord(record);
    setPlatformToolSaved(false);
  }

  function handlePlatformToolSubmit() {
    if (!selectedLibraryToolId || !platformRecord) {
      setError("يرجى اختيار أداة من مكتبة صوت الأسرة.");
      return false;
    }
    if (!hasInformationRecordResponse(platformRecord)) {
      setError("يرجى إدخال استجابة وصفية واحدة على الأقل قبل تسجيل الأداة.");
      return false;
    }
    upsertInformationRecord(id, platformRecord);
    setPlatformToolSaved(true);
    setError("");
    return true;
  }

  async function saveCurrent() {
    if (!appliedMode) {
      setError("يرجى تحديد هل طُبقت أداة أو نموذج لاستيفاء صوت الأسرة.");
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
      setError("يرجى اختيار أداة من مكتبة صوت الأسرة.");
      return false;
    }
    const missingSections = missingRequiredStructuredUploadSections(uploadSections, structuredValues);
    const reviewedStatements = buildStructuredUploadStatements(uploadSections, structuredValues);
    if (appliedMode === "yes" && missingSections.length > 0) {
      setError(`يرجى تعبئة عناوين التصنيف المطلوبة قبل اعتماد صوت الأسرة: ${missingSections.map((section) => section.labelAr).join("، ")}`);
      return false;
    }
    if (appliedMode === "no" && !platformToolSaved) {
      setError("يرجى الضغط على زر تسجيل إجابات الأداة قبل الانتقال، أو تطبيق أداة إضافية ثم تسجيلها.");
      return false;
    }

    const selectedTool = familyTools.find((tool) => tool.id === selectedLibraryToolId);
    let nextPipelines = sourcePipelines;
    if (appliedMode === "yes" && uploadedFile) {
      const readResult = await readAllowedSourceFileDraft(uploadedFile);
      const draftPipeline = buildSourceFileDraftPipeline({
        learnerId: id,
        sourceNameAr: appliedToolName.trim(),
        file: uploadedFile,
        purpose: "FAMILY_VISION_FORM",
        statements: readResult.statements.length > 0 ? readResult.statements : reviewedStatements,
        outputChannel: "KNOWLEDGE_SUPPORT_ITEM",
        extractionFailureReason: readResult.statements.length === 0 ? readResult.failureReason : undefined,
      });
      const pipeline = applySourceExtractionReview(draftPipeline, {
        decision: "approved_for_structured_response",
        reviewerRole: "SPECIALIST",
        reviewerNotes: reviewerNotes.trim() || "راجع المختص مسودة صوت الأسرة واعتمد البنود الوصفية.",
        correctedStatements: [
          ...reviewedStatements,
          `${appliedToolName.trim()} مرفوع ومراجع كمصدر وصفي لرؤية الأسرة وأولوياتها ومخاوفها.`,
        ],
        outputChannel: "KNOWLEDGE_SUPPORT_ITEM",
      });
      nextPipelines = appendSourceFilePipeline(id, pipeline);
    }
    if (appliedMode === "no" && platformRecord) {
      upsertInformationRecord(id, platformRecord);
    }
    localStorage.setItem(`himam_family_${id}`, JSON.stringify({
      appliedMode,
      appliedToolName: appliedToolName.trim(),
      uploadedFileName: uploadedFile?.name,
      uploadedFileType: uploadedFile?.type,
      selectedLibraryToolId,
      selectedLibraryToolName: selectedTool?.nameAr,
      platformInformationRecordId: platformRecord?.id,
      savedAt: new Date().toISOString(),
      outputPolicy: "knowledge_support_only",
      sourcePipelineIds: nextPipelines.map((pipeline) => pipeline.pipelineId),
    }));
    advanceFamilyStatus(id, "family_completed");
    setSourcePipelines(nextPipelines);
    setExtractedDraftText("");
    setStructuredValues({});
    setReviewerNotes("");
    setExtractionWarning("");
    setComponentStatus(loadPlanComponentStatus(id));
    setError("");
    return true;
  }

  async function handleNext() {
    if (!(await saveCurrent())) return;
    navigate({ to: "/students/$id/assessment/additional", params: { id } });
  }

  function handleSkip() {
    advanceFamilyStatus(id, "family_skipped");
    navigate({ to: "/students/$id/assessment/additional", params: { id } });
  }

  return (
    <div className="min-h-screen bg-[#FAF7F2]" dir="rtl" lang="ar">
      <header className="flex items-center justify-between px-8 py-4" style={{ backgroundColor: "#0F3D3E" }}>
        <Link
          to="/students/$id/student-voice"
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
          <span className="font-bold text-[#0F3D3E]">صوت الأسرة</span>
        </nav>

        <PlanComponentsStatus learnerId={id} current="familyVoice" status={componentStatus} />

        <section className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-bold text-[#D9764A]">صوت الأسرة</p>
          <h2 className="mt-1 text-2xl font-bold text-[#0F3D3E]">
            هل طبقت أي نماذج أو استبيانات لاستيفاء صوت الأسرة مثل رؤية الأسرة للخطة التربوية الفردية أو أولويات ومخاوف الأسرة؟
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
              <p className="mt-1 text-xs leading-6 text-stone-500">يمكن تطبيق أحد النماذج والأدوات التي تستعرض صوت الأسرة لإثراء الخطة الفردية التربوية.</p>
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
                  placeholder="مثال: رؤية الأسرة للخطة الفردية، أولويات ومخاوف الأسرة"
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
              <StructuredUploadReview
                sections={uploadSections}
                values={structuredValues}
                extractedDraftText={extractedDraftText}
                reviewerNotes={reviewerNotes}
                onValuesChange={setStructuredValues}
                onReviewerNotesChange={setReviewerNotes}
              />
            </div>
          )}

          {appliedMode === "no" && (
            <div className="mt-5 rounded-xl bg-stone-50 p-4">
              <p className="text-sm leading-7 text-stone-600">
                يمكنكم تطبيق أحد النماذج والأدوات التي تستعرض صوت الأسرة لإثراء الخطة الفردية التربوية.
              </p>
              <p className="mt-3 rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs leading-6 text-stone-600">
                اختر الأداة مباشرة من القائمة، ثم أدخل رؤية الأسرة أو أولوياتها ومخاوفها.
              </p>
              {selectedLibraryToolId === "FAMILY_VISION_PICTURE_CARDS" && (
                <FamilyPictureCardsSelfApplication />
              )}
              <InformationToolApplication
                learnerId={id}
                tools={familyTools}
                selectedToolId={selectedLibraryToolId}
                record={platformRecord}
                onSelectedToolIdChange={setSelectedLibraryToolId}
                onRecordChange={handlePlatformRecordChange}
                onSubmit={handlePlatformToolSubmit}
                successMessage="تم تسجيل إجابات الأداة وحفظها ببروفايل المتعلم. يمكن تطبيق أداة إضافية من المكتبة أو الضغط على التالي."
              />
            </div>
          )}

          {sourcePipelines.some((pipeline) => pipeline.file.purpose === "FAMILY_VISION_FORM") && (
            <div className="mt-5 rounded-xl border border-[#9EC7C3] bg-[#F4FAF9] p-4">
              <p className="text-sm font-bold text-[#0F3D3E]">ملفات صوت الأسرة المراجعة</p>
              <div className="mt-3 space-y-2">
                {sourcePipelines
                  .filter((pipeline) => pipeline.file.purpose === "FAMILY_VISION_FORM")
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
              to="/students/$id/student-voice"
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

function FamilyPictureCardsSelfApplication() {
  const scenes = [
    { title: "اختيار بين نشاطين", prompt: "ما الخيار الذي تتمنى الأسرة أن يشارك فيه المتعلم أكثر؟" },
    { title: "التعبير عن حاجة", prompt: "ما المساعدة أو الوسيلة التي تجعل التعبير أوضح؟" },
    { title: "روتين عناية صباحية", prompt: "ما الخطوة التي يمكن أن تصبح أكثر استقلالية؟" },
    { title: "تنقل في مكان مألوف", prompt: "ما علامة الأمان أو الدعم التي تحتاجها الأسرة؟" },
    { title: "نشاط مع الأقران", prompt: "ما شكل المشاركة الاجتماعية المناسبة الآن؟" },
    { title: "موقف سلامة", prompt: "ما السلوك الذي تريد الأسرة الحفاظ عليه أو تعليمه؟" },
  ];

  return (
    <div className="mt-4 rounded-2xl border border-[#9EC7C3] bg-white p-4">
      <p className="text-sm font-bold text-[#0F3D3E]">تطبيق ذاتي موجه للأسرة</p>
      <p className="mt-1 text-xs leading-6 text-stone-600">
        تعرض البطاقات أمام الأسرة أثناء الجلسة، ويستخدمها المختص كحوار قصير قبل تسجيل اختيارات الأسرة في الأداة أدناه.
      </p>
      <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
        {scenes.map((scene, index) => (
          <article key={scene.title} className="overflow-hidden rounded-xl border border-stone-200 bg-stone-50">
            <div className="flex h-24 items-center justify-center bg-[#E6F2F1] px-4 text-center text-sm font-bold leading-6 text-[#0F3D3E]">
              بطاقة {index + 1}: {scene.title}
            </div>
            <div className="p-3">
              <p className="text-xs leading-6 text-stone-600">{scene.prompt}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {["أولوية", "قوة", "يحتاج دعم", "ليس الآن"].map((choice) => (
                  <span key={choice} className="rounded-full bg-white px-2 py-1 text-[10px] font-bold text-stone-600">
                    {choice}
                  </span>
                ))}
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
