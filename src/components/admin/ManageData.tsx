import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useVisitorContext } from '@/context/VisitorContext';

export const ManageData: React.FC = () => {
  const { addSavedHost, addSavedVisitor } = useVisitorContext();

  const [hostName, setHostName] = useState('');
  const [visitorName, setVisitorName] = useState('');
  const [visitorCompany, setVisitorCompany] = useState('');
  const [visitorEmail, setVisitorEmail] = useState('');
  const [hostSuccess, setHostSuccess] = useState(false);
  const [visitorSuccess, setVisitorSuccess] = useState(false);

  const handleAddHost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hostName) return;
    addSavedHost(hostName);
    setHostName('');
    setHostSuccess(true);
    setTimeout(() => setHostSuccess(false), 2000);
  };

  const handleAddVisitor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!visitorName || !visitorCompany) return;
    addSavedVisitor({ name: visitorName, company: visitorCompany, email: visitorEmail });
    setVisitorName('');
    setVisitorCompany('');
    setVisitorEmail('');
    setVisitorSuccess(true);
    setTimeout(() => setVisitorSuccess(false), 2000);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
      <Card>
        <CardHeader>
          <CardTitle>Lägg till Värd</CardTitle>
        </CardHeader>
        <form onSubmit={handleAddHost}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="hostName">Namn</Label>
              <Input
                id="hostName"
                value={hostName}
                onChange={e => setHostName(e.target.value)}
                placeholder="Förnamn Efternamn"
                required
              />
            </div>
            {hostSuccess && <p className="text-sm text-green-600">Värd tillagd!</p>}
          </CardContent>
          <CardFooter>
            <Button type="submit" className="bg-slate-700 hover:bg-slate-800 w-full">Lägg till Värd</Button>
          </CardFooter>
        </form>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Lägg till Besökare</CardTitle>
        </CardHeader>
        <form onSubmit={handleAddVisitor}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="visitorName">Namn</Label>
              <Input
                id="visitorName"
                value={visitorName}
                onChange={e => setVisitorName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="visitorCompany">Företag</Label>
              <Input
                id="visitorCompany"
                value={visitorCompany}
                onChange={e => setVisitorCompany(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="visitorEmail">Email (Valfritt)</Label>
              <Input
                id="visitorEmail"
                type="email"
                value={visitorEmail}
                onChange={e => setVisitorEmail(e.target.value)}
              />
            </div>
            {visitorSuccess && <p className="text-sm text-green-600">Besökare tillagd!</p>}
          </CardContent>
          <CardFooter>
            <Button type="submit" className="bg-slate-700 hover:bg-slate-800 w-full">Lägg till Besökare</Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};
