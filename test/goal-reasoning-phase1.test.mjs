import test from "node:test";
import assert from "node:assert/strict";

import {
  assessmentPriorityRefsForDomain,
  contextFromProfile,
  criterionFromBaseline,
  fidelityKindFromRating,
  inferBehaviorTopology,
  measurementForTopology,
  preparatorySkillFor,
  proposalReasoning,
} from "../src/lib/goal-reasoning-rules.mjs";

test("T6 — preserves assessment fidelity for strength, emerging and need", () => {
  assert.equal(fidelityKindFromRating("pass"), "strength");
  assert.equal(fidelityKindFromRating("emerge"), "emerging");
  assert.equal(fidelityKindFromRating("fail"), "need");

  const emerging = proposalReasoning({
    variant: "near_current_performance",
    skillAr: "طلب المساعدة",
    domainNameAr: "التواصل الوظيفي",
    baselineAr: "المهارة ناشئة وفق التقييم المراجع",
  });
  assert.doesNotMatch(emerging.whyAr, /متقن|عاجز|غير قادر/);
});

test("T7 — P2-12 maps measurement type to behavior topology and separates collection method", () => {
  const cases = [
    ["ترتيب خطوات إعداد حقيبة العمل", "chained task"],
    ["الانتظار لمدة خمس دقائق", "duration"],
    ["طلب المساعدة عند الحاجة", "communication"],
    ["يبادر ببدء المهمة", "initiation"],
    ["ينتقل بين نشاطين", "transition"],
    ["إنتاج قطع صحيحة في نشاط عمل مهني", "production"],
    ["اختيار الصورة الصحيحة", "discrete task"],
  ];

  for (const [skill, expected] of cases) {
    const topology = inferBehaviorTopology(skill, "");
    assert.equal(topology, expected);
    const measurement = measurementForTopology(topology);
    assert.equal(measurement.measurementType, expected);
    assert.ok(measurement.dataCollectionMethodAr.length > 0);
    assert.notEqual(measurement.dataCollectionMethodAr, "ملاحظة مباشرة");
  }
});

test("T8 — criterion is graduated from baseline without inventing an 80% default", () => {
  const numeric = criterionFromBaseline("ينجح حالياً في 2 من 5 محاولات", "discrete task");
  assert.match(numeric, /2 من 5/);
  assert.match(numeric, /مستوى أعلى يحدده المختص/);
  assert.doesNotMatch(numeric, /80%/);

  const descriptive = criterionFromBaseline("يؤدي المهمة مع تذكير لفظي", "chained task");
  assert.match(descriptive, /مستوى دعم أقل/);
  assert.doesNotMatch(descriptive, /80%/);

  const noMetric = criterionFromBaseline("أداء مراجع دون رقم كمي", "communication");
  assert.match(noMetric, /\[يحدده المختص\]/);
  assert.doesNotMatch(noMetric, /80%/);
});

test("T9 — each emerging or failed assessment domain exposes a traceable priority reference", () => {
  const records = [{
    id: "A1",
    toolNameAr: "تقييم مراجع",
    domains: [
      { domainCode: "FC", domainNameAr: "التواصل الوظيفي", rating: "emerge", note: "طلب المساعدة ناشئ" },
      { domainCode: "VS", domainNameAr: "المهارات المهنية", rating: "pass", note: "قوة" },
    ],
  }];

  const refs = assessmentPriorityRefsForDomain(records, "FC", "التواصل الوظيفي");
  assert.equal(refs.length, 1);
  assert.equal(refs[0].ref, "assessment:A1:FC");
  assert.equal(refs[0].kind, "emerging");

  const passRefs = assessmentPriorityRefsForDomain(records, "VS", "المهارات المهنية");
  assert.equal(passRefs.length, 0);
});

test("T11 — absent optional enrichment is silent and still yields a conservative context", () => {
  const context = contextFromProfile([], []);
  assert.equal(context, "في موقف مناسب لممارسة المهارة");
  assert.doesNotMatch(context, /ناقص|غير متوفر|الأسرة|صوت المتعلم/);

  const proposal = proposalReasoning({
    variant: "near_current_performance",
    skillAr: "طلب المساعدة",
    domainNameAr: "التواصل الوظيفي",
    baselineAr: "المهارة ناشئة وفق التقييم المراجع",
    environmentContexts: [],
    supportConditions: [],
  });
  assert.ok(proposal.actionAr);
  assert.ok(proposal.criterionAr);
  assert.ok(proposal.dataCollectionMethodAr);
});

test("T14 — preparatory proposal targets a genuinely different enabling step", () => {
  const skill = "ترتيب خطوات تجهيز أدوات العمل";
  const topology = inferBehaviorTopology(skill, "المهارات المهنية");
  const prep = preparatorySkillFor(skill, topology);
  assert.notEqual(prep, skill);
  assert.match(prep, /أول خطوة|استجابة|فترة أولية|وحدة عمل/);

  const proposal = proposalReasoning({
    variant: "preparatory",
    skillAr: skill,
    domainNameAr: "المهارات المهنية",
    baselineAr: "يبدأ السلسلة مع دعم",
  });
  assert.notEqual(proposal.targetSkillAr, skill);
  assert.doesNotMatch(proposal.actionAr, /^يتدرب على خطوة تمهيدية لـ/);
});

test("T15 — functional proposal changes the reasoning toward meaningful application", () => {
  const skill = "طلب المساعدة";
  const near = proposalReasoning({
    variant: "near_current_performance",
    skillAr: skill,
    domainNameAr: "التواصل الوظيفي",
    baselineAr: "المهارة ناشئة",
  });
  const functional = proposalReasoning({
    variant: "functional_transition",
    skillAr: skill,
    domainNameAr: "التواصل الوظيفي",
    baselineAr: "المهارة ناشئة",
  });

  assert.notEqual(functional.actionAr, near.actionAr);
  assert.match(functional.actionAr, /يوظف/);
  assert.match(functional.whyAr, /وظيفي\/انتقالي/);
  assert.equal(functional.criterionAr, near.criterionAr);
});
