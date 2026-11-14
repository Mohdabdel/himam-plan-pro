# Himam Build Cycle 28 — Goal Reasoning Phase 1

Date: 2026-11-14  
Scope: `GOAL_REASONING_PHASE1`

## Owner-approved scope

This cycle implements phase one of goal-generation reasoning only:

1. Replace fixed context / criterion / measurement defaults with deterministic inference.
2. Apply Smart IEP Engine constraints:
   - P1-9 assessment fidelity.
   - P1-5 + P1-10 + P2-4 baseline-derived criterion.
   - P2-12 behavior-appropriate measurement type, separate from collection method.
   - P2-13 trace each proposal to an assessment priority when the reviewed assessment exposes one.
3. Treat family voice, learner voice, priorities, support and environment as optional enrichment; missing optional enrichment is silent.
4. Make near-current, functional-transition and preparatory proposals differ in reasoning, not only labels.
5. Correct the current-level rationale so it does not claim the longitudinal compass or vision adaptation already ran.
6. No longitudinal compass implementation, no instructionalRoute implementation, no new UI mode, no external language model.
7. No merge before owner review.

## Required tests

- T6 — assessment fidelity.
- T7 — P2-12 measurement mapping.
- T8 — criterion progression from baseline without default 80%.
- T9 — assessment priority trace.
- T11 — optional enrichment absence is silent.
- T14 — preparatory proposal uses a distinct enabling step.
- T15 — functional proposal changes reasoning toward meaningful application.
