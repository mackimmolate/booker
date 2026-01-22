export type VisitorStatus = 'booked' | 'checked-in' | 'checked-out';

export interface Visitor {
  id: string;
  name: string;
  company: string;
  host: string;
  phone?: string;
  preBooked: boolean;
  status: VisitorStatus;
  expectedArrival?: string; // ISO date string
  checkInTime?: string; // ISO date string
  checkOutTime?: string; // ISO date string
  language: 'sv' | 'en';
}

export interface LogEntry {
  id: string;
  visitorId: string;
  visitorName: string;
  company: string;
  host: string;
  action: 'check-in' | 'check-out' | 'registered';
  timestamp: string; // ISO date string
}

export interface SavedVisitor {
  id: string;
  name: string;
  company: string;
}

export interface SavedHost {
  id: string;
  name: string;
}

export interface VisitorContextType {
  visitors: Visitor[];
  logs: LogEntry[];
  uniqueHosts: SavedHost[];
  uniqueVisitors: SavedVisitor[];

  addVisitor: (visitor: Omit<Visitor, 'id' | 'status' | 'language' | 'preBooked'>) => void;
  updateVisitor: (id: string, updates: Partial<Visitor>) => void;
  checkIn: (visitorId: string, details?: Partial<Visitor>) => void;
  checkOut: (visitorId: string) => void;
  registerWalkIn: (visitor: Omit<Visitor, 'id' | 'status' | 'preBooked'>) => void;

  // Data Management
  savedHosts: SavedHost[];
  savedVisitors: SavedVisitor[];
  addSavedHost: (host: Omit<SavedHost, 'id'>) => void;
  updateSavedHost: (id: string, host: Partial<SavedHost>) => void;
  deleteSavedHost: (id: string) => void;

  addSavedVisitor: (visitor: Omit<SavedVisitor, 'id'>) => void;
  updateSavedVisitor: (id: string, visitor: Partial<SavedVisitor>) => void;
  deleteSavedVisitor: (id: string) => void;
}
