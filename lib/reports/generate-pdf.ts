import React from 'react';
import fs from 'fs';
import path from 'path';
import { Document, Page, Text, View, Image, StyleSheet, renderToBuffer } from '@react-pdf/renderer';
import { format } from 'date-fns';
import type { ReportData } from './types';

async function readLogoAsDataUri(): Promise<string | null> {
  try {
    const logoPath = path.join(process.cwd(), 'public', 'logos', 'krystal-vista.png');
    const buffer = await fs.promises.readFile(logoPath);
    return `data:image/png;base64,${buffer.toString('base64')}`;
  } catch {
    return null;
  }
}

const styles = StyleSheet.create({
  page: { fontFamily: 'Helvetica', fontSize: 9, color: '#1A2B42', paddingHorizontal: 36, paddingVertical: 32, backgroundColor: '#FFFFFF' },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20, borderBottomWidth: 2, borderBottomColor: '#276EAC', paddingBottom: 10 },
  headerLeft: { flexDirection: 'column' },
  logo: { height: 40, maxWidth: 160, objectFit: 'contain' },
  appName: { fontSize: 16, fontWeight: 'bold', color: '#276EAC' },
  reportTitle: { fontSize: 10, color: '#4B5563', marginTop: 2 },
  headerRight: { fontSize: 8, color: '#6B7280', textAlign: 'right' },
  sectionTitle: { fontSize: 10, fontWeight: 'bold', color: '#276EAC', marginTop: 16, marginBottom: 6, paddingBottom: 3, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  tableHead: { flexDirection: 'row', backgroundColor: '#276EAC', paddingVertical: 5, paddingHorizontal: 4, borderRadius: 2 },
  tableHeadCell: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 8 },
  tableRow: { flexDirection: 'row', paddingVertical: 4, paddingHorizontal: 4 },
  tableRowAlt: { backgroundColor: '#F7FAFD' },
  tableCell: { fontSize: 8, color: '#374151' },
  tableCellRight: { fontSize: 8, color: '#374151', textAlign: 'right' },
  totalRow: { flexDirection: 'row', paddingVertical: 5, paddingHorizontal: 4, backgroundColor: '#FEF3C7', borderTopWidth: 1, borderTopColor: '#D1D5DB' },
  totalRowInr: { flexDirection: 'row', paddingVertical: 5, paddingHorizontal: 4, backgroundColor: '#F0FFF4', borderTopWidth: 1, borderTopColor: '#D1D5DB' },
  totalCell: { fontSize: 8, fontWeight: 'bold' },
  totalCellRight: { fontSize: 8, fontWeight: 'bold', textAlign: 'right' },
  // AED summary box — blue tint
  summaryBox: { backgroundColor: '#F0F9FF', borderWidth: 1, borderColor: '#BAE6FD', borderRadius: 4, padding: 10, marginBottom: 8 },
  // INR summary box — green tint
  summaryBoxInr: { backgroundColor: '#F0FFF4', borderWidth: 1, borderColor: '#A7F3D0', borderRadius: 4, padding: 10, marginBottom: 16 },
  summaryBoxLabel: { fontSize: 8, fontWeight: 'bold', color: '#276EAC', marginBottom: 6 },
  summaryBoxLabelInr: { fontSize: 8, fontWeight: 'bold', color: '#059669', marginBottom: 6 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 },
  summaryLabel: { fontSize: 9, color: '#4B5563' },
  summaryValue: { fontSize: 9, fontWeight: 'bold' },
  // Divider between currency groups in the property table
  currencyDivider: { flexDirection: 'row', alignItems: 'center', marginVertical: 4 },
  currencyDividerLine: { flex: 1, height: 1, backgroundColor: '#E5E7EB' },
  currencyDividerLabel: { fontSize: 7, color: '#9CA3AF', marginHorizontal: 8 },
  footer: { position: 'absolute', bottom: 20, left: 36, right: 36, flexDirection: 'row', justifyContent: 'space-between', color: '#9CA3AF', fontSize: 7, borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingTop: 6 },
  positive: { color: '#15803D' },
  negative: { color: '#DC2626' },
});

