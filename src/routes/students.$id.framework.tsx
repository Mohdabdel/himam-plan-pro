import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/students/$id/framework")({
  component: FrameworkPage,
  head: () => ({
    meta: [
      { title: "إطار أهداف الانتقال — همم" },
      { name: "description", content: "إطار أهداف الانتقال النهائي للمستفيد." },
    ],
  }),
});

type StoredStudent = {
  id: string;
  name: string;
  tool: string;
  status: string;
};

type Cell = "match" | "neutral" | "gap";
type MatrixRow = { goal: string; cells: [Cell, Cell, Cell, Cell] };

const DOMAINS = ["التشغيل", "الحياة المستقلة", "المشاركة المجتمعية", "التعليم والتدريب"];

const MATRIX: MatrixRow[] = [
  {
    goal: "تطوير مهارات التواصل مع الزملاء",
    cells: ["match", "neutral", "match", "neutral"],
  },
  {
    goal: "اكتساب مهارات استخدام التقنية",
    cells: ["match", "match", "neutral", "match"],
  },
];

type SourceKey = "assessment" | "student" | "family";
const SOURCE_META: Record<SourceKey, { label: string; bg: string; color: string }> = {
  assessment: { label: "من التقييم", bg: "#E6F2F1", color: "#0F3D3E" },
  student: { label: "من الطالب", bg: "#E0EBFA", color: "#1E3A8A" },
  family: { label: "من الأسرة", bg: "#EFE4FA", color: "#5B2A86" },
};

type SuggestedGoal = {
  id: string;
  domain: string;
  text: string;
  source: SourceKey;
};

const SUGGESTED: SuggestedGoal[] = [
  {
    id: "g1",
    domain: "التشغيل",
    text: "تطوير مهارات التواصل مع أصحاب العمل باستخدام التقنية",
    source: "assessment",
  },
  {
    id: "g2",
    domain: "الحياة المستقلة",
    text: "تعزيز الاستقلالية في التنقل وإدارة الأمور اليومية",
    source: "student",
  },
  {
    id: "g3",
    domain: "التعليم والتدريب",
    text: "تنمية مهارات تقرير المصير والمشاركة في صنع القرار",
    source: "assessment",
  },
  {
    id: "g4",
    domain: "المشاركة المجتمعية",
    text: "تطوير العلاقات الاجتماعية والمشاركة في الأنشطة المجتمعية",
    source: "family",
  },
];

type GoalState = "pending" | "accepted" | "editing" | "rejected";

function CellIcon({ value }: { value: Cell }) {
  if (value === "match") return <span style={{ color: "#1F8A4C", fontSize: 18, fontWeight: 700 }}>✓</span>;
  if (value === "neutral") return <span style={{ color: "#D9764A", fontSize: 18, fontWeight: 700 }}>○</span>;
  return <span style={{ color: "#C0392B", fontSize: 18, fontWeight: 700 }}>✗</span>;
}

