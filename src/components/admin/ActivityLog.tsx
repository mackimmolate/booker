import React from 'react';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useVisitorContext } from '@/context/VisitorContext';

const actionLabels = {
  registered: 'Registrerad',
  'check-in': 'Incheckad',
  'check-out': 'Utcheckad',
} as const;

export const ActivityLog: React.FC = () => {
  const { logs } = useVisitorContext();

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>Aktivitetslogg</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {logs.length === 0 ? (
          <p className="text-sm text-gray-500">Inga loggar registrerade \xe4n.</p>
        ) : (
          logs.map(log => (
            <div
              key={log.id}
              className="flex flex-col gap-1 rounded-md border bg-white p-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-medium text-gray-900">
                  {log.visitorName} <span className="text-gray-500">({log.company})</span>
                </p>
                <p className="text-sm text-gray-600">
                  {actionLabels[log.action]} hos {log.host}
                </p>
              </div>
              <p className="text-sm text-gray-500">
                {format(new Date(log.timestamp), 'd MMM yyyy HH:mm', { locale: sv })}
              </p>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
};
