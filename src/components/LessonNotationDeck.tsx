import React from 'react';
import { DrumPadId, EvaluatedStepHit, Lesson } from '../types/drums';
import { YAMAHA_DTX452K_PADS, getStepCountLabel } from '../data/dtx452kConfig';
import { ChevronLeft, ChevronRight, Volume2, VolumeX, CheckCircle, Repeat } from 'lucide-react';

interface LessonNotationDeckProps {
  lesson: Lesson;
  currentStepIndex: number;
  currentBar: number;
  isPlaying: boolean;
  loopForever: boolean;
  bpm: number;
  demoAudioEnabled: boolean;
  metronomeClickEnabled: boolean;
  bestScore: number | null;
  sessionCount: number;
  recentHits: EvaluatedStepHit[];
  onChangeBpm: (newBpm: number) => void;
  onToggleDemoAudio: () => void;
  onToggleMetronomeClick: () => void;
  onToggleLoopForever: () => void;
  onPrevLesson: () => void;
  onNextLesson: () => void;
  onTriggerPad: (padId: DrumPadId) => void;
}

export const LessonNotationDeck: React.FC<LessonNotationDeckProps> = ({
  lesson,
  currentStepIndex,
  currentBar,
  isPlaying,
  loopForever,
  bpm,
  demoAudioEnabled,
  metronomeClickEnabled,
  bestScore,
  sessionCount,
  recentHits,
  onChangeBpm,
  onToggleDemoAudio,
  onToggleMetronomeClick,
  onToggleLoopForever,
  onPrevLesson,
  onNextLesson,
  onTriggerPad,
}) => {
  const itemNum = lesson.isSong ? lesson.songNumber || lesson.id - 100 : lesson.id;
  const isFirstItem = itemNum <= 1;
  const isLastItem = itemNum >= 30;

  return (
    <div className="w-full space-y-4">
      {/* Lesson / Song Selector & Metadata Card */}
      <div className="rounded-xl bg-[#111827] border border-slate-800 p-4">
        <div className="flex items-center justify-between gap-2 text-xs text-slate-400">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="shrink-0">
              {lesson.isSong ? 'Song' : 'Lesson'} {String(itemNum).padStart(2, '0')} of 30
            </span>
            <span aria-hidden="true">·</span>
            <span className="truncate text-violet-400 font-medium">
              {lesson.isSong && lesson.artist
                ? `${lesson.artist}${lesson.year ? ` (${lesson.year})` : ''}`
                : lesson.tierName.split(':')[0]}
            </span>
            <span aria-hidden="true">·</span>
            <span className="font-mono shrink-0">{lesson.timeSignature}</span>
          </div>

          <div className="flex items-center gap-1.5 font-mono tabular-nums shrink-0">
            {bestScore !== null ? (
              <span className="text-emerald-400 font-semibold flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5" />
                <span>
                  Best: {bestScore}% ({sessionCount}x)
                </span>
              </span>
            ) : (
              <span className="text-slate-500">Unscored</span>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 mt-2">
          <button
            type="button"
            onClick={onPrevLesson}
            disabled={isFirstItem}
            aria-label={lesson.isSong ? 'Previous Song' : 'Previous Lesson'}
            className="min-h-[40px] min-w-[40px] rounded-lg bg-slate-800/80 hover:bg-slate-700 disabled:opacity-35 flex items-center justify-center text-slate-200 transition-colors shrink-0"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="flex-1 min-w-0 px-1">
            <h2 className="text-base sm:text-lg font-bold text-white truncate">
              {String(itemNum).padStart(2, '0')}.{' '}
              {lesson.isSong && lesson.artist ? `${lesson.artist} — ${lesson.title}` : lesson.title}
            </h2>
            <p className="text-xs text-slate-400 line-clamp-2 mt-0.5">{lesson.subtitle}</p>
          </div>

          <button
            type="button"
            onClick={onNextLesson}
            disabled={isLastItem}
            aria-label={lesson.isSong ? 'Next Song' : 'Next Lesson'}
            className="min-h-[40px] min-w-[40px] rounded-lg bg-slate-800/80 hover:bg-slate-700 disabled:opacity-35 flex items-center justify-center text-slate-200 transition-colors shrink-0"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Practice Tempo & Audio Guide Controls */}
        <div className="mt-3 pt-3 border-t border-slate-800/80 space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <label htmlFor="lesson-bpm-slider" className="text-slate-400">
              Practice Tempo:{' '}
              <strong className="font-mono tabular-nums text-white">{bpm} BPM</strong>{' '}
              <span className="text-slate-500">(Target: {lesson.bpm} BPM)</span>
            </label>
            {bpm !== lesson.bpm && (
              <button
                type="button"
                onClick={() => onChangeBpm(lesson.bpm)}
                className="text-violet-400 hover:underline font-medium"
              >
                Reset to {lesson.bpm}
              </button>
            )}
          </div>

          <input
            id="lesson-bpm-slider"
            type="range"
            min={Math.max(40, lesson.minBpm - 10)}
            max={Math.min(200, lesson.maxBpm + 20)}
            step={1}
            value={bpm}
            onChange={(e) => onChangeBpm(parseInt(e.target.value, 10))}
            className="w-full accent-violet-500 cursor-pointer"
          />

          <div className="grid grid-cols-3 gap-2 pt-1">
            <button
              type="button"
              onClick={onToggleDemoAudio}
              className={`min-h-[40px] px-2.5 py-1.5 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap ${
                demoAudioEnabled
                  ? 'bg-sky-500/15 border-sky-500/60 text-sky-300'
                  : 'bg-[#0B0F17] border-slate-800 text-slate-400'
              }`}
            >
              {demoAudioEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
              <span>Guide Drums: {demoAudioEnabled ? 'ON' : 'OFF'}</span>
            </button>

            <button
              type="button"
              onClick={onToggleMetronomeClick}
              className={`min-h-[40px] px-2.5 py-1.5 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap ${
                metronomeClickEnabled
                  ? 'bg-violet-500/15 border-violet-500/60 text-violet-300'
                  : 'bg-[#0B0F17] border-slate-800 text-slate-400'
              }`}
            >
              {metronomeClickEnabled ? (
                <Volume2 className="w-3.5 h-3.5" />
              ) : (
                <VolumeX className="w-3.5 h-3.5" />
              )}
              <span>Metronome: {metronomeClickEnabled ? 'ON' : 'OFF'}</span>
            </button>

            <button
              type="button"
              onClick={onToggleLoopForever}
              className={`min-h-[40px] px-2.5 py-1.5 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap ${
                loopForever
                  ? 'bg-emerald-500/15 border-emerald-500/60 text-emerald-300'
                  : 'bg-[#0B0F17] border-slate-800 text-slate-400'
              }`}
            >
              <Repeat className="w-3.5 h-3.5" />
              <span>Loop Forever: {loopForever ? 'ON' : 'OFF'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Multi-Track Step Sequencer Notation Grid */}
      <div className="rounded-xl bg-[#111827] border border-slate-800 p-4">
        <div className="flex items-center justify-between text-xs text-slate-400 mb-2.5">
          <span className="font-semibold text-slate-200">
            Step Pattern Matrix ({lesson.subdivisionLabel})
          </span>
          <span className="font-mono tabular-nums">
            Bar {currentBar} / {loopForever ? '∞' : lesson.barsToComplete}
          </span>
        </div>

        <div className="overflow-x-auto pb-1">
          <div className="min-w-[440px]">
            {/* Top Subdivision Count Header */}
            <div
              className="grid gap-1 mb-1.5 items-center"
              style={{
                gridTemplateColumns: `84px repeat(${lesson.stepsPerBar}, minmax(22px, 1fr))`,
              }}
            >
              <div className="text-[10px] font-mono text-slate-500">PAD / COUNT</div>
              {Array.from({ length: lesson.stepsPerBar }).map((_, sIdx) => {
                const label = getStepCountLabel(sIdx, lesson.stepsPerBar, lesson.timeSignature);
                const isCurrent = isPlaying && currentStepIndex === sIdx;
                const isDownbeat =
                  lesson.stepsPerBar === 16
                    ? sIdx % 4 === 0
                    : lesson.stepsPerBar === 12
                    ? sIdx % 3 === 0
                    : sIdx % 2 === 0;
                return (
                  <div
                    key={sIdx}
                    className={`text-center font-mono text-[10px] py-0.5 rounded ${
                      isCurrent
                        ? 'bg-violet-600 text-white font-bold'
                        : isDownbeat
                        ? 'text-slate-200 font-bold'
                        : 'text-slate-500'
                    }`}
                  >
                    {label}
                  </div>
                );
              })}
            </div>

            {/* Row for Each Active Focus Pad in Lesson */}
            <div className="space-y-1">
              {lesson.focusPads.map((padId) => {
                const padCfg = YAMAHA_DTX452K_PADS[padId];
                return (
                  <div
                    key={padId}
                    className="grid gap-1 items-center"
                    style={{
                      gridTemplateColumns: `84px repeat(${lesson.stepsPerBar}, minmax(22px, 1fr))`,
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => onTriggerPad(padId)}
                      className="text-left text-[11px] font-semibold text-slate-300 hover:text-white truncate flex items-center gap-1 pr-1"
                      title={`${padCfg.name} [${padCfg.keyShortcut}]`}
                    >
                      <span
                        className="w-2 h-2 rounded-sm shrink-0"
                        style={{ backgroundColor: padCfg.color }}
                      />
                      <span className="truncate">{padCfg.shortLabel}</span>
                      <span className="font-mono text-[9px] text-slate-500">
                        [{padCfg.keyShortcut === 'Space' ? 'SPC' : padCfg.keyShortcut}]
                      </span>
                    </button>

                    {Array.from({ length: lesson.stepsPerBar }).map((_, sIdx) => {
                      const stepEvent = lesson.pattern.find((p) => p.stepIndex === sIdx);
                      const hasHit = Boolean(stepEvent?.pads.includes(padId));
                      const isCurrent = isPlaying && currentStepIndex === sIdx;

                      const evalRecord = [...recentHits]
                        .reverse()
                        .find(
                          (h) =>
                            h.stepIndex === sIdx &&
                            (h.barNumber === currentBar || h.barNumber === currentBar - 1)
                        );

                      let cellBorder = 'border-slate-800/80';
                      if (hasHit && evalRecord) {
                        if (evalRecord.rating === 'PERFECT') cellBorder = 'border-emerald-400';
                        else if (evalRecord.rating === 'GOOD') cellBorder = 'border-sky-400';
                        else if (evalRecord.rating === 'MISSED') cellBorder = 'border-rose-500';
                        else cellBorder = 'border-violet-400';
                      }

                      return (
                        <div
                          key={sIdx}
                          className={`h-7 rounded border flex items-center justify-center font-mono text-[9px] transition-all ${cellBorder} ${
                            hasHit
                              ? isCurrent
                                ? 'scale-105 text-white font-bold'
                                : 'text-white font-semibold'
                              : isCurrent
                              ? 'bg-slate-800/60'
                              : 'bg-[#0B0F17]'
                          }`}
                          style={{
                            backgroundColor: hasHit
                              ? isCurrent
                                ? '#8B5CF6'
                                : `${padCfg.color}33`
                              : undefined,
                          }}
                        >
                          {hasHit ? stepEvent?.sticking?.split('+')[0] || '●' : ''}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
