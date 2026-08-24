import { getInformationToolDefinition } from "@/data/information-tools";
import type { InformationRecord, KnowledgeSupportItem } from "@/types/himam";

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

export function hasInformationRecordResponse(record: InformationRecord | null) {
  return Boolean(record?.responses.some((response) => {
    const value = response.value;
    return Array.isArray(value)
      ? value.some((item) => item.trim().length > 0)
      : value.trim().length > 0;
  }));
}
