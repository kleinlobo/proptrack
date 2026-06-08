import { createClient } from 'jsr:@supabase/supabase-js@2';

const SUPPORTED_PAIRS = [
  { from: 'AED', to: 'INR' },
  { from: 'INR', to: 'AED' },
];

Deno.serve(async () => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const apiKey = Deno.env.get('EXCHANGE_RATE_API_KEY');

  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const today = new Date().toISOString().split('T')[0];
  const results: string[] = [];

  for (const pair of SUPPORTED_PAIRS) {
    // Skip if we already have a rate for today
    const { data: existing } = await supabase
      .from('exchange_rates')
      .select('id')
      .eq('from_currency', pair.from)
      .eq('to_currency', pair.to)
      .eq('effective_date', today)
      .single();

    if (existing) {
      results.push(`${pair.from}/${pair.to}: already exists`);
      continue;
    }

    let rate: number | null = null;
    let source = 'api';

    if (apiKey) {
      try {
        const res = await fetch(
          `https://v6.exchangerate-api.com/v6/${apiKey}/pair/${pair.from}/${pair.to}`
        );
        if (res.ok) {
          const json = await res.json();
          rate = json.conversion_rate as number;
        }
      } catch {
        // fall through to fallback
      }
    }

    // Fallback: derive from the inverse if we have it
    if (!rate) {
      const { data: inverse } = await supabase
        .from('exchange_rates')
        .select('rate')
        .eq('from_currency', pair.to)
        .eq('to_currency', pair.from)
        .eq('effective_date', today)
        .single();

      if (inverse) {
        rate = 1 / inverse.rate;
        source = 'derived';
      }
    }

    if (!rate) {
      results.push(`${pair.from}/${pair.to}: no rate available`);
      continue;
    }

    const { error } = await supabase.from('exchange_rates').insert({
      from_currency: pair.from,
      to_currency: pair.to,
      rate,
      effective_date: today,
      is_manual: false,
      source,
    });

    results.push(error
      ? `${pair.from}/${pair.to}: insert failed — ${error.message}`
      : `${pair.from}/${pair.to}: saved ${rate.toFixed(4)}`
    );
  }

  return new Response(JSON.stringify({ date: today, results }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
