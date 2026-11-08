import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertCircle,
  ArrowRight,
  CalendarDays,
  CreditCard,
  Download,
  Eye,
  FileText,
  Loader2,
  RefreshCw,
  Tag,
} from "lucide-react";
import { toast } from "sonner";
import apiClient from "@/lib/apiClient";
import { subscriptionApi } from "@/lib/subscriptionApi";
import { formatINR, formatDate, daysUntil } from "@/lib/format";
import { createPageUrl } from "@/utils";

const money = (amount, currency = "INR") => formatINR(amount, { currency, alwaysDecimals: true });

const GATEWAY_LABEL = { razorpay: "Razorpay", coupon: "Promo code (no payment)" };
const gatewayLabel = (g) => GATEWAY_LABEL[String(g || "").toLowerCase()] || (g ? String(g) : "—");

const STATUS_TONE = {
  paid: "bg-buy-muted text-buy-muted-foreground border-buy/30",
  pending: "bg-hold-muted text-hold-muted-foreground border-hold/30",
  void: "bg-surface-2 text-subtle border-border",
  refunded: "bg-sell-muted text-sell-muted-foreground border-sell/30",
};

/**
 * Billing history and invoice downloads for the signed-in user.
 *
 * Reads `/subscriptions/my-invoices`, which is scoped to the caller server-side.
 * Downloads go through `/subscriptions/invoice/:id/download`, where ownership is
 * enforced in the service before any file is touched — the browser never
 * constructs a file path.
 */
