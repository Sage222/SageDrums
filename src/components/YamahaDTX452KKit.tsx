import React from 'react';
import { DrumPadId } from '../types/drums';
import { YAMAHA_DTX452K_PADS } from '../data/dtx452kConfig';

interface YamahaDTX452KKitProps {
  activeStepPads: DrumPadId[];
  activeSticking?: string;
  recentlyTriggeredPads: Record<string, number>;
  focusPads: DrumPadId[];
  dtxKitPreset: string;
  bpm: number;
  onTriggerPad: (padId: DrumPadId) => void;
  compactLandscape?: boolean;
}

export const YamahaDTX452KKit: React.FC<YamahaDTX452KKitProps> = ({
  activeStepPads,
  activeSticking,
  recentlyTriggeredPads,
  focusPads,
  dtxKitPreset,
  bpm,
  onTriggerPad,
  compactLandscape = false,
}) => {
  const isTarget = (padId: DrumPadId) => activeStepPads.includes(padId);
  const isHit = (padId: DrumPadId) => Boolean(recentlyTriggeredPads[padId]);
  const isFocus = (padId: DrumPadId) => focusPads.includes(padId);

  const handlePadPointerDown = (e: React.PointerEvent, padId: DrumPadId) => {
    e.preventDefault();
    e.stopPropagation();
    onTriggerPad(padId);
  };

  return (
    <div className="relative w-full select-none touch-manipulation">
      {/* Top Kit Specs Bar - Fixed Single-Line Height so it never wraps or bounces */}
      <div className="h-6 flex items-center justify-between gap-3 mb-2 px-1 text-xs text-slate-400 overflow-hidden whitespace-nowrap">
        <div className="flex items-center gap-2 min-w-0 overflow-hidden">
          <span className="font-semibold text-slate-200 shrink-0">Yamaha DTX452K Layout</span>
          <span aria-hidden="true" className="hidden sm:inline shrink-0">·</span>
          <span className="hidden sm:inline truncate">3-Zone Snare · Ride Bow &amp; Bell · Dual Foot Pedals</span>
        </div>
        <div className="flex items-center gap-2 font-mono text-xs text-violet-400 shrink-0">
          <span className="hidden md:inline">{dtxKitPreset}</span>
          <span aria-hidden="true" className="hidden md:inline text-slate-600">·</span>
          <span className="tabular-nums">{bpm} BPM</span>
          <span aria-hidden="true" className="text-slate-600">·</span>
          <span className="text-sky-300 font-semibold inline-block min-w-[118px] text-right tabular-nums">
            Sticking: {activeSticking || '—'}
          </span>
        </div>
      </div>

      {/* Interactive SVG Kit Stage aligned with Yamaha DTX452K geometry */}
      <div
        className={`w-full rounded-xl bg-[#0E1420] border border-slate-800/90 overflow-hidden flex items-center justify-center ${
          compactLandscape ? 'p-1.5' : 'p-2 sm:p-3'
        }`}
      >
        <svg
          viewBox="0 0 800 470"
          className={`w-full h-auto ${compactLandscape ? 'max-h-[250px]' : 'max-h-[380px]'}`}
          role="img"
          aria-label="Interactive Yamaha DTX452K Electronic Drum Kit Layout"
        >
          <defs>
            <radialGradient id="padRubberGrad" cx="50%" cy="45%" r="55%">
              <stop offset="0%" stopColor="#263147" />
              <stop offset="75%" stopColor="#161E2E" />
              <stop offset="100%" stopColor="#0D131F" />
            </radialGradient>
            <radialGradient id="cymbalGrad" cx="50%" cy="45%" r="55%">
              <stop offset="0%" stopColor="#2C3548" />
              <stop offset="65%" stopColor="#1A2130" />
              <stop offset="100%" stopColor="#101520" />
            </radialGradient>
            <linearGradient id="pedalGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#334155" />
              <stop offset="50%" stopColor="#1E293B" />
              <stop offset="100%" stopColor="#0F172A" />
            </linearGradient>
          </defs>

          {/* Floor Rug Grid Lines */}
          <rect
            x="40"
            y="340"
            width="720"
            height="118"
            rx="14"
            fill="#111827"
            stroke="#1E293B"
            strokeWidth="1.5"
            strokeDasharray="6 6"
          />
          <text x="60" y="446" fill="#475569" fontSize="11" fontFamily="Plus Jakarta Sans, sans-serif">
            FLOOR PEDAL ZONE (HI-HAT PEDAL LEFT FOOT · KICK DRUM RIGHT FOOT)
          </text>

          {/* Yamaha DTX452K Aluminum Rack Tubes */}
          <g stroke="#334155" strokeLinecap="round" fill="none">
            {/* Vertical Rack Posts */}
            <line x1="150" y1="150" x2="150" y2="395" strokeWidth="9" />
            <line x1="295" y1="125" x2="295" y2="380" strokeWidth="10" />
            <line x1="525" y1="125" x2="525" y2="380" strokeWidth="10" />
            <line x1="665" y1="150" x2="665" y2="395" strokeWidth="9" />
            {/* Curved Horizontal Crossbars */}
            <path d="M 150 185 Q 220 150 295 155" strokeWidth="8" />
            <path d="M 295 155 Q 410 140 525 155" strokeWidth="9" />
            <path d="M 525 155 Q 600 155 665 190" strokeWidth="8" />
            {/* Snare Outrigger Arm */}
            <path d="M 295 255 L 250 285" strokeWidth="8" />
            {/* Cymbal Boom Rods */}
            <line x1="235" y1="155" x2="215" y2="75" strokeWidth="5" stroke="#64748B" />
            <line x1="575" y1="158" x2="610" y2="85" strokeWidth="5" stroke="#64748B" />
          </g>

          {/* Drum Sound Module (Mounted on Left Rack Wing) */}
          <g transform="translate(185, 165)">
            <rect
              x="0"
              y="0"
              width="76"
              height="52"
              rx="7"
              fill="#1E293B"
              stroke="#475569"
              strokeWidth="2"
            />
            <rect x="8" y="8" width="60" height="16" rx="3" fill="#090D16" stroke="#38BDF8" strokeWidth="0.8" />
            <text x="38" y="19" textAnchor="middle" fill="#38BDF8" fontSize="8.5" fontFamily="JetBrains Mono, monospace" fontWeight="700">
              MODULE
            </text>
            <circle cx="18" cy="36" r="4" fill="#8B5CF6" />
            <circle cx="32" cy="36" r="3.5" fill="#475569" />
            <circle cx="44" cy="36" r="3.5" fill="#475569" />
            <circle cx="58" cy="36" r="4" fill="#0EA5E9" />
          </g>

          {/* ============================================================== */}
          {/* 1. CRASH CYMBAL PAD (Choke Enabled) - Top Left                 */}
          {/* ============================================================== */}
          <g
            transform="translate(215, 76)"
            onPointerDown={(e) => handlePadPointerDown(e, 'crash')}
            className="cursor-pointer"
          >
            {isTarget('crash') && (
              <circle r="68" fill="none" stroke="#8B5CF6" strokeWidth="3.5" strokeDasharray="8 4" />
            )}
            <circle
              r="60"
              fill="url(#cymbalGrad)"
              stroke={isHit('crash') ? '#C4B5FD' : isTarget('crash') ? '#8B5CF6' : isFocus('crash') ? '#64748B' : '#334155'}
              strokeWidth={isHit('crash') ? '4.5' : isTarget('crash') ? '3' : '2'}
            />
            <circle r="44" fill="none" stroke="#334155" strokeWidth="1" />
            <path d="M -42 42 A 60 60 0 0 0 42 42" fill="none" stroke="#8B5CF6" strokeWidth="3" strokeOpacity="0.65" />
            <circle r="13" fill="#1E293B" stroke="#475569" strokeWidth="1.5" />
            <text y="-21" textAnchor="middle" fill="#F8FAFC" fontSize="12" fontWeight="700">
              CRASH
            </text>
            <text y="28" textAnchor="middle" fill="#C4B5FD" fontSize="9.5" fontFamily="JetBrains Mono, monospace">
              [E] · CHOKE EDGE
            </text>
          </g>

          {/* ============================================================== */}
          {/* 2. HI-HAT PAD (Closed Bow + Open Rim Toggle) - Mid Left        */}
          {/* ============================================================== */}
          <g transform="translate(118, 215)">
            {/* Outer Open Hi-Hat Ring */}
            <g onPointerDown={(e) => handlePadPointerDown(e, 'hihat_open')} className="cursor-pointer">
              {(isTarget('hihat') || isTarget('hihat_open')) && (
                <circle r="70" fill="none" stroke="#38BDF8" strokeWidth="3.5" strokeDasharray="8 4" />
              )}
              <circle
                r="62"
                fill="url(#cymbalGrad)"
                stroke={
                  isHit('hihat_open')
                    ? '#7DD3FC'
                    : isTarget('hihat_open')
                    ? '#0284C7'
                    : '#334155'
                }
                strokeWidth={isHit('hihat_open') ? '4.5' : '2.5'}
              />
              <text y="-43" textAnchor="middle" fill="#7DD3FC" fontSize="9" fontFamily="JetBrains Mono, monospace" fontWeight="600">
                OPEN BOW [W]
              </text>
            </g>

            {/* Inner Closed Hi-Hat Bow */}
            <g onPointerDown={(e) => handlePadPointerDown(e, 'hihat')} className="cursor-pointer">
              <circle
                r="42"
                fill="#182234"
                stroke={
                  isHit('hihat')
                    ? '#38BDF8'
                    : isTarget('hihat')
                    ? '#0EA5E9'
                    : isFocus('hihat')
                    ? '#64748B'
                    : '#334155'
                }
                strokeWidth={isHit('hihat') ? '4.5' : isTarget('hihat') ? '3' : '2'}
              />
              <circle r="10" fill="#0F172A" stroke="#475569" strokeWidth="1.5" />
              <text y="-14" textAnchor="middle" fill="#F8FAFC" fontSize="11.5" fontWeight="700">
                HI-HAT
              </text>
              <text y="23" textAnchor="middle" fill="#38BDF8" fontSize="9.5" fontFamily="JetBrains Mono, monospace">
                CLOSED [Q]
              </text>
            </g>
          </g>

          {/* ============================================================== */}
          {/* 3. TOM 1 (HIGH TOM) - Upper Center-Left                        */}
          {/* ============================================================== */}
          <g
            transform="translate(348, 128)"
            onPointerDown={(e) => handlePadPointerDown(e, 'tom1')}
            className="cursor-pointer"
          >
            {isTarget('tom1') && (
              <circle r="58" fill="none" stroke="#10B981" strokeWidth="3.5" strokeDasharray="8 4" />
            )}
            <circle
              r="50"
              fill="url(#padRubberGrad)"
              stroke={isHit('tom1') ? '#34D399' : isTarget('tom1') ? '#10B981' : isFocus('tom1') ? '#64748B' : '#334155'}
              strokeWidth={isHit('tom1') ? '4.5' : isTarget('tom1') ? '3' : '2.5'}
            />
            <circle r="38" fill="none" stroke="#1E293B" strokeWidth="1.5" />
            <text y="-4" textAnchor="middle" fill="#F8FAFC" fontSize="12" fontWeight="700">
              TOM 1
            </text>
            <text y="14" textAnchor="middle" fill="#34D399" fontSize="9.5" fontFamily="JetBrains Mono, monospace">
              HIGH [U]
            </text>
          </g>

          {/* ============================================================== */}
          {/* 4. TOM 2 (MID TOM) - Upper Center-Right                        */}
          {/* ============================================================== */}
          <g
            transform="translate(472, 128)"
            onPointerDown={(e) => handlePadPointerDown(e, 'tom2')}
            className="cursor-pointer"
          >
            {isTarget('tom2') && (
              <circle r="58" fill="none" stroke="#10B981" strokeWidth="3.5" strokeDasharray="8 4" />
            )}
            <circle
              r="50"
              fill="url(#padRubberGrad)"
              stroke={isHit('tom2') ? '#6EE7B7' : isTarget('tom2') ? '#059669' : isFocus('tom2') ? '#64748B' : '#334155'}
              strokeWidth={isHit('tom2') ? '4.5' : isTarget('tom2') ? '3' : '2.5'}
            />
            <circle r="38" fill="none" stroke="#1E293B" strokeWidth="1.5" />
            <text y="-4" textAnchor="middle" fill="#F8FAFC" fontSize="12" fontWeight="700">
              TOM 2
            </text>
            <text y="14" textAnchor="middle" fill="#6EE7B7" fontSize="9.5" fontFamily="JetBrains Mono, monospace">
              MID [I]
            </text>
          </g>

          {/* ============================================================== */}
          {/* 5. RIDE CYMBAL PAD (Outer Bow [R] + Center Bell [T]) - Right   */}
          {/* ============================================================== */}
          <g transform="translate(615, 92)">
            {(isTarget('ride') || isTarget('ride_bell')) && (
              <circle r="72" fill="none" stroke="#A855F7" strokeWidth="3.5" strokeDasharray="8 4" />
            )}

            {/* Outer Ride Bow Zone */}
            <g onPointerDown={(e) => handlePadPointerDown(e, 'ride')} className="cursor-pointer">
              <circle
                r="64"
                fill="url(#cymbalGrad)"
                stroke={
                  isHit('ride')
                    ? '#D8B4FE'
                    : isTarget('ride')
                    ? '#A855F7'
                    : isFocus('ride')
                    ? '#64748B'
                    : '#334155'
                }
                strokeWidth={isHit('ride') ? '4.5' : isTarget('ride') ? '3' : '2'}
              />
              <circle r="46" fill="none" stroke="#334155" strokeWidth="1" />
              <text y="-36" textAnchor="middle" fill="#F8FAFC" fontSize="12" fontWeight="700">
                RIDE
              </text>
              <text y="44" textAnchor="middle" fill="#D8B4FE" fontSize="9.5" fontFamily="JetBrains Mono, monospace">
                BOW [R]
              </text>
            </g>

            {/* Center Raised Ride Bell Dome Zone */}
            <g onPointerDown={(e) => handlePadPointerDown(e, 'ride_bell')} className="cursor-pointer">
              <circle
                r="26"
                fill={isHit('ride_bell') ? '#7C3AED' : isTarget('ride_bell') ? '#4C1D95' : '#1E293B'}
                stroke={
                  isHit('ride_bell')
                    ? '#EDE9FE'
                    : isTarget('ride_bell')
                    ? '#C4B5FD'
                    : '#64748B'
                }
                strokeWidth={isHit('ride_bell') ? '4' : isTarget('ride_bell') ? '3' : '2'}
              />
              <text y="-2" textAnchor="middle" fill="#FFFFFF" fontSize="9.5" fontWeight="700">
                BELL
              </text>
              <text y="11" textAnchor="middle" fill="#DDD6FE" fontSize="8.5" fontFamily="JetBrains Mono, monospace">
                [T]
              </text>
            </g>
          </g>

          {/* ============================================================== */}
          {/* 6. 3-ZONE SNARE PAD (Head Z1, Rimshot Z2, Cross-Stick Z3)      */}
          {/* ============================================================== */}
          <g transform="translate(255, 285)">
            {(isTarget('snare') || isTarget('snare_rim') || isTarget('snare_cross')) && (
              <circle r="76" fill="none" stroke="#F97316" strokeWidth="3.5" strokeDasharray="8 4" />
            )}

            {/* Zone 3: Upper/Rear Rim Sector (Closed Rim / Cross-Stick) */}
            <g onPointerDown={(e) => handlePadPointerDown(e, 'snare_cross')} className="cursor-pointer">
              <path
                d="M -66 0 A 66 66 0 0 1 66 0 L 48 0 A 48 48 0 0 0 -48 0 Z"
                fill={isHit('snare_cross') ? '#9333EA' : isTarget('snare_cross') ? '#4C1D95' : '#1E293B'}
                stroke={isHit('snare_cross') ? '#D8B4FE' : isTarget('snare_cross') ? '#A855F7' : '#475569'}
                strokeWidth="2"
              />
              <text y="-53" textAnchor="middle" fill="#D8B4FE" fontSize="8.5" fontFamily="JetBrains Mono, monospace" fontWeight="700">
                Z3: CROSS-STICK [F]
              </text>
            </g>

            {/* Zone 2: Lower/Front Rim Sector (Open Rimshot) */}
            <g onPointerDown={(e) => handlePadPointerDown(e, 'snare_rim')} className="cursor-pointer">
              <path
                d="M -66 0 A 66 66 0 0 0 66 0 L 48 0 A 48 48 0 0 1 -48 0 Z"
                fill={isHit('snare_rim') ? '#EA580C' : isTarget('snare_rim') ? '#7C2D12' : '#1E293B'}
                stroke={isHit('snare_rim') ? '#FDBA74' : isTarget('snare_rim') ? '#F97316' : '#475569'}
                strokeWidth="2"
              />
              <text y="60" textAnchor="middle" fill="#FDBA74" fontSize="8.5" fontFamily="JetBrains Mono, monospace" fontWeight="700">
                Z2: OPEN RIMSHOT [D]
              </text>
            </g>

            {/* Zone 1: Center Snare Head */}
            <g onPointerDown={(e) => handlePadPointerDown(e, 'snare')} className="cursor-pointer">
              <circle
                r="47"
                fill="url(#padRubberGrad)"
                stroke={
                  isHit('snare')
                    ? '#FB923C'
                    : isTarget('snare')
                    ? '#F97316'
                    : isFocus('snare')
                    ? '#94A3B8'
                    : '#475569'
                }
                strokeWidth={isHit('snare') ? '4.5' : isTarget('snare') ? '3' : '2'}
              />
              <text y="-8" textAnchor="middle" fill="#FFFFFF" fontSize="12.5" fontWeight="700">
                SNARE
              </text>
              <text y="7" textAnchor="middle" fill="#FB923C" fontSize="9.5" fontFamily="JetBrains Mono, monospace">
                Z1 HEAD [S]
              </text>
              <text y="21" textAnchor="middle" fill="#94A3B8" fontSize="8">
                3-Zone Pad
              </text>
            </g>
          </g>

          {/* ============================================================== */}
          {/* 7. TOM 3 (FLOOR TOM) - Lower Right                             */}
          {/* ============================================================== */}
          <g
            transform="translate(578, 272)"
            onPointerDown={(e) => handlePadPointerDown(e, 'tom3')}
            className="cursor-pointer"
          >
            {isTarget('tom3') && (
              <circle r="62" fill="none" stroke="#10B981" strokeWidth="3.5" strokeDasharray="8 4" />
            )}
            <circle
              r="54"
              fill="url(#padRubberGrad)"
              stroke={isHit('tom3') ? '#34D399' : isTarget('tom3') ? '#059669' : isFocus('tom3') ? '#64748B' : '#334155'}
              strokeWidth={isHit('tom3') ? '4.5' : isTarget('tom3') ? '3' : '2.5'}
            />
            <circle r="41" fill="none" stroke="#1E293B" strokeWidth="1.5" />
            <text y="-4" textAnchor="middle" fill="#F8FAFC" fontSize="12" fontWeight="700">
              TOM 3
            </text>
            <text y="14" textAnchor="middle" fill="#34D399" fontSize="9.5" fontFamily="JetBrains Mono, monospace">
              FLOOR [O]
            </text>
          </g>

          {/* ============================================================== */}
          {/* 8. HI-HAT CONTROLLER PEDAL - Bottom Left Floor                 */}
          {/* ============================================================== */}
          <g
            transform="translate(118, 392)"
            onPointerDown={(e) => handlePadPointerDown(e, 'hihat_pedal')}
            className="cursor-pointer"
          >
            {isTarget('hihat_pedal') && (
              <rect
                x="-46"
                y="-46"
                width="92"
                height="92"
                rx="14"
                fill="none"
                stroke="#38BDF8"
                strokeWidth="3"
                strokeDasharray="6 4"
              />
            )}
            <rect
              x="-38"
              y="-40"
              width="76"
              height="80"
              rx="12"
              fill="url(#pedalGrad)"
              stroke={
                isHit('hihat_pedal')
                  ? '#38BDF8'
                  : isTarget('hihat_pedal')
                  ? '#0284C7'
                  : '#475569'
              }
              strokeWidth={isHit('hihat_pedal') ? '4' : '2'}
            />
            <rect x="-24" y="-28" width="48" height="36" rx="5" fill="#0F172A" stroke="#334155" strokeWidth="1" />
            <text y="-10" textAnchor="middle" fill="#F8FAFC" fontSize="10" fontWeight="700">
              HI-HAT PEDAL
            </text>
            <text y="4" textAnchor="middle" fill="#38BDF8" fontSize="8.5" fontFamily="JetBrains Mono, monospace">
              LF CHICK [Z]
            </text>
            <text y="26" textAnchor="middle" fill="#94A3B8" fontSize="8.5">
              Left Foot
            </text>
          </g>

          {/* ============================================================== */}
          {/* 9. KICK DRUM PAD & PEDAL - Bottom Center-Right Floor           */}
          {/* ============================================================== */}
          <g
            transform="translate(415, 382)"
            onPointerDown={(e) => handlePadPointerDown(e, 'kick')}
            className="cursor-pointer"
          >
            {isTarget('kick') && (
              <rect
                x="-76"
                y="-54"
                width="152"
                height="108"
                rx="16"
                fill="none"
                stroke="#EC4899"
                strokeWidth="3.5"
                strokeDasharray="8 4"
              />
            )}
            <rect
              x="-68"
              y="-46"
              width="136"
              height="92"
              rx="14"
              fill="url(#pedalGrad)"
              stroke={
                isHit('kick')
                  ? '#F472B6'
                  : isTarget('kick')
                  ? '#EC4899'
                  : isFocus('kick')
                  ? '#94A3B8'
                  : '#475569'
              }
              strokeWidth={isHit('kick') ? '4.5' : isTarget('kick') ? '3' : '2.5'}
            />
            <circle cx="0" cy="-10" r="24" fill="#0F172A" stroke="#EC4899" strokeWidth="1.8" />
            <circle cx="0" cy="-10" r="9" fill="#EC4899" fillOpacity="0.35" />
            <text y="-7" textAnchor="middle" fill="#FFFFFF" fontSize="11.5" fontWeight="700">
              KICK DRUM
            </text>
            <text y="25" textAnchor="middle" fill="#F472B6" fontSize="9.5" fontFamily="JetBrains Mono, monospace" fontWeight="600">
              RIGHT FOOT [SPACE]
            </text>
          </g>
        </svg>
      </div>

      {/* Quick Touch Trigger Strip for Mobile Thumb Ergonomics */}
      <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5 mt-2">
        {(['hihat', 'snare', 'kick', 'tom1', 'ride', 'ride_bell', 'crash'] as DrumPadId[]).map((padId) => {
          const cfg = YAMAHA_DTX452K_PADS[padId];
          const active = isTarget(padId);
          const hit = isHit(padId);
          return (
            <button
              key={padId}
              type="button"
              onPointerDown={(e) => handlePadPointerDown(e, padId)}
              className={`min-h-[44px] px-2 py-1.5 rounded-lg border text-left transition-transform active:scale-95 flex flex-col justify-between ${
                hit
                  ? 'bg-violet-500/25 border-violet-400 text-white'
                  : active
                  ? 'bg-sky-500/15 border-sky-400 text-slate-100'
                  : 'bg-[#131B2B] border-slate-800 text-slate-300 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between w-full text-[11px] font-semibold">
                <span className="truncate">{cfg.shortLabel}</span>
                <span className="font-mono text-[10px] text-slate-400">
                  [{cfg.keyShortcut === 'Space' ? 'SPC' : cfg.keyShortcut}]
                </span>
              </div>
              <span className="text-[10px] text-slate-400 truncate">{cfg.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
