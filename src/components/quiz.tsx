import { useMemo, useState } from "react";
import type { Bug, Question } from "@/lib/modules";
import { useProgress } from "@/lib/progress";
import { rotate } from "./blocks";

function ChoiceList({
  choices,
  picked,
  onPick,
  revealed,
}: {
  choices: { id: string; text: string; correct?: boolean }[];
  picked: string | null;
  onPick: (id: string) => void;
  revealed: boolean;
}) {
  return (
    <ul className="mt-3 flex flex-col gap-2">
      {choices.map((c) => {
        const on = picked === c.id;
        const mark = revealed && c.correct;
        const miss = revealed && on && !c.correct;
        return (
          <li key={c.id}>
            <button
              type="button"
              disabled={revealed}
              onClick={() => onPick(c.id)}
              className={
                "w-full rounded-lg border px-3 py-3 text-left text-sm " +
                (mark
                  ? "border-accent bg-surface"
                  : miss
                    ? "border-line bg-bg text-muted"
                    : on
                      ? "border-accent"
                      : "border-line bg-surface")
              }
            >
              {c.text}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

export function Quiz({ moduleId, questions }: { moduleId: string; questions: Question[] }) {
  const setQuiz = useProgress((s) => s.setQuiz);
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [correct, setCorrect] = useState(0);
  const [done, setDone] = useState(false);
  const q = questions[index];
  const choices = useMemo(() => (q ? rotate(q.choices, index + 1) : []), [q, index]);

  if (!q && !done) return null;

  if (done) {
    return (
      <div className="rounded-lg border border-line bg-surface p-4">
        <p className="font-mono text-xs text-accent">Score</p>
        <p className="mt-2 text-2xl font-medium">
          {correct} / {questions.length}
        </p>
        <p className="mt-2 text-sm text-muted">Stored in this browser only. It is not a grade and not a benchmark.</p>
        <button
          type="button"
          className="mt-4 min-h-11 rounded-lg bg-accent px-4 text-sm font-medium text-accent-ink"
          onClick={() => {
            setIndex(0);
            setPicked(null);
            setCorrect(0);
            setDone(false);
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  const revealed = picked !== null;
  return (
    <div>
      <p className="font-mono text-xs text-muted">
        Question {index + 1} of {questions.length}
      </p>
      <h3 className="mt-2 text-lg font-medium">{q.prompt}</h3>
      <ChoiceList
        choices={choices}
        picked={picked}
        revealed={revealed}
        onPick={(id) => {
          if (picked) return;
          setPicked(id);
          const hit = choices.find((c) => c.id === id)?.correct;
          const next = correct + (hit ? 1 : 0);
          if (hit) setCorrect(next);
          if (index === questions.length - 1) setQuiz(moduleId, next, questions.length);
        }}
      />
      {revealed ? <p className="mt-3 text-sm text-muted">{q.explain}</p> : null}
      {revealed ? (
        <button
          type="button"
          className="mt-4 min-h-11 rounded-lg border border-line px-4 text-sm"
          onClick={() => {
            if (index + 1 >= questions.length) setDone(true);
            else {
              setIndex(index + 1);
              setPicked(null);
            }
          }}
        >
          {index + 1 >= questions.length ? "See score" : "Next"}
        </button>
      ) : null}
    </div>
  );
}

export function DebugLab({ moduleId, bugs }: { moduleId: string; bugs: Bug[] }) {
  const setBugs = useProgress((s) => s.setBugs);
  const [picks, setPicks] = useState<Record<number, string>>({});

  const correctCount = bugs.filter((b, i) => b.choices.find((c) => c.id === picks[i])?.correct).length;

  return (
    <div className="flex flex-col gap-6">
      {bugs.map((b, i) => {
        const choices = rotate(b.choices, i + 3);
        const picked = picks[i] ?? null;
        return (
          <article key={b.title} className="rounded-lg border border-line p-4">
            <h3 className="text-lg font-medium">{b.title}</h3>
            <p className="mt-2 text-sm">{b.symptom}</p>
            <pre className="mt-3 overflow-x-auto rounded-lg bg-bg p-3 font-mono text-xs leading-relaxed">
              <code>{b.code}</code>
            </pre>
            <ChoiceList
              choices={choices}
              picked={picked}
              revealed={picked !== null}
              onPick={(id) => {
                const next = { ...picks, [i]: id };
                setPicks(next);
                const n = bugs.filter((bug, j) => bug.choices.find((c) => c.id === next[j])?.correct).length;
                if (Object.keys(next).length === bugs.length) setBugs(moduleId, n, bugs.length);
              }}
            />
            {picked ? <p className="mt-3 text-sm text-muted">{b.explain}</p> : null}
          </article>
        );
      })}
      {Object.keys(picks).length === bugs.length ? (
        <p className="font-mono text-xs text-accent">
          {correctCount} / {bugs.length} diagnoses
        </p>
      ) : null}
    </div>
  );
}
