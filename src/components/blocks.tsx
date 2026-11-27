import type { Block } from "@/lib/lessons";

export function Blocks({ blocks }: { blocks: Block[] }) {
  return (
    <div className="flex flex-col gap-4">
      {blocks.map((b, i) => {
        if (b.type === "p") return <p key={i}>{b.text}</p>;
        if (b.type === "ul")
          return (
            <ul key={i} className="list-disc pl-5 text-fg">
              {b.items.map((item) => (
                <li key={item} className="mt-1">
                  {item}
                </li>
              ))}
            </ul>
          );
        if (b.type === "code")
          return (
            <figure key={i} className="overflow-hidden rounded-lg border border-line bg-bg">
              <figcaption className="border-b border-line px-3 py-2 font-mono text-xs text-muted">{b.label}</figcaption>
              <pre className="overflow-x-auto p-3 font-mono text-xs leading-relaxed">
                <code>{b.code}</code>
              </pre>
            </figure>
          );
        if (b.type === "note")
          return (
            <p key={i} className="rounded-lg border border-line bg-surface px-3 py-3 text-sm">
              <span className="font-mono text-xs text-accent">{b.tag}. </span>
              {b.text}
            </p>
          );
        return (
          <div key={i} className="overflow-x-auto rounded-lg border border-line">
            <table className="w-full min-w-full text-left text-sm">
              <thead className="bg-surface font-mono text-xs text-muted">
                <tr>
                  {b.headers.map((h) => (
                    <th key={h} className="px-3 py-2 font-medium">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {b.rows.map((r) => (
                  <tr key={r.join("|")} className="border-t border-line">
                    {r.map((c) => (
                      <td key={c} className="px-3 py-2 align-top">
                        {c}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
}

export function rotate<T>(items: T[], salt: number): T[] {
  if (items.length === 0) return items;
  const n = salt % items.length;
  return items.slice(n).concat(items.slice(0, n));
}
