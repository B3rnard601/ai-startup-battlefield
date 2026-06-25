'use client';

import { useEffect, useState, useRef } from 'react';
import type { AgentType } from '@/types/game';

interface Props {
  agent: AgentType | 'system';
  agentName: string;
  content: string;
  streaming: boolean;
  delta?: { revenue?: number; users?: number; reputation?: number; cash?: number };
  onDismiss: () => void;
  autoDismissMs?: number;
}

const CONFIGS: Record<string, { color: string; darkBg: string; label: string; entrance: string }> = {
  investor:   { color: '#FF8C42', darkBg: '#110800', label: 'INVESTOR MEETING',    entrance: 'scene-enter' },
  competitor: { color: '#FF3B4E', darkBg: '#110005', label: 'COMPETITOR ALERT',    entrance: 'scene-enter scene-shake' },
  journalist: { color: '#4D9DFF', darkBg: '#020a18', label: 'BREAKING NEWS',       entrance: 'scene-enter' },
  customer:   { color: '#10E8AA', darkBg: '#011510', label: 'CUSTOMER REACTION',   entrance: 'scene-enter' },
  employee:   { color: '#9BA8C4', darkBg: '#080a10', label: 'TEAM FEEDBACK',       entrance: 'scene-enter' },
  system:     { color: '#616880', darkBg: '#0E1018', label: 'SYSTEM',              entrance: 'scene-enter' },
};

export default function EventScene({ agent, agentName, content, streaming, delta, onDismiss, autoDismissMs = 6000 }: Props) {
  const cfg = CONFIGS[agent] ?? CONFIGS.system;
  const [timerWidth, setTimerWidth] = useState(100);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number>(0);

  useEffect(() => {
    if (streaming) return; // don't start timer while streaming

    startRef.current = Date.now();
    const tick = () => {
      const elapsed = Date.now() - startRef.current;
      const pct = Math.max(0, 100 - (elapsed / autoDismissMs) * 100);
      setTimerWidth(pct);
      if (pct > 0) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        onDismiss();
      }
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [streaming, autoDismissMs, onDismiss]);

  return (
    <div
      className={`relative flex flex-col overflow-hidden ${cfg.entrance}`}
      style={{
        background: `linear-gradient(160deg, ${cfg.darkBg} 0%, #0E1018 100%)`,
        borderLeft: `2px solid ${cfg.color}`,
      }}
    >
      {/* Timer bar — runs after streaming ends */}
      {!streaming && (
        <div className="absolute top-0 left-0 h-0.5 transition-none" style={{ width: `${timerWidth}%`, background: cfg.color }} />
      )}

      {/* Agent visual illustration */}
      <div className="shrink-0 flex items-center justify-center py-5 relative overflow-hidden">
        {agent === 'investor'   && <InvestorVisual color={cfg.color} />}
        {agent === 'competitor' && <CompetitorVisual color={cfg.color} />}
        {agent === 'journalist' && <JournalistVisual color={cfg.color} />}
        {agent === 'customer'   && <CustomerVisual color={cfg.color} />}
        {agent === 'employee'   && <EmployeeVisual color={cfg.color} />}
        {agent === 'system'     && <SystemVisual color={cfg.color} />}
      </div>

      {/* Header */}
      <div className="px-5 pb-2 flex items-center justify-between shrink-0">
        <div>
          <p className="text-[10px] tracking-[0.25em] font-bold" style={{ color: cfg.color }}>
            {cfg.label}
          </p>
          <p className="text-text-muted text-xs mt-0.5">{agentName}</p>
        </div>
        {agent === 'competitor' && (
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full live-blip" style={{ background: cfg.color }} />
            <span className="text-[10px]" style={{ color: cfg.color }}>LIVE</span>
          </div>
        )}
        {agent === 'journalist' && (
          <span className="text-[10px] font-black px-2 py-0.5 animate-pulse" style={{ background: cfg.color, color: '#000' }}>
            BREAKING
          </span>
        )}
      </div>

      {/* Content — streaming text */}
      <div className="px-5 pb-4 flex-1 min-h-0 overflow-y-auto">
        <p className="text-text-primary text-sm leading-relaxed">
          {content}
          {streaming && <span className="animate-blink font-bold ml-0.5" style={{ color: cfg.color }}>█</span>}
        </p>
      </div>

      {/* Delta badges */}
      {delta && !streaming && (
        <div className="px-5 pb-3 flex flex-wrap gap-2">
          {delta.revenue !== undefined && delta.revenue !== 0 && (
            <DeltaBadge label="Revenue" value={delta.revenue} prefix="$" />
          )}
          {delta.users !== undefined && delta.users !== 0 && (
            <DeltaBadge label="Users" value={delta.users} />
          )}
          {delta.reputation !== undefined && delta.reputation !== 0 && (
            <DeltaBadge label="Reputation" value={delta.reputation} />
          )}
          {delta.cash !== undefined && delta.cash !== 0 && (
            <DeltaBadge label="Cash" value={delta.cash} prefix="$" />
          )}
        </div>
      )}

      {/* Dismiss button */}
      {!streaming && (
        <button
          onClick={onDismiss}
          className="mx-5 mb-4 py-2 text-xs font-semibold tracking-widest border transition-all hover:text-white"
          style={{ borderColor: cfg.color, color: cfg.color }}
          onMouseEnter={e => (e.currentTarget.style.background = cfg.color)}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        >
          CONTINUE →
        </button>
      )}
    </div>
  );
}

function DeltaBadge({ label, value, prefix = '' }: { label: string; value: number; prefix?: string }) {
  const pos = value > 0;
  return (
    <span className={`text-[10px] px-2 py-0.5 border font-medium ${pos ? 'border-growth text-growth' : 'border-danger text-danger'}`}>
      {pos ? '▲' : '▼'} {label} {pos ? '+' : ''}{prefix}{Math.abs(value).toLocaleString()}
    </span>
  );
}

// ── Visual Components ─────────────────────────────────────────────────────────

function InvestorVisual({ color }: { color: string }) {
  return (
    <div className="relative w-full h-24 flex items-end justify-center gap-3 px-8">
      {/* Animated bar chart */}
      {[65, 45, 80, 55, 90].map((h, i) => (
        <div key={i} className="relative flex flex-col items-center gap-1" style={{ animationDelay: `${i * 100}ms` }}>
          <div
            className="bar-grow w-6 rounded-t-sm"
            style={{
              height: `${h * 0.6}px`,
              background: i === 4 ? color : `${color}55`,
              animationDelay: `${i * 120}ms`,
              transformOrigin: 'bottom',
            }}
          />
        </div>
      ))}
      {/* Floating dollar signs */}
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="absolute text-xs font-bold"
          style={{
            color,
            left: `${30 + i * 20}%`,
            bottom: '10px',
            animation: `floatDollar ${1.2 + i * 0.4}s ease-out ${i * 0.5}s infinite`,
            opacity: 0,
          }}
        >
          $
        </span>
      ))}
      {/* Conference table line */}
      <div className="absolute bottom-0 left-4 right-4 h-px" style={{ background: `${color}40` }} />
    </div>
  );
}

