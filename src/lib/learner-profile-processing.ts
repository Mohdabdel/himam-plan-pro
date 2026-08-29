import { OFFICIAL_CONCEPTS, getConceptNameAr } from "@/data/concepts";
import {
  canCandidateInformPerformance,
  classifyConceptIdsFromText,
  classifySignalKindsFromText,
  normalizeConceptIds,
} from "@/lib/information-classification";
import type { SourceFilePipelineRecord } from "@/lib/source-file-pipeline";
import type {
  ConceptId,
  InformationRecord,
  LearnerProfileComponentMatrix,
  LearnerProfileProcessingModel,
  ProfileComponentCoverage,
  ProfileComponentElement,
  ProfileComponentId,
  ProfileComponentImportance,
  ProfileGoalImpact,
  ProcessedConceptProfile,
  ProcessedProfileInput,
  ProfileGoalOpportunity,
} from "@/types/himam";

function valueText(value: string | string[]) {
  return Array.isArray(value) ? value.join("، ") : value;
}

function includesAny(input: ProcessedProfileInput[], kinds: string[]) {
  return input.filter((item) => item.signalKinds.some((kind) => kinds.includes(kind)));
}

function inputPriority(input: ProcessedProfileInput): "high" | "medium" | "low" {
  if (input.signalKinds.includes("risk_context") || input.signalKinds.includes("profile_need")) return "high";
  if (input.signalKinds.includes("priority_hint") || input.canInformCurrentPerformance) return "medium";
  return "low";
}

const COMPONENT_NAMES_AR: Record<ProfileComponentId, string> = {
  formal_assessment_results: "نتائج التقييم الرسمي",
  current_performance: "مستوى الأداء الحالي",
  family_voice: "صوت الأسرة",
  learner_voice: "صوت المتعلم",
  priority: "الأولويات",
  support_context: "الدعم والسياق",
  risk_safety: "المخاطر والسلامة",
  interest_preference: "الاهتمامات والتفضيلات",
  career_inclination: "الميول المهنية",
  environment_context: "البيئات والمواقف",
  additional_information: "معلومات إضافية",
};

const REQUIRED_PROFILE_COMPONENTS: ProfileComponentId[] = [
  "formal_assessment_results",
  "current_performance",
  "family_voice",
  "learner_voice",
  "priority",
];

const PROFILE_COMPONENT_ORDER: ProfileComponentId[] = [
  "formal_assessment_results",
  "current_performance",
  "family_voice",
  "learner_voice",
  "priority",
  "support_context",
  "risk_safety",
  "interest_preference",
  "career_inclination",
  "environment_context",
  "additional_information",
];

function componentImportance(componentId: ProfileComponentId): ProfileComponentImportance {
  if (componentId === "formal_assessment_results" || componentId === "current_performance") return "critical_for_goal_validity";
  if (componentId === "family_voice" || componentId === "learner_voice" || componentId === "priority") return "important_for_goal_quality";
  return "supporting_context";
}

function goalImpactFor(componentId: ProfileComponentId): ProfileGoalImpact {
  if (componentId === "formal_assessment_results" || componentId === "current_performance") return "blocks_or_weakens_goal_validity";
  if (componentId === "family_voice" || componentId === "learner_voice") return "improves_goal_personalization";
  if (componentId === "priority" || componentId === "career_inclination") return "improves_goal_relevance";
  if (componentId === "support_context") return "improves_goal_measurement";
  return "adds_context_only";
}

function elementNameFor(componentId: ProfileComponentId, input: ProcessedProfileInput) {
  const text = `${input.labelAr} ${input.valueAr}`;
  if (componentId === "family_voice" && /رؤية|مستقبل|حياة|خمس|5/i.test(text)) return "رؤية الأسرة";
  if (componentId === "family_voice" && /أولوية|مهم|يريد|تفضل/i.test(text)) return "أولويات الأسرة";
  if (componentId === "learner_voice" && /يحب|يفضل|اختيار|أريد|لا أريد|اهتمام/i.test(text)) return "تفضيلات واختيارات المتعلم";
  if (componentId === "priority") return "أولوية مؤثرة في اختيار الهدف";
  if (componentId === "support_context") return "شرط دعم أو تكييف مؤثر";
  if (componentId === "risk_safety") return "مخاطر أو اعتبارات سلامة";
  if (componentId === "formal_assessment_results") return "نتيجة تقييم رسمي مرفوعة ومراجعة";
  if (componentId === "current_performance") return "دليل مستوى أداء حالي";
  if (componentId === "career_inclination") return "ميل أو اتجاه مهني";
  if (componentId === "interest_preference") return "اهتمام أو تفضيل";
  if (componentId === "environment_context") return "سياق بيئي مؤثر";
  return "معلومة داعمة مصنفة";
}

