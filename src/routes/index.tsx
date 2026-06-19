import { createFileRoute, Link } from "@tanstack/react-router";
import { SpecialistShell } from "@/components/SpecialistShell";
import { StatusBadge, ProgressBar, Avatar } from "@/components/StatusBits";
import { clients, upcomingSessions, tasks } from "@/lib/mock-data";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — Himam Specialist Portal" },
      { name: "description", content: "Today's sessions, priority follow-ups, and caseload health at a glance." },
      { property: "og:title", content: "Dashboard — Himam Specialist Portal" },
      { property: "og:description", content: "Today's sessions, priority follow-ups, and caseload health at a glance." },
      { property: "og:url", content: "/" },
    ],
    links: [{ rel: "canonical", href: "/" }],
  }),
  component: Dashboard,
});

function Dashboard() {
  const active = clients.filter((c) => c.status !== "transitioned");
  const onTrack = active.filter((c) => c.status === "on-track").length;
  const attention = active.filter((c) => c.status === "needs-attention").length;
  const atRisk = active.filter((c) => c.status === "at-risk").length;
  const avgProgress = Math.round(active.reduce((a, c) => a + c.progress, 0) / active.length);

  const priority = [...active]
    .sort((a, b) => statusWeight(b.status) - statusWeight(a.status))
    .slice(0, 4);

  return (
    <SpecialistShell
      eyebrow="Wednesday · June 19"
      title="Good morning, Nadia"
      actions={
        <>
          <button className="hidden h-10 items-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-medium text-foreground transition hover:bg-muted sm:inline-flex">
            <span className="text-muted-foreground">⌘K</span> Search caseload
          </button>
          <button className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90">
            + Log session
          </button>
        </>
      }
    >
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Active clients" value={String(active.length)} hint={`${onTrack} on track`} tone="primary" />
        <StatCard label="Needs attention" value={String(attention)} hint="Review this week" tone="warning" />
        <StatCard label="At risk" value={String(atRisk)} hint="Escalate or intervene" tone="destructive" />
        <StatCard label="Avg. plan progress" value={`${avgProgress}%`} hint="Across active caseload" tone="success" />
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Panel
            title="Today & upcoming"
            action={<Link to="/calendar" className="text-sm font-medium text-primary hover:underline">Open calendar →</Link>}
          >
            <ul className="divide-y divide-border">
              {upcomingSessions.slice(0, 4).map((s) => (
                <li key={s.id} className="flex items-center gap-4 py-3.5 first:pt-1 last:pb-1">
                  <div className="w-28 shrink-0 text-sm">
                    <div className="font-semibold text-foreground">{s.date.split(",")[0]}</div>
                    <div className="text-muted-foreground">{s.date.split(",")[1]?.trim()}</div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <Link
                      to="/clients/$id"
                      params={{ id: s.clientId }}
                      className="font-semibold text-foreground hover:text-primary"
                    >
                      {s.clientName}
                    </Link>
                    <div className="truncate text-xs text-muted-foreground">
                      {s.type} · {s.location}
                    </div>
                  </div>
                  <div className="hidden text-xs text-muted-foreground sm:block">{s.duration}m</div>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel
            title="Priority follow-ups"
            action={<Link to="/clients" className="text-sm font-medium text-primary hover:underline">View caseload →</Link>}
          >
            <div className="grid gap-3 sm:grid-cols-2">
              {priority.map((c) => (
                <Link
                  key={c.id}
                  to="/clients/$id"
                  params={{ id: c.id }}
                  className="group rounded-2xl border border-border bg-card p-4 transition hover:border-primary/40 hover:shadow-sm"
                >
                  <div className="flex items-start gap-3">
                    <Avatar initials={c.initials} tone={c.status === "at-risk" ? "accent" : "primary"} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <div className="truncate font-semibold text-foreground group-hover:text-primary">
                          {c.name}
                        </div>
                        <StatusBadge status={c.status} />
                      </div>
                      <div className="mt-0.5 truncate text-xs text-muted-foreground">
                        {c.stage} · {c.schoolOrProgram}
                      </div>
                      <div className="mt-3">
                        <div className="mb-1 flex items-center justify-between text-[11px] text-muted-foreground">
                          <span>Plan progress</span>
                          <span className="tabular-nums">{c.progress}%</span>
                        </div>
                        <ProgressBar
                          value={c.progress}
                          tone={c.status === "at-risk" ? "destructive" : c.status === "needs-attention" ? "warning" : "primary"}
                        />
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel title="My tasks">
            <ul className="space-y-2.5">
              {tasks.map((t) => (
                <li key={t.id} className="flex items-start gap-3 rounded-xl p-2 -m-2 hover:bg-muted/60">
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 shrink-0 rounded border-border accent-[oklch(0.44_0.08_195)]"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-foreground">{t.title}</div>
                    <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{t.client}</span>
                      <span>·</span>
                      <span
                        className={
                          t.priority === "high"
                            ? "text-destructive font-medium"
                            : t.priority === "med"
                            ? "text-warning-foreground font-medium"
                            : ""
                        }
                      >
                        {t.due}
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel title="Caseload mix" subtitle="Active clients by stage">
            <StageMix />
          </Panel>
        </div>
      </section>
    </SpecialistShell>
  );
}

function StatCard({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint: string;
  tone: "primary" | "success" | "warning" | "destructive";
}) {
  const accent =
    tone === "primary"
      ? "bg-primary"
      : tone === "success"
      ? "bg-success"
      : tone === "warning"
      ? "bg-warning"
      : "bg-destructive";
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-5">
      <div className={`absolute left-0 top-0 h-full w-1 ${accent}`} />
      <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-2 font-serif text-4xl tabular-nums text-foreground">{value}</div>
      <div className="mt-1 text-xs text-muted-foreground">{hint}</div>
    </div>
  );
}

function Panel({
  title,
  subtitle,
  action,
  children,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <header className="mb-4 flex items-end justify-between gap-2">
        <div>
          <h2 className="font-serif text-xl text-foreground">{title}</h2>
          {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}

function StageMix() {
  const stages = ["Assessment", "Planning", "Skill-building", "Work Experience", "Placement"] as const;
  const counts = stages.map((s) => clients.filter((c) => c.stage === s).length);
  const total = counts.reduce((a, b) => a + b, 0);
  const tones = ["bg-chart-4", "bg-chart-3", "bg-primary", "bg-chart-2", "bg-chart-5"];
  return (
    <div className="space-y-3">
      <div className="flex h-2.5 w-full overflow-hidden rounded-full">
        {counts.map((c, i) => (
          <div key={i} className={tones[i]} style={{ width: `${(c / total) * 100}%` }} />
        ))}
      </div>
      <ul className="space-y-2">
        {stages.map((s, i) => (
          <li key={s} className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2">
              <span className={`h-2.5 w-2.5 rounded-sm ${tones[i]}`} />
              <span className="text-foreground">{s}</span>
            </span>
            <span className="tabular-nums text-muted-foreground">{counts[i]}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function statusWeight(s: string) {
  return s === "at-risk" ? 3 : s === "needs-attention" ? 2 : s === "on-track" ? 1 : 0;
}
