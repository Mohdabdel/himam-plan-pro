import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/students/$id/student-voice")({
  beforeLoad: ({ params }) => {
    throw redirect({ to: "/students/$id/family", params });
  },
});
