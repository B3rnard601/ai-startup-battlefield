'use client';

import { useState, useEffect, useRef } from 'react';

const DEMO_SCRIPT = [
  { delay: 0,    type: 'system',   actor: 'SYSTEM',      content: 'Simulation initialized. Market analysis running...' },
  { delay: 1200, type: 'system',   actor: 'SYSTEM',      content: 'Startup: LexAI · Sector: LegalTech · TAM: $4.2B' },
  { delay: 2400, type: 'player',   actor: 'YOU',         content: 'I want to build an AI lawyer for small businesses.' },
  { delay: 4000, type: 'investor', actor: 'Marcus Chen',  content: 'Legal AI is getting crowded fast — Harvey just raised $100M. What\'s your moat against them? You need to answer this before Day 30.' },
  { delay: 7000, type: 'competitor',actor: 'LegalGPT',   content: '[LegalGPT] Announcing our SMB contract review suite — $49/mo, 10,000 templates. Launching in 2 weeks.' },
  { delay: 9500, type: 'customer', actor: 'Alex (SMB Owner)', content: 'I\'ve been paying $400/hr for a lawyer to review basic contracts. If this actually works, I\'m in on Day 1.' },
  { delay: 12000,type: 'player',   actor: 'YOU',         content: 'Launch MVP to the first 10 law firms. Focus on contract review.' },
  { delay: 13500,type: 'employee', actor: 'Sam (CTO)',   content: 'Contract review is doable in 3 weeks. But we\'re accumulating technical debt fast — we need to slow down or this breaks at scale.' },
  { delay: 16000,type: 'journalist',actor: 'TechBeat',  content: 'HEADLINE: "LexAI targets legal market as giants circle — can the underdog survive?"\nSTORY: The $4.2B legal AI space just got a new entrant. Investors are watching.' },
  { delay: 19500,type: 'investor', actor: 'Marcus Chen', content: 'I see traction but revenue is still zero. You have 4 months of runway. What\'s your path to first dollar?' },
  { delay: 22500,type: 'player',   actor: 'YOU',         content: 'Close 3 paying law firms at $500/mo each. Use the revenue to hire a second engineer.' },
  { delay: 24000,type: 'system',   actor: 'METRICS',     content: '▲ Revenue: +$1,500/mo · ▲ Users: +47 · ▼ Cash: -$8,000 · Runway: 5.2 months' },
  { delay: 26500,type: 'competitor',actor: 'LegalGPT',  content: '[LegalGPT] Series A confirmed: $12M raised. Expanding to 50 new markets. Your move.' },
  { delay: 29000,type: 'journalist',actor: 'TechBeat',  content: 'HEADLINE: "LegalGPT\'s $12M raise puts pressure on smaller legal AI startups"\nSTORY: Analysts say smaller players have 60 days to differentiate or die.' },
  { delay: 32000,type: 'system',   actor: 'SYSTEM',      content: 'Day 45 — Phase: COMPETITION · Reputation: 58 · Team Morale: 71' },
];

const AGENT_STYLES: Record<string, { color: string; bg: string; label: string; icon: string }> = {
  investor:   { color: '#FF8C42', bg: 'rgba(255,140,66,0.08)',  label: 'INVESTOR',   icon: '◈' },
  competitor: { color: '#FF3B4E', bg: 'rgba(255,59,78,0.08)',   label: 'COMPETITOR', icon: '⚔' },
  customer:   { color: '#10E8AA', bg: 'rgba(16,232,170,0.08)',  label: 'CUSTOMER',   icon: '◉' },
  journalist: { color: '#4D9DFF', bg: 'rgba(77,157,255,0.08)',  label: 'PRESS',      icon: '◎' },
  employee:   { color: '#9BA8C4', bg: 'rgba(155,168,196,0.08)', label: 'TEAM',       icon: '◌' },
  player:     { color: '#FF5F2D', bg: 'rgba(255,95,45,0.08)',   label: 'FOUNDER',    icon: '▶' },
  system:     { color: '#616880', bg: 'transparent',             label: 'SYSTEM',     icon: '—' },
};

