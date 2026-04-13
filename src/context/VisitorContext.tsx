import React, { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { type Visitor, type LogEntry, type VisitorContextType, type VisitorStatus, type SavedVisitor, type SavedHost, type VisitorDataBackup } from '../types';

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
      phone: normalizeOptionalText(typeof entry.phone === 'string' ? entry.phone : undefined),
      preBooked: typeof entry.preBooked === 'boolean' ? entry.preBooked : true,
      status: status === 'booked' || status === 'checked-in' || status === 'checked-out' ? status : 'booked',
      expectedArrival: typeof entry.expectedArrival === 'string' ? entry.expectedArrival : undefined,
      checkInTime: typeof entry.checkInTime === 'string' ? entry.checkInTime : undefined,
      checkOutTime: typeof entry.checkOutTime === 'string' ? entry.checkOutTime : undefined,
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
  const seenNames = new Set<string>();

  return candidateHosts.reduce<SavedHost[]>((hosts, entry) => {
    const nextHost = typeof entry === 'string'
      ? { id: crypto.randomUUID(), name: normalizeText(entry) }
      : isRecord(entry)
        ? {
            id: typeof entry.id === 'string' && entry.id ? entry.id : crypto.randomUUID(),
            name: normalizeText(typeof entry.name === 'string' ? entry.name : ''),
          }
        : null;

    if (!nextHost?.name) {
      return hosts;
    }

    const normalizedName = nextHost.name.toLowerCase();
    if (seenNames.has(normalizedName)) {
      return hosts;
    }

    seenNames.add(normalizedName);
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

  // Save to local storage whenever state changes
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

  const addLog = (visitor: Visitor, action: LogEntry['action']) => {
    const newLog: LogEntry = {
      id: crypto.randomUUID(),
      visitorId: visitor.id,
      visitorName: visitor.name,
      company: visitor.company,
      host: visitor.host,
      action,
      timestamp: new Date().toISOString(),
    };
    setLogs(prev => [newLog, ...prev]);
  };

  const addSavedHost = (host: Omit<SavedHost, 'id'>) => {
    const normalizedName = normalizeText(host.name);
    if (!normalizedName) {
      return;
    }

    setSavedHosts(prev => {
      if (prev.some(existingHost => existingHost.name.toLowerCase() === normalizedName.toLowerCase())) {
        return prev;
      }

      return [...prev, { id: crypto.randomUUID(), name: normalizedName }];
    });
  };

  const updateSavedHost = (id: string, updates: Partial<SavedHost>) => {
    setSavedHosts(prev => {
      const currentHost = prev.find(host => host.id === id);
      if (!currentHost) {
        return prev;
      }

      const nextName = updates.name === undefined ? currentHost.name : normalizeText(updates.name);
      if (!nextName) {
        return prev;
      }

      if (prev.some(host => host.id !== id && host.name.toLowerCase() === nextName.toLowerCase())) {
        return prev;
      }

      return prev.map(host => host.id === id ? { ...host, name: nextName } : host);
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

  const addVisitor = (data: Omit<Visitor, 'id' | 'status' | 'language' | 'preBooked'>) => {
    const normalizedName = normalizeText(data.name);
    const normalizedCompany = normalizeText(data.company);
    const normalizedHost = normalizeText(data.host);
    if (!normalizedName || !normalizedCompany || !normalizedHost) {
      return;
    }

    const newVisitor: Visitor = {
      ...data,
      name: normalizedName,
      company: normalizedCompany,
      host: normalizedHost,
      phone: normalizeOptionalText(data.phone),
      id: crypto.randomUUID(),
      status: 'booked',
      language: 'sv', // Default
      preBooked: true,
    };
    setVisitors(prev => [...prev, newVisitor]);
    addLog(newVisitor, 'registered');
    addSavedHost({ name: newVisitor.host });
    addSavedVisitor({ name: newVisitor.name, company: newVisitor.company });
  };

  const registerWalkIn = (data: Omit<Visitor, 'id' | 'status' | 'preBooked'>) => {
    const normalizedName = normalizeText(data.name);
    const normalizedCompany = normalizeText(data.company);
    const normalizedHost = normalizeText(data.host);
    if (!normalizedName || !normalizedCompany || !normalizedHost) {
      return;
    }

    const newVisitor: Visitor = {
      ...data,
      name: normalizedName,
      company: normalizedCompany,
      host: normalizedHost,
      phone: normalizeOptionalText(data.phone),
      id: crypto.randomUUID(),
      status: 'checked-in',
      preBooked: false,
      checkInTime: new Date().toISOString(),
    };
    setVisitors(prev => [...prev, newVisitor]);
    addLog(newVisitor, 'check-in');
    addSavedHost({ name: newVisitor.host });
    addSavedVisitor({ name: newVisitor.name, company: newVisitor.company });
  };

  const checkIn = (visitorId: string, details?: Partial<Visitor>) => {
    let updatedVisitor: Visitor | undefined;

    setVisitors(prev => prev.map(v => {
      if (v.id === visitorId) {
        updatedVisitor = {
          ...v,
          ...details,
          status: 'checked-in' as VisitorStatus,
          checkInTime: new Date().toISOString(),
        };
        return updatedVisitor;
      }
      return v;
    }));

    if (updatedVisitor) {
      addLog(updatedVisitor, 'check-in');
    }
  };

  const checkOut = (visitorId: string) => {
    let updatedVisitor: Visitor | undefined;

    setVisitors(prev => prev.map(v => {
      if (v.id === visitorId) {
        updatedVisitor = {
          ...v,
          status: 'checked-out' as VisitorStatus,
          checkOutTime: new Date().toISOString(),
        };
        return updatedVisitor;
      }
      return v;
    }));

    if (updatedVisitor) {
      addLog(updatedVisitor, 'check-out');
    }
  };

  const updateVisitor = (id: string, updates: Partial<Visitor>) => {
    let updatedVisitor: Visitor | undefined;

    setVisitors(prev => prev.map(visitor => {
      if (visitor.id !== id) {
        return visitor;
      }

      const nextName = updates.name === undefined ? visitor.name : normalizeText(updates.name);
      const nextCompany = updates.company === undefined ? visitor.company : normalizeText(updates.company);
      const nextHost = updates.host === undefined ? visitor.host : normalizeText(updates.host);
      if (!nextName || !nextCompany || !nextHost) {
        return visitor;
      }

      updatedVisitor = {
        ...visitor,
        ...updates,
        name: nextName,
        company: nextCompany,
        host: nextHost,
        phone: updates.phone === undefined ? visitor.phone : normalizeOptionalText(updates.phone),
      };

      return updatedVisitor;
    }));

    if (updatedVisitor) {
      addSavedHost({ name: updatedVisitor.host });
      addSavedVisitor({ name: updatedVisitor.name, company: updatedVisitor.company });
    }
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

      addSavedHost,
      updateSavedHost,
      deleteSavedHost,

      addSavedVisitor,
      updateSavedVisitor,
      deleteSavedVisitor,

      exportBackup,
      importBackup
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
