export type AttachmentBucket = "order-images" | "payment-proofs" | "pickup-proofs";

// Older records contain public or expired signed URLs; new records store only paths.
export function storagePath(value: string, bucket: AttachmentBucket): string {
  const input = value.trim();
  let path = input;
  if (/^https?:\/\//i.test(input)) {
    const url = new URL(input);
    const prefix = `/storage/v1/object/`;
    const suffix = url.pathname.split(prefix)[1];
    if (!suffix) throw new Error("Invalid attachment location");
    const parts = suffix.split("/");
    if (!["public", "sign", "authenticated"].includes(parts[0]) || parts[1] !== bucket) {
      throw new Error("Invalid attachment bucket");
    }
    path = decodeURIComponent(parts.slice(2).join("/"));
  }
  if (!path || path.startsWith("/") || path.split("/").some(p => !p || p === ".." || p === ".")) {
    throw new Error("Invalid attachment path");
  }
  return path;
}