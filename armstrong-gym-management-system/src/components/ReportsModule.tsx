import React, { useRef, useState } from 'react';
import {
  BarChart3,
  Download,
  FileSpreadsheet,
  FileText,
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
  const printAreaRef = useRef<HTMLDivElement>(null);

  // ── Date range filter ──────────────────────────────────────────────────────
  const filterByRange = <T extends { date: string }>(items: T[]): T[] => {
    const today = new Date();
    const year  = today.getFullYear();
    const month = today.getMonth();
    if (range === 'This Month') {
      const prefix = `${year}-${String(month + 1).padStart(2, '0')}`;
      return items.filter((i) => i.date.startsWith(prefix));
    }
    if (range === 'Last Month') {
      const d = new Date(year, month - 1, 1);
      const prefix = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      return items.filter((i) => i.date.startsWith(prefix));
    }
    if (range === 'This Year') return items.filter((i) => i.date.startsWith(`${year}-`));
    return items;
  };

  const filteredPayments = filterByRange<Payment>(payments);
  const filteredExpenses = filterByRange<Expense>(expenses);

  const totalIncome   = filteredPayments.reduce((s, p) => s + Number(p.amount), 0);
  const totalExpenses = filteredExpenses.reduce((s, e) => s + Number(e.amount), 0);
  const netProfit     = totalIncome - totalExpenses;

  // ── Helpers ────────────────────────────────────────────────────────────────
  const downloadFile = (data: string, filename: string, type: string) => {
    const blob = new Blob([data], { type });
    const url  = URL.createObjectURL(blob);
    const a    = Object.assign(document.createElement('a'), { href: url, download: filename });
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── CSV exports ────────────────────────────────────────────────────────────
  const exportMembersCSV = () => {
    const csv = Papa.unparse(members.map((m) => ({
      ID: m.id, Name: m.name, Phone: m.phone, Email: m.email,
      PlanType: m.planType, PlanCost: m.planCost,
      AmountPaid: m.amountPaid, RemainingBalance: m.remainingBalance,
      StartDate: m.startDate, ExpiryDate: m.expiryDate, Status: m.status,
    })));
    downloadFile(csv, `Armstrong_Gym_Members_${range}.csv`, 'text/csv');
    toast.success('Members CSV downloaded!');
  };

  const exportFinancialsCSV = () => {
    const rows = [
      ...filteredPayments.map((p) => ({
        Type: 'INCOME', ID: p.id, MemberID: p.memberId, Name: p.memberName,
        CategoryOrMethod: p.paymentMethod, Date: p.date, Amount: p.amount, Notes: p.notes,
      })),
      ...filteredExpenses.map((e) => ({
        Type: 'EXPENSE', ID: e.id, MemberID: 'N/A', Name: e.title,
        CategoryOrMethod: e.category, Date: e.date, Amount: -e.amount, Notes: e.notes,
      })),
    ];
    downloadFile(Papa.unparse(rows), `Armstrong_Gym_Financials_${range}.csv`, 'text/csv');
    toast.success('Financials CSV downloaded!');
  };

  // ── PDF export (jsPDF) ─────────────────────────────────────────────────────
  const exportPDFReport = () => {
    try {
      const doc = new jsPDF();
      doc.setFontSize(18);
      doc.text('ARMSTRONG GYM MANAGEMENT SYSTEM', 14, 20);
      doc.setFontSize(12);
      doc.text(`Executive Summary Report — ${range}`, 14, 28);
      doc.text(`Generated: ${new Date().toLocaleDateString('en-IN')}`, 14, 34);
      doc.setFontSize(10);
      doc.text('─'.repeat(80), 14, 40);
      doc.text(`Total Income:    ₹${totalIncome.toLocaleString('en-IN')}`, 14, 48);
      doc.text(`Total Expenses:  ₹${totalExpenses.toLocaleString('en-IN')}`, 14, 56);
      doc.text(`Net Profit:      ₹${netProfit.toLocaleString('en-IN')}`, 14, 64);
      doc.text(`Total Members:   ${members.length}`, 14, 72);
      doc.text('─'.repeat(80), 14, 80);
      doc.setFontSize(12);
      doc.text('Recent Payments:', 14, 90);
      let y = 100;
      doc.setFontSize(9);
      filteredPayments.slice(0, 15).forEach((p, i) => {
        doc.text(
          `${i + 1}. ${p.id} | ${p.memberName} (${p.memberId}) | ${p.paymentMethod} | ₹${p.amount}`,
          14, y
        );
        y += 7;
        if (y > 270) { doc.addPage(); y = 20; }
      });
      doc.save(`Armstrong_Gym_Report_${range}.pdf`);
      toast.success('PDF Report downloaded!');
    } catch (err: any) {
      toast.error('PDF generation failed: ' + err.message);
    }
  };

  // ── Browser print ──────────────────────────────────────────────────────────
  // Instead of window.print() on the whole page, we inject only the print-area
  // content into a hidden iframe, then print that frame. This avoids the
  // sidebar / topbar appearing in the printout without a media-query teardown.
  const handlePrint = () => {
    const area = printAreaRef.current;
    if (!area) return;

    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:none';
    document.body.appendChild(iframe);

    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) { document.body.removeChild(iframe); return; }

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <title>Armstrong Gym — ${range} Report</title>
        <style>
          body { font-family: Arial, sans-serif; font-size: 12pt; color: #000; margin: 20pt; }
          h1 { font-size: 16pt; margin-bottom: 4pt; }
          h2 { font-size: 13pt; margin: 12pt 0 4pt; }
          p  { margin: 2pt 0; font-size: 10pt; }
          table { border-collapse: collapse; width: 100%; margin-top: 8pt; }
          th, td { border: 1px solid #bbb; padding: 5pt 7pt; font-size: 9pt; text-align: left; }
          thead tr { background: #f0f0f0; }
          .kpis { display: flex; gap: 16pt; margin: 10pt 0; }
          .kpi  { flex: 1; border: 1px solid #ccc; padding: 8pt; border-radius: 4pt; }
          .kpi .val { font-size: 18pt; font-weight: 900; margin: 4pt 0; }
          .income  .val { color: #16a34a; }
          .expense .val { color: #dc2626; }
          .profit  .val { color: ${netProfit >= 0 ? '#16a34a' : '#dc2626'}; }
          @media print { body { margin: 0; } }
        </style>
      </head>
      <body>
        <h1>Armstrong Gym &amp; Fitness Club</h1>
        <p>Executive Financial Report &mdash; <strong>${range}</strong></p>
        <p>Generated: ${new Date().toLocaleDateString('en-IN', { dateStyle: 'long' })}</p>

        <div class="kpis">
          <div class="kpi income">
            <div style="font-size:9pt;color:#666;text-transform:uppercase">Total Income</div>
            <div class="val">₹${totalIncome.toLocaleString('en-IN')}</div>
            <div style="font-size:9pt;color:#666">${filteredPayments.length} transactions</div>
          </div>
          <div class="kpi expense">
            <div style="font-size:9pt;color:#666;text-transform:uppercase">Total Expenses</div>
            <div class="val">₹${totalExpenses.toLocaleString('en-IN')}</div>
            <div style="font-size:9pt;color:#666">${filteredExpenses.length} vouchers</div>
          </div>
          <div class="kpi profit">
            <div style="font-size:9pt;color:#666;text-transform:uppercase">Net Profit</div>
            <div class="val">₹${netProfit.toLocaleString('en-IN')}</div>
            <div style="font-size:9pt;color:#666">Income minus expenses</div>
          </div>
        </div>

        <h2>Payment Transactions (${filteredPayments.length})</h2>
        <table>
          <thead><tr><th>#</th><th>ID</th><th>Member</th><th>Method</th><th>Date</th><th>Amount</th></tr></thead>
          <tbody>
            ${filteredPayments.map((p, i) => `
              <tr>
                <td>${i + 1}</td><td>${p.id}</td>
                <td>${p.memberName} (${p.memberId})</td>
                <td>${p.paymentMethod}</td>
                <td>${p.date}</td>
                <td>₹${Number(p.amount).toLocaleString('en-IN')}</td>
              </tr>`).join('')}
          </tbody>
        </table>

        <h2 style="margin-top:16pt">Expense Vouchers (${filteredExpenses.length})</h2>
        <table>
          <thead><tr><th>#</th><th>ID</th><th>Title</th><th>Category</th><th>Date</th><th>Amount</th></tr></thead>
          <tbody>
            ${filteredExpenses.map((e, i) => `
              <tr>
                <td>${i + 1}</td><td>${e.id}</td>
                <td>${e.title}</td>
                <td>${e.category}</td>
                <td>${e.date}</td>
                <td>₹${Number(e.amount).toLocaleString('en-IN')}</td>
              </tr>`).join('')}
          </tbody>
        </table>
      </body></html>
    `);
    doc.close();

    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
    setTimeout(() => document.body.removeChild(iframe), 1000);
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 pb-12">
      {/* Screenreader-only printable region — used by handlePrint */}
      <div ref={printAreaRef} className="print-area hidden" aria-hidden="true" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-emerald-400" aria-hidden="true" />
            Financial &amp; Attendance Analytics
          </h1>
          <p className="text-xs text-white/50">
            Generate executive profit reports, export PDF statements &amp; CSV exports
          </p>
        </div>

        {/* Range pills */}
        <div
          role="group"
          aria-label="Report date range"
          className="flex items-center gap-2 bg-black/60 p-1.5 rounded-xl border border-white/10"
        >
          {(['This Month', 'Last Month', 'This Year', 'All Time'] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              aria-pressed={range === r}
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

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6" role="region" aria-label="Financial summary">
        <div className="glass-card border border-white/10 rounded-2xl p-5 space-y-2">
          <p className="text-xs text-white/50 font-semibold uppercase tracking-wider">
            Total Income ({range})
          </p>
          <p className="text-3xl font-black text-emerald-400 font-mono">
            ₹{totalIncome.toLocaleString('en-IN')}
          </p>
          <p className="text-[11px] text-white/40">{filteredPayments.length} transactions</p>
        </div>

        <div className="glass-card border border-white/10 rounded-2xl p-5 space-y-2">
          <p className="text-xs text-white/50 font-semibold uppercase tracking-wider">
            Total Expenses ({range})
          </p>
          <p className="text-3xl font-black text-rose-400 font-mono">
            ₹{totalExpenses.toLocaleString('en-IN')}
          </p>
          <p className="text-[11px] text-white/40">{filteredExpenses.length} vouchers</p>
        </div>

        <div className="glass-card border border-white/10 rounded-2xl p-5 space-y-2">
          <p className="text-xs text-white/50 font-semibold uppercase tracking-wider">
            Net Profit ({range})
          </p>
          <p className={`text-3xl font-black font-mono ${netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            ₹{netProfit.toLocaleString('en-IN')}
          </p>
          <p className="text-[11px] text-white/40">Income minus operational expenses</p>
        </div>
      </div>

      {/* Export buttons */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Print */}
        <button
          onClick={handlePrint}
          className="p-5 rounded-2xl glass-card hover:bg-white/10 border border-white/10 hover:border-amber-500/50 flex items-center justify-between transition-all group"
          aria-label="Print financial report"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <Printer className="w-5 h-5" aria-hidden="true" />
            </div>
            <div className="text-left">
              <p className="text-sm font-bold text-white group-hover:text-amber-400 transition-colors">
                Print Report
              </p>
              <p className="text-xs text-white/50">Browser print dialog</p>
            </div>
          </div>
        </button>

        {/* PDF */}
        <button
          onClick={exportPDFReport}
          className="p-5 rounded-2xl glass-card hover:bg-white/10 border border-white/10 hover:border-[#E51924]/50 flex items-center justify-between transition-all group"
          aria-label="Export executive PDF report"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#E51924]/20 text-[#E51924] flex items-center justify-center">
              <FileText className="w-5 h-5" aria-hidden="true" />
            </div>
            <div className="text-left">
              <p className="text-sm font-bold text-white group-hover:text-[#E51924] transition-colors">
                Export PDF
              </p>
              <p className="text-xs text-white/50">Formal printable statement</p>
            </div>
          </div>
          <Download className="w-4 h-4 text-white/40 group-hover:text-[#E51924]" aria-hidden="true" />
        </button>

        {/* Financials CSV */}
        <button
          onClick={exportFinancialsCSV}
          className="p-5 rounded-2xl glass-card hover:bg-white/10 border border-white/10 hover:border-cyan-500/50 flex items-center justify-between transition-all group"
          aria-label="Export financials CSV"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5" aria-hidden="true" />
            </div>
            <div className="text-left">
              <p className="text-sm font-bold text-white group-hover:text-cyan-400 transition-colors">
                Financials CSV
              </p>
              <p className="text-xs text-white/50">Payments &amp; Expenses</p>
            </div>
          </div>
          <Download className="w-4 h-4 text-white/40 group-hover:text-cyan-400" aria-hidden="true" />
        </button>

        {/* Members CSV */}
        <button
          onClick={exportMembersCSV}
          className="p-5 rounded-2xl glass-card hover:bg-white/10 border border-white/10 hover:border-emerald-500/50 flex items-center justify-between transition-all group"
          aria-label="Export members CSV"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5" aria-hidden="true" />
            </div>
            <div className="text-left">
              <p className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors">
                Members CSV
              </p>
              <p className="text-xs text-white/50">Full member database</p>
            </div>
          </div>
          <Download className="w-4 h-4 text-white/40 group-hover:text-emerald-400" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
};