function classifyProfileComponentIds(input: ProcessedProfileInput): ProfileComponentId[] {
  const ids = new Set<ProfileComponentId>();
  const text = `${input.sourceNameAr} ${input.labelAr} ${input.valueAr} ${input.targetPortfolio ?? ""}`;

  if (input.sourcePurpose === "OFFICIAL_ASSESSMENT_RESULTS") ids.add("formal_assessment_results");
  if (input.canInformCurrentPerformance) ids.add("current_performance");
  if (input.sourcePurpose === "FAMILY_VISION_FORM" || /أسرة|الأسرة|ولي|والد|والدة|عائلة/i.test(text)) ids.add("family_voice");
  if (input.sourcePurpose === "LEARNER_VOICE_FORM" || /صوت المتعلم|المتعلم يحب|أريد|لا أريد|اختيار المتعلم/i.test(text)) ids.add("learner_voice");
  if (input.signalKinds.includes("priority_hint") || /أولوية|مهم|الأهم|يركز|يفضل البدء/i.test(text)) ids.add("priority");
  if (input.signalKinds.includes("support_condition")) ids.add("support_context");
  if (input.signalKinds.includes("risk_context")) ids.add("risk_safety");
  if (input.signalKinds.includes("motivation_context") || /اهتمام|تفضيل|يحب|دافعية|تعزيز|مدعم/i.test(text)) ids.add("interest_preference");
  if (/مهنة|مهني|وظيف|عمل|تدريب|رياسيك|RIASEC|career/i.test(text)) ids.add("career_inclination");
  if (/بيت|منزل|مدرسة|مركز|مجتمع|عمل|بيئة|سياق|مكان|روتين/i.test(text)) ids.add("environment_context");
  if (ids.size === 0) ids.add("additional_information");

  return Array.from(ids);
}

function buildProfileComponentElement(input: ProcessedProfileInput, componentId: ProfileComponentId): ProfileComponentElement {
  const importance = componentImportance(componentId);
  const goalImpact = goalImpactFor(componentId);
  const elementNameAr = elementNameFor(componentId, input);
  const summaryAr = `${elementNameAr}: ${input.valueAr}`;

  return {
    id: `${componentId}-${input.id}`,
    componentId,
    componentNameAr: COMPONENT_NAMES_AR[componentId],
    elementKey: `${componentId}:${elementNameAr}`,
    elementNameAr,
    importance,
    goalImpact,
    conceptIds: input.conceptIds,
    sourceInputIds: [input.id],
    sourceLabelsAr: [input.provenanceLabel],
    summaryAr,
    retrievalHintAr: `استدعِ ${elementNameAr} عند صياغة هدف في ${input.conceptIds.map(getConceptNameAr).join("، ")} من مصدر ${input.provenanceLabel}.`,
    reviewActionAr: importance === "critical_for_goal_validity"
      ? "يراجع المختص هذه المعلومة قبل اعتماد مستوى الأداء أو معيار الهدف."
      : importance === "important_for_goal_quality"
        ? "تستخدم لتحسين ملاءمة الهدف وصياغته الشخصية قبل الاعتماد."
        : "تستخدم كسياق داعم عند الحاجة ولا تكفي وحدها لاعتماد الهدف.",
    canSupportCurrentLevel: input.canInformCurrentPerformance || componentId === "formal_assessment_results",
    canSupportGoalValidity: goalImpact === "blocks_or_weakens_goal_validity",
    canImproveGoalQuality: goalImpact !== "blocks_or_weakens_goal_validity",
  };
}

function mergeComponentElements(elements: ProfileComponentElement[]) {
  const grouped = new Map<string, ProfileComponentElement>();
  for (const element of elements) {
    const key = `${element.componentId}:${element.elementNameAr}:${element.conceptIds.join(",")}`;
    const current = grouped.get(key);
    if (!current) {
      grouped.set(key, element);
      continue;
    }
    grouped.set(key, {
      ...current,
      sourceInputIds: Array.from(new Set([...current.sourceInputIds, ...element.sourceInputIds])),
      sourceLabelsAr: Array.from(new Set([...current.sourceLabelsAr, ...element.sourceLabelsAr])),
      summaryAr: `${current.summaryAr} | ${element.summaryAr}`,
    });
  }
  return Array.from(grouped.values());
}

