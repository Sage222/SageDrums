import React from 'react';
import { Lesson, SessionRecord } from '../types/drums';
import { RotateCcw, ArrowRight, BarChart3, Award } from 'lucide-react';

interface SessionScoreModalProps {
  session: SessionRecord;
  lesson: Lesson;
  previousBestScore: number | null;
  lessonHistory: SessionRecord[];
  onRetryLesson: () => void;
  onNextLesson: () => void;
  onOpenDashboard: () => void;
  onClose: () => void;
}

export const SessionScoreModal: React.FC<SessionScoreModalProps> = ({
  session,
  lesson,
  previousBestScore,
  lessonHistory,
  onRetryLesson,
  onNextLesson,
  onOpenDashboard,
  onClose,
}) => {
  const isNewBest = previousBestScore === null || session.score > previousBestScore;
  const deltaFromBest = previousBestScore !== null ? session.score - previousBestScore : null;
  const firstSessionScore = lessonHistory.length > 0 ? lessonHistory[0].score : session.score;
  const deltaFromFirst = lessonHistory.length > 1 ? session.score - firstSessionScore : null;

  const getGradeText = (score: number) => {
    if (score >= 92) return 'Studio Master Precision';
    if (score >= 80) return 'Solid Pocket & Lock';
    if (score >= 65) return 'Developing Groove Consistency';
    return 'Keep Practicing Slow Subdivisions';
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="session-score-title"
    >
      <div className="w-full max-w-xl rounded-2xl bg-[#111827] border border-slate-800 p-6 shadow-2xl">
        {/* Header Kicker */}
        <div className="flex items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <div className="text-xs text-slate-400 flex items-center gap-2">
              <span>
                {lesson.isSong
                  ? `Song ${String(lesson.songNumber || lesson.id - 100).padStart(2, '0')} Complete`
                  : `Lesson ${String(lesson.id).padStart(2, '0')} Complete`}
              </span>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums">{session.bpm} BPM</span>
              <span aria-hidden="true">·</span>
              <span>Session #{lessonHistory.length} Saved</span>
            </div>
            <h2 id="session-score-title" className="text-xl font-bold text-white mt-1">
              {lesson.isSong && lesson.artist ? `${lesson.artist} — ${lesson.title}` : lesson.title}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="min-h-[40px] px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-white rounded-lg border border-slate-800 hover:border-slate-700 transition-colors"
          >
            Close
          </button>
        </div>

        {/* Main Score Display & Personal Best Comparison */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-5">
          <div className="rounded-xl bg-[#0B0F17] border border-slate-800/90 p-4 flex flex-col justify-between">
            <span className="text-xs text-slate-400">Retained Session Score</span>
            <div className="my-2 flex items-baseline gap-3">
              <span className="text-5xl font-bold font-mono tabular-nums text-violet-400">
                {session.score}%
              </span>
              {deltaFromBest !== null && (
                <span
                  className={`text-xs font-mono font-semibold tabular-nums ${
                    deltaFromBest >= 0 ? 'text-emerald-400' : 'text-slate-400'
                  }`}
                >
                  {deltaFromBest > 0
                    ? `+${deltaFromBest}% vs Prev Best`
                    : deltaFromBest === 0
                    ? 'Matched Best'
                    : `${deltaFromBest}% vs Best (${previousBestScore}%)`}
                </span>
              )}
            </div>
            <div className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
              <Award className="w-4 h-4 text-violet-400 shrink-0" />
              <span>{isNewBest ? 'New Personal Best Recorded!' : getGradeText(session.score)}</span>
            </div>
          </div>

          {/* Historical Progression across Sessions for this Lesson/Song */}
          <div className="rounded-xl bg-[#0B0F17] border border-slate-800/90 p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>
                {lesson.isSong
                  ? `Song #${lesson.songNumber || lesson.id - 100} Progression`
                  : `Lesson #${lesson.id} Progression`}
              </span>
              {deltaFromFirst !== null && (
                <span
                  className={`font-mono font-semibold tabular-nums ${
                    deltaFromFirst >= 0 ? 'text-emerald-400' : 'text-violet-400'
                  }`}
                >
                  {deltaFromFirst >= 0 ? `+${deltaFromFirst}%` : `${deltaFromFirst}%`} since Session 1
                </span>
              )}
            </div>

            {/* Bar progression chart of the last 8 sessions for this lesson */}
            <div className="h-16 flex items-end gap-1.5 mt-3 pt-2">
              {lessonHistory.slice(-8).map((rec, idx) => {
                const isLatest = rec.id === session.id;
                const barH = Math.max(15, rec.score);
                return (
                  <div key={rec.id} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-[10px] font-mono tabular-nums text-slate-300">
                      {rec.score}%
                    </span>
                    <div className="w-full bg-slate-800/60 rounded-t h-10 flex items-end overflow-hidden">
                      <div
                        className={`w-full rounded-t transition-all ${
                          isLatest ? 'bg-violet-500' : 'bg-sky-500/60'
                        }`}
                        style={{ height: `${barH}%` }}
                      />
                    </div>
                    <span className="text-[9px] font-mono text-slate-500">
                      S{Math.max(1, lessonHistory.length - 7 + idx)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Rhythm Accuracy & Timing Breakdown */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 mb-5">
          <div className="rounded-lg bg-[#0B0F17] border border-slate-800/80 p-2.5">
            <div className="text-[11px] text-emerald-400 font-semibold">● PERFECT</div>
            <div className="text-lg font-bold font-mono tabular-nums text-white mt-0.5">
              {session.perfectCount}
            </div>
            <div className="text-[10px] text-slate-500">Within ±28ms</div>
          </div>
          <div className="rounded-lg bg-[#0B0F17] border border-slate-800/80 p-2.5">
            <div className="text-[11px] text-sky-400 font-semibold">◆ GOOD</div>
            <div className="text-lg font-bold font-mono tabular-nums text-white mt-0.5">
              {session.goodCount}
            </div>
            <div className="text-[10px] text-slate-500">Within ±60ms</div>
          </div>
          <div className="rounded-lg bg-[#0B0F17] border border-slate-800/80 p-2.5">
            <div className="text-[11px] text-violet-400 font-semibold">▲ EARLY</div>
            <div className="text-lg font-bold font-mono tabular-nums text-white mt-0.5">
              {session.earlyCount}
            </div>
            <div className="text-[10px] text-slate-500">Rushed hit</div>
          </div>
          <div className="rounded-lg bg-[#0B0F17] border border-slate-800/80 p-2.5">
            <div className="text-[11px] text-orange-400 font-semibold">▼ LATE</div>
            <div className="text-lg font-bold font-mono tabular-nums text-white mt-0.5">
              {session.lateCount}
            </div>
            <div className="text-[10px] text-slate-500">Dragged hit</div>
          </div>
          <div className="rounded-lg bg-[#0B0F17] border border-slate-800/80 p-2.5 col-span-2 sm:col-span-1">
            <div className="text-[11px] text-rose-400 font-semibold">× MISSED</div>
            <div className="text-lg font-bold font-mono tabular-nums text-white mt-0.5">
              {session.missedCount}
            </div>
            <div className="text-[10px] text-slate-500">Unstruck step</div>
          </div>
        </div>

        {/* Millisecond Timing Telemetry Row */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400 px-1 mb-6">
          <span>
            Average Timing Offset:{' '}
            <strong className="font-mono tabular-nums text-slate-200">
              {session.avgOffsetMs > 0 ? `+${session.avgOffsetMs}` : session.avgOffsetMs} ms
            </strong>{' '}
            ({session.avgOffsetMs < -8 ? 'Slightly Ahead' : session.avgOffsetMs > 8 ? 'Slightly Behind' : 'Dead Center'})
          </span>
          <span aria-hidden="true">·</span>
          <span>
            Absolute Precision:{' '}
            <strong className="font-mono tabular-nums text-slate-200">
              ±{session.avgAbsOffsetMs} ms
            </strong>
          </span>
          <span aria-hidden="true">·</span>
          <span>
            Jitter:{' '}
            <strong className="font-mono tabular-nums text-slate-200">
              {session.consistencyJitterMs} ms
            </strong>
          </span>
        </div>

        {/* Primary Action Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={onRetryLesson}
            className="min-h-[44px] px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-semibold flex items-center gap-2 transition-colors whitespace-nowrap shrink-0"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Retry Lesson to Improve Score</span>
          </button>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onOpenDashboard}
              className="min-h-[44px] px-4 py-2.5 rounded-xl border border-slate-700 hover:border-slate-600 text-slate-200 text-xs font-semibold flex items-center gap-2 transition-colors whitespace-nowrap shrink-0"
            >
              <BarChart3 className="w-4 h-4" />
              <span>View History</span>
            </button>

            {((!lesson.isSong && lesson.id < 30) ||
              (lesson.isSong && (lesson.songNumber || lesson.id - 100) < 30)) && (
              <button
                type="button"
                onClick={onNextLesson}
                className="min-h-[44px] px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold flex items-center gap-2 transition-colors whitespace-nowrap shrink-0"
              >
                <span>
                  Next {lesson.isSong ? 'Song' : 'Lesson'} (
                  {(lesson.isSong ? lesson.songNumber || lesson.id - 100 : lesson.id) + 1}/30)
                </span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
