import React, { useMemo, useState } from 'react';
import { LESSONS } from '../data/lessons';
import { TIER_1_SONGS } from '../data/songs';
import { SessionRecord } from '../types/drums';
import { getLessonBestScore, getLessonFirstToBestDelta, getLessonSessions } from '../utils/storage';
import { Play, Trash2, TrendingUp } from 'lucide-react';

interface ProgressDashboardProps {
  sessions: SessionRecord[];
  currentLessonId: number;
  onSelectLesson: (lessonId: number) => void;
  onClearHistory: () => void;
}

export const ProgressDashboard: React.FC<ProgressDashboardProps> = ({
  sessions,
  currentLessonId,
  onSelectLesson,
  onClearHistory,
}) => {
  // Default chart filter to the current lesson or the most recently practiced lesson
  const defaultInspectLessonId = useMemo(() => {
    if (sessions.length > 0) {
      return sessions[sessions.length - 1].lessonId;
    }
    return currentLessonId;
  }, [sessions, currentLessonId]);

  const [inspectedLessonId, setInspectedLessonId] = useState<number>(defaultInspectLessonId);
  const [confirmClear, setConfirmClear] = useState<boolean>(false);

  const practicedLessonIds = useMemo(() => {
    const set = new Set<number>();
    sessions.forEach((s) => set.add(s.lessonId));
    return Array.from(set).sort((a, b) => a - b);
  }, [sessions]);

  const masteredCount = useMemo(() => {
    return LESSONS.filter((l) => {
      const best = getLessonBestScore(sessions, l.id);
      return best !== null && best >= 85;
    }).length;
  }, [sessions]);

  const overallAvgScore = useMemo(() => {
    if (sessions.length === 0) return 0;
    const sum = sessions.reduce((acc, s) => acc + s.score, 0);
    return Math.round(sum / sessions.length);
  }, [sessions]);

  const overallAvgPrecisionMs = useMemo(() => {
    if (sessions.length === 0) return 0;
    const sum = sessions.reduce((acc, s) => acc + s.avgAbsOffsetMs, 0);
    return Math.round(sum / sessions.length);
  }, [sessions]);

  const allItems = useMemo(() => [...LESSONS, ...TIER_1_SONGS], []);
  const inspectedLesson = allItems.find((l) => l.id === inspectedLessonId) || LESSONS[0];
  const inspectedSessions = useMemo(
    () => getLessonSessions(sessions, inspectedLessonId),
    [sessions, inspectedLessonId]
  );
  const inspectedBest = getLessonBestScore(sessions, inspectedLessonId);
  const inspectedDelta = getLessonFirstToBestDelta(sessions, inspectedLessonId);

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      {/* Header Row */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-xs text-slate-400 flex items-center gap-2">
            <span>Skill Improvement &amp; Rhythm Telemetry</span>
            <span aria-hidden="true">·</span>
            <span>Local Session Persistence Active</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white mt-1">
            Progress Tracking Dashboard
          </h1>
        </div>

        {sessions.length > 0 && (
          <div className="flex items-center gap-2">
            {!confirmClear ? (
              <button
                type="button"
                onClick={() => setConfirmClear(true)}
                className="min-h-[40px] px-3.5 py-2 rounded-xl border border-slate-800 hover:border-rose-500/50 text-xs font-medium text-slate-400 hover:text-rose-300 flex items-center gap-1.5 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Reset Session History</span>
              </button>
            ) : (
              <div className="flex items-center gap-2 bg-rose-950/40 border border-rose-800/80 px-3 py-1.5 rounded-xl">
                <span className="text-xs text-rose-200">Clear all saved scores?</span>
                <button
                  type="button"
                  onClick={() => {
                    onClearHistory();
                    setConfirmClear(false);
                  }}
                  className="px-2.5 py-1 rounded bg-rose-600 text-white text-xs font-semibold"
                >
                  Confirm
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmClear(false)}
                  className="px-2.5 py-1 rounded bg-slate-800 text-slate-300 text-xs"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Top 4 KPI Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl bg-[#111827] border border-slate-800 p-4">
          <div className="text-xs text-slate-400">Lessons Practiced</div>
          <div className="text-3xl font-bold font-mono tabular-nums text-white mt-1">
            {practicedLessonIds.length} <span className="text-base text-slate-500">/ 30</span>
          </div>
          <div className="text-xs text-slate-400 mt-1 font-mono tabular-nums">
            {masteredCount} lessons mastered (≥85%)
          </div>
        </div>

        <div className="rounded-xl bg-[#111827] border border-slate-800 p-4">
          <div className="text-xs text-slate-400">Total Scored Sessions</div>
          <div className="text-3xl font-bold font-mono tabular-nums text-violet-400 mt-1">
            {sessions.length}
          </div>
          <div className="text-xs text-slate-400 mt-1">Retained across individual runs</div>
        </div>

        <div className="rounded-xl bg-[#111827] border border-slate-800 p-4">
          <div className="text-xs text-slate-400">Average Rhythm Score</div>
          <div className="text-3xl font-bold font-mono tabular-nums text-emerald-400 mt-1">
            {sessions.length > 0 ? `${overallAvgScore}%` : '—'}
          </div>
          <div className="text-xs text-slate-400 mt-1">Across all completed sessions</div>
        </div>

        <div className="rounded-xl bg-[#111827] border border-slate-800 p-4">
          <div className="text-xs text-slate-400">Avg Timing Precision</div>
          <div className="text-3xl font-bold font-mono tabular-nums text-sky-400 mt-1">
            {sessions.length > 0 ? `±${overallAvgPrecisionMs} ms` : '—'}
          </div>
          <div className="text-xs text-slate-400 mt-1">Mean deviation from beat center</div>
        </div>
      </div>

      {/* Per-Lesson Session-Over-Session Improvement Analyzer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Lesson Improvement SVG Curve */}
        <div className="lg:col-span-8 rounded-2xl bg-[#111827] border border-slate-800 p-5 flex flex-col justify-between">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-800">
            <div>
              <div className="text-xs text-slate-400 flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-violet-400" />
                <span>Per-Lesson &amp; Song Session Score Progression</span>
              </div>
              <h2 className="text-lg font-bold text-white mt-0.5">
                {inspectedLesson.isSong
                  ? `Song ${String(inspectedLesson.songNumber || inspectedLesson.id - 100).padStart(2, '0')}: ${inspectedLesson.artist} — ${inspectedLesson.title}`
                  : `${String(inspectedLesson.id).padStart(2, '0')}. ${inspectedLesson.title}`}
              </h2>
            </div>

            <div className="flex items-center gap-2">
              <label htmlFor="inspect-lesson-select" className="text-xs text-slate-400 sr-only">
                Select Lesson or Song
              </label>
              <select
                id="inspect-lesson-select"
                value={inspectedLessonId}
                onChange={(e) => setInspectedLessonId(parseInt(e.target.value, 10))}
                className="min-h-[40px] px-3 py-1.5 rounded-xl bg-[#0B0F17] border border-slate-700 text-xs text-slate-200 font-medium max-w-[260px]"
              >
                <optgroup label="30 Step-by-Step Lessons">
                  {LESSONS.map((l) => {
                    const count = getLessonSessions(sessions, l.id).length;
                    const best = getLessonBestScore(sessions, l.id);
                    return (
                      <option key={l.id} value={l.id}>
                        Lesson {String(l.id).padStart(2, '0')}: {l.title}{' '}
                        {best !== null ? `(Best ${best}% · ${count}x)` : '(0 sessions)'}
                      </option>
                    );
                  })}
                </optgroup>
                <optgroup label="Tier 1 Songs (30 Classics & Favorites)">
                  {TIER_1_SONGS.map((s) => {
                    const count = getLessonSessions(sessions, s.id).length;
                    const best = getLessonBestScore(sessions, s.id);
                    const sNum = String(s.songNumber || s.id - 100).padStart(2, '0');
                    return (
                      <option key={s.id} value={s.id}>
                        Song {sNum}: {s.artist} — {s.title}{' '}
                        {best !== null ? `(Best ${best}% · ${count}x)` : '(0 sessions)'}
                      </option>
                    );
                  })}
                </optgroup>
              </select>

              <button
                type="button"
                onClick={() => onSelectLesson(inspectedLesson.id)}
                className="min-h-[40px] px-3.5 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold flex items-center gap-1.5 whitespace-nowrap shrink-0"
              >
                <Play className="w-3.5 h-3.5" />
                <span>{inspectedLesson.isSong ? 'Play Song' : 'Practice Lesson'}</span>
              </button>
            </div>
          </div>

          {/* Chart Body */}
          {inspectedSessions.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm text-slate-300 font-medium">
                No scored sessions recorded yet for{' '}
                {inspectedLesson.isSong
                  ? `${inspectedLesson.artist} — "${inspectedLesson.title}"`
                  : `Lesson ${String(inspectedLesson.id).padStart(2, '0')}`}
                .
              </p>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                Complete a {inspectedLesson.barsToComplete}-bar evaluated run in the Studio to retain your first session score and track your improvement curve over time.
              </p>
              <button
                type="button"
                onClick={() => onSelectLesson(inspectedLesson.id)}
                className="mt-4 min-h-[42px] px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-violet-400 inline-flex items-center gap-2"
              >
                <Play className="w-3.5 h-3.5" />
                <span>
                  Launch {inspectedLesson.isSong ? 'Song' : `Lesson ${String(inspectedLesson.id).padStart(2, '0')}`} in Studio
                </span>
              </button>
            </div>
          ) : (
            <div className="mt-4">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400 mb-3 font-mono tabular-nums">
                <span>
                  Sessions Recorded: <strong className="text-white">{inspectedSessions.length}</strong>
                </span>
                <span>
                  First Session: <strong className="text-slate-200">{inspectedSessions[0].score}%</strong>
                </span>
                <span>
                  Personal Best: <strong className="text-emerald-400">{inspectedBest}%</strong>
                </span>
                {inspectedDelta !== null && (
                  <span>
                    Net Improvement:{' '}
                    <strong className={inspectedDelta >= 0 ? 'text-emerald-400' : 'text-violet-400'}>
                      {inspectedDelta >= 0 ? `+${inspectedDelta}%` : `${inspectedDelta}%`}
                    </strong>
                  </span>
                )}
              </div>

              {/* SVG Line Chart of Session Scores */}
              <div className="w-full rounded-xl bg-[#0B0F17] border border-slate-800/80 p-3">
                <svg viewBox="0 0 600 185" className="w-full h-44 overflow-visible">
                  {/* Horizontal Grid Lines (100%, 75%, 50%, 25%) */}
                  {[100, 75, 50, 25].map((pct) => {
                    const y = 20 + ((100 - pct) / 100) * 130;
                    return (
                      <g key={pct}>
                        <line
                          x1="36"
                          y1={y}
                          x2="580"
                          y2={y}
                          stroke="#1E293B"
                          strokeDasharray="4 4"
                          strokeWidth="1"
                        />
                        <text
                          x="30"
                          y={y + 3}
                          textAnchor="end"
                          fill="#64748B"
                          fontSize="10"
                          fontFamily="JetBrains Mono, monospace"
                        >
                          {pct}%
                        </text>
                      </g>
                    );
                  })}

                  {/* Plot Points & Connecting Polyline */}
                  {(() => {
                    const pts = inspectedSessions.map((s, idx) => {
                      const count = inspectedSessions.length;
                      const x =
                        count === 1
                          ? 308
                          : 50 + (idx / (count - 1)) * 510;
                      const y = 20 + ((100 - s.score) / 100) * 130;
                      return { x, y, session: s, index: idx + 1 };
                    });

                    const polylinePoints = pts.map((p) => `${p.x},${p.y}`).join(' ');

                    return (
                      <>
                        {pts.length > 1 && (
                          <polyline
                            fill="none"
                            stroke="#8B5CF6"
                            strokeWidth="2.5"
                            points={polylinePoints}
                          />
                        )}
                        {pts.map((p) => (
                          <g key={p.session.id}>
                            <circle
                              cx={p.x}
                              cy={p.y}
                              r="5"
                              fill="#0B0F17"
                              stroke="#A78BFA"
                              strokeWidth="2.5"
                            />
                            <text
                              x={p.x}
                              y={p.y - 10}
                              textAnchor="middle"
                              fill="#F8FAFC"
                              fontSize="10"
                              fontWeight="700"
                              fontFamily="JetBrains Mono, monospace"
                            >
                              {p.session.score}%
                            </text>
                            <text
                              x={p.x}
                              y="170"
                              textAnchor="middle"
                              fill="#94A3B8"
                              fontSize="9.5"
                              fontFamily="JetBrains Mono, monospace"
                            >
                              S{p.index} ({p.session.bpm}bpm)
                            </text>
                          </g>
                        ))}
                      </>
                    );
                  })()}
                </svg>
              </div>
            </div>
          )}
        </div>

        {/* Right: 30-Lesson Mastery Matrix Overview */}
        <div className="lg:col-span-4 rounded-2xl bg-[#111827] border border-slate-800 p-5 flex flex-col justify-between">
          <div>
            <div className="text-xs text-slate-400">30-Lesson Best Score Matrix</div>
            <h3 className="text-base font-bold text-white mt-0.5 mb-3">
              Click Any Lesson Slot to Inspect
            </h3>

            <div className="grid grid-cols-5 gap-2">
              {LESSONS.map((lesson) => {
                const best = getLessonBestScore(sessions, lesson.id);
                const isSelected = lesson.id === inspectedLessonId;
                return (
                  <button
                    key={lesson.id}
                    type="button"
                    onClick={() => setInspectedLessonId(lesson.id)}
                    className={`min-h-[48px] rounded-xl border p-1.5 flex flex-col items-center justify-center font-mono tabular-nums transition-all ${
                      isSelected
                        ? 'ring-2 ring-violet-400 bg-violet-500/20 border-violet-400 text-white'
                        : best !== null
                        ? best >= 85
                          ? 'bg-emerald-950/50 border-emerald-700/70 text-emerald-300'
                          : 'bg-sky-950/50 border-sky-700/70 text-sky-300'
                        : 'bg-[#0B0F17] border-slate-800 text-slate-500 hover:border-slate-700'
                    }`}
                  >
                    <span className="text-[11px] font-bold">
                      L{String(lesson.id).padStart(2, '0')}
                    </span>
                    <span className="text-[10px]">{best !== null ? `${best}%` : '—'}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 text-xs text-slate-400 space-y-1">
            <div>● ≥85% Score: Studio Mastery Achieved</div>
            <div>◆ &lt;85% Score: Practiced &amp; Improving</div>
            <div>— Unscored: Ready for First Session</div>
          </div>
        </div>
      </div>

      {/* Retained Individual Session Log Table */}
      <div className="rounded-2xl bg-[#111827] border border-slate-800 p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-xs text-slate-400">Chronological Practice Archive</div>
            <h2 className="text-lg font-bold text-white">Individual Retained Session Scores</h2>
          </div>
          <span className="text-xs font-mono tabular-nums text-slate-400">
            Showing {sessions.length} saved {sessions.length === 1 ? 'session' : 'sessions'}
          </span>
        </div>

        {sessions.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">
            No completed lesson sessions yet. Start any lesson in the Studio and finish its target bars to record your score!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="py-2.5 px-3 font-medium">Session Date</th>
                  <th className="py-2.5 px-3 font-medium">Lesson</th>
                  <th className="py-2.5 px-3 font-medium">Tempo</th>
                  <th className="py-2.5 px-3 font-medium">Score</th>
                  <th className="py-2.5 px-3 font-medium">Perfect / Good / Miss</th>
                  <th className="py-2.5 px-3 font-medium">Avg Offset</th>
                  <th className="py-2.5 px-3 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70 font-mono tabular-nums">
                {[...sessions].reverse().map((rec) => {
                  const dateObj = new Date(rec.timestamp);
                  const dateFormatted = dateObj.toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                  });
                  const timeFormatted = dateObj.toLocaleTimeString(undefined, {
                    hour: '2-digit',
                    minute: '2-digit',
                  });
                  return (
                    <tr key={rec.id} className="hover:bg-slate-800/30">
                      <td className="py-3 px-3 text-slate-400 whitespace-nowrap">
                        {dateFormatted} · {timeFormatted}
                      </td>
                      <td className="py-3 px-3 font-sans font-semibold text-white">
                        {String(rec.lessonId).padStart(2, '0')}. {rec.lessonTitle}
                      </td>
                      <td className="py-3 px-3 text-slate-300">{rec.bpm} BPM</td>
                      <td className="py-3 px-3">
                        <span
                          className={`font-bold ${
                            rec.score >= 85
                              ? 'text-emerald-400'
                              : rec.score >= 70
                              ? 'text-sky-400'
                              : 'text-violet-400'
                          }`}
                        >
                          {rec.score}%
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-300">
                        <span className="text-emerald-400">{rec.perfectCount}P</span> /{' '}
                        <span className="text-sky-400">{rec.goodCount}G</span> /{' '}
                        <span className="text-rose-400">{rec.missedCount}M</span>
                      </td>
                      <td className="py-3 px-3 text-slate-300">
                        {rec.avgOffsetMs > 0 ? `+${rec.avgOffsetMs}` : rec.avgOffsetMs} ms
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => onSelectLesson(rec.lessonId)}
                          className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-violet-400 font-sans font-semibold text-xs transition-colors"
                        >
                          Improve
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
