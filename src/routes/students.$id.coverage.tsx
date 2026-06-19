import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";

export const Route = createFileRoute("/students/$id/coverage")({
  component: CoveragePage,
  head: () => ({
    meta: [
      { title: "تقرير التغطية المفاهيمية — همم" },
      { name: "description", content: "تقرير التغطية المفاهيمية للمستفيد بناءً على نتائج التقييم." },
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

type DomainData = { success: number; emerging: number; fail: number };
type DomainCode = "VS" | "VB" | "IF" | "LS" | "FC" | "IB";

const SAMPLE_DOMAINS: Record<DomainCode, DomainData> = {
  VS: { success: 45, emerging: 35, fail: 20 },
  VB: { success: 60, emerging: 25, fail: 15 },
  IF: { success: 25, emerging: 50, fail: 25 },
  LS: { success: 30, emerging: 45, fail: 25 },
  FC: { success: 50, emerging: 30, fail: 20 },
  IB: { success: 55, emerging: 35, fail: 10 },
};

const CONCEPT_MAP: { concept: string; domain: DomainCode }[] = [
  { concept: "المهارات الأكاديمية الوظيفية", domain: "VS" },
  { concept: "الاستخدام التقني", domain: "VS" },
  { concept: "التعلم المستمر", domain: "VB" },
  { concept: "تقرير المصير", domain: "VB" },
  { concept: "إدارة المال", domain: "IF" },
  { concept: "العناية الذاتية", domain: "IF" },
  { concept: "التنقل المستقل", domain: "IF" },
  { concept: "السلامة الشخصية", domain: "IF" },
  { concept: "المشاركة المجتمعية", domain: "LS" },
  { concept: "الصحة واللياقة", domain: "LS" },
  { concept: "التواصل الوظيفي", domain: "FC" },
  { concept: "العلاقات الاجتماعية", domain: "IB" },
];

type Level = "independent" | "partial" | "full" | "none";

function levelOf(d: DomainData | undefined): Level {
  if (!d) return "none";
  const { success, emerging, fail } = d;
  if (success === 0 && emerging === 0 && fail === 0) return "none";
  if (success >= 60) return "independent";
  if (emerging > success) return "partial";
  if (success < 25) return "full";
  return "partial";
}

const LEVEL_META: Record<Level, { label: string; bg: string; text: string; bar: string }> = {
  independent: { label: "مستقل", bg: "#DCFCE7", text: "#166534", bar: "#16A34A" },
  partial: { label: "بمساعدة جزئية", bg: "#FFEDD5", text: "#9A3412", bar: "#D9764A" },
  full: { label: "يحتاج دعماً كاملاً", bg: "#FEE2E2", text: "#991B1B", bar: "#DC2626" },
  none: { label: "لم يُقيَّم", bg: "#E5E7EB", text: "#374151", bar: "#9CA3AF" },
};

function CoveragePage() {
  const { id } = Route.useParams();
  const [student, setStudent] = useState<StoredStudent | null>(null);
  const [domains, setDomains] = useState<Record<string, DomainData>>(SAMPLE_DOMAINS);

  useEffect(() => {
    try {
      const list: StoredStudent[] = JSON.parse(localStorage.getItem("himam_students") || "[]");
      setStudent(list.find((x) => x.id === id) ?? null);
    } catch {
      setStudent(null);
    }
    try {
      const saved = JSON.parse(localStorage.getItem(`himam_assessment_${id}`) || "null");
      if (saved && saved.domains) {
        const parsed: Record<string, DomainData> = {};
        let hasAny = false;
        for (const k of Object.keys(saved.domains)) {
          const v = saved.domains[k];
          const s = Number(v.success) || 0;
          const e = Number(v.emerging) || 0;
          const f = Number(v.fail) || 0;
          parsed[k] = { success: s, emerging: e, fail: f };
          if (s || e || f) hasAny = true;
        }
        if (hasAny) setDomains({ ...SAMPLE_DOMAINS, ...parsed });
      }
    } catch {
      /* keep sample */
    }
  }, [id]);

  const rows = useMemo(
    () =>
      CONCEPT_MAP.map(({ concept, domain }) => {
        const d = domains[domain];
        const level = levelOf(d);
        const coverage = d ? d.success : 0;
        return { concept, domain, level, coverage };
      }),
    [domains],
  );

  const suggestions = rows.filter((r) => r.coverage < 60);

  return (
    <div dir="rtl" lang="ar" style={{ minHeight: "100vh", background: "#F8F7F4", fontFamily: "system-ui, sans-serif" }}>
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
        <div style={{ fontSize: 22, fontWeight: 700 }}>همم</div>
        <Link
          to="/"
          style={{
            color: "white",
            textDecoration: "none",
            fontSize: 15,
            padding: "8px 14px",
            border: "1px solid rgba(255,255,255,0.4)",
            borderRadius: 8,
          }}
        >
          → رجوع
        </Link>
      </header>

      <main style={{ maxWidth: 960, margin: "0 auto", padding: "28px 20px 60px" }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: "#0F3D3E", margin: 0 }}>
          تقرير التغطية المفاهيمية
        </h1>
        <p style={{ marginTop: 6, color: "#475569", fontSize: 15 }}>
          {student ? student.name : "—"}
        </p>

        {/* Coverage table */}
        <section
          style={{
            marginTop: 22,
            background: "white",
            border: "1px solid #E5E7EB",
            borderRadius: 12,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "14px 18px",
              borderBottom: "1px solid #E5E7EB",
              fontWeight: 700,
              color: "#0F3D3E",
              fontSize: 16,
            }}
          >
            تغطية المفاهيم الانتقالية (12 مفهوماً)
          </div>
          <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {rows.map((r, i) => {
              const meta = LEVEL_META[r.level];
              return (
                <li
                  key={i}
                  style={{
                    padding: "14px 18px",
                    borderBottom: i < rows.length - 1 ? "1px solid #F1F5F9" : "none",
                    display: "grid",
                    gridTemplateColumns: "1fr 2fr auto auto",
                    gap: 16,
                    alignItems: "center",
                  }}
                >
                  <div style={{ fontSize: 15, color: "#0F172A", fontWeight: 600 }}>{r.concept}</div>
                  <div
                    style={{
                      background: "#F1F5F9",
                      borderRadius: 999,
                      height: 10,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        width: `${Math.max(0, Math.min(100, r.coverage))}%`,
                        height: "100%",
                        background: meta.bar,
                      }}
                    />
                  </div>
                  <div style={{ fontSize: 14, color: "#475569", minWidth: 44, textAlign: "left" }}>
                    {r.coverage}%
                  </div>
                  <span
                    style={{
                      background: meta.bg,
                      color: meta.text,
                      padding: "4px 10px",
                      borderRadius: 999,
                      fontSize: 12,
                      fontWeight: 700,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {meta.label}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>

        {/* Suggestions */}
        {suggestions.length > 0 && (
          <section style={{ marginTop: 28 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: "#0F3D3E", margin: "0 0 12px" }}>
              اقتراحات اختيارية
            </h2>
            <div style={{ display: "grid", gap: 10 }}>
              {suggestions.map((s, i) => (
                <div
                  key={i}
                  style={{
                    background: "white",
                    border: "1px solid #E5E7EB",
                    borderRadius: 10,
                    padding: "12px 16px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 12,
                  }}
                >
                  <span style={{ color: "#0F172A", fontSize: 14 }}>
                    قد تُفيد أداة تكميلية في مجال {s.concept}
                  </span>
                  <span
                    style={{
                      background: "#FFEDD5",
                      color: "#9A3412",
                      padding: "3px 10px",
                      borderRadius: 999,
                      fontSize: 12,
                      fontWeight: 700,
                    }}
                  >
                    اختياري
                  </span>
                </div>
              ))}
            </div>
            <p style={{ marginTop: 10, color: "#64748B", fontSize: 13 }}>
              هذه الاقتراحات اختيارية — يمكن المتابعة مباشرةً
            </p>
          </section>
        )}

        {/* Bottom button */}
        <div style={{ marginTop: 32 }}>
          <a
            href={`/students/${id}/iep`}
            style={{
              display: "block",
              textAlign: "center",
              background: "#0F3D3E",
              color: "white",
              padding: "14px 18px",
              borderRadius: 10,
              textDecoration: "none",
              fontWeight: 700,
              fontSize: 16,
            }}
          >
            إدخال الخطة التربوية الفردية ←
          </a>
        </div>
      </main>
    </div>
  );
}
