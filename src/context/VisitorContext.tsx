import React, { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
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
import { isHostNotificationConfigured, sendHostNotification } from '@/lib/host-notifications';

const VisitorContext = createContext<VisitorContextType | undefined>(undefined);

const STORAGE_KEY_VISITORS = 'vms_visitors';
const STORAGE_KEY_LOGS = 'vms_logs';
const STORAGE_KEY_SAVED_HOSTS = 'vms_saved_hosts';
const STORAGE_KEY_SAVED_VISITORS = 'vms_saved_visitors';
const BACKUP_VERSION = 1;
const STORAGE_KEYS = [
  STORAGE_KEY_VISITORS,
  STORAGE_KEY_LOGS,
  STORAGE_KEY_SAVED_HOSTS,
  STORAGE_KEY_SAVED_VISITORS,
] as const;

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

const loadVisitors = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_VISITORS);
    return sanitizeVisitors(stored ? JSON.parse(stored) : []);
  } catch (e) {
    console.error('Failed to load visitors from local storage', e);
    return [];
  }
};

const loadLogs = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_LOGS);
    return sanitizeLogs(stored ? JSON.parse(stored) : []);
  } catch (e) {
    console.error('Failed to load logs from local storage', e);
    return [];
  }
};

const loadSavedHosts = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_SAVED_HOSTS);
    return sanitizeSavedHosts(stored ? JSON.parse(stored) : []);
  } catch (e) {
    console.error('Failed to load saved hosts from local storage', e);
    return [];
  }
};

const loadSavedVisitors = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_SAVED_VISITORS);
    return sanitizeSavedVisitors(stored ? JSON.parse(stored) : []);
  } catch (e) {
    console.error('Failed to load saved visitors from local storage', e);
    return [];
  }
};

