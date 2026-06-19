import { createFileRoute } from "@tanstack/react-router";
import { SpecialistShell } from "@/components/SpecialistShell";

export const Route = createFileRoute("/resources")({
  head: () => ({
    meta: [
      { title: "Resources — Himam" },
      { name: "description", content: "Practice frameworks, assessment templates, and partner directory." },
      { property: "og:title", content: "Resources — Himam" },
      { property: "og:description", content: "Practice frameworks, assessment templates, and partner directory." },
      { property: "og:url", content: "/resources" },
    ],
    links: [{ rel: "canonical", href: "/resources" }],
  }),
  component: Resources,
});

const groups = [
  {
    title: "Practice frameworks",
    items: [
      { name: "Himam Transition Framework v3", meta: "PDF · 28 pages" },
      { name: "Person-centered planning guide", meta: "PDF · 14 pages" },
      { name: "Self-determination indicators", meta: "Worksheet" },
    ],
  },
  {
    title: "Assessment templates",
    items: [
      { name: "Vocational interest inventory", meta: "Form · 30 items" },
      { name: "Independent living skills checklist", meta: "Checklist · 64 items" },
      { name: "Workplace readiness rubric", meta: "Rubric · 5 domains" },
    ],
  },
  {
    title: "Partner directory",
    items: [
      { name: "Employer partners — hospitality", meta: "12 active" },
      { name: "Employer partners — retail & service", meta: "9 active" },
      { name: "Post-secondary inclusive programs", meta: "7 partners" },
    ],
  },
];

function Resources() {
  return (
    <SpecialistShell eyebrow="Library" title="Resources & toolkits">
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {groups.map((g) => (
          <section key={g.title} className="rounded-2xl border border-border bg-card p-5">
            <h2 className="font-serif text-xl text-foreground">{g.title}</h2>
            <ul className="mt-4 divide-y divide-border">
              {g.items.map((it) => (
                <li key={it.name} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-foreground">{it.name}</div>
                    <div className="text-xs text-muted-foreground">{it.meta}</div>
                  </div>
                  <button className="rounded-lg border border-border px-2.5 py-1 text-xs font-medium hover:bg-muted">
                    Open
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </SpecialistShell>
  );
}
