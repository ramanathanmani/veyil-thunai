import React, { useState } from 'react';
import { useTranslation } from '../../i18n/useTranslation';
import coolSpotsData from '../../data/chennai-cool-spots.json';
import {
  MapPin,
  Droplets,
  Sun,
  Coffee,
  X,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';

interface CoolSpotsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type FilterType = 'all' | 'water' | 'shade' | 'rest_point' | 'toilet';

export const CoolSpotsModal: React.FC<CoolSpotsModalProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');

  if (!isOpen) return null;

  const filteredSpots = coolSpotsData.spots.filter((spot) => {
    if (activeFilter === 'all') return true;
    return spot.type === activeFilter;
  });

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'water':
        return <Droplets className="w-4 h-4 text-sky-600" aria-hidden="true" />;
      case 'shade':
        return <Sun className="w-4 h-4 text-amber-600" aria-hidden="true" />;
      case 'rest_point':
        return <Coffee className="w-4 h-4 text-emerald-600" aria-hidden="true" />;
      case 'toilet':
        return <CheckCircle2 className="w-4 h-4 text-indigo-600" aria-hidden="true" />;
      default:
        return <MapPin className="w-4 h-4 text-stone-600" aria-hidden="true" />;
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="cool-spots-title"
      className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4"
    >
      <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-stone-200">
        {/* Header */}
        <div className="p-4 border-b border-stone-200 flex items-center justify-between bg-stone-50">
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-orange-600" aria-hidden="true" />
            <div>
              <h2 id="cool-spots-title" className="font-bold text-base text-stone-900">
                {t('cool_spots.title')}
              </h2>
              <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                {t('cool_spots.badge')}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('cool_spots.close')}
            className="min-h-[48px] min-w-[48px] flex items-center justify-center rounded-xl hover:bg-stone-200 text-stone-600 transition-colors"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Disclaimer Strip */}
        <div className="px-4 py-2 bg-amber-50 border-b border-amber-200 text-[11px] text-amber-950 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" aria-hidden="true" />
          <span>{t('cool_spots.disclaimer')}</span>
        </div>

        {/* Filter Tabs (Touch Targets >= 48px) */}
        <div className="px-3 py-2 border-b border-stone-200 overflow-x-auto flex gap-1.5 scrollbar-thin bg-white shrink-0">
          {[
            { id: 'all' as FilterType, label: t('cool_spots.filter_all') },
            { id: 'water' as FilterType, label: t('cool_spots.filter_water') },
            { id: 'shade' as FilterType, label: t('cool_spots.filter_shade') },
            { id: 'rest_point' as FilterType, label: t('cool_spots.filter_rest') },
            { id: 'toilet' as FilterType, label: t('cool_spots.filter_toilet') },
          ].map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setActiveFilter(f.id)}
              className={`min-h-[48px] px-3.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border ${
                activeFilter === f.id
                  ? 'bg-orange-600 text-white border-orange-700 shadow-xs'
                  : 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Spot List */}
        <div className="p-4 space-y-3 overflow-y-auto flex-1 divide-y divide-stone-100">
          {filteredSpots.map((spot) => (
            <article key={spot.id} className="pt-3 first:pt-0 space-y-1 text-xs">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  {getTypeIcon(spot.type)}
                  <h3 className="font-bold text-stone-900 text-sm">{spot.name}</h3>
                </div>
                <span className="shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-stone-100 text-stone-700 border border-stone-200">
                  {spot.area}
                </span>
              </div>
              <p className="text-stone-700 font-medium">{spot.landmark}</p>
              <p className="text-stone-700 leading-snug">{spot.notes}</p>
              <div className="flex items-center gap-3 pt-0.5 text-[10px] text-stone-700">
                <span>📍 {spot.address}</span>
                {spot.hasToilet && <span className="font-semibold text-emerald-700">✓ Toilet Available</span>}
              </div>
            </article>
          ))}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-stone-200 bg-stone-50 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="w-full min-h-[48px] px-4 rounded-xl bg-stone-800 hover:bg-stone-900 text-white font-semibold text-sm transition-colors"
          >
            {t('cool_spots.close')}
          </button>
        </div>
      </div>
    </div>
  );
};