// Helvetica does not include ₹ — use 'INR ' prefix to avoid replacement character
function fmtCurrency(amount: number, currency: string): string {
  const sym = currency === 'INR' ? 'INR ' : 'AED ';
  return `${sym}${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function ReportDocument({ data, logoDataUri }: { data: ReportData; logoDataUri: string | null }) {
  const dateRange = `${format(new Date(data.params.date_from), 'dd MMM yyyy')} – ${format(new Date(data.params.date_to), 'dd MMM yyyy')}`;
  const generatedAt = format(new Date(data.generated_at), "dd MMM yyyy 'at' HH:mm '(UTC)'");

  const aedSummaries = data.property_summaries.filter(ps => ps.base_currency === 'AED');
  const inrSummaries = data.property_summaries.filter(ps => ps.base_currency === 'INR');
  const mixed = aedSummaries.length > 0 && inrSummaries.length > 0;
  const isGoaReport = inrSummaries.length > 0;

  // Per-currency totals derived from line items (avoids meaningless cross-currency addition)
  const aedIncome  = data.income.filter(i => i.base_currency === 'AED').reduce((s, i) => s + i.amount_base, 0);
  const inrIncome  = data.income.filter(i => i.base_currency === 'INR').reduce((s, i) => s + i.amount_base, 0);
  const aedExpenses = data.expenses.filter(e => e.base_currency === 'AED').reduce((s, e) => s + e.amount_base, 0);
  const inrExpenses = data.expenses.filter(e => e.base_currency === 'INR').reduce((s, e) => s + e.amount_base, 0);

  // Property-summary totals per currency
  const aedPropIncome   = aedSummaries.reduce((s, p) => s + p.total_income_base, 0);
  const aedPropExpenses = aedSummaries.reduce((s, p) => s + p.total_expenses_base, 0);
  const aedPropNet      = aedSummaries.reduce((s, p) => s + p.net_profit_base, 0);
  const inrPropIncome   = inrSummaries.reduce((s, p) => s + p.total_income_base, 0);
  const inrPropExpenses = inrSummaries.reduce((s, p) => s + p.total_expenses_base, 0);
  const inrPropNet      = inrSummaries.reduce((s, p) => s + p.net_profit_base, 0);

  // Build property-breakdown children as an array so we can conditionally include rows
  const propBreakdownRows: React.ReactElement[] = [];
  aedSummaries.forEach((ps, i) => {
    propBreakdownRows.push(
      React.createElement(
        View, { key: `aed-${ps.property_id}`, style: [styles.tableRow, ...(i % 2 !== 0 ? [styles.tableRowAlt] : [])] },
        React.createElement(Text, { style: [styles.tableCell,      { width: '40%' }] }, ps.property_name),
        React.createElement(Text, { style: [styles.tableCellRight, { width: '20%', color: '#15803D' }] }, fmtCurrency(ps.total_income_base, 'AED')),
        React.createElement(Text, { style: [styles.tableCellRight, { width: '20%', color: '#DC2626' }] }, fmtCurrency(ps.total_expenses_base, 'AED')),
        React.createElement(Text, { style: [styles.tableCellRight, { width: '20%' }, ps.net_profit_base >= 0 ? styles.positive : styles.negative] }, fmtCurrency(ps.net_profit_base, 'AED'))
      )
    );
  });
  if (mixed && aedSummaries.length > 0) {
    propBreakdownRows.push(
      React.createElement(
        View, { key: 'aed-subtotal', style: styles.totalRow },
        React.createElement(Text, { style: [styles.totalCell,      { width: '40%' }] }, 'UAE Total'),
        React.createElement(Text, { style: [styles.totalCellRight, { width: '20%', color: '#15803D' }] }, fmtCurrency(aedPropIncome, 'AED')),
        React.createElement(Text, { style: [styles.totalCellRight, { width: '20%', color: '#DC2626' }] }, fmtCurrency(aedPropExpenses, 'AED')),
        React.createElement(Text, { style: [styles.totalCellRight, { width: '20%' }, aedPropNet >= 0 ? styles.positive : styles.negative] }, fmtCurrency(aedPropNet, 'AED'))
      )
    );
  }
  if (mixed) {
    propBreakdownRows.push(
      React.createElement(
        View, { key: 'currency-divider', style: styles.currencyDivider },
        React.createElement(View, { style: styles.currencyDividerLine }),
        React.createElement(Text, { style: styles.currencyDividerLabel }, 'INDIA / GOA  (INR)'),
        React.createElement(View, { style: styles.currencyDividerLine })
      )
    );
  }
  inrSummaries.forEach((ps, i) => {
    propBreakdownRows.push(
      React.createElement(
        View, { key: `inr-${ps.property_id}`, style: [styles.tableRow, ...(i % 2 !== 0 ? [styles.tableRowAlt] : [])] },
        React.createElement(Text, { style: [styles.tableCell,      { width: '40%' }] }, ps.property_name),
        React.createElement(Text, { style: [styles.tableCellRight, { width: '20%', color: '#15803D' }] }, fmtCurrency(ps.total_income_base, 'INR')),
        React.createElement(Text, { style: [styles.tableCellRight, { width: '20%', color: '#DC2626' }] }, fmtCurrency(ps.total_expenses_base, 'INR')),
        React.createElement(Text, { style: [styles.tableCellRight, { width: '20%' }, ps.net_profit_base >= 0 ? styles.positive : styles.negative] }, fmtCurrency(ps.net_profit_base, 'INR'))
      )
    );
  });
  if (mixed && inrSummaries.length > 0) {
    propBreakdownRows.push(
      React.createElement(
        View, { key: 'inr-subtotal', style: styles.totalRowInr },
        React.createElement(Text, { style: [styles.totalCell,      { width: '40%' }] }, 'India / GOA Total'),
        React.createElement(Text, { style: [styles.totalCellRight, { width: '20%', color: '#15803D' }] }, fmtCurrency(inrPropIncome, 'INR')),
        React.createElement(Text, { style: [styles.totalCellRight, { width: '20%', color: '#DC2626' }] }, fmtCurrency(inrPropExpenses, 'INR')),
        React.createElement(Text, { style: [styles.totalCellRight, { width: '20%' }, inrPropNet >= 0 ? styles.positive : styles.negative] }, fmtCurrency(inrPropNet, 'INR'))
      )
    );
  }

  // Income table total rows
  const incomeTotalRows: React.ReactElement[] = [];
  if (aedIncome > 0) {
    incomeTotalRows.push(
      React.createElement(
        View, { key: 'aed-income-total', style: styles.totalRow },
        React.createElement(Text, { style: [styles.totalCell,      { width: '60%' }] }, mixed ? 'UAE Total (AED)' : 'TOTAL'),
        React.createElement(Text, { style: [styles.totalCellRight, { width: '20%' }] }, ''),
        React.createElement(Text, { style: [styles.totalCellRight, { width: '20%', color: '#15803D' }] }, fmtCurrency(aedIncome, 'AED'))
      )
    );
  }
  if (inrIncome > 0) {
    incomeTotalRows.push(
      React.createElement(
        View, { key: 'inr-income-total', style: styles.totalRowInr },
        React.createElement(Text, { style: [styles.totalCell,      { width: '60%' }] }, mixed ? 'India / GOA Total (INR)' : 'TOTAL'),
        React.createElement(Text, { style: [styles.totalCellRight, { width: '20%' }] }, ''),
        React.createElement(Text, { style: [styles.totalCellRight, { width: '20%', color: '#15803D' }] }, fmtCurrency(inrIncome, 'INR'))
      )
    );
  }

  // Expense table total rows
  const expenseTotalRows: React.ReactElement[] = [];
  if (aedExpenses > 0) {
    expenseTotalRows.push(
      React.createElement(
        View, { key: 'aed-exp-total', style: styles.totalRow },
        React.createElement(Text, { style: [styles.totalCell,      { width: '72%' }] }, mixed ? 'UAE Total (AED)' : 'TOTAL'),
        React.createElement(Text, { style: [styles.totalCellRight, { width: '14%' }] }, ''),
        React.createElement(Text, { style: [styles.totalCellRight, { width: '14%', color: '#DC2626' }] }, fmtCurrency(aedExpenses, 'AED'))
      )
    );
  }
  if (inrExpenses > 0) {
    expenseTotalRows.push(
      React.createElement(
        View, { key: 'inr-exp-total', style: styles.totalRowInr },
        React.createElement(Text, { style: [styles.totalCell,      { width: '72%' }] }, mixed ? 'India / GOA Total (INR)' : 'TOTAL'),
        React.createElement(Text, { style: [styles.totalCellRight, { width: '14%' }] }, ''),
        React.createElement(Text, { style: [styles.totalCellRight, { width: '14%', color: '#DC2626' }] }, fmtCurrency(inrExpenses, 'INR'))
      )
    );
  }

  return React.createElement(
    Document,
    { title: 'PropTrack Financial Report', author: 'PropTrack' },
    React.createElement(
      Page,
      { size: 'A4', style: styles.page },

      // ── Header ──────────────────────────────────────────────────────────────
      React.createElement(
        View, { style: styles.header },
        React.createElement(
          View, { style: styles.headerLeft },
          isGoaReport && logoDataUri
            ? React.createElement(Image, { style: styles.logo, src: logoDataUri })
            : React.createElement(Text, { style: styles.appName }, 'PropTrack'),
          React.createElement(Text, { style: styles.reportTitle }, `${data.params.report_type.toUpperCase()} REPORT · ${dateRange}`)
        ),
        React.createElement(View, { style: styles.headerRight },
          React.createElement(Text, null, `Generated: ${generatedAt}`)
        )
      ),

      // ── AED Summary Box ─────────────────────────────────────────────────────
      aedSummaries.length > 0 && React.createElement(
        View, { style: styles.summaryBox },
        mixed && React.createElement(Text, { style: styles.summaryBoxLabel }, 'UAE PROPERTIES  (AED)'),
        React.createElement(View, { style: styles.summaryRow },
          React.createElement(Text, { style: styles.summaryLabel }, 'Total Income'),
          React.createElement(Text, { style: [styles.summaryValue, styles.positive] }, fmtCurrency(aedPropIncome, 'AED'))
        ),
        React.createElement(View, { style: styles.summaryRow },
          React.createElement(Text, { style: styles.summaryLabel }, 'Total Expenses'),
          React.createElement(Text, { style: [styles.summaryValue, styles.negative] }, fmtCurrency(aedPropExpenses, 'AED'))
        ),
        React.createElement(View, { style: styles.summaryRow },
          React.createElement(Text, { style: [styles.summaryLabel, { fontWeight: 'bold' }] }, 'Net Profit'),
          React.createElement(Text, { style: [styles.summaryValue, aedPropNet >= 0 ? styles.positive : styles.negative] }, fmtCurrency(aedPropNet, 'AED'))
        )
      ),

      // ── INR Summary Box ─────────────────────────────────────────────────────
      inrSummaries.length > 0 && React.createElement(
        View, { style: mixed ? styles.summaryBoxInr : styles.summaryBox },
        mixed && React.createElement(Text, { style: styles.summaryBoxLabelInr }, 'INDIA / GOA PROPERTIES  (INR)'),
        React.createElement(View, { style: styles.summaryRow },
          React.createElement(Text, { style: styles.summaryLabel }, 'Total Income'),
          React.createElement(Text, { style: [styles.summaryValue, styles.positive] }, fmtCurrency(inrPropIncome, 'INR'))
        ),
        React.createElement(View, { style: styles.summaryRow },
          React.createElement(Text, { style: styles.summaryLabel }, 'Total Expenses'),
          React.createElement(Text, { style: [styles.summaryValue, styles.negative] }, fmtCurrency(inrPropExpenses, 'INR'))
        ),
        React.createElement(View, { style: styles.summaryRow },
          React.createElement(Text, { style: [styles.summaryLabel, { fontWeight: 'bold' }] }, 'Net Profit'),
          React.createElement(Text, { style: [styles.summaryValue, inrPropNet >= 0 ? styles.positive : styles.negative] }, fmtCurrency(inrPropNet, 'INR'))
        )
      ),

      // ── Property Breakdown ──────────────────────────────────────────────────
      data.property_summaries.length > 0 && React.createElement(
        View, null,
        React.createElement(Text, { style: styles.sectionTitle }, 'Property Breakdown'),
        React.createElement(
          View, { style: styles.tableHead },
          React.createElement(Text, { style: [styles.tableHeadCell, { width: '40%' }] }, 'Property'),
          React.createElement(Text, { style: [styles.tableHeadCell, { width: '20%', textAlign: 'right' }] }, 'Income'),
          React.createElement(Text, { style: [styles.tableHeadCell, { width: '20%', textAlign: 'right' }] }, 'Expenses'),
          React.createElement(Text, { style: [styles.tableHeadCell, { width: '20%', textAlign: 'right' }] }, 'Net Profit')
        ),
        ...propBreakdownRows
      ),

      // ── Income Records ──────────────────────────────────────────────────────
      data.income.length > 0 && React.createElement(
        View, null,
        React.createElement(Text, { style: styles.sectionTitle }, `Income (${data.income.length} records)`),
        React.createElement(
          View, { style: styles.tableHead },
          React.createElement(Text, { style: [styles.tableHeadCell, { width: '12%' }] }, 'Date'),
          React.createElement(Text, { style: [styles.tableHeadCell, { width: '28%' }] }, 'Property'),
          React.createElement(Text, { style: [styles.tableHeadCell, { width: '20%' }] }, 'Source'),
          React.createElement(Text, { style: [styles.tableHeadCell, { width: '20%', textAlign: 'right' }] }, 'Amount'),
          React.createElement(Text, { style: [styles.tableHeadCell, { width: '20%', textAlign: 'right' }] }, 'Base Amount')
        ),
        ...data.income.map((item, i) =>
          React.createElement(
            View, { key: i, style: [styles.tableRow, ...(i % 2 !== 0 ? [styles.tableRowAlt] : [])] },
            React.createElement(Text, { style: [styles.tableCell,      { width: '12%' }] }, format(new Date(item.date), 'dd/MM/yy')),
            React.createElement(Text, { style: [styles.tableCell,      { width: '28%' }] }, item.property_name),
            React.createElement(Text, { style: [styles.tableCell,      { width: '20%' }] }, item.income_source.replace(/_/g, ' ')),
            React.createElement(Text, { style: [styles.tableCellRight, { width: '20%' }] }, fmtCurrency(item.amount, item.currency)),
            React.createElement(Text, { style: [styles.tableCellRight, { width: '20%' }] }, fmtCurrency(item.amount_base, item.base_currency))
          )
        ),
        ...incomeTotalRows
      ),

      // ── Expense Records ─────────────────────────────────────────────────────
      data.expenses.length > 0 && React.createElement(
        View, null,
        React.createElement(Text, { style: styles.sectionTitle }, `Expenses (${data.expenses.length} records)`),
        React.createElement(
          View, { style: styles.tableHead },
          React.createElement(Text, { style: [styles.tableHeadCell, { width: '12%' }] }, 'Date'),
          React.createElement(Text, { style: [styles.tableHeadCell, { width: '24%' }] }, 'Property'),
          React.createElement(Text, { style: [styles.tableHeadCell, { width: '20%' }] }, 'Category'),
          React.createElement(Text, { style: [styles.tableHeadCell, { width: '16%' }] }, 'Vendor'),
          React.createElement(Text, { style: [styles.tableHeadCell, { width: '14%', textAlign: 'right' }] }, 'Amount'),
          React.createElement(Text, { style: [styles.tableHeadCell, { width: '14%', textAlign: 'right' }] }, 'Base Amt')
        ),
        ...data.expenses.map((item, i) =>
          React.createElement(
            View, { key: i, style: [styles.tableRow, ...(i % 2 !== 0 ? [styles.tableRowAlt] : [])] },
            React.createElement(Text, { style: [styles.tableCell,      { width: '12%' }] }, format(new Date(item.date), 'dd/MM/yy')),
            React.createElement(Text, { style: [styles.tableCell,      { width: '24%' }] }, item.property_name),
            React.createElement(Text, { style: [styles.tableCell,      { width: '20%' }] }, item.category_name),
            React.createElement(Text, { style: [styles.tableCell,      { width: '16%' }] }, item.vendor ?? '—'),
            React.createElement(Text, { style: [styles.tableCellRight, { width: '14%' }] }, fmtCurrency(item.amount, item.currency)),
            React.createElement(Text, { style: [styles.tableCellRight, { width: '14%' }] }, fmtCurrency(item.amount_base, item.base_currency))
          )
        ),
        ...expenseTotalRows
      ),

      // ── Footer ──────────────────────────────────────────────────────────────
      React.createElement(
        View, { style: styles.footer, fixed: true },
        React.createElement(Text, null, isGoaReport ? 'Krystal Vista — Confidential' : 'PropTrack — Confidential'),
        React.createElement(Text, { render: ({ pageNumber, totalPages }: { pageNumber: number; totalPages: number }) => `Page ${pageNumber} of ${totalPages}` }, null)
      )
    )
  );
}

export async function generatePdf(data: ReportData): Promise<Buffer> {
  const isGoaReport = data.property_summaries.some(ps => ps.base_currency === 'INR');
  const logoDataUri = isGoaReport ? await readLogoAsDataUri() : null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const doc = React.createElement(ReportDocument, { data, logoDataUri }) as any;
  return renderToBuffer(doc);
}
