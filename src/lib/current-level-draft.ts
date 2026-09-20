import type {
  AssessmentRecord,
  LearnerProfileProcessingModel,
  ProcessedConceptProfile,
} from "@/types/himam";

type CurrentLevelDomainSource = {
  domainCode: string;
  domainNameAr: string;
  rating?: string;
  note?: string;
  linkedConcepts: string[];
};

export type ProcessedCurrentLevelRow = {
  domainCode: string;
  domainNameAr: string;
  strengths: string;
  needs: string;
  sourceSummaryAr: string;
  evidenceCount: number;
  supportConditionCount: number;
  priorityCount: number;
  goalOpportunityCount: number;
  proposedByPlatform: boolean;
};

const FALLBACK_DOMAINS = [
  { domainCode: "VS", domainNameAr: "المهارات المهنية", linkedConcepts: ["VOC"] },
  { domainCode: "VB", domainNameAr: "السلوكيات المهنية", linkedConcepts: ["SOC"] },
  { domainCode: "IF", domainNameAr: "الأداء الوظيفي المستقل", linkedConcepts: ["ADL"] },
  { domainCode: "LS", domainNameAr: "مهارات الترفيه", linkedConcepts: ["SOC"] },
  { domainCode: "FC", domainNameAr: "التواصل الوظيفي", linkedConcepts: ["COMM"] },
  { domainCode: "IB", domainNameAr: "السلوك البينشخصي", linkedConcepts: ["SOC"] },
];

function uniqueLines(lines: string[]) {
  return Array.from(new Set(lines.map((line) => line.trim()).filter(Boolean))).join("\n");
}

function latestAssessmentRecord(records: AssessmentRecord[]) {
  return [...records].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0] ?? null;
}

function profileMatchesDomain(profile: ProcessedConceptProfile, linkedConcepts: string[]) {
  return linkedConcepts.includes(profile.conceptId);
}

function ratingStrengthLine(domainNameAr: string, rating?: string, note?: string) {
  if (rating !== "pass") return "";
  return `${domainNameAr}: ${note?.trim() || "ظهر كمجال قوة في نتائج التقييم الرسمي المراجعة."}`;
}

function ratingNeedLine(domainNameAr: string, rating?: string, note?: string) {
  if (rating !== "emerge" && rating !== "fail") return "";
  const descriptor = rating === "emerge" ? "مهارة ناشئة تحتاج تعميقاً" : "احتياج تدريبي واضح";
  return `${domainNameAr}: ${note?.trim() || descriptor} وفق نتائج التقييم الرسمي المراجعة.`;
}

function strengthLinesFromProfiles(profiles: ProcessedConceptProfile[]) {
  return profiles.flatMap((profile) => [
    ...profile.strengths.slice(0, 2).map((input) => `${profile.conceptNameAr}: ${input.valueAr}`),
    ...profile.evidenceCandidates.slice(0, 1).map((input) => `${profile.conceptNameAr}: دليل أداء مراجع من ${input.provenanceLabel}: ${input.valueAr}`),
  ]);
}

function needLinesFromProfiles(profiles: ProcessedConceptProfile[]) {
  return profiles.flatMap((profile) => [
    ...profile.needs.slice(0, 2).map((input) => `${profile.conceptNameAr}: ${input.valueAr}`),
    ...profile.gapsAr.slice(0, 1).map((gap) => `${profile.conceptNameAr}: ${gap}`),
  ]);
}

export function buildProcessedCurrentLevelRows(input: {
  assessmentRecords: AssessmentRecord[];
  profileProcessing: LearnerProfileProcessingModel;
}): ProcessedCurrentLevelRow[] {
  const latestAssessment = latestAssessmentRecord(input.assessmentRecords);
  const domains: CurrentLevelDomainSource[] = latestAssessment?.domains?.length
    ? latestAssessment.domains
    : FALLBACK_DOMAINS;

  return domains.map((domain) => {
    const linkedConcepts = domain.linkedConcepts ?? [];
    const relatedProfiles = input.profileProcessing.conceptProfiles.filter((profile) => (
      profileMatchesDomain(profile, linkedConcepts)
    ));
    const evidenceCount = relatedProfiles.reduce((sum, profile) => sum + profile.evidenceCandidates.length, 0);
    const supportConditionCount = relatedProfiles.reduce((sum, profile) => sum + profile.supportConditions.length, 0);
    const priorityCount = relatedProfiles.reduce((sum, profile) => sum + profile.priorities.length, 0);
    const goalOpportunityCount = relatedProfiles.reduce((sum, profile) => sum + profile.goalOpportunities.length, 0);

    const strengths = uniqueLines([
      ratingStrengthLine(domain.domainNameAr, domain.rating, domain.note),
      ...strengthLinesFromProfiles(relatedProfiles),
    ]);
    const needs = uniqueLines([
      ratingNeedLine(domain.domainNameAr, domain.rating, domain.note),
      ...needLinesFromProfiles(relatedProfiles),
    ]);

    return {
      domainCode: domain.domainCode,
      domainNameAr: domain.domainNameAr,
      strengths,
      needs,
      sourceSummaryAr: [
        latestAssessment ? `التقييم الرسمي: ${latestAssessment.toolNameAr}` : "لا يوجد تقييم رسمي محفوظ بعد",
        evidenceCount > 0 ? `${evidenceCount} دليل أداء/استجابة مراجعة` : "لا توجد دلائل أداء مراجعة في هذا المجال",
        priorityCount > 0 ? `${priorityCount} أولوية مرتبطة` : "",
        supportConditionCount > 0 ? `${supportConditionCount} شرط دعم` : "",
      ].filter(Boolean).join(" - "),
      evidenceCount,
      supportConditionCount,
      priorityCount,
      goalOpportunityCount,
      proposedByPlatform: Boolean(strengths || needs || evidenceCount || priorityCount || supportConditionCount),
    };
  });
}
