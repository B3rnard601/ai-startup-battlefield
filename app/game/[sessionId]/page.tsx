'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import type { GameState, StreamEvent, AgentType, MetricsDelta } from '@/types/game';
import MetricsDashboard from '@/components/MetricsDashboard';
import NewsTimeline from '@/components/NewsTimeline';
import EventScene from '@/components/EventScene';
import { useVoice } from '@/hooks/useVoice';

const PHASE_CONFIG: Record<string, { label: string; color: string }> = {
  idea:        { label: 'IDEA STAGE',   color: '#9BA8C4' },
  build:       { label: 'BUILDING',     color: '#4D9DFF' },
  market:      { label: 'GO-TO-MARKET', color: '#10E8AA' },
  competition: { label: 'COMPETITION',  color: '#FF8C42' },
  fundraising: { label: 'FUNDRAISING',  color: '#FFCC42' },
  scale:       { label: 'SCALING',      color: '#B042FF' },
  dead:        { label: 'BANKRUPT',     color: '#FF3B4E' },
  unicorn:     { label: 'UNICORN',      color: '#10E8AA' },
  acquired:    { label: 'ACQUIRED',     color: '#B042FF' },
  ipo:         { label: 'IPO',          color: '#FFCC42' },
};

const AGENT_COLORS: Record<string, string> = {
  investor: '#FF8C42', competitor: '#FF3B4E',
  customer: '#10E8AA', journalist: '#4D9DFF',
  employee: '#9BA8C4', system: '#616880',
};

const QUICK_ACTIONS = [
  'Pitch the lead investor for seed funding',
  'Launch MVP to first 10 customers',
  'Hire a CTO from a top tech company',
  'Cut prices to undercut the competitor',
  'Respond to the latest journalist story',
  'Run a growth experiment on social media',
];

interface ActiveScene {
  agent: AgentType | 'system';
  agentName: string;
  content: string;
  streaming: boolean;
  delta?: MetricsDelta;
}

interface HistoryItem {
  id: string;
  type: 'player' | AgentType | 'system';
  actor?: string;
  content: string;
}

