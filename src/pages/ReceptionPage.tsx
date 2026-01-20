import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useVisitorContext } from '@/context/VisitorContext';
import { translations, type Language } from '../components/kiosk/translations';
import { ArrowLeft, CheckCircle, Search } from 'lucide-react';

export const ReceptionPage: React.FC = () => {
  const [lang, setLang] = useState<Language>('sv');
  const [view, setView] = useState<'home' | 'check-in-mode' | 'check-in-search' | 'check-in-walkin' | 'check-out' | 'success'>('home');
  const [message, setMessage] = useState('');
  const t = translations[lang];
  const { visitors, checkIn, checkOut, registerWalkIn } = useVisitorContext();

  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({ name: '', company: '', host: '' });

  // Auto reset to home after success
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (view === 'success') {
      timer = setTimeout(() => {
        setView('home');
        setSearchTerm('');
        setFormData({ name: '', company: '', host: '' });
      }, 4000);
    }
    return () => clearTimeout(timer);
  }, [view]);

  const handleCheckIn = (id: string, name: string, host: string) => {
    checkIn(id);
    setMessage(t.welcomeMessage.replace('{name}', name).replace('{host}', host));
    setView('success');
  };

  const handleWalkIn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.company || !formData.host) return;
    registerWalkIn({ ...formData, language: lang });
    setMessage(t.welcomeMessage.replace('{name}', formData.name).replace('{host}', formData.host));
    setView('success');
  };

  const handleCheckOut = (id: string, name: string) => {
    checkOut(id);
    setMessage(t.goodbyeMessage.replace('{name}', name));
    setView('success');
  };

  const filteredVisitors = visitors.filter(v =>
    v.status === 'booked' && v.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const activeVisitors = visitors.filter(v =>
    v.status === 'checked-in' && v.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="p-6 flex justify-between items-center bg-white shadow-sm sticky top-0 z-10">
        <h1 className="text-xl font-bold tracking-tight">Visitor Kiosk</h1>
        <div className="flex gap-2">
          <Button variant={lang === 'sv' ? 'default' : 'outline'} onClick={() => setLang('sv')} size="sm">
            🇸🇪 SV
          </Button>
          <Button variant={lang === 'en' ? 'default' : 'outline'} onClick={() => setLang('en')} size="sm">
            🇬🇧 EN
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-6">

        {view === 'home' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl">
            <Button
              className="h-64 text-4xl flex flex-col gap-4 shadow-lg hover:scale-105 transition-transform"
              onClick={() => setView('check-in-mode')}
            >
              <CheckCircle size={64} />
              {t.checkIn}
            </Button>
            <Button
              variant="secondary"
              className="h-64 text-4xl flex flex-col gap-4 shadow-lg hover:scale-105 transition-transform"
              onClick={() => {
                setSearchTerm('');
                setView('check-out');
              }}
            >
              <ArrowLeft size={64} />
              {t.checkOut}
            </Button>
          </div>
        )}

        {view === 'check-in-mode' && (
          <Card className="w-full max-w-lg shadow-xl">
            <CardHeader>
              <CardTitle className="text-center text-3xl">{t.areYouBooked}</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <Button size="xl" onClick={() => setView('check-in-search')}>{t.yes}</Button>
              <Button size="xl" variant="secondary" onClick={() => setView('check-in-walkin')}>{t.no}</Button>
            </CardContent>
            <div className="p-4 border-t">
              <Button variant="ghost" className="w-full" onClick={() => setView('home')}>{t.back}</Button>
            </div>
          </Card>
        )}

        {view === 'check-in-search' && (
          <Card className="w-full max-w-2xl shadow-xl h-[80vh] flex flex-col">
            <CardHeader>
              <CardTitle className="text-center text-2xl">{t.searchName}</CardTitle>
              <div className="relative mt-4">
                <Search className="absolute left-3 top-3 text-gray-400" />
                <Input
                  className="pl-10 py-6 text-xl"
                  placeholder={t.name}
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  autoFocus
                />
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-auto">
              {filteredVisitors.length === 0 ? (
                <div className="text-center py-10 text-gray-500">{t.noBookingFound}</div>
              ) : (
                <div className="space-y-4">
                  {filteredVisitors.map(v => (
                    <Button
                      key={v.id}
                      variant="outline"
                      className="w-full justify-between py-8 text-lg px-6 h-auto"
                      onClick={() => handleCheckIn(v.id, v.name, v.host)}
                    >
                      <div className="flex flex-col items-start">
                        <span className="font-bold">{v.name}</span>
                        <span className="text-muted-foreground text-sm">{v.company}</span>
                      </div>
                    </Button>
                  ))}
                </div>
              )}
            </CardContent>
            <div className="p-4 border-t">
              <Button variant="ghost" className="w-full py-6 text-xl" onClick={() => setView('check-in-mode')}>{t.back}</Button>
            </div>
          </Card>
        )}

        {view === 'check-in-walkin' && (
          <Card className="w-full max-w-lg shadow-xl">
            <CardHeader>
              <CardTitle className="text-center text-2xl">{t.enterDetails}</CardTitle>
            </CardHeader>
            <form onSubmit={handleWalkIn}>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="w-name" className="text-lg">{t.name}</Label>
                  <Input id="w-name" required className="py-6 text-lg" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="w-company" className="text-lg">{t.company}</Label>
                  <Input id="w-company" required className="py-6 text-lg" value={formData.company} onChange={e => setFormData({...formData, company: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="w-host" className="text-lg">{t.host}</Label>
                  <Input id="w-host" required className="py-6 text-lg" value={formData.host} onChange={e => setFormData({...formData, host: e.target.value})} />
                </div>
              </CardContent>
              <div className="p-6 pt-0 gap-4 flex flex-col">
                <Button type="submit" size="xl" className="w-full">{t.register}</Button>
                <Button type="button" variant="ghost" size="xl" className="w-full" onClick={() => setView('check-in-mode')}>{t.back}</Button>
              </div>
            </form>
          </Card>
        )}

        {view === 'check-out' && (
          <Card className="w-full max-w-2xl shadow-xl h-[80vh] flex flex-col">
            <CardHeader>
              <CardTitle className="text-center text-2xl">{t.searchName}</CardTitle>
              <div className="relative mt-4">
                <Search className="absolute left-3 top-3 text-gray-400" />
                <Input
                  className="pl-10 py-6 text-xl"
                  placeholder={t.name}
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  autoFocus
                />
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-auto">
              {activeVisitors.length === 0 ? (
                <div className="text-center py-10 text-gray-500">{t.noBookingFound}</div>
              ) : (
                <div className="space-y-4">
                  {activeVisitors.map(v => (
                    <Button
                      key={v.id}
                      variant="outline"
                      className="w-full justify-between py-8 text-lg px-6 h-auto"
                      onClick={() => handleCheckOut(v.id, v.name)}
                    >
                      <div className="flex flex-col items-start">
                        <span className="font-bold">{v.name}</span>
                        <span className="text-muted-foreground text-sm">{v.company}</span>
                      </div>
                    </Button>
                  ))}
                </div>
              )}
            </CardContent>
            <div className="p-4 border-t">
              <Button variant="ghost" className="w-full py-6 text-xl" onClick={() => setView('home')}>{t.back}</Button>
            </div>
          </Card>
        )}

        {view === 'success' && (
          <div className="text-center animate-in fade-in zoom-in duration-300">
            <div className="flex justify-center mb-6">
              <CheckCircle className="text-green-500 w-32 h-32" />
            </div>
            <h2 className="text-4xl font-bold mb-4">{t.welcome}</h2>
            <p className="text-2xl text-gray-600 max-w-md mx-auto">{message}</p>
          </div>
        )}

      </main>
    </div>
  );
};
