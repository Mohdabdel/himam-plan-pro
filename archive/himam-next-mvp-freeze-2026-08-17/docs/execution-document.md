# Himam Next - Execution Document

## Build Decision

Himam Next starts as a new clean project. The current Himam project remains a
reference for knowledge, code, lessons learned, and trial feedback.

The working innovation rule is:

```text
90% proven operating patterns
10% initial Himam differentiation
```

The 90% refers to operating logic and workflow patterns, not copying protected
interfaces, text, identity, or proprietary content.

## Operating References

- fastIEP: main IEP operating reference for goals, progress monitoring, and reports.
- Monsha: guided generation reference: choose output, provide sources, answer short prompts, edit generated draft.
- Playground IEP: modular product reference: Goal Writer, present-level support, progress monitoring, snapshots.
- Current Himam: local knowledge and code reference.

## Himam Differentiation

- Transition planning orientation.
- Ten official Himam concepts.
- Parallel curriculum.
- Converting information sources into actionable opportunities.
- Separation between performance evidence and supporting information.
- Learner and family voice as priority/context sources, not direct performance evidence.
- Human approval only.
- Arabic-first institutional context.
- End-to-end traceability.

## MVP Journey

```text
Create learner
-> enter basic data
-> add official assessment source
-> add learner voice
-> add family voice
-> optionally add additional source
-> run information sufficiency review
-> view insights, gaps, and opportunities
-> prepare plan
-> generate goal draft from opportunity
-> run quality review
-> save as human-review draft
-> build a draft report package
-> open claim trace back to source
```

## Stage A Acceptance

Stage A is acceptable when the project can:

- Represent a learner.
- Represent information sources.
- Classify sources into evidence/support/inference/unclassified.
- Produce information insights.
- Produce goal opportunities.
- Produce information gaps.
- Preserve trace references.
- Verify that no concept outside the ten Himam concepts is used.

Stage A does not approve goals, plans, or reports.

## Stage B Acceptance

Stage B is acceptable when the project can:

- Select a performance-anchored goal opportunity.
- Combine it with optional support conditions.
- Generate a goal draft with six explicit elements.
- Detect missing observable behavior, criterion, and measurement method.
- Detect vague language before human review.
- Preserve trace references from the goal draft to the original information source.
- Prevent automated approval fields from being written by the domain layer.

Stage B does not approve goals or plans.

## Stage C Acceptance

Stage C is acceptable when the project can:

- Build a draft report package.
- Emit report claims for learner profile, sufficiency, goal draft, goal quality, and human-review boundary.
- Require source references for claims derived from information or goals.
- Build end-to-end trace steps from report claim back to source information.
- Keep the report status as a draft ready for human review or needs revision.

Stage C does not create a final approved plan report.

## Current Verified Command

```text
npm run verify
```

The current domain core verifies Stage A, Stage B, and Stage C. Stage 4
calibration, UI, persistence, AI generation, Azure integration, and human
approval workflow remain intentionally deferred.
