/**
 * Exposure log export utilities: JSON, CSV, and printable HTML.
 *
 * Implements Section 8:
 * Includes tamper-evident chain verification result and Section 2 Principle 6 disclaimer.
 */

import { LogEntry, verifyChain } from './chain';

/**
 * Exports entries as a JSON string.
 */
export function exportAsJson(entries: LogEntry[]): string {
  return JSON.stringify(entries, null, 2);
}

/**
 * Exports entries as CSV format.
 */
export function exportAsCsv(entries: LogEntry[]): string {
  const headers = [
    'ID',
    'Started At (ISO)',
    'Ended At (ISO)',
    'Job Preset',
    'Workload',
    'Worker State',
    'Latitude',
    'Longitude',
    'Start WBGT (°C)',
    'Start Band',
    'Data Quality',
    'Rest Breaks Count',
    'Total Rest Minutes',
    'Pushed To Work',
    'Note',
    'Previous Hash',
    'Entry Hash (SHA-256)',
  ];

  const rows = entries.map((e) => {
    let totalRestMin = 0;
    for (const b of e.restBreaks) {
      const dur = (new Date(b.end).getTime() - new Date(b.start).getTime()) / 60000;
      totalRestMin += Math.max(0, dur);
    }

    const escapeCsv = (val: any) => {
      const str = String(val ?? '');
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    return [
      escapeCsv(e.id),
      escapeCsv(e.startedAt),
      escapeCsv(e.endedAt),
      escapeCsv(e.preset),
      escapeCsv(e.workload),
      escapeCsv(e.workerState),
      escapeCsv(e.placeRounded.lat),
      escapeCsv(e.placeRounded.lon),
      escapeCsv(e.forecastAtStart.wbgtC),
      escapeCsv(e.forecastAtStart.band),
      escapeCsv(e.forecastAtStart.dataQuality),
      escapeCsv(e.restBreaks.length),
      escapeCsv(Math.round(totalRestMin)),
      escapeCsv(e.incentivePressure === null ? 'N/A' : e.incentivePressure ? 'Yes' : 'No'),
      escapeCsv(e.note),
      escapeCsv(e.prevHash),
      escapeCsv(e.hash),
    ].join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}

/**
 * Triggers a browser download of a text blob.
 */
export function downloadFile(content: string, fileName: string, mimeType: string): void {
  if (typeof window === 'undefined') return;

  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Generates and opens a printable HTML summary page and invokes window.print().
 */
export async function openPrintSummary(entries: LogEntry[]): Promise<void> {
  if (typeof window === 'undefined') return;

  const brokenIndex = await verifyChain(entries);
  const isChainIntact = brokenIndex === -1;

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Veyil Thunai — Worker Heat Exposure Log Summary</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 24px; color: #1c1917; }
    h1 { color: #ea580c; margin-bottom: 4px; }
    .badge { display: inline-block; padding: 6px 12px; border-radius: 6px; font-weight: bold; margin: 12px 0; }
    .badge-intact { background: #dcfce7; color: #166534; border: 1px solid #86efac; }
    .badge-broken { background: #fee2e2; color: #991b1b; border: 1px solid #fca5a5; }
    .disclaimer { background: #f5f5f4; border-left: 4px solid #ea580c; padding: 12px; margin: 16px 0; font-size: 14px; }
    table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 13px; }
    th, td { border: 1px solid #e7e5e4; padding: 8px; text-align: left; }
    th { background: #f5f5f4; }
    .hash { font-family: monospace; font-size: 11px; color: #57534e; }
    @media print {
      body { padding: 0; }
      button { display: none; }
    }
  </style>
</head>
<body>
  <h1>Veyil Thunai (வெயில் துணை)</h1>
  <p><strong>Worker Heat Exposure Log Summary</strong> | Generated on: ${new Date().toLocaleString('en-IN')}</p>
  
  <div class="badge ${isChainIntact ? 'badge-intact' : 'badge-broken'}">
    ${isChainIntact ? '✓ Cryptographic Hash Chain: VERIFIED INTACT (Tamper-Evident)' : '⚠ WARNING: Hash Chain Link Disrupted at Entry #' + brokenIndex}
  </div>

  <div class="disclaimer">
    <strong>Notice:</strong> This exposure record is an independently maintained, worker-owned digital log protected by a SHA-256 cryptographic hash chain. It records ambient heat risk estimates derived from weather forecasts at the time of work. As noted in project principles: this log is tamper-evident, but is not a statutory legal document by itself.
  </div>

  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>Start / End Time</th>
        <th>Work Type</th>
        <th>WBGT / Band</th>
        <th>Rests</th>
        <th>Pushed?</th>
        <th>Notes</th>
        <th>SHA-256 Hash</th>
      </tr>
    </thead>
    <tbody>
      ${entries
        .map(
          (e, idx) => `
        <tr>
          <td>${idx + 1}</td>
          <td>${new Date(e.startedAt).toLocaleTimeString()} - ${e.endedAt ? new Date(e.endedAt).toLocaleTimeString() : 'Active'}</td>
          <td>${e.preset} (${e.workload})</td>
          <td><strong>${e.forecastAtStart.wbgtC}°C</strong> (${e.forecastAtStart.band})</td>
          <td>${e.restBreaks.length} break(s)</td>
          <td>${e.incentivePressure === null ? '-' : e.incentivePressure ? 'Yes' : 'No'}</td>
          <td>${e.note || '-'}</td>
          <td class="hash">${e.hash.substring(0, 16)}...</td>
        </tr>
      `
        )
        .join('')}
    </tbody>
  </table>

  <script>
    window.onload = function() { window.print(); }
  </script>
</body>
</html>`;

  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
  }
}

/**
 * Generates and opens a printable Union Weekly Summary page (Priority 3 Item 9)
 * containing 7-day collective metrics, hash chain verification, and legal disclaimer.
 */
export async function openPrintUnionSummary(entries: LogEntry[]): Promise<void> {
  if (typeof window === 'undefined') return;

  const nowMs = Date.now();
  const sevenDaysAgoMs = nowMs - 7 * 24 * 60 * 60 * 1000;
  const recentEntries = entries.filter((e) => new Date(e.startedAt).getTime() >= sevenDaysAgoMs);

  const entriesToUse = recentEntries.length > 0 ? recentEntries : entries;
  const brokenIndex = await verifyChain(entries);
  const isChainIntact = brokenIndex === -1;

  let totalRedBlackMs = 0;
  let totalRestCount = 0;
  let pressureCount = 0;

  for (const e of entriesToUse) {
    if (e.forecastAtStart.band === 'red' || e.forecastAtStart.band === 'black') {
      const endMs = e.endedAt ? new Date(e.endedAt).getTime() : nowMs;
      const startMs = new Date(e.startedAt).getTime();
      totalRedBlackMs += Math.max(0, endMs - startMs);
    }
    totalRestCount += e.restBreaks.length;
    if (e.incentivePressure === true) {
      pressureCount++;
    }
  }

  const redBlackHours = (totalRedBlackMs / (1000 * 60 * 60)).toFixed(1);

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Veyil Thunai — Union Weekly Exposure Summary</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 28px; color: #1c1917; max-width: 800px; margin: 0 auto; }
    h1 { color: #c2410c; margin-bottom: 2px; font-size: 22px; }
    h2 { font-size: 16px; margin-top: 20px; border-bottom: 2px solid #e7e5e4; padding-bottom: 6px; }
    .badge { display: inline-block; padding: 6px 12px; border-radius: 6px; font-weight: bold; margin: 12px 0; font-size: 12px; }
    .badge-intact { background: #dcfce7; color: #166534; border: 1px solid #86efac; }
    .badge-broken { background: #fee2e2; color: #991b1b; border: 1px solid #fca5a5; }
    .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin: 16px 0; }
    .stat-card { background: #fafaf9; border: 1px solid #e7e5e4; border-radius: 8px; padding: 12px; text-align: center; }
    .stat-val { font-size: 22px; font-weight: 800; color: #0c0a09; display: block; }
    .stat-lbl { font-size: 11px; color: #57534e; font-weight: 600; text-transform: uppercase; }
    .declaration { background: #fff7ed; border-left: 4px solid #ea580c; padding: 12px; margin: 20px 0; font-size: 12px; line-height: 1.5; color: #7c2d12; }
    table { width: 100%; border-collapse: collapse; margin-top: 14px; font-size: 12px; }
    th, td { border: 1px solid #e7e5e4; padding: 8px; text-align: left; }
    th { background: #f5f5f4; font-size: 11px; text-transform: uppercase; }
    .hash { font-family: monospace; font-size: 10px; color: #57534e; }
    @media print {
      body { padding: 0; }
      button { display: none; }
    }
  </style>
</head>
<body>
  <h1>Veyil Thunai (வெயில் துணை)</h1>
  <p style="font-size: 13px; color: #44403c; margin-top: 0;">
    <strong>Union Weekly Heat Exposure Summary</strong> | Period: Last 7 Days (Generated: ${new Date().toLocaleString('en-IN')})
  </p>

  <div class="badge ${isChainIntact ? 'badge-intact' : 'badge-broken'}">
    ${isChainIntact ? '✓ Cryptographic SHA-256 Hash Chain: VERIFIED INTACT' : '⚠ WARNING: Hash Chain Link Disrupted at Entry #' + brokenIndex}
  </div>

  <div class="grid">
    <div class="stat-card">
      <span class="stat-val">${entriesToUse.length}</span>
      <span class="stat-lbl">Shifts Logged</span>
    </div>
    <div class="stat-card">
      <span class="stat-val" style="color: #b91c1c;">${redBlackHours}h</span>
      <span class="stat-lbl">Red / Extreme Risk Hours</span>
    </div>
    <div class="stat-card">
      <span class="stat-val">${pressureCount}</span>
      <span class="stat-lbl">Incentive Pressure Shifts</span>
    </div>
  </div>

  <div class="declaration">
    <strong>Worker Declaration & Collective Legal Notice:</strong><br>
    Worker-generated tamper-evident log for collective welfare representation. It is not a statutory legal document by itself. All environmental indices are ambient estimates derived from open forecasts at the time of work.
  </div>

  <h2>Logged Shifts Breakdown (${entriesToUse.length})</h2>
  <table>
    <thead>
      <tr>
        <th>Date & Time</th>
        <th>Work Type</th>
        <th>WBGT / Band</th>
        <th>Rests</th>
        <th>Pushed?</th>
        <th>Notes</th>
        <th>Chain SHA-256</th>
      </tr>
    </thead>
    <tbody>
      ${entriesToUse
        .map(
          (e) => `
        <tr>
          <td>${new Date(e.startedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })} ${new Date(e.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${e.endedAt ? new Date(e.endedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Active'}</td>
          <td>${e.preset}</td>
          <td><strong>${e.forecastAtStart.wbgtC}°C</strong> (${e.forecastAtStart.band})</td>
          <td>${e.restBreaks.length} break(s)</td>
          <td>${e.incentivePressure === null ? '-' : e.incentivePressure ? 'Yes' : 'No'}</td>
          <td>${e.note || '-'}</td>
          <td class="hash">${e.hash.substring(0, 12)}...</td>
        </tr>
      `
        )
        .join('')}
    </tbody>
  </table>

  <script>
    window.onload = function() { window.print(); }
  </script>
</body>
</html>`;

  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
  }
}
