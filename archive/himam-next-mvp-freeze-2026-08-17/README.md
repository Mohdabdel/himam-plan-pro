# Himam Next MVP

This is the clean new project track for Himam. The previous `himam-plan-pro`
project is treated as a reference source only. Components may be copied or
rewritten from it when they fit the new execution document.

Current maturity:

```text
deliveryMaturity = KNOWLEDGE_SPEC_AND_DOMAIN_CORE
overallStatus = STAGE_A_B_C_VERIFIED_DOMAIN_CORE
```

Verified domain stages:

- Stage A: learner, information sources, sufficiency review, insights, gaps, and opportunities.
- Stage B: goal draft generation from a performance-anchored opportunity with six required goal elements.
- Stage C: draft report package with claim-level traceability back to information sources.
- Prototype UI: editable user journey with plan-component checklist, next/back steps, official assessment upload placeholder, learner/family inputs, and live regeneration.

Current verification:

```text
npm run verify
```

Local prototype:

```text
npm run build:prototype
npm run serve:prototype
http://127.0.0.1:8081/
```

If an older local server is already running on `8081`, stop that process and
run `npm run serve:prototype` again so the `/api/workflow` endpoint is loaded.

Still out of scope:

- UI.
- Azure integration.
- AI generation.
- Human approval workflow.
- Stage 4 calibration engine.
- Official plan approval.