function CompetitorVisual({ color }: { color: string }) {
  return (
    <div className="relative w-full h-24 flex items-center justify-center overflow-hidden">
      {/* Camera flash overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ animation: 'pressFlash 3s ease-in-out infinite', background: 'white' }}
      />
      {/* Podium */}
      <svg viewBox="0 0 120 80" className="w-40 h-20" fill="none">
        {/* Podium body */}
        <polygon points="40,50 80,50 75,75 45,75" fill={`${color}30`} stroke={`${color}60`} strokeWidth="1" />
        {/* Stand */}
        <rect x="56" y="20" width="8" height="30" fill={`${color}50`} />
        {/* Microphone head */}
        <ellipse cx="60" cy="16" rx="7" ry="10" fill={`${color}80`} stroke={color} strokeWidth="1.5" />
        {/* Mic grille lines */}
        <line x1="54" y1="13" x2="66" y2="13" stroke={color} strokeWidth="0.8" opacity="0.6" />
        <line x1="53" y1="16" x2="67" y2="16" stroke={color} strokeWidth="0.8" opacity="0.6" />
        <line x1="54" y1="19" x2="66" y2="19" stroke={color} strokeWidth="0.8" opacity="0.6" />
        {/* Urgency rings */}
        <circle cx="60" cy="16" r="14" stroke={color} strokeWidth="1" opacity="0"
          style={{ animation: 'urgencyRing 1.5s ease-out infinite' }} />
        <circle cx="60" cy="16" r="14" stroke={color} strokeWidth="1" opacity="0"
          style={{ animation: 'urgencyRing 1.5s ease-out 0.75s infinite' }} />
        {/* Audience silhouettes */}
        {[15, 30, 90, 105].map((x, i) => (
          <g key={i}>
            <circle cx={x} cy="68" r="5" fill={`${color}25`} />
            <rect x={x - 5} y="73" width="10" height="7" rx="2" fill={`${color}20`} />
          </g>
        ))}
      </svg>
      {/* LIVE badge */}
      <div className="absolute top-2 right-4 flex items-center gap-1.5 border px-2 py-0.5" style={{ borderColor: color }}>
        <span className="w-1.5 h-1.5 rounded-full live-blip" style={{ background: color }} />
        <span className="text-[9px] font-bold tracking-widest" style={{ color }}>LIVE</span>
      </div>
    </div>
  );
}

