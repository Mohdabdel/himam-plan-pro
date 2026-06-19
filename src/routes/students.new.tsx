import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";

export const Route = createFileRoute("/students/new")({
  component: NewStudentPage,
  head: () => ({
    meta: [
      { title: "إضافة طالب جديد — همم" },
      { name: "description", content: "إضافة مستفيد جديد إلى منصة همم." },
    ],
  }),
});

const TOOLS = [
  "School Inventory of Problem Solving Skills (SIPSS)",
  "TEACCH Transition Assessment Profile - Informal Assessment",
  "TTAP - Transition Assessment Profile (2nd Edition)",
  "مقياس مناصرة الذات للمراهقين ذوي الإعاقة الذهنية البسيطة",
  "مقياس تطور السلوك التواصلي والرمزي (CSBS)",
  "مصفوفة التواصل (Communication Matrix)",
  "أداة أخرى",
];

function NewStudentPage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [center, setCenter] = useState("");
  const [tool, setTool] = useState("");
  const [otherTool, setOtherTool] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalTool = tool === "أداة أخرى" ? otherTool.trim() || "أداة أخرى" : tool;
    if (!name.trim() || !birthDate || !center.trim() || !tool) {
      setError("يرجى إكمال جميع الحقول المطلوبة");
      return;
    }
    setError("");
    const newStudent = {
      id: crypto.randomUUID(),
      name: name.trim(),
      birthDate,
      center: center.trim(),
      tool: finalTool,
      createdAt: new Date().toISOString(),
      status: "assessment" as const,
    };
    try {
      const existing = JSON.parse(localStorage.getItem("himam_students") || "[]");
      localStorage.setItem("himam_students", JSON.stringify([...existing, newStudent]));
    } catch {
      localStorage.setItem("himam_students", JSON.stringify([newStudent]));
    }
    navigate({ to: "/" });
  };

  return (
    <div className="min-h-screen bg-[#FAF7F2]">
      <header
        className="flex items-center justify-between px-8 py-4"
        style={{ backgroundColor: "#0F3D3E" }}
      >
        <Link
          to="/"
          className="rounded-lg px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
        >
          → رجوع
        </Link>
        <h1 className="text-2xl font-bold text-white">همم</h1>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-10 md:px-8">
        <h2 className="mb-8 text-3xl font-bold text-[#0F3D3E]">إضافة طالب جديد</h2>

        <form onSubmit={handleSubmit} className="space-y-6 rounded-2xl border border-stone-200 bg-white p-8 shadow-sm">
          <div>
            <label className="mb-2 block text-sm font-semibold text-stone-800">الاسم الكامل</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="اكتب الاسم الكامل للمستفيد"
              className="w-full rounded-lg border border-stone-300 bg-white px-4 py-3 text-right text-stone-900 outline-none transition focus:border-[#0F3D3E]"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-stone-800">تاريخ الميلاد</label>
            <input
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              className="w-full rounded-lg border border-stone-300 bg-white px-4 py-3 text-right text-stone-900 outline-none transition focus:border-[#0F3D3E]"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-stone-800">المركز أو البرنامج</label>
            <input
              type="text"
              value={center}
              onChange={(e) => setCenter(e.target.value)}
              placeholder="مثال: مركز التواصل، برنامج التأهيل المهني"
              className="w-full rounded-lg border border-stone-300 bg-white px-4 py-3 text-right text-stone-900 outline-none transition focus:border-[#0F3D3E]"
            />
          </div>

          <div>
            <label className="mb-3 block text-sm font-semibold text-stone-800">أداة التقييم المستخدمة</label>
            <div className="space-y-2">
              {TOOLS.map((t) => (
                <label
                  key={t}
                  className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition ${
                    tool === t ? "border-[#0F3D3E] bg-[#0F3D3E]/5" : "border-stone-200 hover:border-stone-300"
                  }`}
                >
                  <input
                    type="radio"
                    name="tool"
                    value={t}
                    checked={tool === t}
                    onChange={() => setTool(t)}
                    className="mt-1 h-4 w-4 accent-[#0F3D3E]"
                  />
                  <span className="text-sm text-stone-800">{t}</span>
                </label>
              ))}
            </div>

            {tool === "أداة أخرى" && (
              <input
                type="text"
                value={otherTool}
                onChange={(e) => setOtherTool(e.target.value)}
                placeholder="اكتب اسم الأداة"
                className="mt-3 w-full rounded-lg border border-stone-300 bg-white px-4 py-3 text-right text-stone-900 outline-none transition focus:border-[#0F3D3E]"
              />
            )}

            <div
              className="mt-4 rounded-lg px-4 py-3 text-sm text-stone-800"
              style={{ backgroundColor: "#FBE9E1", border: "1px solid #D9764A", borderRadius: 8 }}
            >
              همم يقيّم تغطية هذه الأداة لمفاهيم الانتقال تلقائياً
            </div>
          </div>

          {error && (
            <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="w-full rounded-lg py-4 text-base font-bold text-white transition hover:opacity-90"
            style={{ backgroundColor: "#0F3D3E" }}
          >
            إضافة وبدء إدخال التقييم
          </button>
        </form>
      </main>
    </div>
  );
}
