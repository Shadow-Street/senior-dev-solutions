
import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Plus,
  Edit,
  Trash2,
  Search,
  Receipt,
  Calendar as CalendarIcon
} from 'lucide-react';
import { toast } from "sonner";
import { format } from "date-fns";
import { formatINR } from '@/lib/format';
import ConfirmDialog from '@/components/ui/ConfirmDialog';

// Expense dates are calendar days in India time; the server stores IST midnight.
// Reading or showing them in the browser's own zone would move them a day.
const istDay = (value) => {
  const d = value ? new Date(value) : null;
  if (!d || Number.isNaN(d.getTime())) return null;
  return new Date(d.getTime() + 330 * 60 * 1000).toISOString().slice(0, 10);
};
const istDayLabel = (value) => {
  const day = istDay(value);
  if (!day) return '—';
  const [y, m, dd] = day.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, dd)).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
};
/** A local Date on the same calendar day (for the date picker). */
const dayToLocalDate = (day) => {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y, m - 1, d);
};

const expenseCategories = ["Salary", "Marketing", "Operations", "Infrastructure", "Miscellaneous"];

// Helper function to get category-specific styling
const getCategoryColor = (category) => {
  switch (category) {
    case 'Salary':
      return 'bg-premium-muted text-primary';
    case 'Marketing':
      return 'bg-buy-muted text-buy-muted-foreground';
    case 'Operations':
      return 'bg-premium-muted text-protocall-premium-text';
    case 'Infrastructure':
      return 'bg-hold-muted text-hold-muted-foreground';
    case 'Miscellaneous':
      return 'bg-surface-2 text-foreground';
    default:
      return 'bg-surface-2 text-foreground';
  }
};

