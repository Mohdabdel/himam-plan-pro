import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { SpecialistShell } from "@/components/SpecialistShell";
import { StatusBadge, ProgressBar, Avatar } from "@/components/StatusBits";
import { clients, type ClientStatus } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/clients")({
  head: () => ({
    meta: [
      { title: "Caseload — Himam Specialist Portal" },
      { name: "description", content: "Full caseload with status, plan progress, and next session." },
      { property: "og:title", content: "Caseload — Himam Specialist Portal" },
      { property: "og:description", content: "Full caseload with status, plan progress, and next session." },
      { property: "og:url", content: "/clients" },
    ],
    links: [{ rel: "canonical", href: "/clients" }],
  }),
  component: Caseload,
});

const filters: { key: "all" | ClientStatus; label: string }[] = [
  { key: "all", label: "All" },
  { key: "on-track", label: "On track" },
  { key: "needs-attention", label: "Needs attention" },
  { key: "at-risk", label: "At risk" },
  { key: "transitioned", label: "Transitioned" },
];

function Caseload() {
  const [filter, setFilter] = useState<"all" | ClientStatus>("all");
  const [q, setQ] = useState("");

  const list = useMemo(() => {
    return clients.filter((c) => {
      if (filter !== "all" && c.status !== filter) return false;
      if (q && !`${c.name} ${c.schoolOrProgram} ${c.tags.join(" ")}`.toLowerCase().includes(q.toLowerCase()))
        return false;
      return true;
    });
  }, [filter, q]);

  return (
    <SpecialistShell
      eyebrow="Caseload"
      title="Your young people"
      actions={
        <button className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
          + Add intake
        </button>
      }
    >
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name, school, or tag…"
            className="h-10 w-full rounded-xl border border-input bg-card pl-10 pr-3 text-sm outline-none ring-ring/20 transition focus:border-ring focus:ring-4"
          />
          <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-border bg-card p-1">
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-medium transition",
                filter === f.key
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
              <th className="px-5 py-3 font-semibold">Client</th>
              <th className="px-3 py-3 font-semibold">Stage</th>
              <th className="px-3 py-3 font-semibold">Status</th>
              <th className="px-3 py-3 font-semibold">Plan progress</th>
              <th className="px-3 py-3 font-semibold">Next session</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {list.map((c) => (
              <tr key={c.id} className="transition hover:bg-muted/40">
                <td className="px-5 py-4">
                  <Link to="/clients/$id" params={{ id: c.id }} className="flex items-center gap-3">
                    <Avatar initials={c.initials} />
                    <div className="min-w-0">
                      <div className="font-semibold text-foreground hover:text-primary">{c.name}</div>
                      <div className="truncate text-xs text-muted-foreground">{c.schoolOrProgram}</div>
                    </div>
                  </Link>
                </td>
                <td className="px-3 py-4 text-foreground">{c.stage}</td>
                <td className="px-3 py-4"><StatusBadge status={c.status} /></td>
                <td className="px-3 py-4 min-w-[180px]">
                  <div className="flex items-center gap-3">
                    <ProgressBar
                      value={c.progress}
                      tone={c.status === "at-risk" ? "destructive" : c.status === "needs-attention" ? "warning" : c.status === "transitioned" ? "success" : "primary"}
                    />
                    <span className="w-10 text-right text-xs tabular-nums text-muted-foreground">{c.progress}%</span>
                  </div>
                </td>
                <td className="px-3 py-4 text-foreground">{c.nextSession}</td>
                <td className="px-5 py-4 text-right">
                  <Link
                    to="/clients/$id"
                    params={{ id: c.id }}
                    className="inline-flex h-8 items-center rounded-lg border border-border px-3 text-xs font-medium text-foreground hover:bg-muted"
                  >
                    Open →
                  </Link>
                </td>
              </tr>
            ))}
            {list.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center text-sm text-muted-foreground">
                  No clients match your filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </SpecialistShell>
  );
}
