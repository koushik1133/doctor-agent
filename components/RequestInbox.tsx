"use client";

import { useState } from "react";
import type { PatientContact, RequestStatus } from "@/lib/store";

export type InboxItem = {
  id: string;
  createdAt: string;
  conditions: string[];
  patientZip: string;
  status: RequestStatus;
  contact: PatientContact | null;
  respondedAt?: string;
  doctorMessage?: string;
};

const LABEL: Record<RequestStatus, string> = {
  pending: "Waiting for you",
  accepted: "Accepted",
  declined: "Declined",
  cancelled: "Cancelled by patient",
  expired: "Expired (no reply in 7 days)",
};

// Appointment requests for a doctor's office. Pending first, then the rest.
export function RequestInbox({ items, token, onChange }: { items: InboxItem[]; token: string; onChange: () => void }) {
  const pending = items.filter((i) => i.status === "pending");
  const past = items.filter((i) => i.status !== "pending");
  return (
    <section aria-labelledby="inbox">
      <h2 id="inbox" className="text-[22px] font-semibold">
        Appointment requests {pending.length > 0 && <span className="ml-1 rounded-full bg-pine px-2.5 py-0.5 align-middle text-[14px] text-pine-ink tabular-nums">{pending.length}</span>}
      </h2>
      <p className="mt-1 text-[14px] text-ink-2">
        Patients who asked you to contact them. Reply within 7 days or the request expires and the spot goes back to your weekly limit. Contact details are deleted 30 days after you respond.
      </p>
      {items.length === 0 && <p className="mt-5 rounded-lg border border-dashed border-rule p-6 text-ink-2">No requests yet.</p>}
      <ul className="mt-5 grid gap-3">
        {pending.map((i) => (
          <PendingCard key={i.id} item={i} token={token} onChange={onChange} />
        ))}
      </ul>
      {past.length > 0 && (
        <details className="mt-5">
          <summary className="cursor-pointer text-[15px] font-bold">Answered and closed ({past.length})</summary>
          <ul className="mt-3 grid gap-2">
            {past.map((i) => (
              <li key={i.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded-lg border border-rule bg-surface px-4 py-3 text-[14px]">
                <span className="font-bold">{i.contact?.name ?? "Contact details deleted"}</span>
                <span className="text-ink-2">{i.conditions.slice(0, 2).join(", ")}</span>
                <span className={`ml-auto ${i.status === "accepted" ? "text-pine" : "text-ink-3"}`}>{LABEL[i.status]}</span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}

function PendingCard({ item, token, onChange }: { item: InboxItem; token: string; onChange: () => void }) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState<null | "accept" | "decline">(null);
  const [error, setError] = useState<string | null>(null);
  const c = item.contact;

  async function respond(action: "accept" | "decline") {
    setBusy(action);
    setError(null);
    const res = await fetch("/api/doctors/manage/requests", {
      method: "POST",
      headers: { "content-type": "application/json", "x-manage-token": token },
      body: JSON.stringify({ referralId: item.id, action, message: message || undefined }),
    });
    const d = await res.json();
    setBusy(null);
    if (!res.ok) return setError(d.error);
    onChange();
  }

  const ageH = (Date.now() - Date.parse(item.createdAt)) / 3600000;
  return (
    <li className="rounded-xl border-2 border-pine/40 bg-surface p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-display text-[19px] font-semibold">{c?.name}</p>
        <p className="text-[13px] text-ink-3">{ageH < 1 ? "just now" : ageH < 24 ? `${Math.round(ageH)} h ago` : `${Math.round(ageH / 24)} days ago`} · ZIP {item.patientZip}</p>
      </div>
      <dl className="mt-3 grid gap-x-6 gap-y-2 text-[15px] sm:grid-cols-[8rem_1fr]">
        <dt className="text-ink-3">Records show</dt>
        <dd>{item.conditions.join(", ") || "—"}</dd>
        {c?.phone && (
          <>
            <dt className="text-ink-3">Phone</dt>
            <dd><a href={`tel:${c.phone.replace(/[^\d+]/g, "")}`} className="font-bold text-pine underline underline-offset-2">{c.phone}</a></dd>
          </>
        )}
        {c?.email && (
          <>
            <dt className="text-ink-3">Email</dt>
            <dd><a href={`mailto:${c.email}`} className="font-bold text-pine underline underline-offset-2">{c.email}</a></dd>
          </>
        )}
        {c?.preferredTimes && (
          <>
            <dt className="text-ink-3">Best times</dt>
            <dd>{c.preferredTimes}</dd>
          </>
        )}
        {c?.note && (
          <>
            <dt className="text-ink-3">Note</dt>
            <dd className="whitespace-pre-wrap">{c.note}</dd>
          </>
        )}
      </dl>
      <label className="mt-4 grid gap-1 text-[14px]">
        <span className="font-bold">Message to the patient (optional)</span>
        <input value={message} maxLength={500} onChange={(e) => setMessage(e.target.value)} placeholder="We'll call you Tuesday morning to book." className="rounded-lg border border-rule bg-paper px-3 py-2 focus:border-pine focus:outline-none" />
      </label>
      {error && <p role="alert" className="mt-2 text-[14px] text-alert">{error}</p>}
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" disabled={busy !== null} onClick={() => respond("accept")} className="rounded-lg bg-pine px-4 py-2 font-bold text-pine-ink disabled:opacity-50">
          {busy === "accept" ? "Accepting…" : "Accept"}
        </button>
        <button type="button" disabled={busy !== null} onClick={() => respond("decline")} className="rounded-lg border border-rule px-4 py-2 font-bold disabled:opacity-50">
          {busy === "decline" ? "Declining…" : "Decline"}
        </button>
      </div>
    </li>
  );
}
