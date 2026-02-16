import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

interface YahooQuote {
  symbol: string;
  regularMarketPrice: number;
  currency: string;
}

async function fetchYahooPrice(symbol: string): Promise<{ price: number; currency: string } | null> {
  try {
    // Use Yahoo Finance v8 API (free, no key needed)
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });
    
    if (!res.ok) return null;
    
    const data = await res.json();
    const result = data?.chart?.result?.[0];
    if (!result) return null;
    
    const price = result.meta?.regularMarketPrice;
    const currency = result.meta?.currency || 'USD';
    
    if (!price) return null;
    return { price, currency };
  } catch {
    return null;
  }
}

function mapCurrency(yahooCurrency: string): 'AUD' | 'USD' | 'IDR' {
  const upper = yahooCurrency?.toUpperCase() || 'USD';
  if (upper === 'AUD') return 'AUD';
  if (upper === 'IDR') return 'IDR';
  return 'USD';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { symbols } = await req.json() as { symbols: string[] };
    
    if (!symbols || symbols.length === 0) {
      return new Response(JSON.stringify({ error: 'No symbols provided' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Limit to 20 symbols per request
    const limitedSymbols = symbols.slice(0, 20);
    const today = new Date().toISOString().split('T')[0];
    const results: { symbol: string; price: number; currency: string }[] = [];
    const errors: string[] = [];

    // Fetch prices in parallel (batches of 5)
    for (let i = 0; i < limitedSymbols.length; i += 5) {
      const batch = limitedSymbols.slice(i, i + 5);
      const promises = batch.map(async (symbol) => {
        const result = await fetchYahooPrice(symbol);
        if (result) {
          results.push({ symbol, price: result.price, currency: result.currency });
        } else {
          errors.push(symbol);
        }
      });
      await Promise.all(promises);
    }

    // Upsert prices into the prices table
    if (results.length > 0) {
      const priceRows = results.map(r => ({
        symbol: r.symbol,
        price_date: today,
        price: r.price,
        currency: mapCurrency(r.currency),
      }));

      // Insert prices (may fail on duplicates, that's ok - use individual upserts)
      for (const row of priceRows) {
        const { error } = await supabase
          .from('prices')
          .upsert(row, { onConflict: 'symbol,price_date' })
          .select();
        
        if (error) {
          // If upsert fails (no unique constraint), try insert
          await supabase.from('prices').insert(row);
        }
      }
    }

    return new Response(JSON.stringify({
      fetched: results.map(r => ({ symbol: r.symbol, price: r.price, currency: r.currency })),
      errors,
      date: today,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
