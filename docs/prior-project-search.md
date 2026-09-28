# Prior Project Search

Purpose: provide a repeatable way to search current and previous Himam drafts before making product or code decisions.

Run from `work/himam-plan-pro`:

```bash
npm run search:prior -- "جودة الهدف" "مصفوفة جودة" "Goal Studio" --limit 40
```

Useful query groups:

```bash
npm run search:prior -- "فرصة هدف" "goalOpportunities" "ready_for_goal_draft" --limit 40
npm run search:prior -- "خط الأساس" "baseline" "مرتكز الأداء" --limit 40
npm run search:prior -- "التخطيط الانتقالي" "AGE_14_PLUS" "transition" --limit 40
npm run search:prior -- "صوت الأسرة" "صوت المتعلم" "الأولوية" --limit 40
```

Search scope:

- `C:\Users\DELL\Documents\Codex`
- the local `work` directory next to this project

The search intentionally excludes dependency/build folders and lockfiles. Results are references for review only; governing files and current implementation remain the authority for decisions.