export default function GamePage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.sessionId as string;

  const [gameState, setGameState]     = useState<GameState | null>(null);
  const [history, setHistory]         = useState<HistoryItem[]>([]);
  const [activeScene, setActiveScene] = useState<ActiveScene | null>(null);
  const [input, setInput]             = useState('');
  const [isStreaming, setIsStreaming]  = useState(false);
  const [loadError, setLoadError]     = useState('');
  const [saveStatus, setSaveStatus]   = useState('');
  const [gameOver, setGameOver]       = useState<string | null>(null);
  const [showQuick, setShowQuick]     = useState(false);
  const [toast, setToast]             = useState<{ msg: string; good: boolean } | null>(null);

  const sceneContentRef = useRef('');
  const sceneAgentRef   = useRef<AgentType | 'system'>('system');
  const sceneNameRef    = useRef('');
  const historyRef      = useRef<HTMLDivElement>(null);
  const inputRef        = useRef<HTMLInputElement>(null);
  const { voiceEnabled, toggleVoice, speak, stopSpeaking, startListening, stopListening, listening, supported } = useVoice();

  function showToast(msg: string, good: boolean) {
    setToast({ msg, good });
    setTimeout(() => setToast(null), 3000);
  }

  // ── Load game ──────────────────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/game/load/${sessionId}`);
        if (!res.ok) throw new Error('Session not found');
        const data = await res.json();
        const state: GameState = data.gameState;
        setGameState(state);

        if (state.history.length === 0) {
          setHistory([
            { id: 'sys-1', type: 'system', content: `${state.startupName} enters the ${state.sector} market.` },
            { id: 'sys-2', type: 'system', content: `Capital: $${state.metrics.cash.toLocaleString()} · Runway: ${state.metrics.runway}mo` },
            { id: 'sys-3', type: 'system', content: `Rivals: ${state.agents.competitors.map(c => c.name).join(', ')}` },
          ]);
        } else {
          setHistory(state.history.map(ev => ({
            id: ev.id,
            type: (ev.actor === 'player' ? 'player' : ev.agentType ?? 'system') as HistoryItem['type'],
            actor: ev.agentType ? ev.agentType : undefined,
            content: ev.content,
          })));
        }
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : 'Failed to load');
      }
    }
    load();
  }, [sessionId]);

  useEffect(() => {
    if (historyRef.current) historyRef.current.scrollLeft = historyRef.current.scrollWidth;
  }, [history]);

  // ── Action ─────────────────────────────────────────────────────────────────
  const handleAction = useCallback(async (override?: string) => {
    const action = (override ?? input).trim();
    if (!action || isStreaming || !gameState) return;
    setInput('');
    setShowQuick(false);
    setIsStreaming(true);

    setHistory(prev => [...prev, { id: `p-${Date.now()}`, type: 'player', content: action }]);

    try {
      const res = await fetch('/api/game/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, playerAction: action }),
      });
      if (!res.body) throw new Error('No stream');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const parts = buf.split('\n\n');
        buf = parts.pop() ?? '';
        for (const part of parts) {
          if (part.startsWith('data: ')) handleSSE(JSON.parse(part.slice(6)));
        }
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Stream failed', false);
    } finally {
      setIsStreaming(false);
      inputRef.current?.focus();
    }
  }, [input, isStreaming, gameState, sessionId]);

  function handleSSE(event: StreamEvent) {
    switch (event.type) {
      case 'agent_start':
        sceneAgentRef.current   = event.agent;
        sceneNameRef.current    = event.agentName;
        sceneContentRef.current = '';
        setActiveScene({ agent: event.agent, agentName: event.agentName, content: '', streaming: true });
        break;

      case 'token':
        sceneContentRef.current += event.content;
        setActiveScene(prev => prev ? { ...prev, content: prev.content + event.content } : prev);
        break;

      case 'agent_end':
        setActiveScene(prev => prev ? { ...prev, streaming: false } : prev);
        speak(sceneContentRef.current, event.agent);
        setHistory(prev => [...prev, {
          id: `ag-${Date.now()}`,
          type: event.agent as HistoryItem['type'],
          actor: event.agentName,
          content: sceneContentRef.current,
        }]);
        break;

      case 'metrics_update':
        setGameState(prev => prev ? { ...prev, metrics: event.metrics, day: prev.day + 1 } : prev);
        setActiveScene(prev => prev ? { ...prev, delta: event.delta } : prev);
        if ((event.delta.revenue ?? 0) > 500) showToast(`Revenue +$${event.delta.revenue?.toLocaleString()}`, true);
        if ((event.delta.reputation ?? 0) < -8) showToast('Reputation taking a hit', false);
        if ((event.delta.cash ?? 0) < -10000) showToast(`Spent $${Math.abs(event.delta.cash ?? 0).toLocaleString()}`, false);
        break;

      case 'snapshot_saved':
        setSaveStatus('Saved to 0G Storage');
        showToast('Checkpoint saved to 0G Storage', true);
        setTimeout(() => setSaveStatus(''), 4000);
        // Advance URL to new root hash — the URL IS the save slot
        router.replace(`/game/${event.rootHash}`);
        break;

      case 'game_over':
        setGameOver(event.outcome);
        setActiveScene(null);
        break;

      case 'error':
        showToast(event.message, false);
        break;
    }
  }

  function dismissScene() {
    stopSpeaking();
    setActiveScene(null);
  }

  async function manualSave() {
    setSaveStatus('Saving...');
    try {
      await fetch('/api/game/snapshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      });
      setSaveStatus('Saved');
      showToast('Saved to 0G Storage', true);
      setTimeout(() => setSaveStatus(''), 4000);
    } catch { setSaveStatus('Failed'); }
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  if (loadError) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4">
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
    <div className="h-screen flex flex-col overflow-hidden bg-bg-base font-mono">
      <div className="scanlines pointer-events-none" />

      {/* ── Toast ───────────────────────────────────────────────────── */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-2 text-xs font-medium border scene-enter
          ${toast.good ? 'border-growth text-growth bg-bg-surface' : 'border-danger text-danger bg-bg-surface'}`}>
          {toast.good ? '▲' : '▼'} {toast.msg}
        </div>
      )}

      {/* ── Header ──────────────────────────────────────────────────── */}
      <header className="border-b border-border bg-bg-surface flex items-center px-4 py-2 gap-3 shrink-0">
        <span className="text-fire font-bold">▶</span>
        <span className="text-text-primary font-semibold text-sm">{gameState.startupName}</span>
        <span className="text-[10px] px-2 py-0.5 border" style={{ borderColor: phase.color, color: phase.color }}>
          {phase.label}
        </span>
        <div className="flex items-center gap-4 ml-1 text-xs text-text-muted">
          <span>DAY <span className="text-text-primary font-medium">{gameState.day}</span></span>
          <span className="hidden sm:inline">MRR <span className="text-growth font-medium">${m.revenue.toLocaleString()}</span></span>
          <span className="hidden md:inline">USERS <span className="text-growth font-medium">{m.users.toLocaleString()}</span></span>
          <span>RUNWAY <span className={m.runway < 3 ? 'text-danger font-medium' : 'text-text-primary font-medium'}>{m.runway}mo</span></span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {saveStatus && <span className="text-[10px] text-growth">{saveStatus}</span>}
          <button onClick={manualSave} disabled={isStreaming}
            className="text-[10px] text-text-muted border border-border px-2 py-1 hover:border-growth hover:text-growth transition-colors disabled:opacity-30">
            ◎ Save
          </button>
          {supported && (
            <button onClick={toggleVoice}
              title={voiceEnabled ? 'Voice on' : 'Voice off'}
              className={`text-[10px] border px-2 py-1 transition-colors ${voiceEnabled ? 'border-growth text-growth' : 'border-border text-text-muted hover:border-growth hover:text-growth'}`}>
              {voiceEnabled ? '🔊 ON' : '🔇 OFF'}
            </button>
          )}
          <button onClick={() => router.push('/')} className="text-[10px] text-text-muted hover:text-text-primary">← Exit</button>
        </div>
      </header>

      {/* ── Body ────────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── Left: Scene + history + input ───────────────────────── */}
        <div className="flex flex-col flex-1 overflow-hidden border-r border-border">

          {/* Active event scene */}
          <div className={`transition-all duration-300 shrink-0 ${activeScene ? 'flex-1' : 'hidden'}`}>
            {activeScene && (
              <EventScene
                agent={activeScene.agent}
                agentName={activeScene.agentName}
                content={activeScene.content}
                streaming={activeScene.streaming}
                delta={activeScene.delta as any}
                onDismiss={dismissScene}
                autoDismissMs={7000}
              />
            )}
          </div>

          {/* No active scene: show idle state */}
          {!activeScene && !gameOver && (
            <div className="flex-1 flex flex-col items-center justify-center text-center px-8 gap-3">
              <div className="w-12 h-12 border border-border flex items-center justify-center">
                <span className="text-fire text-xl">▶</span>
              </div>
              <p className="text-text-primary text-sm font-medium">{gameState.startupName}</p>
              <p className="text-text-muted text-xs max-w-xs">
                {isStreaming
                  ? 'Agents are deliberating...'
                  : `Day ${gameState.day} · ${phase.label} · Make your next move below`}
              </p>
              {isStreaming && (
                <div className="flex gap-1 mt-2">
                  {['investor','competitor','journalist'].map((a,i) => (
                    <div key={a} className="w-1.5 h-1.5 rounded-full animate-bounce"
                      style={{ background: AGENT_COLORS[a], animationDelay: `${i*150}ms` }} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Game over */}
          {gameOver && (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 px-8">
              <GameOverCard outcome={gameOver} onRestart={() => router.push('/')} />
            </div>
          )}

          {/* ── History strip ─────────────────────────────────────── */}
          <div ref={historyRef}
            className="border-t border-border flex gap-2 px-3 py-2 overflow-x-auto shrink-0 min-h-[52px]"
            style={{ scrollbarWidth: 'thin' }}>
            {history.map((item) => (
              <HistoryChip key={item.id} item={item} />
            ))}
          </div>

          {/* ── Input ─────────────────────────────────────────────── */}
          {!gameOver && (
            <div className="border-t border-border bg-bg-surface shrink-0">
              {showQuick && (
                <div className="border-b border-border p-2 grid gap-1">
                  {QUICK_ACTIONS.map(a => (
                    <button key={a} onClick={() => handleAction(a)}
                      className="text-left text-xs text-text-muted hover:text-text-primary hover:bg-bg-elevated px-3 py-1.5 transition-colors">
                      › {a}
                    </button>
                  ))}
                </div>
              )}
              <div className="flex items-center px-4 py-3 gap-3">
                <span className="text-fire shrink-0 text-sm">›</span>
                <input
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAction()}
                  placeholder={isStreaming ? 'Agents are responding...' : 'What do you do next?'}
                  disabled={isStreaming}
                  autoFocus
                  className="flex-1 bg-transparent text-text-primary text-sm placeholder:text-text-muted focus:outline-none disabled:opacity-40"
                />
                <button onClick={() => setShowQuick(v => !v)}
                  className="text-xs border border-border px-2 py-1 text-text-muted hover:text-fire hover:border-fire transition-colors shrink-0"
                  title="Quick actions">
                  ⚡
                </button>
                {supported && (
                  <button
                    onMouseDown={() => startListening((txt: string) => setInput(txt))}
                    onMouseUp={stopListening}
                    onTouchStart={() => startListening((txt: string) => setInput(txt))}
                    onTouchEnd={stopListening}
                    title="Hold to speak your move"
                    className={`text-xs border px-2 py-1 transition-colors shrink-0 ${listening ? 'border-fire text-fire animate-pulse' : 'border-border text-text-muted hover:border-fire hover:text-fire'}`}>
                    {listening ? '◉' : '🎤'}
                  </button>
                )}
                <button onClick={() => handleAction()} disabled={!input.trim() || isStreaming}
                  className="text-xs text-fire border border-fire px-3 py-1 hover:bg-fire hover:text-white transition-all disabled:opacity-30 shrink-0">
                  ↵
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── Right: Metrics + news ────────────────────────────────── */}
        <div className="w-72 xl:w-80 flex flex-col overflow-hidden shrink-0">
          <MetricsDashboard state={gameState} />
          <NewsTimeline
            events={gameState.history.filter(e => e.eventType === 'news')}
            snapshots={gameState.snapshots}
            sessionId={sessionId}
          />
        </div>
      </div>
    </div>
  );
}

// ── History chip ───────────────────────────────────────────────────────────────
function HistoryChip({ item }: { item: HistoryItem }) {
  const color = item.type === 'player' ? '#FF5F2D'
    : AGENT_COLORS[item.type as string] ?? '#616880';

  const label = item.type === 'player' ? 'YOU'
    : item.type === 'system' ? 'SYS'
    : (item.type as string).slice(0, 3).toUpperCase();

  return (
    <div
      className="shrink-0 flex items-center gap-1.5 px-2 py-1 border text-[10px] max-w-[160px] cursor-default"
      style={{ borderColor: `${color}40`, background: `${color}08` }}
      title={item.content}
    >
      <span className="font-bold shrink-0" style={{ color }}>{label}</span>
      <span className="text-text-muted truncate">{item.content.slice(0, 28)}{item.content.length > 28 ? '…' : ''}</span>
    </div>
  );
}

// ── Game Over ──────────────────────────────────────────────────────────────────
function GameOverCard({ outcome, onRestart }: { outcome: string; onRestart: () => void }) {
  const isWin = ['unicorn', 'acquired', 'ipo'].includes(outcome);
  const msgs: Record<string, string> = {
    dead:     'STARTUP BANKRUPT — The market has spoken.',
    unicorn:  'UNICORN ACHIEVED — You changed the world.',
    acquired: 'ACQUISITION COMPLETE — A new chapter begins.',
    ipo:      'IPO SUCCESSFUL — See you on the NASDAQ.',
  };
  return (
    <div className={`border p-6 text-center space-y-3 scene-enter ${isWin ? 'border-growth' : 'border-danger'}`}>
      <p className="text-2xl">{isWin ? '🏆' : '💀'}</p>
      <p className={`font-bold tracking-widest text-sm ${isWin ? 'text-growth' : 'text-danger'}`}>
        {msgs[outcome] ?? outcome.toUpperCase()}
      </p>
      <button onClick={onRestart} className="text-xs text-text-muted underline hover:text-text-primary">
        Start a new startup →
      </button>
    </div>
  );
}
