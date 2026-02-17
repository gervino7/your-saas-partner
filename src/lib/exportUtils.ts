/**
 * Export utilities for CSV, Excel (XLSX) and PDF exports.
 */
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface ExportColumn {
  key: string;
  label: string;
}

// ── CSV ──
export function exportToCSV(data: Record<string, any>[], filename: string, columns?: ExportColumn[]) {
  if (data.length === 0) return;
  const cols = columns ?? Object.keys(data[0]).map((k) => ({ key: k, label: k }));
  const header = cols.map((c) => `"${c.label}"`).join(',');
  const rows = data.map((row) =>
    cols.map((c) => {
      const val = row[c.key];
      if (val == null) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    }).join(',')
  );
  const csvContent = [header, ...rows].join('\n');
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, `${filename}.csv`);
}

// ── XLSX (SheetJS) ──
export function exportToXLSX(data: Record<string, any>[], filename: string, columns?: ExportColumn[]) {
  if (data.length === 0) return;
  const cols = columns ?? Object.keys(data[0]).map((k) => ({ key: k, label: k }));

  const sheetData = data.map((row) => {
    const obj: Record<string, any> = {};
    cols.forEach((c) => { obj[c.label] = row[c.key] ?? ''; });
    return obj;
  });

  const ws = XLSX.utils.json_to_sheet(sheetData);
  // Auto-size columns
  const colWidths = cols.map((c) => {
    const maxLen = Math.max(
      c.label.length,
      ...data.map((r) => String(r[c.key] ?? '').length)
    );
    return { wch: Math.min(maxLen + 2, 40) };
  });
  ws['!cols'] = colWidths;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Données');
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

// ── PDF (jsPDF + autoTable) ──
export function exportToPDF(data: Record<string, any>[], filename: string, columns?: ExportColumn[], title?: string) {
  if (data.length === 0) return;
  const cols = columns ?? Object.keys(data[0]).map((k) => ({ key: k, label: k }));

  const doc = new jsPDF({ orientation: cols.length > 6 ? 'landscape' : 'portrait' });

  // Title
  if (title) {
    doc.setFontSize(14);
    doc.text(title, 14, 18);
  }

  const head = [cols.map((c) => c.label)];
  const body = data.map((row) => cols.map((c) => String(row[c.key] ?? '')));

  autoTable(doc, {
    head,
    body,
    startY: title ? 24 : 14,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [30, 64, 175], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [245, 247, 250] },
    margin: { left: 10, right: 10 },
  });

  // Footer
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(150);
    doc.text(
      `MissionFlow — Exporté le ${new Date().toLocaleDateString('fr-FR')} — Page ${i}/${pageCount}`,
      doc.internal.pageSize.getWidth() / 2, doc.internal.pageSize.getHeight() - 6, { align: 'center' }
    );
  }

  doc.save(`${filename}.pdf`);
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
