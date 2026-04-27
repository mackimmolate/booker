import React, { useState } from 'react';
import { AdminLogin } from '../components/admin/AdminLogin';
import { AddVisitorForm } from '../components/admin/AddVisitorForm';
import { VisitorList } from '../components/admin/VisitorList';
import { ActivityLog } from '../components/admin/ActivityLog';
import { BackupPanel } from '../components/admin/BackupPanel';
import { SupabaseStatusPanel } from '../components/admin/SupabaseStatusPanel';
import { Button } from '@/components/ui/button';
import { isHostNotificationConfigured } from '@/lib/host-notifications';
import {
  hasConfiguredAdminPin,
  hasManagedAdminPin,
  isAdminSessionActive,
  setAdminSessionActive,
} from '@/lib/admin-auth';
import { useVisitorContext } from '@/context/VisitorContext';

export const AdminPage: React.FC = () => {
  const { syncStatus, syncError, isRemoteConfigured, hasBackendPin, refreshData } = useVisitorContext();
  const [hasPinConfigured, setHasPinConfigured] = useState(() => hasConfiguredAdminPin());
  const [isAuthenticated, setIsAuthenticated] = useState(
    () => hasConfiguredAdminPin() && isAdminSessionActive()
  );
  const notificationsReady = isHostNotificationConfigured();

  const handleAuthenticated = () => {
    setHasPinConfigured(true);
    setAdminSessionActive(true);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    setAdminSessionActive(false);
    setIsAuthenticated(false);
  };

  if (!hasPinConfigured) {
    return (
      <AdminLogin
        mode="setup"
        usesManagedPin={hasManagedAdminPin()}
        onSuccess={handleAuthenticated}
      />
    );
  }

  if (!isAuthenticated) {
    return (
      <AdminLogin
        mode="login"
        usesManagedPin={hasManagedAdminPin()}
        onSuccess={handleAuthenticated}
      />
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-7xl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <Button variant="outline" onClick={handleLogout}>Logga ut</Button>
      </div>

      <div className={`mb-6 rounded-xl border px-4 py-3 text-sm ${
        notificationsReady
          ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
          : 'border-amber-200 bg-amber-50 text-amber-800'
      }`}>
        {notificationsReady
          ? 'Hostnotifiering via e-post \u00e4r konfigurerad. Nya incheckningar kan skicka ett riktigt meddelande.'
          : 'Hosters e-postadresser kan sparas redan nu. Sj\u00e4lva utskicket aktiveras n\u00e4r Supabase- och notifieringsmilj\u00f6variablerna \u00e4r satta.'}
      </div>

      {isRemoteConfigured && (
        <div className={`mb-6 flex flex-col gap-3 rounded-xl border px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between ${
          hasBackendPin && syncStatus !== 'error'
            ? 'border-sky-200 bg-sky-50 text-sky-800'
            : 'border-amber-200 bg-amber-50 text-amber-800'
        }`}>
          <span>
            {hasBackendPin
              ? `Supabase-synk \u00e4r aktiv (${syncStatus}).${syncError ? ` ${syncError}` : ''}`
              : 'Supabase \u00e4r konfigurerat, men backend-PIN saknas p\u00e5 den h\u00e4r enheten. Testa Supabase-panelen nedan en g\u00e5ng.'}
          </span>
          {hasBackendPin && (
            <Button type="button" variant="outline" size="sm" onClick={() => void refreshData()}>
              Uppdatera data
            </Button>
          )}
        </div>
      )}

      <AddVisitorForm />
      <VisitorList />
      <SupabaseStatusPanel />
      <BackupPanel />
      <ActivityLog />
    </div>
  );
};
