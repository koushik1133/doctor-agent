"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AddRecord({ patientId }: { patientId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState("visit_note");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    await fetch("/api/ingest", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ patientId, kind, title, body }),
    });
    setBusy(false);
    setTitle("");
    setBody("");
    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mt-3 px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-sm"
      >
        + Add record
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="mt-3 bg-zinc-900 rounded-2xl p-4 space-y-3">
      <select
        value={kind}
        onChange={(e) => setKind(e.target.value)}
        className="bg-zinc-800 rounded-lg px-3 py-2 w-full"
      >
        <option value="visit_note">Visit note</option>
        <option value="prescription">Prescription</option>
        <option value="lab">Lab result</option>
        <option value="transcript">Phone transcript</option>
        <option value="other">Other</option>
      </select>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Title"
        className="bg-zinc-800 rounded-lg px-3 py-2 w-full"
        required
      />
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Body / notes"
        rows={5}
        className="bg-zinc-800 rounded-lg px-3 py-2 w-full"
        required
      />
      <div className="flex gap-2">
        <button
          disabled={busy}
          className="px-4 py-2 rounded-lg bg-emerald-500 text-black font-medium disabled:opacity-50"
        >
          {busy ? "Saving…" : "Save"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="px-4 py-2 rounded-lg bg-zinc-800"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
