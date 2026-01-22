import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { useVisitorContext } from '@/context/VisitorContext';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';
import { Edit2, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DateTimePicker } from '@/components/ui/datetime-picker';
import { Combobox } from '@/components/ui/combobox';
import { Label } from '@/components/ui/label';

// Since I don't have a Dialog component in src/components/ui/dialog explicitly shown in file list (I see button, card, input),
// I'll implement a simple inline editing mode or a custom overlay if needed.
// However, the prompt asked for "edit booking like a small pen".
// Let's check file list for dialog.

export const VisitorList: React.FC = () => {
  const { visitors, updateVisitor, uniqueHosts, uniqueVisitors } = useVisitorContext();
  const [editingId, setEditingId] = useState<string | null>(null);

  // Edit State
  const [editName, setEditName] = useState('');
  const [editCompany, setEditCompany] = useState('');
  const [editHost, setEditHost] = useState('');
  const [editArrival, setEditArrival] = useState('');

  const startEdit = (visitor: any) => {
    setEditingId(visitor.id);
    setEditName(visitor.name);
    setEditCompany(visitor.company);
    setEditHost(visitor.host);
    setEditArrival(visitor.expectedArrival || '');
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const saveEdit = () => {
    if (editingId) {
      updateVisitor(editingId, {
        name: editName,
        company: editCompany,
        host: editHost,
        expectedArrival: editArrival
      });
      setEditingId(null);
    }
  };

  return (
    <>
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Besökslista</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                <tr>
                  <th className="px-6 py-3">Namn</th>
                  <th className="px-6 py-3">Företag</th>
                  <th className="px-6 py-3">Värd</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Tid</th>
                  <th className="px-6 py-3">Incheckad</th>
                  <th className="px-6 py-3">Utcheckad</th>
                  <th className="px-6 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {visitors.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-4 text-center text-gray-500">Inga besökare registrerade.</td>
                  </tr>
                ) : (
                  visitors.slice().reverse().map(visitor => (
                    <tr key={visitor.id} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700">
                      <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">{visitor.name}</td>
                      <td className="px-6 py-4">{visitor.company}</td>
                      <td className="px-6 py-4">{visitor.host}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          visitor.status === 'checked-in' ? 'bg-green-100 text-green-800' :
                          visitor.status === 'checked-out' ? 'bg-gray-100 text-gray-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {visitor.status === 'checked-in' ? 'Incheckad' :
                           visitor.status === 'checked-out' ? 'Utcheckad' : 'Bokad'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {visitor.expectedArrival ? format(new Date(visitor.expectedArrival), 'd MMM HH:mm', { locale: sv }) : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {visitor.checkInTime ? format(new Date(visitor.checkInTime), 'd MMM HH:mm', { locale: sv }) : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {visitor.checkOutTime ? format(new Date(visitor.checkOutTime), 'd MMM HH:mm', { locale: sv }) : '-'}
                      </td>
                      <td className="px-6 py-4 text-right">
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

      {/* Edit Modal (Simple Fixed Overlay since no Dialog component is guaranteed) */}
      {editingId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-in fade-in">
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
                  <Label>Företag</Label>
                  <Combobox
                    items={uniqueVisitors.map(v => v.company)}
                    value={editCompany}
                    onChange={setEditCompany}
                    id="edit-company"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Värd</Label>
                  <Combobox
                    items={uniqueHosts.map(h => h.name)}
                    value={editHost}
                    onChange={setEditHost}
                    id="edit-host"
                  />
                </div>
                <DateTimePicker
                  label="Förväntad ankomst"
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
