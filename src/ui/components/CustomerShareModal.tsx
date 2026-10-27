import React, { useState } from 'react';
import { useTranslation } from '../../i18n/useTranslation';
import {
  Droplets,
  Copy,
  Printer,
  X,
  CheckCircle2,
} from 'lucide-react';

interface CustomerShareModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CustomerShareModal: React.FC<CustomerShareModalProps> = ({ isOpen, onClose }) => {
  const { t, language } = useTranslation();
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const currentMessage = t('share.message');

  const handleCopy = async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(currentMessage);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      }
    } catch {
      // ignore
    }
  };

  const handlePrint = () => {
    const printWin = window.open('', '_blank');
    if (!printWin) return;
    printWin.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${t('share.title')}</title>
          <style>
            body { font-family: sans-serif; padding: 24px; text-align: center; max-width: 450px; margin: auto; }
            h2 { font-size: 20px; color: #0284c7; margin-bottom: 12px; }
            p { font-size: 16px; line-height: 1.6; color: #1c1917; margin: 16px 0; }
            .box { border: 2px dashed #0284c7; padding: 20px; border-radius: 12px; background: #f0f9ff; }
            .footer { font-size: 12px; color: #78716c; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="box">
            <h2>💧 ${t('share.title')}</h2>
            <p><strong>${currentMessage}</strong></p>
          </div>
          <p class="footer">Veyil Thunai (வெயில் துணை) — Heat Safety Companion for Outdoor & Gig Workers</p>
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
      aria-labelledby="share-title"
      className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4"
    >
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden border border-sky-200 p-5 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-200 pb-2">
          <div className="flex items-center gap-2 text-sky-600">
            <Droplets className="w-5 h-5 shrink-0" aria-hidden="true" />
            <h2 id="share-title" className="font-bold text-base text-stone-900">
              {t('share.title')}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('share.close')}
            className="min-h-[48px] min-w-[48px] flex items-center justify-center rounded-xl hover:bg-stone-100 text-stone-500"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Message Slip Card */}
        <div className="bg-sky-50 border border-sky-200 rounded-xl p-4 text-center space-y-2">
          <p className="text-sm font-semibold text-stone-900 leading-relaxed">
            "{currentMessage}"
          </p>
          <span className="text-[11px] text-sky-800 font-medium block">
            Language: {language === 'ta' ? 'தமிழ்' : language === 'hi' ? 'हिन्दी' : 'English'}
          </span>
        </div>

        {/* Action Buttons (Touch Targets >= 48px) */}
        <div className="grid grid-cols-2 gap-2.5 pt-1">
          <button
            type="button"
            onClick={handleCopy}
            className="min-h-[48px] px-3 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl shadow-xs flex items-center justify-center gap-2 text-xs transition-colors"
          >
            {copied ? (
              <>
                <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                <span>{t('share.copied')}</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" aria-hidden="true" />
                <span>{t('share.copy')}</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="min-h-[48px] px-3 py-2 bg-white border border-stone-300 hover:bg-stone-50 text-stone-800 font-bold rounded-xl shadow-xs flex items-center justify-center gap-2 text-xs transition-colors"
          >
            <Printer className="w-4 h-4" aria-hidden="true" />
            <span>Print Slip</span>
          </button>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-full min-h-[48px] rounded-xl border border-stone-200 text-stone-600 font-semibold text-xs hover:bg-stone-50"
        >
          {t('share.close')}
        </button>
      </div>
    </div>
  );
};
