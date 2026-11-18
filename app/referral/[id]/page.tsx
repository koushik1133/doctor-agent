"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import type { Referral, RequestStatus } from "@/lib/store";
import { SPECIALTIES } from "@/lib/specialties";

const RESULTS = [
  { id: "better", label: "Better", hint: "The visit helped" },
  { id: "same", label: "About the same", hint: "No real change yet" },
  { id: "worse", label: "Worse", hint: "Things didn't improve" },
] as const;

export default function ReferralPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [r, setR] = useState<(Referral & { office: { phone?: string; telehealth: boolean } | null }) | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [missing, setMissing] = useState(false);
  const [result, setResult] = useState<(typeof RESULTS)[number]["id"] | null>(null);
  const [rating, setRating] = useState(0);
  const [note, setNote] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = () => fetch(`/api/referrals/${id}`).then(async (res) => (res.ok ? setR(await res.json()) : setMissing(true)));
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function cancelRequest() {
    if (!confirm("Cancel this request? Your contact details will be deleted from the office's list.")) return;
    setCancelling(true);
    const res = await fetch(`/api/referrals/${id}`, { method: "DELETE" });
    setCancelling(false);
    if (!res.ok) return setError((await res.json()).error);
    load();
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch(`/api/referrals/${id}/outcome`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ result, rating, note: note || undefined }) });
    const data = await res.json();
    if (!res.ok) return setError(data.error);
    setDone(true);
  }

  if (missing) return <main className="mx-auto max-w-xl px-4 pt-16"><h1 className="text-[28px] font-semibold">This follow-up link isn&apos;t valid</h1><p className="mt-2 text-ink-2">Check the link, or <Link href="/find" className="text-pine underline">start a new search</Link>.</p></main>;
  if (!r) return <main className="mx-auto max-w-xl px-4 pt-16 text-ink-2">Loading…</main>;

  const already = r.outcome || done;
  const status = r.request?.status as RequestStatus | undefined;
  const closed = status === "declined" || status === "cancelled" || status === "expired";
  return (
    <main className="mx-auto max-w-xl px-4 pb-24 pt-12 sm:px-6">
      <p className="text-[14px] text-ink-3">Referral saved {new Date(r.createdAt).toLocaleDateString()}</p>
      <h1 className="mt-1 text-[clamp(1.9rem,4vw,2.5rem)] font-semibold">
        {status === "pending" ? `Waiting to hear from ${r.doctorName}` : closed ? `Your request to ${r.doctorName}` : `How did it go with ${r.doctorName}?`}
      </h1>
      {r.request && (
        <RequestStatusCard status={status!} request={r.request} officePhone={r.office?.phone} cancelling={cancelling} onCancel={cancelRequest} />
      )}
      <p className="mt-3 text-ink-2">
        {SPECIALTIES[r.specialty]?.label} · for {r.conditions.slice(0, 3).join(", ").toLowerCase() || "your visit"}. Your answer is anonymous and feeds the
        doctor&apos;s outcome score for future patients. Bookmark this page and come back after your visit.
      </p>

      {status === "pending" ? (
        <p className="mt-8 text-ink-2">After your visit, come back to this page to tell us how it went.</p>
      ) : closed ? (
        <p className="mt-8">
          <Link href="/find" className="font-bold text-pine underline underline-offset-4">
            Find another doctor
          </Link>
        </p>
      ) : already ? (
        <div className="mt-8 rounded-xl border border-pine bg-pine-wash p-5">
          <p className="font-bold">Thanks — your outcome is recorded.</p>
          <p className="mt-1 text-[15px] text-ink-2">It now counts toward this doctor&apos;s ranking.</p>
        </div>
      ) : (
        <form onSubmit={submit} className="mt-8 grid gap-6">
          <fieldset>
            <legend className="font-bold">Since the visit, are you feeling…</legend>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              {RESULTS.map((o) => (
                <label key={o.id} className={`cursor-pointer rounded-lg border px-3 py-3 ${result === o.id ? "border-pine bg-pine-wash" : "border-rule bg-surface"}`}>
                  <input type="radio" name="result" className="sr-only" checked={result === o.id} onChange={() => setResult(o.id)} />
                  <span className="block font-bold">{o.label}</span>
                  <span className="text-[13px] text-ink-2">{o.hint}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend className="font-bold">Rate the doctor</legend>
            <div className="mt-2 flex gap-1" role="radiogroup">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} type="button" role="radio" aria-checked={rating === n} aria-label={`${n} star${n > 1 ? "s" : ""}`} onClick={() => setRating(n)} className={`text-[32px] leading-none ${n <= rating ? "text-pine" : "text-rule"}`}>
                  ★
                </button>
              ))}
            </div>
          </fieldset>
          <label className="grid gap-1">
            <span className="font-bold">Anything to add? (optional)</span>
            <textarea rows={3} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} className="rounded-lg border border-rule bg-surface px-3 py-2 focus:border-pine focus:outline-none" />
          </label>
          {error && <p role="alert" className="text-alert">{error}</p>}
          <button type="submit" disabled={!result || !rating} className="justify-self-start rounded-lg bg-pine px-5 py-3 font-bold text-pine-ink disabled:opacity-40">Record my outcome</button>
        </form>
      )}
    </main>
  );
}

