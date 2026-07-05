import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { advanceStage } from "../lib/journey";
import { JourneyStepper } from "@/components/journey-stepper";

export const Route = createFileRoute("/students/$id/plan")({
  component: PlanPage,
  head: () => ({
    meta: [
      { title: "الخطة النهائية — همم" },
      { name: "description", content: "اختيار الأنشطة وتأكيد الخطة النهائية." },
    ],
  }),
});

// ── Domain → Concept mapping (6 spec domains only) ───────────────────────────
const DOMAIN_CONCEPT_MAP: Record<string, string[]> = {
  VS: ["COMMUNITY", "SELF_DET"],
  VB: ["SOCIAL",    "COMMUNITY"],
  IF: ["SELF_CARE", "HEALTH"],
  LS: ["COMMUNITY", "SELF_DET"],
  FC: ["COMM",      "SOCIAL"],
  IB: ["SOCIAL",    "SAFETY"],
};

const CONCEPT_NAMES: Record<string, string> = {
  COMMUNITY:    "المشاركة المجتمعية",
  SELF_DET:     "تقرير المصير",
  SOCIAL:       "المهارات الاجتماعية",
  SELF_CARE:    "العناية الذاتية",
  HEALTH:       "الصحة والسلامة",
  COMM:         "التواصل",
  SAFETY:       "السلامة الشخصية",
};

const CONCEPT_ACTIVITIES: Record<string, string[]> = {
  COMMUNITY: [
    "يحضر مجلس العائلة الأسبوعي ويؤدي دوراً محدداً",
    "يذهب إلى المسجد مع ولي الأمر ضمن روتين ثابت",
    "يساعد في ترتيب الطاولة في التجمعات الأسرية",
    "يؤدي مهمة بسيطة في دار الحي أو المركز المجتمعي",
  ],
  SELF_DET: [
    "يختار نشاطه اليومي من قائمة خيارين أو ثلاثة",
    "يعبّر عن تفضيلاته قبل الأنشطة بوضوح",
    "يُنهي مهمة اختارها بمفرده دون تذكير",
    "يرفض طلباً غير مريح بأسلوب مقبول اجتماعياً",
  ],
  SOCIAL: [
    "يبادر بالتحية ويردّ عليها مع الأشخاص المألوفين",
    "يشارك في نشاط جماعي صغير (3–5 أفراد)",
    "يتناوب على الدور مع زميله في لعبة أو نشاط",
    "يطلب الانضمام لنشاط جماعي بطريقة مناسبة",
  ],
  SELF_CARE: [
    "يُكمل 4 خطوات من روتين الصباح بدون تذكير",
    "يرتب أغراضه الشخصية بعد الاستخدام",
    "يحضّر وجبته الخفيفة باستقلالية",
    "يحافظ على نظافته الشخصية خلال اليوم",
  ],
  HEALTH: [
    "يتعرف على علامات التعب ويطلب الراحة",
    "يحتفظ بزجاجة الماء ويشرب منها بانتظام",
    "يُخبر المشرف عند الشعور بعدم الارتياح",
    "يلتزم بمواعيد تناول الدواء مع تذكير بسيط",
  ],
  COMM: [
    "يطلب المساعدة لفظياً أو بالإشارة عند الحاجة",
    "يُوضح ما يريد عند الاختيار من خيارين",
    "يستمع حتى ينتهي الآخر ثم يُجيب",
    "يُعبّر عن رفضه بأسلوب مقبول اجتماعياً",
  ],
  SAFETY: [
    "يبقى بالقرب من المشرف في الأماكن العامة",
    "يستجيب لكلمة 'توقف' أو 'انتبه' فوراً",
    "يُخبر شخصاً موثوقاً عند الشعور بعدم الأمان",
    "يعرف اسمه ورقم هاتف أحد والديه",
  ],
};

// ── Types ─────────────────────────────────────────────────────────────────────
type StoredStudent = { id: string; name: string; center: string; tool: string; status: string };

// IEP goals may arrive in two shapes — normalised below
type RawGoalOverride = { reason: string; note?: string; at: string };
type RawGoal = {
  id?: string; text?: string; category?: string; domainCode?: string;
  // Structured fields added by the IEP goal-quality workspace — optional so
  // goals saved before that feature still normalise fine.
  context?: string; criterion?: string; measurementMethod?: string;
  evidenceRef?: string; lifePractice?: string; override?: RawGoalOverride;
};
type RawIEP  = {
  goals?:
    | Record<string, RawGoal[]>   // grouped by domain code (existing format)
    | RawGoal[];                  // flat array with domainCode field
};

