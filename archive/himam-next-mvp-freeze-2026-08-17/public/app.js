const conceptLabels = {
  SAFETY: "السلامة والحماية",
  SELF_DET: "تقرير المصير",
  COMM: "التواصل",
  SELF_CARE: "العناية الذاتية",
  MOBILITY: "التنقل",
  SOCIAL: "العلاقات الاجتماعية",
  COMMUNITY: "المشاركة المجتمعية",
  HEALTH: "الصحة",
  ACADEMIC: "الأكاديمي",
  LEARNING_TECH: "تقنيات التعلم",
};

const sourceKindLabels = {
  official_assessment: "أداة تقييم رسمية",
  functional_observation: "ملاحظة وظيفية",
  learner_voice: "صوت المتعلم",
  family_voice: "صوت الأسرة",
  interest_survey: "مسح الاهتمامات",
  career_inclination: "الميول المهنية",
  additional_document: "مصدر إضافي",
  prior_report: "تقرير سابق",
};

const assessmentDomains = [
  {
    id: "daily_living",
    label: "مهارات الحياة اليومية",
    conceptIds: ["SELF_CARE", "SAFETY"],
    items: ["اتباع روتين عناية ذاتية", "تنظيم الأدوات الشخصية", "طلب المساعدة عند الحاجة", "استخدام جدول بصري"],
  },
  {
    id: "community",
    label: "المشاركة المجتمعية",
    conceptIds: ["COMMUNITY", "MOBILITY", "SAFETY"],
    items: ["شراء غرض بسيط", "اتباع خطوات الانتقال داخل المجتمع", "التعرف على إشارات السلامة", "التعامل مع شخص خدمة"],
  },
  {
    id: "communication",
    label: "التواصل الوظيفي",
    conceptIds: ["COMM", "SELF_DET"],
    items: ["طلب احتياج", "رفض غير مرغوب", "توضيح تفضيل", "استخدام وسيلة تواصل بديلة"],
  },
  {
    id: "self_determination",
    label: "تقرير المصير",
    conceptIds: ["SELF_DET", "SOCIAL"],
    items: ["اختيار نشاط", "تحديد أولوية شخصية", "متابعة هدف بسيط", "تقييم ما ساعده على النجاح"],
  },
  {
    id: "work_readiness",
    label: "الاستعداد للعمل والتدريب",
    conceptIds: ["SELF_DET", "COMMUNITY", "LEARNING_TECH"],
    items: ["اتباع تعليمات مهمة عملية", "إكمال سلسلة خطوات", "التعامل مع تغذية راجعة", "الالتزام بوقت نشاط"],
  },
];

const guidingQuestionTexts = [
  "ما هي المهارة أو السلوك النهائي الذي يحتاج الطالب إلى تحقيقه؟",
  "ما الهدف العام الذي تود الوصول له من خلال التدريب على هذه المهارة؟",
  "في أي مرحلة أداء مستقل يعتبر الطالب حالياً في سبيل وصوله للهدف العام؟",
  "ما الخطوة التي سيستهدفها هدف هذا العام كنقطة إتقان تالية؟",
];

const stepIds = ["learner", "sources", "sufficiency", "goal", "report"];
let currentWorkflow;

