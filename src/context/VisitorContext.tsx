import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  type LogEntry,
  type NotificationStatus,
  type SavedHost,
  type SavedVisitor,
  type Visitor,
  type VisitorContextType,
  type VisitorDataBackup,
  type VisitorStatus,
} from '../types';
import {
  BOOKER_API_PIN_CHANGED_EVENT,
  checkInBookerVisit,
  checkOutBookerVisit,
  clearStoredBookerApiPin,
  createBookerHost,
  createBookerSavedVisitor,
  createBookerVisit,
  deleteBookerHost,
  deleteBookerSavedVisitor,
  fetchBookerSnapshot,
  getStoredBookerApiPin,
  isBookerApiConfigured,
  registerBookerWalkIn,
  setStoredBookerApiPin,
  updateBookerVisit,
  type BookerSnapshot,
} from '@/lib/booker-api';
import { isHostNotificationConfigured, sendHostNotification } from '@/lib/host-notifications';

const VisitorContext = createContext<VisitorContextType | undefined>(undefined);

const STORAGE_KEY_VISITORS = 'vms_visitors';
const STORAGE_KEY_LOGS = 'vms_logs';
const STORAGE_KEY_SAVED_HOSTS = 'vms_saved_hosts';
const STORAGE_KEY_SAVED_VISITORS = 'vms_saved_visitors';
const BACKUP_VERSION = 1;
const REMOTE_CONFIGURED = isBookerApiConfigured();

const normalizeText = (value?: string) => value?.trim().replace(/\s+/g, ' ') ?? '';

const normalizeOptionalText = (value?: string) => {
  const normalizedValue = normalizeText(value);
  return normalizedValue || undefined;
};

const normalizeEmail = (value?: string) => {
  const normalizedValue = value?.trim().toLowerCase() ?? '';
  return normalizedValue || undefined;
};

const normalizeNotificationStatus = (value: unknown): NotificationStatus | undefined => {
  switch (value) {
    case 'not-configured':
    case 'pending':
    case 'sent':
    case 'failed':
    case 'skipped':
      return value;
    default:
      return undefined;
  }
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const toErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : 'Ett ov\u00e4ntat fel uppstod.';

const sanitizeVisitors = (value: unknown) => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.reduce<Visitor[]>((visitors, entry) => {
    if (!isRecord(entry)) {
      return visitors;
    }

    const status = entry.status;
    const language = entry.language;
    const nextVisitor: Visitor = {
      id: typeof entry.id === 'string' && entry.id ? entry.id : crypto.randomUUID(),
      name: normalizeText(typeof entry.name === 'string' ? entry.name : ''),
      company: normalizeText(typeof entry.company === 'string' ? entry.company : ''),
      host: normalizeText(typeof entry.host === 'string' ? entry.host : ''),
      hostEmail: normalizeEmail(typeof entry.hostEmail === 'string' ? entry.hostEmail : undefined),
      phone: normalizeOptionalText(typeof entry.phone === 'string' ? entry.phone : undefined),
      preBooked: typeof entry.preBooked === 'boolean' ? entry.preBooked : true,
      status: status === 'booked' || status === 'checked-in' || status === 'checked-out' ? status : 'booked',
      expectedArrival: typeof entry.expectedArrival === 'string' ? entry.expectedArrival : undefined,
      checkInTime: typeof entry.checkInTime === 'string' ? entry.checkInTime : undefined,
      checkOutTime: typeof entry.checkOutTime === 'string' ? entry.checkOutTime : undefined,
      notificationStatus: normalizeNotificationStatus(entry.notificationStatus),
      notificationChannel: entry.notificationChannel === 'email' ? 'email' : undefined,
      notificationAttemptedAt: typeof entry.notificationAttemptedAt === 'string' ? entry.notificationAttemptedAt : undefined,
      notificationSentAt: typeof entry.notificationSentAt === 'string' ? entry.notificationSentAt : undefined,
      notificationError: normalizeOptionalText(typeof entry.notificationError === 'string' ? entry.notificationError : undefined),
      language: language === 'sv' || language === 'en' ? language : 'sv',
    };

    if (!nextVisitor.name || !nextVisitor.company || !nextVisitor.host) {
      return visitors;
    }

    visitors.push(nextVisitor);
    return visitors;
  }, []);
};

