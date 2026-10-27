import React, { useState, useEffect } from 'react';
import { useTranslation } from '../../i18n/useTranslation';
import { HourPlan, isPeakHeatHour } from '../../engine/plan';
import { BandBadge } from '../components/BandBadge';
import { MedicalDisclaimerNote } from '../components/PrototypeBanner';
import {
  Sparkles,
  Droplets,
  Sun,
  Thermometer,
  AlertCircle,
} from 'lucide-react';

interface ScreenS3DayPlanProps {
  dayPlan: HourPlan[];
  jobTitle: string;
  presetId?: string;
  currentHourISO?: string;
}

export const ScreenS3DayPlan: React.FC<ScreenS3DayPlanProps> = ({
  dayPlan,
  jobTitle,
  presetId,
  currentHourISO,
}) => {
  const { t } = useTranslation();
  const [selectedHourIndex, setSelectedHourIndex] = useState<number>(() => {
    if (!currentHourISO || dayPlan.length === 0) return 0;
    const idx = dayPlan.findIndex((p) => p.hourISO === currentHourISO);
    return idx >= 0 ? idx : 0;
  });

  useEffect(() => {
    if (currentHourISO && dayPlan.length > 0) {
      const idx = dayPlan.findIndex((p) => p.hourISO === currentHourISO);
      if (idx >= 0) {
        setSelectedHourIndex(idx);
      }
    }
  }, [currentHourISO, dayPlan]);

  const selectedHour = dayPlan[selectedHourIndex] || dayPlan[0];

  const formatHour = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleTimeString([], {
        hour: 'numeric',
        minute: '2-digit',
        timeZone: 'Asia/Kolkata',
      });
    } catch {
      return iso;
    }
  };

  const isSecondDay = (iso: string) => {
    if (dayPlan.length === 0) return false;
    try {
      const d0 = new Date(dayPlan[0].hourISO).toLocaleDateString('en-CA', {
        timeZone: 'Asia/Kolkata',
      });
      const d = new Date(iso).toLocaleDateString('en-CA', {
        timeZone: 'Asia/Kolkata',
      });
      return d !== d0;
    } catch {
      return false;
    }
  };

  const formatDateChip = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleDateString([], {
        month: 'short',
        day: 'numeric',
        timeZone: 'Asia/Kolkata',
      });
    } catch {
      return '';
    }
  };

  const isConstructionOrFarm =
    presetId === 'construction' ||
    presetId === 'farm_labour' ||
    jobTitle.toLowerCase().includes('construction') ||
    jobTitle.toLowerCase().includes('farm');

  return (
    <div className="w-full max-w-md mx-auto px-4 py-4 space-y-4">
      <header className="space-y-1">
        <h1 className="text-xl font-bold text-stone-900">
          {t('s3.title')}
        </h1>
        <p className="text-xs text-stone-600">
          {jobTitle} • {t('s3.subtitle')}
        </p>
      </header>

      {/* Best Work Hours Insight Box */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-start gap-2.5 text-xs text-emerald-950 font-medium">
        <Sparkles className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" aria-hidden="true" />
        <span>{t('s3.best_hours')}</span>
      </div>

      {/* Construction / Farm Labour Daily Wage Least-Bad Hours Note (Priority 3 Item 12) */}
      {isConstructionOrFarm && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl p-3 flex items-start gap-2.5 text-xs text-amber-950">
          <Sun className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" aria-hidden="true" />
          <div className="space-y-0.5">
            <span className="font-bold block text-amber-900">{t('s3.least_bad_hours_title')}</span>
            <p className="text-[11px] leading-snug text-amber-900">{t('s3.least_bad_hours_desc')}</p>
          </div>
        </div>
      )}

      {/* 24-Hour Horizontal / Scrollable Strip with 48px Touch Targets */}
      <section aria-label="Hourly timeline" className="space-y-2">
        <h2 className="text-xs uppercase font-bold text-stone-700 tracking-wider">
          {t('s3.tap_hour_prompt')}
        </h2>
        <div className="flex gap-2 overflow-x-auto pb-2 pt-1 scrollbar-thin">
          {dayPlan.map((hp, idx) => {
            const isSelected = selectedHourIndex === idx;
            const timeLabel = formatHour(hp.hourISO);

            const bandBg = {
              green: 'border-emerald-300 bg-emerald-50 text-emerald-950',
              yellow: 'border-amber-300 bg-amber-50 text-amber-950',
              orange: 'border-orange-300 bg-orange-50 text-orange-950',
              red: 'border-rose-300 bg-rose-50 text-rose-950',
              black: 'border-stone-800 bg-stone-900 text-amber-300 ring-1 ring-amber-400',
            }[hp.band];

            return (
              <button
                key={hp.hourISO}
                type="button"
                onClick={() => setSelectedHourIndex(idx)}
                className={`min-w-[64px] min-h-[72px] p-2 rounded-xl border-2 flex flex-col items-center justify-between shrink-0 transition-all ${
                  isSelected ? 'ring-2 ring-orange-500 scale-105 font-bold shadow-md' : 'opacity-85 hover:opacity-100'
                } ${bandBg}`}
                aria-pressed={isSelected}
                aria-label={`${timeLabel}, WBGT ${hp.wbgtC} degrees, ${hp.band} band`}
              >
                {isSecondDay(hp.hourISO) && (
                  <span className="text-[9px] font-bold opacity-80 uppercase tracking-tight">
                    {formatDateChip(hp.hourISO)}
                  </span>
                )}
                <span className="text-[11px] font-semibold">{timeLabel}</span>
                <span className="text-base font-black">{hp.wbgtC.toFixed(0)}°</span>
                <span className="text-[10px] uppercase font-bold tracking-tight">
                  {t(`band.${hp.band}.name`)}
                </span>
                {isPeakHeatHour(hp.hourISO) && (
                  <span className="text-[8px] font-black uppercase tracking-tighter bg-amber-200/90 text-amber-950 px-1 rounded-sm mt-0.5">
                    {t('s3.peak_tag')}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </section>

      {/* Selected Hour Detail Card */}
      {selectedHour && (
        <section
          aria-labelledby="detail-hour-heading"
          className="bg-white rounded-2xl p-4 border border-stone-200 shadow-sm space-y-3"
        >
          <div className="flex items-center justify-between border-b border-stone-100 pb-2.5">
            <div>
              <span className="text-xs text-stone-700 block font-medium">
                {t('s3.hour_detail')}
              </span>
              <h3 id="detail-hour-heading" className="text-lg font-black text-stone-900">
                {formatHour(selectedHour.hourISO)}
              </h3>
            </div>
            <div className="text-right">
              <BandBadge band={selectedHour.band} size="md" />
              <span className="text-xs text-stone-600 block mt-1">
                WBGT {selectedHour.wbgtC.toFixed(1)}°C
              </span>
              {selectedHour.isFallbackSimple && (
                <span className="inline-block mt-0.5 px-1.5 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-900 rounded border border-amber-300">
                  {t('plan.rough_estimate_badge')}
                </span>
              )}
            </div>
          </div>

          {selectedHour.isFallbackSimple && (
            <div className="flex items-center gap-2 p-2.5 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-900 font-semibold">
              <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" aria-hidden="true" />
              <span>{t('plan.rough_estimate_warning')}</span>
            </div>
          )}

          {/* NDMA 11:00 - 16:00 Peak Heat Advisory Banner (Priority 1 Item 1) */}
          {isPeakHeatHour(selectedHour.hourISO) && (
            <div className="flex items-start gap-2.5 p-3 bg-orange-50 border border-orange-300 rounded-xl text-xs text-orange-950 font-medium">
              <AlertCircle className="w-4 h-4 text-orange-700 shrink-0 mt-0.5" aria-hidden="true" />
              <div className="space-y-0.5">
                <span className="font-bold block text-orange-900">{t('plan.peak_heat_badge')}</span>
                <p className="text-[11px] leading-snug">{t('plan.peak_heat_strip')}</p>
              </div>
            </div>
          )}

          {/* Work / Rest Breakdown for Selected Hour */}
          <div className="space-y-1.5">
            <span className="text-xs font-bold uppercase tracking-wider text-stone-700">
              {t('s3.work_rest_ratio')}
            </span>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-stone-50 p-2.5 rounded-lg border border-stone-200">
                <span className="text-stone-700 block">{t('s3.work_label')}</span>
                <span className="font-bold text-stone-900 text-sm">
                  {selectedHour.maxWorkMinPerHour !== null
                    ? t('s3.minutes_max', { min: selectedHour.maxWorkMinPerHour })
                    : t('act.stop_work')}
                </span>
              </div>
              <div className="bg-stone-50 p-2.5 rounded-lg border border-stone-200">
                <span className="text-stone-700 block">{t('act.rest_shade')}</span>
                <span className="font-bold text-stone-900 text-sm">
                  {selectedHour.minRestMinPerHour !== null
                    ? t('s3.minutes_min', { min: selectedHour.minRestMinPerHour })
                    : t('act.rest_shade')}
                </span>
              </div>
            </div>
          </div>

          {/* Reasons */}
          {selectedHour.reasons.length > 0 && (
            <div className="bg-stone-50 p-2.5 rounded-lg text-xs text-stone-800 space-y-1">
              <span className="font-bold block text-stone-900">{t('s3.primary_drivers')}</span>
              <ul className="list-disc list-inside space-y-0.5 text-stone-700">
                {selectedHour.reasons.map((r) => (
                  <li key={r}>{t(`reason.${r}`)}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Environmental metrics */}
          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-stone-100 text-center text-xs">
            <div>
              <span className="text-stone-700 flex items-center justify-center gap-1">
                <Thermometer className="w-3.5 h-3.5" aria-hidden="true" /> {t('s2.air')}
              </span>
              <span className="font-bold text-stone-900">{selectedHour.tempC.toFixed(0)}°C</span>
            </div>
            <div>
              <span className="text-stone-700 flex items-center justify-center gap-1">
                <Droplets className="w-3.5 h-3.5" aria-hidden="true" /> {t('s2.humidity')}
              </span>
              <span className="font-bold text-stone-900">{selectedHour.rhPct}%</span>
            </div>
            <div>
              <span className="text-stone-700 flex items-center justify-center gap-1">
                <Sun className="w-3.5 h-3.5" aria-hidden="true" /> {t('s2.solar')}
              </span>
              <span className="font-bold text-stone-900">
                {selectedHour.solarWm2 ? `${selectedHour.solarWm2} W` : '0 W'}
              </span>
            </div>
          </div>

          {/* Clothing/PPE limitation disclaimer (D-06 / §6.5) */}
          <p className="text-[11px] text-stone-500 text-center leading-tight">
            {t('app.clothing_disclaimer')}
          </p>

          <MedicalDisclaimerNote />
        </section>
      )}
    </div>
  );
};
