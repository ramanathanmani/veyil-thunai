import React, { useState, useEffect } from 'react';
import { useTranslation } from '../../i18n/useTranslation';
import { LogEntry } from '../../log/chain';
import {
  startShift,
  recordRestBreak,
  endShift,
  getActiveShift,
} from '../../log/store';
import { HourPlan } from '../../engine/plan';
import { WorkloadClass, WorkerState } from '../../engine/limits';
import { MedicalDisclaimerNote } from '../components/PrototypeBanner';
import { HeatPauseModal } from '../components/HeatPauseModal';
import {
  Play,
  Square,
  Coffee,
  CheckCircle2,
  History,
  Timer,
  Droplets,
  AlertOctagon,
  HeartHandshake,
} from 'lucide-react';

interface ScreenS4WorkLogProps {
  currentPlan: HourPlan;
  jobPreset: string;
  workload: WorkloadClass;
  workerState: WorkerState;
  lat: number;
  lon: number;
  onNavigateToHistory: () => void;
  onNavigateToLearn?: () => void;
}

export const ScreenS4WorkLog: React.FC<ScreenS4WorkLogProps> = ({
  currentPlan,
  jobPreset,
  workload,
  workerState,
  lat,
  lon,
  onNavigateToHistory,
  onNavigateToLearn,
}) => {
  const { t, speakText } = useTranslation();
  const [activeShift, setActiveShift] = useState<LogEntry | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [restCount, setRestCount] = useState<number>(0);
  const [pressureAnswer, setPressureAnswer] = useState<boolean | null>(null);
  const [noteText, setNoteText] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isHeatPauseOpen, setIsHeatPauseOpen] = useState<boolean>(false);
  const [hasAnnouncedCoolingBreak, setHasAnnouncedCoolingBreak] = useState<boolean>(false);
  const [workerTarget, setWorkerTarget] = useState<string>(
    () => (typeof window !== 'undefined' ? localStorage.getItem('vt_worker_target') || '' : '')
  );

  useEffect(() => {
    loadActive();
  }, []);

  const loadActive = async () => {
    const active = await getActiveShift();
    setActiveShift(active);
    if (active) {
      setRestCount(active.restBreaks.length);
      const startMs = new Date(active.startedAt).getTime();
      setElapsedSeconds(Math.floor((Date.now() - startMs) / 1000));
    }
  };

  useEffect(() => {
    if (!activeShift) return;
    const interval = setInterval(() => {
      const startMs = new Date(activeShift.startedAt).getTime();
      setElapsedSeconds(Math.floor((Date.now() - startMs) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [activeShift]);

  // Priority 1 Item 2: After 90 minutes (5400s), announce cooling break once
  useEffect(() => {
    if (activeShift && elapsedSeconds >= 5400 && !hasAnnouncedCoolingBreak) {
      setHasAnnouncedCoolingBreak(true);
      speakText(t('act.cooling_break'), 'act.cooling_break');
    }
  }, [activeShift, elapsedSeconds, hasAnnouncedCoolingBreak, speakText, t]);

  const handleTargetChange = (val: string) => {
    setWorkerTarget(val);
    if (typeof window !== 'undefined') {
      localStorage.setItem('vt_worker_target', val);
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleStartShift = async () => {
    setIsSubmitting(true);
    try {
      const entry = await startShift({
        preset: jobPreset,
        workload,
        workerState,
        lat,
        lon,
        wbgtC: currentPlan.wbgtC,
        band: currentPlan.band,
        dataQuality: currentPlan.dataQuality,
      });
      setActiveShift(entry);
      setRestCount(0);
      setElapsedSeconds(0);
      setHasAnnouncedCoolingBreak(false);
      showToast(t('log.started'));
      speakText(t('log.started'), 'log.started');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddRestBreak = async () => {
    if (!activeShift) return;
    const now = new Date();
    // Default standard rest break: 15 minutes prior to now
    const start = new Date(now.getTime() - 15 * 60 * 1000);

    const updated = await recordRestBreak(activeShift.id, start, now);
    setActiveShift(updated);
    setRestCount(updated.restBreaks.length);
    showToast(t('log.rest_added'));
    speakText(t('log.rest_added'), 'log.rest_added');
  };

  const handleEndShift = async () => {
    if (!activeShift) return;
    setIsSubmitting(true);
    try {
      await endShift({
        shiftId: activeShift.id,
        endedAt: new Date(),
        incentivePressure: pressureAnswer,
        note: noteText,
      });
      setActiveShift(null);
      setPressureAnswer(null);
      setNoteText('');
      setHasAnnouncedCoolingBreak(false);
      showToast(t('log.stopped'));
      speakText(t('log.stopped'), 'log.stopped');
      onNavigateToHistory();
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTimer = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // ORS prompt condition (Priority 2 Item 4): shift >= 2h (7200s) or red/black band
  const showOrsPrompt = activeShift
    ? elapsedSeconds >= 7200 || currentPlan.band === 'red' || currentPlan.band === 'black'
    : currentPlan.band === 'red' || currentPlan.band === 'black';

  return (
    <div className="w-full max-w-md mx-auto px-4 py-4 space-y-4">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-stone-900">
            {t('s4.title')}
          </h1>
          <p className="text-xs text-stone-600">
            {t('s4.subtitle')}
          </p>
        </div>
        <button
          type="button"
          onClick={onNavigateToHistory}
          className="min-h-[48px] px-3 py-1.5 rounded-lg border border-stone-300 text-xs font-semibold flex items-center gap-1.5 hover:bg-stone-100"
        >
          <History className="w-4 h-4 text-stone-600" aria-hidden="true" />
          <span>{t('s5.title')}</span>
        </button>
      </header>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="bg-emerald-600 text-white p-3 rounded-xl text-xs font-semibold shadow-md flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Shift State Card */}
      <section
        aria-labelledby="shift-status-heading"
        className="bg-white rounded-2xl p-5 border border-stone-200 shadow-sm space-y-4 text-center"
      >
        <span className="text-xs uppercase font-bold text-stone-700 tracking-wider">
          {activeShift ? t('s4.shift_active') : 'No Active Shift'}
        </span>

        {activeShift ? (
          <div className="space-y-4">
            {/* Running Timer */}
            <div className="py-2">
              <span className="text-4xl font-mono font-black text-stone-900 tracking-wider">
                {formatTimer(elapsedSeconds)}
              </span>
              <p className="text-xs text-stone-700 mt-1">
                Started at {new Date(activeShift.startedAt).toLocaleTimeString()}
              </p>
              <div className="mt-1">
                <button
                  type="button"
                  onClick={() => setElapsedSeconds((prev) => (prev < 5400 ? 5405 : prev + 1800))}
                  className="text-[10px] text-stone-700 hover:text-stone-900 underline font-medium p-1"
                >
                  +30m fast forward (demo test)
                </button>
              </div>
            </div>

            {/* 90-Minute Cooling Break Alert (Priority 1 Item 2) */}
            {elapsedSeconds >= 5400 && (
              <div className="bg-amber-100 border-2 border-amber-400 rounded-2xl p-4 text-left space-y-2.5 shadow-sm">
                <div className="flex items-center gap-2">
                  <Timer className="w-5 h-5 text-amber-700 shrink-0" aria-hidden="true" />
                  <span className="font-bold text-amber-950 text-sm">
                    {t('s4.cooling_break_title')}
                  </span>
                </div>
                <p className="text-xs text-amber-900 leading-snug">
                  {t('s4.cooling_break_prompt')}
                </p>
                <button
                  type="button"
                  onClick={handleAddRestBreak}
                  className="w-full min-h-[48px] bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl shadow-xs flex items-center justify-center gap-2 text-xs transition-colors"
                >
                  <Coffee className="w-4 h-4" aria-hidden="true" />
                  <span>{t('s4.cooling_break_action')}</span>
                </button>
                <p className="text-[10px] text-amber-800 italic leading-tight">
                  {t('s4.cooling_break_disclaimer')}
                </p>
              </div>
            )}

            {/* Rest Break Button (>= 48px target) */}
            <button
              type="button"
              onClick={handleAddRestBreak}
              className="w-full min-h-[52px] bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs flex items-center justify-center gap-2 text-sm transition-colors"
            >
              <Coffee className="w-5 h-5" aria-hidden="true" />
              <span>{t('s4.rest_button')}</span>
            </button>

            <p className="text-xs text-stone-600 font-medium">
              {t('s4.rest_count', { count: restCount })}
            </p>

            {/* Electrolyte / ORS Prompt (Priority 2 Item 4) */}
            {showOrsPrompt && (
              <div className="bg-sky-50 border border-sky-300 rounded-xl p-3 text-left space-y-1.5 text-xs text-sky-950">
                <div className="flex items-center gap-1.5 font-bold text-sky-900">
                  <Droplets className="w-4 h-4 text-sky-600 shrink-0" aria-hidden="true" />
                  <span>ORS & Hydration Advisory</span>
                </div>
                <p className="leading-snug">{t('s4.ors_prompt')}</p>
                <p className="text-[10px] text-sky-700 font-medium">{t('s4.ors_source')}</p>
              </div>
            )}

            {/* Emergency Heat Pause Button (Priority 2 Item 5) */}
            <button
              type="button"
              onClick={() => setIsHeatPauseOpen(true)}
              className="w-full min-h-[48px] bg-rose-50 hover:bg-rose-100 border-2 border-rose-300 text-rose-900 font-bold rounded-xl shadow-xs flex items-center justify-center gap-2 text-xs transition-colors"
              aria-label={t('sos.button')}
            >
              <AlertOctagon className="w-4 h-4 text-rose-600 shrink-0" aria-hidden="true" />
              <span>{t('sos.button')}</span>
            </button>

            {/* Pressure Question */}
            <div className="text-left bg-stone-50 p-3.5 rounded-xl border border-stone-200 space-y-2.5">
              <label className="text-xs font-semibold text-stone-800 block">
                {t('s4.pressure_question')}
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPressureAnswer(true)}
                  className={`min-h-[48px] px-3 py-2 text-xs rounded-lg border font-medium ${
                    pressureAnswer === true
                      ? 'bg-rose-50 border-rose-500 text-rose-900 font-bold'
                      : 'bg-white border-stone-200 text-stone-700'
                  }`}
                >
                  {t('s4.pressure_yes')}
                </button>
                <button
                  type="button"
                  onClick={() => setPressureAnswer(false)}
                  className={`min-h-[48px] px-3 py-2 text-xs rounded-lg border font-medium ${
                    pressureAnswer === false
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-900 font-bold'
                      : 'bg-white border-stone-200 text-stone-700'
                  }`}
                >
                  {t('s4.pressure_no')}
                </button>
              </div>
            </div>

            {/* Shift Note Input */}
            <div className="text-left space-y-1">
              <label htmlFor="shift-note" className="text-xs font-semibold text-stone-700 block">
                {t('s4.note_label')}
              </label>
              <textarea
                id="shift-note"
                maxLength={280}
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder={t('s4.note_placeholder')}
                className="w-full text-xs p-2.5 rounded-lg border border-stone-300 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                rows={2}
              />
              <span className="text-[10px] text-stone-600 block text-right">
                {noteText.length}/280
              </span>
            </div>

            {/* Stop Shift Button (>= 48px target) */}
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleEndShift}
              className="w-full min-h-[48px] bg-stone-900 hover:bg-stone-800 text-white font-bold rounded-xl shadow-xs flex items-center justify-center gap-2 text-sm transition-colors"
            >
              <Square className="w-4 h-4 fill-current text-rose-500" aria-hidden="true" />
              <span>{t('s4.stop_shift')}</span>
            </button>
          </div>
        ) : (
          <div className="py-6 space-y-4">
            <p className="text-sm text-stone-600 max-w-xs mx-auto">
              Start recording ambient heat exposure and your rest breaks securely on this phone.
            </p>

            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleStartShift}
              className="w-full min-h-[56px] bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-2xl shadow-md flex items-center justify-center gap-2.5 text-base transition-colors"
            >
              <Play className="w-5 h-5 fill-current" aria-hidden="true" />
              <span>{t('s4.start_shift')}</span>
            </button>
          </div>
        )}
      </section>

      {/* Health Before Hustle Honesty Card (Priority 2 Item 6) */}
      <section
        aria-labelledby="honesty-heading"
        className="bg-white rounded-2xl p-4 border border-stone-200 shadow-sm space-y-3 text-left"
      >
        <div className="flex items-center gap-2 text-orange-600">
          <HeartHandshake className="w-5 h-5 shrink-0" aria-hidden="true" />
          <h2 id="honesty-heading" className="font-bold text-stone-900 text-sm">
            {t('honesty.title')}
          </h2>
        </div>
        <p className="text-xs text-stone-700 leading-relaxed">
          {t('honesty.content')}
        </p>
        <div className="pt-1 space-y-1 border-t border-stone-100">
          <label htmlFor="worker-target-input" className="text-xs font-semibold text-stone-700 block">
            {t('honesty.target_label')}
          </label>
          <input
            id="worker-target-input"
            type="text"
            value={workerTarget}
            onChange={(e) => handleTargetChange(e.target.value)}
            placeholder={t('honesty.target_placeholder')}
            className="w-full text-xs p-2.5 rounded-lg border border-stone-300 focus:ring-2 focus:ring-orange-500 focus:outline-none min-h-[48px]"
          />
        </div>
      </section>

      {/* Emergency Heat Pause Modal */}
      <HeatPauseModal
        isOpen={isHeatPauseOpen}
        onClose={() => setIsHeatPauseOpen(false)}
        currentPlan={currentPlan}
        onNavigateToLearn={onNavigateToLearn}
      />

      {/* Tamper-evident notice & Medical disclaimer (D-10 / §2.1) */}
      <footer className="space-y-2">
        <div className="text-center text-[11px] text-stone-700 bg-stone-100 p-2.5 rounded-xl border border-stone-200">
          <p>{t('app.legal_disclaimer')}</p>
        </div>
        <MedicalDisclaimerNote />
      </footer>
    </div>
  );
};
