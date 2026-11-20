export type DrumPadId =
  | 'crash'
  | 'ride'
  | 'hihat'
  | 'hihat_open'
  | 'hihat_pedal'
  | 'tom1'
  | 'tom2'
  | 'tom3'
  | 'snare'
  | 'snare_rim'
  | 'snare_cross'
  | 'kick';

export type LimbId = 'R' | 'L' | 'RF' | 'LF';

export interface DrumPadConfig {
  id: DrumPadId;
  name: string;
  shortLabel: string;
  yamahaModel: string;
  zoneDescription: string;
  keyShortcut: string;
  midiNotes: number[];
  defaultLimb: LimbId;
  color: string;
  strokeColor: string;
}

export interface LessonStepEvent {
  stepIndex: number; // 0-indexed subdivision step within the pattern loop
  pads: DrumPadId[];
  sticking?: string; // e.g., "R", "L", "R+RF", "LF"
  accent?: boolean;
  label?: string; // e.g., "1", "e", "&", "a"
}

export type TierId = 1 | 2 | 3 | 4 | 5;

export interface Lesson {
  id: number;
  title: string;
  tier: TierId;
  tierName: string;
  subtitle: string;
  bpm: number;
  minBpm: number;
  maxBpm: number;
  timeSignature: '4/4' | '3/4' | '6/8' | '12/8' | '5/4' | '7/8';
  stepsPerBar: number; // e.g. 8 for 8th notes in 4/4, 16 for 16th notes in 4/4, 12 for 12/8
  subdivisionLabel: string; // e.g. "8th Notes", "16th Notes", "Triplets"
  barsToComplete: number; // Number of bars in a scored evaluation session
  dtxKitPreset: string; // Recommended Yamaha DTX452K module kit
  focusPads: DrumPadId[];
  coachingSteps: string[];
  dtxHardwareTip: string;
  pattern: LessonStepEvent[];
}

export type HitAccuracyRating = 'PERFECT' | 'GOOD' | 'EARLY' | 'LATE' | 'MISSED';

export interface EvaluatedStepHit {
  barNumber: number;
  stepIndex: number;
  expectedTimeMs: number;
  actualTimeMs?: number;
  offsetMs?: number; // negative = early, positive = late
  rating: HitAccuracyRating;
  expectedPads: DrumPadId[];
  peakAmplitude?: number;
}

export interface SessionRecord {
  id: string;
  lessonId: number;
  lessonTitle: string;
  timestamp: string; // ISO string
  bpm: number;
  score: number; // 0 - 100 integer
  perfectCount: number;
  goodCount: number;
  earlyCount: number;
  lateCount: number;
  missedCount: number;
  totalTargetSteps: number;
  avgOffsetMs: number; // signed average offset in ms
  avgAbsOffsetMs: number; // unsigned precision in ms
  consistencyJitterMs: number; // standard deviation of timing offsets
}
