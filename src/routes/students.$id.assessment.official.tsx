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
import {
  loadPlanComponentStatus,
  PlanComponentsStatus,
} from "@/components/plan-components-status";
import { advanceStage } from "@/lib/journey";
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
  const [upload, setUpload] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [componentStatus, setComponentStatus] = useState(() => loadPlanComponentStatus(id));

  useEffect(() => {
    const loadedStudent = loadStudent(id);
    const loadedRecords = loadAssessmentRecords(id);
    setStudent(loadedStudent);
    setRecords(loadedRecords);
    setComponentStatus(loadPlanComponentStatus(id));
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

  function handleSave() {
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

    const record = createAssessmentRecord({
      learnerId: id,
      toolId,
      assessorName,
      assessmentDate,
      ageBand: student?.ageBand,
      uploadedFileName: upload.name,
      uploadedFileType: upload.type,
    });
    const savedRecord = toolId === "OTHER_OFFICIAL_ASSESSMENT" && customToolName.trim()
      ? { ...record, toolNameAr: customToolName.trim() }
      : record;
    const next = [...records, savedRecord];
    saveAssessmentRecords(id, next);
    updateStudentAssessmentTool(id, toolId);
    setRecords(next);
    setUpload(null);
    setComponentStatus(loadPlanComponentStatus(id));
    setError("");
    return true;
  }

  function handleNext() {
    if (records.length === 0) {
      const saved = handleSave();
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
            قم بتحديد طريقة إدخال نتائج التقييم. في هذه النسخة المعتمدة للتجربة يكون المسار العملي هو رفع النتائج، أما التطبيق داخل منصة همم فهو خيار مؤجل حتى تحدد المؤسسة أدواتها التقييمية المطلوب برمجتها.
          </p>

          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-stone-200 bg-stone-50 p-4">
              <p className="text-sm font-bold text-stone-700">التطبيق بمنصة همم</p>
              <p className="mt-2 text-xs leading-6 text-stone-500">
                محفوظ كبنية مستقبلية بعد اعتماد أدوات المؤسسة وبرمجة نماذجها داخل مكتبة التقييم.
              </p>
              <button
                type="button"
                disabled
                className="mt-3 rounded-lg border border-stone-200 bg-white px-4 py-2 text-xs font-bold text-stone-400"
              >
                غير مفعّل في هذه النسخة
              </button>
            </div>

            <div className="rounded-xl border border-[#9EC7C3] bg-[#E6F2F1] p-4">
              <p className="text-sm font-bold text-[#0F3D3E]">رفع النتائج</p>
              <p className="mt-2 text-xs leading-6 text-stone-600">
                ارفع ملف نتائج التقييم أو التقرير كما طبقه المختص خارج منصة همم.
              </p>
              <input
                type="file"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.png,.jpg,.jpeg"
                onChange={(event) => setUpload(event.target.files?.[0] ?? null)}
                className="mt-3 w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-800 outline-none file:ml-3 file:rounded-md file:border-0 file:bg-[#0F3D3E] file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-white focus:border-[#0F3D3E]"
              />
              {upload && <p className="mt-2 text-xs font-bold text-[#0F3D3E]">{upload.name}</p>}
            </div>
          </div>

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
