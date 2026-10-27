import React, { useState } from 'react';
import { useTranslation } from '../../i18n/useTranslation';
import { HourPlan, isPeakHeatHour } from '../../engine/plan';
import { BandBadge } from '../components/BandBadge';
import { MedicalDisclaimerNote } from '../components/PrototypeBanner';
import { CoolSpotsModal } from '../components/CoolSpotsModal';
import { HeatPauseModal } from '../components/HeatPauseModal';
import { CustomerShareModal } from '../components/CustomerShareModal';
import {
  Volume2,
  VolumeX,
  Droplets,
  Clock,
  Umbrella,
  ArrowRight,
  ClipboardList,
  AlertCircle,
  Sun,
  Thermometer,
  AlertOctagon,
  MapPin,
  Smartphone,
  Share2,
} from 'lucide-react';

interface ScreenS2TodayProps {
  currentPlan: HourPlan;
  locationName: string;
  ageFormatted: string;
  staleWarning: boolean;
  inShade: boolean;
  onToggleShade: (inShade: boolean) => void;
  onNavigateToPlan: () => void;
  onNavigateToLog: () => void;
  onNavigateToLearn?: () => void;
}

export const ScreenS2Today: React.FC<ScreenS2TodayProps> = ({
  currentPlan,
  locationName,
  ageFormatted,
  staleWarning,
  inShade,
  onToggleShade,
  onNavigateToPlan,
  onNavigateToLog,
  onNavigateToLearn,
}) => {
  const { t, speakText, isSpeaking, stopSpeaking } = useTranslation();
  const [isCoolSpotsOpen, setIsCoolSpotsOpen] = useState(false);
  const [isHeatPauseOpen, setIsHeatPauseOpen] = useState(false);
  const [isCustomerShareOpen, setIsCustomerShareOpen] = useState(false);

  // Check 11:00 - 16:00 IST peak heat window (Priority 1 Item 1)
  const isPeakHeatWindow = isPeakHeatHour(currentPlan.hourISO);

  // Heat alert day condition (Priority 3 Item 10)
  const isHeatAlertDay = currentPlan.tempC >= 38 || currentPlan.wbgtC >= 32;

  // Phone overheating risk when band is orange, red, or black (Priority 2 Item 8)
  const isPhoneOverheatingRisk =
    currentPlan.band === 'orange' ||
    currentPlan.band === 'red' ||
    currentPlan.band === 'black';

  const handleListen = () => {
    if (isSpeaking) {
      stopSpeaking();
      return;
    }
    // Plan reading order: band sentence, reason, action
    const bandText = t(`plan.${currentPlan.band}.now`);
    const reasonsText = currentPlan.reasons.map((r) => t(`reason.${r}`)).join(' ');
    const actionText = currentPlan.band === 'black'
      ? t('act.stop_work')
      : `${t('act.drink_now')} ${t('act.rest_shade')}`;

    const speechText = `${bandText}. ${reasonsText}. ${actionText}`;
    speakText(speechText, currentPlan.templateIds);
  };

  const handleWhatsAppShare = async () => {
    const alertText = t('s2.whatsapp_share_alert', {
      location: locationName,
      wbgt: currentPlan.wbgtC.toFixed(1),
      band: t(`band.${currentPlan.band}.label`),
    });

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: 'Veyil Thunai Heat Alert',
          text: alertText,
        });
        return;
      } catch {
        // Fallback to WhatsApp URI scheme
      }
    }

    try {
      window.open(`whatsapp://send?text=${encodeURIComponent(alertText)}`, '_blank');
    } catch {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(alertText);
      }
    }
  };

  return (
    <div className="w-full max-w-md mx-auto px-4 py-4 space-y-4">
      {/* Header status bar */}
      <header className="flex items-center justify-between text-xs text-stone-600 border-b border-stone-200 pb-2">
        <div className="flex items-center gap-1.5 font-medium">
          <Sun className="w-4 h-4 text-orange-500" aria-hidden="true" />
          <span>{locationName}</span>
        </div>
        <div className="flex items-center gap-1 text-[11px]">
          {staleWarning && <AlertCircle className="w-3.5 h-3.5 text-amber-600" aria-hidden="true" />}
          <span>{ageFormatted}</span>
        </div>
      </header>

      {/* Safe Offline Fallback Banner (Historical Weather) */}
      {currentPlan.dataQuality === 'sample' && (
        <div className="flex items-start gap-2.5 p-3 bg-amber-50 border border-amber-300 rounded-xl text-amber-950 text-xs">
          <AlertCircle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" aria-hidden="true" />
          <div>
            <span className="font-bold text-[11px] text-amber-900 block">
              {t('s2.offline_baseline_warning')}
            </span>
          </div>
        </div>
      )}

      {/* Heat Alert Day Banner (Priority 3 Item 10) */}
      {isHeatAlertDay && (
        <div className="flex items-start gap-2.5 p-3 bg-rose-50 border border-rose-300 rounded-xl text-rose-950 text-xs">
          <AlertOctagon className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" aria-hidden="true" />
          <div>
            <span className="font-bold uppercase tracking-wider text-[11px] text-rose-800 block">
              {t('plan.heat_alert_day_badge')}
            </span>
            <span className="font-medium text-stone-800">{t('plan.heat_alert_day_desc')}</span>
          </div>
        </div>
      )}

      {/* Advisory Peak Heat 11:00 - 16:00 Banner (Priority 1 Item 1) */}
      {isPeakHeatWindow && (
        <div className="flex items-start gap-2.5 p-3 bg-amber-50 border border-amber-300 rounded-xl text-amber-950 text-xs">
          <Sun className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" aria-hidden="true" />
          <div>
            <span className="font-bold uppercase tracking-wider text-[11px] text-amber-800 block">
              {t('plan.peak_heat_badge')} (11:00 – 16:00 IST)
            </span>
            <span className="font-medium text-stone-800">{t('plan.peak_heat_strip')}</span>
          </div>
        </div>
      )}

      {/* Main Heat Status Card */}
      <section
        aria-labelledby="today-status-heading"
        className="bg-white rounded-2xl p-5 border border-stone-200 shadow-sm space-y-4"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="today-status-heading" className="text-xs uppercase tracking-wider font-bold text-stone-700">
              {t('s2.current_status')}
            </h2>
            <div className="mt-1.5">
              <BandBadge band={currentPlan.band} size="lg" />
            </div>
          </div>

          <div className="text-right">
            <span className="text-3xl font-black text-stone-900 tracking-tight">
              {currentPlan.wbgtC.toFixed(1)}°
            </span>
            <span className="text-xs text-stone-700 block font-medium">{t('s2.wbgt_est')}</span>
            {currentPlan.isFallbackSimple && (
              <span className="inline-block mt-0.5 px-1.5 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-900 rounded border border-amber-300">
                {t('plan.rough_estimate_badge')}
              </span>
            )}
          </div>
        </div>

        {/* Fallback rough estimate banner if solar radiation missing (D-03) */}
        {currentPlan.isFallbackSimple && (
          <div className="flex items-center gap-2 p-2.5 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-900 font-semibold">
            <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" aria-hidden="true" />
            <span>{t('plan.rough_estimate_warning')}</span>
          </div>
        )}

        {/* Listen Button (Prominent voice readout) */}
        <button
          type="button"
          onClick={handleListen}
          className={`w-full min-h-[48px] px-4 py-2.5 rounded-xl border-2 font-bold text-sm flex items-center justify-center gap-2 transition-all ${
            isSpeaking
              ? 'bg-orange-600 text-white border-orange-700 animate-pulse'
              : 'bg-orange-50 text-orange-900 border-orange-300 hover:bg-orange-100'
          }`}
          aria-label={isSpeaking ? t('s2.listening') : t('s2.listen_button')}
        >
          {isSpeaking ? (
            <>
              <VolumeX className="w-5 h-5 shrink-0" aria-hidden="true" />
              <span>{t('s2.listening')}</span>
            </>
          ) : (
            <>
              <Volume2 className="w-5 h-5 shrink-0 text-orange-600" aria-hidden="true" />
              <span>{t('s2.listen_button')} ({t('s2.voice_guidance')})</span>
            </>
          )}
        </button>

        {/* Plain Language Reason & Action */}
        <div className="bg-stone-50 rounded-xl p-3.5 border border-stone-200 space-y-2 text-stone-800 text-sm">
          {currentPlan.reasons.length > 0 && (
            <p className="font-semibold text-stone-900 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-orange-600 shrink-0 mt-0.5" aria-hidden="true" />
              <span>{currentPlan.reasons.map((r) => t(`reason.${r}`)).join(' ')}</span>
            </p>
          )}

          <p className="text-xs text-stone-600">
            {t(`band.${currentPlan.band}.action`)}
          </p>
        </div>

        {/* Work / Rest Breakdown */}
        <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
          <div className="bg-stone-100 p-2.5 rounded-lg border border-stone-200 flex items-center gap-2">
            <Clock className="w-4 h-4 text-stone-600 shrink-0" aria-hidden="true" />
            <div>
              <span className="text-stone-700 block">{t('s2.work_per_hour')}</span>
              <span className="font-bold text-stone-900">
                {currentPlan.maxWorkMinPerHour !== null
                  ? t('s2.min_max', { min: currentPlan.maxWorkMinPerHour })
                  : t('act.stop_work')}
              </span>
            </div>
          </div>

          <div className="bg-stone-100 p-2.5 rounded-lg border border-stone-200 flex items-center gap-2">
            <Umbrella className="w-4 h-4 text-stone-600 shrink-0" aria-hidden="true" />
            <div>
              <span className="text-stone-700 block">{t('s2.rest_per_hour')}</span>
              <span className="font-bold text-stone-900">
                {currentPlan.minRestMinPerHour !== null
                  ? t('s2.min_rest', { min: currentPlan.minRestMinPerHour })
                  : t('act.rest_shade')}
              </span>
            </div>
          </div>
        </div>

        {/* In-Shade Toggle */}
        <div className="pt-1">
          <label className="min-h-[48px] px-3 py-2 rounded-xl border border-stone-200 bg-stone-50 flex items-center justify-between cursor-pointer">
            <div className="flex items-center gap-2.5">
              <Umbrella className={`w-5 h-5 ${inShade ? 'text-emerald-600' : 'text-stone-500'}`} aria-hidden="true" />
              <span className="text-xs font-semibold text-stone-800">
                {t('s2.in_shade_toggle')}
              </span>
            </div>
            <input
              type="checkbox"
              checked={inShade}
              onChange={(e) => onToggleShade(e.target.checked)}
              className="w-5 h-5 text-emerald-600 rounded-md focus:ring-emerald-500"
            />
          </label>
        </div>

        {/* Weather Observations Strip */}
        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-stone-100 text-center text-xs">
          <div>
            <span className="text-stone-700 flex items-center justify-center gap-1">
              <Thermometer className="w-3.5 h-3.5" aria-hidden="true" /> {t('s2.air')}
            </span>
            <span className="font-bold text-stone-900">{currentPlan.tempC.toFixed(0)}°C</span>
          </div>
          <div>
            <span className="text-stone-700 flex items-center justify-center gap-1">
              <Droplets className="w-3.5 h-3.5" aria-hidden="true" /> {t('s2.humidity')}
            </span>
            <span className="font-bold text-stone-900">{currentPlan.rhPct}%</span>
          </div>
          <div>
            <span className="text-stone-700 flex items-center justify-center gap-1">
              <Sun className="w-3.5 h-3.5" aria-hidden="true" /> {t('s2.solar')}
            </span>
            <span className="font-bold text-stone-900">
              {inShade
                ? `0 (${t('s2.shade_label')})`
                : currentPlan.solarWm2
                ? `${currentPlan.solarWm2} W`
                : '0 W'}
            </span>
          </div>
        </div>

        {/* Smartphone Heat Tip (Priority 2 Item 8) */}
        {isPhoneOverheatingRisk && (
          <div className="flex items-start gap-2.5 p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-stone-800 text-xs text-left">
            <Smartphone className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <span className="font-bold text-stone-900 block">{t('tip.phone_heat_title')}</span>
              <span className="text-stone-600 mt-0.5 block">{t('tip.phone_heat_content')}</span>
            </div>
          </div>
        )}

        {/* Clothing/PPE limitation disclaimer (D-06 / §6.5) */}
        <p className="text-[11px] text-stone-500 text-center leading-tight">
          {t('app.clothing_disclaimer')}
        </p>

        <MedicalDisclaimerNote />
      </section>

      {/* Priority 2 Item 5: Emergency Heat Pause (I Need to Stop) */}
      <button
        type="button"
        onClick={() => setIsHeatPauseOpen(true)}
        className="w-full min-h-[48px] px-4 py-2.5 bg-rose-50 hover:bg-rose-100 border-2 border-rose-300 text-rose-900 font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-xs transition-colors"
        aria-label={t('sos.button')}
      >
        <AlertOctagon className="w-4 h-4 text-rose-600 shrink-0" aria-hidden="true" />
        <span>{t('sos.button')}</span>
      </button>

      {/* Priority 1 Item 3 & Priority 2 Item 7: Quick Access Tools */}
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setIsCoolSpotsOpen(true)}
          className="min-h-[48px] px-3 py-2 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-900 font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-xs transition-colors"
        >
          <MapPin className="w-4 h-4 text-blue-600 shrink-0" aria-hidden="true" />
          <span>{t('cool_spots.button')}</span>
        </button>

        <button
          type="button"
          onClick={() => setIsCustomerShareOpen(true)}
          className="min-h-[48px] px-3 py-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-900 font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-xs transition-colors"
        >
          <Droplets className="w-4 h-4 text-emerald-600 shrink-0" aria-hidden="true" />
          <span>{t('share.button')}</span>
        </button>
      </div>

      {/* 1-Tap Client-Side WhatsApp Share Button */}
      <button
        type="button"
        onClick={handleWhatsAppShare}
        className="w-full min-h-[48px] px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-xs transition-colors"
        aria-label={t('s2.whatsapp_share_button')}
      >
        <Share2 className="w-4 h-4 text-white shrink-0" aria-hidden="true" />
        <span>{t('s2.whatsapp_share_button')}</span>
      </button>

      {/* Navigation Quick Actions */}
      <div className="grid grid-cols-2 gap-3 pt-1">
        <button
          type="button"
          onClick={onNavigateToPlan}
          className="min-h-[48px] p-3 rounded-xl bg-white border border-stone-300 hover:border-orange-500 text-stone-900 font-semibold text-xs flex items-center justify-between shadow-xs transition-colors"
        >
          <span>{t('s2.view_all_hours')}</span>
          <ArrowRight className="w-4 h-4 text-orange-600" aria-hidden="true" />
        </button>

        <button
          type="button"
          onClick={onNavigateToLog}
          className="min-h-[48px] p-3 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-semibold text-xs flex items-center justify-between shadow-xs transition-colors"
        >
          <span>{t('s2.quick_log')}</span>
          <ClipboardList className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>

      {/* Modals */}
      <CoolSpotsModal
        isOpen={isCoolSpotsOpen}
        onClose={() => setIsCoolSpotsOpen(false)}
      />

      <HeatPauseModal
        isOpen={isHeatPauseOpen}
        onClose={() => setIsHeatPauseOpen(false)}
        currentPlan={currentPlan}
        onNavigateToLearn={onNavigateToLearn}
      />

      <CustomerShareModal
        isOpen={isCustomerShareOpen}
        onClose={() => setIsCustomerShareOpen(false)}
      />
    </div>
  );
};