export default function ProfileBillingSection() {
  const [invoices, setInvoices] = useState([]);
  const [status, setStatus] = useState("loading"); // loading | ready | error (invoices)
  const [error, setError] = useState(null);
  const [billing, setBilling] = useState(null);
  const [billingStatus, setBillingStatus] = useState("loading"); // loading | ready | error
  const [downloadingId, setDownloadingId] = useState(null);
  const [viewingId, setViewingId] = useState(null);

  const loadBilling = useCallback(async () => {
    setBillingStatus("loading");
    try {
      setBilling(await subscriptionApi.billing());
      setBillingStatus("ready");
    } catch {
      setBillingStatus("error");
    }
  }, []);

  const loadInvoices = useCallback(async () => {
    setStatus("loading");
    setError(null);
    try {
      const { data } = await apiClient.get("/subscriptions/my-invoices");
      setInvoices(Array.isArray(data) ? data : []);
      setStatus("ready");
    } catch (e) {
      setError(
        e?.response?.data?.error || "Billing history could not be loaded. Please try again."
      );
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    loadBilling();
    loadInvoices();
  }, [loadBilling, loadInvoices]);

  /**
   * The PDF is fetched as a blob through the authenticated client, so the
   * bearer token is never placed in a URL (which would leak it into history
   * and server logs). The temporary object URL is always revoked.
   */
  const handleDownload = useCallback(async (invoice) => {
    setDownloadingId(invoice.id);
    let objectUrl = null;
    try {
      const res = await apiClient.get(`/subscriptions/invoice/${invoice.id}/download`, {
        responseType: "blob",
      });
      objectUrl = window.URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = `${invoice.invoice_number || "invoice"}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success(`Downloaded ${invoice.invoice_number}`);
    } catch (e) {
      const message =
        e?.response?.status === 404
          ? "That invoice is no longer available."
          : "Could not download the invoice. Please try again.";
      toast.error(message);
    } finally {
      if (objectUrl) window.URL.revokeObjectURL(objectUrl);
      setDownloadingId(null);
    }
  }, []);

  /**
   * Opens the invoice inline instead of saving it. The blob is built locally
   * with an explicit application/pdf type, so the browser renders it even
   * though the endpoint sends Content-Disposition: attachment.
   */
  const handleView = useCallback(async (invoice) => {
    setViewingId(invoice.id);
    try {
      const res = await apiClient.get(`/subscriptions/invoice/${invoice.id}/download`, {
        responseType: "blob",
      });
      const objectUrl = window.URL.createObjectURL(
        new Blob([res.data], { type: "application/pdf" })
      );
      const win = window.open(objectUrl, "_blank", "noopener,noreferrer");
      if (!win) {
        const link = document.createElement("a");
        link.href = objectUrl;
        link.download = `${invoice.invoice_number || "invoice"}.pdf`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        toast.info("Pop-up blocked, so the invoice was downloaded instead.");
      }
      // The new tab still needs the URL, so revoke it later rather than now.
      setTimeout(() => window.URL.revokeObjectURL(objectUrl), 60000);
    } catch (e) {
      toast.error(
        e?.response?.status === 404
          ? "That invoice is no longer available."
          : "Could not open the invoice. Please try again."
      );
    } finally {
      setViewingId(null);
    }
  }, []);

  const sub = billing?.subscription;
  const last = billing?.last_payment;
  const isFree = Boolean(sub?.is_free);
  const isActive = String(sub?.status || "").toLowerCase() === "active";
  const remaining = daysUntil(sub?.end_date);
  const endLabel = sub?.cancel_at_period_end ? "Ends" : sub?.renews ? "Renews" : "Expires";

  return (
    <div className="space-y-5">
      {/* ---- Current plan ---- */}
      <Card className="border border-border bg-card shadow-sm">
        <CardContent className="p-5">
          {billingStatus === "loading" && (
            <div className="space-y-3" aria-busy="true" aria-label="Loading plan details">
              <div className="h-6 w-40 animate-pulse rounded bg-surface-2" />
              <div className="h-16 animate-pulse rounded-lg bg-surface-2" />
            </div>
          )}

          {billingStatus === "error" && (
            <div className="flex flex-col items-start gap-3 rounded-lg bg-sell-muted p-4">
              <p className="flex items-start gap-2 text-sm text-sell-muted-foreground">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                Your plan details could not be loaded.
              </p>
              <Button size="sm" onClick={loadBilling} className="bg-primary text-primary-foreground">Try again</Button>
            </div>
          )}

          {billingStatus === "ready" && sub && (
            <>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Current plan</p>
                  {/* <div>, not <p>: Badge renders a <div> and cannot nest in a <p>. */}
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xl font-bold capitalize text-foreground">
                    {sub.plan_name}
                    <Badge
                      variant="outline"
                      className={isActive ? "border-buy/30 bg-buy-muted text-buy-muted-foreground" : "border-border bg-surface-2 text-subtle"}
                    >
                      {sub.status || "inactive"}
                    </Badge>
                  </div>
                  {isFree ? (
                    <p className="mt-1 text-sm text-subtle">Included with your account. It never expires.</p>
                  ) : (
                    <p className="mt-1 flex items-center gap-1.5 text-sm text-subtle">
                      <CalendarDays className="h-4 w-4" />
                      {endLabel} {formatDate(sub.end_date)}
                      {remaining !== null && remaining >= 0 && <span className="text-muted-foreground">({remaining} day{remaining === 1 ? "" : "s"} left)</span>}
                    </p>
                  )}
                </div>

                <Link to={createPageUrl("Subscription")}>
                  <Button className="group bg-primary text-primary-foreground hover:bg-primary/90">
                    {isFree ? "Upgrade plan" : "Change plan"}
                    <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5 motion-reduce:transform-none" />
                  </Button>
                </Link>
              </div>

              <dl className="mt-5 grid gap-4 border-t border-divider pt-4 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">Billing cycle</dt>
                  <dd className="mt-0.5 text-sm font-medium capitalize text-foreground">{isFree ? "—" : sub.billing_cycle || "—"}</dd>
                </div>
                <div>
                  <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">Started</dt>
                  <dd className="mt-0.5 text-sm font-medium text-foreground">{formatDate(sub.start_date)}</dd>
                </div>
                <div>
                  <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">{isFree ? "Price" : "Amount paid"}</dt>
                  <dd className="mt-0.5 text-sm font-medium tabular-nums text-foreground">
                    {isFree ? "Free" : last ? money(last.amount) : "—"}
                    {last && last.discount_applied > 0 && <span className="ml-1.5 text-xs font-normal text-buy-muted-foreground">({money(last.discount_applied)} off)</span>}
                  </dd>
                </div>
                <div>
                  <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">Plan price</dt>
                  <dd className="mt-0.5 text-sm font-medium tabular-nums text-foreground">
                    {isFree ? "₹0" : `${formatINR(sub.list_price_monthly)}/mo`}
                    {!isFree && sub.list_price_annually ? <span className="text-xs font-normal text-muted-foreground"> · {formatINR(sub.list_price_annually)}/yr</span> : null}
                  </dd>
                </div>
              </dl>
            </>
          )}
        </CardContent>
      </Card>

      {/* ---- Payment information ---- */}
      <Card className="border border-border bg-card shadow-sm">
        <CardContent className="p-5">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-foreground">
            <CreditCard className="h-4 w-4 text-primary" />
            Payment information
          </h3>
          {billingStatus === "ready" && !last && (
            <p className="rounded-lg border border-dashed border-border px-4 py-5 text-center text-sm text-subtle">
              {isFree ? "You are on the Free plan, so there are no payments." : "No payment is on record for this plan yet."}
            </p>
          )}
          {billingStatus === "ready" && last && (
            <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">Last payment</dt>
                <dd className="mt-0.5 text-sm font-medium tabular-nums text-foreground">{money(last.amount)}</dd>
                <dd className="text-xs text-muted-foreground">{formatDate(last.date)}</dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">Paid with</dt>
                <dd className="mt-0.5 text-sm font-medium text-foreground">{gatewayLabel(last.gateway)}</dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">Reference</dt>
                <dd className="mt-0.5 font-mono text-sm text-foreground">{last.reference || "—"}</dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">Promo code</dt>
                <dd className="mt-0.5 flex items-center gap-1.5 text-sm font-medium text-foreground">
                  {last.coupon_used ? (<><Tag className="h-3.5 w-3.5 text-primary" />{last.coupon_used}</>) : "—"}
                </dd>
              </div>
            </dl>
          )}
          {billingStatus === "loading" && <div className="h-12 animate-pulse rounded-lg bg-surface-2" aria-busy="true" />}
          {billingStatus === "error" && <p className="text-sm text-muted-foreground">Payment details are unavailable right now.</p>}
        </CardContent>
      </Card>

      {/* ---- Billing history ---- */}
      <Card className="border border-border bg-card shadow-sm">
        <CardContent className="p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <FileText className="h-4 w-4 text-primary" />
              Billing history
            </h3>
            <Button
              variant="outline"
              size="sm"
              onClick={loadInvoices}
              disabled={status === "loading"}
              className="h-8"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${status === "loading" ? "animate-spin" : ""}`} />
              <span className="ml-1.5 hidden sm:inline">Refresh</span>
            </Button>
          </div>

          {status === "loading" && (
            <div className="space-y-2" aria-busy="true" aria-label="Loading billing history">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-12 animate-pulse rounded-lg bg-surface-2" />
              ))}
            </div>
          )}

          {status === "error" && (
            <div className="flex flex-col items-start gap-3 rounded-lg bg-sell-muted p-4">
              <p className="flex items-start gap-2 text-sm text-sell-muted-foreground">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                {error}
              </p>
              <Button size="sm" onClick={loadInvoices} className="bg-primary text-primary-foreground">
                Try again
              </Button>
            </div>
          )}

          {status === "ready" && invoices.length === 0 && (
            <div className="rounded-lg border border-dashed border-border px-4 py-8 text-center">
              <FileText className="mx-auto mb-2 h-6 w-6 text-muted-foreground" />
              <p className="text-sm font-medium text-foreground">No invoices yet</p>
              <p className="mt-0.5 text-xs text-subtle">
                Invoices appear here once you subscribe to a paid plan or redeem a promo code.
              </p>
            </div>
          )}

          {status === "ready" && invoices.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[34rem] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-divider text-[11px] uppercase tracking-wide text-muted-foreground">
                    <th scope="col" className="pb-2 text-left font-semibold">Invoice</th>
                    <th scope="col" className="pb-2 text-left font-semibold">Date</th>
                    <th scope="col" className="pb-2 text-right font-semibold">Amount</th>
                    <th scope="col" className="pb-2 text-center font-semibold">Status</th>
                    <th scope="col" className="pb-2 text-right font-semibold">PDF</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv) => {
                    const tone = STATUS_TONE[String(inv.status || "").toLowerCase()] || STATUS_TONE.void;
                    const busy = downloadingId === inv.id;
                    const viewing = viewingId === inv.id;
                    return (
                      <tr
                        key={inv.id}
                        className="border-b border-divider/60 transition-colors last:border-0 hover:bg-surface-2"
                      >
                        <td className="py-2.5 pr-2">
                          <span className="font-medium text-foreground">{inv.invoice_number}</span>
                          {inv.plan_name && (
                            <span className="block text-[11px] capitalize text-muted-foreground">
                              {inv.plan_name}
                            </span>
                          )}
                        </td>
                        <td className="px-2 py-2.5 text-subtle">
                          {formatDate(inv.issued_date || inv.created_date)}
                        </td>
                        <td className="px-2 py-2.5 text-right font-medium tabular-nums text-foreground">
                          {money(inv.total_amount ?? inv.amount, inv.currency)}
                        </td>
                        <td className="px-2 py-2.5 text-center">
                          <Badge variant="outline" className={`capitalize ${tone}`}>
                            {inv.status || "—"}
                          </Badge>
                        </td>
                        <td className="py-2.5 pl-2 text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            className="mr-2 h-8"
                            disabled={viewing}
                            onClick={() => handleView(inv)}
                            aria-label={`View invoice ${inv.invoice_number}`}
                          >
                            {viewing ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin motion-reduce:animate-none" />
                            ) : (
                              <Eye className="h-3.5 w-3.5" />
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8"
                            disabled={busy}
                            onClick={() => handleDownload(inv)}
                            aria-label={`Download invoice ${inv.invoice_number}`}
                          >
                            {busy ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Download className="h-3.5 w-3.5" />
                            )}
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
