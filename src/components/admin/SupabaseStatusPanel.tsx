import React, { useState } from 'react';
import { Database, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { checkBookerApiHealth, fetchBookerSnapshot, isBookerApiConfigured } from '@/lib/booker-api';

type StatusState = 'idle' | 'checking' | 'ok' | 'error';

export const SupabaseStatusPanel: React.FC = () => {
  const isConfigured = isBookerApiConfigured();
  const [status, setStatus] = useState<StatusState>('idle');
  const [message, setMessage] = useState(
    isConfigured
      ? 'Supabase API \u00e4r konfigurerad i frontend-milj\u00f6n.'
      : 'Supabase API saknar frontend-milj\u00f6variabler.'
  );
  const [counts, setCounts] = useState<{
    hosts: number;
    savedVisitors: number;
    visits: number;
    logs: number;
  } | null>(null);
  const [backendPin, setBackendPin] = useState('');

  const handleCheck = async () => {
    if (!isConfigured) {
      setStatus('error');
      setMessage('L\u00e4gg till Supabase URL och anon key innan anslutningen testas.');
      return;
    }

    setStatus('checking');
    setCounts(null);

    try {
      const health = await checkBookerApiHealth();

      if (!backendPin.trim()) {
        setStatus('ok');
        setMessage(`${health.function} svarar. Ange backend-PIN f\u00f6r att testa databasanrop.`);
        return;
      }

      const snapshot = await fetchBookerSnapshot(backendPin.trim());
      setCounts({
        hosts: snapshot.hosts.length,
        savedVisitors: snapshot.savedVisitors.length,
        visits: snapshot.visits.length,
        logs: snapshot.logs.length,
      });
      setStatus('ok');
      setMessage(`${health.function} svarar och backend-PIN fungerar.`);
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Supabase-testet misslyckades.');
    }
  };

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database size={20} />
          Supabase
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className={`rounded-md border px-3 py-2 text-sm ${
          status === 'ok'
            ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
            : status === 'error' || !isConfigured
              ? 'border-amber-200 bg-amber-50 text-amber-800'
              : 'border-slate-200 bg-slate-50 text-slate-700'
        }`}>
          {message}
        </div>

        {counts && (
          <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <div className="rounded-md border bg-white p-3">
              <p className="text-slate-500">{'V\u00e4rdar'}</p>
              <p className="text-xl font-semibold">{counts.hosts}</p>
            </div>
            <div className="rounded-md border bg-white p-3">
              <p className="text-slate-500">{'Sparade bes\u00f6kare'}</p>
              <p className="text-xl font-semibold">{counts.savedVisitors}</p>
            </div>
            <div className="rounded-md border bg-white p-3">
              <p className="text-slate-500">{'Bes\u00f6k'}</p>
              <p className="text-xl font-semibold">{counts.visits}</p>
            </div>
            <div className="rounded-md border bg-white p-3">
              <p className="text-slate-500">Loggar</p>
              <p className="text-xl font-semibold">{counts.logs}</p>
            </div>
          </div>
        )}

        <div className="max-w-sm space-y-2">
          <Label htmlFor="backend-pin">Backend-PIN</Label>
          <Input
            id="backend-pin"
            type="password"
            value={backendPin}
            onChange={event => setBackendPin(event.target.value)}
            placeholder="Samma som BOOKER_ADMIN_PIN"
          />
        </div>

        <Button
          type="button"
          variant="outline"
          className="gap-2"
          onClick={() => void handleCheck()}
          disabled={status === 'checking'}
        >
          <RefreshCw size={16} className={status === 'checking' ? 'animate-spin' : ''} />
          Testa Supabase
        </Button>
      </CardContent>
    </Card>
  );
};