type CoverageData = {
  failedDomains?:   string[];
  emergingDomains?: string[];
  passedDomains?:   string[];
};

// Actual family storage shape (matches family.tsx / report.tsx)
type FamilyData = {
  priorities?:      string[];
  vision5y?:        string;
};

// Learner voice is stored separately in himam_learner_voice_${id}
type LearnerVoiceData = {
  environments?: string[];
  q_love?:       string;
  q_future?:     string;
};

type GoalEntry = {
  goalId:              string;
  domainCode:          string;
  goalText:            string;
  concepts:            string[];
  priority:            "high" | "medium" | "low";
  suggestedActivities: string[];
  selectedActivities:  string[];
  context:             string;
  specialistNote:      string;
  // Read-only, carried over from the IEP goal-quality workspace.
  iepCriterion?:          string;
  iepMeasurementMethod?:  string;
  iepEvidenceRef?:        string;
  iepLifePractice?:       string;
  iepOverride?:           RawGoalOverride;
};

// ── Constants ─────────────────────────────────────────────────────────────────
const TEAL   = "#0F3D3E";
const ORANGE = "#D9764A";

const PRIORITY_LABEL = { high: "أولوية عالية", medium: "أولوية متوسطة", low: "أولوية منخفضة" } as const;
const PRIORITY_COLOR = { high: "#B91C1C",       medium: "#92400E",        low: "#374151"       } as const;
const PRIORITY_BG    = { high: "#FEE2E2",        medium: "#FEF3C7",        low: "#F3F4F6"       } as const;

// Keywords that indicate a home/family preference in learner voice environments
const HOME_KEYWORDS = ["البيت", "المنزل", "مجلس", "حديقة"];

// ── Helpers ───────────────────────────────────────────────────────────────────

function safeParse<T>(key: string): T | null {
  try { return JSON.parse(localStorage.getItem(key) || "null"); }
  catch { return null; }
}

type FlatGoal = { goalId: string; domainCode: string; goalText: string; raw: RawGoal };

/** Flatten IEP goals from either storage format into a stable list. */
function normalizeGoals(raw: RawIEP | null): FlatGoal[] {
  if (!raw?.goals) return [];

  const out: FlatGoal[] = [];

  if (Array.isArray(raw.goals)) {
    // Flat array format: each item should carry domainCode
    raw.goals.forEach((g, i) => {
      const text = g.text?.trim();
      if (!text) return;
      out.push({
        goalId:     g.id ?? `goal-${i}`,
        domainCode: g.domainCode ?? "VS",
        goalText:   text,
        raw:        g,
      });
    });
  } else {
    // Grouped-by-domain format: { VS: [{ id, text, category }], ... }
    Object.entries(raw.goals).forEach(([domainCode, goals]) => {
      (goals as RawGoal[]).forEach((g, i) => {
        const text = g.text?.trim();
        if (!text) return;
        out.push({
          goalId:     g.id ?? `${domainCode}-${i}`,
          domainCode,
          goalText:   text,
          raw:        g,
        });
      });
    });
  }

  return out;
}

function buildEntry(
  flat: FlatGoal,
  coverage: CoverageData,
  defaultContext: string,
): GoalEntry {
  const { goalId, domainCode, goalText, raw } = flat;
  const concepts = DOMAIN_CONCEPT_MAP[domainCode] ?? [];

  const priority: GoalEntry["priority"] =
    (coverage.failedDomains   ?? []).includes(domainCode) ? "high"   :
    (coverage.emergingDomains ?? []).includes(domainCode) ? "medium" : "low";

  // Up to 2 activities per concept, max 4 total
  const suggestedActivities: string[] = [];
  for (const c of concepts) {
    for (const act of (CONCEPT_ACTIVITIES[c] ?? []).slice(0, 2)) {
      if (suggestedActivities.length < 4) suggestedActivities.push(act);
    }
  }

  return {
    goalId,
    domainCode,
    goalText,
    concepts,
    priority,
    suggestedActivities,
    selectedActivities: [],
    context:            defaultContext,
    specialistNote:     "",
    iepCriterion:          raw.criterion || undefined,
    iepMeasurementMethod:  raw.measurementMethod || undefined,
    iepEvidenceRef:        raw.evidenceRef || undefined,
    iepLifePractice:       raw.lifePractice || undefined,
    iepOverride:           raw.override,
  };
}

