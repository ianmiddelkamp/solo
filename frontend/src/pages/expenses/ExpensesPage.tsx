import { useEffect, useRef, useState } from 'react';
import { getExpenses, createExpense, updateExpense, deleteExpense, parseReceipt, fetchReceiptObjectUrl } from '../../api/expenses';
import { confirm } from '../../services/dialog';
import ResponsiveTable, { type TableColumn } from '../../components/ResponsiveTable';
import type { Expense } from '../../types';
import type { ParsedReceipt } from '../../api/expenses';

const CATEGORIES = [
  'advertising', 'meals', 'office', 'professional_fees',
  'rent', 'software', 'supplies', 'travel', 'vehicle', 'other'
];

const CATEGORY_LABELS: Record<string, string> = {
  advertising: 'Advertising', meals: 'Meals & Entertainment', office: 'Office Expenses',
  professional_fees: 'Professional Fees', rent: 'Rent', software: 'Software & Subscriptions',
  supplies: 'Supplies', travel: 'Travel', vehicle: 'Vehicle', other: 'Other'
};

const EMPTY_FORM = { date: '', vendor: '', description: '', amount: '', hst_paid: '', category: '', notes: '' };

function fmt(n: number | null | undefined) {
  return n != null ? `$${Number(n).toFixed(2)}` : '—';
}

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [filterCategory, setFilterCategory] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [receiptBlobSignedId, setReceiptBlobSignedId] = useState<string | null>(null);
  const [receiptObjectUrl, setReceiptObjectUrl] = useState<string | null>(null);
  const receiptInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    load();
  }, [filterCategory]);

  // Revoke object URLs on unmount to avoid memory leaks
  useEffect(() => {
    return () => { if (receiptObjectUrl) URL.revokeObjectURL(receiptObjectUrl); };
  }, [receiptObjectUrl]);

  async function load() {
    const data = await getExpenses(filterCategory ? { category: filterCategory } : undefined);
    if (data) setExpenses(data);
  }

  function startNew() {
    clearReceipt();
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
    setError(null);
  }

  function startEdit(e: Expense) {
    setEditingId(e.id);
    setForm({
      date: e.date,
      vendor: e.vendor || '',
      description: e.description,
      amount: String(e.amount),
      hst_paid: String(e.hst_paid),
      category: e.category || '',
      notes: e.notes || '',
    });
    setShowForm(true);
    setError(null);
    clearReceipt();
    // Load existing receipt if attached
    if (e.receipt_blob_id) {
      fetchReceiptObjectUrl(e.id).then(url => setReceiptObjectUrl(url)).catch(() => {});
    }
  }

  function clearReceipt() {
    if (receiptObjectUrl) URL.revokeObjectURL(receiptObjectUrl);
    setReceiptObjectUrl(null);
    setReceiptBlobSignedId(null);
  }

  function cancel() {
    clearReceipt();
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError(null);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleReceiptFile(file: File | undefined) {
    if (!file) return;
    setParsing(true);
    setError(null);
    clearReceipt();
    try {
      const parsed: ParsedReceipt = await parseReceipt(file);
      // Show PDF inline using a local object URL from the original file
      setReceiptObjectUrl(URL.createObjectURL(file));
      setReceiptBlobSignedId(parsed.receipt_blob_signed_id);
      setEditingId(null);
      setForm({
        date: parsed.date || '',
        vendor: parsed.vendor || '',
        description: parsed.description || '',
        amount: parsed.amount != null ? String(parsed.amount) : '',
        hst_paid: parsed.hst_paid != null ? String(parsed.hst_paid) : '',
        category: parsed.category || '',
        notes: '',
      });
      setShowForm(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setParsing(false);
      if (receiptInputRef.current) receiptInputRef.current.value = '';
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const payload = {
      date: form.date,
      vendor: form.vendor.trim() || null,
      description: form.description.trim(),
      amount: parseFloat(form.amount),
      hst_paid: parseFloat(form.hst_paid || '0'),
      category: form.category || null,
      notes: form.notes.trim() || null,
      ...(receiptBlobSignedId ? { receipt_blob_signed_id: receiptBlobSignedId } : {}),
    };
    try {
      if (editingId) {
        const updated = await updateExpense(editingId, payload);
        if (updated) setExpenses(prev => prev.map(x => x.id === editingId ? updated : x));
      } else {
        const created = await createExpense(payload);
        if (created) setExpenses(prev => [created, ...prev]);
      }
      cancel();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    if (!await confirm('Delete this expense?')) return;
    await deleteExpense(id);
    setExpenses(prev => prev.filter(x => x.id !== id));
  }

  const totalAmount = expenses.reduce((s, e) => s + Number(e.amount), 0);
  const totalHst = expenses.reduce((s, e) => s + Number(e.hst_paid), 0);

  const expenseColumns: TableColumn<Expense>[] = [
    { key: 'date', label: 'Date', render: (exp) => <span className="whitespace-nowrap">{exp.date}</span> },
    { key: 'vendor', label: 'Vendor', render: (exp) => exp.vendor || '—' },
    { key: 'description', label: 'Description', render: (exp) => exp.description },
    { key: 'category', label: 'Category', render: (exp) => exp.category ? CATEGORY_LABELS[exp.category] || exp.category : '—' },
    { key: 'amount', label: 'Amount', align: 'right', render: (exp) => fmt(exp.amount) },
    { key: 'hst', label: 'HST (ITC)', align: 'right', render: (exp) => Number(exp.hst_paid) > 0 ? fmt(exp.hst_paid) : '—' },
  ];

  return (
    <div className="p-4 sm:p-8 max-w-7xl">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h2 className="text-2xl font-semibold text-gray-800">Expenses</h2>
        <div className="flex items-center gap-2">
          <input
            ref={receiptInputRef}
            type="file"
            accept=".pdf"
            className="hidden"
            onChange={(e) => handleReceiptFile(e.target.files?.[0])}
          />
          <button
            onClick={() => receiptInputRef.current?.click()}
            disabled={parsing}
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
          >
            {parsing ? 'Parsing…' : 'Parse Receipt'}
          </button>
          <button
            onClick={startNew}
            className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700"
          >
            Add Expense
          </button>
        </div>
      </div>

      {error && !showForm && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">{error}</div>
      )}

      {showForm && (
        <div className="mb-6 flex flex-col md:flex-row gap-6 items-start">
          {/* Form panel */}
          <div className="bg-white rounded-lg shadow p-5 flex-shrink-0 w-full max-w-xl">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">{editingId ? 'Edit Expense' : 'New Expense'}</h2>
            {error && <div className="mb-3 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">{error}</div>}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Date *</label>
                  <input type="date" name="date" value={form.date} onChange={handleChange} required
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Vendor</label>
                  <input name="vendor" value={form.vendor} onChange={handleChange} placeholder="e.g. AWS, Apple"
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Description *</label>
                <input name="description" value={form.description} onChange={handleChange} required
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Amount *</label>
                  <input type="number" name="amount" value={form.amount} onChange={handleChange} required min="0" step="0.01"
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">HST Paid (ITC)</label>
                  <input type="number" name="hst_paid" value={form.hst_paid} onChange={handleChange} min="0" step="0.01" placeholder="0.00"
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Category</label>
                  <select name="category" value={form.category} onChange={handleChange}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2">
                    <option value="">— None —</option>
                    {CATEGORIES.map(c => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
                <textarea name="notes" value={form.notes} onChange={handleChange} rows={2}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2" />
              </div>
              <div className="flex gap-3">
                <button type="submit" disabled={saving}
                  className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 disabled:opacity-50">
                  {saving ? 'Saving…' : editingId ? 'Save Changes' : 'Add Expense'}
                </button>
                <button type="button" onClick={cancel} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">Cancel</button>
              </div>
            </form>
          </div>

          {/* PDF preview panel */}
          {receiptObjectUrl && (
            <div className="flex-1 bg-white rounded-lg shadow overflow-hidden" style={{ minHeight: '600px' }}>
              <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 bg-gray-50">
                <span className="text-xs font-medium text-gray-600">Receipt Preview</span>
                <button onClick={clearReceipt} className="text-xs text-gray-400 hover:text-gray-600">✕ Remove</button>
              </div>
              <iframe
                src={receiptObjectUrl}
                className="w-full h-full"
                style={{ minHeight: '580px', border: 'none' }}
                title="Receipt"
              />
            </div>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-4 mb-4">
        <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)}
          className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2">
          <option value="">All categories</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
        </select>
        <span className="text-sm text-gray-500">{expenses.length} expense{expenses.length !== 1 ? 's' : ''}</span>
      </div>

      {expenses.length > 0 ? (
        <div className="mb-4">
          <ResponsiveTable
            columns={expenseColumns}
            rows={expenses}
            keyExtractor={(exp) => exp.id}
            actions={(exp) => (
              <>
                {exp.receipt_blob_id && (
                  <button
                    onClick={async () => {
                      const url = await fetchReceiptObjectUrl(exp.id);
                      window.open(url, '_blank');
                    }}
                    className="text-gray-400 hover:text-gray-600"
                    title="View receipt"
                  >
                    PDF
                  </button>
                )}
                <button onClick={() => startEdit(exp)} className="text-indigo-600 hover:text-indigo-800">Edit</button>
                <button onClick={() => handleDelete(exp.id)} className="text-red-500 hover:text-red-700">Delete</button>
              </>
            )}
            footer={
              <tr>
                <td colSpan={4} className="px-6 py-3 text-sm font-semibold text-gray-700">Total</td>
                <td className="px-6 py-3 text-sm font-semibold text-gray-900 text-right">{fmt(totalAmount)}</td>
                <td className="px-6 py-3 text-sm font-semibold text-gray-900 text-right">{fmt(totalHst)}</td>
                <td />
              </tr>
            }
            mobileFooter={
              <div className="flex items-center justify-between text-sm font-semibold text-gray-700">
                <span>Total</span>
                <span className="text-gray-900">{fmt(totalAmount)} <span className="font-normal text-gray-400">(HST {fmt(totalHst)})</span></span>
              </div>
            }
          />
        </div>
      ) : (
        <p className="text-sm text-gray-400">No expenses yet. Add one above.</p>
      )}
    </div>
  );
}
