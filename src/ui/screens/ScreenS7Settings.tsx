import React, { useState } from 'react';
import { useTranslation } from '../../i18n/useTranslation';
import { Language } from '../../i18n/keys';
import { TAMIL_NADU_CITIES, NATIONAL_HEAT_CITIES, ALL_CITIES } from '../../data/locations';
import { AppSettings } from '../../data/cache';
import { WorkloadClass } from '../../engine/limits';
import presetsData from '../../../config/presets.json';
import {
  MapPin,
  Globe,
  Sun,
  Shield,
  Eye,
  CloudSun,
  Navigation,
  Info,
  Briefcase,
} from 'lucide-react';
import { MedicalDisclaimerNote } from '../components/PrototypeBanner';

interface ScreenS7SettingsProps {
  settings: AppSettings;
  onUpdateSettings: (newSettings: Partial<AppSettings>) => void;
  sourceLabel: string;
  ageFormatted: string;
}

export const ScreenS7Settings: React.FC<ScreenS7SettingsProps> = ({
  settings,
  onUpdateSettings,
  sourceLabel,
  ageFormatted,
}) => {
  const { language, setLanguage, t } = useTranslation();
  const [geoError, setGeoError] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState<boolean>(false);

  const handleCityChange = (cityId: string) => {
    const city = ALL_CITIES.find((c) => c.id === cityId);
    if (city) {
      onUpdateSettings({
        locationId: city.id,
        lat: city.lat,
        lon: city.lon,
      });
    }
  };

  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      setGeoError('Geolocation is not supported by your browser.');
      return;
    }
    setIsLocating(true);
    setGeoError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        const lat = Math.round(pos.coords.latitude * 100) / 100;
        const lon = Math.round(pos.coords.longitude * 100) / 100;
        onUpdateSettings({
          locationId: 'current_gps',
          lat,
          lon,
        });
      },
      (err) => {
        setIsLocating(false);
        setGeoError(`Location error: ${err.message}. Using offline city list instead.`);
      },
      { timeout: 8000 }
    );
  };

  return (
    <div className="w-full max-w-md mx-auto px-4 py-4 space-y-5">
      <header className="space-y-1">
        <h1 className="text-xl font-bold text-stone-900">
          {t('s7.title')}
        </h1>
        <p className="text-xs text-stone-600">
          {t('s7.subtitle')}
        </p>
      </header>

      {/* Location Section */}
      <section aria-labelledby="loc-setting-heading" className="bg-white rounded-2xl p-4 border border-stone-200 shadow-sm space-y-3">
        <h2 id="loc-setting-heading" className="text-xs font-bold uppercase tracking-wider text-stone-700 flex items-center gap-1.5">
          <MapPin className="w-4 h-4 text-orange-600" aria-hidden="true" />
          {t('s7.location_label')}
        </h2>

        <div className="space-y-2">
          <select
            id="location-select"
            aria-label={t('s7.location_label')}
            value={settings.locationId}
            onChange={(e) => handleCityChange(e.target.value)}
            className="w-full min-h-[48px] px-3 rounded-xl border border-stone-300 text-sm font-medium bg-white focus:ring-2 focus:ring-orange-500"
          >
            {settings.locationId === 'current_gps' && (
              <option value="current_gps">
                GPS ({settings.lat}°N, {settings.lon}°E)
              </option>
            )}
            <optgroup label={t('s7.group_tamil_nadu')}>
              {TAMIL_NADU_CITIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {language === 'ta' ? c.nameTa : language === 'hi' ? c.nameHi : c.nameEn} ({c.lat}°N, {c.lon}°E)
                </option>
              ))}
            </optgroup>
            <optgroup label={t('s7.group_pan_india')}>
              {NATIONAL_HEAT_CITIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {language === 'ta' ? c.nameTa : language === 'hi' ? c.nameHi : c.nameEn} ({c.lat}°N, {c.lon}°E)
                </option>
              ))}
            </optgroup>
          </select>

          <button
            type="button"
            onClick={handleDetectLocation}
            disabled={isLocating}
            className="w-full min-h-[48px] px-3 py-2 rounded-xl border border-stone-300 text-xs font-semibold text-stone-800 flex items-center justify-center gap-2 hover:bg-stone-50"
          >
            <Navigation className="w-3.5 h-3.5 text-orange-600" aria-hidden="true" />
            <span>{isLocating ? 'Locating...' : t('s7.detect_location')}</span>
          </button>

          {geoError && <p className="text-[11px] text-rose-600 font-medium">{geoError}</p>}
        </div>
      </section>

      {/* Work Type & Intensity Section */}
      <section aria-labelledby="work-setting-heading" className="bg-white rounded-2xl p-4 border border-stone-200 shadow-sm space-y-3">
        <h2 id="work-setting-heading" className="text-xs font-bold uppercase tracking-wider text-stone-700 flex items-center gap-1.5">
          <Briefcase className="w-4 h-4 text-orange-600" aria-hidden="true" />
          {t('s7.work_type_label')}
        </h2>

        <div className="space-y-3">
          <div>
            <select
              id="work-type-select"
              aria-label={t('s7.work_type_label')}
              value={settings.presetId}
              onChange={(e) => {
                const selected = presetsData.presets.find((p) => p.id === e.target.value);
                if (selected) {
                  onUpdateSettings({
                    presetId: selected.id,
                    workload: selected.defaultWorkload as WorkloadClass,
                  });
                }
              }}
              className="w-full min-h-[48px] px-3 rounded-xl border border-stone-300 text-sm font-medium bg-white focus:ring-2 focus:ring-orange-500"
            >
              {presetsData.presets.map((p) => (
                <option key={p.id} value={p.id}>
                  {t(p.nameKey)} ({t(`workload.${p.defaultWorkload}`)})
                </option>
              ))}
            </select>
          </div>

          {settings.presetId === 'custom' && (
            <div>
              <span className="text-xs font-semibold text-stone-700 block mb-1.5">
                {t('s7.workload_label')}
              </span>
              <div className="grid grid-cols-2 gap-2">
                {(['light', 'moderate', 'heavy', 'very_heavy'] as WorkloadClass[]).map((wl) => {
                  const isSelected = settings.workload === wl;
                  return (
                    <button
                      key={wl}
                      type="button"
                      onClick={() => onUpdateSettings({ workload: wl })}
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
            </div>
          )}
        </div>
      </section>

      {/* Language Section */}
      <section aria-labelledby="lang-setting-heading" className="bg-white rounded-2xl p-4 border border-stone-200 shadow-sm space-y-3">
        <h2 id="lang-setting-heading" className="text-xs font-bold uppercase tracking-wider text-stone-700 flex items-center gap-1.5">
          <Globe className="w-4 h-4 text-orange-600" aria-hidden="true" />
          {t('s7.language_label')}
        </h2>
        <div className="grid grid-cols-3 gap-2">
          {[
            { code: 'ta' as Language, label: 'தமிழ்' },
            { code: 'hi' as Language, label: 'हिन्दी' },
            { code: 'en' as Language, label: 'English' },
          ].map((lang) => (
            <button
              key={lang.code}
              type="button"
              onClick={() => {
                setLanguage(lang.code);
                onUpdateSettings({ language: lang.code });
              }}
              className={`min-h-[48px] rounded-xl border-2 text-xs font-bold transition-all ${
                language === lang.code
                  ? 'border-orange-500 bg-orange-50 text-orange-950 shadow-xs'
                  : 'border-stone-200 bg-white text-stone-700'
              }`}
            >
              {lang.label}
            </button>
          ))}
        </div>
      </section>

      {/* Acclimatisation State */}
      <section aria-labelledby="state-setting-heading" className="bg-white rounded-2xl p-4 border border-stone-200 shadow-sm space-y-3">
        <h2 id="state-setting-heading" className="text-xs font-bold uppercase tracking-wider text-stone-700 flex items-center gap-1.5">
          <Shield className="w-4 h-4 text-orange-600" aria-hidden="true" />
          {t('s7.worker_state_label')}
        </h2>
        <div className="space-y-2">
          <label className="min-h-[48px] px-3 py-2 rounded-xl border flex items-center gap-2.5 cursor-pointer text-xs font-medium">
            <input
              type="radio"
              name="settings_acclim"
              checked={settings.workerState === 'acclimatised'}
              onChange={() => onUpdateSettings({ workerState: 'acclimatised' })}
              className="text-orange-600"
            />
            <span>{t('s1.acclimatised_opt')}</span>
          </label>
          <label className="min-h-[48px] px-3 py-2 rounded-xl border flex items-center gap-2.5 cursor-pointer text-xs font-medium">
            <input
              type="radio"
              name="settings_acclim"
              checked={settings.workerState === 'new_or_returning'}
              onChange={() => onUpdateSettings({ workerState: 'new_or_returning' })}
              className="text-orange-600"
            />
            <span>{t('s1.new_opt')}</span>
          </label>
        </div>
      </section>

      {/* Sunlight High Contrast Mode & Text Size */}
      <section aria-labelledby="display-setting-heading" className="bg-white rounded-2xl p-4 border border-stone-200 shadow-sm space-y-3">
        <h2 id="display-setting-heading" className="text-xs font-bold uppercase tracking-wider text-stone-700 flex items-center gap-1.5">
          <Eye className="w-4 h-4 text-orange-600" aria-hidden="true" />
          {t('s7.display_heading')}
        </h2>

        <div className="space-y-3">
          <label className="min-h-[48px] px-3 py-2 rounded-xl border border-stone-200 bg-stone-50 flex items-center justify-between cursor-pointer">
            <div className="flex items-center gap-2">
              <Sun className="w-4 h-4 text-amber-600" aria-hidden="true" />
              <span className="text-xs font-semibold text-stone-800">
                {t('s7.high_contrast_label')}
              </span>
            </div>
            <input
              type="checkbox"
              checked={settings.highContrast}
              onChange={(e) => onUpdateSettings({ highContrast: e.target.checked })}
              className="w-5 h-5 text-orange-600 rounded-md focus:ring-orange-500"
            />
          </label>

          <div>
            <span className="text-xs font-semibold text-stone-700 block mb-1.5">
              {t('s7.text_size_label')}
            </span>
            <div className="grid grid-cols-3 gap-2">
              {([
                { sz: 'normal', labelKey: 's7.size_normal' },
                { sz: 'large', labelKey: 's7.size_large' },
                { sz: 'extra_large', labelKey: 's7.size_extra_large' },
              ] as const).map(({ sz, labelKey }) => (
                <button
                  key={sz}
                  type="button"
                  onClick={() => onUpdateSettings({ textSize: sz })}
                  className={`min-h-[48px] rounded-xl border text-xs font-semibold capitalize ${
                    settings.textSize === sz
                      ? 'border-orange-500 bg-orange-50 text-orange-950 font-bold'
                      : 'border-stone-200 text-stone-700'
                  }`}
                >
                  {t(labelKey)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Weather Data Diagnostics */}
      <section aria-labelledby="status-setting-heading" className="bg-white rounded-2xl p-4 border border-stone-200 shadow-sm space-y-2 text-xs">
        <h2 id="status-setting-heading" className="font-bold text-stone-900 flex items-center gap-1.5">
          <CloudSun className="w-4 h-4 text-orange-600" aria-hidden="true" />
          {t('s7.forecast_status')}
        </h2>
        <div className="space-y-1 text-stone-700">
          <p><span className="font-semibold">{t('s7.source_label')}:</span> {sourceLabel}</p>
          <p><span className="font-semibold">{t('s7.data_age_label')}:</span> {ageFormatted}</p>
          <p><span className="font-semibold">{t('s7.attribution_label')}:</span> {t('s7.attribution_text')}</p>
        </div>
      </section>

      {/* About, Provenance & Disclaimers Section (D-06, D-10, D-12 / §6.4, §6.5) */}
      <section aria-labelledby="about-heading" className="bg-white rounded-2xl p-4 border border-stone-200 shadow-sm space-y-3 text-xs text-stone-700">
        <h2 id="about-heading" className="font-bold text-stone-900 flex items-center gap-1.5">
          <Info className="w-4 h-4 text-orange-600" aria-hidden="true" />
          {t('s7.about_heading')}
        </h2>
        <div className="space-y-2 text-[11px] leading-relaxed">
          <p>
            <span className="font-semibold text-stone-900">Band Provenance:</span> {t('app.band_provenance')}
          </p>
          <p>
            <span className="font-semibold text-stone-900">Clothing / PPE:</span> {t('app.clothing_disclaimer')}
          </p>
          <p>
            <span className="font-semibold text-stone-900">{t('s7.privacy_label')}:</span> {t('s7.privacy_text')}
          </p>
        </div>
        <MedicalDisclaimerNote />
      </section>
    </div>
  );
};
