/**
 * Shared transition architecture contracts.
 *
 * This module deliberately separates organizing concepts, competencies,
 * enabling skills, performance/access dimensions, and functional scenarios.
 * It is additive and version-aware so legacy Himam data can coexist with
 * pre-CVI and future validated schemes without being silently reclassified.
 */

export const TRANSITION_ENTITY_TYPES = [
  "TRANSITION_CONCEPT",
  "COMPETENCY",
  "ENABLING_SKILL",
  "PERFORMANCE_DIMENSION",
  "FUNCTIONAL_SCENARIO",
] as const;

export type TransitionEntityType = (typeof TRANSITION_ENTITY_TYPES)[number];

export const TRANSITION_VALIDATION_STATUSES = [
  "legacy_active",
  "pre_cvi",
  "validated",
  "retired",
] as const;

export type TransitionValidationStatus =
  (typeof TRANSITION_VALIDATION_STATUSES)[number];

export const TRANSITION_MAPPING_TYPES = [
  "exact",
  "broader",
  "narrower",
  "related",
  "unmapped",
] as const;

export type TransitionMappingType = (typeof TRANSITION_MAPPING_TYPES)[number];

export const TRANSITION_MAPPING_STATUSES = [
  "provisional",
  "validated",
  "retired",
] as const;

export type TransitionMappingStatus =
  (typeof TRANSITION_MAPPING_STATUSES)[number];

export type TransitionSchemeDefinition = {
  schemeId: string;
  schemeVersion: string;
  entityType: TransitionEntityType;
  labelAr?: string;
  validationStatus: TransitionValidationStatus;
  frozenForProduction: boolean;
  provenanceRefs: string[];
};

export type TransitionEntityRef = {
  schemeId: string;
  schemeVersion: string;
  entityType: TransitionEntityType;
  entityId: string;
  validationStatus: TransitionValidationStatus;
};

export type TransitionMapping = {
  mappingId: string;
  from: TransitionEntityRef;
  to?: TransitionEntityRef;
  mappingType: TransitionMappingType;
  mappingStatus: TransitionMappingStatus;
  rationale?: string;
  provenanceRefs: string[];
};

export type CompetencyDefinition = {
  ref: TransitionEntityRef;
  labelAr: string;
  descriptionAr?: string;
  outcomeFamilyId?: string;
  provenanceRefs: string[];
};

export type EnablingSkillDefinition = {
  ref: TransitionEntityRef;
  labelAr: string;
  descriptionAr?: string;
  parentCompetencyRefs: TransitionEntityRef[];
  provenanceRefs: string[];
};

export type PerformanceDimensionDefinition = {
  ref: TransitionEntityRef;
  labelAr: string;
  descriptionAr?: string;
  appliesToEntityTypes: TransitionEntityType[];
  provenanceRefs: string[];
};

export type FunctionalScenarioDefinition = {
  ref: TransitionEntityRef;
  labelAr: string;
  descriptionAr?: string;
  requiredCompetencyRefs: TransitionEntityRef[];
  enablingSkillRefs: TransitionEntityRef[];
  provenanceRefs: string[];
};

/**
 * Current Himam concepts remain a valid legacy organizing scheme.
 * This constant does not change or expand the ten stored concept IDs.
 */
export const HIMAM_LEGACY_CONCEPT_SCHEME: TransitionSchemeDefinition = {
  schemeId: "himam-concepts",
  schemeVersion: "v1.1",
  entityType: "TRANSITION_CONCEPT",
  labelAr: "مفاهيم الانتقال الحالية في همم",
  validationStatus: "legacy_active",
  frozenForProduction: false,
  provenanceRefs: ["src/domain/himam/concepts.ts"],
};

/**
 * Gate A is intentionally represented only as a scheme placeholder before CVI.
 * Candidate competency content must not govern production decisions until an
 * explicit validated version is registered after external review.
 */
export const GATE_A_PRE_CVI_SCHEME: TransitionSchemeDefinition = {
  schemeId: "gate-a",
  schemeVersion: "pre-cvi-2026",
  entityType: "COMPETENCY",
  labelAr: "Gate A — كفاءات مرشحة قبل التحكيم الخارجي",
  validationStatus: "pre_cvi",
  frozenForProduction: true,
  provenanceRefs: ["Gate A external CVI package"],
};

export function isSchemeProductionEligible(
  scheme: TransitionSchemeDefinition,
): boolean {
  if (scheme.frozenForProduction) return false;
  return scheme.validationStatus === "legacy_active" || scheme.validationStatus === "validated";
}
