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
  name: string;
  center: string;
  tool: string;
  status: "مكتمل" | "قيد التنفيذ" | "إدخال التقييم";
};

const seedRows: Row[] = [
  { name: "أحمد محمد السالم", center: "مركز التواصل", tool: "ABLLS-R", status: "مكتمل" },
  { name: "سارة علي الزهراني", center: "برنامج التأهيل المهني", tool: "VB-MAPP", status: "قيد التنفيذ" },
];

function HomePage() {
  const [extra, setExtra] = useState<Row[]>([]);

  useEffect(() => {
    try {
      const stored: StoredStudent[] = JSON.parse(localStorage.getItem("himam_students") || "[]");
      setExtra(
        stored.map((s) => ({
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
          ＋ إضافة طالب جديد
        </Link>
        <h1 className="text-2xl font-bold text-white">همم</h1>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10 md:px-8">
        <section className="grid grid-cols-3 gap-5">
          <StatCard label="إجمالي الطلاب" value={String(total)} />
          <StatCard label="المكتملون" value={String(completed)} />
          <StatCard label="قيد التنفيذ" value={String(inProgress)} />
        </section>

        <section className="mt-10 overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
          <table className="w-full text-right">
            <thead className="bg-stone-50 text-sm text-stone-600">
              <tr>
                <th className="px-6 py-4 font-semibold">الاسم</th>
                <th className="px-6 py-4 font-semibold">المركز / البرنامج</th>
                <th className="px-6 py-4 font-semibold">أداة التقييم</th>
                <th className="px-6 py-4 font-semibold">الحالة</th>
                <th className="px-6 py-4 font-semibold">الإجراء</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((s, i) => (
                <tr key={`${s.name}-${i}`} className="border-t border-stone-100">
                  <td className="px-6 py-5 font-medium text-stone-900">{s.name}</td>
                  <td className="px-6 py-5 text-stone-700">{s.center}</td>
                  <td className="px-6 py-5 text-stone-700">{s.tool}</td>
                  <td className="px-6 py-5">
                    <StatusBadge status={s.status} />
                  </td>
                  <td className="px-6 py-5">
                    <button className="rounded-lg border border-[#0F3D3E] px-4 py-2 text-sm font-medium text-[#0F3D3E] transition hover:bg-[#0F3D3E] hover:text-white">
                      عرض الإطار
                    </button>
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
