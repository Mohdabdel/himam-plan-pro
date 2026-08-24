import type {
  ExtractedSourceDraft,
  ProtectedSourceFileMetadata,
  SourceFileReadFailureReason,
  SourceExtractionReview,
  SourceFileSensitivity,
  SourceExtractionReviewDecision,
  SourceType,
  StructuredResponse,
  ToolOutputChannel,
  UploadedSourceFile,
  UploadedSourcePurpose,
} from "@/domain/himam";
import {
  validateExtractedSourceDraft,
  validateProtectedSourceFileMetadata,
  validateSourceExtractionReview,
  validateStructuredResponse,
  validateUploadedSourceFile,
} from "@/domain/himam";

export type SourceFilePipelineRecord = {
  pipelineId: string;
  learnerId: string;
  sourceNameAr: string;
  file: UploadedSourceFile;
  protectedMetadata: ProtectedSourceFileMetadata;
  draft: ExtractedSourceDraft;
  review?: SourceExtractionReview;
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

type DraftPipelineInput = Omit<PipelineInput, "reviewerRole"> & {
  extractionFailureReason?: SourceFileReadFailureReason;
};

type ReviewInput = {
  reviewerRole?: string;
  decision: SourceExtractionReviewDecision;
  reviewerNotes?: string;
  correctedStatements?: string[];
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

function normalizeStatements(statements: string[] | undefined) {
  return (statements ?? [])
    .map((statement) => statement.trim())
    .filter(Boolean);
}

export function splitSourceDraftText(value: string) {
  return normalizeStatements(value.split(/\r?\n/));
}

export async function readAllowedSourceFileDraft(file: UploadedFileLike): Promise<{
  statements: string[];
  failureReason?: SourceFileReadFailureReason;
}> {
  if (!file.name?.trim()) {
    return { statements: [], failureReason: "FILE_METADATA_MISSING" };
  }
  if (file.size === 0) {
    return { statements: [], failureReason: "FILE_UNREADABLE" };
  }

  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  const textLike =
    file.type?.startsWith("text/") ||
    ["csv", "txt", "md", "json"].includes(extension);

  if (!textLike || typeof (file as File).text !== "function") {
    return {
      statements: [],
      failureReason: "UNSUPPORTED_FILE_REQUIRES_MANUAL_REVIEW",
    };
  }

  try {
    const text = await (file as File).text();
    const statements = splitSourceDraftText(text).slice(0, 8);
    if (statements.length === 0) {
      return { statements: [], failureReason: "FILE_UNREADABLE" };
    }
    return { statements };
  } catch {
    return { statements: [], failureReason: "FILE_PROTECTED" };
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

export function buildSourceFileDraftPipeline(input: DraftPipelineInput): SourceFilePipelineRecord {
  const now = new Date().toISOString();
  const sourceType = input.sourceType ?? sourceTypeForPurpose(input.purpose);
  const fileId = id("file");
  const draftId = id("extract");
  const statements = normalizeStatements(input.statements);
  const failed = Boolean(input.extractionFailureReason && statements.length === 0);
  const extractedStatements = failed
    ? []
    : statements.length > 0
      ? statements
      : [
          `تم رفع ${input.sourceNameAr} ويجب على المختص مراجعة الملف وتأكيد البنود المستخلصة قبل تحويلها إلى استجابات منظمة.`,
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
    extractionStatus: failed ? "failed" : "needs_review",
    sourceRef: {
      sourceType: "UPLOADED_SOURCE_FILE",
      sourcePackage: "3A",
      sourceRecordType: "UploadedSourceFile",
      sourceId: fileId,
    },
  };

  const protectedMetadata: ProtectedSourceFileMetadata = {
    metadataId: id("protected-file-metadata"),
    fileId,
    learnerId: input.learnerId,
    originalFileName: input.file.name,
    mimeType: input.file.type || "application/octet-stream",
    sizeBytes: input.file.size && input.file.size > 0 ? input.file.size : undefined,
    sensitivity: input.sensitivity ?? "PROFESSIONAL_SENSITIVE",
    consentStatus: "PERMITTED",
    protectedStoragePolicy: "METADATA_ONLY_NO_RAW_CONTENT",
    readFailureReason: input.extractionFailureReason,
    uploadedByRole: input.uploadedByRole ?? "SPECIALIST",
    uploadedAt: now,
    reviewAccessRoles: ["SPECIALIST", "SENIOR_SPECIALIST", "PROGRAM_ADMIN"],
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
    extractedBy: "SYSTEM_EXTRACTION",
    status: failed ? "failed" : "needs_review",
    aiDraftBoundary: "DRAFT_ONLY_REQUIRES_HUMAN_REVIEW",
    items: extractedStatements.map((statement, index) => ({
      itemId: id("extract-item"),
      statement,
      locationRef: `ملف مرفوع - بند مراجعة ${index + 1}`,
      proposedOutputChannel: input.outputChannel ?? "KNOWLEDGE_SUPPORT_ITEM",
      proposedConceptIds: [DEFAULT_CONCEPT_ID],
      confidence: 1,
    })),
    failureReason: failed ? input.extractionFailureReason : undefined,
    sourceRef: {
      sourceType: "UPLOADED_SOURCE_FILE",
      sourcePackage: "3A",
      sourceRecordType: "UploadedSourceFile",
      sourceId: fileId,
    },
  };

  const fileValidation = validateUploadedSourceFile(file);
  assertValid("UploadedSourceFile", fileValidation.ok, fileValidation.issues);
  const metadataValidation = validateProtectedSourceFileMetadata(protectedMetadata);
  assertValid("ProtectedSourceFileMetadata", metadataValidation.ok, metadataValidation.issues);
  const draftValidation = validateExtractedSourceDraft(draft);
  assertValid("ExtractedSourceDraft", draftValidation.ok, draftValidation.issues);

  return {
    pipelineId: id("source-pipeline"),
    learnerId: input.learnerId,
    sourceNameAr: input.sourceNameAr,
    file,
    protectedMetadata,
    draft,
    structuredResponses: [],
    savedAt: now,
  };
}

function buildStructuredResponses(input: {
  record: SourceFilePipelineRecord;
  reviewId: string;
  statements: string[];
  outputChannel?: ToolOutputChannel;
}) {
  const now = new Date().toISOString();
  const sourceType = input.record.file.sourceType;
  return input.statements.map((statement, index) => ({
    responseId: id("structured-response"),
    administrationId: `upload-admin-${input.record.file.fileId}`,
    learnerId: input.record.learnerId,
    toolId: input.record.file.purpose,
    questionId: `uploaded-source-review-${index + 1}`,
    responseValueType: "TEXT",
    responseCode: `UPLOADED_SOURCE_REVIEW_${index + 1}`,
    valueText: statement,
    selectedOptionIds: [],
    conceptIds: [DEFAULT_CONCEPT_ID],
    portfolioTargetIds: [DEFAULT_PORTFOLIO_ID],
    operationalFunction: input.record.file.purpose === "OFFICIAL_ASSESSMENT_RESULTS"
      ? "ESTABLISH_CURRENT_PERFORMANCE"
      : "REPORT_INPUT",
    outputChannel: input.outputChannel ?? "KNOWLEDGE_SUPPORT_ITEM",
    capturedAt: now,
    sourceRef: {
      sourceType,
      sourcePackage: "3A",
      sourceRecordType: "SourceExtractionReview",
      sourceId: input.reviewId,
      provenanceRef: input.record.draft.draftId,
    },
  })) satisfies StructuredResponse[];
}

export function applySourceExtractionReview(
  record: SourceFilePipelineRecord,
  input: ReviewInput,
): SourceFilePipelineRecord {
  if (record.draft.status === "failed") {
    throw new Error("FAILED_EXTRACTION_CANNOT_BE_REVIEWED_WITHOUT_NEW_DRAFT");
  }

  const reviewId = id("review");
  const now = new Date().toISOString();
  const correctedStatements = normalizeStatements(input.correctedStatements);
  const statements = correctedStatements.length > 0
    ? correctedStatements
    : record.draft.items.map((item) => item.statement);
  const structuredResponses = input.decision === "approved_for_structured_response"
    ? buildStructuredResponses({
        record,
        reviewId,
        statements,
        outputChannel: input.outputChannel,
      })
    : [];

  const review: SourceExtractionReview = {
    reviewId,
    draftId: record.draft.draftId,
    fileId: record.file.fileId,
    learnerId: record.learnerId,
    reviewedByRole: input.reviewerRole ?? "SPECIALIST",
    reviewedAt: now,
    decision: input.decision,
    reviewerNotes: input.reviewerNotes,
    createdStructuredResponseIds: structuredResponses.map((response) => response.responseId),
    sourceRef: {
      sourceType: "UPLOADED_SOURCE_FILE",
      sourcePackage: "3A",
      sourceRecordType: "ExtractedSourceDraft",
      sourceId: record.draft.draftId,
    },
  };

  const nextDraft: ExtractedSourceDraft = {
    ...record.draft,
    status: input.decision === "approved_for_structured_response" ? "reviewed" : "needs_review",
    items: statements.map((statement, index) => ({
      itemId: record.draft.items[index]?.itemId ?? id("extract-item"),
      statement,
      locationRef: record.draft.items[index]?.locationRef ?? `مراجعة مختص - بند ${index + 1}`,
      proposedOutputChannel: input.outputChannel ?? "KNOWLEDGE_SUPPORT_ITEM",
      proposedConceptIds: [DEFAULT_CONCEPT_ID],
      confidence: 1,
    })),
  };

  const nextFile: UploadedSourceFile = {
    ...record.file,
    extractionStatus: input.decision === "approved_for_structured_response" ? "reviewed" : "needs_review",
  };

  const fileValidation = validateUploadedSourceFile(nextFile);
  assertValid("UploadedSourceFile", fileValidation.ok, fileValidation.issues);
  const draftValidation = validateExtractedSourceDraft(nextDraft);
  assertValid("ExtractedSourceDraft", draftValidation.ok, draftValidation.issues);
  const reviewValidation = validateSourceExtractionReview(review);
  assertValid("SourceExtractionReview", reviewValidation.ok, reviewValidation.issues);
  for (const response of structuredResponses) {
    const responseValidation = validateStructuredResponse(response);
    assertValid("StructuredResponse", responseValidation.ok, responseValidation.issues);
  }

  return {
    ...record,
    file: nextFile,
    draft: nextDraft,
    review,
    structuredResponses,
    savedAt: now,
  };
}

export function buildSourceFilePipeline(input: PipelineInput): SourceFilePipelineRecord {
  const draftRecord = buildSourceFileDraftPipeline(input);
  return applySourceExtractionReview(draftRecord, {
    reviewerRole: input.reviewerRole,
    decision: "approved_for_structured_response",
    reviewerNotes: "تمت مراجعة المصدر المرفوع وتحويله إلى استجابات منظمة قبل استخدامه في بناء الهدف أو الخطة.",
    correctedStatements: input.statements,
    outputChannel: input.outputChannel,
  });
}

export function appendSourceFilePipeline(learnerId: string, record: SourceFilePipelineRecord) {
  return saveSourceFilePipelines(learnerId, [...loadSourceFilePipelines(learnerId), record]);
}

export function summarizeSourceFilePipeline(record: SourceFilePipelineRecord) {
  return {
    id: record.pipelineId,
    labelAr: record.sourceNameAr,
    fileName: record.file.fileName,
    statusAr: record.draft.status === "failed"
      ? "فشل استخراج المسودة"
      : !record.review
        ? "مسودة قراءة بانتظار مراجعة المختص"
        : record.review.decision === "approved_for_structured_response"
      ? "مراجع ومحوّل إلى استجابات منظمة"
      : "أعيد للتصحيح أو رُفض",
    responseCount: record.structuredResponses.length,
  };
}
