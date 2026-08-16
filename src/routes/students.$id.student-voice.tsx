import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { INFORMATION_TOOLS } from "@/data/information-tools";
import {
  loadPlanComponentStatus,
  PlanComponentsStatus,
} from "@/components/plan-components-status";
import { advanceStage } from "@/lib/journey";

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
  const [toolCategory, setToolCategory] = useState("رؤية المتعلم");
  const [selectedLibraryToolId, setSelectedLibraryToolId] = useState("");
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
    try {
      const saved = JSON.parse(localStorage.getItem(`himam_learner_voice_${id}`) || "null");
      if (saved) {
        setAppliedMode(saved.appliedMode ?? "");
        setAppliedToolName(saved.appliedToolName ?? "");
        setToolCategory(saved.toolCategory ?? "رؤية المتعلم");
        setSelectedLibraryToolId(saved.selectedLibraryToolId ?? "");
      }
    } catch {
      /* noop */
    }
  }, [id]);

  function saveCurrent() {
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

    const selectedTool = learnerVoiceTools.find((tool) => tool.id === selectedLibraryToolId);
    localStorage.setItem(`himam_learner_voice_${id}`, JSON.stringify({
      appliedMode,
      appliedToolName: appliedToolName.trim(),
      uploadedFileName: uploadedFile?.name,
      uploadedFileType: uploadedFile?.type,
      toolCategory,
      selectedLibraryToolId,
      selectedLibraryToolName: selectedTool?.nameAr,
      savedAt: new Date().toISOString(),
      outputPolicy: "knowledge_support_only",
    }));
    updateJourney(id);
    setComponentStatus(loadPlanComponentStatus(id));
    setError("");
    return true;
  }

  function handleNext() {
    if (!saveCurrent()) return;
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
                  onChange={(event) => setUploadedFile(event.target.files?.[0] ?? null)}
                  className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-800 outline-none file:ml-3 file:rounded-md file:border-0 file:bg-[#0F3D3E] file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-white focus:border-[#0F3D3E]"
                />
                {uploadedFile && <p className="mt-2 text-xs font-bold text-[#0F3D3E]">{uploadedFile.name}</p>}
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
                  <label className="mb-1 block text-xs font-semibold text-stone-500">الأدوات والنماذج المتاحة لتغطية صوت المتعلم</label>
                  <select
                    value={selectedLibraryToolId}
                    onChange={(event) => setSelectedLibraryToolId(event.target.value)}
                    className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-800 outline-none focus:border-[#0F3D3E]"
                  >
                    <option value="">اختر الأداة</option>
                    {learnerVoiceTools.map((tool) => (
                      <option key={tool.id} value={tool.id}>{tool.nameAr}</option>
                    ))}
                  </select>
                </div>
              </div>
              {selectedLibraryToolId && (
                <div className="mt-4 rounded-lg border border-stone-200 bg-white p-3">
                  <p className="text-xs leading-6 text-stone-600">
                    {learnerVoiceTools.find((tool) => tool.id === selectedLibraryToolId)?.descriptionAr}
                  </p>
                  {learnerVoiceTools.find((tool) => tool.id === selectedLibraryToolId)?.externalUrl && (
                    <a
                      href={learnerVoiceTools.find((tool) => tool.id === selectedLibraryToolId)?.externalUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-flex text-xs font-bold text-[#0F3D3E] underline"
                    >
                      الذهاب لتطبيق الأداة المختارة
                    </a>
                  )}
                </div>
              )}
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
