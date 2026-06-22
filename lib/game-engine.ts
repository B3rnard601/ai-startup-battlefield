/**
 * Game Engine
 * ───────────
 * Owns game state transitions, metric updates, phase logic, and
 * determining which agents react to a given player action.
 */

import { v4 as uuidv4 } from 'uuid';
import type {
  GameState,
  GamePhase,
  GameMetrics,
  MetricsDelta,
  AgentType,
  AgentInstance,
  GameEvent,
  SnapshotRecord,
} from '@/types/game';

// ── Initial State ────────────────────────────────────────────────────────────

export function createInitialState(params: {
  sessionId: string;
  idea: string;
  startupName: string;
  sector: string;
  agents: {
    investors: AgentInstance[];
    customers: AgentInstance[];
    competitors: AgentInstance[];
    employees: AgentInstance[];
  };
}): GameState {
  return {
    sessionId: params.sessionId,
    startupName: params.startupName,
    startupIdea: params.idea,
    sector: params.sector,
    phase: 'idea',
    day: 1,
    metrics: {
      revenue: 0,
      users: 0,
      burnRate: 8000,
      cash: 50000, // founder savings / pre-seed
      runway: 6,
      reputation: 30,
      teamMorale: 80,
      valuation: 0,
      founderScore: {
        leadership: 50,
        innovation: 50,
        execution: 50,
        ethics: 80,
      },
    },
    agents: params.agents,
    history: [],
    snapshots: [],
    founderStyle: 'Unknown',
    createdAt: Date.now(),
  };
}

// ── Agent Selection ──────────────────────────────────────────────────────────

/**
 * Decide which agents react to a player action based on its content + game phase.
 * Returns ordered list — agents respond in this sequence.
 */
export function selectReactingAgents(
  action: string,
  state: GameState
): AgentType[] {
  const lower = action.toLowerCase();
  const agents: AgentType[] = [];

  // Investor reacts to: fundraising, pitches, revenue talk, major pivots
  const investorTriggers = [
    'pitch', 'raise', 'funding', 'investor', 'valuation',
    'revenue', 'growth', 'pivot', 'acquisition', 'exit', 'ipo',
  ];
  if (investorTriggers.some((t) => lower.includes(t)) || state.phase === 'fundraising') {
    agents.push('investor');
  }

  // Competitor always reacts to product/market moves
  const competitorTriggers = [
    'launch', 'feature', 'price', 'partner', 'market',
    'hire', 'expand', 'release', 'ship', 'announce',
  ];
  if (competitorTriggers.some((t) => lower.includes(t)) || state.day % 5 === 0) {
    agents.push('competitor');
  }

  // Customer reacts to product decisions
  const customerTriggers = [
    'product', 'feature', 'price', 'free', 'trial', 'launch',
    'onboard', 'support', 'ux', 'design', 'build',
  ];
  if (customerTriggers.some((t) => lower.includes(t))) {
    agents.push('customer');
  }

  // Journalist fires every 7 days or on major events
  const journalistTriggers = [
    'crisis', 'scandal', 'viral', 'leak', 'fired', 'bankrupt',
    'unicorn', 'raise', 'layoff', 'partner',
  ];
  if (state.day % 7 === 0 || journalistTriggers.some((t) => lower.includes(t))) {
    agents.push('journalist');
  }

  // Employee reacts to hiring, culture, workload, strategy
  const employeeTriggers = [
    'hire', 'fire', 'team', 'culture', 'strategy', 'roadmap',
    'sprint', 'deadline', 'overtime', 'bonus', 'equity',
  ];
  if (
    employeeTriggers.some((t) => lower.includes(t)) ||
    state.agents.employees.length > 0
  ) {
    agents.push('employee');
  }

  // Fallback: always get at least investor + competitor
  if (agents.length === 0) {
    agents.push('investor', 'competitor');
  }

  // Deduplicate while preserving order
  return [...new Set(agents)];
}

// ── Metric Updates ───────────────────────────────────────────────────────────

