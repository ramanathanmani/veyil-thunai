import React, { useState } from 'react';
import { useTranslation } from '../../i18n/useTranslation';
import { HourPlan } from '../../engine/plan';
import { recordHeatPause } from '../../log/store';
import {
  PhoneCall,
  AlertOctagon,
  X,
  FileCheck2,
  Printer,
  HeartPulse,
} from 'lucide-react';

interface HeatPauseModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPlan?: HourPlan;
  onRecordPause?: () => Promise<void>;
  onNavigateToLearn?: () => void;
}

export const HeatPauseModal: React.FC<HeatPauseModalProps> = ({
  isOpen,
  onClose,
  currentPlan,
  onRecordPause,
  onNavigateToLearn,
}) => {
  const { t } = useTranslation();
  const [recorded, setRecorded] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleRecord = async () => {
    setIsSubmitting(true);
    try {
      if (onRecordPause) {
        await onRecordPause();
      } else {
        await recordHeatPause({
          wbgtC: currentPlan?.wbgtC,
          band: currentPlan?.band,
        });
      }
      setRecorded(true);
    } catch (err) {
      console.warn('Failed to record heat pause:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePrintSlip = () => {
    const printWin = window.open('', '_blank');
    if (!printWin) return;
    const nowStr = new Date().toLocaleString();
    printWin.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${t('sos.slip_title')}</title>
          <style>
            body { font-family: sans-serif; padding: 24px; max-width: 500px; margin: auto; }
            h1 { font-size: 18px; color: #dc2626; border-bottom: 2px solid #dc2626; padding-bottom: 8px; }
            p { font-size: 14px; line-height: 1.5; color: #1c1917; }
            .badge { background: #fee2e2; color: #991b1b; padding: 4px 8px; border-radius: 4px; font-weight: bold; }
            .box { border: 1px solid #d6d3d1; padding: 12px; border-radius: 8px; background: #fafaf9; margin: 16px 0; }
            .footer { font-size: 11px; color: #78716c; margin-top: 24px; }
          </style>
        </head>
        <body>
          <h1>⚠️ ${t('sos.slip_title')}</h1>
          <p><span class="badge">HEAT DISTRESS PAUSE</span></p>
          <div class="box">
            <p><strong>Timestamp:</strong> ${nowStr}</p>
            ${currentPlan ? `<p><strong>Environmental Conditions:</strong> WBGT ${currentPlan.wbgtC.toFixed(1)}°C (${currentPlan.band.toUpperCase()} band)</p>` : ''}
            <p><strong>Status:</strong> Worker temporarily halted strenuous outdoor activity due to severe environmental heat distress symptoms (dizziness/exhaustion).</p>
            <p><strong>Recommended Action:</strong> Immediate rest in cool shade, active hydration with water and ORS electrolytes.</p>
          </div>
          <p class="footer">Self-generated worker heat-safety pause record via Veyil Thunai PWA. Not statutory medical proof or platform order cancellation.</p>
        </body>
      </html>
    `);
    printWin.document.close();
    printWin.focus();
    setTimeout(() => {
      printWin.print();
      printWin.close();
    }, 300);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="sos-title"
      className="fixed inset-0 z-50 bg-stone-900/70 backdrop-blur-xs flex items-center justify-center p-4"
    >
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden border border-rose-300 space-y-4 p-5">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2 text-rose-700">
            <AlertOctagon className="w-6 h-6 shrink-0 animate-bounce" aria-hidden="true" />
            <div>
              <h2 id="sos-title" className="font-black text-lg text-stone-950">
                {t('sos.title')}
              </h2>
              <span className="text-xs font-bold text-rose-700">Emergency & Distress Support</span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('sos.close')}
            className="min-h-[48px] min-w-[48px] flex items-center justify-center rounded-xl hover:bg-stone-100 text-stone-500"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        <p className="text-xs text-stone-700 leading-relaxed font-medium">
          {t('sos.desc')}
        </p>

        {/* Emergency Call Buttons (Touch Targets >= 48px) */}
        <div className="grid grid-cols-2 gap-2.5">
          <a
            href="tel:112"
            className="min-h-[48px] px-3 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-xs flex items-center justify-center gap-2 text-sm transition-colors"
          >
            <PhoneCall className="w-4 h-4" aria-hidden="true" />
            <span>Call 112 (National)</span>
          </a>
          <a
            href="tel:108"
            className="min-h-[48px] px-3 py-2 bg-rose-700 hover:bg-rose-800 text-white font-bold rounded-xl shadow-xs flex items-center justify-center gap-2 text-sm transition-colors"
          >
            <PhoneCall className="w-4 h-4" aria-hidden="true" />
            <span>Call 108 (Ambulance)</span>
          </a>
        </div>

        {/* First Aid Guidance Pointer */}
        {onNavigateToLearn && (
          <button
            type="button"
            onClick={() => {
              onClose();
              onNavigateToLearn();
            }}
            className="w-full min-h-[48px] px-3 rounded-xl border border-stone-300 hover:bg-stone-50 text-stone-800 font-semibold text-xs flex items-center justify-center gap-2"
          >
            <HeartPulse className="w-4 h-4 text-orange-600" aria-hidden="true" />
            <span>View Heat Illness First Aid (S6)</span>
          </button>
        )}

        {/* Record on Hash Chain */}
        <div className="pt-2 border-t border-stone-200 space-y-2">
          {recorded ? (
            <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl flex items-center gap-2 text-xs text-emerald-950 font-semibold">
              <FileCheck2 className="w-4 h-4 text-emerald-600 shrink-0" aria-hidden="true" />
              <span>{t('sos.pause_recorded')}</span>
            </div>
          ) : (
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleRecord}
              className="w-full min-h-[48px] px-3 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors"
            >
              <FileCheck2 className="w-4 h-4" aria-hidden="true" />
              <span>{isSubmitting ? 'Recording...' : t('sos.record_pause')}</span>
            </button>
          )}

          <button
            type="button"
            onClick={handlePrintSlip}
            className="w-full min-h-[48px] px-3 rounded-xl border border-stone-300 hover:bg-stone-50 text-stone-700 font-semibold text-xs flex items-center justify-center gap-2"
          >
            <Printer className="w-4 h-4" aria-hidden="true" />
            <span>Print Heat Pause Slip for Supervisor</span>
          </button>
        </div>

        {/* Disclaimer Note */}
        <p className="text-[11px] text-stone-700 text-center leading-tight">
          {t('sos.disclaimer')}
        </p>
      </div>
    </div>
  );
};
