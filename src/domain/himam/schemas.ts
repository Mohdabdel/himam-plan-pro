import { z } from "zod";
import { HIMAM_CONCEPT_IDS } from "./concepts";
import { SOURCE_PACKAGES, SOURCE_RECORD_TYPES, SOURCE_TYPES } from "./source-types";

const nonEmptyString = z.string().min(1);
const isoString = nonEmptyString;

export const conceptIdSchema = z.enum(HIMAM_CONCEPT_IDS);
export const portfolioTargetIdSchema = z.enum([
  "PF_CURRENT_PERFORMANCE",
  "PF_PRIORITY",
  "PF_CONTEXT",
  "PF_SUPPORT",
  "PF_VOICE_PREFERENCE",
  "PF_PATHWAY",
  "PF_REPORT",
]);

export const operationalFunctionSchema = z.enum([
  "ESTABLISH_CURRENT_PERFORMANCE",
  "IDENTIFY_SUPPORT",
  "IDENTIFY_PRIORITY",
  "IDENTIFY_ENABLING_CONTEXT",
  "IDENTIFY_BARRIER_CONTEXT",
  "IDENTIFY_EFFECTIVE_SUPPORT",
  "IDENTIFY_INEFFECTIVE_SUPPORT",
  "RISK_PRIORITY",
  "PATHWAY_INPUT",
  "PRESERVE_FUNCTION",
  "FUTURE_CONTEXT",
  "ACTIVITY_INPUT",
  "REPORT_INPUT",
]);

export const sourceTypeSchema = z.enum(SOURCE_TYPES);
export const sourcePackageSchema = z.enum(SOURCE_PACKAGES);
export const sourceRecordTypeSchema = z.enum(SOURCE_RECORD_TYPES);

export const sourceRefSchema = z.object({
  sourceType: sourceTypeSchema,
  sourcePackage: sourcePackageSchema,
  sourceRecordType: sourceRecordTypeSchema,
  sourceId: nonEmptyString,
  provenanceRef: nonEmptyString.optional(),
});

export const learnerProfileSchema = z
  .object({
    learnerId: nonEmptyString,
    displayName: nonEmptyString,
    dateOfBirth: nonEmptyString.optional(),
    ageAtReviewInput: z.number().min(0).optional(),
    ageBand: z.enum(["UNDER_14", "AGE_14_PLUS"]),
    ageSourceRef: sourceRefSchema,
    institutionId: nonEmptyString,
    primaryProgram: nonEmptyString.optional(),
    primaryContext: nonEmptyString.optional(),
    familyVisionAvailability: z.enum([
      "AVAILABLE",
      "MISSING",
      "NOT_APPLICABLE",
      "DECLINED",
      "PENDING",
    ]),
    learnerVoiceAvailability: z.enum([
      "AVAILABLE",
      "MISSING",
      "NOT_APPLICABLE",
      "DECLINED",
      "PENDING",
    ]),
    privacyConsentStatus: z.enum(["PERMITTED", "RESTRICTED", "NOT_PERMITTED", "UNKNOWN"]),
    createdAt: isoString,
    updatedAt: isoString,
  })
  .superRefine((value, ctx) => {
    if (!value.dateOfBirth && value.ageAtReviewInput === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "LearnerProfile requires dateOfBirth or ageAtReviewInput",
      });
    }
    if (!value.primaryProgram && !value.primaryContext) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "LearnerProfile requires primaryProgram or primaryContext",
      });
    }
    if (value.ageAtReviewInput !== undefined) {
      const expected = value.ageAtReviewInput >= 14 ? "AGE_14_PLUS" : "UNDER_14";
      if (value.ageBand !== expected) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `ageBand must be ${expected} for ageAtReviewInput`,
        });
      }
    }
  });

export const independentSourceKeySchema = z
  .object({
    sourceType: sourceTypeSchema,
    administrationId: nonEmptyString,
    toolId: nonEmptyString.optional(),
    toolFamily: nonEmptyString.optional(),
    observerId: nonEmptyString.optional(),
    observerRole: nonEmptyString.optional(),
    observedAt: isoString,
    dateWindowKey: nonEmptyString.optional(),
    contextCode: nonEmptyString.optional(),
  })
  .superRefine((value, ctx) => {
    if (!value.toolId && !value.toolFamily) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "IndependentSourceKey requires toolId or toolFamily",
      });
    }
    if (!value.observerId && !value.observerRole) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "IndependentSourceKey requires observerId or observerRole",
      });
    }
  });

