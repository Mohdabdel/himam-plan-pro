# HIMAM Build Cycle 23 Execution Plan

## Scope

GOAL_SCREEN_COGNITIVE_LOAD_REDUCTION

## Product Decision

The goal-generation screen should open with the specialist's operating choice, not with explanatory panels. Knowledge framing and generation structure are useful internally, but they should not appear as persistent front-of-screen blocks at this step.

## Scenario

When the specialist enters the goal-generation screen, the first actionable area should be choosing the goal-preparation mechanism. Background concepts remain represented through helper markers, AI suggestions, and knowledge support on request.

## Requirements

- Hide the two introductory panels: goal-generation structure and supporting knowledge framework.
- Keep the specialist's first visible action as selecting the goal-preparation method.
- Align the goal screen typography with the Arabic interface font already used across the search and library surfaces.
- Add an automated verification gate for the screen simplification.

## Acceptance

- The headings `هيكلة توليد الأهداف` and `الإطار المعرفي الداعم` are not rendered in the goal screen source.
- The goal screen root uses `IBM Plex Sans Arabic`.
- Cycle 23 verification is registered in `package.json` and CI.
- Typecheck, lint, build, and governing-file verification pass.
