import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, Eye, FileText, Loader2 } from "lucide-react";
import apiClient from "@/lib/apiClient";
import { format } from "date-fns";
import { toast } from "sonner";

export default function UserSubscriptionHistory() {
    const [invoices, setInvoices] = useState([]);
    const [downloadingId, setDownloadingId] = useState(null);
    const [viewingId, setViewingId] = useState(null);

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const { data } = await apiClient.get('/subscriptions/my-invoices');
                setInvoices(data);
            } catch (error) {
                console.error("Failed to load invoices", error);
            }
        };
        fetchHistory();
    }, []);

    /**
     * The PDF is fetched as a blob through the authenticated client, so the
     * bearer token never lands in a URL. A failure used to be logged to the
     * console and nowhere else, so a download that did not happen looked
     * identical to one that did; the object URL was also never revoked and the
     * anchor was left in the DOM on every click.
     */
    const handleDownload = async (invoiceId, invoiceNumber) => {
        setDownloadingId(invoiceId);
        let objectUrl = null;
        try {
            const response = await apiClient.get(`/subscriptions/invoice/${invoiceId}/download`, {
                responseType: 'blob'
            });
            objectUrl = window.URL.createObjectURL(
                new Blob([response.data], { type: 'application/pdf' })
            );
            const link = document.createElement('a');
            link.href = objectUrl;
            link.setAttribute('download', `${invoiceNumber || 'invoice'}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            toast.success(`Downloaded ${invoiceNumber}`);
        } catch (error) {
            console.error("Download failed", error);
            toast.error(
                error?.response?.status === 404
                    ? "That invoice is no longer available."
                    : "Could not download the invoice. Please try again."
            );
        } finally {
            if (objectUrl) window.URL.revokeObjectURL(objectUrl);
            setDownloadingId(null);
        }
    };

    const handleView = async (invoiceId, invoiceNumber) => {
        setViewingId(invoiceId);
        try {
            const response = await apiClient.get(`/subscriptions/invoice/${invoiceId}/download`, {
                responseType: 'blob'
            });
            const objectUrl = window.URL.createObjectURL(
                new Blob([response.data], { type: 'application/pdf' })
            );
            const win = window.open(objectUrl, '_blank', 'noopener,noreferrer');
            if (!win) {
                // Pop-up blocked: fall back to downloading rather than failing silently.
                const link = document.createElement('a');
                link.href = objectUrl;
                link.setAttribute('download', `${invoiceNumber || 'invoice'}.pdf`);
                document.body.appendChild(link);
                link.click();
                link.remove();
                toast.info('Pop-up blocked, so the invoice was downloaded instead.');
            }
            // The new tab still needs the URL, so revoke it after it has loaded
            // rather than immediately.
            setTimeout(() => window.URL.revokeObjectURL(objectUrl), 60000);
        } catch (error) {
            console.error("View failed", error);
            toast.error(
                error?.response?.status === 404
                    ? "That invoice is no longer available."
                    : "Could not open the invoice. Please try again."
            );
        } finally {
            setViewingId(null);
        }
    };

    if (invoices.length === 0) return null;

    return (
        <Card className="mt-8">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-muted-foreground" />
                    Billing History
                </CardTitle>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Invoice</TableHead>
                            <TableHead className="text-right">Action</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {invoices.map((inv) => (
                            <TableRow key={inv.id}>
                                <TableCell>{format(new Date(inv.issued_date || inv.created_at), 'MMM dd, yyyy')}</TableCell>
                                <TableCell>₹{inv.total_amount}</TableCell>
                                <TableCell>
                                    <Badge variant={inv.status === 'paid' ? 'default' : 'secondary'} className={inv.status === 'paid' ? 'bg-buy-muted text-buy-muted-foreground hover:bg-buy-muted' : ''}>
                                        {inv.status}
                                    </Badge>
                                </TableCell>
                                <TableCell>{inv.invoice_number}</TableCell>
                                <TableCell className="text-right">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleView(inv.id, inv.invoice_number)}
                                        disabled={viewingId === inv.id}
                                        aria-label={`View invoice ${inv.invoice_number}`}
                                    >
                                        {viewingId === inv.id ? (
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin motion-reduce:animate-none" />
                                        ) : (
                                            <Eye className="w-4 h-4 mr-2" />
                                        )}
                                        View
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleDownload(inv.id, inv.invoice_number)}
                                        disabled={downloadingId === inv.id}
                                        aria-label={`Download invoice ${inv.invoice_number}`}
                                    >
                                        {downloadingId === inv.id ? (
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin motion-reduce:animate-none" />
                                        ) : (
                                            <Download className="w-4 h-4 mr-2" />
                                        )}
                                        PDF
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
