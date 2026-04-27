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
    updateSavedVisitor, deleteSavedVisitor,
  } = useVisitorContext();

  const [editingHost, setEditingHost] = useState<string | null>(null);
  const [editHostName, setEditHostName] = useState('');
  const [editHostEmail, setEditHostEmail] = useState('');

  const [editingVisitor, setEditingVisitor] = useState<string | null>(null);
  const [editVisitorName, setEditVisitorName] = useState('');
  const [editVisitorCompany, setEditVisitorCompany] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const startEditHost = (id: string, name: string, email?: string) => {
    setEditingHost(id);
    setEditHostName(name);
    setEditHostEmail(email ?? '');
  };

  const saveHost = async (id: string) => {
    if (!editHostName.trim()) {
      return;
    }

    setErrorMessage('');

    try {
      await updateSavedHost(id, { name: editHostName, email: editHostEmail });
      setEditingHost(null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Det gick inte att spara v\u00e4rden.');
    }
  };

  const cancelEditHost = () => {
    setEditingHost(null);
    setEditHostName('');
    setEditHostEmail('');
  };

  const startEditVisitor = (id: string, name: string, company: string) => {
    setEditingVisitor(id);
    setEditVisitorName(name);
    setEditVisitorCompany(company);
  };

  const saveVisitor = async (id: string) => {
    if (!editVisitorName.trim() || !editVisitorCompany.trim()) {
      return;
    }

    setErrorMessage('');

    try {
      await updateSavedVisitor(id, { name: editVisitorName, company: editVisitorCompany });
      setEditingVisitor(null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Det gick inte att spara bes\u00f6karen.');
    }
  };

  const cancelEditVisitor = () => {
    setEditingVisitor(null);
  };

  return (
    <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2">
      {errorMessage && (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 md:col-span-2">
          {errorMessage}
        </div>
      )}
      <Card>
        <CardHeader>
          <CardTitle>{'Sparade v\u00e4rdar'}</CardTitle>
        </CardHeader>
        <CardContent className="max-h-96 space-y-4 overflow-y-auto">
          {savedHosts.length === 0 ? (
            <p className="text-sm text-gray-500">{'Inga sparade v\u00e4rdar.'}</p>
          ) : (
            savedHosts.map(host => (
              <div key={host.id} className="rounded-md border bg-white p-3">
                {editingHost === host.id ? (
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Namn</Label>
                      <Input
                        value={editHostName}
                        onChange={e => setEditHostName(e.target.value)}
                        className="h-9"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">{'E-post f\u00f6r notifiering'}</Label>
                      <Input
                        type="email"
                        value={editHostEmail}
                        onChange={e => setEditHostEmail(e.target.value)}
                        className="h-9"
                        placeholder="vard@foretag.se"
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="ghost" onClick={() => void saveHost(host.id)} className="text-green-600">
                        <Save size={16} className="mr-1" /> Spara
                      </Button>
                      <Button size="sm" variant="ghost" onClick={cancelEditHost} className="text-red-600">
                        <X size={16} className="mr-1" /> Avbryt
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{host.name}</p>
                      <p className="text-sm text-gray-600">
                        {host.email || 'Ingen e-post sparad'}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => startEditHost(host.id, host.name, host.email)}
                        className="h-8 w-8 text-blue-600"
                      >
                        <Edit2 size={16} />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => void deleteSavedHost(host.id).catch(error => {
                          setErrorMessage(error instanceof Error ? error.message : 'Det gick inte att ta bort v\u00e4rden.');
                        })}
                        className="h-8 w-8 text-red-600"
                      >
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

      <Card>
        <CardHeader>
          <CardTitle>{'Sparade bes\u00f6kare'}</CardTitle>
        </CardHeader>
        <CardContent className="max-h-96 space-y-4 overflow-y-auto">
          {savedVisitors.length === 0 ? (
            <p className="text-sm text-gray-500">{'Inga sparade bes\u00f6kare.'}</p>
          ) : (
            savedVisitors.map(visitor => (
              <div key={visitor.id} className="rounded-md border bg-white p-2">
                {editingVisitor === visitor.id ? (
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs">Namn</Label>
                        <Input value={editVisitorName} onChange={e => setEditVisitorName(e.target.value)} className="h-8" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">{'F\u00f6retag'}</Label>
                        <Input value={editVisitorCompany} onChange={e => setEditVisitorCompany(e.target.value)} className="h-8" />
                      </div>
                    </div>
                    <div className="mt-2 flex justify-end gap-2">
                      <Button size="sm" variant="ghost" onClick={() => void saveVisitor(visitor.id)} className="text-green-600">
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
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => void deleteSavedVisitor(visitor.id).catch(error => {
                          setErrorMessage(error instanceof Error ? error.message : 'Det gick inte att ta bort bes\u00f6karen.');
                        })}
                        className="h-8 w-8 text-red-600"
                      >
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
