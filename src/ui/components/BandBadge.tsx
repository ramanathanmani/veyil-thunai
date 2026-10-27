import React from 'react';
import { Band } from '../../engine/limits';
import { useTranslation } from '../../i18n/useTranslation';
import {
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Flame,
  OctagonAlert,
} from 'lucide-react';

interface BandBadgeProps {
  band: Band;
  size?: 'sm' | 'md' | 'lg';
  showAction?: boolean;
}

export const BandBadge: React.FC<BandBadgeProps> = ({
  band,
  size = 'md',
  showAction = false,
}) => {
  const { t } = useTranslation();

  const config = {
    green: {
      icon: CheckCircle2,
      nameKey: 'band.green.name',
      actionKey: 'band.green.action',
      bgClass: 'bg-emerald-100 text-emerald-950 border-emerald-400 dark:bg-emerald-900/80 dark:text-emerald-100',
      iconClass: 'text-emerald-700 dark:text-emerald-300',
    },
    yellow: {
      icon: AlertCircle,
      nameKey: 'band.yellow.name',
      actionKey: 'band.yellow.action',
      bgClass: 'bg-amber-100 text-amber-950 border-amber-400 dark:bg-amber-900/80 dark:text-amber-100',
      iconClass: 'text-amber-700 dark:text-amber-300',
    },
    orange: {
      icon: AlertTriangle,
      nameKey: 'band.orange.name',
      actionKey: 'band.orange.action',
      bgClass: 'bg-orange-100 text-orange-950 border-orange-400 dark:bg-orange-950/90 dark:text-orange-100',
      iconClass: 'text-orange-700 dark:text-orange-300',
    },
    red: {
      icon: Flame,
      nameKey: 'band.red.name',
      actionKey: 'band.red.action',
      bgClass: 'bg-rose-100 text-rose-950 border-rose-400 dark:bg-rose-950/90 dark:text-rose-100',
      iconClass: 'text-rose-700 dark:text-rose-300',
    },
    black: {
      icon: OctagonAlert,
      nameKey: 'band.black.name',
      actionKey: 'band.black.action',
      bgClass: 'bg-stone-900 text-amber-300 border-amber-500 ring-2 ring-amber-400',
      iconClass: 'text-amber-400',
    },
  }[band];

  const Icon = config.icon;
  const name = t(config.nameKey);
  const action = t(config.actionKey);

  const sizeClasses = {
    sm: 'text-xs px-2 py-1 gap-1',
    md: 'text-sm px-3 py-1.5 gap-1.5',
    lg: 'text-base px-4 py-2.5 gap-2 font-bold',
  }[size];

  const iconSizes = {
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
    lg: 'w-6 h-6',
  }[size];

  return (
    <div className="inline-flex flex-col gap-1">
      <div
        className={`inline-flex items-center rounded-lg border font-semibold shadow-xs ${sizeClasses} ${config.bgClass}`}
        role="status"
        aria-label={`Heat risk level: ${name}`}
      >
        <Icon className={`${iconSizes} ${config.iconClass} shrink-0`} aria-hidden="true" />
        <span className="uppercase tracking-wide">{name}</span>
      </div>
      {showAction && (
        <p className="text-xs sm:text-sm font-medium text-stone-800 dark:text-stone-200 mt-0.5">
          {action}
        </p>
      )}
    </div>
  );
};
