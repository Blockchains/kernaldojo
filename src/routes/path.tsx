import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { PageTitle, Shell } from "@/components/shell";
import { modules } from "@/lib/modules";
import { useProgress } from "@/lib/progress";

export const Route = createFileRoute("/path")({ component: PathPage });

function PathPage() {
  const hours = modules.reduce((s, m) => s + m.hours, 0);
  const quizzes = useProgress((s) => s.quizzes);
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  const done = ready ? modules.filter((m) => quizzes[m.id]).length : 0;

  return (
    <Shell>
      <PageTitle
        kicker="Syllabus"
        title="The path"
        lede={`${hours} hours if you do the work. ${ready ? `${done} of ${modules.length} quizzes filed on this device.` : "Progress stays on this device."}`}
      />
      <ol className="flex flex-col gap-3">
        {modules.map((m) => {
          const filed = ready && quizzes[m.id];
          return (
            <li key={m.id}>
              <Link
                to="/modules/$id"
                params={{ id: m.id }}
                className="block rounded-lg border border-line bg-surface p-4"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <p className="font-mono text-xs text-accent">{m.code}</p>
                  <p className="font-mono text-xs text-muted">{m.hours} h</p>
                </div>
                <h2 className="mt-1 text-lg font-medium tracking-tight">{m.title}</h2>
                <p className="mt-2 text-sm text-muted">{m.outcomes[0]}</p>
                <p className="mt-3 font-mono text-xs text-muted">
                  {filed ? `Quiz ${filed.correct}/${filed.total}` : m.depth === "full" ? "Full lesson" : "Skeleton + gates"}
                  {" · "}
                  {m.tier}
                </p>
              </Link>
            </li>
          );
        })}
      </ol>
    </Shell>
  );
}
