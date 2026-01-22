import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useVisitorContext } from '@/context/VisitorContext';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';

export const VisitorList: React.FC = () => {
  const { visitors } = useVisitorContext();

  return (
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
                <th className="px-6 py-3">Utcheckad</th>
              </tr>
            </thead>
            <tbody>
              {visitors.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500">Inga besökare registrerade.</td>
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
                    <td className="px-6 py-4">
                      {/* Show Expected Arrival if Booked, Check-in Time otherwise */}
                      {visitor.status === 'booked' && visitor.expectedArrival ? (
                        <span className="text-gray-500 italic" title="Förväntad ankomst">
                           Ank: {format(new Date(visitor.expectedArrival), 'd MMM HH:mm', { locale: sv })}
                        </span>
                      ) : visitor.checkInTime ? (
                        format(new Date(visitor.checkInTime), 'd MMM HH:mm', { locale: sv })
                      ) : '-'}
                    </td>
                    <td className="px-6 py-4">
                      {visitor.checkOutTime ? format(new Date(visitor.checkOutTime), 'd MMM HH:mm', { locale: sv }) : '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};
