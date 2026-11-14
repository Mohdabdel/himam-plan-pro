import { getConceptNameAr, isMvpConceptId } from "@/data/concepts";
import { recommendCurriculumActivities } from "@/lib/curriculum-recommendations";
import {
  assessmentPriorityRefsForDomain,
  contextFromProfile,
  fidelityKindFromRating,
  proposalReasoning,
} from "@/lib/goal-reasoning-rules.mjs";
import type { ProcessedCurrentLevelRow } from "@/lib/current-level-draft";
import type {
  AssessmentRecord,
  ConceptId,
  LearnerProfileProcessingModel,
  ProfileGoalOpportunity,
} from "@/types/himam";

export type GoalOpportunityMode = "performance_based" | "transition_based" | "vision_based" | "blended";
export type GoalReadiness = "ready" | "improvable" | "needs_evidence" | "needs_preparatory_goal";

export type GoalOpportunityCard = {
  id: string;
  mode: GoalOpportunityMode;
  domainCode: string;
  domainNameAr: string;
  skillAr: string;
  baselineAr: string;
  triggerAr: string;
  rationaleAr: string;
  transitionLinkAr: string;
  curriculumLinkAr?: string;
  readiness: GoalReadiness;
  blockersAr: string[];
  sourceLabelsAr: string[];
  priority: "high" | "medium" | "low";
  assessmentPriorityRefs: string[];
  assessmentFindingKind: "strength" | "emerging" | "need" | "unknown";
  assessmentFindingAr?: string;
  environmentContextsAr: string[];
  supportConditionsAr: string[];
};

export type GoalProposal = {
  id: string;
  opportunityId: string;
  variant: "near_current_performance" | "functional_transition" | "preparatory";
  titleAr: string;
  textAr: string;
  contextAr: string;
  criterionAr: string;
  measurementType: string;
  measurementMethodAr: string;
  assessmentPriorityRefs: string[];
  evidenceRefAr: string;
  goalTriggerAr: string;
  lifePracticeAr: string;
  readiness: GoalReadiness;
  whyAr: string;
  detailsAr: string[];
};

const DOMAIN_CONCEPT_MAP: Record<string, ConceptId[]> = {
  VS: ["COMMUNITY", "SELF_DET"],
  VB: ["SOCIAL", "COMMUNITY"],
  IF: ["SELF_CARE", "HEALTH"],
  LS: ["COMMUNITY", "SELF_DET"],
  FC: ["COMM", "SOCIAL"],
  IB: ["SOCIAL", "SAFETY"],
  COG: ["ACADEMIC"],
  COM: ["COMM"],
  SOC: ["SOCIAL"],
  ADL: ["SELF_CARE"],
  VOC: ["COMMUNITY"],
  MOT: ["MOBILITY"],
};

