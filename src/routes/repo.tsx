import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { PageTitle, Shell } from "@/components/shell";
import { repoFiles } from "@/lib/repo";

export const Route = createFileRoute("/repo")({ component: RepoPage });

function RepoPage() {
  const [path, setPath] = useState(repoFiles[0]?.path ?? "");
  const file = repoFiles.find((f) => f.path === path) ?? repoFiles[0];
  return (
    <Shell>
      <PageTitle
        kicker="Tree"
        title="The programme repo"
        lede="No GitHub push was made from this preview. This is the tree, readable here. The roofline tests also live as real files you can fetch from the site under /programme/."
      />
      <div className="grid gap-4 lg:grid-cols-5">
        <ul className="flex flex-col lg:col-span-2">
          {repoFiles.map((f) => (
            <li key={f.path}>
              <button
                type="button"
                onClick={() => setPath(f.path)}
                className={
                  "min-h-11 w-full truncate px-2 text-left font-mono text-xs " +
                  (f.path === file?.path ? "text-accent" : "text-muted")
                }
              >
                {f.path}
              </button>
            </li>
          ))}
          <li>
            <a
              className="inline-flex min-h-11 items-center px-2 font-mono text-xs text-fg underline"
              href="/programme/modules/00-roofline/test_roofline.py"
            >
              download test_roofline.py
            </a>
          </li>
        </ul>
        {file ? (
          <figure className="overflow-hidden rounded-lg border border-line lg:col-span-3">
            <figcaption className="border-b border-line px-3 py-2 font-mono text-xs text-muted">{file.path}</figcaption>
            <pre className="max-h-[32rem] overflow-auto p-3 font-mono text-xs leading-relaxed">
              <code>{file.body}</code>
            </pre>
          </figure>
        ) : null}
      </div>
    </Shell>
  );
}
