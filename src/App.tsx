/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LESSONS } from './data/lessons';
import { TIER_1_SONGS } from './data/songs';
import { YAMAHA_DTX452K_PADS } from './data/dtx452kConfig';
import {
  DrumPadId,
  EvaluatedStepHit,
  HitAccuracyRating,
  Lesson,
  SessionRecord,
} from './types/drums';
import { audioEngine } from './utils/audioEngine';
import {
  clearAllSessionRecords,
  getLessonBestScore,
  getLessonSessions,
  loadSessionRecords,
  loadUserSettings,
  saveSessionRecord,
  saveUserSettings,
} from './utils/storage';
import { YamahaDTX452KKit } from './components/YamahaDTX452KKit';
import { WaveTrackerCanvas } from './components/WaveTrackerCanvas';
import { LessonNotationDeck } from './components/LessonNotationDeck';
import { CurriculumView } from './components/CurriculumView';
import { SongsView } from './components/SongsView';
import { MetronomePanel } from './components/MetronomePanel';
import { ProgressDashboard } from './components/ProgressDashboard';
import { SessionScoreModal } from './components/SessionScoreModal';
import {
  Play,
  Square,
  BookOpen,
  Music,
  Gauge,
  BarChart3,
  Disc,
  CheckCircle2,
  RotateCcw,
  Repeat,
  Timer,
  Maximize2,
  Minimize2,
} from 'lucide-react';

type WorkspaceTab = 'studio' | 'curriculum' | 'songs' | 'metronome' | 'progress';

interface ScheduledStepSlot {
  globalStep: number;
  barNumber: number;
  stepIndex: number;
  expectedTimeMs: number;
  hasTarget: boolean;
  expectedPads: DrumPadId[];
  evaluated: boolean;
}

interface CountInPulseSlot {
  beatNumber: number; // 1-indexed
  totalBeats: number;
  timeMs: number;
  fired: boolean;
}

function getCountInBeatsForTimeSignature(timeSignature: Lesson['timeSignature']): number {
  switch (timeSignature) {
    case '3/4':
      return 3;
    case '5/4':
      return 5;
    case '6/8':
      return 6;
    case '7/8':
      return 7;
    case '12/8':
    case '4/4':
    default:
      return 4;
  }
}

