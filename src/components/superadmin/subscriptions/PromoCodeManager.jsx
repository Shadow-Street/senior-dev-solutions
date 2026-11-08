import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PlusCircle, Edit, Trash2 } from 'lucide-react';
import { toast } from "sonner";
import { PromoCode } from '@/api/entities';
import { format } from 'date-fns';

// Promo codes are stored with the real column names: discount_percent OR
// discount_amount, max_uses / uses_count, expires_at, min_order_amount,
// one_time_per_user, applies_to_renewal, applicable_to ('all' or plan ids).
// The percent/flat selector is a form-only convenience that decides which of
// the two discount columns is filled.
const blankPromo = () => ({
    code: '',
    discount_kind: 'percent',
    discount_value: 10,
    max_uses: '',
    expires_at: '',
    min_order_amount: '',
    one_time_per_user: false,
    applies_to_renewal: true,
    applicable_to: 'all',
    is_active: true,
});

const toForm = (promo) => ({
    id: promo.id,
    code: promo.code || '',
    discount_kind: promo.discount_percent ? 'percent' : 'flat',
    discount_value: promo.discount_percent || promo.discount_amount || '',
    max_uses: promo.max_uses ?? '',
    expires_at: promo.expires_at ? format(new Date(promo.expires_at), "yyyy-MM-dd'T'HH:mm") : '',
    min_order_amount: promo.min_order_amount ?? '',
    one_time_per_user: !!promo.one_time_per_user,
    applies_to_renewal: promo.applies_to_renewal !== false,
    applicable_to: Array.isArray(promo.applicable_to) ? promo.applicable_to : 'all',
    is_active: promo.is_active !== false,
});

const toPayload = (form) => {
    const value = Number(form.discount_value);
    return {
        code: String(form.code || '').trim().toUpperCase(),
        discount_percent: form.discount_kind === 'percent' ? value : null,
        discount_amount: form.discount_kind === 'flat' ? value : null,
        max_uses: form.max_uses === '' ? null : Number(form.max_uses),
        expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
        min_order_amount: form.min_order_amount === '' ? null : Number(form.min_order_amount),
        one_time_per_user: !!form.one_time_per_user,
        applies_to_renewal: !!form.applies_to_renewal,
        applicable_to: form.applicable_to,
        is_active: !!form.is_active,
    };
};

const discountLabel = (promo) => {
    if (Number(promo.discount_percent) > 0) return `${promo.discount_percent}%`;
    if (Number(promo.discount_amount) > 0) return `₹${Number(promo.discount_amount).toLocaleString('en-IN')}`;
    return '—';
};

