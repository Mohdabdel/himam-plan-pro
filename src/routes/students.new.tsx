import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ensureLearnerProfile } from "@/lib/profile-repository";

export const Route = createFileRoute("/students/new")({
  component: NewStudentPage,
  head: () => ({
    meta: [
      { title: "إضافة متعلم جديد — همم" },
      { name: "description", content: "إضافة البيانات الأساسية للمتعلم في منصة همم." },
    ],
  }),
});

type LearnerRecordStatus = "NEW" | "RETURNING" | "UNKNOWN_HISTORY" | "";
type AgeBand = "UNDER_14" | "AGE_14_PLUS";

function calculateAgeYears(birthDate: string): number | null {
  if (!birthDate) return null;
  const birth = new Date(`${birthDate}T00:00:00`);
  if (Number.isNaN(birth.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDelta = today.getMonth() - birth.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && today.getDate() < birth.getDate())) {
    age -= 1;
  }
  return age >= 0 ? age : null;
}

function getAgeBand(ageYears: number | null): AgeBand | null {
  if (ageYears === null) return null;
  return ageYears >= 14 ? "AGE_14_PLUS" : "UNDER_14";
}

function NewStudentPage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [learnerRecordStatus, setLearnerRecordStatus] = useState<LearnerRecordStatus>("");
  const [center, setCenter] = useState("");
  const [error, setError] = useState("");

  const ageYears = useMemo(() => calculateAgeYears(birthDate), [birthDate]);
  const ageBand = getAgeBand(ageYears);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !birthDate || !learnerRecordStatus || !center.trim()) {
      setError("يرجى إكمال الحقول المطلوبة في البيانات الأساسية");
      return;
    }
    setError("");

    const newStudent = {
      id: crypto.randomUUID(),
      name: name.trim(),
      diagnosis: diagnosis.trim(),
      birthDate,
      ageYears,
      ageBand,
      learnerRecordStatus,
      center: center.trim(),
      institution: center.trim(),
      // Backward-compatible placeholder until assessment moves to the tools hub.
      tool: "",
      createdAt: new Date().toISOString(),
      status: "not_started" as const,
    };

    try {
      const existing = JSON.parse(localStorage.getItem("himam_students") || "[]");
      localStorage.setItem("himam_students", JSON.stringify([...existing, newStudent]));
    } catch {
      localStorage.setItem("himam_students", JSON.stringify([newStudent]));
    }

    ensureLearnerProfile({
      learnerId: newStudent.id,
      learnerNameAr: newStudent.name,
    });
    navigate({ to: "/students/$id/assessment", params: { id: newStudent.id } });
  };

  return (
    <div className="min-h-screen bg-[#FAF7F2]">
      <header className="flex items-center justify-between px-8 py-4" style={{ backgroundColor: "#0F3D3E" }}>
        <Link to="/" className="rounded-lg px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10">
          → رجوع
        </Link>
        <h1 className="text-2xl font-bold text-white">همم</h1>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-10 md:px-8">
        <div className="mb-8">
          <p className="text-sm font-semibold text-[#D9764A]">الخطوة الأولى</p>
          <h2 className="mt-1 text-3xl font-bold text-[#0F3D3E]">البيانات الأساسية</h2>
          <p className="mt-2 text-sm leading-7 text-stone-600">
            هذا القسم ينشئ ملف المتعلم فقط. لا يحدد مستوى الأداء ولا يقترح هدفا ولا يعتمد خطة.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 rounded-2xl border border-stone-200 bg-white p-8 shadow-sm">
          <div className="space-y-5">
            <div>
              <label className="mb-2 block text-sm font-semibold text-stone-800">اسم المتعلم *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="اكتب الاسم المعتمد في ملف المتعلم"
                className="w-full rounded-lg border border-stone-300 bg-white px-4 py-3 text-right text-stone-900 outline-none transition focus:border-[#0F3D3E]"
              />
              <p className="mt-1 text-xs text-stone-400">تعريفي فقط، ولا ينتج عنه أي حكم على الأداء أو الأهداف.</p>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-stone-800">التشخيص</label>
              <input
                type="text"
                value={diagnosis}
                onChange={(e) => setDiagnosis(e.target.value)}
                placeholder="مثال: اضطراب طيف التوحد، إعاقة ذهنية، أو اتركه فارغا"
                className="w-full rounded-lg border border-stone-300 bg-white px-4 py-3 text-right text-stone-900 outline-none transition focus:border-[#0F3D3E]"
              />
              <p className="mt-1 text-xs text-stone-400">معلومة سياقية للدعم والفهم، وليست دليلا على مستوى أو حاجة.</p>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-stone-800">تاريخ الميلاد / العمر *</label>
              <input
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                className="w-full rounded-lg border border-stone-300 bg-white px-4 py-3 text-right text-stone-900 outline-none transition focus:border-[#0F3D3E]"
              />
              <div className="mt-3 rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-700">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold">العمر المحسوب:</span>
                  <span>{ageYears === null ? "—" : `${ageYears} سنة`}</span>
                  {ageBand && (
                    <span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-[#0F3D3E]">
                      {ageBand === "AGE_14_PLUS" ? "AGE_14_PLUS" : "UNDER_14"}
                    </span>
                  )}
                </div>
              </div>
              {ageBand === "AGE_14_PLUS" && (
                <div className="mt-3 rounded-xl border border-[#D9764A]/40 bg-[#FBE9E1] px-4 py-3 text-sm leading-7 text-stone-800">
                  <p className="font-bold text-[#0F3D3E]">مؤشر مراجعة انتقالية مرتفع</p>
                  <p>
                    هذه الفئة العمرية تتطلب انتباها إضافيا إلى ملاءمة التقييم للتخطيط الانتقالي،
                    وعلاقة الأهداف بالحياة الحالية والمستقبلية، وصوت المتعلم وتقرير المصير.
                  </p>
                  <p className="mt-1 text-xs font-semibold text-stone-600">
                    هذا المؤشر لا يحدد مستوى المتعلم ولا يمنع متابعة الخطة.
                  </p>
                </div>
              )}
            </div>

            <div>
              <label className="mb-3 block text-sm font-semibold text-stone-800">حالة المتعلم *</label>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <StatusOption
                  label="متعلم جديد"
                  description="لا يوجد تاريخ سابق معتمد داخل همم."
                  selected={learnerRecordStatus === "NEW"}
                  onClick={() => setLearnerRecordStatus("NEW")}
                />
                <StatusOption
                  label="متعلم سابق"
                  description="توجد خطط أو تقارير سابقة تحتاج مراجعة."
                  selected={learnerRecordStatus === "RETURNING"}
                  onClick={() => setLearnerRecordStatus("RETURNING")}
                />
                <StatusOption
                  label="غير مؤكد"
                  description="لم يتم حسم وجود تاريخ سابق بعد."
                  selected={learnerRecordStatus === "UNKNOWN_HISTORY"}
                  onClick={() => setLearnerRecordStatus("UNKNOWN_HISTORY")}
                />
              </div>
              {learnerRecordStatus === "RETURNING" && (
                <p className="mt-2 rounded-lg bg-stone-50 px-3 py-2 text-xs leading-6 text-stone-600">
                  وجود تاريخ سابق لا يعني أن البيانات السابقة تمثل الأداء الحالي. سيظهر لاحقا تنبيه لجمع أو مراجعة
                  الخطط والتقارير السابقة.
                </p>
              )}
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-stone-800">المركز / المؤسسة *</label>
              <input
                type="text"
                value={center}
                onChange={(e) => setCenter(e.target.value)}
                placeholder="مثال: مركز التواصل، برنامج التأهيل المهني"
                className="w-full rounded-lg border border-stone-300 bg-white px-4 py-3 text-right text-stone-900 outline-none transition focus:border-[#0F3D3E]"
              />
              <p className="mt-1 text-xs text-stone-400">يحدد انتماء الملف وسياقه المؤسسي، ولا ينتج عنه مستوى أو هدف.</p>
            </div>
          </div>

          {error && (
            <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="w-full rounded-lg py-4 text-base font-bold text-white transition hover:opacity-90"
            style={{ backgroundColor: "#0F3D3E" }}
          >
            إنشاء الملف والمتابعة إلى أدوات جمع البيانات ←
          </button>
        </form>
      </main>
    </div>
  );
}

function StatusOption({
  label,
  description,
  selected,
  onClick,
}: {
  label: string;
  description: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border p-4 text-right transition ${
        selected ? "border-[#0F3D3E] bg-[#E6F2F1]" : "border-stone-200 bg-white hover:border-stone-300"
      }`}
    >
      <span className="block text-sm font-bold text-[#0F3D3E]">{label}</span>
      <span className="mt-1 block text-xs leading-5 text-stone-500">{description}</span>
    </button>
  );
}
