import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-booker-admin-pin',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });

const getSupabaseAdmin = () => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing Supabase Edge Function environment variables.');
  }

  return createClient(supabaseUrl, serviceRoleKey);
};

const requireAdminPin = (request: Request) => {
  const configuredPin = Deno.env.get('BOOKER_ADMIN_PIN');

  if (!configuredPin) {
    return {
      ok: false,
      response: jsonResponse({ error: 'BOOKER_ADMIN_PIN is not configured.' }, 503),
    };
  }

  if (request.headers.get('x-booker-admin-pin') !== configuredPin) {
    return {
      ok: false,
      response: jsonResponse({ error: 'Unauthorized.' }, 401),
    };
  }

  return { ok: true as const };
};

const readBody = async (request: Request) => {
  if (request.method === 'GET') {
    return {};
  }

  try {
    return await request.json();
  } catch {
    return {};
  }
};

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const url = new URL(request.url);
  const body = await readBody(request);
  const action = typeof body.action === 'string'
    ? body.action
    : url.searchParams.get('action') || 'health';

  if (action === 'health') {
    return jsonResponse({ ok: true, function: 'booker-api' });
  }

  const auth = requireAdminPin(request);
  if (!auth.ok) {
    return auth.response;
  }

  const supabase = getSupabaseAdmin();

  if (action === 'snapshot') {
    const [hosts, savedVisitors, visits, logs] = await Promise.all([
      supabase.from('hosts').select('*').order('name', { ascending: true }),
      supabase.from('saved_visitors').select('*').order('name', { ascending: true }),
      supabase.from('visits').select('*').order('created_at', { ascending: false }),
      supabase.from('visit_logs').select('*').order('created_at', { ascending: false }),
    ]);

    const error = hosts.error || savedVisitors.error || visits.error || logs.error;
    if (error) {
      return jsonResponse({ error: error.message }, 500);
    }

    return jsonResponse({
      hosts: hosts.data,
      savedVisitors: savedVisitors.data,
      visits: visits.data,
      logs: logs.data,
    });
  }

  return jsonResponse({ error: `Unknown action: ${action}` }, 400);
});