export default function PromoCodeManager({ promoCodes, setPromoCodes, permissions, plans = [] }) {
    const [showModal, setShowModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [currentPromo, setCurrentPromo] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const isSuperAdmin = !!permissions.isSuperAdmin;
    const rows = promoCodes || [];
    const planList = plans || [];

    const openCreateModal = () => {
        setIsEditing(false);
        setCurrentPromo(blankPromo());
        setShowModal(true);
    };

    const openEditModal = (promo) => {
        setIsEditing(true);
        setCurrentPromo(toForm(promo));
        setShowModal(true);
    };

    const togglePlan = (planId, checked) => {
        const current = Array.isArray(currentPromo.applicable_to) ? currentPromo.applicable_to : [];
        const next = checked ? [...new Set([...current, planId])] : current.filter((id) => id !== planId);
        // An empty selection means every plan.
        setCurrentPromo({ ...currentPromo, applicable_to: next.length ? next : 'all' });
    };

    const handleSave = async () => {
        if (!isSuperAdmin) {
            toast.error("Only Super Admins can save promo codes.");
            return;
        }

        if (!currentPromo.code || !currentPromo.discount_value) {
            toast.error("Code and Discount Value are required.");
            return;
        }

        const payload = toPayload(currentPromo);
        if (payload.discount_percent !== null && (payload.discount_percent < 1 || payload.discount_percent > 100)) {
            toast.error("A percentage discount must be between 1 and 100.");
            return;
        }

        setIsSaving(true);
        try {
            if (isEditing) {
                const updated = await PromoCode.update(currentPromo.id, payload);
                setPromoCodes(rows.map(p => p.id === currentPromo.id ? { ...p, ...updated } : p));
                toast.success(`Promo code "${payload.code}" updated.`);
            } else {
                const created = await PromoCode.create(payload);
                setPromoCodes([created, ...rows]);
                toast.success(`Promo code "${payload.code}" created.`);
            }
            setShowModal(false);
        } catch (error) {
            console.error("Error saving promo code:", error);
            // The server says exactly what is wrong (duplicate code, bad range, ...).
            toast.error(error?.response?.data?.error || "Failed to save the promo code. Please try again.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (promoId) => {
        if (!isSuperAdmin) {
            toast.error("Only Super Admins can delete promo codes.");
            return;
        }

        try {
            await PromoCode.delete(promoId);
            setPromoCodes(rows.filter(p => p.id !== promoId));
            toast.success("Promo code deleted.");
        } catch (error) {
            console.error("Error deleting promo code:", error);
            toast.error(error?.response?.data?.error || "Failed to delete promo code.");
        }
    };

    return (
        <Card className="shadow-md border-0 bg-white">
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Promo Code Management</CardTitle>
                <Button onClick={openCreateModal} disabled={!isSuperAdmin}>
                    <PlusCircle className="w-4 h-4 mr-2" /> Add Promo Code
                </Button>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Code</TableHead>
                            <TableHead>Discount</TableHead>
                            <TableHead>Usage</TableHead>
                            <TableHead>Expires On</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {rows.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                                    No promo codes yet.
                                </TableCell>
                            </TableRow>
                        )}
                        {rows.map(promo => {
                            const expired = promo.expires_at && new Date(promo.expires_at) < new Date();
                            return (
                                <TableRow key={promo.id}>
                                    <TableCell className="font-medium">{promo.code}</TableCell>
                                    <TableCell>{discountLabel(promo)}</TableCell>
                                    <TableCell>{promo.uses_count ?? 0} / {promo.max_uses ? promo.max_uses : 'Unlimited'}</TableCell>
                                    <TableCell>
                                        {promo.expires_at ? new Date(promo.expires_at).toLocaleDateString() : 'No Expiry'}
                                        {expired && <span className="ml-2 text-xs text-sell-muted-foreground">(expired)</span>}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={promo.is_active ? 'default' : 'destructive'} className={promo.is_active ? 'bg-buy-muted text-buy-muted-foreground' : ''}>
                                            {promo.is_active ? 'Active' : 'Inactive'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="icon" aria-label={`Edit ${promo.code}`} onClick={() => openEditModal(promo)} disabled={!isSuperAdmin}>
                                            <Edit className="w-4 h-4" />
                                        </Button>
                                        <Button variant="ghost" size="icon" aria-label={`Delete ${promo.code}`} onClick={() => handleDelete(promo.id)} disabled={!isSuperAdmin}>
                                            <Trash2 className="w-4 h-4 text-sell" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>

                <Dialog open={showModal} onOpenChange={setShowModal}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{isEditing ? 'Edit' : 'Create'} Promo Code</DialogTitle>
                            <DialogDescription>
                                {isEditing ? 'Update the details for this promo code.' : 'Create a new promo code for users.'}
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto pr-1">
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="code" className="text-right">Code</Label>
                                <Input id="code" value={currentPromo?.code} onChange={(e) => setCurrentPromo({...currentPromo, code: e.target.value.toUpperCase()})} placeholder="e.g. NEW50" className="col-span-3" />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="discount_kind" className="text-right">Type</Label>
                                <Select value={currentPromo?.discount_kind} onValueChange={(val) => setCurrentPromo({...currentPromo, discount_kind: val})}>
                                    <SelectTrigger id="discount_kind" className="col-span-3">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="percent">Percentage (%)</SelectItem>
                                        <SelectItem value="flat">Flat Amount (₹)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="discount_value" className="text-right">Value</Label>
                                <Input id="discount_value" type="number" min="1" max={currentPromo?.discount_kind === 'percent' ? 100 : undefined} value={currentPromo?.discount_value} onChange={(e) => setCurrentPromo({...currentPromo, discount_value: e.target.value})} className="col-span-3" />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="expires_at" className="text-right">Expiry Date</Label>
                                <Input id="expires_at" type="datetime-local" value={currentPromo?.expires_at} onChange={(e) => setCurrentPromo({...currentPromo, expires_at: e.target.value})} className="col-span-3" />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="max_uses" className="text-right">Usage Limit</Label>
                                <Input id="max_uses" type="number" min="1" placeholder="Blank = unlimited" value={currentPromo?.max_uses} onChange={(e) => setCurrentPromo({...currentPromo, max_uses: e.target.value})} className="col-span-3" />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="min_order_amount" className="text-right">Min. order (₹)</Label>
                                <Input id="min_order_amount" type="number" min="0" placeholder="Blank = no minimum" value={currentPromo?.min_order_amount} onChange={(e) => setCurrentPromo({...currentPromo, min_order_amount: e.target.value})} className="col-span-3" />
                            </div>
                            <div className="grid grid-cols-4 items-start gap-4">
                                <Label className="text-right pt-1">Plans</Label>
                                <div className="col-span-3 space-y-1">
                                    <p className="text-xs text-muted-foreground">Leave all unticked to allow every plan.</p>
                                    {planList.filter((p) => Number(p.price_monthly ?? p.price) > 0).map((plan) => (
                                        <label key={plan.id} className="flex items-center gap-2 text-sm">
                                            <input
                                                type="checkbox"
                                                checked={Array.isArray(currentPromo?.applicable_to) && currentPromo.applicable_to.includes(plan.id)}
                                                onChange={(e) => togglePlan(plan.id, e.target.checked)}
                                            />
                                            {plan.name}
                                        </label>
                                    ))}
                                </div>
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="one_time_per_user" className="text-right">Once per user</Label>
                                <Switch id="one_time_per_user" checked={!!currentPromo?.one_time_per_user} onCheckedChange={(checked) => setCurrentPromo({...currentPromo, one_time_per_user: checked})} />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="applies_to_renewal" className="text-right">Valid on renewals</Label>
                                <Switch id="applies_to_renewal" checked={!!currentPromo?.applies_to_renewal} onCheckedChange={(checked) => setCurrentPromo({...currentPromo, applies_to_renewal: checked})} />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="is_active" className="text-right">Active</Label>
                                <Switch id="is_active" checked={!!currentPromo?.is_active} onCheckedChange={(checked) => setCurrentPromo({...currentPromo, is_active: checked})} />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
                            <Button onClick={handleSave} disabled={isSaving}>{isSaving ? 'Saving...' : 'Save Changes'}</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </CardContent>
        </Card>
    );
}