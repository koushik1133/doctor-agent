"use client";

import type { Span } from "@/lib/analysis/engine";

// Renders the patient's document with every extracted finding highlighted,
// so they can see exactly what the analyzer read and why.
export function HighlightedDoc({ text, spans, active, onSelect }: { text: string; spans: Span[]; active?: string | null; onSelect?: (label: string | null) => void }) {
  const parts: React.ReactNode[] = [];
  let at = 0;
  spans.forEach((s, i) => {
    if (s.start > at) parts.push(text.slice(at, s.start));
    parts.push(
      <mark
        key={i}
        className="finding cursor-help"
        data-kind={s.kind}
        data-active={active === s.label}
        style={{ ["--i" as string]: Math.min(i, 12) }}
        title={s.label}
        onMouseEnter={() => onSelect?.(s.label)}
        onMouseLeave={() => onSelect?.(null)}
      >
        {text.slice(s.start, s.end)}
      </mark>,
    );
    at = s.end;
  });
  parts.push(text.slice(at));
  return <div className="sweep whitespace-pre-wrap break-words font-sans text-[15px] leading-[1.75] text-ink-2">{parts}</div>;
}
