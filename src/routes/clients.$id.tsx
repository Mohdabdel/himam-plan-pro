import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { SpecialistShell } from "@/components/SpecialistShell";
import { StatusBadge, ProgressBar, Avatar } from "@/components/StatusBits";
import { getClient, type Goal, type Client } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/clients/$id")({
  loader: ({ params }) => {
    const client = getClient(params.id);
    if (!client) throw notFound();
    return { client: client! };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.client.name ?? "Client"} — Himam` },
      { name: "description", content: loaderData?.client.summary ?? "Client transition plan" },
      { property: "og:title", content: `${loaderData?.client.name ?? "Client"} — Himam` },
      { property: "og:description", content: loaderData?.client.summary ?? "Client transition plan" },
    ],
  }),
  notFoundComponent: () => (
    <SpecialistShell title="Client not found" eyebrow="Caseload">
      <p className="text-muted-foreground">
        That client isn't in your caseload.{" "}
        <Link to="/clients" className="text-primary hover:underline">Back to caseload</Link>
      </p>
    </SpecialistShell>
  ),
  component: ClientDetail,
});

function ClientDetail() {
  const { client: c } = Route.useLoaderData() as { client: Client };
  const completed = c.goals.filter((g) => g.status === "complete").length;

  return (
    <SpecialistShell
      eyebrow={
        (<><Link to="/clients" className="hover:text-primary">Caseload</Link> · {c.stage}</>) as unknown as string
      }
      title={c.name}
      actions={
        <>
          <button className="inline-flex h-10 items-center rounded-xl border border-border bg-card px-4 text-sm font-medium hover:bg-muted">
            + Add note
          </button>
          <button className="inline-flex h-10 items-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
            Log session
          </button>
        </>
      }
    >
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Profile card */}
        <aside className="lg:col-span-1 space-y-6">
          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="flex items-start gap-4">
              <div className="grid h-16 w-16 place-items-center rounded-2xl bg-primary text-2xl font-semibold text-primary-foreground">
                {c.initials}
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-serif text-2xl text-foreground">{c.name}</div>
                <div className="text-sm text-muted-foreground">
                  Age {c.age} · {c.pronouns}
                </div>
                <div className="mt-3"><StatusBadge status={c.status} /></div>
              </div>
            </div>

            <p className="mt-5 text-sm leading-relaxed text-muted-foreground">{c.summary}</p>

            <dl className="mt-5 space-y-3 text-sm">
              <Field label="Program" value={c.schoolOrProgram} />
              <Field label="Primary support" value={c.primarySupport} />
              <Field label="Guardian" value={`${c.guardian} · ${c.guardianPhone}`} />
              <Field label="Started" value={c.startedAt} />
              <Field label="Target exit" value={c.targetExit} />
            </dl>

            <div className="mt-5 flex flex-wrap gap-1.5">
              {c.tags.map((t) => (
                <span key={t} className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground">
                  {t}
                </span>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Plan progress
            </div>
            <div className="mt-2 flex items-end justify-between">
              <div className="font-serif text-4xl tabular-nums text-foreground">{c.progress}%</div>
              <div className="text-xs text-muted-foreground">
                {completed} of {c.goals.length} goals complete
              </div>
            </div>
            <div className="mt-3">
              <ProgressBar
                value={c.progress}
                tone={c.status === "at-risk" ? "destructive" : c.status === "needs-attention" ? "warning" : "primary"}
              />
            </div>
            <div className="mt-5 text-xs text-muted-foreground">Next session</div>
            <div className="mt-1 text-sm font-medium text-foreground">{c.nextSession}</div>
          </div>
        </aside>

        {/* Main */}
        <div className="lg:col-span-2 space-y-6">
          <section className="rounded-2xl border border-border bg-card p-6">
            <header className="mb-4 flex items-end justify-between">
              <div>
                <h2 className="font-serif text-2xl text-foreground">Transition plan</h2>
                <p className="text-xs text-muted-foreground">Goals across key life domains</p>
              </div>
              <button className="text-sm font-medium text-primary hover:underline">+ Add goal</button>
            </header>

            <ul className="space-y-3">
              {c.goals.map((g) => (
                <GoalRow key={g.id} goal={g} />
              ))}
            </ul>
          </section>

          <section className="rounded-2xl border border-border bg-card p-6">
            <header className="mb-4 flex items-end justify-between">
              <div>
                <h2 className="font-serif text-2xl text-foreground">Notes & observations</h2>
                <p className="text-xs text-muted-foreground">Most recent first</p>
              </div>
              <button className="text-sm font-medium text-primary hover:underline">+ New note</button>
            </header>
            <ol className="relative space-y-5 border-l border-border pl-5">
              {c.notes.map((n) => (
                <li key={n.id} className="relative">
                  <span className="absolute -left-[27px] top-1.5 grid h-4 w-4 place-items-center rounded-full border-2 border-card bg-primary" />
                  <div className="flex flex-wrap items-baseline gap-2">
                    <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium text-secondary-foreground">
                      {n.kind}
                    </span>
                    <span className="text-xs text-muted-foreground">{n.date} · {n.author}</span>
                  </div>
                  <p className="mt-1.5 text-sm leading-relaxed text-foreground">{n.body}</p>
                </li>
              ))}
            </ol>
          </section>
        </div>
      </div>
    </SpecialistShell>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <dt className="w-28 shrink-0 text-xs uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className="flex-1 text-foreground">{value}</dd>
    </div>
  );
}

function GoalRow({ goal }: { goal: Goal }) {
  const tone =
    goal.status === "complete" ? "success" : goal.status === "blocked" ? "destructive" : "primary";
  return (
    <li className="rounded-xl border border-border p-4 transition hover:border-primary/30">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-accent/60 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-accent-foreground">
              {goal.domain}
            </span>
            {goal.status === "blocked" && (
              <span className="rounded-md bg-destructive/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-destructive">
                Blocked
              </span>
            )}
            {goal.status === "complete" && (
              <span className="rounded-md bg-success/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-success">
                Complete
              </span>
            )}
          </div>
          <p className="mt-1.5 text-sm font-medium text-foreground">{goal.title}</p>
        </div>
        <div className="text-right text-xs text-muted-foreground">
          <div>Due</div>
          <div className="font-medium text-foreground">{goal.due}</div>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-3">
        <ProgressBar value={goal.progress} tone={tone as "primary" | "success" | "destructive"} />
        <span className={cn("w-10 text-right text-xs tabular-nums", tone === "destructive" ? "text-destructive" : "text-muted-foreground")}>
          {goal.progress}%
        </span>
      </div>
    </li>
  );
}