export function applyDelta(state: GameState, delta: MetricsDelta): GameState {
  const m = state.metrics;
  const fs = m.founderScore;

  const newMetrics: GameMetrics = {
    revenue: Math.max(0, m.revenue + (delta.revenue ?? 0)),
    users: Math.max(0, m.users + (delta.users ?? 0)),
    burnRate: Math.max(1000, m.burnRate + (delta.burnRate ?? 0)),
    cash: Math.max(0, m.cash + (delta.cash ?? 0)),
    reputation: clamp(m.reputation + (delta.reputation ?? 0), 0, 100),
    teamMorale: clamp(m.teamMorale + (delta.teamMorale ?? 0), 0, 100),
    valuation: Math.max(0, m.valuation + (delta.valuation ?? 0)),
    founderScore: {
      leadership: clamp(fs.leadership + (delta.leadership ?? 0), 0, 100),
      innovation: clamp(fs.innovation + (delta.innovation ?? 0), 0, 100),
      execution: clamp(fs.execution + (delta.execution ?? 0), 0, 100),
      ethics: clamp(fs.ethics + (delta.ethics ?? 0), 0, 100),
    },
  };

  // Advance day + deduct burn
  const newCash = newMetrics.cash - newMetrics.burnRate / 30; // daily burn
  newMetrics.cash = Math.max(0, newCash);
  newMetrics.runway = newMetrics.burnRate > 0
    ? Math.floor((newMetrics.cash / newMetrics.burnRate) * 10) / 10
    : 999;

  return {
    ...state,
    day: state.day + 1,
    metrics: newMetrics,
    founderStyle: delta.founderStyle ?? state.founderStyle,
    phase: resolvePhase(state, newMetrics, delta.phase),
  };
}

function resolvePhase(
  state: GameState,
  metrics: GameMetrics,
  override?: GamePhase
): GamePhase {
  if (override) return override;

  // Terminal conditions
  if (metrics.cash <= 0 || metrics.runway <= 0) return 'dead';
  if (metrics.valuation >= 1_000_000_000) return 'unicorn';

  // Phase progression by day
  if (state.day < 7) return 'idea';
  if (state.day < 30) return 'build';
  if (state.day < 60) return 'market';
  if (state.day < 90) return 'competition';
  if (state.day < 120) return 'fundraising';
  return 'scale';
}

// ── History ──────────────────────────────────────────────────────────────────

export function addEvent(
  state: GameState,
  event: Omit<GameEvent, 'id' | 'timestamp'>
): GameState {
  const newEvent: GameEvent = {
    ...event,
    id: uuidv4(),
    timestamp: Date.now(),
  };
  return {
    ...state,
    history: [...state.history, newEvent],
  };
}

export function addSnapshot(state: GameState, rootHash: string): GameState {
  const record: SnapshotRecord = {
    day: state.day,
    rootHash,
    timestamp: Date.now(),
    label: `Day ${state.day} — ${state.phase}`,
  };
  return {
    ...state,
    snapshots: [...state.snapshots, record],
  };
}

// ── Context Builder ──────────────────────────────────────────────────────────

/**
 * Build a compact game context string to inject into every agent prompt.
 * Keeps agents grounded in current state without blowing up the context window.
 */
export function buildGameContext(state: GameState): string {
  const m = state.metrics;
  return `
CURRENT STATE:
- Startup: ${state.startupName} (${state.sector})
- Idea: ${state.startupIdea}
- Day: ${state.day} | Phase: ${state.phase.toUpperCase()}
- Revenue: $${m.revenue.toLocaleString()}/mo | Users: ${m.users}
- Cash: $${m.cash.toLocaleString()} | Burn: $${m.burnRate.toLocaleString()}/mo | Runway: ${m.runway} months
- Reputation: ${m.reputation}/100 | Team Morale: ${m.teamMorale}/100
- Competitors: ${state.agents.competitors.map((c) => c.name).join(', ') || 'None yet'}
- Team size: ${state.agents.employees.length} employees
`.trim();
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

export function isGameOver(state: GameState): boolean {
  return ['dead', 'unicorn', 'acquired', 'ipo'].includes(state.phase);
}

export function shouldCheckpoint(state: GameState): boolean {
  return state.day % 5 === 0;
}
