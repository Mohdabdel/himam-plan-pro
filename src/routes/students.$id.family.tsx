import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/students/$id/family")({
  component: FamilyPage,
  head: () => ({
    meta: [
      { title: "صوت الأسرة والمتعلم — همم" },
      { name: "description", content: "جمع صوت الأسرة والمتعلم لخطة الانتقال." },
    ],
  }),
});

const TEAL = "#0F3D3E";
const ORANGE = "#D9764A";

type Tab = "family" | "learner";
type QualityLevel = "weak" | "usable" | "strong";

type StoredStudent = { id: string; name: string; [k: string]: string };

// ── Family section types ─────────────────────────────────────────────────────
type FamilyMethod = "مقابلة" | "استبانة" | "هاتفية" | "";
const FAMILY_PRIORITIES = ["السلامة", "العمل", "الاستقلالية", "المجتمع", "العلاقات", "الصحة", "التواصل"];
const FAMILY_CONCERNS_OPTS = [
  "التنقل المستقل",
  "المهارات الاجتماعية",
  "السلامة في البيئة",
  "الاستقرار الوظيفي",
  "الصحة النفسية",
  "التواصل مع الآخرين",
];

type FamilyData = {
  method: FamilyMethod;
  sessionDate: string;
  attendees: string;
  priorities: string[];
  concernsChecked: string[];
  concernsText: string;
  vision5y: string;
  quality: QualityLevel | "";
};

// ── Learner section types ────────────────────────────────────────────────────
type LearnerMethod = "كلام" | "AAC" | "بصري" | "ملاحظة" | "";
const COMFORTABLE_ENVS = ["المنزل", "الفصل الدراسي", "الطبيعة الخارجية", "بيئة العمل", "الأماكن العامة", "مكان هادئ"];

type LearnerData = {
  method: LearnerMethod;
  q_love: string;
  q_good: string;
  q_future: string;
  q_happy: string;
  q_hard: string;
  environments: string[];
  quality: QualityLevel | "";
};

// ── Storage keys ─────────────────────────────────────────────────────────────
const familyKey = (id: string) => `himam_family_${id}`;
const learnerKey = (id: string) => `himam_learner_voice_${id}`;

// ── Quality helpers ───────────────────────────────────────────────────────────
function qualityColor(q: QualityLevel | "") {
  if (q === "strong") return "#16a34a";
  if (q === "usable") return "#d97706";
  if (q === "weak") return "#dc2626";
  return "#94a3b8";
}
function qualityLabel(q: QualityLevel | "") {
  if (q === "strong") return "✅ قوي";
  if (q === "usable") return "⚠️ مقبول";
  if (q === "weak") return "❌ ضعيف";
  return "—";
}

