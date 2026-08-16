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
import { GoalQualityChecklist } from "@/components/goal-quality-checklist";
import { computeGoalQuality, hasHardStopViolation, type GoalOverride } from "@/lib/goal-quality";
import { GoalReferencePanel } from "@/components/goal-reference-panel";
import { loadAssessmentRecords } from "@/lib/assessment-records";
import { buildKnowledgeSupportItems, loadInformationRecords } from "@/lib/information-records";
import type { AssessmentRecord, KnowledgeSupportItem } from "@/types/himam";

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

type DomainCode = "VS" | "VB" | "IF" | "LS" | "FC" | "IB" | "COG" | "COM" | "SOC" | "ADL" | "VOC" | "MOT";
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
  lifePractice?: string;
  override?: GoalOverride;
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
type GoalSourceId = "assessment" | "family_priorities" | "family_voice" | "learner_voice" | "additional_sources";
type GuidanceMode = "guided" | "direct";

type GoalBuilderState = {
  domainCode: DomainCode | "";
  sourceId: GoalSourceId | "";
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
  if (!g.evidenceRef?.trim()) return "evidenceRef";
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

const SUPPORT_SERVICES = [
  "دعم التواصل",
  "التدريب المهني",
  "الدعم الأكاديمي",
  "التدريب على المهارات الحياتية",
  "خدمات إعادة التأهيل المهني",
];

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

function emptyGoalMap(domains: { code: DomainCode }[]): Record<DomainCode, Goal[]> {
  return Object.fromEntries(domains.map((d): [DomainCode, Goal[]] => [d.code, []])) as Record<DomainCode, Goal[]>;
}
function emptyOpenMap(domains: { code: DomainCode }[]): Record<DomainCode, boolean> {
  return Object.fromEntries(domains.map((d) => [d.code, false])) as Record<DomainCode, boolean>;
}

function sourceLabel(sourceId: GoalSourceId) {
  if (sourceId === "assessment") return "أداة التقييم المطبقة";
  if (sourceId === "family_priorities") return "أولويات الأسرة";
  if (sourceId === "family_voice") return "صوت الأسرة";
  if (sourceId === "learner_voice") return "صوت المتعلم";
  return "أدوات ومصادر إضافية";
}

function buildGoalSources(input: {
  assessmentRecords: AssessmentRecord[];
  family: FamilyData | null;
  learnerVoice: LearnerVoiceData | null;
  additionalSources: unknown;
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

  return sources;
}

function hasVagueLanguage(text: string) {
  return VAGUE_GOAL_WORDS.find((word) => text.includes(word));
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

  const [goals, setGoals] = useState<Record<DomainCode, Goal[]>>(emptyGoalMap(TTAP_DOMAINS));
  const [open, setOpen] = useState<Record<DomainCode, boolean>>(emptyOpenMap(TTAP_DOMAINS));
  const [services, setServices] = useState<string[]>([]);
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
  const [goalBuilder, setGoalBuilder] = useState<GoalBuilderState>(EMPTY_GOAL_BUILDER);
  const [builderMessage, setBuilderMessage] = useState("");

  // Draft state for the "professional override" mini-form, keyed by goal id.
  const [overrideFormFor, setOverrideFormFor] = useState<string | null>(null);
  const [overrideDraft, setOverrideDraft] = useState<Record<string, { reason: string; note: string }>>({});

  // Set by handleSave when a hard-stop blocks saving — once the domain/goal
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
        if (data.services) setServices(data.services);
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
    setKnowledgeSupport(buildKnowledgeSupportItems(loadInformationRecords(id)));

    setLoaded(true);
  }, [id]);

  const goalSources = buildGoalSources({ assessmentRecords, family, learnerVoice, additionalSources });
  const selectedGoalDomain = domains.find((domain) => domain.code === goalBuilder.domainCode);
  const selectedAssessmentItems = goalBuilder.domainCode && TTAP_DOMAINS.some((domain) => domain.code === goalBuilder.domainCode)
    ? getItemsByDomain(goalBuilder.domainCode as TTAPDomain)
    : [];
  const selectedItemLabels = selectedAssessmentItems
    .filter((item) => goalBuilder.selectedItemIds.includes(String(item.id)))
    .map((item) => `بند ${item.id} - ${item.name}`);
  const generatedGoalDraft = buildGoalDraft({
    studentName: student?.name ?? "الطالب",
    startDate,
    builder: goalBuilder,
    selectedItems: selectedItemLabels,
  });
  const vagueWord = hasVagueLanguage(generatedGoalDraft.text);

  function updateGoalBuilder<K extends keyof GoalBuilderState>(field: K, value: GoalBuilderState[K]) {
    setBuilderMessage("");
    setGoalBuilder((current) => {
      const next = { ...current, [field]: value };
      if (field === "domainCode") {
        next.selectedItemIds = [];
      }
      if (field === "sourceId" && value !== "assessment") {
        next.selectedItemIds = [];
      }
      return next;
    });
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
    if (goalBuilder.sourceId === "assessment" && goalBuilder.selectedItemIds.length === 0) {
      setBuilderMessage("اختر بنداً واحداً على الأقل من بنود أداة التقييم في المجال المحدد.");
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
            evidenceRef: sourceId === "assessment"
              ? selectedItemLabels.join("، ")
              : sourceLabel(sourceId),
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

  function addGoal(code: DomainCode) {
    setGoals((g) => ({
      ...g,
      [code]: [...g[code], {
        id: crypto.randomUUID(), text: "", category: "",
        context: "", criterion: "", measurementMethod: "", evidenceRef: "", lifePractice: "",
      }],
    }));
  }
  function updateGoalText(code: DomainCode, gid: string, text: string) {
    setGoals((g) => ({
      ...g,
      [code]: g[code].map((x) => (x.id === gid ? { ...x, text } : x)),
    }));
  }
  function updateGoalCategory(code: DomainCode, gid: string, cat: GoalCategory | "") {
    setGoals((g) => ({
      ...g,
      [code]: g[code].map((x) => (x.id === gid ? { ...x, category: cat } : x)),
    }));
  }
  function updateGoalField(code: DomainCode, gid: string, field: keyof Goal, value: string) {
    setGoals((g) => ({
      ...g,
      [code]: g[code].map((x) => (x.id === gid ? { ...x, [field]: value } : x)),
    }));
  }
  function deleteGoal(code: DomainCode, gid: string) {
    setGoals((g) => ({ ...g, [code]: g[code].filter((x) => x.id !== gid) }));
  }
  function toggleService(s: string) {
    setServices((cur) => (cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]));
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
      [code]: g[code].map((x) => (x.id === gid
        ? { ...x, override: { reason: draft.reason, note: draft.note || undefined, at: new Date().toISOString() } }
        : x)),
    }));
    setOverrideFormFor(null);
  }

  // Only goals the specialist actually started (non-empty text) can block —
  // an empty, not-yet-written goal is never a blocker.
  const blockingGoals: { domainCode: DomainCode; domainName: string; goalId: string; text: string; missingField: MissingField }[] = [];
  for (const d of domains) {
    for (const g of goals[d.code] ?? []) {
      const quality = computeGoalQuality({
        goalText: g.text, context: g.context ?? "", criterion: g.criterion ?? "",
        measurementMethod: g.measurementMethod ?? "", evidenceRef: g.evidenceRef ?? "",
        lifePractice: g.lifePractice ?? "", domainCode: d.code,
        coverage, family, learnerVoice, override: g.override ?? null,
      });
      if (hasHardStopViolation(g.text, quality)) {
        blockingGoals.push({ domainCode: d.code, domainName: d.name, goalId: g.id, text: g.text, missingField: firstMissingField(g) });
      }
    }
  }
  const canSave = blockingGoals.length === 0;

  function handleSave() {
    if (!canSave) {
      const first = blockingGoals[0];
      setOpen((o) => ({ ...o, [first.domainCode]: true }));
      setExpandedGoals((prev) => {
        const next = new Set(prev);
        next.add(first.goalId);
        return next;
      });
      setScrollTarget({ goalId: first.goalId, field: first.missingField });
      return;
    }

    try {
      localStorage.setItem(
        `himam_iep_${id}`,
        JSON.stringify({ vision, goals, services, startDate, savedAt: new Date().toISOString() }),
      );
      const raw = localStorage.getItem("himam_students");
      if (raw) {
        const list: StoredStudent[] = JSON.parse(raw);
        const updated = list.map((s) => (s.id === id ? { ...s, status: advanceStage(s.status, "iep_completed") } : s));
        localStorage.setItem("himam_students", JSON.stringify(updated));
      }
    } catch (error) {
      console.warn("Unable to save IEP draft", error);
    }
    toast.success("تم حفظ الخطة بنجاح ✓");
    navigate({ to: "/students/$id/plan", params: { id } });
  }

  return (
    <div dir="rtl" lang="ar" style={{ minHeight: "100vh", background: "#F8F7F4", fontFamily: "system-ui, sans-serif" }}>
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
          توليد الأهداف
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
              تظهر هنا إشارات الدعم المعرفي المستخلصة من مصادر جمع المعلومات، دون أن تتحول وحدها إلى مستوى أداء أو اعتماد للخطة.
            </p>
          </div>
        </section>

        <section style={cardStyle}>
          <h2 style={sectionTitle}>منشئ الهدف التفاعلي</h2>
          <p style={{ color: "#64748B", fontSize: 13, marginTop: 4, marginBottom: 0, lineHeight: 1.8 }}>
            يمر المختص عبر مجال التقييم، ثم مصدر الهدف، ثم البنود أو الأدلة الداعمة، ثم يختار بين أسئلة توجيهية أو إضافة مباشرة. المسودة الناتجة لا تعد هدفاً معتمداً حتى تمر بمراجعة الجودة البشرية.
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 12, marginTop: 16 }}>
            <div style={builderStepStyle}>
              <div style={builderStepTitle}>1. مجال أداة التقييم</div>
              <select
                value={goalBuilder.domainCode}
                onChange={(event) => updateGoalBuilder("domainCode", event.target.value as DomainCode | "")}
                style={selectStyle}
              >
                <option value="">اختر المجال</option>
                {domains.map((domain) => (
                  <option key={domain.code} value={domain.code}>{domain.name}</option>
                ))}
              </select>
            </div>

            <div style={builderStepStyle}>
              <div style={builderStepTitle}>2. مصدر الهدف</div>
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
              <div style={builderStepTitle}>3. بنود المصدر</div>
              {goalBuilder.sourceId === "assessment" ? (
                <div style={{ maxHeight: 132, overflowY: "auto", display: "flex", flexDirection: "column", gap: 6 }}>
                  {selectedAssessmentItems.length === 0 ? (
                    <p style={{ margin: 0, color: "#94A3B8", fontSize: 12, lineHeight: 1.7 }}>
                      اختر مجالاً من أداة TTAP لعرض البنود المتاحة.
                    </p>
                  ) : selectedAssessmentItems.map((item) => (
                    <label key={item.id} style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 12, color: "#374151", lineHeight: 1.6 }}>
                      <input
                        type="checkbox"
                        checked={goalBuilder.selectedItemIds.includes(String(item.id))}
                        onChange={() => toggleBuilderItem(String(item.id))}
                        style={{ marginTop: 3 }}
                      />
                      <span>بند {item.id}: {item.name}</span>
                    </label>
                  ))}
                </div>
              ) : (
                <p style={{ margin: 0, color: "#64748B", fontSize: 12, lineHeight: 1.8 }}>
                  عند اختيار مصدر غير التقييم، يستخدم كمعلومة داعمة للأولوية والصياغة ولا يتحول تلقائياً إلى مستوى أداء.
                </p>
              )}
            </div>

            <div style={builderStepStyle}>
              <div style={builderStepTitle}>4. طريقة الصياغة</div>
              <select
                value={goalBuilder.mode}
                onChange={(event) => updateGoalBuilder("mode", event.target.value as GuidanceMode | "")}
                style={selectStyle}
                disabled={!goalBuilder.sourceId}
              >
                <option value="">اختر الطريقة</option>
                <option value="guided">الاستعانة بأسئلة توجيهية</option>
                <option value="direct">إضافة الهدف مباشرة</option>
              </select>
            </div>
          </div>

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
            <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "minmax(0, 1.15fr) minmax(300px, 0.85fr)", gap: 14 }}>
              <div style={{ border: "1px solid #E2E8F0", borderRadius: 10, padding: 12, background: "#F8FAFC" }}>
                <h3 style={{ margin: 0, color: TEAL, fontSize: 14, fontWeight: 800 }}>مسودة الهدف المجمعة تلقائياً</h3>
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
            {!loaded ? null : domains.map((d) => (
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
                    <KnowledgeSupportPanel items={knowledgeSupport} />
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

                              <div>
                                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#64748B", marginBottom: 4 }}>الدليل المرتبط</label>
                                {isTtapDomain ? (
                                  <select
                                    id={`goal-field-evidenceRef-${g.id}`}
                                    value={g.evidenceRef ?? ""}
                                    onChange={(e) => updateGoalField(d.code, g.id, "evidenceRef", e.target.value)}
                                    style={{
                                      width: "100%", padding: "8px 10px", borderRadius: 6, fontSize: 13, fontFamily: "inherit",
                                      border: `1px solid ${!g.evidenceRef && g.text.trim() ? "#DC2626" : "#E5E7EB"}`,
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
                                    id={`goal-field-evidenceRef-${g.id}`}
                                    type="text"
                                    value={g.evidenceRef ?? ""}
                                    onChange={(e) => updateGoalField(d.code, g.id, "evidenceRef", e.target.value)}
                                    placeholder="صف مصدر الدليل الداعم لهذا الهدف"
                                    style={{
                                      width: "100%", padding: "8px 10px", borderRadius: 6, fontSize: 13, fontFamily: "inherit",
                                      border: `1px solid ${!g.evidenceRef && g.text.trim() ? "#DC2626" : "#E5E7EB"}`,
                                    }}
                                  />
                                )}
                                {!g.evidenceRef && g.text.trim() && (
                                  <p style={{ margin: "4px 0 0", fontSize: 11, color: "#B91C1C", fontWeight: 600 }}>
                                    لا يمكن اعتماد الهدف دون ربطه بدليل أو مصدر داعم.
                                  </p>
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
                                    goalText: g.text, context: g.context ?? "", criterion: g.criterion ?? "",
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
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 12 }}>
            {SUPPORT_SERVICES.map((s) => {
              const checked = services.includes(s);
              return (
                <label
                  key={s}
                  style={{
                    display: "flex", alignItems: "center", gap: 10, cursor: "pointer",
                    padding: "8px 10px", border: "1px solid #E5E7EB", borderRadius: 8,
                    background: checked ? "#F1F5F4" : "white",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleService(s)}
                    style={{ width: 18, height: 18, accentColor: TEAL }}
                  />
                  <span style={{ fontSize: 15, color: "#1F2937" }}>{s}</span>
                </label>
              );
            })}
          </div>
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
            بعد حفظ الخطة، ستنتقل لاختيار الأنشطة التشاركية لكل هدف، ثم إنشاء التقرير النهائي الذي يجمع التقييم وصوت الأسرة والمتعلم والخطة التربوية.
          </span>
        </div>

        {/* Hard-stop warning */}
        {!canSave && (
          <div
            style={{
              marginTop: 20, background: "#FEF2F2", border: "1px solid #FCA5A5",
              borderRadius: 8, padding: 12, color: "#7A1F1F", fontSize: 13, lineHeight: 1.7,
            }}
          >
            <strong>لا يمكن حفظ الخطة والمتابعة حتى استكمال {blockingGoals.length} هدفًا:</strong>
            <ul style={{ margin: "6px 0 0", paddingRight: 18 }}>
              {blockingGoals.map((b, i) => (
                <li key={i}>{b.domainName} — {b.text}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Bottom button */}
        <div style={{ marginTop: 24 }}>
          <button
            type="button"
            onClick={handleSave}
            title={canSave ? undefined : "يوجد أهداف تمنع الحفظ — الضغط سينقلك إلى أول هدف يحتاج استكمالًا"}
            style={{
              width: "100%", background: canSave ? TEAL : "#D1D5DB", color: "white", border: "none",
              padding: "14px 18px", borderRadius: 10, fontWeight: 700, fontSize: 16,
              cursor: canSave ? "pointer" : "not-allowed", fontFamily: "inherit",
            }}
          >
            حفظ الخطة واختيار الأنشطة ←
          </button>
        </div>
      </main>
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
