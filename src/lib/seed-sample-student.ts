import {
  createAssessmentRecord,
  saveAssessmentRecords,
  updateAssessmentDomainRating,
} from "@/lib/assessment-records";
import {
  createInformationRecord,
  saveInformationRecords,
  updateInformationResponse,
} from "@/lib/information-records";
import {
  buildSourceFilePipeline,
  saveSourceFilePipelines,
} from "@/lib/source-file-pipeline";

// ── Sample state seeding ──────────────────────────────────────────────────────
// Writes one fully-populated, realistic student through the whole journey
// (assessment → reviewed source file → platform information tools → current
// level → IEP with goal-quality fields) so internal reviewers can test the
// goals screen with a completed upstream workflow.

type StoredStudent = {
  id: string; name: string; birthDate: string; center: string;
  tool: string; createdAt: string; status: string; ageBand?: string;
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
    ageBand: "AGE_14_PLUS",
  };

  try {
    const list: StoredStudent[] = JSON.parse(localStorage.getItem("himam_students") || "[]");
    localStorage.setItem("himam_students", JSON.stringify([...list, student]));
  } catch { /* noop */ }

  // Assessment: FC is a real "need" (fail), IF is emerging, everything else passes.
  const domainsArray = [
    { code: "VS", score: "pass", note: "يرتب أدوات التدريب ويكمل خطوات العمل الروتينية عند وجود قائمة بصرية." },
    { code: "VB", score: "pass", note: "يلتزم بقواعد المكان عندما تكون التعليمات قصيرة ومحددة." },
    { code: "IF", score: "emerge", note: "يحتاج دعمًا إضافيًا في إدارة المال واختيار المشتريات البسيطة." },
    { code: "LS", score: "pass", note: "يشارك في أنشطة ترفيهية مألوفة مع أقران يعرفهم." },
    { code: "FC", score: "fail", note: "يتردد في طلب المساعدة أمام أشخاص غير مألوفين ولا يستخدم صيغة طلب ثابتة." },
    { code: "IB", score: "pass", note: "يتقبل العمل بجوار زميل عند وضوح الدور المطلوب منه." },
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
    const formalRecord = createAssessmentRecord({
      learnerId: id,
      toolId: student.tool,
      ageBand: student.ageBand,
      uploadedFileName: "ttap-results-review-demo.pdf",
      uploadedFileType: "application/pdf",
    });
    const ratingByDomain: Record<string, { rating: "pass" | "emerge" | "fail"; note: string }> = {
      VOCATIONAL_SKILLS: { rating: "pass", note: "يرتب أدوات التدريب ويكمل خطوات العمل الروتينية عند وجود قائمة بصرية." },
      VOCATIONAL_BEHAVIORS: { rating: "pass", note: "يلتزم بقواعد المكان عندما تكون التعليمات قصيرة ومحددة." },
      INDEPENDENT_FUNCTIONING: { rating: "emerge", note: "يدير المال في موقف تدريبي بسيط مع تذكير لفظي أو بصري." },
      LEISURE_SKILLS: { rating: "pass", note: "يشارك في نشاط ترفيهي مألوف عند توفر شريك نشاط واضح." },
      FUNCTIONAL_COMMUNICATION: { rating: "fail", note: "لا يطلب المساعدة من شخص غير مألوف عند تعثر المهمة دون تلقين مباشر." },
      INTERPERSONAL_BEHAVIOR: { rating: "pass", note: "يتقبل العمل بجوار زميل عند وضوح الدور المطلوب منه." },
    };
    const completedFormalRecord = formalRecord.domains.reduce((record, domain) => {
      const rating = ratingByDomain[domain.domainCode];
      return rating
        ? updateAssessmentDomainRating(record, domain.domainCode, rating.rating, rating.note)
        : record;
    }, formalRecord);
    saveAssessmentRecords(id, [{ ...completedFormalRecord, status: "completed", updatedAt: now }]);

    const officialPipeline = buildSourceFilePipeline({
      learnerId: id,
      sourceNameAr: "نتائج TTAP الرسمية",
      file: { name: "ttap-results-review-demo.pdf", type: "application/pdf", size: 128000 },
      purpose: "OFFICIAL_ASSESSMENT_RESULTS",
      sourceType: "INSTITUTIONAL_ASSESSMENT",
      statements: [
        "نتائج TTAP الرسمية: التواصل الوظيفي احتياج واضح؛ لا يطلب المتعلم المساعدة من شخص غير مألوف عند تعثر المهمة دون تلقين مباشر.",
        "نتائج TTAP الرسمية: الأداء الوظيفي المستقل مهارة ناشئة؛ يدير المال في موقف تدريبي بسيط مع تذكير لفظي أو بصري.",
        "نتائج TTAP الرسمية: المهارات المهنية نقطة قوة؛ يرتب أدوات التدريب ويكمل خطوات العمل الروتينية عند وجود قائمة بصرية.",
      ],
      outputChannel: "KNOWLEDGE_SUPPORT_ITEM",
    });
    saveSourceFilePipelines(id, [officialPipeline]);
  } catch { /* noop */ }

  try {
    localStorage.setItem(`himam_family_${id}`, JSON.stringify({
      appliedMode: "no",
      selectedLibraryToolId: "FAMILY_VISION_CORE",
      selectedLibraryToolName: "رؤية الأسرة الأساسية",
      method: "مقابلة", sessionDate: now.slice(0, 10), attendees: "الأب، الأم",
      priorities: ["التواصل", "العمل", "الاستقلالية"],
      concernsChecked: ["الاستقرار الوظيفي"], concernsText: "",
      vision5y: "نتمنى أن يعمل في بيئة عمل داعمة وأن يكون قادرًا على طلب المساعدة والتواصل بثقة مع زملائه.",
      quality: "strong", savedAt: now,
    }));
  } catch { /* noop */ }

  try {
    localStorage.setItem(`himam_learner_voice_${id}`, JSON.stringify({
      appliedMode: "no",
      selectedLibraryToolId: "LEARNER_VOICE_CORE",
      selectedLibraryToolName: "صوت المتعلم الأساسي",
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
    let familyRecord = createInformationRecord({ learnerId: id, toolId: "FAMILY_VISION_CORE" });
    familyRecord = updateInformationResponse(familyRecord, "family_future_vision", "تتمنى الأسرة أن يعمل المتعلم في بيئة داعمة وأن يطلب المساعدة بثقة عند مواجهة عائق.");
    familyRecord = updateInformationResponse(familyRecord, "family_top_priorities", ["التواصل", "التعلم والعمل", "العناية الذاتية"]);
    familyRecord = updateInformationResponse(familyRecord, "family_supports", ["صور/جدول بصري", "نمذجة", "تجزئة المهمة"]);
    familyRecord = updateInformationResponse(familyRecord, "family_contexts", ["المركز/المدرسة", "التدريب/العمل", "البيت"]);

    let learnerRecord = createInformationRecord({ learnerId: id, toolId: "LEARNER_VOICE_CORE" });
    learnerRecord = updateInformationResponse(learnerRecord, "learner_likes", "يحب العمل مع زميل مألوف ويحب استخدام الجهاز اللوحي أثناء التدريب.");
    learnerRecord = updateInformationResponse(learnerRecord, "learner_dislikes", "يتجنب طلب المساعدة من أشخاص لا يعرفهم ويصمت عند تعثر المهمة.");
    learnerRecord = updateInformationResponse(learnerRecord, "learner_choice_mode", "كلام");

    let worksiteRecord = createInformationRecord({ learnerId: id, toolId: "MASARAT_COMMUNITY_WORKSITE_SKILLS_EVALUATION" });
    worksiteRecord = updateInformationResponse(worksiteRecord, "worksite_phase_and_setting", "بعد التدريب في نشاط ترتيب أدوات داخل ورشة تدريب مهني.");
    worksiteRecord = updateInformationResponse(worksiteRecord, "worksite_task_domains", ["تنظيم وإرجاع أدوات", "استخدام أجهزة", "سلامة أثناء العمل"]);
    worksiteRecord = updateInformationResponse(worksiteRecord, "worksite_performance_level", ["مهارة ناشئة عالية", "يختلف حسب المهمة"]);
    worksiteRecord = updateInformationResponse(worksiteRecord, "worksite_supports_and_adaptations", ["نمذجة", "خطوات مصورة", "تجزئة مهمة"]);
    worksiteRecord = updateInformationResponse(worksiteRecord, "worksite_classroom_generalization_goals", "يحتاج إلى هدف سنوي يربط طلب المساعدة بسياق العمل والتدريب المنظم.");

    saveInformationRecords(id, [familyRecord, learnerRecord, worksiteRecord]);

    localStorage.setItem(`himam_additional_sources_${id}`, JSON.stringify({
      appliedMode: "no",
      sourceName: "استمارة تقييم مهارات موقع العمل في المجتمع",
      selectedLibraryToolId: "MASARAT_COMMUNITY_WORKSITE_SKILLS_EVALUATION",
      selectedLibraryToolName: "استمارة تقييم مهارات موقع العمل في المجتمع",
      platformInformationRecordId: worksiteRecord.id,
      savedAt: now,
      outputPolicy: "knowledge_support_only",
    }));
  } catch { /* noop */ }

  try {
    localStorage.setItem(`himam_plan_preparation_${id}`, JSON.stringify({
      specialistVision: "تطوير تواصل وظيفي واستقلالية عملية تساعد المتعلم على المشاركة في تدريب مهني آمن ومدعوم.",
      currentLevelRows: [
        {
          domainCode: "FUNCTIONAL_COMMUNICATION",
          domainNameAr: "التواصل الوظيفي",
          strengths: "يستخدم الكلام للتعبير عن اختيارات مألوفة مع أشخاص يعرفهم. يستجيب للتعليمات القصيرة عند وجود نموذج أو تذكير بصري.",
          needs: "لا يطلب المساعدة من شخص غير مألوف عند تعثر المهمة دون تلقين مباشر. يحتاج صيغة طلب ثابتة وتدريباً عبر بيئة التدريب والعمل.",
          sourceSummaryAr: "التقييم الرسمي: TEACCH Transitional Phase Method / TTAP - صوت الأسرة - صوت المتعلم - استمارة موقع العمل",
          evidenceCount: 2,
          supportConditionCount: 2,
          priorityCount: 2,
          goalOpportunityCount: 1,
          proposedByPlatform: true,
        },
        {
          domainCode: "INDEPENDENT_FUNCTIONING",
          domainNameAr: "الأداء الوظيفي المستقل",
          strengths: "يكمل خطوات روتينية قصيرة عند وجود قائمة بصرية ويقبل النمذجة.",
          needs: "إدارة المال ومتابعة المهمة في سياق العمل ما زالت مهارات ناشئة وتحتاج تدريباً متدرجاً.",
          sourceSummaryAr: "التقييم الرسمي: TTAP - استمارة موقع العمل",
          evidenceCount: 1,
          supportConditionCount: 1,
          priorityCount: 1,
          goalOpportunityCount: 1,
          proposedByPlatform: true,
        },
      ],
      savedAt: now,
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
      services: [
        {
          id: crypto.randomUUID(),
          serviceType: "تدريب مباشر",
          serviceName: "دعم التواصل الوظيفي",
          linkedGoals: "هدف طلب المساعدة في بيئة التدريب والعمل",
        },
        {
          id: crypto.randomUUID(),
          serviceType: "تهيئة بيئية",
          serviceName: "خطوات مصورة ونمذجة",
          linkedGoals: "هدف الأداء الوظيفي المستقل",
        },
      ],
      startDate: now.slice(0, 10),
      savedAt: now,
    }));
  } catch { /* noop */ }

  return id;
}