interface Line {
  id: number;
  type: string;
  actor: string;
  content: string;
  visible: boolean;
  typing: boolean;
  displayText: string;
}

export default function AutoDemo() {
  const [lines, setLines] = useState<Line[]>([]);
  const [metrics, setMetrics] = useState({ revenue: 0, users: 0, cash: 50000, day: 1 });
  const scrollRef = useRef<HTMLDivElement>(null);
  const indexRef = useRef(0);
  const loopRef = useRef<NodeJS.Timeout>();

  function runDemo() {
    setLines([]);
    setMetrics({ revenue: 0, users: 0, cash: 50000, day: 1 });
    indexRef.current = 0;

    DEMO_SCRIPT.forEach((item, i) => {
      loopRef.current = setTimeout(() => {
        const newLine: Line = {
          id: i,
          type: item.type,
          actor: item.actor,
          content: item.content,
          visible: true,
          typing: true,
          displayText: '',
        };

        setLines((prev) => [...prev, newLine]);

        // Typewriter effect
        let charIdx = 0;
        const text = item.content;
        const typer = setInterval(() => {
          charIdx++;
          setLines((prev) =>
            prev.map((l) =>
              l.id === i ? { ...l, displayText: text.slice(0, charIdx), typing: charIdx < text.length } : l
            )
          );
          if (charIdx >= text.length) clearInterval(typer);
        }, 18);

        // Update metrics on metrics line
        if (item.content.includes('Revenue:')) {
          setMetrics({ revenue: 1500, users: 47, cash: 42000, day: 35 });
        }
        if (item.content.includes('Day 45')) {
          setMetrics((m) => ({ ...m, day: 45 }));
        }
      }, item.delay);
    });

    // Loop after full sequence
    setTimeout(() => runDemo(), DEMO_SCRIPT[DEMO_SCRIPT.length - 1].delay + 5000);
  }

  useEffect(() => {
    runDemo();
    return () => { if (loopRef.current) clearTimeout(loopRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [lines]);

  return (
    <div className="flex flex-col h-full">
      {/* Demo header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-growth animate-pulse" />
          <span className="text-[10px] text-text-muted tracking-widest">LIVE SIMULATION</span>
        </div>
        <div className="flex items-center gap-4 text-[10px] text-text-muted">
          <span>DAY <span className="text-text-primary font-medium">{metrics.day}</span></span>
          <span>MRR <span className="text-growth font-medium">${metrics.revenue.toLocaleString()}</span></span>
          <span>USERS <span className="text-growth font-medium">{metrics.users}</span></span>
          <span>CASH <span className={metrics.cash < 20000 ? 'text-danger font-medium' : 'text-text-primary font-medium'}>${metrics.cash.toLocaleString()}</span></span>
        </div>
      </div>

      {/* Feed */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-2 min-h-0">
        {lines.map((line) => {
          const style = AGENT_STYLES[line.type] ?? AGENT_STYLES.system;
          if (line.type === 'system') {
            return (
              <div key={line.id} className="text-[11px] text-agent-system py-0.5 animate-fade-in">
                — {line.displayText}{line.typing && <span className="opacity-70">█</span>}
              </div>
            );
          }
          if (line.type === 'player') {
            return (
              <div key={line.id} className="flex gap-2 items-baseline animate-slide-up">
                <span className="text-fire text-xs shrink-0">›</span>
                <span className="text-text-primary text-xs">
                  {line.displayText}{line.typing && <span className="text-fire animate-blink">█</span>}
                </span>
              </div>
            );
          }
          return (
            <div key={line.id} className="animate-slide-up rounded" style={{ background: style.bg }}>
              <div className="flex items-center gap-2 px-2 pt-1.5">
                <span className="text-[10px] font-bold tracking-widest" style={{ color: style.color }}>
                  {style.icon} {style.label}
                </span>
                <span className="text-[10px] text-text-muted">{line.actor}</span>
              </div>
              <div className="px-2 pb-2 pt-0.5 text-xs text-text-primary leading-relaxed border-l-2 ml-2" style={{ borderColor: style.color }}>
                {line.displayText}{line.typing && <span style={{ color: style.color }} className="animate-blink">█</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
