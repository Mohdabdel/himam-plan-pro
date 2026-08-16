import type {
  EvidenceRecord,
  InferenceSuggestion,
  KnowledgeInformationType,
  KnowledgeSupportItem,
  StructuredResponse,
  ToolAdministration,
} from "./types";
import { getStage3InformationTool } from "./stage3-catalog";

const PERFORMANCE_RESPONSE_CODES = new Set([
  "INDEPENDENT",
  "WITH_SUPPORT",
  "OBSERVED_INDEPENDENT",
  "OBSERVED_WITH_SUPPORT",
  "OBSERVED_NOT_ABLE",
]);

function sourceTypeToKnowledgeType(sourceType: StructuredResponse["sourceRef"]["sourceType"]): KnowledgeInformationType {
  if (sourceType === "LEARNER_VOICE") return "LEARNER_VOICE";
  if (sourceType === "FAMILY_VISION") return "FAMILY_VISION";
  if (sourceType === "INTEREST_SURVEY") return "INTEREST_SURVEY";
  if (sourceType === "INCLINATION_SURVEY") return "INCLINATION_SURVEY";
  if (sourceType === "TRANSITION_SURVEY_CHECKLIST") return "TRANSITION_SURVEY_CHECKLIST";
  if (sourceType === "PERSON_CENTERED_PLANNING") return "PERSON_CENTERED_PLANNING";
  return "OTHER_SUPPORTING_INFORMATION";
}

export function createToolAdministration(input: {
  administrationId: string;
  learnerId: string;
  toolId: string;
  administeredByRole: string;
  administeredAt: string;
}): ToolAdministration {
  const tool = getStage3InformationTool(input.toolId);
  if (!tool) throw new Error(`Unknown Stage 3 tool: ${input.toolId}`);
  return {
    administrationId: input.administrationId,
    learnerId: input.learnerId,
    toolId: tool.toolId,
    toolVersion: tool.version,
    administeredByRole: input.administeredByRole,
    administeredAt: input.administeredAt,
    status: "completed",
    sourceRef: {
      sourceType: tool.sourceType,
      sourcePackage: "3A",
      sourceRecordType: "ToolAdministration",
      sourceId: input.administrationId,
    },
  };
}

export function createStructuredResponse(input: {
  responseId: string;
  administration: ToolAdministration;
  questionId: string;
  responseCode: string;
  capturedAt: string;
  valueText?: string;
  selectedOptionIds?: string[];
}): StructuredResponse {
  const tool = getStage3InformationTool(input.administration.toolId);
  if (!tool) throw new Error(`Unknown Stage 3 tool: ${input.administration.toolId}`);
  const question = tool.questions.find((item) => item.questionId === input.questionId);
  if (!question) throw new Error(`Unknown Stage 3 question: ${input.questionId}`);
  const selectedConceptIds = (input.selectedOptionIds ?? [])
    .flatMap((optionId) => question.options?.find((option) => option.optionId === optionId)?.conceptIds ?? []);
  return {
    responseId: input.responseId,
    administrationId: input.administration.administrationId,
    learnerId: input.administration.learnerId,
    toolId: tool.toolId,
    questionId: question.questionId,
    responseValueType: question.responseValueType,
    responseCode: input.responseCode,
    valueText: input.valueText,
    selectedOptionIds: input.selectedOptionIds ?? [],
    conceptIds: [...new Set([...question.conceptIds, ...selectedConceptIds])],
    portfolioTargetIds: question.portfolioTargetIds,
    operationalFunction: question.operationalFunction,
    outputChannel: question.outputChannel,
    capturedAt: input.capturedAt,
    sourceRef: {
      sourceType: tool.sourceType,
      sourcePackage: "3A",
      sourceRecordType: "StructuredResponse",
      sourceId: input.responseId,
      provenanceRef: input.administration.administrationId,
    },
  };
}

export function materializeEvidenceRecord(response: StructuredResponse): EvidenceRecord | null {
  if (response.outputChannel !== "EVIDENCE_RECORD") return null;
  if (!PERFORMANCE_RESPONSE_CODES.has(response.responseCode)) return null;
  const conceptId = response.conceptIds[0];
  if (!conceptId) return null;
  return {
    evidenceId: `ev-${response.responseId}`,
    learnerId: response.learnerId,
    sourceResponseId: response.responseId,
    evidenceType: "PERFORMANCE_ASSESSMENT",
    conceptId,
    componentIds: [],
    performanceCode: response.responseCode,
    supportCodes: response.responseCode === "WITH_SUPPORT" || response.responseCode === "OBSERVED_WITH_SUPPORT"
      ? ["SUPPORT_PRESENT"]
      : response.responseCode === "OBSERVED_NOT_ABLE"
        ? ["OPPORTUNITY_PRESENT_NOT_YET_PERFORMED"]
        : [],
    observedAt: response.capturedAt,
    portfolioTargetIds: response.portfolioTargetIds,
    evidenceStatus: "accepted",
    mappingMode: "CATALOG_FIXED",
    eligibleForLevelEngine: true,
    independentSourceKey: {
      sourceType: response.sourceRef.sourceType,
      administrationId: response.administrationId,
      toolId: response.toolId,
      observerRole: "SPECIALIST",
      observedAt: response.capturedAt,
    },
    sourceRef: response.sourceRef,
  };
}

export function materializeKnowledgeSupportItem(response: StructuredResponse): KnowledgeSupportItem | null {
  if (response.outputChannel !== "KNOWLEDGE_SUPPORT_ITEM") return null;
  return {
    knowledgeItemId: `ksi-${response.responseId}`,
    learnerId: response.learnerId,
    sourceResponseId: response.responseId,
    informationType: sourceTypeToKnowledgeType(response.sourceRef.sourceType),
    conceptIds: response.conceptIds,
    portfolioTargetIds: response.portfolioTargetIds,
    operationalFunction: response.operationalFunction,
    responseCode: response.responseCode,
    capturedAt: response.capturedAt,
    mappingMode: "CATALOG_FIXED",
    eligibleForLevelEngine: false,
    eligibleForPriorityEngine: true,
    eligibleForReport: true,
    sourceRef: response.sourceRef,
  };
}

export function createInferenceSuggestionFromResponse(response: StructuredResponse): InferenceSuggestion {
  const conceptId = response.conceptIds[0];
  if (!conceptId) throw new Error("Inference suggestion requires at least one concept");
  return {
    suggestionId: `inf-${response.responseId}`,
    sourceResponseId: response.responseId,
    suggestedTargetType: "CONCEPT",
    suggestedValue: conceptId,
    reasonCode: "STRUCTURED_RESPONSE_CONCEPT_HINT",
    confidence: 0.55,
    status: "suggested",
    createdBy: "stage3-materializer",
    createdAt: response.capturedAt,
  };
}
