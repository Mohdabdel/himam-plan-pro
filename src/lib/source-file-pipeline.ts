import type {
  ExtractedSourceDraft,
  SourceExtractionReview,
  SourceFileSensitivity,
  SourceType,
  StructuredResponse,
  ToolOutputChannel,
  UploadedSourceFile,
  UploadedSourcePurpose,
} from "@/domain/himam";
import {
  validateExtractedSourceDraft,
  validateSourceExtractionReview,
  validateStructuredResponse,
  validateUploadedSourceFile,
} from "@/domain/himam";

export type SourceFilePipelineRecord = {
  pipelineId: string;
  learnerId: string;
  sourceNameAr: string;
  file: UploadedSourceFile;
  draft: ExtractedSourceDraft;
  review: SourceExtractionReview;
  structuredResponses: StructuredResponse[];
  savedAt: string;
};

type UploadedFileLike = {
  name: string;
  type?: string;
  size?: number;
};

type PipelineInput = {
  learnerId: string;
  sourceNameAr: string;
  file: UploadedFileLike;
  purpose: UploadedSourcePurpose;
  sourceType?: SourceType;
  sensitivity?: SourceFileSensitivity;
  uploadedByRole?: string;
  reviewerRole?: string;
  statements?: string[];
  outputChannel?: ToolOutputChannel;
};

const DEFAULT_CONCEPT_ID = "COMM";
const DEFAULT_PORTFOLIO_ID = "PF_CURRENT_PERFORMANCE";

function id(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}

function sourceTypeForPurpose(purpose: UploadedSourcePurpose): SourceType {
  if (purpose === "OFFICIAL_ASSESSMENT_RESULTS") return "INSTITUTIONAL_ASSESSMENT";
  if (purpose === "LEARNER_VOICE_FORM") return "LEARNER_VOICE";
  if (purpose === "FAMILY_VISION_FORM") return "FAMILY_VISION";
  if (purpose === "PRIOR_REPORT") return "PRIOR_REPORT";
  return "UPLOADED_SOURCE_FILE";
}

function assertValid(label: string, ok: boolean, issues: Array<{ message: string }>) {
  if (!ok) {
    throw new Error(`${label}: ${issues.map((issue) => issue.message).join("; ")}`);
  }
}

export function sourceFilePipelinesKey(learnerId: string) {
  return `himam_source_file_pipelines_${learnerId}`;
}

export function loadSourceFilePipelines(learnerId: string): SourceFilePipelineRecord[] {
  try {
    return JSON.parse(localStorage.getItem(sourceFilePipelinesKey(learnerId)) || "[]") as SourceFilePipelineRecord[];
  } catch {
    return [];
  }
}

export function saveSourceFilePipelines(learnerId: string, records: SourceFilePipelineRecord[]) {
  localStorage.setItem(sourceFilePipelinesKey(learnerId), JSON.stringify(records));
  return records;
}

