import type { EvidenceRecord, InferenceSuggestion, KnowledgeSupportItem, LearnerProfile } from "./types";
import type { ValidationResult } from "./validators";
import {
  validateEvidenceRecord,
  validateInferenceSuggestion,
  validateKnowledgeSupportItem,
  validateLearnerProfile,
} from "./validators";
import type { KeyValueStore } from "./storage";
import { readJsonArray, writeJsonArray } from "./storage";

export const STAGE2_STORAGE_KEYS = {
  learners: "himam.stage2.learners",
  evidence: "himam.stage2.evidence",
  knowledgeSupport: "himam.stage2.knowledgeSupport",
  inferenceSuggestions: "himam.stage2.inferenceSuggestions",
} as const;

export type RepositoryResult<T> =
  | { ok: true; value: T }
  | { ok: false; validation: ValidationResult };

function validationFailure<T>(validation: ValidationResult): RepositoryResult<T> {
  return { ok: false, validation };
}

function success<T>(value: T): RepositoryResult<T> {
  return { ok: true, value };
}

function upsertById<T>(records: T[], id: string, getId: (record: T) => string, next: T): T[] {
  const existing = records.filter((record) => getId(record) !== id);
  return [...existing, next];
}

function readValidatedArray<T>(
  store: KeyValueStore,
  key: string,
  validate: (record: T) => ValidationResult,
): T[] {
  return readJsonArray<unknown>(store, key).filter(
    (record): record is T => validate(record as T).ok,
  );
}

export function createLearnerProfileRepository(store: KeyValueStore) {
  return {
    list(): LearnerProfile[] {
      return readValidatedArray<LearnerProfile>(
        store,
        STAGE2_STORAGE_KEYS.learners,
        validateLearnerProfile,
      );
    },

    findById(learnerId: string): LearnerProfile | null {
      return this.list().find((profile) => profile.learnerId === learnerId) ?? null;
    },

    save(profile: LearnerProfile): RepositoryResult<LearnerProfile> {
      const validation = validateLearnerProfile(profile);
      if (!validation.ok) return validationFailure(validation);
      const next = upsertById(this.list(), profile.learnerId, (item) => item.learnerId, profile);
      writeJsonArray(store, STAGE2_STORAGE_KEYS.learners, next);
      return success(profile);
    },
  };
}

export function createEvidenceRepository(store: KeyValueStore) {
  return {
    list(): EvidenceRecord[] {
      return readValidatedArray<EvidenceRecord>(
        store,
        STAGE2_STORAGE_KEYS.evidence,
        validateEvidenceRecord,
      );
    },

    listForLearner(learnerId: string): EvidenceRecord[] {
      return this.list().filter((record) => record.learnerId === learnerId);
    },

    save(record: EvidenceRecord): RepositoryResult<EvidenceRecord> {
      const validation = validateEvidenceRecord(record);
      if (!validation.ok) return validationFailure(validation);
      const next = upsertById(this.list(), record.evidenceId, (item) => item.evidenceId, record);
      writeJsonArray(store, STAGE2_STORAGE_KEYS.evidence, next);
      return success(record);
    },
  };
}

export function createKnowledgeSupportRepository(store: KeyValueStore) {
  return {
    list(): KnowledgeSupportItem[] {
      return readValidatedArray<KnowledgeSupportItem>(
        store,
        STAGE2_STORAGE_KEYS.knowledgeSupport,
        validateKnowledgeSupportItem,
      );
    },

    listForLearner(learnerId: string): KnowledgeSupportItem[] {
      return this.list().filter((record) => record.learnerId === learnerId);
    },

    save(record: KnowledgeSupportItem): RepositoryResult<KnowledgeSupportItem> {
      const validation = validateKnowledgeSupportItem(record);
      if (!validation.ok) return validationFailure(validation);
      const next = upsertById(
        this.list(),
        record.knowledgeItemId,
        (item) => item.knowledgeItemId,
        record,
      );
      writeJsonArray(store, STAGE2_STORAGE_KEYS.knowledgeSupport, next);
      return success(record);
    },
  };
}

export function createInferenceSuggestionRepository(store: KeyValueStore) {
  return {
    list(): InferenceSuggestion[] {
      return readValidatedArray<InferenceSuggestion>(
        store,
        STAGE2_STORAGE_KEYS.inferenceSuggestions,
        validateInferenceSuggestion,
      );
    },

    listForSourceResponse(sourceResponseId: string): InferenceSuggestion[] {
      return this.list().filter((record) => record.sourceResponseId === sourceResponseId);
    },

    save(record: InferenceSuggestion): RepositoryResult<InferenceSuggestion> {
      const validation = validateInferenceSuggestion(record);
      if (!validation.ok) return validationFailure(validation);
      const next = upsertById(this.list(), record.suggestionId, (item) => item.suggestionId, record);
      writeJsonArray(store, STAGE2_STORAGE_KEYS.inferenceSuggestions, next);
      return success(record);
    },
  };
}

export function createStage2Repositories(store: KeyValueStore) {
  return {
    learners: createLearnerProfileRepository(store),
    evidence: createEvidenceRepository(store),
    knowledgeSupport: createKnowledgeSupportRepository(store),
    inferenceSuggestions: createInferenceSuggestionRepository(store),
  };
}
