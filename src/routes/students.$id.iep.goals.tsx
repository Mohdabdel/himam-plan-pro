import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { advanceStage } from "../lib/journey";
import { getItemsByDomain, type TTAPDomain } from "../data/ttap-items";
import { getConceptNameAr } from "@/data/concepts";
import { GoalQualityChecklist } from "@/components/goal-quality-checklist";
import {
  computeGoalQuality,
  evaluateGoalPlanQuality,
  hasHardStopViolation,
  type GoalOverride,
  type GoalPlanQualityRubricResult,
} from "@/lib/goal-quality";
import { GoalReferencePanel } from "@/components/goal-reference-panel";
import { loadAssessmentRecords } from "@/lib/assessment-records";
import {
  appendApprovalAuditEvent,
  buildApprovalAuditEvent,
  buildGoalApprovalBundles,
  planApprovalKey,
  planGovernanceKey,
  saveGoalApprovalBundles,
} from "@/lib/goal-plan-approval";
import {
  buildInformationProcessingProfile,
  buildKnowledgeSupportItems,
  loadInformationRecords,
} from "@/lib/information-records";
import { buildProcessedCurrentLevelRows } from "@/lib/current-level-draft";
import {
  buildBoundedGoalAiSuggestions,
  type GoalAiLayerPolicy,
} from "@/lib/goal-ai-layer";
import type {
  GoalReadiness,
  GoalOpportunityCard,
  GoalProposal,
} from "@/lib/goal-opportunity-engine";
import { buildLearnerProfileProcessingModel } from "@/lib/learner-profile-processing";
import {
  loadSourceFilePipelines,
  summarizeSourceFilePipeline,
  type SourceFilePipelineRecord,
} from "@/lib/source-file-pipeline";
import type {
  AssessmentRecord,
  InformationProcessingProfile,
  KnowledgeSupportItem,
  LearnerProfileProcessingModel,
  ProfileComponentElement,
} from "@/types/himam";

export const Route = createFileRoute("/students/$id/iep/goals")({
  component: IEPPage,
  head: () => ({
    meta: [
      { title: "الخطة التربوية الفردية — همم" },
      { name: "description", content: "إدخال الخطة التربوية الفردية للمستفيد." },
    ],
  }),
});

type StoredStudent = {
  id: string;
  name: string;
  birthDate: string;
  center: string;
  tool: string;
  createdAt: string;
  status: string;
};

type DomainCode = string;
type GoalCategory = "أكاديمي" | "وظيفي" | "اجتماعي" | "عملي";
type Goal = {
  id: string;
  text: string;
  category: GoalCategory | "";
  // Quality-checklist fields (additive — optional so existing saved goals
  // without them still load fine).
  context?: string;
  criterion?: string;
  measurementMethod?: string;
  evidenceRef?: string;
  goalTrigger?: string;
  performanceAnchor?: string;
  lifePractice?: string;
  override?: GoalOverride;
  aiSuggestion?: {
    layerName: string;
    proposalId: string;
    opportunityId: string;
    variant: string;
    readiness: string;
    whyAr: string;
    limitationAr: string;
    addedAt: string;
  };
};
type SupportServiceDraft = {
  id: string;
  serviceType: string;
  serviceName: string;
  linkedGoals: string;
};

type BaselineCandidate = {
  id: string;
  label: string;
  source: "assessment_record" | "current_level" | "ttap_item";
};

// Same context vocabulary already used in plan.tsx, for consistency.
const GOAL_CONTEXTS = ["البيت", "المركز / المدرسة", "المجتمع (المسجد، دار الحي، الحديقة)", "مجلس العائلة"];
const MEASUREMENT_METHODS = ["ملاحظة مباشرة", "سجل تكراري", "عيّنة عمل", "تقرير الأسرة"];
const OVERRIDE_REASONS = [
  "تقييم ميداني حديث يدعم القرار",
  "ملاحظة أسرة موثوقة تبرر الاستثناء",
  "قيد زمني في الجلسة الحالية",
  "توجيه إشرافي أو فريق متعدد التخصصات",
  "سبب آخر",
];

type FamilyData = {
  priorities?: string[];
  vision5y?: string;
  toolCategory?: string;
  selectedLibraryToolName?: string;
  appliedToolName?: string;
};
type LearnerVoiceData = { q_love?: string; q_good?: string; selectedLibraryToolName?: string; appliedToolName?: string };
type CoverageData = { filledDomains?: string[]; failedDomains?: string[]; emergingDomains?: string[]; completionPercent?: number };
type AssessmentDomainEntry = { score: string; note?: string };
type GoalSourceId =
  | "assessment"
  | "family_priorities"
  | "family_voice"
  | "learner_voice"
  | "additional_sources"
  | "processed_information_profile"
  | "reviewed_file_sources";
type BaselineSourceId =
  | "formal_assessment"
  | "informal_assessment"
  | "reviewed_file_sources";
type GuidanceMode = "guided" | "direct";

type GoalBuilderState = {
  domainCode: DomainCode | "";
  sourceId: GoalSourceId | "";
  baselineSourceId: BaselineSourceId | "";
  performanceAnchor: string;
  selectedItemIds: string[];
  mode: GuidanceMode | "";
  finalSkill: string;
  generalOutcome: string;
  currentIndependence: string;
  nextMasteryStep: string;
  directGoalText: string;
  condition: string;
  details: string;
  criterion: string;
  measurementMethod: string;
};

const EMPTY_GOAL_BUILDER: GoalBuilderState = {
  domainCode: "",
  sourceId: "",
  baselineSourceId: "",
  performanceAnchor: "",
  selectedItemIds: [],
  mode: "",
  finalSkill: "",
  generalOutcome: "",
  currentIndependence: "",
  nextMasteryStep: "",
  directGoalText: "",
  condition: "",
  details: "",
  criterion: "",
  measurementMethod: "",
};

// Priority order for "first missing hard-stop field" — matches the order
// the fields appear when jumping a specialist to the problem.
type MissingField = "criterion" | "measurementMethod" | "evidenceRef" | null;
function firstMissingField(g: Goal): MissingField {
  if (!g.criterion?.trim()) return "criterion";
  if (!g.measurementMethod?.trim()) return "measurementMethod";
  if (!g.evidenceRef?.trim() && !g.performanceAnchor?.trim()) return "evidenceRef";
  return null;
}

const TTAP_DOMAINS: { code: DomainCode; name: string }[] = [
  { code: "VS", name: "المهارات المهنية" },
  { code: "VB", name: "السلوكيات المهنية" },
  { code: "IF", name: "الأداء الوظيفي المستقل" },
  { code: "LS", name: "مهارات الترفيه" },
  { code: "FC", name: "التواصل الوظيفي" },
  { code: "IB", name: "السلوك البينشخصي" },
];

const GENERIC_DOMAINS: { code: DomainCode; name: string }[] = [
  { code: "COG", name: "المهارات المعرفية" },
  { code: "COM", name: "التواصل واللغة" },
  { code: "SOC", name: "المهارات الاجتماعية" },
  { code: "ADL", name: "مهارات الحياة اليومية" },
  { code: "VOC", name: "التأهيل المهني" },
  { code: "MOT", name: "المهارات الحركية" },
];

const CATEGORIES: GoalCategory[] = ["أكاديمي", "وظيفي", "اجتماعي", "عملي"];

function normalizeSupportServices(value: unknown): SupportServiceDraft[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item, index) => {
    if (typeof item === "string") {
      const serviceName = item.trim();
      return serviceName
        ? [{ id: `legacy-service-${index}`, serviceType: "", serviceName, linkedGoals: "" }]
        : [];
    }
    if (item && typeof item === "object") {
      const record = item as Partial<SupportServiceDraft>;
      const serviceName = record.serviceName?.trim() ?? "";
      const serviceType = record.serviceType?.trim() ?? "";
      const linkedGoals = record.linkedGoals?.trim() ?? "";
      if (!serviceName && !serviceType && !linkedGoals) return [];
      return [{
        id: record.id || `service-${index}-${serviceName || serviceType || linkedGoals}`,
        serviceType,
        serviceName,
        linkedGoals,
      }];
    }
    return [];
  });
}

const TEAL = "#0F3D3E";
const ORANGE = "#D9764A";

const GUIDANCE_QUESTIONS = [
  {
    key: "finalSkill",
    question: "ما هي المهارة أو السلوك النهائي الذي يحتاج الطالب إلى تحقيقه؟",
    helper: "اكتب السلوك القابل للملاحظة لا الفكرة العامة.",
  },
  {
    key: "generalOutcome",
    question: "ما هو الهدف العام الذي تود الوصول له أو تحقيقه من خلال التدريب على هذه المهارة؟",
    helper: "اربط المهارة بأثر وظيفي أو حياتي واضح.",
  },
  {
    key: "currentIndependence",
    question: "في أي مرحلة أداء مستقل يعتبر الطالب فيها في سبيل وصوله للهدف العام؟",
    helper: "صف ما يستطيع أداءه حالياً وما يحتاج فيه إلى دعم.",
  },
  {
    key: "nextMasteryStep",
    question: "ما هي الخطوة التي سيستهدفها الهدف هذا العام كنقطة إتقان تالية؟",
    helper: "هذه الإجابة ستكون نواة السلوك الملحوظ في مسودة الهدف.",
  },
] as const;

const VAGUE_GOAL_WORDS = ["يفهم", "يعرف", "يقدر", "يحسن", "يتحسن", "يدرك", "يتعلم"];

const BASELINE_SOURCES: Array<{ id: BaselineSourceId; label: string; note: string }> = [
  {
    id: "formal_assessment",
    label: "أداة تقييم رسمية",
    note: "الأولوية الأولى عندما تتوفر نتائج أداة رسمية مفسرة وبنودها صالحة كخط قاعدي.",
  },
  {
    id: "informal_assessment",
    label: "أداة أو قائمة مسح غير رسمية",
    note: "تستخدم عندما يكون مستوى الأداء موثقاً من تطبيق أداة وصفية أو قائمة مسح.",
  },
  {
    id: "reviewed_file_sources",
    label: "ملف أو نموذج مرفوع ومراجع",
    note: "تستخدم عندما يصل الخط القاعدي من ملف مرفوع جرى تصنيفه ومراجعته.",
  },
];

function emptyGoalMap(domains: { code: DomainCode }[]): Record<string, Goal[]> {
  return Object.fromEntries(domains.map((d): [string, Goal[]] => [d.code, []]));
}
function emptyOpenMap(domains: { code: DomainCode }[]): Record<string, boolean> {
  return Object.fromEntries(domains.map((d) => [d.code, false]));
}

function sourceLabel(sourceId: GoalSourceId) {
  if (sourceId === "assessment") return "أداة التقييم المطبقة";
  if (sourceId === "family_priorities") return "أولويات الأسرة";
  if (sourceId === "family_voice") return "صوت الأسرة";
  if (sourceId === "learner_voice") return "صوت المتعلم";
  if (sourceId === "processed_information_profile") return "إشارات بروفايل من أدوات المعلومات";
  if (sourceId === "reviewed_file_sources") return "مصادر مرفوعة ومراجعة";
  return "أدوات ومصادر إضافية";
}

function baselineSourceLabel(sourceId: BaselineSourceId | "") {
  return BASELINE_SOURCES.find((source) => source.id === sourceId)?.label ?? "غير محدد";
}

function buildGoalSources(input: {
  assessmentRecords: AssessmentRecord[];
  family: FamilyData | null;
  learnerVoice: LearnerVoiceData | null;
  additionalSources: unknown;
  informationProcessing: InformationProcessingProfile;
  profileProcessing: LearnerProfileProcessingModel;
  sourcePipelines: SourceFilePipelineRecord[];
}) {
  const sources: Array<{ id: GoalSourceId; label: string; note: string }> = [];

  if (input.assessmentRecords.length > 0) {
    sources.push({
      id: "assessment",
      label: "أداة التقييم المطبقة",
      note: input.assessmentRecords.map((record) => record.toolNameAr).join("، "),
    });
  }

  if (input.family) {
    const category = input.family.toolCategory ?? "";
    const toolName = input.family.selectedLibraryToolName ?? input.family.appliedToolName ?? "صوت الأسرة";
    if (category.includes("أولويات") || toolName.includes("بوصلة") || input.family.priorities?.length) {
      sources.push({
        id: "family_priorities",
        label: "أولويات الأسرة",
        note: toolName,
      });
    }
    sources.push({
      id: "family_voice",
      label: "صوت الأسرة",
      note: toolName,
    });
  }

  if (input.learnerVoice) {
    sources.push({
      id: "learner_voice",
      label: "صوت المتعلم",
      note: input.learnerVoice.selectedLibraryToolName ?? input.learnerVoice.appliedToolName ?? "مصدر داعم مكتمل",
    });
  }

  if (input.additionalSources) {
    sources.push({
      id: "additional_sources",
      label: "أدوات ومصادر إضافية",
      note: "مصدر داعم محفوظ",
    });
  }

  if (input.profileProcessing.topGoalOpportunities.length > 0) {
    sources.push({
      id: "processed_information_profile",
      label: "إشارات بروفايل من أدوات المعلومات",
      note: `${input.profileProcessing.topGoalOpportunities.length} فرصة هدف مستخرجة من مصفوفة مكونات البروفايل. صحة الهدف: ${input.profileProcessing.componentMatrix.goalValidityReady ? "قابلة للمراجعة" : "تحتاج استكمال مكونات حرجة"}.`,
    });
  }

  const reviewedPipelines = input.sourcePipelines.filter((pipeline) => (
    pipeline.review?.decision === "approved_for_structured_response" &&
    pipeline.structuredResponses.length > 0
  ));
  if (reviewedPipelines.length > 0) {
    sources.push({
      id: "reviewed_file_sources",
      label: "مصادر مرفوعة ومراجعة",
      note: reviewedPipelines.map((pipeline) => pipeline.sourceNameAr).join("، "),
    });
  }

  return sources;
}

function ratingLabel(rating?: string) {
  if (rating === "pass") return "ناجح/قوة";
  if (rating === "emerge") return "مهارة ناشئة";
  if (rating === "fail") return "احتياج واضح";
  if (rating === "not_observed") return "غير ملاحظ";
  return "غير محدد";
}