const sanitizeLogs = (value: unknown) => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.reduce<LogEntry[]>((logs, entry) => {
    if (!isRecord(entry)) {
      return logs;
    }

    const action = entry.action;
    const nextLog: LogEntry = {
      id: typeof entry.id === 'string' && entry.id ? entry.id : crypto.randomUUID(),
      visitorId: typeof entry.visitorId === 'string' ? entry.visitorId : '',
      visitorName: normalizeText(typeof entry.visitorName === 'string' ? entry.visitorName : ''),
      company: normalizeText(typeof entry.company === 'string' ? entry.company : ''),
      host: normalizeText(typeof entry.host === 'string' ? entry.host : ''),
      action: action === 'registered' || action === 'check-in' || action === 'check-out' ? action : 'registered',
      timestamp: typeof entry.timestamp === 'string' ? entry.timestamp : new Date().toISOString(),
      notificationStatus: normalizeNotificationStatus(entry.notificationStatus),
      notificationRecipient: normalizeEmail(typeof entry.notificationRecipient === 'string' ? entry.notificationRecipient : undefined),
    };

    if (!nextLog.visitorId || !nextLog.visitorName || !nextLog.company || !nextLog.host) {
      return logs;
    }

    logs.push(nextLog);
    return logs;
  }, []);
};

const sanitizeSavedHosts = (value: unknown) => {
  const candidateHosts = Array.isArray(value) ? value : [];
  const seenNames = new Map<string, number>();

  return candidateHosts.reduce<SavedHost[]>((hosts, entry) => {
    const nextHost = typeof entry === 'string'
      ? { id: crypto.randomUUID(), name: normalizeText(entry), email: undefined }
      : isRecord(entry)
        ? {
            id: typeof entry.id === 'string' && entry.id ? entry.id : crypto.randomUUID(),
            name: normalizeText(typeof entry.name === 'string' ? entry.name : ''),
            email: normalizeEmail(typeof entry.email === 'string' ? entry.email : undefined),
          }
        : null;

    if (!nextHost?.name) {
      return hosts;
    }

    const normalizedName = nextHost.name.toLowerCase();
    const existingIndex = seenNames.get(normalizedName);

    if (existingIndex !== undefined) {
      if (!hosts[existingIndex].email && nextHost.email) {
        hosts[existingIndex] = { ...hosts[existingIndex], email: nextHost.email };
      }
      return hosts;
    }

    seenNames.set(normalizedName, hosts.length);
    hosts.push(nextHost);
    return hosts;
  }, []);
};

const sanitizeSavedVisitors = (value: unknown) => {
  const candidateVisitors = Array.isArray(value) ? value : [];
  const seenNames = new Set<string>();

  return candidateVisitors.reduce<SavedVisitor[]>((visitors, entry) => {
    if (!isRecord(entry)) {
      return visitors;
    }

    const nextVisitor: SavedVisitor = {
      id: typeof entry.id === 'string' && entry.id ? entry.id : crypto.randomUUID(),
      name: normalizeText(typeof entry.name === 'string' ? entry.name : ''),
      company: normalizeText(typeof entry.company === 'string' ? entry.company : ''),
    };

    if (!nextVisitor.name || !nextVisitor.company) {
      return visitors;
    }

    const normalizedName = nextVisitor.name.toLowerCase();
    if (seenNames.has(normalizedName)) {
      return visitors;
    }

    seenNames.add(normalizedName);
    visitors.push(nextVisitor);
    return visitors;
  }, []);
};

const loadLegacyVisitors = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_VISITORS);
    return sanitizeVisitors(stored ? JSON.parse(stored) : []);
  } catch {
    return [];
  }
};

const loadLegacyLogs = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_LOGS);
    return sanitizeLogs(stored ? JSON.parse(stored) : []);
  } catch {
    return [];
  }
};

const loadLegacySavedHosts = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_SAVED_HOSTS);
    return sanitizeSavedHosts(stored ? JSON.parse(stored) : []);
  } catch {
    return [];
  }
};

const loadLegacySavedVisitors = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_SAVED_VISITORS);
    return sanitizeSavedVisitors(stored ? JSON.parse(stored) : []);
  } catch {
    return [];
  }
};

