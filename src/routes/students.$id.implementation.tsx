import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { JourneyStepper } from "@/components/journey-stepper";
import { advanceStage } from "@/lib/journey";

export const Route = createFileRoute("/students/$id/implementation")({
  component: ImplementationPage,
  head: () => ({
    meta: [
      { title: "تنفيذ التدريب والشواهد — همم" },
      { name: "description", content: "تسجيل جلسات التدريب وشواهد تنفيذ أهداف الخطة." },
    ],
  }),
});

type StoredStudent = { id: string; name: string; center: string; tool: string; status: string };
type PlanGoal = {
  goalId: string;
  domainCode: string;
  goalText: string;
  selectedActivities: string[];
  context: string;
};

type TrainingSession = {
  id: string;
  learnerId: string;
  goalId: string;
  activity: string;
  date: string;
  context: string;
  supportLevel: "intensive" | "moderate" | "minimal_reminder" | "none";
  performance: "attempted" | "emerging" | "achieved" | "generalized";
  evidenceType: "direct_observation" | "checklist" | "family_report" | "learner_self_report" | "generalization_probe";
  notes: string;
};

type PlanData = { goals?: PlanGoal[] };

const TEAL = "#0F3D3E";

function safeParse<T>(key: string): T | null {
  try { return JSON.parse(localStorage.getItem(key) || "null"); }
  catch { return null; }
}

