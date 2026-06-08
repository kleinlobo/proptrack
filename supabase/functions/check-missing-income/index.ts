import { createClient } from 'jsr:@supabase/supabase-js@2';

// Fires on the 5th of each month — checks if previous month has any income
// for each active property. Creates a notification if none found.
Deno.serve(async () => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const now = new Date();
  // Previous month
  const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const monthStart = prevMonth.toISOString().split('T')[0];
  const monthEnd = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0];

  const { data: properties, error: propErr } = await supabase
    .from('properties')
    .select('id, name')
    .eq('is_active', true);

  if (propErr) {
    return new Response(JSON.stringify({ error: propErr.message }), { status: 500 });
  }

  const notifications: string[] = [];

  for (const prop of properties ?? []) {
    const { count } = await supabase
      .from('income_records')
      .select('id', { count: 'exact', head: true })
      .eq('property_id', prop.id)
      .is('deleted_at', null)
      .gte('date', monthStart)
      .lte('date', monthEnd);

    if ((count ?? 0) === 0) {
      // Notify all super_admin users
      const { data: admins } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('role', 'super_admin')
        .eq('is_active', true)
        .is('deleted_at', null);

      for (const admin of admins ?? []) {
        // Avoid duplicate notifications
        const { count: notifCount } = await supabase
          .from('notifications')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', admin.id)
          .eq('type', 'missing_income')
          .eq('related_entity_id', prop.id)
          .gte('created_at', monthStart);

        if ((notifCount ?? 0) === 0) {
          await supabase.from('notifications').insert({
            user_id: admin.id,
            type: 'missing_income',
            title: `No income recorded for ${prop.name}`,
            body: `No income records found for ${prop.name} in ${prevMonth.toLocaleString('en-US', { month: 'long', year: 'numeric' })}. Please check if any income was missed.`,
            related_entity_type: 'property',
            related_entity_id: prop.id,
          });
          notifications.push(`${prop.name} → admin ${admin.id}`);
        }
      }
    }
  }

  return new Response(JSON.stringify({ checked: (properties ?? []).length, notifications_sent: notifications.length }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
