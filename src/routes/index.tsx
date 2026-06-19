import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: HomePage,
  head: () => ({
    meta: [
      { title: "همم — بوابة الأخصائي" },
      { name: "description", content: "إدارة الطلاب في منصة همم لتخطيط الانتقال." },
    ],
  }),
});

type Student = {
  name: string;
  age: string;
  tool: string;
  status: "مكتمل" | "قيد التنفيذ";
};

const students: Student[] = [
  { name: "أحمد محمد السالم", age: "17 سنة", tool: "ABLLS-R", status: "مكتمل" },
  { name: "سارة علي الزهراني", age: "15 سنة", tool: "VB-MAPP", status: "قيد التنفيذ" },
];

function HomePage() {
  return (
    <div className="min-h-screen bg-[#FAF7F2]">
      <header
        className="flex items-center justify-between px-8 py-4"
        style={{ backgroundColor: "#0F3D3E" }}
      >
        <button
          className="rounded-lg px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
          style={{ backgroundColor: "#D9764A" }}
        >
          ＋ إضافة طالب جديد
        </button>
        <h1 className="text-2xl font-bold text-white">همم</h1>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10 md:px-8">
        <section className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          <StatCard label="إجمالي الطلاب" value="2" />
          <StatCard label="المكتملون" value="1" />
          <StatCard label="قيد التنفيذ" value="1" />
        </section>

        <section className="mt-10 overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
          <table className="w-full text-right">
            <thead className="bg-stone-50 text-sm text-stone-600">
              <tr>
                <th className="px-6 py-4 font-semibold">الاسم</th>
                <th className="px-6 py-4 font-semibold">العمر</th>
                <th className="px-6 py-4 font-semibold">أداة التقييم</th>
                <th className="px-6 py-4 font-semibold">الحالة</th>
                <th className="px-6 py-4 font-semibold">الإجراء</th>
              </tr>
            </thead>
            <tbody>
              {students.map((s) => (
                <tr key={s.name} className="border-t border-stone-100">
                  <td className="px-6 py-5 font-medium text-stone-900">{s.name}</td>
                  <td className="px-6 py-5 text-stone-700">{s.age}</td>
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

function StatusBadge({ status }: { status: Student["status"] }) {
  const styles =
    status === "مكتمل"
      ? "bg-green-100 text-green-800 border-green-200"
      : "bg-amber-100 text-amber-800 border-amber-200";
  return (
    <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${styles}`}>
      {status}
    </span>
  );
}
