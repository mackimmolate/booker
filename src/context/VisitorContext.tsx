import React, { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { type Visitor, type LogEntry, type VisitorContextType, type VisitorStatus } from '../types';

interface ExtendedVisitorContextType extends VisitorContextType {
  uniqueHosts: string[];
  uniqueVisitors: { name: string; company: string; email: string }[];
}

const VisitorContext = createContext<ExtendedVisitorContextType | undefined>(undefined);

const STORAGE_KEY_VISITORS = 'vms_visitors';
const STORAGE_KEY_LOGS = 'vms_logs';

export const VisitorProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);

  // Load from local storage on mount
  useEffect(() => {
    try {
      const storedVisitors = localStorage.getItem(STORAGE_KEY_VISITORS);
      const storedLogs = localStorage.getItem(STORAGE_KEY_LOGS);

      if (storedVisitors) {
        setVisitors(JSON.parse(storedVisitors));
      }
      if (storedLogs) {
        setLogs(JSON.parse(storedLogs));
      }
    } catch (e) {
      console.error("Failed to load from local storage", e);
    }
  }, []);

  // Save to local storage whenever state changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_VISITORS, JSON.stringify(visitors));
  }, [visitors]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_LOGS, JSON.stringify(logs));
  }, [logs]);

  // Derived state for autocomplete
  const uniqueHosts = Array.from(new Set(visitors.map(v => v.host).filter(Boolean))).sort();
  const uniqueVisitors = Object.values(
    visitors.reduce((acc, v) => {
      if (!acc[v.name]) {
        acc[v.name] = { name: v.name, company: v.company, email: v.email || '' };
      }
      return acc;
    }, {} as Record<string, { name: string; company: string; email: string }>)
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

  return (
    <VisitorContext.Provider value={{
      visitors,
      logs,
      addVisitor,
      checkIn,
      checkOut,
      registerWalkIn,
      uniqueHosts,
      uniqueVisitors
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
