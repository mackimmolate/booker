import React from 'react';
import { cn } from '@/lib/utils';
import { type NotificationStatus } from '@/types';

const badgeConfig: Record<NotificationStatus, { label: string; className: string }> = {
  sent: {
    label: 'E-post skickad',
    className: 'bg-emerald-100 text-emerald-700',
  },
  pending: {
    label: 'E-post skickas',
    className: 'bg-amber-100 text-amber-700',
  },
  failed: {
    label: 'E-post misslyckades',
    className: 'bg-rose-100 text-rose-700',
  },
  'not-configured': {
    label: 'E-post ej aktiverad',
    className: 'bg-slate-100 text-slate-600',
  },
  skipped: {
    label: 'Ingen e-postadress',
    className: 'bg-slate-100 text-slate-600',
  },
};

interface NotificationStatusBadgeProps {
  status?: NotificationStatus;
  className?: string;
}

export const NotificationStatusBadge: React.FC<NotificationStatusBadgeProps> = ({
  status,
  className,
}) => {
  if (!status) {
    return <span className={cn('text-sm text-slate-400', className)}>-</span>;
  }

  const config = badgeConfig[status];

  return (
    <span
      className={cn(
        'inline-flex rounded-full px-2.5 py-1 text-xs font-medium',
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  );
};
