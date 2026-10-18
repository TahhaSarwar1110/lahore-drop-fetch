import { test, expect } from "bun:test";
import { readFileSync } from "node:fs";

test("Android release supports Play automatic protection with minimum SDK 24", () => {
  const variables = readFileSync(new URL("../android/variables.gradle", import.meta.url), "utf8");
  const app = readFileSync(new URL("../android/app/build.gradle", import.meta.url), "utf8");
  expect(Number(variables.match(/minSdkVersion\s*=\s*(\d+)/)?.[1])).toBe(24);
  expect(app).toMatch(/minSdkVersion\s+rootProject\.ext\.minSdkVersion/);
});