// ── Shared sub-components ────────────────────────────────────────────────────
function SectionCard({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: "white", border: "1px solid #E5E7EB", borderRadius: 12, padding: 18, marginTop: 16 }}>
      {children}
    </div>
  );
}
function Label({ children }: { children: React.ReactNode }) {
  return <p style={{ fontWeight: 700, color: TEAL, marginBottom: 10, fontSize: 15 }}>{children}</p>;
}
function MethodPill({
  label, selected, onClick,
}: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: "8px 16px", borderRadius: 20, border: `2px solid ${selected ? TEAL : "#E5E7EB"}`,
        background: selected ? TEAL : "white", color: selected ? "white" : "#374151",
        fontFamily: "inherit", fontSize: 14, fontWeight: 600, cursor: "pointer",
      }}
    >
      {label}
    </button>
  );
}
function CheckItem({
  label, checked, onChange,
}: { label: string; checked: boolean; onChange: () => void }) {
  return (
    <label style={{
      display: "flex", alignItems: "center", gap: 10, cursor: "pointer",
      padding: "8px 12px", border: "1px solid #E5E7EB", borderRadius: 8,
      background: checked ? "#F0FAF7" : "white",
    }}>
      <input type="checkbox" checked={checked} onChange={onChange} style={{ width: 17, height: 17, accentColor: TEAL }} />
      <span style={{ fontSize: 14, color: "#1F2937" }}>{label}</span>
    </label>
  );
}
function QualityPicker({
  value, onChange,
}: { value: QualityLevel | ""; onChange: (v: QualityLevel) => void }) {
  const opts: { v: QualityLevel; label: string }[] = [
    { v: "weak", label: "❌ ضعيف" },
    { v: "usable", label: "⚠️ مقبول" },
    { v: "strong", label: "✅ قوي" },
  ];
  return (
    <div style={{ marginTop: 8 }}>
      <Label>مؤشر جودة المعلومات</Label>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        {opts.map((o) => (
          <button
            key={o.v}
            type="button"
            onClick={() => onChange(o.v)}
            style={{
              padding: "8px 18px", borderRadius: 20, fontFamily: "inherit", fontWeight: 600,
              fontSize: 14, cursor: "pointer",
              border: `2px solid ${value === o.v ? qualityColor(o.v) : "#E5E7EB"}`,
              background: value === o.v ? qualityColor(o.v) : "white",
              color: value === o.v ? "white" : "#374151",
            }}
          >
            {o.label}
          </button>
        ))}
      </div>
      {value && (
        <p style={{ marginTop: 8, fontSize: 13, color: qualityColor(value), fontWeight: 700 }}>
          المستوى المحدد: {qualityLabel(value)}
        </p>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
function FamilyPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>("family");
  const [student, setStudent] = useState<StoredStudent | null>(null);

  // Family state
  const [family, setFamily] = useState<FamilyData>({
    method: "", sessionDate: "", attendees: "",
    priorities: [], concernsChecked: [], concernsText: "", vision5y: "", quality: "",
  });

  // Learner state
  const [learner, setLearner] = useState<LearnerData>({
    method: "", q_love: "", q_good: "", q_future: "", q_happy: "", q_hard: "",
    environments: [], quality: "",
  });

  // Load saved data
  useEffect(() => {
    try {
      const raw = localStorage.getItem("himam_students");
      if (raw) {
        const list: StoredStudent[] = JSON.parse(raw);
        setStudent(list.find((s) => s.id === id) ?? null);
      }
      const fRaw = localStorage.getItem(familyKey(id));
      if (fRaw) setFamily(JSON.parse(fRaw));
      const lRaw = localStorage.getItem(learnerKey(id));
      if (lRaw) setLearner(JSON.parse(lRaw));
    } catch {}
  }, [id]);

  // Helpers
  function togglePriority(p: string) {
    setFamily((f) => ({
      ...f,
      priorities: f.priorities.includes(p) ? f.priorities.filter((x) => x !== p) : [...f.priorities, p],
    }));
  }
  function toggleConcern(c: string) {
    setFamily((f) => ({
      ...f,
      concernsChecked: f.concernsChecked.includes(c) ? f.concernsChecked.filter((x) => x !== c) : [...f.concernsChecked, c],
    }));
  }
  function toggleEnv(e: string) {
    setLearner((l) => ({
      ...l,
      environments: l.environments.includes(e) ? l.environments.filter((x) => x !== e) : [...l.environments, e],
    }));
  }

  function handleSave() {
    try {
      localStorage.setItem(familyKey(id), JSON.stringify({ ...family, savedAt: new Date().toISOString() }));
      localStorage.setItem(learnerKey(id), JSON.stringify({ ...learner, savedAt: new Date().toISOString() }));
      const raw = localStorage.getItem("himam_students");
      if (raw) {
        const list: StoredStudent[] = JSON.parse(raw);
        const updated = list.map((s) => s.id === id ? { ...s, status: "voice_completed" } : s);
        localStorage.setItem("himam_students", JSON.stringify(updated));
      }
    } catch {}
    toast.success("تم حفظ بيانات الأسرة والمتعلم ✓");
    navigate({ to: "/students/$id/report", params: { id } });
  }

  const familyValid = family.method !== "" && family.priorities.length > 0;
  const learnerValid = learner.method !== "" && learner.q_love.trim() !== "";

  return (
    <div dir="rtl" lang="ar" style={{ minHeight: "100vh", background: "#F8F7F4", fontFamily: "'IBM Plex Sans Arabic', system-ui, sans-serif" }}>
      {/* Header */}
      <header style={{ background: TEAL, color: "white", padding: "14px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontSize: 22, fontWeight: 700 }}>همم</div>
        <Link
          to="/students/$id/iep"
          params={{ id }}
          style={{ color: "white", textDecoration: "none", fontSize: 15, padding: "8px 14px", border: "1px solid rgba(255,255,255,0.4)", borderRadius: 8 }}
        >
          → رجوع
        </Link>
      </header>

      <main style={{ maxWidth: 800, margin: "0 auto", padding: "28px 20px 80px" }}>
        {/* Title */}
        <h1 style={{ fontSize: 26, fontWeight: 800, color: TEAL, margin: 0 }}>صوت الأسرة والمتعلم</h1>
        <p style={{ marginTop: 6, color: "#475569", fontSize: 15 }}>{student?.name ?? "—"}</p>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, marginTop: 20, borderBottom: "2px solid #E5E7EB" }}>
          {([
            { key: "family" as Tab, label: "أ — صوت الأسرة", done: familyValid },
            { key: "learner" as Tab, label: "ب — صوت المتعلم", done: learnerValid },
          ] as const).map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setActiveTab(t.key)}
              style={{
                padding: "10px 20px", fontFamily: "inherit", fontWeight: 700, fontSize: 15,
                border: "none", background: "none", cursor: "pointer",
                color: activeTab === t.key ? TEAL : "#64748B",
                borderBottom: `3px solid ${activeTab === t.key ? TEAL : "transparent"}`,
                marginBottom: -2,
              }}
            >
              {t.label} {t.done && <span style={{ color: "#16a34a", fontSize: 13 }}>✓</span>}
            </button>
          ))}
        </div>

        {/* ── TAB A: Family ─────────────────────────────────────────────── */}
        {activeTab === "family" && (
          <div>
            {/* Method */}
            <SectionCard>
              <Label>طريقة الحصول على المعلومات <span style={{ color: ORANGE }}>*</span></Label>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {(["مقابلة", "استبانة", "هاتفية"] as FamilyMethod[]).map((m) => (
                  <MethodPill key={m} label={m} selected={family.method === m} onClick={() => setFamily((f) => ({ ...f, method: m }))} />
                ))}
              </div>
            </SectionCard>

            {/* Session info */}
            <SectionCard>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div>
                  <Label>تاريخ الجلسة</Label>
                  <input
                    type="date"
                    value={family.sessionDate}
                    onChange={(e) => setFamily((f) => ({ ...f, sessionDate: e.target.value }))}
                    style={{ width: "100%", padding: "10px 12px", border: "1px solid #E5E7EB", borderRadius: 8, fontSize: 14, fontFamily: "inherit", boxSizing: "border-box" }}
                  />
                </div>
                <div>
                  <Label>من حضر الجلسة</Label>
                  <input
                    type="text"
                    value={family.attendees}
                    onChange={(e) => setFamily((f) => ({ ...f, attendees: e.target.value }))}
                    placeholder="مثال: الأب، الأم، الأخت..."
                    style={{ width: "100%", padding: "10px 12px", border: "1px solid #E5E7EB", borderRadius: 8, fontSize: 14, fontFamily: "inherit", boxSizing: "border-box" }}
                  />
                </div>
              </div>
            </SectionCard>

            {/* Priorities */}
            <SectionCard>
              <Label>أولويات الأسرة <span style={{ color: ORANGE }}>*</span></Label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {FAMILY_PRIORITIES.map((p) => (
                  <CheckItem key={p} label={p} checked={family.priorities.includes(p)} onChange={() => togglePriority(p)} />
                ))}
              </div>
            </SectionCard>

            {/* Concerns */}
            <SectionCard>
              <Label>مخاوف الأسرة</Label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 14 }}>
                {FAMILY_CONCERNS_OPTS.map((c) => (
                  <CheckItem key={c} label={c} checked={family.concernsChecked.includes(c)} onChange={() => toggleConcern(c)} />
                ))}
              </div>
              <textarea
                value={family.concernsText}
                onChange={(e) => setFamily((f) => ({ ...f, concernsText: e.target.value }))}
                placeholder="مخاوف إضافية بكلماتكم..."
                rows={3}
                style={{ width: "100%", padding: "10px 12px", border: "1px solid #E5E7EB", borderRadius: 8, fontSize: 14, fontFamily: "inherit", resize: "vertical", boxSizing: "border-box" }}
              />
            </SectionCard>

            {/* Vision 5y */}
            <SectionCard>
              <Label>رؤية الأسرة بعد 5 سنوات</Label>
              <textarea
                value={family.vision5y}
                onChange={(e) => setFamily((f) => ({ ...f, vision5y: e.target.value }))}
                placeholder="ما الذي تتمنى الأسرة أن يكون عليه ابنها/ابنتها بعد 5 سنوات؟"
                rows={4}
                style={{ width: "100%", padding: "10px 12px", border: "1px solid #E5E7EB", borderRadius: 8, fontSize: 14, fontFamily: "inherit", resize: "vertical", boxSizing: "border-box" }}
              />
            </SectionCard>

            {/* Quality */}
            <SectionCard>
              <QualityPicker value={family.quality} onChange={(v) => setFamily((f) => ({ ...f, quality: v }))} />
            </SectionCard>

            <div style={{ marginTop: 16, textAlign: "left" }}>
              <button
                type="button"
                onClick={() => setActiveTab("learner")}
                style={{ background: TEAL, color: "white", border: "none", padding: "12px 28px", borderRadius: 10, fontWeight: 700, fontSize: 15, cursor: "pointer", fontFamily: "inherit", opacity: familyValid ? 1 : 0.5 }}
              >
                التالي: صوت المتعلم ←
              </button>
            </div>
          </div>
        )}

        {/* ── TAB B: Learner ────────────────────────────────────────────── */}
        {activeTab === "learner" && (
          <div>
            {/* Method */}
            <SectionCard>
              <Label>طريقة الحصول على المعلومات <span style={{ color: ORANGE }}>*</span></Label>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {(["كلام", "AAC", "بصري", "ملاحظة"] as LearnerMethod[]).map((m) => (
                  <MethodPill key={m} label={m} selected={learner.method === m} onClick={() => setLearner((l) => ({ ...l, method: m }))} />
                ))}
              </div>
            </SectionCard>

            {/* 5 questions */}
            {([
              { key: "q_love" as const,   emoji: "❤️",  label: "ماذا تحب؟",              required: true  },
              { key: "q_good" as const,   emoji: "💪",  label: "ما الذي تجيده؟",          required: false },
              { key: "q_future" as const, emoji: "🌈",  label: "ماذا تريد مستقبلاً؟",    required: false },
              { key: "q_happy" as const,  emoji: "☀️",  label: "ما الذي يسعدك؟",         required: false },
              { key: "q_hard" as const,   emoji: "🤔",  label: "ما الصعوبات؟ (اختياري)", required: false },
            ]).map((q) => (
              <SectionCard key={q.key}>
                <Label>
                  <span style={{ fontSize: 22, marginLeft: 8 }}>{q.emoji}</span>
                  {q.label}
                  {q.required && <span style={{ color: ORANGE }}> *</span>}
                </Label>
                <textarea
                  value={learner[q.key]}
                  onChange={(e) => setLearner((l) => ({ ...l, [q.key]: e.target.value }))}
                  placeholder="اكتب إجابة المتعلم..."
                  rows={3}
                  style={{ width: "100%", padding: "10px 12px", border: "1px solid #E5E7EB", borderRadius: 8, fontSize: 14, fontFamily: "inherit", resize: "vertical", boxSizing: "border-box" }}
                />
              </SectionCard>
            ))}

            {/* Comfortable environments */}
            <SectionCard>
              <Label>البيئات المريحة للمتعلم</Label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {COMFORTABLE_ENVS.map((e) => (
                  <CheckItem key={e} label={e} checked={learner.environments.includes(e)} onChange={() => toggleEnv(e)} />
                ))}
              </div>
            </SectionCard>

            {/* Quality */}
            <SectionCard>
              <QualityPicker value={learner.quality} onChange={(v) => setLearner((l) => ({ ...l, quality: v }))} />
            </SectionCard>

            {/* Save button */}
            <div style={{ marginTop: 24 }}>
              <button
                type="button"
                onClick={handleSave}
                disabled={!familyValid || !learnerValid}
                style={{
                  width: "100%", background: TEAL, color: "white", border: "none",
                  padding: "14px 18px", borderRadius: 10, fontWeight: 700, fontSize: 16,
                  cursor: familyValid && learnerValid ? "pointer" : "not-allowed",
                  opacity: familyValid && learnerValid ? 1 : 0.5, fontFamily: "inherit",
                }}
              >
                حفظ وإنشاء التقرير النهائي ←
              </button>
              {(!familyValid || !learnerValid) && (
                <p style={{ textAlign: "center", color: "#94A3B8", fontSize: 13, marginTop: 8 }}>
                  {!familyValid ? "أكمل قسم الأسرة أولاً (الطريقة + الأولويات)" : "أكمل طريقة الحصول وسؤال ماذا تحب؟"}
                </p>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
