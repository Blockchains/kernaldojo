import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Blocks } from "@/components/blocks";
import { DebugLab, Quiz } from "@/components/quiz";
import { PageTitle, Shell, Tag } from "@/components/shell";
import { bugs, quizzes } from "@/lib/assessment";
import { hacks } from "@/lib/hacks";
import { lessonFor, rubrics } from "@/lib/lessons";
import { moduleById } from "@/lib/modules";

export const Route = createFileRoute("/modules/$id")({ component: ModulePage });

const tabs = ["Lesson", "Hacks", "Quiz", "Debug", "Rubric"] as const;

function ModulePage() {
  const { id } = Route.useParams();
  const mod = moduleById(id);
  const [tab, setTab] = useState<(typeof tabs)[number]>("Lesson");
  if (!mod) {
    return (
      <Shell>
        <PageTitle kicker="Missing" title="No such module" />
        <Link to="/path" className="text-accent">
          Back to the path
        </Link>
      </Shell>
    );
  }
  const lesson = lessonFor(mod.id);
  const hackList = hacks[mod.id] ?? [];
  return (
    <Shell>
      <PageTitle kicker={`${mod.code} · ${mod.hours} h · ${mod.depth === "full" ? "full lesson" : "skeleton"}`} title={mod.title} lede={mod.summary} />
      <dl className="mb-6 grid gap-3 sm:grid-cols-3">
        {[
          ["Prerequisite", mod.prereq],
          ["VRAM", mod.vram],
          ["Runtime", mod.runtime],
        ].map(([k, v]) => (
          <div key={k} className="rounded-lg border border-line p-3">
            <dt className="font-mono text-xs text-muted">{k}</dt>
            <dd className="mt-1 text-sm">{v}</dd>
          </div>
        ))}
      </dl>
      <h2 className="text-lg font-medium">Outcomes</h2>
      <ul className="mt-2 list-disc pl-5">
        {mod.outcomes.map((o) => (
          <li key={o} className="mt-1">
            {o}
          </li>
        ))}
      </ul>
      <div className="sticky top-14 z-10 -mx-4 mt-6 flex gap-2 overflow-x-auto bg-bg px-4 py-2">
        {tabs.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={
              "min-h-11 shrink-0 rounded-lg border px-3 text-sm " +
              (tab === t ? "border-accent bg-surface text-accent" : "border-line text-muted")
            }
          >
            {t}
          </button>
        ))}
      </div>
      <div className="mt-5">
        {tab === "Lesson" ? <Blocks blocks={lesson} /> : null}
        {tab === "Hacks" ? (
          <div className="flex flex-col gap-6">
            {hackList.map((h) => (
              <article key={h.title} className="rounded-lg border border-line p-4">
                <h3 className="text-lg font-medium">{h.title}</h3>
                <p className="mt-2 text-sm">{h.why}</p>
                <pre className="mt-3 overflow-x-auto rounded-lg bg-bg p-3 font-mono text-xs leading-relaxed">
                  <code>{h.code}</code>
                </pre>
                <p className="mt-3 text-sm">
                  <Tag>Bench</Tag> <span className="text-muted">{h.bench}</span>
                </p>
                <p className="mt-2 text-sm">
                  <span className="font-medium">Fails when. </span>
                  {h.fails}
                </p>
                <p className="mt-2 text-sm text-muted">{h.source}</p>
              </article>
            ))}
          </div>
        ) : null}
        {tab === "Quiz" ? <Quiz moduleId={mod.id} questions={quizzes[mod.id] ?? []} /> : null}
        {tab === "Debug" ? <DebugLab moduleId={mod.id} bugs={bugs[mod.id] ?? []} /> : null}
        {tab === "Rubric" ? (
          <ul className="list-disc pl-5">
            {(rubrics[mod.id] ?? []).map((r) => (
              <li key={r} className="mt-2">
                {r}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </Shell>
  );
}
