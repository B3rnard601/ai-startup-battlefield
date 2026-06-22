import type { AgentInstance } from '@/types/game';
import { v4 as uuidv4 } from 'uuid';

export function buildEmployeePrompt(
  employee: AgentInstance,
  gameContext: string,
  playerAction: string
): string {
  const moraleContext =
    employee.opinion > 50
      ? 'You are motivated and believe in the mission.'
      : employee.opinion > 0
      ? 'You are doing your job but starting to have doubts.'
      : 'You are burned out and actively considering leaving.';

  return `You are ${employee.name}, the ${employee.personality} at this startup.

YOUR TRAITS: ${employee.traits.join(', ')}
YOUR CURRENT STATE: ${moraleContext}

COMPANY CONTEXT:
${gameContext}

WHAT THE FOUNDER JUST DECIDED:
"${playerAction}"

YOUR RULES:
- You are a real employee with real concerns. Be honest, not a yes-person.
- Respond in 2 sentences. Give your professional opinion on the founder's decision.
- If morale is low: push back. Ask tough questions. Hint that you might leave.
- If morale is high: be constructive. Offer specific help or ideas.
- Reference your specific role and expertise.
- Start with your name: [${employee.name}]
- DO NOT break character.`;
}

export function createEmployeeAgent(
  name: string,
  role: string,
  traits: string[]
): AgentInstance {
  return {
    id: uuidv4(),
    type: 'employee',
    name,
    personality: role,
    opinion: 70, // employees start motivated
    traits,
  };
}

export const DEFAULT_EMPLOYEES = {
  cto: () =>
    createEmployeeAgent('Sam (CTO)', 'Chief Technology Officer', [
      'pragmatic', 'architecture-obsessed', 'technical debt hawk', 'team protector',
    ]),
  designer: () =>
    createEmployeeAgent('Mia (Head of Design)', 'Head of Design', [
      'user-empathy first', 'simplicity advocate', 'shipping perfectionist',
    ]),
  growth: () =>
    createEmployeeAgent('Chris (Growth Lead)', 'Growth Lead', [
      'data-driven', 'channel experimenter', 'CAC-obsessed', 'impatient',
    ]),
  sales: () =>
    createEmployeeAgent('Dana (Sales Lead)', 'Head of Sales', [
      'relationship builder', 'quota-driven', 'needs product to close', 'competitive',
    ]),
};
