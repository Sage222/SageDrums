import { SessionRecord } from '../types/drums';

const SESSIONS_STORAGE_KEY = 'sagedrums_sessions_v1';
const SETTINGS_STORAGE_KEY = 'sagedrums_settings_v1';

export interface UserDrumSettings {
  micThreshold: number;
  latencyOffsetMs: number;
  metronomeVolume: number;
  drumVolume: number;
  lastLessonId: number;
  autoDemoAudio: boolean;
  countInEnabled: boolean;
}

const DEFAULT_SETTINGS: UserDrumSettings = {
  micThreshold: 0.14,
  latencyOffsetMs: 15,
  metronomeVolume: 0.75,
  drumVolume: 0.85,
  lastLessonId: 1,
  autoDemoAudio: false,
  countInEnabled: true,
};

export function loadSessionRecords(): SessionRecord[] {
  try {
    const raw = localStorage.getItem(SESSIONS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveSessionRecord(record: SessionRecord): SessionRecord[] {
  const existing = loadSessionRecords();
  const updated = [...existing, record];
  try {
    localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // Ignore quota errors
  }
  return updated;
}

export function clearAllSessionRecords(): void {
  try {
    localStorage.removeItem(SESSIONS_STORAGE_KEY);
  } catch {
    // Ignore
  }
}

export function loadUserSettings(): UserDrumSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveUserSettings(settings: Partial<UserDrumSettings>): UserDrumSettings {
  const current = loadUserSettings();
  const updated = { ...current, ...settings };
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // Ignore
  }
  return updated;
}

export function getLessonSessions(records: SessionRecord[], lessonId: number): SessionRecord[] {
  return records
    .filter((r) => r.lessonId === lessonId)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
}

export function getLessonBestScore(records: SessionRecord[], lessonId: number): number | null {
  const lessonRecords = records.filter((r) => r.lessonId === lessonId);
  if (lessonRecords.length === 0) return null;
  return Math.max(...lessonRecords.map((r) => r.score));
}

export function getLessonFirstToBestDelta(records: SessionRecord[], lessonId: number): number | null {
  const ordered = getLessonSessions(records, lessonId);
  if (ordered.length < 2) return null;
  const firstScore = ordered[0].score;
  const bestScore = Math.max(...ordered.map((r) => r.score));
  return bestScore - firstScore;
}
