import React, { useState } from 'react';
import { useTranslation } from '../../i18n/useTranslation';
import {
  AlertOctagon,
  PhoneCall,
  CheckCircle2,
  X,
  RotateCcw,
} from 'lucide-react';

interface HeatStrokeTriageModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HeatStrokeTriageModal: React.FC<HeatStrokeTriageModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { t } = useTranslation();
  const [checkedSymptoms, setCheckedSymptoms] = useState<Record<string, boolean>>({
    q1: false,
    q2: false,
    q3: false,
    q4: false,
    q5: false,
  });

  if (!isOpen) return null;

  const toggleSymptom = (key: string) => {
    setCheckedSymptoms((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const hasAnySymptom = Object.values(checkedSymptoms).some(Boolean);

  const handleReset = () => {
    setCheckedSymptoms({
      q1: false,
      q2: false,
      q3: false,
      q4: false,
      q5: false,
    });
  };

  const questions = [
    { key: 'q1', text: t('s6.triage_q1') },
    { key: 'q2', text: t('s6.triage_q2') },
    { key: 'q3', text: t('s6.triage_q3') },
    { key: 'q4', text: t('s6.triage_q4') },
    { key: 'q5', text: t('s6.triage_q5') },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="triage-title"
      className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
    >
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden border border-stone-200 flex flex-col my-auto max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b border-stone-200 flex items-center justify-between bg-rose-50">
          <div className="flex items-center gap-2">
            <AlertOctagon className="w-5 h-5 text-rose-600" aria-hidden="true" />
            <h2 id="triage-title" className="font-bold text-base text-rose-950">
              {t('s6.triage_title')}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('s6.triage_close')}
            className="min-h-[48px] min-w-[48px] flex items-center justify-center rounded-xl hover:bg-rose-100 text-stone-600 transition-colors"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4 overflow-y-auto flex-1">
          <p className="text-xs text-stone-700 font-medium leading-relaxed">
            {t('s6.triage_subtitle')}
          </p>

          {/* Checklist */}
          <div className="space-y-2">
            {questions.map((q) => {
              const isChecked = checkedSymptoms[q.key];
              return (
                <label
                  key={q.key}
                  className={`min-h-[48px] p-3 rounded-xl border flex items-center gap-3 cursor-pointer transition-all ${
                    isChecked
                      ? 'bg-rose-50 border-rose-400 text-rose-950 shadow-xs'
                      : 'bg-stone-50 border-stone-200 text-stone-800 hover:bg-stone-100'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggleSymptom(q.key)}
                    className="w-5 h-5 text-rose-600 rounded-md focus:ring-rose-500 border-stone-300 shrink-0"
                  />
                  <span className="text-xs font-semibold leading-snug">{q.text}</span>
                </label>
              );
            })}
          </div>

          {/* Dynamic Result Banner */}
          {hasAnySymptom ? (
            <div className="bg-rose-600 text-white p-4 rounded-xl space-y-3 animate-pulse shadow-md">
              <div className="flex items-start gap-2.5">
                <AlertOctagon className="w-6 h-6 shrink-0 mt-0.5 text-white" aria-hidden="true" />
                <p className="text-xs font-bold leading-relaxed">
                  {t('s6.triage_danger')}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <a
                  href="tel:108"
                  className="min-h-[48px] bg-white text-rose-700 font-black rounded-xl flex items-center justify-center gap-2 text-sm shadow-xs hover:bg-rose-50"
                >
                  <PhoneCall className="w-4 h-4" aria-hidden="true" />
                  <span>{t('s6.call_108')}</span>
                </a>
                <a
                  href="tel:112"
                  className="min-h-[48px] bg-rose-800 text-white font-black rounded-xl border border-rose-500 flex items-center justify-center gap-2 text-sm shadow-xs hover:bg-rose-900"
                >
                  <PhoneCall className="w-4 h-4" aria-hidden="true" />
                  <span>{t('s6.call_112')}</span>
                </a>
              </div>
            </div>
          ) : (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-950 p-3.5 rounded-xl flex items-start gap-2.5 text-xs font-medium">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" aria-hidden="true" />
              <p className="leading-relaxed">{t('s6.triage_safe')}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-stone-200 bg-stone-50 flex items-center gap-2">
          <button
            type="button"
            onClick={handleReset}
            className="min-h-[48px] px-3.5 rounded-xl border border-stone-300 text-stone-700 hover:bg-stone-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{t('s6.triage_reset')}</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 min-h-[48px] px-4 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-semibold text-xs transition-colors"
          >
            {t('s6.triage_close')}
          </button>
        </div>
      </div>
    </div>
  );
};
