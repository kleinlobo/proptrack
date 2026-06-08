import { createClient } from 'jsr:@supabase/supabase-js@2';

// Fires daily — notifies admins about overdue recurring expenses
// (next_due_date is in the past and status is still pending_confirmation)
Deno.serve(async () => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const today = new Date().toISOString().split('T')[0];

  // Overdue = active recurring with next_due_date < today
  const { data: overdue, error: fetchErr } = await supabase
    .from('recurring_expenses')
    .select('id, vendor, notes, next_due_date, property_id, properties(name)')
    .eq('is_active', true)
    .is('deleted_at', null)
    .lt('next_due_date', today);

  if (fetchErr) {
    return new Response(JSON.stringify({ error: fetchErr.message }), { status: 500 });
  }

  if (!overdue || overdue.length === 0) {
    return new Response(JSON.stringify({ overdue: 0 }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { data: admins } = await supabase
    .from('user_profiles')
    .select('id')
    .eq('role', 'super_admin')
    .eq('is_active', true)
    .is('deleted_at', null);

  const notified: string[] = [];

  for (const rec of overdue) {
    const propName = (rec.properties as { name: string } | null)?.name ?? rec.property_id;
    const label = rec.vendor ?? rec.notes ?? 'Unnamed expense';

    for (const admin of admins ?? []) {
      // One notification per recurring per overdue day
      const { count } = await supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', admin.id)
        .eq('type', 'overdue_recurring')
        .eq('related_entity_id', rec.id)
        .gte('created_at', today);

      if ((count ?? 0) === 0) {
        await supabase.from('notifications').insert({
          user_id: admin.id,
          type: 'overdue_recurring',
          title: `Overdue recurring expense: ${label}`,
          body: `The recurring expense "${label}" for ${propName} was due on ${rec.next_due_date} and has not been confirmed yet.`,
          related_entity_type: 'recurring_expense',
          related_entity_id: rec.id,
        });
        notified.push(rec.id);
      }
    }
  }

  return new Response(JSON.stringify({ overdue: overdue.length, notifications_sent: notified.length }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
