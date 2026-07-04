import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/students/$id/iep")({
  component: IEPPage,
  head: () => ({
    meta: [
      { title: "الخطة التربوية الفردية — همم" },
      { name: "description", content: "إدخال الخطة التربوية الفردية للمستفيد." },
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

type DomainCode = "VS" | "VB" | "IF" | "LS" | "FC" | "IB" | "COG" | "COM" | "SOC" | "ADL" | "VOC" | "MOT";
type GoalCategory = "أكاديمي" | "وظيفي" | "اجتماعي" | "عملي";
type Goal = { id: string; text: string; category: GoalCategory | "" };

const TTAP_DOMAINS: { code: DomainCode; name: string }[] = [
  { code: "VS", name: "المهارات المهنية" },
  { code: "VB", name: "السلوكيات المهنية" },
  { code: "IF", name: "الأداء الوظيفي المستقل" },
  { code: "LS", name: "مهارات الترفيه" },
  { code: "FC", name: "التواصل الوظيفي" },
  { code: "IB", name: "السلوك البينشخصي" },
];

const GENERIC_DOMAINS: { code: DomainCode; name: string }[] = [
  { code: "COG", name: "المهارات المعرفية" },
  { code: "COM", name: "التواصل واللغة" },
  { code: "SOC", name: "المهارات الاجتماعية" },
  { code: "ADL", name: "مهارات الحياة اليومية" },
  { code: "VOC", name: "التأهيل المهني" },
  { code: "MOT", name: "المهارات الحركية" },
];

const CATEGORIES: GoalCategory[] = ["أكاديمي", "وظيفي", "اجتماعي", "عملي"];

const SUPPORT_SERVICES = [
  "دعم التواصل",
  "التدريب المهني",
  "الدعم الأكاديمي",
  "التدريب على المهارات الحياتية",
  "خدمات إعادة التأهيل المهني",
];

const TEAL = "#0F3D3E";
const ORANGE = "#D9764A";

function emptyGoalMap(domains: { code: DomainCode }[]): Record<DomainCode, Goal[]> {
  return Object.fromEntries(domains.map((d): [DomainCode, Goal[]] => [d.code, []])) as Record<DomainCode, Goal[]>;
}
function emptyOpenMap(domains: { code: DomainCode }[]): Record<DomainCode, boolean> {
  return Object.fromEntries(domains.map((d) => [d.code, false])) as Record<DomainCode, boolean>;
}

function IEPPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [loaded, setLoaded] = useState(false);
  const [student, setStudent] = useState<StoredStudent | null>(null);
  const [vision, setVision] = useState("");

  const domains = student?.tool?.includes("TTAP") ? TTAP_DOMAINS : GENERIC_DOMAINS;

  const [goals, setGoals] = useState<Record<DomainCode, Goal[]>>(emptyGoalMap(TTAP_DOMAINS));
  const [open, setOpen] = useState<Record<DomainCode, boolean>>(emptyOpenMap(TTAP_DOMAINS));
  const [services, setServices] = useState<string[]>([]);
  const [startDate, setStartDate] = useState("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem("himam_students");
      if (raw) {
        const list: StoredStudent[] = JSON.parse(raw);
        setStudent(list.find((s) => s.id === id) ?? null);
      }
      const iepRaw = localStorage.getItem(`himam_iep_${id}`);
      if (iepRaw) {
        const data = JSON.parse(iepRaw);
        const found = raw ? (JSON.parse(raw) as StoredStudent[]).find((s) => s.id === id) : null;
        const activeDomains = found?.tool?.includes("TTAP") ? TTAP_DOMAINS : GENERIC_DOMAINS;
        if (data.vision) setVision(data.vision);
        if (data.goals) setGoals({ ...emptyGoalMap(activeDomains), ...data.goals });
        if (data.services) setServices(data.services);
        if (data.startDate) setStartDate(data.startDate);
      }
    } catch {}
    setLoaded(true);
  }, [id]);

  function addGoal(code: DomainCode) {
    setGoals((g) => ({
      ...g,
      [code]: [...g[code], { id: crypto.randomUUID(), text: "", category: "" }],
    }));
  }
  function updateGoalText(code: DomainCode, gid: string, text: string) {
    setGoals((g) => ({
      ...g,
      [code]: g[code].map((x) => (x.id === gid ? { ...x, text } : x)),
    }));
  }
  function updateGoalCategory(code: DomainCode, gid: string, cat: GoalCategory | "") {
    setGoals((g) => ({
      ...g,
      [code]: g[code].map((x) => (x.id === gid ? { ...x, category: cat } : x)),
    }));
  }
  function deleteGoal(code: DomainCode, gid: string) {
    setGoals((g) => ({ ...g, [code]: g[code].filter((x) => x.id !== gid) }));
  }
  function toggleService(s: string) {
    setServices((cur) => (cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]));
  }

  function handleSave() {
    try {
      localStorage.setItem(
        `himam_iep_${id}`,
        JSON.stringify({ vision, goals, services, startDate, savedAt: new Date().toISOString() }),
      );
      const raw = localStorage.getItem("himam_students");
      if (raw) {
        const list: StoredStudent[] = JSON.parse(raw);
        const updated = list.map((s) => (s.id === id ? { ...s, status: "iep_completed" } : s));
        localStorage.setItem("himam_students", JSON.stringify(updated));
      }
    } catch {}
    toast.success("تم حفظ الخطة بنجاح ✓");
    navigate({ to: "/students/$id/plan", params: { id } });
  }

  return (
    <div dir="rtl" lang="ar" style={{ minHeight: "100vh", background: "#F8F7F4", fontFamily: "system-ui, sans-serif" }}>
      <header
        style={{
          background: TEAL, color: "white", padding: "14px 24px",
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}
      >
        <div style={{ fontSize: 22, fontWeight: 700 }}>همم</div>
        <Link
          to="/students/$id/student-voice"
          params={{ id }}
          style={{
            color: "white", textDecoration: "none", fontSize: 15,
            padding: "8px 14px", border: "1px solid rgba(255,255,255,0.4)", borderRadius: 8,
          }}
        >
          → رجوع
        </Link>
      </header>

      <main style={{ maxWidth: 960, margin: "0 auto", padding: "28px 20px 60px" }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: TEAL, margin: 0 }}>
          الخطة التربوية الفردية
        </h1>
        <p style={{ marginTop: 6, color: "#475569", fontSize: 15 }}>
          {student ? student.name : "—"}
        </p>

        {/* Section 1 - Vision */}
        <section style={cardStyle}>
          <label style={labelStyle}>رؤية الخطة</label>
          <textarea
            value={vision}
            onChange={(e) => setVision(e.target.value)}
            placeholder="اكتب الرؤية العامة للخطة..."
            rows={4}
            style={{
              width: "100%", padding: "12px 14px", border: "1px solid #E5E7EB",
              borderRadius: 8, fontSize: 15, fontFamily: "inherit", resize: "vertical",
              boxSizing: "border-box",
            }}
          />
        </section>

        {/* Section 2 - Goals by Domain */}
        <section style={cardStyle}>
          <h2 style={sectionTitle}>الأهداف حسب مجالات التقييم</h2>
          <p style={{ color: "#64748B", fontSize: 13, marginTop: 4, marginBottom: 0 }}>
            أدخل الأهداف تحت كل مجال بحرية كاملة
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 14 }}>
            {!loaded ? null : domains.map((d) => (
              <div key={d.code} style={{ border: "1px solid #E5E7EB", borderRadius: 10, overflow: "hidden" }}>
                <button
                  type="button"
                  onClick={() => setOpen((o) => ({ ...o, [d.code]: !o[d.code] }))}
                  style={{
                    width: "100%", display: "flex", justifyContent: "space-between",
                    alignItems: "center", padding: "12px 16px", background: "#E6F2F1",
                    border: "none", cursor: "pointer", fontFamily: "inherit",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                    <span style={{ fontWeight: 700, color: TEAL, fontSize: 16 }}>{d.name}</span>
                    <span style={{ fontSize: 12, color: "#94A3B8" }}>{d.code}</span>
                  </div>
                  <span style={{ fontSize: 14, color: "#64748B" }}>{open[d.code] ? "▲" : "▼"}</span>
                </button>
                {open[d.code] && (
                  <div style={{ padding: 14, background: "white" }}>
                    {goals[d.code].length === 0 && (
                      <p style={{ color: "#94A3B8", fontSize: 14, margin: "0 0 12px" }}>
                        لا توجد أهداف بعد.
                      </p>
                    )}
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      {goals[d.code].map((g) => (
                        <div
                          key={g.id}
                          style={{
                            border: "1px solid #E5E7EB", borderRadius: 8, padding: 12,
                            display: "flex", gap: 10, alignItems: "center", background: "#FAFAF8",
                          }}
                        >
                          <input
                            type="text"
                            value={g.text}
                            onChange={(e) => updateGoalText(d.code, g.id, e.target.value)}
                            placeholder="اكتب الهدف..."
                            style={{
                              flex: 1, padding: "10px 12px", border: "1px solid #E5E7EB",
                              borderRadius: 6, fontSize: 14, fontFamily: "inherit",
                            }}
                          />
                          <Select
                            value={g.category || "placeholder"}
                            onValueChange={(val) => updateGoalCategory(d.code, g.id, val === "placeholder" ? "" : (val as GoalCategory))}
                          >
                            <SelectTrigger style={{ width: 130, fontSize: 13 }}>
                              <SelectValue placeholder="التصنيف" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="placeholder" disabled>
                                التصنيف
                              </SelectItem>
                              {CATEGORIES.map((c) => (
                                <SelectItem key={c} value={c}>
                                  {c}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <button
                            type="button"
                            onClick={() => deleteGoal(d.code, g.id)}
                            aria-label="حذف الهدف"
                            style={{
                              background: "#FEE2E2", color: "#B91C1C", border: "none",
                              borderRadius: 6, width: 36, height: 36, cursor: "pointer",
                              fontSize: 16, fontWeight: 700, flexShrink: 0,
                            }}
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => addGoal(d.code)}
                      style={{
                        marginTop: 12, background: "white", color: ORANGE,
                        border: `1px dashed ${ORANGE}`, borderRadius: 8, padding: "8px 14px",
                        cursor: "pointer", fontFamily: "inherit", fontWeight: 700, fontSize: 14,
                      }}
                    >
                      ＋ إضافة هدف
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Section 3 - Support Services */}
        <section style={cardStyle}>
          <h2 style={sectionTitle}>خدمات الدعم المقررة</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 12 }}>
            {SUPPORT_SERVICES.map((s) => {
              const checked = services.includes(s);
              return (
                <label
                  key={s}
                  style={{
                    display: "flex", alignItems: "center", gap: 10, cursor: "pointer",
                    padding: "8px 10px", border: "1px solid #E5E7EB", borderRadius: 8,
                    background: checked ? "#F1F5F4" : "white",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleService(s)}
                    style={{ width: 18, height: 18, accentColor: TEAL }}
                  />
                  <span style={{ fontSize: 15, color: "#1F2937" }}>{s}</span>
                </label>
              );
            })}
          </div>
        </section>

        {/* Section 4 - Start Date */}
        <section style={cardStyle}>
          <label style={labelStyle}>تاريخ بدء الخطة</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            style={{
              maxWidth: 220, padding: "10px 12px", border: "1px solid #E5E7EB",
              borderRadius: 8, fontSize: 15, fontFamily: "inherit",
            }}
          />
        </section>

        {/* Info box */}
        <div
          style={{
            marginTop: 20, background: "#FBE9E1", border: `1px solid ${ORANGE}`,
            borderRadius: 8, padding: 12, color: "#7C3F1D", fontSize: 14,
            lineHeight: 1.7, display: "flex", gap: 10, alignItems: "flex-start",
          }}
        >
          <span style={{ fontSize: 18, lineHeight: 1.4 }}>ℹ️</span>
          <span>
            بعد حفظ الخطة، ستنتقل لاختيار الأنشطة التشاركية لكل هدف، ثم إنشاء التقرير النهائي الذي يجمع التقييم وصوت الأسرة والمتعلم والخطة التربوية.
          </span>
        </div>

        {/* Bottom button */}
        <div style={{ marginTop: 24 }}>
          <button
            type="button"
            onClick={handleSave}
            style={{
              width: "100%", background: TEAL, color: "white", border: "none",
              padding: "14px 18px", borderRadius: 10, fontWeight: 700, fontSize: 16,
              cursor: "pointer", fontFamily: "inherit",
            }}
          >
            حفظ الخطة واختيار الأنشطة ←
          </button>
        </div>
      </main>
    </div>
  );
}

const cardStyle: React.CSSProperties = {
  marginTop: 20, background: "white", border: "1px solid #E5E7EB",
  borderRadius: 12, padding: 18,
};
const labelStyle: React.CSSProperties = {
  display: "block", fontWeight: 700, color: TEAL, marginBottom: 10, fontSize: 15,
};
const sectionTitle: React.CSSProperties = {
  fontSize: 18, fontWeight: 700, color: TEAL, margin: 0,
};
