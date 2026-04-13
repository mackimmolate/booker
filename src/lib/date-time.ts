const padNumber = (value: number) => value.toString().padStart(2, '0');

export const toLocalDateInputValue = (date: Date) =>
  `${date.getFullYear()}-${padNumber(date.getMonth() + 1)}-${padNumber(date.getDate())}`;

export const getRoundedCurrentIso = (sourceDate = new Date()) => {
  const roundedDate = new Date(sourceDate);
  roundedDate.setSeconds(0, 0);
  roundedDate.setMinutes(Math.ceil(roundedDate.getMinutes() / 5) * 5, 0, 0);
  return roundedDate.toISOString();
};

export const parseIsoToLocalParts = (isoString?: string) => {
  if (!isoString) {
    return null;
  }

  const parsedDate = new Date(isoString);
  if (Number.isNaN(parsedDate.getTime())) {
    return null;
  }

  return {
    date: toLocalDateInputValue(parsedDate),
    hour: padNumber(parsedDate.getHours()),
    minute: padNumber(parsedDate.getMinutes()),
  };
};

export const buildIsoFromLocalParts = (date: string, hour: string, minute: string) => {
  if (!date) {
    return '';
  }

  const [year, month, day] = date.split('-').map(Number);
  const nextDate = new Date(year, (month || 1) - 1, day || 1, Number(hour), Number(minute), 0, 0);
  return nextDate.toISOString();
};
