export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { purgeExpiredContacts } = await import("./lib/store");
  const run = () => purgeExpiredContacts().catch((e) => console.error("contact purge failed", e));
  run();
  setInterval(run, 60 * 60 * 1000).unref();
}
