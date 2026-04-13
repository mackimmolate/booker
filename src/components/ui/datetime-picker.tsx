import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  buildIsoFromLocalParts,
  getRoundedCurrentIso,
  parseIsoToLocalParts,
} from '@/lib/date-time';

interface DateTimePickerProps {
  label: string;
  value?: string; // ISO String
  onChange: (isoString: string) => void;
  required?: boolean;
}

export const DateTimePicker: React.FC<DateTimePickerProps> = ({ label, value, onChange, required }) => {
  const [date, setDate] = useState('');
  const [hour, setHour] = useState('09');
  const [minute, setMinute] = useState('00');

  useEffect(() => {
    const localParts = parseIsoToLocalParts(value) ?? parseIsoToLocalParts(getRoundedCurrentIso());
    if (!localParts) {
      return;
    }

    setDate(localParts.date);
    setHour(localParts.hour);
    setMinute(localParts.minute);
  }, [value]);

  const updateISO = (d: string, h: string, m: string) => {
    const nextIsoString = buildIsoFromLocalParts(d, h, m);
    if (!nextIsoString) {
      return;
    }

    onChange(nextIsoString);
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
  const defaultMinutes = Array.from({ length: 12 }, (_, i) => (i * 5).toString().padStart(2, '0'));
  const minutes = defaultMinutes.includes(minute)
    ? defaultMinutes
    : [...defaultMinutes, minute].sort((left, right) => Number(left) - Number(right));

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
