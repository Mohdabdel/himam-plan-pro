import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { getItemsByDomain, TTAP_ITEMS, type TTAPDomain } from "../data/ttap-items";
import { ITEM_RATING_LABELS, ITEM_RATING_WEIGHTS, computeCoverage, type ItemRating, type ItemClassifications, type DomainScores } from "../lib/coverage-engine";

export const Route = createFileRoute("/students/$id/assessment")({
  component: AssessmentPage,
  head: () => ({
    meta: [
      { title: "إدخال التقييم — همم" },
      { name: "description", content: "إدخال نتائج التقييم لكل مجال." },
    ],
  }),
});

const TOOLS = [
  "TTAP - Transition Assessment Profile (2nd Edition)",
  "TEACCH Transition Assessment Profile - Informal Assessment",
  "School Inventory of Problem Solving Skills (SIPSS)",
  "مقياس مناصرة الذات للمراهقين ذوي الإعاقة الذهنية البسيطة",
  "مقياس تطور السلوك التواصلي والرمزي (CSBS)",
  "مصفوفة التواصل (Communication Matrix)",
  "أداة أخرى",
];

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
const emptyDomain = (): DomainValues => ({ success: "", emerging: "", fail: "" });


function isTTAP(tool: string) {
  return tool.includes("TTAP");
}

function AssessmentPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();

  const [student, setStudent] = useState<StoredStudent | null>(null);
  const [tool, setTool] = useState("");
  const [domainScores, setDomainScores] = useState<Record<string, DomainValues>>({});
  const [itemRatings, setItemRatings] = useState<ItemClassifications>({});
  const [expandedDomains, setExpandedDomains] = useState<Set<string>>(new Set());
  const [showItemsSection, setShowItemsSection] = useState(false);
  const [showError, setShowError] = useState(false);

  const domains = useMemo<DomainDef[]>(() => (isTTAP(tool) ? TTAP_DOMAINS : GENERIC_DOMAINS), [tool]);

  const scoreKey = `himam_assessment_${id}`;
  const itemKey = `himam_items_${id}`;

  useEffect(() => {
    try {
      const list: StoredStudent[] = JSON.parse(localStorage.getItem("himam_students") || "[]");
      const s = list.find((x) => x.id === id) ?? null;
      setStudent(s);
      if (s) setTool(s.tool);
    } catch {
      /* noop */
    }
    try {
      const saved = JSON.parse(localStorage.getItem(scoreKey) || "null");
      if (saved?.domains) {
        const restored: Record<string, DomainValues> = {};
        for (const k of Object.keys(saved.domains)) {
          const d = saved.domains[k];
          restored[k] = {
            success: d.success != null ? String(d.success) : "",
            emerging: d.emerging != null ? String(d.emerging) : "",
            fail: d.fail != null ? String(d.fail) : "",
          };
        }
        setDomainScores(restored);
      }
    } catch {
      /* noop */
    }
    try {
      const savedItems = JSON.parse(localStorage.getItem(itemKey) || "null");
      if (savedItems && typeof savedItems === "object") {
        const parsed: ItemClassifications = {};
        for (const k of Object.keys(savedItems)) {
          parsed[Number(k)] = savedItems[k] as ItemRating | null;
        }
        setItemRatings(parsed);
      }
    } catch {
      /* noop */
    }
  }, [id, scoreKey, itemKey]);

  // Initialise missing domain entries when domains change
  useEffect(() => {
    setDomainScores((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const d of domains) {
        if (!next[d.code]) {
          next[d.code] = emptyDomain();
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [domains]);

  const sums = useMemo(() => {
    const out: Record<string, number> = {};
    for (const d of domains) {
      const v = domainScores[d.code] ?? emptyDomain();
      out[d.code] = (Number(v.success) || 0) + (Number(v.emerging) || 0) + (Number(v.fail) || 0);
    }
    return out;
  }, [domainScores, domains]);

  const completedCount = domains.filter((d) => sums[d.code] === 100).length;

  const totalItems = TTAP_ITEMS.length;
  const classifiedCount = Object.values(itemRatings).filter((v) => v != null).length;

  const persistAll = () => {
    const numericDomains = Object.fromEntries(
      domains.map((d) => {
        const v = domainScores[d.code] ?? emptyDomain();
        return [d.code, { success: Number(v.success) || 0, emerging: Number(v.emerging) || 0, fail: Number(v.fail) || 0 }];
      }),
    );
    try {
      localStorage.setItem(scoreKey, JSON.stringify({ tool, domains: numericDomains, savedAt: new Date().toISOString() }));
    } catch {
      /* noop */
    }
    try {
      localStorage.setItem(itemKey, JSON.stringify(itemRatings));
    } catch {
      /* noop */
    }
    // Run engine and store concept profile for downstream pages.
    try {
      const conceptProfile = computeCoverage(numericDomains as DomainScores, itemRatings);
      localStorage.setItem(`himam_profile_${id}`, JSON.stringify({ conceptProfile, computedAt: new Date().toISOString() }));
    } catch {
      /* noop */
    }
  };

  const persistRef = useRef(persistAll);
  persistRef.current = persistAll;
  useEffect(() => {
    const t = setInterval(() => persistRef.current(), 30000);
    return () => clearInterval(t);
  }, []);

  const updateStudentTool = (newTool: string) => {
    setTool(newTool);
    try {
      const list: StoredStudent[] = JSON.parse(localStorage.getItem("himam_students") || "[]");
      const updated = list.map((s) => (s.id === id ? { ...s, tool: newTool } : s));
      localStorage.setItem("himam_students", JSON.stringify(updated));
    } catch {
      /* noop */
    }
  };

  const setDomainField = (code: string, key: keyof DomainValues, raw: string) => {
    let v = raw.replace(/[^0-9]/g, "");
    if (v !== "") v = String(Math.min(100, Math.max(0, Number(v))));
    setDomainScores((prev) => ({ ...prev, [code]: { ...(prev[code] ?? emptyDomain()), [key]: v } }));
  };

  const setItemRating = (itemId: number, rating: ItemRating | "") => {
    setItemRatings((prev) => ({
      ...prev,
      [itemId]: rating === "" ? null : rating,
    }));
  };

  const toggleDomain = (code: string) => {
    setExpandedDomains((prev) => {
      const next = new Set(prev);
      next.has(code) ? next.delete(code) : next.add(code);
      return next;
    });
  };

  const handleSubmit = () => {
    const allValid = domains.every((d) => sums[d.code] === 100);
    if (!allValid) { setShowError(true); return; }
    persistAll();
    navigate({ to: "/students/$id/coverage", params: { id } });
  };

  const handleDraft = () => {
    persistAll();
    navigate({ to: "/" });
  };

  return (
    <div className="min-h-screen bg-[#FAF7F2]">
      <header className="flex items-center justify-between px-8 py-4" style={{ backgroundColor: "#0F3D3E" }}>
        <Link to="/" className="rounded-lg border border-white/30 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10">
          → رجوع
        </Link>
        <h1 className="text-2xl font-bold text-white">همم</h1>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-8 md:px-8">
        {/* Student card + tool selector */}
        <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-[#0F3D3E]">{student?.name ?? "—"}</h2>
              <p className="mt-0.5 text-sm text-stone-500">{student?.center ?? ""}</p>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-stone-600">أداة التقييم</label>
              <select
                value={tool}
                onChange={(e) => updateStudentTool(e.target.value)}
                className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-800 outline-none focus:border-[#0F3D3E]"
              >
                <option value="">— اختر أداة —</option>
                {TOOLS.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Progress */}
          <div className="mt-5 flex items-center justify-between text-sm font-medium text-stone-700">
            <span>تم إدخال {completedCount} من {domains.length} مجالات</span>
            {classifiedCount > 0 && (
              <span className="text-xs text-stone-500">{classifiedCount} / {totalItems} بند مصنَّف</span>
            )}
          </div>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-stone-100">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${(completedCount / domains.length) * 100}%`, backgroundColor: "#0F3D3E" }}
            />
          </div>
        </div>

        {/* Domain percentage cards */}
        <section className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          {domains.map((d) => {
            const v = domainScores[d.code] ?? emptyDomain();
            const sum = sums[d.code] ?? 0;
            const ok = sum === 100;
            const touched = v.success !== "" || v.emerging !== "" || v.fail !== "";
            return (
              <div key={d.code} className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
                <div className="flex items-baseline justify-between">
                  <h3 className="text-lg font-bold text-[#0F3D3E]">{d.name}</h3>
                  <span className="text-xs font-semibold text-stone-500">{d.code}</span>
                </div>
                <div className="mt-4 space-y-3">
                  <PercentField label="نسبة النجاح"      value={v.success}  onChange={(x) => setDomainField(d.code, "success",  x)} />
                  <PercentField label="نسبة الناشئة"     value={v.emerging} onChange={(x) => setDomainField(d.code, "emerging", x)} />
                  <PercentField label="نسبة عدم النجاح"  value={v.fail}     onChange={(x) => setDomainField(d.code, "fail",     x)} />
                </div>
                <p className="mt-3 text-xs text-stone-500">يجب أن يكون المجموع 100%</p>
                {touched && !ok && (
                  <p className="mt-1 text-xs font-semibold text-red-600">المجموع الحالي: {sum}%</p>
                )}
                {ok && <p className="mt-1 text-xs font-semibold text-green-700">✓ المجموع صحيح</p>}
              </div>
            );
          })}
        </section>

        {/* Optional items classification — TTAP only */}
        {isTTAP(tool) && (
          <div className="mt-6">
            <button
              onClick={() => setShowItemsSection((v) => !v)}
              className="flex w-full items-start justify-between rounded-2xl border border-stone-200 bg-white px-6 py-5 text-right shadow-sm transition hover:bg-stone-50"
            >
              <div className="flex-1">
                <p className="text-sm font-bold text-[#0F3D3E]">تصنيف بنود الأداة</p>
                <p className="mt-1 text-sm leading-6 text-stone-600">
                  عزيزي المختص، بإدخالك مزيداً من المعلومات عن نقاط القوة والاحتياج، تُثري الملف الشخصي للطالب
                </p>
              </div>
              <span className="mr-4 flex shrink-0 items-center gap-2 pt-0.5 text-sm text-stone-500">
                {classifiedCount > 0 && (
                  <span className="rounded-full px-2 py-0.5 text-xs font-bold" style={{ backgroundColor: "#E6F2F1", color: "#0F3D3E" }}>
                    {classifiedCount} / {totalItems}
                  </span>
                )}
                <span>{showItemsSection ? "▲" : "▼"}</span>
              </span>
            </button>

            {showItemsSection && (
              <div className="mt-3 space-y-3">
                {TTAP_DOMAINS.map((d) => {
                  const items = getItemsByDomain(d.code as TTAPDomain);
                  const domainClassified = items.filter((i) => itemRatings[i.id] != null).length;
                  const expanded = expandedDomains.has(d.code);
                  return (
                    <div key={d.code} className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
                      <button
                        onClick={() => toggleDomain(d.code)}
                        className="flex w-full items-center justify-between px-5 py-4 text-right transition hover:bg-stone-50"
                      >
                        <span className="flex items-center gap-3">
                          <span className="text-sm font-bold text-[#0F3D3E]">{d.name}</span>
                          <span className="text-xs font-semibold text-stone-500">{d.code}</span>
                        </span>
                        <span className="flex items-center gap-2 text-sm text-stone-500">
                          {domainClassified > 0 && (
                            <span className="rounded-full px-2 py-0.5 text-xs font-bold" style={{ backgroundColor: "#E6F2F1", color: "#0F3D3E" }}>
                              {domainClassified}/{items.length}
                            </span>
                          )}
                          <span>{expanded ? "▲" : "▼"}</span>
                        </span>
                      </button>

                      {expanded && (
                        <ul className="divide-y divide-stone-100 border-t border-stone-100 px-5">
                          {items.map((item) => {
                            const current = itemRatings[item.id] ?? null;
                            return (
                              <li key={item.id} className="flex items-center justify-between gap-3 py-2.5">
                                <span className="flex-1 text-sm text-stone-800">
                                  <span className="ml-1 text-xs text-stone-400">{item.id}.</span>
                                  {item.name}
                                </span>
                                <select
                                  value={current ?? ""}
                                  onChange={(e) => setItemRating(item.id, e.target.value as ItemRating | "")}
                                  className="shrink-0 rounded-lg border border-stone-300 bg-white px-2 py-1.5 text-xs text-stone-800 outline-none focus:border-[#0F3D3E]"
                                  style={{ minWidth: 180 }}
                                >
                                  <option value="">لم يُصنَّف</option>
                                  {(Object.keys(ITEM_RATING_WEIGHTS) as ItemRating[]).map((r) => (
                                    <option key={r} value={r}>{ITEM_RATING_LABELS[r]}</option>
                                  ))}
                                </select>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

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

function PercentField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="flex items-center justify-between gap-3">
      <span className="text-sm text-stone-700">{label}</span>
      <span className="flex items-center gap-1">
        <input
          type="number"
          min={0}
          max={100}
          inputMode="numeric"
          placeholder="0"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={(e) => e.target.select()}
          className="w-20 rounded-lg border border-stone-300 px-3 py-2 text-center text-sm font-semibold text-stone-900 outline-none focus:border-[#0F3D3E]"
        />
        <span className="text-sm text-stone-500">%</span>
      </span>
    </label>
  );
}
