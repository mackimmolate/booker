interface BookerApiConfig {
  endpoint: string;
  anonKey: string;
}

export interface BookerSnapshot {
  hosts: unknown[];
  savedVisitors: unknown[];
  visits: unknown[];
  logs: unknown[];
}

const normalizeText = (value: string | undefined) => value?.trim() ?? '';

const getBookerApiConfig = (): BookerApiConfig | null => {
  const explicitEndpoint = normalizeText(import.meta.env.VITE_BOOKER_API_ENDPOINT);
  const supabaseUrl = normalizeText(import.meta.env.VITE_SUPABASE_URL).replace(/\/+$/, '');
  const functionName = normalizeText(import.meta.env.VITE_BOOKER_API_FUNCTION_NAME) || 'booker-api';
  const anonKey = normalizeText(import.meta.env.VITE_SUPABASE_ANON_KEY);
  const endpoint = explicitEndpoint || (supabaseUrl ? `${supabaseUrl}/functions/v1/${functionName}` : '');

  if (!endpoint || !anonKey) {
    return null;
  }

  return { endpoint, anonKey };
};

const getResponseMessage = (responseData: unknown) => {
  if (typeof responseData !== 'object' || responseData === null) {
    return '';
  }

  if ('error' in responseData && typeof responseData.error === 'string') {
    return responseData.error;
  }

  if ('message' in responseData && typeof responseData.message === 'string') {
    return responseData.message;
  }

  return '';
};

export const isBookerApiConfigured = () => getBookerApiConfig() !== null;

export const callBookerApi = async <TResponse>(
  action: string,
  options: {
    adminPin?: string;
    payload?: Record<string, unknown>;
  } = {}
) => {
  const config = getBookerApiConfig();
  if (!config) {
    throw new Error('Supabase API is not configured in the frontend env.');
  }

  const response = await fetch(config.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: config.anonKey,
      Authorization: `Bearer ${config.anonKey}`,
      ...(options.adminPin ? { 'x-booker-admin-pin': options.adminPin } : {}),
    },
    body: JSON.stringify({
      action,
      ...(options.payload ?? {}),
    }),
  });

  const responseData = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(getResponseMessage(responseData) || `Booker API failed with status ${response.status}.`);
  }

  return responseData as TResponse;
};

export const checkBookerApiHealth = () =>
  callBookerApi<{ ok: boolean; function: string }>('health');

export const fetchBookerSnapshot = (adminPin: string) =>
  callBookerApi<BookerSnapshot>('snapshot', { adminPin });
