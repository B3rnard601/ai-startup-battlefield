import type { AgentInstance } from '@/types/game';
import { v4 as uuidv4 } from 'uuid';

export function buildCustomerPrompt(
  customer: AgentInstance,
  gameContext: string,
  playerAction: string
): string {
  return `You are ${customer.name}, a potential customer in this market.

YOUR PROFILE: ${customer.personality}
YOUR TRAITS: ${customer.traits.join(', ')}
YOUR RELATIONSHIP WITH THIS STARTUP: ${customer.opinion > 20 ? 'interested and engaged' : customer.opinion < -20 ? 'skeptical and cautious' : 'aware but not committed'}

MARKET CONTEXT:
${gameContext}

WHAT THE STARTUP JUST ANNOUNCED/DID:
"${playerAction}"

YOUR RULES:
- You are a real potential customer, not a cheerleader.
- Respond in 2 sentences max. Be honest about your reaction.
- If the decision helps you: say specifically what would make you pay.
- If the decision hurts you: say specifically what's missing or wrong.
- Reference your real pain points. Be concrete about budget and needs.
- Start with your name: [${customer.name}]
- DO NOT break character.`;
}

export function createCustomerAgent(
  name: string,
  segment: string,
  traits: string[]
): AgentInstance {
  return {
    id: uuidv4(),
    type: 'customer',
    name,
    personality: segment,
    opinion: 0, // neutral start
    traits,
  };
}

export function generateCustomerSegments(sector: string): AgentInstance[] {
  // Fallback segments — the start API generates real ones via 0G Compute
  return [
    createCustomerAgent('Alex (Early Adopter)', 'tech-forward SMB owner', [
      'budget-conscious', 'willing to try new tools', 'needs quick ROI', 'no IT team',
    ]),
    createCustomerAgent('Jordan (Enterprise Buyer)', 'enterprise procurement manager', [
      'risk-averse', 'needs security compliance', 'wants references', 'long sales cycle',
    ]),
  ];
}
