import { Link, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const nav = [
  { to: "/", label: "Dashboard", icon: DashboardIcon },
  { to: "/clients", label: "Caseload", icon: PeopleIcon },
  { to: "/calendar", label: "Today & Calendar", icon: CalendarIcon },
  { to: "/resources", label: "Resources", icon: BookIcon },
] as const;

export function SpecialistShell({
  title,
  eyebrow,
  actions,
  children,
}: {
  title: string;
  eyebrow?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="flex min-h-screen bg-background bg-grain text-foreground">
      <aside className="sticky top-0 hidden h-screen w-72 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:flex">
        <div className="px-6 pt-7 pb-6">
          <Link to="/" className="flex items-center gap-3">
            <Logo />
            <div className="leading-tight">
              <div className="font-serif text-2xl text-foreground">Himam</div>
              <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                Specialist Portal
              </div>
            </div>
          </Link>
        </div>

        <nav className="flex-1 px-3">
          <div className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Workspace
          </div>
          <ul className="space-y-1">
            {nav.map((item) => {
              const active =
                item.to === "/"
                  ? pathname === "/"
                  : pathname === item.to || pathname.startsWith(item.to + "/");
              const Icon = item.icon;
              return (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    className={cn(
                      "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                      active
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
                    )}
                  >
                    <span
                      className={cn(
                        "grid h-7 w-7 place-items-center rounded-lg border",
                        active
                          ? "border-primary/30 bg-primary text-primary-foreground"
                          : "border-border bg-card text-muted-foreground group-hover:text-foreground",
                      )}
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>

          <div className="mt-8 px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Saved views
          </div>
          <ul className="space-y-1 px-1 text-sm">
            <SavedView label="At-risk this week" count={2} tone="destructive" />
            <SavedView label="Awaiting placement" count={3} tone="warning" />
            <SavedView label="90-day follow-up" count={1} tone="success" />
          </ul>
        </nav>

        <div className="m-4 mt-auto rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
              NA
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold">Nadia Aboud</div>
              <div className="truncate text-xs text-muted-foreground">Transition Specialist · L2</div>
            </div>
          </div>
        </div>
      </aside>

      <main className="min-w-0 flex-1">
        <header className="sticky top-0 z-10 border-b border-border/70 bg-background/80 backdrop-blur">
          <div className="flex flex-wrap items-end justify-between gap-4 px-6 py-5 md:px-10">
            <div>
              {eyebrow && (
                <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
                  {eyebrow}
                </div>
              )}
              <h1 className="font-serif text-3xl text-foreground md:text-4xl">{title}</h1>
            </div>
            <div className="flex items-center gap-2">{actions}</div>
          </div>
        </header>
        <div className="px-6 py-8 md:px-10">{children}</div>
      </main>
    </div>
  );
}

function SavedView({
  label,
  count,
  tone,
}: {
  label: string;
  count: number;
  tone: "destructive" | "warning" | "success";
}) {
  const dot =
    tone === "destructive"
      ? "bg-destructive"
      : tone === "warning"
      ? "bg-warning"
      : "bg-success";
  return (
    <li className="flex items-center justify-between rounded-lg px-3 py-1.5 text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground">
      <span className="flex items-center gap-2.5">
        <span className={cn("h-1.5 w-1.5 rounded-full", dot)} />
        {label}
      </span>
      <span className="text-xs tabular-nums">{count}</span>
    </li>
  );
}

function Logo() {
  return (
    <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm">
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 20V8l8-5 8 5v12" />
        <path d="M9 20v-7h6v7" />
      </svg>
    </div>
  );
}

function DashboardIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" />
    </svg>
  );
}
function PeopleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20c.7-3.3 3.4-5.5 6.5-5.5s5.8 2.2 6.5 5.5" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M16 14.5c2.6.3 4.6 2.2 5 4.5" />
    </svg>
  );
}
function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3.5" y="5" width="17" height="15.5" rx="2" />
      <path d="M3.5 9.5h17M8 3v4M16 3v4" />
    </svg>
  );
}
function BookIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4.5A1.5 1.5 0 0 1 5.5 3H19v15.5H6a2 2 0 0 0-2 2z" />
      <path d="M4 18.5A2 2 0 0 1 6 17h13" />
    </svg>
  );
}
