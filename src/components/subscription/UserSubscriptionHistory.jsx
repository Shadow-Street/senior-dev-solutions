import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, FileText } from "lucide-react";
import apiClient from "@/lib/apiClient";
import { format } from "date-fns";

export default function UserSubscriptionHistory() {
    const [invoices, setInvoices] = useState([]);

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

    const handleDownload = async (invoiceId, invoiceNumber) => {
        try {
            const response = await apiClient.get(`/subscriptions/invoice/${invoiceId}/download`, {
                responseType: 'blob'
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `${invoiceNumber}.pdf`);
            document.body.appendChild(link);
            link.click();
        } catch (error) {
            console.error("Download failed", error);
        }
    };

    if (invoices.length === 0) return null;

    return (
        <Card className="mt-8">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-gray-500" />
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
                                    <Badge variant={inv.status === 'paid' ? 'default' : 'secondary'} className={inv.status === 'paid' ? 'bg-green-100 text-green-700 hover:bg-green-200' : ''}>
                                        {inv.status}
                                    </Badge>
                                </TableCell>
                                <TableCell>{inv.invoice_number}</TableCell>
                                <TableCell className="text-right">
                                    <Button variant="ghost" size="sm" onClick={() => handleDownload(inv.id, inv.invoice_number)}>
                                        <Download className="w-4 h-4 mr-2" />
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
