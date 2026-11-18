"use client";

import { useState } from "react";

export type RequestPayload = { consent: true; name: string; phone?: string; email?: string; preferredTimes?: string; note?: string };

// Asks a verified doctor's office to contact the patient. Contact details are
// only sent when the patient ticks the consent box.
export function RequestForm({ doctorName, onSubmit, onCancel }: { doctorName: string; onSubmit: (r: RequestPayload) => Promise<string | null>; onCancel: () => void }) {
  const [f, setF] = useState({ name: "", phone: "", email: "", preferredTimes: "", note: "", consent: false });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const input = "w-full rounded-lg border border-rule bg-paper px-3 py-2 text-[15px] focus:border-pine focus:outline-none";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!f.phone.trim() && !f.email.trim()) return setError("Add a phone number or email so the office can reach you.");
    if (!f.consent) return setError("Tick the box to agree to share your details with this office.");
    setBusy(true);
    setError(null);
    const err = await onSubmit({ consent: true, name: f.name, phone: f.phone, email: f.email, preferredTimes: f.preferredTimes, note: f.note });
    setBusy(false);
    if (err) setError(err);
  }

  return (
    <form onSubmit={submit} className="grid gap-3 rounded-lg border border-rule bg-surface p-4" aria-label={`Request an appointment with ${doctorName}`}>
      <p className="font-bold">Ask {doctorName}&apos;s office to contact you</p>
      <label className="grid gap-1 text-[14px]">
        <span className="font-bold">Your name</span>
        <input required autoComplete="name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} className={input} />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1 text-[14px]">
          <span className="font-bold">Phone</span>
          <input type="tel" autoComplete="tel" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} className={input} />
        </label>
        <label className="grid gap-1 text-[14px]">
          <span className="font-bold">Email</span>
          <input type="email" autoComplete="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} className={input} />
        </label>
      </div>
      <label className="grid gap-1 text-[14px]">
        <span className="font-bold">Best times to reach you (optional)</span>
        <input value={f.preferredTimes} onChange={(e) => setF({ ...f, preferredTimes: e.target.value })} placeholder="Weekday mornings" className={input} />
      </label>
      <label className="grid gap-1 text-[14px]">
        <span className="font-bold">Anything the office should know (optional)</span>
        <textarea rows={2} maxLength={500} value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} className={input} />
      </label>
      <label className="flex gap-2 text-[14px] text-ink-2">
        <input type="checkbox" checked={f.consent} onChange={(e) => setF({ ...f, consent: e.target.checked })} className="mt-1 h-4 w-4 shrink-0 accent-[var(--pine)]" />
        <span>
          Share my name, contact details and the conditions found in my records with this office so they can schedule me. Deleted 30 days after they
          respond. Your documents are never shared.
        </span>
      </label>
      {error && <p role="alert" className="text-[14px] text-alert">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={busy} className="rounded-lg bg-pine px-4 py-2 font-bold text-pine-ink disabled:opacity-50">
          {busy ? "Sending…" : "Send request"}
        </button>
        <button type="button" onClick={onCancel} className="rounded-lg px-3 py-2 text-ink-2 underline underline-offset-2">
          Cancel
        </button>
      </div>
    </form>
  );
}
