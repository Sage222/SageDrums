import React, { useEffect, useRef, useState } from 'react';
import { audioEngine } from '../utils/audioEngine';
import { Play, Square, Volume2, Plus, Minus, HandMetal, TrendingUp } from 'lucide-react';

interface MetronomePanelProps {
  initialBpm: number;
  metronomeVolume: number;
  onChangeMetronomeVolume: (vol: number) => void;
}

type TimeSigOption = '4/4' | '3/4' | '6/8' | '5/4' | '7/8';
type SubdivisionOption = 1 | 2 | 3 | 4; // 1 = quarter, 2 = 8th, 3 = triplet, 4 = 16th

const TIME_SIG_BEATS: Record<TimeSigOption, number> = {
  '4/4': 4,
  '3/4': 3,
  '6/8': 6,
  '5/4': 5,
  '7/8': 7,
};

export const MetronomePanel: React.FC<MetronomePanelProps> = ({
  initialBpm,
  metronomeVolume,
  onChangeMetronomeVolume,
}) => {
  const [bpm, setBpm] = useState<number>(initialBpm || 90);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [timeSig, setTimeSig] = useState<TimeSigOption>('4/4');
  const [subdivision, setSubdivision] = useState<SubdivisionOption>(2);
  const [accentDownbeat, setAccentDownbeat] = useState<boolean>(true);
  const [autoSpeedUp, setAutoSpeedUp] = useState<boolean>(false);
  const [activeBeat, setActiveBeat] = useState<number>(0);
  const [activeSub, setActiveSub] = useState<number>(0);
  const [barCounter, setBarCounter] = useState<number>(1);

  const tapTimesRef = useRef<number[]>([]);
  const stepCounterRef = useRef<number>(0);
  const barsPlayedRef = useRef<number>(0);

  const beatsPerBar = TIME_SIG_BEATS[timeSig];

  useEffect(() => {
    if (!isRunning) {
      stepCounterRef.current = 0;
      barsPlayedRef.current = 0;
      setActiveBeat(0);
      setActiveSub(0);
      return;
    }

    const totalSubsPerBar = beatsPerBar * subdivision;
    const stepDurationMs = (60 / bpm / subdivision) * 1000;

    const triggerTick = () => {
      const idx = stepCounterRef.current % totalSubsPerBar;
      const beatIdx = Math.floor(idx / subdivision);
      const subIdx = idx % subdivision;

      setActiveBeat(beatIdx);
      setActiveSub(subIdx);

      if (subIdx === 0) {
        if (beatIdx === 0 && accentDownbeat) {
          audioEngine.playMetronomeClick('accent');
        } else {
          audioEngine.playMetronomeClick('beat');
        }
      } else {
        audioEngine.playMetronomeClick('subdivision');
      }

      stepCounterRef.current += 1;

      if (stepCounterRef.current % totalSubsPerBar === 0) {
        barsPlayedRef.current += 1;
        setBarCounter(barsPlayedRef.current + 1);
        if (autoSpeedUp && barsPlayedRef.current % 4 === 0) {
          setBpm((prev) => Math.min(220, prev + 2));
        }
      }
    };

    triggerTick();
    const timer = window.setInterval(triggerTick, stepDurationMs);
    return () => window.clearInterval(timer);
  }, [isRunning, bpm, timeSig, subdivision, accentDownbeat, autoSpeedUp, beatsPerBar]);

  const handleTapTempo = () => {
    const now = performance.now();
    const taps = tapTimesRef.current.filter((t) => now - t < 2500);
    taps.push(now);
    tapTimesRef.current = taps;

    if (taps.length >= 2) {
      let sumIntervals = 0;
      for (let i = 1; i < taps.length; i++) {
        sumIntervals += taps[i] - taps[i - 1];
      }
      const avgInterval = sumIntervals / (taps.length - 1);
      const calculatedBpm = Math.round(60000 / avgInterval);
      if (calculatedBpm >= 40 && calculatedBpm <= 220) {
        setBpm(calculatedBpm);
      }
    }
    audioEngine.playMetronomeClick('beat');
  };

  const getTempoMarking = (val: number) => {
    if (val < 65) return 'Largo · Slow Control';
    if (val < 85) return 'Andante · Pocket Groove';
    if (val < 112) return 'Moderato · Studio Mid-Tempo';
    if (val < 145) return 'Allegro · Up-Tempo Drive';
    return 'Presto · High-Speed Chops';
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="mb-6">
        <div className="text-xs text-slate-400 flex items-center gap-2">
          <span>Precision Web Audio Clock</span>
          <span aria-hidden="true">·</span>
          <span>Yamaha DTX452K Practice Companion</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white mt-1">
          Virtual Studio Metronome &amp; Subdivision Trainer
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Main Tempo Console */}
        <div className="lg:col-span-7 rounded-2xl bg-[#111827] border border-slate-800 p-6 flex flex-col justify-between">
          {/* Top BPM Readout & Play Button */}
          <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-slate-800">
            <div>
              <div className="text-xs text-slate-400">{getTempoMarking(bpm)}</div>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-6xl font-bold font-mono tabular-nums text-white">{bpm}</span>
                <span className="text-sm font-mono text-violet-400 font-semibold">BPM</span>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={handleTapTempo}
                className="min-h-[48px] px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-2 transition-colors whitespace-nowrap shrink-0"
              >
                <HandMetal className="w-4 h-4 text-sky-400" />
                <span>Tap Tempo</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  audioEngine.ensureContext();
                  setIsRunning((prev) => !prev);
                }}
                className={`min-h-[48px] px-6 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 ${
                  isRunning
                    ? 'bg-rose-500 hover:bg-rose-400 text-white'
                    : 'bg-violet-600 hover:bg-violet-500 text-white'
                }`}
              >
                {isRunning ? <Square className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                <span>{isRunning ? 'Stop Click' : 'Start Click'}</span>
              </button>
            </div>
          </div>

          {/* Visual Beat Pulse Orbs */}
          <div className="my-6">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-3">
              <span>Live Beat &amp; Subdivision Pulse</span>
              <span className="font-mono tabular-nums">
                Bar {isRunning ? barCounter : 1} · {timeSig}
              </span>
            </div>

            <div className="grid grid-cols-4 sm:grid-cols-7 gap-2.5">
              {Array.from({ length: beatsPerBar }).map((_, bIdx) => {
                const isCurrentBeat = isRunning && activeBeat === bIdx;
                const isBeatOne = bIdx === 0 && accentDownbeat;
                return (
                  <div
                    key={bIdx}
                    className={`rounded-xl border p-3 flex flex-col items-center justify-center transition-all ${
                      isCurrentBeat
                        ? isBeatOne
                          ? 'bg-violet-500/25 border-violet-400 text-violet-200 scale-[1.03]'
                          : 'bg-sky-500/25 border-sky-400 text-sky-200 scale-[1.03]'
                        : 'bg-[#0B0F17] border-slate-800 text-slate-500'
                    }`}
                  >
                    <span className="text-lg font-bold font-mono tabular-nums">{bIdx + 1}</span>
                    <div className="flex items-center gap-1 mt-1.5">
                      {Array.from({ length: subdivision }).map((__, sIdx) => (
                        <span
                          key={sIdx}
                          className={`w-1.5 h-1.5 rounded-full ${
                            isCurrentBeat && activeSub === sIdx
                              ? isBeatOne && sIdx === 0
                                ? 'bg-violet-400'
                                : 'bg-sky-400'
                              : 'bg-slate-700'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Tempo Slider & Step Buttons */}
          <div className="space-y-3 pt-4 border-t border-slate-800">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <label htmlFor="metronome-bpm-slider">Tempo Range: 40 – 220 BPM</label>
              <span className="font-mono tabular-nums text-slate-200">Current: {bpm} BPM</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setBpm((b) => Math.max(40, b - 5))}
                className="min-h-[44px] px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-mono text-slate-200"
              >
                -5
              </button>
              <button
                type="button"
                onClick={() => setBpm((b) => Math.max(40, b - 1))}
                aria-label="Decrease BPM by 1"
                className="min-h-[44px] min-w-[44px] rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-200"
              >
                <Minus className="w-4 h-4" />
              </button>

              <input
                id="metronome-bpm-slider"
                type="range"
                min={40}
                max={220}
                step={1}
                value={bpm}
                onChange={(e) => setBpm(parseInt(e.target.value, 10))}
                className="flex-1 accent-violet-500 cursor-pointer"
              />

              <button
                type="button"
                onClick={() => setBpm((b) => Math.min(220, b + 1))}
                aria-label="Increase BPM by 1"
                className="min-h-[44px] min-w-[44px] rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-200"
              >
                <Plus className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setBpm((b) => Math.min(220, b + 5))}
                className="min-h-[44px] px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-mono text-slate-200"
              >
                +5
              </button>
            </div>
          </div>
        </div>

        {/* Right Configuration Deck */}
        <div className="lg:col-span-5 rounded-2xl bg-[#111827] border border-slate-800 p-6 flex flex-col justify-between space-y-5">
          {/* Time Signature Segmented Selector */}
          <div>
            <div className="text-xs font-semibold text-slate-300 mb-2">Time Signature</div>
            <div className="grid grid-cols-5 gap-1.5 p-1 bg-[#0B0F17] rounded-xl border border-slate-800">
              {(['4/4', '3/4', '6/8', '5/4', '7/8'] as TimeSigOption[]).map((sig) => (
                <button
                  key={sig}
                  type="button"
                  onClick={() => setTimeSig(sig)}
                  className={`min-h-[40px] rounded-lg font-mono text-xs font-semibold transition-colors ${
                    timeSig === sig
                      ? 'bg-violet-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {sig}
                </button>
              ))}
            </div>
          </div>

          {/* Subdivision Segmented Selector */}
          <div>
            <div className="text-xs font-semibold text-slate-300 mb-2">Subdivision Click</div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1 bg-[#0B0F17] rounded-xl border border-slate-800">
              {[
                { val: 1 as SubdivisionOption, label: '1/4 Quarter' },
                { val: 2 as SubdivisionOption, label: '1/8 Eighth' },
                { val: 3 as SubdivisionOption, label: '1/8T Triplet' },
                { val: 4 as SubdivisionOption, label: '1/16 Sixteenth' },
              ].map((opt) => (
                <button
                  key={opt.val}
                  type="button"
                  onClick={() => setSubdivision(opt.val)}
                  className={`min-h-[40px] px-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                    subdivision === opt.val
                      ? 'bg-sky-500 text-slate-950'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Click Volume Slider */}
          <div>
            <div className="flex items-center justify-between text-xs text-slate-300 mb-2">
              <label htmlFor="metro-vol-slider" className="flex items-center gap-1.5">
                <Volume2 className="w-4 h-4 text-violet-400" />
                <span>Metronome Click Volume</span>
              </label>
              <span className="font-mono tabular-nums">{Math.round(metronomeVolume * 100)}%</span>
            </div>
            <input
              id="metro-vol-slider"
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={metronomeVolume}
              onChange={(e) => onChangeMetronomeVolume(parseFloat(e.target.value))}
              className="w-full accent-violet-500 cursor-pointer"
            />
          </div>

          {/* Toggles: Accent Beat 1 & Auto Speed-Up Trainer */}
          <div className="space-y-2.5 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setAccentDownbeat((prev) => !prev)}
              className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#0B0F17] border border-slate-800 flex items-center justify-between text-xs"
            >
              <span className="text-slate-300 font-medium">Accent Beat 1 Downbeat (1320 Hz)</span>
              <span
                className={`font-mono font-semibold ${
                  accentDownbeat ? 'text-emerald-400' : 'text-slate-500'
                }`}
              >
                {accentDownbeat ? 'ENABLED' : 'OFF'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setAutoSpeedUp((prev) => !prev)}
              className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#0B0F17] border border-slate-800 flex items-center justify-between text-xs"
            >
              <span className="text-slate-300 font-medium flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-sky-400" />
                <span>Speed Trainer (+2 BPM every 4 bars)</span>
              </span>
              <span
                className={`font-mono font-semibold ${
                  autoSpeedUp ? 'text-sky-400' : 'text-slate-500'
                }`}
              >
                {autoSpeedUp ? 'ACTIVE' : 'OFF'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
