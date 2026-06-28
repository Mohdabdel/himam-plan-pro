import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/students/$id/student-voice")({
  component: StudentVoicePage,
  head: () => ({
    meta: [
      { title: "صوت المتعلم — همم" },
      { name: "description", content: "أسئلة يُجيب عنها المتعلم مع المختص." },
    ],
  }),
});

type OptionDef = { value: string; emoji: string; label: string };
type QuestionDef = {
  id: string;
  text: string;
  multi: boolean;
  options: OptionDef[];
  hasOther: boolean;
};

const QUESTIONS: QuestionDef[] = [
  {
    id: "q1",
    text: "ماذا تحب أن تفعل في وقت فراغك؟",
    multi: true,
    hasOther: true,
    options: [
      { value: "arts", emoji: "🎨", label: "الفنون والرسم" },
      { value: "music", emoji: "🎵", label: "الموسيقى" },
      { value: "sports", emoji: "⚽", label: "الرياضة" },
      { value: "tech", emoji: "📱", label: "التقنية" },
      { value: "nature", emoji: "🌿", label: "الطبيعة" },
      { value: "friends", emoji: "👥", label: "مع الأصدقاء" },
      { value: "reading", emoji: "📚", label: "القراءة" },
      { value: "cooking", emoji: "🍳", label: "الطبخ" },
    ],
  },
  {
    id: "q2",
    text: "ما الذي تجيده وتشعر بالفخر به؟",
    multi: true,
    hasOther: true,
    options: [
      { value: "helping", emoji: "💪", label: "أساعد الآخرين" },
      { value: "tasks", emoji: "🎯", label: "أُنجز المهام" },
      { value: "communicate", emoji: "🗣️", label: "أتواصل جيداً" },
      { value: "solve", emoji: "🧩", label: "أحل المشكلات" },
      { value: "teamwork", emoji: "🤝", label: "أعمل مع الفريق" },
      { value: "hands", emoji: "✋", label: "أعمل بيدي" },
      { value: "organize", emoji: "📐", label: "أُنظّم الأشياء" },
    ],
  },
  {
    id: "q3",
    text: "ماذا تريد أن تفعل في المستقبل؟",
    multi: false,
    hasOther: true,
    options: [
      { value: "office", emoji: "👨‍💼", label: "أعمل في مكتب" },
      { value: "factory", emoji: "🏭", label: "أعمل في ورشة أو مصنع" },
      { value: "outdoor", emoji: "🌱", label: "أعمل في الطبيعة" },
      { value: "shop", emoji: "🏪", label: "أعمل في محل أو متجر" },
      { value: "home", emoji: "🏠", label: "أعمل من البيت" },
      { value: "creative", emoji: "🎨", label: "أعمل في مجال إبداعي" },
      { value: "dontknow", emoji: "🤔", label: "لا أعرف بعد" },
    ],
  },
  {
    id: "q4",
    text: "ما الذي يجعلك سعيداً في يومك؟",
    multi: true,
    hasOther: true,
    options: [
      { value: "family", emoji: "👨‍👩‍👧", label: "العائلة" },
      { value: "friends2", emoji: "👫", label: "الأصدقاء" },
      { value: "fun", emoji: "🎮", label: "الترفيه" },
      { value: "routine", emoji: "📅", label: "الروتين المنظم" },
      { value: "success", emoji: "🌟", label: "النجاح في مهمة" },
      { value: "quiet", emoji: "🤫", label: "الهدوء والخلوة" },
    ],
  },
  {
    id: "q5",
    text: "ما الذي تجد صعوبة فيه؟",
    multi: true,
    hasOther: true,
    options: [
      { value: "speaking", emoji: "🗣️", label: "التحدث أمام الآخرين" },
      { value: "writing", emoji: "📝", label: "الكتابة والقراءة" },
      { value: "transport", emoji: "🚌", label: "التنقل وحدي" },
      { value: "time", emoji: "⏰", label: "تنظيم الوقت" },
      { value: "money", emoji: "💰", label: "التعامل مع المال" },
      { value: "tech2", emoji: "💻", label: "استخدام التقنية" },
    ],
  },
];

type Answers = Record<string, { selected: string[]; other: string; skipped: boolean }>;

const emptyAnswer = () => ({ selected: [], other: "", skipped: false });