function ImplementationPage() {
  const { id } = Route.useParams();
  const [student, setStudent] = useState<StoredStudent | null>(null);
  const [goals, setGoals] = useState<PlanGoal[]>([]);
  const [sessions, setSessions] = useState<TrainingSession[]>([]);
  const [goalId, setGoalId] = useState("");
  const [activity, setActivity] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [supportLevel, setSupportLevel] = useState<TrainingSession["supportLevel"]>("moderate");
  const [performance, setPerformance] = useState<TrainingSession["performance"]>("emerging");
  const [evidenceType, setEvidenceType] = useState<TrainingSession["evidenceType"]>("direct_observation");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    const students = safeParse<StoredStudent[]>("himam_students") ?? [];
    const current = students.find((item) => item.id === id) ?? null;
    setStudent(current);
    const plan = safeParse<PlanData>(`himam_plan_${id}`);
    const activeGoals = (plan?.goals ?? []).filter((goal) => goal.selectedActivities.length > 0);
    setGoals(activeGoals);
    setGoalId(activeGoals[0]?.goalId ?? "");
    setActivity(activeGoals[0]?.selectedActivities[0] ?? "");
    setSessions(safeParse<TrainingSession[]>(`himam_training_${id}`) ?? []);
  }, [id]);

  const selectedGoal = goals.find((goal) => goal.goalId === goalId);
  const selectedActivities = selectedGoal?.selectedActivities ?? [];

  function handleGoalChange(nextGoalId: string) {
    setGoalId(nextGoalId);
    const nextGoal = goals.find((goal) => goal.goalId === nextGoalId);
    setActivity(nextGoal?.selectedActivities[0] ?? "");
  }

  function handleSave() {
    if (!goalId || !activity) return;
    const session: TrainingSession = {
      id: crypto.randomUUID(),
      learnerId: id,
      goalId,
      activity,
      date,
      context: selectedGoal?.context ?? "المركز / المدرسة",
      supportLevel,
      performance,
      evidenceType,
      notes: notes.trim(),
    };
    const next = [...sessions, session];
    setSessions(next);
    localStorage.setItem(`himam_training_${id}`, JSON.stringify(next));
    const students = safeParse<StoredStudent[]>("himam_students") ?? [];
    localStorage.setItem("himam_students", JSON.stringify(
      students.map((item) => item.id === id ? { ...item, status: advanceStage(item.status, "implementation_recorded") } : item),
    ));
    setNotes("");
  }

  return (
    <div dir="rtl" lang="ar" style={{ minHeight: "100vh", background: "#FAF7F2", fontFamily: "system-ui, sans-serif" }}>
      <header style={{ background: TEAL, color: "white", padding: "14px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontSize: 22, fontWeight: 700 }}>همم</div>
        <Link to="/students/$id/plan" params={{ id }} style={{ color: "white", textDecoration: "none", border: "1px solid rgba(255,255,255,.4)", borderRadius: 8, padding: "8px 14px" }}>
          → رجوع للخطة
        </Link>
      </header>

      <main style={{ maxWidth: 900, margin: "0 auto", padding: "28px 20px 60px" }}>
        <JourneyStepper studentId={id} currentStep="plan" status={student?.status} />
        <h1 style={{ margin: 0, color: TEAL, fontSize: 26, fontWeight: 800 }}>تنفيذ التدريب والشواهد</h1>
        <p style={{ marginTop: 6, color: "#64748B", fontSize: 14 }}>{student?.name ?? "—"}</p>

        {goals.length === 0 ? (
          <section style={cardStyle}>
            <p style={{ margin: 0, color: "#64748B" }}>لا توجد أهداف بأنشطة مختارة بعد. اختر نشاطا من الخطة أولا.</p>
          </section>
        ) : (
          <section style={cardStyle}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Field label="الهدف">
                <select value={goalId} onChange={(event) => handleGoalChange(event.target.value)} style={inputStyle}>
                  {goals.map((goal) => (
                    <option key={goal.goalId} value={goal.goalId}>{goal.goalText}</option>
                  ))}
                </select>
              </Field>
              <Field label="النشاط">
                <select value={activity} onChange={(event) => setActivity(event.target.value)} style={inputStyle}>
                  {selectedActivities.map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </select>
              </Field>
              <Field label="تاريخ الجلسة">
                <input type="date" value={date} onChange={(event) => setDate(event.target.value)} style={inputStyle} />
              </Field>
              <Field label="مستوى الدعم">
                <select value={supportLevel} onChange={(event) => setSupportLevel(event.target.value as TrainingSession["supportLevel"])} style={inputStyle}>
                  <option value="intensive">دعم كثيف</option>
                  <option value="moderate">دعم متوسط</option>
                  <option value="minimal_reminder">تذكير خفيف</option>
                  <option value="none">دون دعم</option>
                </select>
              </Field>
              <Field label="الأداء">
                <select value={performance} onChange={(event) => setPerformance(event.target.value as TrainingSession["performance"])} style={inputStyle}>
                  <option value="attempted">حاول</option>
                  <option value="emerging">ناشئ</option>
                  <option value="achieved">تحقق</option>
                  <option value="generalized">تعمم</option>
                </select>
              </Field>
              <Field label="نوع الشاهد">
                <select value={evidenceType} onChange={(event) => setEvidenceType(event.target.value as TrainingSession["evidenceType"])} style={inputStyle}>
                  <option value="direct_observation">ملاحظة مباشرة</option>
                  <option value="checklist">قائمة تحقق</option>
                  <option value="family_report">تقرير الأسرة</option>
                  <option value="learner_self_report">تقرير ذاتي</option>
                  <option value="generalization_probe">مسبار تعميم</option>
                </select>
              </Field>
            </div>
            <textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="ملاحظة الجلسة أو وصف الشاهد" rows={3} style={{ ...inputStyle, marginTop: 12, resize: "vertical" }} />
            <button type="button" onClick={handleSave} style={{ marginTop: 12, background: TEAL, color: "white", border: "none", borderRadius: 8, padding: "10px 18px", fontWeight: 700, cursor: "pointer" }}>
              حفظ جلسة التدريب
            </button>
          </section>
        )}

        <section style={cardStyle}>
          <h2 style={{ margin: "0 0 12px", color: TEAL, fontSize: 18 }}>الجلسات المسجلة</h2>
          {sessions.length === 0 ? (
            <p style={{ margin: 0, color: "#94A3B8" }}>لا توجد جلسات بعد.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {sessions.map((session) => (
                <div key={session.id} style={{ border: "1px solid #E5E7EB", borderRadius: 8, padding: 12, background: "#F8FAFC" }}>
                  <p style={{ margin: 0, fontWeight: 700, color: "#1F2937" }}>{session.activity}</p>
                  <p style={{ margin: "4px 0 0", fontSize: 12, color: "#64748B" }}>
                    {session.date} · {session.context} · {session.supportLevel} · {session.performance} · {session.evidenceType}
                  </p>
                  {session.notes && <p style={{ margin: "6px 0 0", fontSize: 13, color: "#374151" }}>{session.notes}</p>}
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 5, fontSize: 12, fontWeight: 700, color: "#64748B" }}>
      {label}
      {children}
    </label>
  );
}

const cardStyle: React.CSSProperties = {
  marginTop: 20,
  background: "white",
  border: "1px solid #E5E7EB",
  borderRadius: 12,
  padding: 18,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  border: "1px solid #E5E7EB",
  borderRadius: 8,
  padding: "9px 10px",
  fontFamily: "inherit",
  fontSize: 13,
  background: "white",
};
