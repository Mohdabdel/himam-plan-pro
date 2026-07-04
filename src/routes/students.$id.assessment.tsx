import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  computeCoverage,
  type ItemRating,
  type ItemClassifications,
  type DomainScores,
} from "../lib/coverage-engine";

export const Route = createFileRoute("/students/$id/assessment")({
  component: AssessmentPage,
  head: () => ({
    meta: [
      { title: "إدخال التقييم — همم" },
      { name: "description", content: "إدخال نتائج التقييم لكل مجال." },
    ],
  }),
});

// ── Constants ─────────────────────────────────────────────────────────────────

const TOOLS = ["TTAP-3", "Vineland-3", "AEPS-3", "أداة أخرى"];

const DOMAINS: DomainDef[] = [
  { code: "VS", name: "المهارات المهنية" },
  { code: "VB", name: "السلوكيات المهنية" },
  { code: "IF", name: "الأداء الوظيفي المستقل" },
  { code: "LS", name: "مهارات الترفيه" },
  { code: "FC", name: "التواصل الوظيفي" },
  { code: "IB", name: "السلوك البينشخصي" },
];

// ── Simple item prototype (8 items × 6 domains) ───────────────────────────────
// Additive layer — does not replace the existing domain-level score contract.
const SIMPLE_ITEMS: Record<string, string[]> = {
  VS: [
    "يفرز الأدوات",
    "يصحح أخطاء الفرز",
    "مطابقة صور التركيب",
    "مطابقة وفرز الألوان",
    "يفرز ويرتب الأوراق",
    "يستخدم التطابق مع شخص آخر",
    "يجمع معدات السفر",
    "يرتب البطاقات أبجدياً",
  ],
  VB: [
    "يستخدم طريقة خط التجميع",
    "يعمل باستمرار في المهمة",
    "لا يتشتت انتباهه جراء ضوضاء المكتب",
    "يعمل بدون إشراف",
    "يعمل بصورة منتجة",
    "يعمل بدقة وانتظام",
    "يتجاوب مع البيئة",
    "يحسن التعامل مع الانتقالات",
  ],
  IF: [
    "يخبر عن الوقت",
    "يتعرف على الأموال",
    "يحسب المبالغ المالية",
    "يتعرف على علامات البقاء",
    "يغسل اليدين",
    "يستخدم آلات البيع",
    "يُظهر آداب الأكل المناسبة",
    "يستخدم المال",
  ],
  LS: [
    "يندمج في الأنشطة الفردية",
    "يضع الأدوات جانباً في نهاية الاستراحة",
    "يلعب لعبة السهام",
    "يسجّل النقاط في لعبة السهام",
    "يلعب لعبة ورق بسيطة",
    "يرمي الكرات في السلة",
    "يستخدم العدادات لمعرفة نهاية النشاط",
    "يقرأ مجلة أو كتالوج",
  ],
  FC: [
    "يتبع التعليمات اللفظية",
    "يتواصل مع الزملاء في بيئة العمل",
    "يطلب المساعدة بشكل مناسب",
    "يفهم الإشارات غير اللفظية",
    "يستخدم الهاتف بشكل مناسب",
    "يقرأ التعليمات المكتوبة",
    "يكتب رسائل أو ملاحظات بسيطة",
    "يتبع جداول العمل المكتوبة",
  ],
  IB: [
    "يُحيّي الآخرين بشكل مناسب",
    "يتعاون مع الزملاء",
    "يحل النزاعات بشكل سلمي",
    "يحترم الحدود الشخصية للآخرين",
    "يشارك في الأنشطة الجماعية",
    "يُعبّر عن مشاعره بشكل مناسب",
    "يقبل النقد البنّاء",
    "يُظهر سلوكاً اجتماعياً ملائماً للبيئة",
  ],
};

