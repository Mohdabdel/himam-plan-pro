import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/students/$id/report")({
  component: ReportPage,
  head: () => ({
    meta: [
      { title: "التقرير النهائي — همم" },
      { name: "description", content: "التقرير الشامل لخطة انتقال المتعلم." },
    ],
  }),
});

// ── Types ─────────────────────────────────────────────────────────────────────
type StoredStudent = {
  id: string; name: string; birthDate: string;
  center: string; tool: string; createdAt: string; status: string;
};
type Goal = { id: string; text: string; category: string };

// Normalised internal shape — always an object keyed by domain code
type NormalisedDomain = { success: number; emerging: number; fail: number; note?: string };
type NormalisedDomains = Record<string, NormalisedDomain>;

// Raw storage shapes (either old object map or new array)
type RawDomainEntry = { code: string; score: string; note?: string };
type RawAssessment = {
  domains?:
    | Record<string, { success?: string | number; emerging?: string | number; fail?: string | number; score?: string; note?: string }>
    | RawDomainEntry[];
  savedAt?: string;
  updatedAt?: string;
};

// ── Assessment normalisation ───────────────────────────────────────────────────
function scoreToNums(score: string): { success: number; emerging: number; fail: number } {
  if (score === "pass")   return { success: 100, emerging: 0,   fail: 0   };
  if (score === "emerge") return { success: 0,   emerging: 100, fail: 0   };
  if (score === "fail")   return { success: 0,   emerging: 0,   fail: 100 };
  return { success: 0, emerging: 0, fail: 0 };
}

function normaliseDomains(raw: RawAssessment | null): NormalisedDomains {
  if (!raw?.domains) return {};

  // New array format: [{ code, score, note }]
  if (Array.isArray(raw.domains)) {
    const out: NormalisedDomains = {};
    for (const entry of raw.domains) {
      if (!entry.code) continue;
      out[entry.code] = { ...scoreToNums(entry.score ?? ""), note: entry.note };
    }
    return out;
  }

  // Old object format: { VS: { success, emerging, fail } }
  // Also handles the intermediate format that had a `score` field alongside numerics
  const out: NormalisedDomains = {};
  for (const [code, v] of Object.entries(raw.domains)) {
    if (v.score !== undefined && typeof v.score === "string" && v.success === undefined) {
      // Object format with only score field (no numeric fields)
      out[code] = { ...scoreToNums(v.score), note: v.note };
    } else {
      out[code] = {
        success:  Number(v.success)  || 0,
        emerging: Number(v.emerging) || 0,
        fail:     Number(v.fail)     || 0,
        note:     v.note,
      };
    }
  }
  return out;
}

type AssessmentData = RawAssessment;

// Raw IEP goal (flat array entry may carry domainCode)
type RawGoal = { id?: string; text?: string; category?: string; domainCode?: string };
type RawIEP = {
  vision?:    string;
  goals?:
    | Record<string, RawGoal[]>   // grouped by domain code (existing format)
    | RawGoal[];                  // flat array with domainCode field
  services?:  string[];
  startDate?: string;
};

// ── IEP goals normalisation ───────────────────────────────────────────────────
function normaliseIEPGoals(raw: RawIEP | null): Record<string, Goal[]> {
  if (!raw?.goals) return {};

  const out: Record<string, Goal[]> = {};

  function push(code: string, g: RawGoal, fallbackIndex: number) {
    const text = g.text?.trim();
    if (!text) return;
    const bucket = code || "UNSPECIFIED";
    if (!out[bucket]) out[bucket] = [];
    out[bucket].push({
      id:       g.id ?? `${bucket}-${fallbackIndex}`,
      text,
      category: g.category ?? "",
    });
  }

  if (Array.isArray(raw.goals)) {
    (raw.goals as RawGoal[]).forEach((g, i) => push(g.domainCode ?? "", g, i));
  } else {
    Object.entries(raw.goals as Record<string, RawGoal[]>).forEach(([code, goals]) => {
      (goals ?? []).forEach((g, i) => push(code, g, i));
    });
  }

  return out;
}

