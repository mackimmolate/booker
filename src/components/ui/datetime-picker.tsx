import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface DateTimePickerProps {
  label: string;
  value?: string; // ISO String
  onChange: (isoString: string) => void;
  required?: boolean;
}

export const DateTimePicker: React.FC<DateTimePickerProps> = ({ label, value, onChange, required }) => {
  // Parse initial value or use current time
  const [date, setDate] = useState('');
  const [hour, setHour] = useState('09');
  const [minute, setMinute] = useState('00');

  useEffect(() => {
    if (value) {
      const d = new Date(value);
      setDate(d.toISOString().split('T')[0]);
      setHour(d.getHours().toString().padStart(2, '0'));
      setMinute(d.getMinutes().toString().padStart(2, '0'));
    } else {
      const now = new Date();
      setDate(now.toISOString().split('T')[0]);
      const currentHour = now.getHours();
      // Round to next 5 min
      let currentMinute = Math.ceil(now.getMinutes() / 5) * 5;
      let nextHour = currentHour;
      if (currentMinute === 60) {
        currentMinute = 0;
        nextHour = (nextHour + 1) % 24;
      }
      setHour(nextHour.toString().padStart(2, '0'));
      setMinute(currentMinute.toString().padStart(2, '0'));
    }
  }, [value]); // Only run when value prop changes externally (e.g. reset)

  const updateISO = (d: string, h: string, m: string) => {
    if (!d) return; // Wait for date
    // Could add timezone handling here if needed, but keeping it local-iso-like for now
    // Actually, let's create a Date object to get proper ISO string with timezone or just use local string
    // The app uses new Date().toISOString() elsewhere which is UTC.
    // Let's stick to constructing a local-time ISO-like string for the App to consume
    // Or better: Create a Date object from the inputs
    const dateObj = new Date(`${d}T${h}:${m}:00`);
    onChange(dateObj.toISOString());
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = e.target.value;
    setDate(newDate);
    updateISO(newDate, hour, minute);
  };

  const handleHourChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newHour = e.target.value;
    setHour(newHour);
    updateISO(date, newHour, minute);
  };

  const handleMinuteChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newMinute = e.target.value;
    setMinute(newMinute);
    updateISO(date, hour, newMinute);
  };

  const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
  const minutes = Array.from({ length: 12 }, (_, i) => (i * 5).toString().padStart(2, '0'));

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex gap-2">
        <Input
          type="date"
          value={date}
          onChange={handleDateChange}
          required={required}
          className="flex-1"
        />
        <select
          value={hour}
          onChange={handleHourChange}
          className="flex h-10 w-20 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          {hours.map(h => (
            <option key={h} value={h}>{h}</option>
          ))}
        </select>
        <span className="self-center text-xl">:</span>
        <select
          value={minute}
          onChange={handleMinuteChange}
          className="flex h-10 w-20 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          {minutes.map(m => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
      </div>
    </div>
  );
};
