import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useVisitorContext } from '@/context/VisitorContext';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';
import { Edit2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DateTimePicker } from '@/components/ui/datetime-picker';
import { Combobox } from '@/components/ui/combobox';
import { Label } from '@/components/ui/label';
import { type Visitor } from '@/types';
import { NotificationStatusBadge } from './NotificationStatusBadge';

export const VisitorList: React.FC = () => {
  const { visitors, updateVisitor, uniqueHosts, uniqueVisitors } = useVisitorContext();
  const [editingId, setEditingId] = useState<string | null>(null);

  const [editName, setEditName] = useState('');
  const [editCompany, setEditCompany] = useState('');
  const [editHost, setEditHost] = useState('');
  const [editHostEmail, setEditHostEmail] = useState('');
  const [editArrival, setEditArrival] = useState('');

  const startEdit = (visitor: Visitor) => {
    setEditingId(visitor.id);
    setEditName(visitor.name);
    setEditCompany(visitor.company);
    setEditHost(visitor.host);
    setEditHostEmail(visitor.hostEmail || '');
    setEditArrival(visitor.expectedArrival || '');
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const handleHostChange = (newHost: string) => {
    setEditHost(newHost);

    const knownHost = uniqueHosts.find(host => host.name.toLowerCase() === newHost.toLowerCase());
    setEditHostEmail(knownHost?.email ?? '');
  };

  const saveEdit = () => {
    if (!editingId || !editName.trim() || !editCompany.trim() || !editHost.trim()) {
      return;
    }

    updateVisitor(editingId, {
      name: editName,
      company: editCompany,
      host: editHost,
      hostEmail: editHostEmail,
      expectedArrival: editArrival,
    });
    setEditingId(null);
  };

  return (
    <>
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>{'Bes\u00f6kslista'}</CardTitle>
        </CardHeader>
        <CardContent className="p-2 sm:p-6">
          <div className="w-full overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-700 dark:bg-gray-700 dark:text-gray-400">
                <tr>
                  <th className="px-4 py-2">Namn</th>
                  <th className="px-4 py-2">{'F\u00f6retag'}</th>
                  <th className="px-4 py-2">{'V\u00e4rd'}</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2">Notifiering</th>
                  <th className="px-4 py-2">Tid</th>
                  <th className="px-4 py-2">Incheckad</th>
                  <th className="px-4 py-2">Utcheckad</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {visitors.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-4 text-center text-gray-500">
                      {'Inga bes\u00f6kare registrerade.'}
                    </td>
                  </tr>
                ) : (
                  visitors.slice().reverse().map(visitor => (
                    <tr key={visitor.id} className="border-b bg-white dark:border-gray-700 dark:bg-gray-800">
                      <td className="whitespace-nowrap px-4 py-2 font-medium text-gray-900 dark:text-white">
                        {visitor.name}
                      </td>
                      <td className="px-4 py-2">{visitor.company}</td>
                      <td className="px-4 py-2">
                        <div className="min-w-44">
                          <p>{visitor.host}</p>
                          <p className="text-xs text-slate-500">{visitor.hostEmail || 'Ingen e-post sparad'}</p>
                        </div>
                      </td>
                      <td className="px-4 py-2">
                        <span className={`rounded-full px-2 py-1 text-xs ${
                          visitor.status === 'checked-in' ? 'bg-green-100 text-green-800' :
                          visitor.status === 'checked-out' ? 'bg-gray-100 text-gray-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {visitor.status === 'checked-in' ? 'Incheckad' :
                           visitor.status === 'checked-out' ? 'Utcheckad' : 'Bokad'}
                        </span>
                      </td>
                      <td className="px-4 py-2">
                        {visitor.status === 'checked-in' ? (
                          <div className="flex min-w-40 flex-col gap-1">
                            <NotificationStatusBadge status={visitor.notificationStatus} />
                            {visitor.notificationError && (
                              <p className="text-xs text-rose-600">{visitor.notificationError}</p>
                            )}
                          </div>
                        ) : (
                          <span className="text-sm text-slate-400">V\u00e4ntar p\u00e5 incheckning</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2">
                        {visitor.expectedArrival ? format(new Date(visitor.expectedArrival), 'd MMM HH:mm', { locale: sv }) : '-'}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2">
                        {visitor.checkInTime ? format(new Date(visitor.checkInTime), 'd MMM HH:mm', { locale: sv }) : '-'}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2">
                        {visitor.checkOutTime ? format(new Date(visitor.checkOutTime), 'd MMM HH:mm', { locale: sv }) : '-'}
                      </td>
                      <td className="px-4 py-2 text-right">
                        {visitor.status === 'booked' && (
                          <Button variant="ghost" size="icon" onClick={() => startEdit(visitor)}>
                            <Edit2 size={16} className="text-gray-500 hover:text-blue-600" />
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {editingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-in fade-in">
          <Card className="w-full max-w-lg bg-white shadow-xl">
            <CardHeader>
              <CardTitle>Redigera Bokning</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label>Namn</Label>
                  <Combobox
                    items={uniqueVisitors.map(v => v.name)}
                    value={editName}
                    onChange={setEditName}
                    id="edit-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{'F\u00f6retag'}</Label>
                  <Combobox
                    items={uniqueVisitors.map(v => v.company)}
                    value={editCompany}
                    onChange={setEditCompany}
                    id="edit-company"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{'V\u00e4rd'}</Label>
                  <Combobox
                    items={uniqueHosts.map(h => h.name)}
                    value={editHost}
                    onChange={handleHostChange}
                    id="edit-host"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{'V\u00e4rdens e-post'}</Label>
                  <Input
                    type="email"
                    value={editHostEmail}
                    onChange={e => setEditHostEmail(e.target.value)}
                    placeholder="vard@foretag.se"
                  />
                </div>
                <DateTimePicker
                  label={'F\u00f6rv\u00e4ntad ankomst'}
                  value={editArrival}
                  onChange={setEditArrival}
                />
              </div>
            </CardContent>
            <CardFooter className="flex justify-end gap-2">
              <Button variant="outline" onClick={cancelEdit}>Avbryt</Button>
              <Button className="bg-slate-700 hover:bg-slate-800" onClick={saveEdit}>Spara</Button>
            </CardFooter>
          </Card>
        </div>
      )}
    </>
  );
};
