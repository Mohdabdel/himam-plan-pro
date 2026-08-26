import { getInformationToolDefinition } from "@/data/information-tools";
import { OFFICIAL_CONCEPTS } from "@/data/concepts";
import type {
  ConceptId,
  InformationProcessingProfile,
  InformationProcessingSignal,
  InformationProcessingSignalKind,
  InformationRecord,
  KnowledgeSupportItem,
} from "@/types/himam";

export function informationRecordsKey(learnerId: string) {
  return `himam_information_records_${learnerId}`;
}

export function loadInformationRecords(learnerId: string): InformationRecord[] {
  try {
    return JSON.parse(localStorage.getItem(informationRecordsKey(learnerId)) || "[]") as InformationRecord[];
  } catch {
    return [];
  }
}

export function saveInformationRecords(learnerId: string, records: InformationRecord[]) {
  localStorage.setItem(informationRecordsKey(learnerId), JSON.stringify(records));
  return records;
}

export function upsertInformationRecord(learnerId: string, record: InformationRecord) {
  const records = loadInformationRecords(learnerId);
  const next = [
    ...records.filter((item) => item.id !== record.id),
    { ...record, updatedAt: new Date().toISOString() },
  ];
  return saveInformationRecords(learnerId, next);
}

export function createInformationRecord(input: {
  learnerId: string;
  toolId: string;
}): InformationRecord {
  const tool = getInformationToolDefinition(input.toolId);
  if (!tool) throw new Error(`Unknown information tool: ${input.toolId}`);
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    learnerId: input.learnerId,
    toolId: tool.id,
    toolNameAr: tool.nameAr,
    category: tool.category,
    responses: tool.questions.map((question) => ({
      questionId: question.id,
      promptAr: question.promptAr,
      value: question.responseType === "text" ? "" : [],
      linkedConcepts: question.linkedConcepts,
      targetPortfolio: question.targetPortfolio,
      operatingRoles: question.operatingRoles,
      outputPolicy: question.outputPolicy ?? "knowledge_support_only",
    })),
    createdAt: now,
    updatedAt: now,
  };
}

export function updateInformationResponse(
  record: InformationRecord,
  questionId: string,
  value: string | string[],
): InformationRecord {
  return {
    ...record,
    updatedAt: new Date().toISOString(),
    responses: record.responses.map((response) => (
      response.questionId === questionId ? { ...response, value } : response
    )),
  };
}

export function buildKnowledgeSupportItems(records: InformationRecord[]): KnowledgeSupportItem[] {
  return records.flatMap((record) => record.responses.flatMap((response) => {
    const value = Array.isArray(response.value)
      ? response.value.join("، ")
      : response.value;
    if (!value.trim()) return [];
    return [{
      id: `${record.id}-${response.questionId}`,
      sourceRecordId: record.id,
      labelAr: response.promptAr,
      valueAr: value,
      linkedConcepts: response.linkedConcepts,
      targetPortfolio: response.targetPortfolio,
      operatingRoles: response.operatingRoles,
    }];
  }));
}

function responseValueText(value: string | string[]) {
  return Array.isArray(value) ? value.join("، ") : value;
}

function signalKindsForResponse(response: InformationRecord["responses"][number]): InformationProcessingSignalKind[] {
  const kinds = new Set<InformationProcessingSignalKind>();
  if (response.outputPolicy === "conditional_evidence_candidate") kinds.add("evidence_candidate");
  if (response.targetPortfolio.includes("strengths")) kinds.add("profile_strength");
  if (response.targetPortfolio.includes("needs")) kinds.add("profile_need");
  if (response.targetPortfolio.includes("supports")) kinds.add("support_condition");
  if (response.operatingRoles.includes("priority_driver")) kinds.add("priority_hint");
  if (response.operatingRoles.includes("risk_driver")) kinds.add("risk_context");
  if (response.operatingRoles.includes("motivation_driver")) kinds.add("motivation_context");
  if (kinds.size === 0) kinds.add("motivation_context");
  return Array.from(kinds);
}

