import React, { useState } from 'react';
import {
  BarChart3,
  Download,
  FileSpreadsheet,
  FileText,
  Calendar,
  IndianRupee,
  TrendingUp,
  TrendingDown,
  Printer,
} from 'lucide-react';
import Papa from 'papaparse';
import { jsPDF } from 'jspdf';
import { Payment, Expense, Member, Attendance } from '../types';
import toast from 'react-hot-toast';

interface ReportsModuleProps {
  payments: Payment[];
  expenses: Expense[];
  members: Member[];
  attendance: Attendance[];
}

export const ReportsModule: React.FC<ReportsModuleProps> = ({
  payments,
  expenses,
  members,
  attendance,
}) => {
  const [range, setRange] = useState<'This Month' | 'Last Month' | 'This Year' | 'All Time'>('This Month');

  // Filter payments & expenses by selected date range
  const filterByRange = <T extends { date: string }>(items: T[]): T[] => {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();

    if (range === 'This Month') {
      const prefix = `${year}-${String(month + 1).padStart(2, '0')}`;
      return items.filter((item) => item.date.startsWith(prefix));
    } else if (range === 'Last Month') {
      const lastMonthDate = new Date(year, month - 1, 1);
      const prefix = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, '0')}`;
      return items.filter((item) => item.date.startsWith(prefix));
    } else if (range === 'This Year') {
      const prefix = `${year}-`;
      return items.filter((item) => item.date.startsWith(prefix));
    }
    return items;
  };

  const filteredPayments = filterByRange<Payment>(payments);
  const filteredExpenses = filterByRange<Expense>(expenses);

  const totalIncome = filteredPayments.reduce((sum, p) => sum + p.amount, 0);
  const totalExpenses = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  const netProfit = totalIncome - totalExpenses;

  // CSV Export using PapaParse
  const exportMembersCSV = () => {
    const csv = Papa.unparse(
      members.map((m) => ({
        ID: m.id,
        Name: m.name,
        Phone: m.phone,
        Email: m.email,
        PlanType: m.planType,
        PlanCost: m.planCost,
        AmountPaid: m.amountPaid,
        RemainingBalance: m.remainingBalance,
        StartDate: m.startDate,
        ExpiryDate: m.expiryDate,
        Status: m.status,
      }))
    );
    downloadFile(csv, `Armstrong_Gym_Members_${range}.csv`, 'text/csv');
    toast.success('Members CSV report downloaded!');
  };

  const exportFinancialsCSV = () => {
    const paymentData = filteredPayments.map((p) => ({
      Type: 'INCOME',
      ID: p.id,
      MemberID: p.memberId,
      Name: p.memberName,
      CategoryOrMethod: p.paymentMethod,
      Date: p.date,
      Amount: p.amount,
      Notes: p.notes,
    }));

    const expenseData = filteredExpenses.map((e) => ({
      Type: 'EXPENSE',
      ID: e.id,
      MemberID: 'N/A',
      Name: e.title,
      CategoryOrMethod: e.category,
      Date: e.date,
      Amount: -e.amount,
      Notes: e.notes,
    }));

    const csv = Papa.unparse([...paymentData, ...expenseData]);
    downloadFile(csv, `Armstrong_Gym_Financials_${range}.csv`, 'text/csv');
    toast.success('Financial CSV report downloaded!');
  };

  // PDF Export using jsPDF
  const exportPDFReport = () => {
    try {
      const doc = new jsPDF();
      doc.setFontSize(18);
      doc.text('ARMSTRONG GYM MANAGEMENT SYSTEM', 14, 20);
      doc.setFontSize(12);
      doc.text(`Official Executive Summary Report (${range})`, 14, 28);
      doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 34);

      doc.setFontSize(10);
      doc.text('--------------------------------------------------------------------------------', 14, 40);
      doc.text(`Total Collections (Income): Rs. ${totalIncome.toLocaleString('en-PK')}`, 14, 48);
      doc.text(`Total Facility Expenses: Rs. ${totalExpenses.toLocaleString('en-PK')}`, 14, 56);
      doc.text(`Net Operating Profit: Rs. ${netProfit.toLocaleString('en-PK')}`, 14, 64);
      doc.text(`Total Registered Members: ${members.length}`, 14, 72);
      doc.text('--------------------------------------------------------------------------------', 14, 80);

      doc.setFontSize(12);
      doc.text('Recent Payments Breakdown:', 14, 90);

      let y = 100;
      doc.setFontSize(9);
      filteredPayments.slice(0, 10).forEach((p, idx) => {
        doc.text(
          `${idx + 1}. ${p.id} | ${p.memberName} (${p.memberId}) | ${p.paymentMethod} | Rs. ${p.amount}`,
          14,
          y
        );
        y += 7;
      });

      doc.save(`Armstrong_Gym_Report_${range}.pdf`);
      toast.success('PDF Executive Report downloaded!');
    } catch (err: any) {
      toast.error('Failed generating PDF: ' + err.message);
    }
  };

  const downloadFile = (data: string, filename: string, type: string) => {
    const blob = new Blob([data], { type });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-emerald-400" />
            <span>Financial & Attendance Analytics</span>
          </h1>
          <p className="text-xs text-white/50">
            Generate executive profit reports, export PDF statements & PapaParse CSV exports
          </p>
        </div>

        {/* Date Filter Pills */}
        <div className="flex items-center gap-2 bg-black/60 p-1.5 rounded-xl border border-white/10">
          {(['This Month', 'Last Month', 'This Year', 'All Time'] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                range === r
                  ? 'bg-[#E51924] text-white font-extrabold shadow-md'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="glass-card border border-white/10 rounded-2xl p-5 space-y-2">
          <span className="text-xs text-white/50 font-semibold uppercase tracking-wider">
            Total Income ({range})
          </span>
          <p className="text-3xl font-black text-emerald-400 font-mono">
            Rs. {totalIncome.toLocaleString('en-PK')}
          </p>
          <p className="text-[11px] text-white/40">
            {filteredPayments.length} transactions recorded
          </p>
        </div>

        <div className="glass-card border border-white/10 rounded-2xl p-5 space-y-2">
          <span className="text-xs text-white/50 font-semibold uppercase tracking-wider">
            Total Expenses ({range})
          </span>
          <p className="text-3xl font-black text-rose-400 font-mono">
            Rs. {totalExpenses.toLocaleString('en-PK')}
          </p>
          <p className="text-[11px] text-white/40">
            {filteredExpenses.length} expense vouchers
          </p>
        </div>

        <div className="glass-card border border-white/10 rounded-2xl p-5 space-y-2">
          <span className="text-xs text-white/50 font-semibold uppercase tracking-wider">
            Net Profit ({range})
          </span>
          <p
            className={`text-3xl font-black font-mono ${
              netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            Rs. {netProfit.toLocaleString('en-PK')}
          </p>
          <p className="text-[11px] text-white/40">
            Income minus operational expenses
          </p>
        </div>
      </div>

      {/* Download Export Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button
          onClick={exportPDFReport}
          className="p-5 rounded-2xl glass-card hover:bg-white/10 border border-white/10 hover:border-[#E51924]/50 flex items-center justify-between transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#E51924]/20 text-[#E51924] flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <div className="text-left">
              <p className="text-sm font-bold text-white group-hover:text-[#E51924] transition-colors">
                Export Executive PDF
              </p>
              <p className="text-xs text-white/50">Formal printable statement</p>
            </div>
          </div>
          <Download className="w-4 h-4 text-white/40 group-hover:text-[#E51924]" />
        </button>

        <button
          onClick={exportFinancialsCSV}
          className="p-5 rounded-2xl glass-card hover:bg-white/10 border border-white/10 hover:border-cyan-500/50 flex items-center justify-between transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div className="text-left">
              <p className="text-sm font-bold text-white group-hover:text-cyan-400 transition-colors">
                Export Financials CSV
              </p>
              <p className="text-xs text-white/50">Payments & Expenses spreadsheet</p>
            </div>
          </div>
          <Download className="w-4 h-4 text-white/40 group-hover:text-cyan-400" />
        </button>

        <button
          onClick={exportMembersCSV}
          className="p-5 rounded-2xl glass-card hover:bg-white/10 border border-white/10 hover:border-emerald-500/50 flex items-center justify-between transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div className="text-left">
              <p className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors">
                Export Members CSV
              </p>
              <p className="text-xs text-white/50">Full member database dump</p>
            </div>
          </div>
          <Download className="w-4 h-4 text-white/40 group-hover:text-emerald-400" />
        </button>
      </div>
    </div>
  );
};
