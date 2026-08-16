import { createFileRoute, Link, Outlet, useLocation } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { loadAssessmentRecords } from "@/lib/assessment-records";

export const Route = createFileRoute("/students/$id/iep")({
  component: PlanPreparationHubPage,
  head: () => ({
    meta: [
      { title: "إعداد الخطة التربوية الفردية - همم" },
      {
        name: "description",
        content: "فهرس مكونات إعداد الخطة التربوية الفردية قبل توليد الأهداف.",
      },
    ],
  }),
});

type StoredStudent = {
  id: string;
  name: string;
  birthDate?: string;
  ageYears?: number | null;
  diagnosis?: string;
  center?: string;
  learnerEntryType?: "new" | "returning";
  status?: string;
};

type ActiveSection = "basic" | "currentLevel" | "specialistVision";

type ComponentCard = {
  key: ActiveSection | "goals";
  title: string;
  body: string;
  status: string;
};

const TEAL = "#0F3D3E";
const ORANGE = "#D9764A";

function safeParse<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function loadStudent(id: string): StoredStudent | null {
  const list = safeParse<StoredStudent[]>("himam_students") ?? [];
  return list.find((item) => item.id === id) ?? null;
}

function PlanPreparationHubPage() {
  const { id } = Route.useParams();
  const location = useLocation();
  const hubPath = `/students/${id}/iep`;
  const isHubPage = location.pathname === hubPath || location.pathname === `${hubPath}/`;

  const [student, setStudent] = useState<StoredStudent | null>(null);
  const [activeSection, setActiveSection] = useState<ActiveSection>("basic");
  const [specialistVision, setSpecialistVision] = useState("");
  const [savedMessage, setSavedMessage] = useState("");

  useEffect(() => {
    setStudent(loadStudent(id));
    const savedVision = safeParse<{ specialistVision?: string }>(`himam_plan_preparation_${id}`);
    if (savedVision?.specialistVision) setSpecialistVision(savedVision.specialistVision);
  }, [id]);

  if (!isHubPage) {
    return <Outlet />;
  }

  const assessmentRecords = loadAssessmentRecords(id);
  const learnerVoice = safeParse(`himam_learner_voice_${id}`);
  const familyVoice = safeParse(`himam_family_${id}`);
  const additionalSources = safeParse(`himam_additional_sources_${id}`);

  const cards: ComponentCard[] = [
    {
      key: "basic",
      title: "البيانات الأساسية",
      body: "مراجعة اسم المتعلم، العمر، التشخيص، نوع المتعلم، والمركز أو المؤسسة قبل إعداد الخطة.",
      status: student?.name && typeof student.ageYears === "number" ? "مكتمل أساسياً" : "يحتاج مراجعة",
    },
    {
      key: "currentLevel",
      title: "مستوى الأداء الحالي",
      body: "عرض ملخص مصادر جمع المعلومات التي ستغذي صياغة مستوى الأداء الحالي دون اعتماد آلي.",
      status: assessmentRecords.length > 0 ? "مصدر تقييم موجود" : "ينقصه تقييم رسمي",
    },
    {
      key: "specialistVision",
      title: "رؤية المختص للخطة التربوية الفردية",
      body: "مساحة مهنية يصوغ فيها المختص اتجاه الخطة قبل توليد الأهداف.",
      status: specialistVision.trim() ? "مدونة" : "غير مدونة",
    },
    {
      key: "goals",
      title: "توليد الأهداف",
      body: "يفتح صفحة مستقلة تجمع هيكلة توليد الأهداف مع شاشة الدعم المعرفي بجانبها.",
      status: "صفحة مستقلة",
    },
  ];

  function saveSpecialistVision() {
    localStorage.setItem(
      `himam_plan_preparation_${id}`,
      JSON.stringify({ specialistVision, savedAt: new Date().toISOString() }),
    );
    setSavedMessage("تم حفظ رؤية المختص كمسودة قابلة للمراجعة البشرية.");
  }

  return (
    <div className="min-h-screen bg-[#FAF7F2]" dir="rtl" lang="ar">
      <header className="flex items-center justify-between px-8 py-4" style={{ backgroundColor: TEAL }}>
        <Link
          to="/students/$id/coverage"
          params={{ id }}
          className="rounded-lg border border-white/30 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
        >
          رجوع
        </Link>
        <h1 className="text-2xl font-bold text-white">همم</h1>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8 md:px-8">
        <nav aria-label="مسار الصفحة" className="mb-2.5 flex flex-wrap items-center gap-1.5 text-xs text-stone-400">
          <Link to="/" className="font-bold text-stone-600 underline">لوحة المتعلمين</Link>
          <span>←</span>
          <span>{student?.name ?? "المتعلم"}</span>
          <span>←</span>
          <Link to="/students/$id/coverage" params={{ id }} className="font-bold text-stone-600 underline">
            مراجعة كفاية المعلومات
          </Link>
          <span>←</span>
          <span className="font-bold text-[#0F3D3E]">إعداد الخطة</span>
        </nav>

        <section className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-bold" style={{ color: ORANGE }}>فهرس مكونات الخطة</p>
          <h2 className="mt-1 text-2xl font-bold text-[#0F3D3E]">إعداد الخطة التربوية الفردية</h2>
          <p className="mt-2 max-w-3xl text-sm leading-7 text-stone-600">
            تبدأ هذه المرحلة بمراجعة مكونات الخطة التي سيستند إليها المختص. صوت الأسرة وصوت المتعلم يظلان مصادر داعمة من المرحلة السابقة، ولا يظهران هنا كتبويبات مستقلة داخل إعداد الخطة.
          </p>
        </section>

        <section className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-4">
          {cards.map((card) => {
            const isActive = activeSection === card.key;
            if (card.key === "goals") {
              return (
                <Link
                  key={card.key}
                  to="/students/$id/iep/goals"
                  params={{ id }}
                  className="rounded-2xl border bg-white p-5 text-right shadow-sm transition hover:border-[#0F3D3E] hover:shadow-md"
                >
                  <ComponentCardContent card={card} active={false} />
                </Link>
              );
            }

            return (
              <button
                key={card.key}
                type="button"
                onClick={() => setActiveSection(card.key as ActiveSection)}
                className="rounded-2xl border bg-white p-5 text-right shadow-sm transition hover:border-[#0F3D3E] hover:shadow-md"
                style={{ borderColor: isActive ? TEAL : "#E7E5E4" }}
              >
                <ComponentCardContent card={card} active={isActive} />
              </button>
            );
          })}
        </section>

        <section className="mt-5 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
          {activeSection === "basic" && <BasicDataSection student={student} />}
          {activeSection === "currentLevel" && (
            <CurrentLevelSection
              assessmentCount={assessmentRecords.length}
              learnerVoice={Boolean(learnerVoice)}
              familyVoice={Boolean(familyVoice)}
              additionalSources={Boolean(additionalSources)}
            />
          )}
          {activeSection === "specialistVision" && (
            <SpecialistVisionSection
              value={specialistVision}
              onChange={setSpecialistVision}
              onSave={saveSpecialistVision}
              savedMessage={savedMessage}
            />
          )}
        </section>
      </main>
    </div>
  );
}

