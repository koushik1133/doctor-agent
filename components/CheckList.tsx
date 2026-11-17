import type { CheckResult } from "@/lib/verification/verify";

const ICON = { pass: "✓", warn: "!", fail: "✕" } as const;
const TONE = {
  pass: "bg-pine text-pine-ink",
  warn: "bg-warn-wash text-warn border border-warn/50",
  fail: "bg-alert text-white",
} as const;

export function CheckList({ checks }: { checks: CheckResult[] }) {
  return (
    <ul className="grid gap-3">
      {checks.map((c) => (
        <li key={c.id} className="grid grid-cols-[1.75rem_1fr] gap-3">
          <span aria-label={c.status} className={`grid h-6 w-6 place-items-center rounded-full text-[13px] font-bold ${TONE[c.status]}`}>
            {ICON[c.status]}
          </span>
          <span>
            <span className="block text-[15px] font-bold">{c.label}</span>
            <span className="block text-[14px] text-ink-2">{c.detail}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}
