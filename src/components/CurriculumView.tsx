import React, { useState } from 'react';
import { LESSONS, TIER_NAMES } from '../data/lessons';
import { SessionRecord, TierId } from '../types/drums';
import { getLessonBestScore, getLessonFirstToBestDelta, getLessonSessions } from '../utils/storage';
import { Play, CheckCircle2 } from 'lucide-react';

interface CurriculumViewProps {
  currentLessonId: number;
  sessions: SessionRecord[];
  onSelectLesson: (lessonId: number) => void;
}

export const CurriculumView: React.FC<CurriculumViewProps> = ({
  currentLessonId,
  sessions,
  onSelectLesson,
}) => {
  const [selectedTier, setSelectedTier] = useState<'all' | TierId>('all');

  const filteredLessons =
    selectedTier === 'all' ? LESSONS : LESSONS.filter((l) => l.tier === selectedTier);

  const completedCount = LESSONS.filter((l) => getLessonBestScore(sessions, l.id) !== null).length;

  return (
    <div className="w-full max-w-6xl mx-auto">
      {/* Header & Overall Completion Summary */}
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <div className="text-xs text-slate-400 flex items-center gap-2">
            <span>Yamaha DTX452K Structured Curriculum</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">
              {completedCount} / 30 Lessons Practiced
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white mt-1">
            30 Step-by-Step Drum Lessons
          </h1>
        </div>

        {/* Interactive Tier Filter Segmented Control */}
        <div className="flex flex-wrap items-center gap-1 p-1 bg-[#111827] border border-slate-800 rounded-xl">
          <button
            type="button"
            onClick={() => setSelectedTier('all')}
            className={`min-h-[38px] px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
              selectedTier === 'all'
                ? 'bg-amber-500 text-slate-950'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            All 30 Lessons
          </button>
          {([1, 2, 3, 4, 5] as TierId[]).map((tier) => (
            <button
              key={tier}
              type="button"
              onClick={() => setSelectedTier(tier)}
              className={`min-h-[38px] px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                selectedTier === tier
                  ? 'bg-amber-500 text-slate-950'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Tier {tier} ({tier * 6 - 5}–{tier * 6})
            </button>
          ))}
        </div>
      </div>

      {/* Tier Section Lists */}
      <div className="space-y-8">
        {([1, 2, 3, 4, 5] as TierId[])
          .filter((tier) => selectedTier === 'all' || selectedTier === tier)
          .map((tier) => {
            const tierLessons = filteredLessons.filter((l) => l.tier === tier);
            return (
              <section key={tier} className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <h2 className="text-lg font-bold text-slate-100">{TIER_NAMES[tier]}</h2>
                  <span className="text-xs text-slate-400 font-mono tabular-nums">
                    Lessons {String(tier * 6 - 5).padStart(2, '0')}–{String(tier * 6).padStart(2, '0')}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {tierLessons.map((lesson) => {
                    const bestScore = getLessonBestScore(sessions, lesson.id);
                    const lessonSessions = getLessonSessions(sessions, lesson.id);
                    const delta = getLessonFirstToBestDelta(sessions, lesson.id);
                    const isCurrent = lesson.id === currentLessonId;

                    return (
                      <div
                        key={lesson.id}
                        onClick={() => onSelectLesson(lesson.id)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            onSelectLesson(lesson.id);
                          }
                        }}
                        className={`rounded-xl border p-4 flex flex-col justify-between transition-all cursor-pointer text-left ${
                          isCurrent
                            ? 'bg-[#162033] border-amber-500/70'
                            : 'bg-[#111827] border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div>
                          {/* Unboxed Metadata Kicker */}
                          <div className="flex items-center justify-between gap-2 text-xs text-slate-400">
                            <div className="flex items-center gap-1.5 font-mono tabular-nums">
                              <span>{lesson.timeSignature}</span>
                              <span aria-hidden="true">·</span>
                              <span>{lesson.bpm} BPM</span>
                              <span aria-hidden="true">·</span>
                              <span className="truncate">{lesson.dtxKitPreset.split(':')[0]}</span>
                            </div>

                            {bestScore !== null ? (
                              <span className="font-mono font-bold tabular-nums text-emerald-400 flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Best {bestScore}%</span>
                              </span>
                            ) : (
                              <span className="text-slate-500">Unscored</span>
                            )}
                          </div>

                          {/* Editorial Title */}
                          <h3 className="text-base font-bold text-white mt-2">
                            {String(lesson.id).padStart(2, '0')}. {lesson.title}
                          </h3>
                          <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                            {lesson.subtitle}
                          </p>
                        </div>

                        {/* Bottom Improvement & Launch Row */}
                        <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                          <div className="text-slate-400 font-mono tabular-nums">
                            {lessonSessions.length > 0 ? (
                              <span>
                                {lessonSessions.length}{' '}
                                {lessonSessions.length === 1 ? 'session' : 'sessions'}
                                {delta !== null && delta > 0 ? ` · +${delta}% gain` : ''}
                              </span>
                            ) : (
                              <span>{lesson.barsToComplete} bars evaluation</span>
                            )}
                          </div>

                          <span className="font-semibold text-amber-400 flex items-center gap-1">
                            <Play className="w-3.5 h-3.5" />
                            <span>{isCurrent ? 'Active' : 'Practice'}</span>
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
      </div>
    </div>
  );
};
