import React, { useState } from 'react';
import {
  Receipt,
  PlusCircle,
  Trash2,
  Search,
  IndianRupee,
  X,
  Calendar,
  PieChart as PieIcon,
} from 'lucide-react';
import { Expense, ExpenseCategory } from '../types';
import toast from 'react-hot-toast';

interface ExpensesModuleProps {
  expenses: Expense[];
  onAddExpense: (expenseData: Partial<Expense>) => Promise<void>;
  onDeleteExpense: (id: string) => Promise<void>;
}

export const ExpensesModule: React.FC<ExpensesModuleProps> = ({
  expenses,
  onAddExpense,
  onDeleteExpense,
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [search, setSearch] = useState('');

  // Form states
  const [formTitle, setFormTitle] = useState('');
  const [formAmount, setFormAmount] = useState<number>(0);
  const [formCategory, setFormCategory] = useState<ExpenseCategory>('Utilities');
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [formNotes, setFormNotes] = useState('');

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle || !formAmount) {
      toast.error('Title and Amount are required');
      return;
    }

    try {
      await onAddExpense({
        title: formTitle,
        amount: Number(formAmount),
        category: formCategory,
        date: formDate,
        notes: formNotes,
      });

      toast.success('Expense entry recorded!');
      closeModal();
    } catch (err: any) {
      toast.error(err.message || 'Error recording expense');
    }
  };

  const closeModal = () => {
    setShowAddModal(false);
    setFormTitle('');
    setFormAmount(0);
    setFormNotes('');
  };

  const filteredExpenses = expenses.filter(
    (e) =>
      e.title.toLowerCase().includes(search.toLowerCase()) ||
      e.category.toLowerCase().includes(search.toLowerCase()) ||
      e.id.toLowerCase().includes(search.toLowerCase())
  );

  const totalExpenseSum = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-white flex items-center gap-2">
            <Receipt className="w-5 h-5 text-rose-400" />
            <span>Facility Expenses & Overhead</span>
          </h1>
          <p className="text-xs text-white/50">
            Track rent, power utilities, equipment repairs, trainer salaries & maintenance
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-400 hover:to-pink-500 text-white font-extrabold text-xs shadow-lg shadow-rose-500/20 flex items-center gap-2 transition-all hover:scale-102"
        >
          <PlusCircle className="w-4 h-4 stroke-[2.5]" />
          <span>+ Record Expense</span>
        </button>
      </div>

      {/* Summary Banner */}
      <div className="glass-card border border-white/10 rounded-2xl p-5 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by Expense Title or Category..."
            className="w-full pl-10 pr-4 py-2 text-xs bg-white/5 text-white placeholder-white/30 rounded-xl border border-white/10 focus:outline-none focus:border-[#E51924]"
          />
        </div>

        <div className="flex items-baseline gap-2 bg-black/60 px-4 py-2 rounded-xl border border-white/10">
          <span className="text-xs text-white/50 font-medium">Total Filtered Outgoings:</span>
          <span className="text-lg font-black text-rose-400 font-mono">
            Rs. {totalExpenseSum.toLocaleString('en-PK')}
          </span>
        </div>
      </div>

      {/* Expenses Table */}
      <div className="glass-card border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-white/5 text-white/40 font-semibold border-b border-white/10 uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Expense ID</th>
                <th className="py-3.5 px-4">Title & Details</th>
                <th className="py-3.5 px-4">Category</th>
                <th className="py-3.5 px-4">Date</th>
                <th className="py-3.5 px-4">Amount</th>
                <th className="py-3.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10 font-medium">
              {filteredExpenses.length > 0 ? (
                filteredExpenses.map((e) => (
                  <tr key={e.id} className="hover:bg-white/5 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-white/40">{e.id}</td>

                    <td className="py-3.5 px-4">
                      <p className="font-bold text-white">{e.title}</p>
                      {e.notes && <p className="text-[10px] text-white/40">{e.notes}</p>}
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[10px] font-mono font-bold">
                        {e.category}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 font-mono text-white/70">{e.date}</td>

                    <td className="py-3.5 px-4 font-mono font-black text-rose-400 text-sm">
                      Rs. {e.amount.toLocaleString('en-PK')}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={async () => {
                          if (confirm(`Delete expense ${e.title}?`)) {
                            await onDeleteExpense(e.id);
                            toast.success('Expense record deleted');
                          }
                        }}
                        className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-rose-400 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-white/40">
                    No expense records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0D0D0D] border border-white/15 rounded-3xl w-full max-w-md p-6 space-y-6 shadow-2xl relative">
            <button
              onClick={closeModal}
              className="absolute top-5 right-5 text-white/50 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <h2 className="text-lg font-black text-white">Record Facility Expense</h2>
              <p className="text-xs text-white/50">
                Log facility rent, power, repair, or salary payment.
              </p>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-white/80 mb-1">
                  Expense Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. AC Maintenance & Gas Refill"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs bg-white/5 text-white rounded-xl border border-white/10 focus:outline-none focus:border-[#E51924]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-white/80 mb-1">
                    Amount (Rs.) *
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={formAmount || ''}
                    onChange={(e) => setFormAmount(Number(e.target.value))}
                    className="w-full px-3.5 py-2 text-xs bg-white/5 text-white rounded-xl border border-white/10 focus:outline-none focus:border-[#E51924] font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-white/80 mb-1">
                    Category
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as ExpenseCategory)}
                    className="w-full px-3.5 py-2 text-xs bg-[#0D0D0D] text-white rounded-xl border border-white/10 focus:outline-none focus:border-[#E51924]"
                  >
                    <option value="Rent">Rent</option>
                    <option value="Utilities">Utilities (Power, Water)</option>
                    <option value="Equipment">Equipment Purchase</option>
                    <option value="Maintenance">Maintenance & Repairs</option>
                    <option value="Salaries">Staff / Coach Salaries</option>
                    <option value="Marketing">Marketing & Ads</option>
                    <option value="Misc">Misc Overhead</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-white/80 mb-1">
                  Expense Date
                </label>
                <input
                  type="date"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs bg-white/5 text-white rounded-xl border border-white/10 focus:outline-none focus:border-[#E51924]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-white/80 mb-1">
                  Notes / Receipt Reference
                </label>
                <input
                  type="text"
                  placeholder="Optional details"
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs bg-white/5 text-white rounded-xl border border-white/10 focus:outline-none focus:border-[#E51924]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 rounded-xl bg-white/10 text-white/70 text-xs font-bold hover:bg-white/20"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-rose-500 text-white text-xs font-extrabold hover:bg-rose-400 transition-all shadow-lg shadow-rose-500/20"
                >
                  Record Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