export function buildInformationProcessingProfile(records: InformationRecord[]): InformationProcessingProfile {
  const signals: InformationProcessingSignal[] = records.flatMap((record) => (
    record.responses.flatMap((response) => {
      const valueAr = responseValueText(response.value).trim();
      if (!valueAr) return [];

      return signalKindsForResponse(response).map((kind) => {
        const isEvidenceCandidate = kind === "evidence_candidate" || response.outputPolicy === "conditional_evidence_candidate";
        const canSupportGoalSelection = (
          isEvidenceCandidate ||
          response.operatingRoles.includes("priority_driver") ||
          response.operatingRoles.includes("risk_driver") ||
          response.operatingRoles.includes("support_driver")
        );

        return {
          id: `${record.id}-${response.questionId}-${kind}`,
          sourceRecordId: record.id,
          sourceToolId: record.toolId,
          sourceToolNameAr: record.toolNameAr,
          kind,
          labelAr: response.promptAr,
          valueAr,
          linkedConcepts: response.linkedConcepts,
          targetPortfolio: response.targetPortfolio,
          operatingRoles: response.operatingRoles,
          processingLevel: isEvidenceCandidate
            ? "evidence_candidate"
            : canSupportGoalSelection
              ? "structured_descriptive"
              : "requires_specialist_interpretation",
          canInformCurrentPerformance: isEvidenceCandidate,
          canSupportGoalSelection,
          requiresSpecialistInterpretation: true,
        } satisfies InformationProcessingSignal;
      });
    })
  ));

  const conceptSummaries = OFFICIAL_CONCEPTS.map((concept) => {
    const conceptSignals = signals.filter((signal) => signal.linkedConcepts.includes(concept.id as ConceptId));
    if (conceptSignals.length === 0) return null;
    return {
      conceptId: concept.id,
      signalCount: conceptSignals.length,
      evidenceCandidateCount: conceptSignals.filter((signal) => signal.kind === "evidence_candidate").length,
      priorityHintCount: conceptSignals.filter((signal) => signal.kind === "priority_hint").length,
      supportConditionCount: conceptSignals.filter((signal) => signal.kind === "support_condition").length,
      needOrRiskCount: conceptSignals.filter((signal) => signal.kind === "profile_need" || signal.kind === "risk_context").length,
      sourceToolNamesAr: Array.from(new Set(conceptSignals.map((signal) => signal.sourceToolNameAr))),
    };
  }).filter(Boolean) as InformationProcessingProfile["conceptSummaries"];

  const evidenceCandidateCount = signals.filter((signal) => signal.kind === "evidence_candidate").length;
  const goalSelectionSignalCount = signals.filter((signal) => signal.canSupportGoalSelection).length;

  return {
    learnerId: records[0]?.learnerId ?? "",
    recordCount: records.length,
    signalCount: signals.length,
    evidenceCandidateCount,
    currentPerformanceCandidateCount: signals.filter((signal) => signal.canInformCurrentPerformance).length,
    goalSelectionSignalCount,
    processingStage: signals.length === 0
      ? "none"
      : evidenceCandidateCount > 0 || goalSelectionSignalCount > 0
        ? "medium_profile_processing"
        : "initial_structured_processing",
    signals,
    conceptSummaries,
    limitationsAr: [
      "هذه المعالجة تبني بروفايل المتعلم وتوجه الأهداف، لكنها لا تعتمد هدفاً أو خطة دون مراجعة مختص.",
      "التحليل الحالي متوسط ومنظم وصفياً، ولا يدعي scoring أو تحليل سيكومتري كامل لكل أداة.",
      "أي درجة معيارية أو وزن ثقة أو تحليل سيكومتري لاحق يحتاج عقد أداة مستقل ومصدر مرجعي موثق.",
    ],
  };
}

export function hasInformationRecordResponse(record: InformationRecord | null) {
  return Boolean(record?.responses.some((response) => {
    const value = response.value;
    return Array.isArray(value)
      ? value.some((item) => item.trim().length > 0)
      : value.trim().length > 0;
  }));
}