export const evidenceRecordSchema = z.object({
  evidenceId: nonEmptyString,
  learnerId: nonEmptyString,
  sourceResponseId: nonEmptyString,
  evidenceType: z.enum([
    "PERFORMANCE_ASSESSMENT",
    "FUNCTIONAL_OBSERVATION",
    "HISTORICAL_PERFORMANCE",
  ]),
  conceptId: conceptIdSchema,
  competencyId: nonEmptyString.optional(),
  componentIds: z.array(nonEmptyString),
  performanceCode: nonEmptyString,
  supportCodes: z.array(nonEmptyString),
  observedAt: isoString,
  portfolioTargetIds: z.array(portfolioTargetIdSchema).min(1),
  evidenceStatus: z.enum(["accepted", "excluded", "superseded"]),
  mappingMode: z.enum(["CATALOG_FIXED", "EXPLICIT_SELECTION", "INFERRED_CONFIRMED"]),
  eligibleForLevelEngine: z.boolean(),
  independentSourceKey: independentSourceKeySchema,
  sourceRef: sourceRefSchema,
});

export const knowledgeSupportItemSchema = z.object({
  knowledgeItemId: nonEmptyString,
  learnerId: nonEmptyString,
  sourceResponseId: nonEmptyString,
  informationType: z.enum([
    "LEARNER_VOICE",
    "FAMILY_VISION",
      "INTEREST_SURVEY",
      "INCLINATION_SURVEY",
      "TRANSITION_SURVEY_CHECKLIST",
      "PERSON_CENTERED_PLANNING",
      "HISTORICAL_SUPPORT",
    "HISTORICAL_CONTEXT",
    "HISTORICAL_PRIORITY",
    "RECOMMENDATION",
    "OTHER_SUPPORTING_INFORMATION",
  ]),
  conceptIds: z.array(conceptIdSchema).min(1),
  portfolioTargetIds: z.array(portfolioTargetIdSchema).min(1),
  operationalFunction: operationalFunctionSchema,
  responseCode: nonEmptyString,
  capturedAt: isoString,
  mappingMode: z.enum(["CATALOG_FIXED", "EXPLICIT_SELECTION", "INFERRED_CONFIRMED"]),
  eligibleForLevelEngine: z.literal(false),
  eligibleForPriorityEngine: z.boolean(),
  eligibleForReport: z.boolean(),
  sourceRef: sourceRefSchema,
});

export const inferenceSuggestionSchema = z
  .object({
    suggestionId: nonEmptyString,
    sourceResponseId: nonEmptyString,
    suggestedTargetType: z.enum(["CONCEPT", "COMPETENCY", "PORTFOLIO", "OPERATIONAL_FUNCTION"]),
    suggestedValue: nonEmptyString,
    reasonCode: nonEmptyString,
    confidence: z.number().min(0).max(1),
    status: z.enum(["suggested", "confirmed", "rejected"]),
    createdBy: nonEmptyString,
    createdAt: isoString,
    confirmedBy: nonEmptyString.nullable().optional(),
    confirmedAt: isoString.nullable().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.suggestedTargetType !== "CONCEPT") return;
    if (value.suggestedValue.startsWith("HIMAMPRO_")) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Suggested concept values must not use HIMAMPRO_ prefix",
        path: ["suggestedValue"],
      });
      return;
    }
    const conceptResult = conceptIdSchema.safeParse(value.suggestedValue);
    if (!conceptResult.success) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Suggested concept values must be one of the ten Himam concepts",
        path: ["suggestedValue"],
      });
    }
  });

export const informationToolOptionSchema = z.object({
  optionId: nonEmptyString,
  labelKey: nonEmptyString,
  responseCode: nonEmptyString,
  conceptIds: z.array(conceptIdSchema).optional(),
});

export const toolOutputChannelSchema = z.enum([
  "EVIDENCE_RECORD",
  "KNOWLEDGE_SUPPORT_ITEM",
  "INFERENCE_SUGGESTION",
]);

export const responseValueTypeSchema = z.enum(["TEXT", "SINGLE_SELECT", "MULTI_SELECT", "RATING"]);

export const informationToolQuestionSchema = z
  .object({
    questionId: nonEmptyString,
    promptKey: nonEmptyString,
    responseValueType: responseValueTypeSchema,
    required: z.boolean(),
    conceptIds: z.array(conceptIdSchema).min(1),
    portfolioTargetIds: z.array(portfolioTargetIdSchema).min(1),
    operationalFunction: operationalFunctionSchema,
    outputChannel: toolOutputChannelSchema,
    options: z.array(informationToolOptionSchema).optional(),
  })
  .superRefine((value, ctx) => {
    const selectable = value.responseValueType === "SINGLE_SELECT" || value.responseValueType === "MULTI_SELECT";
    if (selectable && (!value.options || value.options.length === 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Selectable questions require options",
        path: ["options"],
      });
    }
  });

