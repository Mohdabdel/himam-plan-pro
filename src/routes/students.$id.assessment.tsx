import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";

export const Route = createFileRoute("/students/$id/assessment")({
  component: AssessmentPage,
  head: () => ({
    meta: [
      { title: "إدخال التقييم — همم" },
      { name: "description", content: "إدخال نتائج التقييم لكل مجال." },
    ],
  }),
});

type StoredStudent = {
  id: string;
  name: string;
  birthDate: string;
  center: string;
  tool: string;
  createdAt: string;
  status: string;
};

type DomainDef = { code: string; name: string };

const TTAP_DOMAINS: DomainDef[] = [
  { code: "VS", name: "المهارات المهنية" },
  { code: "VB", name: "السلوكيات المهنية" },
  { code: "IF", name: "الأداء الوظيفي المستقل" },
  { code: "LS", name: "مهارات الترفيه" },
  { code: "FC", name: "التواصل الوظيفي" },
  { code: "IB", name: "السلوك البينشخصي" },
];

const GENERIC_DOMAINS: DomainDef[] = [
  { code: "FN", name: "المهارات الوظيفية" },
  { code: "SO", name: "المهارات الاجتماعية" },
  { code: "IL", name: "مهارات الحياة المستقلة" },
  { code: "CM", name: "مهارات التواصل" },
];

type DomainValues = { success: string; emerging: string; fail: string };

const emptyValues = (): DomainValues => ({ success: "", emerging: "", fail: "" });

function AssessmentPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [student, setStudent] = useState<StoredStudent | null>(null);
  const [values, setValues] = useState<Record<string, DomainValues>>({});
  const [showError, setShowError] = useState(false);

  const tool = student?.tool ?? "";
  const domains = useMemo<DomainDef[]>(
    () => (tool === "TTAP" ? TTAP_DOMAINS : GENERIC_DOMAINS),
    [tool],
  );

  const storageKey = `himam_assessment_${id}`;

  useEffect(() => {
    try {
      const list: StoredStudent[] = JSON.parse(localStorage.getItem("himam_students") || "[]");
      const s = list.find((x) => x.id === id) ?? null;
      setStudent(s);
    } catch {
      setStudent(null);
    }
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || "null");
      if (saved && saved.domains) {
        const restored: Record<string, DomainValues> = {};
        for (const k of Object.keys(saved.domains)) {
          const d = saved.domains[k];
          restored[k] = {
            success: d.success != null ? String(d.success) : "",
            emerging: d.emerging != null ? String(d.emerging) : "",
            fail: d.fail != null ? String(d.fail) : "",
          };
        }
        setValues(restored);
      }
    } catch {
      /* noop */
    }
  }, [id, storageKey]);

  useEffect(() => {
    const init: Record<string, DomainValues> = { ...values };
    let changed = false;
    for (const d of domains) {
      if (!init[d.code]) {
        init[d.code] = emptyValues();
        changed = true;
      }
    }
    if (changed) setValues(init);
     
  }, [domains]);

  const sums = useMemo(() => {
    const out: Record<string, number> = {};
    for (const d of domains) {
      const v = values[d.code] ?? emptyValues();
      out[d.code] = (Number(v.success) || 0) + (Number(v.emerging) || 0) + (Number(v.fail) || 0);
    }
    return out;
  }, [values, domains]);

  const completedCount = domains.filter((d) => sums[d.code] === 100).length;

  const persist = (silent: boolean) => {
    const payload = {
      tool,
      domains: Object.fromEntries(
        domains.map((d) => {
          const v = values[d.code] ?? emptyValues();
          return [
            d.code,
            {
              success: Number(v.success) || 0,
              emerging: Number(v.emerging) || 0,
              fail: Number(v.fail) || 0,
            },
          ];
        }),
      ),
      savedAt: new Date().toISOString(),
      silent,
    };
    try {
      localStorage.setItem(storageKey, JSON.stringify(payload));
    } catch {
      /* noop */
    }
  };

  const valuesRef = useRef(values);
  valuesRef.current = values;
  useEffect(() => {
    const t = setInterval(() => persist(true), 30000);
    return () => clearInterval(t);
     
  }, [tool, domains]);

  const setField = (code: string, key: keyof DomainValues, raw: string) => {
    let v = raw.replace(/[^0-9]/g, "");
    if (v !== "") {
      const n = Math.min(100, Math.max(0, Number(v)));
      v = String(n);
    }
    setValues((prev) => ({
      ...prev,
      [code]: { ...(prev[code] ?? emptyValues()), [key]: v },
    }));
  };

  const handleSubmit = () => {
    const allValid = domains.every((d) => sums[d.code] === 100);
    if (!allValid) {
      setShowError(true);
      return;
    }
    persist(false);
    navigate({ to: "/" });
  };

  const handleDraft = () => {
    persist(true);
    navigate({ to: "/" });
  };

  return (
    <div className="min-h-screen bg-[#FAF7F2]">
      <header
        className="flex items-center justify-between px-8 py-4"
        style={{ backgroundColor: "#0F3D3E" }}
      >
        <Link
          to="/"
          className="rounded-lg border border-white/30 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
        >
          → رجوع
        </Link>
        <h1 className="text-2xl font-bold text-white">همم</h1>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-8 md:px-8">
        <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-[#0F3D3E]">
                {student ? student.name : "—"}
              </h2>
              <p className="mt-1 text-sm text-stone-600">
                أداة التقييم: <span className="font-semibold text-stone-800">{tool || "—"}</span>
              </p>
            </div>
            <p className="text-sm font-medium text-stone-700">
              تم إدخال {completedCount} من {domains.length} مجالات
            </p>
          </div>
          <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-stone-100">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${(completedCount / domains.length) * 100}%`,
                backgroundColor: "#0F3D3E",
              }}
            />
          </div>
        </div>

        <section className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          {domains.map((d) => {
            const v = values[d.code] ?? emptyValues();
            const sum = sums[d.code] ?? 0;
            const ok = sum === 100;
            const touched = v.success !== "" || v.emerging !== "" || v.fail !== "";
            return (
              <div
                key={d.code}
                className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm"
              >
                <div className="flex items-baseline justify-between">
                  <h3 className="text-lg font-bold text-[#0F3D3E]">{d.name}</h3>
                  <span className="text-xs font-semibold text-stone-500">{d.code}</span>
                </div>

                <div className="mt-4 space-y-3">
                  <PercentField
                    label="نسبة النجاح"
                    value={v.success}
                    onChange={(x) => setField(d.code, "success", x)}
                  />
                  <PercentField
                    label="نسبة الناشئة"
                    value={v.emerging}
                    onChange={(x) => setField(d.code, "emerging", x)}
                  />
                  <PercentField
                    label="نسبة عدم النجاح"
                    value={v.fail}
                    onChange={(x) => setField(d.code, "fail", x)}
                  />
                </div>

                <p className="mt-3 text-xs text-stone-500">يجب أن يكون المجموع 100%</p>
                {touched && !ok && (
                  <p className="mt-1 text-xs font-semibold text-red-600">
                    المجموع يجب أن يساوي 100% (الحالي: {sum}%)
                  </p>
                )}
                {ok && (
                  <p className="mt-1 text-xs font-semibold text-green-700">✓ المجموع صحيح</p>
                )}
              </div>
            );
          })}
        </section>

        <div
          className="mt-6 rounded-2xl border p-5 text-sm leading-7 text-[#0F3D3E]"
          style={{ backgroundColor: "#E6F2F1", borderColor: "#C8DEDD" }}
        >
          همم سيترجم هذه النتائج تلقائياً إلى مستوى الأداء الحالي لكل مفهوم انتقالي
        </div>

        {showError && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            يرجى التأكد أن مجموع كل مجال يساوي 100% قبل المتابعة
          </div>
        )}

        <div className="mt-6 flex flex-col gap-3">
          <button
            onClick={handleSubmit}
            className="w-full rounded-xl px-5 py-3.5 text-base font-bold text-white shadow-sm transition hover:opacity-90"
            style={{ backgroundColor: "#0F3D3E" }}
          >
            حفظ وعرض تقرير التغطية
          </button>
          <button
            onClick={handleDraft}
            className="w-full rounded-xl border border-stone-300 bg-white px-5 py-3 text-base font-semibold text-stone-800 transition hover:bg-stone-50"
          >
            حفظ مؤقت
          </button>
        </div>
      </main>
    </div>
  );
}

function PercentField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-3">
      <span className="text-sm text-stone-700">{label}</span>
      <span className="flex items-center gap-1">
        <input
          type="number"
          min={0}
          max={100}
          inputMode="numeric"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-20 rounded-lg border border-stone-300 px-3 py-2 text-center text-sm font-semibold text-stone-900 outline-none focus:border-[#0F3D3E]"
        />
        <span className="text-sm text-stone-500">%</span>
      </span>
    </label>
  );
}
