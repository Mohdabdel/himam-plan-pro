import { getAssessmentToolDefinition } from "@/data/assessment-tools";
import {
  reviewAssessmentTransitionCoverage,
  type AgeBand,
} from "@/lib/information-source-review";
import type { AssessmentRecord, AssessmentRating, SourceType } from "@/types/himam";

function toolTypeToSourceType(toolType: string): SourceType {
  if (toolType === "observation" || toolType === "institutional_curriculum") return "functional_observation";
  if (toolType === "interview") return "informal_tool";
  if (toolType === "formal_assessment") return "formal_tool";
  return "informal_tool";
}

export function assessmentRecordsKey(learnerId: string) {
  return `himam_assessment_records_${learnerId}`;
}

export function loadAssessmentRecords(learnerId: string): AssessmentRecord[] {
  try {
    return JSON.parse(localStorage.getItem(assessmentRecordsKey(learnerId)) || "[]") as AssessmentRecord[];
  } catch {
    return [];
  }
}

export function saveAssessmentRecords(learnerId: string, records: AssessmentRecord[]) {
  localStorage.setItem(assessmentRecordsKey(learnerId), JSON.stringify(records));
  return records;
}

export function createAssessmentRecord(input: {
  learnerId: string;
  toolId: string;
  assessorName?: string;
  assessmentDate?: string;
  ageBand?: AgeBand | string | null;
  uploadedFileName?: string;
  uploadedFileType?: string;
}): AssessmentRecord {
  const tool = getAssessmentToolDefinition(input.toolId);
  if (!tool) throw new Error(`Unknown assessment tool: ${input.toolId}`);
  const now = new Date().toISOString();
  const coverageReview = reviewAssessmentTransitionCoverage({
    ageBand: input.ageBand,
    selectedToolId: tool.id,
  });
  return {
    id: crypto.randomUUID(),
    learnerId: input.learnerId,
    toolId: tool.id,
    toolNameAr: tool.nameAr,
    sourceType: toolTypeToSourceType(tool.type),
    assessorName: input.assessorName,
    assessmentDate: input.assessmentDate,
    uploadedFileName: input.uploadedFileName,
    uploadedFileType: input.uploadedFileType,
    uploadedAt: input.uploadedFileName ? now : undefined,
    transitionCoverageStatus: coverageReview.status,
    transitionCoverageMissingAreas: coverageReview.missingAreas,
    processingNotesAr: [
      "يحفظ هذا السجل بنية أداة التقييم الأصلية ولا يستبدلها بمفاهيم همم.",
      "رفع الملف في هذه النسخة للتتبع فقط؛ استخراج النتائج التفصيلي مؤجل.",
      ...coverageReview.recommendationsAr,
    ],
    status: "draft",
    domains: tool.domains.map((domain) => ({
      domainCode: domain.code,
      domainNameAr: domain.nameAr,
      rating: "not_observed",
      linkedConcepts: domain.linkedConcepts,
    })),
    createdAt: now,
    updatedAt: now,
  };
}

export function attachAssessmentUpload(
  record: AssessmentRecord,
  file: { name: string; type?: string },
): AssessmentRecord {
  return {
    ...record,
    uploadedFileName: file.name,
    uploadedFileType: file.type,
    uploadedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export function updateAssessmentDomainRating(
  record: AssessmentRecord,
  domainCode: string,
  rating: AssessmentRating,
  note?: string,
): AssessmentRecord {
  return {
    ...record,
    updatedAt: new Date().toISOString(),
    status: "completed",
    domains: record.domains.map((domain) => (
      domain.domainCode === domainCode
        ? { ...domain, rating, note }
        : domain
    )),
  };
}
