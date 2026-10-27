import React, { useState } from 'react';
import { useTranslation } from '../../i18n/useTranslation';
import wardData from '../../data/sample-ward-data.json';
import {
  AlertTriangle,
  Flame,
  Droplets,
} from 'lucide-react';
import { MedicalDisclaimerNote } from '../components/PrototypeBanner';

export const ScreenS8WardView: React.FC = () => {
  const { t } = useTranslation();
  const [selectedWardIndex, setSelectedWardIndex] = useState<number>(0);

  const ward = wardData.wards[selectedWardIndex] || wardData.wards[0];

  return (
    <div className="w-full max-w-md mx-auto px-4 py-4 space-y-4">
      <header className="space-y-1">
        <h1 className="text-xl font-bold text-stone-900">
          {t('s8.title')}
        </h1>
        <p className="text-xs text-stone-600">
          {t('s8.subtitle')}
        </p>
      </header>

      {/* Prominent Demo Data Banner */}
      <aside aria-label="Demo notice" className="bg-amber-100 border-2 border-amber-400 text-amber-950 p-3.5 rounded-xl text-xs font-semibold space-y-1">
        <div className="flex items-center gap-2 text-amber-800">
          <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span className="uppercase tracking-wider font-black">
            {t('s8.demo_badge')}
          </span>
        </div>
        <p className="text-[11px] leading-relaxed text-amber-900 font-normal">
          {wardData.meta.note}
        </p>
      </aside>

      {/* Ward Selector */}
      <section aria-labelledby="ward-select-heading" className="space-y-2">
        <label id="ward-select-heading" htmlFor="ward-select" className="text-xs font-bold uppercase tracking-wider text-stone-700 block">
          {t('s8.ward_select')}
        </label>
        <select
          id="ward-select"
          aria-label={t('s8.ward_select')}
          value={selectedWardIndex}
          onChange={(e) => setSelectedWardIndex(Number(e.target.value))}
          className="w-full min-h-[48px] px-3 rounded-xl border border-stone-300 text-sm font-semibold bg-white focus:ring-2 focus:ring-orange-500"
        >
          {wardData.wards.map((w, idx) => (
            <option key={w.wardNumber} value={idx}>
              Ward #{w.wardNumber} — {w.wardName} ({w.zone})
            </option>
          ))}
        </select>
      </section>

      {/* Ward Risk Card */}
      <section
        aria-labelledby="ward-risk-heading"
        className="bg-white rounded-2xl p-5 border border-stone-200 shadow-sm space-y-4"
      >
        <div className="flex items-start justify-between">
          <div>
            <span className="text-xs text-stone-700 block font-medium">{ward.zone}</span>
            <h2 id="ward-risk-heading" className="text-lg font-black text-stone-900">
              {ward.wardName}
            </h2>
          </div>
          <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-orange-100 text-orange-800 border border-orange-300">
            Ward #{ward.wardNumber}
          </span>
        </div>

        {/* Severity Count */}
        <div className="grid grid-cols-2 gap-3 text-center">
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-3">
            <span className="text-2xl font-black text-rose-700 block">
              {ward.redBandHours} hrs
            </span>
            <span className="text-[11px] font-semibold text-rose-900">
              {t('band.red.name')} ({t('band.red.level')})
            </span>
          </div>

          <div className="bg-stone-900 border border-stone-800 rounded-xl p-3 text-amber-300">
            <span className="text-2xl font-black block">
              {ward.blackBandHours} hrs
            </span>
            <span className="text-[11px] font-semibold text-amber-200">
              {t('band.black.name')} ({t('band.black.level')})
            </span>
          </div>
        </div>

        <div className="space-y-2 text-xs">
          <div className="flex items-start gap-2 bg-stone-50 p-2.5 rounded-lg text-stone-800">
            <Flame className="w-4 h-4 text-orange-600 shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <span className="font-bold block">{t('s8.dominant_risk_label')}:</span>
              <span>{ward.dominantRisk}</span>
            </div>
          </div>

          <div className="flex items-start gap-2 bg-stone-50 p-2.5 rounded-lg text-stone-800">
            <Droplets className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <span className="font-bold block">{t('s8.shade_centers_label')}:</span>
              <span>{t('s8.centers_identified', { count: ward.availableShadeCenters })}</span>
            </div>
          </div>

          <div className="bg-orange-50 border border-orange-200 p-3 rounded-xl text-orange-950 font-medium">
            <span className="font-bold block text-orange-900 mb-0.5">{t('s8.recommendation_label')}:</span>
            <span>{ward.recommendation}</span>
          </div>
        </div>

        <MedicalDisclaimerNote />
      </section>
    </div>
  );
};
