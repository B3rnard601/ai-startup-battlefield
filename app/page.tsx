'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const EXAMPLE_IDEAS = [
  'AI lawyer for small businesses',
  'Decentralized health records for Africa',
  'AI-powered personal finance coach',
  'Carbon credit marketplace for SMBs',
  'AI tutor that adapts to ADHD learners',
];

export default function LandingPage() {
  const [idea, setIdea] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [placeholder, setPlaceholder] = useState('');
  const [exampleIndex, setExampleIndex] = useState(0);
  const router = useRouter();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Cycle through example ideas as placeholder
  useEffect(() => {
    let charIndex = 0;
    let currentExample = EXAMPLE_IDEAS[0];
    let isDeleting = false;
    let exIdx = 0;

    const tick = () => {
      if (!isDeleting) {
        setPlaceholder(currentExample.slice(0, charIndex + 1));
        charIndex++;
        if (charIndex === currentExample.length) {
          isDeleting = true;
          setTimeout(tick, 1800);
          return;
        }
      } else {
        setPlaceholder(currentExample.slice(0, charIndex - 1));
        charIndex--;
        if (charIndex === 0) {
          isDeleting = false;
          exIdx = (exIdx + 1) % EXAMPLE_IDEAS.length;
          currentExample = EXAMPLE_IDEAS[exIdx];
        }
      }
      setTimeout(tick, isDeleting ? 40 : 65);
    };

    const t = setTimeout(tick, 800);
    return () => clearTimeout(t);
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
        const data = await res.json();
        throw new Error(data.error || 'Failed to start game');
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
    <main className="min-h-screen flex flex-col items-center justify-center px-4 relative overflow-hidden">
      {/* Scanline overlay */}
      <div className="scanlines" />

      {/* Background grid */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `
            linear-gradient(#DCE0FF 1px, transparent 1px),
            linear-gradient(90deg, #DCE0FF 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
        }}
      />

      {/* Glow blob */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-[0.04]"
        style={{ background: 'radial-gradient(circle, #FF5F2D 0%, transparent 70%)' }}
      />

      <div className="relative z-10 w-full max-w-2xl">
        {/* Header */}
        <div className="mb-10">
          <p className="text-text-muted text-xs tracking-[0.3em] uppercase mb-4">
            Powered by 0G Compute + 0G Storage
          </p>
          <h1 className="text-4xl md:text-5xl font-bold leading-[1.1] tracking-tight text-text-primary">
            AI STARTUP
            <br />
            <span className="text-fire">BATTLEFIELD</span>
          </h1>
          <div className="mt-4 space-y-1 text-text-muted text-sm">
            <p>Build a startup. Survive the market.</p>
            <p>Convince the investors. Don't go bankrupt.</p>
          </div>
        </div>

        {/* Agent roster */}
        <div className="flex gap-3 mb-8 flex-wrap">
          {[
            { label: 'Investors', color: 'text-agent-investor', icon: '◈' },
            { label: 'Competitors', color: 'text-agent-competitor', icon: '◈' },
            { label: 'Customers', color: 'text-agent-customer', icon: '◈' },
            { label: 'Journalists', color: 'text-agent-journalist', icon: '◈' },
            { label: 'Employees', color: 'text-agent-employee', icon: '◈' },
          ].map((a) => (
            <span
              key={a.label}
              className={`text-xs ${a.color} bg-bg-elevated border border-border px-2 py-1`}
            >
              {a.icon} {a.label}
            </span>
          ))}
        </div>

        {/* Idea input form */}
        <form onSubmit={handleStart} className="space-y-3">
          <div className="border border-border bg-bg-surface focus-within:border-fire transition-colors">
            <div className="flex items-center px-4 py-2 border-b border-border">
              <span className="text-fire text-xs">▶</span>
              <span className="text-text-muted text-xs ml-2">STARTUP_IDEA.txt</span>
              <span className="ml-auto text-text-muted text-xs">Day 0</span>
            </div>
            <textarea
              ref={textareaRef}
              value={idea}
              onChange={(e) => setIdea(e.target.value)}
              placeholder={placeholder}
              rows={3}
              disabled={loading}
              className="w-full bg-transparent px-4 py-3 text-text-primary text-sm placeholder:text-text-muted focus:outline-none resize-none"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleStart(e as any);
                }
              }}
            />
          </div>

          {error && (
            <p className="text-danger text-xs px-1">✗ {error}</p>
          )}

          {status && (
            <p className="text-text-muted text-xs px-1 animate-pulse">
              ◌ {status}
            </p>
          )}

          <button
            type="submit"
            disabled={!idea.trim() || loading}
            className="w-full bg-fire text-white text-sm font-semibold py-3 px-6 
                       disabled:opacity-40 disabled:cursor-not-allowed 
                       hover:bg-opacity-90 transition-all tracking-wide
                       focus:outline-none focus:ring-2 focus:ring-fire focus:ring-offset-2 
                       focus:ring-offset-bg-base"
          >
            {loading ? '◌ INITIALIZING WORLD...' : '▶ START SIMULATION'}
          </button>
        </form>

        {/* Footer note */}
        <p className="mt-6 text-text-muted text-xs leading-relaxed">
          Every agent is powered by{' '}
          <span className="text-fire">0G Compute Router</span>. Game state is
          permanently stored on{' '}
          <span className="text-growth">0G Storage</span>. No scripted outcomes.
        </p>
      </div>
    </main>
  );
}
