export type VisitorStatus = 'booked' | 'checked-in' | 'checked-out';

export interface Visitor {
  id: string;
  name: string;
  company: string;
  host: string;
  email?: string;
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
  name: string;
  company: string;
  email: string;
}

export interface VisitorContextType {
  visitors: Visitor[];
  logs: LogEntry[];
  uniqueHosts: string[];
  uniqueVisitors: SavedVisitor[];
  addVisitor: (visitor: Omit<Visitor, 'id' | 'status' | 'language' | 'preBooked'>) => void;
  checkIn: (visitorId: string, details?: Partial<Visitor>) => void;
  checkOut: (visitorId: string) => void;
  registerWalkIn: (visitor: Omit<Visitor, 'id' | 'status' | 'preBooked'>) => void;
  addSavedHost: (name: string) => void;
  addSavedVisitor: (visitor: SavedVisitor) => void;
}
