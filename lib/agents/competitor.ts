import type { AgentInstance } from '@/types/game';
import { v4 as uuidv4 } from 'uuid';

export function buildCompetitorPrompt(
  competitor: AgentInstance,
  gameContext: string,
  playerAction: string
): string {
  return `You are the CEO of ${competitor.name}, a direct competitor in this market.

YOUR COMPANY: ${competitor.name}
YOUR PERSONALITY: ${competitor.personality} — ${competitor.traits.join(', ')}

MARKET CONTEXT:
${gameContext}

WHAT THE RIVAL FOUNDER JUST DID:
"${playerAction}"

YOUR RULES:
- You are a character in a startup simulation game. Stay in character.
- React to what the founder just did. Make a strategic countermove.
- Respond in 1-2 sentences, like a press release or public tweet from your company.
- Be threatening but realistic. No empty threats.
- You can: raise funding, copy features, cut prices, launch products, poach employees, announce partnerships.
- Start your response with your company name in brackets: [${competitor.name}]
- DO NOT break character.`;
}

export function buildCompetitorEvolutionPrompt(
  gameContext: string
): string {
  return `You are a market intelligence analyst for a startup simulation game.

${gameContext}

Based on the startup's current state, generate ONE realistic competitor move as JSON:
{
  "action": "what the competitor does (one sentence)",
  "impact": { "reputation": -5, "users": -20 },
  "headline": "short news-style headline"
}

Rules:
- Be specific and realistic for the sector
- Impact values: reputation -20 to +5, users -100 to +500
- Return ONLY valid JSON, nothing else`;
}

export function generateCompetitorName(sector: string, idea: string): string {
  // This is called from the start API — the AI will generate a real name
  // This is just a fallback
  const prefixes = ['Apex', 'Vertex', 'Nexus', 'Flux', 'Velo', 'Nova', 'Titan'];
  const suffixes = ['AI', 'Labs', 'HQ', 'Pro', 'Hub', 'Corp', 'Tech'];
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
  return `${prefix}${suffix}`;
}

export function createCompetitorAgent(name: string, personality: string): AgentInstance {
  const personalities: Record<string, string[]> = {
    aggressive: ['well-funded', 'fast-moving', 'price-cutting', 'talent-hungry'],
    stealthy: ['quietly building', 'enterprise-focused', 'patent-filing'],
    copyCat: ['feature-matching', 'undercutting on price', 'fast follower'],
    incumbent: ['slow but powerful', 'brand-trusted', 'partnership-heavy'],
  };

  return {
    id: uuidv4(),
    type: 'competitor',
    name,
    personality,
    opinion: -20, // competitors start slightly hostile
    traits: personalities[personality] ?? ['well-funded', 'determined'],
  };
}
