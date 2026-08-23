import { hasLegacyHimamPrefix, HIMAM_CONCEPT_IDS, isConceptId } from "./concepts";
import {
  evidenceRecordSchema,
  endToEndTraceSchema,
  extractedSourceDraftSchema,
  goalApprovalRecordSchema,
  goalDraftSchema,
  informationToolDefinitionSchema,
  inferenceSuggestionSchema,
  knowledgeSupportItemSchema,
  learnerProfileSchema,
  planApprovalRecordSchema,
  planDraftSchema,
  planQualityReviewSchema,
  protectedSourceFileMetadataSchema,
  sourceExtractionReviewSchema,
  structuredResponseSchema,
  toolAdministrationSchema,
  uploadedSourceFileSchema,
  verificationRunSchema,
} from "./schemas";
import type {
  EvidenceRecord,
  EndToEndTrace,
  ExtractedSourceDraft,
  GoalApprovalRecord,
  GoalDraft,
  InformationToolDefinition,
  InferenceSuggestion,
  KnowledgeSupportItem,
  LearnerProfile,
  PlanApprovalRecord,
  PlanDraft,
  PlanQualityReview,
  ProtectedSourceFileMetadata,
  SourceExtractionReview,
  StructuredResponse,
  ToolAdministration,
  UploadedSourceFile,
  VerificationRun,
} from "./types";

export type ValidationIssue = {
  code: string;
  message: string;
  path?: string;
};

export type ValidationResult = {
  ok: boolean;
  issues: ValidationIssue[];
};

function fromZod(error: {
  issues: Array<{ path: Array<string | number>; message: string }>;
}): ValidationResult {
  return {
    ok: false,
    issues: error.issues.map((issue) => ({
      code: "SCHEMA_VALIDATION_FAILED",
      message: issue.message,
      path: issue.path.join("."),
    })),
  };
}

export function validateConceptValue(value: string): ValidationResult {
  if (hasLegacyHimamPrefix(value)) {
    return {
      ok: false,
      issues: [
        {
          code: "LEGACY_CONCEPT_PREFIX",
          message: "Stored concept IDs must not use HIMAMPRO_ prefix",
        },
      ],
    };
  }

  if (!isConceptId(value)) {
    return {
      ok: false,
      issues: [
        { code: "UNKNOWN_CONCEPT", message: "ConceptId must be one of the ten Himam concepts" },
      ],
    };
  }

  return { ok: true, issues: [] };
}

export function validateConceptRegistry(): ValidationResult {
  const unique = new Set(HIMAM_CONCEPT_IDS);
  const issues: ValidationIssue[] = [];

  if (HIMAM_CONCEPT_IDS.length !== 10) {
    issues.push({
      code: "CONCEPT_COUNT_INVALID",
      message: "Himam concept registry must contain exactly 10 concepts",
    });
  }
  if (unique.size !== HIMAM_CONCEPT_IDS.length) {
    issues.push({
      code: "CONCEPT_DUPLICATE",
      message: "Himam concept registry contains duplicate concept IDs",
    });
  }
  HIMAM_CONCEPT_IDS.forEach((conceptId) => {
    if (hasLegacyHimamPrefix(conceptId)) {
      issues.push({
        code: "LEGACY_CONCEPT_PREFIX",
        message: `${conceptId} must not be stored with HIMAMPRO_ prefix`,
      });
    }
  });

  return { ok: issues.length === 0, issues };
}

export function validateLearnerProfile(value: LearnerProfile): ValidationResult {
  const result = learnerProfileSchema.safeParse(value);
  return result.success ? { ok: true, issues: [] } : fromZod(result.error);
}

export function validateEvidenceRecord(value: EvidenceRecord): ValidationResult {
  const result = evidenceRecordSchema.safeParse(value);
  return result.success ? { ok: true, issues: [] } : fromZod(result.error);
}

export function validateKnowledgeSupportItem(value: KnowledgeSupportItem): ValidationResult {
  const result = knowledgeSupportItemSchema.safeParse(value);
  return result.success ? { ok: true, issues: [] } : fromZod(result.error);
}

