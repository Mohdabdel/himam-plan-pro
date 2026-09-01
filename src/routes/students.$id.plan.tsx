import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { advanceStage } from "../lib/journey";
import { JourneyStepper } from "@/components/journey-stepper";
import { isMvpConceptId } from "@/data/concepts";
import {
  appendApprovalAuditEvent,
  buildApprovalAuditEvent,
  buildPlanApprovalRecord,
  buildPlanGovernanceBundle,
  clearPlanApprovalRecord,
  loadGoalApprovalBundles,
  loadPlanApprovalRecord,
  loadPlanGovernanceBundle,
  savePlanApprovalRecord,
  savePlanGovernanceBundle,
  type ApprovalActorRole,
  type PlanApprovalDecision,
  type PlanGovernanceBundle,
} from "@/lib/goal-plan-approval";
import type { PlanApprovalRecord } from "@/domain/himam";
import { calibrateMvpProfile } from "@/lib/mvp-calibration";
import { loadLearnerProfile, saveLearnerProfile } from "@/lib/profile-repository";
import {
  evaluatePlanQuality,
  type GoalPlanQualityRubricResult,
} from "@/lib/goal-quality";

export const Route = createFileRoute("/students/$id/plan")({
  component: PlanPage,
  head: () => ({
    meta: [
      { title: "الخطة النهائية — همم" },
      { name: "description", content: "اختيار الأنشطة وتأكيد الخطة النهائية." },
    ],
  }),
});

// ── Domain → Concept mapping (6 spec domains only) ───────────────────────────
const DOMAIN_CONCEPT_MAP: Record<string, string[]> = {
  VS: ["COMMUNITY", "SELF_DET"],
  VB: ["SOCIAL",    "COMMUNITY"],
  IF: ["SELF_CARE", "HEALTH"],
  LS: ["COMMUNITY", "SELF_DET"],
  FC: ["COMM",      "SOCIAL"],
  IB: ["SOCIAL",    "SAFETY"],
};

const CONCEPT_NAMES: Record<string, string> = {
  COMMUNITY:    "المشاركة المجتمعية",
  SELF_DET:     "تقرير المصير",
  SOCIAL:       "المهارات الاجتماعية",
  SELF_CARE:    "العناية الذاتية",
  HEALTH:       "الصحة والسلامة",
  COMM:         "التواصل",
  SAFETY:       "السلامة الشخصية",
};

// ── Types ─────────────────────────────────────────────────────────────────────
type StoredStudent = { id: string; name: string; center: string; tool: string; status: string; birthDate?: string };

// IEP goals may arrive in two shapes — normalised below
type RawGoalOverride = { reason: string; note?: string; at: string };
type RawGoal = {
  id?: string; text?: string; category?: string; domainCode?: string;
  // Structured fields added by the IEP goal-quality workspace — optional so
  // goals saved before that feature still normalise fine.
  context?: string; criterion?: string; measurementMethod?: string;
  goalTrigger?: string; performanceAnchor?: string;
  evidenceRef?: string; lifePractice?: string; override?: RawGoalOverride;
};
type RawIEP  = {
  goals?:
    | Record<string, RawGoal[]>   // grouped by domain code (existing format)
    | RawGoal[];                  // flat array with domainCode field
  reviewStatus?: "draft_only" | "draft_with_blocking_findings" | "ready_for_plan_review";
  draftProgressTag?: "continuable" | "blocked_until_progress_findings_resolved" | "ready_for_plan_review";
  goalApprovalIds?: string[];
};

type CoverageData = {
  failedDomains?:   string[];
  emergingDomains?: string[];
  passedDomains?:   string[];
};

// Actual family storage shape (matches family.tsx / report.tsx)
type FamilyData = {
  priorities?:      string[];
  vision5y?:        string;
};

// Learner voice is stored separately in himam_learner_voice_${id}
type LearnerVoiceData = {
  environments?: string[];
  q_love?:       string;
  q_future?:     string;
};

type GoalEntry = {
  goalId:              string;
  domainCode:          string;
  goalText:            string;
  concepts:            string[];
  priority:            "high" | "medium" | "low";
  suggestedActivities: string[];
  activityRationales:  Record<string, string>;
  selectedActivities:  string[];
  context:             string;
  specialistNote:      string;
  // Read-only, carried over from the IEP goal-quality workspace.
  iepCriterion?:          string;
  iepMeasurementMethod?:  string;
  iepGoalTrigger?:        string;
  iepPerformanceAnchor?:  string;
  iepEvidenceRef?:        string;
  iepLifePractice?:       string;
  iepOverride?:           RawGoalOverride;
  conceptLevel?:          number | null;
  conceptCalibrationStatus?: string;
};

// ── Constants ─────────────────────────────────────────────────────────────────
const TEAL   = "#0F3D3E";
const ORANGE = "#D9764A";

const PRIORITY_LABEL = { high: "أولوية عالية", medium: "أولوية متوسطة", low: "أولوية منخفضة" } as const;
const PRIORITY_COLOR = { high: "#B91C1C",       medium: "#92400E",        low: "#374151"       } as const;
const PRIORITY_BG    = { high: "#FEE2E2",        medium: "#FEF3C7",        low: "#F3F4F6"       } as const;

// Keywords that indicate a home/family preference in learner voice environments
const HOME_KEYWORDS = ["البيت", "المنزل", "مجلس", "حديقة"];

// ── Helpers ───────────────────────────────────────────────────────────────────

