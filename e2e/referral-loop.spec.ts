import { test, expect, type Page } from "@playwright/test";
import path from "node:path";

// The full marketplace loop with real public data:
//   1. An application using a registry record is held for review, gets no portal
//      access, and is approved by an admin who records how identity was confirmed.
//   2. A patient uploads a lab report, gets routed to endocrinology, searches a
//      real NYC ZIP, finds that doctor and sends an appointment request.
//   3. The doctor opens their private portal and accepts with a message.
//   4. The patient's follow-up page shows the acceptance.
// The record is picked from NPPES at run time and only ever used against this
// local server, so no real person's identity is committed here.

const DOCTOR = { npi: "", license: "", zip: "", first: "", name: "" };
const title = (t: string) => t.toLowerCase().replace(/\b[a-z]/g, (m) => m.toUpperCase());

test.describe.configure({ mode: "serial" });

let manageUrl = "";
let followUpUrl = "";

test.beforeAll(async ({ request }) => {
  const res = await request.get("https://npiregistry.cms.hhs.gov/api/?version=2.1&taxonomy_description=Endocrinology&city=NEW%20YORK&state=NY&enumeration_type=NPI-1&limit=100");
  for (const r of (await res.json()).results) {
    const t = r.taxonomies.find((x: { code: string; primary: boolean; license?: string; state?: string }) => x.code === "207RE0101X" && x.primary && x.license && x.state === "NY");
    const loc = r.addresses.find((a: { address_purpose: string }) => a.address_purpose === "LOCATION");
    if (t && loc?.state === "NY" && loc.postal_code.startsWith("100") && /^[A-Z]+$/.test(r.basic.first_name) && /^[A-Z]+$/.test(r.basic.last_name)) {
      Object.assign(DOCTOR, { npi: r.number, license: t.license, zip: loc.postal_code.slice(0, 5), first: title(r.basic.first_name), name: title(r.basic.last_name) });
      return;
    }
  }
  throw new Error("no suitable registry record");
});

test("matching public registry data is not enough: a reviewer must confirm identity", async ({ page, request }) => {
  await page.goto("/doctors/join");
  await page.getByPlaceholder("10 digits").fill(DOCTOR.npi);
  await page.getByRole("button", { name: "Fill from registry" }).click();
  await expect(page.getByLabel("Last name")).toHaveValue(DOCTOR.name);
  await page.getByLabel("Work email").fill("e2e-doctor@example.com");
  await page.getByLabel("License state").fill("NY");
  await page.getByLabel("License number").fill(DOCTOR.license);
  await page.getByLabel("Practice ZIP").fill(DOCTOR.zip);
  await page.getByRole("button", { name: "Apply and verify" }).click();
  await expect(page.getByRole("heading", { name: "Application received" })).toBeVisible({ timeout: 60_000 });
  await expect(page.getByLabel("Private practice link")).toHaveCount(0);

  expect((await request.get("/api/admin/applications")).status()).toBe(401);
  const headers = { "x-admin-token": "e2e-admin" };
  const app = (await (await request.get("/api/admin/applications", { headers })).json()).applications.find((a: { npi: string }) => a.npi === DOCTOR.npi);
  expect(app.status).toBe("needs_review");
  const body = { npi: DOCTOR.npi, doctorName: "x", specialty: "endocrinology", conditions: [], patientZip: "10016", request: { consent: true, name: "Pat E2E", phone: "555 010 0199" } };
  expect((await request.post("/api/referrals", { data: body })).status()).toBe(422);
  expect((await request.patch("/api/admin/applications", { headers, data: { id: app.id, action: "approve" } })).status()).toBe(422);
  const ok = await request.patch("/api/admin/applications", { headers, data: { id: app.id, action: "approve", identityMethod: "E2E: simulated call to registry phone" } });
  expect(ok.ok()).toBe(true);
  manageUrl = `/doctors/manage#${(await ok.json()).manageToken}`;
});

test("a patient uploads records, is matched, and requests an appointment", async ({ page }) => {
  await page.goto("/find");
  await page.locator('input[type="file"]').setInputFiles(path.join(__dirname, "../tests/fixtures/diabetes-labs.txt"));
  await expect(page.getByText("diabetes-labs.txt")).toBeVisible();
  await page.getByRole("button", { name: "Read my records" }).click();

  await expect(page.getByRole("heading", { name: "Here's what we found" })).toBeVisible();
  await expect(page.locator("mark.finding").first()).toBeVisible();
  await expect(page.getByRole("radio", { name: /Endocrinology/ })).toBeChecked();

  await page.getByPlaceholder("94110").fill("10016");
  await page.getByRole("button", { name: "Find doctors" }).click();
  await expect(page.getByRole("heading", { name: /Endocrinology near New York/ })).toBeVisible({ timeout: 90_000 });

  await page.getByText("Verified on Referral Desk").first().click(); // filter chip
  const row = page.getByRole("listitem").filter({ hasText: `Dr. ${DOCTOR.first} ${DOCTOR.name}` });
  await expect(row).toBeVisible();
  await row.getByRole("button").first().click();
  await row.getByRole("button", { name: "Request an appointment" }).click();

  const form = page.getByRole("form", { name: /Request an appointment/ });
  await form.getByLabel("Your name").fill("Pat E2E");
  await form.getByLabel("Phone").fill("555 010 0199");
  await form.getByLabel("Best times to reach you (optional)").fill("Weekday mornings");
  // Without consent nothing is sent.
  await form.getByRole("button", { name: "Send request" }).click();
  await expect(form.getByRole("alert")).toContainText("Tick the box");
  await form.getByRole("checkbox").check();
  await form.getByRole("button", { name: "Send request" }).click();

  await expect(row.getByText("Request sent")).toBeVisible();
  followUpUrl = (await row.getByRole("link", { name: "Open your follow-up page" }).getAttribute("href"))!;
  expect(followUpUrl).toMatch(/^\/referral\/[0-9a-f-]{36}$/);

  await page.goto(followUpUrl);
  await expect(page.getByText("Request sent — the office hasn't replied yet")).toBeVisible();
});

test("the doctor accepts the request from their private portal", async ({ page }) => {
  await page.goto(manageUrl);
  await expect(page.getByRole("heading", { name: `Dr. ${DOCTOR.first} ${DOCTOR.name}` })).toBeVisible();
  const card = page.getByRole("listitem").filter({ hasText: "Pat E2E" });
  await expect(card).toContainText("555 010 0199");
  await expect(card).toContainText("Type 2 diabetes mellitus");
  await card.getByLabel("Message to the patient (optional)").fill("We'll call you Tuesday to book.");
  await card.getByRole("button", { name: "Accept" }).click();
  await expect(page.getByText("Answered and closed (1)")).toBeVisible();
});

test("the patient sees the acceptance and the office's message", async ({ page }) => {
  await page.goto(followUpUrl);
  await expect(page.getByText("The office accepted your request")).toBeVisible();
  await expect(page.getByText("We'll call you Tuesday to book.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Record my outcome" })).toBeVisible();
});

test("a bad manage link is refused and pages send security headers", async ({ page, request }) => {
  await page.goto("/doctors/manage#not-a-real-token-at-all-xyz");
  await expect(page.getByRole("heading", { name: "Can't open your practice page" })).toBeVisible();
  const res = await request.get("/find");
  expect(res.headers()["content-security-policy"]).toContain("frame-ancestors 'none'");
  expect(res.headers()["x-frame-options"]).toBe("DENY");
});