const STATUS_COPY: Record<RequestStatus, { title: string; tone: string }> = {
  pending: { title: "Request sent — the office hasn't replied yet", tone: "border-rule bg-surface" },
  accepted: { title: "The office accepted your request", tone: "border-pine bg-pine-wash" },
  declined: { title: "The office can't take you on", tone: "border-warn/60 bg-warn-wash" },
  cancelled: { title: "You cancelled this request", tone: "border-rule bg-surface" },
  expired: { title: "No reply within 7 days", tone: "border-warn/60 bg-warn-wash" },
};

function RequestStatusCard({
  status,
  request,
  officePhone,
  cancelling,
  onCancel,
}: {
  status: RequestStatus;
  request: NonNullable<Referral["request"]>;
  officePhone?: string;
  cancelling: boolean;
  onCancel: () => void;
}) {
  const c = STATUS_COPY[status];
  return (
    <div className={`mt-6 rounded-xl border p-5 ${c.tone}`} role="status">
      <p className="font-bold">{c.title}</p>
      {request.doctorMessage && (
        <blockquote className="mt-2 border-l-2 border-pine pl-3 text-ink">&ldquo;{request.doctorMessage}&rdquo;</blockquote>
      )}
      <p className="mt-2 text-[15px] text-ink-2">
        {status === "pending" &&
          `Sent ${new Date(request.consentAt).toLocaleDateString()}. The office will contact you${request.contact?.phone ? ` at ${request.contact.phone}` : request.contact?.email ? ` at ${request.contact.email}` : ""}. Requests expire after 7 days without a reply.`}
        {status === "accepted" && "Expect a call or email to set a time. If you don't hear back in a couple of days, call the office."}
        {status === "declined" && "Your contact details will be deleted. Try another doctor from your results."}
        {status === "expired" && "Your contact details will be deleted. Call the office, or choose another doctor."}
        {status === "cancelled" && "Your contact details have been deleted."}
        {officePhone && status !== "cancelled" && (
          <>
            {" "}Office: <a href={`tel:${officePhone.replace(/[^\d+]/g, "")}`} className="font-bold text-pine underline underline-offset-2">{officePhone}</a>.
          </>
        )}
      </p>
      {status === "pending" && (
        <button type="button" onClick={onCancel} disabled={cancelling} className="mt-3 text-[14px] text-ink-2 underline underline-offset-2 disabled:opacity-50">
          {cancelling ? "Cancelling…" : "Cancel this request"}
        </button>
      )}
    </div>
  );
}
