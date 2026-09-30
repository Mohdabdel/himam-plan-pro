# HIMAM Build Cycle 26 Execution Plan

## Scope

LINEAR_JOURNEY_NAVIGATION_REVIEW

## Product Decision

The trial path must present one clear primary route from the basic learner record into information sources, current-level review, goal generation, plan, and report. Secondary cards may remain for review and return, but the user should not have to infer the next operating step.

## Scenario

When a specialist starts a full trial, the route should be:

1. Basic learner data.
2. Official assessment.
3. Learner voice.
4. Family voice.
5. Additional sources.
6. Information sufficiency/current-level review.
7. Plan preparation.
8. Goal generation.
9. Plan.
10. Report.

## Requirements

- Align the shared journey stepper order with the actual operating route.
- Add a primary next-action area in the information sources hub.
- Keep component cards as review shortcuts, not competing primary paths.
- Add linear next controls inside the plan-preparation hub: basic data, current level, specialist vision, then goal generation.
- Add an automated verification gate for these navigation rules.

## Acceptance

- `JOURNEY_STEPS` orders learner voice and family voice before coverage.
- The information sources hub includes a primary `التالي: أداة التقييم الرسمية` action.
- The plan-preparation hub includes `goToNextPlanComponent`.
- The plan-preparation hub includes next labels for current level, specialist vision, and goal generation.
- Cycle 26 verification is registered in `package.json` and CI.
