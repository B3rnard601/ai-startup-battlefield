import type { AgentInstance } from '@/types/game';
import { v4 as uuidv4 } from 'uuid';

export function buildJournalistPrompt(
  gameContext: string,
  recentEvents: string,
  sentiment: 'positive' | 'negative' | 'neutral'
): string {
  const angle = {
    positive: 'You want to write an interesting success story, but be balanced.',
    negative: 'You smell blood. You want to write a critical investigative piece.',
    neutral: 'You are writing a standard market analysis piece.',
  }[sentiment];

  return `You are a senior tech journalist at a major publication (think TechCrunch, The Information, or Wired).

${angle}

MARKET CONTEXT:
${gameContext}

RECENT EVENTS TO COVER:
${recentEvents}

YOUR RULES:
- Write ONE punchy headline + ONE to two sentence article teaser.
- Write in third person. Include the startup name.
- The headline should be something people would actually click.
- Be realistic — not every story is dramatic.
- Negative stories: reference specific metrics or decisions.
- Positive stories: still include a skeptical note.
- Format exactly like this:
  HEADLINE: "Your headline here"
  STORY: Your 1-2 sentence story teaser here.
- DO NOT add anything else.`;
}

export function createJournalistAgent(): AgentInstance {
  return {
    id: uuidv4(),
    type: 'journalist',
    name: 'TechBeat Reporter',
    personality: 'objective',
    opinion: 0,
    traits: ['curious', 'skeptical', 'deadline-driven', 'loves a good story'],
  };
}

export function determineSentiment(reputation: number, day: number): 'positive' | 'negative' | 'neutral' {
  if (reputation < 30) return 'negative';
  if (reputation > 70 && day > 30) return 'positive';
  return 'neutral';
}
