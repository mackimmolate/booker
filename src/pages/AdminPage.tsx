import React, { useState } from 'react';
import { AdminLogin } from '../components/admin/AdminLogin';
import { AddVisitorForm } from '../components/admin/AddVisitorForm';
import { VisitorList } from '../components/admin/VisitorList';
import { Button } from '@/components/ui/button';

export const AdminPage: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  if (!isAuthenticated) {
    return <AdminLogin onLogin={() => setIsAuthenticated(true)} />;
  }

  return (
    <div className="container mx-auto p-4 max-w-7xl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <Button variant="outline" onClick={() => setIsAuthenticated(false)}>Logga ut</Button>
      </div>

      <AddVisitorForm />
      <VisitorList />
    </div>
  );
};
