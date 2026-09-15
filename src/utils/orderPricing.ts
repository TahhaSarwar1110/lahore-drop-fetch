// Shared order pricing helpers.
// Price fields entered by customers are the price of a SINGLE item;
// the line total is unit price * quantity (quantity defaults to 1).

export const getItemQuantity = (itemData: Record<string, unknown> | null | undefined): number => {
  const qtyEntry = Object.entries(itemData || {}).find(([key]) => {
    const k = key.toLowerCase();
    return k.includes("quantity") || k === "qty";
  });
  const qty = parseInt(String(qtyEntry?.[1] ?? "").replace(/[^0-9]/g, ""), 10);
  return Number.isFinite(qty) && qty > 0 ? qty : 1;
};

export const getItemUnitPrice = (itemData: Record<string, unknown> | null | undefined): number => {
  const entries = Object.entries(itemData || {});
  const priceEntry = entries.find(([key]) => key.toLowerCase().includes("price"));
  const raw = priceEntry ? String(priceEntry[1]) : String((itemData as any)?.expectedPrice ?? "");
  const price = parseFloat(raw.replace(/[^0-9.]/g, ""));
  return Number.isFinite(price) && price > 0 ? price : 0;
};

export const getItemTotalPrice = (itemData: Record<string, unknown> | null | undefined): number => {
  return getItemUnitPrice(itemData) * getItemQuantity(itemData);
};
