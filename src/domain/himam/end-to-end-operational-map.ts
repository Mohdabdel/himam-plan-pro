/**
 * End-to-end operational architecture map for Himam.
 *
 * Purpose:
 * - document the current production path,
 * - identify additive architecture already introduced,
 * - mark post-CVI work,
 * - prevent premature UI or production logic changes.
 *
 * This is a governance artifact, not production routing logic.
 */

export type OperationalStageStatus =
  | "current_stable"
  | "architecture_ready"
  | "post_cvi"
  | "frozen";

export type HimamOperationalStage = {
  stageId: string;
  titleAr: string;
  currentLocation: string[];
  currentRoleAr: string;
  architectureNowAr: string[];
  postCviAr: string[];
  frozenAr: string[];
  status: OperationalStageStatus;
};

export const HIMAM_END_TO_END_OPERATIONAL_MAP: HimamOperationalStage[] = [
  {
    stageId: "learner_profile",
    titleAr: "ملف المتعلم",
    currentLocation: [
      "src/lib/profile-repository.ts",
      "src/domain/himam/types.ts",
      "src/domain/himam/stage2-repositories.ts",
    ],
    currentRoleAr: "حفظ ملف المتعلم والأدلة والمعلومات الداعمة بصورة قابلة للتتبع.",
    architectureNowAr: [
      "الإبقاء على المفاهيم الحالية بوصفها legacy organizing concepts.",
      "السماح بمراجع اختيارية version-aware للكفاءة والمهارة المُمكِّنة وبُعد الأداء.",
      "عدم ترحيل البيانات القديمة إجباريًا.",
    ],
    postCviAr: [
      "إضافة competency profile فعلي عند اعتماد مخطط الكفاءات.",
      "إضافة functional evidence rollup غير قائم على درجة مفهوم واحدة.",
    ],
    frozenAr: [
      "إعادة تصنيف السجلات القديمة تلقائيًا إلى Gate A.",
      "حذف conceptId القديم.",
    ],
    status: "architecture_ready",
  },
  {
    stageId: "information_sources",
    titleAr: "المصادر والتقييم والمعلومات",
    currentLocation: [
      "src/domain/himam/stage3-catalog.ts",
      "src/domain/himam/stage3-materializer.ts",
      "src/domain/himam/transition-assessment-references.ts",
      "src/lib/information-source-review.ts",
    ],
    currentRoleAr: "جمع الأدلة والمعلومات الداعمة مع الفصل بين EvidenceRecord وKnowledgeSupportItem.",
    architectureNowAr: [
      "الإبقاء على provenance وsourceRef وmappingMode.",
      "الإبقاء على صوت المتعلم والأسرة كمعلومات داعمة لا كدليل مستوى آلي.",
    ],
    postCviAr: [
      "إضافة mapping إلى competency refs عندما يكون مبررًا.",
      "إضافة ربط أبعاد الأداء عند وجود دليل مباشر مناسب.",
    ],
    frozenAr: [
      "تحويل كل سؤال أو أداة إلى كفاءة.",
      "اعتبار أداة بعينها مرجعًا حاكمًا بمفردها.",
    ],
    status: "current_stable",
  },
  {
    stageId: "current_performance",
    titleAr: "مستوى الأداء الحالي وتحليل الاحتياج",
    currentLocation: [
      "src/routes/students.$id.iep.tsx",
      "src/lib/mvp-calibration.ts",
    ],
    currentRoleAr: "تجميع مستوى الأداء الحالي والمعلومات ذات الصلة قبل صياغة الأهداف.",
    architectureNowAr: [
      "عدم ربط Gate A بمنطق المستوى الحالي.",
      "تسجيل أن نموذج mvp-calibration legacy ولا يُوسع الآن.",
    ],
    postCviAr: [
      "استبدال الاعتماد على درجة مفهوم واحدة بتجميع أدلة وظيفية أكثر دقة.",
      "فصل الأداء عن التعميم والصيانة واستخدام الدعم.",
    ],
    frozenAr: [
      "أي تعديل عددي في calibration بناء على Gate A أو PD01-PD04 قبل CVI.",
    ],
    status: "frozen",
  },
  {
    stageId: "individual_goals",
    titleAr: "الأهداف الفردية",
    currentLocation: [
      "src/routes/students.$id.iep.goals.tsx",
      "src/components/goal-quality-checklist.tsx",
      "src/components/goal-reference-panel.tsx",
    ],
    currentRoleAr: "إنشاء ومراجعة أهداف فردية مرتبطة بالاحتياج والأدلة.",
    architectureNowAr: [
      "الإبقاء على الهدف الفردي قبل طبقة التطبيق المنهجي.",
      "إتاحة ربط مستقبلي اختياري بكفاءة أو مهارة مُمكِّنة دون فرضه الآن.",
    ],
    postCviAr: [
      "ربط الهدف بمهارة مُمكِّنة وكفاءة عند وجود mapping معتمد.",
      "السماح لهدف واحد بالارتباط بأكثر من كفاءة عند الحاجة.",
    ],
    frozenAr: [
      "توليد أهداف مباشرة من Gate A.",
      "اعتبار كل كفاءة هدف IEP إلزاميًا.",
    ],
    status: "architecture_ready",
  },
  {
    stageId: "competency_bridge",
    titleAr: "جسر الهدف إلى الكفاءة",
    currentLocation: [
      "src/domain/himam/transition-architecture.ts",
      "src/domain/himam/pre-cvi-crosswalk.ts",
      "src/domain/himam/current-matrix-gatea-crosswalk.ts",
      "src/data/competency-matrix.ts",
    ],
    currentRoleAr: "طبقة تحليلية جديدة لفصل المفهوم عن الكفاءة والمهارة المُمكِّنة.",
    architectureNowAr: [
      "Gate A مسجل كـ pre_cvi ومجمد عن الإنتاج.",
      "Crosswalk المفاهيم والكفاءات الحالية موجود كعلاقات provisional فقط.",
      "المصفوفة الحالية تبقى دون تعديل.",
    ],
    postCviAr: [
      "ترقية العلاقات المقبولة إلى validated.",
      "تحديد ما يحتفظ به أو يدمج أو يتقاعد بعد قرار Gate Pass.",
    ],
    frozenAr: [
      "استبدال competency-matrix.ts بـGate A.",
      "إعادة تسمية العائلات الحالية تلقائيًا.",
    ],
    status: "architecture_ready",
  },
  {
    stageId: "functional_curriculum",
    titleAr: "المنهج الوظيفي والتطبيق",
    currentLocation: [
      "src/lib/curriculum-recommendations.ts",
      "src/routes/students.$id.plan.tsx",
    ],
    currentRoleAr: "ترشيح أنشطة للهدف وربطها بالمفهوم والكفاءة الحالية.",
    architectureNowAr: [
      "توثيق أن المنهج طبقة تطبيق ودمج وظيفي لا بديل عن الهدف الفردي.",
      "عدم تغيير محرك الترشيح الحالي قبل اكتمال البنية العلمية.",
    ],
    postCviAr: [
      "الانتقال من مطابقة كلمات الهدف إلى mapping منظم: Goal → Enabling Skill → Competency → Functional Scenario.",
      "السماح للوحدة الوظيفية بدمج عدة أهداف ومهارات.",
    ],
    frozenAr: [
      "استخدام Gate A مباشرة لتعيين وحدات أو أنشطة.",
      "تغيير plan.tsx الآن.",
    ],
    status: "post_cvi",
  },
  {
    stageId: "implementation_evidence",
    titleAr: "التنفيذ والشواهد",
    currentLocation: [
      "src/routes/students.$id.implementation.tsx",
      "src/domain/himam/performance-dimension-implementation-analysis.ts",
    ],
    currentRoleAr: "تسجيل النشاط والسياق والدعم والأداء ونوع الشاهد.",
    architectureNowAr: [
      "تحليل PD01-PD04 موثق دون تعديل واجهة التنفيذ.",
      "الحفاظ على TrainingSession storage الحالي.",
    ],
    postCviAr: [
      "فصل skill performance عن PD01 generalization.",
      "إضافة maintenance probes لـPD02.",
      "توسيع support model لـPD03.",
      "إضافة safety-demand evidence سياقي لـPD04.",
    ],
    frozenAr: [
      "إضافة حقول PD إلى الواجهة الآن.",
      "تحويل generalized إلى معيار تحقق نهائي عام.",
    ],
    status: "post_cvi",
  },
  {
    stageId: "review_replanning",
    titleAr: "المراجعة وإعادة التخطيط",
    currentLocation: [
      "src/lib/journey.ts",
      "src/domain/himam/validators.ts",
    ],
    currentRoleAr: "استمرار الرحلة من التنفيذ إلى التقرير والمراجعة البشرية.",
    architectureNowAr: [
      "منع pre-CVI mappings من التحول إلى validated.",
      "منع استخدامها في learner scoring أو goal generation أو curriculum assignment.",
    ],
    postCviAr: [
      "إدخال evidence-to-planning loop مع human approval.",
      "إنشاء planning implications مثل generalize/maintain/increase independence/collect evidence.",
    ],
    frozenAr: [
      "أي تحديث تلقائي حاسم لملف المتعلم من استنتاج غير معتمد.",
    ],
    status: "architecture_ready",
  },
  {
    stageId: "report",
    titleAr: "التقرير",
    currentLocation: [
      "src/routes/students.$id.report.tsx",
    ],
    currentRoleAr: "تجميع الخطة والتنفيذ والنتائج في تقرير نهائي.",
    architectureNowAr: [
      "عدم تغيير التقرير في هذه المرحلة.",
    ],
    postCviAr: [
      "عرض الكفاءة المرتبطة عند اعتمادها.",
      "عرض PD01-PD04 بصورة وصفية مستقلة عن مستوى الإتقان.",
      "إظهار نوع الدعم والسياق والدليل الوظيفي.",
    ],
    frozenAr: [
      "إظهار readiness score مشتق من Gate A قبل التحقق.",
      "إظهار أي تصنيف validated قبل اعتماد CVI.",
    ],
    status: "post_cvi",
  },
];

export const HIMAM_OPERATIONAL_ARCHITECTURE_GOVERNANCE = {
  mainBranchUntouchedByThisMap: true,
  uiChangesAuthorized: false,
  productionLogicChangesAuthorized: false,
  gateAProductionUseAuthorized: false,
  currentJourneyPreserved: true,
  nextImplementationTarget: "post_cvi_contracts_only",
} as const;

export function getOperationalStage(stageId: string) {
  return HIMAM_END_TO_END_OPERATIONAL_MAP.find((stage) => stage.stageId === stageId) ?? null;
}
