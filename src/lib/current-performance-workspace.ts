import type { SourceRef, UploadedSourcePurpose } from "@/domain/himam";
import type { SourceFilePipelineRecord } from "@/lib/source-file-pipeline";

export type CurrentPerformanceCardKind =
  | "CURRENT_PERFORMANCE_CUE"
  | "CONTEXT_SUPPORT"
  | "COMPLETION_GAP";

export type CurrentPerformanceCard = {
  cardId: string;
  learnerId: string;
  sourceNameAr: string;
  sourcePurpose: UploadedSourcePurpose;
  kind: CurrentPerformanceCardKind;
  statement: string;
  provenanceLabel: string;
  canSupportGoalBaseline: boolean;
  requiresHumanReviewBeforeClaim: boolean;
  sourceRef: SourceRef;
};

function classifyReviewedResponse(record: SourceFilePipelineRecord): CurrentPerformanceCardKind {
  if (record.file.purpose === "OFFICIAL_ASSESSMENT_RESULTS") {
    return "CURRENT_PERFORMANCE_CUE";
  }
  return "CONTEXT_SUPPORT";
}

export function buildCurrentPerformanceWorkspace(
  records: SourceFilePipelineRecord[],
): CurrentPerformanceCard[] {
  return records.flatMap((record): CurrentPerformanceCard[] => {
    if (record.review?.decision !== "approved_for_structured_response") {
      return record.draft.status === "failed" || record.draft.status === "needs_review"
        ? [{
            cardId: `${record.pipelineId}-gap`,
            learnerId: record.learnerId,
            sourceNameAr: record.sourceNameAr,
            sourcePurpose: record.file.purpose,
            kind: "COMPLETION_GAP",
            statement: "يوجد ملف مرفوع لم يتحول بعد إلى استجابات منظمة مراجعة؛ لا يستخدم في مستوى الأداء الحالي أو الهدف.",
            provenanceLabel: `${record.file.fileName} - ${record.draft.status}`,
            canSupportGoalBaseline: false,
            requiresHumanReviewBeforeClaim: true,
            sourceRef: record.draft.sourceRef,
          }]
        : [];
    }

    const kind = classifyReviewedResponse(record);
    return record.structuredResponses.map((response, index) => ({
      cardId: `${record.pipelineId}-${response.responseId}`,
      learnerId: record.learnerId,
      sourceNameAr: record.sourceNameAr,
      sourcePurpose: record.file.purpose,
      kind,
      statement: response.valueText ?? `استجابة منظمة ${index + 1}`,
      provenanceLabel: `${record.sourceNameAr} - ${record.file.fileName} - مراجعة مختص`,
      canSupportGoalBaseline: kind === "CURRENT_PERFORMANCE_CUE",
      requiresHumanReviewBeforeClaim: false,
      sourceRef: response.sourceRef,
    }));
  });
}

export function summarizeCurrentPerformanceWorkspace(cards: CurrentPerformanceCard[]) {
  return {
    currentPerformanceCueCount: cards.filter((card) => card.kind === "CURRENT_PERFORMANCE_CUE").length,
    contextSupportCount: cards.filter((card) => card.kind === "CONTEXT_SUPPORT").length,
    completionGapCount: cards.filter((card) => card.kind === "COMPLETION_GAP").length,
    baselineReady: cards.some((card) => card.canSupportGoalBaseline),
  };
}
