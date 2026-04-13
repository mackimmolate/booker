import React, { useEffect, useEffectEvent, useRef, useState } from 'react';
import { ArrowLeft, CheckCircle, Clock3, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Combobox } from '@/components/ui/combobox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useVisitorContext } from '@/context/VisitorContext';
import { translations, type Language } from '../components/kiosk/translations';
import { type NotificationStatus, type Visitor } from '@/types';

const SUCCESS_RESET_DELAY_MS = 4000;
const IDLE_RESET_DELAY_MS = 90000;

const shouldShowNotifiedMessage = (status: NotificationStatus) => status === 'sent';

const buildWelcomeMessage = (
  language: Language,
  name: string,
  host: string,
  notificationStatus: NotificationStatus
) => {
  const translation = translations[language];
  const template = shouldShowNotifiedMessage(notificationStatus)
    ? translation.welcomeMessageNotified
    : translation.welcomeMessageRegistered;

  return template.replace('{name}', name).replace('{host}', host);
};

export const ReceptionPage: React.FC = () => {
  const [lang, setLang] = useState<Language>('sv');
  const [view, setView] = useState<'home' | 'check-in-mode' | 'check-in-search' | 'check-in-walkin' | 'check-out' | 'success'>('home');
  const [message, setMessage] = useState('');
  const [successType, setSuccessType] = useState<'welcome' | 'goodbye'>('welcome');
  const [wakeLockActive, setWakeLockActive] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const t = translations[lang];
  const { visitors, checkIn, checkOut, registerWalkIn, notifyHost, uniqueHosts } = useVisitorContext();
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({ name: '', company: '', host: '' });

  const resetKiosk = useEffectEvent(() => {
    setView('home');
    setSearchTerm('');
    setFormData({ name: '', company: '', host: '' });
    setMessage('');
    setSuccessType('welcome');
    setIsSubmitting(false);
  });

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    if (view === 'success') {
      timer = setTimeout(() => {
        resetKiosk();
      }, SUCCESS_RESET_DELAY_MS);
    }
    return () => {
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [view, resetKiosk]);

  useEffect(() => {
    const clearIdleTimer = () => {
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
        idleTimerRef.current = null;
      }
    };

    const scheduleIdleReset = () => {
      clearIdleTimer();

      if (view === 'home' && !searchTerm && !formData.name && !formData.company && !formData.host) {
        return;
      }

      idleTimerRef.current = setTimeout(() => {
        resetKiosk();
      }, IDLE_RESET_DELAY_MS);
    };

    const handleActivity = () => {
      if (view !== 'success') {
        scheduleIdleReset();
      }
    };

    const listenerOptions: AddEventListenerOptions = { passive: true };
    window.addEventListener('pointerdown', handleActivity, listenerOptions);
    window.addEventListener('touchstart', handleActivity, listenerOptions);
    window.addEventListener('scroll', handleActivity, listenerOptions);
    window.addEventListener('keydown', handleActivity);

    scheduleIdleReset();

    return () => {
      clearIdleTimer();
      window.removeEventListener('pointerdown', handleActivity, listenerOptions);
      window.removeEventListener('touchstart', handleActivity, listenerOptions);
      window.removeEventListener('scroll', handleActivity, listenerOptions);
      window.removeEventListener('keydown', handleActivity);
    };
  }, [view, searchTerm, formData.name, formData.company, formData.host, resetKiosk]);

  useEffect(() => {
    if (!navigator.wakeLock) {
      return;
    }

    let isMounted = true;

    const requestWakeLock = async () => {
      try {
        if (document.visibilityState !== 'visible') {
          return;
        }

        if (wakeLockRef.current && !wakeLockRef.current.released) {
          setWakeLockActive(true);
          return;
        }

        const sentinel = await navigator.wakeLock.request('screen');
        if (!isMounted) {
          await sentinel.release();
          return;
        }

        wakeLockRef.current = sentinel;
        setWakeLockActive(true);
        sentinel.onrelease = () => {
          if (isMounted) {
            setWakeLockActive(false);
          }
        };
      } catch {
        if (isMounted) {
          setWakeLockActive(false);
        }
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void requestWakeLock();
      }
    };

    void requestWakeLock();
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      isMounted = false;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (wakeLockRef.current && !wakeLockRef.current.released) {
        void wakeLockRef.current.release();
      }
      wakeLockRef.current = null;
      setWakeLockActive(false);
    };
  }, []);

  const finalizeCheckIn = async (visitor: Visitor) => {
    const notificationResult = await notifyHost(visitor);
    setMessage(buildWelcomeMessage(visitor.language, visitor.name, visitor.host, notificationResult.status));
    setSuccessType('welcome');
    setView('success');
  };

  const handleCheckIn = async (id: string) => {
    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    const checkedInVisitor = checkIn(id);

    if (!checkedInVisitor) {
      setIsSubmitting(false);
      return;
    }

    await finalizeCheckIn(checkedInVisitor);
    setIsSubmitting(false);
  };

  const handleWalkIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || !formData.name || !formData.company || !formData.host) {
      return;
    }

    setIsSubmitting(true);
    const walkInVisitor = registerWalkIn({ ...formData, language: lang });

    if (!walkInVisitor) {
      setIsSubmitting(false);
      return;
    }

    await finalizeCheckIn(walkInVisitor);
    setIsSubmitting(false);
  };

  const handleCheckOut = (id: string, name: string) => {
    checkOut(id);
    setMessage(t.goodbyeMessage.replace('{name}', name));
    setSuccessType('goodbye');
    setView('success');
  };

  const filteredVisitors = visitors.filter(v => {
    if (v.status !== 'booked') return false;
    if (!v.name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    if (!v.expectedArrival) return false;

    const bookingDate = new Date(v.expectedArrival);
    const today = new Date();

    return (
      bookingDate.getFullYear() === today.getFullYear() &&
      bookingDate.getMonth() === today.getMonth() &&
      bookingDate.getDate() === today.getDate()
    );
  });

  const activeVisitors = visitors.filter(v =>
    v.status === 'checked-in' && v.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex min-h-screen flex-col bg-slate-100 text-slate-950">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 px-4 py-4 shadow-sm backdrop-blur md:px-8 md:py-5">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Reception</p>
            <h1 className="text-xl font-bold tracking-tight md:text-2xl">Visitor Kiosk</h1>
          </div>
          <div className="flex items-center gap-2 md:gap-3">
            <div className="hidden items-center gap-2 rounded-full bg-slate-100 px-3 py-2 text-sm text-slate-600 md:flex">
              <Clock3 size={16} />
              <span>{`Auto reset ${Math.floor(IDLE_RESET_DELAY_MS / 1000)}s`}</span>
            </div>
            <div className={`hidden rounded-full px-3 py-2 text-sm md:block ${
              wakeLockActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
            }`}>
              {wakeLockActive ? 'Screen awake' : 'Screen default'}
            </div>
            <div className="flex gap-2">
              <Button variant={lang === 'sv' ? 'default' : 'outline'} onClick={() => setLang('sv')} size="sm">
                SV
              </Button>
              <Button variant={lang === 'en' ? 'default' : 'outline'} onClick={() => setLang('en')} size="sm">
                EN
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 overscroll-contain p-4 md:p-8">
        <div className="mx-auto flex min-h-full w-full max-w-6xl items-center justify-center">
          {view === 'home' && (
            <div className="grid w-full max-w-5xl grid-cols-1 gap-6 md:grid-cols-2 md:gap-8">
              <Button
                className="h-64 rounded-[2rem] bg-emerald-600 text-3xl shadow-xl transition-transform hover:scale-[1.01] hover:bg-emerald-700 md:h-80 md:text-5xl"
                onClick={() => setView('check-in-mode')}
              >
                <div className="flex flex-col items-center gap-5">
                  <CheckCircle size={72} />
                  {t.checkIn}
                </div>
              </Button>
              <Button
                className="h-64 rounded-[2rem] bg-blue-600 text-3xl shadow-xl transition-transform hover:scale-[1.01] hover:bg-blue-700 md:h-80 md:text-5xl"
                onClick={() => {
                  setSearchTerm('');
                  setView('check-out');
                }}
              >
                <div className="flex flex-col items-center gap-5">
                  <ArrowLeft size={72} />
                  {t.checkOut}
                </div>
              </Button>
            </div>
          )}

          {view === 'check-in-mode' && (
            <Card className="w-full max-w-2xl rounded-[2rem] border-slate-200 shadow-xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-center text-3xl md:text-4xl">{t.areYouBooked}</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 gap-4 p-6 md:grid-cols-2 md:gap-5">
                <Button size="xl" className="min-h-24 text-2xl md:min-h-28 md:text-3xl" onClick={() => setView('check-in-search')}>
                  {t.yes}
                </Button>
                <Button size="xl" className="min-h-24 text-2xl md:min-h-28 md:text-3xl" variant="secondary" onClick={() => setView('check-in-walkin')}>
                  {t.no}
                </Button>
              </CardContent>
              <div className="border-t p-4">
                <Button variant="ghost" className="min-h-16 w-full text-xl" onClick={() => setView('home')}>
                  {t.back}
                </Button>
              </div>
            </Card>
          )}

          {view === 'check-in-search' && (
            <Card className="flex h-[82vh] w-full max-w-4xl flex-col rounded-[2rem] border-slate-200 shadow-xl">
              <CardHeader className="pb-4">
                <CardTitle className="text-center text-3xl md:text-4xl">{t.searchName}</CardTitle>
                <div className="relative mt-4">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <Input
                    className="h-16 rounded-2xl pl-12 pr-4 text-2xl md:h-20 md:text-3xl"
                    placeholder={t.name}
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    autoFocus
                  />
                </div>
              </CardHeader>
              <CardContent className="flex-1 overflow-auto p-4 pt-0 md:p-6 md:pt-0">
                {filteredVisitors.length === 0 ? (
                  <div className="py-16 text-center text-xl text-gray-500 md:text-2xl">{t.noBookingFound}</div>
                ) : (
                  <div className="space-y-4">
                    {filteredVisitors.map(v => (
                      <Button
                        key={v.id}
                        variant="outline"
                        disabled={isSubmitting}
                        className="h-auto w-full justify-between rounded-2xl px-6 py-6 text-left text-lg md:px-8 md:py-8 md:text-2xl"
                        onClick={() => void handleCheckIn(v.id)}
                      >
                        <div className="flex flex-col items-start gap-1">
                          <span className="text-2xl font-bold md:text-3xl">{v.name}</span>
                          <span className="text-slate-700 md:text-xl">{v.company}</span>
                          <span className="text-slate-700 md:text-xl">{t.host}: {v.host}</span>
                        </div>
                      </Button>
                    ))}
                  </div>
                )}
              </CardContent>
              <div className="border-t p-4">
                <Button variant="ghost" className="min-h-16 w-full text-xl md:min-h-20 md:text-2xl" onClick={() => setView('check-in-mode')}>
                  {t.back}
                </Button>
              </div>
            </Card>
          )}

          {view === 'check-in-walkin' && (
            <Card className="w-full max-w-3xl rounded-[2rem] border-slate-200 shadow-xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-center text-3xl md:text-4xl">{t.enterDetails}</CardTitle>
              </CardHeader>
              <form onSubmit={handleWalkIn}>
                <CardContent className="grid gap-5 p-6 pt-0 md:grid-cols-2">
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="w-name" className="text-lg">{t.name}</Label>
                    <Input
                      id="w-name"
                      required
                      className="h-16 rounded-2xl px-4 text-xl md:h-20 md:text-2xl"
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="w-company" className="text-lg">{t.company}</Label>
                    <Input
                      id="w-company"
                      required
                      className="h-16 rounded-2xl px-4 text-xl md:h-20 md:text-2xl"
                      value={formData.company}
                      onChange={e => setFormData({ ...formData, company: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="w-host" className="text-lg">{t.host}</Label>
                    <Combobox
                      id="w-host"
                      required
                      value={formData.host}
                      onChange={val => setFormData({ ...formData, host: val })}
                      items={uniqueHosts.map(h => h.name)}
                      placeholder={t.host}
                      inputClassName="h-16 rounded-2xl px-4 text-xl md:h-20 md:text-2xl"
                      listClassName="rounded-2xl"
                      itemClassName="px-5 py-4 text-lg md:text-xl"
                    />
                  </div>
                </CardContent>
                <div className="flex flex-col gap-4 p-6 pt-0 md:flex-row">
                  <Button type="submit" size="xl" disabled={isSubmitting} className="min-h-16 flex-1 text-xl md:min-h-20 md:text-2xl">
                    {t.register}
                  </Button>
                  <Button type="button" variant="ghost" size="xl" className="min-h-16 flex-1 text-xl md:min-h-20 md:text-2xl" onClick={() => setView('check-in-mode')}>
                    {t.back}
                  </Button>
                </div>
              </form>
            </Card>
          )}

          {view === 'check-out' && (
            <Card className="flex h-[82vh] w-full max-w-4xl flex-col rounded-[2rem] border-slate-200 shadow-xl">
              <CardHeader className="pb-4">
                <CardTitle className="text-center text-3xl md:text-4xl">{t.searchName}</CardTitle>
                <div className="relative mt-4">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <Input
                    className="h-16 rounded-2xl pl-12 pr-4 text-2xl md:h-20 md:text-3xl"
                    placeholder={t.name}
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    autoFocus
                  />
                </div>
              </CardHeader>
              <CardContent className="flex-1 overflow-auto p-4 pt-0 md:p-6 md:pt-0">
                {activeVisitors.length === 0 ? (
                  <div className="py-16 text-center text-xl text-gray-500 md:text-2xl">{t.noBookingFound}</div>
                ) : (
                  <div className="space-y-4">
                    {activeVisitors.map(v => (
                      <Button
                        key={v.id}
                        variant="outline"
                        className="h-auto w-full justify-between rounded-2xl px-6 py-6 text-left text-lg md:px-8 md:py-8 md:text-2xl"
                        onClick={() => handleCheckOut(v.id, v.name)}
                      >
                        <div className="flex flex-col items-start gap-1">
                          <span className="text-2xl font-bold md:text-3xl">{v.name}</span>
                          <span className="text-slate-700 md:text-xl">{v.company}</span>
                          <span className="text-slate-700 md:text-xl">{t.host}: {v.host}</span>
                        </div>
                      </Button>
                    ))}
                  </div>
                )}
              </CardContent>
              <div className="border-t p-4">
                <Button variant="ghost" className="min-h-16 w-full text-xl md:min-h-20 md:text-2xl" onClick={() => setView('home')}>
                  {t.back}
                </Button>
              </div>
            </Card>
          )}

          {view === 'success' && (
            <div className="rounded-[2rem] bg-white px-8 py-10 text-center shadow-xl animate-in fade-in zoom-in duration-300 md:px-16 md:py-14">
              <div className="mb-6 flex justify-center">
                <CheckCircle className="h-32 w-32 text-green-500" />
              </div>
              <h2 className="mb-4 text-4xl font-bold md:text-5xl">
                {successType === 'goodbye' ? t.goodbye : t.welcome}
              </h2>
              <p className="mx-auto max-w-xl text-2xl text-gray-600 md:text-3xl">{message}</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