function compact(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

function firstLine(text: string) {
  return compact(text.split(/\n+/).find(Boolean) ?? text);
}

function truncate(text: string, max = 150) {
  const value = compact(text);
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

function conceptIdsForDomain(input: {
  domainCode: string;
  domainNameAr: string;
  assessmentRecords: AssessmentRecord[];
}): ConceptId[] {
  const fromAssessment = input.assessmentRecords.flatMap((record) => (
    record.domains
      .filter((domain) => (
        domain.domainCode === input.domainCode ||
        domain.domainNameAr === input.domainNameAr
      ))
      .flatMap((domain) => domain.linkedConcepts)
  ));
  return Array.from(new Set(fromAssessment.length ? fromAssessment : DOMAIN_CONCEPT_MAP[input.domainCode] ?? []));
}

function conceptLabel(conceptIds: ConceptId[]) {
  if (conceptIds.length === 0) return "مجال وظيفي/تعليمي مرتبط";
  return conceptIds.map(getConceptNameAr).join("، ");
}

function transitionLinkFor(input: { ageYears?: number | null; conceptIds: ConceptId[] }) {
  const label = conceptLabel(input.conceptIds);
  if ((input.ageYears ?? 0) >= 14) {
    return `يرتبط بتخطيط انتقال ملائم للعمر ضمن ${label}.`;
  }
  return `يرتبط بمسار تعلم وظيفي مبكر ضمن ${label}.`;
}

function curriculumLinkFor(conceptIds: ConceptId[], skillAr: string, contextAr: string) {
  const mvpConcept = conceptIds.find(isMvpConceptId);
  if (!mvpConcept) return undefined;
  const [suggestion] = recommendCurriculumActivities({
    conceptId: mvpConcept,
    goalText: skillAr,
    preferredContext: contextAr,
    maxSuggestions: 1,
  });
  if (!suggestion) return undefined;
  return `${suggestion.familyNameAr}: ${suggestion.competencyDescription}`;
}

function assessmentContextForDomain(input: {
  domainCode: string;
  domainNameAr: string;
  assessmentRecords: AssessmentRecord[];
}) {
  const record = [...input.assessmentRecords]
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .find((item) => item.domains.some((domain) => (
      domain.domainCode === input.domainCode || domain.domainNameAr === input.domainNameAr
    )));
  const domain = record?.domains.find((item) => (
    item.domainCode === input.domainCode || item.domainNameAr === input.domainNameAr
  ));
  const priorityRefs = assessmentPriorityRefsForDomain(
    input.assessmentRecords,
    input.domainCode,
    input.domainNameAr,
  ).map((item) => item.ref);
  return {
    priorityRefs,
    findingKind: fidelityKindFromRating(domain?.rating ?? "not_observed"),
    findingAr: domain?.note?.trim() || "",
  };
}

function profileContextForConcepts(
  profileProcessing: LearnerProfileProcessingModel,
  conceptIds: ConceptId[],
) {
  const related = profileProcessing.componentMatrix.elements.filter((element) => (
    element.conceptIds.some((conceptId) => conceptIds.includes(conceptId))
  ));
  return {
    environmentContextsAr: related
      .filter((element) => element.componentId === "environment_context")
      .map((element) => element.summaryAr),
    supportConditionsAr: related
      .filter((element) => element.componentId === "support_context")
      .map((element) => element.summaryAr),
  };
}

function priorityFromRow(row: ProcessedCurrentLevelRow): "high" | "medium" | "low" {
  if (row.evidenceCount > 0 && row.goalOpportunityCount > 0) return "high";
  if (row.priorityCount > 0 || row.supportConditionCount > 0 || row.needs) return "medium";
  return "low";
}

function readinessFor(input: { baselineAr: string; blockersAr: string[]; priority: "high" | "medium" | "low" }): GoalReadiness {
  if (!input.baselineAr.trim()) return "needs_evidence";
  if (input.blockersAr.length > 0) return "improvable";
  if (input.priority === "low") return "needs_preparatory_goal";
  return "ready";
}

function skillFromCurrentLevel(row: ProcessedCurrentLevelRow) {
  const need = firstLine(row.needs);
  if (need) return truncate(need.replace(/^.+?:\s*/, ""), 90);
  const strength = firstLine(row.strengths);
  if (strength) return truncate(`تعميق ${strength.replace(/^.+?:\s*/, "")}`, 90);
  return `مهارة ضمن ${row.domainNameAr}`;
}

function baselineFromCurrentLevel(row: ProcessedCurrentLevelRow) {
  const parts = [
    row.sourceSummaryAr,
    row.needs ? `احتياج: ${firstLine(row.needs)}` : "",
    row.strengths ? `قوة: ${firstLine(row.strengths)}` : "",
  ].filter(Boolean);
  return truncate(parts.join(" | "), 260);
}

function triggerFromProfileOpportunity(opportunity: ProfileGoalOpportunity) {
  return truncate(`${opportunity.titleAr}: ${opportunity.rationaleAr}`, 180);
}

export function buildGoalOpportunityCards(input: {
  currentLevelRows: ProcessedCurrentLevelRow[];
  assessmentRecords: AssessmentRecord[];
  profileProcessing: LearnerProfileProcessingModel;
  planVisionAr?: string;
  familyVisionAr?: string;
  familyPrioritiesAr?: string[];
  learnerVoiceAr?: string;
  ageYears?: number | null;
}): GoalOpportunityCard[] {
  const cards: GoalOpportunityCard[] = [];

  for (const row of input.currentLevelRows) {
    const conceptIds = conceptIdsForDomain({
      domainCode: row.domainCode,
      domainNameAr: row.domainNameAr,
      assessmentRecords: input.assessmentRecords,
    });
    const skillAr = skillFromCurrentLevel(row);
    const baselineAr = baselineFromCurrentLevel(row);
    const blockersAr = [
      !baselineAr ? "لا توجد مرجعية خط قاعدي كافية." : "",
      !row.needs && !row.strengths ? "لا توجد نقاط قوة أو احتياج مصنفة في المجال." : "",
    ].filter(Boolean);
    const priority = priorityFromRow(row);
    const assessmentContext = assessmentContextForDomain({
      domainCode: row.domainCode,
      domainNameAr: row.domainNameAr,
      assessmentRecords: input.assessmentRecords,
    });
    const profileContext = profileContextForConcepts(input.profileProcessing, conceptIds);
    const transitionLinkAr = transitionLinkFor({ ageYears: input.ageYears, conceptIds });
    const curriculumLinkAr = curriculumLinkFor(conceptIds, skillAr, row.domainNameAr);

    cards.push({
      id: `current-level-${row.domainCode}`,
      mode: "performance_based",
      domainCode: row.domainCode,
      domainNameAr: row.domainNameAr,
      skillAr,
      baselineAr,
      triggerAr: row.goalOpportunityCount > 0
        ? `ظهرت ${row.goalOpportunityCount} فرصة هدف مرتبطة في معالجة البروفايل.`
        : "مستوى الأداء الحالي يشير إلى فرصة هدف قابلة للمراجعة.",
      rationaleAr: "بدأ المقترح من مستوى الأداء الحالي وربط بالمفاهيم المتاحة في التقييم؛ البوصلة الطولية وتكييف الرؤية لم يُفعّلا بعد.",
      transitionLinkAr,
      curriculumLinkAr,
      readiness: readinessFor({ baselineAr, blockersAr, priority }),
      blockersAr,
      sourceLabelsAr: [row.sourceSummaryAr].filter(Boolean),
      priority,
      assessmentPriorityRefs: assessmentContext.priorityRefs,
      assessmentFindingKind: assessmentContext.findingKind,
      assessmentFindingAr: assessmentContext.findingAr || undefined,
      environmentContextsAr: profileContext.environmentContextsAr,
      supportConditionsAr: profileContext.supportConditionsAr,
    });
  }

  for (const opportunity of input.profileProcessing.topGoalOpportunities.slice(0, 6)) {
    const conceptName = getConceptNameAr(opportunity.conceptId);
    const relatedRow = input.currentLevelRows.find((row) => (
      conceptIdsForDomain({
        domainCode: row.domainCode,
        domainNameAr: row.domainNameAr,
        assessmentRecords: input.assessmentRecords,
      }).includes(opportunity.conceptId)
    ));
    const baselineAr = relatedRow ? baselineFromCurrentLevel(relatedRow) : "";
    const blockersAr = [
      opportunity.requiresBaselineReview || !baselineAr ? "تحتاج الفرصة إلى ربطها بخط قاعدي مراجع قبل الاعتماد." : "",
    ].filter(Boolean);
    const domainCode = relatedRow?.domainCode ?? opportunity.conceptId;
    const domainNameAr = relatedRow?.domainNameAr ?? conceptName;
    const assessmentContext = assessmentContextForDomain({
      domainCode,
      domainNameAr,
      assessmentRecords: input.assessmentRecords,
    });
    const profileContext = profileContextForConcepts(input.profileProcessing, [opportunity.conceptId]);

    cards.push({
      id: `profile-opportunity-${opportunity.id}`,
      mode: baselineAr ? "blended" : "transition_based",
      domainCode,
      domainNameAr,
      skillAr: truncate(opportunity.titleAr, 90),
      baselineAr,
      triggerAr: triggerFromProfileOpportunity(opportunity),
      rationaleAr: opportunity.rationaleAr,
      transitionLinkAr: transitionLinkFor({ ageYears: input.ageYears, conceptIds: [opportunity.conceptId] }),
      curriculumLinkAr: curriculumLinkFor([opportunity.conceptId], opportunity.titleAr, domainNameAr),
      readiness: readinessFor({ baselineAr, blockersAr, priority: opportunity.priority }),
      blockersAr,
      sourceLabelsAr: opportunity.sourceInputIds,
      priority: opportunity.priority,
      assessmentPriorityRefs: assessmentContext.priorityRefs,
      assessmentFindingKind: assessmentContext.findingKind,
      assessmentFindingAr: assessmentContext.findingAr || undefined,
      environmentContextsAr: profileContext.environmentContextsAr,
      supportConditionsAr: profileContext.supportConditionsAr,
    });
  }

  if (input.planVisionAr?.trim()) {
    const firstRow = input.currentLevelRows.find((row) => row.needs || row.strengths);
    const baselineAr = firstRow ? baselineFromCurrentLevel(firstRow) : "";
    cards.push({
      id: "plan-vision-opportunity",
      mode: "vision_based",
      domainCode: firstRow?.domainCode ?? "VISION",
      domainNameAr: firstRow?.domainNameAr ?? "رؤية الخطة",
      skillAr: truncate(input.planVisionAr, 90),
      baselineAr,
      triggerAr: `رؤية الخطة: ${truncate(input.planVisionAr, 140)}`,
      rationaleAr: "هذه فرصة تبدأ من الرؤية، ولا تصبح هدفاً جاهزاً إلا بعد مطابقتها مع مستوى أداء حالي.",
      transitionLinkAr: transitionLinkFor({
        ageYears: input.ageYears,
        conceptIds: firstRow
          ? conceptIdsForDomain({
              domainCode: firstRow.domainCode,
              domainNameAr: firstRow.domainNameAr,
              assessmentRecords: input.assessmentRecords,
            })
          : [],
      }),
      curriculumLinkAr: undefined,
      readiness: baselineAr ? "improvable" : "needs_evidence",
      blockersAr: baselineAr ? [] : ["الرؤية تحتاج ربطاً بمستوى أداء حالي قبل اعتماد هدف منها."],
      sourceLabelsAr: ["رؤية الخطة"],
      priority: "medium",
      assessmentPriorityRefs: [],
      assessmentFindingKind: "unknown",
      environmentContextsAr: [],
      supportConditionsAr: [],
    });
  }

  return cards
    .filter((card, index, all) => all.findIndex((item) => item.id === card.id) === index)
    .sort((a, b) => {
      const rank = { ready: 4, improvable: 3, needs_preparatory_goal: 2, needs_evidence: 1 };
      const priority = { high: 3, medium: 2, low: 1 };
      return rank[b.readiness] - rank[a.readiness] || priority[b.priority] - priority[a.priority];
    });
}

function cleanSkillForGoal(skillAr: string) {
  return truncate(
    skillAr
      .replace(/^تعميق\s+/, "")
      .replace(/^مهارة ناشئة تحتاج تعميقاً وفق نتائج التقييم الرسمي المراجعة\.?$/, "أداء المهارة المستهدفة"),
    95,
  );
}

function readinessForProposal(card: GoalOpportunityCard, variant: GoalProposal["variant"]): GoalReadiness {
  if (card.readiness === "needs_evidence") return "needs_evidence";
  if (variant === "preparatory") return "ready";
  if (card.readiness === "needs_preparatory_goal") return variant === "functional_transition" ? "needs_preparatory_goal" : "improvable";
  return card.readiness;
}

export function buildGoalProposals(input: {
  opportunity: GoalOpportunityCard;
  studentNameAr?: string;
  planEndLabelAr?: string;
  maxProposals?: number;
}): GoalProposal[] {
  const card = input.opportunity;
  const studentName = input.studentNameAr?.trim() || "المتعلم";
  const endLabel = input.planEndLabelAr?.trim() || "نهاية مدة الخطة";
  const skill = cleanSkillForGoal(card.skillAr);
  const variants: GoalProposal["variant"][] = ["near_current_performance", "functional_transition", "preparatory"];

  return variants.slice(0, input.maxProposals ?? 3).map((variant) => {
    const reasoning = proposalReasoning({
      variant,
      skillAr: skill,
      domainNameAr: card.domainNameAr,
      baselineAr: card.baselineAr,
      environmentContexts: card.environmentContextsAr,
      supportConditions: card.supportConditionsAr,
    });
    const contextAr = contextFromProfile(card.environmentContextsAr, card.supportConditionsAr);
    const criterionAr = reasoning.criterionAr;
    const variantPrefix = variant === "functional_transition"
      ? "توظيف"
      : variant === "preparatory"
        ? "تهيئة"
        : "إتقان";
    const lifePracticeAr = variant === "functional_transition"
      ? card.transitionLinkAr
      : card.curriculumLinkAr ?? card.transitionLinkAr;
    const actionAr = reasoning.actionAr;

    return {
      id: `${card.id}-${variant}`,
      opportunityId: card.id,
      variant,
      titleAr: `${variantPrefix} - ${card.domainNameAr}`,
      textAr: `بحلول ${endLabel}، عند ${contextAr}، سيقوم ${studentName} بأن ${actionAr}، وفق معيار ${criterionAr}، ويجمع التقدم من خلال ${reasoning.dataCollectionMethodAr}.`,
      contextAr,
      criterionAr,
      measurementType: reasoning.measurementType,
      measurementMethodAr: reasoning.dataCollectionMethodAr,
      assessmentPriorityRefs: card.assessmentPriorityRefs,
      evidenceRefAr: card.baselineAr,
      goalTriggerAr: card.triggerAr,
      lifePracticeAr,
      readiness: readinessForProposal(card, variant),
      whyAr: [
        reasoning.whyAr,
        card.assessmentFindingKind === "emerging"
          ? "يحافظ المقترح على وصف المهارة كمهارة ناشئة ولا يحولها إلى إتقان أو عجز."
          : card.assessmentFindingKind === "strength"
            ? "يحافظ المقترح على نتيجة القوة ولا يعيد وصفها كاحتياج."
            : card.assessmentFindingKind === "need"
              ? "يعالج المقترح احتياجاً موثقاً دون تضخيم دلالته."
              : "",
      ].filter(Boolean).join(" "),
      detailsAr: [
        card.rationaleAr,
        card.assessmentPriorityRefs.length > 0 ? `أولوية تقييم: ${card.assessmentPriorityRefs.join("، ")}` : "",
        card.transitionLinkAr,
        card.curriculumLinkAr ? `ارتباط منهجي: ${card.curriculumLinkAr}` : "",
        ...card.blockersAr,
      ].filter(Boolean),
    };
  });
}
