import ExcelJS from 'exceljs';
import { format } from 'date-fns';
import type { ReportData } from './types';

const BRAND_BLUE = 'FF276EAC';
const BRAND_DARK = 'FF1A2B42';
const ROW_ALT = 'FFF7FAFD';
const RED = 'FFEF4444';
const GREEN = 'FF22C55E';

function headerStyle(wb: ExcelJS.Workbook): Partial<ExcelJS.Style> {
  void wb;
  return {
    font: { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND_BLUE } },
    alignment: { horizontal: 'center', vertical: 'middle' },
    border: {
      bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
    },
  };
}

function numFmt(currency: string) {
  return currency === 'INR' ? '₹#,##0.00' : 'AED #,##0.00';
}

export async function generateExcel(data: ReportData): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'PropTrack';
  wb.created = new Date();

  const dateRange = `${format(new Date(data.params.date_from), 'dd MMM yyyy')} – ${format(new Date(data.params.date_to), 'dd MMM yyyy')}`;
  const hs = headerStyle(wb);

  // ── Sheet 1: Summary ──────────────────────────────────────────────
  const summary = wb.addWorksheet('Summary');
  summary.columns = [
    { key: 'a', width: 30 },
    { key: 'b', width: 18 },
    { key: 'c', width: 18 },
    { key: 'd', width: 18 },
  ];

  summary.mergeCells('A1:D1');
  const titleCell = summary.getCell('A1');
  titleCell.value = 'PropTrack — Financial Summary';
  titleCell.style = {
    font: { bold: true, size: 14, color: { argb: BRAND_DARK } },
    alignment: { horizontal: 'left', vertical: 'middle' },
  };
  summary.getRow(1).height = 28;

  summary.mergeCells('A2:D2');
  summary.getCell('A2').value = dateRange;
  summary.getCell('A2').style = {
    font: { size: 10, color: { argb: 'FF6B7280' } },
    alignment: { horizontal: 'left' },
  };
  summary.getRow(2).height = 18;
  summary.addRow([]);

  // Property summaries
  const headerRow = summary.addRow(['Property', 'Total Income (Base)', 'Total Expenses (Base)', 'Net Profit (Base)']);
  headerRow.eachCell((cell) => Object.assign(cell, { style: hs }));
  headerRow.height = 20;

  data.property_summaries.forEach((ps, i) => {
    const r = summary.addRow([
      ps.property_name,
      ps.total_income_base,
      ps.total_expenses_base,
      ps.net_profit_base,
    ]);
    if (i % 2 !== 0) {
      r.eachCell((c) => {
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ROW_ALT } };
      });
    }
    r.getCell(2).numFmt = numFmt(ps.base_currency);
    r.getCell(3).numFmt = numFmt(ps.base_currency);
    const profitCell = r.getCell(4);
    profitCell.numFmt = numFmt(ps.base_currency);
    profitCell.font = { bold: true, color: { argb: ps.net_profit_base >= 0 ? GREEN : RED } };
  });

  const totRow = summary.addRow(['TOTAL', data.grand_total_income, data.grand_total_expenses, data.grand_net_profit]);
  totRow.font = { bold: true };
  totRow.eachCell((c) => {
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } };
  });
  const firstCurrency = data.property_summaries[0]?.base_currency ?? 'AED';
  totRow.getCell(2).numFmt = numFmt(firstCurrency);
  totRow.getCell(3).numFmt = numFmt(firstCurrency);
  totRow.getCell(4).numFmt = numFmt(firstCurrency);
  totRow.getCell(4).font = { bold: true, color: { argb: data.grand_net_profit >= 0 ? GREEN : RED } };

  // ── Sheet 2: Income ───────────────────────────────────────────────
  const incomeWs = wb.addWorksheet('Income');
  incomeWs.columns = [
    { key: 'date', header: 'Date', width: 14 },
    { key: 'property', header: 'Property', width: 22 },
    { key: 'room', header: 'Room', width: 16 },
    { key: 'source', header: 'Source', width: 18 },
    { key: 'amount', header: 'Amount', width: 14 },
    { key: 'currency', header: 'Currency', width: 10 },
    { key: 'amount_base', header: 'Base Amount', width: 14 },
    { key: 'base_currency', header: 'Base Currency', width: 12 },
    { key: 'notes', header: 'Notes', width: 30 },
  ];
  const incomeHeader = incomeWs.getRow(1);
  incomeHeader.eachCell((c) => Object.assign(c, { style: hs }));
  incomeHeader.height = 20;

  data.income.forEach((item, i) => {
    const r = incomeWs.addRow({
      date: item.date,
      property: item.property_name,
      room: item.room_name ?? '',
      source: item.income_source.replace(/_/g, ' '),
      amount: item.amount,
      currency: item.currency,
      amount_base: item.amount_base,
      base_currency: item.base_currency,
      notes: item.notes ?? '',
    });
    if (i % 2 !== 0) {
      r.eachCell((c) => { c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ROW_ALT } }; });
    }
    r.getCell('amount').numFmt = numFmt(item.currency);
    r.getCell('amount_base').numFmt = numFmt(item.base_currency);
  });

  if (data.income.length > 0) {
    const totals = incomeWs.addRow({ date: 'TOTAL', amount_base: data.grand_total_income });
    totals.font = { bold: true };
    totals.getCell('amount_base').numFmt = numFmt(firstCurrency);
  }

  // ── Sheet 3: Expenses ─────────────────────────────────────────────
  const expWs = wb.addWorksheet('Expenses');
  expWs.columns = [
    { key: 'date', header: 'Date', width: 14 },
    { key: 'property', header: 'Property', width: 22 },
    { key: 'room', header: 'Room', width: 16 },
    { key: 'category', header: 'Category', width: 18 },
    { key: 'vendor', header: 'Vendor', width: 18 },
    { key: 'payment', header: 'Payment', width: 14 },
    { key: 'amount', header: 'Amount', width: 14 },
    { key: 'currency', header: 'Currency', width: 10 },
    { key: 'amount_base', header: 'Base Amount', width: 14 },
    { key: 'base_currency', header: 'Base Currency', width: 12 },
    { key: 'notes', header: 'Notes', width: 30 },
  ];
  const expHeader = expWs.getRow(1);
  expHeader.eachCell((c) => Object.assign(c, { style: hs }));
  expHeader.height = 20;

  data.expenses.forEach((item, i) => {
    const r = expWs.addRow({
      date: item.date,
      property: item.property_name,
      room: item.room_name ?? '',
      category: item.category_name,
      vendor: item.vendor ?? '',
      payment: item.payment_method.replace(/_/g, ' '),
      amount: item.amount,
      currency: item.currency,
      amount_base: item.amount_base,
      base_currency: item.base_currency,
      notes: item.notes ?? '',
    });
    if (i % 2 !== 0) {
      r.eachCell((c) => { c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ROW_ALT } }; });
    }
    r.getCell('amount').numFmt = numFmt(item.currency);
    r.getCell('amount_base').numFmt = numFmt(item.base_currency);
  });

  if (data.expenses.length > 0) {
    const totals = expWs.addRow({ date: 'TOTAL', amount_base: data.grand_total_expenses });
    totals.font = { bold: true };
    totals.getCell('amount_base').numFmt = numFmt(firstCurrency);
  }

  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}
