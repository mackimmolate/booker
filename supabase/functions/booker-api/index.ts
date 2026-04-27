import { createClient } from 'jsr:@supabase/supabase-js@2';

type JsonRecord = Record<string, unknown>;

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

const isRecord = (value: unknown): value is JsonRecord =>
  typeof value === 'object' && value !== null;

const normalizeText = (value: unknown) =>
  typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';

const normalizeOptionalText = (value: unknown) => {
  const normalizedValue = normalizeText(value);
  return normalizedValue || null;
};

const normalizeEmail = (value: unknown) => {
  const normalizedValue = typeof value === 'string' ? value.trim().toLowerCase() : '';
  return normalizedValue || null;
};

const parseLanguage = (value: unknown) => value === 'en' ? 'en' : 'sv';

const parseVisitorStatus = (value: unknown) => {
  if (value === 'booked' || value === 'checked-in' || value === 'checked-out') {
    return value;
  }

  return 'booked';
};

const parseNotificationStatus = (value: unknown) => {
  if (
    value === 'not-configured' ||
    value === 'pending' ||
    value === 'sent' ||
    value === 'failed' ||
    value === 'skipped'
  ) {
    return value;
  }

  return null;
};

const parseNotificationChannel = (value: unknown) => value === 'email' ? 'email' : null;

const requireString = (value: unknown, fieldName: string) => {
  const normalizedValue = normalizeText(value);
  if (!normalizedValue) {
    throw new Response(JSON.stringify({ error: `${fieldName} is required.` }), {
      status: 400,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    });
  }

  return normalizedValue;
};

const getPayload = (body: JsonRecord, key: string) =>
  isRecord(body[key]) ? body[key] as JsonRecord : body;

const pickValue = (...values: unknown[]) =>
  values.find(value => value !== undefined);

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

const readBody = async (request: Request): Promise<JsonRecord> => {
  if (request.method === 'GET') {
    return {};
  }

  try {
    const body = await request.json();
    return isRecord(body) ? body : {};
  } catch {
    return {};
  }
};

const toHost = (row: JsonRecord) => ({
  id: row.id,
  name: row.name,
  email: row.email ?? undefined,
});

const toSavedVisitor = (row: JsonRecord) => ({
  id: row.id,
  name: row.name,
  company: row.company,
});

const toVisit = (row: JsonRecord) => ({
  id: row.id,
  name: row.name,
  company: row.company,
  host: row.host,
  hostEmail: row.host_email ?? undefined,
  phone: row.phone ?? undefined,
  preBooked: row.pre_booked,
  status: row.status,
  expectedArrival: row.expected_arrival ?? undefined,
  checkInTime: row.check_in_time ?? undefined,
  checkOutTime: row.check_out_time ?? undefined,
  language: row.language,
  notificationStatus: row.notification_status ?? undefined,
  notificationChannel: row.notification_channel ?? undefined,
  notificationAttemptedAt: row.notification_attempted_at ?? undefined,
  notificationSentAt: row.notification_sent_at ?? undefined,
  notificationError: row.notification_error ?? undefined,
});

const toLog = (row: JsonRecord) => ({
  id: row.id,
  visitorId: row.visit_id,
  visitorName: row.visitor_name,
  company: row.company,
  host: row.host,
  action: row.action,
  timestamp: row.created_at,
  notificationStatus: row.notification_status ?? undefined,
  notificationRecipient: row.notification_recipient ?? undefined,
});

const getSnapshot = async (supabase: ReturnType<typeof getSupabaseAdmin>) => {
  const [hosts, savedVisitors, visits, logs] = await Promise.all([
    supabase.from('hosts').select('*').order('name', { ascending: true }),
    supabase.from('saved_visitors').select('*').order('name', { ascending: true }),
    supabase.from('visits').select('*').order('created_at', { ascending: false }),
    supabase.from('visit_logs').select('*').order('created_at', { ascending: false }),
  ]);

  const error = hosts.error || savedVisitors.error || visits.error || logs.error;
  if (error) {
    throw new Error(error.message);
  }

  return {
    hosts: (hosts.data ?? []).map(toHost),
    savedVisitors: (savedVisitors.data ?? []).map(toSavedVisitor),
    visits: (visits.data ?? []).map(toVisit),
    logs: (logs.data ?? []).map(toLog),
  };
};

const createLog = async (
  supabase: ReturnType<typeof getSupabaseAdmin>,
  visit: JsonRecord,
  action: 'registered' | 'check-in' | 'check-out'
) => {
  const { error } = await supabase.from('visit_logs').insert({
    visit_id: visit.id,
    visitor_name: visit.name,
    company: visit.company,
    host: visit.host,
    action,
    notification_status: visit.notification_status ?? null,
    notification_recipient: visit.host_email ?? null,
  });

  if (error) {
    throw new Error(error.message);
  }
};

