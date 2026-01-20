import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useVisitorContext } from '@/context/VisitorContext';

export const AddVisitorForm: React.FC = () => {
  const { addVisitor } = useVisitorContext();
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [host, setHost] = useState('');
  const [email, setEmail] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !company || !host) return;

    addVisitor({
      name,
      company,
      host,
      email,
    });
    // Reset
    setName('');
    setCompany('');
    setHost('');
    setEmail('');
    // Could use a toast here, but simple alert or nothing is okay for now.
    // Ideally we see it appear in the list.
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Boka Besök</CardTitle>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Namn *</Label>
              <Input id="name" required value={name} onChange={e => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="company">Företag *</Label>
              <Input id="company" required value={company} onChange={e => setCompany(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="host">Värd *</Label>
              <Input id="host" required value={host} onChange={e => setHost(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email (Valfritt)</Label>
              <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} />
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit">Spara Bokning</Button>
        </CardFooter>
      </form>
    </Card>
  );
};
