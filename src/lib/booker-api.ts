import { type LogEntry, type SavedHost, type SavedVisitor, type Visitor } from '@/types';

interface BookerApiConfig {
  endpoint: string;
  anonKey: string;
}

export interface BookerSnapshot {
  hosts: SavedHost[];
  savedVisitors: SavedVisitor[];
  visits: Visitor[];
  logs: LogEntry[];
}

export const BOOKER_API_PIN_CHANGED_EVENT = 'booker-api-pin-changed';

const BOOKER_API_PIN_KEY = 'vms_booker_api_pin';
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

export const getStoredBookerApiPin = () =>
  localStorage.getItem(BOOKER_API_PIN_KEY)?.trim() ?? '';

export const setStoredBookerApiPin = (pin: string) => {
  const normalizedPin = pin.trim();

  if (!normalizedPin) {
    localStorage.removeItem(BOOKER_API_PIN_KEY);
  } else {
    localStorage.setItem(BOOKER_API_PIN_KEY, normalizedPin);
  }

  window.dispatchEvent(new Event(BOOKER_API_PIN_CHANGED_EVENT));
};

export const clearStoredBookerApiPin = () => {
  localStorage.removeItem(BOOKER_API_PIN_KEY);
  window.dispatchEvent(new Event(BOOKER_API_PIN_CHANGED_EVENT));
};

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

export const fetchBookerSnapshot = (adminPin = getStoredBookerApiPin()) =>
  callBookerApi<BookerSnapshot>('snapshot', { adminPin });

export const createBookerHost = (host: Omit<SavedHost, 'id'> | SavedHost, adminPin = getStoredBookerApiPin()) =>
  callBookerApi<{ host: SavedHost }>('createOrUpdateHost', { adminPin, payload: { host } });

export const deleteBookerHost = (id: string, adminPin = getStoredBookerApiPin()) =>
  callBookerApi<{ deleted: { id: string } }>('deleteHost', { adminPin, payload: { host: { id } } });

export const createBookerSavedVisitor = (
  savedVisitor: Omit<SavedVisitor, 'id'> | SavedVisitor,
  adminPin = getStoredBookerApiPin()
) =>
  callBookerApi<{ savedVisitor: SavedVisitor }>('createOrUpdateSavedVisitor', {
    adminPin,
    payload: { savedVisitor },
  });

export const deleteBookerSavedVisitor = (id: string, adminPin = getStoredBookerApiPin()) =>
  callBookerApi<{ deleted: { id: string } }>('deleteSavedVisitor', {
    adminPin,
    payload: { savedVisitor: { id } },
  });

export const createBookerVisit = (
  visit: Partial<Visitor> & Pick<Visitor, 'name' | 'company' | 'host'>,
  adminPin = getStoredBookerApiPin()
) =>
  callBookerApi<{ visit: Visitor }>('createVisit', { adminPin, payload: { visit } });

export const registerBookerWalkIn = (
  visit: Partial<Visitor> & Pick<Visitor, 'name' | 'company' | 'host' | 'language'>,
  adminPin = getStoredBookerApiPin()
) =>
  callBookerApi<{ visit: Visitor }>('registerWalkIn', { adminPin, payload: { visit } });

export const updateBookerVisit = (
  visit: Partial<Visitor> & Pick<Visitor, 'id'>,
  adminPin = getStoredBookerApiPin()
) =>
  callBookerApi<{ visit: Visitor }>('updateVisit', { adminPin, payload: { visit } });

export const checkInBookerVisit = (
  visit: Partial<Visitor> & Pick<Visitor, 'id'>,
  adminPin = getStoredBookerApiPin()
) =>
  callBookerApi<{ visit: Visitor }>('checkInVisit', { adminPin, payload: { visit } });

export const checkOutBookerVisit = (id: string, adminPin = getStoredBookerApiPin()) =>
  callBookerApi<{ visit: Visitor }>('checkOutVisit', { adminPin, payload: { visit: { id } } });
