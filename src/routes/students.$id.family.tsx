import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/students/$id/family")({
  component: FamilyPage,
  head: () => ({
    meta: [{ title: "قسم الأسرة — همم" }],
  }),
});

function FamilyPage() {
  const { id } = Route.useParams();
  return (
    <div className="min-h-screen bg-[#FAF7F2]">
      <header className="flex items-center justify-between px-8 py-4" style={{ backgroundColor: "#0F3D3E" }}>
        <Link
          to="/students/$id/student-voice"
          params={{ id }}
          className="rounded-lg border border-white/30 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
        >
          → رجوع
        </Link>
        <h1 className="text-2xl font-bold text-white">همم</h1>
      </header>
      <main className="mx-auto max-w-2xl px-6 py-16 text-center">
        <p className="text-2xl font-bold text-[#0F3D3E]">قسم الأسرة</p>
        <p className="mt-3 text-sm text-stone-500">هذا القسم قيد الإعداد.</p>
        <Link to="/" className="mt-8 inline-block rounded-xl px-6 py-3 text-sm font-bold text-white" style={{ backgroundColor: "#0F3D3E" }}>
          العودة للرئيسية
        </Link>
      </main>
    </div>
  );
}