const findHostByName = async (
  supabase: ReturnType<typeof getSupabaseAdmin>,
  hostName: string
) => {
  const { data, error } = await supabase
    .from('hosts')
    .select('*')
    .ilike('name', hostName)
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data as JsonRecord | null;
};

const createOrUpdateHost = async (
  supabase: ReturnType<typeof getSupabaseAdmin>,
  payload: JsonRecord
) => {
  const name = requireString(payload.name, 'Host name');
  const email = normalizeEmail(payload.email);
  const id = normalizeOptionalText(payload.id);

  const row = {
    name,
    email,
    updated_at: new Date().toISOString(),
  };

  if (id) {
    const { data, error } = await supabase
      .from('hosts')
      .update(row)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return toHost(data);
  }

  const existingHost = await findHostByName(supabase, name);
  if (existingHost) {
    const { data, error } = await supabase
      .from('hosts')
      .update({ email, updated_at: row.updated_at })
      .eq('id', existingHost.id)
      .select('*')
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return toHost(data);
  }

  const { data, error } = await supabase
    .from('hosts')
    .insert(row)
    .select('*')
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return toHost(data);
};

const deleteHost = async (
  supabase: ReturnType<typeof getSupabaseAdmin>,
  payload: JsonRecord
) => {
  const id = requireString(payload.id, 'Host id');
  const { error } = await supabase.from('hosts').delete().eq('id', id);

  if (error) {
    throw new Error(error.message);
  }

  return { id };
};

const findSavedVisitorByName = async (
  supabase: ReturnType<typeof getSupabaseAdmin>,
  visitorName: string
) => {
  const { data, error } = await supabase
    .from('saved_visitors')
    .select('*')
    .ilike('name', visitorName)
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data as JsonRecord | null;
};

const createOrUpdateSavedVisitor = async (
  supabase: ReturnType<typeof getSupabaseAdmin>,
  payload: JsonRecord
) => {
  const name = requireString(payload.name, 'Visitor name');
  const company = requireString(payload.company, 'Company');
  const id = normalizeOptionalText(payload.id);

  const row = {
    name,
    company,
    updated_at: new Date().toISOString(),
  };

  if (id) {
    const { data, error } = await supabase
      .from('saved_visitors')
      .update(row)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return toSavedVisitor(data);
  }

  const existingVisitor = await findSavedVisitorByName(supabase, name);
  if (existingVisitor) {
    const { data, error } = await supabase
      .from('saved_visitors')
      .update({ company, updated_at: row.updated_at })
      .eq('id', existingVisitor.id)
      .select('*')
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return toSavedVisitor(data);
  }

  const { data, error } = await supabase
    .from('saved_visitors')
    .insert(row)
    .select('*')
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return toSavedVisitor(data);
};

const deleteSavedVisitor = async (
  supabase: ReturnType<typeof getSupabaseAdmin>,
  payload: JsonRecord
) => {
  const id = requireString(payload.id, 'Saved visitor id');
  const { error } = await supabase.from('saved_visitors').delete().eq('id', id);

  if (error) {
    throw new Error(error.message);
  }

  return { id };
};

const buildVisitRow = (payload: JsonRecord, defaults: JsonRecord = {}) => {
  const name = requireString(pickValue(payload.name, defaults.name), 'Visitor name');
  const company = requireString(pickValue(payload.company, defaults.company), 'Company');
  const host = requireString(pickValue(payload.host, defaults.host), 'Host');

  return {
    name,
    company,
    host,
    host_email: normalizeEmail(pickValue(payload.hostEmail, payload.host_email, defaults.host_email)),
    phone: normalizeOptionalText(pickValue(payload.phone, defaults.phone)),
    pre_booked: typeof payload.preBooked === 'boolean'
      ? payload.preBooked
      : typeof payload.pre_booked === 'boolean'
        ? payload.pre_booked
        : typeof defaults.pre_booked === 'boolean'
          ? defaults.pre_booked
          : true,
    status: parseVisitorStatus(pickValue(payload.status, defaults.status)),
    expected_arrival: normalizeOptionalText(pickValue(payload.expectedArrival, payload.expected_arrival, defaults.expected_arrival)),
    check_in_time: normalizeOptionalText(pickValue(payload.checkInTime, payload.check_in_time, defaults.check_in_time)),
    check_out_time: normalizeOptionalText(pickValue(payload.checkOutTime, payload.check_out_time, defaults.check_out_time)),
    language: parseLanguage(pickValue(payload.language, defaults.language)),
    notification_status: parseNotificationStatus(pickValue(payload.notificationStatus, payload.notification_status, defaults.notification_status)),
    notification_channel: parseNotificationChannel(pickValue(payload.notificationChannel, payload.notification_channel, defaults.notification_channel)),
    notification_attempted_at: normalizeOptionalText(pickValue(payload.notificationAttemptedAt, payload.notification_attempted_at, defaults.notification_attempted_at)),
    notification_sent_at: normalizeOptionalText(pickValue(payload.notificationSentAt, payload.notification_sent_at, defaults.notification_sent_at)),
    notification_error: normalizeOptionalText(pickValue(payload.notificationError, payload.notification_error, defaults.notification_error)),
    updated_at: new Date().toISOString(),
  };
};