type IEPData = RawIEP;
type FamilyData = { method: string; sessionDate: string; attendees: string; priorities: string[]; concernsChecked: string[]; concernsText: string; vision5y: string; quality: string };
type LearnerData = { method: string; q_love: string; q_good: string; q_future: string; q_happy: string; q_hard: string; environments: string[]; quality: string };

// ── Domain name maps ──────────────────────────────────────────────────────────
const DOMAIN_NAMES: Record<string, string> = {
  VS: "المهارات المهنية",     VB: "السلوكيات المهنية",
  IF: "الأداء الوظيفي المستقل", LS: "مهارات الترفيه",
  FC: "التواصل الوظيفي",     IB: "السلوك البينشخصي",
  COG: "المهارات المعرفية",   COM: "التواصل واللغة",
  SOC: "المهارات الاجتماعية", ADL: "مهارات الحياة اليومية",
  VOC: "التأهيل المهني",      MOT: "المهارات الحركية",
  FN: "المهارات الوظيفية",   SO: "المهارات الاجتماعية",
  IL: "مهارات الحياة المستقلة", CM: "مهارات التواصل",
};

// ── Colors ────────────────────────────────────────────────────────────────────
const TEAL   = "#0F3D3E";
const GREEN  = "#16a34a";
const YELLOW = "#d97706";
const GRAY   = "#94a3b8";
const ORANGE = "#D9764A";

// ── Helpers ───────────────────────────────────────────────────────────────────
function safeParse<T>(key: string): T | null {
  try { return JSON.parse(localStorage.getItem(key) || "null"); }
  catch { return null; }
}

function formatDate(iso: string) {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleDateString("ar-SA", { year: "numeric", month: "long", day: "numeric" }); }
  catch { return iso; }
}

// ── Sub-components ────────────────────────────────────────────────────────────
function SectionTitle({ num, title }: { num: string; title: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
      <span style={{ background: TEAL, color: "white", borderRadius: "50%", width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 14, flexShrink: 0 }}>{num}</span>
      <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: TEAL }}>{title}</h2>
    </div>
  );
}

function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={className} style={{ background: "white", border: "1px solid #E5E7EB", borderRadius: 12, padding: "20px 22px", marginBottom: 20 }}>
      {children}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", gap: 8, padding: "6px 0", borderBottom: "1px solid #F1F5F9" }}>
      <span style={{ color: "#64748B", fontSize: 14, minWidth: 140 }}>{label}</span>
      <span style={{ color: "#1F2937", fontSize: 14, fontWeight: 600 }}>{value || "—"}</span>
    </div>
  );
}

function DomainBar({ name, successPct, emergingPct, failPct }: { name: string; successPct: number; emergingPct: number; failPct: number }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontWeight: 600, fontSize: 14, color: TEAL }}>{name}</span>
        <span style={{ fontSize: 12, color: "#64748B" }}>
          <span style={{ color: GREEN }}>نجاح {successPct}%</span>
          {" · "}
          <span style={{ color: YELLOW }}>ناشئة {emergingPct}%</span>
          {" · "}
          <span style={{ color: GRAY }}>لم ينجح {failPct}%</span>
        </span>
      </div>
      <div style={{ height: 12, borderRadius: 6, background: "#F1F5F9", overflow: "hidden", display: "flex" }}>
        {successPct > 0  && <div style={{ width: `${successPct}%`,  background: GREEN,  height: "100%" }} />}
        {emergingPct > 0 && <div style={{ width: `${emergingPct}%`, background: YELLOW, height: "100%" }} />}
        {failPct > 0     && <div style={{ width: `${failPct}%`,     background: GRAY,   height: "100%" }} />}
      </div>
    </div>
  );
}

function Tag({ text, color }: { text: string; color?: string }) {
  return (
    <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: 12, background: color ?? "#E6F2F1", color: color ? "white" : TEAL, fontSize: 13, fontWeight: 600, margin: "2px 3px" }}>
      {text}
    </span>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
function ReportPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();

  const [student,  setStudent]  = useState<StoredStudent | null>(null);
  const [assess,   setAssess]   = useState<AssessmentData | null>(null);
  const [iep,      setIep]      = useState<IEPData | null>(null);
  const [family,   setFamily]   = useState<FamilyData | null>(null);
  const [learner,  setLearner]  = useState<LearnerData | null>(null);

  useEffect(() => {
    const list = safeParse<StoredStudent[]>("himam_students");
    setStudent(list?.find((s) => s.id === id) ?? null);
    setAssess(safeParse<AssessmentData>(`himam_assessment_${id}`));
    setIep(safeParse<IEPData>(`himam_iep_${id}`));
    setFamily(safeParse<FamilyData>(`himam_family_${id}`));
    setLearner(safeParse<LearnerData>(`himam_learner_voice_${id}`));
  }, [id]);

  // ── Domain score calculations ─────────────────────────────────────────────
  const normDomains = normaliseDomains(assess);
  const domainStats = Object.entries(normDomains).map(([code, v]) => {
    const total = v.success + v.emerging + v.fail;
    return {
      code,
      name:        DOMAIN_NAMES[code] ?? code,
      successPct:  total ? Math.round(v.success  / total * 100) : 0,
      emergingPct: total ? Math.round(v.emerging / total * 100) : 0,
      failPct:     total ? Math.round(v.fail     / total * 100) : 0,
      total,
    };
  }).filter((d) => d.total > 0);

  const avgSuccess = domainStats.length
    ? Math.round(domainStats.reduce((s, d) => s + d.successPct, 0) / domainStats.length)
    : null;

  const normIEPGoals = normaliseIEPGoals(iep);

  // ── Recommendation logic ──────────────────────────────────────────────────
  function mainRec(avg: number | null) {
    if (avg === null) return "لا توجد بيانات تقييم كافية لإنشاء توصية.";
    if (avg < 40)  return "يُوصى بتقييم شامل إضافي قبل وضع الخطة";
    if (avg <= 70) return "المتعلم في مرحلة نمو — ركز على المجالات الناشئة";
    return "المتعلم يُظهر استقلالية جيدة — وسّع البيئات";
  }
  function domainRec(sp: number) {
    if (sp < 30)  return "يحتاج تدخلاً مكثفاً";
    if (sp <= 60) return "استمر في الدعم الحالي";
    return "وسّع السياقات والبيئات";
  }

  const printStyle = `
    @media print {
      .no-print { display: none !important; }
      .report-section { page-break-before: always; }
      .report-section:first-child { page-break-before: avoid; }
      body { font-size: 12pt; direction: rtl; }
      h1 { font-size: 18pt; color: #085041; }
      h2 { font-size: 14pt; color: #1D9E75; }
    }
  `;

  return (
    <div dir="rtl" lang="ar" style={{ minHeight: "100vh", background: "#F8F7F4", fontFamily: "'IBM Plex Sans Arabic', system-ui, sans-serif" }}>
      <style>{printStyle}</style>

      {/* Header */}
      <header className="no-print" style={{ background: TEAL, color: "white", padding: "14px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontSize: 22, fontWeight: 700 }}>همم</div>
        <div style={{ display: "flex", gap: 10 }}>
          <button
            type="button"
            onClick={() => navigate({ to: "/students/$id/iep", params: { id } })}
            style={{ background: "transparent", color: "white", border: "1px solid rgba(255,255,255,0.4)", padding: "9px 18px", borderRadius: 8, fontWeight: 600, fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}
          >
            → رجوع للخطة التربوية
          </button>
          <button
            type="button"
            onClick={() => navigate({ to: "/students/$id/plan", params: { id } })}
            style={{ background: "transparent", color: "white", border: "1px solid rgba(255,255,255,0.4)", padding: "9px 18px", borderRadius: 8, fontWeight: 600, fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}
          >
            الخطة النهائية
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            style={{ background: ORANGE, color: "white", border: "none", padding: "9px 18px", borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}
          >
            🖨️ طباعة التقرير
          </button>
          <button
            type="button"
            onClick={() => navigate({ to: "/" })}
            style={{ background: "transparent", color: "white", border: "1px solid rgba(255,255,255,0.4)", padding: "9px 18px", borderRadius: 8, fontWeight: 600, fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}
          >
            العودة للداشبورد
          </button>
        </div>
      </header>

      <main style={{ maxWidth: 900, margin: "0 auto", padding: "28px 20px 80px" }}>

        {/* Report header */}
        <div style={{ textAlign: "center", marginBottom: 28, borderBottom: "3px solid " + TEAL, paddingBottom: 18 }}>
          <h1 style={{ fontSize: 28, fontWeight: 900, color: TEAL, margin: 0 }}>التقرير الشامل لخطة الانتقال</h1>
          <p style={{ color: "#64748B", marginTop: 6, fontSize: 14 }}>
            منصة همم · {formatDate(new Date().toISOString())}
          </p>
        </div>

        {/* ── Section 1: Student info ─────────────────────────────────────── */}
        <div className="report-section">
          <Card>
            <SectionTitle num="١" title="معلومات المتعلم" />
            <InfoRow label="الاسم"              value={student?.name ?? ""} />
            <InfoRow label="تاريخ الميلاد"       value={formatDate(student?.birthDate ?? "")} />
            <InfoRow label="المركز / المؤسسة"    value={student?.center ?? ""} />
            <InfoRow label="أداة التقييم"        value={student?.tool ?? ""} />
            <InfoRow label="تاريخ الإضافة"       value={formatDate(student?.createdAt ?? "")} />
            <InfoRow label="الحالة"              value={student?.status ?? ""} />
          </Card>
        </div>

        {/* ── Section 2: Assessment results ──────────────────────────────── */}
        <div className="report-section">
          <Card>
            <SectionTitle num="٢" title="نتائج التقييم" />
            {domainStats.length === 0 ? (
              <p style={{ color: "#94A3B8", fontSize: 14 }}>لا توجد بيانات تقييم مسجّلة بعد.</p>
            ) : (
              <>
                {domainStats.map((d) => (
                  <DomainBar key={d.code} name={d.name} successPct={d.successPct} emergingPct={d.emergingPct} failPct={d.failPct} />
                ))}
                {avgSuccess !== null && (
                  <div style={{ marginTop: 14, padding: "10px 14px", background: "#F0FAF7", borderRadius: 8, fontSize: 14, color: TEAL, fontWeight: 700 }}>
                    متوسط نسبة النجاح: {avgSuccess}%
                  </div>
                )}
                <div style={{ marginTop: 8, display: "flex", gap: 16, fontSize: 12, color: "#64748B" }}>
                  <span><span style={{ color: GREEN }}>■</span> نجاح</span>
                  <span><span style={{ color: YELLOW }}>■</span> ناشئة</span>
                  <span><span style={{ color: GRAY }}>■</span> لم ينجح</span>
                </div>
              </>
            )}
          </Card>
        </div>

        {/* ── Section 3: IEP Goals ───────────────────────────────────────── */}
        <div className="report-section">
          <Card>
            <SectionTitle num="٣" title="الأهداف التربوية" />
            {iep?.vision && (
              <div style={{ marginBottom: 16, padding: "10px 14px", background: "#F8F7F4", borderRadius: 8, borderRight: `4px solid ${TEAL}` }}>
                <p style={{ margin: 0, fontSize: 13, color: "#64748B", fontWeight: 600 }}>رؤية الخطة</p>
                <p style={{ margin: "4px 0 0", fontSize: 15, color: "#1F2937" }}>{iep.vision}</p>
              </div>
            )}
            {Object.keys(normIEPGoals).length === 0 ? (
              <p style={{ color: "#94A3B8", fontSize: 14 }}>لا توجد أهداف مسجّلة بعد.</p>
            ) : (
              Object.entries(normIEPGoals).map(([code, goals]) => (
                <div key={code} style={{ marginBottom: 16 }}>
                  <p style={{ fontWeight: 700, color: TEAL, fontSize: 15, margin: "0 0 8px" }}>
                    {DOMAIN_NAMES[code] ?? code}
                  </p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {goals.map((g) => (
                      <div key={g.id} style={{ padding: "10px 14px", background: "#F8F7F4", borderRadius: 8, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                        <span style={{ fontSize: 14, color: "#1F2937", flex: 1 }}>{g.text || "—"}</span>
                        {g.category && <Tag text={g.category} />}
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
            {iep?.services && iep.services.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <p style={{ fontWeight: 700, color: TEAL, fontSize: 15, margin: "0 0 8px" }}>خدمات الدعم المقررة</p>
                <div>{iep.services.map((s) => <Tag key={s} text={s} />)}</div>
              </div>
            )}
            {iep?.startDate && (
              <p style={{ marginTop: 12, fontSize: 13, color: "#64748B" }}>تاريخ بدء الخطة: <strong>{formatDate(iep.startDate)}</strong></p>
            )}
          </Card>
        </div>

        {/* ── Section 4: Voices ──────────────────────────────────────────── */}
        <div className="report-section">
          <Card>
            <SectionTitle num="٤" title="الأصوات" />

            {/* Family voice */}
            <div style={{ marginBottom: 20 }}>
              <p style={{ fontWeight: 700, fontSize: 16, color: TEAL, margin: "0 0 10px", borderBottom: "1px solid #E5E7EB", paddingBottom: 6 }}>صوت الأسرة</p>
              {!family ? (
                <p style={{ color: "#94A3B8", fontSize: 14 }}>لم يُسجَّل صوت الأسرة بعد.</p>
              ) : (
                <>
                  <InfoRow label="طريقة الحصول" value={family.method} />
                  <InfoRow label="تاريخ الجلسة"  value={formatDate(family.sessionDate)} />
                  <InfoRow label="من حضر"         value={family.attendees} />
                  {family.priorities.length > 0 && (
                    <div style={{ padding: "6px 0" }}>
                      <span style={{ color: "#64748B", fontSize: 14, display: "block", marginBottom: 4 }}>الأولويات</span>
                      {family.priorities.map((p) => <Tag key={p} text={p} />)}
                    </div>
                  )}
                  {(family.concernsChecked.length > 0 || family.concernsText) && (
                    <div style={{ padding: "6px 0" }}>
                      <span style={{ color: "#64748B", fontSize: 14, display: "block", marginBottom: 4 }}>المخاوف</span>
                      {family.concernsChecked.map((c) => <Tag key={c} text={c} color="#7c3aed" />)}
                      {family.concernsText && <p style={{ fontSize: 14, color: "#1F2937", marginTop: 6 }}>{family.concernsText}</p>}
                    </div>
                  )}
                  {family.vision5y && (
                    <div style={{ marginTop: 8, padding: "10px 14px", background: "#FBF7F4", borderRadius: 8, borderRight: `4px solid ${ORANGE}` }}>
                      <p style={{ margin: 0, fontSize: 13, color: "#64748B", fontWeight: 600 }}>رؤية الأسرة بعد 5 سنوات</p>
                      <p style={{ margin: "4px 0 0", fontSize: 14, color: "#1F2937" }}>{family.vision5y}</p>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Learner voice */}
            <div>
              <p style={{ fontWeight: 700, fontSize: 16, color: TEAL, margin: "0 0 10px", borderBottom: "1px solid #E5E7EB", paddingBottom: 6 }}>صوت المتعلم</p>
              {!learner ? (
                <p style={{ color: "#94A3B8", fontSize: 14 }}>لم يُسجَّل صوت المتعلم بعد.</p>
              ) : (
                <>
                  <InfoRow label="طريقة التواصل" value={learner.method} />
                  {([
                    { emoji: "❤️", label: "ماذا يحب؟",         val: learner.q_love   },
                    { emoji: "💪", label: "ما الذي يجيده؟",     val: learner.q_good   },
                    { emoji: "🌈", label: "ماذا يريد مستقبلاً؟", val: learner.q_future },
                    { emoji: "☀️", label: "ما الذي يسعده؟",     val: learner.q_happy  },
                    { emoji: "🤔", label: "الصعوبات",            val: learner.q_hard   },
                  ]).filter((q) => q.val?.trim()).map((q) => (
                    <div key={q.label} style={{ padding: "8px 0", borderBottom: "1px solid #F1F5F9" }}>
                      <span style={{ fontSize: 18, marginLeft: 8 }}>{q.emoji}</span>
                      <span style={{ color: "#64748B", fontSize: 13, fontWeight: 600 }}>{q.label}: </span>
                      <span style={{ color: "#1F2937", fontSize: 14 }}>{q.val}</span>
                    </div>
                  ))}
                  {learner.environments.length > 0 && (
                    <div style={{ marginTop: 10 }}>
                      <span style={{ color: "#64748B", fontSize: 14, display: "block", marginBottom: 4 }}>البيئات المريحة</span>
                      {learner.environments.map((e) => <Tag key={e} text={e} />)}
                    </div>
                  )}
                </>
              )}
            </div>
          </Card>
        </div>

        {/* ── Section 5: Recommendations ─────────────────────────────────── */}
        <div className="report-section">
          <Card>
            <SectionTitle num="٥" title="التوصيات" />
            <div style={{ padding: "14px 16px", background: "#F0FAF7", borderRadius: 10, borderRight: `4px solid ${GREEN}`, marginBottom: 12 }}>
              <p style={{ margin: 0, fontWeight: 700, fontSize: 15, color: "#065F46" }}>{mainRec(avgSuccess)}</p>
            </div>
            <div style={{ padding: "12px 16px", background: "#FEF3C7", borderRadius: 10, borderRight: `4px solid ${YELLOW}` }}>
              <p style={{ margin: 0, fontSize: 14, color: "#78350F" }}>
                راجع هذا التقرير مع الأسرة والمتعلم قبل اعتماده
              </p>
            </div>
          </Card>
        </div>

        {/* ── Section 6: Next steps ──────────────────────────────────────── */}
        {domainStats.length > 0 && (
          <div className="report-section">
            <Card>
              <SectionTitle num="٦" title="الخطوات التالية" />
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {domainStats.map((d) => {
                  const rec = domainRec(d.successPct);
                  const color = d.successPct < 30 ? "#dc2626" : d.successPct <= 60 ? YELLOW : GREEN;
                  return (
                    <div key={d.code} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: "#F8F7F4", borderRadius: 8, gap: 12 }}>
                      <span style={{ fontWeight: 600, color: TEAL, fontSize: 14 }}>{d.name}</span>
                      <span style={{ fontSize: 13, color, fontWeight: 700, flexShrink: 0 }}>{rec}</span>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>
        )}

        {/* Bottom buttons (no-print) */}
        <div className="no-print" style={{ display: "flex", gap: 12, marginTop: 8 }}>
          <button
            type="button"
            onClick={() => navigate({ to: "/students/$id/iep", params: { id } })}
            style={{ flex: 1, background: "white", color: TEAL, border: `2px solid ${TEAL}`, padding: "14px", borderRadius: 10, fontWeight: 700, fontSize: 16, cursor: "pointer", fontFamily: "inherit" }}
          >
            → رجوع للخطة التربوية
          </button>
          <button
            type="button"
            onClick={() => navigate({ to: "/students/$id/plan", params: { id } })}
            style={{ flex: 1, background: ORANGE, color: "white", border: "none", padding: "14px", borderRadius: 10, fontWeight: 700, fontSize: 16, cursor: "pointer", fontFamily: "inherit" }}
          >
            الخطة النهائية
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            style={{ flex: 1, background: ORANGE, color: "white", border: "none", padding: "14px", borderRadius: 10, fontWeight: 700, fontSize: 16, cursor: "pointer", fontFamily: "inherit" }}
          >
            🖨️ طباعة التقرير
          </button>
          <button
            type="button"
            onClick={() => navigate({ to: "/" })}
            style={{ flex: 1, background: "white", color: TEAL, border: `2px solid ${TEAL}`, padding: "14px", borderRadius: 10, fontWeight: 700, fontSize: 16, cursor: "pointer", fontFamily: "inherit" }}
          >
            العودة للداشبورد
          </button>
        </div>
      </main>
    </div>
  );
}
