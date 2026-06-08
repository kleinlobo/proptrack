import { createClient } from 'jsr:@supabase/supabase-js@2';

function addInterval(date: Date, recurrence: string): Date {
  const d = new Date(date);
  switch (recurrence) {
    case 'weekly':    d.setDate(d.getDate() + 7); break;
    case 'monthly':   d.setMonth(d.getMonth() + 1); break;
    case 'quarterly': d.setMonth(d.getMonth() + 3); break;
    case 'annually':  d.setFullYear(d.getFullYear() + 1); break;
  }
  return d;
}

Deno.serve(async () => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().split('T')[0];

  // Fetch active recurring expenses due today or earlier, including property base_currency
  const { data: recurringList, error: fetchErr } = await supabase
    .from('recurring_expenses')
    .select('*, properties!recurring_expenses_property_id_fkey(base_currency)')
    .eq('is_active', true)
    .is('deleted_at', null)
    .lte('next_due_date', todayStr);

  if (fetchErr) {
    return new Response(JSON.stringify({ error: fetchErr.message }), { status: 500 });
  }

  const generated: string[] = [];
  const errors: string[] = [];

  for (const rec of recurringList ?? []) {
    const baseCurrency: string = (rec.properties as { base_currency: string } | null)?.base_currency ?? rec.currency;

    // Idempotency: skip if already generated for this due date
    const { data: existing } = await supabase
      .from('expense_records')
      .select('id')
      .eq('recurring_id', rec.id)
      .eq('date', rec.next_due_date)
      .single();

    if (!existing) {
      // Get exchange rate for this currency pair
      let rate = 1;
      if (rec.currency !== baseCurrency) {
        const { data: rateRow } = await supabase
          .from('exchange_rates')
          .select('rate')
          .eq('from_currency', rec.currency)
          .eq('to_currency', baseCurrency)
          .order('effective_date', { ascending: false })
          .limit(1)
          .single();
        rate = rateRow?.rate ?? 1;
      }

      const amount_base = rec.amount * rate;

      const { error: insertErr } = await supabase.from('expense_records').insert({
        property_id: rec.property_id,
        room_id: rec.room_id,
        category_id: rec.category_id,
        date: rec.next_due_date,
        amount: rec.amount,
        currency: rec.currency,
        amount_base,
        exchange_rate_used: rate,
        payment_method: rec.payment_method,
        vendor: rec.vendor,
        notes: rec.notes ? `[Auto] ${rec.notes}` : '[Auto-generated from recurring]',
        status: 'pending_confirmation',
        is_recurring: true,
        recurring_id: rec.id,
        created_by: rec.created_by,
      });

      if (insertErr) {
        errors.push(`rec ${rec.id}: ${insertErr.message}`);
        continue;
      }
      generated.push(rec.id);
    }

    // Advance next_due_date
    const nextDate = addInterval(new Date(rec.next_due_date), rec.recurrence_type);
    const nextDateStr = nextDate.toISOString().split('T')[0];

    if (rec.end_date && nextDateStr > rec.end_date) {
      await supabase
        .from('recurring_expenses')
        .update({ is_active: false })
        .eq('id', rec.id);
    } else {
      await supabase
        .from('recurring_expenses')
        .update({ next_due_date: nextDateStr })
        .eq('id', rec.id);
    }
  }

  return new Response(JSON.stringify({ generated: generated.length, errors }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
