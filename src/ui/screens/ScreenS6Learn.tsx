import React from 'react';
import { useTranslation } from '../../i18n/useTranslation';
import {
  PhoneCall,
  Droplets,
  Scale,
  HeartPulse,
  AlertCircle,
} from 'lucide-react';

export const ScreenS6Learn: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="w-full max-w-md mx-auto px-4 py-4 space-y-4">
      <header className="space-y-1">
        <h1 className="text-xl font-bold text-stone-900">
          {t('s6.title')}
        </h1>
        <p className="text-xs text-stone-600">
          {t('s6.subtitle')}
        </p>
      </header>

      {/* Emergency Call Card */}
      <section
        aria-labelledby="emergency-heading"
        className="bg-rose-600 text-white p-4 rounded-2xl shadow-md space-y-3"
      >
        <div className="flex items-start gap-3">
          <PhoneCall className="w-6 h-6 shrink-0 mt-0.5 animate-pulse" aria-hidden="true" />
          <div>
            <h2 id="emergency-heading" className="font-black text-sm uppercase tracking-wide">
              {t('s6.emergency_title')}
            </h2>
            <p className="text-xs text-rose-100 mt-1 leading-snug">
              {t('s6.emergency_desc')}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-1">
          <a
            href="tel:112"
            className="min-h-[48px] bg-white text-rose-700 font-black rounded-xl flex items-center justify-center gap-2 text-sm shadow-xs hover:bg-rose-50"
          >
            <PhoneCall className="w-4 h-4" aria-hidden="true" />
            <span>{t('s6.call_112')}</span>
          </a>
          <a
            href="tel:108"
            className="min-h-[48px] bg-rose-700 text-white font-black rounded-xl border border-rose-500 flex items-center justify-center gap-2 text-sm shadow-xs hover:bg-rose-800"
          >
            <PhoneCall className="w-4 h-4" aria-hidden="true" />
            <span>{t('s6.call_108')}</span>
          </a>
        </div>
      </section>

      {/* Heat Symptoms & First Aid */}
      <section
        aria-labelledby="symptoms-heading"
        className="bg-white rounded-2xl p-4 border border-stone-200 shadow-sm space-y-2.5"
      >
        <div className="flex items-center gap-2 text-orange-600">
          <HeartPulse className="w-5 h-5 shrink-0" aria-hidden="true" />
          <h2 id="symptoms-heading" className="font-bold text-stone-900 text-sm">
            {t('s6.symptoms_title')}
          </h2>
        </div>
        <p className="text-[11px] font-semibold text-stone-700">
          {t('s6.symptoms_source')}
        </p>
        <p className="text-xs text-stone-700 leading-relaxed">
          {t('s6.symptoms_content')}
        </p>
      </section>

      {/* Hydration Guidelines */}
      <section
        aria-labelledby="hydration-heading"
        className="bg-white rounded-2xl p-4 border border-stone-200 shadow-sm space-y-2.5"
      >
        <div className="flex items-center gap-2 text-sky-600">
          <Droplets className="w-5 h-5 shrink-0" aria-hidden="true" />
          <h2 id="hydration-heading" className="font-bold text-stone-900 text-sm">
            {t('s6.hydration_title')}
          </h2>
        </div>
        <p className="text-[11px] font-semibold text-stone-700">
          {t('s6.hydration_source')}
        </p>
        <p className="text-xs text-stone-700 leading-relaxed">
          {t('s6.hydration_content')}
        </p>
      </section>

      {/* Rights Advisory Card */}
      <section
        aria-labelledby="rights-heading"
        className="bg-white rounded-2xl p-4 border border-stone-200 shadow-sm space-y-2.5"
      >
        <div className="flex items-center gap-2 text-indigo-600">
          <Scale className="w-5 h-5 shrink-0" aria-hidden="true" />
          <h2 id="rights-heading" className="font-bold text-stone-900 text-sm">
            {t('s6.rights_title')}
          </h2>
        </div>
        <p className="text-[11px] font-semibold text-stone-700">
          {t('s6.rights_source')}
        </p>
        <p className="text-xs text-stone-700 leading-relaxed">
          {t('s6.rights_content')}
        </p>
      </section>

      {/* Women Outdoor Workers & Sanitation / Toilet Note (Priority 3 Item 11) */}
      <section
        aria-labelledby="women-sanitation-heading"
        className="bg-white rounded-2xl p-4 border border-stone-200 shadow-sm space-y-2.5"
      >
        <div className="flex items-center gap-2 text-rose-600">
          <AlertCircle className="w-5 h-5 shrink-0" aria-hidden="true" />
          <h2 id="women-sanitation-heading" className="font-bold text-stone-900 text-sm">
            {t('s6.women_title')}
          </h2>
        </div>
        <p className="text-[11px] font-semibold text-stone-700">
          {t('s6.women_source')}
        </p>
        <p className="text-xs text-stone-700 leading-relaxed">
          {t('s6.women_content')}
        </p>
      </section>
    </div>
  );
};
