import type {
  EndToEndTrace,
  GoalQualityReview,
  Learner,
  ReportBuildInput,
  ReportClaim,
  ReportPackage,
  SufficiencyReview,
  TraceRef,
} from "./types.js";

function id(prefix: string, parts: string[]) {
  return `${prefix}_${parts.join("_")}`.replace(/[^a-zA-Z0-9_]/g, "_");
}

function uniqueTraceRefs(traceRefs: TraceRef[]) {
  const seen = new Set<string>();
  return traceRefs.filter((traceRef) => {
    const key = `${traceRef.sourceKind}:${traceRef.sourceId}:${traceRef.field ?? ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function learnerClaim(learner: Learner): ReportClaim {
  return {
    id: id("claim", [learner.id, "profile"]),
    learnerId: learner.id,
    type: "learner_profile",
    title: "Learner profile was created",
    body: `${learner.name} has a learner profile with age, diagnosis, institution, and entry status stored as basic data.`,
    sourceRefs: [],
  };
}

function sufficiencyClaim(review: SufficiencyReview): ReportClaim {
  const sourceRefs = uniqueTraceRefs(review.classifiedInformation.flatMap((item) => item.traceRefs));
  const blockingCount = review.gaps.filter((gap) => gap.blocksWorkflow).length;
  return {
    id: id("claim", [review.learnerId, "information_sufficiency"]),
    learnerId: review.learnerId,
    type: "information_sufficiency",
    title: review.minimumReady ? "Minimum information is present" : "Minimum information is incomplete",
    body:
      blockingCount === 0
        ? "The learner has the minimum information required to proceed to plan drafting, while quality recommendations may remain."
        : `The learner has ${blockingCount} blocking information gap(s) that must be completed before plan drafting.`,
    sourceRefs,
  };
}

function qualityClaim(goalQualityReview: GoalQualityReview, learnerId: string, sourceRefs: TraceRef[]): ReportClaim {
  const hardStops = goalQualityReview.issues.filter((issue) => issue.severity === "hard_stop");
  return {
    id: id("claim", [learnerId, "goal_quality"]),
    learnerId,
    type: "goal_quality",
    title: hardStops.length === 0 ? "Goal draft passed hard-stop checks" : "Goal draft needs revision",
    body:
      hardStops.length === 0
        ? "The draft goal has no hard-stop quality issue and may be prepared for human review."
        : `The draft goal has ${hardStops.length} hard-stop quality issue(s) that require revision.`,
    sourceRefs,
  };
}

function humanBoundaryClaim(learnerId: string): ReportClaim {
  return {
    id: id("claim", [learnerId, "human_review_boundary"]),
    learnerId,
    type: "human_review_boundary",
    title: "Human approval remains external",
    body: "Himam can prepare a draft and quality review, but final plan approval is performed by the authorized human team.",
    sourceRefs: [],
  };
}

function traceForClaim(claim: ReportClaim, input: ReportBuildInput): EndToEndTrace {
  const sourceSteps = claim.sourceRefs.map((sourceRef) => ({
    label: `Source: ${sourceRef.sourceKind}`,
    recordId: sourceRef.sourceId,
    recordType: "InformationSource" as const,
  }));

  const steps = [
    {
      label: "Learner",
      recordId: input.learner.id,
      recordType: "Learner" as const,
    },
    ...sourceSteps,
    {
      label: "Sufficiency review",
      recordId: input.sufficiencyReview.learnerId,
      recordType: "ClassifiedInformation" as const,
    },
    {
      label: "Goal draft",
      recordId: input.goalDraft.id,
      recordType: "GoalDraft" as const,
    },
    {
      label: "Goal quality review",
      recordId: input.goalQualityReview.goalDraftId,
      recordType: "GoalQualityReview" as const,
    },
    {
      label: "Report claim",
      recordId: claim.id,
      recordType: "ReportClaim" as const,
    },
  ];

  return {
    claimId: claim.id,
    steps,
    complete: claim.sourceRefs.length > 0 || claim.type === "learner_profile" || claim.type === "human_review_boundary",
  };
}

export function buildReportPackage(input: ReportBuildInput): ReportPackage {
  const goalClaim: ReportClaim = {
    id: id("claim", [input.learner.id, "goal_draft"]),
    learnerId: input.learner.id,
    type: "goal_draft",
    title: "Goal draft is linked to source information",
    body: input.goalDraft.text,
    sourceRefs: input.goalDraft.traceRefs,
  };

  const claims = [
    learnerClaim(input.learner),
    sufficiencyClaim(input.sufficiencyReview),
    goalClaim,
    qualityClaim(input.goalQualityReview, input.learner.id, input.goalDraft.traceRefs),
    humanBoundaryClaim(input.learner.id),
  ];

  const traces = claims.map((claim) => traceForClaim(claim, input));
  const status =
    input.sufficiencyReview.minimumReady &&
    input.goalQualityReview.readyForHumanReview &&
    traces.every((trace) => trace.complete)
      ? "draft_ready_for_human_review"
      : "needs_revision";

  return {
    id: id("report", [input.learner.id]),
    learnerId: input.learner.id,
    status,
    claims,
    traces,
  };
}

export function assertReportTraceability(reportPackage: ReportPackage) {
  const traceByClaim = new Map(reportPackage.traces.map((trace) => [trace.claimId, trace]));
  for (const claim of reportPackage.claims) {
    const trace = traceByClaim.get(claim.id);
    if (!trace) {
      throw new Error(`Missing trace for report claim: ${claim.id}`);
    }
    if (!trace.complete) {
      throw new Error(`Incomplete trace for report claim: ${claim.id}`);
    }
  }
}
