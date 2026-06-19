import { createFileRoute, Link } from "@tanstack/react-router";
import { SpecialistShell } from "@/components/SpecialistShell";
import { upcomingSessions, tasks } from "@/lib/mock-data";

export const Route = createFileRoute("/calendar")({
  head: () => ({
    meta: [
      { title: "Today & Calendar — Himam" },
      { name: "description", content: "Upcoming sessions, visits, and assessments." },
      { property: "og:title", content: "Today & Calendar — Himam" },
      { property: "og:description", content: "Upcoming sessions, visits, and assessments." },
      { property: "og:url", content: "/calendar" },
    ],
    links: [{ rel: "canonical", href: "/calendar" }],
  }),
  component: CalendarPage,
});

const groupOrder = ["Today", "Tomorrow", "This week"] as const;

function CalendarPage() {
  const groups: Record<string, typeof upcomingSessions> = {
    Today: [],
    Tomorrow: [],
    "This week": [],
  };
  for (const s of upcomingSessions) {
    if (s.date.startsWith("Today")) groups.Today.push(s);
    else if (s.date.startsWith("Tomorrow")) groups.Tomorrow.push(s);
    else groups["This week"].push(s);
  }

  return (
    <SpecialistShell
      eyebrow="Schedule"
      title="Today & calendar"
      actions={
        <button className="inline-flex h-10 items-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
          + Schedule session
        </button>
      }
    >
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-8">
          {groupOrder.map((g) => (
            <section key={g}>
              <h2 className="mb-3 font-serif text-2xl text-foreground">{g}</h2>
              <ul className="space-y-3">
                {groups[g].length === 0 && (
                  <li className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                    Nothing scheduled.
                  </li>
                )}
                {groups[g].map((s) => (
                  <li
                    key={s.id}
                    className="flex items-stretch overflow-hidden rounded-2xl border border-border bg-card transition hover:border-primary/40 hover:shadow-sm"
                  >
                    <div className="grid w-28 shrink-0 place-items-center bg-secondary text-secondary-foreground">
                      <div className="text-center">
                        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          {s.date.split(",")[0]}
                        </div>
                        <div className="font-serif text-xl">{s.date.split(",")[1]?.trim()}</div>
                      </div>
                    </div>
                    <div className="flex flex-1 items-center gap-4 p-4">
                      <div className="min-w-0 flex-1">
                        <Link
                          to="/clients/$id"
                          params={{ id: s.clientId }}
                          className="font-semibold text-foreground hover:text-primary"
                        >
                          {s.clientName}
                        </Link>
                        <div className="mt-0.5 text-xs text-muted-foreground">
                          {s.type} · {s.location}
                        </div>
                      </div>
                      <div className="hidden text-sm text-muted-foreground sm:block">{s.duration} min</div>
                      <button className="hidden h-9 items-center rounded-lg border border-border px-3 text-xs font-medium hover:bg-muted md:inline-flex">
                        Prep
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <aside className="space-y-6">
          <section className="rounded-2xl border border-border bg-card p-5">
            <h2 className="font-serif text-xl text-foreground">Open tasks</h2>
            <ul className="mt-3 space-y-2.5">
              {tasks.map((t) => (
                <li key={t.id} className="flex items-start gap-3">
                  <input type="checkbox" className="mt-1 h-4 w-4 accent-[oklch(0.44_0.08_195)]" />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-foreground">{t.title}</div>
                    <div className="text-xs text-muted-foreground">{t.client} · {t.due}</div>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-2xl border border-border bg-primary p-5 text-primary-foreground">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] opacity-80">Reflection</div>
            <p className="mt-2 font-serif text-2xl leading-snug">
              "The plan only matters when the young person leads the meeting."
            </p>
            <div className="mt-3 text-xs opacity-80">— Himam Practice Framework</div>
          </section>
        </aside>
      </div>
    </SpecialistShell>
  );
}