function qs(selector) {
  const element = document.querySelector(selector);
  if (!element) throw new Error(`Missing element: ${selector}`);
  return element;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function splitList(value) {
  return String(value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function tag(text, variant = "") {
  return `<span class="tag ${variant}">${escapeHtml(text)}</span>`;
}

function card(title, body, tags = []) {
  return `
    <article class="card">
      <h4>${escapeHtml(title)}</h4>
      <p class="meta">${body}</p>
      ${tags.length ? `<div class="tag-row">${tags.join("")}</div>` : ""}
    </article>
  `;
}

function conceptTags(concepts = []) {
  return concepts.map((concept) => tag(conceptLabels[concept] ?? concept, "ok"));
}

function statusTag(status) {
  if (status === "completed") return tag("مكتمل", "ok");
  if (status === "skipped") return tag("متخطى", "warn");
  return tag("مسودة", "warn");
}

function currentAssessmentFile(form) {
  const file = form.get("assessmentFile");
  return file && typeof file === "object" && "name" in file && file.name ? file.name : "ttap-results.pdf";
}

function baseSources(form) {
  const officialToolName = String(form.get("officialAssessmentTool") ?? "TEACCH Transition Assessment Profile");
  const learnerInterests = splitList(form.get("learnerInterests"));
  const familyPriorities = splitList(form.get("familyPriorities"));
  const familySupports = splitList(form.get("familySupports"));

  return [
    {
      id: "src-official-assessment",
      learnerId: "trial-learner-live",
      kind: "official_assessment",
      status: form.get("officialAssessmentStatus"),
      title: `Official assessment - ${officialToolName}`,
      selectedToolId: officialToolName === "Other" ? "OTHER" : officialToolName,
      selectedToolName: officialToolName,
      uploadedFileName: currentAssessmentFile(form),
      declaredConcepts: ["SELF_CARE", "MOBILITY", "COMMUNITY"],
      summary: "مصدر تقييم رسمي مرفوع كوثيقة؛ استخراج البنود التفصيلي مؤجل لطبقة معالجة لاحقة.",
    },
    {
      id: "src-family-voice",
      learnerId: "trial-learner-live",
      kind: "family_voice",
      status: form.get("familyVoiceStatus"),
      title: "بوصلة الأسرة - الأولويات والدعم",
      declaredConcepts: ["SELF_CARE", "SAFETY", "SELF_DET"],
      declaredPriorities: familyPriorities,
      declaredSupports: familySupports,
      summary: "صوت الأسرة يدعم الأولويات والسياق والصياغة، لكنه لا يثبت مستوى الأداء وحده.",
    },
    {
      id: "src-learner-voice",
      learnerId: "trial-learner-live",
      kind: "learner_voice",
      status: form.get("learnerVoiceStatus"),
      title: "صوت المتعلم - اكتشاف الذات",
      declaredConcepts: ["SELF_DET", "COMM", "SOCIAL"],
      declaredInterests: learnerInterests,
      summary: "صوت المتعلم يدعم الدافعية والاختيار وصياغة الهدف.",
    },
    {
      id: "src-career-inclination",
      learnerId: "trial-learner-live",
      kind: "career_inclination",
      status: form.get("careerInclinationStatus"),
      title: "مسح الميول المهنية",
      declaredConcepts: ["SELF_DET", "COMMUNITY", "LEARNING_TECH"],
      declaredInterests: ["hands-on work", "supported customer service routines"],
      summary: "معلومة داعمة للتخطيط للانتقال لعمر 14 سنة فأكثر، ولا تمنع المسار وحدها.",
    },
    {
      id: "src-prior-report",
      learnerId: "trial-learner-live",
      kind: "prior_report",
      status: "completed",
      title: "تقرير أو خطة سابقة",
      declaredConcepts: ["ACADEMIC", "LEARNING_TECH"],
      summary: "السجلات السابقة تحتاج مراجعة بشرية قبل تحويلها إلى دليل أداء حالي.",
    },
  ];
}

function inputFromForm() {
  const form = new FormData(qs("#workflowForm"));
  const ageValue = String(form.get("ageYears") ?? "").trim();
  const learner = {
    id: "trial-learner-live",
    name: String(form.get("learnerName") ?? "").trim() || "Trial Learner",
    ageYears: ageValue ? Number(ageValue) : null,
    diagnosis: String(form.get("diagnosis") ?? "").trim(),
    institution: String(form.get("institution") ?? "").trim(),
    entryType: form.get("entryType"),
  };

  return {
    learner,
    sources: baseSources(form),
    goal: {
      behavior: String(form.get("behavior") ?? ""),
      performanceCriterion: String(form.get("performanceCriterion") ?? ""),
      measurementMethod: String(form.get("measurementMethod") ?? ""),
    },
  };
}

async function rebuildWorkflow() {
  qs("#formStatus").textContent = "جاري التوليد...";
  const input = inputFromForm();
  try {
    const response = await fetch("/api/workflow", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input),
    });
    if (!response.ok) throw new Error("API unavailable");
    currentWorkflow = await response.json();
    qs("#formStatus").textContent = "تم التحديث من الخادم";
  } catch {
    currentWorkflow = buildLocalWorkflow(input);
    qs("#formStatus").textContent = "تم التحديث محلياً";
  }
  renderWorkflow(currentWorkflow);
}

function ageBand(ageYears) {
  if (ageYears === null || Number.isNaN(ageYears)) return null;
  if (ageYears < 9) return "UNDER_9";
  if (ageYears < 14) return "AGE_9_TO_13";
  return "AGE_14_PLUS";
}

function sourceRole(source) {
  if (source.status !== "completed") return "unclassified_pending_review";
  if (source.kind === "official_assessment" || source.kind === "functional_observation") return "performance_evidence";
  if (["family_voice", "learner_voice", "interest_survey", "career_inclination"].includes(source.kind)) {
    return "supporting_information";
  }
  if (source.kind === "prior_report") return "suggested_inference";
  return "unclassified_pending_review";
}

function localTrace(source, field) {
  return { sourceId: source.id, sourceKind: source.kind, field };
}

function buildLocalWorkflow(input) {
  const band = ageBand(input.learner.ageYears);
  const classifiedInformation = input.sources.map((source) => {
    const role = sourceRole(source);
    const base = {
      id: `${role}_${source.id}`,
      learnerId: input.learner.id,
      role,
      label: source.title,
      conceptIds: source.declaredConcepts ?? ["SELF_DET", "COMMUNITY"],
      traceRefs: [localTrace(source)],
    };
    if (role === "performance_evidence") {
      return { ...base, confidence: source.kind === "official_assessment" ? "structured" : "provisional" };
    }
    if (role === "supporting_information") {
      return { ...base, supportType: source.kind === "family_voice" ? "priority" : "preference" };
    }
    if (role === "suggested_inference") {
      return { ...base, reason: "السجلات السابقة تحتاج مراجعة بشرية.", status: "suggested" };
    }
    return { ...base, reason: "المصدر غير مكتمل أو تم تخطيه." };
  });

  const completed = new Set(input.sources.filter((source) => source.status === "completed").map((source) => source.kind));
  const gaps = [];
  if (input.learner.ageYears === null || Number.isNaN(input.learner.ageYears)) {
    gaps.push({
      id: `gap_${input.learner.id}_age`,
      learnerId: input.learner.id,
      severity: "blocking",
      title: "عمر المتعلم غير مدخل",
      recommendation: "أدخل العمر أو تاريخ الميلاد قبل إعداد الخطة.",
      blocksWorkflow: true,
    });
  }
  if (!completed.has("official_assessment")) {
    gaps.push({
      id: `gap_${input.learner.id}_official_assessment`,
      learnerId: input.learner.id,
      severity: "blocking",
      title: "مصدر التقييم الرسمي غير مكتمل",
      recommendation: "أضف أداة تقييم رسمية مطبقة أو ارفع نتائجها قبل إعداد الخطة.",
      blocksWorkflow: true,
    });
  }
  if (!completed.has("learner_voice")) {
    gaps.push({
      id: `gap_${input.learner.id}_learner_voice`,
      learnerId: input.learner.id,
      severity: "quality",
      title: "صوت المتعلم غير موثق",
      recommendation: "استكمال صوت المتعلم يحسن الأولويات والدافعية وصياغة الهدف.",
      blocksWorkflow: false,
    });
  }
  if (!completed.has("family_voice")) {
    gaps.push({
      id: `gap_${input.learner.id}_family_voice`,
      learnerId: input.learner.id,
      severity: "quality",
      title: "صوت الأسرة غير موثق",
      recommendation: "استكمال صوت الأسرة يحسن ملاءمة الخطة لسياق الحياة اليومية.",
      blocksWorkflow: false,
    });
  }
  if (band === "AGE_14_PLUS" && !completed.has("career_inclination")) {
    gaps.push({
      id: `gap_${input.learner.id}_career_inclination_14_plus`,
      learnerId: input.learner.id,
      severity: "quality",
      title: "يوصى بمعلومات الميول المهنية لعمر 14+",
      recommendation: "أضف مسح الميول أو الاهتمامات المهنية. التوصية غير مانعة للمسار.",
      blocksWorkflow: false,
    });
  }

  const insights = classifiedInformation.map((item) => ({
    id: `insight_${item.id}`,
    learnerId: input.learner.id,
    title: item.label,
    body:
      item.role === "performance_evidence"
        ? "معلومة أداء منظمة يمكن أن تدعم مراجعة مستوى الأداء الحالي."
        : "هذه المعلومة تدعم الأولويات أو السياق أو الصياغة، وتحتاج حكماً بشرياً قبل استخدامها بقوة أعلى.",
    conceptIds: item.conceptIds,
    role: item.role,
    traceRefs: item.traceRefs,
  }));
  const goalOpportunities = insights.map((insight) => ({
    id: `goal_opp_${insight.id}`,
    learnerId: input.learner.id,
    title: `فرصة هدف من: ${insight.title}`,
    rationale:
      insight.role === "performance_evidence"
        ? "هذه الفرصة مرتبطة بمصدر أداء ويمكن استخدامها لصياغة هدف قابل للقياس."
        : "يمكن أن تؤثر هذه المعلومة في الأولوية أو الصياغة، لكنها تحتاج مرساة أداء قبل اعتماد الجودة.",
    conceptIds: insight.conceptIds,
    sourceRole: insight.role,
    readiness:
      insight.role === "performance_evidence"
        ? "ready_for_goal_draft"
        : insight.role === "supporting_information"
          ? "needs_human_review"
          : "needs_more_information",
    traceRefs: insight.traceRefs,
  }));
  const supportSource = input.sources.find((source) => source.status === "completed" && source.declaredSupports?.length);
  const supportOpportunities = supportSource
    ? supportSource.declaredSupports.map((support) => ({
        id: `support_opp_${supportSource.id}_${support}`,
        learnerId: input.learner.id,
        title: support,
        suggestedConditionPhrase: `بالنظر إلى ${support}، سيقوم ${input.learner.name} بـ`,
        conceptIds: supportSource.declaredConcepts ?? ["LEARNING_TECH", "SELF_DET"],
        traceRefs: [localTrace(supportSource, "declaredSupports")],
      }))
    : [];
  const sufficiencyReview = {
    learnerId: input.learner.id,
    ageBand: band,
    minimumReady: !gaps.some((gap) => gap.blocksWorkflow),
    classifiedInformation,
    insights,
    goalOpportunities,
    supportOpportunities,
    gaps,
  };
  const opportunity = goalOpportunities.find((item) => item.readiness === "ready_for_goal_draft");
  if (!opportunity) {
    return { learner: input.learner, sources: input.sources, sufficiencyReview, goalDraft: null, goalQualityReview: null, reportPackage: null };
  }

  const support = supportOpportunities[0];
  const condition = support?.suggestedConditionPhrase ?? `بالنظر إلى مواد ودعم مناسبين، سيقوم ${input.learner.name} بـ`;
  const goalDraft = {
    id: `goal_draft_${input.learner.id}_${opportunity.id}`,
    learnerId: input.learner.id,
    sourceOpportunityId: opportunity.id,
    conceptIds: opportunity.conceptIds,
    status: input.goal.behavior && input.goal.performanceCriterion && input.goal.measurementMethod ? "draft_ready_for_human_review" : "needs_revision",
    text: `بنهاية فترة الخطة السنوية، ${condition} ${input.goal.behavior || "[missing observable behavior]"} في سياق حياتي مناسب وفق معيار ${input.goal.performanceCriterion || "[missing performance criterion]"}، ويقاس عبر ${input.goal.measurementMethod || "[missing measurement method]"}.`,
    elements: [
      { key: "learner_timeframe", label: "الطالب + الإطار الزمني", value: "بنهاية فترة الخطة السنوية" },
      { key: "condition", label: "بيان المعطيات/الشرط", value: condition },
      { key: "observable_behavior", label: "سلوك ملحوظ", value: input.goal.behavior || "[missing observable behavior]" },
      { key: "clarifying_details", label: "توضيح التفاصيل", value: "في سياق حياتي مناسب" },
      { key: "performance_criterion", label: "مستوى/معيار الأداء", value: input.goal.performanceCriterion || "[missing performance criterion]" },
      { key: "measurement_method", label: "أسلوب القياس التقييمي", value: input.goal.measurementMethod || "[missing measurement method]" },
    ],
    traceRefs: [...opportunity.traceRefs, ...(support?.traceRefs ?? [])],
  };
  const hardStop = goalDraft.elements.filter((element) => element.value.includes("[missing"));
  const goalQualityReview = {
    goalDraftId: goalDraft.id,
    readyForHumanReview: hardStop.length === 0 && goalDraft.status === "draft_ready_for_human_review",
    issues: hardStop.map((element) => ({
      id: `goal_quality_${goalDraft.id}_${element.key}`,
      severity: "hard_stop",
      title: `عنصر ناقص: ${element.label}`,
      recommendation: "أكمل هذا العنصر قبل إرسال الهدف للمراجعة البشرية.",
    })),
  };
  const claims = [
    {
      id: `claim_${input.learner.id}_goal_draft`,
      learnerId: input.learner.id,
      type: "goal_draft",
      title: "مسودة الهدف مرتبطة بمصدر معلومات",
      body: goalDraft.text,
      sourceRefs: goalDraft.traceRefs,
    },
    {
      id: `claim_${input.learner.id}_human_review_boundary`,
      learnerId: input.learner.id,
      type: "human_review_boundary",
      title: "الاعتماد البشري خارج المنصة",
      body: "همم يجهز مسودة وفحص جودة، أما الاعتماد النهائي فيبقى بشرياً.",
      sourceRefs: [],
    },
  ];
  const reportPackage = {
    id: `report_${input.learner.id}`,
    learnerId: input.learner.id,
    status: sufficiencyReview.minimumReady && goalQualityReview.readyForHumanReview ? "draft_ready_for_human_review" : "needs_revision",
    claims,
    traces: claims.map((claim) => ({
      claimId: claim.id,
      complete: claim.sourceRefs.length > 0 || claim.type === "human_review_boundary",
      steps: [
        { label: "Learner", recordId: input.learner.id, recordType: "Learner" },
        ...claim.sourceRefs.map((sourceRef) => ({
          label: `Source: ${sourceRef.sourceKind}`,
          recordId: sourceRef.sourceId,
          recordType: "InformationSource",
        })),
        { label: "Goal draft", recordId: goalDraft.id, recordType: "GoalDraft" },
        { label: "Report claim", recordId: claim.id, recordType: "ReportClaim" },
      ],
    })),
  };

  return { learner: input.learner, sources: input.sources, sufficiencyReview, goalDraft, goalQualityReview, reportPackage };
}

function renderComponentChecklist(workflow) {
  const completedSources = new Set(workflow.sources.filter((source) => source.status === "completed").map((source) => source.kind));
  const items = [
    ["البيانات الأساسية", Boolean(workflow.learner.name && workflow.learner.ageYears !== null)],
    ["التقييم الرسمي", completedSources.has("official_assessment")],
    ["صوت المتعلم", completedSources.has("learner_voice")],
    ["صوت الأسرة", completedSources.has("family_voice")],
    ["كفاية المعلومات", workflow.sufficiencyReview.minimumReady],
    ["مسودة الهدف", Boolean(workflow.goalDraft)],
    ["التقرير والتتبع", Boolean(workflow.reportPackage)],
  ];
  qs("#componentChecklist").innerHTML = items
    .map(
      ([label, done]) => `
        <div class="check-item ${done ? "is-done" : ""}">
          <span class="check-mark">${done ? "✓" : ""}</span>
          <span>${escapeHtml(label)}</span>
        </div>
      `,
    )
    .join("");
}

function renderLearner(workflow) {
  const learner = workflow.learner;
  qs("#learnerCard").innerHTML = [
    card("اسم المتعلم", escapeHtml(learner.name)),
    card("العمر", learner.ageYears === null ? "غير مدخل" : `${escapeHtml(learner.ageYears)} سنة`),
    card("التشخيص", escapeHtml(learner.diagnosis || "غير مدخل")),
    card("المركز أو المؤسسة", escapeHtml(learner.institution || "غير مدخل")),
    card("نوع القيد", learner.entryType === "returning" ? "متعلم سابق" : "متعلم جديد"),
  ].join("");
}

function renderSources(workflow) {
  qs("#sourcesList").innerHTML = workflow.sources
    .map((source) =>
      card(
        sourceKindLabels[source.kind] ?? source.kind,
        `${escapeHtml(source.title)}<br>${escapeHtml(source.summary ?? "")}`,
        [
          statusTag(source.status),
          source.selectedToolName ? tag(source.selectedToolName) : "",
          source.uploadedFileName ? tag(`ملف: ${source.uploadedFileName}`) : "",
          ...conceptTags(source.declaredConcepts),
        ].filter(Boolean),
      ),
    )
    .join("");
}

function renderSufficiency(workflow) {
  const review = workflow.sufficiencyReview;
  const blocking = review.gaps.filter((gap) => gap.blocksWorkflow).length;
  const quality = review.gaps.filter((gap) => gap.severity === "quality").length;
  qs("#sufficiencySummary").innerHTML = `
    <strong>${review.minimumReady ? "الحد الأدنى متاح للانتقال إلى مسودة الخطة" : "توجد نواقص مانعة"}</strong>
    <div class="tag-row">
      ${tag(`الفئة العمرية: ${review.ageBand ?? "غير محددة"}`, review.ageBand === "AGE_14_PLUS" ? "warn" : "")}
      ${tag(`نواقص مانعة: ${blocking}`, blocking ? "stop" : "ok")}
      ${tag(`توصيات جودة: ${quality}`, quality ? "warn" : "ok")}
    </div>
  `;

  qs("#gapsList").innerHTML = review.gaps.length
    ? review.gaps
        .map((gap) =>
          card(gap.title, escapeHtml(gap.recommendation), [
            tag(gap.blocksWorkflow ? "مانع" : "غير مانع", gap.blocksWorkflow ? "stop" : "warn"),
            tag(gap.severity),
          ]),
        )
        .join("")
    : card("لا توجد فجوات ظاهرة", "مصادر المعلومات الحالية تكفي للانتقال إلى مسودة الهدف.", [tag("جاهز", "ok")]);

  qs("#opportunitiesList").innerHTML = review.goalOpportunities
    .map((opportunity) =>
      card(
        opportunity.title,
        escapeHtml(opportunity.rationale),
        [tag(opportunity.readiness, opportunity.readiness === "ready_for_goal_draft" ? "ok" : "warn"), ...conceptTags(opportunity.conceptIds)],
      ),
    )
    .join("");
}

function renderGoalBuilder(workflow) {
  const domainSelect = qs("#assessmentDomainSelect");
  const itemSelect = qs("#assessmentItemsSelect");
  const sourceSelect = qs("#goalSourceSelect");
  const currentDomain = domainSelect.value || assessmentDomains[0].id;
  const domain = assessmentDomains.find((item) => item.id === currentDomain) ?? assessmentDomains[0];

  domainSelect.innerHTML = assessmentDomains
    .map((item) => `<option value="${escapeHtml(item.id)}">${escapeHtml(item.label)}</option>`)
    .join("");
  domainSelect.value = domain.id;

  itemSelect.innerHTML = domain.items
    .map((item, index) => `<option value="${escapeHtml(item)}" ${index === 0 ? "selected" : ""}>${escapeHtml(item)}</option>`)
    .join("");

  const completedSources = workflow.sources.filter((source) => source.status === "completed");
  const familySource = completedSources.find((source) => source.kind === "family_voice");
  const sourceOptions = completedSources.map((source) => ({
    value: source.id,
    label: sourceKindLabels[source.kind] ?? source.title,
  }));
  if (familySource?.declaredPriorities?.length) {
    sourceOptions.push({
      value: "family_priorities",
      label: "أولويات الأسرة",
    });
  }

  sourceSelect.innerHTML = sourceOptions.length
    ? sourceOptions.map((item) => `<option value="${escapeHtml(item.value)}">${escapeHtml(item.label)}</option>`).join("")
    : `<option value="">لا توجد مصادر مكتملة بعد</option>`;

  renderGuidingQuestions();
}

function renderGuidingQuestions() {
  const mode = qs("#goalSupportMode").value;
  qs("#guidingQuestions").innerHTML =
    mode === "guided"
      ? guidingQuestionTexts.map((question) => `<p>${escapeHtml(question)}</p>`).join("")
      : "<p>يمكن إدخال الهدف مباشرة، مع بقاء فحص الجودة والتتبع قبل المراجعة البشرية.</p>";
}

function renderGoal(workflow) {
  const goal = workflow.goalDraft;
  if (!goal || !workflow.goalQualityReview) {
    qs("#goalText").textContent = "لا توجد فرصة هدف جاهزة؛ يلزم مصدر أداء رسمي أو ملاحظة وظيفية مكتملة.";
    qs("#goalElements").innerHTML = "";
    qs("#qualityList").innerHTML = card("غير جاهز", "أكمل مصدر أداء قبل توليد مسودة الهدف.", [tag("needs_more_information", "stop")]);
    return;
  }

  qs("#goalText").textContent = goal.text;
  qs("#goalElements").innerHTML = goal.elements.map((element) => card(element.label, escapeHtml(element.value))).join("");

  const issues = workflow.goalQualityReview.issues;
  qs("#qualityList").innerHTML = issues.length
    ? issues
        .map((issue) =>
          card(issue.title, escapeHtml(issue.recommendation), [
            tag(issue.severity, issue.severity === "hard_stop" ? "stop" : "warn"),
          ]),
        )
        .join("")
    : card("لا توجد موانع جودة", "المسودة جاهزة للمراجعة البشرية، وليست معتمدة من المنصة.", [
        tag("جاهزة للمراجعة البشرية", "ok"),
      ]);
}

function renderReport(workflow) {
  const report = workflow.reportPackage;
  if (!report) {
    qs("#reportSummary").innerHTML = `<strong>لا يوجد تقرير مسودة بعد</strong>`;
    qs("#claimsList").innerHTML = card("غير جاهز", "ينتظر التقرير وجود مسودة هدف قابلة للتتبع.", [
      tag("needs_more_information", "stop"),
    ]);
    qs("#traceList").innerHTML = "";
    return;
  }

  qs("#reportSummary").innerHTML = `
    <strong>حالة التقرير: ${escapeHtml(report.status)}</strong>
    <div class="tag-row">
      ${tag(`Claims: ${report.claims.length}`, "ok")}
      ${tag(`Traces: ${report.traces.length}`, "ok")}
      ${tag("لا اعتماد آلي", "warn")}
    </div>
  `;

  qs("#claimsList").innerHTML = report.claims
    .map((claim) =>
      card(claim.title, escapeHtml(claim.body), [
        tag(claim.type),
        tag(`مصادر: ${claim.sourceRefs.length}`, claim.sourceRefs.length ? "ok" : "warn"),
      ]),
    )
    .join("");

  qs("#traceList").innerHTML = report.traces
    .map((trace) =>
      card(
        `Trace: ${trace.claimId}`,
        trace.steps.map((step) => `<div class="trace-step">${escapeHtml(step.label)}: ${escapeHtml(step.recordType)}</div>`).join(""),
        [tag(trace.complete ? "مكتمل" : "غير مكتمل", trace.complete ? "ok" : "stop")],
      ),
    )
    .join("");
}

function renderWorkflow(workflow) {
  renderComponentChecklist(workflow);
  renderLearner(workflow);
  renderSources(workflow);
  renderSufficiency(workflow);
  renderGoalBuilder(workflow);
  renderGoal(workflow);
  renderReport(workflow);
}

function goToStep(stepId) {
  const buttons = [...document.querySelectorAll(".rail-item")];
  const panels = [...document.querySelectorAll(".panel")];
  for (const currentButton of buttons) currentButton.classList.remove("is-active");
  for (const panel of panels) panel.classList.remove("is-visible");
  const button = buttons.find((item) => item.dataset.target === stepId);
  button?.classList.add("is-active");
  qs(`#${stepId}`).classList.add("is-visible");
}

function bindNavigation() {
  const buttons = [...document.querySelectorAll(".rail-item")];
  for (const button of buttons) {
    button.addEventListener("click", () => goToStep(button.dataset.target));
  }

  for (const button of document.querySelectorAll("[data-step-action]")) {
    button.addEventListener("click", () => {
      const active = document.querySelector(".panel.is-visible");
      const index = stepIds.indexOf(active?.id ?? "learner");
      const delta = button.dataset.stepAction === "next" ? 1 : -1;
      const next = stepIds[Math.max(0, Math.min(stepIds.length - 1, index + delta))];
      goToStep(next);
    });
  }
}

async function loadInitialWorkflow() {
  const response = await fetch("./prototype-data.json");
  currentWorkflow = await response.json();
  renderWorkflow(currentWorkflow);
}

function bindForm() {
  qs("#workflowForm").addEventListener("submit", (event) => {
    event.preventDefault();
    rebuildWorkflow().catch((error) => {
      qs("#formStatus").textContent = error.message;
    });
  });
}

function bindGoalBuilder() {
  qs("#assessmentDomainSelect").addEventListener("change", () => {
    if (currentWorkflow) renderGoalBuilder(currentWorkflow);
  });
  qs("#goalSupportMode").addEventListener("change", renderGuidingQuestions);
  qs("#goalBuilderForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const domain = assessmentDomains.find((item) => item.id === qs("#assessmentDomainSelect").value) ?? assessmentDomains[0];
    const selectedItems = [...qs("#assessmentItemsSelect").selectedOptions].map((option) => option.value);
    const nextStep = qs("#nextMasteryStepInput").value.trim();
    const currentIndependence = qs("#currentIndependenceInput").value.trim();
    const generalGoal = qs("#generalGoalInput").value.trim();
    const sourceLabel = qs("#goalSourceSelect").selectedOptions[0]?.textContent ?? "مصدر معلومات مكتمل";
    const selectedText = selectedItems.length ? selectedItems.join("، ") : domain.items[0];

    qs("[name='behavior']").value = `${nextStep || selectedText} ضمن مجال ${domain.label}`;
    qs("[name='performanceCriterion']").value =
      currentIndependence || "في 4 من 5 فرص ملاحظة عبر ثلاث جلسات متتالية";
    qs("[name='measurementMethod']").value =
      `قائمة ملاحظة مرتبطة بـ ${sourceLabel} وبنود: ${selectedText}`;
    qs("#formStatus").textContent = generalGoal
      ? `تم تحويل الهدف العام إلى مسودة: ${generalGoal}`
      : "تم تحويل الاختيارات إلى مسودة هدف";
    rebuildWorkflow().catch((error) => {
      qs("#formStatus").textContent = error.message;
    });
  });
}

async function main() {
  bindNavigation();
  bindForm();
  bindGoalBuilder();
  await loadInitialWorkflow();
}

main().catch((error) => {
  document.body.innerHTML = `<pre>${escapeHtml(error.stack ?? error.message)}</pre>`;
});
