export type ReportType = 'monthly' | 'annual' | 'property' | 'country' | 'manager';
export type ReportFormat = 'pdf' | 'excel';

export interface ReportParams {
  report_type: ReportType;
  format: ReportFormat;
  date_from: string;
  date_to: string;
  property_ids: string[] | null;
}

export interface IncomeLineItem {
  date: string;
  property_name: string;
  room_name: string | null;
  income_source: string;
  amount: number;
  currency: string;
  amount_base: number;
  base_currency: string;
  notes: string | null;
}

export interface ExpenseLineItem {
  date: string;
  property_name: string;
  room_name: string | null;
  category_name: string;
  vendor: string | null;
  payment_method: string;
  amount: number;
  currency: string;
  amount_base: number;
  base_currency: string;
  notes: string | null;
}

export interface PropertySummary {
  property_id: string;
  property_name: string;
  base_currency: string;
  total_income_base: number;
  total_expenses_base: number;
  net_profit_base: number;
}

export interface ReportData {
  params: ReportParams;
  generated_at: string;
  income: IncomeLineItem[];
  expenses: ExpenseLineItem[];
  property_summaries: PropertySummary[];
  grand_total_income: number;
  grand_total_expenses: number;
  grand_net_profit: number;
}