const ensureRelatedRows = async (
  supabase: ReturnType<typeof getSupabaseAdmin>,
  visit: JsonRecord
) => {
  await Promise.all([
    createOrUpdateHost(supabase, { name: visit.host, email: visit.host_email }),
    createOrUpdateSavedVisitor(supabase, { name: visit.name, company: visit.company }),
  ]);
};

const createVisit = async (
  supabase: ReturnType<typeof getSupabaseAdmin>,
  payload: JsonRecord,
  options: { walkIn?: boolean } = {}
) => {
  const row = buildVisitRow({
    ...payload,
    preBooked: options.walkIn ? false : payload.preBooked,
    status: options.walkIn ? 'checked-in' : payload.status ?? 'booked',
    checkInTime: options.walkIn ? new Date().toISOString() : payload.checkInTime,
  });

  const { data, error } = await supabase
    .from('visits')
    .insert(row)
    .select('*')
    .single();

  if (error) {
    throw new Error(error.message);
  }

  await ensureRelatedRows(supabase, data);
  await createLog(supabase, data, options.walkIn ? 'check-in' : 'registered');

  return toVisit(data);
};

const getVisitById = async (
  supabase: ReturnType<typeof getSupabaseAdmin>,
  id: string
) => {
  const { data, error } = await supabase
    .from('visits')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as JsonRecord;
};

const updateVisit = async (
  supabase: ReturnType<typeof getSupabaseAdmin>,
  payload: JsonRecord
) => {
  const id = requireString(payload.id, 'Visit id');
  const currentVisit = await getVisitById(supabase, id);
  const row = buildVisitRow(payload, currentVisit);

  const { data, error } = await supabase
    .from('visits')
    .update(row)
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    throw new Error(error.message);
  }

  await ensureRelatedRows(supabase, data);

  return toVisit(data);
};

const checkInVisit = async (
  supabase: ReturnType<typeof getSupabaseAdmin>,
  payload: JsonRecord
) => {
  const id = requireString(payload.id ?? payload.visitId, 'Visit id');
  const currentVisit = await getVisitById(supabase, id);
  const row = buildVisitRow({
    ...currentVisit,
    ...payload,
    status: 'checked-in',
    checkInTime: new Date().toISOString(),
    notificationStatus: null,
    notificationChannel: null,
    notificationAttemptedAt: null,
    notificationSentAt: null,
    notificationError: null,
  }, currentVisit);

  const { data, error } = await supabase
    .from('visits')
    .update(row)
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    throw new Error(error.message);
  }

  await ensureRelatedRows(supabase, data);
  await createLog(supabase, data, 'check-in');

  return toVisit(data);
};

const checkOutVisit = async (
  supabase: ReturnType<typeof getSupabaseAdmin>,
  payload: JsonRecord
) => {
  const id = requireString(payload.id ?? payload.visitId, 'Visit id');
  const row = {
    status: 'checked-out',
    check_out_time: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('visits')
    .update(row)
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    throw new Error(error.message);
  }

  await createLog(supabase, data, 'check-out');

  return toVisit(data);
};

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
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

    switch (action) {
      case 'snapshot':
        return jsonResponse(await getSnapshot(supabase));
      case 'createHost':
      case 'createOrUpdateHost':
        return jsonResponse({ host: await createOrUpdateHost(supabase, getPayload(body, 'host')) });
      case 'deleteHost':
        return jsonResponse({ deleted: await deleteHost(supabase, getPayload(body, 'host')) });
      case 'createSavedVisitor':
      case 'createOrUpdateSavedVisitor':
        return jsonResponse({ savedVisitor: await createOrUpdateSavedVisitor(supabase, getPayload(body, 'savedVisitor')) });
      case 'deleteSavedVisitor':
        return jsonResponse({ deleted: await deleteSavedVisitor(supabase, getPayload(body, 'savedVisitor')) });
      case 'createVisit':
        return jsonResponse({ visit: await createVisit(supabase, getPayload(body, 'visit')) });
      case 'registerWalkIn':
        return jsonResponse({ visit: await createVisit(supabase, getPayload(body, 'visit'), { walkIn: true }) });
      case 'updateVisit':
        return jsonResponse({ visit: await updateVisit(supabase, getPayload(body, 'visit')) });
      case 'checkInVisit':
        return jsonResponse({ visit: await checkInVisit(supabase, getPayload(body, 'visit')) });
      case 'checkOutVisit':
        return jsonResponse({ visit: await checkOutVisit(supabase, getPayload(body, 'visit')) });
      default:
        return jsonResponse({ error: `Unknown action: ${action}` }, 400);
    }
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }

    return jsonResponse({
      error: error instanceof Error ? error.message : 'Unexpected API error.',
    }, 500);
  }
});
