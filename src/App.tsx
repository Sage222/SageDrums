/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LESSONS } from './data/lessons';
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
import { MetronomePanel } from './components/MetronomePanel';
import { ProgressDashboard } from './components/ProgressDashboard';
import { SessionScoreModal } from './components/SessionScoreModal';
import {
  Play,
  Square,
  BookOpen,
  Gauge,
  BarChart3,
  Disc,
  CheckCircle2,
  RotateCcw,
  Repeat,
} from 'lucide-react';

type WorkspaceTab = 'studio' | 'curriculum' | 'metronome' | 'progress';

interface ScheduledStepSlot {
  globalStep: number;
  barNumber: number;
  stepIndex: number;
  expectedTimeMs: number;
  hasTarget: boolean;
  expectedPads: DrumPadId[];
  evaluated: boolean;
}

export default function App() {
  const initialSettings = useMemo(() => loadUserSettings(), []);
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('studio');
  const [currentLessonId, setCurrentLessonId] = useState<number>(initialSettings.lastLessonId || 1);

  const currentLesson: Lesson = useMemo(
    () => LESSONS.find((l) => l.id === currentLessonId) || LESSONS[0],
    [currentLessonId]
  );

  const [bpm, setBpm] = useState<number>(currentLesson.bpm);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [loopForever, setLoopForever] = useState<boolean>(false);
  const [isMicEnabled, setIsMicEnabled] = useState<boolean>(false);
  const [midiDeviceName, setMidiDeviceName] = useState<string | null>(null);
  const [micThreshold, setMicThreshold] = useState<number>(initialSettings.micThreshold);
  const [latencyOffsetMs, setLatencyOffsetMs] = useState<number>(initialSettings.latencyOffsetMs);
  // Guide drums off by default
  const [demoAudioEnabled, setDemoAudioEnabled] = useState<boolean>(false);
  const [metronomeClickEnabled, setMetronomeClickEnabled] = useState<boolean>(true);
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

  // Mutable refs for high-precision 60fps timing loop
  const isPlayingRef = useRef<boolean>(false);
  const loopForeverRef = useRef<boolean>(loopForever);
  const bpmRef = useRef<number>(bpm);
  const lessonRef = useRef<Lesson>(currentLesson);
  const demoAudioRef = useRef<boolean>(demoAudioEnabled);
  const metroClickRef = useRef<boolean>(metronomeClickEnabled);
  const micThresholdRef = useRef<number>(micThreshold);
  const latencyOffsetRef = useRef<number>(latencyOffsetMs);
  const scheduledStepsRef = useRef<ScheduledStepSlot[]>([]);
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
      lessonTitle: lesson.title,
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
   * Starts or stops an evaluated lesson session
   */
  const startLessonSession = useCallback(() => {
    audioEngine.ensureContext();
    setCompletedSessionModal(null);
    scheduledStepsRef.current = [];
    evaluatedHitsRef.current = [];
    setEvaluatedHits([]);
    setLastHitFeedback(null);
    nextGlobalStepToScheduleRef.current = 0;
    sessionStartTimeMsRef.current = performance.now() + 120;
    setCurrentStepIndex(0);
    setCurrentBar(1);
    setIsPlaying(true);
    isPlayingRef.current = true;
  }, []);

  const stopLessonSession = useCallback(() => {
    setIsPlaying(false);
    isPlayingRef.current = false;
  }, []);

  /**
   * High-FPS animation loop for Microphone Wave Tracking + Lesson Step Scheduling
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

      // 2. Advance Lesson Sequencer & Rhythm Evaluator if playing
      if (isPlayingRef.current) {
        const nowMs = performance.now();
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

        // Schedule steps up to current time (indefinitely if loopForeverRef.current is true)
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

        // Check for missed target steps whose window (±145ms) has expired
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

        // Complete automatically only when NOT in Loop Forever mode
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
    const target = LESSONS.find((l) => l.id === lessonId) || LESSONS[0];
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
    <div className="min-h-screen flex flex-col bg-[#0B0F17] text-slate-100 pb-16 md:pb-6">
      {/* ==================================================================== */}
      {/* TOP BAR CONTRACT: 3 Zones (Wordmark — 4 Nav Links — 1 Primary CTA)   */}
      {/* ==================================================================== */}
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

        {/* Zone 2: 4 concise single-line text navigation links */}
        <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-400">
          <a
            href="#studio"
            onClick={(e) => {
              e.preventDefault();
              setActiveTab('studio');
            }}
            className={`transition-colors whitespace-nowrap shrink-0 py-1 ${
              activeTab === 'studio'
                ? 'text-white underline decoration-amber-500 decoration-2 underline-offset-8'
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
                ? 'text-white underline decoration-amber-500 decoration-2 underline-offset-8'
                : 'hover:text-white'
            }`}
          >
            Curriculum
          </a>
          <a
            href="#metronome"
            onClick={(e) => {
              e.preventDefault();
              setActiveTab('metronome');
            }}
            className={`transition-colors whitespace-nowrap shrink-0 py-1 ${
              activeTab === 'metronome'
                ? 'text-white underline decoration-amber-500 decoration-2 underline-offset-8'
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
                ? 'text-white underline decoration-amber-500 decoration-2 underline-offset-8'
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
                : 'bg-amber-500 hover:bg-amber-400 text-slate-950'
            }`}
          >
            {isPlaying ? 'Stop Session' : `Start Lesson ${String(currentLesson.id).padStart(2, '0')}`}
          </button>
        </div>
      </header>

      {/* ==================================================================== */}
      {/* MAIN WORKSPACE CONTENT                                               */}
      {/* ==================================================================== */}
      <main className="flex-1 w-full max-w-[1440px] mx-auto px-3 sm:px-6 pt-3 sm:pt-5">
        {activeTab === 'studio' && (
          <div className="space-y-4">
            {/* Studio Workspace Control Strip */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[#111827] border border-slate-800 px-4 py-2.5">
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300">
                <span className="font-bold text-white">
                  Lesson {String(currentLesson.id).padStart(2, '0')}: {currentLesson.title}
                </span>
                <span aria-hidden="true" className="text-slate-600">·</span>
                <span className="text-slate-400">{currentLesson.tierName}</span>
                {midiDeviceName && (
                  <>
                    <span aria-hidden="true" className="text-slate-600">·</span>
                    <span className="text-emerald-400 font-mono">USB-MIDI: {midiDeviceName}</span>
                  </>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
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
                      : 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                  }`}
                >
                  {isPlaying ? <Square className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  <span>
                    {isPlaying
                      ? `Stop (Bar ${currentBar}/${loopForever ? '∞' : currentLesson.barsToComplete})`
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

            {/* Two-Zone Studio Layout */}
            <div
              className={`grid gap-4 items-start ${
                isCompactLandscape
                  ? 'grid-cols-12'
                  : 'grid-cols-1 lg:grid-cols-12'
              }`}
            >
              {/* Left / Stage Zone: Live Microphone Wave Tracker + Yamaha DTX452K Interactive Kit */}
              <div
                className={`space-y-4 ${
                  isCompactLandscape ? 'col-span-7' : 'lg:col-span-7'
                }`}
              >
                <WaveTrackerCanvas
                  lesson={currentLesson}
                  bpm={bpm}
                  isPlaying={isPlaying}
                  loopForever={loopForever}
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

              {/* Right / Control & Notation Deck */}
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
                    if (currentLesson.id > 1) handleSelectLesson(currentLesson.id - 1);
                  }}
                  onNextLesson={() => {
                    if (currentLesson.id < 30) handleSelectLesson(currentLesson.id + 1);
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
      {/* MOBILE / ANDROID FIXED BOTTOM TAB BAR (Thumb-Zone Ergonomics)        */}
      {/* ==================================================================== */}
      <nav
        aria-label="Mobile Navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 h-14 bg-[#0B0F17]/95 backdrop-blur-md border-t border-slate-800 grid grid-cols-4 items-center"
      >
        <button
          type="button"
          onClick={() => setActiveTab('studio')}
          className={`min-h-[44px] flex flex-col items-center justify-center ${
            activeTab === 'studio' ? 'text-amber-400' : 'text-slate-400'
          }`}
        >
          <Disc className="w-5 h-5" />
          <span className="text-[10px] font-semibold mt-0.5">Studio</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('curriculum')}
          className={`min-h-[44px] flex flex-col items-center justify-center ${
            activeTab === 'curriculum' ? 'text-amber-400' : 'text-slate-400'
          }`}
        >
          <BookOpen className="w-5 h-5" />
          <span className="text-[10px] font-semibold mt-0.5">30 Lessons</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('metronome')}
          className={`min-h-[44px] flex flex-col items-center justify-center ${
            activeTab === 'metronome' ? 'text-amber-400' : 'text-slate-400'
          }`}
        >
          <Gauge className="w-5 h-5" />
          <span className="text-[10px] font-semibold mt-0.5">Metronome</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('progress')}
          className={`min-h-[44px] flex flex-col items-center justify-center ${
            activeTab === 'progress' ? 'text-amber-400' : 'text-slate-400'
          }`}
        >
          <BarChart3 className="w-5 h-5" />
          <span className="text-[10px] font-semibold mt-0.5">Progress</span>
        </button>
      </nav>

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
            if (currentLesson.id < 30) {
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
