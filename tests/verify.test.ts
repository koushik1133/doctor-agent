import { describe, expect, it } from "vitest";
import { isValidNpi, firstNameMatches, lastNameMatches, licenseMatches } from "@/lib/verification/verify";

describe("NPI check digit", () => {
  it("accepts real NPIs", () => {
    // Published CMS example + real registry entries
    for (const n of ["1234567893", "1528157773", "1003809641"]) expect(isValidNpi(n)).toBe(true);
  });
  it("rejects typos and junk", () => {
    for (const n of ["1234567890", "1528157774", "123456789", "abcdefghij", ""]) expect(isValidNpi(n)).toBe(false);
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
    expect(licenseMatches("g-15155", "G15155")).toBe(true);
    expect(licenseMatches("15155", "G15155")).toBe(true);
    expect(licenseMatches("A0012345", "12345")).toBe(true);
    expect(licenseMatches("15156", "G15155")).toBe(false);
  });
});
