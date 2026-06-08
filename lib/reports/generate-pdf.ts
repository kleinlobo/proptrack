import React from 'react';
import { Document, Page, Text, View, StyleSheet, renderToBuffer } from '@react-pdf/renderer';
import { format } from 'date-fns';
import type { ReportData } from './types';

const styles = StyleSheet.create({
  page: { fontFamily: 'Helvetica', fontSize: 9, color: '#1A2B42', paddingHorizontal: 36, paddingVertical: 32, backgroundColor: '#FFFFFF' },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20, borderBottomWidth: 2, borderBottomColor: '#276EAC', paddingBottom: 10 },
  headerLeft: { flexDirection: 'column' },
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
  totalCell: { fontSize: 8, fontWeight: 'bold' },
  totalCellRight: { fontSize: 8, fontWeight: 'bold', textAlign: 'right' },
  summaryBox: { backgroundColor: '#F0F9FF', borderWidth: 1, borderColor: '#BAE6FD', borderRadius: 4, padding: 10, marginBottom: 16 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 },
  summaryLabel: { fontSize: 9, color: '#4B5563' },
  summaryValue: { fontSize: 9, fontWeight: 'bold' },
  footer: { position: 'absolute', bottom: 20, left: 36, right: 36, flexDirection: 'row', justifyContent: 'space-between', color: '#9CA3AF', fontSize: 7, borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingTop: 6 },
  positive: { color: '#15803D' },
  negative: { color: '#DC2626' },
});

