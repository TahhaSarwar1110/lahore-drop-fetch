import { expect, test } from "bun:test";
import { createContactSignupSchema } from "../src/utils/signupValidation";

const schema = createContactSignupSchema(10, 10, "Pakistan");
const base = { fullName: "Test Customer", password: "test-password" };
test("registration accepts mobile only", () => {
  expect(schema.safeParse({ ...base, phone: "3001234567", email: "" }).success).toBe(true);
});
test("registration rejects email without mobile", () => {
  expect(schema.safeParse({ ...base, phone: "", email: "customer@example.com" }).success).toBe(false);
});
test("missing mobile reports it as required", () => {
  const result = schema.safeParse({ ...base, phone: "", email: "" });
  expect(result.success).toBe(false);
  expect(result.success ? "" : result.error.errors[0].message).toBe("Mobile number is required");
});
test("registration accepts both contacts", () => {
  expect(schema.safeParse({ ...base, phone: "3001234567", email: "customer@example.com" }).success).toBe(true);
});
test("registration rejects missing contacts", () => {
  expect(schema.safeParse({ ...base, phone: "", email: "" }).success).toBe(false);
});
test("optional contacts must be valid when supplied", () => {
  expect(schema.safeParse({ ...base, phone: "123", email: "customer@example.com" }).success).toBe(false);
  expect(schema.safeParse({ ...base, phone: "3001234567", email: "invalid" }).success).toBe(false);
});