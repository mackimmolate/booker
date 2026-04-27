import React, { useRef, useState } from 'react';
import { Download, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useVisitorContext } from '@/context/VisitorContext';

const formatTimestamp = (isoTimestamp: string) =>
  isoTimestamp.replace(/[:.]/g, '-');

export const BackupPanel: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { exportBackup, importBackup } = useVisitorContext();
  const [status, setStatus] = useState('');

  const handleExport = () => {
    const backup = exportBackup();
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const downloadUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = `visitor-backup-${formatTimestamp(backup.exportedAt)}.json`;
    link.click();
    URL.revokeObjectURL(downloadUrl);
    setStatus('Backupen laddades ned.');
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) {
      return;
    }

    if (!window.confirm('Import kan ers\u00e4tta lokal fallback-data. Vill du forts\u00e4tta?')) {
      return;
    }

    try {
      const parsedBackup = JSON.parse(await file.text()) as unknown;
      const result = await importBackup(parsedBackup);
      setStatus(result.message);
    } catch {
      setStatus('Det gick inte att l\u00e4sa backupfilen.');
    }
  };

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>{'S\u00e4kerhetskopiering'}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <p className="text-sm text-gray-600">
          {'Exporten tar en JSON-kopia av aktuell data. Import \u00e4r bara aktiv i lokal fallback och ska inte anv\u00e4ndas f\u00f6r Supabase utan en separat migrering.'}
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button type="button" variant="outline" className="gap-2" onClick={handleExport}>
            <Download size={16} />
            Exportera Backup
          </Button>
          <Button type="button" className="gap-2 bg-slate-700 hover:bg-slate-800" onClick={handleImportClick}>
            <Upload size={16} />
            Importera Backup
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={handleImport}
          />
        </div>
        {status && <p className="text-sm text-gray-600">{status}</p>}
      </CardContent>
    </Card>
  );
};
