import type { OrderStatus } from "@/types";
import { cn } from "@/lib/utils/cn";

const ORDER_STATUS_META: Record<
  OrderStatus,
  { dot: string; label: string }
> = {
  waiting_for_payment: {
    dot: "bg-yellow-500",
    label: "Waiting payment",
  },
  paid: { dot: "bg-green-500", label: "Paid" },
  processing: { dot: "bg-blue-500", label: "Processing" },
  shipped: { dot: "bg-purple-500", label: "Shipped" },
  completed: { dot: "bg-gray-400", label: "Completed" },
  cancelled: { dot: "bg-red-500", label: "Cancelled" },
};

type StockStatus = "in_stock" | "out_of_stock" | "pre_order";

const STOCK_META: Record<
  StockStatus,
  { dot: string; label: string }
> = {
  in_stock: { dot: "bg-green-500", label: "In stock" },
  out_of_stock: { dot: "bg-red-500", label: "Out of stock" },
  pre_order: { dot: "bg-yellow-500", label: "Pre-order" },
};

type StatusBadgeProps =
  | { variant: "order"; status: OrderStatus | string | null; className?: string }
  | {
      variant: "stock";
      status: StockStatus | string | null;
      className?: string;
    };

export function StatusBadge(props: StatusBadgeProps) {
  if (props.variant === "order") {
    const key = props.status as OrderStatus;
    const meta =
      key && key in ORDER_STATUS_META
        ? ORDER_STATUS_META[key]
        : { dot: "bg-gray-400", label: props.status ?? "—" };
    return (
      <span
        className={cn("inline-flex items-center gap-2 text-[13px]", props.className)}
      >
        <span className={cn("h-2 w-2 shrink-0 rounded-full", meta.dot)} />
        <span className="text-[#0a0a0a]">{meta.label}</span>
      </span>
    );
  }

  const key = props.status as StockStatus;
  const meta =
    key && key in STOCK_META
      ? STOCK_META[key]
      : { dot: "bg-gray-400", label: props.status ?? "—" };
  return (
    <span
      className={cn("inline-flex items-center gap-2 text-[13px]", props.className)}
    >
      <span className={cn("h-2 w-2 shrink-0 rounded-full", meta.dot)} />
      <span className="text-[#0a0a0a]">{meta.label}</span>
    </span>
  );
}
