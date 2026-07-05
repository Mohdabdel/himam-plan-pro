// ── Goal quality model ───────────────────────────────────────────────────────
// Computes the two-axis quality checklist for a single transition goal from
// data that already exists elsewhere in the journey (coverage, family voice,
// learner voice) — no new data source is introduced, and nothing here
// produces a numeric score. Every signal resolves to one of three states:
// "done" | "needs" | "advisory". "advisory" always means either the item is
// non-blocking by nature (e.g. linked life practice) or the upstream data it
// would check against doesn't exist yet for this student.

export type QualityState = "done" | "needs" | "advisory";

export type QualityItem = {
  axis: 1 | 2;
  label: string;
  state: QualityState;
  note?: string;
  hardStop?: boolean;
  /** True when this hard-stop item is still unresolved but a documented
   *  professional override exists for it — it no longer blocks saving,
   *  but stays visibly "needs" rather than silently flipping to "done". */
  overridden?: boolean;
};

export type GoalOverride = {
  reason: string;
  note?: string;
  at: string;
};

export type GoalQualityInput = {
  goalText: string;
  context: string;
  criterion: string;
  measurementMethod: string;
  evidenceRef: string;
  lifePractice: string;
  domainCode: string;
  coverage: {
    filledDomains?: string[];
    failedDomains?: string[];
    emergingDomains?: string[];
  } | null;
  family: {
    priorities?: string[];
    vision5y?: string;
  } | null;
  learnerVoice: {
    q_love?: string;
    q_good?: string;
  } | null;
  override?: GoalOverride | null;
};

function normalizeWords(text: string): Set<string> {
  return new Set(
    text
      .split(/[\s،.,؛:؟!\-\/]+/)
      .map((w) => w.trim())
      .filter((w) => w.length >= 3),
  );
}

/** Simple word-overlap check — not semantic matching. Used only as a light,
 *  honest signal that a goal's wording touches an already-documented source. */
function hasWordOverlap(a: string, b: string): boolean {
  const wordsB = normalizeWords(b);
  for (const w of normalizeWords(a)) if (wordsB.has(w)) return true;
  return false;
}

