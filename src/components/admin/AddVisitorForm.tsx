import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useVisitorContext } from '@/context/VisitorContext';
import { SavedDataList } from './SavedDataList';
import { Combobox } from '@/components/ui/combobox';
import { DateTimePicker } from '@/components/ui/datetime-picker';
import { getRoundedCurrentIso } from '@/lib/date-time';

export const AddVisitorForm: React.FC = () => {
  const { addVisitor, uniqueHosts, uniqueVisitors } = useVisitorContext();
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [host, setHost] = useState('');
  const [hostEmail, setHostEmail] = useState('');
  const [expectedArrival, setExpectedArrival] = useState(() => getRoundedCurrentIso());

  const handleNameChange = (newName: string) => {
    setName(newName);

    const knownVisitor = uniqueVisitors.find(v => v.name.toLowerCase() === newName.toLowerCase());
    if (knownVisitor) {
      setCompany(knownVisitor.company);
    }
  };

  const handleHostChange = (newHost: string) => {
    setHost(newHost);

    const knownHost = uniqueHosts.find(savedHost => savedHost.name.toLowerCase() === newHost.toLowerCase());
    setHostEmail(knownHost?.email ?? '');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !company || !host) return;

    addVisitor({
      name,
      company,
      host,
      hostEmail,
      expectedArrival,
    });

    setName('');
    setCompany('');
    setHost('');
    setHostEmail('');
    setExpectedArrival(getRoundedCurrentIso());
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>{'Boka bes\u00f6k'}</CardTitle>
        </CardHeader>
        <form onSubmit={handleSubmit} autoComplete="off">
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Namn *</Label>
                <Combobox
                  id="name"
                  required
                  value={name}
                  onChange={handleNameChange}
                  items={uniqueVisitors.map(v => v.name)}
                  placeholder="Namn"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company">{'F\u00f6retag *'}</Label>
                <Combobox
                  id="company"
                  required
                  value={company}
                  onChange={setCompany}
                  items={Array.from(new Set(uniqueVisitors.map(v => v.company)))}
                  placeholder={'F\u00f6retag'}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="host">{'V\u00e4rd *'}</Label>
                <Combobox
                  id="host"
                  required
                  value={host}
                  onChange={handleHostChange}
                  items={uniqueHosts.map(h => h.name)}
                  placeholder={'V\u00e4rd'}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="host-email">{'V\u00e4rdens e-post'}</Label>
                <Input
                  id="host-email"
                  type="email"
                  value={hostEmail}
                  onChange={e => setHostEmail(e.target.value)}
                  placeholder="vard@foretag.se"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <DateTimePicker
                  label={'F\u00f6rv\u00e4ntad ankomst'}
                  value={expectedArrival}
                  onChange={setExpectedArrival}
                  required
                />
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-500">
              {'Spara hostens e-post nu s\u00e5 \u00e4r bokningen redo n\u00e4r Supabase-notifiering aktiveras.'}
            </p>
            <Button type="submit" className="bg-slate-700 hover:bg-slate-800">Spara bokning</Button>
          </CardFooter>
        </form>
      </Card>

      <SavedDataList />
    </>
  );
};
