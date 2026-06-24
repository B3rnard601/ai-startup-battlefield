'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import type { GameState, StreamEvent, AgentType } from '@/types/game';
import MetricsDashboard from '@/components/MetricsDashboard';
import NewsTimeline from '@/components/NewsTimeline';

const AGENT_CONFIG: Record<string, { color: string; bg: string; label: string; icon: string }> = {
  investor:   { color: '#FF8C42', bg: 'rgba(255,140,66,0.06)',  label: 'INVESTOR',   icon: '◈' },
  competitor: { color: '#FF3B4E', bg: 'rgba(255,59,78,0.06)',   label: 'COMPETITOR', icon: '⚔' },
  customer:   { color: '#10E8AA', bg: 'rgba(16,232,170,0.06)',  label: 'CUSTOMER',   icon: '◉' },
  journalist: { color: '#4D9DFF', bg: 'rgba(77,157,255,0.06)',  label: 'PRESS',      icon: '◎' },
  employee:   { color: '#9BA8C4', bg: 'rgba(155,168,196,0.06)', label: 'TEAM',       icon: '◌' },
  system:     { color: '#616880', bg: 'transparent',             label: 'SYSTEM',     icon: '—' },
};

const PHASE_CONFIG: Record<string, { label: string; color: string }> = {
  idea:        { label: 'IDEA STAGE',   color: '#9BA8C4' },
  build:       { label: 'BUILDING',     color: '#4D9DFF' },
  market:      { label: 'GO-TO-MARKET', color: '#10E8AA' },
  competition: { label: 'COMPETITION',  color: '#FF8C42' },
  fundraising: { label: 'FUNDRAISING',  color: '#FFCC42' },
  scale:       { label: 'SCALING',      color: '#B042FF' },
  dead:        { label: 'BANKRUPT',     color: '#FF3B4E' },
  unicorn:     { label: 'UNICORN 🦄',   color: '#10E8AA' },
  acquired:    { label: 'ACQUIRED',     color: '#B042FF' },
  ipo:         { label: 'IPO',          color: '#FFCC42' },
};

const QUICK_ACTIONS = [
  'Pitch the lead investor for seed funding',
  'Launch MVP to first 10 customers',
  'Hire a CTO from a top tech company',
  'Cut prices to undercut the competitor',
  'Respond to the journalist story',
];

interface TerminalLine {
  id: string;
  type: string;
  actor?: string;
  content: string;
  streaming?: boolean;
  isNew?: boolean;
}