// Derives domain score from simple items.
// Rule: need ≥4 items scored; pass≥60%→pass, need≥60%→fail, else emerge.
function deriveScoreFromItems(statuses: SimpleStatus[]): ScoreValue | "" {
  const scored = statuses.filter((s) => s !== null) as SimpleStatus[];
  if (scored.length < 4) return "";
  const passN = scored.filter((s) => s === "pass").length;
  const needN = scored.filter((s) => s === "need").length;
  if (passN / scored.length >= 0.6) return "pass";
  if (needN / scored.length >= 0.6) return "fail";
  return "emerge";
}

// ── Types ─────────────────────────────────────────────────────────────────────

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
type ScoreValue = "pass" | "emerge" | "fail" | "";
type DomainEntry = { score: ScoreValue; note: string };
type SimpleStatus = "pass" | "emerge" | "need" | null;
type SimpleScores = Record<string, SimpleStatus[]>; // 8 entries per domain code

function emptySimpleScores(): SimpleScores {
  return Object.fromEntries(DOMAINS.map((d) => [d.code, Array(8).fill(null) as SimpleStatus[]]));
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function isTTAP(tool: string) {
  return tool.includes("TTAP");
}

function scoreToNumeric(score: ScoreValue) {
  if (score === "pass")   return { success: 100, emerging: 0, fail: 0 };
  if (score === "emerge") return { success: 0, emerging: 100, fail: 0 };
  if (score === "fail")   return { success: 0, emerging: 0, fail: 100 };
  return { success: 0, emerging: 0, fail: 0 };
}

// ── Component ─────────────────────────────────────────────────────────────────

function AssessmentPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();

  const [loaded, setLoaded]           = useState(false);
  const [student, setStudent]         = useState<StoredStudent | null>(null);
  const [tool, setTool]               = useState("");
  const [assessorName, setAssessorName]     = useState("");
  const [assessmentDate, setAssessmentDate] = useState("");
  const [domainScores, setDomainScores]     = useState<Record<string, DomainEntry>>({});
  // itemRatings is retained only to round-trip legacy per-item classifications
  // saved by the old TTAP item-classification UI (now removed) — see persistAll().
  const [itemRatings, setItemRatings]       = useState<ItemClassifications>({});
  const [showError, setShowError]     = useState(false);
  // ── Simple item prototype state (additive) ──────────────────────────────────
  const [simpleScores, setSimpleScores] = useState<SimpleScores>(emptySimpleScores);
  const [expandedItemDomains, setExpandedItemDomains] = useState<Set<string>>(new Set());

  const domains = DOMAINS;

  const assessmentKey = `himam_assessment_${id}`;
  const itemKey       = `himam_items_${id}`;

  // ── Initial load ────────────────────────────────────────────────────────────
  useEffect(() => {
    // 1. Load learner
    try {
      const list: StoredStudent[] = JSON.parse(localStorage.getItem("himam_students") || "[]");
      const s = list.find((x) => x.id === id) ?? null;
      setStudent(s);
      if (s) setTool(s.tool);
    } catch { /* noop */ }

    // 2. Prefill domain scores from saved assessment (handles both array and legacy object format)
    try {
      const saved = JSON.parse(localStorage.getItem(assessmentKey) || "null");
      if (saved) {
        if (saved.assessorName)   setAssessorName(saved.assessorName);
        if (saved.assessmentDate) setAssessmentDate(saved.assessmentDate);

        const restored: Record<string, DomainEntry> = {};

        if (Array.isArray(saved.domains)) {
          // Current array format: [{ code, score, note }]
          for (const entry of saved.domains as Array<{ code: string; score: string; note: string }>) {
            restored[entry.code] = { score: (entry.score as ScoreValue) || "", note: entry.note || "" };
          }
        } else if (saved.domains && typeof saved.domains === "object") {
          // Legacy object format: { VS: { score?, success?, emerging?, fail?, note? } }
          for (const [code, d] of Object.entries(saved.domains as Record<string, any>)) {
            if (d.score !== undefined) {
              restored[code] = { score: (d.score as ScoreValue) || "", note: d.note || "" };
            } else {
              // Very old percentage-only format — convert best-effort
              const s = Number(d.success) || 0;
              const e = Number(d.emerging) || 0;
              const f = Number(d.fail) || 0;
              let sc: ScoreValue = "";
              if (s >= 50) sc = "pass";
              else if (e >= 50) sc = "emerge";
              else if (f >= 50) sc = "fail";
              restored[code] = { score: sc, note: "" };
            }
          }
        }

        if (Object.keys(restored).length) setDomainScores(restored);

        // Load simple item scores (new additive field — safe to skip if absent)
        if (saved.itemScores && typeof saved.itemScores === "object" && !Array.isArray(saved.itemScores)) {
          const base = emptySimpleScores();
          for (const code of Object.keys(base)) {
            const arr = (saved.itemScores as Record<string, unknown>)[code];
            if (Array.isArray(arr)) {
              base[code] = arr.slice(0, 8).map((v) =>
                v === "pass" || v === "emerge" || v === "need" ? v : null,
              ) as SimpleStatus[];
            }
          }
          setSimpleScores(base);
        }
      }
    } catch { /* noop */ }

    // 3. Prefill item ratings
    try {
      const savedItems = JSON.parse(localStorage.getItem(itemKey) || "null");
      if (savedItems && typeof savedItems === "object") {
        const parsed: ItemClassifications = {};
        for (const k of Object.keys(savedItems)) {
          parsed[Number(k)] = savedItems[k] as ItemRating | null;
        }
        setItemRatings(parsed);
      }
    } catch { /* noop */ }

    setLoaded(true);
  }, [id, assessmentKey, itemKey]);

  // Ensure all current domains have an initialised entry
  useEffect(() => {
    setDomainScores((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const d of domains) {
        if (!next[d.code]) {
          next[d.code] = { score: "", note: "" };
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, []);

  // ── Derived counts ──────────────────────────────────────────────────────────
  const completedCount   = domains.filter((d) => (domainScores[d.code]?.score || "") !== "").length;

  // ── Persist ─────────────────────────────────────────────────────────────────
  const persistAll = () => {
    const now = new Date().toISOString();

    // Build canonical array format for himam_assessment_${id}
    const domainsArray = domains.map((d) => {
      const entry = domainScores[d.code] ?? { score: "", note: "" };
      return { code: d.code, score: entry.score, note: entry.note };
    });

    try {
      localStorage.setItem(assessmentKey, JSON.stringify({
        learnerId:      id,
        tool,
        assessorName,
        assessmentDate,
        domains:        domainsArray,
        itemScores:     simpleScores,   // additive — downstream ignores unknown fields
        updatedAt:      now,
      }));
    } catch { /* noop */ }

    try {
      localStorage.setItem(itemKey, JSON.stringify(itemRatings));
    } catch { /* noop */ }

    // Write himam_profile_${id} — consumed by existing coverage.tsx (backward compat)
    try {
      const numericDomains: DomainScores = Object.fromEntries(
        domains.map((d) => {
          const entry = domainScores[d.code] ?? { score: "", note: "" };
          return [d.code, scoreToNumeric(entry.score)];
        }),
      ) as DomainScores;
      const conceptProfile = computeCoverage(numericDomains, itemRatings);
      localStorage.setItem(`himam_profile_${id}`, JSON.stringify({
        conceptProfile,
        computedAt: now,
      }));
    } catch { /* noop */ }

    // Write himam_coverage_${id} — lightweight spec-compliant coverage for S8
    try {
      const filledDomains   = domains.filter((d) => (domainScores[d.code]?.score || "") !== "").map((d) => d.code);
      const uncoveredDomains = domains.filter((d) => (domainScores[d.code]?.score || "") === "").map((d) => d.code);
      const passedDomains   = domains.filter((d) => domainScores[d.code]?.score === "pass").map((d) => d.code);
      const emergingDomains = domains.filter((d) => domainScores[d.code]?.score === "emerge").map((d) => d.code);
      const failedDomains   = domains.filter((d) => domainScores[d.code]?.score === "fail").map((d) => d.code);
      const completionPercent = Math.round((filledDomains.length / Math.max(domains.length, 1)) * 100);
      const warning = filledDomains.length < 4 ? "coverage_low" : "coverage_ok";

      localStorage.setItem(`himam_coverage_${id}`, JSON.stringify({
        learnerId: id,
        tool,
        filledDomains,
        uncoveredDomains,
        passedDomains,
        emergingDomains,
        failedDomains,
        completionPercent,
        warning,
        updatedAt: now,
      }));
    } catch { /* noop */ }
  };

  // Auto-derive domain score from simple item scores
  useEffect(() => {
    if (!loaded) return;
    setDomainScores((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const d of domains) {
        const derived = deriveScoreFromItems(simpleScores[d.code] ?? Array(8).fill(null));
        if (derived !== "" && next[d.code]?.score !== derived) {
          next[d.code] = { ...(next[d.code] ?? { score: "", note: "" }), score: derived };
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [simpleScores, loaded]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-save every 30 s
  const persistRef = useRef(persistAll);
  persistRef.current = persistAll;
  useEffect(() => {
    const t = setInterval(() => persistRef.current(), 30_000);
    return () => clearInterval(t);
  }, []);

  // ── Handlers ─────────────────────────────────────────────────────────────────
  const updateStudentTool = (newTool: string) => {
    setTool(newTool);
    try {
      const list: StoredStudent[] = JSON.parse(localStorage.getItem("himam_students") || "[]");
      localStorage.setItem("himam_students", JSON.stringify(
        list.map((s) => (s.id === id ? { ...s, tool: newTool } : s)),
      ));
    } catch { /* noop */ }
  };

  const setDomainField = (code: string, key: keyof DomainEntry, value: string) => {
    setDomainScores((prev) => ({
      ...prev,
      [code]: { ...(prev[code] ?? { score: "", note: "" }), [key]: value },
    }));
  };

  const toggleItemDomain = (code: string) => {
    setExpandedItemDomains((prev) => {
      const next = new Set(prev);
      next.has(code) ? next.delete(code) : next.add(code);
      return next;
    });
  };

  const setSimpleItem = (code: string, idx: number, status: SimpleStatus) => {
    setSimpleScores((prev) => {
      const arr = [...(prev[code] ?? Array(8).fill(null))] as SimpleStatus[];
      arr[idx] = arr[idx] === status ? null : status; // toggle off if same
      return { ...prev, [code]: arr };
    });
  };

  const handleSave = () => {
    const allScored = domains.every((d) => (domainScores[d.code]?.score || "") !== "");
    if (!allScored) { setShowError(true); return; }
    setShowError(false);
    persistAll();
    navigate({ to: "/students/$id/coverage", params: { id } });
  };

  const handleDraft = () => {
    persistAll();
    navigate({ to: "/" });
  };

  // ── Missing learner fallback ─────────────────────────────────────────────────
  if (loaded && !student) {
    return (
      <div className="min-h-screen bg-[#FAF7F2]">
        <header className="flex items-center justify-between px-8 py-4" style={{ backgroundColor: "#0F3D3E" }}>
          <Link to="/" className="rounded-lg border border-white/30 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10">
            → رجوع
          </Link>
          <h1 className="text-2xl font-bold text-white">همم</h1>
        </header>
        <div className="flex flex-col items-center justify-center px-6 py-32 text-center">
          <p className="text-lg font-semibold text-stone-700">لم يُعثر على بيانات هذا المتعلم</p>
          <p className="mt-2 text-sm text-stone-500">قد يكون السجل محذوفاً أو الرابط غير صحيح.</p>
          <Link
            to="/"
            className="mt-8 rounded-xl px-6 py-3 text-sm font-bold text-white transition hover:opacity-90"
            style={{ backgroundColor: "#0F3D3E" }}
          >
            → العودة إلى لوحة التحكم
          </Link>
        </div>
      </div>
    );
  }

  // ── Main render ──────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#FAF7F2]">
      <header className="flex items-center justify-between px-8 py-4" style={{ backgroundColor: "#0F3D3E" }}>
        <Link to="/" className="rounded-lg border border-white/30 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10">
          → رجوع
        </Link>
        <h1 className="text-2xl font-bold text-white">همم</h1>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-8 md:px-8">

        {/* Learner context card */}
        <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-[#0F3D3E]">{student?.name ?? "—"}</h2>
              <p className="mt-0.5 text-sm text-stone-500">{student?.center ?? ""}</p>
              <p className="mt-2 text-xs leading-5 text-stone-400">
                هذا التقييم هو خط الأساس الرسمي للمتعلم — ستُبنى عليه تغطية مفاهيم الانتقال والخطة اللاحقة.
              </p>
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

          {/* Optional: assessor name + date */}
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-stone-500">اسم المُقيّم (اختياري)</label>
              <input
                type="text"
                value={assessorName}
                onChange={(e) => setAssessorName(e.target.value)}
                placeholder="أ. اسم المختص"
                className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm text-stone-800 outline-none focus:border-[#0F3D3E]"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-stone-500">تاريخ التطبيق (اختياري)</label>
              <input
                type="date"
                value={assessmentDate}
                onChange={(e) => setAssessmentDate(e.target.value)}
                className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm text-stone-800 outline-none focus:border-[#0F3D3E]"
              />
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-5">
            <div className="mb-2 flex items-center justify-between text-sm font-medium text-stone-700">
              <span>تم إدخال {completedCount} من {domains.length} مجالات</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-stone-100">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${(completedCount / Math.max(domains.length, 1)) * 100}%`,
                  backgroundColor: "#0F3D3E",
                }}
              />
            </div>
          </div>
        </div>

        {/* Domain score cards */}
        <section className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          {domains.map((d) => {
            const entry = domainScores[d.code] ?? { score: "", note: "" };
            return (
              <div key={d.code} className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-baseline justify-between">
                  <h3 className="text-base font-bold text-[#0F3D3E]">{d.name}</h3>
                  <span className="rounded bg-stone-100 px-2 py-0.5 text-xs font-semibold text-stone-500">{d.code}</span>
                </div>
                {/* Domain score — read-only when derived from items, manual otherwise */}
                {(() => {
                  const derived = deriveScoreFromItems(simpleScores[d.code] ?? Array(8).fill(null));
                  const itemsDone = (simpleScores[d.code] ?? []).filter((s) => s !== null).length;
                  return derived !== "" ? (
                    <div className="flex items-center gap-2">
                      <div
                        className="flex-1 rounded-lg px-3 py-2.5 text-sm font-semibold"
                        style={{
                          background: derived === "pass" ? "#F0FFF4" : derived === "emerge" ? "#FFFBEB" : "#FEF2F2",
                          border: `1px solid ${derived === "pass" ? "#86EFAC" : derived === "emerge" ? "#FCD34D" : "#FCA5A5"}`,
                          color: "#1C1917",
                        }}
                      >
                        {derived === "pass" ? "✓ نجح" : derived === "emerge" ? "◑ ناشئ" : "✗ لم ينجح"}
                      </div>
                      <span className="shrink-0 text-xs text-stone-400">مستنبط ({itemsDone}/8)</span>
                    </div>
                  ) : (
                    <ScoreSelect value={entry.score} onChange={(v) => setDomainField(d.code, "score", v)} />
                  );
                })()}
                <textarea
                  placeholder="ملاحظة (اختياري)"
                  value={entry.note}
                  onChange={(e) => setDomainField(d.code, "note", e.target.value)}
                  rows={2}
                  className="mt-3 w-full resize-none rounded-lg border border-stone-200 px-3 py-2 text-sm text-stone-700 outline-none focus:border-[#0F3D3E]"
                />
                {/* ── Simple item rows (additive) ──────────────────────── */}
                {isTTAP(tool) && (
                  <div className="mt-3 border-t border-stone-100 pt-3">
                    <button
                      type="button"
                      onClick={() => toggleItemDomain(d.code)}
                      className="flex w-full items-center justify-between text-xs font-semibold text-stone-500 hover:text-[#0F3D3E]"
                    >
                      <span>
                        بنود التقييم —{" "}
                        {(simpleScores[d.code] ?? []).filter((s) => s !== null).length}/8 مُقيَّم
                      </span>
                      <span>{expandedItemDomains.has(d.code) ? "▲" : "▼"}</span>
                    </button>
                    {expandedItemDomains.has(d.code) && (
                      <ul className="mt-2 space-y-1.5">
                        {(SIMPLE_ITEMS[d.code] ?? []).map((label, idx) => {
                          const cur = (simpleScores[d.code] ?? [])[idx] ?? null;
                          return (
                            <li key={idx} className="flex items-center gap-2 rounded-lg bg-stone-50 px-3 py-2">
                              <span className="flex-1 text-xs text-stone-700">
                                <span className="ml-1.5 text-stone-400">{idx + 1}.</span>
                                {label}
                              </span>
                              <div className="flex shrink-0 gap-1">
                                {(["pass", "emerge", "need"] as const).map((s) => (
                                  <button
                                    key={s}
                                    type="button"
                                    onClick={() => setSimpleItem(d.code, idx, s)}
                                    className="rounded px-2 py-0.5 text-xs font-bold transition"
                                    style={{
                                      background: cur === s
                                        ? s === "pass" ? "#16a34a" : s === "emerge" ? "#d97706" : "#dc2626"
                                        : "#F1F5F9",
                                      color: cur === s ? "white" : "#64748B",
                                    }}
                                  >
                                    {s === "pass" ? "✓" : s === "emerge" ? "◑" : "✗"}
                                  </button>
                                ))}
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </section>

        {/* Info banner */}
        <div
          className="mt-6 rounded-2xl border p-5 text-sm leading-7 text-[#0F3D3E]"
          style={{ backgroundColor: "#E6F2F1", borderColor: "#C8DEDD" }}
        >
          همم سيترجم هذه النتائج تلقائياً إلى تغطية مفاهيم الانتقال
        </div>

        {/* Validation error */}
        {showError && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            يرجى اختيار النتيجة (نجح / ناشئ / لم ينجح) لجميع المجالات قبل المتابعة
          </div>
        )}

        {/* Actions */}
        <div className="mt-6 flex flex-col gap-3">
          <button
            onClick={handleSave}
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

// ── ScoreSelect ───────────────────────────────────────────────────────────────

function ScoreSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const bg = value === "pass" ? "#F0FFF4" : value === "emerge" ? "#FFFBEB" : value === "fail" ? "#FEF2F2" : "white";
  const border = value === "pass" ? "#86EFAC" : value === "emerge" ? "#FCD34D" : value === "fail" ? "#FCA5A5" : "#E7E5E4";
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{ background: bg, borderColor: border, borderWidth: 1, borderStyle: "solid" }}
      className="w-full rounded-lg px-3 py-2.5 text-sm font-semibold text-stone-900 outline-none transition focus:border-[#0F3D3E]"
    >
      <option value="">— اختر النتيجة —</option>
      <option value="pass">✓ نجح</option>
      <option value="emerge">◑ ناشئ</option>
      <option value="fail">✗ لم ينجح</option>
    </select>
  );
}
