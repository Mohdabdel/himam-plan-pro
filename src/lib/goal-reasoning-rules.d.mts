export type MeasurementType =
  | "discrete task"
  | "chained task"
  | "duration"
  | "communication"
  | "initiation"
  | "transition"
  | "production";

export type AssessmentPriorityRef = {
  ref: string;
  rating: "emerge" | "fail";
  kind: "emerging" | "need";
  noteAr: string;
  sourceNameAr: string;
};

export function fidelityKindFromRating(rating: string): "strength" | "emerging" | "need" | "unknown";
export function assessmentPriorityRefsForDomain(
  records: Array<{ id: string; toolNameAr?: string; domains?: Array<{ domainCode: string; domainNameAr: string; rating: string; note?: string }> }>,
  domainCode: string,
  domainNameAr: string,
): AssessmentPriorityRef[];
export function inferBehaviorTopology(skillAr: string, domainNameAr?: string): MeasurementType;
export function measurementForTopology(topology: MeasurementType): {
  measurementType: MeasurementType;
  dataCollectionMethodAr: string;
};
export function criterionFromBaseline(baselineAr: string, topology: MeasurementType): string;
export function contextFromProfile(environmentContexts?: string[], supportConditions?: string[]): string;
export function preparatorySkillFor(skillAr: string, topology: MeasurementType): string;
export function proposalReasoning(input: {
  variant: "near_current_performance" | "functional_transition" | "preparatory";
  skillAr: string;
  domainNameAr: string;
  baselineAr: string;
  environmentContexts?: string[];
  supportConditions?: string[];
}): {
  topology: MeasurementType;
  measurementType: MeasurementType;
  dataCollectionMethodAr: string;
  targetSkillAr: string;
  contextAr: string;
  criterionAr: string;
  actionAr: string;
  whyAr: string;
};