export function validateInferenceSuggestion(value: InferenceSuggestion): ValidationResult {
  const result = inferenceSuggestionSchema.safeParse(value);
  if (!result.success) return fromZod(result.error);
  if (value.status === "suggested" && (value.confirmedAt || value.confirmedBy)) {
    return {
      ok: false,
      issues: [
        {
          code: "SUGGESTED_INFERENCE_CONFIRMED_FIELDS",
          message: "Suggested inference cannot carry confirmation fields",
        },
      ],
    };
  }
  return { ok: true, issues: [] };
}

export function validateInformationToolDefinition(
  value: InformationToolDefinition,
): ValidationResult {
  const result = informationToolDefinitionSchema.safeParse(value);
  return result.success ? { ok: true, issues: [] } : fromZod(result.error);
}

export function validateToolAdministration(value: ToolAdministration): ValidationResult {
  const result = toolAdministrationSchema.safeParse(value);
  return result.success ? { ok: true, issues: [] } : fromZod(result.error);
}

export function validateStructuredResponse(value: StructuredResponse): ValidationResult {
  const result = structuredResponseSchema.safeParse(value);
  return result.success ? { ok: true, issues: [] } : fromZod(result.error);
}

export function validateUploadedSourceFile(value: UploadedSourceFile): ValidationResult {
  const result = uploadedSourceFileSchema.safeParse(value);
  return result.success ? { ok: true, issues: [] } : fromZod(result.error);
}

export function validateProtectedSourceFileMetadata(
  value: ProtectedSourceFileMetadata,
): ValidationResult {
  const result = protectedSourceFileMetadataSchema.safeParse(value);
  return result.success ? { ok: true, issues: [] } : fromZod(result.error);
}

export function validateExtractedSourceDraft(value: ExtractedSourceDraft): ValidationResult {
  const result = extractedSourceDraftSchema.safeParse(value);
  return result.success ? { ok: true, issues: [] } : fromZod(result.error);
}

export function validateSourceExtractionReview(value: SourceExtractionReview): ValidationResult {
  const result = sourceExtractionReviewSchema.safeParse(value);
  return result.success ? { ok: true, issues: [] } : fromZod(result.error);
}

export function validateGoalDraft(value: GoalDraft): ValidationResult {
  const result = goalDraftSchema.safeParse(value);
  return result.success ? { ok: true, issues: [] } : fromZod(result.error);
}

export function validateGoalApprovalRecord(value: GoalApprovalRecord): ValidationResult {
  const result = goalApprovalRecordSchema.safeParse(value);
  return result.success ? { ok: true, issues: [] } : fromZod(result.error);
}

export function validatePlanDraft(value: PlanDraft): ValidationResult {
  const result = planDraftSchema.safeParse(value);
  return result.success ? { ok: true, issues: [] } : fromZod(result.error);
}

export function validatePlanQualityReview(value: PlanQualityReview): ValidationResult {
  const result = planQualityReviewSchema.safeParse(value);
  return result.success ? { ok: true, issues: [] } : fromZod(result.error);
}

export function validatePlanApprovalRecord(value: PlanApprovalRecord): ValidationResult {
  const result = planApprovalRecordSchema.safeParse(value);
  return result.success ? { ok: true, issues: [] } : fromZod(result.error);
}

export function validateEndToEndTrace(value: EndToEndTrace): ValidationResult {
  const result = endToEndTraceSchema.safeParse(value);
  return result.success ? { ok: true, issues: [] } : fromZod(result.error);
}

export function validateAutomatedHumanApprovalWrite(input: {
  actorContext: "AUTOMATED_PACKAGE" | "EXTERNAL_AUTHORIZED_APPROVAL_HOOK";
  attemptedValue: string | null | undefined;
}): ValidationResult {
  if (input.actorContext === "AUTOMATED_PACKAGE" && input.attemptedValue) {
    return {
      ok: false,
      issues: [
        {
          code: "HUMAN_APPROVAL_AUTOMATED_WRITE",
          message: "Automated package contexts cannot write humanApprovalReference",
        },
      ],
    };
  }
  return { ok: true, issues: [] };
}

export function validateVerificationRun(value: VerificationRun): ValidationResult {
  const result = verificationRunSchema.safeParse(value);
  return result.success ? { ok: true, issues: [] } : fromZod(result.error);
}
