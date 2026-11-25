import { describe, expect, it } from "vitest";
import { isValidNpi, firstNameMatches, lastNameMatches, licenseMatches } from "@/lib/verification/verify";

describe("NPI check digit", () => {
  it("accepts numbers with a valid check digit", () => {
    // CMS's published example, plus synthetic numbers: real NPIs start with 1 or 2,
    // so ones starting with 9 can't belong to anyone.
    for (const n of ["1234567893", "9000000015", "9123456789"]) expect(isValidNpi(n)).toBe(true);
  });
  it("rejects typos and junk", () => {
    for (const n of ["1234567890", "9000000016", "123456789", "abcdefghij", ""]) expect(isValidNpi(n)).toBe(false);
  });
});

describe("name and license matching", () => {
  it("handles nicknames, case and accents", () => {
    expect(firstNameMatches("Bob", "ROBERT")).toBe(true);
    expect(firstNameMatches("josé", "JOSE")).toBe(true);
    expect(firstNameMatches("Alice", "ROBERT")).toBe(false);
  });
  it("handles compound surnames", () => {
    expect(lastNameMatches("Garcia", "GARCIA-LOPEZ")).toBe(true);
    expect(lastNameMatches("Lee", "LEWIS")).toBe(false);
  });
  it("normalizes license formatting", () => {
    expect(licenseMatches("test-12345", "TEST12345")).toBe(true);
    expect(licenseMatches("12345", "TEST12345")).toBe(true);
    expect(licenseMatches("A0012345", "12345")).toBe(true);
    expect(licenseMatches("12346", "TEST12345")).toBe(false);
  });
});