const createLog = (visitor: Visitor, action: LogEntry['action']): LogEntry => ({
  id: crypto.randomUUID(),
  visitorId: visitor.id,
  visitorName: visitor.name,
  company: visitor.company,
  host: visitor.host,
  action,
  timestamp: new Date().toISOString(),
  notificationStatus: visitor.notificationStatus,
  notificationRecipient: visitor.hostEmail,
});

const mergeSavedHost = (
  hosts: SavedHost[],
  host: Omit<SavedHost, 'id'> | SavedHost,
  options: { preserveEmailWhenEmpty: boolean }
) => {
  const normalizedName = normalizeText(host.name);
  const normalizedEmail = normalizeEmail(host.email);

  if (!normalizedName) {
    return hosts;
  }

  const existingHost = 'id' in host
    ? hosts.find(existing => existing.id === host.id)
    : hosts.find(existing => existing.name.toLowerCase() === normalizedName.toLowerCase());

  if (!existingHost) {
    return [...hosts, {
      id: 'id' in host && host.id ? host.id : crypto.randomUUID(),
      name: normalizedName,
      email: normalizedEmail,
    }];
  }

  if (options.preserveEmailWhenEmpty && !normalizedEmail && existingHost.email) {
    return hosts;
  }

  return hosts.map(existing =>
    existing.id === existingHost.id
      ? { ...existing, name: normalizedName, email: normalizedEmail }
      : existing
  );
};

const mergeSavedVisitor = (
  visitors: SavedVisitor[],
  visitor: Omit<SavedVisitor, 'id'> | SavedVisitor
) => {
  const normalizedName = normalizeText(visitor.name);
  const normalizedCompany = normalizeText(visitor.company);

  if (!normalizedName || !normalizedCompany) {
    return visitors;
  }

  const existingVisitor = 'id' in visitor
    ? visitors.find(existing => existing.id === visitor.id)
    : visitors.find(existing => existing.name.toLowerCase() === normalizedName.toLowerCase());

  if (!existingVisitor) {
    return [...visitors, {
      id: 'id' in visitor && visitor.id ? visitor.id : crypto.randomUUID(),
      name: normalizedName,
      company: normalizedCompany,
    }];
  }

  return visitors.map(existing =>
    existing.id === existingVisitor.id
      ? { ...existing, name: normalizedName, company: normalizedCompany }
      : existing
  );
};