// ── Component ─────────────────────────────────────────────────────────────────
function PlanPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();

  const [loaded,           setLoaded]           = useState(false);
  const [student,          setStudent]          = useState<StoredStudent | null>(null);
  const [goalEntries,      setGoalEntries]      = useState<GoalEntry[]>([]);
  const [hasGoals,         setHasGoals]         = useState(true); // optimistic; set false if IEP is empty
  const [saved,            setSaved]            = useState(false);
  const [contextHint,      setContextHint]      = useState<{ context: string; reason: string }>({ context: "", reason: "" });
  const [familyPriorities, setFamilyPriorities] = useState<string[]>([]);
  const [learnedLove,      setLearnedLove]      = useState("");

  useEffect(() => {
    // 1. Load student
    const students = safeParse<StoredStudent[]>("himam_students");
    const s = students?.find((x) => x.id === id) ?? null;
    setStudent(s);

    // 2. Load supporting data
    const rawIEP    = safeParse<RawIEP>(`himam_iep_${id}`);
    const coverage  = safeParse<CoverageData>(`himam_coverage_${id}`) ?? {};
    const family    = safeParse<FamilyData>(`himam_family_${id}`) ?? {};
    const learnerV  = safeParse<LearnerVoiceData>(`himam_learner_voice_${id}`) ?? {};

    // 3. Determine default training context from learner voice environments
    const envs = learnerV.environments ?? [];
    const prefersHome = envs.some((e) => HOME_KEYWORDS.some((k) => e.includes(k)));
    // Also check family vision for home clues
    const visionHint = family.vision5y ?? "";
    const defaultContext =
      prefersHome || HOME_KEYWORDS.some((k) => visionHint.includes(k))
        ? "البيت"
        : "المركز / المدرسة";

    // 3b. Expose context origin and voice cues to the UI
    setContextHint({
      context: defaultContext,
      reason: prefersHome
        ? "بناءً على بيئات المتعلم"
        : HOME_KEYWORDS.some((k) => visionHint.includes(k))
          ? "بناءً على رؤية الأسرة"
          : "افتراضي",
    });
    setFamilyPriorities((family.priorities ?? []).slice(0, 3));
    setLearnedLove(learnerV.q_love?.trim() ?? "");

    // 4. Normalise goals
    const flatGoals = normalizeGoals(rawIEP);
    if (flatGoals.length === 0) {
      setHasGoals(false);
      setLoaded(true);
      return;
    }

    // 5. Build goal entries
    const entries = flatGoals.map((g) => buildEntry(g, coverage, defaultContext));

    // 6. Restore saved plan selections
    const saved = safeParse<{ goals: GoalEntry[] }>(`himam_plan_${id}`);
    if (saved?.goals) {
      const savedMap = new Map(saved.goals.map((g) => [g.goalId, g]));
      for (const e of entries) {
        const prev = savedMap.get(e.goalId);
        if (prev) {
          e.selectedActivities = prev.selectedActivities ?? [];
          e.context            = prev.context            ?? e.context;
          e.specialistNote     = prev.specialistNote     ?? "";
        }
      }
    }

    // 7. Sort: high → medium → low
    const ORDER: Record<string, number> = { high: 0, medium: 1, low: 2 };
    entries.sort((a, b) => ORDER[a.priority] - ORDER[b.priority]);

    setGoalEntries(entries);
    setHasGoals(true);
    setLoaded(true);
  }, [id]);

  // ── Handlers ────────────────────────────────────────────────────────────────
  function toggleActivity(goalId: string, activity: string) {
    setGoalEntries((prev) =>
      prev.map((e) =>
        e.goalId !== goalId ? e : {
          ...e,
          selectedActivities: e.selectedActivities.includes(activity)
            ? e.selectedActivities.filter((a) => a !== activity)
            : [...e.selectedActivities, activity],
        }
      )
    );
  }

  function setContext(goalId: string, ctx: string) {
    setGoalEntries((prev) =>
      prev.map((e) => (e.goalId === goalId ? { ...e, context: ctx } : e))
    );
  }

  function setNote(goalId: string, note: string) {
    setGoalEntries((prev) =>
      prev.map((e) => (e.goalId === goalId ? { ...e, specialistNote: note } : e))
    );
  }

  function handleSave() {
    // Small completion signal — lets report.tsx (and the journey stage
    // below) tell whether the specialist actually selected real-context
    // activities, vs. just visiting/saving the page with nothing checked.
    // Named planRecordStatus (not `status`) to avoid shadowing the ambient
    // DOM global `window.status`, which TypeScript resolves silently.
    const planRecordStatus = goalEntries.some((g) => g.selectedActivities.length > 0)
      ? "activities_selected"
      : "no_activities";

    try {
      localStorage.setItem(`himam_plan_${id}`, JSON.stringify({
        learnerId:   id,
        generatedAt: new Date().toISOString(),
        goals:       goalEntries,
        status:      planRecordStatus,
      }));
      setSaved(true);
    } catch { /* noop */ }

    try {
      // report_ready (not just plan_completed) once real activities are
      // selected — that's the point the report stops showing its warning.
      const journeyStage = planRecordStatus === "activities_selected" ? "report_ready" : "plan_completed";
      const raw = localStorage.getItem("himam_students");
      if (raw) {
        const list: StoredStudent[] = JSON.parse(raw);
        const updated = list.map((s) => (s.id === id ? { ...s, status: advanceStage(s.status, journeyStage) } : s));
        localStorage.setItem("himam_students", JSON.stringify(updated));
      }
    } catch { /* noop */ }
  }

  // ── Missing learner fallback ─────────────────────────────────────────────────
  if (loaded && !student) {
    return (
      <div dir="rtl" lang="ar" style={{ minHeight: "100vh", background: "#FAF7F2", fontFamily: "system-ui, sans-serif" }}>
        <header style={{ background: TEAL, color: "white", padding: "14px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 22, fontWeight: 700 }}>همم</div>
          <Link to="/" style={{ color: "white", textDecoration: "none", fontSize: 14, padding: "8px 14px", border: "1px solid rgba(255,255,255,0.4)", borderRadius: 8 }}>
            → رجوع للداشبورد
          </Link>
        </header>
        <div style={{ maxWidth: 480, margin: "80px auto", textAlign: "center", padding: "0 20px" }}>
          <p style={{ fontSize: 18, fontWeight: 700, color: "#374151" }}>لم يُعثر على بيانات هذا المتعلم</p>
          <p style={{ fontSize: 14, color: "#9CA3AF", marginTop: 8 }}>قد يكون السجل محذوفاً أو الرابط غير صحيح.</p>
          <Link
            to="/"
            style={{ display: "inline-block", marginTop: 24, background: TEAL, color: "white", textDecoration: "none", padding: "12px 28px", borderRadius: 8, fontWeight: 700 }}
          >
            → العودة إلى لوحة التحكم
          </Link>
        </div>
      </div>
    );
  }

  // ── No goals fallback ────────────────────────────────────────────────────────
  const showEmptyState = loaded && !hasGoals;

  // ── Main render ──────────────────────────────────────────────────────────────
  return (
    <div dir="rtl" lang="ar" style={{ minHeight: "100vh", background: "#FAF7F2", fontFamily: "system-ui, sans-serif" }}>

      {/* Header */}
      <header style={{ background: TEAL, color: "white", padding: "14px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontSize: 22, fontWeight: 700 }}>همم</div>
        <div style={{ display: "flex", gap: 10 }}>
          <Link
            to="/students/$id/iep"
            params={{ id }}
            style={{ color: "white", textDecoration: "none", fontSize: 14, padding: "8px 14px", border: "1px solid rgba(255,255,255,0.4)", borderRadius: 8 }}
          >
            → رجوع للخطة التربوية
          </Link>
          <Link
            to="/students/$id/report"
            params={{ id }}
            style={{ background: ORANGE, color: "white", textDecoration: "none", fontSize: 14, padding: "8px 14px", borderRadius: 8, fontWeight: 700 }}
          >
            التقرير
          </Link>
        </div>
      </header>

      <main style={{ maxWidth: 900, margin: "0 auto", padding: "28px 20px 60px" }}>
        <JourneyStepper studentId={id} currentStep="plan" status={student?.status} />

        <h1 style={{ fontSize: 26, fontWeight: 800, color: TEAL, margin: 0 }}>اختيار الأنشطة والخطة النهائية</h1>
        <p style={{ marginTop: 6, color: "#475569", fontSize: 15 }}>{student?.name ?? "—"}</p>

        {/* ── Plan context strip ────────────────────────────────────────────── */}
        {loaded && hasGoals && (
          <div style={{ marginTop: 20, background: "#F0F9F8", border: "1px solid #B2D8D8", borderRadius: 10, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
            {/* Context origin */}
            {contextHint.reason && (
              <p style={{ margin: 0, fontSize: 13, color: TEAL }}>
                <strong>السياق الافتراضي:</strong> {contextHint.context} — {contextHint.reason}
              </p>
            )}
            {/* Family top priorities */}
            {familyPriorities.length > 0 && (
              <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                <span style={{ fontSize: 13, color: "#64748B", flexShrink: 0 }}>أولويات الأسرة:</span>
                {familyPriorities.map((p) => (
                  <span key={p} style={{ fontSize: 12, padding: "2px 10px", borderRadius: 12, background: "#E6F2F1", color: TEAL, fontWeight: 600 }}>
                    {p}
                  </span>
                ))}
              </div>
            )}
            {/* Learner love cue */}
            {learnedLove && (
              <p style={{ margin: 0, fontSize: 13, color: "#374151" }}>
                ❤️ <strong>ماذا يحب المتعلم:</strong> {learnedLove}
              </p>
            )}
            {/* Live completion counter */}
            <p style={{ margin: 0, fontSize: 13, color: "#475569" }}>
              <strong style={{ color: TEAL }}>{goalEntries.filter((e) => e.selectedActivities.length > 0).length}</strong>
              {" "}من{" "}
              <strong style={{ color: TEAL }}>{goalEntries.length}</strong>
              {" "}أهداف بها أنشطة محددة
            </p>
          </div>
        )}

        {/* No goals empty state */}
        {showEmptyState && (
          <div style={{ marginTop: 40, textAlign: "center", padding: 40, background: "white", borderRadius: 12, border: "1px solid #E5E7EB" }}>
            <p style={{ fontSize: 16, fontWeight: 600, color: "#374151", margin: 0 }}>لم تُدخَل أهداف بعد</p>
            <p style={{ fontSize: 14, marginTop: 8, color: "#9CA3AF" }}>
              يجب إدخال الأهداف التربوية أولاً لتتمكن من بناء الخطة النهائية.
            </p>
            <Link
              to="/students/$id/iep"
              params={{ id }}
              style={{ display: "inline-block", marginTop: 20, background: TEAL, color: "white", textDecoration: "none", padding: "10px 24px", borderRadius: 8, fontWeight: 700 }}
            >
              → إدخال الأهداف في الخطة التربوية
            </Link>
          </div>
        )}

        {/* Goal cards */}
        {goalEntries.map((entry) => (
          <div
            key={entry.goalId}
            style={{ marginTop: 24, background: "white", border: "1px solid #E5E7EB", borderRadius: 14, overflow: "hidden" }}
          >
            {/* Card header */}
            <div style={{ padding: "14px 18px", borderBottom: "1px solid #F3F4F6" }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 6 }}>
                <span style={{
                  fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20,
                  background: PRIORITY_BG[entry.priority], color: PRIORITY_COLOR[entry.priority],
                }}>
                  {PRIORITY_LABEL[entry.priority]}
                </span>
                <span style={{ fontSize: 11, color: "#94A3B8", background: "#F1F5F9", padding: "3px 8px", borderRadius: 20 }}>
                  {entry.domainCode}
                </span>
              </div>
              <p style={{ fontSize: 16, fontWeight: 600, color: "#1F2937", margin: 0 }}>{entry.goalText}</p>
            </div>

            <div style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 18 }}>

              {/* IEP structured details — read-only, carried from the goal-quality workspace */}
              {(entry.iepCriterion || entry.iepMeasurementMethod || entry.iepEvidenceRef || entry.iepLifePractice || entry.iepOverride) && (
                <div style={{ background: "#F8FAFC", border: "1px solid #E5E7EB", borderRadius: 8, padding: 12, display: "flex", flexDirection: "column", gap: 4 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: "#94A3B8", margin: "0 0 2px" }}>من الخطة التربوية</p>
                  {entry.iepCriterion && <p style={{ fontSize: 13, margin: 0, color: "#374151" }}><strong>المعيار:</strong> {entry.iepCriterion}</p>}
                  {entry.iepMeasurementMethod && <p style={{ fontSize: 13, margin: 0, color: "#374151" }}><strong>طريقة القياس:</strong> {entry.iepMeasurementMethod}</p>}
                  {entry.iepEvidenceRef && <p style={{ fontSize: 13, margin: 0, color: "#374151" }}><strong>الدليل المرتبط:</strong> {entry.iepEvidenceRef}</p>}
                  {entry.iepLifePractice && <p style={{ fontSize: 13, margin: 0, color: "#374151" }}><strong>ممارسة حياتية مرتبطة:</strong> {entry.iepLifePractice}</p>}
                  {entry.iepOverride && (
                    <p style={{ fontSize: 12, margin: "4px 0 0", color: "#92400E", fontWeight: 700 }}>
                      ⚠ هدف بتجاوز مهني موثّق — {entry.iepOverride.reason}
                    </p>
                  )}
                </div>
              )}

              {/* Concept chips — read-only */}
              {entry.concepts.length > 0 && (
                <div>
                  <p style={{ fontSize: 12, fontWeight: 600, color: "#94A3B8", margin: "0 0 8px" }}>المفاهيم المرتبطة</p>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {entry.concepts.map((c) => (
                      <span key={c} style={{ fontSize: 12, padding: "4px 12px", borderRadius: 20, background: "#E6F2F1", color: TEAL, fontWeight: 600 }}>
                        {CONCEPT_NAMES[c] ?? c}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Activity checkboxes */}
              {entry.suggestedActivities.length > 0 && (
                <div>
                  <p style={{ fontSize: 12, fontWeight: 600, color: "#94A3B8", margin: "0 0 8px" }}>الأنشطة المقترحة</p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {entry.suggestedActivities.map((act) => {
                      const checked = entry.selectedActivities.includes(act);
                      return (
                        <label
                          key={act}
                          style={{
                            display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer",
                            padding: "10px 12px",
                            border: `1px solid ${checked ? TEAL : "#E5E7EB"}`,
                            borderRadius: 8,
                            background: checked ? "#E6F2F1" : "white",
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleActivity(entry.goalId, act)}
                            style={{ marginTop: 2, width: 16, height: 16, accentColor: TEAL, flexShrink: 0 }}
                          />
                          <span style={{ fontSize: 14, color: "#374151" }}>{act}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Context dropdown */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#94A3B8", display: "block", marginBottom: 6 }}>
                  سياق التدريب المقترح
                </label>
                <select
                  value={entry.context}
                  onChange={(e) => setContext(entry.goalId, e.target.value)}
                  style={{ width: "100%", padding: "10px 12px", border: "1px solid #E5E7EB", borderRadius: 8, fontSize: 14, fontFamily: "inherit", color: "#374151", background: "white" }}
                >
                  <option value="البيت">البيت</option>
                  <option value="المركز / المدرسة">المركز / المدرسة</option>
                  <option value="المجتمع">المجتمع (المسجد، دار الحي، الحديقة)</option>
                  <option value="مجلس العائلة">مجلس العائلة</option>
                </select>
              </div>

              {/* Specialist note */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#94A3B8", display: "block", marginBottom: 6 }}>
                  ملاحظة الأخصائي (اختياري)
                </label>
                <textarea
                  value={entry.specialistNote}
                  onChange={(e) => setNote(entry.goalId, e.target.value)}
                  placeholder="أضف ملاحظة..."
                  rows={2}
                  style={{ width: "100%", padding: "10px 12px", border: "1px solid #E5E7EB", borderRadius: 8, fontSize: 14, fontFamily: "inherit", resize: "vertical", boxSizing: "border-box" }}
                />
              </div>
            </div>
          </div>
        ))}

        {/* Save actions */}
        {goalEntries.length > 0 && (
          <div style={{ marginTop: 32 }}>
            {saved && (
              <div style={{ marginBottom: 12, padding: "10px 16px", background: "#F0FDF4", border: "1px solid #86EFAC", borderRadius: 8, color: "#166534", fontSize: 14, fontWeight: 600 }}>
                ✓ تم حفظ الخطة بنجاح
              </div>
            )}
            <button
              type="button"
              onClick={handleSave}
              style={{ width: "100%", background: TEAL, color: "white", border: "none", padding: "14px", borderRadius: 10, fontWeight: 700, fontSize: 16, cursor: "pointer", fontFamily: "inherit" }}
            >
              حفظ الخطة النهائية ←
            </button>
            <button
              type="button"
              onClick={() => navigate({ to: "/students/$id/report", params: { id } })}
              style={{ width: "100%", marginTop: 10, background: "white", color: TEAL, border: `1px solid ${TEAL}`, padding: "12px", borderRadius: 10, fontWeight: 600, fontSize: 15, cursor: "pointer", fontFamily: "inherit" }}
            >
              عرض التقرير الشامل
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
