import type { ConceptId } from "@/types/himam";

export type AssessmentToolDomain = {
  code: string;
  nameAr: string;
  linkedConcepts: ConceptId[];
};

export type TransitionCoverageArea =
  | "learner_voice"
  | "self_determination"
  | "interests"
  | "career_inclination"
  | "community_participation"
  | "functional_performance_across_settings"
  | "daily_living"
  | "health_safety"
  | "family_priorities";

export type AssessmentToolDefinition = {
  id: string;
  nameAr: string;
  type:
    | "formal_assessment"
    | "curriculum_based"
    | "institutional_curriculum"
    | "observation"
    | "interview"
    | "custom";
  ageProcessingMode?: "standard" | "developmental_under_9";
  transitionCoverageProfile?: {
    supportsAge14PlusReview: boolean;
    likelyCoverageAreas: TransitionCoverageArea[];
  };
  descriptionAr: string;
  domains: AssessmentToolDomain[];
};

// These entries are source adapters for externally or institutionally applied
// tools. They preserve source structure and mapping intent without reproducing
// proprietary item content or scoring rules.
export const ASSESSMENT_TOOLS: AssessmentToolDefinition[] = [
  {
    id: "TTAP-3",
    nameAr: "TEACCH Transitional Phase Method / TTAP",
    type: "formal_assessment",
    ageProcessingMode: "standard",
    transitionCoverageProfile: {
      supportsAge14PlusReview: true,
      likelyCoverageAreas: [
        "self_determination",
        "community_participation",
        "functional_performance_across_settings",
        "daily_living",
      ],
    },
    descriptionAr:
      "محول مرجعي لنتائج أداة انتقال رسمية مطبقة خارج همم. يحفظ بنية الأداة ومصادرها ولا يعيد إنتاج محتوى بنودها أو درجاتها الملكية.",
    domains: [
      { code: "VOCATIONAL_SKILLS", nameAr: "المهارات المهنية", linkedConcepts: ["ACADEMIC", "LEARNING_TECH"] },
      { code: "VOCATIONAL_BEHAVIORS", nameAr: "السلوكيات المهنية", linkedConcepts: ["SELF_DET", "COMMUNITY"] },
      { code: "INDEPENDENT_FUNCTIONING", nameAr: "الأداء الوظيفي المستقل", linkedConcepts: ["SAFETY", "SELF_CARE", "MOBILITY"] },
      { code: "LEISURE_SKILLS", nameAr: "مهارات الترفيه والمشاركة", linkedConcepts: ["COMMUNITY", "HEALTH", "SOCIAL"] },
      { code: "FUNCTIONAL_COMMUNICATION", nameAr: "التواصل الوظيفي", linkedConcepts: ["COMM", "SOCIAL"] },
      { code: "INTERPERSONAL_BEHAVIOR", nameAr: "السلوك البينشخصي", linkedConcepts: ["SOCIAL", "SAFETY"] },
    ],
  },
  {
    id: "PEP-3",
    nameAr: "PEP-3 Psycho-Educational Profile",
    type: "formal_assessment",
    ageProcessingMode: "developmental_under_9",
    transitionCoverageProfile: {
      supportsAge14PlusReview: true,
      likelyCoverageAreas: ["functional_performance_across_settings", "daily_living", "health_safety"],
    },
    descriptionAr:
      "محول مرجعي لنتائج أداة نفسية-تربوية نمائية. إذا استخدمت مع عمر أقل من 9 سنوات فتعالج كتقييم نمائي يؤثر لاحقاً في ترشيح منهج ودروس مناسبة نمائياً، لا انتقالياً مباشراً.",
    domains: [
      { code: "COMMUNICATION", nameAr: "التواصل", linkedConcepts: ["COMM", "SOCIAL"] },
      { code: "ADAPTIVE", nameAr: "المهارات التكيفية", linkedConcepts: ["SELF_CARE", "HEALTH", "SAFETY"] },
      { code: "MOTOR", nameAr: "المهارات الحركية", linkedConcepts: ["MOBILITY", "SAFETY"] },
      { code: "COGNITIVE", nameAr: "المهارات المعرفية والتعلمية", linkedConcepts: ["ACADEMIC", "LEARNING_TECH"] },
      { code: "BEHAVIORAL", nameAr: "السلوك والمشاركة", linkedConcepts: ["SELF_DET", "SOCIAL", "COMMUNITY"] },
    ],
  },
  {
    id: "PEP-R",
    nameAr: "PEP-R Psycho-Educational Profile Revised",
    type: "formal_assessment",
    ageProcessingMode: "developmental_under_9",
    transitionCoverageProfile: {
      supportsAge14PlusReview: true,
      likelyCoverageAreas: ["functional_performance_across_settings", "daily_living"],
    },
    descriptionAr:
      "محول مرجعي لنتائج أداة نفسية-تربوية نمائية. يحفظ نتيجتها كمصدر رسمي مع مراجعة منفصلة لمدى كفايتها لتغطية معلومات الانتقال عند عمر 14 فأكثر.",
    domains: [
      { code: "COMMUNICATION", nameAr: "التواصل", linkedConcepts: ["COMM", "SOCIAL"] },
      { code: "IMITATION", nameAr: "المحاكاة والتعلم بالملاحظة", linkedConcepts: ["ACADEMIC", "SELF_DET"] },
      { code: "PERCEPTION", nameAr: "الإدراك والمهارات المعرفية", linkedConcepts: ["ACADEMIC", "LEARNING_TECH"] },
      { code: "MOTOR", nameAr: "المهارات الحركية", linkedConcepts: ["MOBILITY", "SAFETY"] },
      { code: "ADAPTIVE", nameAr: "الأداء التكيفي", linkedConcepts: ["SELF_CARE", "HEALTH"] },
    ],
  },
  {
    id: "PORTAGE_PROFILE",
    nameAr: "Portage Profile Test",
    type: "formal_assessment",
    ageProcessingMode: "developmental_under_9",
    transitionCoverageProfile: {
      supportsAge14PlusReview: true,
      likelyCoverageAreas: ["daily_living", "functional_performance_across_settings", "family_priorities"],
    },
    descriptionAr:
      "محول مرجعي لنتائج بورتج كأداة نمائية/تربوية. عند استخدامها مع الأطفال الأصغر سناً تحفظ كمصدر نمائي يمهد للتخطيط التعليمي والأنشطة المبكرة.",
    domains: [
      { code: "SOCIALIZATION", nameAr: "التنشئة الاجتماعية", linkedConcepts: ["SOCIAL", "COMM"] },
      { code: "LANGUAGE", nameAr: "اللغة والتواصل", linkedConcepts: ["COMM", "ACADEMIC"] },
      { code: "SELF_HELP", nameAr: "مساعدة الذات", linkedConcepts: ["SELF_CARE", "HEALTH", "SAFETY"] },
      { code: "COGNITIVE", nameAr: "المهارات المعرفية", linkedConcepts: ["ACADEMIC", "LEARNING_TECH"] },
      { code: "MOTOR", nameAr: "المهارات الحركية", linkedConcepts: ["MOBILITY"] },
    ],
  },
  {
    id: "HIMAM_CURRICULUM_OBSERVATION",
    nameAr: "ملاحظة منهج همم/المؤسسة",
    type: "institutional_curriculum",
    ageProcessingMode: "standard",
    transitionCoverageProfile: {
      supportsAge14PlusReview: true,
      likelyCoverageAreas: ["functional_performance_across_settings", "daily_living", "community_participation"],
    },
    descriptionAr:
      "مصدر مؤسسي مرن لتسجيل أداء المتعلم في درس أو نشاط من المنهج الموازي عندما توجد ملاحظة أداء منظمة.",
    domains: [
      { code: "SAFETY", nameAr: "السلامة الشخصية", linkedConcepts: ["SAFETY"] },
      { code: "SELF_CARE", nameAr: "العناية الذاتية", linkedConcepts: ["SELF_CARE"] },
      { code: "COMMUNICATION", nameAr: "الاتصال الوظيفي", linkedConcepts: ["COMM"] },
      { code: "COMMUNITY", nameAr: "المشاركة المجتمعية", linkedConcepts: ["SELF_DET", "COMMUNITY", "ACADEMIC"] },
    ],
  },
  {
    id: "CUSTOM_INSTITUTION_TOOL",
    nameAr: "أداة مؤسسة مخصصة",
    type: "custom",
    ageProcessingMode: "standard",
    transitionCoverageProfile: {
      supportsAge14PlusReview: true,
      likelyCoverageAreas: [],
    },
    descriptionAr:
      "قالب مرن لأداة تعتمدها المؤسسة. يربط المختص مجالاتها بالمفاهيم الرسمية عند توفر بنية كافية.",
    domains: [
      { code: "CUSTOM-1", nameAr: "مجال مخصص 1", linkedConcepts: ["SAFETY", "SELF_CARE", "COMM"] },
      { code: "CUSTOM-2", nameAr: "مجال مخصص 2", linkedConcepts: ["SELF_DET", "SOCIAL", "COMMUNITY"] },
      { code: "CUSTOM-3", nameAr: "مجال مخصص 3", linkedConcepts: ["HEALTH", "ACADEMIC", "LEARNING_TECH"] },
    ],
  },
  {
    id: "OTHER_OFFICIAL_ASSESSMENT",
    nameAr: "أخرى",
    type: "custom",
    ageProcessingMode: "standard",
    transitionCoverageProfile: {
      supportsAge14PlusReview: true,
      likelyCoverageAreas: [],
    },
    descriptionAr:
      "خيار مؤقت لأداة رسمية تعتمدها المؤسسة ولم تكتمل إضافتها بعد. يتطلب وصف الأداة أو إرفاق نتائجها حتى يمكن تصنيف المعلومات يدوياً أو لاحقاً عبر محول مناسب.",
    domains: [
      { code: "UNSPECIFIED", nameAr: "مجال غير محدد بعد", linkedConcepts: ["SELF_DET", "COMMUNITY", "ACADEMIC"] },
    ],
  },
];

export function getAssessmentToolDefinition(toolId: string) {
  return ASSESSMENT_TOOLS.find((tool) => tool.id === toolId);
}