export const VisitorProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [visitors, setVisitors] = useState<Visitor[]>(() => REMOTE_CONFIGURED ? [] : loadLegacyVisitors());
  const [logs, setLogs] = useState<LogEntry[]>(() => REMOTE_CONFIGURED ? [] : loadLegacyLogs());
  const [savedHosts, setSavedHosts] = useState<SavedHost[]>(() => REMOTE_CONFIGURED ? [] : loadLegacySavedHosts());
  const [savedVisitors, setSavedVisitors] = useState<SavedVisitor[]>(() => REMOTE_CONFIGURED ? [] : loadLegacySavedVisitors());
  const [syncStatus, setSyncStatus] = useState<VisitorContextType['syncStatus']>('idle');
  const [syncError, setSyncError] = useState<string | undefined>(() =>
    REMOTE_CONFIGURED && !getStoredBookerApiPin()
      ? 'Backend-PIN saknas. Testa Supabase i adminpanelen f\u00f6r att aktivera synk.'
      : undefined
  );
  const [hasBackendPin, setHasBackendPinState] = useState(() => Boolean(getStoredBookerApiPin()));

  const applySnapshot = useCallback((snapshot: BookerSnapshot) => {
    setSavedHosts(sanitizeSavedHosts(snapshot.hosts));
    setSavedVisitors(sanitizeSavedVisitors(snapshot.savedVisitors));
    setVisitors(sanitizeVisitors(snapshot.visits));
    setLogs(sanitizeLogs(snapshot.logs));
  }, []);

  const refreshData = useCallback(async () => {
    if (!REMOTE_CONFIGURED) {
      setSyncStatus('idle');
      setSyncError(undefined);
      return;
    }

    const backendPin = getStoredBookerApiPin();
    setHasBackendPinState(Boolean(backendPin));

    if (!backendPin) {
      setSyncStatus('idle');
      setSyncError('Backend-PIN saknas. Testa Supabase i adminpanelen f\u00f6r att aktivera synk.');
      return;
    }

    setSyncStatus('loading');
    setSyncError(undefined);

    try {
      applySnapshot(await fetchBookerSnapshot(backendPin));
      setSyncStatus('idle');
    } catch (error) {
      setSyncStatus('error');
      setSyncError(toErrorMessage(error));
    }
  }, [applySnapshot]);

  useEffect(() => {
    if (!REMOTE_CONFIGURED) {
      return;
    }

    void refreshData();

    const handlePinChange = () => {
      setHasBackendPinState(Boolean(getStoredBookerApiPin()));
      void refreshData();
    };

    const handleFocus = () => {
      if (getStoredBookerApiPin()) {
        void refreshData();
      }
    };

    window.addEventListener(BOOKER_API_PIN_CHANGED_EVENT, handlePinChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      window.removeEventListener(BOOKER_API_PIN_CHANGED_EVENT, handlePinChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [refreshData]);

  const runRemoteMutation = useCallback(async <T,>(
    operation: (backendPin: string) => Promise<T>
  ) => {
    const backendPin = getStoredBookerApiPin();

    if (!backendPin) {
      const message = 'Backend-PIN saknas. Testa Supabase i adminpanelen f\u00f6rst.';
      setSyncStatus('error');
      setSyncError(message);
      throw new Error(message);
    }

    setSyncStatus('saving');
    setSyncError(undefined);

    try {
      const result = await operation(backendPin);
      applySnapshot(await fetchBookerSnapshot(backendPin));
      setSyncStatus('idle');
      return result;
    } catch (error) {
      setSyncStatus('error');
      setSyncError(toErrorMessage(error));
      throw error;
    }
  }, [applySnapshot]);

  const setBackendPin = useCallback(async (pin: string) => {
    const normalizedPin = pin.trim();

    if (!REMOTE_CONFIGURED || !normalizedPin) {
      return false;
    }

    setSyncStatus('loading');
    setSyncError(undefined);

    try {
      const snapshot = await fetchBookerSnapshot(normalizedPin);
      setStoredBookerApiPin(normalizedPin);
      setHasBackendPinState(true);
      applySnapshot(snapshot);
      setSyncStatus('idle');
      return true;
    } catch (error) {
      setSyncStatus('error');
      setSyncError(toErrorMessage(error));
      return false;
    }
  }, [applySnapshot]);

  const clearBackendPin = useCallback(() => {
    clearStoredBookerApiPin();
    setHasBackendPinState(false);
    setSyncStatus('idle');
    setSyncError('Backend-PIN saknas. Testa Supabase i adminpanelen f\u00f6r att aktivera synk.');

    if (REMOTE_CONFIGURED) {
      setVisitors([]);
      setLogs([]);
      setSavedHosts([]);
      setSavedVisitors([]);
    }
  }, []);

  const uniqueHosts = useMemo(
    () => [...savedHosts].sort((a, b) => a.name.localeCompare(b.name)),
    [savedHosts]
  );
  const uniqueVisitors = useMemo(
    () => [...savedVisitors].sort((a, b) => a.name.localeCompare(b.name)),
    [savedVisitors]
  );

  const findSavedHostByName = useCallback((hostName: string) => {
    const normalizedHostName = normalizeText(hostName).toLowerCase();
    return savedHosts.find(host => host.name.toLowerCase() === normalizedHostName);
  }, [savedHosts]);

  const resolveHostEmail = useCallback((hostName: string, explicitEmail?: string) =>
    normalizeEmail(explicitEmail) ?? findSavedHostByName(hostName)?.email,
  [findSavedHostByName]);

  const addSavedHost = useCallback<VisitorContextType['addSavedHost']>(async (host) => {
    const normalizedName = normalizeText(host.name);
    const normalizedEmail = normalizeEmail(host.email);

    if (!normalizedName) {
      return;
    }

    if (REMOTE_CONFIGURED) {
      await runRemoteMutation(backendPin =>
        createBookerHost({ name: normalizedName, email: normalizedEmail }, backendPin)
      );
      return;
    }

    setSavedHosts(prev => mergeSavedHost(prev, { name: normalizedName, email: normalizedEmail }, {
      preserveEmailWhenEmpty: true,
    }));
  }, [runRemoteMutation]);

  const updateSavedHost = useCallback<VisitorContextType['updateSavedHost']>(async (id, updates) => {
    const currentHost = savedHosts.find(host => host.id === id);

    if (!currentHost) {
      return;
    }

    const nextHost: SavedHost = {
      ...currentHost,
      ...updates,
      name: updates.name === undefined ? currentHost.name : normalizeText(updates.name),
      email: updates.email === undefined ? currentHost.email : normalizeEmail(updates.email),
    };

    if (!nextHost.name) {
      return;
    }

    if (REMOTE_CONFIGURED) {
      await runRemoteMutation(backendPin => createBookerHost(nextHost, backendPin));
      return;
    }

    setSavedHosts(prev => mergeSavedHost(prev, nextHost, { preserveEmailWhenEmpty: false }));
  }, [runRemoteMutation, savedHosts]);

  const deleteSavedHost = useCallback<VisitorContextType['deleteSavedHost']>(async (id) => {
    if (REMOTE_CONFIGURED) {
      await runRemoteMutation(backendPin => deleteBookerHost(id, backendPin));
      return;
    }

    setSavedHosts(prev => prev.filter(host => host.id !== id));
  }, [runRemoteMutation]);

  const addSavedVisitor = useCallback<VisitorContextType['addSavedVisitor']>(async (visitor) => {
    const normalizedName = normalizeText(visitor.name);
    const normalizedCompany = normalizeText(visitor.company);

    if (!normalizedName || !normalizedCompany) {
      return;
    }

    if (REMOTE_CONFIGURED) {
      await runRemoteMutation(backendPin =>
        createBookerSavedVisitor({ name: normalizedName, company: normalizedCompany }, backendPin)
      );
      return;
    }

    setSavedVisitors(prev => mergeSavedVisitor(prev, { name: normalizedName, company: normalizedCompany }));
  }, [runRemoteMutation]);

  const updateSavedVisitor = useCallback<VisitorContextType['updateSavedVisitor']>(async (id, updates) => {
    const currentVisitor = savedVisitors.find(visitor => visitor.id === id);

    if (!currentVisitor) {
      return;
    }

    const nextVisitor: SavedVisitor = {
      ...currentVisitor,
      ...updates,
      name: updates.name === undefined ? currentVisitor.name : normalizeText(updates.name),
      company: updates.company === undefined ? currentVisitor.company : normalizeText(updates.company),
    };

    if (!nextVisitor.name || !nextVisitor.company) {
      return;
    }

    if (REMOTE_CONFIGURED) {
      await runRemoteMutation(backendPin => createBookerSavedVisitor(nextVisitor, backendPin));
      return;
    }

    setSavedVisitors(prev => mergeSavedVisitor(prev, nextVisitor));
  }, [runRemoteMutation, savedVisitors]);

  const deleteSavedVisitor = useCallback<VisitorContextType['deleteSavedVisitor']>(async (id) => {
    if (REMOTE_CONFIGURED) {
      await runRemoteMutation(backendPin => deleteBookerSavedVisitor(id, backendPin));
      return;
    }

    setSavedVisitors(prev => prev.filter(visitor => visitor.id !== id));
  }, [runRemoteMutation]);

  const addVisitor = useCallback<VisitorContextType['addVisitor']>(async (data) => {
    const normalizedName = normalizeText(data.name);
    const normalizedCompany = normalizeText(data.company);
    const normalizedHost = normalizeText(data.host);
    const resolvedHostEmail = resolveHostEmail(normalizedHost, data.hostEmail);

    if (!normalizedName || !normalizedCompany || !normalizedHost) {
      return undefined;
    }

    const visit = {
      ...data,
      name: normalizedName,
      company: normalizedCompany,
      host: normalizedHost,
      hostEmail: resolvedHostEmail,
      phone: normalizeOptionalText(data.phone),
      expectedArrival: normalizeOptionalText(data.expectedArrival),
      preBooked: true,
      status: 'booked' as VisitorStatus,
      language: 'sv' as const,
    };

    if (REMOTE_CONFIGURED) {
      const result = await runRemoteMutation(backendPin => createBookerVisit(visit, backendPin));
      return result.visit;
    }

    const newVisitor: Visitor = {
      ...visit,
      id: crypto.randomUUID(),
    };

    setVisitors(prev => [...prev, newVisitor]);
    setLogs(prev => [createLog(newVisitor, 'registered'), ...prev]);
    setSavedHosts(prev => mergeSavedHost(prev, { name: newVisitor.host, email: newVisitor.hostEmail }, {
      preserveEmailWhenEmpty: true,
    }));
    setSavedVisitors(prev => mergeSavedVisitor(prev, { name: newVisitor.name, company: newVisitor.company }));

    return newVisitor;
  }, [resolveHostEmail, runRemoteMutation]);

  const registerWalkIn = useCallback<VisitorContextType['registerWalkIn']>(async (data) => {
    const normalizedName = normalizeText(data.name);
    const normalizedCompany = normalizeText(data.company);
    const normalizedHost = normalizeText(data.host);
    const resolvedHostEmail = resolveHostEmail(normalizedHost, data.hostEmail);

    if (!normalizedName || !normalizedCompany || !normalizedHost) {
      return undefined;
    }

    const visit = {
      ...data,
      name: normalizedName,
      company: normalizedCompany,
      host: normalizedHost,
      hostEmail: resolvedHostEmail,
      phone: normalizeOptionalText(data.phone),
      preBooked: false,
      status: 'checked-in' as VisitorStatus,
      checkInTime: new Date().toISOString(),
      notificationStatus: undefined,
      notificationChannel: undefined,
      notificationAttemptedAt: undefined,
      notificationSentAt: undefined,
      notificationError: undefined,
    };

    if (REMOTE_CONFIGURED) {
      const result = await runRemoteMutation(backendPin => registerBookerWalkIn(visit, backendPin));
      return result.visit;
    }

    const newVisitor: Visitor = {
      ...visit,
      id: crypto.randomUUID(),
    };

    setVisitors(prev => [...prev, newVisitor]);
    setLogs(prev => [createLog(newVisitor, 'check-in'), ...prev]);
    setSavedHosts(prev => mergeSavedHost(prev, { name: newVisitor.host, email: newVisitor.hostEmail }, {
      preserveEmailWhenEmpty: true,
    }));
    setSavedVisitors(prev => mergeSavedVisitor(prev, { name: newVisitor.name, company: newVisitor.company }));

    return newVisitor;
  }, [resolveHostEmail, runRemoteMutation]);

  const checkIn = useCallback<VisitorContextType['checkIn']>(async (visitorId, details) => {
    const currentVisitor = visitors.find(visitor => visitor.id === visitorId);

    if (!currentVisitor) {
      return undefined;
    }

    const nextHost = details?.host === undefined ? currentVisitor.host : normalizeText(details.host);
    const nextHostEmail = details?.hostEmail === undefined
      ? resolveHostEmail(nextHost, currentVisitor.hostEmail)
      : resolveHostEmail(nextHost, details.hostEmail);

    const updatedVisitor: Visitor = {
      ...currentVisitor,
      ...details,
      host: nextHost,
      hostEmail: nextHostEmail,
      status: 'checked-in',
      checkInTime: new Date().toISOString(),
      notificationStatus: undefined,
      notificationChannel: undefined,
      notificationAttemptedAt: undefined,
      notificationSentAt: undefined,
      notificationError: undefined,
    };

    if (REMOTE_CONFIGURED) {
      const result = await runRemoteMutation(backendPin =>
        checkInBookerVisit({
          id: visitorId,
          ...details,
          host: nextHost,
          hostEmail: nextHostEmail,
        }, backendPin)
      );
      return result.visit;
    }

    setVisitors(prev => prev.map(visitor => visitor.id === visitorId ? updatedVisitor : visitor));
    setLogs(prev => [createLog(updatedVisitor, 'check-in'), ...prev]);
    setSavedHosts(prev => mergeSavedHost(prev, { name: updatedVisitor.host, email: updatedVisitor.hostEmail }, {
      preserveEmailWhenEmpty: true,
    }));
    setSavedVisitors(prev => mergeSavedVisitor(prev, { name: updatedVisitor.name, company: updatedVisitor.company }));

    return updatedVisitor;
  }, [resolveHostEmail, runRemoteMutation, visitors]);

  const checkOut = useCallback<VisitorContextType['checkOut']>(async (visitorId) => {
    const currentVisitor = visitors.find(visitor => visitor.id === visitorId);

    if (!currentVisitor) {
      return;
    }

    if (REMOTE_CONFIGURED) {
      await runRemoteMutation(backendPin => checkOutBookerVisit(visitorId, backendPin));
      return;
    }

    const updatedVisitor: Visitor = {
      ...currentVisitor,
      status: 'checked-out',
      checkOutTime: new Date().toISOString(),
    };

    setVisitors(prev => prev.map(visitor => visitor.id === visitorId ? updatedVisitor : visitor));
    setLogs(prev => [createLog(updatedVisitor, 'check-out'), ...prev]);
  }, [runRemoteMutation, visitors]);

  const updateVisitor = useCallback<VisitorContextType['updateVisitor']>(async (id, updates) => {
    const currentVisitor = visitors.find(visitor => visitor.id === id);

    if (!currentVisitor) {
      return;
    }

    const nextName = updates.name === undefined ? currentVisitor.name : normalizeText(updates.name);
    const nextCompany = updates.company === undefined ? currentVisitor.company : normalizeText(updates.company);
    const nextHost = updates.host === undefined ? currentVisitor.host : normalizeText(updates.host);

    if (!nextName || !nextCompany || !nextHost) {
      return;
    }

    const nextHostEmail = updates.hostEmail === undefined
      ? (nextHost.toLowerCase() === currentVisitor.host.toLowerCase()
        ? resolveHostEmail(nextHost, currentVisitor.hostEmail)
        : resolveHostEmail(nextHost))
      : resolveHostEmail(nextHost, updates.hostEmail);

    const updatedVisitor: Visitor = {
      ...currentVisitor,
      ...updates,
      name: nextName,
      company: nextCompany,
      host: nextHost,
      hostEmail: nextHostEmail,
      phone: updates.phone === undefined ? currentVisitor.phone : normalizeOptionalText(updates.phone),
      notificationError: updates.notificationError === undefined
        ? currentVisitor.notificationError
        : normalizeOptionalText(updates.notificationError),
    };

    if (REMOTE_CONFIGURED) {
      await runRemoteMutation(backendPin => updateBookerVisit(updatedVisitor, backendPin));
      return;
    }

    setVisitors(prev => prev.map(visitor => visitor.id === id ? updatedVisitor : visitor));
    setSavedHosts(prev => mergeSavedHost(prev, { name: updatedVisitor.host, email: updatedVisitor.hostEmail }, {
      preserveEmailWhenEmpty: true,
    }));
    setSavedVisitors(prev => mergeSavedVisitor(prev, { name: updatedVisitor.name, company: updatedVisitor.company }));
  }, [resolveHostEmail, runRemoteMutation, visitors]);

  const updateNotificationTracking = useCallback(async (
    visitorId: string,
    updates: Pick<
      Visitor,
      | 'hostEmail'
      | 'notificationStatus'
      | 'notificationChannel'
      | 'notificationAttemptedAt'
      | 'notificationSentAt'
      | 'notificationError'
    >
  ) => {
    if (REMOTE_CONFIGURED) {
      await runRemoteMutation(backendPin =>
        updateBookerVisit({ id: visitorId, ...updates }, backendPin)
      );
      return;
    }

    setVisitors(prev =>
      prev.map(visitor => (
        visitor.id === visitorId
          ? { ...visitor, ...updates }
          : visitor
      ))
    );

    setLogs(prev => {
      let updated = false;

      return prev.map(log => {
        if (updated || log.visitorId !== visitorId || log.action !== 'check-in') {
          return log;
        }

        updated = true;
        return {
          ...log,
          notificationStatus: updates.notificationStatus,
          notificationRecipient: updates.hostEmail,
        };
      });
    });
  }, [runRemoteMutation]);

  const notifyHost = useCallback<VisitorContextType['notifyHost']>(async (visitor) => {
    const attemptedAt = new Date().toISOString();
    const hostEmail = resolveHostEmail(visitor.host, visitor.hostEmail);

    if (!hostEmail) {
      await updateNotificationTracking(visitor.id, {
        hostEmail: undefined,
        notificationStatus: 'skipped',
        notificationChannel: 'email',
        notificationAttemptedAt: attemptedAt,
        notificationSentAt: undefined,
        notificationError: undefined,
      });

      return {
        status: 'skipped',
        message: 'Ingen e-postadress finns sparad f\u00f6r den h\u00e4r v\u00e4rden.',
      };
    }

    await addSavedHost({ name: visitor.host, email: hostEmail });

    if (!isHostNotificationConfigured()) {
      await updateNotificationTracking(visitor.id, {
        hostEmail,
        notificationStatus: 'not-configured',
        notificationChannel: 'email',
        notificationAttemptedAt: attemptedAt,
        notificationSentAt: undefined,
        notificationError: undefined,
      });

      return {
        status: 'not-configured',
        recipient: hostEmail,
        message: 'Automatiska e-postutskick \u00e4r inte aktiverade \u00e4n.',
      };
    }

    await updateNotificationTracking(visitor.id, {
      hostEmail,
      notificationStatus: 'pending',
      notificationChannel: 'email',
      notificationAttemptedAt: attemptedAt,
      notificationSentAt: undefined,
      notificationError: undefined,
    });

    const result = await sendHostNotification({
      visitorId: visitor.id,
      visitorName: visitor.name,
      company: visitor.company,
      hostName: visitor.host,
      hostEmail,
      language: visitor.language,
      checkInTime: visitor.checkInTime || attemptedAt,
      preBooked: visitor.preBooked,
    });

    await updateNotificationTracking(visitor.id, {
      hostEmail,
      notificationStatus: result.status,
      notificationChannel: 'email',
      notificationAttemptedAt: attemptedAt,
      notificationSentAt: result.sentAt,
      notificationError: normalizeOptionalText(result.error),
    });

    return result;
  }, [addSavedHost, resolveHostEmail, updateNotificationTracking]);

  const exportBackup = useCallback((): VisitorDataBackup => ({
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    visitors,
    logs,
    savedHosts,
    savedVisitors,
  }), [logs, savedHosts, savedVisitors, visitors]);

  const importBackup = useCallback<VisitorContextType['importBackup']>(async (backup) => {
    if (!isRecord(backup)) {
      return { success: false, message: 'Backupfilen har fel format.' };
    }

    if (
      !Array.isArray(backup.visitors) ||
      !Array.isArray(backup.logs) ||
      !Array.isArray(backup.savedHosts) ||
      !Array.isArray(backup.savedVisitors)
    ) {
      return { success: false, message: 'Backupfilen saknar n\u00f6dv\u00e4ndiga listor.' };
    }

    if (REMOTE_CONFIGURED) {
      return {
        success: false,
        message: 'Import till Supabase \u00e4r inte aktiverad \u00e4n. Export fungerar, men import ska g\u00f6ras via en separat migrering.',
      };
    }

    setVisitors(sanitizeVisitors(backup.visitors));
    setLogs(sanitizeLogs(backup.logs));
    setSavedHosts(sanitizeSavedHosts(backup.savedHosts));
    setSavedVisitors(sanitizeSavedVisitors(backup.savedVisitors));

    return {
      success: true,
      message: 'Backupen importerades till den lokala fallback-datan.',
    };
  }, []);

  return (
    <VisitorContext.Provider value={{
      visitors,
      logs,
      uniqueHosts,
      uniqueVisitors,
      syncStatus,
      syncError,
      isRemoteConfigured: REMOTE_CONFIGURED,
      hasBackendPin,
      refreshData,
      setBackendPin,
      clearBackendPin,

      addVisitor,
      updateVisitor,
      checkIn,
      checkOut,
      registerWalkIn,
      notifyHost,

      savedHosts,
      savedVisitors,
      addSavedHost,
      updateSavedHost,
      deleteSavedHost,

      addSavedVisitor,
      updateSavedVisitor,
      deleteSavedVisitor,

      exportBackup,
      importBackup,
    }}>
      {children}
    </VisitorContext.Provider>
  );
};

export const useVisitorContext = () => {
  const context = useContext(VisitorContext);
  if (context === undefined) {
    throw new Error('useVisitorContext must be used within a VisitorProvider');
  }
  return context;
};
