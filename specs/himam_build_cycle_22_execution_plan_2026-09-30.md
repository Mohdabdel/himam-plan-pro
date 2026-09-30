# HIMAM Build Cycle 22 Execution Plan

## Scope

GOAL_AI_PROPOSAL_VISIBLE_DOMAIN_ROUTING

## Product Decision

AI-assisted goal proposals must never be saved under an internal concept, transition tag, or hidden domain that the specialist cannot see in the goal editor. Every proposal must resolve to a visible editable domain before it can be opened for editing or added as a draft goal.

## Scenario

When the specialist starts from the smart AI layer or adds one of its proposals as a draft, the proposal may originate from:

- A current-performance domain already visible in the goal editor.
- A processed profile opportunity linked to a transition concept.
- A current selected domain chosen by the specialist.

The screen must route all of these cases to a visible goal domain and keep the draft goal reviewable.

## Requirements

- Preserve the bounded AI policy: proposals remain review support, not automatic approval.
- Resolve proposals first by visible domain code, then visible domain name, then current selected domain, then the first visible domain.
- Include smart-start opportunities and current-domain opportunities in draft-add routing.
- Keep the specialist-facing message unchanged unless the proposal cannot be routed at all.
- Add an automated verification gate for this routing guard.

## Acceptance

- `routeAiProposalDomain` exists in the goal screen.
- `addProposalToGoals` routes proposals through visible domains.
- `startFromAiProposal` pre-fills the builder with a visible domain.
- Cycle 22 verification is registered in `package.json` and CI.
- Typecheck, lint, build, governing-file verification, and the new cycle verification pass.
