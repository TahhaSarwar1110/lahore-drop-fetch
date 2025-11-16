import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const ORDER_STATUSES = [
  "Pending",
  "Order Received",
  "Shopper Assigned",
  "Purchasing",
  "In Delivery",
  "Delivered",
  "Cancelled"
];

interface OrderStatusSelectProps {
  currentStatus: string;
  onStatusChange: (status: string) => void;
  disabled?: boolean;
}

export const OrderStatusSelect = ({ currentStatus, onStatusChange, disabled }: OrderStatusSelectProps) => {
  return (
    <Select value={currentStatus} onValueChange={onStatusChange} disabled={disabled}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Select status" />
      </SelectTrigger>
      <SelectContent>
        {ORDER_STATUSES.map((status) => (
          <SelectItem key={status} value={status}>
            {status}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