export default function App() {
  const initialSettings = useMemo(() => loadUserSettings(), []);
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('studio');
  const [currentLessonId, setCurrentLessonId] = useState<number>(initialSettings.lastLessonId || 1);

  const allPlayableItems = useMemo(() => [...LESSONS, ...TIER_1_SONGS], []);

  const currentLesson: Lesson = useMemo(
    () => allPlayableItems.find((l) => l.id === currentLessonId) || LESSONS[0],
    [allPlayableItems, currentLessonId]
  );

  const [bpm, setBpm] = useState<number>(currentLesson.bpm);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [loopForever, setLoopForever] = useState<boolean>(false);
  const [countInEnabled, setCountInEnabled] = useState<boolean>(
    initialSettings.countInEnabled ?? true
  );
  const [countInBeat, setCountInBeat] = useState<{ current: number; total: number } | null>(null);
  const [isStageMode, setIsStageMode] = useState<boolean>(false);
  const [isMicEnabled, setIsMicEnabled] = useState<boolean>(false);
  const [midiDeviceName, setMidiDeviceName] = useState<string | null>(null);
  const [micThreshold, setMicThreshold] = useState<number>(initialSettings.micThreshold);
  const [latencyOffsetMs, setLatencyOffsetMs] = useState<number>(initialSettings.latencyOffsetMs);
  // Guide drums and metronome click off by default
  const [demoAudioEnabled, setDemoAudioEnabled] = useState<boolean>(false);
  const [metronomeClickEnabled, setMetronomeClickEnabled] = useState<boolean>(false);
  const [metronomeVolume, setMetronomeVolume] = useState<number>(initialSettings.metronomeVolume);

  // Real-time playback & evaluation state
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [currentBar, setCurrentBar] = useState<number>(1);
  const [latestWaveform, setLatestWaveform] = useState<Float32Array | null>(null);
  const [latestPeak, setLatestPeak] = useState<number>(0);
  const [recentlyTriggeredPads, setRecentlyTriggeredPads] = useState<Record<string, number>>({});
  const [evaluatedHits, setEvaluatedHits] = useState<EvaluatedStepHit[]>([]);
  const [lastHitFeedback, setLastHitFeedback] = useState<EvaluatedStepHit | null>(null);

  // Retained session records & completed session modal state
  const [sessions, setSessions] = useState<SessionRecord[]>(() => loadSessionRecords());
  const [completedSessionModal, setCompletedSessionModal] = useState<{
    session: SessionRecord;
    previousBest: number | null;
  } | null>(null);

  // Responsive orientation check for Android / mobile landscape mode
  const [isCompactLandscape, setIsCompactLandscape] = useState<boolean>(false);

  useEffect(() => {
    const checkOrientation = () => {
      const landscapeMobile = window.innerWidth > window.innerHeight && window.innerHeight < 540;
      setIsCompactLandscape(landscapeMobile);
    };
    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    return () => window.removeEventListener('resize', checkOrientation);
  }, []);

  // Sync Stage Mode state with native browser Fullscreen API events
  useEffect(() => {
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        setIsStageMode(false);
      } else {
        setIsStageMode(true);
      }
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const handleToggleStageMode = useCallback(async () => {
    const nextState = !isStageMode;
    setIsStageMode(nextState);
    try {
      if (nextState && !document.fullscreenElement && document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      } else if (!nextState && document.fullscreenElement && document.exitFullscreen) {
        await document.exitFullscreen();
      }
    } catch {
      // Fallback: stage layout expansion remains active even if iframe blocks hardware fullscreen
    }
  }, [isStageMode]);

  // Mutable refs for high-precision 60fps timing loop
  const isPlayingRef = useRef<boolean>(false);
  const loopForeverRef = useRef<boolean>(loopForever);
  const countInEnabledRef = useRef<boolean>(countInEnabled);
  const bpmRef = useRef<number>(bpm);
  const lessonRef = useRef<Lesson>(currentLesson);
  const demoAudioRef = useRef<boolean>(demoAudioEnabled);
  const metroClickRef = useRef<boolean>(metronomeClickEnabled);
  const micThresholdRef = useRef<number>(micThreshold);
  const latencyOffsetRef = useRef<number>(latencyOffsetMs);
  const scheduledStepsRef = useRef<ScheduledStepSlot[]>([]);
  const countInPulsesRef = useRef<CountInPulseSlot[]>([]);
  const evaluatedHitsRef = useRef<EvaluatedStepHit[]>([]);
  const nextGlobalStepToScheduleRef = useRef<number>(0);
  const sessionStartTimeMsRef = useRef<number>(0);
  const syntheticImpulseRef = useRef<number>(0);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);
  useEffect(() => {
    loopForeverRef.current = loopForever;
  }, [loopForever]);
  useEffect(() => {
    countInEnabledRef.current = countInEnabled;
  }, [countInEnabled]);
  useEffect(() => {
    bpmRef.current = bpm;
  }, [bpm]);
  useEffect(() => {
    lessonRef.current = currentLesson;
  }, [currentLesson]);
  useEffect(() => {
    demoAudioRef.current = demoAudioEnabled;
  }, [demoAudioEnabled]);
  useEffect(() => {
    metroClickRef.current = metronomeClickEnabled;
  }, [metronomeClickEnabled]);
  useEffect(() => {
    micThresholdRef.current = micThreshold;
  }, [micThreshold]);
  useEffect(() => {
    latencyOffsetRef.current = latencyOffsetMs;
  }, [latencyOffsetMs]);

  const flashPadVisual = useCallback((padId: DrumPadId) => {
    const now = performance.now();
    setRecentlyTriggeredPads((prev) => ({ ...prev, [padId]: now }));
    window.setTimeout(() => {
      setRecentlyTriggeredPads((prev) => {
        const copy = { ...prev };
        if (copy[padId] === now) {
          delete copy[padId];
        }
        return copy;
      });
    }, 150);
  }, []);

  /**
   * Computes final session score from evaluated hits and saves to localStorage
   */
  const finalizeAndScoreSession = useCallback((hitsToScore: EvaluatedStepHit[]) => {
    setIsPlaying(false);
    isPlayingRef.current = false;
    setCountInBeat(null);
    countInPulsesRef.current = [];

    const lesson = lessonRef.current;
    const prevBest = getLessonBestScore(loadSessionRecords(), lesson.id);

    let perfectCount = 0;
    let goodCount = 0;
    let earlyCount = 0;
    let lateCount = 0;
    let missedCount = 0;
    let totalPoints = 0;
    const offsets: number[] = [];

    hitsToScore.forEach((h) => {
      if (h.rating === 'PERFECT') {
        perfectCount += 1;
        totalPoints += 100;
      } else if (h.rating === 'GOOD') {
        goodCount += 1;
        totalPoints += 82;
      } else if (h.rating === 'EARLY') {
        earlyCount += 1;
        totalPoints += 52;
      } else if (h.rating === 'LATE') {
        lateCount += 1;
        totalPoints += 52;
      } else {
        missedCount += 1;
      }
      if (h.offsetMs !== undefined) {
        offsets.push(h.offsetMs);
      }
    });

    const totalSteps = Math.max(1, hitsToScore.length);
    const score = Math.round(totalPoints / totalSteps);

    const avgOffsetMs =
      offsets.length > 0
        ? Math.round(offsets.reduce((a, b) => a + b, 0) / offsets.length)
        : 0;
    const avgAbsOffsetMs =
      offsets.length > 0
        ? Math.round(offsets.reduce((a, b) => a + Math.abs(b), 0) / offsets.length)
        : 0;

    let consistencyJitterMs = 0;
    if (offsets.length > 1) {
      const mean = offsets.reduce((a, b) => a + b, 0) / offsets.length;
      const variance =
        offsets.reduce((acc, val) => acc + (val - mean) * (val - mean), 0) / offsets.length;
      consistencyJitterMs = Math.round(Math.sqrt(variance));
    }

    const record: SessionRecord = {
      id: `sess_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      lessonId: lesson.id,
      lessonTitle:
        lesson.isSong && lesson.artist ? `${lesson.artist} — ${lesson.title}` : lesson.title,
      timestamp: new Date().toISOString(),
      bpm: bpmRef.current,
      score,
      perfectCount,
      goodCount,
      earlyCount,
      lateCount,
      missedCount,
      totalTargetSteps: totalSteps,
      avgOffsetMs,
      avgAbsOffsetMs,
      consistencyJitterMs,
    };

    const updatedSessions = saveSessionRecord(record);
    setSessions(updatedSessions);
    setCompletedSessionModal({
      session: record,
      previousBest: prevBest,
    });
  }, []);

  /**
   * Registers a user drum hit (from Microphone transient, Touch/Click, Keyboard, or USB-MIDI)
   */
  const registerUserHit = useCallback(
    (source: 'mic' | 'pad' | 'midi', padId?: DrumPadId, peakAmp = 0.75) => {
      const nowRawMs = performance.now();
      const compensatedHitMs =
        source === 'mic' ? nowRawMs - latencyOffsetRef.current : nowRawMs;

      if (padId) {
        flashPadVisual(padId);
        if (source !== 'mic') {
          audioEngine.playPadSound(padId, peakAmp);
          syntheticImpulseRef.current = Math.max(syntheticImpulseRef.current, peakAmp);
        }
      } else {
        const activeLesson = lessonRef.current;
        const nearSlot = scheduledStepsRef.current.find(
          (slot) =>
            slot.hasTarget &&
            !slot.evaluated &&
            Math.abs(compensatedHitMs - slot.expectedTimeMs) <= 165
        );
        const padsToFlash = nearSlot?.expectedPads || activeLesson.focusPads.slice(0, 1);
        padsToFlash.forEach((p) => flashPadVisual(p));
      }

      if (!isPlayingRef.current) return;

      // Ignore warm-up hits that occur during the 1-bar count-in prior to Bar 1 Beat 1 window
      if (compensatedHitMs < sessionStartTimeMsRef.current - 135) {
        return;
      }

      // Match against the closest unevaluated target step slot within ±160ms
      let bestSlot: ScheduledStepSlot | null = null;
      let minAbsDiff = Infinity;

      for (const slot of scheduledStepsRef.current) {
        if (!slot.hasTarget || slot.evaluated) continue;
        const diff = compensatedHitMs - slot.expectedTimeMs;
        const absDiff = Math.abs(diff);
        if (absDiff <= 160 && absDiff < minAbsDiff) {
          minAbsDiff = absDiff;
          bestSlot = slot;
        }
      }

      if (bestSlot) {
        bestSlot.evaluated = true;
        const offsetMs = Math.round(compensatedHitMs - bestSlot.expectedTimeMs);
        const absOffset = Math.abs(offsetMs);
        let rating: HitAccuracyRating = 'GOOD';
        if (absOffset <= 28) {
          rating = 'PERFECT';
        } else if (absOffset <= 62) {
          rating = 'GOOD';
        } else if (offsetMs < 0) {
          rating = 'EARLY';
        } else {
          rating = 'LATE';
        }

        const evalHit: EvaluatedStepHit = {
          barNumber: bestSlot.barNumber,
          stepIndex: bestSlot.stepIndex,
          expectedTimeMs: bestSlot.expectedTimeMs,
          actualTimeMs: compensatedHitMs,
          offsetMs,
          rating,
          expectedPads: bestSlot.expectedPads,
          peakAmplitude: peakAmp,
        };

        evaluatedHitsRef.current = [...evaluatedHitsRef.current, evalHit];
        setEvaluatedHits(evaluatedHitsRef.current);
        setLastHitFeedback(evalHit);
      }
    },
    [flashPadVisual]
  );

  /**
   * Starts or stops an evaluated lesson session (with optional 1-bar audible count-in)
   */
  const startLessonSession = useCallback(() => {
    audioEngine.ensureContext();
    setCompletedSessionModal(null);
    scheduledStepsRef.current = [];
    evaluatedHitsRef.current = [];
    setEvaluatedHits([]);
    setLastHitFeedback(null);
    nextGlobalStepToScheduleRef.current = 0;

    const nowMs = performance.now();
    const lesson = lessonRef.current;

    if (countInEnabledRef.current) {
      const totalCountInBeats = getCountInBeatsForTimeSignature(lesson.timeSignature);
      const beatDurationMs = (60 / bpmRef.current) * 1000;
      const countInStartMs = nowMs + 80;
      const pulses: CountInPulseSlot[] = [];

      for (let i = 0; i < totalCountInBeats; i++) {
        pulses.push({
          beatNumber: i + 1,
          totalBeats: totalCountInBeats,
          timeMs: countInStartMs + i * beatDurationMs,
          fired: false,
        });
      }

      countInPulsesRef.current = pulses;
      sessionStartTimeMsRef.current = countInStartMs + totalCountInBeats * beatDurationMs;
      setCountInBeat({ current: 1, total: totalCountInBeats });
    } else {
      countInPulsesRef.current = [];
      sessionStartTimeMsRef.current = nowMs + 120;
      setCountInBeat(null);
    }

    setCurrentStepIndex(0);
    setCurrentBar(1);
    setIsPlaying(true);
    isPlayingRef.current = true;
  }, []);

  const stopLessonSession = useCallback(() => {
    setIsPlaying(false);
    isPlayingRef.current = false;
    setCountInBeat(null);
    countInPulsesRef.current = [];
  }, []);

  /**
   * High-FPS animation loop for Microphone Wave Tracking + Count-In + Lesson Step Scheduling
   */
  useEffect(() => {
    let rafId: number;

    const tick = () => {
      // 1. Sample Microphone or Synthetic Pad Impulse for Visual Wave Tracker
      if (audioEngine.isMicActive()) {
        const frame = audioEngine.sampleMicrophoneFrame(micThresholdRef.current);
        setLatestWaveform(frame.waveform ? new Float32Array(frame.waveform) : null);
        setLatestPeak(frame.peak);
        if (frame.onsetDetected) {
          registerUserHit('mic', undefined, frame.peak);
        }
      } else {
        if (syntheticImpulseRef.current > 0.01) {
          const amp = syntheticImpulseRef.current;
          const synthBuf = new Float32Array(512);
          for (let i = 0; i < 512; i++) {
            synthBuf[i] =
              Math.sin(i * 0.28) *
              Math.cos(i * 0.07) *
              amp *
              Math.exp(-i / 140);
          }
          setLatestWaveform(synthBuf);
          setLatestPeak(amp);
          syntheticImpulseRef.current *= 0.84;
        } else {
          setLatestPeak(0.01);
        }
      }

      // 2. Advance Count-In & Lesson Sequencer if playing
      if (isPlayingRef.current) {
        const nowMs = performance.now();

        // 2a. Process 1-Bar Count-In Pulses prior to sessionStartTimeMsRef.current
        if (countInPulsesRef.current.length > 0) {
          for (const pulse of countInPulsesRef.current) {
            if (!pulse.fired && nowMs >= pulse.timeMs - 10) {
              pulse.fired = true;
              audioEngine.playMetronomeClick(pulse.beatNumber === 1 ? 'accent' : 'beat');
              setCountInBeat({ current: pulse.beatNumber, total: pulse.totalBeats });
            }
          }
          if (nowMs >= sessionStartTimeMsRef.current - 15) {
            countInPulsesRef.current = [];
            setCountInBeat(null);
          }
        }

        const lesson = lessonRef.current;
        const stepsPerBar = lesson.stepsPerBar;
        const totalBars = lesson.barsToComplete;
        const totalSessionSteps = stepsPerBar * totalBars;

        const stepsPerBeat =
          lesson.timeSignature === '12/8'
            ? 3
            : lesson.timeSignature === '6/8'
            ? 3
            : lesson.timeSignature === '5/4'
            ? 2
            : lesson.timeSignature === '7/8'
            ? 2
            : stepsPerBar / 4;

        const stepDurationMs = (60 / bpmRef.current / stepsPerBeat) * 1000;

        // 2b. Schedule steps up to current time (indefinitely if loopForeverRef.current is true)
        while (
          (loopForeverRef.current || nextGlobalStepToScheduleRef.current < totalSessionSteps) &&
          sessionStartTimeMsRef.current +
            nextGlobalStepToScheduleRef.current * stepDurationMs <=
            nowMs + 15
        ) {
          const gStep = nextGlobalStepToScheduleRef.current;
          const stepTimeMs = sessionStartTimeMsRef.current + gStep * stepDurationMs;
          const barNum = Math.floor(gStep / stepsPerBar) + 1;
          const stepIdx = gStep % stepsPerBar;

          const patternEvent = lesson.pattern.find((p) => p.stepIndex === stepIdx);

          scheduledStepsRef.current.push({
            globalStep: gStep,
            barNumber: barNum,
            stepIndex: stepIdx,
            expectedTimeMs: stepTimeMs,
            hasTarget: Boolean(patternEvent && patternEvent.pads.length > 0),
            expectedPads: patternEvent ? patternEvent.pads : [],
            evaluated: false,
          });

          // Prevent unbounded array growth during Loop Forever
          if (scheduledStepsRef.current.length > 128) {
            scheduledStepsRef.current.shift();
          }

          setCurrentStepIndex(stepIdx);
          setCurrentBar(barNum);

          // Metronome click on downbeats
          if (metroClickRef.current) {
            if (stepIdx === 0) {
              audioEngine.playMetronomeClick('accent');
            } else if (stepIdx % Math.round(stepsPerBeat) === 0) {
              audioEngine.playMetronomeClick('beat');
            }
          }

          // Guide Demo Drum Kit Audio (only when user explicitly enables Guide Drums)
          if (demoAudioRef.current && patternEvent) {
            patternEvent.pads.forEach((padId) => {
              audioEngine.playPadSound(padId, patternEvent.accent ? 0.85 : 0.6);
            });
          }

          nextGlobalStepToScheduleRef.current += 1;
        }

        // 2c. Check for missed target steps whose window (±145ms) has expired
        for (const slot of scheduledStepsRef.current) {
          if (slot.hasTarget && !slot.evaluated && nowMs > slot.expectedTimeMs + 145) {
            slot.evaluated = true;
            const missHit: EvaluatedStepHit = {
              barNumber: slot.barNumber,
              stepIndex: slot.stepIndex,
              expectedTimeMs: slot.expectedTimeMs,
              rating: 'MISSED',
              expectedPads: slot.expectedPads,
            };
            evaluatedHitsRef.current = [...evaluatedHitsRef.current, missHit];
            setEvaluatedHits(evaluatedHitsRef.current);
            setLastHitFeedback(missHit);
          }
        }

        // 2d. Complete automatically only when NOT in Loop Forever mode
        if (!loopForeverRef.current) {
          const allStepsScheduled = nextGlobalStepToScheduleRef.current >= totalSessionSteps;
          const lastStepEndTime =
            sessionStartTimeMsRef.current + totalSessionSteps * stepDurationMs + 160;
          if (allStepsScheduled && nowMs >= lastStepEndTime) {
            finalizeAndScoreSession(evaluatedHitsRef.current);
          }
        }
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [finalizeAndScoreSession, registerUserHit]);

  // Connect Web MIDI automatically if supported
  useEffect(() => {
    audioEngine
      .connectWebMidi((padId, velocity) => {
        registerUserHit('midi', padId, velocity);
      })
      .then((deviceName) => {
        if (deviceName) setMidiDeviceName(deviceName);
      });
  }, [registerUserHit]);

  // Keyboard shortcuts for all 13 drum zones (including Ride Bow [R] & Ride Bell [T])
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLSelectElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }
      if (e.repeat) return;

      const key = e.key === ' ' ? 'Space' : e.key.toUpperCase();
      const matchedPadId = (Object.keys(YAMAHA_DTX452K_PADS) as DrumPadId[]).find(
        (id) => YAMAHA_DTX452K_PADS[id].keyShortcut.toUpperCase() === key.toUpperCase()
      );
      if (matchedPadId) {
        e.preventDefault();
        registerUserHit('pad', matchedPadId, 0.9);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [registerUserHit]);

  const handleSelectLesson = (lessonId: number) => {
    stopLessonSession();
    const target = allPlayableItems.find((l) => l.id === lessonId) || LESSONS[0];
    setCurrentLessonId(target.id);
    setBpm(target.bpm);
    setCurrentStepIndex(0);
    setCurrentBar(1);
    setEvaluatedHits([]);
    setLastHitFeedback(null);
    saveUserSettings({ lastLessonId: target.id });
    setActiveTab('studio');
  };

  const handleToggleMic = async () => {
    if (isMicEnabled) {
      audioEngine.stopMicrophone();
      setIsMicEnabled(false);
    } else {
      const ok = await audioEngine.startMicrophone();
      if (ok) {
        setIsMicEnabled(true);
        setDemoAudioEnabled(false);
      }
    }
  };

  const activeStepEvent = useMemo(
    () => currentLesson.pattern.find((p) => p.stepIndex === currentStepIndex),
    [currentLesson, currentStepIndex]
  );

  const currentLessonBestScore = useMemo(
    () => getLessonBestScore(sessions, currentLesson.id),
    [sessions, currentLesson.id]
  );

  const currentLessonHistory = useMemo(
    () => getLessonSessions(sessions, currentLesson.id),
    [sessions, currentLesson.id]
  );

  return (
    <div
      className={`min-h-screen flex flex-col bg-[#0B0F17] text-slate-100 ${
        isStageMode ? 'pb-3' : 'pb-16 md:pb-6'
      }`}
    >
      {/* ==================================================================== */}
      {/* TOP BAR CONTRACT: 3 Zones (Wordmark — 4 Nav Links — 1 Primary CTA)   */}
      {/* Hidden when Full-Screen Stage Mode is active for max stage height    */}
      {/* ==================================================================== */}
      {!isStageMode && (
        <header className="sticky top-0 z-30 h-14 flex items-center justify-between gap-8 px-4 sm:px-6 bg-[#0B0F17]/90 backdrop-blur-md border-b border-slate-800/90">
          {/* Zone 1: Single text element wordmark */}
          <a
            href="#studio"
            onClick={(e) => {
              e.preventDefault();
              setActiveTab('studio');
            }}
            className="text-lg font-bold tracking-tight text-white font-display whitespace-nowrap shrink-0"
          >
            SageDrums
          </a>

          {/* Zone 2: Navigation links */}
          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-400">
            <a
              href="#studio"
              onClick={(e) => {
                e.preventDefault();
                setActiveTab('studio');
              }}
              className={`transition-colors whitespace-nowrap shrink-0 py-1 ${
                activeTab === 'studio'
                  ? 'text-white underline decoration-violet-500 decoration-2 underline-offset-8'
                  : 'hover:text-white'
              }`}
            >
              Studio
            </a>
            <a
              href="#curriculum"
              onClick={(e) => {
                e.preventDefault();
                setActiveTab('curriculum');
              }}
              className={`transition-colors whitespace-nowrap shrink-0 py-1 ${
                activeTab === 'curriculum'
                  ? 'text-white underline decoration-violet-500 decoration-2 underline-offset-8'
                  : 'hover:text-white'
              }`}
            >
              Curriculum
            </a>
            <a
              href="#songs"
              onClick={(e) => {
                e.preventDefault();
                setActiveTab('songs');
              }}
              className={`transition-colors whitespace-nowrap shrink-0 py-1 ${
                activeTab === 'songs'
                  ? 'text-white underline decoration-violet-500 decoration-2 underline-offset-8'
                  : 'hover:text-white'
              }`}
            >
              Songs
            </a>
            <a
              href="#metronome"
              onClick={(e) => {
                e.preventDefault();
                setActiveTab('metronome');
              }}
              className={`transition-colors whitespace-nowrap shrink-0 py-1 ${
                activeTab === 'metronome'
                  ? 'text-white underline decoration-violet-500 decoration-2 underline-offset-8'
                  : 'hover:text-white'
              }`}
            >
              Metronome
            </a>
            <a
              href="#progress"
              onClick={(e) => {
                e.preventDefault();
                setActiveTab('progress');
              }}
              className={`transition-colors whitespace-nowrap shrink-0 py-1 ${
                activeTab === 'progress'
                  ? 'text-white underline decoration-violet-500 decoration-2 underline-offset-8'
                  : 'hover:text-white'
              }`}
            >
              Progress
            </a>
          </nav>

          {/* Zone 3: 1 Primary Action Button */}
          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={() => {
                if (activeTab !== 'studio') {
                  setActiveTab('studio');
                }
                if (isPlaying) {
                  stopLessonSession();
                } else {
                  startLessonSession();
                }
              }}
              className={`min-h-[38px] px-4 py-1.5 text-xs font-bold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                isPlaying
                  ? 'bg-rose-500 hover:bg-rose-400 text-white'
                  : 'bg-violet-600 hover:bg-violet-500 text-white'
              }`}
            >
              {isPlaying
                ? 'Stop Session'
                : currentLesson.isSong
                ? `Start Song ${String(currentLesson.songNumber || currentLesson.id - 100).padStart(2, '0')}`
                : `Start Lesson ${String(currentLesson.id).padStart(2, '0')}`}
            </button>
          </div>
        </header>
      )}

      {/* ==================================================================== */}
      {/* MAIN WORKSPACE CONTENT                                               */}
      {/* ==================================================================== */}
      <main
        className={`flex-1 w-full max-w-[1440px] mx-auto px-3 sm:px-6 ${
          isStageMode ? 'pt-2' : 'pt-3 sm:pt-5'
        }`}
      >
        {activeTab === 'studio' && (
          <div className="space-y-4">
            {/* Studio Workspace Control Strip */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[#111827] border border-slate-800 px-4 py-2.5">
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300">
                <span className="font-bold text-white">
                  {currentLesson.isSong
                    ? `Song ${String(currentLesson.songNumber || currentLesson.id - 100).padStart(2, '0')}: ${currentLesson.artist} — ${currentLesson.title}`
                    : `Lesson ${String(currentLesson.id).padStart(2, '0')}: ${currentLesson.title}`}
                </span>
                <span aria-hidden="true" className="text-slate-600">·</span>
                <span className="text-violet-400 font-medium">{currentLesson.tierName}</span>
                {midiDeviceName && (
                  <>
                    <span aria-hidden="true" className="text-slate-600">·</span>
                    <span className="text-emerald-400 font-mono">USB-MIDI: {midiDeviceName}</span>
                  </>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* 1-Bar Count-In Toggle Button */}
                <button
                  type="button"
                  onClick={() => {
                    const next = !countInEnabled;
                    setCountInEnabled(next);
                    saveUserSettings({ countInEnabled: next });
                  }}
                  className={`min-h-[38px] px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 ${
                    countInEnabled
                      ? 'bg-violet-500/15 border-violet-500/60 text-violet-300'
                      : 'bg-slate-800/90 border-slate-700 text-slate-400 hover:text-white'
                  }`}
                >
                  <Timer className="w-3.5 h-3.5" />
                  <span>{countInEnabled ? '1-Bar Count-In: ON' : 'Count-In: OFF'}</span>
                </button>

                {/* Loop Forever Button */}
                <button
                  type="button"
                  onClick={() => setLoopForever((prev) => !prev)}
                  className={`min-h-[38px] px-3.5 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 ${
                    loopForever
                      ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                      : 'bg-slate-800/90 border-slate-700 text-slate-300 hover:text-white'
                  }`}
                >
                  <Repeat className="w-3.5 h-3.5" />
                  <span>{loopForever ? 'Loop Forever: ON' : 'Loop Forever'}</span>
                </button>

                {/* Full-Screen Stage Mode Toggle Button */}
                <button
                  type="button"
                  onClick={handleToggleStageMode}
                  className={`min-h-[38px] px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 ${
                    isStageMode
                      ? 'bg-sky-500/20 border-sky-400 text-sky-300'
                      : 'bg-slate-800/90 border-slate-700 text-slate-300 hover:text-white'
                  }`}
                >
                  {isStageMode ? (
                    <Minimize2 className="w-3.5 h-3.5" />
                  ) : (
                    <Maximize2 className="w-3.5 h-3.5" />
                  )}
                  <span>{isStageMode ? 'Exit Stage Mode' : 'Stage Mode'}</span>
                </button>

                {isPlaying && evaluatedHits.length > 0 && (
                  <button
                    type="button"
                    onClick={() => finalizeAndScoreSession(evaluatedHitsRef.current)}
                    className="min-h-[38px] px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Finish &amp; Score Now</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => (isPlaying ? stopLessonSession() : startLessonSession())}
                  className={`min-h-[38px] px-4 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 ${
                    isPlaying
                      ? 'bg-rose-500 hover:bg-rose-400 text-white'
                      : 'bg-violet-600 hover:bg-violet-500 text-white'
                  }`}
                >
                  {isPlaying ? <Square className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  <span>
                    {isPlaying
                      ? countInBeat
                        ? `Count-In (${countInBeat.current}/${countInBeat.total})`
                        : `Stop (Bar ${currentBar}/${
                            loopForever ? '∞' : currentLesson.barsToComplete
                          })`
                      : loopForever
                      ? 'Start Infinite Loop'
                      : `Evaluate ${currentLesson.barsToComplete} Bars`}
                  </span>
                </button>

                {!isPlaying && evaluatedHits.length > 0 && (
                  <button
                    type="button"
                    onClick={startLessonSession}
                    className="min-h-[38px] px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1 whitespace-nowrap shrink-0"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Restart</span>
                  </button>
                )}
              </div>
            </div>

            {/* Primary Full-Width Playback Wave & Rhythm Accuracy Tracker */}
            <WaveTrackerCanvas
              lesson={currentLesson}
              bpm={bpm}
              isPlaying={isPlaying}
              loopForever={loopForever}
              countInBeat={countInBeat}
              isMicEnabled={isMicEnabled}
              micThreshold={micThreshold}
              latencyOffsetMs={latencyOffsetMs}
              currentStepIndex={currentStepIndex}
              currentBar={currentBar}
              latestWaveform={latestWaveform}
              latestPeak={latestPeak}
              recentHits={evaluatedHits}
              lastHitFeedback={lastHitFeedback}
              onToggleMic={handleToggleMic}
              onChangeThreshold={(val) => {
                setMicThreshold(val);
                saveUserSettings({ micThreshold: val });
              }}
              onChangeLatency={(val) => {
                setLatencyOffsetMs(val);
                saveUserSettings({ latencyOffsetMs: val });
              }}
              compactLandscape={isCompactLandscape}
            />

            {/* Lower Two-Column Stage: Yamaha DTX452K Kit Layout (Left) + Lesson/Song Controls & Notation Matrix (Right) */}
            <div
              className={`grid gap-4 items-start ${
                isCompactLandscape
                  ? 'grid-cols-12'
                  : 'grid-cols-1 lg:grid-cols-12'
              }`}
            >
              {/* Left: Yamaha DTX452K Interactive Kit Layout */}
              <div
                className={`${
                  isCompactLandscape ? 'col-span-7' : 'lg:col-span-7'
                }`}
              >
                <div className="rounded-xl bg-[#111827] border border-slate-800 p-3 sm:p-4">
                  <YamahaDTX452KKit
                    activeStepPads={activeStepEvent ? activeStepEvent.pads : []}
                    activeSticking={activeStepEvent?.sticking}
                    recentlyTriggeredPads={recentlyTriggeredPads}
                    focusPads={currentLesson.focusPads}
                    dtxKitPreset={currentLesson.dtxKitPreset}
                    bpm={bpm}
                    onTriggerPad={(padId) => registerUserHit('pad', padId, 0.9)}
                    compactLandscape={isCompactLandscape}
                  />
                </div>
              </div>

              {/* Right: Lesson/Song Controls & Step Pattern Matrix */}
              <div
                className={`${
                  isCompactLandscape ? 'col-span-5' : 'lg:col-span-5'
                }`}
              >
                <LessonNotationDeck
                  lesson={currentLesson}
                  currentStepIndex={currentStepIndex}
                  currentBar={currentBar}
                  isPlaying={isPlaying}
                  loopForever={loopForever}
                  bpm={bpm}
                  demoAudioEnabled={demoAudioEnabled}
                  metronomeClickEnabled={metronomeClickEnabled}
                  bestScore={currentLessonBestScore}
                  sessionCount={currentLessonHistory.length}
                  recentHits={evaluatedHits}
                  onChangeBpm={setBpm}
                  onToggleDemoAudio={() => {
                    const next = !demoAudioEnabled;
                    setDemoAudioEnabled(next);
                    saveUserSettings({ autoDemoAudio: next });
                  }}
                  onToggleMetronomeClick={() => setMetronomeClickEnabled((prev) => !prev)}
                  onToggleLoopForever={() => setLoopForever((prev) => !prev)}
                  onPrevLesson={() => {
                    if (currentLesson.isSong) {
                      if (currentLesson.id > 101) handleSelectLesson(currentLesson.id - 1);
                    } else if (currentLesson.id > 1) {
                      handleSelectLesson(currentLesson.id - 1);
                    }
                  }}
                  onNextLesson={() => {
                    if (currentLesson.isSong) {
                      if (currentLesson.id < 130) handleSelectLesson(currentLesson.id + 1);
                    } else if (currentLesson.id < 30) {
                      handleSelectLesson(currentLesson.id + 1);
                    }
                  }}
                  onTriggerPad={(padId) => registerUserHit('pad', padId, 0.9)}
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'curriculum' && (
          <CurriculumView
            currentLessonId={currentLesson.id}
            sessions={sessions}
            onSelectLesson={handleSelectLesson}
          />
        )}

        {activeTab === 'songs' && (
          <SongsView
            currentLessonId={currentLesson.id}
            sessions={sessions}
            onSelectSong={handleSelectLesson}
          />
        )}

        {activeTab === 'metronome' && (
          <MetronomePanel
            initialBpm={bpm}
            metronomeVolume={metronomeVolume}
            onChangeMetronomeVolume={(vol) => {
              setMetronomeVolume(vol);
              audioEngine.metronomeVolume = vol;
              saveUserSettings({ metronomeVolume: vol });
            }}
          />
        )}

        {activeTab === 'progress' && (
          <ProgressDashboard
            sessions={sessions}
            currentLessonId={currentLesson.id}
            onSelectLesson={handleSelectLesson}
            onClearHistory={() => {
              clearAllSessionRecords();
              setSessions([]);
            }}
          />
        )}
      </main>

      {/* ==================================================================== */}
      {/* MOBILE / ANDROID FIXED BOTTOM TAB BAR (Hidden in Stage Mode)         */}
      {/* ==================================================================== */}
      {!isStageMode && (
        <nav
          aria-label="Mobile Navigation"
          className="md:hidden fixed bottom-0 left-0 right-0 z-40 h-14 bg-[#0B0F17]/95 backdrop-blur-md border-t border-slate-800 grid grid-cols-5 items-center"
        >
          <button
            type="button"
            onClick={() => setActiveTab('studio')}
            className={`min-h-[44px] flex flex-col items-center justify-center ${
              activeTab === 'studio' ? 'text-violet-400' : 'text-slate-400'
            }`}
          >
            <Disc className="w-5 h-5" />
            <span className="text-[10px] font-semibold mt-0.5">Studio</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('curriculum')}
            className={`min-h-[44px] flex flex-col items-center justify-center ${
              activeTab === 'curriculum' ? 'text-violet-400' : 'text-slate-400'
            }`}
          >
            <BookOpen className="w-5 h-5" />
            <span className="text-[10px] font-semibold mt-0.5">Lessons</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('songs')}
            className={`min-h-[44px] flex flex-col items-center justify-center ${
              activeTab === 'songs' ? 'text-violet-400' : 'text-slate-400'
            }`}
          >
            <Music className="w-5 h-5" />
            <span className="text-[10px] font-semibold mt-0.5">Songs</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('metronome')}
            className={`min-h-[44px] flex flex-col items-center justify-center ${
              activeTab === 'metronome' ? 'text-violet-400' : 'text-slate-400'
            }`}
          >
            <Gauge className="w-5 h-5" />
            <span className="text-[10px] font-semibold mt-0.5">Metronome</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('progress')}
            className={`min-h-[44px] flex flex-col items-center justify-center ${
              activeTab === 'progress' ? 'text-violet-400' : 'text-slate-400'
            }`}
          >
            <BarChart3 className="w-5 h-5" />
            <span className="text-[10px] font-semibold mt-0.5">Progress</span>
          </button>
        </nav>
      )}

      {/* ==================================================================== */}
      {/* END-OF-LESSON SESSION SCORE & PERSONAL BEST MODAL                    */}
      {/* ==================================================================== */}
      {completedSessionModal && (
        <SessionScoreModal
          session={completedSessionModal.session}
          lesson={currentLesson}
          previousBestScore={completedSessionModal.previousBest}
          lessonHistory={currentLessonHistory}
          onRetryLesson={() => {
            setCompletedSessionModal(null);
            startLessonSession();
          }}
          onNextLesson={() => {
            setCompletedSessionModal(null);
            if (currentLesson.isSong) {
              if (currentLesson.id < 130) {
                handleSelectLesson(currentLesson.id + 1);
              }
            } else if (currentLesson.id < 30) {
              handleSelectLesson(currentLesson.id + 1);
            }
          }}
          onOpenDashboard={() => {
            setCompletedSessionModal(null);
            setActiveTab('progress');
          }}
          onClose={() => setCompletedSessionModal(null)}
        />
      )}
    </div>
  );
}
