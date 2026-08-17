export const fmtPaise = (paise: number | null | undefined): string => {
  if (paise === null || paise === undefined) return "—";
  const rupees = paise / 100;
  return `₹${rupees.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

export const fmtAmount = (
  amount: number | null | undefined,
  currency = "INR"
): string => {
  if (amount === null || amount === undefined) return "—";
  if (currency === "INR") {
    return `₹${amount.toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }
  return `${currency} ${amount.toFixed(2)}`;
};

export const fmtDate = (iso: string | null | undefined): string => {
  if (!iso) return "—";
  try {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return iso;
    return date.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
};

export const truncate = (value: string | null | undefined, max = 18): string => {
  if (!value) return "—";
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1)}…`;
};

const STATUS_LABELS: Record<string, string> = {
  PAID: "Received",
  CONFIRMED_TO_BAP: "Confirmed",
  PARTIALLY_REFUNDED: "Partially refunded",
  // settlement overall + leg states
  EXECUTING: "In progress",
  NEEDS_REVIEW: "Needs review",
  PARTIAL_STUCK: "Partly stuck",
  COMPLETE: "Complete",
  RESOLVED: "Resolved",
  QUEUED: "Queued",
  PROCESSING: "Processing",
  REJECTED: "Rejected",
  // DEG discom delivery status (ledger)
  PARTIALLYFULFILLED: "Partly delivered",
  REVERSED: "Reversed",
  SKIPPED: "Skipped",
};

/** Human label for backend status codes. Used by Badge + filter pills so the
 * UI never surfaces a raw enum like CONFIRMED_TO_BAP to an admin. */
export const statusLabel = (status: string | null | undefined): string => {
  if (!status) return "—";
  const upper = status.toUpperCase();
  if (STATUS_LABELS[upper]) return STATUS_LABELS[upper];
  return upper.charAt(0) + upper.slice(1).toLowerCase().replace(/_/g, " ");
};
