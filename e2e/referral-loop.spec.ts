import { test, expect, type Page } from "@playwright/test";
import path from "node:path";

// The full marketplace loop with real public data:
//   1. A real, registered endocrinologist applies and is verified against NPPES.
//   2. A patient uploads a lab report, gets routed to endocrinology, searches a
//      real NYC ZIP, finds that doctor and sends an appointment request.
//   3. The doctor opens their private portal and accepts with a message.
//   4. The patient's follow-up page shows the acceptance.
// NPI 1619110228 is a public NPPES record; contact details are placeholders.

const DOCTOR = { npi: "1619110228", license: "268704", zip: "10025", name: "Adimoolam" };

test.describe.configure({ mode: "serial" });

let manageUrl = "";
let followUpUrl = "";

test("a doctor applies with their NPI and is verified against NPPES", async ({ page }) => {
  await page.goto("/doctors/join");
  await page.getByPlaceholder("10 digits").fill(DOCTOR.npi);
  await page.getByRole("button", { name: "Fill from registry" }).click();
  await expect(page.getByText(/Deena Adimoolam, MD/)).toBeVisible();
  await expect(page.getByLabel("Last name")).toHaveValue(DOCTOR.name);

  await page.getByLabel("Work email").fill("e2e-doctor@example.com");
  await page.getByLabel("License number").fill(DOCTOR.license);
  await page.getByLabel("New patients per week").fill("5");
  await page.getByRole("button", { name: "Apply and verify" }).click();

  await expect(page.getByRole("heading", { name: "You're verified" })).toBeVisible({ timeout: 60_000 });
  await expect(page.getByText("State license matches NPPES")).toBeVisible();
  manageUrl = await page.getByLabel("Private practice link").inputValue();
  expect(manageUrl).toMatch(/\/doctors\/manage#[\w-]{20,}$/);
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
  const row = page.getByRole("listitem").filter({ hasText: `Dr. Deena ${DOCTOR.name}` });
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
  await expect(page.getByRole("heading", { name: /Dr\. Deena Adimoolam/ })).toBeVisible();
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

