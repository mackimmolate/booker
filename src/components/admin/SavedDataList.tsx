import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useVisitorContext } from '@/context/VisitorContext';
import { Trash2, Edit2, Save, X } from 'lucide-react';

export const SavedDataList: React.FC = () => {
  const {
    savedHosts, savedVisitors,
    updateSavedHost, deleteSavedHost,
    updateSavedVisitor, deleteSavedVisitor
  } = useVisitorContext();

  const [editingHost, setEditingHost] = useState<string | null>(null);
  const [editHostName, setEditHostName] = useState('');

  const [editingVisitor, setEditingVisitor] = useState<string | null>(null);
  const [editVisitorName, setEditVisitorName] = useState('');
  const [editVisitorCompany, setEditVisitorCompany] = useState('');

  // Host Actions
  const startEditHost = (id: string, name: string) => {
    setEditingHost(id);
    setEditHostName(name);
  };

  const saveHost = (id: string) => {
    updateSavedHost(id, { name: editHostName });
    setEditingHost(null);
  };

  const cancelEditHost = () => {
    setEditingHost(null);
    setEditHostName('');
  };

  // Visitor Actions
  const startEditVisitor = (id: string, name: string, company: string) => {
    setEditingVisitor(id);
    setEditVisitorName(name);
    setEditVisitorCompany(company);
  };

  const saveVisitor = (id: string) => {
    updateSavedVisitor(id, { name: editVisitorName, company: editVisitorCompany });
    setEditingVisitor(null);
  };

  const cancelEditVisitor = () => {
    setEditingVisitor(null);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
      {/* Saved Hosts */}
      <Card>
        <CardHeader>
          <CardTitle>Sparade Värdar</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 max-h-96 overflow-y-auto">
          {savedHosts.length === 0 ? (
            <p className="text-sm text-gray-500">Inga sparade värdar.</p>
          ) : (
            savedHosts.map(host => (
              <div key={host.id} className="flex items-center justify-between p-2 border rounded-md bg-white">
                {editingHost === host.id ? (
                  <div className="flex gap-2 w-full items-center">
                    <Input
                      value={editHostName}
                      onChange={e => setEditHostName(e.target.value)}
                      className="h-8"
                    />
                    <Button size="icon" variant="ghost" onClick={() => saveHost(host.id)} className="h-8 w-8 text-green-600">
                      <Save size={16} />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={cancelEditHost} className="h-8 w-8 text-red-600">
                      <X size={16} />
                    </Button>
                  </div>
                ) : (
                  <>
                    <span className="font-medium">{host.name}</span>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" onClick={() => startEditHost(host.id, host.name)} className="h-8 w-8 text-blue-600">
                        <Edit2 size={16} />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => deleteSavedHost(host.id)} className="h-8 w-8 text-red-600">
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Saved Visitors */}
      <Card>
        <CardHeader>
          <CardTitle>Sparade Besökare</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 max-h-96 overflow-y-auto">
          {savedVisitors.length === 0 ? (
            <p className="text-sm text-gray-500">Inga sparade besökare.</p>
          ) : (
            savedVisitors.map(visitor => (
              <div key={visitor.id} className="p-2 border rounded-md bg-white">
                {editingVisitor === visitor.id ? (
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs">Namn</Label>
                        <Input value={editVisitorName} onChange={e => setEditVisitorName(e.target.value)} className="h-8" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Företag</Label>
                        <Input value={editVisitorCompany} onChange={e => setEditVisitorCompany(e.target.value)} className="h-8" />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 mt-2">
                      <Button size="sm" variant="ghost" onClick={() => saveVisitor(visitor.id)} className="text-green-600">
                        <Save size={16} className="mr-1" /> Spara
                      </Button>
                      <Button size="sm" variant="ghost" onClick={cancelEditVisitor} className="text-red-600">
                        <X size={16} className="mr-1" /> Avbryt
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-bold">{visitor.name}</p>
                      <p className="text-sm text-gray-600">{visitor.company}</p>
                    </div>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" onClick={() => startEditVisitor(visitor.id, visitor.name, visitor.company)} className="h-8 w-8 text-blue-600">
                        <Edit2 size={16} />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => deleteSavedVisitor(visitor.id)} className="h-8 w-8 text-red-600">
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
};
