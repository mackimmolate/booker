import React, { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { type Visitor, type LogEntry, type VisitorContextType, type VisitorStatus, type SavedVisitor } from '../types';

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

  const [savedHosts, setSavedHosts] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_SAVED_HOSTS);
      return stored ? JSON.parse(stored) : [];
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

  // Derived state for autocomplete
  const uniqueHosts = Array.from(new Set([
    ...savedHosts,
    ...visitors.map(v => v.host).filter(Boolean)
  ])).sort();

  const uniqueVisitors = Object.values(
    [...savedVisitors, ...visitors.map(v => ({ name: v.name, company: v.company, email: v.email || '' }))]
      .reduce((acc, v) => {
        if (!acc[v.name]) {
          acc[v.name] = v;
        }
        return acc;
      }, {} as Record<string, SavedVisitor>)
  ).sort((a, b) => a.name.localeCompare(b.name));


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

  const addSavedHost = (name: string) => {
    setSavedHosts(prev => {
      if (prev.includes(name)) return prev;
      return [...prev, name];
    });
  };

  const addSavedVisitor = (visitor: SavedVisitor) => {
    setSavedVisitors(prev => {
      // Check if name already exists, if so, maybe update it? Or just ignore.
      // For now, let's ignore to prevent duplicates, or we can overwrite.
      // Let's overwrite so we can update details.
      const others = prev.filter(v => v.name.toLowerCase() !== visitor.name.toLowerCase());
      return [...others, visitor];
    });
  };

  return (
    <VisitorContext.Provider value={{
      visitors,
      logs,
      uniqueHosts,
      uniqueVisitors,
      addVisitor,
      checkIn,
      checkOut,
      registerWalkIn,
      addSavedHost,
      addSavedVisitor
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
