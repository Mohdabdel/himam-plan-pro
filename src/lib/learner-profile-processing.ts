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
  LearnerProfileProcessingModel,
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
    conceptProfiles,
    topGoalOpportunities,
    profileReadiness,
    limitationsAr: [
      "هذه القراءة تصنف وتفرز وتعالج معلومات الأدوات والملفات لبناء بروفايل تشغيلي، ولا تعتمد هدفاً أو خطة تلقائياً.",
      "مسودة مستوى الأداء تحتاج مراجعة مختص قبل استخدامها كنص نهائي في الخطة.",
      "الأدوات الرسمية المقننة لا تطبق ولا تصحح داخل همم افتراضياً؛ تستقبل المنصة نتائجها المرفوعة أو المدخلة وتعالج تفسيرها المهني، وأي تطبيق أو تصحيح سيكومتري كامل يحتاج عقد أداة وترخيص مستقل.",
    ],
  };
}