export const informationToolDefinitionSchema = z.object({
  toolId: nonEmptyString,
  version: nonEmptyString,
  nameKey: nonEmptyString,
  descriptionKey: nonEmptyString,
  category: z.enum([
    "INSTITUTIONAL_ASSESSMENT",
    "FUNCTIONAL_OBSERVATION",
    "LEARNER_VOICE",
    "FAMILY_VISION",
    "INTEREST_SURVEY",
    "INCLINATION_SURVEY",
    "TRANSITION_SURVEY_CHECKLIST",
    "PERSON_CENTERED_PLANNING",
  ]),
  sourceType: sourceTypeSchema,
  active: z.boolean(),
  questions: z.array(informationToolQuestionSchema).min(1),
});

export const toolAdministrationSchema = z.object({
  administrationId: nonEmptyString,
  learnerId: nonEmptyString,
  toolId: nonEmptyString,
  toolVersion: nonEmptyString,
  administeredByRole: nonEmptyString,
  administeredAt: isoString,
  status: z.enum(["draft", "completed", "void"]),
  sourceRef: sourceRefSchema,
});

export const structuredResponseSchema = z
  .object({
    responseId: nonEmptyString,
    administrationId: nonEmptyString,
    learnerId: nonEmptyString,
    toolId: nonEmptyString,
    questionId: nonEmptyString,
    responseValueType: responseValueTypeSchema,
    responseCode: nonEmptyString,
    valueText: nonEmptyString.optional(),
    selectedOptionIds: z.array(nonEmptyString),
    conceptIds: z.array(conceptIdSchema).min(1),
    portfolioTargetIds: z.array(portfolioTargetIdSchema).min(1),
    operationalFunction: operationalFunctionSchema,
    outputChannel: toolOutputChannelSchema,
    capturedAt: isoString,
    sourceRef: sourceRefSchema,
  })
  .superRefine((value, ctx) => {
    const hasText = Boolean(value.valueText?.trim());
    const hasSelection = value.selectedOptionIds.length > 0;
    if (!hasText && !hasSelection) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "StructuredResponse requires valueText or selectedOptionIds",
      });
    }
    const knowledgeOnlySources = [
      "LEARNER_VOICE",
      "FAMILY_VISION",
      "INTEREST_SURVEY",
      "INCLINATION_SURVEY",
      "PERSON_CENTERED_PLANNING",
    ];
    if (
      knowledgeOnlySources.includes(value.sourceRef.sourceType) &&
      value.outputChannel === "EVIDENCE_RECORD"
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Voice, family, interest, and inclination responses cannot create level evidence",
        path: ["outputChannel"],
      });
    }
  });

export const verificationCheckSchema = z.object({
  status: z.enum(["NOT_RUN", "PASS", "FAIL", "NOT_APPLICABLE"]),
  command: z.string().optional(),
  exitCode: z.number().int().optional(),
  evidence: z.array(z.string()).optional(),
  notes: z.string().optional(),
});

export const verificationRunSchema = z
  .object({
    verificationRunId: nonEmptyString,
    packageId: nonEmptyString,
    deliveryMaturity: z.enum([
      "KNOWLEDGE_SPEC_ONLY",
      "CODE_PRESENT_NOT_VERIFIED",
      "VERIFIED_IMPLEMENTATION",
    ]),
    commitSha: z.string().optional(),
    startedAt: isoString,
    completedAt: isoString.optional(),
    checks: z.object({
      build: verificationCheckSchema,
      typecheck: verificationCheckSchema,
      dataIntegrity: verificationCheckSchema,
      userJourney: verificationCheckSchema,
      traceability: verificationCheckSchema,
    }),
    modifiedFiles: z.array(z.string()),
    completedItems: z.array(z.string()),
    incompleteItems: z.array(z.string()),
    knownGaps: z.array(z.string()),
    overallStatus: z.enum(["PASS", "FAIL", "NOT_VERIFIED"]),
  })
  .superRefine((value, ctx) => {
    if (value.deliveryMaturity !== "VERIFIED_IMPLEMENTATION") return;
    const statuses = Object.values(value.checks).map((check) => check.status);
    if (value.overallStatus !== "PASS" || statuses.some((status) => status !== "PASS")) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "VERIFIED_IMPLEMENTATION requires all five checks to PASS and overallStatus PASS",
      });
    }
  });