function buildProfileComponentMatrix(processedInputs: ProcessedProfileInput[]): LearnerProfileComponentMatrix {
  const elements = mergeComponentElements(processedInputs.flatMap((input) => (
    classifyProfileComponentIds(input).map((componentId) => buildProfileComponentElement(input, componentId))
  )));

  const coverage: ProfileComponentCoverage[] = PROFILE_COMPONENT_ORDER.map((componentId) => {
    const componentElements = elements.filter((element) => element.componentId === componentId);
    const requiredForGoalValidity = REQUIRED_PROFILE_COMPONENTS.includes(componentId);
    const criticalElementCount = componentElements.filter((element) => element.importance === "critical_for_goal_validity").length;
    const qualityElementCount = componentElements.filter((element) => element.importance === "important_for_goal_quality").length;
    const status = componentElements.length === 0
      ? "missing"
      : requiredForGoalValidity && componentElements.length < 2
        ? "partial"
        : "covered";

    return {
      componentId,
      componentNameAr: COMPONENT_NAMES_AR[componentId],
      requiredForGoalValidity,
      status,
      elementCount: componentElements.length,
      criticalElementCount,
      qualityElementCount,
      gapAr: status === "covered"
        ? undefined
        : requiredForGoalValidity
          ? `مكون ${COMPONENT_NAMES_AR[componentId]} غير مكتمل ويؤثر على صحة الهدف أو قوة مراجعته.`
          : `مكون ${COMPONENT_NAMES_AR[componentId]} غير مكتمل وقد يقلل جودة تخصيص الهدف.`,
    };
  });

  const criticalMissing = coverage.filter((item) => item.requiredForGoalValidity && item.status === "missing");
  const qualityCoveredCount = coverage.filter((item) => item.status === "covered" && !item.requiredForGoalValidity).length;

  return {
    componentCount: PROFILE_COMPONENT_ORDER.length,
    coveredComponentCount: coverage.filter((item) => item.status === "covered").length,
    criticalMissingComponentCount: criticalMissing.length,
    goalValidityReady: criticalMissing.length === 0,
    goalQualityReadiness: qualityCoveredCount >= 4 ? "strong" : qualityCoveredCount >= 2 ? "moderate" : "limited",
    elements,
    coverage,
    goalRetrievalHintsAr: elements
      .filter((element) => element.canSupportGoalValidity || element.canImproveGoalQuality)
      .slice(0, 8)
      .map((element) => element.retrievalHintAr),
    blockingGapsAr: coverage
      .filter((item) => item.requiredForGoalValidity && item.status !== "covered")
      .map((item) => item.gapAr ?? ""),
    qualityGapsAr: coverage
      .filter((item) => !item.requiredForGoalValidity && item.status === "missing")
      .slice(0, 5)
      .map((item) => item.gapAr ?? ""),
  };
}

function platformToolInputs(records: InformationRecord[]): ProcessedProfileInput[] {
  return records.flatMap((record) => (
    record.responses.flatMap((response) => {
      const text = valueText(response.value).trim();
      if (!text) return [];

      const labelAndText = `${response.promptAr}: ${text}`;
      const signalKinds = Array.from(new Set([
        ...classifySignalKindsFromText(labelAndText),
        ...(response.outputPolicy === "conditional_evidence_candidate" ? ["evidence_candidate" as const] : []),
      ]));
      const canInformCurrentPerformance = (
        response.outputPolicy === "conditional_evidence_candidate" &&
        canCandidateInformPerformance(labelAndText, signalKinds)
      );

      return [{
        id: `${record.id}-${response.questionId}`,
        learnerId: record.learnerId,
        origin: "platform_tool_application",
        sourceNameAr: record.toolNameAr,
        sourceRecordId: record.id,
        labelAr: response.promptAr,
        valueAr: text,
        conceptIds: response.linkedConcepts.length > 0
          ? response.linkedConcepts
          : classifyConceptIdsFromText(labelAndText),
        signalKinds,
        targetPortfolio: response.targetPortfolio,
        provenanceLabel: `${record.toolNameAr} - تطبيق داخل المنصة`,
        canInformCurrentPerformance,
        canSupportGoalSelection: signalKinds.some((kind) => (
          kind === "evidence_candidate" ||
          kind === "priority_hint" ||
          kind === "profile_need" ||
          kind === "risk_context" ||
          kind === "support_condition"
        )),
        requiresSpecialistInterpretation: true,
      } satisfies ProcessedProfileInput];
    })
  ));
}

