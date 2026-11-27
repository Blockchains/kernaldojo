import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { BookOpen, FolderGit2, Gauge, MoreHorizontal, Trophy } from "lucide-react";

export const REPO_URL = "https://github.com/Blockchains/kernaldojo";

const primary = [
  { to: "/path", label: "Path", icon: BookOpen },
  { to: "/bench", label: "Bench", icon: Gauge },
  { to: "/repo", label: "Repo", icon: FolderGit2 },
  { to: "/leaderboard", label: "Board", icon: Trophy },
] as const;

const moreLinks = [
  { to: "/sources", label: "Sources" },
  { to: "/risks", label: "Risks" },
  { to: "/plan", label: "30-day plan" },
  { to: "/contribute", label: "Pull requests" },
] as const;

export function Shell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [more, setMore] = useState(false);
  useEffect(() => setMore(false), [pathname]);
  const moreOn = moreLinks.some((l) => l.to === pathname);

  return (
    <div className="min-h-screen pb-24">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-40 focus:bg-accent focus:px-3 focus:py-2 focus:text-accent-ink"
      >
        Skip to content
      </a>
      <header className="sticky top-0 z-20 border-b border-line bg-bg">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3">
          <Link to="/" className="flex min-h-11 items-center gap-2">
            <span className="inline-block size-3 bg-accent" aria-hidden />
            <span className="text-base font-medium tracking-tight">KernelDojo</span>
          </Link>
          <a
            href={REPO_URL}
            className="ml-auto inline-flex min-h-11 items-center font-mono text-xs text-muted"
          >
            Blockchains/kernaldojo
          </a>
        </div>
      </header>
      <main id="main" className="mx-auto max-w-5xl px-4 py-6">
        {children}
      </main>
      <nav className="dock fixed inset-x-0 bottom-0 z-30 border-t border-line bg-bg" aria-label="Primary">
        {more ? (
          <div className="border-b border-line bg-surface px-3 py-2">
            <div className="mx-auto grid max-w-5xl grid-cols-2 gap-2">
              {moreLinks.map((l) => (
                <Link
                  key={l.to}
                  to={l.to}
                  className={
                    "inline-flex min-h-11 items-center rounded-lg px-3 text-sm " +
                    (pathname === l.to ? "bg-raised text-accent" : "text-fg")
                  }
                >
                  {l.label}
                </Link>
              ))}
              <a
                href={REPO_URL}
                className="inline-flex min-h-11 items-center rounded-lg px-3 text-sm text-fg"
              >
                GitHub repo
              </a>
            </div>
          </div>
        ) : null}
        <div className="mx-auto grid max-w-5xl grid-cols-5">
          {primary.map((l) => {
            const on = pathname === l.to || pathname.startsWith(l.to + "/");
            const Icon = l.icon;
            return (
              <Link
                key={l.to}
                to={l.to}
                className={
                  "inline-flex min-h-14 flex-col items-center justify-center gap-1 text-xs " +
                  (on ? "text-accent" : "text-muted")
                }
              >
                <Icon className="size-5" aria-hidden />
                {l.label}
              </Link>
            );
          })}
          <button
            type="button"
            aria-expanded={more}
            onClick={() => setMore((v) => !v)}
            className={
              "inline-flex min-h-14 flex-col items-center justify-center gap-1 text-xs " +
              (more || moreOn ? "text-accent" : "text-muted")
            }
          >
            <MoreHorizontal className="size-5" aria-hidden />
            More
          </button>
        </div>
      </nav>
    </div>
  );
}

export function Tag({ children }: { children: string }) {
  return (
    <span className="inline-flex items-center rounded-sm border border-line bg-surface px-1.5 py-0.5 font-mono text-xs text-accent">
      {children}
    </span>
  );
}

export function PageTitle({ kicker, title, lede }: { kicker: string; title: string; lede?: string }) {
  return (
    <header className="mb-6 max-w-3xl">
      <p className="font-mono text-xs text-muted">{kicker}</p>
      <h1 className="mt-1 text-3xl font-medium tracking-tight">{title}</h1>
      {lede ? <p className="mt-3 text-base text-muted">{lede}</p> : null}
    </header>
  );
}
