# HIMAM Build Cycle 24 Execution Plan

## Scope

GOAL_TO_PLAN_HANDOFF_REVIEW

## Product Decision

The last station before trial review must make the goal-to-plan handoff explicit. The system should show and persist a concise transition review that separates ready goals from blocked drafts before the specialist moves into the plan form.

## Scenario

When the specialist reaches the end of the goal screen, the interface must show whether the current goals are ready for plan review or blocked by progress findings. When the plan screen opens, it must show the same handoff review so the reviewer understands what was transferred from the goal-preparation stage.

## Requirements

- Add a visible goal handoff review on the goal screen.
- Persist the handoff review inside the IEP draft record.
- Display the handoff review on the plan screen.
- Preserve the existing hard-stop rule: blocked drafts do not move into plan review.
- Add an automated verification gate for this station.

## Acceptance

- Goal screen contains `goalHandoffReview`.
- IEP draft persistence stores `goalHandoffReview`.
- Plan screen loads and displays `goalHandoffReview`.
- Plan screen includes metrics for started, ready, and blocked goals.
- Cycle 24 verification is registered in `package.json` and CI.
- Typecheck, lint, build, and governing-file verification pass.