function reviewedUploadInputs(pipelines: SourceFilePipelineRecord[]): ProcessedProfileInput[] {
  return pipelines.flatMap((pipeline) => {
    if (pipeline.review?.decision !== "approved_for_structured_response") return [];

    return pipeline.structuredResponses.flatMap((response, index) => {
      const text = response.valueText?.trim() ?? response.selectedOptionIds.join("، ");
      if (!text) return [];
      const signalKinds = classifySignalKindsFromText(text);
      const conceptIds = normalizeConceptIds(response.conceptIds, text);
      const officialAssessment = pipeline.file.purpose === "OFFICIAL_ASSESSMENT_RESULTS";
      const canInformCurrentPerformance = officialAssessment || canCandidateInformPerformance(text, signalKinds);

      return [{
        id: `${pipeline.pipelineId}-${response.responseId}`,
        learnerId: pipeline.learnerId,
        origin: "reviewed_uploaded_source",
        sourceNameAr: pipeline.sourceNameAr,
        sourceRecordId: pipeline.pipelineId,
        sourcePurpose: pipeline.file.purpose,
        labelAr: `استجابة منظمة ${index + 1}`,
        valueAr: text,
        conceptIds,
        signalKinds,
        targetPortfolio: response.portfolioTargetIds.join("، "),
        provenanceLabel: `${pipeline.sourceNameAr} - ${pipeline.file.fileName} - مراجعة مختص`,
        canInformCurrentPerformance,
        canSupportGoalSelection: canInformCurrentPerformance || signalKinds.some((kind) => (
          kind === "priority_hint" ||
          kind === "profile_need" ||
          kind === "risk_context" ||
          kind === "support_condition"
        )),
        requiresSpecialistInterpretation: true,
      } satisfies ProcessedProfileInput];
    });
  });
}

function buildCurrentPerformanceDraft(conceptNameAr: string, inputs: {
  evidenceCandidates: ProcessedProfileInput[];
  needs: ProcessedProfileInput[];
  strengths: ProcessedProfileInput[];
  supportConditions: ProcessedProfileInput[];
}) {
  const parts: string[] = [];
  const evidence = inputs.evidenceCandidates[0];
  const need = inputs.needs[0];
  const strength = inputs.strengths[0];
  const support = inputs.supportConditions[0];

  if (evidence) {
    parts.push(`في ${conceptNameAr}، توجد معلومة أداء مراجعة من ${evidence.provenanceLabel}: ${evidence.valueAr}`);
  } else if (need || strength) {
    parts.push(`في ${conceptNameAr}، توجد إشارات بروفايل تحتاج تفسير المختص قبل صياغة مستوى أداء نهائي.`);
  } else {
    parts.push(`لا توجد حتى الآن معلومة كافية لصياغة مستوى أداء حالي في ${conceptNameAr}.`);
  }

  if (strength) parts.push(`نقطة بناء محتملة: ${strength.valueAr}`);
  if (need) parts.push(`احتياج أو خطر محتمل: ${need.valueAr}`);
  if (support) parts.push(`شرط دعم مؤثر: ${support.valueAr}`);

  return parts.join(" ");
}

function buildGoalOpportunities(conceptId: ConceptId, conceptNameAr: string, inputs: ProcessedProfileInput[]) {
  const goalInputs = inputs
    .filter((input) => input.canSupportGoalSelection)
    .sort((a, b) => {
      const order = { high: 0, medium: 1, low: 2 };
      return order[inputPriority(a)] - order[inputPriority(b)];
    })
    .slice(0, 3);

  return goalInputs.map((input, index): ProfileGoalOpportunity => ({
    id: `${conceptId}-goal-opportunity-${index + 1}-${input.id}`,
    conceptId,
    titleAr: `فرصة هدف في ${conceptNameAr}`,
    rationaleAr: `${input.labelAr}: ${input.valueAr}`,
    sourceInputIds: [input.id],
    priority: inputPriority(input),
    requiresBaselineReview: !input.canInformCurrentPerformance,
  }));
}

function coverageFor(sourceCount: number, evidenceCount: number) {
  if (evidenceCount >= 2 && sourceCount >= 2) return "good";
  if (evidenceCount >= 1 || sourceCount >= 2) return "moderate";
  return "limited";
}

function confidenceFor(sourceCount: number, evidenceCount: number) {
  if (evidenceCount >= 2 && sourceCount >= 2) return "high";
  if (evidenceCount >= 1 || sourceCount >= 2) return "medium";
  return "low";
}

