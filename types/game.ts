export type GamePhase =
  | 'idea'
  | 'build'
  | 'market'
  | 'competition'
  | 'fundraising'
  | 'scale'
  | 'dead'
  | 'unicorn'
  | 'acquired'
  | 'ipo';

export type AgentType =
  | 'investor'
  | 'customer'
  | 'competitor'
  | 'journalist'
  | 'employee'
  | 'system';

export interface GameState {
  sessionId: string;
  startupName: string;
  startupIdea: string;
  sector: string;
  phase: GamePhase;
  day: number;
  metrics: GameMetrics;
  agents: GameAgents;
  history: GameEvent[];
  snapshots: SnapshotRecord[];
  founderStyle: string;
  createdAt: number;
}

export interface GameMetrics {
  revenue: number;         // monthly recurring revenue
  users: number;           // total active users
  burnRate: number;        // monthly spend
  cash: number;            // cash in bank
  runway: number;          // months of runway
  reputation: number;      // 0-100 public perception
  teamMorale: number;      // 0-100 internal morale
  valuation: number;       // implied valuation
  founderScore: FounderScore;
}

export interface FounderScore {
  leadership: number;   // 0-100
  innovation: number;   // 0-100
  execution: number;    // 0-100
  ethics: number;       // 0-100
}

export interface GameAgents {
  investors: AgentInstance[];
  customers: AgentInstance[];
  competitors: AgentInstance[];
  employees: AgentInstance[];
}

export interface AgentInstance {
  id: string;
  type: AgentType;
  name: string;
  personality: string; // e.g. "visionary", "conservative"
  opinion: number;     // -100 (hostile) to +100 (champion)
  traits: string[];
  lastSeen?: number;   // day last interacted
}

export interface GameEvent {
  id: string;
  day: number;
  actor: string;       // agent id or 'player' or 'system'
  agentType?: AgentType;
  content: string;
  eventType: 'decision' | 'response' | 'news' | 'market_event' | 'system';
  timestamp: number;
}

export interface SnapshotRecord {
  day: number;
  rootHash: string;
  timestamp: number;
  label?: string;
}

export interface AgentMemory {
  role: 'user' | 'assistant';
  content: string;
}

export interface MetricsDelta {
  revenue?: number;
  users?: number;
  cash?: number;
  burnRate?: number;
  reputation?: number;
  teamMorale?: number;
  valuation?: number;
  leadership?: number;
  innovation?: number;
  execution?: number;
  ethics?: number;
  founderStyle?: string;
  phase?: GamePhase;
}

// API request/response shapes
export interface StartGameRequest {
  idea: string;
}

export interface StartGameResponse {
  sessionId: string;
  gameState: GameState;
  initialAnalysis: string;
}

export interface ActionRequest {
  sessionId: string;
  playerAction: string;
}

// SSE stream event types
export type StreamEvent =
  | { type: 'agent_start'; agent: AgentType; agentName: string }
  | { type: 'token'; agent: AgentType; content: string }
  | { type: 'agent_end'; agent: AgentType; agentName: string; full: string }
  | { type: 'metrics_update'; metrics: GameMetrics; delta: MetricsDelta }
  | { type: 'snapshot_saved'; rootHash: string; day: number }
  | { type: 'phase_change'; phase: GamePhase }
  | { type: 'game_over'; outcome: 'dead' | 'unicorn' | 'acquired' | 'ipo' }
  | { type: 'error'; message: string };
