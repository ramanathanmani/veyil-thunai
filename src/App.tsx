import React, { useState, useEffect } from 'react';
import { useTranslation } from './i18n/useTranslation';
import { PrototypeBanner } from './ui/components/PrototypeBanner';
import { ScreenS1LanguageJob } from './ui/screens/ScreenS1LanguageJob';
import { ScreenS2Today } from './ui/screens/ScreenS2Today';
import { ScreenS3DayPlan } from './ui/screens/ScreenS3DayPlan';
import { ScreenS4WorkLog } from './ui/screens/ScreenS4WorkLog';
import { ScreenS5History } from './ui/screens/ScreenS5History';
import { ScreenS6Learn } from './ui/screens/ScreenS6Learn';
import { ScreenS7Settings } from './ui/screens/ScreenS7Settings';
import { ScreenS8WardView } from './ui/screens/ScreenS8WardView';
import { getForecast, ForecastResponse, loadSampleForecast } from './data/forecast';
import { getSettings, saveSettings, AppSettings, DEFAULT_SETTINGS } from './data/cache';
import { buildDayPlan, findCurrentHourPlan, HourPlan } from './engine/plan';
import { TAMIL_NADU_CITIES } from './data/locations';
import presetsData from '../config/presets.json';
import {
  Sun,
  Calendar,
  ClipboardList,
  BookOpen,
  Settings as SettingsIcon,
  Building2,
  Eye,
} from 'lucide-react';

export type NavTab = 'today' | 'plan' | 'log' | 'history' | 'learn' | 'settings' | 'ward';

