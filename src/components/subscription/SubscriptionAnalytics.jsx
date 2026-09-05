import React, { useState, useEffect } from 'react';
import { useAuth } from "@/components/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
    FileText,
    Download,
    Calendar,
    CreditCard,
    TrendingUp,
    AlertCircle,
    CheckCircle2
} from "lucide-react";
import { toast } from "sonner";
import apiClient from "@/lib/apiClient";

export default function SubscriptionAnalytics() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [analytics, setAnalytics] = useState(null);
    const [invoices, setInvoices] = useState([]);
    const [autopayStatus, setAutopayStatus] = useState(null);

    useEffect(() => {
        if (user) {
            fetchAnalytics();
            fetchInvoices();
            fetchAutopayStatus();
        }
    }, [user]);

    const fetchAnalytics = async () => {
        try {
            const { data } = await apiClient.get('/subscriptions/my-analytics');
            setAnalytics(data);
        } catch (error) {
            console.error('Error fetching analytics:', error);
            toast.error('Failed to load subscription analytics');
        }
    };

    const fetchInvoices = async () => {
        try {
            const { data } = await apiClient.get('/subscriptions/my-invoices');
            setInvoices(data);
        } catch (error) {
            console.error('Error fetching invoices:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchAutopayStatus = async () => {
        try {
            const { data } = await apiClient.get('/subscriptions/autopay/status');
            setAutopayStatus(data);
        } catch (error) {
            console.error('Error fetching autopay status:', error);
        }
    };

    const handleDownloadInvoice = async (invoiceId, invoiceNumber) => {
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
            link.remove();

            toast.success('Invoice downloaded successfully');
        } catch (error) {
            console.error('Error downloading invoice:', error);
            toast.error('Failed to download invoice');
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    const currentSubscription = analytics?.currentSubscription;
    const daysRemaining = currentSubscription ? Math.ceil(
        (new Date(currentSubscription.end_date) - new Date()) / (1000 * 60 * 60 * 24)
    ) : 0;

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-gray-900">Subscription & Billing</h1>
                <p className="text-gray-600 mt-1">Manage your subscription, view invoices, and track your usage</p>
            </div>

            {/* Overview Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Current Plan</p>
                                <p className="text-2xl font-bold text-gray-900 mt-1">
                                    {currentSubscription?.plan_type || 'Free'}
                                </p>
                            </div>
                            <div className="p-3 bg-indigo-100 rounded-full">
                                <CreditCard className="w-6 h-6 text-indigo-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Total Spent</p>
                                <p className="text-2xl font-bold text-gray-900 mt-1">
                                    {analytics?.totalSpent || 0}
                                </p>
                            </div>
                            <div className="p-3 bg-green-100 rounded-full">
                                <TrendingUp className="w-6 h-6 text-green-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Days Remaining</p>
                                <p className="text-2xl font-bold text-gray-900 mt-1">{daysRemaining}</p>
                            </div>
                            <div className="p-3 bg-blue-100 rounded-full">
                                <Calendar className="w-6 h-6 text-blue-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Auto-renew</p>
                                <p className="text-2xl font-bold text-gray-900 mt-1">
                                    {autopayStatus?.autopayEnabled ? 'ON' : 'OFF'}
                                </p>
                            </div>
                            <div className={`p-3 rounded-full ${autopayStatus?.autopayEnabled ? 'bg-green-100' : 'bg-gray-100'}`}>
                                {autopayStatus?.autopayEnabled ? (
                                    <CheckCircle2 className="w-6 h-6 text-green-600" />
                                ) : (
                                    <AlertCircle className="w-6 h-6 text-gray-600" />
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Current Subscription Details */}
            {currentSubscription && (
                <Card>
                    <CardHeader>
                        <CardTitle>Current Subscription</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <p className="text-sm text-gray-600">Plan Name</p>
                                <p className="text-lg font-semibold">{currentSubscription.plan_type}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-600">Billing Cycle</p>
                                <p className="text-lg font-semibold capitalize">{currentSubscription.billing_cycle || 'Monthly'}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-600">Start Date</p>
                                <p className="text-lg font-semibold">
                                    {new Date(currentSubscription.start_date).toLocaleDateString()}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-600">End Date</p>
                                <p className="text-lg font-semibold">
                                    {new Date(currentSubscription.end_date).toLocaleDateString()}
                                </p>
                            </div>
                        </div>

                        <div>
                            <div className="flex justify-between text-sm mb-2">
                                <span className="text-gray-600">Subscription Progress</span>
                                <span className="font-medium">{daysRemaining} days remaining</span>
                            </div>
                            <Progress
                                value={((daysRemaining / 30) * 100)}
                                className="h-2"
                            />
                        </div>

                        {autopayStatus?.cancelAtPeriodEnd && (
                            <div className="bg-amber-50 border-2 border-amber-200 rounded-lg p-4">
                                <div className="flex items-start gap-3">
                                    <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                                    <div>
                                        <h4 className="font-semibold text-amber-900">Subscription Cancelled</h4>
                                        <p className="text-sm text-amber-800 mt-1">
                                            Your subscription will end on {new Date(currentSubscription.end_date).toLocaleDateString()}.
                                            You can reactivate it anytime before the end date.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Invoice History */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <FileText className="w-5 h-5" />
                        Invoice History
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {invoices.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                            <FileText className="w-12 h-12 mx-auto text-gray-300 mb-2" />
                            <p>No invoices yet</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b">
                                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Invoice #</th>
                                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Date</th>
                                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Plan</th>
                                        <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Amount</th>
                                        <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">Status</th>
                                        <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {invoices.map((invoice) => (
                                        <tr key={invoice.id} className="border-b hover:bg-gray-50">
                                            <td className="py-3 px-4 text-sm font-medium text-gray-900">
                                                {invoice.invoice_number}
                                            </td>
                                            <td className="py-3 px-4 text-sm text-gray-600">
                                                {new Date(invoice.issued_date).toLocaleDateString()}
                                            </td>
                                            <td className="py-3 px-4 text-sm text-gray-600">
                                                {invoice.plan_name}
                                            </td>
                                            <td className="py-3 px-4 text-sm text-right font-medium text-gray-900">
                                                {parseFloat(invoice.total_amount).toFixed(2)}
                                            </td>
                                            <td className="py-3 px-4 text-center">
                                                <Badge className={invoice.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}>
                                                    {invoice.status}
                                                </Badge>
                                            </td>
                                            <td className="py-3 px-4 text-center">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => handleDownloadInvoice(invoice.id, invoice.invoice_number)}
                                                    className="flex items-center gap-1"
                                                >
                                                    <Download className="w-3 h-3" />
                                                    Download
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