function ComponentCardContent({ card, active }: { card: ComponentCard; active: boolean }) {
  return (
    <>
      <div className="mb-3 flex items-start justify-between gap-3">
        <h3 className="text-base font-bold text-[#0F3D3E]">{card.title}</h3>
        <span
          className="shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold"
          style={{
            backgroundColor: active ? "#E6F2F1" : "#F5F5F4",
            color: active ? TEAL : "#57534E",
          }}
        >
          {card.status}
        </span>
      </div>
      <p className="text-sm leading-7 text-stone-600">{card.body}</p>
    </>
  );
}

function BasicDataSection({ student }: { student: StoredStudent | null }) {
  const rows = [
    ["اسم المتعلم", student?.name ?? "غير مدخل"],
    ["العمر", typeof student?.ageYears === "number" ? `${student.ageYears} سنة` : "غير مدخل"],
    ["التشخيص", student?.diagnosis || "غير مدخل"],
    ["نوع المتعلم", student?.learnerEntryType === "returning" ? "متعلم سابق" : student?.learnerEntryType === "new" ? "متعلم جديد" : "غير محدد"],
    ["المركز أو المؤسسة", student?.center || "غير مدخل"],
  ];

  return (
    <div>
      <h3 className="text-lg font-bold text-[#0F3D3E]">البيانات الأساسية</h3>
      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
        {rows.map(([label, value]) => (
          <div key={label} className="rounded-xl border border-stone-200 bg-stone-50 p-4">
            <div className="text-xs font-bold text-stone-500">{label}</div>
            <div className="mt-1 text-sm font-semibold text-stone-800">{value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CurrentLevelSection(props: {
  assessmentCount: number;
  learnerVoice: boolean;
  familyVoice: boolean;
  additionalSources: boolean;
}) {
  const rows = [
    ["التقييم الرسمي", props.assessmentCount > 0 ? `${props.assessmentCount} سجل محفوظ` : "غير مكتمل"],
    ["صوت المتعلم", props.learnerVoice ? "متاح كمصدر داعم" : "غير موثق"],
    ["صوت الأسرة", props.familyVoice ? "متاح كمصدر داعم" : "غير موثق"],
    ["مصادر إضافية", props.additionalSources ? "متاحة كمصدر داعم" : "غير موثقة"],
  ];

  return (
    <div>
      <h3 className="text-lg font-bold text-[#0F3D3E]">مستوى الأداء الحالي</h3>
      <p className="mt-2 text-sm leading-7 text-stone-600">
        هذا الملخص لا يحل محل صياغة المختص لمستوى الأداء الحالي، لكنه يوضح مصادر المعلومات المتاحة التي ستظهر لاحقاً في شاشة الدعم المعرفي.
      </p>
      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
        {rows.map(([label, value]) => (
          <div key={label} className="rounded-xl border border-stone-200 bg-stone-50 p-4">
            <div className="text-xs font-bold text-stone-500">{label}</div>
            <div className="mt-1 text-sm font-semibold text-stone-800">{value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SpecialistVisionSection(props: {
  value: string;
  onChange: (value: string) => void;
  onSave: () => void;
  savedMessage: string;
}) {
  return (
    <div>
      <h3 className="text-lg font-bold text-[#0F3D3E]">رؤية المختص للخطة التربوية الفردية</h3>
      <p className="mt-2 text-sm leading-7 text-stone-600">
        تستخدم هذه الرؤية كمسودة مهنية توجه بناء الأهداف، ولا تعد اعتماداً نهائياً للخطة.
      </p>
      <textarea
        value={props.value}
        onChange={(event) => props.onChange(event.target.value)}
        rows={6}
        className="mt-4 w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm leading-7 text-stone-800 outline-none focus:border-[#0F3D3E]"
        placeholder="اكتب رؤية المختص للخطة، الأولويات المهنية، والسياقات التي يجب مراعاتها عند توليد الأهداف..."
      />
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={props.onSave}
          className="rounded-lg bg-[#0F3D3E] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#0b2f30]"
        >
          حفظ المسودة
        </button>
        {props.savedMessage && <span className="text-sm font-semibold text-emerald-700">{props.savedMessage}</span>}
      </div>
    </div>
  );
}
