import React, { useState } from 'react';
import { AdminLogin } from '../components/admin/AdminLogin';
import { AddVisitorForm } from '../components/admin/AddVisitorForm';
import { VisitorList } from '../components/admin/VisitorList';
import { ActivityLog } from '../components/admin/ActivityLog';
import { Button } from '@/components/ui/button';
import {
  hasConfiguredAdminPin,
  hasManagedAdminPin,
  isAdminSessionActive,
  setAdminSessionActive,
} from '@/lib/admin-auth';

export const AdminPage: React.FC = () => {
  const [hasPinConfigured, setHasPinConfigured] = useState(() => hasConfiguredAdminPin());
  const [isAuthenticated, setIsAuthenticated] = useState(
    () => hasConfiguredAdminPin() && isAdminSessionActive()
  );

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

      <AddVisitorForm />
      <VisitorList />
      <ActivityLog />
    </div>
  );
};
