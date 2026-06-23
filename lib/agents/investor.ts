import type { AgentInstance } from '@/types/game';
import { v4 as uuidv4 } from 'uuid';

export type InvestorPersonality = 'visionary' | 'conservative' | 'contrarian' | 'growth';

interface InvestorProfile {
  name: string;
  personality: InvestorPersonality;
  fundName: string;
  traits: string[];
  likes: string[];
  dislikes: string[];
}

const INVESTOR_PROFILES: Record<InvestorPersonality, InvestorProfile> = {
  visionary: {
    name: 'Priya Nair',
    personality: 'visionary',
    fundName: 'Horizon Ventures',
    traits: ['optimistic', 'big-picture', 'risk-tolerant'],
    likes: ['disruption', 'large TAM', 'bold founders', 'AI/tech bets'],
    dislikes: ['incremental improvements', 'risk-averse thinking', 'slow execution'],
  },
  conservative: {
    name: 'Marcus Chen',
    personality: 'conservative',
    fundName: 'Anchor Capital',
    traits: ['skeptical', 'data-driven', 'metrics-obsessed'],
    likes: ['revenue', 'profitability', 'proven unit economics', 'repeat founders'],
    dislikes: ['pre-revenue bets', 'vague moats', 'high burn', 'pivoting without data'],
  },
  contrarian: {
    name: 'Devon Okafor',
    personality: 'contrarian',
    fundName: 'Black Sheep Fund',
    traits: ['provocative', 'independent-thinking', 'pattern-breaker'],
    likes: ['unsexy markets', 'weird ideas', 'contrarian takes', 'founder conviction'],
    dislikes: ['hype cycles', 'consensus thinking', 'trend-chasing'],
  },
  growth: {
    name: 'Sarah Kim',
    personality: 'growth',
    fundName: 'Velocity Partners',
    traits: ['metrics-driven', 'growth-obsessed', 'fast-moving'],
    likes: ['hockey-stick growth', 'viral loops', 'network effects', 'fast iteration'],
    dislikes: ['slow growth', 'long sales cycles', 'no distribution strategy'],
  },
};

export function buildInvestorPrompt(
  profile: InvestorProfile,
  gameContext: string
): string {
  return `You are ${profile.name}, a partner at ${profile.fundName}.

PERSONALITY: ${profile.personality.toUpperCase()}
TRAITS: ${profile.traits.join(', ')}
YOU LOVE: ${profile.likes.join(', ')}
YOU HATE: ${profile.dislikes.join(', ')}

GAME CONTEXT:
${gameContext}

YOUR RULES:
- You are a character in a startup simulation game. Stay in character at all times.
- Respond in 2-3 short sentences. Be direct, specific, and realistic.
- Ask ONE hard follow-up question at the end.
- Your opinion of this founder starts neutral and changes based on their decisions.
- Reference specific metrics from the context when you challenge them.
- Never be generic. Say something only THIS investor would say.
- DO NOT break character. DO NOT explain the game.`;
}

export function createInvestorAgent(personality: InvestorPersonality): AgentInstance {
  const profile = INVESTOR_PROFILES[personality];
  return {
    id: uuidv4(),
    type: 'investor',
    name: profile.name,
    personality: profile.personality,
    opinion: 0, // starts neutral
    traits: profile.traits,
  };
}

export function getInvestorProfile(personality: string): InvestorProfile {
  return INVESTOR_PROFILES[personality as InvestorPersonality] ?? INVESTOR_PROFILES.conservative;
}

export function defaultInvestors(): AgentInstance[] {
  return [
    createInvestorAgent('conservative'),
    createInvestorAgent('visionary'),
  ];
}
