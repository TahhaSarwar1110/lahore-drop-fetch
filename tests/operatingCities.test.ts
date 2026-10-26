import { describe, expect, test } from "bun:test";
import { isAvailableOriginCity, operatingCityNameSchema } from "../src/utils/operatingCities";

describe("admin-managed operating cities", () => {
  const cities = [{ name: "Lahore", is_active: true }, { name: "Karachi", is_active: false }];
  test("only active cities in the admin list can be selected as an origin", () => {
    expect(isAvailableOriginCity("Lahore", cities)).toBe(true);
    expect(isAvailableOriginCity("Karachi", cities)).toBe(false);
    expect(isAvailableOriginCity("Islamabad", cities)).toBe(false);
    expect(isAvailableOriginCity("", cities)).toBe(false);
  });
  test("city names are trimmed and empty names are rejected", () => {
    expect(operatingCityNameSchema.parse(" Lahore ")).toBe("Lahore");
    expect(operatingCityNameSchema.safeParse(" ").success).toBe(false);
  });
});