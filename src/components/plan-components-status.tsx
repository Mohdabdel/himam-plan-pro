import { Link } from "@tanstack/react-router";

import type { ComponentStatus } from "@/components/plan-components-status-store";

const COMPONENTS = [
  {
    key: "assessment",
    label: "أداة التقييم الرسمية",
    href: "/students/$id/assessment/official",
  },
  {
    key: "learnerVoice",
    label: "صوت المتعلم",
    href: "/students/$id/student-voice",
  },
  {
    key: "familyVoice",
    label: "صوت الأسرة",
    href: "/students/$id/family",
  },
  {
    key: "additionalSources",
    label: "أدوات ومصادر إضافية",
    href: "/students/$id/assessment/additional",
  },
  {
    key: "currentLevel",
    label: "مراجعة كفاية المعلومات ومستوى الأداء الحالي",
    href: "/students/$id/coverage",
  },
] as const;

export function PlanComponentsStatus({
  learnerId,
  current,
  status,
}: {
  learnerId: string;
  current: keyof ComponentStatus;
  status: ComponentStatus;
}) {
  return (
    <section className="sticky top-0 z-40 mb-5 rounded-xl border border-stone-200 bg-white/95 p-3 shadow-sm backdrop-blur" dir="rtl">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-bold text-[#0F3D3E]">مكونات الخطة التربوية الفردية</p>
        <Link
          to="/tools-library"
          className="rounded-lg border border-[#0F3D3E] bg-[#F4FAF9] px-3 py-2 text-xs font-bold text-[#0F3D3E] transition hover:bg-[#E6F2F1]"
        >
          مكتبة الأدوات المجمعة
        </Link>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {COMPONENTS.map((item) => {
          const done = status[item.key];
          const active = current === item.key;
          return (
            <Link
              key={item.key}
              to={item.href}
              params={{ id: learnerId }}
              className="flex min-w-fit items-center gap-2 rounded-lg border px-3 py-2 text-xs font-bold transition hover:border-[#0F3D3E]"
              style={{
                backgroundColor: active ? "#E6F2F1" : "white",
                borderColor: active ? "#0F3D3E" : done ? "#9EC7C3" : "#E7E5E4",
                color: active || done ? "#0F3D3E" : "#57534E",
              }}
            >
              <span
                className="grid h-5 w-5 shrink-0 place-items-center rounded border text-xs"
                style={{
                  borderColor: done ? "#0F3D3E" : "#D6D3D1",
                  backgroundColor: done ? "#0F3D3E" : "white",
                  color: done ? "white" : "transparent",
                }}
              >
                ✓
              </span>
              <span className="flex-1">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