export const VisitorProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [visitors, setVisitors] = useState<Visitor[]>(loadVisitors);
  const [logs, setLogs] = useState<LogEntry[]>(loadLogs);
  const [savedHosts, setSavedHosts] = useState<SavedHost[]>(loadSavedHosts);
  const [savedVisitors, setSavedVisitors] = useState<SavedVisitor[]>(loadSavedVisitors);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_VISITORS, JSON.stringify(visitors));
  }, [visitors]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_LOGS, JSON.stringify(logs));
  }, [logs]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_SAVED_HOSTS, JSON.stringify(savedHosts));
  }, [savedHosts]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_SAVED_VISITORS, JSON.stringify(savedVisitors));
  }, [savedVisitors]);

  useEffect(() => {
    const syncFromStorage = () => {
      setVisitors(loadVisitors());
      setLogs(loadLogs());
      setSavedHosts(loadSavedHosts());
      setSavedVisitors(loadSavedVisitors());
    };

    const handleStorage = (event: StorageEvent) => {
      if (!event.key || STORAGE_KEYS.includes(event.key as (typeof STORAGE_KEYS)[number])) {
        syncFromStorage();
      }
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener('focus', syncFromStorage);

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('focus', syncFromStorage);
    };
  }, []);

  const uniqueHosts = useMemo(
    () => [...savedHosts].sort((a, b) => a.name.localeCompare(b.name)),
    [savedHosts]
  );
  const uniqueVisitors = useMemo(
    () => [...savedVisitors].sort((a, b) => a.name.localeCompare(b.name)),
    [savedVisitors]
  );

  const findSavedHostByName = (hostName: string) => {
    const normalizedHostName = normalizeText(hostName).toLowerCase();
    return savedHosts.find(host => host.name.toLowerCase() === normalizedHostName);
  };

  const resolveHostEmail = (hostName: string, explicitEmail?: string) =>
    normalizeEmail(explicitEmail) ?? findSavedHostByName(hostName)?.email;

  const addLog = (visitor: Visitor, action: LogEntry['action']) => {
    const newLog: LogEntry = {
      id: crypto.randomUUID(),
      visitorId: visitor.id,
      visitorName: visitor.name,
      company: visitor.company,
      host: visitor.host,
      action,
      timestamp: new Date().toISOString(),
      notificationStatus: visitor.notificationStatus,
      notificationRecipient: visitor.hostEmail,
    };
    setLogs(prev => [newLog, ...prev]);
  };

  const updateNotificationTracking = (
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
    setVisitors(prev =>
      prev.map(visitor => (
        visitor.id === visitorId
          ? {
              ...visitor,
              ...updates,
            }
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
  };

  const addSavedHost = (host: Omit<SavedHost, 'id'>) => {
    const normalizedName = normalizeText(host.name);
    const normalizedEmail = normalizeEmail(host.email);
    if (!normalizedName) {
      return;
    }

    setSavedHosts(prev => {
      const existingHost = prev.find(existing => existing.name.toLowerCase() === normalizedName.toLowerCase());
      if (!existingHost) {
        return [...prev, { id: crypto.randomUUID(), name: normalizedName, email: normalizedEmail }];
      }

      if (existingHost.email === normalizedEmail || (!normalizedEmail && existingHost.email)) {
        return prev;
      }

      return prev.map(existing =>
        existing.id === existingHost.id
          ? { ...existing, email: normalizedEmail }
          : existing
      );
    });
  };

  const updateSavedHost = (id: string, updates: Partial<SavedHost>) => {
    setSavedHosts(prev => {
      const currentHost = prev.find(host => host.id === id);
      if (!currentHost) {
        return prev;
      }

      const nextName = updates.name === undefined ? currentHost.name : normalizeText(updates.name);
      const nextEmail = updates.email === undefined ? currentHost.email : normalizeEmail(updates.email);
      if (!nextName) {
        return prev;
      }

      if (prev.some(host => host.id !== id && host.name.toLowerCase() === nextName.toLowerCase())) {
        return prev;
      }

      return prev.map(host => host.id === id ? { ...host, name: nextName, email: nextEmail } : host);
    });
  };

  const deleteSavedHost = (id: string) => {
    setSavedHosts(prev => prev.filter(h => h.id !== id));
  };

  const addSavedVisitor = (visitor: Omit<SavedVisitor, 'id'>) => {
    const normalizedName = normalizeText(visitor.name);
    const normalizedCompany = normalizeText(visitor.company);
    if (!normalizedName || !normalizedCompany) {
      return;
    }

    setSavedVisitors(prev => {
      if (prev.some(savedVisitor => savedVisitor.name.toLowerCase() === normalizedName.toLowerCase())) {
        return prev;
      }

      return [...prev, { id: crypto.randomUUID(), name: normalizedName, company: normalizedCompany }];
    });
  };

  const updateSavedVisitor = (id: string, updates: Partial<SavedVisitor>) => {
    setSavedVisitors(prev => {
      const currentVisitor = prev.find(visitor => visitor.id === id);
      if (!currentVisitor) {
        return prev;
      }

      const nextName = updates.name === undefined ? currentVisitor.name : normalizeText(updates.name);
      const nextCompany = updates.company === undefined ? currentVisitor.company : normalizeText(updates.company);
      if (!nextName || !nextCompany) {
        return prev;
      }

      if (prev.some(visitor => visitor.id !== id && visitor.name.toLowerCase() === nextName.toLowerCase())) {
        return prev;
      }

      return prev.map(visitor => visitor.id === id
        ? { ...visitor, name: nextName, company: nextCompany }
        : visitor
      );
    });
  };

  const deleteSavedVisitor = (id: string) => {
    setSavedVisitors(prev => prev.filter(v => v.id !== id));
  };

  const addVisitor = (data: Omit<Visitor, 'id' | 'status' | 'language' | 'preBooked' | 'notificationStatus' | 'notificationChannel' | 'notificationAttemptedAt' | 'notificationSentAt' | 'notificationError'>) => {
    const normalizedName = normalizeText(data.name);
    const normalizedCompany = normalizeText(data.company);
    const normalizedHost = normalizeText(data.host);
    const resolvedHostEmail = resolveHostEmail(normalizedHost, data.hostEmail);
    if (!normalizedName || !normalizedCompany || !normalizedHost) {
      return;
    }

    const newVisitor: Visitor = {
      ...data,
      name: normalizedName,
      company: normalizedCompany,
      host: normalizedHost,
      hostEmail: resolvedHostEmail,
      phone: normalizeOptionalText(data.phone),
      id: crypto.randomUUID(),
      status: 'booked',
      language: 'sv',
      preBooked: true,
    };

    setVisitors(prev => [...prev, newVisitor]);
    addLog(newVisitor, 'registered');
    addSavedHost({ name: newVisitor.host, email: newVisitor.hostEmail });
    addSavedVisitor({ name: newVisitor.name, company: newVisitor.company });
  };

  const registerWalkIn = (data: Omit<Visitor, 'id' | 'status' | 'preBooked' | 'notificationStatus' | 'notificationChannel' | 'notificationAttemptedAt' | 'notificationSentAt' | 'notificationError'>) => {
    const normalizedName = normalizeText(data.name);
    const normalizedCompany = normalizeText(data.company);
    const normalizedHost = normalizeText(data.host);
    const resolvedHostEmail = resolveHostEmail(normalizedHost, data.hostEmail);
    if (!normalizedName || !normalizedCompany || !normalizedHost) {
      return undefined;
    }

    const newVisitor: Visitor = {
      ...data,
      name: normalizedName,
      company: normalizedCompany,
      host: normalizedHost,
      hostEmail: resolvedHostEmail,
      phone: normalizeOptionalText(data.phone),
      id: crypto.randomUUID(),
      status: 'checked-in',
      preBooked: false,
      checkInTime: new Date().toISOString(),
      notificationStatus: undefined,
      notificationChannel: undefined,
      notificationAttemptedAt: undefined,
      notificationSentAt: undefined,
      notificationError: undefined,
    };

    setVisitors(prev => [...prev, newVisitor]);
    addLog(newVisitor, 'check-in');
    addSavedHost({ name: newVisitor.host, email: newVisitor.hostEmail });
    addSavedVisitor({ name: newVisitor.name, company: newVisitor.company });

    return newVisitor;
  };

  const checkIn = (visitorId: string, details?: Partial<Visitor>) => {
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
      status: 'checked-in' as VisitorStatus,
      checkInTime: new Date().toISOString(),
      notificationStatus: undefined,
      notificationChannel: undefined,
      notificationAttemptedAt: undefined,
      notificationSentAt: undefined,
      notificationError: undefined,
    };

    setVisitors(prev => prev.map(visitor => (
      visitor.id === visitorId ? updatedVisitor : visitor
    )));

    addLog(updatedVisitor, 'check-in');
    addSavedHost({ name: updatedVisitor.host, email: updatedVisitor.hostEmail });
    addSavedVisitor({ name: updatedVisitor.name, company: updatedVisitor.company });

    return updatedVisitor;
  };

  const checkOut = (visitorId: string) => {
    const currentVisitor = visitors.find(visitor => visitor.id === visitorId);
    if (!currentVisitor) {
      return;
    }

    const updatedVisitor: Visitor = {
      ...currentVisitor,
      status: 'checked-out' as VisitorStatus,
      checkOutTime: new Date().toISOString(),
    };

    setVisitors(prev => prev.map(visitor => (
      visitor.id === visitorId ? updatedVisitor : visitor
    )));
    addLog(updatedVisitor, 'check-out');
  };

  const updateVisitor = (id: string, updates: Partial<Visitor>) => {
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

    setVisitors(prev => prev.map(visitor => (
      visitor.id === id ? updatedVisitor : visitor
    )));
    addSavedHost({ name: updatedVisitor.host, email: updatedVisitor.hostEmail });
    addSavedVisitor({ name: updatedVisitor.name, company: updatedVisitor.company });
  };

  const notifyHost: VisitorContextType['notifyHost'] = async (visitor) => {
    const attemptedAt = new Date().toISOString();
    const hostEmail = resolveHostEmail(visitor.host, visitor.hostEmail);

    if (!hostEmail) {
      updateNotificationTracking(visitor.id, {
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

    addSavedHost({ name: visitor.host, email: hostEmail });

    if (!isHostNotificationConfigured()) {
      updateNotificationTracking(visitor.id, {
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

    updateNotificationTracking(visitor.id, {
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

    updateNotificationTracking(visitor.id, {
      hostEmail,
      notificationStatus: result.status,
      notificationChannel: 'email',
      notificationAttemptedAt: attemptedAt,
      notificationSentAt: result.sentAt,
      notificationError: normalizeOptionalText(result.error),
    });

    return result;
  };

  const exportBackup = (): VisitorDataBackup => ({
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    visitors,
    logs,
    savedHosts,
    savedVisitors,
  });

  const importBackup = (backup: unknown) => {
    if (!isRecord(backup)) {
      return { success: false, message: 'Backupfilen har fel format.' };
    }

    const nextVisitors = sanitizeVisitors(backup.visitors);
    const nextLogs = sanitizeLogs(backup.logs);
    const nextSavedHosts = sanitizeSavedHosts(backup.savedHosts);
    const nextSavedVisitors = sanitizeSavedVisitors(backup.savedVisitors);

    if (
      !Array.isArray(backup.visitors) ||
      !Array.isArray(backup.logs) ||
      !Array.isArray(backup.savedHosts) ||
      !Array.isArray(backup.savedVisitors)
    ) {
      return { success: false, message: 'Backupfilen saknar n\u00f6dv\u00e4ndiga listor.' };
    }

    setVisitors(nextVisitors);
    setLogs(nextLogs);
    setSavedHosts(nextSavedHosts);
    setSavedVisitors(nextSavedVisitors);

    return {
      success: true,
      message: 'Backupen importerades och ersatte den lokala datan.',
    };
  };

  return (
    <VisitorContext.Provider value={{
      visitors,
      logs,
      uniqueHosts,
      uniqueVisitors,
      savedHosts,
      savedVisitors,

      addVisitor,
      updateVisitor,
      checkIn,
      checkOut,
      registerWalkIn,
      notifyHost,

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