export default function ExpenseManager({ expenses, onSave, onDelete, currentUser, canEdit }) {
  const [showModal, setShowModal] = useState(false); // Renamed from isModalOpen
  const [currentExpense, setCurrentExpense] = useState(null);
  const [editingExpense, setEditingExpense] = useState(false); // New state to differentiate add/edit
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [saving, setSaving] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);

  const filteredExpenses = useMemo(() => {
    return expenses
      .filter(exp =>
        (categoryFilter === 'all' || exp.category === categoryFilter) &&
        (String(exp.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
         String(exp.category || '').toLowerCase().includes(searchTerm.toLowerCase())) // Search by category name too
      )
      .sort((a, b) => new Date(b.expense_date) - new Date(a.expense_date));
  }, [expenses, searchTerm, categoryFilter]);

  const handleAdd = () => {
    setCurrentExpense({
      category: expenseCategories[0],
      description: '',
      amount: '',
      expense_date: new Date(),
    });
    setEditingExpense(false);
    setShowModal(true);
  };

  const handleEdit = (expense) => {
    const day = istDay(expense.expense_date);
    setCurrentExpense({ ...expense, expense_date: day ? dayToLocalDate(day) : new Date() });
    setEditingExpense(true);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setCurrentExpense(null);
    setEditingExpense(false);
  };

  const handleSubmit = async (event) => { // Renamed from handleSave
    event.preventDefault(); // Prevent default form submission

    if (!currentExpense.description || !currentExpense.amount || !currentExpense.expense_date) {
      toast.error("Please fill all required fields.");
      return;
    }

    if (saving) return; // no double submit
    const expenseData = {
      ...currentExpense,
      amount: String(currentExpense.amount).trim(),
      // The picker holds a local date for the chosen calendar day.
      expense_date: format(currentExpense.expense_date, 'yyyy-MM-dd'),
    };

    setSaving(true);
    try {
      await onSave(expenseData, currentUser);
      closeModal();
    } catch {
      // onSave showed the error; keep the form so nothing typed is lost
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (expenseId) => {
    try {
      await onDelete(expenseId, currentUser);
      toast.success("Expense deleted successfully!");
    } catch {
      // onDelete has already shown the error
    }
  };

  const handleFieldChange = (field, value) => {
    setCurrentExpense(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="space-y-6">
      {/* Header Card with Add Button */}
      <Card className="shadow-lg border-0 bg-white">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-hold rounded-lg flex items-center justify-center">
                <Receipt className="w-5 h-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-xl bg-hold bg-clip-text text-transparent">
                  Expense Management
                </CardTitle>
                <p className="text-sm text-subtle font-normal mt-0.5">
                  Track and manage company expenses
                </p>
              </div>
            </div>
            {canEdit && (
              <Button
                onClick={handleAdd} // Call handleAdd for new expense
                className="bg-hold hover:from-hold hover:to-hold text-hold-foreground shadow-lg shadow-hold/30/25 transition-all duration-200"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Expense
              </Button>
            )}
          </div>

          {/* Search and Filter */}
          <div className="flex items-center gap-4 mt-6 pt-4 border-t">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                aria-label="Search expenses"
                placeholder="Search expenses by description or category..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 border-border focus:border-hold focus:ring-hold/30"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger aria-label="Filter by category" className="w-[180px] border-border focus:border-hold focus:ring-hold/30">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {expenseCategories.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
      </Card>

      {/* Expenses Table */}
      <Card className="shadow-lg border-0 bg-white">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-surface-2">
                  <th className="p-4 text-left font-semibold text-subtle">Description</th>
                  <th className="p-4 text-left font-semibold text-subtle">Category</th>
                  <th className="p-4 text-right font-semibold text-subtle">Amount</th>
                  <th className="p-4 text-left font-semibold text-subtle">Date</th>
                  <th className="p-4 text-left font-semibold text-subtle">Vendor</th>
                  {canEdit && <th className="p-4 text-right font-semibold text-subtle">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {filteredExpenses.length > 0 ? filteredExpenses.map(expense => (
                  <tr key={expense.id} className="border-b transition-colors hover:bg-gradient-to-r hover:from-surface-2 hover:to-transparent">
                    <td className="p-4 font-medium text-foreground">{expense.description}</td>
                    <td className="p-4">
                      <Badge className={`${getCategoryColor(expense.category)} border-0`}>
                        {expense.category}
                      </Badge>
                    </td>
                    <td className="p-4 text-right font-bold text-foreground">{formatINR(expense.amount)}</td>
                    <td className="p-4 text-subtle">
                      {istDayLabel(expense.expense_date)}
                    </td>
                    <td className="p-4 text-subtle text-sm">{expense.vendor || '—'}</td>
                    {canEdit && (
                      <td className="p-4 text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(expense)} // Call handleEdit for existing expense
                            className="text-primary hover:text-primary hover:bg-premium-muted"
                            aria-label={`Edit expense ${expense.description}`}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setPendingDelete(expense)}
                            className="text-sell-muted-foreground hover:text-sell-muted-foreground hover:bg-sell-muted"
                            aria-label={`Delete expense ${expense.description}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    )}
                  </tr>
                )) : (
                  <tr className="border-b">
                    <td colSpan={canEdit ? 6 : 5} className="text-center py-12">
                      <Receipt className="mx-auto h-12 w-12 text-muted-foreground" />
                      <h3 className="mt-2 text-sm font-medium text-foreground">No expenses found</h3>
                      <p className="mt-1 text-sm text-muted-foreground">Try adjusting your search or filter criteria.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Add/Edit Expense Modal */}
      <Dialog open={showModal} onOpenChange={closeModal}> {/* Changed from isModalOpen */}
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="w-8 h-8 bg-hold rounded-lg flex items-center justify-center">
                <Plus className="w-4 h-4 text-white" />
              </div>
              {editingExpense ? 'Edit Expense' : 'Add New Expense'}
            </DialogTitle>
            {/* DialogDescription removed as per outline */}
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4"> {/* Wrapped existing fields in form */}
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="description">Description *</Label>
                <Input
                  id="description"
                  value={currentExpense?.description || ''}
                  onChange={(e) => handleFieldChange('description', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="amount">Amount (₹) *</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={currentExpense?.amount || ''}
                  onChange={(e) => handleFieldChange('amount', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Category *</Label>
                <Select value={currentExpense?.category} onValueChange={(val) => handleFieldChange('category', val)}>
                  <SelectTrigger id="category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {expenseCategories.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="expense-date">Expense Date *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button id="expense-date" type="button" variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {currentExpense?.expense_date ? format(currentExpense.expense_date, 'PPP') : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={currentExpense?.expense_date}
                      onSelect={(date) => handleFieldChange('expense_date', date)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            <DialogFooter className="flex justify-end gap-3 pt-4 border-t"> {/* Applied new classes */}
              <Button
                type="button"
                variant="outline"
                onClick={closeModal} // Call closeModal
                className="border-border text-subtle hover:bg-surface-2"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={saving}
                className="bg-hold hover:from-hold hover:to-hold text-hold-foreground shadow-md"
              >
                {saving ? 'Saving…' : `${editingExpense ? 'Update' : 'Add'} Expense`}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        isOpen={Boolean(pendingDelete)}
        onClose={() => setPendingDelete(null)}
        onConfirm={() => { const e = pendingDelete; setPendingDelete(null); if (e) handleDelete(e.id); }}
        title="Delete this expense?"
        message={pendingDelete ? `"${pendingDelete.description}" (${formatINR(pendingDelete.amount)}) will be removed. The deletion is recorded in the audit log.` : ''}
        confirmText="Delete"
        variant="destructive"
      />
    </div>
  );
}
