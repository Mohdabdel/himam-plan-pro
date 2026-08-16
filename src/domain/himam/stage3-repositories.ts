import type { StructuredResponse, ToolAdministration } from "./types";
import type { ValidationResult } from "./validators";
import { validateStructuredResponse, validateToolAdministration } from "./validators";
import type { KeyValueStore } from "./storage";
import { readJsonArray, writeJsonArray } from "./storage";

export const STAGE3_STORAGE_KEYS = {
  administrations: "himam.stage3.toolAdministrations",
  responses: "himam.stage3.structuredResponses",
} as const;

export type Stage3RepositoryResult<T> =
  | { ok: true; value: T }
  | { ok: false; validation: ValidationResult };

function validationFailure<T>(validation: ValidationResult): Stage3RepositoryResult<T> {
  return { ok: false, validation };
}

function success<T>(value: T): Stage3RepositoryResult<T> {
  return { ok: true, value };
}

function upsertById<T>(records: T[], id: string, getId: (record: T) => string, next: T): T[] {
  return [...records.filter((record) => getId(record) !== id), next];
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

export function createToolAdministrationRepository(store: KeyValueStore) {
  return {
    list(): ToolAdministration[] {
      return readValidatedArray<ToolAdministration>(
        store,
        STAGE3_STORAGE_KEYS.administrations,
        validateToolAdministration,
      );
    },

    listForLearner(learnerId: string): ToolAdministration[] {
      return this.list().filter((record) => record.learnerId === learnerId);
    },

    save(record: ToolAdministration): Stage3RepositoryResult<ToolAdministration> {
      const validation = validateToolAdministration(record);
      if (!validation.ok) return validationFailure(validation);
      const next = upsertById(this.list(), record.administrationId, (item) => item.administrationId, record);
      writeJsonArray(store, STAGE3_STORAGE_KEYS.administrations, next);
      return success(record);
    },
  };
}

export function createStructuredResponseRepository(store: KeyValueStore) {
  return {
    list(): StructuredResponse[] {
      return readValidatedArray<StructuredResponse>(
        store,
        STAGE3_STORAGE_KEYS.responses,
        validateStructuredResponse,
      );
    },

    listForAdministration(administrationId: string): StructuredResponse[] {
      return this.list().filter((record) => record.administrationId === administrationId);
    },

    listForLearner(learnerId: string): StructuredResponse[] {
      return this.list().filter((record) => record.learnerId === learnerId);
    },

    save(record: StructuredResponse): Stage3RepositoryResult<StructuredResponse> {
      const validation = validateStructuredResponse(record);
      if (!validation.ok) return validationFailure(validation);
      const next = upsertById(this.list(), record.responseId, (item) => item.responseId, record);
      writeJsonArray(store, STAGE3_STORAGE_KEYS.responses, next);
      return success(record);
    },
  };
}

export function createStage3Repositories(store: KeyValueStore) {
  return {
    administrations: createToolAdministrationRepository(store),
    responses: createStructuredResponseRepository(store),
  };
}
