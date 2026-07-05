import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { advanceStage } from "../lib/journey";
import { JourneyStepper } from "@/components/journey-stepper";

export const Route = createFileRoute("/students/$id/student-voice")({
  component: StudentVoicePage,
  head: () => ({
    meta: [
      { title: "صوت المتعلم — همم" },
      { name: "description", content: "تسجيل صوت المتعلم لخطة الانتقال." },
    ],
  }),
});

const TEAL = "#0F3D3E";
const ORANGE = "#D9764A";

type QualityLevel = "weak" | "usable" | "strong";
type LearnerMethod = "كلام" | "AAC" | "بصري" | "ملاحظة" | "";

const COMFORTABLE_ENVS = [
  "المنزل", "الفصل الدراسي", "الطبيعة الخارجية",
  "بيئة العمل", "الأماكن العامة", "مكان هادئ",
];

type LearnerData = {
  method: LearnerMethod;
  q_love: string; q_good: string; q_future: string; q_happy: string; q_hard: string;
  environments: string[];
  quality: QualityLevel | "";
};

type StoredStudent = { id: string; name: string; [k: string]: string };

function qualityColor(q: QualityLevel | "") {
  if (q === "strong") return "#16a34a";
  if (q === "usable") return "#d97706";
  if (q === "weak")   return "#dc2626";
  return "#94a3b8";
}
function qualityLabel(q: QualityLevel | "") {
  if (q === "strong") return "✅ قوي";
  if (q === "usable") return "⚠️ مقبول";
  if (q === "weak")   return "❌ ضعيف";
  return "—";
}

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
function MethodPill({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
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
function CheckItem({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
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
function QualityPicker({ value, onChange }: { value: QualityLevel | ""; onChange: (v: QualityLevel) => void }) {
  const opts: { v: QualityLevel; label: string }[] = [
    { v: "weak",   label: "❌ ضعيف"  },
    { v: "usable", label: "⚠️ مقبول" },
    { v: "strong", label: "✅ قوي"   },
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

function StudentVoicePage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [loaded, setLoaded] = useState(false);
  const [student, setStudent] = useState<StoredStudent | null>(null);
  const [learner, setLearner] = useState<LearnerData>({
    method: "", q_love: "", q_good: "", q_future: "", q_happy: "", q_hard: "",
    environments: [], quality: "",
  });

  useEffect(() => {
    try {
      const raw = localStorage.getItem("himam_students");
      if (raw) {
        const list: StoredStudent[] = JSON.parse(raw);
        setStudent(list.find((s) => s.id === id) ?? null);
      }
      const lRaw = localStorage.getItem(`himam_learner_voice_${id}`);
      if (lRaw) setLearner(JSON.parse(lRaw));
    } catch {}
    setLoaded(true);
  }, [id]);

  function toggleEnv(e: string) {
    setLearner((l) => ({
      ...l,
      environments: l.environments.includes(e)
        ? l.environments.filter((x) => x !== e)
        : [...l.environments, e],
    }));
  }

  function handleSave() {
    try {
      localStorage.setItem(
        `himam_learner_voice_${id}`,
        JSON.stringify({ ...learner, savedAt: new Date().toISOString() }),
      );
      const raw = localStorage.getItem("himam_students");
      if (raw) {
        const list: StoredStudent[] = JSON.parse(raw);
        const updated = list.map((s) => s.id === id ? { ...s, status: advanceStage(s.status, "learner_voice_completed") } : s);
        localStorage.setItem("himam_students", JSON.stringify(updated));
      }
    } catch {}
    toast.success("تم حفظ صوت المتعلم ✓");
    navigate({ to: "/students/$id/iep", params: { id } });
  }

  function handleSkip() {
    try {
      const raw = localStorage.getItem("himam_students");
      if (raw) {
        const list: StoredStudent[] = JSON.parse(raw);
        const updated = list.map((s) => s.id === id ? { ...s, status: advanceStage(s.status, "learner_voice_skipped") } : s);
        localStorage.setItem("himam_students", JSON.stringify(updated));
      }
    } catch {}
    navigate({ to: "/students/$id/iep", params: { id } });
  }

  return (
    <div dir="rtl" lang="ar" style={{ minHeight: "100vh", background: "#F8F7F4", fontFamily: "'IBM Plex Sans Arabic', system-ui, sans-serif" }}>
      <header style={{ background: TEAL, color: "white", padding: "14px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontSize: 22, fontWeight: 700 }}>همم</div>
        <Link
          to="/students/$id/family"
          params={{ id }}
          style={{ color: "white", textDecoration: "none", fontSize: 15, padding: "8px 14px", border: "1px solid rgba(255,255,255,0.4)", borderRadius: 8 }}
        >
          → رجوع
        </Link>
      </header>

      <main style={{ maxWidth: 800, margin: "0 auto", padding: "28px 20px 80px" }}>
        <JourneyStepper studentId={id} currentStep="learner_voice" status={student?.status} />

        <h1 style={{ fontSize: 26, fontWeight: 800, color: TEAL, margin: 0 }}>صوت المتعلم</h1>
        <p style={{ marginTop: 6, color: "#475569", fontSize: 15 }}>{student?.name ?? "—"}</p>

        {!loaded ? null : (
          <>
            <SectionCard>
              <Label>طريقة الحصول على المعلومات <span style={{ color: ORANGE }}>*</span></Label>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {(["كلام", "AAC", "بصري", "ملاحظة"] as LearnerMethod[]).map((m) => (
                  <MethodPill key={m} label={m} selected={learner.method === m} onClick={() => setLearner((l) => ({ ...l, method: m }))} />
                ))}
              </div>
            </SectionCard>

            {([
              { key: "q_love"   as const, emoji: "❤️", label: "ماذا تحب؟",              required: true  },
              { key: "q_good"   as const, emoji: "💪", label: "ما الذي تجيده؟",          required: false },
              { key: "q_future" as const, emoji: "🌈", label: "ماذا تريد مستقبلاً؟",    required: false },
              { key: "q_happy"  as const, emoji: "☀️", label: "ما الذي يسعدك؟",         required: false },
              { key: "q_hard"   as const, emoji: "🤔", label: "ما الصعوبات؟ (اختياري)", required: false },
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

            <SectionCard>
              <Label>البيئات المريحة للمتعلم</Label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {COMFORTABLE_ENVS.map((e) => (
                  <CheckItem key={e} label={e} checked={learner.environments.includes(e)} onChange={() => toggleEnv(e)} />
                ))}
              </div>
            </SectionCard>

            <SectionCard>
              <QualityPicker value={learner.quality} onChange={(v) => setLearner((l) => ({ ...l, quality: v }))} />
            </SectionCard>

            <div style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 12 }}>
              <button
                type="button"
                onClick={handleSave}
                style={{
                  width: "100%", background: TEAL, color: "white", border: "none",
                  padding: "14px 18px", borderRadius: 10, fontWeight: 700, fontSize: 16,
                  cursor: "pointer", fontFamily: "inherit",
                }}
              >
                حفظ والمتابعة للخطة التربوية ←
              </button>
              <button
                type="button"
                onClick={handleSkip}
                style={{
                  width: "100%", background: "white", color: "#64748B", border: "1px solid #E5E7EB",
                  padding: "12px 18px", borderRadius: 10, fontWeight: 600, fontSize: 15,
                  cursor: "pointer", fontFamily: "inherit",
                }}
              >
                تخطّ هذه الخطوة
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
