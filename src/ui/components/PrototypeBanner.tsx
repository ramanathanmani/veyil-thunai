import React from 'react';
import { useTranslation } from '../../i18n/useTranslation';
import { AlertTriangle, Info } from 'lucide-react';

export const PrototypeBanner: React.FC = () => {
  const { t } = useTranslation();

  return (
    <aside aria-label="Prototype Notice" className="bg-amber-500 text-stone-950 px-3 py-2 text-xs font-semibold border-b border-amber-600 shadow-sm">
      <div className="max-w-md mx-auto flex items-start gap-2">
        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-stone-950" aria-hidden="true" />
        <p className="leading-tight">
          {t('app.prototype_banner')}
        </p>
      </div>
    </aside>
  );
};

export const MedicalDisclaimerNote: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="flex items-center gap-1.5 text-xs text-stone-700 mt-2 px-1">
      <Info className="w-3.5 h-3.5 shrink-0 text-stone-600" aria-hidden="true" />
      <span>{t('app.medical_disclaimer')}</span>
    </div>
  );
};
