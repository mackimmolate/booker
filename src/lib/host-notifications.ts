import { type NotificationStatus } from '@/types';

export interface HostNotificationPayload {
  visitorId: string;
  visitorName: string;
  company: string;
  hostName: string;
  hostEmail: string;
  language: 'sv' | 'en';
  checkInTime: string;
  preBooked: boolean;
}

export interface HostNotificationResult {
  status: NotificationStatus;
  message: string;
  recipient?: string;
  sentAt?: string;
  error?: string;
}

interface HostNotificationConfig {
  endpoint: string;
  anonKey: string;
}

const normalizeText = (value: string | undefined) => value?.trim() ?? '';

const toNotificationStatus = (value: unknown): NotificationStatus | null => {
  switch (value) {
    case 'not-configured':
    case 'pending':
    case 'sent':
    case 'failed':
    case 'skipped':
      return value;
    case 'queued':
    case 'accepted':
      return 'pending';
    case 'ok':
    case 'success':
      return 'sent';
    default:
      return null;
  }
};

const getHostNotificationConfig = (): HostNotificationConfig | null => {
  const explicitEndpoint = normalizeText(import.meta.env.VITE_NOTIFICATION_ENDPOINT);
  const supabaseUrl = normalizeText(import.meta.env.VITE_SUPABASE_URL).replace(/\/+$/, '');
  const functionName = normalizeText(import.meta.env.VITE_NOTIFY_FUNCTION_NAME) || 'notify-host';
  const anonKey = normalizeText(import.meta.env.VITE_SUPABASE_ANON_KEY);
  const endpoint = explicitEndpoint || (supabaseUrl ? `${supabaseUrl}/functions/v1/${functionName}` : '');

  if (!endpoint || !anonKey) {
    return null;
  }

  return { endpoint, anonKey };
};

const getRemoteMessage = (responseData: unknown) => {
  if (typeof responseData !== 'object' || responseData === null) {
    return '';
  }

  if ('message' in responseData && typeof responseData.message === 'string') {
    return responseData.message;
  }

  if ('error' in responseData && typeof responseData.error === 'string') {
    return responseData.error;
  }

  return '';
};

export const isHostNotificationConfigured = () => getHostNotificationConfig() !== null;

export const sendHostNotification = async (
  payload: HostNotificationPayload
): Promise<HostNotificationResult> => {
  const recipient = normalizeText(payload.hostEmail);
  if (!recipient) {
    return {
      status: 'skipped',
      message: 'No host email is saved for this host.',
    };
  }

  const config = getHostNotificationConfig();
  if (!config) {
    return {
      status: 'not-configured',
      recipient,
      message: 'Notification delivery is not configured yet.',
    };
  }

  try {
    const response = await fetch(config.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: config.anonKey,
      },
      body: JSON.stringify({
        type: 'host-check-in-email',
        payload,
      }),
    });

    const responseData = await response.json().catch(() => null);
    const remoteStatus =
      typeof responseData === 'object' && responseData !== null && 'status' in responseData
        ? toNotificationStatus(responseData.status)
        : null;
    const message = getRemoteMessage(responseData);

    if (!response.ok) {
      return {
        status: 'failed',
        recipient,
        message: message || `Notification request failed with status ${response.status}.`,
        error: message || `HTTP ${response.status}`,
      };
    }

    const sentAt =
      typeof responseData === 'object' &&
      responseData !== null &&
      'sentAt' in responseData &&
      typeof responseData.sentAt === 'string'
        ? responseData.sentAt
        : undefined;

    return {
      status: remoteStatus ?? 'sent',
      recipient,
      sentAt,
      message: message || 'Notification request completed.',
    };
  } catch (error) {
    return {
      status: 'failed',
      recipient,
      message: 'Notification request failed before the host could be reached.',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};
