import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { setLocalAdminPin, verifyAdminPin } from '@/lib/admin-auth';

interface AdminLoginProps {
  mode: 'login' | 'setup';
  usesManagedPin: boolean;
  onSuccess: () => void;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({ mode, usesManagedPin, onSuccess }) => {
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isSetupMode = mode === 'setup';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const normalizedPin = pin.trim();
    if (!normalizedPin) {
      setError('Ange en PIN-kod.');
      return;
    }

    setIsSubmitting(true);

    try {
      if (isSetupMode) {
        if (usesManagedPin) {
          setError('Den h\u00e4r milj\u00f6n anv\u00e4nder en f\u00f6rkonfigurerad admin-PIN.');
          return;
        }

        if (normalizedPin.length < 4) {
          setError('PIN-koden beh\u00f6ver vara minst 4 tecken.');
          return;
        }

        if (normalizedPin !== confirmPin.trim()) {
          setError('PIN-koderna matchar inte.');
          return;
        }

        await setLocalAdminPin(normalizedPin);
        onSuccess();
        return;
      }

      const isValid = await verifyAdminPin(normalizedPin);
      if (!isValid) {
        setError('Fel PIN-kod');
        return;
      }

      onSuccess();
    } catch {
      setError('Det gick inte att hantera PIN-koden i den h\u00e4r webbl\u00e4saren.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-center">
            {isSetupMode ? 'Skapa Admin-PIN' : 'Admin Login'}
          </CardTitle>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pin">PIN Kod</Label>
              <Input
                id="pin"
                type="password"
                inputMode="numeric"
                placeholder={isSetupMode ? 'Skapa en PIN-kod' : 'Ange PIN-kod'}
                value={pin}
                onChange={(e) => {
                  setPin(e.target.value);
                  setError('');
                }}
              />
            </div>
            {isSetupMode && (
              <div className="space-y-2">
                <Label htmlFor="confirm-pin">{'Bekr\u00e4fta PIN Kod'}</Label>
                <Input
                  id="confirm-pin"
                  type="password"
                  inputMode="numeric"
                  placeholder="Ange PIN-koden igen"
                  value={confirmPin}
                  onChange={(e) => {
                    setConfirmPin(e.target.value);
                    setError('');
                  }}
                />
              </div>
            )}
            <p className="text-sm text-gray-600">
              {isSetupMode
                ? 'Den h\u00e4r prototypen sparar admin-PIN lokalt i den h\u00e4r webbl\u00e4saren tills delad autentisering finns p\u00e5 plats.'
                : usesManagedPin
                  ? 'Anv\u00e4nd admin-PIN som \u00e4r konfigurerad f\u00f6r den h\u00e4r milj\u00f6n.'
                  : 'Anv\u00e4nd admin-PIN som tidigare sparats i den h\u00e4r webbl\u00e4saren.'}
            </p>
            {error && <p className="text-sm text-red-500">{error}</p>}
          </CardContent>
          <CardFooter>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-slate-700 hover:bg-slate-800"
            >
              {isSetupMode ? 'Spara PIN' : 'Logga In'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};
