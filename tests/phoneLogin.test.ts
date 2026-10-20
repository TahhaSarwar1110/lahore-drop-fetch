import { describe, expect, test } from "bun:test";
import { normalizeLoginPhone, phoneLoginCandidates } from "../supabase/functions/_shared/phone-login";

describe("existing account mobile login", () => {
  test("matches the reported Pakistani mobile number across formats", () => {
    for (const phone of ["03098383239", "3098383239", "+923098383239", "00923098383239"]) {
      expect(normalizeLoginPhone(phone)).toBe("923098383239");
      expect(phoneLoginCandidates(phone)).toContain("+923098383239");
      expect(phoneLoginCandidates(phone)).toContain("03098383239");
    }
  });
  test("keeps international phone numbers intact", () => {
    expect(phoneLoginCandidates("+44 7911 123456")).toEqual(["+447911123456", "447911123456"]);
  });
});