function buildBaselineCandidates(input: {
  domainCode: string;
  assessmentRecords: AssessmentRecord[];
  currentLevelRow?: ReturnType<typeof buildProcessedCurrentLevelRows>[number];
}): BaselineCandidate[] {
  if (!input.domainCode) return [];
  const candidates: BaselineCandidate[] = [];

  input.assessmentRecords.forEach((record) => {
    record.domains
      .filter((domain) => (
        domain.domainCode === input.domainCode ||
        domain.domainNameAr === input.domainCode ||
        domain.domainNameAr === input.currentLevelRow?.domainNameAr
      ))
      .forEach((domain) => {
        candidates.push({
          id: `assessment-record:${record.id}:${domain.domainCode}`,
          source: "assessment_record",
          label: [
            record.toolNameAr,
            domain.domainNameAr,
            ratingLabel(domain.rating),
            domain.note,
          ].filter(Boolean).join(" - "),
        });
      });
  });

  if (input.currentLevelRow?.needs || input.currentLevelRow?.strengths) {
    candidates.push({
      id: `current-level:${input.currentLevelRow.domainCode}`,
      source: "current_level",
      label: [
        `مسودة مستوى الأداء الحالي: ${input.currentLevelRow.domainNameAr || input.currentLevelRow.domainCode}`,
        input.currentLevelRow.needs ? `احتياج: ${input.currentLevelRow.needs}` : "",
        input.currentLevelRow.strengths ? `قوة: ${input.currentLevelRow.strengths}` : "",
      ].filter(Boolean).join(" - "),
    });
  }

  if (TTAP_DOMAINS.some((domain) => domain.code === input.domainCode)) {
    getItemsByDomain(input.domainCode as TTAPDomain).forEach((item) => {
      candidates.push({
        id: `ttap-item:${item.id}`,
        source: "ttap_item",
        label: `بند TTAP ${item.id} - ${item.name}`,
      });
    });
  }

  return candidates;
}

function hasVagueLanguage(text: string) {
  return VAGUE_GOAL_WORDS.find((word) => text.includes(word));
}

function ageYearsFromBirthDate(birthDate?: string) {
  if (!birthDate) return null;
  const birth = new Date(birthDate);
  if (Number.isNaN(birth.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const monthDelta = now.getMonth() - birth.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && now.getDate() < birth.getDate())) age -= 1;
  return age;
}

function performanceAnchorFromBuilder(builder: GoalBuilderState, selectedItems: string[]) {
  const source = baselineSourceLabel(builder.baselineSourceId);
  if (builder.performanceAnchor.trim()) return `${source}: ${builder.performanceAnchor.trim()}`;
  if (builder.baselineSourceId === "formal_assessment" && selectedItems.length > 0) {
    return `${source}: ${selectedItems.join("، ")}`;
  }
  return "";
}

function buildGoalDraft(input: {
  studentName: string;
  startDate: string;
  builder: GoalBuilderState;
  selectedItems: string[];
}) {
  const { studentName, startDate, builder, selectedItems } = input;
  const behavior = builder.mode === "direct"
    ? builder.directGoalText.trim()
    : (builder.nextMasteryStep.trim() || builder.finalSkill.trim());
  const condition = builder.condition.trim() || (
    selectedItems.length > 0
      ? `بالنظر إلى مواد أو دعم مرتبط بـ ${selectedItems.join("، ")}`
      : "بالنظر إلى مواد ودعم مناسبين"
  );
  const details = builder.details.trim() || builder.generalOutcome.trim();
  const criterion = builder.criterion.trim() || "وفق معيار أداء يحدده المختص قبل الحفظ";
  const measurement = builder.measurementMethod.trim() || "ملاحظة مباشرة أو سجل بيانات مناسب لطبيعة السلوك";
  const datePart = startDate ? `بحلول ${startDate}` : "بحلول نهاية مدة الخطة";
  const text = `${datePart}، ${condition}، سيقوم ${studentName || "الطالب"} بـ${behavior || "[السلوك المستهدف]"}${details ? `، وذلك في سياق ${details}` : ""}، بمستوى أداء ${criterion}، ويقاس التقدم من خلال ${measurement}.`;

  return {
    text,
    elements: [
      ["الطالب + الإطار الزمني", `${datePart} - ${studentName || "الطالب"}`],
      ["بيان المعطيات/الشرط", condition],
      ["باعث الهدف", builder.sourceId ? sourceLabel(builder.sourceId as GoalSourceId) : "غير محدد"],
      ["مرجعية الخط القاعدي", baselineSourceLabel(builder.baselineSourceId)],
      ["مرتكز الأداء / الخط القاعدي", performanceAnchorFromBuilder(builder, selectedItems) || "غير محدد"],
      ["سلوك ملحوظ", behavior || "غير مكتمل بعد"],
      ["توضيح التفاصيل", details || "غير محدد"],
      ["مستوى/معيار الأداء", criterion],
      ["أسلوب القياس التقييمي", measurement],
    ] as Array<[string, string]>,
  };
}

function IEPPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [loaded, setLoaded] = useState(false);
  const [student, setStudent] = useState<StoredStudent | null>(null);
  const [vision, setVision] = useState("");

  const domains = student?.tool?.includes("TTAP") ? TTAP_DOMAINS : GENERIC_DOMAINS;

  const [goals, setGoals] = useState<Record<string, Goal[]>>(emptyGoalMap(TTAP_DOMAINS));
  const [open, setOpen] = useState<Record<string, boolean>>(emptyOpenMap(TTAP_DOMAINS));
  const [services, setServices] = useState<SupportServiceDraft[]>([]);
  const [serviceDraft, setServiceDraft] = useState({ serviceType: "", serviceName: "", linkedGoals: "" });
  const [startDate, setStartDate] = useState("");
  const [expandedGoals, setExpandedGoals] = useState<Set<string>>(new Set());

  // Upstream journey data the quality checklist and reference panel read
  // from — additive, read-only here (each is already collected on its own
  // dedicated page).
  const [family, setFamily] = useState<FamilyData | null>(null);
  const [learnerVoice, setLearnerVoice] = useState<LearnerVoiceData | null>(null);
  const [coverage, setCoverage] = useState<CoverageData | null>(null);
  const [assessmentDomains, setAssessmentDomains] = useState<Record<string, AssessmentDomainEntry> | null>(null);
  const [assessmentRecords, setAssessmentRecords] = useState<AssessmentRecord[]>([]);
  const [additionalSources, setAdditionalSources] = useState<unknown>(null);
  const [knowledgeSupport, setKnowledgeSupport] = useState<KnowledgeSupportItem[]>([]);
  const [informationProcessing, setInformationProcessing] = useState<InformationProcessingProfile>(
    () => buildInformationProcessingProfile([]),
  );
  const [profileProcessing, setProfileProcessing] = useState<LearnerProfileProcessingModel>(
    () => buildLearnerProfileProcessingModel({ learnerId: id, informationRecords: [], sourcePipelines: [] }),
  );
  const [sourcePipelines, setSourcePipelines] = useState<SourceFilePipelineRecord[]>([]);
  const [goalBuilder, setGoalBuilder] = useState<GoalBuilderState>(EMPTY_GOAL_BUILDER);
  const [builderMessage, setBuilderMessage] = useState("");
  const [knowledgeSupportOpen, setKnowledgeSupportOpen] = useState(false);
  const [builderQualityOpen, setBuilderQualityOpen] = useState(false);
  const [sourceDetailsOpen, setSourceDetailsOpen] = useState(false);
  const [processingDetailsOpen, setProcessingDetailsOpen] = useState(false);
  const [profileDetailsOpen, setProfileDetailsOpen] = useState(false);
  const [draftBlockerDetailsOpen, setDraftBlockerDetailsOpen] = useState(false);

  // Draft state for the "professional override" mini-form, keyed by goal id.
  const [overrideFormFor, setOverrideFormFor] = useState<string | null>(null);
  const [overrideDraft, setOverrideDraft] = useState<Record<string, { reason: string; note: string }>>({});

  // Set when a hard-stop blocks submission — once the domain/goal
  // panels it triggers have rendered, this effect scrolls to and focuses
  // the first unresolved field so the specialist doesn't have to hunt for it.
  const [scrollTarget, setScrollTarget] = useState<{ goalId: string; field: MissingField } | null>(null);

  useEffect(() => {
    if (!scrollTarget) return;
    const cardEl = document.getElementById(`goal-card-${scrollTarget.goalId}`);
    cardEl?.scrollIntoView({ behavior: "smooth", block: "center" });
    if (scrollTarget.field) {
      const fieldEl = document.getElementById(`goal-field-${scrollTarget.field}-${scrollTarget.goalId}`);
      fieldEl?.focus();
    }
    setScrollTarget(null);
  }, [scrollTarget]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("himam_students");
      if (raw) {
        const list: StoredStudent[] = JSON.parse(raw);
        setStudent(list.find((s) => s.id === id) ?? null);
      }
      const iepRaw = localStorage.getItem(`himam_iep_${id}`);
      if (iepRaw) {
        const data = JSON.parse(iepRaw);
        const found = raw ? (JSON.parse(raw) as StoredStudent[]).find((s) => s.id === id) : null;
        const activeDomains = found?.tool?.includes("TTAP") ? TTAP_DOMAINS : GENERIC_DOMAINS;
        if (data.vision) setVision(data.vision);
        if (data.goals) setGoals({ ...emptyGoalMap(activeDomains), ...data.goals });
        if (data.services) setServices(normalizeSupportServices(data.services));
        if (data.startDate) setStartDate(data.startDate);
      }
    } catch (error) {
      console.warn("Unable to load IEP draft", error);
    }

    try { setFamily(JSON.parse(localStorage.getItem(`himam_family_${id}`) || "null")); } catch { /* noop */ }
    try { setLearnerVoice(JSON.parse(localStorage.getItem(`himam_learner_voice_${id}`) || "null")); } catch { /* noop */ }
    try { setCoverage(JSON.parse(localStorage.getItem(`himam_coverage_${id}`) || "null")); } catch { /* noop */ }
    try { setAdditionalSources(JSON.parse(localStorage.getItem(`himam_additional_sources_${id}`) || "null")); } catch { /* noop */ }
    setAssessmentRecords(loadAssessmentRecords(id));
    setSourcePipelines(loadSourceFilePipelines(id));
    try {
      const assessRaw = JSON.parse(localStorage.getItem(`himam_assessment_${id}`) || "null");
      if (assessRaw?.domains && Array.isArray(assessRaw.domains)) {
        const byCode: Record<string, AssessmentDomainEntry> = {};
        for (const d of assessRaw.domains as Array<{ code: string; score: string; note?: string }>) {
          byCode[d.code] = { score: d.score, note: d.note };
        }
        setAssessmentDomains(byCode);
      }
    } catch { /* noop */ }
    const informationRecords = loadInformationRecords(id);
    setKnowledgeSupport(buildKnowledgeSupportItems(informationRecords));
    setInformationProcessing(buildInformationProcessingProfile(informationRecords));
    setProfileProcessing(buildLearnerProfileProcessingModel({
      learnerId: id,
      informationRecords,
      sourcePipelines: loadSourceFilePipelines(id),
    }));

    setLoaded(true);
  }, [id]);

  const goalSources = buildGoalSources({
    assessmentRecords,
    family,
    learnerVoice,
    additionalSources,
    informationProcessing,
    profileProcessing,
    sourcePipelines,
  });
  const currentLevelRows = buildProcessedCurrentLevelRows({
    assessmentRecords,
    profileProcessing,
  });
  const currentLevelDomainOptions = currentLevelRows
    .map((row) => ({
      code: row.domainCode,
      name: row.domainNameAr || row.domainCode,
    }))
    .filter((domain) => domain.name.trim());
  const goalDomainOptions = currentLevelDomainOptions.length > 0 ? currentLevelDomainOptions : domains;
  const selectedGoalDomain = goalDomainOptions.find((domain) => domain.code === goalBuilder.domainCode);
  const selectedCurrentLevelRow = currentLevelRows.find((row) => (
    row.domainCode === goalBuilder.domainCode || row.domainNameAr === goalBuilder.domainCode
  ));
  const baselineCandidates = goalBuilder.baselineSourceId === "formal_assessment"
    ? buildBaselineCandidates({
        domainCode: goalBuilder.domainCode,
        assessmentRecords,
        currentLevelRow: selectedCurrentLevelRow,
      })
    : [];
  const selectedBaselineLabels = baselineCandidates
    .filter((item) => goalBuilder.selectedItemIds.includes(item.id))
    .map((item) => item.label);
  const selectedPerformanceAnchor = performanceAnchorFromBuilder(goalBuilder, selectedBaselineLabels);
  const selectedGoalTrigger = goalBuilder.sourceId ? sourceLabel(goalBuilder.sourceId as GoalSourceId) : "";
  const learnerAgeYears = ageYearsFromBirthDate(student?.birthDate);
  const goalAiSuggestions = buildBoundedGoalAiSuggestions({
    currentLevelRows,
    assessmentRecords,
    profileProcessing,
    planVisionAr: vision,
    familyVisionAr: family?.vision5y,
    familyPrioritiesAr: family?.priorities,
    learnerVoiceAr: [learnerVoice?.q_love, learnerVoice?.q_good].filter(Boolean).join("، "),
    ageYears: learnerAgeYears,
    selectedDomainCode: goalBuilder.domainCode,
    selectedDomainNameAr: selectedGoalDomain?.name,
    studentNameAr: student?.name,
    maxVisibleProposals: 3,
  });
  const goalOpportunityCards = goalAiSuggestions.opportunities;
  const selectedGoalProposals = goalAiSuggestions.proposals;
  const generatedGoalDraft = buildGoalDraft({
    studentName: student?.name ?? "الطالب",
    startDate,
    builder: goalBuilder,
    selectedItems: selectedBaselineLabels,
  });
  const builderRubric = evaluateGoalPlanQuality({
    goalText: generatedGoalDraft.text,
    goalTrigger: selectedGoalTrigger,
    performanceAnchor: selectedPerformanceAnchor,
    context: goalBuilder.condition,
    criterion: goalBuilder.criterion,
    measurementMethod: goalBuilder.measurementMethod,
    evidenceRef: selectedPerformanceAnchor,
    lifePractice: goalBuilder.generalOutcome,
    domainCode: goalBuilder.domainCode || "",
    coverage,
    family,
    learnerVoice,
    override: null,
    learnerAgeYears,
    profileProcessing,
  });
  const vagueWord = hasVagueLanguage(generatedGoalDraft.text);

  function updateGoalBuilder<K extends keyof GoalBuilderState>(field: K, value: GoalBuilderState[K]) {
    setBuilderMessage("");
    setGoalBuilder((current) => {
      const next = { ...current, [field]: value };
      if (field === "domainCode") {
        next.selectedItemIds = [];
        next.performanceAnchor = "";
      }
      if (field === "baselineSourceId") {
        next.selectedItemIds = [];
        next.performanceAnchor = "";
      }
      return next;
    });
    if (field === "mode") {
      setKnowledgeSupportOpen(value === "direct");
    }
  }

  function toggleBuilderItem(itemId: string) {
    setBuilderMessage("");
    setGoalBuilder((current) => ({
      ...current,
      selectedItemIds: current.selectedItemIds.includes(itemId)
        ? current.selectedItemIds.filter((idValue) => idValue !== itemId)
        : [...current.selectedItemIds, itemId],
    }));
  }

  function addBuilderDraftToGoals() {
    if (!goalBuilder.domainCode) {
      setBuilderMessage("اختر مجال أداة التقييم أولاً.");
      return;
    }
    if (!goalBuilder.sourceId) {
      setBuilderMessage("اختر مصدر الهدف قبل إضافة المسودة.");
      return;
    }
    if (!goalBuilder.baselineSourceId) {
      setBuilderMessage("اختر مرجعية الخط القاعدي قبل إضافة المسودة.");
      return;
    }
    if (goalBuilder.baselineSourceId === "formal_assessment" && goalBuilder.selectedItemIds.length === 0 && !goalBuilder.performanceAnchor.trim()) {
      setBuilderMessage("اختر نتيجة أو بنداً واحداً على الأقل من التقييم الرسمي أو مستوى الأداء الحالي في المجال المحدد.");
      return;
    }
    if (!selectedPerformanceAnchor) {
      setBuilderMessage("حدد مرتكز الأداء / الخط القاعدي قبل إضافة المسودة.");
      return;
    }
    if (!generatedGoalDraft.text.includes("[السلوك المستهدف]") && generatedGoalDraft.text.trim()) {
      const domainCode = goalBuilder.domainCode;
      const sourceId = goalBuilder.sourceId as GoalSourceId;
      const goalId = crypto.randomUUID();
      setGoals((current) => ({
        ...current,
        [domainCode]: [
          ...(current[domainCode] ?? []),
          {
            id: goalId,
            text: generatedGoalDraft.text,
            category: "",
            context: goalBuilder.condition,
            criterion: goalBuilder.criterion,
            measurementMethod: goalBuilder.measurementMethod,
            goalTrigger: sourceLabel(sourceId),
            performanceAnchor: selectedPerformanceAnchor,
            evidenceRef: selectedPerformanceAnchor,
            lifePractice: goalBuilder.generalOutcome,
          },
        ],
      }));
      setOpen((current) => ({ ...current, [domainCode]: true }));
      setExpandedGoals((current) => new Set([...current, goalId]));
      setBuilderMessage("تمت إضافة مسودة الهدف إلى محرر الأهداف للمراجعة واستكمال الجودة.");
      return;
    }
    setBuilderMessage("أكمل السلوك المستهدف أو اكتب الهدف مباشرة قبل إضافة المسودة.");
  }

  function addProposalToGoals(proposal: GoalProposal) {
    const opportunity = goalOpportunityCards.find((card) => card.id === proposal.opportunityId);
    const domainCode = opportunity?.domainCode || goalBuilder.domainCode;
    if (!domainCode) {
      setBuilderMessage("اختر مجالاً قبل اعتماد المقترح كمسودة.");
      return;
    }
    if (proposal.readiness === "needs_evidence") {
      setBuilderMessage("هذا المقترح يحتاج ربطاً بخط قاعدي أو دليل أداء قبل إضافته كمسودة.");
      return;
    }

    const goalId = crypto.randomUUID();
    setGoals((current) => ({
      ...current,
      [domainCode]: [
        ...(current[domainCode] ?? []),
        {
          id: goalId,
          text: proposal.textAr,
          category: "",
          context: proposal.contextAr,
          criterion: proposal.criterionAr,
          measurementMethod: proposal.measurementMethodAr,
          goalTrigger: proposal.goalTriggerAr,
          performanceAnchor: proposal.evidenceRefAr,
          evidenceRef: proposal.evidenceRefAr,
          lifePractice: proposal.lifePracticeAr,
          aiSuggestion: {
            layerName: goalAiSuggestions.policy.layerName,
            proposalId: proposal.id,
            opportunityId: proposal.opportunityId,
            variant: proposal.variant,
            readiness: proposal.readiness,
            whyAr: proposal.whyAr,
            limitationAr: goalAiSuggestions.limitationAr,
            addedAt: new Date().toISOString(),
          },
        },
      ],
    }));
    setOpen((current) => ({ ...current, [domainCode]: true }));
    setExpandedGoals((current) => new Set([...current, goalId]));
    setBuilderMessage("تمت إضافة المقترح كمسودة هدف قابلة للمراجعة داخل قائمة الأهداف.");
  }

  function addGoal(code: DomainCode) {
    setGoals((g) => ({
      ...g,
        [code]: [...(g[code] ?? []), {
        id: crypto.randomUUID(), text: "", category: "",
        context: "", criterion: "", measurementMethod: "", evidenceRef: "", goalTrigger: "", performanceAnchor: "", lifePractice: "",
      }],
    }));
  }
  function updateGoalText(code: DomainCode, gid: string, text: string) {
    setGoals((g) => ({
      ...g,
      [code]: (g[code] ?? []).map((x) => (x.id === gid ? { ...x, text } : x)),
    }));
  }
  function updateGoalCategory(code: DomainCode, gid: string, cat: GoalCategory | "") {
    setGoals((g) => ({
      ...g,
      [code]: (g[code] ?? []).map((x) => (x.id === gid ? { ...x, category: cat } : x)),
    }));
  }
  function updateGoalField(code: DomainCode, gid: string, field: keyof Goal, value: string) {
    setGoals((g) => ({
      ...g,
      [code]: (g[code] ?? []).map((x) => (x.id === gid ? { ...x, [field]: value } : x)),
    }));
  }
  function deleteGoal(code: DomainCode, gid: string) {
    setGoals((g) => ({ ...g, [code]: (g[code] ?? []).filter((x) => x.id !== gid) }));
  }
  function updateServiceDraft(field: "serviceType" | "serviceName" | "linkedGoals", value: string) {
    setServiceDraft((current) => ({ ...current, [field]: value }));
  }
  function addSupportService() {
    const serviceType = serviceDraft.serviceType.trim();
    const serviceName = serviceDraft.serviceName.trim();
    const linkedGoals = serviceDraft.linkedGoals.trim();
    if (!serviceType && !serviceName && !linkedGoals) return;
    setServices((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        serviceType,
        serviceName,
        linkedGoals,
      },
    ]);
    setServiceDraft({ serviceType: "", serviceName: "", linkedGoals: "" });
  }
  function deleteSupportService(serviceId: string) {
    setServices((current) => current.filter((service) => service.id !== serviceId));
  }
  function toggleGoalExpanded(gid: string) {
    setExpandedGoals((prev) => {
      const next = new Set(prev);
      if (next.has(gid)) {
        next.delete(gid);
      } else {
        next.add(gid);
      }
      return next;
    });
  }

  function openOverrideForm(gid: string) {
    setOverrideFormFor(gid);
    setOverrideDraft((prev) => ({ ...prev, [gid]: prev[gid] ?? { reason: "", note: "" } }));
  }
  function updateOverrideDraft(gid: string, field: "reason" | "note", value: string) {
    setOverrideDraft((prev) => ({ ...prev, [gid]: { ...(prev[gid] ?? { reason: "", note: "" }), [field]: value } }));
  }
  function confirmOverride(code: DomainCode, gid: string) {
    const draft = overrideDraft[gid];
    if (!draft?.reason) return;
    setGoals((g) => ({
      ...g,
      [code]: (g[code] ?? []).map((x) => (x.id === gid
        ? { ...x, override: { reason: draft.reason, note: draft.note || undefined, at: new Date().toISOString() } }
        : x)),
    }));
    setOverrideFormFor(null);
  }

  // Only goals the specialist actually started (non-empty text) can block —
  // an empty, not-yet-written goal is never a blocker.
  const blockingGoals: {
    domainCode: DomainCode;
    domainName: string;
    goalId: string;
    text: string;
    missingField: MissingField;
    messages: string[];
  }[] = [];
  const startedGoals: Array<Goal & { domainCode: DomainCode }> = [];
  for (const d of goalDomainOptions) {
    for (const g of goals[d.code] ?? []) {
      if (g.text.trim()) startedGoals.push({ ...g, domainCode: d.code });
      const rubric = evaluateGoalPlanQuality({
        goalText: g.text, context: g.context ?? "", criterion: g.criterion ?? "",
        measurementMethod: g.measurementMethod ?? "", evidenceRef: g.evidenceRef ?? "",
        goalTrigger: g.goalTrigger ?? "", performanceAnchor: g.performanceAnchor ?? "",
        lifePractice: g.lifePractice ?? "", domainCode: d.code,
        coverage, family, learnerVoice, override: g.override ?? null,
        learnerAgeYears, profileProcessing,
      });
      if (g.text.trim() && rubric.blockingFindings.length > 0) {
        blockingGoals.push({
          domainCode: d.code,
          domainName: d.name,
          goalId: g.id,
          text: g.text,
          missingField: firstMissingField(g),
          messages: rubric.blockingFindings.map((finding) => finding.messageAr),
        });
      }
    }
  }
  const canSaveDraft = startedGoals.length > 0;
  const canSubmitForApproval = blockingGoals.length === 0 && startedGoals.length > 0;
  const draftProgressTag = !canSaveDraft
    ? null
    : canSubmitForApproval
      ? {
          code: "continuable",
          label: "المسودة قابلة للاستكمال",
          note: "يمكن حفظها كمسودة أو إقرار الأهداف ورفعها لمسار الخطة.",
        }
      : {
          code: "blocked_until_progress_findings_resolved",
          label: "المسودة غير قابلة للتقدم قبل استيفاء موانع التقدم",
          note: "يمكن حفظها فقط كمسودة، وتظهر تفاصيل الموانع عند طلبها.",
        };

  function persistIepDraft(input: {
    goalApprovalIds: string[];
    reviewStatus: "draft_only" | "draft_with_blocking_findings" | "ready_for_plan_review";
    draftProgressTag: "continuable" | "blocked_until_progress_findings_resolved" | "ready_for_plan_review";
  }) {
    localStorage.setItem(
      `himam_iep_${id}`,
      JSON.stringify({
        vision,
        goals,
        services,
        startDate,
        goalApprovalIds: input.goalApprovalIds,
        reviewStatus: input.reviewStatus,
        draftProgressTag: input.draftProgressTag,
        blockingGoalReviews: blockingGoals.map((goal) => ({
          goalId: goal.goalId,
          domainCode: goal.domainCode,
          domainName: goal.domainName,
          messages: goal.messages,
        })),
        savedAt: new Date().toISOString(),
      }),
    );
  }

  function clearPlanReviewArtifacts() {
    localStorage.removeItem(planGovernanceKey(id));
    localStorage.removeItem(planApprovalKey(id));
  }

  function clearPlanHandoffArtifacts() {
    saveGoalApprovalBundles(id, []);
    clearPlanReviewArtifacts();
  }

  function handleSaveDraftOnly() {
    if (!canSaveDraft) {
      toast.error("أضف هدفاً واحداً على الأقل قبل حفظ المسودة.");
      return;
    }

    try {
      clearPlanHandoffArtifacts();
      persistIepDraft({
        goalApprovalIds: [],
        reviewStatus: blockingGoals.length > 0 ? "draft_with_blocking_findings" : "draft_only",
        draftProgressTag: blockingGoals.length > 0 ? "blocked_until_progress_findings_resolved" : "continuable",
      });
      toast.success(
        blockingGoals.length > 0
          ? "تم حفظ مسودة الأهداف مع الملاحظات المانعة دون رفعها للاعتماد."
          : "تم حفظ مسودة الأهداف فقط دون رفعها للاعتماد.",
      );
    } catch (error) {
      console.warn("Unable to save IEP draft", error);
      toast.error("تعذر حفظ مسودة الأهداف.");
    }
  }

  function handleSubmitForApproval() {
    if (startedGoals.length === 0) {
      toast.error("أضف هدفاً واحداً على الأقل قبل الانتقال إلى الخطة.");
      return;
    }
    if (!canSubmitForApproval) {
      const first = blockingGoals[0];
      setOpen((o) => ({ ...o, [first.domainCode]: true }));
      setExpandedGoals((prev) => {
        const next = new Set(prev);
        next.add(first.goalId);
        return next;
      });
      setScrollTarget({ goalId: first.goalId, field: first.missingField });
      toast.error("لا يمكن رفع الهدف لمسار الخطة قبل استيفاء الملاحظات المانعة. يمكنك حفظه كمسودة فقط.");
      return;
    }

    try {
      const approvalBundles = buildGoalApprovalBundles({
        learnerId: id,
        goals: startedGoals.map((goal) => ({
          id: goal.id,
          domainCode: goal.domainCode,
          text: goal.text,
          context: goal.context,
          criterion: goal.criterion,
          measurementMethod: goal.measurementMethod,
          evidenceRef: goal.performanceAnchor || goal.evidenceRef,
        })),
      });
      saveGoalApprovalBundles(id, approvalBundles);
      clearPlanReviewArtifacts();
      approvalBundles.forEach((bundle) => {
        appendApprovalAuditEvent(buildApprovalAuditEvent({
          learnerId: id,
          actorRole: "SPECIALIST",
          action: "CREATE_GOAL_APPROVAL",
          targetRecordType: "GoalApprovalRecord",
          targetRecordId: bundle.approval.approvalId,
          decision: bundle.approval.decision,
          decisionRationale: bundle.approval.decisionRationale,
        }));
      });
      persistIepDraft({
        goalApprovalIds: approvalBundles.map((bundle) => bundle.approval.approvalId),
        reviewStatus: "ready_for_plan_review",
        draftProgressTag: "ready_for_plan_review",
      });
      const raw = localStorage.getItem("himam_students");
      if (raw) {
        const list: StoredStudent[] = JSON.parse(raw);
        const updated = list.map((s) => (s.id === id ? { ...s, status: advanceStage(s.status, "iep_completed") } : s));
        localStorage.setItem("himam_students", JSON.stringify(updated));
      }
    } catch (error) {
      console.warn("Unable to save IEP draft", error);
      toast.error("تعذر رفع الأهداف لمسار الخطة.");
      return;
    }
    toast.success("تم إقرار الأهداف ورفعها لمسار الخطة ✓");
    navigate({ to: "/students/$id/plan", params: { id } });
  }

  return (
    <div dir="rtl" lang="ar" style={{ minHeight: "100vh", background: "#FAF7F2", fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
      <header
        style={{
          background: TEAL, color: "white", padding: "14px 24px",
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}
      >
        <div style={{ fontSize: 22, fontWeight: 700 }}>همم</div>
        <Link
          to="/students/$id/iep"
          params={{ id }}
          style={{
            color: "white", textDecoration: "none", fontSize: 15,
            padding: "8px 14px", border: "1px solid rgba(255,255,255,0.4)", borderRadius: 8,
          }}
        >
          → رجوع
        </Link>
      </header>

      <main style={{ maxWidth: 960, margin: "0 auto", padding: "28px 20px 60px" }}>
        <nav
          aria-label="مسار الصفحة"
          style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", fontSize: 12, color: "#94A3B8", marginBottom: 10 }}
        >
          <Link to="/" style={{ color: "#64748B", textDecoration: "underline", fontWeight: 700 }}>لوحة المتعلمين</Link>
          <span>←</span>
          <span>{student?.name ?? "الطالب"}</span>
          <span>←</span>
          <span style={{ color: TEAL, fontWeight: 700 }}>الأهداف</span>
        </nav>

        <h1 style={{ fontSize: 26, fontWeight: 800, color: TEAL, margin: 0 }}>
          محرك توليد الأهداف التفاعلي
        </h1>
        <p style={{ marginTop: 6, color: "#475569", fontSize: 15 }}>
          {student ? student.name : "—"}
        </p>

        <section
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1.35fr) minmax(280px, 0.65fr)",
            gap: 16,
            marginTop: 18,
            marginBottom: 18,
          }}
        >
          <div style={cardStyle}>
            <h2 style={sectionTitle}>هيكلة توليد الأهداف</h2>
            <p style={{ color: "#64748B", fontSize: 14, lineHeight: 1.9, margin: "6px 0 0" }}>
              يبدأ المختص من مستوى الأداء الحالي والمصادر الداعمة، ثم يربط الهدف بالمجال والمهارة وسياق التطبيق ومعيار القياس والأثر الحياتي. الهدف هنا مسودة جاهزة للمراجعة البشرية فقط.
            </p>
          </div>
          <div style={cardStyle}>
            <h2 style={sectionTitle}>الإطار المعرفي الداعم</h2>
            <p style={{ color: "#64748B", fontSize: 14, lineHeight: 1.9, margin: "6px 0 0" }}>
              تظهر هنا إشارات الدعم المعرفي ومعالجة البروفايل المستخلصة من مصادر جمع المعلومات. هذه الإشارات توجه بناء مستوى الأداء والأهداف، لكنها تحتاج تفسير المختص قبل أن تتحول إلى ادعاء أداء أو قرار خطة.
            </p>
          </div>
        </section>

        <section style={cardStyle}>
          <h2 style={{ ...sectionTitle, display: "flex", alignItems: "center", gap: 8 }}>
            حدد آلية إعداد الأهداف من خيارات المنصة
            <InfoMark title="أداة تفاعلية تدعم المختص بمعلومات مستوى الأداء الحالي ونتائج التقييمات ضمن معايير جودة الأهداف. اختر منشئ الهدف التفاعلي لمسار موجه، أو الإدخال المباشر مع دعم معرفي عند الطلب." />
          </h2>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12, marginTop: 16 }}>
            <button
              type="button"
              onClick={() => updateGoalBuilder("mode", "guided")}
              style={modeButtonStyle(goalBuilder.mode === "guided")}
            >
              <span style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 900, fontSize: 14 }}>
                منشىء الهدف التفاعلي
                <InfoMark title="مسار موجه يساعد على ربط الهدف بالهدف العام، الأثر الوظيفي، ومستوى الأداء الحالي." inverted={goalBuilder.mode === "guided"} />
              </span>
            </button>
            <button
              type="button"
              onClick={() => updateGoalBuilder("mode", "direct")}
              style={modeButtonStyle(goalBuilder.mode === "direct")}
            >
              <span style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 900, fontSize: 14 }}>
                إدخال مباشر للأهداف
                <InfoMark title="كتابة مستقلة للهدف مع إتاحة شاشة دعم معرفي موازية عند الطلب." inverted={goalBuilder.mode === "direct"} />
              </span>
            </button>
          </div>

          {goalBuilder.mode && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 12, marginTop: 16 }}>
            <div style={builderStepStyle}>
              <div style={builderStepTitle}>1. مجال مستوى الأداء</div>
              <select
                value={goalBuilder.domainCode}
                onChange={(event) => updateGoalBuilder("domainCode", event.target.value)}
                style={selectStyle}
              >
                <option value="">اختر المجال من مستوى الأداء الحالي</option>
                {goalDomainOptions.map((domain) => (
                  <option key={domain.code} value={domain.code}>{domain.name}</option>
                ))}
              </select>
              <input
                value={goalBuilder.domainCode && !goalDomainOptions.some((domain) => domain.code === goalBuilder.domainCode) ? goalBuilder.domainCode : ""}
                onChange={(event) => updateGoalBuilder("domainCode", event.target.value)}
                placeholder="أو اكتب مجالاً حراً"
                style={{ ...inputStyle, marginTop: 8, fontSize: 12 }}
              />
            </div>

            <div style={builderStepStyle}>
              <div style={builderStepTitle}>2. باعث الهدف</div>
              <select
                value={goalBuilder.sourceId}
                onChange={(event) => updateGoalBuilder("sourceId", event.target.value as GoalSourceId | "")}
                style={selectStyle}
                disabled={!goalBuilder.domainCode}
              >
                <option value="">اختر المصدر</option>
                {goalSources.map((source) => (
                  <option key={source.id} value={source.id}>{source.label}</option>
                ))}
              </select>
              {goalBuilder.sourceId && (
                <p style={{ margin: "6px 0 0", color: "#64748B", fontSize: 11, lineHeight: 1.6 }}>
                  {goalSources.find((source) => source.id === goalBuilder.sourceId)?.note}
                </p>
              )}
            </div>

            <div style={builderStepStyle}>
              <div style={builderStepTitle}>3. مرجعية الخط القاعدي</div>
              <select
                value={goalBuilder.baselineSourceId}
                onChange={(event) => updateGoalBuilder("baselineSourceId", event.target.value as BaselineSourceId | "")}
                style={selectStyle}
                disabled={!goalBuilder.sourceId}
              >
                <option value="">اختر المرجعية</option>
                {BASELINE_SOURCES.map((source) => (
                  <option key={source.id} value={source.id}>{source.label}</option>
                ))}
              </select>
              {goalBuilder.baselineSourceId && (
                <p style={{ margin: "6px 0 8px", color: "#64748B", fontSize: 11, lineHeight: 1.6 }}>
                  {BASELINE_SOURCES.find((source) => source.id === goalBuilder.baselineSourceId)?.note}
                </p>
              )}
              {goalBuilder.baselineSourceId === "formal_assessment" ? (
                <div style={{ maxHeight: 132, overflowY: "auto", display: "flex", flexDirection: "column", gap: 6 }}>
                  {baselineCandidates.length === 0 ? (
                    <p style={{ margin: 0, color: "#94A3B8", fontSize: 12, lineHeight: 1.7 }}>
                      لا توجد نتيجة تقييم رسمية أو مسودة مستوى أداء مرتبطة بهذا المجال بعد. اكتب تفسير الخط القاعدي يدوياً إن كان لديك مصدر مراجع.
                    </p>
                  ) : baselineCandidates.map((item) => (
                    <label key={item.id} style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 12, color: "#374151", lineHeight: 1.6 }}>
                      <input
                        type="checkbox"
                        checked={goalBuilder.selectedItemIds.includes(item.id)}
                        onChange={() => toggleBuilderItem(item.id)}
                        style={{ marginTop: 3 }}
                      />
                      <span>
                        {item.label}
                        <small style={{ display: "block", color: "#94A3B8", fontSize: 10, marginTop: 2 }}>
                          {item.source === "assessment_record"
                            ? "نتيجة تقييم رسمي محفوظة"
                            : item.source === "current_level"
                              ? "مسودة مستوى أداء حالي قابلة للمراجعة"
                              : "بند مرجعي داعم من TTAP"}
                        </small>
                      </span>
                    </label>
                  ))}
                </div>
              ) : (
                <p style={{ margin: 0, color: "#64748B", fontSize: 12, lineHeight: 1.8 }}>
                  اكتب اسم الأداة أو الملف، والبند أو النتيجة التي تمثل مستوى الأداء الحالي.
                </p>
              )}
              <textarea
                value={goalBuilder.performanceAnchor}
                onChange={(event) => updateGoalBuilder("performanceAnchor", event.target.value)}
                rows={2}
                placeholder={goalBuilder.baselineSourceId === "formal_assessment" && selectedBaselineLabels.length > 0
                  ? "يمكن تركه فارغاً لاستخدام البنود المحددة كمرتكز أداء، أو اكتب تفسيراً مراجعاً لها..."
                  : "اكتب مرتكز الأداء أو الخط القاعدي المراجع: الأداة/البند/النتيجة/التفسير..."}
                style={{ ...textAreaStyle, minHeight: 64, marginTop: 8, fontSize: 12 }}
              />
            </div>
          </div>
          )}

          {goalBuilder.mode && goalBuilder.domainCode && (
            <div style={{ marginTop: 12, border: "1px solid #9EC7C3", background: "#F4FAF9", borderRadius: 12, padding: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
                <div>
                  <div style={{ color: TEAL, fontSize: 13, fontWeight: 900 }}>مسودة مستوى الأداء الحالي للمجال المختار</div>
                  <p style={{ margin: "4px 0 0", color: "#64748B", fontSize: 12, lineHeight: 1.8 }}>
                    هذه المسودة مقترحة من معالجة نتائج التقييم الرسمي وبقية مصادر المعلومات، وتستخدم كمراجعة قبل اختيار الخط القاعدي وصياغة الهدف.
                  </p>
                </div>
                <span style={{ borderRadius: 999, background: "white", color: TEAL, fontSize: 11, fontWeight: 900, padding: "5px 10px", whiteSpace: "nowrap" }}>
                  {selectedCurrentLevelRow?.proposedByPlatform ? "مقترح قابل للمراجعة" : "يحتاج استكمال"}
                </span>
              </div>

              {selectedCurrentLevelRow ? (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 12 }}>
                  <div style={{ border: "1px solid #E7E5E4", borderRadius: 10, background: "white", padding: 12 }}>
                    <div style={{ color: TEAL, fontSize: 12, fontWeight: 900 }}>نقاط القوة المقترحة</div>
                    <p style={{ margin: "6px 0 0", whiteSpace: "pre-line", color: "#374151", fontSize: 12, lineHeight: 1.8 }}>
                      {selectedCurrentLevelRow.strengths || "لا توجد نقطة قوة مصنفة لهذا المجال بعد."}
                    </p>
                  </div>
                  <div style={{ border: "1px solid #E7E5E4", borderRadius: 10, background: "white", padding: 12 }}>
                    <div style={{ color: TEAL, fontSize: 12, fontWeight: 900 }}>نقاط الاحتياج المقترحة</div>
                    <p style={{ margin: "6px 0 0", whiteSpace: "pre-line", color: "#374151", fontSize: 12, lineHeight: 1.8 }}>
                      {selectedCurrentLevelRow.needs || "لا توجد نقطة احتياج مصنفة لهذا المجال بعد."}
                    </p>
                  </div>
                  <p style={{ gridColumn: "1 / -1", margin: 0, color: "#64748B", fontSize: 11, lineHeight: 1.7 }}>
                    {selectedCurrentLevelRow.sourceSummaryAr}
                  </p>
                </div>
              ) : (
                <p style={{ margin: "10px 0 0", color: "#92400E", fontSize: 12, lineHeight: 1.8 }}>
                  لا توجد مسودة مستوى أداء مصنفة لهذا المجال بعد. يجب استكمال معالجة مصادر المعلومات أو إدخال خط قاعدي مراجع قبل إضافة الهدف.
                </p>
              )}
            </div>
          )}

          {goalBuilder.mode && (
            <div style={{ marginTop: 12, border: "1px solid #E2E8F0", background: "white", borderRadius: 12, padding: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
                <div>
                  <h3 style={{ margin: 0, color: TEAL, fontSize: 14, fontWeight: 900 }}>طبقة AI المساندة لتوليد الأهداف</h3>
                  <p style={{ margin: "5px 0 0", color: "#64748B", fontSize: 12, lineHeight: 1.8 }}>
                    {goalAiSuggestions.visibleSummaryAr} لا تعتمد هذه الطبقة هدفاً، ولا تنشئ خطاً قاعدياً جديداً.
                  </p>
                </div>
                <span style={{ borderRadius: 999, background: "#F8FAFC", border: "1px solid #E2E8F0", color: "#334155", fontSize: 11, fontWeight: 900, padding: "5px 10px" }}>
                  {selectedGoalProposals.length} مقترح
                </span>
              </div>
              <details style={{ marginTop: 8 }}>
                <summary style={{ color: TEAL, cursor: "pointer", fontSize: 11, fontWeight: 900 }}>حدود طبقة AI</summary>
                <AiLayerPolicyDetails policy={goalAiSuggestions.policy} limitationAr={goalAiSuggestions.limitationAr} />
              </details>

              {selectedGoalProposals.length > 0 ? (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 10, marginTop: 12 }}>
                  {selectedGoalProposals.map((proposal) => {
                    const opportunity = goalOpportunityCards.find((card) => card.id === proposal.opportunityId);
                    return (
                      <GoalProposalCard
                        key={proposal.id}
                        proposal={proposal}
                        opportunity={opportunity}
                        onAdd={() => addProposalToGoals(proposal)}
                      />
                    );
                  })}
                </div>
              ) : (
                <p style={{ margin: "10px 0 0", color: "#92400E", fontSize: 12, lineHeight: 1.8 }}>
                  لا توجد مقترحات كافية بعد. اختر المجال ومرتكز الأداء أو استكمل مستوى الأداء الحالي ومصادر المعلومات السابقة.
                </p>
              )}
            </div>
          )}

          {goalBuilder.mode === "guided" && (
            <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {GUIDANCE_QUESTIONS.map((item) => (
                <label key={item.key} style={{ display: "block" }}>
                  <span style={{ display: "block", color: TEAL, fontSize: 12, fontWeight: 800, marginBottom: 4 }}>
                    {item.question}
                  </span>
                  <textarea
                    value={String(goalBuilder[item.key])}
                    onChange={(event) => updateGoalBuilder(item.key, event.target.value)}
                    rows={3}
                    placeholder={item.helper}
                    style={{ ...textAreaStyle, minHeight: 82 }}
                  />
                </label>
              ))}
            </div>
          )}

          {goalBuilder.mode === "direct" && (
            <label style={{ display: "block", marginTop: 16 }}>
              <span style={{ display: "block", color: TEAL, fontSize: 12, fontWeight: 800, marginBottom: 4 }}>اكتب الهدف مباشرة</span>
              <textarea
                value={goalBuilder.directGoalText}
                onChange={(event) => updateGoalBuilder("directGoalText", event.target.value)}
                rows={3}
                placeholder="اكتب الهدف بصياغة سلوكية قابلة للملاحظة والقياس..."
                style={textAreaStyle}
              />
            </label>
          )}

          {goalBuilder.mode && (
            <div style={{ marginTop: 12, display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <p style={{ margin: 0, color: "#64748B", fontSize: 12, lineHeight: 1.7 }}>
                الدعم المعرفي يبقى في الخلفية في مسار الأسئلة، ويمكن عرضه موازياً عند الكتابة المستقلة.
              </p>
              <button
                type="button"
                onClick={() => setKnowledgeSupportOpen((openValue) => !openValue)}
                style={{ background: "white", color: TEAL, border: "1px solid #9EC7C3", borderRadius: 8, padding: "8px 12px", cursor: "pointer", fontFamily: "inherit", fontWeight: 800, fontSize: 12 }}
              >
                {knowledgeSupportOpen ? "إخفاء الدعم المعرفي" : "فتح الدعم المعرفي"}
              </button>
            </div>
          )}

          {goalBuilder.mode && knowledgeSupportOpen && (
            <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: goalBuilder.mode === "direct" ? "1fr 1fr" : "1fr", gap: 12 }}>
              <KnowledgeSupportPanel items={knowledgeSupport} />
              {goalBuilder.mode === "direct" && <ProfileComponentMatrixPanel model={profileProcessing} />}
            </div>
          )}

          {goalBuilder.mode && (
            <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10 }}>
              <label style={{ display: "block" }}>
                <span style={miniLabelStyle}>بيان المعطيات/الشرط</span>
                <input
                  value={goalBuilder.condition}
                  onChange={(event) => updateGoalBuilder("condition", event.target.value)}
                  placeholder="بالنظر إلى مواد/دعم..."
                  style={inputStyle}
                />
              </label>
              <label style={{ display: "block" }}>
                <span style={miniLabelStyle}>توضيح التفاصيل</span>
                <input
                  value={goalBuilder.details}
                  onChange={(event) => updateGoalBuilder("details", event.target.value)}
                  placeholder="سياق إضافي عند الحاجة"
                  style={inputStyle}
                />
              </label>
              <label style={{ display: "block" }}>
                <span style={miniLabelStyle}>مستوى/معيار الأداء</span>
                <input
                  value={goalBuilder.criterion}
                  onChange={(event) => updateGoalBuilder("criterion", event.target.value)}
                  placeholder="80%، 4 من 5..."
                  style={inputStyle}
                />
              </label>
              <label style={{ display: "block" }}>
                <span style={miniLabelStyle}>أسلوب القياس التقييمي</span>
                <select
                  value={goalBuilder.measurementMethod}
                  onChange={(event) => updateGoalBuilder("measurementMethod", event.target.value)}
                  style={selectStyle}
                >
                  <option value="">اختر طريقة القياس</option>
                  {MEASUREMENT_METHODS.map((method) => (
                    <option key={method} value={method}>{method}</option>
                  ))}
                </select>
              </label>
            </div>
          )}

          {goalBuilder.mode && (
            <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: builderQualityOpen ? "minmax(0, 1.15fr) minmax(300px, 0.85fr)" : "1fr", gap: 14 }}>
              <div style={{ border: "1px solid #E2E8F0", borderRadius: 10, padding: 12, background: "#F8FAFC" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                  <h3 style={{ margin: 0, color: TEAL, fontSize: 14, fontWeight: 800 }}>مسودة الهدف المجمعة تلقائياً</h3>
                  <DetailsToggleButton
                    open={builderQualityOpen}
                    label="مراجعة الجودة"
                    onClick={() => setBuilderQualityOpen((openValue) => !openValue)}
                  />
                </div>
                <p style={{ margin: "8px 0 0", color: "#334155", fontSize: 13, lineHeight: 1.9 }}>{generatedGoalDraft.text}</p>
                <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  {generatedGoalDraft.elements.map(([label, value]) => (
                    <div key={label} style={{ border: "1px solid #E5E7EB", borderRadius: 8, background: "white", padding: 8 }}>
                      <div style={{ color: "#64748B", fontSize: 11, fontWeight: 800 }}>{label}</div>
                      <div style={{ color: "#111827", fontSize: 12, lineHeight: 1.7, marginTop: 3 }}>{value}</div>
                    </div>
                  ))}
                </div>
              </div>

              {builderQualityOpen && (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div style={{ border: "1px solid #FEF3C7", borderRadius: 10, padding: 12, background: "#FFFBEB" }}>
                    <h3 style={{ margin: 0, color: "#92400E", fontSize: 14, fontWeight: 800 }}>أسئلة مراجعة ضمان الجودة</h3>
                    <ul style={{ margin: "8px 0 0", paddingInlineStart: 18, color: "#78350F", fontSize: 12, lineHeight: 1.8 }}>
                      <li>هل الهدف محدد ويصف ما سيفعله الطالب بدقة؟</li>
                      <li>هل الهدف قابل للقياس ببيانات حقيقية؟</li>
                      <li>هل يمكن تحقيقه خلال عام واحد بالنظر إلى المستوى الحالي؟</li>
                      <li>هل هو موجه نحو نتيجة حياتية وليس مجرد نشاط؟</li>
                      <li>هل يتضمن: من، السلوك، المعيار، السياق/الحالة، ومقياس الأداء؟</li>
                      <li>هل يستند مباشرة إلى مستوى الأداء الحالي أو مصدر معلومات موثق؟</li>
                    </ul>
                    {vagueWord && (
                      <p style={{ margin: "10px 0 0", color: "#B91C1C", fontSize: 12, fontWeight: 800, lineHeight: 1.7 }}>
                        تنبيه صياغة مبهمة: ظهرت كلمة "{vagueWord}". استبدلها بفعل قابل للملاحظة مثل: يحدد، يكتب، يكمل، يرتب، يطلب.
                      </p>
                    )}
                  </div>
                  <GoalPlanQualitySummary result={builderRubric} />
                </div>
              )}
            </div>
          )}

          <div style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={addBuilderDraftToGoals}
              style={{
                background: TEAL,
                color: "white",
                border: "none",
                borderRadius: 8,
                padding: "10px 16px",
                cursor: "pointer",
                fontFamily: "inherit",
                fontWeight: 800,
                fontSize: 14,
              }}
            >
              إضافة المسودة إلى الأهداف
            </button>
            {builderMessage && (
              <span style={{ color: builderMessage.startsWith("تمت") ? "#047857" : "#B91C1C", fontSize: 13, fontWeight: 800 }}>
                {builderMessage}
              </span>
            )}
          </div>
        </section>

        {/* Section 1 - Vision */}
        <section style={cardStyle}>
          <label style={labelStyle}>رؤية الخطة</label>
          <textarea
            value={vision}
            onChange={(e) => setVision(e.target.value)}
            placeholder="اكتب الرؤية العامة للخطة..."
            rows={4}
            style={{
              width: "100%", padding: "12px 14px", border: "1px solid #E5E7EB",
              borderRadius: 8, fontSize: 15, fontFamily: "inherit", resize: "vertical",
              boxSizing: "border-box",
            }}
          />
        </section>

        {/* Section 2 - Goals by Domain */}
        <section style={cardStyle}>
          <h2 style={sectionTitle}>الأهداف حسب مجالات التقييم</h2>
          <p style={{ color: "#64748B", fontSize: 13, marginTop: 4, marginBottom: 0 }}>
            أدخل الأهداف تحت كل مجال بحرية كاملة
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 14 }}>
            {!loaded ? null : goalDomainOptions.map((d) => (
              <div key={d.code} style={{ border: "1px solid #E5E7EB", borderRadius: 10, overflow: "hidden" }}>
                <button
                  type="button"
                  onClick={() => setOpen((o) => ({ ...o, [d.code]: !o[d.code] }))}
                  style={{
                    width: "100%", display: "flex", justifyContent: "space-between",
                    alignItems: "center", padding: "12px 16px", background: "#E6F2F1",
                    border: "none", cursor: "pointer", fontFamily: "inherit",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                    <span style={{ fontWeight: 700, color: TEAL, fontSize: 16 }}>{d.name}</span>
                    <span style={{ fontSize: 12, color: "#94A3B8" }}>{d.code}</span>
                  </div>
                  <span style={{ fontSize: 14, color: "#64748B" }}>{open[d.code] ? "▲" : "▼"}</span>
                </button>
                {open[d.code] && (
                  <div style={{ padding: 14, background: "white" }}>
                    <GoalReferencePanel
                      domainCode={d.code}
                      domainName={d.name}
                      tool={student?.tool ?? ""}
                      assessment={assessmentDomains?.[d.code] ?? null}
                      coverage={coverage}
                      family={family}
                      learnerVoice={learnerVoice}
                    />
                    <GoalPreparationExtracts
                      informationProcessing={informationProcessing}
                      profileProcessing={profileProcessing}
                      sourcePipelines={sourcePipelines}
                      sourceDetailsOpen={sourceDetailsOpen}
                      processingDetailsOpen={processingDetailsOpen}
                      profileDetailsOpen={profileDetailsOpen}
                      onToggleSourceDetails={() => setSourceDetailsOpen((openValue) => !openValue)}
                      onToggleProcessingDetails={() => setProcessingDetailsOpen((openValue) => !openValue)}
                      onToggleProfileDetails={() => setProfileDetailsOpen((openValue) => !openValue)}
                    />
                    {sourceDetailsOpen && <ReviewedFileSourcesPanel pipelines={sourcePipelines} />}
                    {processingDetailsOpen && <InformationProcessingPanel profile={informationProcessing} />}
                    {profileDetailsOpen && (
                      <>
                        <ProfileComponentMatrixPanel model={profileProcessing} />
                        <ProfileProcessingPanel model={profileProcessing} />
                      </>
                    )}
                    {goals[d.code].length === 0 && (
                      <p style={{ color: "#94A3B8", fontSize: 14, margin: "0 0 12px" }}>
                        لا توجد أهداف بعد.
                      </p>
                    )}
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      {goals[d.code].map((g) => {
                        const isTtapDomain = TTAP_DOMAINS.some((td) => td.code === d.code);
                        const evidenceItems = isTtapDomain ? getItemsByDomain(d.code as TTAPDomain) : [];
                        const expanded = expandedGoals.has(g.id);
                        const rubric = evaluateGoalPlanQuality({
                          goalText: g.text,
                          goalTrigger: g.goalTrigger ?? "",
                          performanceAnchor: g.performanceAnchor ?? g.evidenceRef ?? "",
                          context: g.context ?? "",
                          criterion: g.criterion ?? "",
                          measurementMethod: g.measurementMethod ?? "",
                          evidenceRef: g.evidenceRef ?? "",
                          lifePractice: g.lifePractice ?? "",
                          domainCode: d.code,
                          coverage,
                          family,
                          learnerVoice,
                          override: g.override ?? null,
                          learnerAgeYears,
                          profileProcessing,
                        });
                        return (
                        <div
                          key={g.id}
                          id={`goal-card-${g.id}`}
                          style={{
                            border: "1px solid #E5E7EB", borderRadius: 8, padding: 12,
                            background: "#FAFAF8",
                          }}
                        >
                          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                            <input
                              type="text"
                              value={g.text}
                              onChange={(e) => updateGoalText(d.code, g.id, e.target.value)}
                              placeholder="اكتب الهدف..."
                              style={{
                                flex: 1, padding: "10px 12px", border: "1px solid #E5E7EB",
                                borderRadius: 6, fontSize: 14, fontFamily: "inherit",
                              }}
                            />
                            <Select
                              value={g.category || "placeholder"}
                              onValueChange={(val) => updateGoalCategory(d.code, g.id, val === "placeholder" ? "" : (val as GoalCategory))}
                            >
                              <SelectTrigger style={{ width: 130, fontSize: 13 }}>
                                <SelectValue placeholder="التصنيف" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="placeholder" disabled>
                                  التصنيف
                                </SelectItem>
                                {CATEGORIES.map((c) => (
                                  <SelectItem key={c} value={c}>
                                    {c}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <button
                              type="button"
                              onClick={() => deleteGoal(d.code, g.id)}
                              aria-label="حذف الهدف"
                              style={{
                                background: "#FEE2E2", color: "#B91C1C", border: "none",
                                borderRadius: 6, width: 36, height: 36, cursor: "pointer",
                                fontSize: 16, fontWeight: 700, flexShrink: 0,
                              }}
                            >
                              ✕
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={() => toggleGoalExpanded(g.id)}
                            style={{
                              marginTop: 10, background: "none", border: "none", cursor: "pointer",
                              fontFamily: "inherit", fontSize: 12, fontWeight: 700, color: "#64748B",
                              padding: 0, display: "flex", alignItems: "center", gap: 6,
                            }}
                          >
                            <span>تفاصيل القياس والجودة</span>
                            <span>{expanded ? "▲" : "▼"}</span>
                          </button>

                          {expanded && (
                            <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px dashed #E5E7EB", display: "flex", flexDirection: "column", gap: 10 }}>
                              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                                <div>
                                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#64748B", marginBottom: 4 }}>السياق</label>
                                  <select
                                    value={g.context ?? ""}
                                    onChange={(e) => updateGoalField(d.code, g.id, "context", e.target.value)}
                                    style={{ width: "100%", padding: "8px 10px", border: "1px solid #E5E7EB", borderRadius: 6, fontSize: 13, fontFamily: "inherit" }}
                                  >
                                    <option value="">— اختر السياق —</option>
                                    {GOAL_CONTEXTS.map((c) => <option key={c} value={c}>{c}</option>)}
                                  </select>
                                </div>
                                <div>
                                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#64748B", marginBottom: 4 }}>طريقة القياس</label>
                                  <select
                                    id={`goal-field-measurementMethod-${g.id}`}
                                    value={g.measurementMethod ?? ""}
                                    onChange={(e) => updateGoalField(d.code, g.id, "measurementMethod", e.target.value)}
                                    style={{
                                      width: "100%", padding: "8px 10px", borderRadius: 6, fontSize: 13, fontFamily: "inherit",
                                      border: `1px solid ${!g.measurementMethod && g.text.trim() ? "#DC2626" : "#E5E7EB"}`,
                                    }}
                                  >
                                    <option value="">— اختر طريقة —</option>
                                    {MEASUREMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
                                  </select>
                                </div>
                              </div>

                              <div>
                                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#64748B", marginBottom: 4 }}>المعيار</label>
                                <input
                                  id={`goal-field-criterion-${g.id}`}
                                  type="text"
                                  value={g.criterion ?? ""}
                                  onChange={(e) => updateGoalField(d.code, g.id, "criterion", e.target.value)}
                                  placeholder="مثال: 80% من المحاولات عبر 3 جلسات متتالية"
                                  style={{
                                    width: "100%", padding: "8px 10px", borderRadius: 6, fontSize: 13, fontFamily: "inherit",
                                    border: `1px solid ${!g.criterion && g.text.trim() ? "#DC2626" : "#E5E7EB"}`,
                                  }}
                                />
                                {!g.criterion && g.text.trim() && (
                                  <p style={{ margin: "4px 0 0", fontSize: 11, color: "#B91C1C", fontWeight: 600 }}>
                                    لا يمكن اعتماد الهدف دون معيار إتقان واضح.
                                  </p>
                                )}
                              </div>

                              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                                <div>
                                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#64748B", marginBottom: 4 }}>باعث الهدف</label>
                                  <input
                                    type="text"
                                    value={g.goalTrigger ?? ""}
                                    onChange={(e) => updateGoalField(d.code, g.id, "goalTrigger", e.target.value)}
                                    placeholder="صوت الأسرة، صوت المتعلم، ملاحظة الفريق، متطلبات الانتقال..."
                                    style={{ width: "100%", padding: "8px 10px", border: "1px solid #E5E7EB", borderRadius: 6, fontSize: 13, fontFamily: "inherit" }}
                                  />
                                </div>
                                <div>
                                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#64748B", marginBottom: 4 }}>مرتكز الأداء / الخط القاعدي</label>
                                  <input
                                    id={`goal-field-evidenceRef-${g.id}`}
                                    type="text"
                                    value={g.performanceAnchor ?? g.evidenceRef ?? ""}
                                    onChange={(e) => {
                                      updateGoalField(d.code, g.id, "performanceAnchor", e.target.value);
                                      updateGoalField(d.code, g.id, "evidenceRef", e.target.value);
                                    }}
                                    placeholder="نتيجة تقييم مفسرة، قائمة مسح، ملاحظة أداء منظمة..."
                                    style={{
                                      width: "100%", padding: "8px 10px", borderRadius: 6, fontSize: 13, fontFamily: "inherit",
                                      border: `1px solid ${!g.evidenceRef && !g.performanceAnchor && g.text.trim() ? "#DC2626" : "#E5E7EB"}`,
                                    }}
                                  />
                                  {!g.evidenceRef && !g.performanceAnchor && g.text.trim() && (
                                    <p style={{ margin: "4px 0 0", fontSize: 11, color: "#B91C1C", fontWeight: 600 }}>
                                      لا يمكن اعتماد الهدف دون مرتكز أداء أو خط قاعدي مراجع.
                                    </p>
                                  )}
                                </div>
                              </div>

                              <div>
                                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#64748B", marginBottom: 4 }}>اختيار سريع لمرتكز الأداء من بنود التقييم</label>
                                {isTtapDomain ? (
                                  <select
                                    value={g.evidenceRef ?? ""}
                                    onChange={(e) => {
                                      updateGoalField(d.code, g.id, "evidenceRef", e.target.value);
                                      updateGoalField(d.code, g.id, "performanceAnchor", e.target.value);
                                    }}
                                    style={{
                                      width: "100%", padding: "8px 10px", borderRadius: 6, fontSize: 13, fontFamily: "inherit",
                                      border: "1px solid #E5E7EB",
                                    }}
                                  >
                                    <option value="">— لم يتم الربط بعد —</option>
                                    {evidenceItems.map((item) => (
                                      <option key={item.id} value={`بند ${item.id} — ${item.name}`}>
                                        بند {item.id} — {item.name}
                                      </option>
                                    ))}
                                  </select>
                                ) : (
                                  <input
                                    type="text"
                                    value={g.evidenceRef ?? ""}
                                    onChange={(e) => {
                                      updateGoalField(d.code, g.id, "evidenceRef", e.target.value);
                                      updateGoalField(d.code, g.id, "performanceAnchor", e.target.value);
                                    }}
                                    placeholder="صف مصدر الدليل الداعم لهذا الهدف"
                                    style={{
                                      width: "100%", padding: "8px 10px", borderRadius: 6, fontSize: 13, fontFamily: "inherit",
                                      border: "1px solid #E5E7EB",
                                    }}
                                  />
                                )}
                              </div>

                              <div>
                                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#64748B", marginBottom: 4 }}>
                                  ممارسة حياتية مرتبطة <span style={{ fontWeight: 400, color: "#94A3B8" }}>(اختياري — إرشادي)</span>
                                </label>
                                <textarea
                                  value={g.lifePractice ?? ""}
                                  onChange={(e) => updateGoalField(d.code, g.id, "lifePractice", e.target.value)}
                                  placeholder="صف موقفًا واقعيًا أو ممارسة حياتية يومية تتصل بالهدف أو بالمفهوم الانتقالي"
                                  rows={2}
                                  style={{ width: "100%", padding: "8px 10px", border: "1px solid #E5E7EB", borderRadius: 6, fontSize: 13, fontFamily: "inherit", resize: "vertical" }}
                                />
                              </div>

                              <GoalQualityChecklist
                                goalText={g.text}
                                goalTrigger={g.goalTrigger ?? ""}
                                performanceAnchor={g.performanceAnchor ?? g.evidenceRef ?? ""}
                                context={g.context ?? ""}
                                criterion={g.criterion ?? ""}
                                measurementMethod={g.measurementMethod ?? ""}
                                evidenceRef={g.evidenceRef ?? ""}
                                lifePractice={g.lifePractice ?? ""}
                                domainCode={d.code}
                                coverage={coverage}
                                family={family}
                                learnerVoice={learnerVoice}
                                override={g.override ?? null}
                              />
                              <GoalPlanQualitySummary result={rubric} />

                              {g.aiSuggestion && (
                                <div style={{ background: "#F4FAF9", border: "1px solid #9EC7C3", borderRadius: 8, padding: 10, fontSize: 12, color: TEAL, lineHeight: 1.7 }}>
                                  <strong>وسم طبقة AI:</strong> هذا الهدف أضيف كمسودة من مقترح AI مضبوط.
                                  <p style={{ margin: "4px 0 0", color: "#475569" }}>
                                    سبب الترشيح: {g.aiSuggestion.whyAr}
                                  </p>
                                  <p style={{ margin: "4px 0 0", color: "#64748B", fontSize: 11 }}>
                                    الحدود: {g.aiSuggestion.limitationAr}
                                  </p>
                                </div>
                              )}

                              {g.text.trim() && (
                                g.override ? (
                                  <div style={{ background: "#FFFBEB", border: "1px solid #FCD34D", borderRadius: 8, padding: 10, fontSize: 12, color: "#92400E" }}>
                                    <strong>تجاوز مهني موثّق:</strong> {g.override.reason}
                                    {g.override.note ? ` — ${g.override.note}` : ""}
                                  </div>
                                ) : overrideFormFor === g.id ? (
                                  <div style={{ background: "#F8FAFC", border: "1px dashed #CBD5E1", borderRadius: 8, padding: 10, display: "flex", flexDirection: "column", gap: 8 }}>
                                    <p style={{ fontSize: 12, fontWeight: 700, color: "#1F2937", margin: 0 }}>تجاوز مهني موثّق</p>
                                    <select
                                      value={overrideDraft[g.id]?.reason ?? ""}
                                      onChange={(e) => updateOverrideDraft(g.id, "reason", e.target.value)}
                                      style={{ width: "100%", padding: "8px 10px", border: "1px solid #E5E7EB", borderRadius: 6, fontSize: 13, fontFamily: "inherit" }}
                                    >
                                      <option value="">اختر سببًا</option>
                                      {OVERRIDE_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
                                    </select>
                                    <textarea
                                      value={overrideDraft[g.id]?.note ?? ""}
                                      onChange={(e) => updateOverrideDraft(g.id, "note", e.target.value)}
                                      placeholder="توضيح مختصر (اختياري)"
                                      rows={2}
                                      style={{ width: "100%", padding: "8px 10px", border: "1px solid #E5E7EB", borderRadius: 6, fontSize: 13, fontFamily: "inherit", resize: "vertical" }}
                                    />
                                    <div style={{ display: "flex", gap: 8 }}>
                                      <button
                                        type="button"
                                        onClick={() => confirmOverride(d.code, g.id)}
                                        disabled={!overrideDraft[g.id]?.reason}
                                        style={{
                                          background: overrideDraft[g.id]?.reason ? TEAL : "#D1D5DB", color: "white", border: "none",
                                          borderRadius: 6, padding: "6px 14px", fontSize: 12, fontWeight: 700,
                                          cursor: overrideDraft[g.id]?.reason ? "pointer" : "not-allowed", fontFamily: "inherit",
                                        }}
                                      >
                                        تأكيد التجاوز وتوثيقه
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setOverrideFormFor(null)}
                                        style={{ background: "white", color: "#64748B", border: "1px solid #E5E7EB", borderRadius: 6, padding: "6px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
                                      >
                                        إلغاء
                                      </button>
                                    </div>
                                  </div>
                                ) : hasHardStopViolation(g.text, computeGoalQuality({
                                    goalText: g.text, goalTrigger: g.goalTrigger ?? "",
                                    performanceAnchor: g.performanceAnchor ?? g.evidenceRef ?? "",
                                    context: g.context ?? "", criterion: g.criterion ?? "",
                                    measurementMethod: g.measurementMethod ?? "", evidenceRef: g.evidenceRef ?? "",
                                    lifePractice: g.lifePractice ?? "", domainCode: d.code,
                                    coverage, family, learnerVoice, override: null,
                                  })) && (
                                  <button
                                    type="button"
                                    onClick={() => openOverrideForm(g.id)}
                                    style={{ background: "none", border: "none", color: "#92400E", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", padding: 0, textAlign: "right" }}
                                  >
                                    توثيق تجاوز مهني بدل استكمال العنصر الحرج
                                  </button>
                                )
                              )}
                            </div>
                          )}
                        </div>
                        );
                      })}
                    </div>
                    <button
                      type="button"
                      onClick={() => addGoal(d.code)}
                      style={{
                        marginTop: 12, background: "white", color: ORANGE,
                        border: `1px dashed ${ORANGE}`, borderRadius: 8, padding: "8px 14px",
                        cursor: "pointer", fontFamily: "inherit", fontWeight: 700, fontSize: 14,
                      }}
                    >
                      ＋ إضافة هدف
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Section 3 - Support Services */}
        <section style={cardStyle}>
          <h2 style={sectionTitle}>خدمات الدعم المقررة</h2>
          <div style={{ display: "grid", gridTemplateColumns: "0.9fr 1fr 1.2fr auto", gap: 10, marginTop: 12, alignItems: "end" }}>
            <label style={{ display: "block" }}>
              <span style={miniLabelStyle}>نوع الخدمة</span>
              <input
                value={serviceDraft.serviceType}
                onChange={(event) => updateServiceDraft("serviceType", event.target.value)}
                placeholder="مثال: علاج نطق"
                style={inputStyle}
              />
            </label>
            <label style={{ display: "block" }}>
              <span style={miniLabelStyle}>اسم الخدمة</span>
              <input
                value={serviceDraft.serviceName}
                onChange={(event) => updateServiceDraft("serviceName", event.target.value)}
                placeholder="مثال: تدريب التواصل الوظيفي"
                style={inputStyle}
              />
            </label>
            <label style={{ display: "block" }}>
              <span style={miniLabelStyle}>الأهداف المرتبطة</span>
              <input
                value={serviceDraft.linkedGoals}
                onChange={(event) => updateServiceDraft("linkedGoals", event.target.value)}
                placeholder="اكتب الهدف أو أرقام الأهداف المرتبطة"
                style={inputStyle}
              />
            </label>
            <button
              type="button"
              onClick={addSupportService}
              style={{
                background: TEAL,
                color: "white",
                border: "none",
                borderRadius: 8,
                padding: "9px 14px",
                cursor: "pointer",
                fontFamily: "inherit",
                fontWeight: 800,
                fontSize: 13,
                whiteSpace: "nowrap",
              }}
            >
              إضافة
            </button>
          </div>

          {services.length > 0 && (
            <div style={{ marginTop: 14, overflowX: "auto" }}>
              <table style={{ width: "100%", minWidth: 680, borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ background: "#E6F2F1", color: TEAL, textAlign: "right" }}>
                    <th style={supportServiceCellStyle}>نوع الخدمة</th>
                    <th style={supportServiceCellStyle}>اسم الخدمة</th>
                    <th style={supportServiceCellStyle}>الأهداف</th>
                  </tr>
                </thead>
                <tbody>
                  {services.map((service) => (
                    <tr key={service.id}>
                      <td style={supportServiceCellStyle}>{service.serviceType || "غير محدد"}</td>
                      <td style={supportServiceCellStyle}>{service.serviceName || "غير محدد"}</td>
                      <td style={supportServiceCellStyle}>
                        <div>{service.linkedGoals || "غير محدد"}</div>
                        <button
                          type="button"
                          onClick={() => deleteSupportService(service.id)}
                          style={{ background: "none", border: "none", color: "#92400E", cursor: "pointer", fontFamily: "inherit", fontWeight: 800, marginTop: 6, padding: 0 }}
                        >
                          حذف
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Section 4 - Start Date */}
        <section style={cardStyle}>
          <label style={labelStyle}>تاريخ بدء الخطة</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            style={{
              maxWidth: 220, padding: "10px 12px", border: "1px solid #E5E7EB",
              borderRadius: 8, fontSize: 15, fontFamily: "inherit",
            }}
          />
        </section>

        {/* Info box */}
        <div
          style={{
            marginTop: 20, background: "#FBE9E1", border: `1px solid ${ORANGE}`,
            borderRadius: 8, padding: 12, color: "#7C3F1D", fontSize: 14,
            lineHeight: 1.7, display: "flex", gap: 10, alignItems: "flex-start",
          }}
        >
          <span style={{ fontSize: 18, lineHeight: 1.4 }}>ℹ️</span>
          <span>
            حفظ المسودة يبقي الهدف داخل مساحة العمل للمراجعة. إقرار الأهداف فقط يرفعها لمسار الخطة واختيار الأنشطة، ولا يتم ذلك عند وجود ملاحظات مانعة.
          </span>
        </div>

        {draftProgressTag && (
          <div
            style={{
              marginTop: 12,
              background: draftProgressTag.code === "continuable" ? "#ECFDF5" : "#FFFBEB",
              border: `1px solid ${draftProgressTag.code === "continuable" ? "#A7F3D0" : "#FCD34D"}`,
              borderRadius: 8,
              padding: 12,
              color: draftProgressTag.code === "continuable" ? "#065F46" : "#78350F",
              fontSize: 13,
              lineHeight: 1.7,
            }}
          >
            <strong>{draftProgressTag.label}</strong>
            <p style={{ margin: "4px 0 0" }}>{draftProgressTag.note}</p>
          </div>
        )}

        {/* Hard-stop warning */}
        {!canSubmitForApproval && startedGoals.length === 0 && (
          <div
            style={{
              marginTop: 20, background: "#FFFBEB", border: "1px solid #FCD34D",
              borderRadius: 8, padding: 12, color: "#78350F", fontSize: 13, lineHeight: 1.7,
            }}
          >
            <strong>لا يمكن الانتقال إلى الخطة قبل إضافة هدف واحد على الأقل.</strong>
          </div>
        )}

        {!canSubmitForApproval && startedGoals.length > 0 && (
          <div
            style={{
              marginTop: 20, background: "#FEF2F2", border: "1px solid #FCA5A5",
              borderRadius: 8, padding: 12, color: "#7A1F1F", fontSize: 13, lineHeight: 1.7,
            }}
          >
            <strong>يمكن حفظ العمل كمسودة، لكن لا يمكن رفعه لمسار الخطة حتى استكمال {blockingGoals.length} هدفًا:</strong>
            <button
              type="button"
              onClick={() => setDraftBlockerDetailsOpen((open) => !open)}
              style={{
                marginTop: 8,
                background: "white",
                color: "#7A1F1F",
                border: "1px solid #FCA5A5",
                borderRadius: 6,
                padding: "6px 10px",
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              {draftBlockerDetailsOpen ? "إخفاء التفاصيل" : "عرض تفاصيل الموانع"}
            </button>
            {draftBlockerDetailsOpen && (
              <ul style={{ margin: "8px 0 0", paddingRight: 18 }}>
                {blockingGoals.map((b, i) => (
                  <li key={i}>{b.domainName} — {b.text}: {b.messages[0]}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Bottom button */}
        <div style={{ marginTop: 24, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 }}>
          <button
            type="button"
            onClick={handleSaveDraftOnly}
            disabled={!canSaveDraft}
            title={canSaveDraft ? undefined : "أضف هدفاً واحداً على الأقل قبل حفظ المسودة"}
            style={{
              width: "100%", background: canSaveDraft ? "white" : "#F3F4F6", color: canSaveDraft ? TEAL : "#9CA3AF", border: `1px solid ${canSaveDraft ? TEAL : "#D1D5DB"}`,
              padding: "14px 18px", borderRadius: 10, fontWeight: 700, fontSize: 16,
              cursor: canSaveDraft ? "pointer" : "not-allowed", fontFamily: "inherit",
            }}
          >
            حفظ كمسودة فقط
          </button>
          <button
            type="button"
            onClick={handleSubmitForApproval}
            disabled={!canSubmitForApproval}
            title={canSubmitForApproval ? undefined : "توجد ملاحظات مانعة تمنع رفع الهدف لمسار الخطة"}
            style={{
              width: "100%", background: canSubmitForApproval ? TEAL : "#D1D5DB", color: "white", border: "none",
              padding: "14px 18px", borderRadius: 10, fontWeight: 700, fontSize: 16,
              cursor: canSubmitForApproval ? "pointer" : "not-allowed", fontFamily: "inherit",
            }}
          >
            إقرار الأهداف ورفعها لمسار الخطة ←
          </button>
        </div>
      </main>
    </div>
  );
}

function goalReadinessLabel(readiness: GoalReadiness) {
  if (readiness === "ready") return "جاهز كمسودة";
  if (readiness === "improvable") return "قابل للتحسين";
  if (readiness === "needs_preparatory_goal") return "يفضل هدف تمهيدي";
  return "يحتاج دليل";
}

function goalReadinessStyle(readiness: GoalReadiness) {
  if (readiness === "ready") return { background: "#DCFCE7", color: "#166534", border: "#BBF7D0" };
  if (readiness === "improvable") return { background: "#FEF3C7", color: "#92400E", border: "#FDE68A" };
  if (readiness === "needs_preparatory_goal") return { background: "#E0F2FE", color: "#075985", border: "#BAE6FD" };
  return { background: "#FEE2E2", color: "#991B1B", border: "#FECACA" };
}

function goalModeLabel(mode?: GoalOpportunityCard["mode"]) {
  if (mode === "performance_based") return "مستوى الأداء";
  if (mode === "transition_based") return "بوصلة الانتقال";
  if (mode === "vision_based") return "الرؤية";
  if (mode === "blended") return "مزج مصادر";
  return "مصدر غير محدد";
}

function AiLayerPolicyDetails({
  policy,
  limitationAr,
}: {
  policy: GoalAiLayerPolicy;
  limitationAr: string;
}) {
  return (
    <div style={{ marginTop: 8, border: "1px solid #E2E8F0", borderRadius: 8, background: "#F8FAFC", padding: 10 }}>
      <p style={{ margin: 0, color: "#475569", fontSize: 11, lineHeight: 1.7 }}>
        {limitationAr}
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 6, marginTop: 8 }}>
        <MiniStatus label="قرار" value={policy.producesApproval ? "ينتج اعتماد" : "دعم مراجعة فقط"} />
        <MiniStatus label="خط قاعدي" value={policy.producesBaseline ? "ينشئ" : "لا ينشئ"} />
        <MiniStatus label="مراجعة بشرية" value={policy.requiresHumanReview ? "إلزامية" : "غير مفعلة"} />
      </div>
      <ul style={{ margin: "8px 0 0", paddingInlineStart: 18, color: "#64748B", fontSize: 11, lineHeight: 1.7 }}>
        {policy.guardrailsAr.map((guardrail) => (
          <li key={guardrail}>{guardrail}</li>
        ))}
      </ul>
    </div>
  );
}

function MiniStatus({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ background: "white", border: "1px solid #E5E7EB", borderRadius: 6, padding: 8 }}>
      <p style={{ margin: 0, color: "#64748B", fontSize: 10, fontWeight: 800 }}>{label}</p>
      <p style={{ margin: "3px 0 0", color: TEAL, fontSize: 11, fontWeight: 900 }}>{value}</p>
    </div>
  );
}

function GoalProposalCard({
  proposal,
  opportunity,
  onAdd,
}: {
  proposal: GoalProposal;
  opportunity?: GoalOpportunityCard;
  onAdd: () => void;
}) {
  const readiness = goalReadinessStyle(proposal.readiness);

  return (
    <article style={{ border: "1px solid #E5E7EB", borderRadius: 10, background: "#FAFAF8", padding: 10, display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
        <div>
          <p style={{ margin: 0, color: TEAL, fontSize: 12, fontWeight: 900 }}>{proposal.titleAr}</p>
          <p style={{ margin: "3px 0 0", color: "#64748B", fontSize: 10, fontWeight: 800 }}>
            {goalModeLabel(opportunity?.mode)}
          </p>
        </div>
        <span style={{ border: `1px solid ${readiness.border}`, background: readiness.background, color: readiness.color, borderRadius: 999, padding: "4px 8px", fontSize: 10, fontWeight: 900, whiteSpace: "nowrap" }}>
          {goalReadinessLabel(proposal.readiness)}
        </span>
      </div>

      <p style={{ margin: 0, color: "#334155", fontSize: 12, lineHeight: 1.8 }}>{proposal.textAr}</p>
      <p style={{ margin: 0, color: "#475569", fontSize: 11, lineHeight: 1.6 }}>
        {proposal.whyAr}
      </p>

      <details style={{ borderTop: "1px solid #E5E7EB", paddingTop: 6 }}>
        <summary style={{ color: TEAL, cursor: "pointer", fontSize: 11, fontWeight: 900 }}>عرض سبب التوليد والأدلة</summary>
        <ul style={{ margin: "6px 0 0", paddingInlineStart: 18, color: "#64748B", fontSize: 11, lineHeight: 1.7 }}>
          <li>مرتكز الأداء: {proposal.evidenceRefAr || "غير مكتمل"}</li>
          <li>باعث الهدف: {proposal.goalTriggerAr || "غير محدد"}</li>
          {proposal.detailsAr.slice(0, 4).map((detail) => (
            <li key={detail}>{detail}</li>
          ))}
        </ul>
      </details>

      <button
        type="button"
        onClick={onAdd}
        disabled={proposal.readiness === "needs_evidence"}
        style={{
          marginTop: "auto",
          background: proposal.readiness === "needs_evidence" ? "#D1D5DB" : TEAL,
          color: "white",
          border: "none",
          borderRadius: 8,
          padding: "8px 10px",
          cursor: proposal.readiness === "needs_evidence" ? "not-allowed" : "pointer",
          fontFamily: "inherit",
          fontSize: 12,
          fontWeight: 900,
        }}
      >
        إضافة كمسودة هدف
      </button>
    </article>
  );
}

function GoalPlanQualitySummary({ result }: { result: GoalPlanQualityRubricResult }) {
  const firstFindings = [
    ...result.blockingFindings,
    ...result.warnings,
    ...result.advisories,
  ].slice(0, 4);
  const border = result.blockingFindings.length > 0
    ? "#FCA5A5"
    : result.warnings.length > 0
      ? "#FCD34D"
      : "#9EC7C3";
  const background = result.blockingFindings.length > 0
    ? "#FEF2F2"
    : result.warnings.length > 0
      ? "#FFFBEB"
      : "#F4FAF9";
  const color = result.blockingFindings.length > 0
    ? "#7A1F1F"
    : result.warnings.length > 0
      ? "#78350F"
      : TEAL;

  return (
    <div style={{ border: `1px solid ${border}`, borderRadius: 10, padding: 12, background }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <h3 style={{ margin: 0, color, fontSize: 14, fontWeight: 800 }}>Rubric جودة الهدف والخطة</h3>
        <span style={{ color, fontSize: 11, fontWeight: 800 }}>
          مانع {result.blockingFindings.length} / تنبيه {result.warnings.length} / إرشاد {result.advisories.length}
        </span>
      </div>
      <p style={{ margin: "7px 0 0", color, fontSize: 12, lineHeight: 1.7 }}>{result.reviewSummaryAr}</p>
      {firstFindings.length > 0 && (
        <ul style={{ margin: "8px 0 0", paddingInlineStart: 18, color, fontSize: 11, lineHeight: 1.7 }}>
          {firstFindings.map((item) => (
            <li key={item.id}>{item.messageAr}</li>
          ))}
        </ul>
      )}
      <p style={{ margin: "8px 0 0", color: "#64748B", fontSize: 10, lineHeight: 1.6 }}>
        هذا الفحص دعم مراجعة فقط: لا ينتج اعتماداً، ولا درجة رقمية، ولا يستبدل قرار المختص.
      </p>
    </div>
  );
}

function GoalPreparationExtracts({
  informationProcessing,
  profileProcessing,
  sourcePipelines,
  sourceDetailsOpen,
  processingDetailsOpen,
  profileDetailsOpen,
  onToggleSourceDetails,
  onToggleProcessingDetails,
  onToggleProfileDetails,
}: {
  informationProcessing: InformationProcessingProfile;
  profileProcessing: LearnerProfileProcessingModel;
  sourcePipelines: SourceFilePipelineRecord[];
  sourceDetailsOpen: boolean;
  processingDetailsOpen: boolean;
  profileDetailsOpen: boolean;
  onToggleSourceDetails: () => void;
  onToggleProcessingDetails: () => void;
  onToggleProfileDetails: () => void;
}) {
  const reviewedSourceCount = sourcePipelines.filter((pipeline) => (
    pipeline.review?.decision === "approved_for_structured_response" &&
    pipeline.structuredResponses.length > 0
  )).length;
  const leadingOpportunity = profileProcessing.topGoalOpportunities[0]?.rationaleAr;

  return (
    <div style={{ marginBottom: 12, background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 8, padding: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <p style={{ margin: 0, color: TEAL, fontSize: 12, fontWeight: 800 }}>مستخلصات داعمة لإعداد الهدف</p>
        <span style={{ color: "#64748B", fontSize: 10, fontWeight: 800 }}>
          التفاصيل تظهر عند الطلب
        </span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 6, marginTop: 8 }}>
        <MiniMetric label="ملفات مراجعة" value={reviewedSourceCount} />
        <MiniMetric label="إشارات" value={informationProcessing.signalCount} />
        <MiniMetric label="فرص أهداف" value={profileProcessing.topGoalOpportunities.length} />
        <MiniMetric label="فجوات صحة" value={profileProcessing.componentMatrix.criticalMissingComponentCount} />
      </div>
      <p style={{ margin: "8px 0 0", color: "#475569", fontSize: 11, lineHeight: 1.7 }}>
        {leadingOpportunity ?? "لا توجد فرصة هدف مستخلصة بعد. عند تطبيق الأدوات أو مراجعة الملفات ستظهر هنا إشارات مختصرة فقط."}
      </p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
        <DetailsToggleButton open={sourceDetailsOpen} label="مصادر الملفات" onClick={onToggleSourceDetails} />
        <DetailsToggleButton open={processingDetailsOpen} label="معالجة المعلومات" onClick={onToggleProcessingDetails} />
        <DetailsToggleButton open={profileDetailsOpen} label="البروفايل المتكامل" onClick={onToggleProfileDetails} />
      </div>
    </div>
  );
}

function DetailsToggleButton({ open, label, onClick }: { open: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        background: open ? TEAL : "white",
        color: open ? "white" : TEAL,
        border: open ? `1px solid ${TEAL}` : "1px solid #9EC7C3",
        borderRadius: 8,
        padding: "7px 10px",
        cursor: "pointer",
        fontFamily: "inherit",
        fontWeight: 800,
        fontSize: 11,
      }}
    >
      {open ? `إخفاء ${label}` : `عرض ${label}`}
    </button>
  );
}

function InformationProcessingPanel({ profile }: { profile: InformationProcessingProfile }) {
  if (profile.signalCount === 0) {
    return (
      <div style={{ marginBottom: 12, background: "#F8FAFC", border: "1px dashed #CBD5E1", borderRadius: 8, padding: 10 }}>
        <p style={{ margin: 0, color: "#64748B", fontSize: 12, lineHeight: 1.7 }}>
          لم تنتج أدوات المعلومات إشارات بروفايل بعد. عند تطبيق مسح أو قائمة غير رسمية ستظهر هنا إشارات القوة والاحتياج والدعم والأولوية.
        </p>
      </div>
    );
  }

  return (
    <div style={{ marginBottom: 12, background: "#F4FAF9", border: "1px solid #9EC7C3", borderRadius: 8, padding: 10 }}>
      <p style={{ margin: "0 0 8px", color: TEAL, fontSize: 12, fontWeight: 800 }}>معالجة بروفايل من أدوات المعلومات</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 6, marginBottom: 8 }}>
        <MiniMetric label="إشارات" value={profile.signalCount} />
        <MiniMetric label="مرشحات دليل" value={profile.evidenceCandidateCount} />
        <MiniMetric label="توجه الأهداف" value={profile.goalSelectionSignalCount} />
        <MiniMetric label="مفاهيم" value={profile.conceptSummaries.length} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {profile.conceptSummaries.slice(0, 4).map((summary) => (
          <div key={summary.conceptId} style={{ background: "white", border: "1px solid #E5E7EB", borderRadius: 6, padding: 8 }}>
            <p style={{ margin: 0, color: "#334155", fontSize: 12, fontWeight: 700 }}>{getConceptNameAr(summary.conceptId)}</p>
            <p style={{ margin: "3px 0 0", color: "#475569", fontSize: 12, lineHeight: 1.6 }}>
              {summary.signalCount} إشارات، {summary.evidenceCandidateCount} مرشح دليل، {summary.needOrRiskCount} احتياج/خطر، {summary.supportConditionCount} شرط دعم.
            </p>
          </div>
        ))}
      </div>
      <p style={{ margin: "8px 0 0", color: "#64748B", fontSize: 11, lineHeight: 1.6 }}>
        المعالجة الحالية متوسطة ومهنية: توجه بناء مستوى الأداء والهدف، ولا تعتمد وحدها ادعاء أداء أو تحليل سيكومتري.
      </p>
    </div>
  );
}

function profileImpactLabel(value: ProfileComponentElement["goalImpact"]) {
  if (value === "blocks_or_weakens_goal_validity") return "يؤثر على صحة الهدف";
  if (value === "improves_goal_relevance") return "يحسن ملاءمة الهدف";
  if (value === "improves_goal_personalization") return "يحسن تخصيص الهدف";
  if (value === "improves_goal_measurement") return "يحسن القياس والدعم";
  return "سياق داعم";
}

function ProfileComponentMatrixPanel({ model }: { model: LearnerProfileProcessingModel }) {
  const covered = model.componentMatrix.coveredComponentCount;
  const total = model.componentMatrix.componentCount;

  return (
    <div style={{ marginBottom: 12, background: "#F4FAF9", border: "1px solid #9EC7C3", borderRadius: 8, padding: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
        <p style={{ margin: 0, color: TEAL, fontSize: 12, fontWeight: 800 }}>محرك مكونات البروفايل</p>
        <span style={{ color: "#64748B", fontSize: 10, fontWeight: 800 }}>
          {covered}/{total} مكونات
        </span>
      </div>
      <p style={{ margin: "6px 0 0", color: "#475569", fontSize: 11, lineHeight: 1.7 }}>
        يفرز كل إدخال إلى مكون بروفايل وعنصر داخلي، ثم يحدد هل يؤثر على صحة الهدف أو يحسن جودة صياغته عند الاستدعاء.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 6, marginTop: 8 }}>
        <MiniMetric label="عناصر" value={model.componentMatrix.elements.length} />
        <MiniMetric label="فجوات صحة" value={model.componentMatrix.criticalMissingComponentCount} />
        <MiniMetric label="تلميحات" value={model.componentMatrix.goalRetrievalHintsAr.length} />
      </div>
      {model.componentMatrix.elements.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
          {model.componentMatrix.elements.slice(0, 4).map((element) => (
            <div key={element.id} style={{ background: "white", border: "1px solid #E5E7EB", borderRadius: 6, padding: 8 }}>
              <p style={{ margin: 0, color: "#334155", fontSize: 12, fontWeight: 700 }}>
                {element.componentNameAr} - {element.elementNameAr}
              </p>
              <p style={{ margin: "3px 0 0", color: "#475569", fontSize: 11, lineHeight: 1.6 }}>
                {profileImpactLabel(element.goalImpact)}: {element.summaryAr}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <p style={{ margin: "8px 0 0", color: "#64748B", fontSize: 11, lineHeight: 1.6 }}>
          لم تصل مدخلات كافية لتكوين مصفوفة مكونات بعد.
        </p>
      )}
      {model.componentMatrix.blockingGapsAr.length > 0 && (
        <p style={{ margin: "8px 0 0", color: "#92400E", fontSize: 11, lineHeight: 1.6 }}>
          فجوات مؤثرة على صحة الهدف: {model.componentMatrix.blockingGapsAr.join(" ")}
        </p>
      )}
    </div>
  );
}

function ProfileProcessingPanel({ model }: { model: LearnerProfileProcessingModel }) {
  if (model.inputCount === 0) {
    return (
      <div style={{ marginBottom: 12, background: "#FFFBEB", border: "1px solid #FCD34D", borderRadius: 8, padding: 10 }}>
        <p style={{ margin: 0, color: "#78350F", fontSize: 12, lineHeight: 1.7 }}>
          لم تتكون قراءة بروفايل تشغيلية بعد من الأدوات أو الملفات. طبق أداة أو راجع ملفاً مرفوعاً لتظهر فرص الأهداف حسب المفهوم.
        </p>
      </div>
    );
  }

  return (
    <div style={{ marginBottom: 12, background: "#FAFAF8", border: "1px solid #E7E5E4", borderRadius: 8, padding: 10 }}>
      <p style={{ margin: "0 0 8px", color: TEAL, fontSize: 12, fontWeight: 800 }}>قراءة البروفايل الموحدة</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 6, marginBottom: 8 }}>
        <MiniMetric label="مدخلات" value={model.inputCount} />
        <MiniMetric label="ملفات" value={model.reviewedUploadedSourceCount} />
        <MiniMetric label="أدوات" value={model.platformToolRecordCount} />
        <MiniMetric label="فرص" value={model.topGoalOpportunities.length} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {model.conceptProfiles.slice(0, 4).map((profile) => (
          <div key={profile.conceptId} style={{ background: "white", border: "1px solid #E5E7EB", borderRadius: 6, padding: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
              <p style={{ margin: 0, color: "#334155", fontSize: 12, fontWeight: 700 }}>{profile.conceptNameAr}</p>
              <span style={{ color: "#64748B", fontSize: 10, fontWeight: 700 }}>
                {profile.coverage} / {profile.confidence}
              </span>
            </div>
            <p style={{ margin: "3px 0 0", color: "#475569", fontSize: 11, lineHeight: 1.6 }}>
              {profile.currentPerformanceDraftAr}
            </p>
          </div>
        ))}
      </div>
      {model.topGoalOpportunities.length > 0 && (
        <p style={{ margin: "8px 0 0", color: "#64748B", fontSize: 11, lineHeight: 1.6 }}>
          أعلى فرصة: {model.topGoalOpportunities[0].rationaleAr}
        </p>
      )}
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: number }) {
  return (
    <div style={{ background: "white", border: "1px solid #E5E7EB", borderRadius: 6, padding: 8 }}>
      <p style={{ margin: 0, color: TEAL, fontSize: 16, fontWeight: 800 }}>{value}</p>
      <p style={{ margin: "2px 0 0", color: "#64748B", fontSize: 10, fontWeight: 700 }}>{label}</p>
    </div>
  );
}

function KnowledgeSupportPanel({ items }: { items: KnowledgeSupportItem[] }) {
  if (items.length === 0) {
    return (
      <div style={{ marginBottom: 12, background: "#FFFBEB", border: "1px solid #FCD34D", borderRadius: 8, padding: 10 }}>
        <p style={{ margin: 0, color: "#78350F", fontSize: 12, lineHeight: 1.7 }}>
          لا توجد أدوات اهتمامات/ميول/رؤية إضافية بعد. يمكن صياغة الخطة، وستظهر هذه المساحة كدعم معرفي عند إدخال الأدوات.
        </p>
      </div>
    );
  }

  return (
    <div style={{ marginBottom: 12, background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 8, padding: 10 }}>
      <p style={{ margin: "0 0 8px", color: TEAL, fontSize: 12, fontWeight: 800 }}>الدعم المعرفي من أدوات المعلومات</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {items.slice(0, 5).map((item) => (
          <div key={item.id} style={{ background: "white", border: "1px solid #E5E7EB", borderRadius: 6, padding: 8 }}>
            <p style={{ margin: 0, color: "#334155", fontSize: 12, fontWeight: 700 }}>{item.labelAr}</p>
            <p style={{ margin: "3px 0 0", color: "#475569", fontSize: 12, lineHeight: 1.6 }}>{item.valueAr}</p>
            <p style={{ margin: "3px 0 0", color: "#94A3B8", fontSize: 11 }}>
              الدور: {item.operatingRoles.join("، ")}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function ReviewedFileSourcesPanel({ pipelines }: { pipelines: SourceFilePipelineRecord[] }) {
  const reviewed = pipelines.filter((pipeline) => (
    pipeline.review?.decision === "approved_for_structured_response" &&
    pipeline.structuredResponses.length > 0
  ));

  if (reviewed.length === 0) {
    return (
      <div style={{ marginBottom: 12, background: "#F8FAFC", border: "1px dashed #CBD5E1", borderRadius: 8, padding: 10 }}>
        <p style={{ margin: 0, color: "#64748B", fontSize: 12, lineHeight: 1.7 }}>
          لم تصل ملفات مرفوعة ومراجعة إلى منشئ الأهداف بعد.
        </p>
      </div>
    );
  }

  return (
    <div style={{ marginBottom: 12, background: "#F4FAF9", border: "1px solid #9EC7C3", borderRadius: 8, padding: 10 }}>
      <p style={{ margin: "0 0 8px", color: TEAL, fontSize: 12, fontWeight: 800 }}>مصادر مرفوعة ومراجعة</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {reviewed.slice(0, 5).map((pipeline) => {
          const summary = summarizeSourceFilePipeline(pipeline);
          return (
            <div key={summary.id} style={{ background: "white", border: "1px solid #E5E7EB", borderRadius: 6, padding: 8 }}>
              <p style={{ margin: 0, color: "#334155", fontSize: 12, fontWeight: 700 }}>{summary.labelAr}</p>
              <p style={{ margin: "3px 0 0", color: "#475569", fontSize: 12, lineHeight: 1.6 }}>
                {summary.fileName} - {summary.statusAr} - {summary.responseCount} استجابة منظمة
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const cardStyle: React.CSSProperties = {
  marginTop: 20, background: "white", border: "1px solid #E5E7EB",
  borderRadius: 12, padding: 18,
};
const builderStepStyle: React.CSSProperties = {
  border: "1px solid #E5E7EB",
  borderRadius: 10,
  padding: 12,
  background: "#FAFAF8",
  minHeight: 118,
};
const builderStepTitle: React.CSSProperties = {
  color: TEAL,
  fontSize: 12,
  fontWeight: 800,
  marginBottom: 8,
};
function modeButtonStyle(active: boolean): React.CSSProperties {
  return {
    textAlign: "right",
    background: active ? TEAL : "white",
    color: active ? "white" : TEAL,
    border: active ? `1px solid ${TEAL}` : "1px solid #CBD5E1",
    borderRadius: 10,
    padding: 12,
    cursor: "pointer",
    fontFamily: "inherit",
    minHeight: 48,
  };
}

function InfoMark({ title, inverted = false }: { title: string; inverted?: boolean }) {
  return (
    <span
      title={title}
      aria-label={title}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 20,
        height: 20,
        borderRadius: 999,
        border: inverted ? "1px solid rgba(255,255,255,0.75)" : "1px solid #9EC7C3",
        background: inverted ? "rgba(255,255,255,0.12)" : "#F4FAF9",
        color: inverted ? "white" : TEAL,
        fontSize: 12,
        fontWeight: 900,
        lineHeight: 1,
        flexShrink: 0,
      }}
    >
      i
    </span>
  );
}
const selectStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 10px",
  border: "1px solid #E5E7EB",
  borderRadius: 8,
  fontSize: 13,
  fontFamily: "inherit",
  background: "white",
};
const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 10px",
  border: "1px solid #E5E7EB",
  borderRadius: 8,
  fontSize: 13,
  fontFamily: "inherit",
  boxSizing: "border-box",
};
const textAreaStyle: React.CSSProperties = {
  width: "100%",
  padding: "9px 11px",
  border: "1px solid #E5E7EB",
  borderRadius: 8,
  fontSize: 13,
  fontFamily: "inherit",
  resize: "vertical",
  boxSizing: "border-box",
};
const supportServiceCellStyle: React.CSSProperties = {
  border: "1px solid #E5E7EB",
  padding: "8px 10px",
  verticalAlign: "top",
};
const miniLabelStyle: React.CSSProperties = {
  display: "block",
  color: "#64748B",
  fontSize: 11,
  fontWeight: 800,
  marginBottom: 4,
};
const labelStyle: React.CSSProperties = {
  display: "block", fontWeight: 700, color: TEAL, marginBottom: 10, fontSize: 15,
};
const sectionTitle: React.CSSProperties = {
  fontSize: 18, fontWeight: 700, color: TEAL, margin: 0,
};
