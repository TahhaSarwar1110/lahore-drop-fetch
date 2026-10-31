import { describe, expect, test } from "bun:test";
import { advertisingAllowed, parseTrace, requiresConsent } from "../src/lib/advertisingConsent";

describe("regional advertising privacy", () => {
  test("consent regions and unknown regions cannot track before acceptance", () => {
    for (const country of ["GB", "DE", "FR", "NO", null, "XX", "T1"]) expect(advertisingAllowed(country, undefined)).toBe(false);
    expect(advertisingAllowed("GB", true)).toBe(true);
  });
  test("ordinary tracking outside consent regions still honors refusal and browser opt-out", () => {
    expect(requiresConsent("PK")).toBe(false);
    expect(advertisingAllowed("PK", undefined)).toBe(true);
    expect(advertisingAllowed("PK", false)).toBe(false);
    expect(advertisingAllowed("PK", true, true)).toBe(false);
  });
  test("trace must identify this host and a resolved country", () => {
    expect(parseTrace("h=tabedaar.com\nloc=PK", "tabedaar.com")).toBe("PK");
    expect(parseTrace("h=proxy.test\nloc=PK", "tabedaar.com")).toBeNull();
    expect(parseTrace("h=tabedaar.com\nloc=T1", "tabedaar.com")).toBeNull();
    expect(parseTrace("h=tabedaar.com\nloc=XX", "tabedaar.com")).toBeNull();
  });
});