export const MEASUREMENT_TYPES = [
  "discrete task",
  "chained task",
  "duration",
  "communication",
  "initiation",
  "transition",
  "production",
];

export function fidelityKindFromRating(rating) {
  if (rating === "pass") return "strength";
  if (rating === "emerge") return "emerging";
  if (rating === "fail") return "need";
  return "unknown";
}

export function assessmentPriorityRefsForDomain(records, domainCode, domainNameAr) {
  const priorities = [];
  for (const record of records ?? []) {
    for (const domain of record.domains ?? []) {
      if (domain.domainCode !== domainCode && domain.domainNameAr !== domainNameAr) continue;
      if (domain.rating !== "emerge" && domain.rating !== "fail") continue;
      priorities.push({
        ref: `assessment:${record.id}:${domain.domainCode}`,
        rating: domain.rating,
        kind: fidelityKindFromRating(domain.rating),
        noteAr: domain.note?.trim() || "",
        sourceNameAr: record.toolNameAr || "تقييم مراجع",
      });
    }
  }
  return priorities;
}

export function inferBehaviorTopology(skillAr, domainNameAr = "") {
  const text = `${skillAr ?? ""} ${domainNameAr ?? ""}`.toLowerCase();
  if (/تسلسل|خطوات|يرتب|إعداد|تحضير|روتين|task analysis|سلسلة/.test(text)) return "chained task";
  if (/مدة|دقيقة|وقت|زمن|يستمر|ينتظر/.test(text)) return "duration";
  if (/تواصل|طلب|يطلب|يسأل|يجيب|يوضح|يعبر|كلام|إشارة/.test(text)) return "communication";
  if (/يبادر|مبادرة|يبدأ من تلقاء|بدون طلب/.test(text)) return "initiation";
  if (/ينتقل|انتقال|يغيّر النشاط|تغيير مهمة/.test(text)) return "transition";
  if (/إنتاج|ينتج|كمية|قطع|تعبئة|تغليف|عمل مهني/.test(text)) return "production";
  return "discrete task";
}

export function measurementForTopology(topology) {
  switch (topology) {
    case "chained task":
      return { measurementType: topology, dataCollectionMethodAr: "قائمة تحليل مهمة تسجل الخطوات المنجزة ومستوى الدعم" };
    case "duration":
      return { measurementType: topology, dataCollectionMethodAr: "سجل مدة/زمن للأداء المستهدف" };
    case "communication":
      return { measurementType: topology, dataCollectionMethodAr: "تسجيل فرص تواصل طبيعية والاستجابات الناجحة" };
    case "initiation":
      return { measurementType: topology, dataCollectionMethodAr: "تسجيل فرص المبادرة وعدد المبادرات المستقلة" };
    case "transition":
      return { measurementType: topology, dataCollectionMethodAr: "سجل زمن الانتقال أو عدد التذكيرات اللازمة" };
    case "production":
      return { measurementType: topology, dataCollectionMethodAr: "سجل كمية العمل الصحيحة/المكتملة وجودتها" };
    default:
      return { measurementType: "discrete task", dataCollectionMethodAr: "تسجيل عدد المحاولات والاستجابات الصحيحة" };
  }
}

