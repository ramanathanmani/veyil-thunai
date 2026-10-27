/**
 * Exposure log storage and shift tracking.
 *
 * Persists append-only LogEntry records into IndexedDB.
 */

import { LogEntry, computeEntryHash } from './chain';
import { Band, WorkloadClass, WorkerState } from '../engine/limits';
import {
  withDbTimeout,
  STORE_LOGS,
} from '../data/db';

const memoryLogs: LogEntry[] = [];

/**
 * Retrieves all log entries sorted by startedAt ascending.
 */
export async function getAllLogEntries(): Promise<LogEntry[]> {
  const fallback = [...memoryLogs].sort(
    (a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime()
  );
  return withDbTimeout(
    async (db) => {
      const entries = await db.getAll(STORE_LOGS);
      return entries.sort(
        (a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime()
      );
    },
    fallback,
    1500
  );
}

/**
 * Retrieves the currently active work shift (if any).
 */
export async function getActiveShift(): Promise<LogEntry | null> {
  const entries = await getAllLogEntries();
  const active = entries.find((e) => e.endedAt === null);
  return active || null;
}

/**
 * Starts a new work shift, linking to the previous entry's hash.
 */
export async function startShift(params: {
  preset: string;
  workload: WorkloadClass;
  workerState: WorkerState;
  lat: number;
  lon: number;
  wbgtC: number;
  band: Band;
  dataQuality: string;
  now?: Date;
}): Promise<LogEntry> {
  const now = params.now || new Date();
  const entries = await getAllLogEntries();
  const prevEntry = entries.length > 0 ? entries[entries.length - 1] : null;
  const prevHash = prevEntry ? prevEntry.hash : '';

  // Generate unique ID
  const id =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : 'shift_' + now.getTime() + '_' + Math.random().toString(36).substring(2, 9);

  const partialEntry: Omit<LogEntry, 'hash'> = {
    id,
    startedAt: now.toISOString(),
    endedAt: null,
    preset: params.preset,
    workload: params.workload,
    workerState: params.workerState,
    placeRounded: {
      lat: Math.round(params.lat * 100) / 100,
      lon: Math.round(params.lon * 100) / 100,
    },
    forecastAtStart: {
      wbgtC: params.wbgtC,
      band: params.band,
      dataQuality: params.dataQuality,
    },
    restBreaks: [],
    incentivePressure: null,
    note: '',
    prevHash,
  };

  const hash = await computeEntryHash(partialEntry);
  const entry: LogEntry = { ...partialEntry, hash };

  memoryLogs.push(entry);

  await withDbTimeout(
    async (db) => {
      await db.put(STORE_LOGS, entry);
    },
    undefined,
    1500
  );

  return entry;
}

/**
 * Records a rest break in the active shift and recomputes the entry hash.
 */
export async function recordRestBreak(
  shiftId: string,
  start: Date,
  end: Date
): Promise<LogEntry> {
  const entries = await getAllLogEntries();
  const entry = entries.find((e) => e.id === shiftId);
  if (!entry) throw new Error(`Shift ${shiftId} not found`);

  entry.restBreaks.push({
    start: start.toISOString(),
    end: end.toISOString(),
  });

  entry.hash = await computeEntryHash(entry);

  await withDbTimeout(
    async (db) => {
      await db.put(STORE_LOGS, entry);
    },
    undefined,
    1500
  );

  return entry;
}

/**
 * Ends a work shift with optional incentive pressure question and notes.
 */
export async function endShift(params: {
  shiftId: string;
  endedAt?: Date;
  incentivePressure?: boolean | null;
  note?: string;
}): Promise<LogEntry> {
  const entries = await getAllLogEntries();
  const entry = entries.find((e) => e.id === params.shiftId);
  if (!entry) throw new Error(`Shift ${params.shiftId} not found`);

  entry.endedAt = (params.endedAt || new Date()).toISOString();
  if (params.incentivePressure !== undefined) {
    entry.incentivePressure = params.incentivePressure;
  }
  if (params.note !== undefined) {
    entry.note = params.note.slice(0, 280);
  }

  entry.hash = await computeEntryHash(entry);

  await withDbTimeout(
    async (db) => {
      await db.put(STORE_LOGS, entry);
    },
    undefined,
    1500
  );

  return entry;
}

/**
 * Records an urgent heat distress pause.
 * Appends a pause note & rest break to the active shift or creates an immediate standalone entry if none active.
 */
export async function recordHeatPause(params?: {
  note?: string;
  lat?: number;
  lon?: number;
  wbgtC?: number;
  band?: Band;
  preset?: string;
  workload?: WorkloadClass;
  workerState?: WorkerState;
  dataQuality?: 'forecast' | 'sample' | 'fallback_simple';
}): Promise<LogEntry> {
  const active = await getActiveShift();
  const pauseNote = params?.note ?? 'Heat distress emergency pause — rested in shade.';

  if (active) {
    const now = new Date();
    const breakStart = new Date(now.getTime() - 15 * 60 * 1000);
    active.restBreaks.push({
      start: breakStart.toISOString(),
      end: now.toISOString(),
    });
    const existingNote = active.note ? `${active.note} | ` : '';
    active.note = `${existingNote}[HEAT PAUSE] ${pauseNote}`.slice(0, 280);
    active.hash = await computeEntryHash(active);

    await withDbTimeout(
      async (db) => {
        await db.put(STORE_LOGS, active);
      },
      undefined,
      1500
    );

    return active;
  }

  // If no active shift, start and immediately end a standalone pause record
  const started = await startShift({
    preset: params?.preset ?? 'custom',
    workload: params?.workload ?? 'moderate',
    workerState: params?.workerState ?? 'acclimatised',
    lat: params?.lat ?? 13.08,
    lon: params?.lon ?? 80.27,
    wbgtC: params?.wbgtC ?? 32.0,
    band: params?.band ?? 'orange',
    dataQuality: params?.dataQuality ?? 'forecast',
  });

  return endShift({
    shiftId: started.id,
    endedAt: new Date(),
    note: `[HEAT PAUSE] ${pauseNote}`,
  });
}

/**
 * Clears in-memory test logs.
 */
export function clearMemoryLogs(): void {
  memoryLogs.length = 0;
}
