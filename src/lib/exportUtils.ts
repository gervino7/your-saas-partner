/**
 * Export utilities for CSV, Excel (XLSX) and PDF exports.
 * Uses native CSV-based Excel export to avoid vulnerable xlsx dependency.
 */
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
  // Use semicolon separator for French locale Excel compatibility
  const header = cols.map((c) => `"${c.label}"`).join(';');
  const rows = data.map((row) =>
    cols.map((c) => {
      const val = row[c.key];
      if (val == null) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    }).join(';')
  );
  const csvContent = [header, ...rows].join('\r\n');
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, `${filename}.csv`);
}

// ── XLSX (Tab-separated values with .xls extension for native Excel opening) ──
export function exportToXLSX(data: Record<string, any>[], filename: string, columns?: ExportColumn[]) {
  if (data.length === 0) return;
  const cols = columns ?? Object.keys(data[0]).map((k) => ({ key: k, label: k }));

  // Build simple HTML table that Excel can open natively
  let html = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:spreadsheet">';
  html += '<head><meta charset="UTF-8"></head><body><table border="1">';
  html += '<tr>' + cols.map((c) => `<th style="font-weight:bold;background:#e2e8f0">${escapeHtml(c.label)}</th>`).join('') + '</tr>';
  data.forEach((row) => {
    html += '<tr>' + cols.map((c) => {
      const val = row[c.key];
      return `<td>${escapeHtml(val == null ? '' : String(val))}</td>`;
    }).join('') + '</tr>';
  });
  html += '</table></body></html>';

  const blob = new Blob(['\uFEFF' + html], { type: 'application/vnd.ms-excel;charset=utf-8;' });
  downloadBlob(blob, `${filename}.xls`);
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
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