export function criterionFromBaseline(baselineAr, topology) {
  const baseline = String(baselineAr ?? "").trim();
  const percent = baseline.match(/(\d{1,3})\s*%/);
  if (percent) {
    return `تحسن قابل للقياس عن خط الأساس الموثق (${percent[1]}%) إلى مستوى أعلى يحدده المختص خلال مدة الخطة`;
  }

  const fraction = baseline.match(/(\d+)\s*(?:من|\/)\s*(\d+)/);
  if (fraction) {
    return `تحسن قابل للقياس عن خط الأساس الموثق (${fraction[1]} من ${fraction[2]}) إلى مستوى أعلى يحدده المختص خلال مدة الخطة`;
  }

  if (/مساعدة|دعم|تذكير|تلميح/.test(baseline)) {
    return "أداء المهارة بمستوى دعم أقل من خط الأساس الموثق، على أن يحدد المختص مستوى الإتقان النهائي";
  }

  const unit = topology === "duration"
    ? "زمن الأداء"
    : topology === "chained task"
      ? "عدد/نسبة الخطوات"
      : topology === "communication" || topology === "initiation"
        ? "عدد/نسبة الفرص"
        : topology === "production"
          ? "كمية/دقة الإنتاج"
          : "عدد/نسبة المحاولات";

  return `[يحدده المختص] بما يمثل تحسناً موثقاً عن خط الأساس الحالي وفق ${unit}`;
}

export function contextFromProfile(environmentContexts = [], supportConditions = []) {
  const environment = environmentContexts.map(String).map((x) => x.trim()).find(Boolean);
  const support = supportConditions.map(String).map((x) => x.trim()).find(Boolean);
  if (environment && support) return `${environment} مع ${support}`;
  if (environment) return environment;
  if (support) return `في موقف مناسب لممارسة المهارة مع ${support}`;
  return "في موقف مناسب لممارسة المهارة";
}

export function preparatorySkillFor(skillAr, topology) {
  const skill = String(skillAr ?? "").trim();
  switch (topology) {
    case "chained task":
      return `تنفيذ أول خطوة محددة من سلسلة «${skill}»`;
    case "communication":
      return `إظهار استجابة تواصلية واحدة مرتبطة بـ«${skill}»`;
    case "initiation":
      return `الاستجابة لإشارة بدء مرتبطة بـ«${skill}» قبل الانتقال إلى المبادرة المستقلة`;
    case "transition":
      return `إكمال خطوة انتقال أولى مرتبطة بـ«${skill}»`;
    case "duration":
      return `الحفاظ على «${skill}» لفترة أولية قابلة للقياس`;
    case "production":
      return `إكمال وحدة عمل واحدة صحيحة مرتبطة بـ«${skill}»`;
    default:
      return `تنفيذ استجابة واحدة محددة تمهد لـ«${skill}»`;
  }
}

export function proposalReasoning({
  variant,
  skillAr,
  domainNameAr,
  baselineAr,
  environmentContexts = [],
  supportConditions = [],
}) {
  const topology = inferBehaviorTopology(skillAr, domainNameAr);
  const measurement = measurementForTopology(topology);
  const baseContext = contextFromProfile(environmentContexts, supportConditions);
  const criterionAr = criterionFromBaseline(baselineAr, topology);
  const preparatorySkillAr = preparatorySkillFor(skillAr, topology);

  if (variant === "preparatory") {
    return {
      ...measurement,
      topology,
      targetSkillAr: preparatorySkillAr,
      contextAr: baseContext,
      criterionAr,
      actionAr: `ينفذ ${preparatorySkillAr}`,
      whyAr: "اقتراح تمهيدي يستهدف مهارة ممكِّنة أقرب من المطلب النهائي مع بقاء الارتكاز على الأداء المراجع.",
    };
  }

  if (variant === "functional_transition") {
    return {
      ...measurement,
      topology,
      targetSkillAr: skillAr,
      contextAr: baseContext,
      criterionAr,
      actionAr: `يوظف ${skillAr} ضمن أداء وظيفي ذي صلة بالمجال`,
      whyAr: "اقتراح وظيفي/انتقالي يوسع استخدام المهارة إلى أداء ذي معنى دون تغيير خط الأساس.",
    };
  }

  return {
    ...measurement,
    topology,
    targetSkillAr: skillAr,
    contextAr: baseContext,
    criterionAr,
    actionAr: `ينفذ ${skillAr}`,
    whyAr: "اقتراح قريب من مستوى الأداء الحالي يستهدف الفجوة الموثقة مباشرة.",
  };
}
