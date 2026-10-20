export interface PickupProofFile { path: string; name: string }

/** All proof photos for an item pickup, including legacy single item/receipt photos. */
export const getPickupProofs = (p: {
  proof_files?: unknown;
  pickup_proof_url?: string | null;
  pickup_proof_name?: string | null;
  receipt_url?: string | null;
  receipt_name?: string | null;
} | null | undefined): PickupProofFile[] => {
  if (!p) return [];
  const list = Array.isArray(p.proof_files)
    ? (p.proof_files as any[]).filter((f) => f && typeof f.path === "string").map((f) => ({ path: f.path, name: String(f.name ?? "") }))
    : [];
  if (list.length) return list;
  const legacy: PickupProofFile[] = [];
  if (p.pickup_proof_url) legacy.push({ path: p.pickup_proof_url, name: p.pickup_proof_name ?? "Item photo" });
  if (p.receipt_url) legacy.push({ path: p.receipt_url, name: p.receipt_name ?? "Receipt" });
  return legacy;
};
