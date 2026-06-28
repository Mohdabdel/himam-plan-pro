import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/students/$id/coverage")({
  component: RecommendationPage,
  head: () => ({
    meta: [
      { title: "توصيات أداة التقييم — همم" },
      { name: "description", content: "تقييم أداة القياس المستخدمة وتوصيات الانتقال." },
    ],
  }),
});

type StoredStudent = {
  id: string;
  name: string;
  tool: string;
  center: string;
};

// Structural analysis per tool — independent of student scores.
type ToolAnalysis = {
  hasMultiplePerformances: boolean;
  missingDCDTCriteria: string[];
  weakConcepts: string[];
};

function analyzeToolCoverage(tool: string): ToolAnalysis {
  if (tool.includes("TTAP")) {
    return {
      hasMultiplePerformances: true,
      missingDCDTCriteria: ["تقرير المصير (تحديد الذات)"],
      weakConcepts: ["تقرير المصير", "الاستخدام التقني"],
    };
  }
  return {
    hasMultiplePerformances: false,
    missingDCDTCriteria: [],
    weakConcepts: [],
  };
}

function RecommendationPage() {
  const { id } = Route.useParams();
  const [student, setStudent] = useState<StoredStudent | null>(null);

  useEffect(() => {
    try {
      const list: StoredStudent[] = JSON.parse(localStorage.getItem("himam_students") || "[]");
      setStudent(list.find((x) => x.id === id) ?? null);
    } catch {
      /* noop */
    }
  }, [id]);

  const tool = student?.tool ?? "";
  const analysis = analyzeToolCoverage(tool);

  return (
    <div className="min-h-screen bg-[#FAF7F2]">
      <header
        className="flex items-center justify-between px-8 py-4"
        style={{ backgroundColor: "#0F3D3E" }}
      >
        <Link
          to="/students/$id/assessment"
          params={{ id }}
          className="rounded-lg border border-white/30 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
        >
          → رجوع
        </Link>
        <h1 className="text-2xl font-bold text-white">همم</h1>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-8 md:px-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-[#0F3D3E]">توصيات أداة التقييم</h2>
          {student && (
            <p className="mt-1 text-sm text-stone-500">{student.name} — {student.center}</p>
          )}
        </div>

        {/* Section 1 — Tool evaluation */}
        <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-base font-bold text-[#0F3D3E]">تقييم أداة القياس</h3>

          {tool ? (
            <>
              {analysis.hasMultiplePerformances ? (
                <p className="text-sm leading-7 text-stone-700">
                  يبدو أن أداة التقييم المطبقة مع الطالب قد عكست أداءات متعددة مما يزيد من موثوقيتها.
                </p>
              ) : (
                <p className="text-sm leading-7 text-stone-700">
                  أداة التقييم المستخدمة لا تنتمي إلى الأدوات الموحدة المعيارية، مما قد يؤثر على مستوى موثوقية النتائج.
                </p>
              )}

              {analysis.missingDCDTCriteria.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm leading-7 text-stone-700">
                    ولكن وفقاً لمعايير أداة تقييم الانتقال الملائم للعمر، فإن الأداة المستخدمة لم تستوفِ المعايير التالية:
                  </p>
                  <ul className="mt-2 space-y-1 pr-4">
                    {analysis.missingDCDTCriteria.map((c) => (
                      <li key={c} className="flex items-start gap-2 text-sm text-stone-700">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: "#D9764A" }} />
                        {c}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-stone-500">لم يتم تحديد أداة التقييم بعد.</p>
          )}
        </div>

        {/* Section 2 — Concept coverage gaps */}
        {analysis.weakConcepts.length > 0 && (
          <div className="mt-4 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-base font-bold text-[#0F3D3E]">مفاهيم تحتاج إلى تغطية إضافية</h3>
            <p className="text-sm leading-7 text-stone-700">
              كما أن المعلومات التي تم تصديرها من الأداة لم تغطِّ مفاهيم:{" "}
              <span className="font-semibold text-stone-900">
                {analysis.weakConcepts.join("، ")}
              </span>
            </p>
            <p className="mt-3 text-sm leading-7 text-stone-700">
              تغطية هذه المفاهيم تدعم تخطيطاً انتقالياً شاملاً ومعبراً عن الطالب.
            </p>
          </div>
        )}

        {/* Section 3 — Optional recommendation */}
        <div
          className="mt-4 rounded-2xl border p-5"
          style={{ backgroundColor: "#FBE9E1", borderColor: "#D9764A" }}
        >
          <p className="text-sm leading-7 text-stone-800">
            <span className="font-bold">توصية غير ملزمة:</span> يمكنك الاطلاع على أدوات في المكتبة قد تكون ملائمة للتطبيق.
          </p>
          <button className="mt-3 rounded-lg border border-stone-400 bg-white px-4 py-2 text-sm font-semibold text-stone-800 transition hover:bg-stone-50">
            اطّلع على المكتبة
          </button>
        </div>

        {/* Section 4 — Continue */}
        <div className="mt-8">
          <p className="mb-3 text-center text-xs text-stone-500">
            هذه المرحلة اختيارية — يمكنك المتابعة مباشرةً لوضع الخطة في أي وقت
          </p>
          <Link
            to="/students/$id/iep"
            params={{ id }}
            className="block w-full rounded-xl px-5 py-3.5 text-center text-base font-bold text-white shadow-sm transition hover:opacity-90"
            style={{ backgroundColor: "#0F3D3E" }}
          >
            المتابعة لوضع الخطة التربوية ←
          </Link>
        </div>
      </main>
    </div>
  );
}
