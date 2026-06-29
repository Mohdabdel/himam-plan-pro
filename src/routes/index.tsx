import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/")({
  component: HomePage,
  head: () => ({
    meta: [
      { title: "همم — بوابة الأخصائي" },
      { name: "description", content: "إدارة الطلاب في منصة همم لتخطيط الانتقال." },
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
  status: "assessment";
};

type Row = {
  id?: string;
  name: string;
  center: string;
  tool: string;
  status: "مكتمل" | "قيد التنفيذ" | "إدخال التقييم";
};

const seedRows: Row[] = [
  {
    id: "demo-complete",
    name: "أحمد محمد السالم",
    center: "مركز التواصل - أبوظبي",
    tool: "TTAP - Transition Assessment Profile (2nd Edition)",
    status: "مكتمل",
  },
  { name: "سارة علي الزهراني", center: "برنامج التأهيل المهني", tool: "VB-MAPP", status: "قيد التنفيذ" },
];

function HomePage() {
  const [extra, setExtra] = useState<Row[]>([]);

  useEffect(() => {
    try {
      const stored: StoredStudent[] = JSON.parse(localStorage.getItem("himam_students") || "[]");
      setExtra(
        stored.map((s) => ({
          id: s.id,
          name: s.name,
          center: s.center,
          tool: s.tool,
          status: "إدخال التقييم" as const,
        })),
      );
    } catch {
      setExtra([]);
    }
  }, []);

  const rows = [...seedRows, ...extra];
  const total = rows.length;
  const completed = rows.filter((r) => r.status === "مكتمل").length;
  const inProgress = rows.filter((r) => r.status !== "مكتمل").length;

  return (
    <div className="min-h-screen bg-[#FAF7F2]">
      <header
        className="flex items-center justify-between px-8 py-4"
        style={{ backgroundColor: "#0F3D3E" }}
      >
        <Link
          to="/students/new"
          className="rounded-lg px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
          style={{ backgroundColor: "#D9764A" }}
        >
          ＋ إضافة متعلم جديد
        </Link>
        <h1 className="text-2xl font-bold text-white">همم</h1>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10 md:px-8">
        <section className="grid grid-cols-3 gap-5">
          <StatCard label="إجمالي المتعلمين" value={String(total)} />
          <StatCard label="المكتملون" value={String(completed)} />
          <StatCard label="قيد التنفيذ" value={String(inProgress)} />
        </section>

        <section className="mt-10 overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
          <table className="w-full text-right" style={{ fontSize: 13 }}>
            <thead className="bg-stone-50 text-stone-600">
              <tr>
                <th className="px-4 py-3 font-semibold">الاسم</th>
                <th className="px-4 py-3 font-semibold">المركز / البرنامج</th>
                <th className="px-4 py-3 font-semibold">أداة التقييم</th>
                <th className="px-4 py-3 font-semibold">الحالة</th>
                <th className="px-4 py-3 font-semibold">الإجراء</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((s, i) => (
                <tr key={`${s.name}-${i}`} className="border-t border-stone-100">
                  <td className="max-w-[160px] truncate px-4 py-3 font-medium text-stone-900">{s.name}</td>
                  <td className="max-w-[160px] truncate px-4 py-3 text-stone-700">{s.center}</td>
                  <td className="max-w-[200px] truncate px-4 py-3 text-stone-700">{s.tool}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={s.status} />
                  </td>
                  <td className="px-4 py-3">
                    {s.id ? (
                      <div className="flex flex-wrap gap-1.5">
                        <Link
                          to="/students/$id/assessment"
                          params={{ id: s.id }}
                          className="rounded-lg border border-[#0F3D3E] px-2.5 py-1 text-xs font-medium text-[#0F3D3E] transition hover:bg-[#0F3D3E] hover:text-white"
                        >
                          التقييم
                        </Link>
                        <Link
                          to="/students/$id/family"
                          params={{ id: s.id }}
                          className="rounded-lg border border-[#0F3D3E] px-2.5 py-1 text-xs font-medium text-[#0F3D3E] transition hover:bg-[#0F3D3E] hover:text-white"
                        >
                          الأصوات
                        </Link>
                        <Link
                          to="/students/$id/plan"
                          params={{ id: s.id }}
                          className="rounded-lg border border-[#D9764A] px-2.5 py-1 text-xs font-medium text-[#D9764A] transition hover:bg-[#D9764A] hover:text-white"
                        >
                          الخطة
                        </Link>
                        <Link
                          to="/students/$id/report"
                          params={{ id: s.id }}
                          className="rounded-lg px-2.5 py-1 text-xs font-semibold text-white transition hover:opacity-90"
                          style={{ backgroundColor: "#0F3D3E" }}
                        >
                          التقرير
                        </Link>
                      </div>
                    ) : (
                      <button className="rounded-lg border border-[#0F3D3E] px-3 py-1.5 text-xs font-medium text-[#0F3D3E] transition hover:bg-[#0F3D3E] hover:text-white">
                        عرض الإطار
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </main>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
      <div className="text-sm font-medium text-stone-600">{label}</div>
      <div className="mt-3 text-4xl font-bold text-[#0F3D3E]">{value}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: Row["status"] }) {
  const styles =
    status === "مكتمل"
      ? "bg-green-100 text-green-800 border-green-200"
      : status === "إدخال التقييم"
        ? "bg-orange-100 text-orange-800 border-orange-200"
        : "bg-amber-100 text-amber-800 border-amber-200";
  return (
    <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${styles}`}>
      {status}
    </span>
  );
}
