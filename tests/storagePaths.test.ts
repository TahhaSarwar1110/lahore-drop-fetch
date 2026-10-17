import { describe, expect, test } from "bun:test";
import { storagePath } from "../src/utils/storagePaths";

describe("private attachment compatibility", () => {
  test("keeps new paths stable", () => expect(storagePath("customer/order/proof.jpg", "payment-proofs")).toBe("customer/order/proof.jpg"));
  test("repairs old public payment links", () => expect(storagePath("https://example.test/storage/v1/object/public/payment-proofs/customer/order/proof.jpg", "payment-proofs")).toBe("customer/order/proof.jpg"));
  test("removes expired signed tokens instead of persisting them", () => expect(storagePath("https://example.test/storage/v1/object/sign/order-images/customer/image.jpg?token=expired", "order-images")).toBe("customer/image.jpg"));
  test("decodes older filenames", () => expect(storagePath("https://example.test/storage/v1/object/public/pickup-proofs/rider/order/photo%20one.jpg", "pickup-proofs")).toBe("rider/order/photo one.jpg"));
  test("rejects other buckets", () => expect(() => storagePath("https://example.test/storage/v1/object/public/user-documents/private.jpg", "order-images")).toThrow());
  test("rejects traversal", () => expect(() => storagePath("customer/../private.jpg", "order-images")).toThrow());
});