'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import type { GameState, StreamEvent, AgentType, GameEvent } from '@/types/game';
import MetricsDashboard from '@/components/MetricsDashboard';
import NewsTimeline from '@/components/NewsTimeline';

const AGENT_LABELS: Record<AgentType | string, string> = {
  investor: 'INVESTOR',
  competitor: 'COMPETITOR',
  customer: 'CUSTOMER',
  journalist: 'PRESS',
  employee: 'TEAM',
  system: 'SYSTEM',
};

const PHASE_LABELS: Record<string, string> = {
  idea: 'IDEA STAGE',
  build: 'BUILDING',
  market: 'GO-TO-MARKET',
  competition: 'COMPETITION',
  fundraising: 'FUNDRAISING',
  scale: 'SCALING',
  dead: 'BANKRUPT',
  unicorn: 'UNICORN 🦄',
  acquired: 'ACQUIRED',
  ipo: 'IPO',
};

interface TerminalLine {
  id: string;
  type: 'player' | AgentType | 'system' | 'news';
  actor?: string;
  content: string;
  streaming?: boolean;
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

  const terminalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const streamingLineIdRef = useRef<string | null>(null);

  // ── Load game state ──────────────────────────────────────────────────────
  useEffect(() => {
    async function loadGame() {
      try {
        const res = await fetch(`/api/game/load/${sessionId}`);
        if (!res.ok) throw new Error('Session not found');
        const data = await res.json();
        const state: GameState = data.gameState;
        setGameState(state);

        // Reconstruct terminal from history
        const termLines: TerminalLine[] = state.history.map((ev) => ({
          id: ev.id,
          type: ev.actor === 'player' ? 'player' : (ev.agentType ?? 'system') as any,
          actor: ev.agentType ? undefined : ev.actor,
          content: ev.content,
        }));

        if (termLines.length === 0) {
          // Brand new game — show world intro
          termLines.push({
            id: 'sys-start',
            type: 'system',
            content: `World initialized. Your startup "${state.startupName}" enters the ${state.sector} market.`,
          });
          termLines.push({
            id: 'sys-cash',
            type: 'system',
            content: `Starting capital: $${state.metrics.cash.toLocaleString()} | Runway: ${state.metrics.runway} months`,
          });
          termLines.push({
            id: 'sys-tip',
            type: 'system',
            content: `Competitors detected: ${state.agents.competitors.map((c) => c.name).join(', ')}`,
          });
        }

        setLines(termLines);

        // Re-show opening investor response if fresh session
        if (data.source === 'memory' && (data as any).initialAgentResponse) {
          const r = (data as any).initialAgentResponse;
          setLines((prev) => [
            ...prev,
            {
              id: 'investor-open',
              type: 'investor',
              actor: r.agentName,
              content: r.content,
            },
          ]);
        }
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : 'Failed to load game');
      }
    }
    loadGame();
  }, [sessionId]);

  // Auto-scroll terminal
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [lines]);

  // ── Handle player action ──────────────────────────────────────────────────
  const handleAction = useCallback(async () => {
    if (!input.trim() || isStreaming || !gameState) return;

    const playerAction = input.trim();
    setInput('');
    setIsStreaming(true);

    // Add player line immediately
    setLines((prev) => [
      ...prev,
      {
        id: `player-${Date.now()}`,
        type: 'player',
        content: playerAction,
      },
    ]);

    try {
      const res = await fetch('/api/game/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, playerAction }),
      });

      if (!res.body) throw new Error('No response stream');

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
          const event: StreamEvent = JSON.parse(part.slice(6));
          handleStreamEvent(event);
        }
      }
    } catch (err) {
      setLines((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          type: 'system',
          content: `✗ Error: ${err instanceof Error ? err.message : 'Stream failed'}`,
        },
      ]);
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
        setLines((prev) => [
          ...prev,
          { id: lineId, type: event.agent, actor: event.agentName, content: '', streaming: true },
        ]);
        break;
      }

      case 'token': {
        const id = streamingLineIdRef.current;
        if (!id) return;
        setLines((prev) =>
          prev.map((l) => (l.id === id ? { ...l, content: l.content + event.content } : l))
        );
        break;
      }

      case 'agent_end': {
        const id = streamingLineIdRef.current;
        if (!id) return;
        setLines((prev) =>
          prev.map((l) => (l.id === id ? { ...l, streaming: false } : l))
        );
        streamingLineIdRef.current = null;
        break;
      }

      case 'metrics_update': {
        setGameState((prev) =>
          prev ? { ...prev, metrics: event.metrics, day: prev.day + 1 } : prev
        );
        break;
      }

      case 'snapshot_saved': {
        setSaveStatus(`Saved to 0G Storage — Day ${event.day}`);
        setTimeout(() => setSaveStatus(''), 4000);
        setLines((prev) => [
          ...prev,
          {
            id: `snap-${Date.now()}`,
            type: 'system',
            content: `◎ Checkpoint saved to 0G Storage — Hash: ${event.rootHash.slice(0, 20)}...`,
          },
        ]);
        break;
      }

      case 'game_over': {
        setGameOver(event.outcome);
        break;
      }

      case 'error': {
        setLines((prev) => [
          ...prev,
          { id: `err-${Date.now()}`, type: 'system', content: `✗ ${event.message}` },
        ]);
        break;
      }
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
      const data = await res.json();
      setSaveStatus(`Saved — ${data.rootHash?.slice(0, 16)}...`);
      setTimeout(() => setSaveStatus(''), 4000);
    } catch {
      setSaveStatus('Save failed');
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (loadError) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-danger">✗ {loadError}</p>
          <button onClick={() => router.push('/')} className="text-text-muted text-sm underline">
            ← Start new game
          </button>
        </div>
      </div>
    );
  }

  if (!gameState) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-text-muted text-sm animate-pulse">
          ◌ Loading from 0G Storage...
        </p>
      </div>
    );
  }

  const phase = gameState.phase;
  const m = gameState.metrics;

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <div className="scanlines" />

      {/* ── Top bar ─────────────────────────────────────────────────────── */}
      <header className="border-b border-border bg-bg-surface flex items-center px-4 py-2 gap-4 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-fire font-bold text-sm">▶</span>
          <span className="text-text-primary font-semibold text-sm">{gameState.startupName}</span>
          <span className={`text-xs px-2 py-0.5 phase-${phase}`}>
            {PHASE_LABELS[phase] ?? phase.toUpperCase()}
          </span>
        </div>

        <div className="flex items-center gap-4 ml-2 text-xs text-text-muted">
          <span>DAY <span className="text-text-primary font-medium">{gameState.day}</span></span>
          <span>MRR <span className="text-growth font-medium">${m.revenue.toLocaleString()}</span></span>
          <span>USERS <span className="text-growth font-medium">{m.users.toLocaleString()}</span></span>
          <span>RUNWAY <span className={m.runway < 3 ? 'text-danger' : 'text-text-primary'} style={{ fontWeight: 500 }}>{m.runway}mo</span></span>
        </div>

        <div className="ml-auto flex items-center gap-3">
          {saveStatus && (
            <span className="text-xs text-growth animate-fade-in">{saveStatus}</span>
          )}
          <button
            onClick={handleManualSave}
            disabled={isStreaming}
            className="text-xs text-text-muted border border-border px-3 py-1 hover:border-growth hover:text-growth transition-colors disabled:opacity-40"
          >
            ◎ Save to 0G
          </button>
          <button
            onClick={() => router.push('/')}
            className="text-xs text-text-muted hover:text-text-primary transition-colors"
          >
            ← New game
          </button>
        </div>
      </header>

      {/* ── Main layout ─────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── LEFT: Terminal ───────────────────────────────────────────── */}
        <div className="flex flex-col flex-1 border-r border-border overflow-hidden">
          {/* Terminal header */}
          <div className="border-b border-border px-4 py-2 bg-bg-surface flex items-center gap-2 shrink-0">
            <span className="text-xs text-text-muted tracking-widest">COMMAND TERMINAL</span>
            <span className="ml-auto text-xs text-text-muted">
              {gameState.sector} · {gameState.founderStyle} founder
            </span>
          </div>

          {/* Terminal output */}
          <div
            ref={terminalRef}
            className="flex-1 overflow-y-auto px-4 py-4 space-y-3"
          >
            {lines.map((line) => (
              <TerminalLine key={line.id} line={line} />
            ))}

            {isStreaming && !streamingLineIdRef.current && (
              <div className="text-text-muted text-xs animate-pulse">◌ Agents responding...</div>
            )}
          </div>

          {/* Terminal input */}
          <div className="border-t border-border bg-bg-surface shrink-0">
            {gameOver ? (
              <div className="px-4 py-4 text-center">
                <GameOverBanner outcome={gameOver} onRestart={() => router.push('/')} />
              </div>
            ) : (
              <div className="flex items-center px-4 py-3 gap-3">
                <span className="text-fire text-sm shrink-0">›</span>
                <input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAction()}
                  placeholder={isStreaming ? 'Agents are responding...' : 'What do you do next?'}
                  disabled={isStreaming}
                  autoFocus
                  className="flex-1 bg-transparent text-text-primary text-sm placeholder:text-text-muted focus:outline-none disabled:opacity-40"
                />
                <button
                  onClick={handleAction}
                  disabled={!input.trim() || isStreaming}
                  className="text-xs text-fire border border-fire px-3 py-1 hover:bg-fire hover:text-white transition-all disabled:opacity-30"
                >
                  SEND ↵
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT: Dashboard ─────────────────────────────────────────── */}
        <div className="w-80 xl:w-96 flex flex-col overflow-hidden shrink-0">
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

