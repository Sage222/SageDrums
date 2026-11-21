import React, { useMemo, useState } from 'react';
import { TIER_1_SONGS } from '../data/songs';
import { SessionRecord, SongCategory } from '../types/drums';
import { getLessonBestScore, getLessonFirstToBestDelta, getLessonSessions } from '../utils/storage';
import { Play, CheckCircle2, Music, Search } from 'lucide-react';

interface SongsViewProps {
  currentLessonId: number;
  sessions: SessionRecord[];
  onSelectSong: (songId: number) => void;
}

type CategoryFilter = 'all' | SongCategory;

export const SongsView: React.FC<SongsViewProps> = ({
  currentLessonId,
  sessions,
  onSelectSong,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const filteredSongs = useMemo(() => {
    return TIER_1_SONGS.filter((song) => {
      const matchesCategory =
        selectedCategory === 'all' || song.songCategory === selectedCategory;
      const q = searchQuery.trim().toLowerCase();
      const matchesQuery =
        !q ||
        song.title.toLowerCase().includes(q) ||
        (song.artist && song.artist.toLowerCase().includes(q)) ||
        String(song.year || '').includes(q);
      return matchesCategory && matchesQuery;
    });
  }, [selectedCategory, searchQuery]);

  const practicedSongsCount = useMemo(
    () => TIER_1_SONGS.filter((s) => getLessonBestScore(sessions, s.id) !== null).length,
    [sessions]
  );

  const categoryButtons: Array<{ id: CategoryFilter; label: string }> = [
    { id: 'all', label: 'All Tier 1 (30)' },
    { id: '90s Rock Classic', label: '1990s Rock Classics' },
    { id: 'Red Hot Chili Peppers', label: 'Red Hot Chili Peppers' },
    { id: 'Imagine Dragons', label: 'Imagine Dragons' },
    { id: 'Modern Crowd Favorite', label: 'Crowd Favorites' },
  ];

  return (
    <div className="w-full max-w-6xl mx-auto">
      {/* Header & Overall Song Completion Summary */}
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <div className="text-xs text-slate-400 flex items-center gap-2">
            <span>Yamaha DTX452K Play-Along Repertoire</span>
            <span aria-hidden="true">·</span>
            <span className="text-violet-400 font-semibold">Tier 1 Beginner</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">
              {practicedSongsCount} / 30 Songs Practiced
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white mt-1">
            Songs — Tier 1: 30 Easy 1990s Rock &amp; Crowd Favorites
          </h1>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search artist or song title..."
            className="w-full min-h-[38px] pl-8 pr-3 py-1.5 rounded-xl bg-[#111827] border border-slate-800 focus:border-violet-500 focus:outline-none text-xs text-slate-100 placeholder:text-slate-500"
          />
        </div>
      </div>

      {/* Tier 1 Band / Genre Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex flex-wrap items-center gap-1 p-1 bg-[#111827] border border-slate-800 rounded-xl">
          {categoryButtons.map((btn) => (
            <button
              key={btn.id}
              type="button"
              onClick={() => setSelectedCategory(btn.id)}
              className={`min-h-[38px] px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                selectedCategory === btn.id
                  ? 'bg-violet-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>

        <span className="text-xs text-slate-400 font-mono tabular-nums">
          Showing {filteredSongs.length} of 30 Tier 1 songs
        </span>
      </div>

      {/* Tier 1 Songs Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
          <div className="flex items-center gap-2">
            <Music className="w-4 h-4 text-violet-400" />
            <h2 className="text-lg font-bold text-slate-100">
              Tier 1: Beginner 90s Rock, Red Hot Chili Peppers &amp; Imagine Dragons
            </h2>
          </div>
          <span className="text-xs text-slate-400 font-mono tabular-nums">
            Songs 01–30 · 20 Bars Each
          </span>
        </div>

        {filteredSongs.length === 0 ? (
          <div className="rounded-xl bg-[#111827] border border-slate-800 p-8 text-center text-xs text-slate-400">
            No songs match your search filter. Try clearing the search box or switching category tabs.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSongs.map((song) => {
              const bestScore = getLessonBestScore(sessions, song.id);
              const songSessions = getLessonSessions(sessions, song.id);
              const delta = getLessonFirstToBestDelta(sessions, song.id);
              const isCurrent = song.id === currentLessonId;
              const numLabel = String(song.songNumber || song.id - 100).padStart(2, '0');

              return (
                <div
                  key={song.id}
                  onClick={() => onSelectSong(song.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onSelectSong(song.id);
                    }
                  }}
                  className={`rounded-xl border p-4 flex flex-col justify-between transition-all cursor-pointer text-left ${
                    isCurrent
                      ? 'bg-[#161B33] border-violet-500/80'
                      : 'bg-[#111827] border-slate-800 hover:border-violet-500/40'
                  }`}
                >
                  <div>
                    {/* Top Metadata Kicker */}
                    <div className="flex items-center justify-between gap-2 text-xs text-slate-400">
                      <div className="flex items-center gap-1.5 font-mono tabular-nums">
                        <span className="text-violet-300 font-semibold">Tier 1</span>
                        <span aria-hidden="true">·</span>
                        <span>{song.timeSignature}</span>
                        <span aria-hidden="true">·</span>
                        <span>{song.bpm} BPM</span>
                        {song.year && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span>{song.year}</span>
                          </>
                        )}
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

                    {/* Artist & Song Title */}
                    <div className="mt-2">
                      <div className="text-xs font-semibold text-violet-400 truncate">
                        {song.artist}
                      </div>
                      <h3 className="text-base font-bold text-white mt-0.5">
                        {numLabel}. {song.title}
                      </h3>
                    </div>

                    <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                      {song.subtitle}
                    </p>
                  </div>

                  {/* Bottom Improvement & Launch Row */}
                  <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                    <div className="text-slate-400 font-mono tabular-nums">
                      {songSessions.length > 0 ? (
                        <span>
                          {songSessions.length}{' '}
                          {songSessions.length === 1 ? 'session' : 'sessions'}
                          {delta !== null && delta > 0 ? ` · +${delta}% gain` : ''}
                        </span>
                      ) : (
                        <span>{song.barsToComplete} bars play-along</span>
                      )}
                    </div>

                    <span className="font-semibold text-violet-400 flex items-center gap-1">
                      <Play className="w-3.5 h-3.5" />
                      <span>{isCurrent ? 'Active' : 'Play Along'}</span>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};
