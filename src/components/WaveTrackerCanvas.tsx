import React, { useEffect, useRef } from 'react';
import { EvaluatedStepHit, Lesson } from '../types/drums';
import { YAMAHA_DTX452K_PADS, getStepCountLabel } from '../data/dtx452kConfig';
import { Mic, MicOff, Sliders } from 'lucide-react';

interface WaveTrackerCanvasProps {
  lesson: Lesson;
  bpm: number;
  isPlaying: boolean;
  loopForever: boolean;
  countInBeat?: { current: number; total: number } | null;
  isMicEnabled: boolean;
  micThreshold: number;
  latencyOffsetMs: number;
  currentStepIndex: number;
  currentBar: number;
  latestWaveform: Float32Array | null;
  latestPeak: number;
  recentHits: EvaluatedStepHit[];
  lastHitFeedback: EvaluatedStepHit | null;
  onToggleMic: () => void;
  onChangeThreshold: (val: number) => void;
  onChangeLatency: (val: number) => void;
  compactLandscape?: boolean;
}

export const WaveTrackerCanvas: React.FC<WaveTrackerCanvasProps> = ({
  lesson,
  bpm,
  isPlaying,
  loopForever,
  countInBeat = null,
  isMicEnabled,
  micThreshold,
  latencyOffsetMs,
  currentStepIndex,
  currentBar,
  latestWaveform,
  latestPeak,
  recentHits,
  lastHitFeedback,
  onToggleMic,
  onChangeThreshold,
  onChangeLatency,
  compactLandscape = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const envelopeHistoryRef = useRef<Array<{ peak: number; triggered: boolean }>>(
    Array.from({ length: 180 }, () => ({ peak: 0.01, triggered: false }))
  );

  // Push latest peak into rolling envelope buffer
  useEffect(() => {
    const hist = envelopeHistoryRef.current;
    hist.push({
      peak: Math.min(1, latestPeak),
      triggered: latestPeak >= micThreshold,
    });
    if (hist.length > 180) {
      hist.shift();
    }
  }, [latestPeak, micThreshold, currentStepIndex]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const width = rect.width || 1100;
    const height = rect.height || (compactLandscape ? 165 : 230);

    if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
      canvas.width = width * dpr;
      canvas.height = height * dpr;
    }
    ctx.save();
    ctx.scale(dpr, dpr);

    // Background clear
    ctx.fillStyle = '#090D16';
    ctx.fillRect(0, 0, width, height);

    const splitY = Math.floor(height * 0.52);

    // ========================================================================
    // TOP ZONE: REAL-TIME OSCILLOSCOPE WAVEFORM & TRANSIENT ENVELOPE TRACKER
    // ========================================================================
    ctx.strokeStyle = '#1E293B';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, splitY);
    ctx.lineTo(width, splitY);
    ctx.stroke();

    // Draw Threshold Reference Line in top zone
    const threshY = splitY - 6 - Math.min(1, micThreshold) * (splitY - 16);
    ctx.save();
    ctx.strokeStyle = '#8B5CF6';
    ctx.setLineDash([4, 4]);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, threshY);
    ctx.lineTo(width, threshY);
    ctx.stroke();
    ctx.fillStyle = '#A78BFA';
    ctx.font = '600 10px "JetBrains Mono", monospace';
    ctx.fillText(`THRESHOLD ${(micThreshold * 100).toFixed(0)}%`, 8, Math.max(12, threshY - 4));
    ctx.restore();

    // Draw Rolling Transient Envelope Bars across Top Half
    const hist = envelopeHistoryRef.current;
    const barW = width / hist.length;
    for (let i = 0; i < hist.length; i++) {
      const item = hist[i];
      const barH = Math.max(2, item.peak * (splitY - 14));
      const x = i * barW;
      const y = splitY - 4 - barH;
      ctx.fillStyle = item.triggered ? 'rgba(139, 92, 246, 0.6)' : 'rgba(14, 165, 233, 0.25)';
      ctx.fillRect(x, y, Math.max(1.5, barW - 1), barH);
    }

    // Overlay Live High-Speed Time-Domain Oscilloscope Trace
    if (latestWaveform && latestWaveform.length > 0) {
      ctx.save();
      ctx.strokeStyle = latestPeak >= micThreshold ? '#C4B5FD' : '#38BDF8';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      const midWaveY = splitY * 0.5;
      const sliceWidth = width / 256;
      for (let i = 0; i < 256; i++) {
        const sample = latestWaveform[i * 2] || 0;
        const x = i * sliceWidth;
        const y = midWaveY + sample * (splitY * 0.42);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.restore();
    }

    // ========================================================================
    // BOTTOM ZONE: RHYTHM STEP GRID & LIVE TIMING ACCURACY MARKERS
    // ========================================================================
    const bottomH = height - splitY;
    const stepsPerBar = lesson.stepsPerBar;
    const cellW = width / stepsPerBar;

    for (let s = 0; s < stepsPerBar; s++) {
      const cellX = s * cellW;
      const isCurrentStep = isPlaying && s === currentStepIndex;
      const stepEvent = lesson.pattern.find((p) => p.stepIndex === s);
      const isDownbeat =
        stepsPerBar === 16 ? s % 4 === 0 : stepsPerBar === 12 ? s % 3 === 0 : s % 2 === 0;

      // Highlight active step column
      if (isCurrentStep) {
        ctx.fillStyle = 'rgba(14, 165, 233, 0.18)';
        ctx.fillRect(cellX, splitY + 1, cellW, bottomH - 1);
      } else if (isDownbeat) {
        ctx.fillStyle = 'rgba(30, 41, 59, 0.35)';
        ctx.fillRect(cellX, splitY + 1, cellW, bottomH - 1);
      }

      // Vertical subdivision divider
      ctx.strokeStyle = isDownbeat ? '#334155' : '#1E293B';
      ctx.lineWidth = isDownbeat ? 1.2 : 0.7;
      ctx.beginPath();
      ctx.moveTo(cellX, splitY + 1);
      ctx.lineTo(cellX, height);
      ctx.stroke();

      // Count Label at top of bottom zone
      const countText = getStepCountLabel(s, stepsPerBar, lesson.timeSignature);
      ctx.fillStyle = isCurrentStep ? '#38BDF8' : isDownbeat ? '#E2E8F0' : '#64748B';
      ctx.font = `${isDownbeat ? '700' : '500'} 11px "JetBrains Mono", monospace`;
      ctx.fillText(countText, cellX + 6, splitY + 16);

      // Expected Pad Badges inside Step Slot
      if (stepEvent) {
        stepEvent.pads.forEach((padId, idx) => {
          const padCfg = YAMAHA_DTX452K_PADS[padId];
          const badgeY = splitY + 24 + idx * 21;
          if (badgeY + 17 < height - 18) {
            ctx.fillStyle = isCurrentStep ? padCfg.color : '#1E293B';
            ctx.strokeStyle = padCfg.color;
            ctx.lineWidth = 1.3;
            ctx.beginPath();
            ctx.roundRect(cellX + 4, badgeY, Math.max(24, cellW - 8), 17, 4);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = '#FFFFFF';
            ctx.font = '700 10px "JetBrains Mono", monospace';
            ctx.fillText(padCfg.shortLabel, cellX + 9, badgeY + 12);
          }
        });
      }

      // Evaluated Accuracy Marker for this step in current or recent bar
      const evaluated = [...recentHits]
        .reverse()
        .find((h) => h.stepIndex === s && (h.barNumber === currentBar || h.barNumber === currentBar - 1));

      if (evaluated) {
        const markerY = height - 14;
        let symbol = '●';
        let color = '#10B981';
        if (evaluated.rating === 'PERFECT') {
          symbol = '●';
          color = '#10B981';
        } else if (evaluated.rating === 'GOOD') {
          symbol = '◆';
          color = '#38BDF8';
        } else if (evaluated.rating === 'EARLY') {
          symbol = '▲';
          color = '#A78BFA';
        } else if (evaluated.rating === 'LATE') {
          symbol = '▼';
          color = '#F97316';
        } else {
          symbol = '×';
          color = '#EF4444';
        }
        ctx.fillStyle = color;
        ctx.font = '700 10px "JetBrains Mono", monospace';
        const offsetStr =
          evaluated.offsetMs !== undefined
            ? `${evaluated.offsetMs > 0 ? '+' : ''}${Math.round(evaluated.offsetMs)}ms`
            : 'MISS';
        ctx.fillText(`${symbol}${cellW > 46 ? ' ' + offsetStr : ''}`, cellX + 4, markerY);
      }
    }

    ctx.restore();
  }, [
    lesson,
    bpm,
    isPlaying,
    micThreshold,
    currentStepIndex,
    currentBar,
    latestWaveform,
    latestPeak,
    recentHits,
    compactLandscape,
  ]);

  const formatRatingBadge = (hit: EvaluatedStepHit | null) => {
    if (countInBeat) {
      return {
        text: `● COUNT-IN: BEAT ${countInBeat.current} / ${countInBeat.total}`,
        colorClass: 'text-violet-400',
      };
    }
    if (!hit) {
      return {
        text: isMicEnabled ? 'MIC LISTENING · STRIKE PAD' : 'TAP PAD / ENABLE MIC',
        colorClass: 'text-slate-400',
      };
    }
    const offsetStr =
      hit.offsetMs !== undefined ? `${hit.offsetMs > 0 ? '+' : ''}${Math.round(hit.offsetMs)}ms` : '';
    switch (hit.rating) {
      case 'PERFECT':
        return { text: `● PERFECT (${offsetStr})`, colorClass: 'text-emerald-400' };
      case 'GOOD':
        return { text: `◆ GOOD (${offsetStr})`, colorClass: 'text-sky-400' };
      case 'EARLY':
        return { text: `▲ EARLY (${offsetStr})`, colorClass: 'text-violet-400' };
      case 'LATE':
        return { text: `▼ LATE (${offsetStr})`, colorClass: 'text-orange-400' };
      case 'MISSED':
        return { text: '× MISSED BEAT', colorClass: 'text-rose-400' };
    }
  };

  const feedbackDisplay = formatRatingBadge(lastHitFeedback);

  return (
    <div className="w-full rounded-xl bg-[#111827] border border-slate-800 p-3">
      {/* Header Row: Wave Status & Live Timing Readout */}
      <div className="min-h-[40px] flex items-center justify-between gap-2 mb-2 overflow-hidden whitespace-nowrap">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onToggleMic}
            className={`min-h-[40px] px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 ${
              isMicEnabled
                ? 'bg-violet-600 text-white hover:bg-violet-500'
                : 'bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700'
            }`}
          >
            {isMicEnabled ? <Mic className="w-3.5 h-3.5" /> : <MicOff className="w-3.5 h-3.5" />}
            <span>{isMicEnabled ? 'Mic Feedback: Active' : 'Enable Mic Feedback'}</span>
          </button>

          <div className="text-xs text-slate-400 hidden sm:flex items-center gap-2 shrink-0">
            <span>Wave Peak:</span>
            <span className="font-mono tabular-nums text-slate-200 inline-block w-9 text-right">
              {(latestPeak * 100).toFixed(0)}%
            </span>
            <span aria-hidden="true">·</span>
            <span>
              Bar <strong className="font-mono tabular-nums text-slate-200">{currentBar}</strong> /{' '}
              <span className="font-mono tabular-nums">
                {loopForever ? '∞' : lesson.barsToComplete}
              </span>
            </span>
          </div>
        </div>

        {/* Semantic Non-Hue-Only Timing Accuracy Readout */}
        <div className={`font-mono text-xs font-bold tabular-nums shrink-0 ${feedbackDisplay.colorClass}`}>
          {feedbackDisplay.text}
        </div>
      </div>

      {/* Oscilloscope & Synchronized Step Wave Canvas */}
      <div className="relative w-full overflow-hidden rounded-lg border border-slate-800/90 bg-[#090D16]">
        <canvas
          ref={canvasRef}
          className={`w-full block ${compactLandscape ? 'h-[165px]' : 'h-[230px]'}`}
        />
        {countInBeat && (
          <div className="absolute inset-0 bg-[#090D16]/75 backdrop-blur-[2px] flex flex-col items-center justify-center pointer-events-none">
            <div className="text-xs font-mono font-semibold text-slate-300 tracking-wide">
              1-BAR COUNT-IN · GET STICKS READY FOR BEAT 1
            </div>
            <div className="flex items-center gap-3 mt-2">
              {Array.from({ length: countInBeat.total }).map((_, idx) => {
                const beatNum = idx + 1;
                const isActive = beatNum === countInBeat.current;
                const isPassed = beatNum < countInBeat.current;
                return (
                  <div
                    key={beatNum}
                    className={`w-10 h-10 rounded-xl font-mono text-lg font-bold tabular-nums flex items-center justify-center border transition-transform ${
                      isActive
                        ? 'bg-violet-600 border-violet-300 text-white scale-110'
                        : isPassed
                        ? 'bg-violet-500/20 border-violet-500/50 text-violet-300'
                        : 'bg-slate-900 border-slate-700 text-slate-500'
                    }`}
                  >
                    {beatNum}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Labeled Calibration Sliders (Threshold & Latency Compensation) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2.5 pt-2 border-t border-slate-800/80 text-xs">
        <div className="flex items-center justify-between gap-3">
          <label
            htmlFor="mic-threshold-slider"
            className="text-slate-400 flex items-center gap-1.5 whitespace-nowrap shrink-0"
          >
            <Sliders className="w-3.5 h-3.5 text-violet-400" />
            <span>Mic Trigger Threshold:</span>
            <span className="font-mono tabular-nums text-slate-200 font-semibold">
              {(micThreshold * 100).toFixed(0)}%
            </span>
          </label>
          <input
            id="mic-threshold-slider"
            type="range"
            min={0.04}
            max={0.45}
            step={0.01}
            value={micThreshold}
            onChange={(e) => onChangeThreshold(parseFloat(e.target.value))}
            className="w-full max-w-[160px] accent-violet-500 cursor-pointer"
          />
        </div>

        <div className="flex items-center justify-between gap-3">
          <label
            htmlFor="mic-latency-slider"
            className="text-slate-400 flex items-center gap-1.5 whitespace-nowrap shrink-0"
          >
            <span>Mic Latency Offset:</span>
            <span className="font-mono tabular-nums text-slate-200 font-semibold">
              {latencyOffsetMs > 0 ? `+${latencyOffsetMs}` : latencyOffsetMs} ms
            </span>
          </label>
          <input
            id="mic-latency-slider"
            type="range"
            min={-60}
            max={180}
            step={5}
            value={latencyOffsetMs}
            onChange={(e) => onChangeLatency(parseInt(e.target.value, 10))}
            className="w-full max-w-[160px] accent-sky-500 cursor-pointer"
          />
        </div>
      </div>
    </div>
  );
};
