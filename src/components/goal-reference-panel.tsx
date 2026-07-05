const TEAL = "#0F3D3E";

export type ReferenceAssessmentEntry = { score: string; note?: string } | null;
export type ReferenceCoverage = {
  filledDomains?: string[];
  failedDomains?: string[];
  emergingDomains?: string[];
  completionPercent?: number;
} | null;
export type ReferenceFamily = { priorities?: string[]; vision5y?: string } | null;
export type ReferenceLearnerVoice = { q_love?: string; q_good?: string } | null;

type GoalReferencePanelProps = {
  domainCode: string;
  domainName: string;
  tool: string;
  assessment: ReferenceAssessmentEntry;
  coverage: ReferenceCoverage;
  family: ReferenceFamily;
  learnerVoice: ReferenceLearnerVoice;
};

const SCORE_LABEL: Record<string, string> = {
  pass: "✓ نجح",
  emerge: "◑ ناشئ",
  fail: "✗ لم ينجح",
};

const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div style={{ paddingBottom: 8, marginBottom: 8, borderBottom: "1px solid #E5E7EB" }}>
    <p style={{ fontSize: 11, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: 0.3, margin: "0 0 3px" }}>
      {label}
    </p>
    <div style={{ fontSize: 13, color: "#1F2937" }}>{children}</div>
  </div>
);

/**
 * Curated, read-only context strip for the domain currently being worked on
 * in the IEP goal editor — the seven items requested, nothing more. Each
 * value is read from data that already exists (assessment, coverage, family
 * voice, learner voice); nothing here is invented or scored.
 */
export function GoalReferencePanel({ domainCode, domainName, tool, assessment, coverage, family, learnerVoice }: GoalReferencePanelProps) {
  const isCovered = !!coverage?.filledDomains?.includes(domainCode);
  const isNeed = !!coverage && (
    (coverage.failedDomains ?? []).includes(domainCode) ||
    (coverage.emergingDomains ?? []).includes(domainCode)
  );

  const sources: string[] = [];
  if (assessment) sources.push(`التقييم الرسمي — ${tool || "أداة غير محددة"}`);
  if (family) sources.push("صوت الأسرة");
  if (learnerVoice) sources.push("صوت المتعلم");

  let readiness: string;
  let readinessColor: string;
  if (isNeed && !family && !learnerVoice) {
    readiness = "⚠ تعارض: مجال ذو أولوية عالية دون صوت أسرة أو متعلم موثّق بعد";
    readinessColor = "#B91C1C";
  } else if (assessment && coverage && family && learnerVoice) {
    readiness = "✓ جاهزية عالية — جميع مصادر السياق متوفرة لهذا المجال";
    readinessColor = "#15803D";
  } else {
    readiness = "جاهزية متوسطة — بعض مصادر السياق غير متوفرة بعد";
    readinessColor = "#92400E";
  }

  return (
    <div style={{ background: "#FAFAF8", border: "1px solid #E5E7EB", borderRadius: 8, padding: 12, marginBottom: 12 }}>
      <p style={{ fontSize: 12, fontWeight: 800, color: TEAL, margin: "0 0 10px" }}>اللوحة المرجعية</p>

      <Row label="المجال الحالي">
        {domainName} <span style={{ fontSize: 11, color: "#94A3B8" }}>({domainCode})</span>
      </Row>

      <Row label="Baseline مختصر">
        {assessment?.score ? (
          <>
            {SCORE_LABEL[assessment.score] ?? assessment.score}
            {assessment.note ? ` — ${assessment.note}` : ""}
          </>
        ) : (
          "لم يُقيَّم هذا المجال بعد"
        )}
      </Row>

      <Row label="حالة التغطية / الثقة">
        {!coverage
          ? "لا تتوفر بيانات تغطية بعد"
          : isCovered
            ? `مُغطّى ضمن التغطية الحالية (${coverage.completionPercent ?? 0}% من المجالات إجمالاً)`
            : "غير مُغطّى ضمن التغطية الحالية"}
      </Row>

      <Row label="مصدران رئيسيان على الأكثر">
        {sources.length === 0 ? "لا تتوفر مصادر موثّقة بعد" : sources.slice(0, 2).join(" · ")}
      </Row>

      <Row label="أولوية الأسرة/المتعلم ذات الصلة">
        {family?.priorities?.[0] ?? "لم تُسجَّل أولويات أسرة بعد"}
      </Row>

      <Row label="نقطة قوة أو اهتمام مرتبط">
        {learnerVoice?.q_love || learnerVoice?.q_good || "لم يُسجَّل صوت المتعلم بعد"}
      </Row>

      <div>
        <p style={{ fontSize: 11, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: 0.3, margin: "0 0 3px" }}>
          مؤشر الجاهزية / التعارض
        </p>
        <p style={{ fontSize: 13, fontWeight: 600, color: readinessColor, margin: 0 }}>{readiness}</p>
      </div>
    </div>
  );
}