function StudentVoicePage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [step, setStep] = useState(0); // 0-based index into QUESTIONS
  const [answers, setAnswers] = useState<Answers>(() =>
    Object.fromEntries(QUESTIONS.map((q) => [q.id, emptyAnswer()])),
  );

  const storageKey = `himam_student_voice_${id}`;

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || "null");
      if (saved?.answers) setAnswers(saved.answers);
    } catch {
      /* noop */
    }
  }, [storageKey]);

  const q = QUESTIONS[step];
  const ans = answers[q.id];
  const totalSteps = QUESTIONS.length;

  const toggleOption = (value: string) => {
    setAnswers((prev) => {
      const cur = prev[q.id];
      if (q.multi) {
        const next = cur.selected.includes(value)
          ? cur.selected.filter((v) => v !== value)
          : [...cur.selected, value];
        return { ...prev, [q.id]: { ...cur, selected: next } };
      }
      return { ...prev, [q.id]: { ...cur, selected: cur.selected[0] === value ? [] : [value] } };
    });
  };

  const setOther = (text: string) => {
    setAnswers((prev) => ({ ...prev, [q.id]: { ...prev[q.id], other: text } }));
  };

  const skip = () => {
    setAnswers((prev) => ({ ...prev, [q.id]: { ...emptyAnswer(), skipped: true } }));
    if (step < totalSteps - 1) setStep((s) => s + 1);
  };

  const next = () => {
    if (step < totalSteps - 1) setStep((s) => s + 1);
  };

  const handleSave = () => {
    try {
      localStorage.setItem(storageKey, JSON.stringify({ answers, savedAt: new Date().toISOString() }));
    } catch {
      /* noop */
    }
    navigate({ to: "/students/$id/report", params: { id } });
  };

  const isLast = step === totalSteps - 1;
  const hasSelection = ans.selected.length > 0 || ans.other.trim() !== "" || ans.skipped;

  return (
    <div className="min-h-screen bg-[#FAF7F2]">
      <header className="flex items-center justify-between px-8 py-4" style={{ backgroundColor: "#0F3D3E" }}>
        <Link to="/" className="rounded-lg border border-white/30 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10">
          → رجوع
        </Link>
        <h1 className="text-2xl font-bold text-white">همم</h1>
      </header>

      <main className="mx-auto max-w-2xl px-6 py-8 md:px-8">
        {/* Title */}
        <div className="mb-6 text-center">
          <h2 className="text-2xl font-bold text-[#0F3D3E]">صوت المتعلم</h2>
          <p className="mt-1 text-sm text-stone-500">أجب عن هذه الأسئلة مع المتعلم</p>
        </div>

        {/* Progress */}
        <div className="mb-6">
          <div className="mb-2 flex items-center justify-between text-xs font-semibold text-stone-500">
            <span>السؤال {step + 1} من {totalSteps}</span>
            {step > 0 && (
              <button onClick={() => setStep((s) => s - 1)} className="text-xs text-stone-500 underline">
                السابق
              </button>
            )}
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-stone-200">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{ width: `${((step + 1) / totalSteps) * 100}%`, backgroundColor: "#0F3D3E" }}
            />
          </div>
        </div>

        {/* Question card */}
        <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
          <p className="mb-1 text-xs font-semibold text-stone-400">
            {q.id === "q5" ? "اختياري" : q.multi ? "اختر ما ينطبق" : "اختر واحدة"}
          </p>
          <h3 className="mb-5 text-lg font-bold text-[#0F3D3E]">{q.text}</h3>

          {/* Emoji option grid */}
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
            {q.options.map((opt) => {
              const selected = ans.selected.includes(opt.value);
              return (
                <button
                  key={opt.value}
                  onClick={() => toggleOption(opt.value)}
                  className="flex flex-col items-center gap-1.5 rounded-xl border-2 px-2 py-3 text-center transition"
                  style={{
                    borderColor: selected ? "#0F3D3E" : "#E5E7EB",
                    backgroundColor: selected ? "#E6F2F1" : "#fff",
                  }}
                >
                  <span className="text-2xl leading-none">{opt.emoji}</span>
                  <span className="text-xs font-medium leading-tight text-stone-700">{opt.label}</span>
                </button>
              );
            })}

            {/* "أخرى" pseudo-card */}
            {q.hasOther && (
              <div
                className="col-span-3 sm:col-span-4 rounded-xl border-2 px-3 py-3 transition"
                style={{ borderColor: ans.other ? "#0F3D3E" : "#E5E7EB", backgroundColor: ans.other ? "#E6F2F1" : "#fff" }}
              >
                <label className="block text-xs font-medium text-stone-600 mb-1">أخرى</label>
                <input
                  type="text"
                  value={ans.other}
                  onChange={(e) => setOther(e.target.value)}
                  placeholder="اكتب هنا..."
                  className="w-full bg-transparent text-sm text-stone-800 outline-none placeholder:text-stone-400"
                />
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="mt-5 flex flex-col gap-3">
          {isLast ? (
            <button
              onClick={handleSave}
              className="w-full rounded-xl px-5 py-3.5 text-base font-bold text-white shadow-sm transition hover:opacity-90"
              style={{ backgroundColor: "#0F3D3E" }}
            >
              حفظ وإرسال قسم الأسرة ←
            </button>
          ) : (
            <button
              onClick={next}
              disabled={!hasSelection}
              className="w-full rounded-xl px-5 py-3.5 text-base font-bold text-white shadow-sm transition disabled:opacity-40"
              style={{ backgroundColor: "#0F3D3E" }}
            >
              التالي ←
            </button>
          )}
          <button
            onClick={skip}
            className="w-full rounded-xl border border-stone-300 bg-white px-5 py-3 text-sm font-semibold text-stone-600 transition hover:bg-stone-50"
          >
            تخطّ هذا السؤال
          </button>
        </div>
      </main>
    </div>
  );
}
