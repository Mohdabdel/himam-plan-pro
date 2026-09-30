# HIMAM Build Cycle 25 Execution Plan

## Scope

REPORT_HANDOFF_REVIEW_TRACE

## Product Decision

The trial-review report must carry the goal-to-plan handoff review. A reviewer should see whether the report is based on goals that were ready for plan review or whether the case still contains blocked goal drafts.

## Scenario

After goals are prepared and transferred into the plan path, the report page should show the same handoff review that was created at the end of the goal screen and displayed on the plan screen.

## Requirements

- Extend the report IEP data shape with `goalHandoffReview`.
- Render a report section titled `تقرير انتقال الأهداف إلى الخطة`.
- Show started, ready, and blocked goal counts.
- Show blocker summaries when present.
- Preserve existing report readiness gates.
- Add an automated verification gate for the trace.

## Acceptance

- Report source contains `goalHandoffReview`.
- Report source contains `ReportHandoffMetric`.
- Report source displays the handoff review title.
- Cycle 25 verification is registered in `package.json` and CI.
- Typecheck, lint, build, and governing-file verification pass.
