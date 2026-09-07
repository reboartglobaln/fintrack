import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Transaction, User } from '../types';
import { formatCurrency, formatDate } from './formatters';

export function exportTransactionsPDF(
  transactions: Transaction[],
  user: User | null,
  periodText: string = 'Semua Periode',
  currencyCode: string = 'IDR',
  exchangeRate: number = 1
): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // Calculate summary totals
  const totalIncome = transactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = transactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);
  const netBalance = totalIncome - totalExpense;

  // Header banner
  doc.setFillColor(14, 165, 233); // Primary #0ea5e9
  doc.rect(0, 0, 210, 24, 'F');

  // Title
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('FinTrack - Laporan Keuangan Pribadi', 14, 15);

  // Subheader info
  doc.setTextColor(51, 65, 85);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Pemilik Rekening: ${user?.name || 'Pengguna FinTrack'} (${user?.email || '-'})`, 14, 32);
  doc.text(`Periode Laporan: ${periodText}`, 14, 38);
  doc.text(`Tanggal Cetak: ${formatDate(new Date().toISOString(), 'long')}`, 14, 44);

  // Summary box
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, 48, 182, 22, 2, 2, 'FD');

  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text('TOTAL PEMASUKAN', 20, 56);
  doc.text('TOTAL PENGELUARAN', 80, 56);
  doc.text('SALDO BERSIH (NET)', 140, 56);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(16, 185, 129); // green
  doc.text(formatCurrency(totalIncome, currencyCode, exchangeRate), 20, 64);

  doc.setTextColor(239, 68, 68); // red
  doc.text(formatCurrency(totalExpense, currencyCode, exchangeRate), 80, 64);

  doc.setTextColor(14, 165, 233); // blue
  doc.text(formatCurrency(netBalance, currencyCode, exchangeRate), 140, 64);

  // Table rows
  const tableData = transactions.map((t, idx) => [
    idx + 1,
    formatDate(t.date, 'short'),
    t.description,
    t.category?.name || 'Umum',
    t.type === 'income' ? 'Pemasukan' : 'Pengeluaran',
    formatCurrency(t.amount, currencyCode, exchangeRate),
  ]);

  autoTable(doc, {
    startY: 76,
    head: [['No', 'Tanggal', 'Deskripsi', 'Kategori', 'Tipe', 'Nominal']],
    body: tableData,
    theme: 'striped',
    headStyles: {
      fillColor: [14, 165, 233],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9,
    },
    bodyStyles: {
      fontSize: 9,
      textColor: [51, 65, 85],
    },
    columnStyles: {
      0: { cellWidth: 12, halign: 'center' },
      1: { cellWidth: 26 },
      2: { cellWidth: 'auto' },
      3: { cellWidth: 34 },
      4: { cellWidth: 28 },
      5: { cellWidth: 38, halign: 'right', fontStyle: 'bold' },
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    margin: { left: 14, right: 14 },
    didDrawPage: (data) => {
      // Footer page numbering
      const pageCount = (doc as any).internal.getNumberOfPages();
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(
        `Halaman ${data.pageNumber} dari ${pageCount} - Dicetak secara otomatis oleh FinTrack`,
        14,
        290
      );
    },
  });

  doc.save(`FinTrack_Laporan_${new Date().toISOString().split('T')[0]}.pdf`);
}
