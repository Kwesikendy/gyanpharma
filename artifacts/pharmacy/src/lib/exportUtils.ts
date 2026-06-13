import type { Medicine, DispensingRecord, StockEntry } from "./firestore";

function escapeCsv(val: unknown): string {
  const str = val === null || val === undefined ? "" : String(val);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function rowToCsv(row: unknown[]): string {
  return row.map(escapeCsv).join(",");
}

function download(filename: string, content: string, mime = "text/csv") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportMedicinesToCsv(medicines: Medicine[]) {
  const headers = ["Name", "Category", "Quantity", "Unit", "Supplier", "Expiry Date", "Price", "Batch No.", "Status", "Low Stock Threshold"];
  const rows = medicines.map((m) => [
    m.name, m.category, m.quantity, m.unit, m.supplierName, m.expiryDate, m.price, m.batchNumber, m.status, m.lowStockThreshold,
  ]);
  const csv = [rowToCsv(headers), ...rows.map(rowToCsv)].join("\n");
  download("medicines.csv", csv);
}

export function exportDispensingToCsv(records: DispensingRecord[]) {
  const headers = ["Medicine", "Quantity", "Unit Price", "Total Price", "Patient", "Dispensed By", "Date", "Notes"];
  const rows = records.map((r) => [
    r.medicineName, r.quantityDispensed, r.unitPrice || 0, r.totalPrice || 0, r.patientName || "", r.dispensedByName, r.date, r.notes || "",
  ]);
  const csv = [rowToCsv(headers), ...rows.map(rowToCsv)].join("\n");
  download("dispensing_records.csv", csv);
}

export function exportStockEntriesToCsv(entries: StockEntry[]) {
  const headers = ["Medicine", "Qty Received", "Supplier", "Batch No.", "Expiry Date", "Date Received", "Created By"];
  const rows = entries.map((e) => [
    e.medicineName, e.quantityReceived, e.supplierName, e.batchNumber, e.expiryDate, e.dateReceived, e.createdBy,
  ]);
  const csv = [rowToCsv(headers), ...rows.map(rowToCsv)].join("\n");
  download("stock_entries.csv", csv);
}