function buildConceptProfile(conceptId: ConceptId, allInputs: ProcessedProfileInput[]): ProcessedConceptProfile | null {
  const inputs = allInputs.filter((input) => input.conceptIds.includes(conceptId));
  if (inputs.length === 0) return null;

  const conceptNameAr = getConceptNameAr(conceptId);
  const strengths = includesAny(inputs, ["profile_strength", "motivation_context"]);
  const needs = includesAny(inputs, ["profile_need", "risk_context"]);
  const priorities = includesAny(inputs, ["priority_hint"]);
  const supportConditions = includesAny(inputs, ["support_condition"]);
  const evidenceCandidates = inputs.filter((input) => input.canInformCurrentPerformance);
  const sourceCount = new Set(inputs.map((input) => input.sourceRecordId)).size;
  const signalCount = inputs.reduce((sum, input) => sum + input.signalKinds.length, 0);
  const gapsAr: string[] = [];

  if (evidenceCandidates.length === 0) gapsAr.push("يحتاج المفهوم إلى دليل أداء أو نتيجة مراجعة قبل صياغة مستوى أداء نهائي.");
  if (supportConditions.length === 0) gapsAr.push("لا توجد شروط دعم واضحة مرتبطة بهذا المفهوم بعد.");
  if (priorities.length === 0 && needs.length === 0) gapsAr.push("لا توجد أولوية أو احتياج مصنف بوضوح لهذا المفهوم.");

  return {
    conceptId,
    conceptNameAr,
    sourceCount,
    signalCount,
    strengths,
    needs,
    priorities,
    supportConditions,
    evidenceCandidates,
    currentPerformanceDraftAr: buildCurrentPerformanceDraft(conceptNameAr, {
      evidenceCandidates,
      needs,
      strengths,
      supportConditions,
    }),
    coverage: coverageFor(sourceCount, evidenceCandidates.length),
    confidence: confidenceFor(sourceCount, evidenceCandidates.length),
    goalOpportunities: buildGoalOpportunities(conceptId, conceptNameAr, inputs),
    gapsAr,
  };
}

export function buildLearnerProfileProcessingModel(input: {
  learnerId: string;
  informationRecords: InformationRecord[];
  sourcePipelines: SourceFilePipelineRecord[];
}): LearnerProfileProcessingModel {
  const processedInputs = [
    ...platformToolInputs(input.informationRecords),
    ...reviewedUploadInputs(input.sourcePipelines),
  ];
  const componentMatrix = buildProfileComponentMatrix(processedInputs);
  const conceptProfiles = OFFICIAL_CONCEPTS
    .map((concept) => buildConceptProfile(concept.id, processedInputs))
    .filter(Boolean) as ProcessedConceptProfile[];

  const topGoalOpportunities = conceptProfiles
    .flatMap((profile) => profile.goalOpportunities)
    .sort((a, b) => {
      const order = { high: 0, medium: 1, low: 2 };
      return order[a.priority] - order[b.priority];
    })
    .slice(0, 8);

  const evidenceCandidateCount = processedInputs.filter((item) => item.canInformCurrentPerformance).length;
  const profileReadiness = processedInputs.length === 0
    ? "no_processed_information"
    : evidenceCandidateCount > 0 && topGoalOpportunities.length > 0
      ? "profile_ready_for_goal_review"
      : "processed_information_available";

  return {
    learnerId: input.learnerId,
    generatedAt: new Date().toISOString(),
    inputCount: processedInputs.length,
    reviewedUploadedSourceCount: input.sourcePipelines.filter((pipeline) => pipeline.review?.decision === "approved_for_structured_response").length,
    platformToolRecordCount: input.informationRecords.length,
    componentMatrix,
    conceptProfiles,
    topGoalOpportunities,
    profileReadiness,
    limitationsAr: [
      "هذه القراءة تصنف وتفرز وتعالج معلومات الأدوات والملفات لبناء بروفايل تشغيلي، ولا تعتمد هدفاً أو خطة تلقائياً.",
      "مسودة مستوى الأداء تحتاج مراجعة مختص قبل استخدامها كنص نهائي في الخطة.",
      "مصفوفة مكونات البروفايل تحدد ما يؤثر على صحة الهدف وما يحسن جودة صياغته قبل دورة إعداد الهدف.",
      "الأدوات الرسمية المقننة لا تطبق ولا تصحح داخل همم افتراضياً؛ تستقبل المنصة نتائجها المرفوعة وتعالج تفسيرها المهني، وأي تطبيق أو تصحيح سيكومتري كامل يحتاج عقد أداة وترخيص مستقل.",
    ],
  };
}
