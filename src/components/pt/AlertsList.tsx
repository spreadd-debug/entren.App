import React from 'react';
import { AlertTriangle, AlertCircle, Info, CheckCircle2 } from 'lucide-react';
import { safe } from '../../utils/safeRender';
import type { StudentAlert, AlertSeverity } from '../../../shared/types';

interface AlertsListProps {
  alerts: StudentAlert[];
  compact?: boolean;
  maxItems?: number;
}

const severityConfig: Record<AlertSeverity, {
  icon: React.ElementType;
  bg: string;
  border: string;
  iconColor: string;
  textColor: string;
}> = {
  danger: {
    icon: AlertTriangle,
    bg: 'bg-rose-50 dark:bg-rose-500/10',
    border: 'border-rose-200 dark:border-rose-500/20',
    iconColor: 'text-rose-500',
    textColor: 'text-rose-800 dark:text-rose-300',
  },
  warning: {
    icon: AlertCircle,
    bg: 'bg-amber-50 dark:bg-amber-500/10',
    border: 'border-amber-200 dark:border-amber-500/20',
    iconColor: 'text-amber-500',
    textColor: 'text-amber-800 dark:text-amber-300',
  },
  info: {
    icon: Info,
    bg: 'bg-blue-50 dark:bg-blue-500/10',
    border: 'border-blue-200 dark:border-blue-500/20',
    iconColor: 'text-blue-500',
    textColor: 'text-blue-800 dark:text-blue-300',
  },
  success: {
    icon: CheckCircle2,
    bg: 'bg-emerald-50 dark:bg-emerald-500/10',
    border: 'border-emerald-200 dark:border-emerald-500/20',
    iconColor: 'text-emerald-500',
    textColor: 'text-emerald-800 dark:text-emerald-300',
  },
};

export const AlertsList: React.FC<AlertsListProps> = ({ alerts, compact = false, maxItems }) => {
  const displayed = maxItems ? alerts.slice(0, maxItems) : alerts;
  const remaining = maxItems && alerts.length > maxItems ? alerts.length - maxItems : 0;

  if (displayed.length === 0) {
    return (
      <div className="text-center py-6 text-slate-400 dark:text-slate-500 text-sm">
        Sin alertas activas
      </div>
    );
  }

  return (
    <div className={compact ? 'space-y-1.5' : 'space-y-2'}>
      {displayed.map((alert) => {
        const config = severityConfig[alert.severity];
        const Icon = config.icon;

        return (
          <div
            key={alert.id}
            className={`flex items-start gap-2.5 ${compact ? 'px-2.5 py-1.5' : 'px-3 py-2.5'} rounded-xl border ${config.bg} ${config.border}`}
          >
            <Icon size={compact ? 14 : 16} className={`${config.iconColor} shrink-0 mt-0.5`} />
            <div className="min-w-0 flex-1">
              <p className={`${compact ? 'text-xs' : 'text-sm'} font-medium ${config.textColor} leading-snug`}>
                {safe(alert.message, 'alert.message')}
              </p>
              {!compact && alert.detail && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{safe(alert.detail, 'alert.detail')}</p>
              )}
            </div>
          </div>
        );
      })}

      {remaining > 0 && (
        <p className="text-xs text-slate-400 dark:text-slate-500 text-center pt-1">
          +{remaining} alertas mas
        </p>
      )}
    </div>
  );
};
