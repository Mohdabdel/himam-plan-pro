# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
bun dev          # Start dev server (Vite)
bun build        # Production build
bun lint         # ESLint check
bun format       # Prettier format (writes in place)
```

No test suite is configured. There is no `bun test` command.

## Architecture

**Himam (همم)** is an Arabic RTL single-page app for special-education specialists to manage student transition plans. The entire UI is in Arabic; the HTML root sets `lang="ar" dir="rtl"`.

**Stack:** TanStack Start (TanStack Router + Vite SSR) · React 19 · Tailwind CSS v4 · shadcn/ui · Bun

### Routing

File-based routing via TanStack Router. All routes live in `src/routes/`. `routeTree.gen.ts` is auto-generated — never edit by hand. Router is created in `src/router.tsx` with a shared `QueryClient` passed through router context.

| Route file | URL | Purpose |
|---|---|---|
| `index.tsx` | `/` | Dashboard — student list with stats |
| `students.new.tsx` | `/students/new` | Add a new student |
| `students.$id.assessment.tsx` | `/students/:id/assessment` | Enter assessment scores per domain |
| `students.$id.coverage.tsx` | `/students/:id/coverage` | Conceptual coverage report |
| `students.$id.iep.tsx` | `/students/:id/iep` | Individual Education Plan entry |
| `students.$id.framework.tsx` | `/students/:id/framework` | Transition goals framework |

The root layout (`__root.tsx`) wraps everything in `QueryClientProvider` and renders the `<Toaster />`. It also sets the IBM Plex Sans Arabic font globally.

### Data persistence

There is **no backend or database**. All data is stored in `localStorage`:

- `himam_students` — JSON array of student records
- `himam_assessment_<id>` — assessment scores for a student
- `himam_iep_<id>` — IEP data for a student

The assessment page auto-saves to localStorage every 30 seconds.

### Assessment tool branching

The assessment page (`students.$id.assessment.tsx`) uses different domain sets depending on the student's selected assessment tool: TTAP tools get `TTAP_DOMAINS` (VS, VB, IF, LS, FC, IB); all others fall back to `GENERIC_DOMAINS`. This branch point is `tool.includes("TTAP")`.

### UI patterns

- `src/components/ui/` — shadcn/ui primitives (accordion, button, dialog, etc.)
- `src/lib/utils.ts` — exports `cn()` (clsx + tailwind-merge)
- Brand colors: teal `#0F3D3E` (primary), orange `#D9764A` (action/accent), warm off-white `#FAF7F2` (background)
- Some pages use inline `style={}` objects; others use Tailwind classes — both are present in the codebase

### Lovable integration

This project is connected to [Lovable](https://lovable.dev). Avoid rewriting published git history (force push, rebase/amend/squash of pushed commits) — it breaks Lovable's project history. Keep the `main` branch in a working state at all times.
