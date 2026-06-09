import { STATUS_LABELS, normalizeContractStatus } from "@/lib/contract-utils";
import { cn } from "@/lib/utils";

export function ContractStatusBadge({ status }: { status: string }) {
  const normalized = normalizeContractStatus(status);
  const meta = STATUS_LABELS[normalized] || {
    label: normalized,
    className: "bg-surface-container-high text-on-surface-variant",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-[12px] font-medium",
        meta.className
      )}
    >
      {meta.label}
    </span>
  );
}