function FrameworkPage() {
  const { id } = Route.useParams();
  const [student, setStudent] = useState<StoredStudent | null>(null);
  const [goals, setGoals] = useState(
    SUGGESTED.map((g) => ({ ...g, state: "pending" as GoalState }))
  );

  useEffect(() => {
    try {
      const raw = localStorage.getItem("himam_students");
      const list: StoredStudent[] = raw ? JSON.parse(raw) : [];
      const s = list.find((x) => x.id === id);
      if (s) setStudent(s);
      else if (id === "demo-complete") {
        setStudent({
          id: "demo-complete",
          name: "أحمد محمد السالم",
          center: "مركز التواصل - أبوظبي",
          tool: "TTAP - Transition Assessment Profile (2nd Edition)",
        } as StoredStudent);
      }
    } catch {}
  }, [id]);

  const updateGoal = (gid: string, patch: Partial<(typeof goals)[number]>) => {
    setGoals((prev) => prev.map((g) => (g.id === gid ? { ...g, ...patch } : g)));
  };

  return (
    <div dir="rtl" style={{ minHeight: "100vh", background: "#F7F5F0", fontFamily: "system-ui, sans-serif" }}>
      {/* Top bar */}
      <header
        style={{
          background: "#0F3D3E",
          color: "white",
          padding: "14px 24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div style={{ fontWeight: 700, fontSize: 20 }}>همم</div>
        <Link
          to="/"
          style={{ color: "white", textDecoration: "none", fontSize: 14 }}
        >
          → رجوع
        </Link>
      </header>

      <main style={{ maxWidth: 960, margin: "0 auto", padding: "24px 20px 80px" }}>
        <h1 style={{ fontSize: 26, color: "#0F3D3E", margin: 0 }}>إطار أهداف الانتقال</h1>
        <div style={{ marginTop: 6, color: "#555", fontSize: 15 }}>
          {student?.name ?? "—"}
        </div>

        {/* Section 1 — Confidence Banner */}
        <section
          style={{
            marginTop: 24,
            background: "#E6F2F1",
            border: "1px solid #C8DEDD",
            borderRadius: 10,
            padding: 16,
            display: "flex",
            alignItems: "center",
            gap: 16,
          }}
        >
          <div style={{ fontSize: 32, fontWeight: 800, color: "#0F3D3E", minWidth: 80 }}>
            80%
          </div>
          <div>
            <div style={{ fontWeight: 700, color: "#0F3D3E", fontSize: 16 }}>
              مستوى الثقة الإجمالي
            </div>
            <div style={{ color: "#5b6b6b", fontSize: 13, marginTop: 4 }}>
              مبني على TTAP + بيانات الطالب والأسرة + 8 خبراء إماراتيين + إطار NTACT-C 2021
            </div>
          </div>
        </section>

        {/* Section 2 — Consistency Matrix */}
        <section style={{ marginTop: 28 }}>
          <h2 style={{ color: "#0F3D3E", fontSize: 18, margin: 0 }}>مصفوفة الاتساق</h2>
          <div style={{ color: "#777", fontSize: 13, marginTop: 4 }}>
            الأهداف × مجالات الانتقال
          </div>

          <div
            style={{
              marginTop: 12,
              background: "white",
              border: "1px solid #E5E2DA",
              borderRadius: 10,
              overflow: "hidden",
            }}
          >
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
              <thead>
                <tr style={{ background: "#F1EEE6" }}>
                  <th style={{ textAlign: "right", padding: 12, color: "#0F3D3E" }}>الهدف</th>
                  {DOMAINS.map((d) => (
                    <th key={d} style={{ padding: 12, color: "#0F3D3E", textAlign: "center" }}>
                      {d}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {MATRIX.map((row, idx) => (
                  <tr key={idx} style={{ borderTop: "1px solid #EFEBE2" }}>
                    <td style={{ padding: 12, color: "#333" }}>{row.goal}</td>
                    {row.cells.map((c, i) => (
                      <td key={i} style={{ padding: 12, textAlign: "center" }}>
                        <CellIcon value={c} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ marginTop: 10, fontSize: 13, color: "#555", display: "flex", gap: 16 }}>
            <span><span style={{ color: "#1F8A4C", fontWeight: 700 }}>✓</span> متوافق</span>
            <span><span style={{ color: "#D9764A", fontWeight: 700 }}>○</span> محايد</span>
            <span><span style={{ color: "#C0392B", fontWeight: 700 }}>✗</span> فجوة</span>
          </div>
        </section>

        {/* Section 3 — Suggested Goals */}
        <section style={{ marginTop: 32 }}>
          <h2 style={{ color: "#0F3D3E", fontSize: 18, margin: 0 }}>الأهداف المقترحة</h2>
          <div style={{ color: "#777", fontSize: 13, marginTop: 4 }}>
            مقترحة بناءً على التقييم والخطة وبيانات الطالب والأسرة
          </div>

          <div style={{ marginTop: 14, display: "grid", gap: 12 }}>
            {goals.map((g) => {
              const meta = SOURCE_META[g.source];
              if (g.state === "rejected") {
                return (
                  <div
                    key={g.id}
                    style={{
                      opacity: 0.35,
                      background: "white",
                      border: "1px solid #E5E2DA",
                      borderRadius: 10,
                      padding: 16,
                      transition: "opacity 0.3s",
                    }}
                  >
                    <div style={{ fontSize: 13, color: "#888" }}>
                      {g.domain} — تم رفض الهدف
                    </div>
                  </div>
                );
              }
              const accepted = g.state === "accepted";
              return (
                <div
                  key={g.id}
                  style={{
                    background: accepted ? "#E8F5EC" : "white",
                    border: `1px solid ${accepted ? "#9DD5AE" : "#E5E2DA"}`,
                    borderRadius: 10,
                    padding: 16,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                    <div style={{ fontWeight: 700, color: "#0F3D3E", fontSize: 14 }}>{g.domain}</div>
                    <span
                      style={{
                        background: meta.bg,
                        color: meta.color,
                        fontSize: 12,
                        padding: "4px 10px",
                        borderRadius: 999,
                        fontWeight: 600,
                      }}
                    >
                      {meta.label}
                    </span>
                  </div>

                  {accepted ? (
                    <div style={{ marginTop: 10, color: "#1F8A4C", fontWeight: 700, fontSize: 14 }}>
                      ✓ تم قبول الهدف
                    </div>
                  ) : g.state === "editing" ? (
                    <input
                      value={g.text}
                      onChange={(e) => updateGoal(g.id, { text: e.target.value })}
                      onBlur={() => updateGoal(g.id, { state: "pending" })}
                      autoFocus
                      style={{
                        marginTop: 10,
                        width: "100%",
                        padding: "10px 12px",
                        border: "1px solid #C8DEDD",
                        borderRadius: 8,
                        fontSize: 14,
                        fontFamily: "inherit",
                        direction: "rtl",
                      }}
                    />
                  ) : (
                    <div style={{ marginTop: 10, color: "#333", fontSize: 14, lineHeight: 1.6 }}>
                      {g.text}
                    </div>
                  )}

                  {!accepted && (
                    <div style={{ marginTop: 14, display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <button
                        type="button"
                        onClick={() => updateGoal(g.id, { state: "accepted" })}
                        style={{
                          background: "#1F8A4C",
                          color: "white",
                          border: "none",
                          padding: "8px 18px",
                          borderRadius: 8,
                          fontSize: 13,
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                      >
                        قبول
                      </button>
                      <button
                        type="button"
                        onClick={() => updateGoal(g.id, { state: "editing" })}
                        style={{
                          background: "#E5E5E5",
                          color: "#333",
                          border: "none",
                          padding: "8px 18px",
                          borderRadius: 8,
                          fontSize: 13,
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                      >
                        تعديل
                      </button>
                      <button
                        type="button"
                        onClick={() => updateGoal(g.id, { state: "rejected" })}
                        style={{
                          background: "white",
                          color: "#C0392B",
                          border: "1px solid #C0392B",
                          padding: "8px 18px",
                          borderRadius: 8,
                          fontSize: 13,
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                      >
                        رفض
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Bottom button */}
        <button
          type="button"
          onClick={() => alert("تصدير PDF — قيد التطوير")}
          style={{
            marginTop: 32,
            width: "100%",
            background: "#D9764A",
            color: "white",
            border: "none",
            padding: "14px",
            borderRadius: 10,
            fontSize: 15,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          تصدير PDF
        </button>
      </main>
    </div>
  );
}
