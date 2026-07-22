import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// "Shopper Assigned" is intentionally omitted — it is set automatically when a
// rider is assigned via the Assign Order flow and must not be selectable manually.
const ORDER_STATUSES = [
  "Pending",
  "Order Received",
  "Order Confirmed",
  "Purchasing",
  "In Delivery",
  "Delivered",
  "Cancelled",
];

interface OrderStatusSelectProps {
  currentStatus: string;
  onStatusChange: (status: string) => void;
  disabled?: boolean;
}

export const OrderStatusSelect = ({ currentStatus, onStatusChange, disabled }: OrderStatusSelectProps) => {
  // Always render the current status even if it isn't in the manual list,
  // so system-set values like "Shopper Assigned" remain visible.
  const options = ORDER_STATUSES.includes(currentStatus)
    ? ORDER_STATUSES
    : [currentStatus, ...ORDER_STATUSES];

  return (
    <Select value={currentStatus} onValueChange={onStatusChange} disabled={disabled}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Select status" />
      </SelectTrigger>
      <SelectContent>
        {options.map((status) => (
          <SelectItem
            key={status}
            value={status}
            disabled={status === "Shopper Assigned" && status !== currentStatus}
          >
            {status}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
