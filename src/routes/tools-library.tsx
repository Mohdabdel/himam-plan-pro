import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ASSESSMENT_TOOLS } from "@/data/assessment-tools";
import { INFORMATION_TOOLS } from "@/data/information-tools";

export const Route = createFileRoute("/tools-library")({
  component: ToolsLibraryPage,
  head: () => ({
    meta: [
      { title: "مكتبة الأدوات المجمعة - همم" },
      { name: "description", content: "مكتبة أدوات التقييم ومصادر جمع المعلومات في منصة همم." },
    ],
  }),
});

type StoredStudent = {
  id: string;
  name: string;
  center?: string;
};

function loadStudents() {
  try {
    return JSON.parse(localStorage.getItem("himam_students") || "[]") as StoredStudent[];
  } catch {
    return [];
  }
}

function informationToolTarget(category: string) {
  if (category === "family_vision") return "/students/$id/family";
  if (category === "learner_voice" || category === "interest_survey" || category === "preference_survey") {
    return "/students/$id/student-voice";
  }
  return "/students/$id/assessment/additional";
}

function ToolsLibraryPage() {
  const [students, setStudents] = useState<StoredStudent[]>([]);
  const [selectedLearnerId, setSelectedLearnerId] = useState("");

  useEffect(() => {
    const list = loadStudents();
    setStudents(list);
    setSelectedLearnerId(list[0]?.id ?? "");
  }, []);

  const selectedStudent = useMemo(
    () => students.find((student) => student.id === selectedLearnerId) ?? null,
    [students, selectedLearnerId],
  );

  return (
    <div className="min-h-screen bg-[#FAF7F2]" dir="rtl" lang="ar">
      <header className="flex items-center justify-between px-8 py-4" style={{ backgroundColor: "#0F3D3E" }}>
        <Link to="/" className="rounded-lg border border-white/30 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10">
          لوحة المتعلمين
        </Link>
        <h1 className="text-2xl font-bold text-white">همم</h1>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8 md:px-8">
        <section className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-bold text-[#D9764A]">مكتبة الأدوات المجمعة</p>
          <h2 className="mt-1 text-2xl font-bold text-[#0F3D3E]">اختر أداة ثم اربطها بمستفيد</h2>
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto]">
            <select
              value={selectedLearnerId}
              onChange={(event) => setSelectedLearnerId(event.target.value)}
              className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-800 outline-none focus:border-[#0F3D3E]"
            >
              <option value="">اختر مستفيداً مسجلاً</option>
              {students.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.name}{student.center ? ` - ${student.center}` : ""}
                </option>
              ))}
            </select>
            <Link
              to="/students/new"
              className="rounded-lg bg-[#0F3D3E] px-4 py-2 text-center text-sm font-bold text-white transition hover:opacity-90"
            >
              مستفيد جديد
            </Link>
          </div>
          {selectedStudent && (
            <p className="mt-3 text-xs font-semibold text-stone-500">
              سيتم فتح الأداة للمستفيد: {selectedStudent.name}
            </p>
          )}
        </section>

        <section className="mt-6">
          <h3 className="text-lg font-bold text-[#0F3D3E]">أدوات التقييم الرسمية</h3>
          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
            {ASSESSMENT_TOOLS.map((tool) => (
              <Link
                key={tool.id}
                to={selectedLearnerId ? "/students/$id/assessment/official" : "/students/new"}
                params={selectedLearnerId ? { id: selectedLearnerId } : undefined}
                className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm transition hover:border-[#0F3D3E]"
              >
                <p className="text-sm font-bold text-[#0F3D3E]">{tool.nameAr}</p>
                <p className="mt-1 text-xs leading-6 text-stone-600">{tool.descriptionAr}</p>
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-8">
          <h3 className="text-lg font-bold text-[#0F3D3E]">أدوات ومصادر جمع المعلومات الوصفية</h3>
          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
            {INFORMATION_TOOLS.map((tool) => (
              <Link
                key={tool.id}
                to={selectedLearnerId ? informationToolTarget(tool.category) : "/students/new"}
                params={selectedLearnerId ? { id: selectedLearnerId } : undefined}
                className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm transition hover:border-[#0F3D3E]"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-bold text-[#0F3D3E]">{tool.nameAr}</p>
                  <span className="rounded-full bg-[#F4FAF9] px-2 py-1 text-[11px] font-bold text-[#0F3D3E]">
                    {tool.questions.length} بنود
                  </span>
                </div>
                <p className="mt-1 text-xs leading-6 text-stone-600">{tool.descriptionAr}</p>
                {tool.reference && (
                  <div className="mt-3 rounded-lg border border-stone-100 bg-stone-50 p-3">
                    <p className="text-[11px] font-bold text-[#0F3D3E]">المرجعية: {tool.reference.titleAr}</p>
                    <p className="mt-1 text-[11px] leading-5 text-stone-500">{tool.reference.publisherAr}</p>
                    <p className="mt-1 text-[11px] leading-5 text-stone-500">{tool.reference.usageNoteAr}</p>
                  </div>
                )}
              </Link>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