function fmtCurrency(amount: number, currency: string): string {
  const sym = currency === 'INR' ? '₹' : 'AED ';
  return `${sym}${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function ReportDocument({ data }: { data: ReportData }) {
  const dateRange = `${format(new Date(data.params.date_from), 'dd MMM yyyy')} – ${format(new Date(data.params.date_to), 'dd MMM yyyy')}`;
  const generatedAt = format(new Date(data.generated_at), "dd MMM yyyy 'at' HH:mm");

  const firstCurrency = data.property_summaries[0]?.base_currency ?? 'AED';

  return React.createElement(
    Document,
    { title: 'PropTrack Financial Report', author: 'PropTrack' },
    React.createElement(
      Page,
      { size: 'A4', style: styles.page },

      // Header
      React.createElement(
        View,
        { style: styles.header },
        React.createElement(
          View,
          { style: styles.headerLeft },
          React.createElement(Text, { style: styles.appName }, 'PropTrack'),
          React.createElement(Text, { style: styles.reportTitle }, `${data.params.report_type.toUpperCase()} REPORT · ${dateRange}`)
        ),
        React.createElement(
          View,
          { style: styles.headerRight },
          React.createElement(Text, null, `Generated: ${generatedAt}`)
        )
      ),

      // Summary
      React.createElement(
        View,
        { style: styles.summaryBox },
        React.createElement(
          View,
          { style: styles.summaryRow },
          React.createElement(Text, { style: styles.summaryLabel }, 'Total Income'),
          React.createElement(Text, { style: [styles.summaryValue, styles.positive] }, fmtCurrency(data.grand_total_income, firstCurrency))
        ),
        React.createElement(
          View,
          { style: styles.summaryRow },
          React.createElement(Text, { style: styles.summaryLabel }, 'Total Expenses'),
          React.createElement(Text, { style: [styles.summaryValue, styles.negative] }, fmtCurrency(data.grand_total_expenses, firstCurrency))
        ),
        React.createElement(
          View,
          { style: styles.summaryRow },
          React.createElement(Text, { style: [styles.summaryLabel, { fontWeight: 'bold' }] }, 'Net Profit'),
          React.createElement(
            Text,
            { style: [styles.summaryValue, data.grand_net_profit >= 0 ? styles.positive : styles.negative] },
            fmtCurrency(data.grand_net_profit, firstCurrency)
          )
        )
      ),

      // Property breakdown
      data.property_summaries.length > 0 && React.createElement(
        View,
        null,
        React.createElement(Text, { style: styles.sectionTitle }, 'Property Breakdown'),
        React.createElement(
          View,
          { style: styles.tableHead },
          React.createElement(Text, { style: [styles.tableHeadCell, { width: '40%' }] }, 'Property'),
          React.createElement(Text, { style: [styles.tableHeadCell, { width: '20%', textAlign: 'right' }] }, 'Income'),
          React.createElement(Text, { style: [styles.tableHeadCell, { width: '20%', textAlign: 'right' }] }, 'Expenses'),
          React.createElement(Text, { style: [styles.tableHeadCell, { width: '20%', textAlign: 'right' }] }, 'Net Profit')
        ),
        ...data.property_summaries.map((ps, i) =>
          React.createElement(
            View,
            { key: ps.property_id, style: [styles.tableRow, ...(i % 2 !== 0 ? [styles.tableRowAlt] : [])] },
            React.createElement(Text, { style: [styles.tableCell, { width: '40%' }] }, ps.property_name),
            React.createElement(Text, { style: [styles.tableCellRight, { width: '20%', color: '#15803D' }] }, fmtCurrency(ps.total_income_base, ps.base_currency)),
            React.createElement(Text, { style: [styles.tableCellRight, { width: '20%', color: '#DC2626' }] }, fmtCurrency(ps.total_expenses_base, ps.base_currency)),
            React.createElement(
              Text,
              { style: [styles.tableCellRight, { width: '20%' }, ps.net_profit_base >= 0 ? styles.positive : styles.negative] },
              fmtCurrency(ps.net_profit_base, ps.base_currency)
            )
          )
        )
      ),

      // Income table
      data.income.length > 0 && React.createElement(
        View,
        null,
        React.createElement(Text, { style: styles.sectionTitle }, `Income (${data.income.length} records)`),
        React.createElement(
          View,
          { style: styles.tableHead },
          React.createElement(Text, { style: [styles.tableHeadCell, { width: '12%' }] }, 'Date'),
          React.createElement(Text, { style: [styles.tableHeadCell, { width: '28%' }] }, 'Property'),
          React.createElement(Text, { style: [styles.tableHeadCell, { width: '20%' }] }, 'Source'),
          React.createElement(Text, { style: [styles.tableHeadCell, { width: '20%', textAlign: 'right' }] }, 'Amount'),
          React.createElement(Text, { style: [styles.tableHeadCell, { width: '20%', textAlign: 'right' }] }, 'Base Amount')
        ),
        ...data.income.map((item, i) =>
          React.createElement(
            View,
            { key: i, style: [styles.tableRow, ...(i % 2 !== 0 ? [styles.tableRowAlt] : [])] },
            React.createElement(Text, { style: [styles.tableCell, { width: '12%' }] }, format(new Date(item.date), 'dd/MM/yy')),
            React.createElement(Text, { style: [styles.tableCell, { width: '28%' }] }, item.property_name),
            React.createElement(Text, { style: [styles.tableCell, { width: '20%' }] }, item.income_source.replace(/_/g, ' ')),
            React.createElement(Text, { style: [styles.tableCellRight, { width: '20%' }] }, fmtCurrency(item.amount, item.currency)),
            React.createElement(Text, { style: [styles.tableCellRight, { width: '20%' }] }, fmtCurrency(item.amount_base, item.base_currency))
          )
        ),
        React.createElement(
          View,
          { style: styles.totalRow },
          React.createElement(Text, { style: [styles.totalCell, { width: '60%' }] }, 'TOTAL'),
          React.createElement(Text, { style: [styles.totalCellRight, { width: '20%' }] }, ''),
          React.createElement(Text, { style: [styles.totalCellRight, { width: '20%', color: '#15803D' }] }, fmtCurrency(data.grand_total_income, firstCurrency))
        )
      ),

      // Expenses table
      data.expenses.length > 0 && React.createElement(
        View,
        null,
        React.createElement(Text, { style: styles.sectionTitle }, `Expenses (${data.expenses.length} records)`),
        React.createElement(
          View,
          { style: styles.tableHead },
          React.createElement(Text, { style: [styles.tableHeadCell, { width: '12%' }] }, 'Date'),
          React.createElement(Text, { style: [styles.tableHeadCell, { width: '24%' }] }, 'Property'),
          React.createElement(Text, { style: [styles.tableHeadCell, { width: '20%' }] }, 'Category'),
          React.createElement(Text, { style: [styles.tableHeadCell, { width: '16%' }] }, 'Vendor'),
          React.createElement(Text, { style: [styles.tableHeadCell, { width: '14%', textAlign: 'right' }] }, 'Amount'),
          React.createElement(Text, { style: [styles.tableHeadCell, { width: '14%', textAlign: 'right' }] }, 'Base Amt')
        ),
        ...data.expenses.map((item, i) =>
          React.createElement(
            View,
            { key: i, style: [styles.tableRow, ...(i % 2 !== 0 ? [styles.tableRowAlt] : [])] },
            React.createElement(Text, { style: [styles.tableCell, { width: '12%' }] }, format(new Date(item.date), 'dd/MM/yy')),
            React.createElement(Text, { style: [styles.tableCell, { width: '24%' }] }, item.property_name),
            React.createElement(Text, { style: [styles.tableCell, { width: '20%' }] }, item.category_name),
            React.createElement(Text, { style: [styles.tableCell, { width: '16%' }] }, item.vendor ?? '—'),
            React.createElement(Text, { style: [styles.tableCellRight, { width: '14%' }] }, fmtCurrency(item.amount, item.currency)),
            React.createElement(Text, { style: [styles.tableCellRight, { width: '14%' }] }, fmtCurrency(item.amount_base, item.base_currency))
          )
        ),
        React.createElement(
          View,
          { style: styles.totalRow },
          React.createElement(Text, { style: [styles.totalCell, { width: '72%' }] }, 'TOTAL'),
          React.createElement(Text, { style: [styles.totalCellRight, { width: '14%' }] }, ''),
          React.createElement(Text, { style: [styles.totalCellRight, { width: '14%', color: '#DC2626' }] }, fmtCurrency(data.grand_total_expenses, firstCurrency))
        )
      ),

      // Footer
      React.createElement(
        View,
        { style: styles.footer, fixed: true },
        React.createElement(Text, null, 'PropTrack — Confidential'),
        React.createElement(Text, { render: ({ pageNumber, totalPages }: { pageNumber: number; totalPages: number }) => `Page ${pageNumber} of ${totalPages}` }, null)
      )
    )
  );
}

export async function generatePdf(data: ReportData): Promise<Buffer> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const doc = React.createElement(ReportDocument, { data }) as any;
  return renderToBuffer(doc);
}
