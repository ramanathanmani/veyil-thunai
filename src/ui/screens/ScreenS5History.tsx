import React, { useState, useEffect } from 'react';
import { useTranslation } from '../../i18n/useTranslation';
import { LogEntry, verifyChain } from '../../log/chain';
import { getAllLogEntries } from '../../log/store';
import {
  exportAsJson,
  exportAsCsv,
  downloadFile,
  openPrintSummary,
  openPrintUnionSummary,
} from '../../log/export';
import {
  ShieldCheck,
  ShieldAlert,
  Printer,
  FileSpreadsheet,
  FileText,
  Users,
  Droplets,
  X,
} from 'lucide-react';
import { MedicalDisclaimerNote } from '../components/PrototypeBanner';
import { CustomerShareModal } from '../components/CustomerShareModal';

export const ScreenS5History: React.FC = () => {
  const { t } = useTranslation();
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [chainStatus, setChainStatus] = useState<number>(-1);
  const [isUnionModalOpen, setIsUnionModalOpen] = useState<boolean>(false);
  const [isCustomerShareOpen, setIsCustomerShareOpen] = useState<boolean>(false);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const logs = await getAllLogEntries();
      setEntries(logs);
      const brokenIndex = await verifyChain(logs);
      setChainStatus(brokenIndex);
    } catch (err) {
      console.warn('Failed to load history:', err);
    }
  };

  const handleExportJson = () => {
    const jsonStr = exportAsJson(entries);
    downloadFile(
      jsonStr,
      `veyil_thunai_log_${new Date().toISOString().slice(0, 10)}.json`,
      'application/json'
    );
  };

  const handleExportCsv = () => {
    const csvStr = exportAsCsv(entries);
    downloadFile(
      csvStr,
      `veyil_thunai_log_${new Date().toISOString().slice(0, 10)}.csv`,
      'text/csv'
    );
  };

  const handlePrint = () => {
    openPrintSummary(entries);
  };

  const sevenDaysAgoMs = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const weeklyEntries = entries.filter((e) => new Date(e.startedAt).getTime() >= sevenDaysAgoMs);
  const weeklyOrAll = weeklyEntries.length > 0 ? weeklyEntries : entries;

  let totalRedBlackMs = 0;
  let weeklyPressureCount = 0;
  for (const e of weeklyOrAll) {
    if (e.forecastAtStart.band === 'red' || e.forecastAtStart.band === 'black') {
      const endMs = e.endedAt ? new Date(e.endedAt).getTime() : Date.now();
      const startMs = new Date(e.startedAt).getTime();
      totalRedBlackMs += Math.max(0, endMs - startMs);
    }
    if (e.incentivePressure === true) {
      weeklyPressureCount++;
    }
  }
  const weeklyRedHours = (totalRedBlackMs / (1000 * 60 * 60)).toFixed(1);

  return (
    <div className="w-full max-w-md mx-auto px-4 py-4 space-y-4">
      <header className="space-y-1">
        <h1 className="text-xl font-bold text-stone-900">
          {t('s5.title')}
        </h1>
        <p className="text-xs text-stone-600">
          Worker-owned tamper-evident history stored on your device only.
        </p>
      </header>

      {/* Verification Status Badge */}
      <section aria-label="Cryptographic verification status">
        {chainStatus === -1 ? (
          <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-3.5 flex items-center gap-3 text-emerald-950 font-semibold text-xs shadow-xs">
            <ShieldCheck className="w-6 h-6 text-emerald-600 shrink-0" aria-hidden="true" />
            <div>
              <p className="font-bold text-emerald-900">{t('s5.badge_verified')}</p>
              <p className="text-[11px] text-emerald-700 font-normal">
                All {entries.length} shift hashes match cryptographic SHA-256 chain links.
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-rose-50 border border-rose-300 rounded-xl p-3.5 flex items-center gap-3 text-rose-950 font-semibold text-xs shadow-xs">
            <ShieldAlert className="w-6 h-6 text-rose-600 shrink-0" aria-hidden="true" />
            <div>
              <p className="font-bold text-rose-900">{t('s5.badge_broken')}</p>
              <p className="text-[11px] text-rose-700 font-normal">
                Discontinuity detected starting at record #{chainStatus + 1}.
              </p>
            </div>
          </div>
        )}
      </section>

      {/* Export Action Buttons (Min 48px Touch Targets) */}
      <section aria-label="Export options" className="grid grid-cols-3 gap-2">
        <button
          type="button"
          disabled={entries.length === 0}
          onClick={handleExportJson}
          className="min-h-[48px] p-2 rounded-xl bg-white border border-stone-300 hover:border-orange-500 text-stone-800 text-xs font-semibold flex flex-col items-center justify-center gap-1 shadow-xs disabled:opacity-50"
        >
          <FileText className="w-4 h-4 text-orange-600" aria-hidden="true" />
          <span>{t('s5.export_json')}</span>
        </button>

        <button
          type="button"
          disabled={entries.length === 0}
          onClick={handleExportCsv}
          className="min-h-[48px] p-2 rounded-xl bg-white border border-stone-300 hover:border-orange-500 text-stone-800 text-xs font-semibold flex flex-col items-center justify-center gap-1 shadow-xs disabled:opacity-50"
        >
          <FileSpreadsheet className="w-4 h-4 text-emerald-600" aria-hidden="true" />
          <span>{t('s5.export_csv')}</span>
        </button>

        <button
          type="button"
          disabled={entries.length === 0}
          onClick={handlePrint}
          className="min-h-[48px] p-2 rounded-xl bg-white border border-stone-300 hover:border-orange-500 text-stone-800 text-xs font-semibold flex flex-col items-center justify-center gap-1 shadow-xs disabled:opacity-50"
        >
          <Printer className="w-4 h-4 text-stone-700" aria-hidden="true" />
          <span>{t('s5.print_summary')}</span>
        </button>
      </section>

      {/* Priority 3 Item 9: Union Weekly Pack & Priority 2 Item 7: Customer Slip */}
      <section aria-label="Collective and worker representation" className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setIsUnionModalOpen(true)}
          className="min-h-[48px] px-3 py-2 bg-orange-50 hover:bg-orange-100 border border-orange-300 text-orange-950 font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-xs transition-colors"
        >
          <Users className="w-4 h-4 text-orange-600 shrink-0" aria-hidden="true" />
          <span>{t('s5.union_summary_button')}</span>
        </button>

        <button
          type="button"
          onClick={() => setIsCustomerShareOpen(true)}
          className="min-h-[48px] px-3 py-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-950 font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-xs transition-colors"
        >
          <Droplets className="w-4 h-4 text-emerald-600 shrink-0" aria-hidden="true" />
          <span>{t('share.button')}</span>
        </button>
      </section>

      {/* Entry List */}
      <section aria-label="List of logged work shifts" className="space-y-2.5">
        <h2 className="text-xs uppercase font-bold text-stone-700 tracking-wider">
          Recorded Shifts ({entries.length})
        </h2>

        {entries.length === 0 ? (
          <div className="bg-white rounded-xl p-6 border border-stone-200 text-center text-xs text-stone-700">
            {t('s5.no_entries')}
          </div>
        ) : (
          entries.map((entry) => (
            <article
              key={entry.id}
              className="bg-white rounded-xl p-3.5 border border-stone-200 shadow-xs space-y-2 text-xs"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="font-bold text-stone-900 block">
                    {new Date(entry.startedAt).toLocaleDateString([], {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                  <span className="text-[11px] text-stone-700">
                    {new Date(entry.startedAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}{' '}
                    -{' '}
                    {entry.endedAt
                      ? new Date(entry.endedAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : 'Active'}
                  </span>
                </div>

                <div className="text-right">
                  <span className="font-bold text-orange-600 block">
                    WBGT {entry.forecastAtStart.wbgtC}°C
                  </span>
                  <span className="text-[10px] uppercase font-semibold text-stone-700">
                    {entry.forecastAtStart.band} band
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px] bg-stone-50 p-2 rounded-lg text-stone-700">
                <div>
                  <span className="text-stone-700 block">Work Type</span>
                  <span className="font-semibold text-stone-800">{entry.preset}</span>
                </div>
                <div>
                  <span className="text-stone-700 block">Rest Breaks</span>
                  <span className="font-semibold text-stone-800">
                    {entry.restBreaks.length} break(s)
                  </span>
                </div>
              </div>

              {entry.incentivePressure !== null && (
                <p className="text-[11px] text-stone-600">
                  <span className="font-semibold">Pressure felt:</span>{' '}
                  {entry.incentivePressure ? 'Yes, pushed to work' : 'No'}
                </p>
              )}

              {entry.note && (
                <p className="text-[11px] text-stone-600 italic">
                  "{entry.note}"
                </p>
              )}

              <div className="text-[10px] font-mono text-stone-700 border-t border-stone-100 pt-1.5 flex items-center justify-between">
                <span>SHA-256:</span>
                <span className="truncate max-w-[180px]">{entry.hash}</span>
              </div>
            </article>
          ))
        )}
      </section>

      {/* Legal & Privacy Disclaimer Note + Medical Disclaimer (D-10) */}
      <footer className="space-y-2">
        <div className="text-center text-[11px] text-stone-700 bg-stone-100 p-2.5 rounded-xl border border-stone-200">
          <p>{t('app.legal_disclaimer')}</p>
        </div>
        <MedicalDisclaimerNote />
      </footer>

      {/* Union Summary Modal */}
      {isUnionModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="union-summary-modal-title"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
        >
          <div className="bg-white w-full max-w-md rounded-2xl p-5 shadow-2xl border border-stone-200 space-y-4 max-h-[90vh] overflow-y-auto text-left">
            <div className="flex items-start justify-between">
              <div>
                <h2 id="union-summary-modal-title" className="font-black text-stone-900 text-base">
                  {t('s5.union_summary_title')}
                </h2>
                <p className="text-xs text-stone-600">
                  7-Day worker collective representation rollup
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsUnionModalOpen(false)}
                className="p-2 text-stone-400 hover:text-stone-700 min-h-[48px] min-w-[48px] flex items-center justify-center rounded-lg"
                aria-label="Close"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>

            {/* Metrics */}
            <div className="space-y-2.5 bg-stone-50 p-3.5 rounded-xl border border-stone-200 text-xs text-stone-800">
              <p className="font-semibold text-stone-900">
                {t('s5.union_shifts_count', { count: weeklyOrAll.length })}
              </p>
              <p className="font-bold text-rose-700">
                {t('s5.union_red_hours', { hours: weeklyRedHours })}
              </p>
              <p className="font-semibold text-stone-900">
                {t('s5.union_pressure_count', { count: weeklyPressureCount })}
              </p>
              <div className="pt-1.5 border-t border-stone-200 text-[11px] text-stone-600">
                Chain integrity: {chainStatus === -1 ? 'Verified Intact' : 'Discontinuity detected'}
              </div>
            </div>

            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-[11px] text-amber-900 leading-snug">
              <p className="font-medium">{t('s5.union_declaration')}</p>
            </div>

            <div className="flex flex-col gap-2 pt-1">
              <button
                type="button"
                disabled={entries.length === 0}
                onClick={() => openPrintUnionSummary(entries)}
                className="w-full min-h-[48px] bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-xs transition-colors"
              >
                <Printer className="w-4 h-4" aria-hidden="true" />
                <span>Print Weekly Exposure Page</span>
              </button>
              <button
                type="button"
                onClick={() => setIsUnionModalOpen(false)}
                className="w-full min-h-[48px] bg-stone-100 hover:bg-stone-200 text-stone-800 font-semibold text-xs rounded-xl flex items-center justify-center transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Customer Share Modal */}
      <CustomerShareModal
        isOpen={isCustomerShareOpen}
        onClose={() => setIsCustomerShareOpen(false)}
      />
    </div>
  );
};