// ── Terminal Line Component ───────────────────────────────────────────────────

function TerminalLine({ line }: { line: TerminalLine }) {
  const agentClass = `agent-${line.type}`;
  const prefix = AGENT_LABELS[line.type] ?? line.type.toUpperCase();

  if (line.type === 'player') {
    return (
      <div className="terminal-line flex gap-2">
        <span className="text-fire shrink-0 text-sm">›</span>
        <span className="text-text-primary text-sm">{line.content}</span>
      </div>
    );
  }

  if (line.type === 'system') {
    return (
      <div className="terminal-line text-agent-system text-xs py-1">
        — {line.content}
      </div>
    );
  }

  return (
    <div className="terminal-line">
      <div className="flex items-baseline gap-2 mb-1">
        <span className={`${agentClass} text-xs font-semibold tracking-widest shrink-0`}>
          [{prefix}]
        </span>
        {line.actor && (
          <span className="text-text-muted text-xs">{line.actor}</span>
        )}
      </div>
      <div className="text-text-primary text-sm leading-relaxed pl-2 border-l border-border ml-1">
        {line.content}
        {line.streaming && <span className="cursor" />}
      </div>
    </div>
  );
}

// ── Game Over Banner ──────────────────────────────────────────────────────────

function GameOverBanner({ outcome, onRestart }: { outcome: string; onRestart: () => void }) {
  const isWin = ['unicorn', 'acquired', 'ipo'].includes(outcome);
  const messages: Record<string, string> = {
    dead: 'STARTUP BANKRUPT. The market has spoken.',
    unicorn: 'UNICORN STATUS ACHIEVED. You changed the world.',
    acquired: 'ACQUISITION COMPLETE. A new chapter begins.',
    ipo: 'IPO SUCCESSFUL. See you on the NASDAQ.',
  };

  return (
    <div className={`space-y-2 ${isWin ? 'text-growth' : 'text-danger'}`}>
      <p className="font-bold tracking-widest text-sm">{messages[outcome]}</p>
      <button onClick={onRestart} className="text-xs text-text-muted underline">
        Start a new startup →
      </button>
    </div>
  );
}
