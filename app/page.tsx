'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';

const AutoDemo = dynamic(() => import('@/components/AutoDemo'), { ssr: false });

const AGENT_ROSTER = [
  { type: 'investor',   icon: '◈', label: 'Investors',   desc: 'Challenge your pitch',    color: '#FF8C42' },
  { type: 'competitor', icon: '⚔', label: 'Competitors', desc: 'Copy, undercut, attack',  color: '#FF3B4E' },
  { type: 'customer',   icon: '◉', label: 'Customers',   desc: 'Adopt or reject you',     color: '#10E8AA' },
  { type: 'journalist', icon: '◎', label: 'Press',       desc: 'Publish your story',      color: '#4D9DFF' },
  { type: 'employee',   icon: '◌', label: 'Team',        desc: 'Push back, burn out',     color: '#9BA8C4' },
];

const EXAMPLE_IDEAS = [
  'AI lawyer for small businesses',
  'Decentralized health records for Africa',
  'AI finance coach for Gen Z',
  'Carbon credits marketplace for SMBs',
  'AI tutor for ADHD learners',
];

export default function LandingPage() {
  const [idea, setIdea] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [placeholder, setPlaceholder] = useState('');
  const router = useRouter();

  // Animated placeholder cycling through example ideas
  useEffect(() => {
    let charIdx = 0;
    let exIdx = 0;
    let deleting = false;
    let current = EXAMPLE_IDEAS[0];
    let raf: ReturnType<typeof setTimeout>;

    const tick = () => {
      if (!deleting) {
        setPlaceholder(current.slice(0, charIdx + 1));
        charIdx++;
        if (charIdx === current.length) {
          deleting = true;
          raf = setTimeout(tick, 1600);
          return;
        }
      } else {
        setPlaceholder(current.slice(0, charIdx - 1));
        charIdx--;
        if (charIdx === 0) {
          deleting = false;
          exIdx = (exIdx + 1) % EXAMPLE_IDEAS.length;
          current = EXAMPLE_IDEAS[exIdx];
        }
      }
      raf = setTimeout(tick, deleting ? 35 : 60);
    };
    raf = setTimeout(tick, 800);
    return () => clearTimeout(raf);
  }, []);

  async function handleStart(e: React.FormEvent) {
    e.preventDefault();
    if (!idea.trim() || loading) return;
    setLoading(true);
    setError('');
    setStatus('Analyzing your idea via 0G Compute...');
    try {
      const res = await fetch('/api/game/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idea: idea.trim() }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Failed to start');
      }
      setStatus('Saving world state to 0G Storage...');
      const data = await res.json();
      router.push(`/game/${data.sessionId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setLoading(false);
      setStatus('');
    }
  }

  return (
    <main className="min-h-screen flex flex-col overflow-hidden relative bg-bg-base">

      {/* ── Scanline overlay ──────────────────────────────────── */}
      <div className="scanlines pointer-events-none" />

      {/* ── Animated background grid ─────────────────────────── */}
      <div className="absolute inset-0 opacity-[0.035] pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(#DCE0FF 1px, transparent 1px), linear-gradient(90deg, #DCE0FF 1px, transparent 1px)`,
          backgroundSize: '48px 48px',
        }}
      />

      {/* ── Glow orbs ─────────────────────────────────────────── */}
      <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(255,95,45,0.07) 0%, transparent 70%)', filter: 'blur(40px)' }}
      />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(16,232,170,0.05) 0%, transparent 70%)', filter: 'blur(40px)' }}
      />

      {/* ── Top bar ───────────────────────────────────────────── */}
      <header className="relative z-10 border-b border-border px-6 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-fire font-bold text-sm">▶</span>
          <span className="text-text-primary text-sm font-semibold tracking-wide">AI STARTUP BATTLEFIELD</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-text-muted tracking-widest">POWERED BY</span>
          <span className="text-[10px] text-fire border border-fire px-2 py-0.5">0G COMPUTE</span>
          <span className="text-[10px] text-growth border border-growth px-2 py-0.5">0G STORAGE</span>
        </div>
      </header>

      {/* ── Main content ─────────────────────────────────────── */}
      <div className="relative z-10 flex flex-1 overflow-hidden">

        {/* ── LEFT: Hero + input ──────────────────────────────── */}
        <div className="flex flex-col justify-center px-8 lg:px-16 py-12 w-full lg:w-1/2 xl:w-5/12 shrink-0">

          {/* Badge */}
          <div className="inline-flex items-center gap-2 mb-8 w-fit">
            <span className="w-1.5 h-1.5 rounded-full bg-growth animate-pulse" />
            <span className="text-[10px] text-text-muted tracking-[0.25em] uppercase">Live Simulation · No Scripted Outcomes</span>
          </div>

          {/* Headline */}
          <h1 className="text-5xl lg:text-6xl font-bold leading-[1.0] tracking-tight mb-2">
            <span className="text-text-primary">BUILD</span><br />
            <span className="text-text-primary">A STARTUP.</span><br />
            <span className="text-fire">SURVIVE.</span>
          </h1>

          <p className="text-text-muted text-sm mt-4 mb-8 leading-relaxed max-w-sm">
            Every investor, competitor, customer, journalist, and employee is a live AI agent.
            They remember. They react. They evolve.
          </p>

          {/* Agent roster */}
          <div className="grid grid-cols-5 gap-2 mb-8">
            {AGENT_ROSTER.map((a) => (
              <div key={a.type} className="flex flex-col items-center gap-1.5 p-2 border border-border bg-bg-surface hover:border-opacity-60 transition-all group" style={{ '--hover-color': a.color } as React.CSSProperties}>
                <span className="text-lg" style={{ color: a.color }}>{a.icon}</span>
                <span className="text-[9px] text-text-muted tracking-wider text-center">{a.label}</span>
              </div>
            ))}
          </div>

          {/* Input */}
          <form onSubmit={handleStart} className="space-y-3 max-w-md">
            <div className="border border-border bg-bg-surface focus-within:border-fire transition-colors">
              <div className="flex items-center px-3 py-2 border-b border-border gap-2">
                <span className="text-fire text-xs">▶</span>
                <span className="text-text-muted text-[10px] tracking-widest">STARTUP_IDEA.input</span>
                <span className="ml-auto text-[10px] text-text-muted">↵ to launch</span>
              </div>
              <textarea
                value={idea}
                onChange={(e) => setIdea(e.target.value)}
                placeholder={placeholder}
                rows={2}
                disabled={loading}
                className="w-full bg-transparent px-3 py-3 text-text-primary text-sm placeholder:text-text-muted focus:outline-none resize-none"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleStart(e as any); }
                }}
              />
            </div>

            {error && <p className="text-danger text-xs">✗ {error}</p>}
            {status && <p className="text-text-muted text-xs animate-pulse">◌ {status}</p>}

            <button
              type="submit"
              disabled={!idea.trim() || loading}
              className="w-full bg-fire text-white text-sm font-bold py-3 tracking-widest
                         disabled:opacity-30 disabled:cursor-not-allowed
                         hover:brightness-110 transition-all"
            >
              {loading ? '◌  INITIALIZING WORLD...' : '▶  START SIMULATION'}
            </button>
          </form>

          {/* Footer */}
          <p className="mt-6 text-[10px] text-text-muted leading-relaxed max-w-sm">
            Game state permanently stored on <span className="text-growth">0G Storage</span>.
            Share your session URL — anyone can replay your startup journey.
          </p>
        </div>

        {/* ── RIGHT: Live demo panel ───────────────────────────── */}
        <div className="hidden lg:flex flex-1 border-l border-border flex-col overflow-hidden">

          {/* Panel header */}
          <div className="border-b border-border px-6 py-3 bg-bg-surface flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-danger opacity-70" />
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#FF8C42', opacity: 0.7 }} />
                <div className="w-2.5 h-2.5 rounded-full bg-growth opacity-70" />
              </div>
              <span className="text-xs text-text-muted tracking-widest">DEMO — AI LAWYER FOR SMALL BUSINESSES</span>
            </div>
            <span className="text-[10px] text-fire animate-pulse">● RUNNING</span>
          </div>

          {/* Auto-running demo */}
          <div className="flex-1 overflow-hidden">
            <AutoDemo />
          </div>

          {/* Bottom CTA overlay */}
          <div className="border-t border-border px-6 py-4 bg-bg-surface flex items-center justify-between shrink-0">
            <p className="text-xs text-text-muted">This simulation is running live. Enter your own idea to start yours.</p>
            <button
              onClick={() => document.querySelector('textarea')?.focus()}
              className="text-xs text-fire border border-fire px-4 py-1.5 hover:bg-fire hover:text-white transition-all"
            >
              START YOURS →
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
