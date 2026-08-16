import { Link } from "@tanstack/react-router";
import { useState } from "react";

type ComponentStatus = {
  assessment: boolean;
  learnerVoice: boolean;
  familyVoice: boolean;
  currentLevel: boolean;
  additionalSources: boolean;
};

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
    key: "currentLevel",
    label: "مستوى الأداء الحالي",
    href: "/students/$id/coverage",
  },
  {
    key: "additionalSources",
    label: "أدوات ومصادر إضافية",
    href: "/students/$id/assessment/additional",
  },
] as const;

export function loadPlanComponentStatus(learnerId: string): ComponentStatus {
  const has = (key: string) => {
    try {
      return Boolean(localStorage.getItem(key));
    } catch {
      return false;
    }
  };

  let assessment = false;
  try {
    const records = JSON.parse(localStorage.getItem(`himam_assessment_records_${learnerId}`) || "[]");
    assessment = Array.isArray(records) && records.length > 0;
  } catch {
    assessment = false;
  }

  return {
    assessment,
    learnerVoice: has(`himam_learner_voice_${learnerId}`),
    familyVoice: has(`himam_family_${learnerId}`),
    currentLevel: has(`himam_coverage_${learnerId}`),
    additionalSources: has(`himam_additional_sources_${learnerId}`),
  };
}

export function PlanComponentsStatus({
  learnerId,
  current,
  status,
}: {
  learnerId: string;
  current: keyof ComponentStatus;
  status: ComponentStatus;
}) {
  const [open, setOpen] = useState(false);

  return (
    <section className="fixed left-4 top-20 z-50 w-[min(320px,calc(100vw-2rem))]" dir="rtl">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between rounded-xl border border-[#0F3D3E] bg-[#0F3D3E] px-4 py-3 text-sm font-bold text-white shadow-lg"
        aria-expanded={open}
      >
        <span>مكونات الخطة التربوية الفردية</span>
        <span className="text-base leading-none">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
      <div className="mt-2 rounded-xl border border-stone-200 bg-white p-3 shadow-xl">
        <div className="space-y-2">
        {COMPONENTS.map((item) => {
          const done = status[item.key];
          const active = current === item.key;
          return (
            <Link
              key={item.key}
              to={item.href}
              params={{ id: learnerId }}
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 rounded-lg border px-3 py-2 text-xs font-bold transition hover:border-[#0F3D3E]"
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
      </div>
      )}
    </section>
  );
}
