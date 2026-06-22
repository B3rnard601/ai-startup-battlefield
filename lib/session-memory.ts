/**
 * Session Memory
 * ──────────────
 * Holds live agent memory and game state during a session.
 * Survives Next.js hot reloads in dev; persists until server restart.
 * On every 5th day (and on demand), state is checkpointed to 0G Storage.
 *
 * This is a module-level singleton — safe for hackathon single-server use.
 */

import type { GameState, AgentMemory, AgentType } from '@/types/game';

interface Session {
  gameState: GameState;
  agentMemory: Record<string, AgentMemory[]>; // key: `${sessionId}:${agentType}`
  lastActivity: number;
}

// Module-level store — persists across requests in the same Node.js process
const store = new Map<string, Session>();

// ── Game State ──────────────────────────────────────────────────────────────

export function getSession(sessionId: string): Session | undefined {
  return store.get(sessionId);
}

export function getGameState(sessionId: string): GameState | undefined {
  return store.get(sessionId)?.gameState;
}

export function setGameState(sessionId: string, state: GameState): void {
  const existing = store.get(sessionId);
  store.set(sessionId, {
    gameState: state,
    agentMemory: existing?.agentMemory ?? {},
    lastActivity: Date.now(),
  });
}

export function updateGameState(
  sessionId: string,
  updater: (state: GameState) => GameState
): GameState | null {
  const session = store.get(sessionId);
  if (!session) return null;

  const updated = updater(session.gameState);
  session.gameState = updated;
  session.lastActivity = Date.now();
  return updated;
}

// ── Agent Memory ────────────────────────────────────────────────────────────

function memoryKey(sessionId: string, agentType: AgentType): string {
  return `${sessionId}:${agentType}`;
}

export function getAgentMemory(sessionId: string, agentType: AgentType): AgentMemory[] {
  const session = store.get(sessionId);
  return session?.agentMemory[memoryKey(sessionId, agentType)] ?? [];
}

export function appendAgentMemory(
  sessionId: string,
  agentType: AgentType,
  entry: AgentMemory
): void {
  const session = store.get(sessionId);
  if (!session) return;

  const key = memoryKey(sessionId, agentType);
  const memory = session.agentMemory[key] ?? [];
  memory.push(entry);

  // Cap at 20 entries per agent to keep prompts lean
  session.agentMemory[key] = memory.slice(-20);
  session.lastActivity = Date.now();
}

export function clearAgentMemory(sessionId: string, agentType: AgentType): void {
  const session = store.get(sessionId);
  if (!session) return;
  delete session.agentMemory[memoryKey(sessionId, agentType)];
}

// ── Session Lifecycle ───────────────────────────────────────────────────────

export function createSession(gameState: GameState): void {
  store.set(gameState.sessionId, {
    gameState,
    agentMemory: {},
    lastActivity: Date.now(),
  });
}

export function deleteSession(sessionId: string): void {
  store.delete(sessionId);
}

export function listSessions(): string[] {
  return Array.from(store.keys());
}

// Prune sessions inactive for > 2 hours (memory management)
export function pruneOldSessions(): void {
  const cutoff = Date.now() - 2 * 60 * 60 * 1000;
  for (const [id, session] of store.entries()) {
    if (session.lastActivity < cutoff) {
      store.delete(id);
    }
  }
}
