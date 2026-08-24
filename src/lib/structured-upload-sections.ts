import type { UploadedSourcePurpose } from "@/domain/himam";

export type StructuredUploadSection = {
  id: string;
  labelAr: string;
  placeholderAr: string;
  required: boolean;
};

export type StructuredUploadSectionValues = Record<string, string>;

const SECTION_MAP: Record<string, StructuredUploadSection[]> = {
  LEARNER_VOICE_FORM: [
    {
      id: "learner_preferences",
      labelAr: "ما يفضله المتعلم أو يختاره",
      placeholderAr: "اكتب تفضيلات أو اختيارات واضحة ظهرت في الأداة أو الملف.",
      required: true,
    },
    {
      id: "learner_avoidance_or_needs",
      labelAr: "ما يتجنبه المتعلم أو يحتاج دعماً فيه",
      placeholderAr: "اكتب المواقف أو الأنشطة التي يتجنبها أو يحتاج فيها إلى دعم.",
      required: true,
    },
    {
      id: "learner_expression_mode",
      labelAr: "طريقة التعبير عن الاختيار",
      placeholderAr: "كلام، إشارة، صور، AAC، اقتراب/ابتعاد، أو ملاحظة أخرى.",
      required: true,
    },
    {
      id: "learner_contexts",
      labelAr: "السياقات التي ظهر فيها ذلك",
      placeholderAr: "البيت، المدرسة/المركز، المجتمع، نشاط محدد، أو ظرف دعم محدد.",
      required: true,
    },
  ],
  FAMILY_VISION_FORM: [
    {
      id: "family_vision",
      labelAr: "رؤية الأسرة أو توقعاتها",
      placeholderAr: "اكتب رؤية الأسرة للحياة أو التعلم أو المشاركة خلال الفترة القادمة.",
      required: true,
    },
    {
      id: "family_priorities",
      labelAr: "أولويات الأسرة",
      placeholderAr: "اكتب أهم الأولويات التي ترغب الأسرة في العمل عليها.",
      required: true,
    },
    {
      id: "family_concerns",
      labelAr: "مخاوف الأسرة أو المخاطر",
      placeholderAr: "اكتب المخاوف أو جوانب السلامة أو المشاركة التي تشغل الأسرة.",
      required: true,
    },
    {
      id: "family_supports_contexts",
      labelAr: "الدعم والسياقات الفعالة",
      placeholderAr: "اكتب أنواع الدعم أو البيئات أو الروتينات التي تساعد المتعلم.",
      required: true,
    },
  ],
  ADDITIONAL_INFORMATION_SOURCE: [
    {
      id: "source_purpose",
      labelAr: "غرض المصدر ونوعه",
      placeholderAr: "اكتب لماذا جُمعت هذه المعلومات وما نوع المصدر أو الأداة.",
      required: true,
    },
    {
      id: "descriptive_findings",
      labelAr: "ملاحظات أو نتائج وصفية",
      placeholderAr: "اكتب أهم النتائج الوصفية أو الملاحظات التي ظهرت في المصدر.",
      required: true,
    },
    {
      id: "performance_contexts",
      labelAr: "سياقات الأداء أو التطبيق",
      placeholderAr: "اكتب أين ومتى ومع من ظهرت هذه المعلومات.",
      required: true,
    },
    {
      id: "planning_relevance",
      labelAr: "دلالة المصدر للخطة",
      placeholderAr: "اكتب كيف يدعم هذا المصدر فهم الأداء الحالي أو الأولويات أو الدعم.",
      required: true,
    },
  ],
};

export function getStructuredUploadSections(purpose: UploadedSourcePurpose) {
  return SECTION_MAP[purpose] ?? SECTION_MAP.ADDITIONAL_INFORMATION_SOURCE;
}

export function buildStructuredUploadStatements(
  sections: StructuredUploadSection[],
  values: StructuredUploadSectionValues,
) {
  return sections
    .map((section) => ({
      label: section.labelAr,
      text: (values[section.id] ?? "").trim(),
    }))
    .filter((section) => section.text.length > 0)
    .map((section) => `${section.label}: ${section.text}`);
}

export function missingRequiredStructuredUploadSections(
  sections: StructuredUploadSection[],
  values: StructuredUploadSectionValues,
) {
  return sections.filter((section) => section.required && !(values[section.id] ?? "").trim());
}
