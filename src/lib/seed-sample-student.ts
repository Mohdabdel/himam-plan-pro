// ── Sample state seeding ──────────────────────────────────────────────────────
// Writes one fully-populated, realistic student through the whole journey
// (assessment → coverage → family voice → learner voice → IEP with the new
// goal-quality fields, including one goal that used a documented override)
// so internal reviewers can open Plan/Report immediately instead of filling
// six forms by hand. Dev/internal-trial convenience only — never invoked
// automatically.

type StoredStudent = {
  id: string; name: string; birthDate: string; center: string;
  tool: string; createdAt: string; status: string;
};

export function seedSampleStudent(): string {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  const student: StoredStudent = {
    id,
    name: "منصور خالد العامري",
    birthDate: "2007-03-12",
    center: "مركز الأمل للتأهيل — العين",
    tool: "TTAP-3",
    createdAt: now,
    status: "iep_completed",
  };

  try {
    const list: StoredStudent[] = JSON.parse(localStorage.getItem("himam_students") || "[]");
    localStorage.setItem("himam_students", JSON.stringify([...list, student]));
  } catch { /* noop */ }

  // Assessment: FC is a real "need" (fail), IF is emerging, everything else passes.
  const domainsArray = [
    { code: "VS", score: "pass", note: "" },
    { code: "VB", score: "pass", note: "" },
    { code: "IF", score: "emerge", note: "يحتاج دعمًا إضافيًا في إدارة المال" },
    { code: "LS", score: "pass", note: "" },
    { code: "FC", score: "fail", note: "يتردد في طلب المساعدة أمام أشخاص غير مألوفين" },
    { code: "IB", score: "pass", note: "" },
  ];
  try {
    localStorage.setItem(`himam_assessment_${id}`, JSON.stringify({
      learnerId: id, tool: student.tool, assessorName: "أ. سارة القحطاني",
      assessmentDate: now.slice(0, 10), domains: domainsArray, updatedAt: now,
    }));
  } catch { /* noop */ }

  try {
    localStorage.setItem(`himam_coverage_${id}`, JSON.stringify({
      learnerId: id, tool: student.tool,
      filledDomains: ["VS", "VB", "IF", "LS", "FC", "IB"],
      uncoveredDomains: [],
      passedDomains: ["VS", "VB", "LS", "IB"],
      emergingDomains: ["IF"],
      failedDomains: ["FC"],
      completionPercent: 100,
      warning: "coverage_ok",
      updatedAt: now,
    }));
  } catch { /* noop */ }

  try {
    localStorage.setItem(`himam_family_${id}`, JSON.stringify({
      method: "مقابلة", sessionDate: now.slice(0, 10), attendees: "الأب، الأم",
      priorities: ["التواصل", "العمل", "الاستقلالية"],
      concernsChecked: ["الاستقرار الوظيفي"], concernsText: "",
      vision5y: "نتمنى أن يعمل في بيئة عمل داعمة وأن يكون قادرًا على طلب المساعدة والتواصل بثقة مع زملائه.",
      quality: "strong", savedAt: now,
    }));
  } catch { /* noop */ }

  try {
    localStorage.setItem(`himam_learner_voice_${id}`, JSON.stringify({
      method: "كلام",
      q_love: "يحب التواصل مع أصدقائه ومساعدتهم في المهام اليومية",
      q_good: "يجيد استخدام الأجهزة اللوحية وتنظيم أدواته",
      q_future: "يريد أن يعمل في مكان فيه أصدقاء",
      q_happy: "", q_hard: "",
      environments: ["بيئة العمل", "الفصل الدراسي"],
      quality: "strong", savedAt: now,
    }));
  } catch { /* noop */ }

  try {
    localStorage.setItem(`himam_iep_${id}`, JSON.stringify({
      vision: "بناء استقلالية وظيفية واجتماعية تدعم انتقاله الناجح لسوق العمل.",
      goals: {
        VS: [{
          id: crypto.randomUUID(),
          text: "يرتب أدوات العمل في مكان مخصص قبل بدء المهمة",
          category: "عملي",
          context: "المركز / المدرسة",
          criterion: "", measurementMethod: "", evidenceRef: "",
          lifePractice: "",
          override: {
            reason: "قيد زمني في الجلسة الحالية",
            note: "سيُستكمل تحديد المعيار وطريقة القياس في الجلسة القادمة بعد ملاحظة إضافية.",
            at: now,
          },
        }],
        VB: [], IF: [], LS: [],
        FC: [{
          id: crypto.randomUUID(),
          text: "يطلب المساعدة من زميل في بيئة العمل عند مواجهة عائق",
          category: "وظيفي",
          context: "المركز / المدرسة",
          criterion: "80% من المحاولات عبر 3 جلسات ملاحظة متتالية",
          measurementMethod: "ملاحظة مباشرة",
          evidenceRef: "بند 49 — يفهم التعليمات اللفظية أو الإيماءات",
          lifePractice: "يطلب المساعدة من أحد أفراد الأسرة عند تعطل جهاز منزلي، بنفس الأسلوب المستهدف في بيئة العمل.",
        }],
        IB: [],
      },
      services: ["دعم التواصل", "التدريب المهني"],
      startDate: now.slice(0, 10),
      savedAt: now,
    }));
  } catch { /* noop */ }

  return id;
}
