/**
 * Read-side helpers for payout_requests rows.
 *
 * The table's real columns are `amount`, `payment_method`, `payment_details`
 * (JSON), `reference_number`, `processed_at` and a status of
 * pending | approved | paid | rejected | cancelled. Older screens read
 * `requested_amount`, `payout_method`, `bank_details`, `transaction_reference`,
 * `processed_date` and a 'processed' status that never existed as columns, so
 * they showed nothing or crashed (BE-9). These helpers map one onto the other
 * in one place.
 */

/** Numeric amount of a payout row; 0 when absent or not a number. */
export function payoutAmount(p) {
  const n = Number(p?.amount ?? p?.requested_amount ?? 0);
  return Number.isFinite(n) ? n : 0;
}

/** True for a settled payout ('processed' only appears in rows written by the old UI). */
export const isPaidStatus = (status) => status === 'paid' || status === 'processed';

/** Sum of payout amounts whose status passes `predicate`. */
export function sumPayouts(payouts, predicate) {
  return (payouts || []).filter((p) => predicate(p.status)).reduce((sum, p) => sum + payoutAmount(p), 0);
}

/** A row with the legacy field names filled from the real columns. */
export function normalizePayout(p) {
  if (!p) return p;
  const details = p.payment_details && typeof p.payment_details === 'object' ? p.payment_details : {};
  return {
    ...p,
    requested_amount: payoutAmount(p),
    payout_method: p.payment_method ?? p.payout_method,
    bank_details: details.bank_details ?? p.bank_details,
    upi_id: details.upi_id ?? p.upi_id,
    paypal_email: details.paypal_email ?? p.paypal_email,
    transaction_reference: p.reference_number ?? p.transaction_reference,
    processed_date: p.processed_at ?? p.processed_date,
    created_date: p.created_date ?? p.created_at,
    status: p.status === 'processed' ? 'paid' : p.status,
  };
}

/**
 * Gross / platform fee / advisor net for a commission_tracking row.
 * Server-created rows keep the net in `amount` and the split in `metadata`;
 * rows written by the old client used gross_amount / platform_fee / advisor_payout.
 */
export function commissionParts(c) {
  const meta = c?.metadata && typeof c.metadata === 'object' ? c.metadata : {};
  const num = (v) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
  return {
    gross: num(meta.gross_amount ?? c?.gross_amount),
    fee: num(meta.platform_fee ?? c?.platform_fee),
    net: num(c?.amount ?? c?.advisor_payout),
  };
}
