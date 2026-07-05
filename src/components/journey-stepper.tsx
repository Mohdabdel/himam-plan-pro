import { Link } from "@tanstack/react-router";
import { JOURNEY_STEPS, getFurthestAccessibleStepIndex, getStageRank, type StepId } from "@/lib/journey";

const TEAL = "#0F3D3E";

type JourneyStepperProps = {
  studentId: string;
  currentStep: StepId;
  status: string | undefined;
};

/**
 * Shared progress strip for the assessment → coverage → family →
 * student-voice → iep → plan → report journey. Self-contained inline
 * styles so it renders identically whether the host route uses Tailwind
 * classes or inline style objects (both conventions exist in this app).
 */
export function JourneyStepper({ studentId, currentStep, status }: JourneyStepperProps) {
  const currentIndex = JOURNEY_STEPS.findIndex((s) => s.id === currentStep);
  const furthestIndex = getFurthestAccessibleStepIndex(status);
  const rank = getStageRank(status);

  return (
    <nav
      aria-label="مراحل الرحلة"
      style={{
        display: "flex",
        alignItems: "center",
        background: "white",
        border: "1px solid #E5E7EB",
        borderRadius: 12,
        padding: "12px 16px",
        marginBottom: 20,
        overflowX: "auto",
        gap: 0,
      }}
    >
      {JOURNEY_STEPS.map((step, i) => {
        const isCurrent = i === currentIndex;
        const isDone = step.completionRank <= rank;
        const isAccessible = i <= furthestIndex;
        const isLast = i === JOURNEY_STEPS.length - 1;

        const dotStyle: React.CSSProperties = {
          width: 22,
          height: 22,
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 11,
          fontWeight: 700,
          flexShrink: 0,
          border: `2px solid ${isCurrent ? TEAL : isDone ? TEAL : "#D1D5DB"}`,
          background: isCurrent ? TEAL : isDone ? "#E6F2F1" : "white",
          color: isCurrent ? "white" : isDone ? TEAL : "#9CA3AF",
        };

        const labelStyle: React.CSSProperties = {
          fontSize: 12,
          fontWeight: isCurrent ? 700 : 600,
          color: isCurrent ? TEAL : isAccessible ? "#374151" : "#B0B7C3",
          whiteSpace: "nowrap",
        };

        const itemContent = (
          <>
            <span style={dotStyle}>{isDone ? "✓" : i + 1}</span>
            <span style={labelStyle}>{step.label}</span>
          </>
        );

        return (
          <span key={step.id} style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
            {isAccessible ? (
              <Link
                to={step.routeTo}
                params={{ id: studentId }}
                aria-current={isCurrent ? "step" : undefined}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  textDecoration: "none",
                  padding: "4px 6px",
                  borderRadius: 8,
                }}
              >
                {itemContent}
              </Link>
            ) : (
              <span
                aria-disabled="true"
                style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 6px", cursor: "not-allowed" }}
              >
                {itemContent}
              </span>
            )}
            {!isLast && (
              <span
                style={{
                  width: 20,
                  height: 2,
                  margin: "0 6px",
                  background: step.completionRank <= rank ? TEAL : "#E5E7EB",
                  flexShrink: 0,
                }}
              />
            )}
          </span>
        );
      })}
    </nav>
  );
}
