import React, { useState } from 'react';
import { useTranslation } from '../../i18n/useTranslation';
import { Language } from '../../i18n/keys';
import { WorkloadClass, WorkerState } from '../../engine/limits';
import presetsData from '../../../config/presets.json';
import {
  Bike,
  Footprints,
  HardHat,
  Store,
  ShoppingBag,
  Recycle,
  Wheat,
  User,
  ChevronRight,
  Sun,
  ShieldAlert,
} from 'lucide-react';

interface ScreenS1Props {
  initialPreset: string;
  initialWorkload: WorkloadClass;
  initialState: WorkerState;
  onComplete: (data: {
    presetId: string;
    workload: WorkloadClass;
    workerState: WorkerState;
  }) => void;
}

const iconMap: Record<string, React.ElementType> = {
  Bike,
  Bicycle: Footprints,
  HardHat,
  Store,
  ShoppingBag,
  Recycle,
  Wheat,
  User,
};

export const ScreenS1LanguageJob: React.FC<ScreenS1Props> = ({
  initialPreset,
  initialWorkload,
  initialState,
  onComplete,
}) => {
  const { language, setLanguage, t, speakText } = useTranslation();
  const [selectedPreset, setSelectedPreset] = useState(initialPreset);
  const [selectedWorkload, setSelectedWorkload] = useState<WorkloadClass>(initialWorkload);
  const [workerState, setWorkerState] = useState<WorkerState>(initialState);

  const presets = presetsData.presets;

  const handlePresetSelect = (p: (typeof presets)[0]) => {
    setSelectedPreset(p.id);
    setSelectedWorkload(p.defaultWorkload as WorkloadClass);
    // Spoken preview of selected work
    speakText(t(p.nameKey));
  };

  const handleLanguageSelect = (lang: Language) => {
    setLanguage(lang);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onComplete({
      presetId: selectedPreset,
      workload: selectedWorkload,
      workerState,
    });
  };

  return (
    <div className="w-full max-w-md mx-auto px-4 py-5 space-y-6">
      <header className="text-center space-y-1.5">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-orange-100 text-orange-600 mb-1">
          <Sun className="w-7 h-7" aria-hidden="true" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-stone-900">
          {t('s1.title')}
        </h1>
        <p className="text-sm text-stone-600">
          {t('s1.subtitle')}
        </p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Language Selection Buttons (Big Touch Targets) */}
        <section aria-labelledby="lang-heading" className="space-y-2">
          <h2 id="lang-heading" className="text-sm font-bold uppercase tracking-wider text-stone-700">
            {t('s1.select_language')}
          </h2>
          <div className="grid grid-cols-3 gap-2">
            {[
              { code: 'ta' as Language, label: 'தமிழ்', sub: 'Tamil' },
              { code: 'hi' as Language, label: 'हिन्दी', sub: 'Hindi' },
              { code: 'en' as Language, label: 'English', sub: 'English' },
            ].map((lang) => {
              const isSelected = language === lang.code;
              return (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => handleLanguageSelect(lang.code)}
                  className={`min-h-[52px] p-2 rounded-xl border-2 flex flex-col items-center justify-center transition-all ${
                    isSelected
                      ? 'border-orange-500 bg-orange-50 text-orange-950 font-bold shadow-xs'
                      : 'border-stone-200 bg-white text-stone-800 hover:border-stone-300'
                  }`}
                  aria-pressed={isSelected}
                >
                  <span className="text-base">{lang.label}</span>
                  <span className="text-xs text-stone-700">{lang.sub}</span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Job Preset Selection */}
        <section aria-labelledby="job-heading" className="space-y-2">
          <h2 id="job-heading" className="text-sm font-bold uppercase tracking-wider text-stone-700">
            {t('s1.select_job')}
          </h2>
          <div className="grid grid-cols-2 gap-2.5">
            {presets.map((preset) => {
              const isSelected = selectedPreset === preset.id;
              const Icon = iconMap[preset.icon] || User;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handlePresetSelect(preset)}
                  className={`min-h-[64px] p-3 rounded-xl border-2 text-left flex items-start gap-2.5 transition-all ${
                    isSelected
                      ? 'border-orange-500 bg-orange-50 text-orange-950 shadow-xs'
                      : 'border-stone-200 bg-white text-stone-800 hover:border-stone-300'
                  }`}
                  aria-pressed={isSelected}
                >
                  <div
                    className={`p-1.5 rounded-lg shrink-0 ${
                      isSelected ? 'bg-orange-500 text-white' : 'bg-stone-100 text-stone-600'
                    }`}
                  >
                    <Icon className="w-5 h-5" aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-xs leading-tight line-clamp-2">
                      {t(preset.nameKey)}
                    </p>
                    <p className="text-[11px] text-stone-700 capitalize mt-0.5">
                      {t(`workload.${preset.defaultWorkload}`)}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Custom Workload Selection */}
        {selectedPreset === 'custom' && (
          <section aria-labelledby="custom-workload-heading" className="space-y-2 bg-stone-50 p-3.5 rounded-xl border border-stone-200">
            <h2 id="custom-workload-heading" className="text-xs font-bold uppercase tracking-wider text-stone-700">
              {t('s1.custom_workload_title')}
            </h2>
            <div className="grid grid-cols-2 gap-2">
              {(['light', 'moderate', 'heavy', 'very_heavy'] as WorkloadClass[]).map((wl) => {
                const isSelected = selectedWorkload === wl;
                return (
                  <button
                    key={wl}
                    type="button"
                    onClick={() => setSelectedWorkload(wl)}
                    className={`min-h-[48px] px-3 py-2 rounded-xl border-2 text-xs font-semibold text-center transition-all ${
                      isSelected
                        ? 'border-orange-500 bg-orange-50 text-orange-950 font-bold shadow-xs'
                        : 'border-stone-200 bg-white text-stone-800 hover:border-stone-300'
                    }`}
                    aria-pressed={isSelected}
                  >
                    {t(`workload.${wl}`)}
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* Acclimatisation Experience Radio */}
        <section aria-labelledby="acclim-heading" className="space-y-2.5 bg-stone-50 p-3.5 rounded-xl border border-stone-200">
          <h2 id="acclim-heading" className="text-xs font-bold uppercase tracking-wider text-stone-700 flex items-center gap-1.5">
            <ShieldAlert className="w-4 h-4 text-orange-600" aria-hidden="true" />
            {t('s1.acclimatisation_question')}
          </h2>

          <div className="space-y-2">
            <label className={`min-h-[48px] px-3 py-2 rounded-lg border flex items-center gap-3 cursor-pointer text-xs font-medium transition-all ${
              workerState === 'acclimatised'
                ? 'border-orange-500 bg-white shadow-xs text-stone-900'
                : 'border-stone-200 text-stone-700'
            }`}>
              <input
                type="radio"
                name="acclimatisation"
                value="acclimatised"
                checked={workerState === 'acclimatised'}
                onChange={() => setWorkerState('acclimatised')}
                className="w-4 h-4 text-orange-600 focus:ring-orange-500"
              />
              <span>{t('s1.acclimatised_opt')}</span>
            </label>

            <label className={`min-h-[48px] px-3 py-2 rounded-lg border flex items-center gap-3 cursor-pointer text-xs font-medium transition-all ${
              workerState === 'new_or_returning'
                ? 'border-orange-500 bg-white shadow-xs text-stone-900'
                : 'border-stone-200 text-stone-700'
            }`}>
              <input
                type="radio"
                name="acclimatisation"
                value="new_or_returning"
                checked={workerState === 'new_or_returning'}
                onChange={() => setWorkerState('new_or_returning')}
                className="w-4 h-4 text-orange-600 focus:ring-orange-500"
              />
              <span>{t('s1.new_opt')}</span>
            </label>
          </div>
        </section>

        {/* Submit Action (min 48px height) */}
        <button
          type="submit"
          className="w-full min-h-[52px] bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl shadow-md flex items-center justify-center gap-2 text-base transition-colors"
        >
          <span>{t('s1.continue')}</span>
          <ChevronRight className="w-5 h-5" aria-hidden="true" />
        </button>
      </form>
    </div>
  );
};
