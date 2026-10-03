import { createFileRoute, Link, Outlet, useLocation } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PlanComponentsStatus } from "@/components/plan-components-status";
import { loadPlanComponentStatus } from "@/components/plan-components-status-store";
import { JourneyStepper } from "@/components/journey-stepper";

export const Route = createFileRoute("/students/$id/assessment")({
  component: InformationSourcesHubPage,
  head: () => ({
    meta: [
      { title: "مصادر جمع المعلومات - همم" },
      { name: "description", content: "مكونات الخطة التربوية الفردية ومصادر جمع المعلومات." },
    ],
  }),
});

type StoredStudent = {
  id: string;
  name: string;
  center?: string;
  status?: string;
};

const CARDS = [
  {
    title: "أداة التقييم الرسمية",
    body: "حدد أداة التقييم الرسمية التي تم اعتمادها مع المتعلم، ثم اختر مصدر نتائجها: تطبيق داخل منصة همم لاحقا أو رفع نتائج التقييم.",
    href: "/students/$id/assessment/official",
    stateKey: "assessment",
  },
  {
    title: "صوت المتعلم",
    body: "تسجيل ما تم تطبيقه من نماذج أو استبيانات لصوت المتعلم، أو اختيار أداة من مكتبة همم لتطبيقها.",
    href: "/students/$id/student-voice",
    stateKey: "learnerVoice",
  },
  {
    title: "صوت الأسرة",
    body: "تسجيل رؤية الأسرة وأولوياتها ومخاوفها، أو تطبيق إحدى أدوات رؤية الأسرة المتاحة في مكتبة همم.",
    href: "/students/$id/family",
    stateKey: "familyVoice",
  },
  {
    title: "أدوات ومصادر إضافية",
    body: "مساحة لإضافة تقييمات أو استبيانات أو قوائم جمع معلومات إضافية من مكتبة الأدوات والنماذج.",
    href: "/students/$id/assessment/additional",
    stateKey: "additionalSources",
  },
  {
    title: "مراجعة كفاية المعلومات ومستوى الأداء الحالي",
    body: "مراجعة كفاية المعلومات وبناء قراءة مستوى الأداء الحالي بعد جمع مصادر المعلومات الأساسية والداعمة.",
    href: "/students/$id/coverage",
    stateKey: "currentLevel",
  },
] as const;

function loadStudent(id: string): StoredStudent | null {
  try {
    const list = JSON.parse(localStorage.getItem("himam_students") || "[]") as StoredStudent[];
    return list.find((item) => item.id === id) ?? null;
  } catch {
    return null;
  }
}

function InformationSourcesHubPage() {
  const { id } = Route.useParams();
  const location = useLocation();
  const [student, setStudent] = useState<StoredStudent | null>(null);
  const [componentStatus, setComponentStatus] = useState(() => loadPlanComponentStatus(id));
  const [componentDetailsOpen, setComponentDetailsOpen] = useState(false);

  const hubPath = `/students/${id}/assessment`;
  const isHubPage = location.pathname === hubPath || location.pathname === `${hubPath}/`;

  useEffect(() => {
    setStudent(loadStudent(id));
    setComponentStatus(loadPlanComponentStatus(id));
  }, [id]);

  if (!isHubPage) {
    return <Outlet />;
  }

  return (
    <div className="min-h-screen bg-[#FAF7F2]" dir="rtl" lang="ar">
      <header className="flex items-center justify-between px-8 py-4" style={{ backgroundColor: "#0F3D3E" }}>
        <Link to="/" className="rounded-lg border border-white/30 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10">
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
          <span className="font-bold text-[#0F3D3E]">مصادر جمع المعلومات</span>
        </nav>

        <section className="mb-6 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-bold text-[#D9764A]">مكونات الخطة التربوية الفردية</p>
          <h2 className="mt-1 text-2xl font-bold text-[#0F3D3E]">مصادر جمع المعلومات</h2>
          <p className="mt-2 max-w-3xl text-sm leading-7 text-stone-600">
            هذه الشاشة تعرض مكونات ومراحل جمع المعلومات قبل إعداد الخطة. وظيفتها إظهار ما تم استيفاؤه من المكونات، وفتح كل مكون في صفحة مستقلة دون توليد هدف أو اعتماد خطة.
          </p>
          {student && (
            <p className="mt-3 text-xs font-semibold text-stone-500">
              {student.name} {student.center ? `- ${student.center}` : ""}
            </p>
          )}
        </section>

        <JourneyStepper studentId={id} currentStep="assessment" status={student?.status} />

        <section className="mb-6 rounded-2xl border border-[#9EC7C3] bg-[#F4FAF9] p-5 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-bold text-[#D9764A]">الخطوة التالية</p>
              <h3 className="mt-1 text-lg font-bold text-[#0F3D3E]">ابدأ من أداة التقييم الرسمية ثم تابع بزر التالي في كل شاشة</h3>
              <p className="mt-2 max-w-2xl text-sm leading-7 text-stone-600">
                المكونات الفرعية مخفية هنا لتقليل التشتيت، وتظهر فقط عند الحاجة للمراجعة أو العودة إلى مكون محدد.
              </p>
            </div>
            <Link
              to="/students/$id/assessment/official"
              params={{ id }}
              className="rounded-xl bg-[#0F3D3E] px-5 py-3 text-center text-sm font-bold text-white transition hover:opacity-90"
            >
              التالي: أداة التقييم الرسمية ←
            </Link>
          </div>
        </section>

        <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="text-base font-bold text-[#0F3D3E]">مكونات جمع المعلومات</h3>
              <p className="mt-1 text-sm leading-7 text-stone-600">
                مساحة مراجعة اختيارية وليست مسارا إضافيا. افتحها فقط عند الحاجة لمعرفة حالة المكونات أو الرجوع إلى صفحة محددة.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setComponentDetailsOpen((open) => !open)}
              className="rounded-xl border border-[#0F3D3E] px-4 py-2 text-sm font-bold text-[#0F3D3E] transition hover:bg-[#0F3D3E] hover:text-white"
              aria-expanded={componentDetailsOpen}
            >
              {componentDetailsOpen ? "إخفاء مكونات جمع المعلومات" : "عرض مكونات جمع المعلومات"}
            </button>
          </div>

          {componentDetailsOpen && (
            <div className="mt-5 space-y-4">
              <PlanComponentsStatus learnerId={id} current="assessment" status={componentStatus} />

              <p className="text-xs font-bold text-stone-500">
                البطاقات التالية للمراجعة أو العودة لمكوّن محدد، أما المسار الأساسي فيبدأ من زر التالي أعلاه.
              </p>

              <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {CARDS.map((card) => {
                  const done = componentStatus[card.stateKey];
                  return (
                    <Link
                      key={card.title}
                      to={card.href}
                      params={{ id }}
                      className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm transition hover:border-[#0F3D3E] hover:shadow-md"
                    >
                      <div className="mb-3 flex items-start justify-between gap-3">
                        <h3 className="text-base font-bold text-[#0F3D3E]">{card.title}</h3>
                        <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-bold text-stone-600">
                          {done ? "ص" : "—"}
                        </span>
                      </div>
                      <p className="text-sm leading-7 text-stone-600">{card.body}</p>
                    </Link>
                  );
                })}
              </section>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