export default function GamePage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.sessionId as string;

  const [gameState, setGameState] = useState<GameState | null>(null);
  const [lines, setLines] = useState<TerminalLine[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [saveStatus, setSaveStatus] = useState('');
  const [gameOver, setGameOver] = useState<string | null>(null);
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [notification, setNotification] = useState<{ text: string; type: 'good' | 'bad' | 'info' } | null>(null);

  const terminalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const streamingLineIdRef = useRef<string | null>(null);

  // Load game state
  useEffect(() => {
    async function loadGame() {
      try {
        const res = await fetch(`/api/game/load/${sessionId}`);
        if (!res.ok) throw new Error('Session not found');
        const data = await res.json();
        const state: GameState = data.gameState;
        setGameState(state);

        const termLines: TerminalLine[] = state.history.map((ev) => ({
          id: ev.id,
          type: ev.actor === 'player' ? 'player' : (ev.agentType ?? 'system'),
          actor: ev.agentType ? undefined : ev.actor,
          content: ev.content,
        }));

        if (termLines.length === 0) {
          termLines.push(
            { id: 'sys-1', type: 'system', content: `World initialized — ${state.startupName} enters the ${state.sector} market.` },
            { id: 'sys-2', type: 'system', content: `Starting capital: $${state.metrics.cash.toLocaleString()} · Runway: ${state.metrics.runway} months` },
            { id: 'sys-3', type: 'system', content: `Competitors: ${state.agents.competitors.map(c => c.name).join(', ')}` },
          );
        }
        setLines(termLines);
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : 'Failed to load game');
      }
    }
    loadGame();
  }, [sessionId]);

  useEffect(() => {
    if (terminalRef.current) terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
  }, [lines]);

  function showNotif(text: string, type: 'good' | 'bad' | 'info') {
    setNotification({ text, type });
    setTimeout(() => setNotification(null), 3500);
  }

  const handleAction = useCallback(async (actionText?: string) => {
    const playerAction = (actionText ?? input).trim();
    if (!playerAction || isStreaming || !gameState) return;
    setInput('');
    setShowQuickActions(false);
    setIsStreaming(true);

    setLines((prev) => [...prev, {
      id: `player-${Date.now()}`,
      type: 'player',
      content: playerAction,
      isNew: true,
    }]);

    try {
      const res = await fetch('/api/game/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, playerAction }),
      });
      if (!res.body) throw new Error('No stream');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split('\n\n');
        buffer = parts.pop() ?? '';
        for (const part of parts) {
          if (!part.startsWith('data: ')) continue;
          handleStreamEvent(JSON.parse(part.slice(6)));
        }
      }
    } catch (err) {
      setLines((prev) => [...prev, {
        id: `err-${Date.now()}`,
        type: 'system',
        content: `✗ ${err instanceof Error ? err.message : 'Stream failed'}`,
      }]);
    } finally {
      setIsStreaming(false);
      streamingLineIdRef.current = null;
      inputRef.current?.focus();
    }
  }, [input, isStreaming, gameState, sessionId]);

  function handleStreamEvent(event: StreamEvent) {
    switch (event.type) {
      case 'agent_start': {
        const lineId = `agent-${event.agent}-${Date.now()}`;
        streamingLineIdRef.current = lineId;
        setLines((prev) => [...prev, { id: lineId, type: event.agent, actor: event.agentName, content: '', streaming: true, isNew: true }]);
        break;
      }
      case 'token': {
        const id = streamingLineIdRef.current;
        if (!id) return;
        setLines((prev) => prev.map((l) => l.id === id ? { ...l, content: l.content + event.content } : l));
        break;
      }
      case 'agent_end': {
        const id = streamingLineIdRef.current;
        if (!id) return;
        setLines((prev) => prev.map((l) => l.id === id ? { ...l, streaming: false } : l));
        streamingLineIdRef.current = null;
        break;
      }
      case 'metrics_update': {
        setGameState((prev) => prev ? { ...prev, metrics: event.metrics, day: prev.day + 1 } : prev);
        if ((event.delta.revenue ?? 0) > 0) showNotif(`+$${event.delta.revenue?.toLocaleString()} revenue`, 'good');
        if ((event.delta.reputation ?? 0) < -5) showNotif('Reputation dropping', 'bad');
        break;
      }
      case 'snapshot_saved': {
        setSaveStatus(`Day ${event.day} saved`);
        setTimeout(() => setSaveStatus(''), 4000);
        showNotif('Saved to 0G Storage', 'info');
        break;
      }
      case 'game_over':
        setGameOver(event.outcome);
        break;
      case 'error':
        setLines((prev) => [...prev, { id: `err-${Date.now()}`, type: 'system', content: `✗ ${event.message}` }]);
        break;
    }
  }

  async function handleManualSave() {
    setSaveStatus('Saving...');
    try {
      const res = await fetch('/api/game/snapshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      });
      const d = await res.json();
      setSaveStatus(`Saved`);
      showNotif('Checkpoint saved to 0G Storage', 'info');
      setTimeout(() => setSaveStatus(''), 4000);
    } catch { setSaveStatus('Failed'); }
  }

  if (loadError) return (
    <div className="min-h-screen flex items-center justify-center flex-col gap-4">
      <p className="text-danger text-sm">✗ {loadError}</p>
      <button onClick={() => router.push('/')} className="text-text-muted text-xs underline">← New game</button>
    </div>
  );

  if (!gameState) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-text-muted text-sm animate-pulse">◌ Loading from 0G Storage...</p>
    </div>
  );

  const m = gameState.metrics;
  const phase = PHASE_CONFIG[gameState.phase] ?? PHASE_CONFIG.idea;

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-bg-base">
      <div className="scanlines pointer-events-none" />

      {/* ── Notification toast ──────────────────────────────────── */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-2 text-xs font-medium animate-slide-up border
          ${notification.type === 'good' ? 'border-growth text-growth bg-bg-surface' :
            notification.type === 'bad' ? 'border-danger text-danger bg-bg-surface' :
            'border-info text-info bg-bg-surface'}`}>
          {notification.text}
        </div>
      )}

      {/* ── Top header bar ──────────────────────────────────────── */}
      <header className="border-b border-border bg-bg-surface flex items-center px-4 py-2 gap-3 shrink-0">
        <span className="text-fire font-bold">▶</span>
        <span className="text-text-primary font-semibold text-sm">{gameState.startupName}</span>
        <span className="text-xs px-2 py-0.5 border" style={{ borderColor: phase.color, color: phase.color }}>
          {phase.label}
        </span>
        <div className="flex items-center gap-4 ml-2 text-xs text-text-muted">
          <span>DAY <span className="text-text-primary font-medium">{gameState.day}</span></span>
          <span className="hidden sm:inline">MRR <span className="text-growth font-medium">${m.revenue.toLocaleString()}</span></span>
          <span className="hidden sm:inline">USERS <span className="text-growth font-medium">{m.users.toLocaleString()}</span></span>
          <span>RUNWAY <span className={m.runway < 3 ? 'text-danger font-medium' : 'text-text-primary font-medium'}>{m.runway}mo</span></span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {saveStatus && <span className="text-xs text-growth">{saveStatus}</span>}
          <button onClick={handleManualSave} disabled={isStreaming}
            className="text-xs text-text-muted border border-border px-2 py-1 hover:border-growth hover:text-growth transition-colors disabled:opacity-30">
            ◎ Save
          </button>
          <button onClick={() => router.push('/')} className="text-xs text-text-muted hover:text-text-primary transition-colors">
            ← Exit
          </button>
        </div>
      </header>

      {/* ── Main layout ─────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── Terminal panel ────────────────────────────────────── */}
        <div className="flex flex-col flex-1 border-r border-border overflow-hidden">
          <div className="border-b border-border px-4 py-2 bg-bg-surface flex items-center gap-2 shrink-0">
            <span className="text-xs text-text-muted tracking-widest">SITUATION ROOM</span>
            <span className="ml-auto text-xs text-text-muted">{gameState.sector} · {gameState.founderStyle}</span>
          </div>

          {/* Feed */}
          <div ref={terminalRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
            {lines.map((line) => <FeedLine key={line.id} line={line} />)}
            {isStreaming && !streamingLineIdRef.current && (
              <div className="text-text-muted text-xs animate-pulse flex items-center gap-2">
                <span className="inline-block w-3 h-3 border border-text-muted rounded-full animate-spin border-t-transparent" />
                Agents processing...
              </div>
            )}
            {gameOver && (
              <GameOverCard outcome={gameOver} onRestart={() => router.push('/')} />
            )}
          </div>

          {/* Input area */}
          {!gameOver && (
            <div className="border-t border-border bg-bg-surface shrink-0">
              {showQuickActions && (
                <div className="border-b border-border p-3 grid grid-cols-1 gap-1">
                  {QUICK_ACTIONS.map((action) => (
                    <button key={action} onClick={() => handleAction(action)}
                      className="text-left text-xs text-text-muted hover:text-text-primary hover:bg-bg-elevated px-2 py-1.5 transition-colors">
                      › {action}
                    </button>
                  ))}
                </div>
              )}
              <div className="flex items-center px-4 py-3 gap-3">
                <span className="text-fire shrink-0">›</span>
                <input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAction()}
                  placeholder={isStreaming ? 'Agents are responding...' : 'What do you do?'}
                  disabled={isStreaming}
                  autoFocus
                  className="flex-1 bg-transparent text-text-primary text-sm placeholder:text-text-muted focus:outline-none disabled:opacity-40"
                />
                <button onClick={() => setShowQuickActions(v => !v)}
                  className="text-xs text-text-muted hover:text-text-primary border border-border px-2 py-1 transition-colors shrink-0">
                  ⚡
                </button>
                <button onClick={() => handleAction()} disabled={!input.trim() || isStreaming}
                  className="text-xs text-fire border border-fire px-3 py-1 hover:bg-fire hover:text-white transition-all disabled:opacity-30 shrink-0">
                  ↵
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── Right panel ───────────────────────────────────────── */}
        <div className="w-72 xl:w-80 flex flex-col overflow-hidden shrink-0">
          <MetricsDashboard state={gameState} />
          <NewsTimeline
            events={gameState.history.filter((e) => e.eventType === 'news')}
            snapshots={gameState.snapshots}
            sessionId={sessionId}
          />
        </div>
      </div>
    </div>
  );
}

function FeedLine({ line }: { line: TerminalLine }) {
  const cfg = AGENT_CONFIG[line.type] ?? AGENT_CONFIG.system;

  if (line.type === 'player') {
    return (
      <div className="flex gap-2 items-baseline terminal-line">
        <span className="text-fire text-sm shrink-0">›</span>
        <span className="text-text-primary text-sm">{line.content}</span>
      </div>
    );
  }
  if (line.type === 'system') {
    return <div className="text-agent-system text-xs py-0.5 terminal-line">— {line.content}</div>;
  }
  return (
    <div className="terminal-line rounded-sm overflow-hidden" style={{ background: cfg.bg }}>
      <div className="flex items-center gap-2 px-2 pt-2 pb-1">
        <span className="text-[10px] font-bold tracking-widest" style={{ color: cfg.color }}>
          {cfg.icon} {cfg.label}
        </span>
        {line.actor && <span className="text-[10px] text-text-muted">{line.actor}</span>}
      </div>
      <div className="px-3 pb-2 text-sm text-text-primary leading-relaxed border-l-2 ml-2" style={{ borderColor: cfg.color }}>
        {line.content}
        {line.streaming && <span style={{ color: cfg.color }} className="animate-blink">█</span>}
      </div>
    </div>
  );
}

function GameOverCard({ outcome, onRestart }: { outcome: string; onRestart: () => void }) {
  const isWin = ['unicorn', 'acquired', 'ipo'].includes(outcome);
  const msgs: Record<string, string> = {
    dead: 'STARTUP BANKRUPT — The market has spoken.',
    unicorn: 'UNICORN ACHIEVED — You changed the world.',
    acquired: 'ACQUIRED — A new chapter begins.',
    ipo: 'IPO COMPLETE — See you on the NASDAQ.',
  };
  return (
    <div className={`border p-4 text-center space-y-2 ${isWin ? 'border-growth' : 'border-danger'}`}>
      <p className={`font-bold tracking-widest text-sm ${isWin ? 'text-growth' : 'text-danger'}`}>
        {msgs[outcome] ?? outcome.toUpperCase()}
      </p>
      <button onClick={onRestart} className="text-xs text-text-muted underline">
        Start a new startup →
      </button>
    </div>
  );
}