export function computeGoalQuality(input: GoalQualityInput): QualityItem[] {
  const goalText = input.goalText.trim();
  const hasCriterion = input.criterion.trim().length > 0;
  const hasMeasurement = input.measurementMethod.trim().length > 0;
  const hasEvidence = input.evidenceRef.trim().length > 0;

  // احتياج/أولوية: مبني على مجالات التغطية المتعثرة/الناشئة (تقييم حقيقي)
  // أو تطابق كلمة مع أولويات الأسرة المسجّلة فعليًا.
  const domainIsNeed =
    !!input.coverage &&
    ((input.coverage.failedDomains ?? []).includes(input.domainCode) ||
      (input.coverage.emergingDomains ?? []).includes(input.domainCode));
  const priorityMatch =
    !!input.family?.priorities?.length &&
    input.family.priorities.some((p) => goalText.includes(p));
  let needState: QualityState;
  let needNote: string | undefined;
  if (domainIsNeed || priorityMatch) {
    needState = "done";
  } else if (!input.coverage && !input.family) {
    needState = "advisory";
    needNote = "لا تتوفر بيانات تغطية أو صوت أسرة بعد لتقييم هذا المؤشر.";
  } else {
    needState = "needs";
    needNote = "راجع مجالات التغطية المتعثرة أو أولويات الأسرة المسجَّلة للتأكد من ارتباط الهدف بها.";
  }

  // نقطة قوة/اهتمام: تطابق كلمة مع "ماذا تحب / ما الذي تجيده" من صوت المتعلم الفعلي.
  const loveOverlap = !!input.learnerVoice?.q_love && hasWordOverlap(goalText, input.learnerVoice.q_love);
  const goodOverlap = !!input.learnerVoice?.q_good && hasWordOverlap(goalText, input.learnerVoice.q_good);
  let strengthState: QualityState;
  let strengthNote: string | undefined;
  if (loveOverlap || goodOverlap) {
    strengthState = "done";
  } else if (!input.learnerVoice) {
    strengthState = "advisory";
    strengthNote = "لم يُسجَّل صوت المتعلم بعد لهذا المتعلم.";
  } else {
    strengthState = "needs";
    strengthNote = "راجع ما يحبه المتعلم أو يجيده في صوت المتعلم لتوظيفه ضمن صياغة الهدف.";
  }

  // رؤية بعيدة المدى: تطابق كلمة مع رؤية الأسرة (5 سنوات) إن وُثِّقت.
  let visionState: QualityState;
  let visionNote: string;
  if (!input.family?.vision5y?.trim()) {
    visionState = "advisory";
    visionNote = "لم تُوثَّق رؤية بعيدة المدى للأسرة بعد — راجع الاتساق العام يدويًا.";
  } else if (hasWordOverlap(goalText, input.family.vision5y)) {
    visionState = "done";
    visionNote = "يتوافق لفظيًا مع رؤية الأسرة المسجَّلة.";
  } else {
    visionState = "needs";
    visionNote = "راجع اتساق الهدف مع رؤية الأسرة المسجَّلة بعيدة المدى.";
  }

  // يدعم الانتقال: هل هذا المجال مُقيَّم فعليًا ضمن التغطية المحفوظة؟
  let transitionState: QualityState;
  let transitionNote: string;
  if (!input.coverage) {
    transitionState = "advisory";
    transitionNote = "لم يُحفظ تقييم/تغطية بعد لهذا المتعلم.";
  } else if ((input.coverage.filledDomains ?? []).includes(input.domainCode)) {
    transitionState = "done";
    transitionNote = "هذا المجال مُقيَّم ضمن التغطية الحالية.";
  } else {
    transitionState = "needs";
    transitionNote = "هذا المجال لم يُقيَّم بعد ضمن التغطية الحالية.";
  }

  const items: QualityItem[] = [
    {
      axis: 1, label: "مرتبط بمصدر", state: hasEvidence ? "done" : "needs",
      note: hasEvidence ? undefined : "اربط بند تقييم أو مصدر أدلة في «الدليل المرتبط».",
    },
    { axis: 1, label: "يعكس احتياجاً أو أولوية", state: needState, note: needNote },
    { axis: 1, label: "يوظف نقطة قوة أو اهتمام", state: strengthState, note: strengthNote },
    { axis: 1, label: "يسير في إطار رؤية بعيدة المدى", state: visionState, note: visionNote },
    {
      axis: 1, label: "فعل سلوكي أو جملة واضحة",
      state: goalText.length > 15 ? "done" : "needs",
      note: goalText.length > 15 ? undefined : "وسّع نص الهدف ليصف سلوكًا ملاحَظًا بوضوح.",
    },
    {
      axis: 1, label: "سياق وظيفي", state: input.context.trim() ? "done" : "needs",
      note: input.context.trim() ? undefined : "اختر السياق الواقعي الذي سيُمارَس فيه الهدف.",
    },
    {
      axis: 1, label: "قابل للقياس", hardStop: true, state: hasCriterion ? "done" : "needs",
      note: hasCriterion ? undefined : "أضف معيارًا محددًا في حقل «المعيار».",
    },
    { axis: 1, label: "يدعم الانتقال", state: transitionState, note: transitionNote },
    {
      axis: 1, label: "ممارسة حياتية مرتبطة",
      state: "advisory",
      note: input.lifePractice.trim() ? "تمت إضافة ممارسة حياتية مرتبطة." : "حقل إرشادي غير ملزم.",
    },
    {
      axis: 2, label: "طريقة القياس", hardStop: true, state: hasMeasurement ? "done" : "needs",
      note: hasMeasurement ? undefined : "حدد طريقة القياس المناسبة لهذا الهدف.",
    },
    {
      axis: 2, label: "معيار الإتقان", hardStop: true, state: hasCriterion ? "done" : "needs",
      note: hasCriterion ? undefined : "لا يمكن المتابعة دون معيار إتقان واضح.",
    },
    {
      axis: 2, label: "توافق القياس مع المعيار",
      state: /\d/.test(input.criterion) && hasMeasurement ? "done" : "needs",
      note: /\d/.test(input.criterion) && hasMeasurement ? undefined : "أضف نسبة أو تكرارًا رقميًا في المعيار ليتوافق مع طريقة القياس.",
    },
    {
      axis: 2, label: "وجود مصدر / دليل مرتبط مناسب", hardStop: true, state: hasEvidence ? "done" : "needs",
      note: hasEvidence ? undefined : "اربط بند تقييم أو ملاحظة داعمة.",
    },
  ];

  if (input.override) {
    for (const item of items) {
      if (item.hardStop && item.state === "needs") {
        item.overridden = true;
        item.note = `متجاوَز مهنيًا — السبب: ${input.override.reason}`;
      }
    }
  }

  return items;
}

export function summarizeQuality(items: QualityItem[]): { done: number; needs: number; advisory: number } {
  const summary = { done: 0, needs: 0, advisory: 0 };
  for (const item of items) summary[item.state]++;
  return summary;
}

/** Whether this goal has any unresolved, non-overridden hard-stop item. Only
 *  meaningful once the goal has actual text — an empty, not-yet-started goal
 *  is not a blocker. */
export function hasHardStopViolation(goalText: string, items: QualityItem[]): boolean {
  if (!goalText.trim()) return false;
  return items.some((item) => item.hardStop && item.state === "needs" && !item.overridden);
}