function safeParse<T>(key: string): T | null {
  try { return JSON.parse(localStorage.getItem(key) || "null"); }
  catch { return null; }
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

type FlatGoal = { goalId: string; domainCode: string; goalText: string; raw: RawGoal };
type CurriculumRecommender = (typeof import("@/lib/curriculum-recommendations"))["recommendCurriculumActivities"];

/** Flatten IEP goals from either storage format into a stable list. */
function normalizeGoals(raw: RawIEP | null): FlatGoal[] {
  if (!raw?.goals) return [];

  const out: FlatGoal[] = [];

  if (Array.isArray(raw.goals)) {
    // Flat array format: each item should carry domainCode
    raw.goals.forEach((g, i) => {
      const text = g.text?.trim();
      if (!text) return;
      out.push({
        goalId:     g.id ?? `goal-${i}`,
        domainCode: g.domainCode ?? "VS",
        goalText:   text,
        raw:        g,
      });
    });
  } else {
    // Grouped-by-domain format: { VS: [{ id, text, category }], ... }
    Object.entries(raw.goals).forEach(([domainCode, goals]) => {
      (goals as RawGoal[]).forEach((g, i) => {
        const text = g.text?.trim();
        if (!text) return;
        out.push({
          goalId:     g.id ?? `${domainCode}-${i}`,
          domainCode,
          goalText:   text,
          raw:        g,
        });
      });
    });
  }

  return out;
}

function buildEntry(
  flat: FlatGoal,
  coverage: CoverageData,
  defaultContext: string,
  conceptLevels: Record<string, { level: number | null; status: string }>,
  recommendCurriculumActivities: CurriculumRecommender,
): GoalEntry {
  const { goalId, domainCode, goalText, raw } = flat;
  const concepts = DOMAIN_CONCEPT_MAP[domainCode] ?? [];

  const priority: GoalEntry["priority"] =
    (coverage.failedDomains   ?? []).includes(domainCode) ? "high"   :
    (coverage.emergingDomains ?? []).includes(domainCode) ? "medium" : "low";

  const mvpConcept = concepts.find(isMvpConceptId);
  const conceptLevel = mvpConcept ? conceptLevels[mvpConcept]?.level ?? null : null;
  const conceptCalibrationStatus = mvpConcept ? conceptLevels[mvpConcept]?.status : undefined;
  const recommendations = mvpConcept
    ? recommendCurriculumActivities({
        conceptId: mvpConcept,
        goalText,
        preferredContext: raw.context || defaultContext,
        maxSuggestions: 4,
      })
    : [];
  const activityRationales: Record<string, string> = {};
  const suggestedActivities = recommendations.map((recommendation) => {
    const label = `${recommendation.competencyDescription} — ${recommendation.familyNameAr}`;
    activityRationales[label] = [
      recommendation.rationaleAr,
      recommendation.componentDescriptions.length
        ? `المكونات المدربة: ${recommendation.componentDescriptions.slice(0, 3).join("، ")}`
        : "",
      recommendation.coverageStatus
        ? `حالة التمثيل في المنهج: ${recommendation.coverageStatus}`
        : "",
    ].filter(Boolean).join(" | ");
    return label;
  });

  return {
    goalId,
    domainCode,
    goalText,
    concepts,
    priority,
    suggestedActivities,
    activityRationales,
    selectedActivities: [],
    context:            defaultContext,
    specialistNote:     "",
    iepCriterion:          raw.criterion || undefined,
    iepMeasurementMethod:  raw.measurementMethod || undefined,
    iepGoalTrigger:        raw.goalTrigger || undefined,
    iepPerformanceAnchor:  raw.performanceAnchor || raw.evidenceRef || undefined,
    iepEvidenceRef:        raw.evidenceRef || undefined,
    iepLifePractice:       raw.lifePractice || undefined,
    iepOverride:           raw.override,
    conceptLevel,
    conceptCalibrationStatus,
  };
}

// ── Component ─────────────────────────────────────────────────────────────────
function PlanPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();

  const [loaded,           setLoaded]           = useState(false);
  const [student,          setStudent]          = useState<StoredStudent | null>(null);
  const [goalEntries,      setGoalEntries]      = useState<GoalEntry[]>([]);
  const [hasGoals,         setHasGoals]         = useState(true); // optimistic; set false if IEP is empty
  const [planInputIssue,   setPlanInputIssue]   = useState<"" | "no_goals" | "no_approved_goals" | "blocked_goal_draft">("");
  const [saved,            setSaved]            = useState(false);
  const [governanceError,  setGovernanceError]  = useState("");
  const [approvedGoalCount,setApprovedGoalCount]= useState(0);
  const [planGovernance,   setPlanGovernance]   = useState<PlanGovernanceBundle | null>(null);
  const [planApproval,     setPlanApproval]     = useState<PlanApprovalRecord | null>(null);
  const [approvalDecision, setApprovalDecision] = useState<PlanApprovalDecision>("approved");
  const [reviewerRole,     setReviewerRole]     = useState<ApprovalActorRole>("SENIOR_SPECIALIST");
  const [decisionRationale,setDecisionRationale]= useState("");
  const [contextHint,      setContextHint]      = useState<{ context: string; reason: string }>({ context: "", reason: "" });
  const [familyPriorities, setFamilyPriorities] = useState<string[]>([]);
  const [learnedLove,      setLearnedLove]      = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadPlanData() {
      const { recommendCurriculumActivities } = await import("@/lib/curriculum-recommendations");
      if (cancelled) return;

      // 1. Load student
      const students = safeParse<StoredStudent[]>("himam_students");
      const s = students?.find((x) => x.id === id) ?? null;
      setStudent(s);

      // 2. Load supporting data
      const rawIEP    = safeParse<RawIEP>(`himam_iep_${id}`);
      const coverage  = safeParse<CoverageData>(`himam_coverage_${id}`) ?? {};
      const family    = safeParse<FamilyData>(`himam_family_${id}`) ?? {};
      const learnerV  = safeParse<LearnerVoiceData>(`himam_learner_voice_${id}`) ?? {};
      const goalApprovalBundles = loadGoalApprovalBundles(id);
      const approvedGoalBundles = goalApprovalBundles.filter((bundle) => bundle.approval.decision === "approved_for_plan_inclusion");
      setApprovedGoalCount(approvedGoalBundles.length);
      setPlanGovernance(loadPlanGovernanceBundle(id));
      setPlanApproval(loadPlanApprovalRecord(id));
      setPlanInputIssue("");
      const profile = s ? loadLearnerProfile(s.id) : null;
      const calibratedProfile = profile ? saveLearnerProfile(calibrateMvpProfile(profile)) : null;
      const conceptLevels = Object.fromEntries(
        Object.entries(calibratedProfile?.concepts ?? {}).map(([conceptId, concept]) => [
          conceptId,
          { level: concept.currentLevel ?? null, status: concept.calibrationStatus },
        ]),
      );

      // 3. Determine default training context from learner voice environments
      const envs = learnerV.environments ?? [];
      const prefersHome = envs.some((e) => HOME_KEYWORDS.some((k) => e.includes(k)));
      // Also check family vision for home clues
      const visionHint = family.vision5y ?? "";
      const defaultContext =
        prefersHome || HOME_KEYWORDS.some((k) => visionHint.includes(k))
          ? "البيت"
          : "المركز / المدرسة";

      // 3b. Expose context origin and voice cues to the UI
      setContextHint({
        context: defaultContext,
        reason: prefersHome
          ? "بناءً على بيئات المتعلم"
          : HOME_KEYWORDS.some((k) => visionHint.includes(k))
            ? "بناءً على رؤية الأسرة"
            : "افتراضي",
      });
      setFamilyPriorities((family.priorities ?? []).slice(0, 3));
      setLearnedLove(learnerV.q_love?.trim() ?? "");

      // 4. Normalise goals
      const flatGoals = normalizeGoals(rawIEP);
      if (flatGoals.length === 0) {
        setHasGoals(false);
        setPlanInputIssue("no_goals");
        setGoalEntries([]);
        setLoaded(true);
        return;
      }

      if (rawIEP?.draftProgressTag === "blocked_until_progress_findings_resolved") {
        setHasGoals(false);
        setPlanInputIssue("blocked_goal_draft");
        setGoalEntries([]);
        setLoaded(true);
        return;
      }

      const approvedLocalGoalIds = new Set(approvedGoalBundles.map((bundle) => bundle.localGoalId));
      const approvedFlatGoals = flatGoals.filter((goal) => approvedLocalGoalIds.has(goal.goalId));
      if (approvedFlatGoals.length === 0) {
        setHasGoals(false);
        setPlanInputIssue("no_approved_goals");
        setGoalEntries([]);
        setLoaded(true);
        return;
      }

      // 5. Build goal entries
      const entries = approvedFlatGoals.map((g) => buildEntry(g, coverage, defaultContext, conceptLevels, recommendCurriculumActivities));

      // 6. Restore saved plan selections
      const saved = safeParse<{ goals: GoalEntry[] }>(`himam_plan_${id}`);
      if (saved?.goals) {
        const savedMap = new Map(saved.goals.map((g) => [g.goalId, g]));
        for (const e of entries) {
          const prev = savedMap.get(e.goalId);
          if (prev) {
            e.selectedActivities = prev.selectedActivities ?? [];
            e.context            = prev.context            ?? e.context;
            e.specialistNote     = prev.specialistNote     ?? "";
          }
        }
      }

      // 7. Sort: high → medium → low
      const ORDER: Record<string, number> = { high: 0, medium: 1, low: 2 };
      entries.sort((a, b) => ORDER[a.priority] - ORDER[b.priority]);

      setGoalEntries(entries);
      setHasGoals(true);
      setLoaded(true);
    }

    void loadPlanData();

    return () => {
      cancelled = true;
    };
  }, [id]);

  // ── Handlers ────────────────────────────────────────────────────────────────
  function toggleActivity(goalId: string, activity: string) {
    setGoalEntries((prev) =>
      prev.map((e) =>
        e.goalId !== goalId ? e : {
          ...e,
          selectedActivities: e.selectedActivities.includes(activity)
            ? e.selectedActivities.filter((a) => a !== activity)
            : [...e.selectedActivities, activity],
        }
      )
    );
  }

  function setContext(goalId: string, ctx: string) {
    setGoalEntries((prev) =>
      prev.map((e) => (e.goalId === goalId ? { ...e, context: ctx } : e))
    );
  }

  function setNote(goalId: string, note: string) {
    setGoalEntries((prev) =>
      prev.map((e) => (e.goalId === goalId ? { ...e, specialistNote: note } : e))
    );
  }

  function handleSave() {
    const goalApprovalBundles = loadGoalApprovalBundles(id).filter((bundle) => (
      bundle.approval.decision === "approved_for_plan_inclusion"
    ));
    if (goalApprovalBundles.length === 0) {
      setGovernanceError("لا يمكن تجهيز مسودة الخطة دون أهداف معتمدة كوحدات. ارجع إلى شاشة الأهداف واحفظها لاعتمادها للإدراج.");
      return;
    }

    // Small completion signal — lets report.tsx (and the journey stage
    // below) tell whether the specialist actually selected real-context
    // activities, vs. just visiting/saving the page with nothing checked.
    // Named planRecordStatus (not `status`) to avoid shadowing the ambient
    // DOM global `window.status`, which TypeScript resolves silently.
    const planRecordStatus = goalEntries.some((g) => g.selectedActivities.length > 0)
      ? "activities_selected"
      : "no_activities";

    try {
      const governanceBundle = buildPlanGovernanceBundle({
        learnerId: id,
        goalApprovalIds: goalApprovalBundles.map((bundle) => bundle.approval.approvalId),
        planPeriodStart: new Date().toISOString().slice(0, 10),
        findings: [
          `تتضمن المسودة ${goalApprovalBundles.length} هدفاً معتمداً للإدراج.`,
          goalEntries.some((g) => g.selectedActivities.length > 0)
            ? "تم اختيار أنشطة تنفيذية لبعض الأهداف."
            : "لم تختر أنشطة تنفيذية بعد؛ تبقى الخطة قابلة للمراجعة وليست نهائية.",
          "لا تعتبر الخطة معتمدة نهائياً إلا بعد قرار المراجع الأعلى المصرح له.",
        ],
      });
      savePlanGovernanceBundle(id, governanceBundle);
      clearPlanApprovalRecord(id);
      appendApprovalAuditEvent(buildApprovalAuditEvent({
        learnerId: id,
        actorRole: "SPECIALIST",
        action: "CREATE_PLAN_DRAFT",
        targetRecordType: "PlanDraft",
        targetRecordId: governanceBundle.planDraft.planDraftId,
        decision: governanceBundle.planDraft.status,
        decisionRationale: "حفظ المختص مسودة خطة مبنية من أهداف معتمدة كوحدات.",
      }));
      appendApprovalAuditEvent(buildApprovalAuditEvent({
        learnerId: id,
        actorRole: "SPECIALIST",
        action: "CREATE_PLAN_DRAFT",
        targetRecordType: "PlanQualityReview",
        targetRecordId: governanceBundle.qualityReview.reviewId,
        decision: governanceBundle.qualityReview.status,
        decisionRationale: governanceBundle.qualityReview.findings.join(" | "),
      }));
      setPlanGovernance(governanceBundle);
      setPlanApproval(null);
      setApprovedGoalCount(goalApprovalBundles.length);
      localStorage.setItem(`himam_plan_${id}`, JSON.stringify({
        learnerId:   id,
        generatedAt: new Date().toISOString(),
        goals:       goalEntries,
        status:      planRecordStatus,
        planDraftId: governanceBundle.planDraft.planDraftId,
        planQualityReviewId: governanceBundle.qualityReview.reviewId,
        goalApprovalIds: goalApprovalBundles.map((bundle) => bundle.approval.approvalId),
      }));
      setGovernanceError("");
      setSaved(true);
    } catch { /* noop */ }

    try {
      // report_ready (not just plan_completed) once real activities are
      // selected — that's the point the report stops showing its warning.
      const journeyStage = planRecordStatus === "activities_selected" ? "report_ready" : "plan_completed";
      const raw = localStorage.getItem("himam_students");
      if (raw) {
        const list: StoredStudent[] = JSON.parse(raw);
        const updated = list.map((s) => (s.id === id ? { ...s, status: advanceStage(s.status, journeyStage) } : s));
        localStorage.setItem("himam_students", JSON.stringify(updated));
      }
    } catch { /* noop */ }
  }

  function handlePlanApproval() {
    const governance = planGovernance ?? loadPlanGovernanceBundle(id);
    if (!governance) {
      setGovernanceError("احفظ مسودة الخطة أولاً قبل إصدار قرار الاعتماد الأعلى.");
      return;
    }
    const goalApprovalBundles = loadGoalApprovalBundles(id).filter((bundle) => (
      bundle.approval.decision === "approved_for_plan_inclusion"
    ));
    if (approvalDecision === "approved" && goalApprovalBundles.length === 0) {
      setGovernanceError("لا يمكن اعتماد الخطة دون أهداف معتمدة للإدراج.");
      return;
    }
    if (!decisionRationale.trim()) {
      setGovernanceError("اكتب مبرر قرار الاعتماد أو الإرجاع قبل حفظ القرار.");
      return;
    }

    try {
      const approval = buildPlanApprovalRecord({
        learnerId: id,
        planDraftId: governance.planDraft.planDraftId,
        planQualityReviewId: governance.qualityReview.reviewId,
        approvedGoalApprovalIds: goalApprovalBundles.map((bundle) => bundle.approval.approvalId),
        decision: approvalDecision,
        decidedByRole: reviewerRole,
        decisionRationale: decisionRationale.trim(),
      });
      savePlanApprovalRecord(id, approval);
      appendApprovalAuditEvent(buildApprovalAuditEvent({
        learnerId: id,
        actorRole: reviewerRole,
        action: "CREATE_PLAN_APPROVAL",
        targetRecordType: "PlanApprovalRecord",
        targetRecordId: approval.approvalId,
        decision: approval.decision,
        decisionRationale: approval.decisionRationale,
      }));
      setPlanApproval(approval);
      setPlanGovernance({ ...governance, planApproval: approval });
      setGovernanceError("");

      const raw = localStorage.getItem("himam_students");
      if (raw && approval.decision === "approved") {
        const list: StoredStudent[] = JSON.parse(raw);
        const updated = list.map((s) => (s.id === id ? { ...s, status: advanceStage(s.status, "plan_approved") } : s));
        localStorage.setItem("himam_students", JSON.stringify(updated));
      }
    } catch (error) {
      setGovernanceError(error instanceof Error ? error.message : "تعذر حفظ قرار اعتماد الخطة.");
    }
  }

  // ── Missing learner fallback ─────────────────────────────────────────────────
  if (loaded && !student) {
    return (
      <div dir="rtl" lang="ar" style={{ minHeight: "100vh", background: "#FAF7F2", fontFamily: "system-ui, sans-serif" }}>
        <header style={{ background: TEAL, color: "white", padding: "14px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 22, fontWeight: 700 }}>همم</div>
          <Link to="/" style={{ color: "white", textDecoration: "none", fontSize: 14, padding: "8px 14px", border: "1px solid rgba(255,255,255,0.4)", borderRadius: 8 }}>
            → رجوع للداشبورد
          </Link>
        </header>
        <div style={{ maxWidth: 480, margin: "80px auto", textAlign: "center", padding: "0 20px" }}>
          <p style={{ fontSize: 18, fontWeight: 700, color: "#374151" }}>لم يُعثر على بيانات هذا المتعلم</p>
          <p style={{ fontSize: 14, color: "#9CA3AF", marginTop: 8 }}>قد يكون السجل محذوفاً أو الرابط غير صحيح.</p>
          <Link
            to="/"
            style={{ display: "inline-block", marginTop: 24, background: TEAL, color: "white", textDecoration: "none", padding: "12px 28px", borderRadius: 8, fontWeight: 700 }}
          >
            → العودة إلى لوحة التحكم
          </Link>
        </div>
      </div>
    );
  }

  // ── No goals fallback ────────────────────────────────────────────────────────
  const showPlanInputGate = loaded && !hasGoals;
  const planInputGateContent = planInputIssue === "blocked_goal_draft"
    ? {
        title: "مسودة الأهداف غير قابلة للتقدم",
        message: "توجد موانع جودة في مسودة الأهداف. لا يمكن بناء مسودة الخطة أو إصدار تقرير توصيات نهائي قبل استيفاء الموانع.",
        action: "مراجعة موانع الأهداف",
      }
    : planInputIssue === "no_approved_goals"
      ? {
          title: "لا توجد أهداف معتمدة للإدراج",
          message: "توجد أهداف أو مسودات، لكنها لم تنتقل بعد عبر إقرار المختص كأهداف صالحة للإدراج في الخطة.",
          action: "إقرار الأهداف للإدراج",
        }
      : {
          title: "لم تُدخَل أهداف بعد",
          message: "يجب إدخال الأهداف التربوية أولاً لتتمكن من بناء مسودة الخطة.",
          action: "إدخال الأهداف",
        };
  const learnerAgeYears = ageYearsFromBirthDate(student?.birthDate);
  const planQuality = evaluatePlanQuality({
    approvedGoalCount,
    learnerAgeYears,
    goals: goalEntries.map((entry) => ({
      goalId: entry.goalId,
      goalText: entry.goalText,
      goalTrigger: entry.iepGoalTrigger ?? "",
      performanceAnchor: entry.iepPerformanceAnchor ?? entry.iepEvidenceRef ?? "",
      context: entry.context,
      criterion: entry.iepCriterion ?? "",
      measurementMethod: entry.iepMeasurementMethod ?? "",
      evidenceRef: entry.iepEvidenceRef ?? "",
      lifePractice: entry.iepLifePractice ?? "",
      domainCode: entry.domainCode,
      coverage: null,
      family: { priorities: familyPriorities },
      learnerVoice: { q_love: learnedLove },
      override: entry.iepOverride ?? null,
      selectedActivityCount: entry.selectedActivities.length,
      approvedForPlan: approvedGoalCount > 0,
    })),
  });

  // ── Main render ──────────────────────────────────────────────────────────────
  return (
    <div dir="rtl" lang="ar" style={{ minHeight: "100vh", background: "#FAF7F2", fontFamily: "system-ui, sans-serif" }}>

      {/* Header */}
      <header style={{ background: TEAL, color: "white", padding: "14px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontSize: 22, fontWeight: 700 }}>همم</div>
        <div style={{ display: "flex", gap: 10 }}>
          <Link
            to="/students/$id/iep"
            params={{ id }}
            style={{ color: "white", textDecoration: "none", fontSize: 14, padding: "8px 14px", border: "1px solid rgba(255,255,255,0.4)", borderRadius: 8 }}
          >
            → رجوع للخطة التربوية
          </Link>
          <Link
            to="/students/$id/report"
            params={{ id }}
            style={{ background: ORANGE, color: "white", textDecoration: "none", fontSize: 14, padding: "8px 14px", borderRadius: 8, fontWeight: 700 }}
          >
            التقرير
          </Link>
        </div>
      </header>

      <main style={{ maxWidth: 900, margin: "0 auto", padding: "28px 20px 60px" }}>
        <nav
          aria-label="مسار الصفحة"
          style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", fontSize: 12, color: "#94A3B8", marginBottom: 10 }}
        >
          <Link to="/" style={{ color: "#64748B", textDecoration: "underline", fontWeight: 700 }}>لوحة المتعلمين</Link>
          <span>←</span>
          <span>{student?.name ?? "الطالب"}</span>
          <span>←</span>
          <span style={{ color: TEAL, fontWeight: 700 }}>الخطة</span>
        </nav>

        <JourneyStepper studentId={id} currentStep="plan" status={student?.status} />

        <h1 style={{ fontSize: 26, fontWeight: 800, color: TEAL, margin: 0 }}>اختيار الأنشطة والخطة النهائية</h1>
        <p style={{ marginTop: 6, color: "#475569", fontSize: 15 }}>{student?.name ?? "—"}</p>

        {/* ── Plan context strip ────────────────────────────────────────────── */}
        {loaded && hasGoals && (
          <div style={{ marginTop: 20, background: "#F0F9F8", border: "1px solid #B2D8D8", borderRadius: 10, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
            {/* Context origin */}
            {contextHint.reason && (
              <p style={{ margin: 0, fontSize: 13, color: TEAL }}>
                <strong>السياق الافتراضي:</strong> {contextHint.context} — {contextHint.reason}
              </p>
            )}
            {/* Family top priorities */}
            {familyPriorities.length > 0 && (
              <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                <span style={{ fontSize: 13, color: "#64748B", flexShrink: 0 }}>أولويات الأسرة:</span>
                {familyPriorities.map((p) => (
                  <span key={p} style={{ fontSize: 12, padding: "2px 10px", borderRadius: 12, background: "#E6F2F1", color: TEAL, fontWeight: 600 }}>
                    {p}
                  </span>
                ))}
              </div>
            )}
            {/* Learner love cue */}
            {learnedLove && (
              <p style={{ margin: 0, fontSize: 13, color: "#374151" }}>
                ❤️ <strong>ماذا يحب المتعلم:</strong> {learnedLove}
              </p>
            )}
            {/* Live completion counter */}
            <p style={{ margin: 0, fontSize: 13, color: "#475569" }}>
              <strong style={{ color: TEAL }}>{goalEntries.filter((e) => e.selectedActivities.length > 0).length}</strong>
              {" "}من{" "}
              <strong style={{ color: TEAL }}>{goalEntries.length}</strong>
              {" "}أهداف بها أنشطة محددة
            </p>
          </div>
        )}

        {loaded && hasGoals && (
          <div style={{ marginTop: 14, background: "#FFFBEB", border: "1px solid #FCD34D", borderRadius: 10, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
            <p style={{ margin: 0, fontSize: 13, color: "#78350F", fontWeight: 800 }}>حوكمة الخطة</p>
            <p style={{ margin: 0, fontSize: 13, color: "#475569", lineHeight: 1.7 }}>
              الأهداف المعتمدة للإدراج: <strong style={{ color: TEAL }}>{approvedGoalCount}</strong>
              {planGovernance
                ? ` - مسودة الخطة ${planGovernance.planDraft.status === "ready_for_review" ? "جاهزة للمراجعة الأعلى" : "مسودة"}`
                : " - لم تحفظ مسودة الخطة بعد"}
              {planApproval ? ` - قرار الخطة: ${planApproval.decision === "approved" ? "معتمدة" : planApproval.decision === "returned_for_revision" ? "معادة للتعديل" : "مرفوضة"}` : ""}
            </p>
            {!planApproval && (
              <p style={{ margin: 0, fontSize: 12, color: "#92400E", lineHeight: 1.7 }}>
                بعد حفظ مسودة الخطة، يصدر المختص الأعلى قرار الاعتماد من القسم أسفل الصفحة.
              </p>
            )}
          </div>
        )}

        {loaded && hasGoals && <PlanQualitySummary result={planQuality} />}

        {/* Plan input readiness gate */}
        {showPlanInputGate && (
          <div style={{ marginTop: 40, textAlign: "center", padding: 40, background: "white", borderRadius: 12, border: "1px solid #E5E7EB" }}>
            <p style={{ fontSize: 16, fontWeight: 700, color: "#374151", margin: 0 }}>{planInputGateContent.title}</p>
            <p style={{ fontSize: 14, marginTop: 8, color: "#9CA3AF" }}>
              {planInputGateContent.message}
            </p>
            <Link
              to="/students/$id/iep/goals"
              params={{ id }}
              style={{ display: "inline-block", marginTop: 20, background: TEAL, color: "white", textDecoration: "none", padding: "10px 24px", borderRadius: 8, fontWeight: 700 }}
            >
              → {planInputGateContent.action}
            </Link>
          </div>
        )}

        {/* Goal cards */}
        {goalEntries.map((entry) => (
          <div
            key={entry.goalId}
            style={{ marginTop: 24, background: "white", border: "1px solid #E5E7EB", borderRadius: 14, overflow: "hidden" }}
          >
            {/* Card header */}
            <div style={{ padding: "14px 18px", borderBottom: "1px solid #F3F4F6" }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 6 }}>
                <span style={{
                  fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20,
                  background: PRIORITY_BG[entry.priority], color: PRIORITY_COLOR[entry.priority],
                }}>
                  {PRIORITY_LABEL[entry.priority]}
                </span>
                <span style={{ fontSize: 11, color: "#94A3B8", background: "#F1F5F9", padding: "3px 8px", borderRadius: 20 }}>
                  {entry.domainCode}
                </span>
              </div>
              <p style={{ fontSize: 16, fontWeight: 600, color: "#1F2937", margin: 0 }}>{entry.goalText}</p>
            </div>

            <div style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 18 }}>

              {/* IEP structured details — read-only, carried from the goal-quality workspace */}
              {(entry.iepCriterion || entry.iepMeasurementMethod || entry.iepGoalTrigger || entry.iepPerformanceAnchor || entry.iepEvidenceRef || entry.iepLifePractice || entry.iepOverride) && (
                <div style={{ background: "#F8FAFC", border: "1px solid #E5E7EB", borderRadius: 8, padding: 12, display: "flex", flexDirection: "column", gap: 4 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: "#94A3B8", margin: "0 0 2px" }}>من الخطة التربوية</p>
                  {entry.iepGoalTrigger && <p style={{ fontSize: 13, margin: 0, color: "#374151" }}><strong>باعث الهدف:</strong> {entry.iepGoalTrigger}</p>}
                  {entry.iepPerformanceAnchor && <p style={{ fontSize: 13, margin: 0, color: "#374151" }}><strong>مرتكز الأداء / الخط القاعدي:</strong> {entry.iepPerformanceAnchor}</p>}
                  {entry.iepCriterion && <p style={{ fontSize: 13, margin: 0, color: "#374151" }}><strong>المعيار:</strong> {entry.iepCriterion}</p>}
                  {entry.iepMeasurementMethod && <p style={{ fontSize: 13, margin: 0, color: "#374151" }}><strong>طريقة القياس:</strong> {entry.iepMeasurementMethod}</p>}
                  {entry.iepEvidenceRef && entry.iepEvidenceRef !== entry.iepPerformanceAnchor && <p style={{ fontSize: 13, margin: 0, color: "#374151" }}><strong>الدليل المرتبط:</strong> {entry.iepEvidenceRef}</p>}
                  {entry.iepLifePractice && <p style={{ fontSize: 13, margin: 0, color: "#374151" }}><strong>ممارسة حياتية مرتبطة:</strong> {entry.iepLifePractice}</p>}
                  {entry.iepOverride && (
                    <p style={{ fontSize: 12, margin: "4px 0 0", color: "#92400E", fontWeight: 700 }}>
                      ⚠ هدف بتجاوز مهني موثّق — {entry.iepOverride.reason}
                    </p>
                  )}
                </div>
              )}

              {/* Concept chips — read-only */}
              {entry.concepts.length > 0 && (
                <div>
                  <p style={{ fontSize: 12, fontWeight: 600, color: "#94A3B8", margin: "0 0 8px" }}>المفاهيم المرتبطة</p>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {entry.concepts.map((c) => (
                    <span key={c} style={{ fontSize: 12, padding: "4px 12px", borderRadius: 20, background: "#E6F2F1", color: TEAL, fontWeight: 600 }}>
                      {CONCEPT_NAMES[c] ?? c}
                    </span>
                  ))}
                  {entry.conceptLevel && (
                    <span style={{ fontSize: 12, padding: "4px 12px", borderRadius: 20, background: "#F8FAFC", color: "#475569", fontWeight: 700 }}>
                      مستوى مبدئي {entry.conceptLevel} · {entry.conceptCalibrationStatus === "final" ? "نهائي" : "مبدئي"}
                    </span>
                  )}
                </div>
              </div>
            )}

              {/* Activity checkboxes */}
              {entry.suggestedActivities.length > 0 && (
                <div>
                  <p style={{ fontSize: 12, fontWeight: 600, color: "#94A3B8", margin: "0 0 8px" }}>الأنشطة المقترحة</p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {entry.suggestedActivities.map((act) => {
                      const checked = entry.selectedActivities.includes(act);
                      return (
                        <label
                          key={act}
                          style={{
                            display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer",
                            padding: "10px 12px",
                            border: `1px solid ${checked ? TEAL : "#E5E7EB"}`,
                            borderRadius: 8,
                            background: checked ? "#E6F2F1" : "white",
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleActivity(entry.goalId, act)}
                            style={{ marginTop: 2, width: 16, height: 16, accentColor: TEAL, flexShrink: 0 }}
                          />
                          <span style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                            <span style={{ fontSize: 14, color: "#374151" }}>{act}</span>
                            {entry.activityRationales?.[act] && (
                              <span style={{ fontSize: 11, lineHeight: 1.6, color: "#64748B" }}>
                                {entry.activityRationales[act]}
                              </span>
                            )}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Context dropdown */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#94A3B8", display: "block", marginBottom: 6 }}>
                  سياق التدريب المقترح
                </label>
                <select
                  value={entry.context}
                  onChange={(e) => setContext(entry.goalId, e.target.value)}
                  style={{ width: "100%", padding: "10px 12px", border: "1px solid #E5E7EB", borderRadius: 8, fontSize: 14, fontFamily: "inherit", color: "#374151", background: "white" }}
                >
                  <option value="البيت">البيت</option>
                  <option value="المركز / المدرسة">المركز / المدرسة</option>
                  <option value="المجتمع">المجتمع (المسجد، دار الحي، الحديقة)</option>
                  <option value="مجلس العائلة">مجلس العائلة</option>
                </select>
              </div>

              {/* Specialist note */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#94A3B8", display: "block", marginBottom: 6 }}>
                  ملاحظة الأخصائي (اختياري)
                </label>
                <textarea
                  value={entry.specialistNote}
                  onChange={(e) => setNote(entry.goalId, e.target.value)}
                  placeholder="أضف ملاحظة..."
                  rows={2}
                  style={{ width: "100%", padding: "10px 12px", border: "1px solid #E5E7EB", borderRadius: 8, fontSize: 14, fontFamily: "inherit", resize: "vertical", boxSizing: "border-box" }}
                />
              </div>
            </div>
          </div>
        ))}

        {/* Save actions */}
        {goalEntries.length > 0 && (
          <div style={{ marginTop: 32 }}>
            {saved && (
              <div style={{ marginBottom: 12, padding: "10px 16px", background: "#F0FDF4", border: "1px solid #86EFAC", borderRadius: 8, color: "#166534", fontSize: 14, fontWeight: 600 }}>
                ✓ تم حفظ مسودة الخطة وتجهيزها للمراجعة الأعلى
              </div>
            )}
            {governanceError && (
              <div style={{ marginBottom: 12, padding: "10px 16px", background: "#FEF2F2", border: "1px solid #FCA5A5", borderRadius: 8, color: "#991B1B", fontSize: 14, fontWeight: 700, lineHeight: 1.7 }}>
                {governanceError}
              </div>
            )}
          <section style={{ marginBottom: 12, padding: 16, background: "white", border: "1px solid #E5E7EB", borderRadius: 12 }}>
            <p style={{ margin: 0, color: TEAL, fontSize: 15, fontWeight: 800 }}>اعتماد المختص الأعلى للخطة</p>
            <p style={{ margin: "6px 0 12px", color: "#64748B", fontSize: 13, lineHeight: 1.7 }}>
              يراجع المختص الأعلى الأهداف كوحدات والخطة ككل. لا تصبح الخطة نهائية إلا بعد حفظ قرار اعتماد الخطة.
            </p>

            {planApproval ? (
              <div style={{ background: planApproval.decision === "approved" ? "#F0FDF4" : "#FFFBEB", border: `1px solid ${planApproval.decision === "approved" ? "#86EFAC" : "#FCD34D"}`, borderRadius: 8, padding: 12 }}>
                <p style={{ margin: 0, color: planApproval.decision === "approved" ? "#166534" : "#78350F", fontSize: 14, fontWeight: 800 }}>
                  القرار محفوظ: {planApproval.decision === "approved" ? "اعتماد الخطة" : planApproval.decision === "returned_for_revision" ? "إرجاع للتعديل" : "رفض الخطة"}
                </p>
                <p style={{ margin: "6px 0 0", color: "#475569", fontSize: 13, lineHeight: 1.7 }}>
                  المراجع: {planApproval.decidedByRole} - المبرر: {planApproval.decisionRationale}
                </p>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 12 }}>
                <div>
                  <label style={{ display: "block", marginBottom: 6, color: "#64748B", fontSize: 12, fontWeight: 700 }}>قرار المراجعة</label>
                  <select
                    value={approvalDecision}
                    onChange={(event) => setApprovalDecision(event.target.value as PlanApprovalDecision)}
                    style={{ width: "100%", padding: "10px 12px", border: "1px solid #E5E7EB", borderRadius: 8, fontSize: 14, fontFamily: "inherit", background: "white" }}
                  >
                    <option value="approved">اعتماد الخطة</option>
                    <option value="returned_for_revision">إرجاع للتعديل</option>
                    <option value="rejected">رفض الخطة</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: 6, color: "#64748B", fontSize: 12, fontWeight: 700 }}>دور المراجع</label>
                  <select
                    value={reviewerRole}
                    onChange={(event) => setReviewerRole(event.target.value as ApprovalActorRole)}
                    style={{ width: "100%", padding: "10px 12px", border: "1px solid #E5E7EB", borderRadius: 8, fontSize: 14, fontFamily: "inherit", background: "white" }}
                  >
                    <option value="SENIOR_SPECIALIST">مختص أعلى</option>
                    <option value="PROGRAM_ADMIN">إدارة البرنامج</option>
                  </select>
                </div>
                <div style={{ alignSelf: "end" }}>
                  <button
                    type="button"
                    onClick={handlePlanApproval}
                    style={{ width: "100%", background: TEAL, color: "white", border: "none", padding: "11px 14px", borderRadius: 8, fontWeight: 800, fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}
                  >
                    حفظ قرار الخطة
                  </button>
                </div>
                <div style={{ gridColumn: "1 / -1" }}>
                  <label style={{ display: "block", marginBottom: 6, color: "#64748B", fontSize: 12, fontWeight: 700 }}>مبرر القرار</label>
                  <textarea
                    value={decisionRationale}
                    onChange={(event) => setDecisionRationale(event.target.value)}
                    rows={3}
                    placeholder="اكتب سبب الاعتماد أو الإرجاع للتعديل بناءً على مراجعة الأهداف والخطة ككل."
                    style={{ width: "100%", padding: "10px 12px", border: "1px solid #E5E7EB", borderRadius: 8, fontSize: 14, fontFamily: "inherit", resize: "vertical", boxSizing: "border-box" }}
                  />
                </div>
              </div>
            )}
          </section>
          <button
            type="button"
            onClick={handleSave}
            style={{ width: "100%", background: TEAL, color: "white", border: "none", padding: "14px", borderRadius: 10, fontWeight: 700, fontSize: 16, cursor: "pointer", fontFamily: "inherit" }}
          >
            حفظ الخطة وتجهيز التنفيذ ←
          </button>
          <button
            type="button"
            onClick={() => navigate({ to: "/students/$id/report", params: { id } })}
            style={{ width: "100%", marginTop: 10, background: "white", color: TEAL, border: `1px solid ${TEAL}`, padding: "12px", borderRadius: 10, fontWeight: 600, fontSize: 15, cursor: "pointer", fontFamily: "inherit" }}
          >
            عرض التقرير الشامل
          </button>
          <button
            type="button"
            onClick={() => navigate({ to: "/students/$id/implementation", params: { id } })}
            style={{ width: "100%", marginTop: 10, background: "white", color: TEAL, border: `1px solid ${TEAL}`, padding: "12px", borderRadius: 10, fontWeight: 600, fontSize: 15, cursor: "pointer", fontFamily: "inherit" }}
          >
            تسجيل التدريب والشواهد
          </button>
        </div>
      )}
      </main>
    </div>
  );
}

function PlanQualitySummary({ result }: { result: GoalPlanQualityRubricResult }) {
  const firstFindings = [
    ...result.blockingFindings,
    ...result.warnings,
    ...result.advisories,
  ].slice(0, 5);
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
    <section style={{ marginTop: 14, background, border: `1px solid ${border}`, borderRadius: 10, padding: "14px 16px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
        <p style={{ margin: 0, color, fontSize: 15, fontWeight: 800 }}>Rubric مراجعة الخطة كوحدة</p>
        <span style={{ color, fontSize: 12, fontWeight: 800 }}>
          مانع {result.blockingFindings.length} / تنبيه {result.warnings.length} / إرشاد {result.advisories.length}
        </span>
      </div>
      <p style={{ margin: "7px 0 0", color, fontSize: 13, lineHeight: 1.7 }}>{result.reviewSummaryAr}</p>
      {firstFindings.length > 0 && (
        <ul style={{ margin: "8px 0 0", paddingRight: 18, color, fontSize: 12, lineHeight: 1.8 }}>
          {firstFindings.map((item) => (
            <li key={item.id}>{item.messageAr}</li>
          ))}
        </ul>
      )}
      <p style={{ margin: "8px 0 0", color: "#64748B", fontSize: 11, lineHeight: 1.6 }}>
        هذا الملخص لا يعتمد الخطة ولا يمنح درجة رقمية؛ يستخدمه المختص الأعلى لمراجعة الاتساق قبل قرار الاعتماد.
      </p>
    </section>
  );
}