export function buildSourceFilePipeline(input: PipelineInput): SourceFilePipelineRecord {
  const now = new Date().toISOString();
  const sourceType = input.sourceType ?? sourceTypeForPurpose(input.purpose);
  const fileId = id("file");
  const draftId = id("extract");
  const reviewId = id("review");
  const statements = input.statements?.filter((statement) => statement.trim()) ?? [];
  const extractedStatements = statements.length > 0
    ? statements
    : [
        `تم رفع ${input.sourceNameAr} للمراجعة المهنية وبناء مستوى الأداء الحالي دون استخدام الملف الخام كدليل مباشر.`,
      ];

  const file: UploadedSourceFile = {
    fileId,
    learnerId: input.learnerId,
    sourceType,
    purpose: input.purpose,
    fileName: input.file.name,
    mimeType: input.file.type || "application/octet-stream",
    sizeBytes: input.file.size && input.file.size > 0 ? input.file.size : undefined,
    uploadedByRole: input.uploadedByRole ?? "SPECIALIST",
    uploadedAt: now,
    sensitivity: input.sensitivity ?? "PROFESSIONAL_SENSITIVE",
    consentStatus: "PERMITTED",
    extractionStatus: "reviewed",
    sourceRef: {
      sourceType: "UPLOADED_SOURCE_FILE",
      sourcePackage: "3A",
      sourceRecordType: "UploadedSourceFile",
      sourceId: fileId,
    },
  };

  const draft: ExtractedSourceDraft = {
    draftId,
    fileId,
    learnerId: input.learnerId,
    extractedAt: now,
    extractedBy: "HUMAN_ENTRY",
    status: "reviewed",
    aiDraftBoundary: "DRAFT_ONLY_REQUIRES_HUMAN_REVIEW",
    items: extractedStatements.map((statement, index) => ({
      itemId: id("extract-item"),
      statement,
      locationRef: `ملف مرفوع - بند مراجعة ${index + 1}`,
      proposedOutputChannel: input.outputChannel ?? "KNOWLEDGE_SUPPORT_ITEM",
      proposedConceptIds: [DEFAULT_CONCEPT_ID],
      confidence: 1,
    })),
    sourceRef: {
      sourceType: "UPLOADED_SOURCE_FILE",
      sourcePackage: "3A",
      sourceRecordType: "UploadedSourceFile",
      sourceId: fileId,
    },
  };

  const structuredResponses: StructuredResponse[] = draft.items.map((item, index) => ({
    responseId: id("structured-response"),
    administrationId: `upload-admin-${fileId}`,
    learnerId: input.learnerId,
    toolId: input.purpose,
    questionId: `uploaded-source-review-${index + 1}`,
    responseValueType: "TEXT",
    responseCode: `UPLOADED_SOURCE_REVIEW_${index + 1}`,
    valueText: item.statement,
    selectedOptionIds: [],
    conceptIds: item.proposedConceptIds.length > 0 ? item.proposedConceptIds : [DEFAULT_CONCEPT_ID],
    portfolioTargetIds: [DEFAULT_PORTFOLIO_ID],
    operationalFunction: input.purpose === "OFFICIAL_ASSESSMENT_RESULTS"
      ? "ESTABLISH_CURRENT_PERFORMANCE"
      : "REPORT_INPUT",
    outputChannel: input.outputChannel ?? "KNOWLEDGE_SUPPORT_ITEM",
    capturedAt: now,
    sourceRef: {
      sourceType,
      sourcePackage: "3A",
      sourceRecordType: "SourceExtractionReview",
      sourceId: reviewId,
      provenanceRef: draftId,
    },
  }));

  const review: SourceExtractionReview = {
    reviewId,
    draftId,
    fileId,
    learnerId: input.learnerId,
    reviewedByRole: input.reviewerRole ?? "SPECIALIST",
    reviewedAt: now,
    decision: "approved_for_structured_response",
    reviewerNotes: "تمت مراجعة المصدر المرفوع وتحويله إلى استجابات منظمة قبل استخدامه في بناء الهدف أو الخطة.",
    createdStructuredResponseIds: structuredResponses.map((response) => response.responseId),
    sourceRef: {
      sourceType: "UPLOADED_SOURCE_FILE",
      sourcePackage: "3A",
      sourceRecordType: "ExtractedSourceDraft",
      sourceId: draftId,
    },
  };

  const fileValidation = validateUploadedSourceFile(file);
  assertValid("UploadedSourceFile", fileValidation.ok, fileValidation.issues);
  const draftValidation = validateExtractedSourceDraft(draft);
  assertValid("ExtractedSourceDraft", draftValidation.ok, draftValidation.issues);
  const reviewValidation = validateSourceExtractionReview(review);
  assertValid("SourceExtractionReview", reviewValidation.ok, reviewValidation.issues);
  for (const response of structuredResponses) {
    const responseValidation = validateStructuredResponse(response);
    assertValid("StructuredResponse", responseValidation.ok, responseValidation.issues);
  }

  return {
    pipelineId: id("source-pipeline"),
    learnerId: input.learnerId,
    sourceNameAr: input.sourceNameAr,
    file,
    draft,
    review,
    structuredResponses,
    savedAt: now,
  };
}

export function appendSourceFilePipeline(learnerId: string, record: SourceFilePipelineRecord) {
  return saveSourceFilePipelines(learnerId, [...loadSourceFilePipelines(learnerId), record]);
}

export function summarizeSourceFilePipeline(record: SourceFilePipelineRecord) {
  return {
    id: record.pipelineId,
    labelAr: record.sourceNameAr,
    fileName: record.file.fileName,
    statusAr: record.review.decision === "approved_for_structured_response"
      ? "مراجع ومحوّل إلى استجابات منظمة"
      : "بحاجة إلى مراجعة",
    responseCount: record.structuredResponses.length,
  };
}