function JournalistVisual({ color }: { color: string }) {
  return (
    <div className="relative w-full h-24 flex items-center justify-center overflow-hidden">
      {/* Newspaper */}
      <div
        className="rotate-in border relative overflow-hidden"
        style={{ borderColor: `${color}50`, width: '200px', background: '#080a14' }}
      >
        {/* Masthead */}
        <div className="px-3 pt-2 pb-1 border-b" style={{ borderColor: `${color}30` }}>
          <div className="flex items-center justify-between">
            <span className="text-[9px] tracking-[0.3em]" style={{ color }}>TECHBEAT</span>
            <span className="text-[9px] text-text-muted">BREAKING</span>
          </div>
        </div>
        {/* Headline placeholder bars */}
        <div className="px-3 py-2 space-y-1.5">
          <div className="h-2 w-full rounded-sm" style={{ background: `${color}40` }} />
          <div className="h-2 w-4/5 rounded-sm" style={{ background: `${color}30` }} />
          <div className="h-1.5 w-full rounded-sm mt-1" style={{ background: `${color}18` }} />
          <div className="h-1.5 w-5/6 rounded-sm" style={{ background: `${color}15` }} />
        </div>
        {/* Ticker tape */}
        <div className="border-t overflow-hidden" style={{ borderColor: `${color}30`, background: `${color}15` }}>
          <p
            className="text-[9px] py-1 whitespace-nowrap font-medium"
            style={{ color, animation: 'tickerScroll 6s linear infinite' }}
          >
            ◉ BREAKING NEWS ◉ AI STARTUP MARKET SHIFTS ◉ INVESTORS WATCHING ◉ BREAKING NEWS ◉
          </p>
        </div>
      </div>
    </div>
  );
}

function CustomerVisual({ color }: { color: string }) {
  return (
    <div className="relative w-full h-24 flex flex-col items-center justify-center gap-3">
      {/* Star rating */}
      <div className="flex gap-2">
        {[0, 1, 2, 3, 4].map((i) => (
          <svg
            key={i}
            className="star-pop w-6 h-6"
            style={{ animationDelay: `${i * 100}ms`, opacity: 0 }}
            viewBox="0 0 24 24"
            fill={i < 4 ? color : `${color}30`}
          >
            <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
          </svg>
        ))}
      </div>
      {/* Adoption bar */}
      <div className="w-40 h-1 rounded-full overflow-hidden" style={{ background: `${color}20` }}>
        <div
          className="h-full rounded-full bar-grow"
          style={{ width: '68%', background: color, transformOrigin: 'left' }}
        />
      </div>
      <p className="text-[9px] tracking-widest" style={{ color }}>68% ADOPTION SIGNAL</p>
    </div>
  );
}

function EmployeeVisual({ color }: { color: string }) {
  return (
    <div className="relative w-full h-24 flex items-center justify-center gap-6">
      {/* Person silhouette */}
      <svg viewBox="0 0 60 80" className="w-12 h-16" fill="none">
        <circle cx="30" cy="18" r="12" fill={`${color}50`} stroke={color} strokeWidth="1.5" />
        <path d="M8 75 Q8 50 30 50 Q52 50 52 75" fill={`${color}35`} stroke={color} strokeWidth="1.5" />
      </svg>
      {/* Speech bubble */}
      <div
        className="bubble-pop border px-3 py-2 relative max-w-[140px]"
        style={{ borderColor: `${color}60`, background: `${color}12`, opacity: 0 }}
      >
        <div className="space-y-1">
          <div className="h-1.5 w-full rounded" style={{ background: `${color}50` }} />
          <div className="h-1.5 w-4/5 rounded" style={{ background: `${color}35` }} />
          <div className="h-1.5 w-3/5 rounded" style={{ background: `${color}25` }} />
        </div>
        {/* Bubble tail */}
        <div
          className="absolute left-0 top-1/2 -translate-x-2 -translate-y-1/2 w-2 h-2 rotate-45"
          style={{ background: `${color}40` }}
        />
      </div>
    </div>
  );
}

function SystemVisual({ color }: { color: string }) {
  return (
    <div className="w-full h-16 flex items-center justify-center">
      <svg viewBox="0 0 120 40" className="w-48 h-12">
        <polyline
          points="0,30 20,20 40,25 60,10 80,18 100,8 120,15"
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          style={{
            strokeDasharray: 300,
            animation: 'chartLine 1.2s ease-out forwards',
          }}
        />
        {[20, 40, 60, 80, 100].map((x, i) => (
          <circle key={i} cx={x} cy={[20, 25, 10, 18, 8][i]} r="2.5" fill={color} opacity="0.8" />
        ))}
      </svg>
    </div>
  );
}
