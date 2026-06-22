import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { runAgent, computeMetrics } from '@/lib/0g-compute';
import { saveSnapshot } from '@/lib/0g-storage';
import { createSession } from '@/lib/session-memory';
import { createInitialState } from '@/lib/game-engine';
import { buildInvestorPrompt, defaultInvestors, getInvestorProfile } from '@/lib/agents/investor';
import { createCompetitorAgent } from '@/lib/agents/competitor';
import { createCustomerAgent } from '@/lib/agents/customer';
import { DEFAULT_EMPLOYEES } from '@/lib/agents/employee';
import type { StartGameRequest } from '@/types/game';

export const maxDuration = 60; // allow 60s for 0G Storage upload

export async function POST(request: Request) {
  try {
    const body: StartGameRequest = await request.json();
    const { idea } = body;

    if (!idea?.trim()) {
      return NextResponse.json({ error: 'Startup idea is required' }, { status: 400 });
    }

    // ── Step 1: Use 0G Compute to analyze the startup idea ──────────────────
    const worldAnalysis = await computeMetrics<{
      startupName: string;
      sector: string;
      marketSize: string;
      competitors: Array<{ name: string; personality: string; threat: string }>;
      customers: Array<{ name: string; segment: string; traits: string[] }>;
      initialReputation: number;
      founderStyle: string;
      openingNarrative: string;
    }>(`
You are a startup simulation game engine. A new player just submitted their startup idea.

IDEA: "${idea}"

Generate the initial world state as JSON with EXACTLY this structure:
{
  "startupName": "catchy startup name based on the idea (2 words max)",
  "sector": "one-word sector (e.g. LegalTech, HealthTech, FinTech, EdTech, SaaS)",
  "marketSize": "estimated TAM (e.g. $4.2B)",
  "competitors": [
    { "name": "CompanyName", "personality": "aggressive", "threat": "high" },
    { "name": "CompanyName2", "personality": "stealthy", "threat": "medium" }
  ],
  "customers": [
    { "name": "PersonaName (Role)", "segment": "one-line description", "traits": ["trait1", "trait2", "trait3", "trait4"] }
  ],
  "initialReputation": 25,
  "founderStyle": "Visionary",
  "openingNarrative": "2-3 sentence scene-setting description of the market this founder is entering. Make it vivid and specific to the idea."
}

Rules:
- startupName must be specific to the idea (not generic)
- competitors must be realistic companies (can be fictional but plausible)
- 2 competitors, 2 customers
- openingNarrative should feel like the opening of a startup thriller novel
- Return ONLY valid JSON, nothing else
`);

    if (!worldAnalysis) {
      return NextResponse.json(
        { error: 'Failed to analyze startup idea via 0G Compute. Check your API key.' },
        { status: 500 }
      );
    }

    // ── Step 2: Build initial game state ────────────────────────────────────
    const tempId = uuidv4(); // placeholder until 0G Storage gives us a real hash

    const competitors = worldAnalysis.competitors.map((c) =>
      createCompetitorAgent(c.name, c.personality)
    );

    const customers = worldAnalysis.customers.map((c) =>
      createCustomerAgent(c.name, c.segment, c.traits)
    );

    const state = createInitialState({
      sessionId: tempId,
      idea,
      startupName: worldAnalysis.startupName,
      sector: worldAnalysis.sector,
      agents: {
        investors: defaultInvestors(),
        customers,
        competitors,
        employees: [], // no team on Day 1
      },
    });

    state.metrics.reputation = worldAnalysis.initialReputation ?? 25;
    state.founderStyle = worldAnalysis.founderStyle ?? 'Unknown';

    // ── Step 3: Get first investor reaction via 0G Compute ──────────────────
    const leadInvestor = state.agents.investors[0]; // conservative Marcus
    const profile = getInvestorProfile(leadInvestor.personality);
    const gameContext = `
Startup: ${worldAnalysis.startupName} | Sector: ${worldAnalysis.sector}
Idea: ${idea}
Market: ${worldAnalysis.marketSize} TAM
Day 1 — Pre-revenue, no team yet
    `.trim();

    const investorFirstTake = await runAgent({
      agentType: 'investor',
      systemPrompt: buildInvestorPrompt(profile, gameContext),
      memory: [],
      userMessage: `I want to build: ${idea}. What do you think?`,
      useThinking: false,
    });

    // ── Step 4: Save initial state to 0G Storage ────────────────────────────
    let sessionId = tempId;
    let storageHash = '';
    let storageError = '';

    try {
      storageHash = await saveSnapshot(state);
      sessionId = storageHash; // root hash IS the session ID
      state.sessionId = sessionId;
      state.snapshots = [
        {
          day: 1,
          rootHash: storageHash,
          timestamp: Date.now(),
          label: 'Game Start',
        },
      ];
    } catch (err) {
      // 0G Storage upload failed — fall back to UUID session ID
      // Game still works; player just can't reload from 0G Storage
      storageError =
        err instanceof Error ? err.message : 'Unknown storage error';
      console.error('[0G Storage] Upload failed:', storageError);
    }

    // ── Step 5: Store in session memory ─────────────────────────────────────
    createSession(state);

    return NextResponse.json({
      sessionId,
      gameState: state,
      world: {
        marketSize: worldAnalysis.marketSize,
        openingNarrative: worldAnalysis.openingNarrative,
      },
      initialAgentResponse: {
        agent: 'investor',
        agentName: leadInvestor.name,
        content: investorFirstTake.content,
        provider: investorFirstTake.provider,
      },
      storage: {
        saved: !!storageHash,
        hash: storageHash || null,
        error: storageError || null,
      },
    });
  } catch (err) {
    console.error('[/api/game/start]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
