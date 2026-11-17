import type { Component } from "@/lib/matching/score";

// Five thin bars, one per ranking component. Missing data is shown as a
// hatched bar rather than silently dropped.
export function ScoreStrip({ components, detailed = false }: { components: Component[]; detailed?: boolean }) {
  return (
    <dl className={detailed ? "grid gap-3" : "grid grid-cols-5 gap-1.5"}>
      {components.map((c) => (
        <div key={c.key} className={detailed ? "grid gap-1 sm:grid-cols-[9rem_1fr] sm:items-center sm:gap-4" : ""}>
          <dt className={detailed ? "text-[14px] font-bold text-ink" : "sr-only"}>
            {c.label} <span className="font-normal text-ink-3">· {Math.round(c.weight * 100)}%</span>
          </dt>
          <dd className="grid gap-1">
            <div
              className="h-1.5 overflow-hidden rounded-full bg-rule"
              style={c.value === null ? { background: "repeating-linear-gradient(135deg, var(--rule) 0 3px, transparent 3px 6px)" } : undefined}
              title={`${c.label}: ${c.value === null ? "no data" : Math.round(c.value * 100) + "/100"}`}
            >
              {c.value !== null && <div className="h-full rounded-full bg-pine" style={{ width: `${Math.max(4, c.value * 100)}%` }} />}
            </div>
            {detailed && (
              <p className="text-[13.5px] leading-snug text-ink-2">
                {c.detail}
                <span className="block text-ink-3">{c.source}</span>
              </p>
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}
