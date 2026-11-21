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
    const height = rect.height || (compactLandscape ? 330 : 460);

    if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
      canvas.width = width * dpr;
      canvas.height = height * dpr;
    }
    ctx.save();
    ctx.scale(dpr, dpr);

    // Background clear
    ctx.fillStyle = '#090D16';
    ctx.fillRect(0, 0, width, height);

    const splitY = Math.floor(height * 0.34);

    // ========================================================================
    // TOP ZONE: REAL-TIME OSCILLOSCOPE WAVEFORM & TRANSIENT ENVELOPE TRACKER
    // ========================================================================
    ctx.strokeStyle = '#1E293B';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, splitY);
    ctx.lineTo(width, splitY);
    ctx.stroke();

    // Draw Threshold Reference Line in top zone
    const threshY = splitY - 6 - Math.min(1, micThreshold) * (splitY - 20);
    ctx.save();
    ctx.strokeStyle = '#8B5CF6';
    ctx.setLineDash([5, 5]);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, threshY);
    ctx.lineTo(width, threshY);
    ctx.stroke();
    ctx.fillStyle = '#C4B5FD';
    ctx.font = '700 11.5px "JetBrains Mono", monospace';
    ctx.fillText(`THRESHOLD ${(micThreshold * 100).toFixed(0)}%`, 10, Math.max(14, threshY - 6));
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

      // Count Label Header Bar at top of bottom zone
      const countHeaderH = compactLandscape ? 28 : 36;
      ctx.fillStyle = isCurrentStep
        ? 'rgba(139, 92, 246, 0.28)'
        : isDownbeat
        ? 'rgba(30, 41, 59, 0.65)'
        : 'rgba(15, 23, 42, 0.55)';
      ctx.fillRect(cellX + 1, splitY + 1, cellW - 2, countHeaderH);

      const countText = getStepCountLabel(s, stepsPerBar, lesson.timeSignature);
      ctx.fillStyle = isCurrentStep ? '#DDD6FE' : isDownbeat ? '#F8FAFC' : '#94A3B8';
      ctx.font = `${isDownbeat || isCurrentStep ? '800' : '600'} ${
        compactLandscape ? '13px' : '15px'
      } "JetBrains Mono", monospace`;
      ctx.fillText(countText, cellX + 10, splitY + (compactLandscape ? 19 : 24));

      // Expected Numbered Pad Badges inside Step Slot
      if (stepEvent) {
        const badgeH = compactLandscape ? 32 : 44;
        const badgeGap = compactLandscape ? 38 : 52;
        const startY = splitY + countHeaderH + (compactLandscape ? 8 : 12);

        stepEvent.pads.forEach((padId, idx) => {
          const padCfg = YAMAHA_DTX452K_PADS[padId];
          const badgeY = startY + idx * badgeGap;
          const badgeW = Math.max(32, cellW - 12);
          const badgeX = cellX + 6;

          if (badgeY + badgeH < height - 34) {
            // Outer Pad Badge Card
            ctx.fillStyle = isCurrentStep ? padCfg.color : '#151E30';
            ctx.strokeStyle = isCurrentStep ? '#FFFFFF' : padCfg.color;
            ctx.lineWidth = isCurrentStep ? 2.2 : 1.6;
            ctx.beginPath();
            ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 7);
            ctx.fill();
            ctx.stroke();

            // Left Number Pill Box (#1, #2, #3...)
            const numBoxW = Math.min(badgeW - 6, compactLandscape ? 28 : 34);
            ctx.fillStyle = isCurrentStep ? 'rgba(9, 13, 22, 0.35)' : padCfg.color;
            ctx.beginPath();
            ctx.roundRect(badgeX + 3, badgeY + 3, numBoxW, badgeH - 6, 5);
            ctx.fill();

            ctx.fillStyle = '#FFFFFF';
            ctx.font = `800 ${compactLandscape ? '11.5px' : '13px'} "JetBrains Mono", monospace`;
            ctx.fillText(
              `#${padCfg.kitNumber}`,
              badgeX + (padCfg.kitNumber >= 10 ? 5 : 8),
              badgeY + badgeH / 2 + (compactLandscape ? 4 : 4.5)
            );

            // Right Text: Short Code + Friendly Drum Name
            const textStartX = badgeX + numBoxW + 8;
            const remainingW = badgeW - numBoxW - 10;

            if (remainingW >= 78 && !compactLandscape) {
              // Two-line clear readout: Short Code + Full Friendly Name
              ctx.fillStyle = '#FFFFFF';
              ctx.font = '800 12.5px "JetBrains Mono", monospace';
              ctx.fillText(padCfg.shortLabel, textStartX, badgeY + 18);

              ctx.fillStyle = isCurrentStep ? '#F8FAFC' : '#CBD5E1';
              ctx.font = '600 11px "Plus Jakarta Sans", sans-serif';
              ctx.fillText(padCfg.friendlyName, textStartX, badgeY + 34);
            } else if (remainingW >= 44) {
              // Single-line readout: Short Code (and friendly name if wide enough)
              ctx.fillStyle = '#FFFFFF';
              ctx.font = `700 ${compactLandscape ? '11px' : '12.5px'} "JetBrains Mono", monospace`;
              const displayLabel =
                remainingW >= 86
                  ? `${padCfg.shortLabel} · ${padCfg.friendlyName}`
                  : padCfg.shortLabel;
              ctx.fillText(
                displayLabel,
                textStartX,
                badgeY + badgeH / 2 + (compactLandscape ? 4 : 4.5)
              );
            }
          }
        });
      }

      // Evaluated Accuracy Marker at bottom of this step column
      const evaluated = [...recentHits]
        .reverse()
        .find((h) => h.stepIndex === s && (h.barNumber === currentBar || h.barNumber === currentBar - 1));

      if (evaluated) {
        const footerH = compactLandscape ? 24 : 30;
        const footerY = height - footerH - 4;
        let symbol = '●';
        let color = '#10B981';
        let bgFill = 'rgba(16, 185, 129, 0.16)';
        if (evaluated.rating === 'PERFECT') {
          symbol = '●';
          color = '#34D399';
          bgFill = 'rgba(16, 185, 129, 0.18)';
        } else if (evaluated.rating === 'GOOD') {
          symbol = '◆';
          color = '#38BDF8';
          bgFill = 'rgba(56, 189, 248, 0.18)';
        } else if (evaluated.rating === 'EARLY') {
          symbol = '▲';
          color = '#C4B5FD';
          bgFill = 'rgba(139, 92, 246, 0.2)';
        } else if (evaluated.rating === 'LATE') {
          symbol = '▼';
          color = '#FB923C';
          bgFill = 'rgba(249, 115, 22, 0.18)';
        } else {
          symbol = '×';
          color = '#F87171';
          bgFill = 'rgba(239, 68, 68, 0.18)';
        }

        ctx.fillStyle = bgFill;
        ctx.beginPath();
        ctx.roundRect(cellX + 5, footerY, Math.max(20, cellW - 10), footerH, 5);
        ctx.fill();

        ctx.fillStyle = color;
        ctx.font = `700 ${compactLandscape ? '10.5px' : '12px'} "JetBrains Mono", monospace`;
        const offsetStr =
          evaluated.offsetMs !== undefined
            ? `${evaluated.offsetMs > 0 ? '+' : ''}${Math.round(evaluated.offsetMs)}ms`
            : 'MISS';
        const ratingShort =
          cellW >= 120
            ? `${symbol} ${evaluated.rating} ${offsetStr !== 'MISS' ? offsetStr : ''}`
            : `${symbol}${cellW > 50 ? ' ' + offsetStr : ''}`;
        ctx.fillText(ratingShort.trim(), cellX + 10, footerY + footerH / 2 + 4);
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

      {/* Beginner Kit Number Key Strip: Maps #1, #2, #3... to Drum Names & Abbreviations */}
      <div className="flex flex-wrap items-center gap-2 mb-2.5 px-2.5 py-2 rounded-lg bg-[#0B0F17] border border-slate-800/90 text-xs">
        <span className="text-slate-400 font-semibold shrink-0">Kit Number Key:</span>
        {[...lesson.focusPads]
          .sort((a, b) => YAMAHA_DTX452K_PADS[a].kitNumber - YAMAHA_DTX452K_PADS[b].kitNumber)
          .map((padId) => {
            const cfg = YAMAHA_DTX452K_PADS[padId];
            return (
              <div
                key={padId}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#131B2B] border border-slate-800"
              >
                <span
                  className="px-1.5 py-0.5 rounded font-mono text-[11px] font-extrabold text-white"
                  style={{ backgroundColor: cfg.color }}
                >
                  #{cfg.kitNumber}
                </span>
                <span className="font-mono font-bold text-white">{cfg.shortLabel}</span>
                <span className="text-slate-400">= {cfg.friendlyName}</span>
              </div>
            );
          })}
      </div>

      {/* Double-Height Oscilloscope & Synchronized Numbered Step Accuracy Canvas */}
      <div className="relative w-full overflow-hidden rounded-lg border border-slate-800/90 bg-[#090D16]">
        <canvas
          ref={canvasRef}
          className={`w-full block ${compactLandscape ? 'h-[330px]' : 'h-[460px]'}`}
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
