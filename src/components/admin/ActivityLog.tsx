import React from 'react';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useVisitorContext } from '@/context/VisitorContext';
import { NotificationStatusBadge } from './NotificationStatusBadge';

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
          <p className="text-sm text-gray-500">{'Inga loggar registrerade \u00e4n.'}</p>
        ) : (
          logs.map(log => (
            <div
              key={log.id}
              className="flex flex-col gap-2 rounded-md border bg-white p-3 sm:flex-row sm:items-start sm:justify-between"
            >
              <div className="space-y-1">
                <p className="font-medium text-gray-900">
                  {log.visitorName} <span className="text-gray-500">({log.company})</span>
                </p>
                <p className="text-sm text-gray-600">
                  {actionLabels[log.action]} hos {log.host}
                </p>
                {log.action === 'check-in' && (
                  <div className="flex flex-wrap items-center gap-2">
                    <NotificationStatusBadge status={log.notificationStatus} />
                    {log.notificationRecipient && (
                      <span className="text-xs text-slate-500">{log.notificationRecipient}</span>
                    )}
                  </div>
                )}
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
