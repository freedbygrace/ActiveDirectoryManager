import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface DataPoint {
  [key: string]: any;
}

export interface ExportConfig {
  xAxis?: string;
  yAxis?: string | string[];
  dimensions?: string[];
  metrics?: string[];
  colors?: string[];
  showLegend?: boolean;
  stacked?: boolean;
  precision?: number;
}

/**
 * Export data to Excel file
 * @param data Array of data objects
 * @param title Title of the export (used for filename)
 */
export function exportToExcel(data: DataPoint[], title: string): void {
  if (!data || data.length === 0) {
    console.error('No data to export');
    return;
  }

  // Create a worksheet
  const worksheet = XLSX.utils.json_to_sheet(data);
  
  // Create a workbook
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Data');
  
  // Generate Excel file and trigger download
  const fileName = `${sanitizeFilename(title)}_${formatDate(new Date())}.xlsx`;
  XLSX.writeFile(workbook, fileName);
}

/**
 * Export data to CSV file
 * @param data Array of data objects
 * @param title Title of the export (used for filename)
 */
export function exportToCSV(data: DataPoint[], title: string): void {
  if (!data || data.length === 0) {
    console.error('No data to export');
    return;
  }
  
  // Convert to CSV
  const worksheet = XLSX.utils.json_to_sheet(data);
  const csv = XLSX.utils.sheet_to_csv(worksheet);
  
  // Create a blob and trigger download
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const fileName = `${sanitizeFilename(title)}_${formatDate(new Date())}.csv`;
  saveAs(blob, fileName);
}

/**
 * Export data to PDF file
 * @param data Array of data objects
 * @param title Title of the export (used for filename)
 * @param config Configuration for the export
 */
export function exportToPDF(data: DataPoint[], title: string, config?: ExportConfig): void {
  if (!data || data.length === 0) {
    console.error('No data to export');
    return;
  }
  
  // Create PDF document
  const doc = new jsPDF();
  
  // Set title
  doc.setFontSize(16);
  doc.text(title, 14, 22);
  doc.setFontSize(10);
  doc.text(`Generated on ${new Date().toLocaleString()}`, 14, 30);
  
  // Determine columns based on config
  let columns: string[] = [];
  if (config?.dimensions || config?.metrics) {
    columns = [...(config.dimensions || []), ...(config.metrics || [])];
  } else if (data.length > 0) {
    columns = Object.keys(data[0]);
  }
  
  // Convert data to rows for autotable
  const rows = data.map(item => columns.map(col => item[col] !== undefined ? String(item[col]) : ''));
  
  // Generate the table
  autoTable(doc, {
    head: [columns],
    body: rows,
    startY: 40,
    styles: {
      fontSize: 8,
      cellPadding: 2,
    },
    headStyles: {
      fillColor: [66, 139, 202],
    },
  });
  
  // Save the PDF
  const fileName = `${sanitizeFilename(title)}_${formatDate(new Date())}.pdf`;
  doc.save(fileName);
}

/**
 * Format date for filenames
 * @param date Date to format
 * @returns Formatted date string (YYYYMMDD_HHMMSS)
 */
function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  
  return `${year}${month}${day}_${hours}${minutes}${seconds}`;
}

/**
 * Sanitize a string for use as a filename
 * @param input Input string
 * @returns Sanitized string
 */
function sanitizeFilename(input: string): string {
  return input
    .replace(/[/\\?%*:|"<>]/g, '-') // Replace invalid characters with hyphens
    .replace(/\s+/g, '_')          // Replace spaces with underscores
    .trim();                        // Trim whitespace
}