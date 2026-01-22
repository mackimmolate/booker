import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useVisitorContext } from '@/context/VisitorContext';
import { SavedDataList } from './SavedDataList';
import { Combobox } from '@/components/ui/combobox';
import { DateTimePicker } from '@/components/ui/datetime-picker';

export const AddVisitorForm: React.FC = () => {
  const { addVisitor, uniqueHosts, uniqueVisitors } = useVisitorContext();
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [host, setHost] = useState('');
  const [expectedArrival, setExpectedArrival] = useState('');

  const handleNameChange = (newName: string) => {
    setName(newName);

    // Auto-fill company if known visitor
    const knownVisitor = uniqueVisitors.find(v => v.name.toLowerCase() === newName.toLowerCase());
    if (knownVisitor) {
      if (!company) setCompany(knownVisitor.company);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !company || !host) return;

    addVisitor({
      name,
      company,
      host,
      expectedArrival: expectedArrival || new Date().toISOString(),
    });
    // Reset
    setName('');
    setCompany('');
    setHost('');
    setExpectedArrival('');
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Boka besök</CardTitle>
        </CardHeader>
        <form onSubmit={handleSubmit} autoComplete="off">
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                <Label htmlFor="company">Företag *</Label>
                <Combobox
                  id="company"
                  required
                  value={company}
                  onChange={setCompany}
                  items={Array.from(new Set(uniqueVisitors.map(v => v.company)))}
                  placeholder="Företag"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="host">Värd *</Label>
                <Combobox
                  id="host"
                  required
                  value={host}
                  onChange={setHost}
                  items={uniqueHosts.map(h => h.name)}
                  placeholder="Värd"
                />
              </div>
              <div className="space-y-2">
                <DateTimePicker
                  label="Förväntad ankomst"
                  value={expectedArrival}
                  onChange={setExpectedArrival}
                  required
                />
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" className="bg-slate-700 hover:bg-slate-800">Spara bokning</Button>
          </CardFooter>
        </form>
      </Card>

      <SavedDataList />
    </>
  );
};