export const App: React.FC = () => {
  const { t, language, setLanguage } = useTranslation();
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [hasOnboarded, setHasOnboarded] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<NavTab>('today');
  const [forecast, setForecast] = useState<ForecastResponse | null>(null);
  const [dayPlan, setDayPlan] = useState<HourPlan[]>([]);
  const [inShade, setInShade] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Initialize settings
  useEffect(() => {
    let mounted = true;

    // Hard failsafe: guarantee loading screen dismisses within 2.5s even if network/storage hangs
    const failsafeTimer = setTimeout(() => {
      if (mounted) {
        setIsLoading(false);
      }
    }, 2500);

    async function init() {
      try {
        const stored = await Promise.race([
          getSettings(),
          new Promise<AppSettings>((res) => setTimeout(() => res(DEFAULT_SETTINGS), 1000)),
        ]);
        if (!mounted) return;
        setSettings(stored);
        if (stored.language) setLanguage(stored.language);

        // Check if user has picked a preset before
        try {
          const onboarded = localStorage.getItem('veyil_onboarded') === 'true';
          setHasOnboarded(onboarded);
        } catch {
          // ignore storage access issues
        }

        await loadWeatherData(stored.lat, stored.lon);
      } catch (err) {
        console.warn('App initialization error, falling back:', err);
        if (mounted) {
          setForecast(loadSampleForecast());
        }
      } finally {
        if (mounted) {
          clearTimeout(failsafeTimer);
          setIsLoading(false);
        }
      }
    }

    init();

    return () => {
      mounted = false;
      clearTimeout(failsafeTimer);
    };
  }, []);

  useEffect(() => {
    if (!forecast || forecast.items.length === 0) return;

    const plans = buildDayPlan(forecast.items, {
      lat: settings.lat,
      lon: settings.lon,
      workload: settings.workload,
      workerState: settings.workerState,
      inShade,
      dataQuality: forecast.dataQuality,
    });
    setDayPlan(plans);
  }, [forecast, settings, inShade]);

  const loadWeatherData = async (lat: number, lon: number) => {
    try {
      const data = await Promise.race([
        getForecast(lat, lon),
        new Promise<ForecastResponse>((_, rej) =>
          setTimeout(() => rej(new Error('Weather fetch timeout')), 2500)
        ),
      ]);
      setForecast(data);
    } catch {
      setForecast(loadSampleForecast());
    }
  };

  const handleUpdateSettings = async (updates: Partial<AppSettings>) => {
    const updated = await saveSettings(updates);
    setSettings(updated);
    if (updates.lat !== undefined || updates.lon !== undefined) {
      await loadWeatherData(updated.lat, updated.lon);
    }
  };

  const handleOnboardingComplete = (data: {
    preset: string;
    workload: any;
    workerState: any;
  }) => {
    handleUpdateSettings(data);
    localStorage.setItem('veyil_onboarded', 'true');
    setHasOnboarded(true);
    setActiveTab('today');
  };

  const currentHourPlan = findCurrentHourPlan(dayPlan) || (forecast ? buildDayPlan(forecast.items.slice(0, 1), {
    lat: settings.lat,
    lon: settings.lon,
    workload: settings.workload,
    workerState: settings.workerState,
    inShade,
  })[0] : null);

  const city = TAMIL_NADU_CITIES.find((c) => c.id === settings.locationId) || TAMIL_NADU_CITIES[0];
  const locationName = language === 'ta' ? city.nameTa : language === 'hi' ? city.nameHi : city.nameEn;

  const currentPreset = presetsData.presets.find((p) => p.id === settings.presetId) || presetsData.presets[0];
  const jobTitle = t(currentPreset.nameKey);

  // High contrast & text size classes
  const contrastClass = settings.highContrast ? 'contrast-125 saturate-150 bg-amber-50 text-stone-950 font-bold' : '';
  const textSizeClass = {
    normal: 'text-base',
    large: 'text-lg',
    extra_large: 'text-xl',
  }[settings.textSize];

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-100 p-4">
        <div className="text-center space-y-2">
          <Sun className="w-8 h-8 text-orange-500 animate-spin mx-auto" aria-hidden="true" />
          <p className="text-sm font-semibold text-stone-700">Loading Veyil Thunai...</p>
        </div>
      </div>
    );
  }

  // Show onboarding screen on first launch
  if (!hasOnboarded) {
    return (
      <div className={`min-h-screen bg-stone-100 flex flex-col ${textSizeClass} ${contrastClass}`}>
        <PrototypeBanner />
        <main className="flex-1">
          <ScreenS1LanguageJob
            initialPreset={settings.presetId}
            initialWorkload={settings.workload}
            initialState={settings.workerState}
            onComplete={handleOnboardingComplete}
          />
        </main>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-stone-100 flex flex-col pb-20 ${textSizeClass} ${contrastClass}`}>
      <PrototypeBanner />

      {/* Main Top App Header */}
      <header className="bg-white border-b border-stone-200 px-4 py-2.5 shadow-xs sticky top-0 z-30">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <button
            type="button"
            onClick={() => setActiveTab('today')}
            className="flex items-center gap-2 text-left"
          >
            <div className="w-8 h-8 rounded-lg bg-orange-600 text-white flex items-center justify-center shadow-xs">
              <Sun className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <span className="font-black text-sm tracking-tight text-stone-900 block leading-tight">
                {t('app.title')}
              </span>
              <span className="text-[10px] text-stone-700 font-medium">
                {jobTitle}
              </span>
            </div>
          </button>

          {/* Quick toggle shortcuts: High contrast & Ward View */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => handleUpdateSettings({ highContrast: !settings.highContrast })}
              className={`min-h-[48px] min-w-[48px] p-2 rounded-lg border text-xs font-semibold flex items-center justify-center ${
                settings.highContrast
                  ? 'bg-amber-400 text-stone-950 border-amber-500'
                  : 'bg-stone-50 border-stone-200 text-stone-600'
              }`}
              title="Sunlight High Contrast Mode"
              aria-label="Toggle sunlight high contrast mode"
            >
              <Eye className="w-4 h-4" aria-hidden="true" />
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('ward')}
              className={`min-h-[48px] min-w-[48px] px-2.5 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1 ${
                activeTab === 'ward'
                  ? 'bg-orange-100 border-orange-500 text-orange-950'
                  : 'bg-stone-50 border-stone-200 text-stone-600'
              }`}
            >
              <Building2 className="w-3.5 h-3.5 text-orange-600" aria-hidden="true" />
              <span className="hidden sm:inline">Ward Demo</span>
            </button>
          </div>
        </div>
      </header>

      {/* Screen Router View */}
      <main className="flex-1">
        {activeTab === 'today' && currentHourPlan && (
          <ScreenS2Today
            currentPlan={currentHourPlan}
            locationName={locationName}
            ageFormatted={forecast?.ageFormatted || ''}
            staleWarning={forecast?.staleWarning || false}
            inShade={inShade}
            onToggleShade={setInShade}
            onNavigateToPlan={() => setActiveTab('plan')}
            onNavigateToLog={() => setActiveTab('log')}
            onNavigateToLearn={() => setActiveTab('learn')}
          />
        )}

        {activeTab === 'plan' && (
          <ScreenS3DayPlan dayPlan={dayPlan} jobTitle={jobTitle} presetId={settings.presetId} />
        )}

        {activeTab === 'log' && currentHourPlan && (
          <ScreenS4WorkLog
            currentPlan={currentHourPlan}
            jobPreset={settings.presetId}
            workload={settings.workload}
            workerState={settings.workerState}
            lat={settings.lat}
            lon={settings.lon}
            onNavigateToHistory={() => setActiveTab('history')}
            onNavigateToLearn={() => setActiveTab('learn')}
          />
        )}

        {activeTab === 'history' && <ScreenS5History />}

        {activeTab === 'learn' && <ScreenS6Learn />}

        {activeTab === 'settings' && (
          <ScreenS7Settings
            settings={settings}
            onUpdateSettings={handleUpdateSettings}
            sourceLabel={forecast?.sourceLabel || ''}
            ageFormatted={forecast?.ageFormatted || ''}
          />
        )}

        {activeTab === 'ward' && <ScreenS8WardView />}
      </main>

      {/* Bottom Navigation Bar (Mobile First, touch targets >= 48px) */}
      <nav
        aria-label="Main Navigation"
        className="fixed bottom-0 inset-x-0 bg-white border-t border-stone-200 z-40 shadow-lg"
      >
        <div className="max-w-md mx-auto grid grid-cols-5 h-16">
          {[
            { id: 'today' as NavTab, label: t('nav.today'), icon: Sun },
            { id: 'plan' as NavTab, label: t('nav.plan'), icon: Calendar },
            { id: 'log' as NavTab, label: t('nav.log'), icon: ClipboardList },
            { id: 'learn' as NavTab, label: t('nav.learn'), icon: BookOpen },
            { id: 'settings' as NavTab, label: t('nav.settings'), icon: SettingsIcon },
          ].map((tab) => {
            const isCurrent = activeTab === tab.id || (tab.id === 'log' && activeTab === 'history');
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`min-h-[48px] flex flex-col items-center justify-center gap-1 transition-colors ${
                  isCurrent
                    ? 'text-orange-600 font-bold'
                    : 'text-stone-500 hover:text-stone-900 font-medium'
                }`}
                aria-current={isCurrent ? 'page' : undefined}
              >
                <Icon className={`w-5 h-5 ${isCurrent ? 'stroke-[2.5]' : ''}`} aria-hidden="true" />
                <span className="text-[11px] leading-tight truncate max-w-[64px]">
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
};
