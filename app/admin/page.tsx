"use client";

import { useCallback, useEffect, useState } from "react";
import type { DoctorApplication } from "@/lib/store";
import { SPECIALTIES } from "@/lib/specialties";
import { CheckList } from "@/components/CheckList";

const TABS = [
  { id: "needs_review", label: "Needs review" },
  { id: "verified", label: "Verified" },
  { id: "rejected", label: "Rejected" },
] as const;

export default function AdminPage() {
  const [apps, setApps] = useState<DoctorApplication[] | null>(null);
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("needs_review");
  const [token, setToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [issued, setIssued] = useState<{ id: string; url: string } | null>(null);

  const headers = useCallback((): HeadersInit => (token ? { "x-admin-token": token } : {}), [token]);

  const load = useCallback(async () => {
    setError(null);
    const res = await fetch("/api/admin/applications", { headers: headers() });
    const data = await res.json();
    if (!res.ok) return setError(data.error);
    setApps(data.applications);
  }, [headers]);

  useEffect(() => {
    try {
      setToken(sessionStorage.getItem("adminToken") ?? "");
    } catch {}
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  async function act(id: string, action: "approve" | "reject" | "reverify" | "reissue_link") {
    const res = await fetch("/api/admin/applications", { method: "PATCH", headers: { ...headers(), "content-type": "application/json" }, body: JSON.stringify({ id, action }) });
    const data = await res.json();
    if (!res.ok) return setError(data.error);
    setApps((list) => list?.map((a) => (a.id === id ? data.application : a)) ?? null);
    if (data.manageToken) setIssued({ id, url: `${window.location.origin}/doctors/manage#${data.manageToken}` });
  }

  const shown = (apps ?? []).filter((a) => a.status === tab);
  return (
    <main className="mx-auto max-w-5xl px-4 pb-24 pt-12 sm:px-6">
      <h1 className="text-[clamp(2rem,4vw,2.75rem)] font-semibold">Doctor applications</h1>
      <p className="mt-2 max-w-[62ch] text-ink-2">Every application is auto-checked against NPPES. Approve only what you&apos;ve confirmed — applications that fail an identity check can&apos;t be approved.</p>

      {error && (
        <div role="alert" className="mt-6 rounded-lg border border-alert/40 bg-alert-wash p-4 text-[15px]">
          {error}
          {error.includes("token") && (
            <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); try { sessionStorage.setItem("adminToken", token); } catch {} load(); }}>
              <input type="password" value={token} onChange={(e) => setToken(e.target.value)} placeholder="Admin token" className="rounded-lg border border-rule bg-surface px-3 py-1.5" />
              <button className="rounded-lg bg-ink px-3 py-1.5 font-bold text-paper">Unlock</button>
            </form>
          )}
        </div>
      )}

      <div role="tablist" className="mt-8 flex gap-1 border-b border-rule">
        {TABS.map((t) => {
          const n = (apps ?? []).filter((a) => a.status === t.id).length;
          return (
            <button key={t.id} role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)} className={`-mb-px border-b-2 px-3 py-2 text-[15px] ${tab === t.id ? "border-pine font-bold text-ink" : "border-transparent text-ink-2 hover:text-ink"}`}>
              {t.label} <span className="text-ink-3 tabular-nums">{n}</span>
            </button>
          );
        })}
      </div>

      {apps && !shown.length && <p className="mt-8 text-ink-2">Nothing here. New applications from the <a href="/doctors/join" className="text-pine underline">doctor sign-up page</a> show up automatically.</p>}

      <ul className="mt-6 grid gap-3">
        {shown.map((a) => {
          const fails = a.verification.checks.filter((c) => c.status !== "pass");
          const isOpen = open === a.id;
          return (
            <li key={a.id} className="rounded-xl border border-rule bg-surface">
              <button type="button" onClick={() => setOpen(isOpen ? null : a.id)} aria-expanded={isOpen} className="flex w-full flex-wrap items-baseline gap-x-4 gap-y-1 px-5 py-4 text-left">
                <span className="font-display text-[19px] font-semibold">{a.firstName} {a.lastName}</span>
                <span className="text-[14px] text-ink-2">{SPECIALTIES[a.specialty]?.label} · NPI {a.npi} · {a.licenseState} {a.practiceZip}</span>
                <span className="ml-auto text-[13px] text-ink-3">{fails.length ? `${fails.length} item${fails.length > 1 ? "s" : ""} to check` : "all checks passed"} · {new Date(a.createdAt).toLocaleDateString()}</span>
              </button>
              {isOpen && (
                <div className="grid gap-6 border-t border-rule px-5 py-5 md:grid-cols-[1fr_15rem]">
                  <CheckList checks={a.verification.checks} />
                  <div className="grid content-start gap-2 text-[14px]">
                    <p className="text-ink-2">{a.email}{a.phone ? ` · ${a.phone}` : ""}</p>
                    <p className="text-ink-2">{a.acceptingNew ? `Accepting ${a.weeklyCapacity}/week` : "Not accepting new patients"}{a.telehealth ? " · video visits" : ""}</p>
                    <a href={`https://npiregistry.cms.hhs.gov/provider-view/${a.npi}`} target="_blank" rel="noreferrer" className="text-pine underline underline-offset-2">Open NPPES record</a>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {a.status !== "verified" && <button onClick={() => act(a.id, "approve")} className="rounded-lg bg-pine px-3 py-2 font-bold text-pine-ink">Approve</button>}
                      {a.status !== "rejected" && <button onClick={() => act(a.id, "reject")} className="rounded-lg border border-alert px-3 py-2 font-bold text-alert">Reject</button>}
                      <button onClick={() => act(a.id, "reverify")} className="rounded-lg border border-rule px-3 py-2">Re-run checks</button>
                      {a.status !== "rejected" && <button onClick={() => act(a.id, "reissue_link")} className="rounded-lg border border-rule px-3 py-2">New practice link</button>}
                    </div>
                    {issued?.id === a.id && (
                      <div className="mt-2 rounded-lg bg-pine-wash p-3">
                        <p className="font-bold">Send this to {a.email}</p>
                        <input readOnly value={issued.url} onFocus={(e) => e.currentTarget.select()} aria-label="New practice link" className="mt-2 w-full rounded border border-rule bg-surface px-2 py-1 text-[13px]" />
                        <p className="mt-1 text-[12px] text-ink-3">The previous link no longer works. This one isn&apos;t shown again.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </main>
  );
}
