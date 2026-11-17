import Groq from "groq-sdk";

// Created on first use so the app builds and the doctor-matching features run
// without a Groq key (only the voice triage assistant needs it).
let client: Groq | null = null;
export const groq = new Proxy({} as Groq, {
  get(_t, prop) {
    if (!client) {
      if (!process.env.GROQ_API_KEY) throw new Error("GROQ_API_KEY is not set — the voice assistant needs it.");
      client = new Groq({ apiKey: process.env.GROQ_API_KEY });
    }
    return (client as unknown as Record<string | symbol, unknown>)[prop];
  },
});

export const CHAT_MODEL = "llama-3.3-70b-versatile";
export const STT_MODEL = "whisper-large-v3";
