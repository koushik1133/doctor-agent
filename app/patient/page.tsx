"use client";

import { useEffect, useRef, useState } from "react";

type Msg = { role: "user" | "assistant"; content: string };
type Stage = "verify" | "ready" | "listening" | "thinking" | "speaking";

function speak(text: string, onEnd?: () => void) {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.rate = 1.05;
  utter.pitch = 1;
  utter.onend = () => onEnd?.();
  window.speechSynthesis.speak(utter);
}

export default function PatientPage() {
  const [stage, setStage] = useState<Stage>("verify");
  const [fullName, setFullName] = useState("");
  const [dob, setDob] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [callId, setCallId] = useState<string | null>(null);
  const [patientId, setPatientId] = useState<string | null>(null);
  const [patientName, setPatientName] = useState<string | null>(null);
  const [history, setHistory] = useState<Msg[]>([]);
  const [urgency, setUrgency] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch("/api/verify-identity", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ fullName, dob }),
    });
    const data = await res.json();
    if (!data.matched) {
      setError("We couldn't find a patient with that name and date of birth. Please check and try again.");
      return;
    }
    setCallId(data.callId);
    setPatientId(data.patient.id);
    setPatientName(data.patient.full_name);
    setStage("ready");
    const greeting = `Hi ${data.patient.full_name.split(" ")[0]}, you're verified. I'm the after-hours assistant. Tap the mic and tell me what's going on.`;
    setHistory([{ role: "assistant", content: greeting }]);
    setStage("speaking");
    speak(greeting, () => setStage("ready"));
  }

  async function startRecording() {
    if (stage !== "ready") return;
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const rec = new MediaRecorder(stream, { mimeType: "audio/webm" });
    chunksRef.current = [];
    rec.ondataavailable = (e) => e.data.size > 0 && chunksRef.current.push(e.data);
    rec.onstop = handleStop;
    mediaRecorderRef.current = rec;
    rec.start();
    setStage("listening");
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
    mediaRecorderRef.current?.stream.getTracks().forEach((t) => t.stop());
  }

  async function handleStop() {
    setStage("thinking");
    const blob = new Blob(chunksRef.current, { type: "audio/webm" });
    const fd = new FormData();
    fd.append("audio", blob, "speech.webm");

    const txRes = await fetch("/api/transcribe", { method: "POST", body: fd });
    const tx = await txRes.json();
    const userText: string = tx.text?.trim() || "";
    if (!userText) {
      setStage("ready");
      return;
    }
    const newHistory = [...history, { role: "user" as const, content: userText }];
    setHistory(newHistory);

    const chatRes = await fetch("/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ callId, patientId, history, message: userText }),
    });
    const chat = await chatRes.json();
    setUrgency(chat.urgency);
    const finalHistory = [...newHistory, { role: "assistant" as const, content: chat.reply }];
    setHistory(finalHistory);
    setStage("speaking");
    speak(chat.reply, () => setStage("ready"));
  }

  useEffect(() => () => window.speechSynthesis?.cancel(), []);

  if (stage === "verify") {
    return (
      <main className="min-h-screen flex items-center justify-center p-8">
        <form onSubmit={verify} className="w-full max-w-md bg-zinc-900 rounded-2xl p-6 space-y-4">
          <h1 className="text-2xl font-semibold">Verify your identity</h1>
          <p className="text-sm text-zinc-400">
            Try one of the demo patients: <b>Koushik Sharma</b> (1995-03-12),{" "}
            <b>Anita Reddy</b> (1962-08-04), or <b>Marcus Chen</b> (1978-11-22).
          </p>
          <input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Full name"
            className="w-full bg-zinc-800 rounded-lg px-3 py-2 outline-none"
            required
          />
          <input
            type="date"
            value={dob}
            onChange={(e) => setDob(e.target.value)}
            className="w-full bg-zinc-800 rounded-lg px-3 py-2 outline-none"
            required
          />
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button className="w-full py-3 rounded-lg bg-emerald-500 text-black font-medium">
            Verify
          </button>
        </form>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col p-6 max-w-3xl mx-auto">
      <header className="flex items-center justify-between mb-4">
        <div>
          <div className="text-sm text-zinc-500">Verified</div>
          <div className="text-lg font-medium">{patientName}</div>
        </div>
        {urgency && (
          <span
            className={`px-3 py-1 rounded-full text-xs font-medium ${
              urgency === "emergency"
                ? "bg-red-500 text-white"
                : urgency === "urgent"
                ? "bg-orange-500 text-black"
                : "bg-zinc-700 text-zinc-200"
            }`}
          >
            {urgency.toUpperCase()}
          </span>
        )}
      </header>

      <section className="flex-1 overflow-y-auto space-y-3 mb-6">
        {history.map((m, i) => (
          <div
            key={i}
            className={`max-w-[80%] rounded-2xl px-4 py-2 ${
              m.role === "assistant"
                ? "bg-zinc-800 text-zinc-100"
                : "bg-emerald-500 text-black ml-auto"
            }`}
          >
            {m.content}
          </div>
        ))}
      </section>

      <div className="flex flex-col items-center gap-3">
        <button
          onMouseDown={startRecording}
          onMouseUp={stopRecording}
          onTouchStart={startRecording}
          onTouchEnd={stopRecording}
          disabled={stage !== "ready" && stage !== "listening"}
          className={`w-24 h-24 rounded-full font-medium transition ${
            stage === "listening"
              ? "bg-red-500 text-white scale-110"
              : stage === "thinking"
              ? "bg-zinc-700 text-zinc-400"
              : stage === "speaking"
              ? "bg-blue-500 text-white"
              : "bg-emerald-500 text-black hover:bg-emerald-400"
          }`}
        >
          {stage === "listening"
            ? "Listening…"
            : stage === "thinking"
            ? "Thinking…"
            : stage === "speaking"
            ? "Speaking…"
            : "Hold to talk"}
        </button>
        <p className="text-xs text-zinc-500">Hold the button while you speak, release when done.</p>
      </div>
    </main>
  );
}
