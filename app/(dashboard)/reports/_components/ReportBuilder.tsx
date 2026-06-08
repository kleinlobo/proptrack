'use client';

import { useState, useTransition } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { ReportType, ReportFormat } from '@/lib/reports/types';

interface Property {
  id: string;
  name: string;
  base_currency: string;
}

interface Props {
  properties: Property[];
}

const REPORT_TYPES: { value: ReportType; label: string; description: string }[] = [
  { value: 'monthly', label: 'Monthly Report', description: 'Income & expenses for a single month' },
  { value: 'annual', label: 'Annual Report', description: 'Full year financial overview' },
  { value: 'property', label: 'Property Report', description: 'Per-property breakdown' },
  { value: 'country', label: 'Country Report', description: 'Grouped by country (UAE / India)' },
  { value: 'manager', label: 'Manager Report', description: 'Activity by property manager' },
];

const FORMATS: { value: ReportFormat; label: string; icon: string }[] = [
  { value: 'pdf', label: 'PDF', icon: '📄' },
  { value: 'excel', label: 'Excel', icon: '📊' },
];

type Step = 'type' | 'dates' | 'properties' | 'format' | 'generate';

export default function ReportBuilder({ properties }: Props) {
  const queryClient = useQueryClient();
  const [isPending, startTransition] = useTransition();

  const [step, setStep] = useState<Step>('type');
  const [reportType, setReportType] = useState<ReportType>('monthly');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [format, setFormat] = useState<ReportFormat>('pdf');
  const [error, setError] = useState('');
  const [successId, setSuccessId] = useState('');

  const today = new Date().toISOString().split('T')[0];

  function toggleProperty(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function handleQuickMonth(offset: number) {
    const d = new Date();
    d.setMonth(d.getMonth() + offset);
    const y = d.getFullYear();
    const m = d.getMonth();
    setDateFrom(new Date(y, m, 1).toISOString().split('T')[0]);
    setDateTo(new Date(y, m + 1, 0).toISOString().split('T')[0]);
  }

  function handleGenerate() {
    setError('');
    startTransition(async () => {
      const res = await fetch('/api/v1/generate-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          report_type: reportType,
          format,
          date_from: dateFrom,
          date_to: dateTo,
          property_ids: selectedIds.length > 0 ? selectedIds : undefined,
        }),
      });

      const result = await res.json();
      if (!res.ok || result.error) {
        setError(result.error ?? 'Report generation failed. Please try again.');
        return;
      }
      setSuccessId(result.reportId ?? '');
      queryClient.invalidateQueries({ queryKey: ['report-history'] });
      setStep('type');
      setDateFrom('');
      setDateTo('');
      setSelectedIds([]);
      setFormat('pdf');
    });
  }

  const steps: Step[] = ['type', 'dates', 'properties', 'format', 'generate'];
  const stepIdx = steps.indexOf(step);

  const canNextDates = dateFrom && dateTo && dateTo >= dateFrom;

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
      {/* Step indicator */}
      <div className="px-6 pt-5 pb-4 border-b border-gray-100">
        <h2 className="text-base font-semibold text-gray-900 mb-3">Generate Report</h2>
        <div className="flex items-center gap-1">
          {steps.map((s, i) => (
            <div key={s} className="flex items-center">
              <button
                onClick={() => { if (i < stepIdx) setStep(s); }}
                disabled={i >= stepIdx}
                className={[
                  'w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center transition-colors',
                  i < stepIdx ? 'bg-[#276EAC] text-white cursor-pointer' :
                  i === stepIdx ? 'bg-[#276EAC] text-white' :
                  'bg-gray-100 text-gray-400 cursor-default',
                ].join(' ')}
              >
                {i < stepIdx ? '✓' : i + 1}
              </button>
              {i < steps.length - 1 && (
                <div className={`w-8 h-0.5 mx-1 ${i < stepIdx ? 'bg-[#276EAC]' : 'bg-gray-200'}`} />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="p-6">
        {/* Step 1: Report Type */}
        {step === 'type' && (
          <div className="space-y-3">
            <p className="text-sm text-gray-500 mb-4">Select the type of report to generate.</p>
            {REPORT_TYPES.map((rt) => (
              <button
                key={rt.value}
                onClick={() => setReportType(rt.value)}
                className={[
                  'w-full text-left px-4 py-3 rounded-lg border-2 transition-all',
                  reportType === rt.value
                    ? 'border-[#276EAC] bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300',
                ].join(' ')}
              >
                <div className="font-medium text-sm text-gray-900">{rt.label}</div>
                <div className="text-xs text-gray-500 mt-0.5">{rt.description}</div>
              </button>
            ))}
          </div>
        )}

        {/* Step 2: Date Range */}
        {step === 'dates' && (
          <div className="space-y-4">
            <p className="text-sm text-gray-500">Select the date range for the report.</p>
            <div className="flex gap-2 flex-wrap">
              {[
                { label: 'This month', offset: 0 },
                { label: 'Last month', offset: -1 },
                { label: '2 months ago', offset: -2 },
              ].map((q) => (
                <button
                  key={q.label}
                  onClick={() => handleQuickMonth(q.offset)}
                  className="px-3 py-1.5 text-xs border border-gray-200 rounded-full hover:bg-gray-50"
                >
                  {q.label}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">From</label>
                <input
                  type="date"
                  value={dateFrom}
                  max={today}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#276EAC]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">To</label>
                <input
                  type="date"
                  value={dateTo}
                  max={today}
                  min={dateFrom}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#276EAC]"
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Properties */}
        {step === 'properties' && (
          <div className="space-y-3">
            <p className="text-sm text-gray-500">Select properties to include. Leave all unchecked to include all accessible properties.</p>
            {properties.map((p) => (
              <button
                key={p.id}
                onClick={() => toggleProperty(p.id)}
                className={[
                  'w-full flex items-center gap-3 px-4 py-3 rounded-lg border-2 transition-all',
                  selectedIds.includes(p.id)
                    ? 'border-[#276EAC] bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300',
                ].join(' ')}
              >
                <div className={[
                  'w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0',
                  selectedIds.includes(p.id) ? 'border-[#276EAC] bg-[#276EAC]' : 'border-gray-300',
                ].join(' ')}>
                  {selectedIds.includes(p.id) && <span className="text-white text-xs">✓</span>}
                </div>
                <div className="text-left">
                  <div className="font-medium text-sm text-gray-900">{p.name}</div>
                  <div className="text-xs text-gray-500">{p.base_currency}</div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Step 4: Format */}
        {step === 'format' && (
          <div className="space-y-3">
            <p className="text-sm text-gray-500">Choose the output format.</p>
            {FORMATS.map((f) => (
              <button
                key={f.value}
                onClick={() => setFormat(f.value)}
                className={[
                  'w-full flex items-center gap-3 px-4 py-3 rounded-lg border-2 transition-all',
                  format === f.value
                    ? 'border-[#276EAC] bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300',
                ].join(' ')}
              >
                <span className="text-2xl">{f.icon}</span>
                <div className="font-medium text-sm text-gray-900">{f.label}</div>
              </button>
            ))}
          </div>
        )}

        {/* Step 5: Review & Generate */}
        {step === 'generate' && (
          <div className="space-y-4">
            <p className="text-sm text-gray-500">Review your settings and generate the report.</p>
            <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Type</span>
                <span className="font-medium capitalize">{reportType.replace(/_/g, ' ')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Date range</span>
                <span className="font-medium">{dateFrom} → {dateTo}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Properties</span>
                <span className="font-medium">
                  {selectedIds.length === 0
                    ? 'All accessible'
                    : `${selectedIds.length} selected`}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Format</span>
                <span className="font-medium uppercase">{format}</span>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <button
              onClick={handleGenerate}
              disabled={isPending}
              className="w-full py-2.5 bg-[#276EAC] hover:bg-[#1d5a8e] disabled:opacity-60 text-white font-semibold rounded-lg transition-colors text-sm"
            >
              {isPending ? 'Generating…' : 'Generate Report'}
            </button>
          </div>
        )}

        {successId && (
          <div className="mt-3 bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-700">
            Report generated successfully. It will appear in the history below.
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between mt-6">
          <button
            onClick={() => setStep(steps[stepIdx - 1])}
            disabled={stepIdx === 0}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 disabled:opacity-30"
          >
            ← Back
          </button>
          {step !== 'generate' && (
            <button
              onClick={() => setStep(steps[stepIdx + 1])}
              disabled={step === 'dates' && !canNextDates}
              className="px-5 py-2 bg-[#276EAC] hover:bg-[#1d5a8e] disabled:opacity-40 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Next →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
