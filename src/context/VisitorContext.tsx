import React, { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { type Visitor, type LogEntry, type VisitorContextType, type VisitorStatus, type SavedVisitor, type SavedHost } from '../types';

const VisitorContext = createContext<VisitorContextType | undefined>(undefined);

const STORAGE_KEY_VISITORS = 'vms_visitors';
const STORAGE_KEY_LOGS = 'vms_logs';
const STORAGE_KEY_SAVED_HOSTS = 'vms_saved_hosts';
const STORAGE_KEY_SAVED_VISITORS = 'vms_saved_visitors';

export const VisitorProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [visitors, setVisitors] = useState<Visitor[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_VISITORS);
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      console.error("Failed to load visitors from local storage", e);
      return [];
    }
  });

  const [logs, setLogs] = useState<LogEntry[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_LOGS);
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      console.error("Failed to load logs from local storage", e);
      return [];
    }
  });

  const [savedHosts, setSavedHosts] = useState<SavedHost[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_SAVED_HOSTS);
      // Migration from old string array to object array if needed
      const parsed = stored ? JSON.parse(stored) : [];
      if (parsed.length > 0 && typeof parsed[0] === 'string') {
          return parsed.map((name: string) => ({ id: crypto.randomUUID(), name }));
      }
      return parsed;
    } catch (e) {
      console.error("Failed to load saved hosts from local storage", e);
      return [];
    }
  });

  const [savedVisitors, setSavedVisitors] = useState<SavedVisitor[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_SAVED_VISITORS);
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      console.error("Failed to load saved visitors from local storage", e);
      return [];
    }
  });

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

  // Derived state for lists
  const uniqueHosts = savedHosts.sort((a, b) => a.name.localeCompare(b.name));
  const uniqueVisitors = savedVisitors.sort((a, b) => a.name.localeCompare(b.name));

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
    setSavedHosts(prev => {
      // Avoid duplicates by name
      if (prev.some(h => h.name.toLowerCase() === host.name.toLowerCase())) return prev;
      return [...prev, { ...host, id: crypto.randomUUID() }];
    });
  };

  const updateSavedHost = (id: string, updates: Partial<SavedHost>) => {
    setSavedHosts(prev => prev.map(h => h.id === id ? { ...h, ...updates } : h));
  };

  const deleteSavedHost = (id: string) => {
    setSavedHosts(prev => prev.filter(h => h.id !== id));
  };

  const addSavedVisitor = (visitor: Omit<SavedVisitor, 'id'>) => {
    setSavedVisitors(prev => {
      // Avoid duplicates by name
      if (prev.some(v => v.name.toLowerCase() === visitor.name.toLowerCase())) return prev;
      return [...prev, { ...visitor, id: crypto.randomUUID() }];
    });
  };

  const updateSavedVisitor = (id: string, updates: Partial<SavedVisitor>) => {
    setSavedVisitors(prev => prev.map(v => v.id === id ? { ...v, ...updates } : v));
  };

  const deleteSavedVisitor = (id: string) => {
    setSavedVisitors(prev => prev.filter(v => v.id !== id));
  };

  const addVisitor = (data: Omit<Visitor, 'id' | 'status' | 'language' | 'preBooked'>) => {
    const newVisitor: Visitor = {
      ...data,
      id: crypto.randomUUID(),
      status: 'booked',
      language: 'sv', // Default
      preBooked: true,
    };
    setVisitors(prev => [...prev, newVisitor]);
    addLog(newVisitor, 'registered');

    // Auto-save new host if not exists
    if (!savedHosts.some(h => h.name.toLowerCase() === data.host.toLowerCase())) {
        addSavedHost({ name: data.host });
    }

    // Auto-save new visitor if not exists
    if (!savedVisitors.some(v => v.name.toLowerCase() === data.name.toLowerCase())) {
        addSavedVisitor({ name: data.name, company: data.company });
    }
  };

  const registerWalkIn = (data: Omit<Visitor, 'id' | 'status' | 'preBooked'>) => {
    const newVisitor: Visitor = {
      ...data,
      id: crypto.randomUUID(),
      status: 'checked-in',
      preBooked: false,
      checkInTime: new Date().toISOString(),
    };
    setVisitors(prev => [...prev, newVisitor]);
    addLog(newVisitor, 'check-in');

    // Auto-save host and visitor on walk-in too? Probably yes.
    if (!savedHosts.some(h => h.name.toLowerCase() === data.host.toLowerCase())) {
        addSavedHost({ name: data.host });
    }
    if (!savedVisitors.some(v => v.name.toLowerCase() === data.name.toLowerCase())) {
        addSavedVisitor({ name: data.name, company: data.company });
    }
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


  return (
    <VisitorContext.Provider value={{
      visitors,
      logs,
      uniqueHosts,
      uniqueVisitors,
      savedHosts,
      savedVisitors,

      addVisitor,
      updateVisitor: (id, updates) => setVisitors(prev => prev.map(v => v.id === id ? { ...v, ...updates } : v)),
      checkIn,
      checkOut,
      registerWalkIn,

      addSavedHost,
      updateSavedHost,
      deleteSavedHost,

      addSavedVisitor,
      updateSavedVisitor,
      deleteSavedVisitor
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
