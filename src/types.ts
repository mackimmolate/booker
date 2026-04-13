export type VisitorStatus = 'booked' | 'checked-in' | 'checked-out';
export type NotificationStatus = 'not-configured' | 'pending' | 'sent' | 'failed' | 'skipped';
export type NotificationChannel = 'email';

export interface Visitor {
  id: string;
  name: string;
  company: string;
  host: string;
  hostEmail?: string;
  phone?: string;
  preBooked: boolean;
  status: VisitorStatus;
  expectedArrival?: string; // ISO date string
  checkInTime?: string; // ISO date string
  checkOutTime?: string; // ISO date string
  notificationStatus?: NotificationStatus;
  notificationChannel?: NotificationChannel;
  notificationAttemptedAt?: string; // ISO date string
  notificationSentAt?: string; // ISO date string
  notificationError?: string;
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
  notificationStatus?: NotificationStatus;
  notificationRecipient?: string;
}

export interface SavedVisitor {
  id: string;
  name: string;
  company: string;
}

export interface SavedHost {
  id: string;
  name: string;
  email?: string;
}

export interface VisitorDataBackup {
  version: number;
  exportedAt: string;
  visitors: Visitor[];
  logs: LogEntry[];
  savedHosts: SavedHost[];
  savedVisitors: SavedVisitor[];
}

export interface VisitorContextType {
  visitors: Visitor[];
  logs: LogEntry[];
  uniqueHosts: SavedHost[];
  uniqueVisitors: SavedVisitor[];

  addVisitor: (visitor: Omit<Visitor, 'id' | 'status' | 'language' | 'preBooked' | 'notificationStatus' | 'notificationChannel' | 'notificationAttemptedAt' | 'notificationSentAt' | 'notificationError'>) => void;
  updateVisitor: (id: string, updates: Partial<Visitor>) => void;
  checkIn: (visitorId: string, details?: Partial<Visitor>) => Visitor | undefined;
  checkOut: (visitorId: string) => void;
  registerWalkIn: (visitor: Omit<Visitor, 'id' | 'status' | 'preBooked' | 'notificationStatus' | 'notificationChannel' | 'notificationAttemptedAt' | 'notificationSentAt' | 'notificationError'>) => Visitor | undefined;
  notifyHost: (visitor: Visitor) => Promise<{
    status: NotificationStatus;
    message: string;
    recipient?: string;
    sentAt?: string;
    error?: string;
  }>;

  // Data Management
  savedHosts: SavedHost[];
  savedVisitors: SavedVisitor[];
  addSavedHost: (host: Omit<SavedHost, 'id'>) => void;
  updateSavedHost: (id: string, host: Partial<SavedHost>) => void;
  deleteSavedHost: (id: string) => void;

  addSavedVisitor: (visitor: Omit<SavedVisitor, 'id'>) => void;
  updateSavedVisitor: (id: string, visitor: Partial<SavedVisitor>) => void;
  deleteSavedVisitor: (id: string) => void;

  exportBackup: () => VisitorDataBackup;
  importBackup: (backup: unknown) => { success: boolean; message: string };
}
